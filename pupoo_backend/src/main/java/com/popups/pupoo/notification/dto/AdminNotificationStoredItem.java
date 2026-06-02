package com.popups.pupoo.notification.dto;

import com.popups.pupoo.notification.domain.enums.AdminAlertMode;
import com.popups.pupoo.notification.domain.enums.AdminNotificationStatus;
import com.popups.pupoo.notification.domain.enums.NotificationType;
import com.popups.pupoo.notification.domain.enums.RecipientScope;

import java.time.LocalDateTime;
import java.util.List;

public record AdminNotificationStoredItem(
        Long adminNotificationId,
        Long adminUserId,
        Long notificationId,
        String title,
        String content,
        AdminAlertMode alertMode,
        NotificationType notificationType,
        Long eventId,
        String eventName,
        String eventStatus,
        String alertTargetLabel,
        String specialTargetKey,
        List<RecipientScope> recipientScopes,
        Integer targetCount,
        AdminNotificationStatus status,
        LocalDateTime sentAt,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}
