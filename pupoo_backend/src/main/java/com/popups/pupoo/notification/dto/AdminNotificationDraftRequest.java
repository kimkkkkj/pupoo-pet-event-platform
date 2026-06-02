package com.popups.pupoo.notification.dto;

import com.popups.pupoo.notification.domain.enums.RecipientScope;
import jakarta.validation.constraints.NotBlank;
import lombok.Getter;

import java.util.List;

@Getter
public class AdminNotificationDraftRequest {

    @NotBlank(message = "title is required")
    private String title;

    @NotBlank(message = "content is required")
    private String content;

    @NotBlank(message = "alertMode is required")
    private String alertMode;

    private Long eventId;

    private String eventName;

    private String eventStatus;

    private String alertTargetLabel;

    private String specialTargetKey;

    private RecipientScope recipientScope;

    private List<RecipientScope> recipientScopes;
}
