package com.popups.pupoo.notification.dto;

public record AdminNotificationPublishResult(
        Long notificationId,
        int targetCount
) {
}
