// file: src/main/java/com/popups/pupoo/program/apply/domain/model/ProgramParticipationStat.java
package com.popups.pupoo.program.apply.domain.model;

import jakarta.persistence.*;
import lombok.*;

import java.io.Serializable;
import java.time.LocalDateTime;

/**
 * 프로그램 참여 집계
 *
 * 목적
 * - (user_id, program_id) 기준으로 "몇 번 참여했는지" 카운트를 유지한다.
 * - event_history는 이력을 무한 적재하고, 본 테이블은 조회 최적화를 위한 집계 테이블이다.
 */
@Entity
@Table(name = "program_participation_stats")
@IdClass(ProgramParticipationStat.Pk.class)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class ProgramParticipationStat {

    @Id
    @Column(name = "user_id")
    private Long userId;

    @Id
    @Column(name = "program_id")
    private Long programId;

    @Column(name = "participate_count", nullable = false)
    private Long participateCount;

    @Column(name = "last_participated_at")
    private LocalDateTime lastParticipatedAt;

    public static ProgramParticipationStat create(Long userId, Long programId) {
        return ProgramParticipationStat.builder()
                .userId(userId)
                .programId(programId)
                .participateCount(0L)
                .lastParticipatedAt(null)
                .build();
    }

    public void increase(LocalDateTime now) {
        if (this.participateCount == null) this.participateCount = 0L;
        this.participateCount = this.participateCount + 1L;
        this.lastParticipatedAt = now;
    }

    @Getter
    @NoArgsConstructor
    @AllArgsConstructor
    @EqualsAndHashCode // ✅ 추가: composite key 동등성/해시 구현 (Hibernate WARN 제거)
    public static class Pk implements Serializable {
        private static final long serialVersionUID = 1L;
        private Long userId;
        private Long programId;
    }
}
