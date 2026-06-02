package com.popups.pupoo.board.bannedword.domain.enums;

/**
 * 필터 정책 처리 방식 (board_filter_policy.filter_action, board_banned_logs.filter_action_taken)
 */
public enum FilterAction {
    /** 차단: 저장 불가 */
    BLOCK,
    /** 마스킹: 저장 허용, 노출 시 치환 */
    MASK,
    /** 통과: 저장·노출 모두 허용 (로그만 남김) */
    PASS
}
