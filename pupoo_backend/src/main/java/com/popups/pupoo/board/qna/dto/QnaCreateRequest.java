// file: src/main/java/com/popups/pupoo/board/qna/dto/QnaCreateRequest.java
package com.popups.pupoo.board.qna.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;

@Getter
public class QnaCreateRequest {

    @NotBlank
    private String title;

    @NotBlank
    private String content;
}
