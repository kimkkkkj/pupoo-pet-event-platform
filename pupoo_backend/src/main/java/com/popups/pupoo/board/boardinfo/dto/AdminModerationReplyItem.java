// file: src/main/java/com/popups/pupoo/board/boardinfo/dto/AdminModerationReplyItem.java
package com.popups.pupoo.board.boardinfo.dto;

import com.popups.pupoo.reply.domain.enums.ReplyTargetType;
import lombok.AllArgsConstructor;
import lombok.Getter;

import java.time.LocalDateTime;

/**
 * 관리자 모더레이션 큐(댓글) 목록 아이템.
 */
@Getter
@AllArgsConstructor
public class AdminModerationReplyItem {

    private ReplyTargetType targetType;
    private Long commentId;
    private Long parentId;
    private Long userId;
    private String content;
    private LocalDateTime createdAt;
    private boolean deleted;

    // 신고 카운트(정보용, 자동조치 없음)
    private long totalReportCount;
    private long pendingReportCount;

    public static AdminModerationReplyItem from(ReplyTargetType targetType,
                                                Long commentId,
                                                Long parentId,
                                                Long userId,
                                                String content,
                                                LocalDateTime createdAt,
                                                boolean deleted) {
        return new AdminModerationReplyItem(targetType, commentId, parentId, userId, content, createdAt, deleted, 0L, 0L);
    }

    public static AdminModerationReplyItem from(ReplyTargetType targetType,
                                                Long commentId,
                                                Long parentId,
                                                Long userId,
                                                String content,
                                                LocalDateTime createdAt,
                                                boolean deleted,
                                                long totalReportCount,
                                                long pendingReportCount) {
        return new AdminModerationReplyItem(targetType, commentId, parentId, userId, content, createdAt, deleted, totalReportCount, pendingReportCount);
    }
}
