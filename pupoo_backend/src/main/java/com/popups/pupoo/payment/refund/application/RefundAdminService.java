// file: src/main/java/com/popups/pupoo/payment/refund/application/RefundAdminService.java
package com.popups.pupoo.payment.refund.application;

import com.popups.pupoo.common.audit.application.AdminLogService;
import com.popups.pupoo.common.audit.domain.enums.AdminTargetType;
import com.popups.pupoo.common.exception.BusinessException;
import com.popups.pupoo.common.exception.ErrorCode;
import com.popups.pupoo.event.domain.enums.RegistrationStatus;
import com.popups.pupoo.event.domain.model.EventRegistration;
import com.popups.pupoo.event.persistence.EventRegistrationRepository;
import com.popups.pupoo.program.apply.domain.enums.ApplyStatus;
import com.popups.pupoo.program.apply.domain.model.ProgramApply;
import com.popups.pupoo.program.apply.persistence.ProgramApplyRepository;
import com.popups.pupoo.payment.domain.enums.PaymentStatus;
import com.popups.pupoo.payment.domain.model.Payment;
import com.popups.pupoo.payment.persistence.PaymentRepository;
import com.popups.pupoo.payment.port.PaymentGateway;
import com.popups.pupoo.payment.refund.domain.enums.RefundStatus;
import com.popups.pupoo.payment.refund.domain.model.Refund;
import com.popups.pupoo.payment.refund.dto.RefundResponse;
import com.popups.pupoo.payment.refund.persistence.RefundRepository;
import jakarta.transaction.Transactional;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class RefundAdminService {

    private final RefundRepository refundRepository;
    private final PaymentRepository paymentRepository;
    private final PaymentGateway paymentGateway;
    private final AdminLogService adminLogService;

    private final EventRegistrationRepository eventRegistrationRepository;
    private final ProgramApplyRepository programApplyRepository;

    public RefundAdminService(RefundRepository refundRepository,
                              PaymentRepository paymentRepository,
                              PaymentGateway paymentGateway,
                              AdminLogService adminLogService,
                              EventRegistrationRepository eventRegistrationRepository,
                              ProgramApplyRepository programApplyRepository) {
        this.refundRepository = refundRepository;
        this.paymentRepository = paymentRepository;
        this.paymentGateway = paymentGateway;
        this.adminLogService = adminLogService;
        this.eventRegistrationRepository = eventRegistrationRepository;
        this.programApplyRepository = programApplyRepository;
    }

    /**
     * 정책: 승인형 + 혼합 실행(C)
     * - 자동승인 케이스: 승인 + 즉시 PG 취소(approveAndComplete)
     * - 관리자 승인 케이스: approve()로 APPROVED까지만, execute()에서 실제 PG 취소
     *
     * 자가복구: 이미 COMPLETED여도 다시 호출되면 정합성 보정(행사/프로그램 취소 재시도)
     */
    @Transactional
    public RefundResponse approveAndComplete(Long refundId) {
        // 1) 환불 락
        Refund refund = refundRepository.findByIdForUpdate(refundId)
                .orElseThrow(() -> new BusinessException(ErrorCode.REFUND_NOT_FOUND));

        // 2) 결제 락 (자가복구를 위해 COMPLETED에서도 필요)
        Payment payment = paymentRepository.findByIdForUpdate(refund.getPaymentId())
                .orElseThrow(() -> new BusinessException(ErrorCode.PAYMENT_NOT_FOUND));

        //  자가복구: 이미 COMPLETED면 PG 호출 없이 정합성만 맞추고 return
        if (refund.getStatus() == RefundStatus.COMPLETED) {
            if (payment.getEventId() != null) {
                autoCancelEventRegistration(payment);
                autoCancelProgramApplies(payment);
            }
            return RefundResponse.from(refund);
        }

        if (refund.getStatus() != RefundStatus.REQUESTED) {
            throw new BusinessException(ErrorCode.REFUND_INVALID_STATUS);
        }

        if (payment.getStatus() != PaymentStatus.APPROVED) {
            throw new BusinessException(ErrorCode.REFUND_NOT_ALLOWED);
        }

        // 3) PG 취소/환불
        boolean ok = paymentGateway.cancel(payment);
        if (!ok) {
            throw new BusinessException(ErrorCode.REFUND_PG_CANCEL_FAILED);
        }

        // 4) DB 반영(=COMPLETED 확정)
        payment.markRefunded();
        refund.completeNow();

        // 5) COMPLETED 시점 자동 취소
        if (payment.getEventId() != null) {
            autoCancelEventRegistration(payment);
            autoCancelProgramApplies(payment);
        }

        // 관리자 로그 적재
        adminLogService.write("REFUND_APPROVE_COMPLETE", AdminTargetType.REFUND, refundId);

        return RefundResponse.from(refund);
    }

    /**
     * 관리자 승인: REQUESTED -> APPROVED
     */
    @Transactional
    public RefundResponse approve(Long refundId, String reason) {
        Refund refund = refundRepository.findByIdForUpdate(refundId)
                .orElseThrow(() -> new BusinessException(ErrorCode.REFUND_NOT_FOUND));

        if (refund.getStatus() == RefundStatus.COMPLETED) {
            return RefundResponse.from(refund);
        }

        if (refund.getStatus() != RefundStatus.REQUESTED) {
            throw new BusinessException(ErrorCode.REFUND_INVALID_STATUS);
        }

        refund.approve();

        adminLogService.write(
                "REFUND_APPROVE" + (reason == null || reason.isBlank() ? "" : "|" + reason),
                AdminTargetType.REFUND,
                refundId
        );

        return RefundResponse.from(refund);
    }

    /**
     * 관리자 거절: REQUESTED -> REJECTED
     */
    @Transactional
    public RefundResponse reject(Long refundId, String reason) {
        Refund refund = refundRepository.findByIdForUpdate(refundId)
                .orElseThrow(() -> new BusinessException(ErrorCode.REFUND_NOT_FOUND));

        if (refund.getStatus() == RefundStatus.COMPLETED) {
            throw new BusinessException(ErrorCode.REFUND_INVALID_STATUS);
        }
        if (refund.getStatus() != RefundStatus.REQUESTED) {
            throw new BusinessException(ErrorCode.REFUND_INVALID_STATUS);
        }

        refund.reject();

        adminLogService.write(
                "REFUND_REJECT" + (reason == null || reason.isBlank() ? "" : "|" + reason),
                AdminTargetType.REFUND,
                refundId
        );

        return RefundResponse.from(refund);
    }

    /**
     * 관리자 실행: APPROVED -> COMPLETED
     */
    @Transactional
    public RefundResponse execute(Long refundId) {
        Refund refund = refundRepository.findByIdForUpdate(refundId)
                .orElseThrow(() -> new BusinessException(ErrorCode.REFUND_NOT_FOUND));

        Payment payment = paymentRepository.findByIdForUpdate(refund.getPaymentId())
                .orElseThrow(() -> new BusinessException(ErrorCode.PAYMENT_NOT_FOUND));

        if (refund.getStatus() == RefundStatus.COMPLETED) {
            if (payment.getEventId() != null) {
                autoCancelEventRegistration(payment);
                autoCancelProgramApplies(payment);
            }
            return RefundResponse.from(refund);
        }

        if (refund.getStatus() != RefundStatus.APPROVED) {
            throw new BusinessException(ErrorCode.REFUND_INVALID_STATUS);
        }
        if (payment.getStatus() != PaymentStatus.APPROVED) {
            throw new BusinessException(ErrorCode.REFUND_NOT_ALLOWED);
        }

        boolean ok = paymentGateway.cancel(payment);
        if (!ok) {
            throw new BusinessException(ErrorCode.REFUND_PG_CANCEL_FAILED);
        }

        payment.markRefunded();
        refund.completeNow();

        if (payment.getEventId() != null) {
            autoCancelEventRegistration(payment);
            autoCancelProgramApplies(payment);
        }

        adminLogService.write("REFUND_EXECUTE", AdminTargetType.REFUND, refundId);

        return RefundResponse.from(refund);
    }

    private void autoCancelEventRegistration(Payment payment) {
        eventRegistrationRepository
                .findActiveByEventIdAndUserIdForUpdate(
                        payment.getEventId(),
                        payment.getUserId(),
                        List.of(RegistrationStatus.APPLIED, RegistrationStatus.APPROVED)
                )
                .ifPresent(EventRegistration::cancel);
    }

    private void autoCancelProgramApplies(Payment payment) {
        List<ProgramApply> applies = programApplyRepository.findActiveByEventIdAndUserIdForUpdate(
                payment.getEventId(),
                payment.getUserId(),
                List.of(ApplyStatus.APPLIED, ApplyStatus.WAITING, ApplyStatus.APPROVED)
        );

        applies.forEach(ProgramApply::cancel); // cancelled_at 세팅 + CHECK 충족
    }
}
