// file: src/main/java/com/popups/pupoo/board/boardinfo/dto/AdminModerationReviewItem.java
package com.popups.pupoo.board.boardinfo.dto;

import com.popups.pupoo.board.review.domain.enums.ReviewStatus;
import com.popups.pupoo.board.review.domain.model.Review;
import lombok.AllArgsConstructor;
import lombok.Getter;

import java.time.LocalDateTime;

/**
 * 관리자 모더레이션 큐(리뷰) 목록 아이템.
 */
@Getter
@AllArgsConstructor
public class AdminModerationReviewItem {

    private Long reviewId;
    private Long eventId;
    private Long userId;
    private byte rating;
    private ReviewStatus reviewStatus;
    private boolean deleted;
    private int viewCount;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    // 신고 카운트(정보용, 자동조치 없음)
    private long totalReportCount;
    private long pendingReportCount;

    public static AdminModerationReviewItem from(Review r) {
        return from(r, 0L, 0L);
    }

    public static AdminModerationReviewItem from(Review r, long totalReportCount, long pendingReportCount) {
        return new AdminModerationReviewItem(
                r.getReviewId(),
                r.getEventId(),
                r.getUserId(),
                r.getRating(),
                r.getReviewStatus(),
                r.isDeleted(),
                r.getViewCount(),
                r.getCreatedAt(),
                r.getUpdatedAt(),
                totalReportCount,
                pendingReportCount
        );
    }
}
