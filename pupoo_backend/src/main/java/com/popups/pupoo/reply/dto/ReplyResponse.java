// file: src/main/java/com/popups/pupoo/reply/dto/ReplyResponse.java
package com.popups.pupoo.reply.dto;

import com.popups.pupoo.reply.domain.enums.ReplyStatus;
import com.popups.pupoo.reply.domain.enums.ReplyTargetType;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class ReplyResponse {

    private Long replyId;
    private ReplyTargetType targetType;
    private Long targetId;

    private Long userId;
    private String writerEmail;
    private String content;

    private ReplyStatus status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
