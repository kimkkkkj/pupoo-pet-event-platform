package com.popups.pupoo.ai.dto;

import java.time.LocalDateTime;

public record AiTimelinePoint(
        LocalDateTime time,
        double score,
        int level,
        int waitMinutes
) {
}
