package com.popups.pupoo.board.bannedword.application;

import com.popups.pupoo.board.bannedword.domain.enums.BannedLogContentType;
import com.popups.pupoo.board.bannedword.domain.enums.FilterAction;
import com.popups.pupoo.board.bannedword.domain.model.BoardBannedLog;
import com.popups.pupoo.board.bannedword.persistence.BoardBannedLogRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/**
 * 금칙어 필터 서비스 (4단계: 정책·로그 연동)
 *
 * - 현재는 LEVEL 1(단어 기반) 필터는 사용하지 않고, AI 모더레이션 결과 로그만 남긴다.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class BannedWordService {

    private final BoardBannedLogRepository boardBannedLogRepository;

    /**
     * 금지어 필터(AI 모더레이션) 대상을 판단한다.
     * 현재는 관리자 포함 모든 사용자가 검사 대상이다.
     */
    @Transactional(readOnly = true)
    public boolean shouldSkipModeration(Long userId) {
        return false;
    }

    /**
     * Log AI moderation result. On save failure (e.g. missing ai_score/rag_reason columns), does not fail the request.
     * 현재 ACTION 도메인은 PASS/BLOCK만 사용하므로, BLOCK이 아닌 경우는 로그를 남기지 않는다.
     * <p>
     * 호출부(PostService 등)가 같은 트랜잭션에서 {@link com.popups.pupoo.common.exception.BusinessException}을 던지면
     * 기본 전파(REQUIRED)로는 로그 INSERT까지 롤백되므로, 별도 트랜잭션으로 커밋한다.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void logAiModeration(Long boardId, Long contentId, BannedLogContentType contentType, Long userId,
                                ModerationResult result) {
        if (result == null || boardId == null) return;
        if (!result.isBlock()) return;
        FilterAction action = FilterAction.BLOCK;
        String reason = result.getReason();
        String stack = result.getStack();
        // rag_reason에는 reason + stack을 함께 넣어, 서버 장애/통신 예외의 원인을 추적할 수 있게 한다.
        String ragReason = reason;
        if (stack != null && !stack.isBlank()) {
            if (ragReason == null || ragReason.isBlank()) {
                ragReason = "stack=" + stack;
            } else {
                ragReason = ragReason + " | stack=" + stack;
            }
        }
        if (ragReason != null && ragReason.length() > 2000) ragReason = ragReason.substring(0, 2000);
        try {
            boardBannedLogRepository.save(BoardBannedLog.builder()
                    .boardId(boardId)
                    .contentId(contentId)
                    .contentType(contentType)
                    .userId(userId)
                    .detectedWord("AI")
                    .filterActionTaken(action)
                    .aiScore(result.getAiScore())
                    .ragReason(ragReason)
                    .build());
        } catch (Exception e) {
            log.warn("AI moderation log save failed (boardId={}, contentId={}). Ensure board_banned_logs has ai_score, rag_reason columns. Error: {}", boardId, contentId, e.getMessage());
        }
    }

}
