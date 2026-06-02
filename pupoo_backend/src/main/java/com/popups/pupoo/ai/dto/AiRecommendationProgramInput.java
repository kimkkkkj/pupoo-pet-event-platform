package com.popups.pupoo.ai.dto;

import java.time.LocalDateTime;

public record AiRecommendationProgramInput(
        Long programId,
        Long eventId,
        String title,
        String category,
        String target,
        String zone,
        LocalDateTime startAt,
        LocalDateTime endAt,
        double predictedScore,
        int predictedWaitMinutes
) {
}
