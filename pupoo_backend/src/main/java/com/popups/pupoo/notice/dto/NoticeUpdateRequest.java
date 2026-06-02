// file: src/main/java/com/popups/pupoo/notice/dto/NoticeUpdateRequest.java
package com.popups.pupoo.notice.dto;

import com.popups.pupoo.notice.domain.enums.NoticeStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;

@Getter
public class NoticeUpdateRequest {

    @NotBlank(message = "title is required")
    private String title;

    @NotBlank(message = "content is required")
    private String content;

    @NotNull(message = "pinned is required")
    private Boolean pinned;

    @NotNull(message = "status is required")
    private NoticeStatus status;

    private String scope;

    private Long eventId;
}
