package com.popups.pupoo.ai.dto;

import java.util.List;

public record AiProgramRecommendationResponse(
        Long eventId,
        Long programId,
        double thresholdScore,
        boolean fallbackUsed,
        String message,
        List<AiProgramRecommendationItemResponse> recommendations
) {
}
