/* file: src/main/java/com/popups/pupoo/program/apply/domain/model/ProgramApply.java */
package com.popups.pupoo.program.apply.domain.model;

import com.popups.pupoo.common.exception.BusinessException;
import com.popups.pupoo.common.exception.ErrorCode;
import com.popups.pupoo.program.apply.domain.enums.ApplyStatus;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "event_program_apply")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class ProgramApply {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "program_apply_id")
    private Long programApplyId;

    @Column(name = "program_id", nullable = false)
    private Long programId;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "pet_id")
    private Long petId;

    // TODO(step-01-storage-policy): keep the legacy column name for now, but store a storage key instead of a full URL.
    @Column(name = "image_url")
    private String imageUrl;

    @Column(name = "admin_pet_name")
    private String adminPetName;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private ApplyStatus status;

    @Column(name = "ticket_no", length = 30)
    private String ticketNo;

    @Column(name = "eta_min")
    private Integer etaMin;

    @Column(name = "notified_at")
    private LocalDateTime notifiedAt;

    @Column(name = "checked_in_at")
    private LocalDateTime checkedInAt;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "cancelled_at")
    private LocalDateTime cancelledAt;

    @Column(name = "active_flag", insertable = false, updatable = false)
    private Byte activeFlag;

    public static ProgramApply create(Long userId, Long programId, Long petId, String imageUrl) {
        return ProgramApply.builder()
                .userId(userId)
                .programId(programId)
                .petId(petId)
                .imageUrl(imageUrl)
                .status(ApplyStatus.APPROVED)
                .ticketNo(null)
                .etaMin(null)
                .notifiedAt(null)
                .checkedInAt(null)
                .createdAt(LocalDateTime.now())
                .cancelledAt(null)
                .build();
    }

    public void cancel() {
        if (this.status == ApplyStatus.CANCELLED) {
            return;
        }
        this.status = ApplyStatus.CANCELLED;
        this.cancelledAt = LocalDateTime.now();
    }

    // ✅ 추가: 관리자 승인
    public void approve() {
        if (this.status == ApplyStatus.APPROVED) {
            return;
        }
        if (this.status == ApplyStatus.CANCELLED) {
            throw new BusinessException(ErrorCode.PROGRAM_APPLY_INVALID_STATUS);
        }
        this.status = ApplyStatus.APPROVED;
    }

    // ✅ 추가: 관리자 반려
    public void reject() {
        if (this.status == ApplyStatus.CANCELLED) {
            throw new BusinessException(ErrorCode.PROGRAM_APPLY_INVALID_STATUS);
        }
        this.status = ApplyStatus.REJECTED;
    }

    // ✅ 추가: 승인 취소 → 다시 APPLIED로 (재검토)
    public void resetToApplied() {
        if (this.status == ApplyStatus.CANCELLED) {
            throw new BusinessException(ErrorCode.PROGRAM_APPLY_INVALID_STATUS);
        }
        this.status = ApplyStatus.APPLIED;
    }

    public boolean isActive() {
        return this.status == ApplyStatus.APPLIED
                || this.status == ApplyStatus.WAITING
                || this.status == ApplyStatus.APPROVED;
    }

    public void updateTicketInfo(String ticketNo, Integer etaMin, LocalDateTime notifiedAt) {
        this.ticketNo = ticketNo;
        this.etaMin = etaMin;
        this.notifiedAt = notifiedAt;
    }

    public void markCheckedIn(LocalDateTime now) {
        if (this.status == ApplyStatus.CHECKED_IN) {
            return;
        }
        if (this.status != ApplyStatus.APPROVED) {
            throw new BusinessException(ErrorCode.PROGRAM_APPLY_INVALID_STATUS);
        }

        this.status = ApplyStatus.CHECKED_IN;
        this.checkedInAt = (now == null) ? LocalDateTime.now() : now;
    }

    public void checkIn() {
        markCheckedIn(LocalDateTime.now());
    }
}
// Note: resetToApplied() 메서드도 ProgramApply에 추가 필요
