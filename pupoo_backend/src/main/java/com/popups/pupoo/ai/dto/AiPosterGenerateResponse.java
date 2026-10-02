package com.popups.pupoo.ai.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public record AiPosterGenerateResponse(
        String imageUrl,
        String storageKey,
        String storedName,
        // AI 서버가 저장하지 않고 완성 이미지를 돌려주는 경우(base64)와 그 형식
        String imageBase64,
        String contentType
) {
}
