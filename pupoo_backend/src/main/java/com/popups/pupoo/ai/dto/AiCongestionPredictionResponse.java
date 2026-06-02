package com.popups.pupoo.ai.dto;

import java.time.LocalDateTime;
import java.util.List;

public record AiCongestionPredictionResponse(
        String targetType,
        Long eventId,
        Long programId,
        LocalDateTime baseTime,
        double predictedAvgScore,
        double predictedPeakScore,
        int predictedLevel,
        int predictedWaitMinutes,
        double confidence,
        Double lstmPredictedAvgScore,
        boolean fallbackUsed,
        List<AiTimelinePoint> timeline,
        List<AiTimelinePoint> lstmTimeline
) {
}
