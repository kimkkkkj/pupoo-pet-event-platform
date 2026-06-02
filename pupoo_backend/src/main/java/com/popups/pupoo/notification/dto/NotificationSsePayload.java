package com.popups.pupoo.notification.dto;

public record NotificationSsePayload(
        String type,
        String targetType,
        Long targetId
) {
}
