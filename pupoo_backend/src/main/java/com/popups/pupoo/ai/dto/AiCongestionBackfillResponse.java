package com.popups.pupoo.ai.dto;

public record AiCongestionBackfillResponse(
        int bucketCount,
        int eventUpsertCount,
        int programUpsertCount
) {
}
