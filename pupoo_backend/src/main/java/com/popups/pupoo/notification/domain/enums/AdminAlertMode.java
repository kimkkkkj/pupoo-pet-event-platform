package com.popups.pupoo.notification.domain.enums;

import java.util.Locale;

public enum AdminAlertMode {
    EVENT,
    IMPORTANT,
    SYSTEM;

    public static AdminAlertMode from(String value) {
        if (value == null || value.isBlank()) {
            return EVENT;
        }
        return AdminAlertMode.valueOf(value.trim().toUpperCase(Locale.ROOT));
    }
}
