package com.popups.pupoo.ai.persistence;

import java.time.LocalDateTime;

public interface AiEventCongestionBaselineQueryRepository {

    Double findEndedAverageScorePercent(LocalDateTime fromInclusive, LocalDateTime toInclusive);

    Double findOngoingAverageScorePercent(LocalDateTime fromInclusive, LocalDateTime toInclusive);
}
