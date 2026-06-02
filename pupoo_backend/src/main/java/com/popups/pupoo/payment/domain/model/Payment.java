// file: src/main/java/com/popups/pupoo/payment/domain/model/Payment.java
package com.popups.pupoo.payment.domain.model;

import com.popups.pupoo.payment.domain.enums.PaymentProvider;
import com.popups.pupoo.payment.domain.enums.PaymentStatus;
import jakarta.persistence.*;
import org.hibernate.annotations.Check;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(
        name = "payments",
        uniqueConstraints = @UniqueConstraint(name = "uk_payments_order_no", columnNames = "order_no"),
        indexes = {
                @Index(name = "ix_payments_user_id", columnList = "user_id"),
                @Index(name = "ix_payments_event_id", columnList = "event_id")
        }
)
@Check(name = "ck_payments_amount_positive", constraints = "amount > 0")
public class Payment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "payment_id", nullable = false)
    private Long paymentId;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "event_id")
    private Long eventId; // NULL 가능(DDL)

    @Column(name = "event_apply_id", nullable = false)
    private Long eventApplyId;

    @Column(name = "order_no", nullable = false, length = 50)
    private String orderNo;

    @Column(name = "amount", nullable = false, precision = 10, scale = 2)
    private BigDecimal amount;

    @Enumerated(EnumType.STRING)
    @Column(name = "payment_method", nullable = false, length = 20)
    private PaymentProvider paymentMethod;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private PaymentStatus status = PaymentStatus.REQUESTED;

    @Column(name = "requested_at", nullable = false, updatable = false)
    private LocalDateTime requestedAt;

    protected Payment() {}

    public static Payment requested(Long userId, Long eventId, Long eventApplyId, String orderNo, BigDecimal amount, PaymentProvider method) {
        Payment p = new Payment();
        p.userId = userId;
        p.eventId = eventId;
        p.eventApplyId = eventApplyId;
        p.orderNo = orderNo;
        p.amount = amount;
        p.paymentMethod = method;
        p.status = PaymentStatus.REQUESTED;
        return p;
    }

    @PrePersist
    void prePersist() {
        if (requestedAt == null) requestedAt = LocalDateTime.now();
        validate();
    }

    @PreUpdate
    void preUpdate() {
        validate();
    }

    private void validate() {
        if (userId == null) throw new IllegalStateException("userId required");
        if (orderNo == null || orderNo.isBlank()) throw new IllegalStateException("orderNo required");
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) throw new IllegalStateException("amount must be positive");
        if (paymentMethod == null) throw new IllegalStateException("paymentMethod required");
        if (status == null) throw new IllegalStateException("status required");
        if (eventApplyId == null) throw new IllegalStateException("eventApplyId required");
    }

    // 상태 전이
    public void markApproved() { this.status = PaymentStatus.APPROVED; }
    public void markFailed() { this.status = PaymentStatus.FAILED; }
    public void markCancelled() { this.status = PaymentStatus.CANCELLED; }
    public void markRefunded() { this.status = PaymentStatus.REFUNDED; }

    // getters
    public Long getPaymentId() { return paymentId; }
    public Long getUserId() { return userId; }
    public Long getEventId() { return eventId; }
    public Long getEventApplyId() { return eventApplyId; }
    public String getOrderNo() { return orderNo; }
    public BigDecimal getAmount() { return amount; }
    public PaymentProvider getPaymentMethod() { return paymentMethod; }
    public PaymentStatus getStatus() { return status; }
    public LocalDateTime getRequestedAt() { return requestedAt; }
}
