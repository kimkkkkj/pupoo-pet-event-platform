package com.popups.pupoo.board.bannedword.dto;

import com.popups.pupoo.board.bannedword.domain.enums.BannedWordCategory;
import com.popups.pupoo.board.bannedword.domain.model.BannedWord;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class BannedWordResponse {

    private final Long bannedWordId;
    private final Long boardId;
    private final String bannedWord;
    private final String replacement;
    private final BannedWordCategory category;
    private final LocalDateTime createdAt;

    public static BannedWordResponse from(BannedWord entity) {
        return BannedWordResponse.builder()
                .bannedWordId(entity.getBannedWordId())
                .boardId(entity.getBoard() != null ? entity.getBoard().getBoardId() : null)
                .bannedWord(entity.getBannedWord())
                .replacement(entity.getReplacement())
                .category(entity.getCategory())
                .createdAt(entity.getCreatedAt())
                .build();
    }
}
