package com.popups.pupoo.notification.dto;

import java.util.List;

public record AdminNotificationItemResponse(
        Long id,
        String title,
        String content,
        String status,
        Long eventId,
        String eventName,
        String eventStatus,
        String alertMode,
        String notificationType,
        String alertTargetLabel,
        String specialTargetKey,
        String recipientScope,
        List<String> recipientScopes,
        String target,
        Integer targetCount,
        String sentDate,
        String sentAt
) {
}
