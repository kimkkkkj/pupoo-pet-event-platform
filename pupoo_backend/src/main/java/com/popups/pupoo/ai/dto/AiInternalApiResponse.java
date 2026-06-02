package com.popups.pupoo.ai.dto;

import java.util.List;

public record AiInternalApiResponse<T>(
        boolean success,
        String code,
        String message,
        String traceId,
        T data,
        List<Object> errors
) {
}
