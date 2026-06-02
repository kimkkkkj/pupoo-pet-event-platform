package com.popups.pupoo.board.bannedword.dto;

import com.popups.pupoo.board.bannedword.domain.model.BoardBannedLog;
import com.popups.pupoo.board.post.domain.enums.PostStatus;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class BoardBannedLogResponse {

    private final Long logId;
    private final Long boardId;
    private final Long contentId;
    private final String contentType;
    private final Long userId;
    private final String detectedWord;
    private final String filterActionTaken;
    private final Float aiScore;
    private final String ragReason;
    private final LocalDateTime createdAt;

    /**
     * 게시글(posts)인 경우에만: PUBLISHED / HIDDEN 등. QnA 모더레이션 차단 시 HIDDEN.
     */
    private final String contentPostStatus;

    public static BoardBannedLogResponse from(BoardBannedLog entity) {
        return from(entity, null);
    }

    public static BoardBannedLogResponse from(BoardBannedLog entity, PostStatus postStatus) {
        return BoardBannedLogResponse.builder()
                .logId(entity.getLogId())
                .boardId(entity.getBoardId())
                .contentId(entity.getContentId())
                .contentType(entity.getContentType() != null ? entity.getContentType().name() : null)
                .userId(entity.getUserId())
                .detectedWord(entity.getDetectedWord())
                .filterActionTaken(entity.getFilterActionTaken() != null ? entity.getFilterActionTaken().name() : null)
                .aiScore(entity.getAiScore())
                .ragReason(entity.getRagReason())
                .createdAt(entity.getCreatedAt())
                .contentPostStatus(postStatus != null ? postStatus.name() : null)
                .build();
    }
}
