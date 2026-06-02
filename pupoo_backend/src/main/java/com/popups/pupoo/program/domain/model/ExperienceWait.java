// file: src/main/java/com/popups/pupoo/program/domain/model/ExperienceWait.java
package com.popups.pupoo.program.domain.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * 체험 대기열 집계
 *
 * - DB: experience_waits
 * - 정책: program_id 당 1행(UNIQUE)
 */
@Entity
@Table(name = "experience_waits")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Builder
public class ExperienceWait {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "wait_id", nullable = false)
    private Long waitId;

    @Column(name = "program_id", nullable = false)
    private Long programId;

    @Column(name = "wait_count")
    private Integer waitCount;

    @Column(name = "wait_min")
    private Integer waitMin;

    @Column(name = "updated_at", nullable = false, insertable = false, updatable = false)
    private LocalDateTime updatedAt;

    public static ExperienceWait create(Long programId, int waitCount, int waitMin) {
        return ExperienceWait.builder()
                .programId(programId)
                .waitCount(Math.max(waitCount, 0))
                .waitMin(Math.max(waitMin, 0))
                .build();
    }

    public void applySnapshot(int waitCount, int waitMin) {
        this.waitCount = Math.max(waitCount, 0);
        this.waitMin = Math.max(waitMin, 0);
    }
}
