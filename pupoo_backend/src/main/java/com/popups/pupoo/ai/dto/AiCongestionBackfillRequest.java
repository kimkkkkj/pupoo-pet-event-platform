package com.popups.pupoo.ai.dto;

import java.time.LocalDateTime;

public record AiCongestionBackfillRequest(
        LocalDateTime from,
        LocalDateTime to
) {
}
