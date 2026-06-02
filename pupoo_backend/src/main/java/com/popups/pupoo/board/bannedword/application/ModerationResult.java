package com.popups.pupoo.board.bannedword.application;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * AI 모더레이션 API 응답 (pupoo_ai /internal/moderate).
 */
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ModerationResult {

    /** PASS | ALLOW | WARN | REVIEW | BLOCK */
    private String action;
    private Float aiScore;
    private String reason;
    private String stack;

    public boolean isBlock() {
        return "BLOCK".equalsIgnoreCase(action);
    }

    public boolean isWarn() {
        return "WARN".equalsIgnoreCase(action);
    }

    public boolean isReview() {
        return "REVIEW".equalsIgnoreCase(action);
    }

    public boolean isWarnOrReview() {
        return isWarn() || isReview();
    }
}
