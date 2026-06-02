// file: src/main/java/com/popups/pupoo/board/boardinfo/application/AdminModerationService.java
package com.popups.pupoo.board.boardinfo.application;

import com.popups.pupoo.board.post.domain.model.Post;
import com.popups.pupoo.board.post.dto.PostResponse;
import com.popups.pupoo.board.post.persistence.PostRepository;
import com.popups.pupoo.board.review.domain.model.Review;
import com.popups.pupoo.board.review.dto.ReviewResponse;
import com.popups.pupoo.board.review.persistence.ReviewRepository;
import com.popups.pupoo.common.audit.application.AdminLogService;
import com.popups.pupoo.common.audit.domain.enums.AdminTargetType;
import com.popups.pupoo.common.exception.BusinessException;
import com.popups.pupoo.common.exception.ErrorCode;
import com.popups.pupoo.gallery.domain.model.Gallery;
import com.popups.pupoo.gallery.persistence.GalleryRepository;
import com.popups.pupoo.reply.domain.enums.ReplyStatus;
import com.popups.pupoo.reply.domain.enums.ReplyTargetType;
import com.popups.pupoo.reply.domain.model.PostComment;
import com.popups.pupoo.reply.domain.model.ReviewComment;
import com.popups.pupoo.reply.dto.ReplyResponse;
import com.popups.pupoo.reply.persistence.PostCommentRepository;
import com.popups.pupoo.reply.persistence.ReviewCommentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

/**
 * 관리자 콘텐츠 모더레이션 서비스.
 * 정책
 * - 일반 사용자는 soft delete만 가능
 * - 관리자는 soft/hard 모두 가능
 * - 게시글: hide(HIDDEN)/restore(PUBLISHED)/soft delete(is_deleted=true)/hard delete
 * - 리뷰: blind(BLINDED)/restore(PUBLIC)/soft delete(is_deleted=true, status=DELETED)/hard delete
 * - 댓글: hide(soft delete)/restore/ hard delete
 * - 갤러리: blind/restore (신고 처리 연동 용도)
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AdminModerationService {

    private final PostRepository postRepository;
    private final ReviewRepository reviewRepository;
    private final PostCommentRepository postCommentRepository;
    private final ReviewCommentRepository reviewCommentRepository;
    private final GalleryRepository galleryRepository;
    private final AdminLogService adminLogService;

    /* =========================
     * Post moderation
     * ========================= */

    @Transactional
    public PostResponse hidePost(Long postId, String reason) {
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "게시글이 존재하지 않습니다."));

        post.hide();
        adminLogService.write("POST_HIDE" + suffixReason(reason), AdminTargetType.POST, postId);
        return PostResponse.from(post);
    }

    @Transactional
    public PostResponse restorePost(Long postId, String reason) {
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "게시글이 존재하지 않습니다."));

        post.restore();
        adminLogService.write("POST_RESTORE" + suffixReason(reason), AdminTargetType.POST, postId);
        return PostResponse.from(post);
    }

    @Transactional
    public void deletePost(Long postId, boolean hardDelete, String reason) {
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "게시글이 존재하지 않습니다."));

        if (hardDelete) {
            postRepository.delete(post);
            adminLogService.write("POST_DELETE_HARD" + suffixReason(reason), AdminTargetType.POST, postId);
            return;
        }

        post.softDelete();
        adminLogService.write("POST_DELETE_SOFT" + suffixReason(reason), AdminTargetType.POST, postId);
    }

    /* =========================
     * Review moderation
     * ========================= */

    @Transactional
    public ReviewResponse blindReview(Long reviewId, String reason) {
        Review review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "리뷰가 존재하지 않습니다."));

        review.blind();
        adminLogService.write("REVIEW_BLIND" + suffixReason(reason), AdminTargetType.REVIEW, reviewId);
        return ReviewResponse.from(review);
    }

    @Transactional
    public ReviewResponse restoreReview(Long reviewId, String reason) {
        Review review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "리뷰가 존재하지 않습니다."));

        review.restore();
        adminLogService.write("REVIEW_RESTORE" + suffixReason(reason), AdminTargetType.REVIEW, reviewId);
        return ReviewResponse.from(review);
    }

    @Transactional
    public void deleteReview(Long reviewId, boolean hardDelete, String reason) {
        Review review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "리뷰가 존재하지 않습니다."));

        if (hardDelete) {
            reviewRepository.delete(review);
            adminLogService.write("REVIEW_DELETE_HARD" + suffixReason(reason), AdminTargetType.REVIEW, reviewId);
            return;
        }

        review.softDelete(java.time.LocalDateTime.now());
        adminLogService.write("REVIEW_DELETE_SOFT" + suffixReason(reason), AdminTargetType.REVIEW, reviewId);
    }

    /* =========================
     * Gallery moderation (report flow)
     * ========================= */

    @Transactional
    public void blindGallery(Long galleryId, String reason) {
        Gallery gallery = galleryRepository.findById(galleryId)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "갤러리가 존재하지 않습니다."));

        gallery.blind();
        adminLogService.write("GALLERY_BLIND" + suffixReason(reason), AdminTargetType.GALLERY, galleryId);
    }

    @Transactional
    public void restoreGallery(Long galleryId, String reason) {
        Gallery gallery = galleryRepository.findById(galleryId)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "갤러리가 존재하지 않습니다."));

        gallery.restore();
        adminLogService.write("GALLERY_RESTORE" + suffixReason(reason), AdminTargetType.GALLERY, galleryId);
    }

    /* =========================
     * Reply moderation
     * ========================= */

    @Transactional
    public ReplyResponse hideReply(ReplyTargetType targetType, Long commentId, String reason) {
        LocalDateTime now = LocalDateTime.now();

        if (targetType == ReplyTargetType.POST) {
            PostComment comment = postCommentRepository.findById(commentId)
                    .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "댓글이 존재하지 않습니다."));
            PostComment saved = postCommentRepository.save(comment.markDeleted(now));
            adminLogService.write("REPLY_HIDE" + suffixReason(reason), AdminTargetType.POST, saved.getPostId());
            return ReplyResponse.builder()
                    .replyId(saved.getCommentId())
                    .targetType(targetType)
                    .targetId(saved.getPostId())
                    .userId(saved.getUserId())
                    .content(saved.getContent())
                    .status(ReplyStatus.DELETED)
                    .createdAt(saved.getCreatedAt())
                    .updatedAt(saved.getUpdatedAt())
                    .build();
        }

        if (targetType == ReplyTargetType.REVIEW) {
            ReviewComment comment = reviewCommentRepository.findById(commentId)
                    .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "댓글이 존재하지 않습니다."));
            ReviewComment saved = reviewCommentRepository.save(comment.markDeleted(now));
            adminLogService.write("REPLY_HIDE" + suffixReason(reason), AdminTargetType.REVIEW, saved.getReviewId());
            return ReplyResponse.builder()
                    .replyId(saved.getCommentId())
                    .targetType(targetType)
                    .targetId(saved.getReviewId())
                    .userId(saved.getUserId())
                    .content(saved.getContent())
                    .status(ReplyStatus.DELETED)
                    .createdAt(saved.getCreatedAt())
                    .updatedAt(saved.getUpdatedAt())
                    .build();
        }

        throw new BusinessException(ErrorCode.INVALID_REQUEST, "지원하지 않는 댓글 대상 타입입니다.");
    }

    @Transactional
    public ReplyResponse restoreReply(ReplyTargetType targetType, Long commentId, String reason) {
        LocalDateTime now = LocalDateTime.now();

        if (targetType == ReplyTargetType.POST) {
            PostComment comment = postCommentRepository.findById(commentId)
                    .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "댓글이 존재하지 않습니다."));
            PostComment restored = comment.restore(now);
            PostComment saved = postCommentRepository.save(restored);
            adminLogService.write("REPLY_RESTORE" + suffixReason(reason), AdminTargetType.POST, saved.getPostId());
            return ReplyResponse.builder()
                    .replyId(saved.getCommentId())
                    .targetType(targetType)
                    .targetId(saved.getPostId())
                    .userId(saved.getUserId())
                    .content(saved.getContent())
                    .status(ReplyStatus.ACTIVE)
                    .createdAt(saved.getCreatedAt())
                    .updatedAt(saved.getUpdatedAt())
                    .build();
        }

        if (targetType == ReplyTargetType.REVIEW) {
            ReviewComment comment = reviewCommentRepository.findById(commentId)
                    .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "댓글이 존재하지 않습니다."));
            ReviewComment restored = comment.restore(now);
            ReviewComment saved = reviewCommentRepository.save(restored);
            adminLogService.write("REPLY_RESTORE" + suffixReason(reason), AdminTargetType.REVIEW, saved.getReviewId());
            return ReplyResponse.builder()
                    .replyId(saved.getCommentId())
                    .targetType(targetType)
                    .targetId(saved.getReviewId())
                    .userId(saved.getUserId())
                    .content(saved.getContent())
                    .status(ReplyStatus.ACTIVE)
                    .createdAt(saved.getCreatedAt())
                    .updatedAt(saved.getUpdatedAt())
                    .build();
        }

        throw new BusinessException(ErrorCode.INVALID_REQUEST, "지원하지 않는 댓글 대상 타입입니다.");
    }

    @Transactional
    public void deleteReply(ReplyTargetType targetType, Long commentId, boolean hardDelete, String reason) {
        if (!hardDelete) {
            hideReply(targetType, commentId, reason);
            return;
        }

        if (targetType == ReplyTargetType.POST) {
            PostComment comment = postCommentRepository.findById(commentId)
                    .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "댓글이 존재하지 않습니다."));
            Long targetId = comment.getPostId();
            postCommentRepository.delete(comment);
            adminLogService.write("REPLY_DELETE_HARD" + suffixReason(reason), AdminTargetType.POST, targetId);
            return;
        }

        if (targetType == ReplyTargetType.REVIEW) {
            ReviewComment comment = reviewCommentRepository.findById(commentId)
                    .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "댓글이 존재하지 않습니다."));
            Long targetId = comment.getReviewId();
            reviewCommentRepository.delete(comment);
            adminLogService.write("REPLY_DELETE_HARD" + suffixReason(reason), AdminTargetType.REVIEW, targetId);
            return;
        }

        throw new BusinessException(ErrorCode.INVALID_REQUEST, "지원하지 않는 댓글 대상 타입입니다.");
    }

    private String suffixReason(String reason) {
        if (reason == null || reason.isBlank()) {
            return "";
        }
        String normalized = reason.trim();
        if (normalized.length() > 80) {
            normalized = normalized.substring(0, 80);
        }
        return "|" + normalized;
    }
}
