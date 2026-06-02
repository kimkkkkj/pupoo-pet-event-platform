// file: src/main/java/com/popups/pupoo/notification/dto/NotificationCreateRequest.java
package com.popups.pupoo.notification.dto;

import com.popups.pupoo.notification.domain.enums.InboxTargetType;
import com.popups.pupoo.notification.domain.enums.NotificationChannel;
import com.popups.pupoo.notification.domain.enums.NotificationType;
import com.popups.pupoo.notification.domain.enums.RecipientScope;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;

import java.util.List;

@Getter
public class NotificationCreateRequest {

    @NotNull(message = "type is required")
    private NotificationType type;

    @NotBlank(message = "title is required")
    private String title;

    @NotBlank(message = "content is required")
    private String content;

    /**
     * 클릭 시 이동 정보
     */
    @NotNull(message = "targetType is required")
    private InboxTargetType targetType;

    @NotNull(message = "targetId is required")
    private Long targetId;

    /**
     * interest/참가자/예매자 기반 fan-out을 위한 이벤트 ID
     */
    @NotNull(message = "eventId is required")
    private Long eventId;

    /**
     * 발송 채널(미지정 시 APP)
     */
    private List<NotificationChannel> channels;

    /**
     * 발송 대상 범위(미지정 시 INTEREST_SUBSCRIBERS)
     */
    private RecipientScope recipientScope;

    /**
     * 발송 대상 범위 다중 선택.
     * - 프론트 체크박스 UI와 호환
     * - 미지정 시 recipientScope 또는 INTEREST_SUBSCRIBERS 로 fallback
     */
    private List<RecipientScope> recipientScopes;

    public static NotificationCreateRequest of(NotificationType type,
                                               String title,
                                               String content,
                                               InboxTargetType targetType,
                                               Long targetId,
                                               Long eventId,
                                               List<NotificationChannel> channels,
                                               RecipientScope recipientScope,
                                               List<RecipientScope> recipientScopes) {
        NotificationCreateRequest request = new NotificationCreateRequest();
        request.type = type;
        request.title = title;
        request.content = content;
        request.targetType = targetType;
        request.targetId = targetId;
        request.eventId = eventId;
        request.channels = channels;
        request.recipientScope = recipientScope;
        request.recipientScopes = recipientScopes;
        return request;
    }
}
