// file: src/main/java/com/popups/pupoo/payment/application/PaymentService.java
package com.popups.pupoo.payment.application;

import com.popups.pupoo.common.exception.BusinessException;
import com.popups.pupoo.common.exception.ErrorCode;
import com.popups.pupoo.event.domain.model.Event;
import com.popups.pupoo.event.domain.enums.RegistrationStatus;
import com.popups.pupoo.event.domain.model.EventRegistration;
import com.popups.pupoo.event.persistence.EventRegistrationRepository;
import com.popups.pupoo.event.persistence.EventRepository;
import com.popups.pupoo.payment.domain.enums.PaymentStatus;
import com.popups.pupoo.payment.domain.enums.PaymentTransactionStatus;
import com.popups.pupoo.payment.domain.enums.PaymentProvider;
import com.popups.pupoo.payment.domain.model.Payment;
import com.popups.pupoo.payment.domain.model.PaymentTransaction;
import com.popups.pupoo.payment.dto.*;
import com.popups.pupoo.payment.persistence.PaymentRepository;
import com.popups.pupoo.payment.persistence.PaymentTransactionRepository;
import com.popups.pupoo.payment.port.PaymentGateway;
import jakarta.transaction.Transactional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientResponseException;

import java.util.EnumSet;
import java.time.LocalDateTime;
import java.util.UUID;

@Service
public class PaymentService {

    private static final Logger log = LoggerFactory.getLogger(PaymentService.class);

    private final PaymentRepository paymentRepository;
    private final PaymentGateway paymentGateway;
    private final PaymentTransactionRepository paymentTransactionRepository;
    private final EventRegistrationRepository eventRegistrationRepository;
    private final EventRepository eventRepository;

    public PaymentService(
            PaymentRepository paymentRepository,
            PaymentGateway paymentGateway,
            PaymentTransactionRepository paymentTransactionRepository,
            EventRegistrationRepository eventRegistrationRepository,
            EventRepository eventRepository
    ) {
        this.paymentRepository = paymentRepository;
        this.paymentGateway = paymentGateway;
        this.paymentTransactionRepository = paymentTransactionRepository;
        this.eventRegistrationRepository = eventRegistrationRepository;
        this.eventRepository = eventRepository;
    }

    /**
     * 결제 요청 생성 + (KAKAOPAY면) ready 호출하여 redirect URL 반환
     */
    @Transactional
    public PaymentReadyResponse requestPayment(Long userId, Long eventId, PaymentCreateRequest req) {
        if (req == null) throw new BusinessException(ErrorCode.VALIDATION_FAILED);
        if (req.amount() == null || req.amount().compareTo(java.math.BigDecimal.ZERO) <= 0)
            throw new BusinessException(ErrorCode.VALIDATION_FAILED);
        if (req.paymentMethod() == null) throw new BusinessException(ErrorCode.VALIDATION_FAILED);
        if (req.paymentMethod() != PaymentProvider.KAKAOPAY) {
            throw new BusinessException(ErrorCode.INVALID_REQUEST, "Only KAKAOPAY is supported");
        }
        if (eventId == null) throw new BusinessException(ErrorCode.INVALID_REQUEST);

        EventRegistration apply = eventRegistrationRepository
                .findByEventIdAndUserIdAndStatusForUpdate(eventId, userId, RegistrationStatus.APPLIED)
                .orElseThrow(() -> new BusinessException(ErrorCode.EVENT_REGISTRATION_NOT_FOUND));

        Long applyId = apply.getApplyId();
        if (applyId == null) throw new BusinessException(ErrorCode.EVENT_REGISTRATION_NOT_FOUND);

        boolean activeExists = paymentRepository
                .findActiveByEventApplyIdForUpdate(applyId, EnumSet.of(PaymentStatus.REQUESTED, PaymentStatus.APPROVED))
                .isPresent();
        if (activeExists) throw new BusinessException(ErrorCode.PAYMENT_DUPLICATE_ACTIVE);

        String orderNo = "P" + UUID.randomUUID().toString().replace("-", "").substring(0, 20);

        Payment payment = Payment.requested(
                userId,
                eventId,
                applyId,
                orderNo,
                req.amount(),
                req.paymentMethod()
        );

        paymentRepository.save(payment);

        log.info("[Payment][AFTER_SAVE] paymentId={}, orderNo={}, userId={}, eventId={}, applyId={}",
                payment.getPaymentId(), payment.getOrderNo(), userId, eventId, applyId);

        try {
            log.info("[Payment][READY] paymentId={}, orderNo={}, eventId={}, userId={}, amount={}, method={}",
                    payment.getPaymentId(),
                    payment.getOrderNo(),
                    payment.getEventId(),
                    payment.getUserId(),
                    req.amount(),
                    req.paymentMethod());

            return paymentGateway.ready(payment, new PaymentReadyRequest("Pupoo 결제", 1, req.amount(), 0));

        } catch (BusinessException e) {
            log.warn("[Payment][READY][BIZ] {}", e.getMessage());
            throw e;

        } catch (RestClientResponseException e) {
            log.error("[Payment][READY][HTTP] status={}, body={}", e.getRawStatusCode(), e.getResponseBodyAsString(), e);
            throw new BusinessException(ErrorCode.PAYMENT_PG_ERROR, e.getResponseBodyAsString());

        } catch (Exception e) {
            log.error("[Payment][READY][UNEXPECTED]", e);
            throw new BusinessException(ErrorCode.PAYMENT_PG_ERROR, e.toString());
        }
    }

    /**
     * 결제 승인 콜백/처리 (카카오페이: pg_token 필수)
     * 승인 성공 시 event_registration 자동 APPROVED 처리
     */
    @Transactional
    public PaymentResponse approvePayment(Long paymentId, String pgToken) {
        Payment payment = paymentRepository.findByIdForUpdate(paymentId)
                .orElseThrow(() -> new BusinessException(ErrorCode.PAYMENT_NOT_FOUND));

        PaymentTransaction tx = paymentTransactionRepository
                .findLatestByPaymentIdForUpdate(paymentId, PageRequest.of(0, 1))
                .stream()
                .findFirst()
                .orElseThrow(() -> new BusinessException(ErrorCode.PAYMENT_TX_NOT_FOUND));

        // tx 멱등
        if (tx.getStatus() == PaymentTransactionStatus.APPROVED) {
            if (payment.getStatus() != PaymentStatus.APPROVED) {
                payment.markApproved();
                autoApproveEventApply(payment);
            }
            return toResponseWithEvent(paymentId, payment);
        }

        // 취소/실패 트랜잭션은 승인 불가
        if (tx.getStatus() == PaymentTransactionStatus.CANCELLED || tx.getStatus() == PaymentTransactionStatus.FAILED) {
            throw new BusinessException(ErrorCode.PAYMENT_TX_INVALID_STATUS);
        }

        // payment 멱등
        if (payment.getStatus() == PaymentStatus.APPROVED) {
        	return toResponseWithEvent(paymentId, payment);
        }
        if (payment.getStatus() != PaymentStatus.REQUESTED) {
            throw new BusinessException(ErrorCode.PAYMENT_INVALID_STATUS);
        }

        boolean ok = paymentGateway.approve(payment, new PaymentApproveRequest(pgToken));

        if (ok) {
            payment.markApproved();
            autoApproveEventApply(payment);
        } else {
            payment.markFailed();
        }

        return toResponseWithEvent(paymentId, payment);
    }

    /**
     * 결제 취소 요청
     * - APPROVED인 결제만 취소 가능(정책)
     */
    @Transactional
    public PaymentResponse cancelPayment(Long paymentId) {
        Payment payment = paymentRepository.findByIdForUpdate(paymentId)
                .orElseThrow(() -> new BusinessException(ErrorCode.PAYMENT_NOT_FOUND));

        validateRefundPolicyByEventSchedule(payment);

        PaymentTransaction tx = paymentTransactionRepository
                .findLatestByPaymentIdForUpdate(paymentId, PageRequest.of(0, 1))
                .stream()
                .findFirst()
                .orElseThrow(() -> new BusinessException(ErrorCode.PAYMENT_TX_NOT_FOUND));

        if (tx.getStatus() == PaymentTransactionStatus.CANCELLED) {
            if (payment.getStatus() != PaymentStatus.CANCELLED) {
                payment.markCancelled();
            }
            return toResponseWithEvent(paymentId, payment);
        }

        if (tx.getStatus() == PaymentTransactionStatus.FAILED) {
            throw new BusinessException(ErrorCode.PAYMENT_TX_INVALID_STATUS);
        }

        // 승인 트랜잭션인데 payment가 아직 APPROVED가 아니면 수렴
        if (tx.getStatus() == PaymentTransactionStatus.APPROVED && payment.getStatus() != PaymentStatus.APPROVED) {
            payment.markApproved();
        }

        if (payment.getStatus() == PaymentStatus.CANCELLED) {
        	return toResponseWithEvent(paymentId, payment);
        }
        if (payment.getStatus() != PaymentStatus.APPROVED) {
            throw new BusinessException(ErrorCode.PAYMENT_INVALID_STATUS);
        }

        boolean ok = paymentGateway.cancel(payment);
        if (!ok) throw new BusinessException(ErrorCode.PAYMENT_PG_ERROR);

        payment.markCancelled();
        return toResponseWithEvent(paymentId, payment);
    }

    @Transactional
    public PaymentResponse cancelMyPayment(Long userId, Long paymentId) {
        Payment payment = paymentRepository.findByIdForUpdate(paymentId)
                .orElseThrow(() -> new BusinessException(ErrorCode.PAYMENT_NOT_FOUND));

        if (!payment.getUserId().equals(userId)) {
            throw new BusinessException(ErrorCode.REFUND_ACCESS_DENIED);
        }

        return cancelPayment(paymentId);
    }

    /**
     * ✅ 결제 내역 조회 (eventTitle/eventStartAt/eventEndAt 포함)
     * - N+1 방지: Payment + Event 조인 조회
     */
    public Page<PaymentResponse> myPayments(Long userId, Pageable pageable) {
        return paymentRepository.findMyPaymentHistory(userId, pageable)
                .map(PaymentResponse::fromRow);
    }

    /**
     * 결제 승인 성공 시 이벤트 참가 신청을 자동 APPROVED 처리한다.
     */
    private void autoApproveEventApply(Payment payment) {
        Long eventId = payment.getEventId();
        Long userId = payment.getUserId();

        EventRegistration er = eventRegistrationRepository
                .findByEventIdAndUserIdAndStatusForUpdate(eventId, userId, RegistrationStatus.APPLIED)
                .orElseGet(() -> eventRegistrationRepository.findByEventIdAndUserIdForUpdate(eventId, userId)
                        .orElseThrow(() -> new BusinessException(ErrorCode.EVENT_REGISTRATION_NOT_FOUND)));

        if (er.getStatus() == RegistrationStatus.APPLIED) {
            er.approve();
        }
    }

    /**
     * approve/cancel 반환도 event 정보 포함시키기 위해 단건 조인 조회 사용
     * (조인 조회 실패 시 기존 payment 기반 fallback)
     */
    private PaymentResponse toResponseWithEvent(Long paymentId, Payment fallback) {
        return paymentRepository.findPaymentDetail(paymentId)
                .map(PaymentResponse::fromRow)
                .orElseGet(() -> PaymentResponse.from(fallback));
    }

    private void validateRefundPolicyByEventSchedule(Payment payment) {
        if (payment.getEventId() == null) {
            return;
        }

        Event event = eventRepository.findById(payment.getEventId())
                .orElseThrow(() -> new BusinessException(ErrorCode.EVENT_NOT_FOUND));

        if (!LocalDateTime.now().isBefore(event.getStartAt())) {
            throw new BusinessException(
                    ErrorCode.REFUND_NOT_ALLOWED,
                    "Refund is only available before event start"
            );
        }
    }
}
