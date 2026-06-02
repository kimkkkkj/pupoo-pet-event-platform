// file: src/main/java/com/popups/pupoo/notification/dto/NotificationInboxResponse.java
package com.popups.pupoo.notification.dto;

import com.popups.pupoo.notification.domain.enums.InboxTargetType;
import com.popups.pupoo.notification.domain.enums.NotificationType;
import com.popups.pupoo.notification.domain.model.NotificationInbox;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
public class NotificationInboxResponse {

    private final Long inboxId;
    private final NotificationType type;
    private final String title;
    private final String content;
    private final LocalDateTime receivedAt;
    private final InboxTargetType targetType;
    private final Long targetId;
    private final boolean canNavigate;
    private final String targetPath;

    public NotificationInboxResponse(Long inboxId,
                                    NotificationType type,
                                    String title,
                                    String content,
                                    LocalDateTime receivedAt,
                                    InboxTargetType targetType,
                                    Long targetId,
                                    boolean canNavigate,
                                    String targetPath) {
        this.inboxId = inboxId;
        this.type = type;
        this.title = title;
        this.content = content;
        this.receivedAt = receivedAt;
        this.targetType = targetType;
        this.targetId = targetId;
        this.canNavigate = canNavigate;
        this.targetPath = targetPath;
    }
}
