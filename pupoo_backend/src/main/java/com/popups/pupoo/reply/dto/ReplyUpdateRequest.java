// file: src/main/java/com/popups/pupoo/reply/dto/ReplyUpdateRequest.java
package com.popups.pupoo.reply.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class ReplyUpdateRequest {

    @NotBlank
    private String content;
}
