// file: src/main/java/com/popups/pupoo/payment/persistence/PaymentRepository.java
package com.popups.pupoo.payment.persistence;

import com.popups.pupoo.payment.domain.enums.PaymentStatus;
import com.popups.pupoo.payment.domain.model.Payment;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.EnumSet;
import java.util.List;
import java.util.Optional;

public interface PaymentRepository extends JpaRepository<Payment, Long> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
        select p
        from Payment p
        where p.paymentId = :paymentId
        """)
    Optional<Payment> findByIdForUpdate(@Param("paymentId") Long paymentId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
        select p
        from Payment p
        where p.eventApplyId = :applyId
          and p.status in :statuses
        """)
    Optional<Payment> findActiveByEventApplyIdForUpdate(
            @Param("applyId") Long applyId,
            @Param("statuses") EnumSet<PaymentStatus> statuses
    );

    interface PaymentHistoryRow {
        Long getPaymentId();
        String getOrderNo();
        java.math.BigDecimal getAmount();
        com.popups.pupoo.payment.domain.enums.PaymentProvider getPaymentMethod();
        com.popups.pupoo.payment.domain.enums.PaymentStatus getStatus();
        java.time.LocalDateTime getRequestedAt();
        Long getEventId();
        String getEventTitle();
        java.time.LocalDateTime getEventStartAt();
        java.time.LocalDateTime getEventEndAt();
    }

    interface AdminPaymentRow extends PaymentHistoryRow {
        String getBuyerName();
        String getBuyerEmail();
        String getBuyerPhone();
    }

    @Query("""
        select
          p.paymentId as paymentId,
          p.orderNo as orderNo,
          p.amount as amount,
          p.paymentMethod as paymentMethod,
          p.status as status,
          p.requestedAt as requestedAt,
          p.eventId as eventId,
          e.eventName as eventTitle,
          e.startAt as eventStartAt,
          e.endAt as eventEndAt
        from Payment p
        join Event e on e.eventId = p.eventId
        where p.userId = :userId
        """)
    Page<PaymentHistoryRow> findMyPaymentHistory(@Param("userId") Long userId, Pageable pageable);

    @Query("""
        select
          p.paymentId as paymentId,
          p.orderNo as orderNo,
          p.amount as amount,
          p.paymentMethod as paymentMethod,
          p.status as status,
          p.requestedAt as requestedAt,
          p.eventId as eventId,
          e.eventName as eventTitle,
          e.startAt as eventStartAt,
          e.endAt as eventEndAt
        from Payment p
        join Event e on e.eventId = p.eventId
        where p.paymentId = :paymentId
        """)
    Optional<PaymentHistoryRow> findPaymentDetail(@Param("paymentId") Long paymentId);

    @Query("""
        select
          p.paymentId as paymentId,
          p.orderNo as orderNo,
          p.amount as amount,
          p.paymentMethod as paymentMethod,
          p.status as status,
          p.requestedAt as requestedAt,
          p.eventId as eventId,
          e.eventName as eventTitle,
          e.startAt as eventStartAt,
          e.endAt as eventEndAt,
          u.nickname as buyerName,
          u.email as buyerEmail,
          u.phone as buyerPhone
        from Payment p
        left join Event e on e.eventId = p.eventId
        left join User u on u.userId = p.userId
        """)
    Page<AdminPaymentRow> findAdminPaymentHistory(Pageable pageable);

    @Query("""
        select
          p.paymentId as paymentId,
          p.orderNo as orderNo,
          p.amount as amount,
          p.paymentMethod as paymentMethod,
          p.status as status,
          p.requestedAt as requestedAt,
          p.eventId as eventId,
          e.eventName as eventTitle,
          e.startAt as eventStartAt,
          e.endAt as eventEndAt,
          u.nickname as buyerName,
          u.email as buyerEmail,
          u.phone as buyerPhone
        from Payment p
        left join Event e on e.eventId = p.eventId
        left join User u on u.userId = p.userId
        where p.paymentId = :paymentId
        """)
    Optional<AdminPaymentRow> findAdminPaymentDetail(@Param("paymentId") Long paymentId);

    @Query("""
        select
          p.paymentId as paymentId,
          p.orderNo as orderNo,
          p.amount as amount,
          p.paymentMethod as paymentMethod,
          p.status as status,
          p.requestedAt as requestedAt,
          p.eventId as eventId,
          e.eventName as eventTitle,
          e.startAt as eventStartAt,
          e.endAt as eventEndAt,
          u.nickname as buyerName,
          u.email as buyerEmail,
          u.phone as buyerPhone
        from Payment p
        left join Event e on e.eventId = p.eventId
        left join User u on u.userId = p.userId
        where p.eventId = :eventId
        order by p.requestedAt desc, p.paymentId desc
        """)
    List<AdminPaymentRow> findAdminPaymentsByEventId(@Param("eventId") Long eventId);

    Page<Payment> findByUserId(Long userId, Pageable pageable);
}