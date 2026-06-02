// file: src/main/java/com/popups/pupoo/event/domain/model/EventRegistration.java
package com.popups.pupoo.event.domain.model;

import com.popups.pupoo.common.exception.BusinessException;
import com.popups.pupoo.common.exception.ErrorCode;
import com.popups.pupoo.event.domain.enums.RegistrationStatus;
import jakarta.persistence.*;

import java.time.LocalDateTime;

/**
 * EventRegistration 엔티티 (pupoo_v2.5 기준)
 *
 * 테이블: event_apply
 * 컬럼:
 * - apply_id (PK)
 * - user_id
 * - event_id
 * - applied_at
 * - status (APPLIED/CANCELLED/APPROVED/REJECTED)
 *
 * 정책:
 * - (event_id, user_id) UNIQUE 로 중복 신청 방지(DDL에 존재)
 */
@Entity
@Table(
        name = "event_apply",
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_event_apply_event_user", columnNames = {"event_id", "user_id"})
        },
        indexes = {
                @Index(name = "ix_event_apply_user_id", columnList = "user_id"),
                @Index(name = "ix_event_apply_event_id", columnList = "event_id")
        }
)
public class EventRegistration {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "apply_id")
    private Long applyId;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "event_id", nullable = false)
    private Long eventId;

    @Column(name = "applied_at", nullable = false)
    private LocalDateTime appliedAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private RegistrationStatus status;

    protected EventRegistration() {
        // JPA 기본 생성자
    }

    private EventRegistration(Long eventId, Long userId) {
        this.eventId = eventId;
        this.userId = userId;
        this.appliedAt = LocalDateTime.now();
        this.status = RegistrationStatus.APPLIED;
    }

    /** 신청 생성 팩토리 */
    public static EventRegistration create(Long eventId, Long userId) {
        return new EventRegistration(eventId, userId);
    }

    /** 신청 취소 */
    public void cancel() {
        // 정책: APPLIED/APPROVED 상태에서만 CANCELLED 전이가 가능하다.
        if (this.status == RegistrationStatus.CANCELLED) {
            return;
        }
        if (this.status != RegistrationStatus.APPLIED && this.status != RegistrationStatus.APPROVED) {
            throw new BusinessException(ErrorCode.EVENT_REGISTRATION_INVALID_STATUS);
        }
        this.status = RegistrationStatus.CANCELLED;
    }
    
    /** 결제 승인 후 자동 승인 */
    public void approve() {
        // 정책: APPLIED 상태에서만 APPROVED 전이가 가능하다.
        if (this.status == RegistrationStatus.APPROVED) {
            return;
        }
        if (this.status != RegistrationStatus.APPLIED) {
            throw new BusinessException(ErrorCode.EVENT_REGISTRATION_INVALID_STATUS);
        }
        this.status = RegistrationStatus.APPROVED;
    }

    /**
     * 관리자 거절 처리
     * - 정책: APPLIED 상태에서만 REJECTED 전이가 가능하다.
     */
    public void reject() {
        if (this.status == RegistrationStatus.REJECTED) {
            return;
        }
        if (this.status != RegistrationStatus.APPLIED) {
            throw new BusinessException(ErrorCode.EVENT_REGISTRATION_INVALID_STATUS);
        }
        this.status = RegistrationStatus.REJECTED;
    }

    /**
     * 재신청 처리
     * - UNIQUE(event_id, user_id) 구조이므로 row를 새로 만들지 않고 상태를 되돌린다.
     */
    public void reapply() {
        if (this.status == RegistrationStatus.APPLIED) {
            return;
        }
        if (this.status != RegistrationStatus.CANCELLED && this.status != RegistrationStatus.REJECTED) {
            throw new BusinessException(ErrorCode.EVENT_REGISTRATION_INVALID_STATUS);
        }
        this.status = RegistrationStatus.APPLIED;
        this.appliedAt = LocalDateTime.now();
    }


    // ===== Getter =====
    public Long getApplyId() { return applyId; }
    public Long getUserId() { return userId; }
    public Long getEventId() { return eventId; }
    public LocalDateTime getAppliedAt() { return appliedAt; }
    public RegistrationStatus getStatus() { return status; }
}
