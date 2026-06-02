package com.popups.pupoo.ai.dto;

import java.time.LocalDateTime;
import java.util.List;

public record AiEventPredictionRequest(
        Long eventId,
        LocalDateTime baseTime,
        LocalDateTime eventStartAt,
        LocalDateTime eventEndAt,
        int entryCount,
        int checkoutCount,
        int activeApplyCount,
        int preRegisteredCount,
        int approvedRegistrationCount,
        int participantCount,
        int currentInsideCount,
        int runningProgramCount,
        int totalProgramCount,
        int totalWaitCount,
        double averageWaitMinutes,
        int capacityBaseline,
        int waitBaseline,
        int targetWaitMin,
        double registrationForecastScore,
        double endedBaselineScore,
        double ongoingBaselineScore,
        double locationDemandScore,
        String eventLocation,
        double applicationTrendScore,
        double applyConversionScore,
        double queueOperationScore,
        double zoneDensityScore,
        double stayTimeScore,
        double manualCongestionScore,
        double revisitScore,
        double voteHeatScore,
        double paymentIntentScore,
        List<Double> inputSequence
) {
}
