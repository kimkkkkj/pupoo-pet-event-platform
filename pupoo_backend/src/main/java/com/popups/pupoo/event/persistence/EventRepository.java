// file: src/main/java/com/popups/pupoo/event/persistence/EventRepository.java
package com.popups.pupoo.event.persistence;

import com.popups.pupoo.event.domain.enums.EventStatus;
import com.popups.pupoo.event.domain.model.Event;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
/**
 * EventRepository (v2.5 기준)
 *
 * 목록 조회 요구:
 * - keyword(옵션): event_name / description LIKE
 * - status(옵션)
 * - 기간(옵션): start_at ~ end_at 범위 필터(단순 start_at 기준)
 *
 * created_at이 없으므로 정렬은 start_at/event_id 기준으로 처리
 */
public interface EventRepository extends JpaRepository<Event, Long> {

    long countByStatus(EventStatus status);
    List<Event> findByStatus(EventStatus status);

    /**
     * 공개 조회용: CANCELLED 제외
     */
    @Query("""
        SELECT e
        FROM Event e
        WHERE e.status <> com.popups.pupoo.event.domain.enums.EventStatus.CANCELLED
          AND (:status IS NULL OR e.status = :status)
          AND (
                :keyword IS NULL OR :keyword = ''
                OR e.eventName LIKE CONCAT('%', :keyword, '%')
                OR e.description LIKE CONCAT('%', :keyword, '%')
          )
          AND (:fromAt IS NULL OR e.startAt >= :fromAt)
          AND (:toAt IS NULL OR e.startAt <= :toAt)
        ORDER BY e.startAt DESC, e.eventId DESC
    """)
    Page<Event> searchPublic(
            @Param("keyword") String keyword,
            @Param("status") EventStatus status,
            @Param("fromAt") LocalDateTime fromAt,
            @Param("toAt") LocalDateTime toAt,
            Pageable pageable
    );

    /**
     * 관리자/내부 조회용: 상태 전체 포함
     */
    @Query("""
        SELECT e
        FROM Event e
        WHERE (:status IS NULL OR e.status = :status)
          AND (
                :keyword IS NULL OR :keyword = ''
                OR e.eventName LIKE CONCAT('%', :keyword, '%')
                OR e.description LIKE CONCAT('%', :keyword, '%')
          )
          AND (:fromAt IS NULL OR e.startAt >= :fromAt)
          AND (:toAt IS NULL OR e.startAt <= :toAt)
        ORDER BY e.startAt DESC, e.eventId DESC
    """)
    Page<Event> search(
            @Param("keyword") String keyword,
            @Param("status") EventStatus status,
            @Param("fromAt") LocalDateTime fromAt,
            @Param("toAt") LocalDateTime toAt,
            Pageable pageable
    );

    /**
     * 시작 전 → PLANNED
     */
    @Modifying
    @Transactional
    @Query(value = """
        UPDATE event
        SET status = 'PLANNED'
        WHERE start_at > NOW()
          AND status <> 'PLANNED'
        """, nativeQuery = true)
    int syncToPlanned();

    /**
     * 진행 중 → ONGOING
     */
    @Modifying
    @Transactional
    @Query(value = """
        UPDATE event
        SET status = 'ONGOING'
        WHERE start_at <= NOW()
          AND end_at >= NOW()
          AND status <> 'ONGOING'
        """, nativeQuery = true)
    int syncToOngoing();

    /**
     * 종료 → ENDED
     */
    @Modifying
    @Transactional
    @Query(value = """
        UPDATE event
        SET status = 'ENDED'
        WHERE end_at < NOW()
          AND status <> 'ENDED'
        """, nativeQuery = true)
    int syncToEnded();
}
