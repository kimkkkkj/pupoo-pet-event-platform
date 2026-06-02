// file: src/main/java/com/popups/pupoo/board/review/dto/ReviewCreateRequest.java
package com.popups.pupoo.board.review.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;

@Getter
public class ReviewCreateRequest {

    @NotNull
    private Long eventId;

    @NotNull
    @Min(1)
    @Max(5)
    private Integer rating;

    private String reviewTitle;

    private String content;
}
