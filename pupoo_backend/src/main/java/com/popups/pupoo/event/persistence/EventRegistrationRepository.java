// file: src/main/java/com/popups/pupoo/event/persistence/EventRegistrationRepository.java
package com.popups.pupoo.event.persistence;

import com.popups.pupoo.event.domain.enums.RegistrationStatus;
import com.popups.pupoo.event.domain.model.EventRegistration;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collection;
import java.util.Optional;

/**
 * event_apply 접근 Repository (엔티티명은 EventRegistration)
 */
public interface EventRegistrationRepository extends JpaRepository<EventRegistration, Long> {

    long countByEventIdAndStatus(Long eventId, RegistrationStatus status);
    long countByStatus(RegistrationStatus status);

    boolean existsByEventIdAndUserIdAndStatus(Long eventId, Long userId, RegistrationStatus status);

    Page<EventRegistration> findByUserId(Long userId, Pageable pageable);

    /**
     * 참가 신청 단건 조회
     * - UNIQUE(event_id, user_id) 구조이므로 최대 1건이다.
     */
    Optional<EventRegistration> findByEventIdAndUserId(Long eventId, Long userId);

    /**
     * 참가 신청 단건 조회(락)
     * - 재신청(취소 -> 신청) 같은 상태 전이에서 동시성 정합성 확보
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
        select er
        from EventRegistration er
        where er.eventId = :eventId
          and er.userId = :userId
    """)
    Optional<EventRegistration> findByEventIdAndUserIdForUpdate(
            @Param("eventId") Long eventId,
            @Param("userId") Long userId
    );

    /**
     *  결제 승인 시 자동 승인용: APPLIED 상태 row를 락으로 잡고 가져오기
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
        select er
        from EventRegistration er
        where er.eventId = :eventId
          and er.userId = :userId
          and er.status = :status
    """)
    Optional<EventRegistration> findByEventIdAndUserIdAndStatusForUpdate(
            @Param("eventId") Long eventId,
            @Param("userId") Long userId,
            @Param("status") RegistrationStatus status
    );

    /**
     *  환불 완료 시 자동 취소용:
     * APPLIED/APPROVED 상태를 락으로 잡고 1건 가져오기
     * (CANCELLED/REJECTED는 대상 아님 → 멱등)
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
        select er
        from EventRegistration er
        where er.eventId = :eventId
          and er.userId = :userId
          and er.status in :statuses
    """)
    Optional<EventRegistration> findActiveByEventIdAndUserIdForUpdate(
            @Param("eventId") Long eventId,
            @Param("userId") Long userId,
            @Param("statuses") Collection<RegistrationStatus> statuses
    );

    /** 관리자 처리용: applyId 기준 락 조회 */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
        select er
        from EventRegistration er
        where er.applyId = :applyId
    """)
    Optional<EventRegistration> findByApplyIdForUpdate(@Param("applyId") Long applyId);

    /**
     * 이벤트 참가자 userId 목록(중복 제거)
     * - status=APPROVED
     */
    @Query("""
        select distinct er.userId
        from EventRegistration er
        where er.eventId = :eventId
          and er.status = :status
    """)
    java.util.List<Long> findDistinctUserIdsByEventIdAndStatus(@Param("eventId") Long eventId,
                                                             @Param("status") RegistrationStatus status);

    /** ★ 추가: 행사 Hard Delete 시 연관 신청 데이터 일괄 삭제 */
    @Modifying
    @Transactional
    @Query("DELETE FROM EventRegistration er WHERE er.eventId = :eventId")
    int deleteByEventId(@Param("eventId") Long eventId);
}
