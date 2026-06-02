package com.popups.pupoo.ai.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public record AiPosterGenerateResponse(
        String imageUrl,
        String storageKey,
        String storedName
) {
}
