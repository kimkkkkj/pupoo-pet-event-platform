// file: src/main/java/com/popups/pupoo/reply/dto/ReplyCreateRequest.java
package com.popups.pupoo.reply.dto;

import com.popups.pupoo.reply.domain.enums.ReplyTargetType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class ReplyCreateRequest {

    @NotNull
    private ReplyTargetType targetType;

    @NotNull
    private Long targetId;

    @NotBlank
    private String content;
}
