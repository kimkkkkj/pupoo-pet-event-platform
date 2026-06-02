// file: src/main/java/com/popups/pupoo/board/faq/dto/FaqCreateRequest.java
package com.popups.pupoo.board.faq.dto;

import jakarta.validation.constraints.NotBlank;

public class FaqCreateRequest {

    @NotBlank
    private String title;

    @NotBlank
    private String content;

    @NotBlank
    private String answerContent;

    public String getTitle() { return title; }
    public String getContent() { return content; }
    public String getAnswerContent() { return answerContent; }
}
