package com.popups.pupoo.board.bannedword.application;

import com.popups.pupoo.board.boardinfo.domain.enums.BoardType;
import com.popups.pupoo.board.boardinfo.domain.model.Board;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ContentModerationService {

    private final HardBannedWordMatcher hardBannedWordMatcher;
    private final ModerationClient moderationClient;

    public ModerationResult moderatePost(Board board, String title, String content) {
        if (!isPhaseOneTarget(board)) {
            return null;
        }

        String textToModerate = buildPostText(title, content);

        ModerationResult hardMatchResult = hardBannedWordMatcher.match(board, textToModerate);
        if (hardMatchResult != null && hardMatchResult.isBlock()) {
            log.warn("Moderation decision after hard match: boardId={}, boardType={}, decision={}, reason={}",
                    board.getBoardId(),
                    board.getBoardType(),
                    hardMatchResult.getAction(),
                    hardMatchResult.getReason());
            return hardMatchResult;
        }

        ModerationResult aiResult = moderationClient.moderate(textToModerate, board.getBoardId(), "POST");
        if (aiResult != null) {
            log.info("AI moderation decision: boardId={}, boardType={}, decision={}, reason={}, score={}",
                    board.getBoardId(),
                    board.getBoardType(),
                    aiResult.getAction(),
                    aiResult.getReason(),
                    aiResult.getAiScore());
        }
        return aiResult;
    }

    private boolean isPhaseOneTarget(Board board) {
        if (board == null || board.getBoardType() == null) {
            return false;
        }
        BoardType boardType = board.getBoardType();
        return boardType == BoardType.FREE || boardType == BoardType.INFO;
    }

    private String buildPostText(String title, String content) {
        String safeTitle = title != null ? title : "";
        String safeContent = content != null ? content : "";
        return (safeTitle + " " + safeContent).trim();
    }
}
