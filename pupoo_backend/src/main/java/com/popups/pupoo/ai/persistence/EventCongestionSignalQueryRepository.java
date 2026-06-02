package com.popups.pupoo.ai.persistence;

import java.time.LocalDateTime;

public interface EventCongestionSignalQueryRepository {

    EventSignalSnapshot collectEventSignalSnapshot(Long eventId, LocalDateTime baseTime);

    record EventSignalSnapshot(
            double applicationTrendScore,
            double applyConversionScore,
            double queueOperationScore,
            double zoneDensityScore,
            double stayTimeScore,
            double manualCongestionScore,
            double revisitScore,
            double voteHeatScore,
            double paymentIntentScore
    ) {
    }
}
