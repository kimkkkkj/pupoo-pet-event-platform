package com.popups.pupoo.ai.persistence;

import com.popups.pupoo.ai.domain.model.AiProgramCongestionTimeseries;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface AiProgramCongestionTimeseriesRepository extends JpaRepository<AiProgramCongestionTimeseries, Long> {

    Optional<AiProgramCongestionTimeseries> findByProgramIdAndTimestampMinute(Long programId, LocalDateTime timestampMinute);
    List<AiProgramCongestionTimeseries> findTop60ByProgramIdAndTimestampMinuteLessThanEqualOrderByTimestampMinuteDesc(
            Long programId,
            LocalDateTime timestampMinute
    );

    List<AiProgramCongestionTimeseries> findByTimestampMinuteAndProgramIdIn(
            LocalDateTime timestampMinute,
            Collection<Long> programIds
    );

    @Modifying
    @Query(
            value = """
                    INSERT INTO ai_program_congestion_timeseries (
                        event_id,
                        program_id,
                        timestamp_minute,
                        checkins_1m,
                        checkouts_1m,
                        active_apply_count,
                        wait_count,
                        wait_min,
                        progress_minute,
                        hour_of_day,
                        day_of_week,
                        congestion_score
                    ) VALUES (
                        :eventId,
                        :programId,
                        :timestampMinute,
                        :checkins1m,
                        :checkouts1m,
                        :activeApplyCount,
                        :waitCount,
                        :waitMin,
                        :progressMinute,
                        :hourOfDay,
                        :dayOfWeek,
                        :congestionScore
                    )
                    ON DUPLICATE KEY UPDATE
                        event_id = VALUES(event_id),
                        checkins_1m = VALUES(checkins_1m),
                        checkouts_1m = VALUES(checkouts_1m),
                        active_apply_count = VALUES(active_apply_count),
                        wait_count = VALUES(wait_count),
                        wait_min = VALUES(wait_min),
                        progress_minute = VALUES(progress_minute),
                        hour_of_day = VALUES(hour_of_day),
                        day_of_week = VALUES(day_of_week),
                        congestion_score = VALUES(congestion_score)
                    """,
            nativeQuery = true
    )
    void upsertSnapshot(
            @Param("eventId") Long eventId,
            @Param("programId") Long programId,
            @Param("timestampMinute") LocalDateTime timestampMinute,
            @Param("checkins1m") Integer checkins1m,
            @Param("checkouts1m") Integer checkouts1m,
            @Param("activeApplyCount") Integer activeApplyCount,
            @Param("waitCount") Integer waitCount,
            @Param("waitMin") Integer waitMin,
            @Param("progressMinute") Integer progressMinute,
            @Param("hourOfDay") Byte hourOfDay,
            @Param("dayOfWeek") Byte dayOfWeek,
            @Param("congestionScore") BigDecimal congestionScore
    );
}
