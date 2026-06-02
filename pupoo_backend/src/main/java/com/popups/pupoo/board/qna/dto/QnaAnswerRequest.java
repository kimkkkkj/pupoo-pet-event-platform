// file: src/main/java/com/popups/pupoo/board/qna/dto/QnaAnswerRequest.java
package com.popups.pupoo.board.qna.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class QnaAnswerRequest {

    @NotBlank
    private String answerContent;
}
