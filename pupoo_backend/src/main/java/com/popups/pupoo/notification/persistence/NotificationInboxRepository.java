// file: src/main/java/com/popups/pupoo/notification/persistence/NotificationInboxRepository.java
package com.popups.pupoo.notification.persistence;

import com.popups.pupoo.notification.domain.model.NotificationInbox;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface NotificationInboxRepository extends JpaRepository<NotificationInbox, Long> {

    /**
     * 읽지 않은 알림 수(인박스 건수). 배지 등에 사용.
     */
    @Query("select count(i) from NotificationInbox i where i.userId = :userId")
    long countByUserId(@Param("userId") Long userId);

    /**
     * 내 미열람(=인박스) 목록 조회.
     * - inbox.createdAt DESC
     */
    @EntityGraph(attributePaths = {"notification"})
    @Query("""
            select i
            from NotificationInbox i
            where i.userId = :userId
            order by i.createdAt desc
            """)
    Page<NotificationInbox> findMyInbox(@Param("userId") Long userId, Pageable pageable);

    /**
     * 클릭(읽음) 처리: 소유자 검증용 조회
     */
    @Query("""
            select i
            from NotificationInbox i
            join fetch i.notification n
            where i.inboxId = :inboxId
              and i.userId = :userId
            """)
    Optional<NotificationInbox> findByInboxIdAndUserId(@Param("inboxId") Long inboxId,
                                                       @Param("userId") Long userId);

    /**
     * 클릭(읽음) 정책: 읽는 순간 인박스에서 삭제.
     */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("""
            delete from NotificationInbox i
            where i.inboxId = :inboxId
              and i.userId = :userId
            """)
    int deleteByInboxIdAndUserId(@Param("inboxId") Long inboxId, @Param("userId") Long userId);

    /**
     * [INAPP Fan-out] event_interest_map + user_interest_subscriptions 기반으로
     * 특정 event_id 관심 구독자들에게 인박스 대량 적재.
     *
     *  DB 정책: 인박스는 미열람만 저장. (클릭 시 삭제)
     */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query(value = """
            INSERT INTO notification_inbox (user_id, notification_id, created_at, target_type, target_id)
            SELECT DISTINCT
                uis.user_id,
                :notificationId,
                NOW(),
                :targetType,
                :targetId
            FROM event_interest_map eim
            JOIN user_interest_subscriptions uis
              ON uis.interest_id = eim.interest_id
            WHERE eim.event_id = :eventId
              AND uis.status = 'ACTIVE'
              AND uis.allow_inapp = 1
            """, nativeQuery = true)
    int fanoutInboxByEventInterest(@Param("eventId") Long eventId,
                                   @Param("notificationId") Long notificationId,
                                   @Param("targetType") String targetType,
                                   @Param("targetId") Long targetId);

    /**
     * [INAPP Fan-out] 이벤트 신청자(event_apply) 기반 인박스 적재
     */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query(value = """
            INSERT INTO notification_inbox (user_id, notification_id, created_at, target_type, target_id)
            SELECT DISTINCT
                ea.user_id,
                :notificationId,
                NOW(),
                :targetType,
                :targetId
            FROM event_apply ea
            WHERE ea.event_id = :eventId
              AND ea.status IN ('APPLIED', 'APPROVED')
            """, nativeQuery = true)
    int fanoutInboxByEventRegistrants(@Param("eventId") Long eventId,
                                     @Param("notificationId") Long notificationId,
                                     @Param("targetType") String targetType,
                                     @Param("targetId") Long targetId);

    /**
     * [INAPP Fan-out] 결제 완료자(payments) 기반 인박스 적재
     */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query(value = """
            INSERT INTO notification_inbox (user_id, notification_id, created_at, target_type, target_id)
            SELECT DISTINCT
                p.user_id,
                :notificationId,
                NOW(),
                :targetType,
                :targetId
            FROM payments p
            WHERE p.event_id = :eventId
              AND p.status = 'APPROVED'
            """, nativeQuery = true)
    int fanoutInboxByEventPayers(@Param("eventId") Long eventId,
                                 @Param("notificationId") Long notificationId,
                                 @Param("targetType") String targetType,
                                 @Param("targetId") Long targetId);

    @Query(value = """
            SELECT DISTINCT uis.user_id
            FROM event_interest_map eim
            JOIN user_interest_subscriptions uis
              ON uis.interest_id = eim.interest_id
            WHERE eim.event_id = :eventId
              AND uis.status = 'ACTIVE'
              AND uis.allow_inapp = 1
            """, nativeQuery = true)
    List<Long> findInAppUserIdsByEventInterest(@Param("eventId") Long eventId);

    @Query(value = """
            SELECT DISTINCT ea.user_id
            FROM event_apply ea
            WHERE ea.event_id = :eventId
              AND ea.status IN ('APPLIED', 'APPROVED')
            """, nativeQuery = true)
    List<Long> findInAppUserIdsByEventRegistrants(@Param("eventId") Long eventId);

    @Query(value = """
            SELECT DISTINCT p.user_id
            FROM payments p
            WHERE p.event_id = :eventId
              AND p.status = 'APPROVED'
            """, nativeQuery = true)
    List<Long> findInAppUserIdsByEventPayers(@Param("eventId") Long eventId);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query(value = """
            INSERT INTO notification_inbox (user_id, notification_id, created_at, target_type, target_id)
            SELECT
                u.user_id,
                :notificationId,
                NOW(),
                :targetType,
                :targetId
            FROM users u
            WHERE u.status = 'ACTIVE'
            """, nativeQuery = true)
    int fanoutInboxByAllActiveUsers(@Param("notificationId") Long notificationId,
                                    @Param("targetType") String targetType,
                                    @Param("targetId") Long targetId);

    @Query(value = """
            SELECT COUNT(*)
            FROM users u
            WHERE u.status = 'ACTIVE'
            """, nativeQuery = true)
    int countAllActiveUsers();

    /* =========================================================
     * EMAIL/SMS 전송 대상 산정(로컬은 실제 발송 대신 send 테이블로 기록)
     * - 수신허용(allow_email/allow_sms) 정책 강제
     * - notification_send는 NotificationSendRepository에서 생성하지만,
     *   대상자 선별은 DB 쿼리로 확정한다.
     *
     * 주의: notification_send는 (notification_id, sender_id, ...) 중심이라
     *      "수신자별 기록"이 필요한 경우에는 별도 테이블 확장이 필요하다.
     *      v1.0에서는 발송행위 로그(채널/발신자/알림ID)만 남긴다.
     * ========================================================= */

    @Query(value = """
            SELECT DISTINCT u.email
            FROM event_interest_map eim
            JOIN user_interest_subscriptions uis
              ON uis.interest_id = eim.interest_id
            JOIN users u
              ON u.user_id = uis.user_id
            WHERE eim.event_id = :eventId
              AND uis.status = 'ACTIVE'
              AND uis.allow_email = 1
            """, nativeQuery = true)
    List<String> findEmailTargetsByEventInterest(@Param("eventId") Long eventId);

    @Query(value = """
            SELECT DISTINCT u.phone
            FROM event_interest_map eim
            JOIN user_interest_subscriptions uis
              ON uis.interest_id = eim.interest_id
            JOIN users u
              ON u.user_id = uis.user_id
            WHERE eim.event_id = :eventId
              AND uis.status = 'ACTIVE'
              AND uis.allow_sms = 1
            """, nativeQuery = true)
    List<String> findSmsTargetsByEventInterest(@Param("eventId") Long eventId);

    @Query(value = """
            SELECT DISTINCT u.email
            FROM event_apply ea
            JOIN users u
              ON u.user_id = ea.user_id
            WHERE ea.event_id = :eventId
              AND ea.status IN ('APPLIED', 'APPROVED')
            """, nativeQuery = true)
    List<String> findEmailTargetsByEventRegistrants(@Param("eventId") Long eventId);

    @Query(value = """
            SELECT DISTINCT u.phone
            FROM event_apply ea
            JOIN users u
              ON u.user_id = ea.user_id
            WHERE ea.event_id = :eventId
              AND ea.status IN ('APPLIED', 'APPROVED')
            """, nativeQuery = true)
    List<String> findSmsTargetsByEventRegistrants(@Param("eventId") Long eventId);

    @Query(value = """
            SELECT DISTINCT u.email
            FROM payments p
            JOIN users u
              ON u.user_id = p.user_id
            WHERE p.event_id = :eventId
              AND p.status = 'APPROVED'
            """, nativeQuery = true)
    List<String> findEmailTargetsByEventPayers(@Param("eventId") Long eventId);

    @Query(value = """
            SELECT DISTINCT u.phone
            FROM payments p
            JOIN users u
              ON u.user_id = p.user_id
            WHERE p.event_id = :eventId
              AND p.status = 'APPROVED'
            """, nativeQuery = true)
    List<String> findSmsTargetsByEventPayers(@Param("eventId") Long eventId);

}
