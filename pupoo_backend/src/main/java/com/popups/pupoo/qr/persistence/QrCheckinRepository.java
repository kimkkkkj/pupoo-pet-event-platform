// file: src/main/java/com/popups/pupoo/qr/persistence/QrCheckinRepository.java
package com.popups.pupoo.qr.persistence;

import com.popups.pupoo.qr.domain.enums.QrCheckType;
import com.popups.pupoo.qr.domain.model.QrCheckin;
import com.popups.pupoo.qr.persistence.projection.BoothVisitSummaryRow;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface QrCheckinRepository extends JpaRepository<QrCheckin, Long> {

    // =========================
    // (A) 방문 목록 요약(이벤트별/부스별) - Native Query
    // =========================
    @Query(value = """
        WITH logs AS (
          SELECT
            q.event_id AS event_id,
            l.booth_id AS booth_id,
            l.check_type AS check_type,
            l.checked_at AS checked_at,
            l.log_id AS log_id,
            ROW_NUMBER() OVER (
              PARTITION BY q.event_id, l.booth_id
              ORDER BY l.checked_at DESC, l.log_id DESC
            ) AS rn
          FROM qr_codes q
          JOIN qr_logs l ON l.qr_id = q.qr_id
          WHERE q.user_id = :userId
            AND (:eventId IS NULL OR q.event_id = :eventId)
        )
        SELECT
          e.event_id AS eventId,
          e.event_name AS eventName,

          b.booth_id AS boothId,
          b.place_name AS placeName,
          b.zone AS zone,
          b.type AS type,
          b.status AS status,

          b.company AS company,
          b.description AS description,

          COUNT(*) AS visitCount,
          MAX(logs.checked_at) AS lastVisitedAt,
          MAX(CASE WHEN logs.rn = 1 THEN logs.check_type END) AS lastCheckType
        FROM logs
        JOIN booths b ON b.booth_id = logs.booth_id
        JOIN event  e ON e.event_id = logs.event_id
        WHERE b.event_id = logs.event_id
        GROUP BY
          e.event_id, e.event_name,
          b.booth_id, b.place_name, b.zone, b.type, b.status,
          b.company, b.description
        ORDER BY e.event_id DESC, lastVisitedAt DESC
        """, nativeQuery = true)
    List<BoothVisitSummaryRow> findMyBoothVisitSummaryRows(
            @Param("userId") Long userId,
            @Param("eventId") Long eventId
    );

    // =========================
    // (B) 특정 부스 방문 로그 - JPQL
    // =========================
    @Query("""
        select l
        from QrCheckin l
        where l.qrCode.user.userId = :userId
          and l.qrCode.event.eventId = :eventId
          and l.booth.boothId = :boothId
        order by l.checkedAt desc
    """)
    List<QrCheckin> findMyLogsByBooth(
            @Param("userId") Long userId,
            @Param("eventId") Long eventId,
            @Param("boothId") Long boothId
    );

    // =========================
    // (C) 관리자 체크인/체크아웃 정책용: 마지막 로그 1건 조회
    // =========================
    Optional<QrCheckin> findTopByQrCode_QrIdAndBooth_BoothIdOrderByCheckedAtDesc(Long qrId, Long boothId);

    /**
     * 관리자 대시보드(실시간)용: 금일 체크인 로그 카운트
     */
    long countByCheckedAtBetween(LocalDateTime from, LocalDateTime to);

    long countByQrCode_Event_EventId(Long eventId);

    long countByQrCode_Event_EventIdAndCheckType(Long eventId, QrCheckType checkType);

    long countByQrCode_Event_EventIdAndCheckTypeAndCheckedAtBetween(
            Long eventId,
            QrCheckType checkType,
            LocalDateTime fromInclusive,
            LocalDateTime toInclusive
    );

    Optional<QrCheckin> findTopByQrCode_Event_EventIdAndCheckTypeOrderByCheckedAtDesc(
            Long eventId,
            QrCheckType checkType
    );

    @Query("""
        select count(distinct l.qrCode.user.userId)
        from QrCheckin l
        where l.qrCode.event.eventId = :eventId
          and l.checkType = :checkType
    """)
    long countDistinctUsersByEventIdAndCheckType(
            @Param("eventId") Long eventId,
            @Param("checkType") QrCheckType checkType
    );

    @Query("""
        select count(distinct l.qrCode.user.userId)
        from QrCheckin l
        where l.qrCode.event.eventId = :eventId
          and l.checkType = :checkType
          and l.checkedAt between :fromInclusive and :toInclusive
    """)
    long countDistinctUsersByEventIdAndCheckTypeAndCheckedAtBetween(
            @Param("eventId") Long eventId,
            @Param("checkType") QrCheckType checkType,
            @Param("fromInclusive") LocalDateTime fromInclusive,
            @Param("toInclusive") LocalDateTime toInclusive
    );

    default long countDistinctCheckinUsersByEventId(Long eventId) {
        return countDistinctUsersByEventIdAndCheckType(eventId, QrCheckType.CHECKIN);
    }

    default long countDistinctCheckinUsersByEventIdBetween(
            Long eventId,
            LocalDateTime fromInclusive,
            LocalDateTime toInclusive
    ) {
        return countDistinctUsersByEventIdAndCheckTypeAndCheckedAtBetween(
                eventId,
                QrCheckType.CHECKIN,
                fromInclusive,
                toInclusive
        );
    }
}
