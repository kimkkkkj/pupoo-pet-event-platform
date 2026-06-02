// file: src/main/java/com/popups/pupoo/payment/refund/persistence/RefundRepository.java
package com.popups.pupoo.payment.refund.persistence;

import com.popups.pupoo.payment.refund.domain.enums.RefundStatus;
import com.popups.pupoo.payment.refund.domain.model.Refund;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface RefundRepository extends JpaRepository<Refund, Long> {

    interface AdminRefundRow {
        Long getRefundId();
        Long getPaymentId();
        Long getEventApplyId();
        java.math.BigDecimal getRefundAmount();
        String getReason();
        RefundStatus getStatus();
        java.time.LocalDateTime getRequestedAt();
        java.time.LocalDateTime getCompletedAt();
        Long getEventId();
        String getEventTitle();
    }

    Page<Refund> findAll(Pageable pageable);

    @Query("select r from Refund r join fetch r.payment p where r.refundId = :refundId")
    Optional<Refund> findDetail(@Param("refundId") Long refundId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select r from Refund r where r.refundId = :refundId")
    Optional<Refund> findByIdForUpdate(@Param("refundId") Long refundId);

    Optional<Refund> findByPayment_PaymentId(Long paymentId);

    @EntityGraph(attributePaths = "payment")
    Page<Refund> findByPayment_UserId(Long userId, Pageable pageable);

    Page<Refund> findByStatus(RefundStatus status, Pageable pageable);

    long countByStatus(RefundStatus status);

    @Query("""
        select
          r.refundId as refundId,
          p.paymentId as paymentId,
          p.eventApplyId as eventApplyId,
          r.refundAmount as refundAmount,
          r.reason as reason,
          r.status as status,
          r.requestedAt as requestedAt,
          r.completedAt as completedAt,
          p.eventId as eventId,
          e.eventName as eventTitle
        from Refund r
        join r.payment p
        left join Event e on e.eventId = p.eventId
        """)
    Page<AdminRefundRow> findAdminRefunds(Pageable pageable);

    @Query("""
        select
          r.refundId as refundId,
          p.paymentId as paymentId,
          p.eventApplyId as eventApplyId,
          r.refundAmount as refundAmount,
          r.reason as reason,
          r.status as status,
          r.requestedAt as requestedAt,
          r.completedAt as completedAt,
          p.eventId as eventId,
          e.eventName as eventTitle
        from Refund r
        join r.payment p
        left join Event e on e.eventId = p.eventId
        where r.status = :status
        """)
    Page<AdminRefundRow> findAdminRefundsByStatus(@Param("status") RefundStatus status, Pageable pageable);

    @Query("""
        select
          r.refundId as refundId,
          p.paymentId as paymentId,
          p.eventApplyId as eventApplyId,
          r.refundAmount as refundAmount,
          r.reason as reason,
          r.status as status,
          r.requestedAt as requestedAt,
          r.completedAt as completedAt,
          p.eventId as eventId,
          e.eventName as eventTitle
        from Refund r
        join r.payment p
        left join Event e on e.eventId = p.eventId
        where r.refundId = :refundId
        """)
    Optional<AdminRefundRow> findAdminRefundDetail(@Param("refundId") Long refundId);

    boolean existsByPayment_PaymentId(Long paymentId);

    boolean existsByPayment_PaymentIdAndStatus(Long paymentId, RefundStatus status);
}
