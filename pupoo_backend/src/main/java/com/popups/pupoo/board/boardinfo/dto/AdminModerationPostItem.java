// file: src/main/java/com/popups/pupoo/board/boardinfo/dto/AdminModerationPostItem.java
package com.popups.pupoo.board.boardinfo.dto;

import com.popups.pupoo.board.post.domain.enums.PostStatus;
import com.popups.pupoo.board.post.domain.model.Post;
import lombok.AllArgsConstructor;
import lombok.Getter;

import java.time.LocalDateTime;

/**
 * 관리자 모더레이션 큐(게시글) 목록 아이템.
 */
@Getter
@AllArgsConstructor
public class AdminModerationPostItem {

    private Long postId;
    private Long boardId;
    private Long userId;
    private String title;
    private PostStatus status;
    private boolean deleted;
    private int viewCount;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    // 신고 카운트(정보용, 자동조치 없음)
    private long totalReportCount;
    private long pendingReportCount;

    public static AdminModerationPostItem from(Post p) {
        return from(p, 0L, 0L);
    }

    public static AdminModerationPostItem from(Post p, long totalReportCount, long pendingReportCount) {
        return new AdminModerationPostItem(
                p.getPostId(),
                (p.getBoard() == null) ? null : p.getBoard().getBoardId(),
                p.getUserId(),
                p.getPostTitle(),
                p.getStatus(),
                p.isDeleted(),
                p.getViewCount(),
                p.getCreatedAt(),
                p.getUpdatedAt(),
                totalReportCount,
                pendingReportCount
        );
    }
}
