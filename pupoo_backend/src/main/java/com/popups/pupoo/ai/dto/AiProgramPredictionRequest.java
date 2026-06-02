package com.popups.pupoo.ai.dto;

import java.time.LocalDateTime;
import java.util.List;

public record AiProgramPredictionRequest(
        Long eventId,
        Long programId,
        LocalDateTime baseTime,
        LocalDateTime programStartAt,
        LocalDateTime programEndAt,
        int activeApplyCount,
        int checkinCount,
        int waitCount,
        double waitMinutes,
        int programCapacity,
        double throughputPerMin,
        int targetWaitMin,
        String category,
        String target,
        String zone,
        List<Double> inputSequence
) {
}
