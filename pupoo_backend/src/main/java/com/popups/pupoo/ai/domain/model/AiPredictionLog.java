package com.popups.pupoo.ai.domain.model;

import com.popups.pupoo.ai.domain.enums.AiPredictionSourceType;
import com.popups.pupoo.ai.domain.enums.AiPredictionTargetType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "ai_prediction_logs")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Builder
public class AiPredictionLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "prediction_log_id", nullable = false)
    private Long predictionLogId;

    @Enumerated(EnumType.STRING)
    @Column(name = "target_type", nullable = false, columnDefinition = "ENUM('EVENT','PROGRAM')")
    private AiPredictionTargetType targetType;

    @Column(name = "event_id")
    private Long eventId;

    @Column(name = "program_id")
    private Long programId;

    @Column(name = "prediction_base_time", nullable = false)
    private LocalDateTime predictionBaseTime;

    @Column(name = "predicted_avg_score_60m", nullable = false, precision = 10, scale = 2)
    private BigDecimal predictedAvgScore60m;

    @Column(name = "predicted_peak_score_60m", nullable = false, precision = 10, scale = 2)
    private BigDecimal predictedPeakScore60m;

    @Column(name = "predicted_level", nullable = false)
    private Byte predictedLevel;

    @Column(name = "model_version", nullable = false, length = 50)
    private String modelVersion;

    @Enumerated(EnumType.STRING)
    @Column(name = "source_type", nullable = false, columnDefinition = "ENUM('BATCH','REALTIME')")
    private AiPredictionSourceType sourceType;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    void prePersist() {
        if (this.createdAt == null) {
            this.createdAt = LocalDateTime.now();
        }
    }
}
