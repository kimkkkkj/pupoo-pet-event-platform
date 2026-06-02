package com.popups.pupoo.board.bannedword.domain.enums;

/**
 * 필터링 적용 시점 (board_filter_policy.filter_timing)
 */
public enum FilterTiming {
    /** 클라이언트(입력 시) */
    CLIENT,
    /** 서버(저장 직전) */
    SERVER,
    /** 노출 시점(렌더 시 마스킹) */
    RENDER,
    /** 비동기(AI 검토 등) */
    ASYNC
}
