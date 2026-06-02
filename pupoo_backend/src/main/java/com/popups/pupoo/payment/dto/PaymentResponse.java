// file: src/main/java/com/popups/pupoo/payment/dto/PaymentResponse.java
package com.popups.pupoo.payment.dto;

import com.popups.pupoo.payment.domain.enums.PaymentProvider;
import com.popups.pupoo.payment.domain.enums.PaymentStatus;
import com.popups.pupoo.payment.domain.model.Payment;
import com.popups.pupoo.payment.persistence.PaymentRepository;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record PaymentResponse(
        Long paymentId,
        String orderNo,
        BigDecimal amount,
        PaymentProvider paymentMethod,
        PaymentStatus status,
        LocalDateTime requestedAt,
        Long eventId,
        String eventTitle,
        LocalDateTime eventStartAt,
        LocalDateTime eventEndAt,
        String buyerName,
        String buyerEmail,
        String buyerPhone
) {
    public static PaymentResponse fromRow(PaymentRepository.PaymentHistoryRow row) {
        return new PaymentResponse(
                row.getPaymentId(),
                row.getOrderNo(),
                row.getAmount(),
                row.getPaymentMethod(),
                row.getStatus(),
                row.getRequestedAt(),
                row.getEventId(),
                row.getEventTitle(),
                row.getEventStartAt(),
                row.getEventEndAt(),
                null,
                null,
                null
        );
    }

    public static PaymentResponse fromAdminRow(PaymentRepository.AdminPaymentRow row) {
        return new PaymentResponse(
                row.getPaymentId(),
                row.getOrderNo(),
                row.getAmount(),
                row.getPaymentMethod(),
                row.getStatus(),
                row.getRequestedAt(),
                row.getEventId(),
                row.getEventTitle(),
                row.getEventStartAt(),
                row.getEventEndAt(),
                row.getBuyerName(),
                row.getBuyerEmail(),
                row.getBuyerPhone()
        );
    }

    public static PaymentResponse from(Payment payment) {
        return new PaymentResponse(
                payment.getPaymentId(),
                payment.getOrderNo(),
                payment.getAmount(),
                payment.getPaymentMethod(),
                payment.getStatus(),
                payment.getRequestedAt(),
                payment.getEventId(),
                null,
                null,
                null,
                null,
                null,
                null
        );
    }
}