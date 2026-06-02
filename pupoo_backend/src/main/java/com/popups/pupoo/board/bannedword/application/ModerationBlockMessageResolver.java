package com.popups.pupoo.board.bannedword.application;

import org.springframework.stereotype.Component;

/**
 * 사용자에게 노출될 BLOCK 사유 문구를 상황별로 생성한다.
 *
 * - stack="disabled"/"error" 처럼 기술/통신 문제로 인해 BLOCK된 경우:
 *   reason을 우선 노출(있으면).
 * - 그 외(대체로 정책 위반 판정)인 경우:
 *   정책 위반 안내 + reason(있으면) 표시.
 */
@Component
public class ModerationBlockMessageResolver {

    private static boolean isInputValidationError(String reason) {
        if (reason == null) return false;
        String r = reason.toLowerCase();
        // WebClientResponseException reason: "AI 서버 오류(<code>)로 인해 요청을 차단했습니다."
        return r.contains("(422)") || r.contains("(400)") || r.contains("unprocessable entity") || r.contains("min_length");
    }

    private static boolean isTechnicalFailure(String stack, String reason) {
        if (stack == null || stack.isBlank()) {
            // reason 기반 추정(서버/LLM 구성 문제 등)
            if (reason == null) return false;
            String r = reason.toLowerCase();
            if (isInputValidationError(reason)) return false;
            return r.contains("비활성") || r.contains("설정") || r.contains("오류") || r.contains("연결") || r.contains("timeout") || r.contains("llm");
        }
        String s = stack.toLowerCase();
        if (s.contains("disabled") || s.contains("error")) {
            // 422/400 같은 입력값 검증 실패는 "시스템 문제"가 아니라 "내용 문제"에 가깝다.
            if (isInputValidationError(reason)) return false;
            return true;
        }
        return false;
    }

    /**
     * @param targetLabel 사용자에게 보일 대상(예: 게시글, QnA, 댓글, 후기)
     */
    public String resolveCreateBlockMessage(String targetLabel, ModerationResult moderation) {
        if (moderation == null) {
            return targetLabel + " 내용이 정책에 위반될 수 있어 등록할 수 없습니다.";
        }

        String stack = moderation.getStack();
        String reason = moderation.getReason();

        if (isInputValidationError(reason)) {
            return targetLabel + " 입력 내용이 올바르지 않아 등록할 수 없습니다. (AI 검사 불가)";
        }

        boolean technicalFailure = isTechnicalFailure(stack, reason);

        // reason이 비어있더라도 stack이 error/disabled면 시스템 문제로 안내한다.
        if (reason == null || reason.isBlank()) {
            if (technicalFailure) {
                return targetLabel + " 등록을 처리할 수 없습니다. (시스템 문제)";
            }
            return targetLabel + " 내용이 정책에 위반될 수 있어 등록할 수 없습니다.";
        }

        if (technicalFailure) {
            // 기술/서버장애는 기존 안내문구 프레임을 유지하되, reason을 함께 노출한다.
            return targetLabel + " 등록을 처리할 수 없습니다. (" + reason + ")";
        }

        // 정책 위반 판정인 경우: 안내문구 + 차단 사유를 함께 보여준다.
        return targetLabel + " 내용이 정책에 위반될 수 있어 등록할 수 없습니다. (차단 사유: " + reason + ")";
    }

    /**
     * 수정(Update) 단계에서 BLOCK 되었을 때 사용자에게 보일 문구.
     */
    public String resolveUpdateBlockMessage(String targetLabel, ModerationResult moderation) {
        if (moderation == null) {
            return targetLabel + " 내용이 정책에 위반될 수 있어 수정할 수 없습니다.";
        }

        String stack = moderation.getStack();
        String reason = moderation.getReason();
        boolean technicalFailure = isTechnicalFailure(stack, reason);

        if (isInputValidationError(reason)) {
            return targetLabel + " 입력 내용이 올바르지 않아 수정할 수 없습니다. (AI 검사 불가)";
        }

        if (reason == null || reason.isBlank()) {
            if (technicalFailure) {
                return targetLabel + " 수정을 처리할 수 없습니다. (시스템 문제)";
            }
            return targetLabel + " 내용이 정책에 위반될 수 있어 수정할 수 없습니다.";
        }

        if (technicalFailure) {
            return targetLabel + " 수정을 처리할 수 없습니다. (" + reason + ")";
        }

        return targetLabel + " 내용이 정책에 위반될 수 있어 수정할 수 없습니다. (차단 사유: " + reason + ")";
    }
}

