// file: src/main/java/com/popups/pupoo/board/boardinfo/api/AdminModerationController.java
package com.popups.pupoo.board.boardinfo.api;

import com.popups.pupoo.board.boardinfo.application.AdminModerationService;
import com.popups.pupoo.board.boardinfo.application.AdminModerationQueryService;
import com.popups.pupoo.board.boardinfo.dto.AdminModerationRequest;
import com.popups.pupoo.board.boardinfo.dto.AdminModerationPostItem;
import com.popups.pupoo.board.boardinfo.dto.AdminModerationPostSearchRequest;
import com.popups.pupoo.board.boardinfo.dto.AdminModerationReplyItem;
import com.popups.pupoo.board.boardinfo.dto.AdminModerationReplySearchRequest;
import com.popups.pupoo.board.boardinfo.dto.AdminModerationReviewItem;
import com.popups.pupoo.board.boardinfo.dto.AdminModerationReviewSearchRequest;
import com.popups.pupoo.board.post.dto.PostResponse;
import com.popups.pupoo.board.review.dto.ReviewResponse;
import com.popups.pupoo.common.api.ApiResponse;
import com.popups.pupoo.reply.domain.enums.ReplyTargetType;
import com.popups.pupoo.reply.dto.ReplyResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.web.bind.annotation.*;

/**
 * 관리자 콘텐츠 모더레이션 API.
 * 목적: 게시글/리뷰/댓글에 대한 블라인드/복구/삭제(soft/hard)를 제공한다.
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/admin/moderation")
public class AdminModerationController {

    private final AdminModerationService moderationService;
    private final AdminModerationQueryService moderationQueryService;

    // ----------------------------
    // Moderation Queue (search/list)
    // ----------------------------

    /**
     * 모더레이션 큐(게시글): 조건 검색 + 페이징.
     */
    @GetMapping("/posts")
    public ApiResponse<Page<AdminModerationPostItem>> searchPosts(@ModelAttribute AdminModerationPostSearchRequest req,
                                                                  Pageable pageable) {
        return ApiResponse.success(moderationQueryService.searchPosts(req, pageable));
    }

    /**
     * 모더레이션 큐(리뷰): 조건 검색 + 페이징.
     */
    @GetMapping("/reviews")
    public ApiResponse<Page<AdminModerationReviewItem>> searchReviews(@ModelAttribute AdminModerationReviewSearchRequest req,
                                                                      Pageable pageable) {
        return ApiResponse.success(moderationQueryService.searchReviews(req, pageable));
    }

    /**
     * 모더레이션 큐(댓글): post_comments/review_comments 통합 조회.
     */
    @GetMapping("/replies")
    public ApiResponse<Page<AdminModerationReplyItem>> searchReplies(@ModelAttribute AdminModerationReplySearchRequest req,
                                                                     Pageable pageable) {
        return ApiResponse.success(moderationQueryService.searchReplies(req, pageable));
    }

    // ----------------------------
    // Posts (including QnA posts)
    // ----------------------------

    @PatchMapping("/posts/{postId}/hide")
    public ApiResponse<PostResponse> hidePost(@PathVariable Long postId, @RequestBody(required = false) AdminModerationRequest req) {
        String reason = (req == null) ? null : req.getReason();
        return ApiResponse.success(moderationService.hidePost(postId, reason));
    }

    @PatchMapping("/posts/{postId}/restore")
    public ApiResponse<PostResponse> restorePost(@PathVariable Long postId, @RequestBody(required = false) AdminModerationRequest req) {
        String reason = (req == null) ? null : req.getReason();
        return ApiResponse.success(moderationService.restorePost(postId, reason));
    }

    @DeleteMapping("/posts/{postId}")
    public ApiResponse<Long> deletePost(@PathVariable Long postId, @RequestBody(required = false) AdminModerationRequest req) {
        boolean hard = (req != null && Boolean.TRUE.equals(req.getHardDelete()));
        String reason = (req == null) ? null : req.getReason();
        moderationService.deletePost(postId, hard, reason);
        return ApiResponse.success(postId);
    }

    // ----------------------------
    // Reviews
    // ----------------------------

    @PatchMapping("/reviews/{reviewId}/blind")
    public ApiResponse<ReviewResponse> blindReview(@PathVariable Long reviewId, @RequestBody(required = false) AdminModerationRequest req) {
        String reason = (req == null) ? null : req.getReason();
        return ApiResponse.success(moderationService.blindReview(reviewId, reason));
    }

    @PatchMapping("/reviews/{reviewId}/restore")
    public ApiResponse<ReviewResponse> restoreReview(@PathVariable Long reviewId, @RequestBody(required = false) AdminModerationRequest req) {
        String reason = (req == null) ? null : req.getReason();
        return ApiResponse.success(moderationService.restoreReview(reviewId, reason));
    }

    @DeleteMapping("/reviews/{reviewId}")
    public ApiResponse<Long> deleteReview(@PathVariable Long reviewId, @RequestBody(required = false) AdminModerationRequest req) {
        boolean hard = (req != null && Boolean.TRUE.equals(req.getHardDelete()));
        String reason = (req == null) ? null : req.getReason();
        moderationService.deleteReview(reviewId, hard, reason);
        return ApiResponse.success(reviewId);
    }

    // ----------------------------
    // Replies (post_comments / review_comments)
    // ----------------------------

    @PatchMapping("/replies/{targetType}/{commentId}/hide")
    public ApiResponse<ReplyResponse> hideReply(@PathVariable ReplyTargetType targetType,
                                                @PathVariable Long commentId,
                                                @RequestBody(required = false) AdminModerationRequest req) {
        String reason = (req == null) ? null : req.getReason();
        return ApiResponse.success(moderationService.hideReply(targetType, commentId, reason));
    }

    @PatchMapping("/replies/{targetType}/{commentId}/restore")
    public ApiResponse<ReplyResponse> restoreReply(@PathVariable ReplyTargetType targetType,
                                                   @PathVariable Long commentId,
                                                   @RequestBody(required = false) AdminModerationRequest req) {
        String reason = (req == null) ? null : req.getReason();
        return ApiResponse.success(moderationService.restoreReply(targetType, commentId, reason));
    }

    @DeleteMapping("/replies/{targetType}/{commentId}")
    public ApiResponse<Long> deleteReply(@PathVariable ReplyTargetType targetType,
                                         @PathVariable Long commentId,
                                         @RequestBody(required = false) AdminModerationRequest req) {
        boolean hard = (req != null && Boolean.TRUE.equals(req.getHardDelete()));
        String reason = (req == null) ? null : req.getReason();
        moderationService.deleteReply(targetType, commentId, hard, reason);
        return ApiResponse.success(commentId);
    }
}
