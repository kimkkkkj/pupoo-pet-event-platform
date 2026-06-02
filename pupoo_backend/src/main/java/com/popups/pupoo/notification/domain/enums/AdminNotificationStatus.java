package com.popups.pupoo.notification.domain.enums;

import java.util.Locale;

public enum AdminNotificationStatus {
    DRAFT,
    SENT;

    public static AdminNotificationStatus from(String value) {
        if (value == null || value.isBlank()) {
            return DRAFT;
        }
        return AdminNotificationStatus.valueOf(value.trim().toUpperCase(Locale.ROOT));
    }
}
