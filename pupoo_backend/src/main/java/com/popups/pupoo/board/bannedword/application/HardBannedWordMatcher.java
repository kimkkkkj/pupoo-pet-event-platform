package com.popups.pupoo.board.bannedword.application;

import com.popups.pupoo.board.bannedword.domain.model.BannedWord;
import com.popups.pupoo.board.bannedword.persistence.BannedWordRepository;
import com.popups.pupoo.board.boardinfo.domain.enums.BoardType;
import com.popups.pupoo.board.boardinfo.domain.model.Board;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Locale;

@Slf4j
@Component
@RequiredArgsConstructor
public class HardBannedWordMatcher {

    private final BannedWordRepository bannedWordRepository;

    public ModerationResult match(Board board, String content) {
        if (!isPolicyBoard(board)) {
            return null;
        }

        String normalizedContent = normalize(content);
        if (normalizedContent.isBlank()) {
            return null;
        }

        List<BannedWord> bannedWords = bannedWordRepository.findByBoard_BoardIdOrBoardIsNullOrderByBannedWordIdAsc(
                board.getBoardId());

        for (BannedWord bannedWord : bannedWords) {
            String originalWord = bannedWord.getBannedWord();
            String normalizedWord = normalize(originalWord);
            if (normalizedWord.isBlank()) {
                continue;
            }
            if (normalizedContent.contains(normalizedWord)) {
                log.warn("Hard moderation match: boardId={}, boardType={}, bannedWordId={}, word={}",
                        board.getBoardId(),
                        board.getBoardType(),
                        bannedWord.getBannedWordId(),
                        originalWord);
                return ModerationResult.builder()
                        .action("BLOCK")
                        .reason("\uAE08\uCE59\uC5B4\uAC00 \uD3EC\uD568\uB418\uC5B4 \uC788\uC2B5\uB2C8\uB2E4: " + originalWord.trim())
                        .stack("hard_match")
                        .build();
            }
        }

        return null;
    }

    private boolean isPolicyBoard(Board board) {
        if (board == null || board.getBoardType() == null || board.getBoardId() == null) {
            return false;
        }
        BoardType boardType = board.getBoardType();
        return boardType == BoardType.FREE || boardType == BoardType.INFO || boardType == BoardType.QNA;
    }

    private String normalize(String value) {
        if (value == null) {
            return "";
        }
        return value.trim()
                .replaceAll("\\s+", " ")
                .toLowerCase(Locale.ROOT);
    }
}
