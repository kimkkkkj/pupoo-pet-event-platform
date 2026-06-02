// file: src/main/java/com/popups/pupoo/payment/domain/model/PaymentTransaction.java
package com.popups.pupoo.payment.domain.model;

import com.popups.pupoo.payment.domain.enums.PaymentTransactionStatus;
import com.popups.pupoo.payment.domain.enums.PgProvider;

import jakarta.persistence.*;
import org.hibernate.annotations.Check;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "payment_transactions",
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_payment_transactions_provider_tid", columnNames = {"pg_provider", "pg_tid"})
        },
        indexes = {
                @Index(name = "ix_payment_transactions_status", columnList = "status"),
                @Index(name = "ix_payment_transactions_payment_id", columnList = "payment_id")
        }
)
@Check(
        name = "ck_payment_transactions_status_datetime",
        constraints =
                "((status = 'READY' AND approved_at IS NULL AND cancelled_at IS NULL AND failed_at IS NULL) " +
                " OR (status = 'APPROVED' AND approved_at IS NOT NULL AND cancelled_at IS NULL AND failed_at IS NULL) " +
                " OR (status = 'CANCELLED' AND cancelled_at IS NOT NULL AND failed_at IS NULL) " +
                " OR (status = 'FAILED' AND failed_at IS NOT NULL))"
)
public class PaymentTransaction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "tx_id", nullable = false)
    private Long txId;

    @Column(name = "payment_id", nullable = false)
    private Long paymentId;

    @Enumerated(EnumType.STRING)
    @Column(name = "pg_provider", nullable = false)
    private PgProvider pgProvider;

    @Column(name = "pg_tid", nullable = false, length = 100)
    private String pgTid;

    @Column(name = "pg_token", length = 100)
    private String pgToken;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private PaymentTransactionStatus status = PaymentTransactionStatus.READY;

    @Column(name = "idempotency_key", length = 64)
    private String idempotencyKey;

    @Column(name = "raw_ready", columnDefinition = "json")
    private String rawReady;

    @Column(name = "raw_approve", columnDefinition = "json")
    private String rawApprove;

    @Column(name = "raw_cancel", columnDefinition = "json")
    private String rawCancel;

    @Column(name = "requested_at", nullable = false, updatable = false)
    private LocalDateTime requestedAt;

    @Column(name = "approved_at")
    private LocalDateTime approvedAt;

    @Column(name = "cancelled_at")
    private LocalDateTime cancelledAt;

    @Column(name = "failed_at")
    private LocalDateTime failedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    protected PaymentTransaction() {}

    public static PaymentTransaction ready(Long paymentId, String tid, String rawReadyJson) {
        PaymentTransaction tx = new PaymentTransaction();
        tx.paymentId = paymentId;
        tx.pgProvider = PgProvider.KAKAOPAY;
        tx.pgTid = tid;
        tx.status = PaymentTransactionStatus.READY;
        tx.rawReady = rawReadyJson;
        return tx;
    }

    @PrePersist
    void prePersist() {
        LocalDateTime now = LocalDateTime.now();
        if (requestedAt == null) requestedAt = now;
        if (createdAt == null) createdAt = now;
        if (updatedAt == null) updatedAt = now;
        normalize();
    }

    @PreUpdate
    void preUpdate() {
        updatedAt = LocalDateTime.now();
        normalize();
    }

    private void normalize() {
        if (status == PaymentTransactionStatus.READY) {
            approvedAt = null; cancelledAt = null; failedAt = null;
        } else if (status == PaymentTransactionStatus.APPROVED) {
            if (approvedAt == null) approvedAt = LocalDateTime.now();
            cancelledAt = null; failedAt = null;
        } else if (status == PaymentTransactionStatus.CANCELLED) {
            if (cancelledAt == null) cancelledAt = LocalDateTime.now();
            failedAt = null;
        } else if (status == PaymentTransactionStatus.FAILED) {
            if (failedAt == null) failedAt = LocalDateTime.now();
        }
    }

    public void setPgToken(String pgToken) { this.pgToken = pgToken; }

    public void markApproved(String rawApproveJson) {
        this.status = PaymentTransactionStatus.APPROVED;
        this.rawApprove = rawApproveJson;
        this.approvedAt = LocalDateTime.now();
    }

    public void markFailed(String rawErrorJson) {
        this.status = PaymentTransactionStatus.FAILED;
        this.rawApprove = rawErrorJson;
        this.failedAt = LocalDateTime.now();
    }
    
    public void markCancelled(String rawCancelJson) {
        this.status = PaymentTransactionStatus.CANCELLED;
        this.rawCancel = rawCancelJson;
        this.cancelledAt = LocalDateTime.now();
    }


    public Long getTxId() { return txId; }
    public Long getPaymentId() { return paymentId; }
    public String getPgTid() { return pgTid; }
    public String getPgToken() { return pgToken; }
    public PaymentTransactionStatus getStatus() { return status; }

    public String getRawReady() { return rawReady; }
}
