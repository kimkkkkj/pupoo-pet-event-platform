package com.popups.pupoo.event.application;

import com.popups.pupoo.common.exception.BusinessException;
import com.popups.pupoo.common.exception.ErrorCode;
import com.popups.pupoo.event.domain.enums.EventStatus;
import com.popups.pupoo.event.domain.enums.RegistrationStatus;
import com.popups.pupoo.event.domain.model.Event;
import com.popups.pupoo.event.domain.model.EventRegistration;
import com.popups.pupoo.event.dto.EventRegistrationResponse;
import com.popups.pupoo.event.persistence.EventRegistrationRepository;
import com.popups.pupoo.event.persistence.EventRepository;
import com.popups.pupoo.payment.application.PaymentService;
import com.popups.pupoo.payment.domain.enums.PaymentStatus;
import com.popups.pupoo.payment.domain.model.Payment;
import com.popups.pupoo.payment.persistence.PaymentRepository;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.EnumSet;

@Service
public class EventRegistrationService {

    private final EventRepository eventRepository;
    private final EventRegistrationRepository registrationRepository;
    private final PaymentRepository paymentRepository;
    private final PaymentService paymentService;

    public EventRegistrationService(
            EventRepository eventRepository,
            EventRegistrationRepository registrationRepository,
            PaymentRepository paymentRepository,
            PaymentService paymentService
    ) {
        this.eventRepository = eventRepository;
        this.registrationRepository = registrationRepository;
        this.paymentRepository = paymentRepository;
        this.paymentService = paymentService;
    }

    @Transactional
    public EventRegistrationResponse apply(Long eventId, Long userId) {
        if (eventId == null || userId == null) {
            throw new BusinessException(ErrorCode.INVALID_REQUEST, "eventId/userId is required");
        }

        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new BusinessException(ErrorCode.EVENT_NOT_FOUND));

        if (event.getStatus() != EventStatus.ONGOING && event.getStatus() != EventStatus.PLANNED) {
            throw new BusinessException(ErrorCode.EVENT_NOT_APPLICABLE);
        }

        EventRegistration existing = registrationRepository.findByEventIdAndUserIdForUpdate(eventId, userId).orElse(null);
        if (existing != null) {
            if (existing.getStatus() == RegistrationStatus.APPLIED || existing.getStatus() == RegistrationStatus.APPROVED) {
                throw new BusinessException(ErrorCode.EVENT_REGISTRATION_DUPLICATE);
            }
            existing.reapply();
            return EventRegistrationResponse.from(existing);
        }

        try {
            EventRegistration saved = registrationRepository.save(EventRegistration.create(eventId, userId));
            return EventRegistrationResponse.from(saved);
        } catch (DataIntegrityViolationException e) {
            throw new BusinessException(ErrorCode.EVENT_REGISTRATION_DUPLICATE);
        }
    }

    @Transactional
    public void cancel(Long applyId, Long userId) {
        EventRegistration reg = registrationRepository.findById(applyId)
                .orElseThrow(() -> new BusinessException(ErrorCode.EVENT_REGISTRATION_NOT_FOUND));

        if (!reg.getUserId().equals(userId)) {
            throw new BusinessException(ErrorCode.EVENT_REGISTRATION_ACCESS_DENIED);
        }

        if (reg.getStatus() == RegistrationStatus.CANCELLED) {
            return;
        }

        if (reg.getStatus() == RegistrationStatus.APPLIED) {
            reg.cancel();
            registrationRepository.save(reg);
            registrationRepository.flush();
            return;
        }

        if (reg.getStatus() == RegistrationStatus.APPROVED) {
            Event event = eventRepository.findById(reg.getEventId())
                    .orElseThrow(() -> new BusinessException(ErrorCode.EVENT_NOT_FOUND));

            LocalDateTime now = LocalDateTime.now();
            if (!now.isBefore(event.getStartAt())) {
                throw new BusinessException(ErrorCode.REFUND_NOT_ALLOWED, "Refund is only available before event start");
            }

            paymentRepository.findActiveByEventApplyIdForUpdate(
                    reg.getApplyId(),
                    EnumSet.of(PaymentStatus.APPROVED)
            ).ifPresent(payment -> paymentService.cancelMyPayment(userId, payment.getPaymentId()));

            reg.cancel();
            registrationRepository.save(reg);
            registrationRepository.flush();
            return;
        }

        throw new BusinessException(ErrorCode.EVENT_REGISTRATION_INVALID_STATUS);
    }

    public Page<EventRegistrationResponse> getMyRegistrations(Long userId, Pageable pageable) {
        return registrationRepository.findByUserId(userId, pageable)
                .map(EventRegistrationResponse::from);
    }
}
