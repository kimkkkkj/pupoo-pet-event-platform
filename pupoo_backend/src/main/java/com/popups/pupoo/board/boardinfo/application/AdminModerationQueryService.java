// file: src/main/java/com/popups/pupoo/board/boardinfo/application/AdminModerationQueryService.java
package com.popups.pupoo.board.boardinfo.application;

import com.popups.pupoo.board.boardinfo.dto.*;
import com.popups.pupoo.board.post.domain.model.Post;
import com.popups.pupoo.board.post.persistence.PostRepository;
import com.popups.pupoo.board.review.domain.model.Review;
import com.popups.pupoo.board.review.persistence.ReviewRepository;
import com.popups.pupoo.reply.domain.enums.ReplyTargetType;
import com.popups.pupoo.reply.domain.model.PostComment;
import com.popups.pupoo.reply.domain.model.ReviewComment;
import com.popups.pupoo.reply.persistence.PostCommentRepository;
import com.popups.pupoo.reply.persistence.ReviewCommentRepository;
import com.popups.pupoo.report.domain.enums.ReportStatus;
import com.popups.pupoo.report.domain.enums.ReportTargetType;
import com.popups.pupoo.report.persistence.ContentReportRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

/**
 * 관리자 모더레이션 큐 조회 서비스.
 * 목적: 게시글/리뷰/댓글을 조건 검색으로 조회한다.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AdminModerationQueryService {

    private final PostRepository postRepository;
    private final ReviewRepository reviewRepository;
    private final PostCommentRepository postCommentRepository;
    private final ReviewCommentRepository reviewCommentRepository;
    private final ContentReportRepository contentReportRepository;

    public Page<AdminModerationPostItem> searchPosts(AdminModerationPostSearchRequest req, Pageable pageable) {
        java.util.List<Long> postIds = null;
        if (Boolean.TRUE.equals(req.getReportedOnly())) {
            postIds = contentReportRepository.findDistinctTargetIds(ReportTargetType.POST, ReportStatus.PENDING);
            if (postIds.isEmpty()) return Page.empty(pageable);
        }

        Page<Post> page = postRepository.adminSearch(
                req.getBoardId(),
                req.getKeyword(),
                req.getStatus(),
                req.getDeleted(),
                req.getUserId(),
                req.getFrom(),
                req.getTo(),
                postIds,
                pageable
        );

        List<Long> ids = page.getContent().stream().map(Post::getPostId).toList();
        Map<Long, long[]> counts = loadCounts(ReportTargetType.POST, ids);

        List<AdminModerationPostItem> items = new ArrayList<>();
        for (Post p : page.getContent()) {
            long[] c = counts.getOrDefault(p.getPostId(), new long[]{0L, 0L});
            items.add(AdminModerationPostItem.from(p, c[0], c[1]));
        }
        return new org.springframework.data.domain.PageImpl<>(items, pageable, page.getTotalElements());
    }

    public Page<AdminModerationReviewItem> searchReviews(AdminModerationReviewSearchRequest req, Pageable pageable) {
        java.util.List<Long> reviewIds = null;
        if (Boolean.TRUE.equals(req.getReportedOnly())) {
            reviewIds = contentReportRepository.findDistinctTargetIds(ReportTargetType.REVIEW, ReportStatus.PENDING);
            if (reviewIds.isEmpty()) return Page.empty(pageable);
        }

        Page<Review> page = reviewRepository.adminSearch(
                req.getEventId(),
                req.getUserId(),
                req.getReviewStatus(),
                req.getDeleted(),
                req.getKeyword(),
                req.getFrom(),
                req.getTo(),
                reviewIds,
                pageable
        );

        List<Long> ids = page.getContent().stream().map(Review::getReviewId).toList();
        Map<Long, long[]> counts = loadCounts(ReportTargetType.REVIEW, ids);

        List<AdminModerationReviewItem> items = new ArrayList<>();
        for (Review r : page.getContent()) {
            long[] c = counts.getOrDefault(r.getReviewId(), new long[]{0L, 0L});
            items.add(AdminModerationReviewItem.from(r, c[0], c[1]));
        }
        return new org.springframework.data.domain.PageImpl<>(items, pageable, page.getTotalElements());
    }

    public Page<AdminModerationReplyItem> searchReplies(AdminModerationReplySearchRequest req, Pageable pageable) {
        ReplyTargetType targetType = (req.getTargetType() == null) ? ReplyTargetType.POST : req.getTargetType();

        ReportTargetType reportTargetType = (targetType == ReplyTargetType.REVIEW) ? ReportTargetType.REVIEW_COMMENT : ReportTargetType.POST_COMMENT;

        java.util.List<Long> commentIds = null;
        if (Boolean.TRUE.equals(req.getReportedOnly())) {
            commentIds = contentReportRepository.findDistinctTargetIds(reportTargetType, ReportStatus.PENDING);
            if (commentIds.isEmpty()) return Page.empty(pageable);
        }

        if (targetType == ReplyTargetType.REVIEW) {
            Page<ReviewComment> page = reviewCommentRepository.adminSearch(
                    req.getParentId(),
                    req.getUserId(),
                    req.getDeleted(),
                    req.getKeyword(),
                    req.getFrom(),
                    req.getTo(),
                    commentIds,
                    pageable
            );

            List<Long> ids = page.getContent().stream().map(ReviewComment::getCommentId).toList();
            Map<Long, long[]> counts = loadCounts(reportTargetType, ids);

            List<AdminModerationReplyItem> items = new ArrayList<>();
            for (ReviewComment c : page.getContent()) {
                long[] cc = counts.getOrDefault(c.getCommentId(), new long[]{0L, 0L});
                items.add(AdminModerationReplyItem.from(targetType, c.getCommentId(), c.getReviewId(), c.getUserId(), c.getContent(), c.getCreatedAt(), c.isDeleted(), cc[0], cc[1]));
            }
            return new org.springframework.data.domain.PageImpl<>(items, pageable, page.getTotalElements());
        }

        Page<PostComment> page = postCommentRepository.adminSearch(
                req.getParentId(),
                req.getUserId(),
                req.getDeleted(),
                req.getKeyword(),
                req.getFrom(),
                req.getTo(),
                commentIds,
                pageable
        );

        List<Long> ids = page.getContent().stream().map(PostComment::getCommentId).toList();
        Map<Long, long[]> counts = loadCounts(reportTargetType, ids);

        List<AdminModerationReplyItem> items = new ArrayList<>();
        for (PostComment c : page.getContent()) {
            long[] cc = counts.getOrDefault(c.getCommentId(), new long[]{0L, 0L});
            items.add(AdminModerationReplyItem.from(targetType, c.getCommentId(), c.getPostId(), c.getUserId(), c.getContent(), c.getCreatedAt(), c.isDeleted(), cc[0], cc[1]));
        }
        return new org.springframework.data.domain.PageImpl<>(items, pageable, page.getTotalElements());
    }

    private Map<Long, long[]> loadCounts(ReportTargetType targetType, List<Long> targetIds) {
        Map<Long, long[]> map = new HashMap<>();
        if (targetIds == null || targetIds.isEmpty()) return map;

        List<Long> ids = targetIds.stream().distinct().toList();
        for (ContentReportRepository.TargetCountRow row : contentReportRepository.countGroupedByTargetId(targetType, ids)) {
            map.put(row.getTargetId(), new long[]{row.getTotalCount(), row.getPendingCount()});
        }
        return map;
    }
}
