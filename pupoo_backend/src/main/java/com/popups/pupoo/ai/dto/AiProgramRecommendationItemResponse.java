package com.popups.pupoo.ai.dto;

import java.time.LocalDateTime;

public record AiProgramRecommendationItemResponse(
        Long programId,
        Long eventId,
        String title,
        String category,
        String target,
        String zone,
        LocalDateTime startAt,
        LocalDateTime endAt,
        double predictedScore,
        int predictedLevel,
        int predictedWaitMinutes,
        String reason
) {
}
