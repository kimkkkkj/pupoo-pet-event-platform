package com.popups.pupoo.ai.dto;

import java.time.LocalDateTime;
import java.util.List;

public record AiProgramRecommendationRequest(
        Long eventId,
        Long programId,
        LocalDateTime baseTime,
        double thresholdScore,
        AiRecommendationProgramInput currentProgram,
        List<AiRecommendationProgramInput> candidates
) {
}
