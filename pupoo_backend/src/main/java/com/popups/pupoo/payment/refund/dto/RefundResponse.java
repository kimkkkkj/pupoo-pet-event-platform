// file: src/main/java/com/popups/pupoo/payment/refund/dto/RefundResponse.java
package com.popups.pupoo.payment.refund.dto;

import com.popups.pupoo.payment.refund.domain.model.Refund;
import com.popups.pupoo.payment.refund.persistence.RefundRepository;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record RefundResponse(
        Long refundId,
        Long paymentId,
        Long eventApplyId,
        BigDecimal refundAmount,
        String reason,
        String status,
        LocalDateTime requestedAt,
        LocalDateTime completedAt,
        Long eventId,
        String eventTitle
) {
    public static RefundResponse fromRow(RefundRepository.AdminRefundRow row) {
        return new RefundResponse(
                row.getRefundId(),
                row.getPaymentId(),
                row.getEventApplyId(),
                row.getRefundAmount(),
                row.getReason(),
                exposeStatus(row.getStatus() == null ? null : row.getStatus().name()),
                row.getRequestedAt(),
                row.getCompletedAt(),
                row.getEventId(),
                row.getEventTitle()
        );
    }

    public static RefundResponse from(Refund r) {
        return new RefundResponse(
                r.getRefundId(),
                r.getPaymentId(),
                r.getPayment() == null ? null : r.getPayment().getEventApplyId(),
                r.getRefundAmount(),
                r.getReason(),
                exposeStatus(r.getStatus() == null ? null : r.getStatus().name()),
                r.getRequestedAt(),
                r.getCompletedAt(),
                r.getPayment() == null ? null : r.getPayment().getEventId(),
                null
        );
    }

    private static String exposeStatus(String rawStatus) {
        return "COMPLETED".equals(rawStatus) ? "REFUNDED" : rawStatus;
    }
}
