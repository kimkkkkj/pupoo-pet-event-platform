// file: src/main/java/com/popups/pupoo/notification/dto/NotificationSettingsResponse.java
package com.popups.pupoo.notification.dto;

import com.popups.pupoo.notification.domain.model.NotificationSettings;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
public class NotificationSettingsResponse {

    private final boolean allowMarketing;
    private final LocalDateTime updatedAt;

    public NotificationSettingsResponse(boolean allowMarketing, LocalDateTime updatedAt) {
        this.allowMarketing = allowMarketing;
        this.updatedAt = updatedAt;
    }

    public static NotificationSettingsResponse from(NotificationSettings settings) {
        return new NotificationSettingsResponse(settings.isAllowMarketing(), settings.getUpdatedAt());
    }
}
