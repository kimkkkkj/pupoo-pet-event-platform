package com.popups.pupoo.board.post.dto;

import com.popups.pupoo.board.bannedword.application.ModerationResult;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class PostModerationResponse {

    private String decision;
    private String message;
    private String reason;
    private boolean reviewRequired;

    public static PostModerationResponse from(ModerationResult moderationResult) {
        if (moderationResult == null || !moderationResult.isWarnOrReview()) {
            return null;
        }

        PostModerationResponse response = new PostModerationResponse();
        response.decision = moderationResult.getAction();
        response.reason = moderationResult.getReason();
        response.reviewRequired = moderationResult.isReview();
        response.message = moderationResult.isReview()
                ? "\uAC80\uD1A0\uAC00 \uD544\uC694\uD55C \uAC8C\uC2DC\uAE00\uC785\uB2C8\uB2E4."
                : "\uC8FC\uC758\uAC00 \uD544\uC694\uD55C \uAC8C\uC2DC\uAE00\uC785\uB2C8\uB2E4.";
        return response;
    }
}
