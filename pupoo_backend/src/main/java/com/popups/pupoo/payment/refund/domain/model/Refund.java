// file: src/main/java/com/popups/pupoo/payment/refund/domain/model/Refund.java
package com.popups.pupoo.payment.refund.domain.model;

import com.popups.pupoo.payment.domain.model.Payment;
import com.popups.pupoo.payment.refund.domain.enums.RefundStatus;
import jakarta.persistence.*;
import org.hibernate.annotations.Check;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(
        name = "refunds",
        uniqueConstraints = @UniqueConstraint(name = "uk_refunds_payment_id", columnNames = "payment_id"),
        indexes = @Index(name = "ix_refunds_status", columnList = "status")
)
@Check(name = "ck_refunds_refund_amount", constraints = "refund_amount > 0")
@Check(
        name = "ck_refunds_completed_at",
        constraints = "((status = 'COMPLETED' AND completed_at IS NOT NULL) OR (status <> 'COMPLETED' AND completed_at IS NULL))"
)
public class Refund {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "refund_id", nullable = false)
    private Long refundId;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "payment_id", nullable = false, unique = true,
            foreignKey = @ForeignKey(name = "fk_refunds_payment"))
    private Payment payment;

    @Column(name = "refund_amount", nullable = false, precision = 10, scale = 2)
    private BigDecimal refundAmount;

    @Column(name = "reason", nullable = false, length = 255)
    private String reason;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private RefundStatus status = RefundStatus.REQUESTED;

    @Column(name = "requested_at", nullable = false, updatable = false)
    private LocalDateTime requestedAt;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    protected Refund() {}

    public static Refund requested(Payment payment, BigDecimal refundAmount, String reason) {
        Refund r = new Refund();
        r.payment = payment;
        r.refundAmount = refundAmount;
        r.reason = reason;
        r.status = RefundStatus.REQUESTED;
        return r;
    }

    @PrePersist
    void prePersist() {
        LocalDateTime now = LocalDateTime.now();
        if (requestedAt == null) requestedAt = now;
        if (createdAt == null) createdAt = now;
        if (updatedAt == null) updatedAt = now;
        normalizeByStatus();
        validate();
    }

    @PreUpdate
    void preUpdate() {
        updatedAt = LocalDateTime.now();
        normalizeByStatus();
        validate();
    }

    private void normalizeByStatus() {
        if (status == RefundStatus.COMPLETED) {
            if (completedAt == null) completedAt = LocalDateTime.now();
        } else {
            completedAt = null;
        }
    }

    private void validate() {
        if (payment == null) throw new IllegalStateException("payment required");
        if (refundAmount == null || refundAmount.compareTo(BigDecimal.ZERO) <= 0) throw new IllegalStateException("refundAmount must be positive");
        if (reason == null || reason.isBlank()) throw new IllegalStateException("reason required");
        if (status == null) throw new IllegalStateException("status required");
        if (status == RefundStatus.COMPLETED && completedAt == null) throw new IllegalStateException("completedAt required when COMPLETED");
        if (status != RefundStatus.COMPLETED && completedAt != null) throw new IllegalStateException("completedAt must be null when not COMPLETED");
    }

    // 상태 전이 (정책: 승인=즉시 완료는 서비스에서 completeNow() 호출)
    public void approve() {
        if (status != RefundStatus.REQUESTED) throw new IllegalStateException("approve only when REQUESTED");
        this.status = RefundStatus.APPROVED;
    }

    public void reject() {
        if (status != RefundStatus.REQUESTED) throw new IllegalStateException("reject only when REQUESTED");
        this.status = RefundStatus.REJECTED;
    }

    public void completeNow() {
        if (status != RefundStatus.REQUESTED && status != RefundStatus.APPROVED)
            throw new IllegalStateException("complete only when REQUESTED/APPROVED");
        this.status = RefundStatus.COMPLETED;
        this.completedAt = LocalDateTime.now();
    }

    // getters
    public Long getRefundId() { return refundId; }
    public Payment getPayment() { return payment; }
    public Long getPaymentId() { return payment.getPaymentId(); }
    public BigDecimal getRefundAmount() { return refundAmount; }
    public String getReason() { return reason; }
    public RefundStatus getStatus() { return status; }
    public LocalDateTime getRequestedAt() { return requestedAt; }
    public LocalDateTime getCompletedAt() { return completedAt; }
}
