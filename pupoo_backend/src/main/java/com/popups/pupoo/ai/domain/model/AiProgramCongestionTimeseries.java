package com.popups.pupoo.ai.domain.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(
        name = "ai_program_congestion_timeseries",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uk_ai_program_congestion_program_time",
                        columnNames = {"program_id", "timestamp_minute"}
                )
        },
        indexes = {
                @Index(name = "ix_ai_program_congestion_event_id", columnList = "event_id"),
                @Index(name = "ix_ai_program_congestion_time", columnList = "timestamp_minute"),
                @Index(name = "ix_ai_program_congestion_program_time", columnList = "program_id,timestamp_minute")
        }
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Builder
public class AiProgramCongestionTimeseries {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "program_timeseries_id", nullable = false)
    private Long programTimeseriesId;

    @Column(name = "event_id", nullable = false)
    private Long eventId;

    @Column(name = "program_id", nullable = false)
    private Long programId;

    @Column(name = "timestamp_minute", nullable = false)
    private LocalDateTime timestampMinute;

    @Column(name = "checkins_1m", nullable = false)
    private Integer checkins1m;

    @Column(name = "checkouts_1m", nullable = false)
    private Integer checkouts1m;

    @Column(name = "active_apply_count", nullable = false)
    private Integer activeApplyCount;

    @Column(name = "wait_count", nullable = false)
    private Integer waitCount;

    @Column(name = "wait_min")
    private Integer waitMin;

    @Column(name = "progress_minute", nullable = false)
    private Integer progressMinute;

    @Column(name = "hour_of_day", nullable = false)
    private Byte hourOfDay;

    @Column(name = "day_of_week", nullable = false)
    private Byte dayOfWeek;

    @Column(name = "congestion_score", nullable = false, precision = 10, scale = 2)
    private BigDecimal congestionScore;

    @Column(name = "created_at", nullable = false, insertable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false, insertable = false, updatable = false)
    private LocalDateTime updatedAt;

    public void applySnapshot(
            int checkins1m,
            int checkouts1m,
            int activeApplyCount,
            int waitCount,
            int waitMin,
            int progressMinute,
            byte hourOfDay,
            byte dayOfWeek,
            BigDecimal congestionScore
    ) {
        this.checkins1m = checkins1m;
        this.checkouts1m = checkouts1m;
        this.activeApplyCount = activeApplyCount;
        this.waitCount = waitCount;
        this.waitMin = waitMin;
        this.progressMinute = progressMinute;
        this.hourOfDay = hourOfDay;
        this.dayOfWeek = dayOfWeek;
        this.congestionScore = congestionScore;
    }
}
