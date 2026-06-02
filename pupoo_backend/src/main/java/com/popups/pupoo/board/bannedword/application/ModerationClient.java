package com.popups.pupoo.board.bannedword.application;

/**
 * AI 모더레이션 서비스(pupoo_ai) 호출 클라이언트.
 */
public interface ModerationClient {

    /**
     * 텍스트에 대해 RAG 기반 모더레이션 판정을 요청한다.
     *
     * @param text         검사할 텍스트 (제목+내용 등)
     * @param boardId      게시판 ID (선택)
     * @param contentType  POST | COMMENT 등 (선택)
     * @return 판정 결과 (action, reason 등). 호출 실패 시 null 또는 예외
     */
    ModerationResult moderate(String text, Long boardId, String contentType);
}
