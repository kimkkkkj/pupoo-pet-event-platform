package com.popups.pupoo.ai.persistence;

import com.popups.pupoo.ai.domain.enums.AiPredictionTargetType;
import com.popups.pupoo.ai.domain.model.AiPredictionLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface AiPredictionLogRepository extends JpaRepository<AiPredictionLog, Long> {

    Optional<AiPredictionLog> findTopByTargetTypeAndEventIdOrderByPredictionBaseTimeDesc(
            AiPredictionTargetType targetType,
            Long eventId
    );

    @Query(value = """
            select
              ranked.prediction_log_id,
              ranked.target_type,
              ranked.event_id,
              ranked.program_id,
              ranked.prediction_base_time,
              ranked.predicted_avg_score_60m,
              ranked.predicted_peak_score_60m,
              ranked.predicted_level,
              ranked.model_version,
              ranked.source_type,
              ranked.created_at
            from (
              select
                apl.*,
                row_number() over (
                  partition by apl.event_id
                  order by apl.prediction_base_time desc, apl.prediction_log_id desc
                ) as rn
              from ai_prediction_logs apl
              where apl.target_type = 'EVENT'
                and apl.event_id is not null
            ) ranked
            where ranked.rn = 1
            """, nativeQuery = true)
    List<AiPredictionLog> findLatestEventPredictions();
}
