// file: src/main/java/com/popups/pupoo/report/application/ReportService.java
package com.popups.pupoo.report.application;

import com.popups.pupoo.common.audit.annotation.AdminAudit;
import com.popups.pupoo.auth.security.util.SecurityUtil;
import com.popups.pupoo.board.post.domain.model.Post;
import com.popups.pupoo.board.post.persistence.PostRepository;
import com.popups.pupoo.board.review.domain.model.Review;
import com.popups.pupoo.board.review.persistence.ReviewRepository;
import com.popups.pupoo.common.exception.BusinessException;
import com.popups.pupoo.common.exception.ErrorCode;
import com.popups.pupoo.gallery.domain.enums.GalleryStatus;
import com.popups.pupoo.gallery.persistence.GalleryRepository;
import com.popups.pupoo.reply.domain.model.PostComment;
import com.popups.pupoo.reply.domain.model.ReviewComment;
import com.popups.pupoo.reply.persistence.PostCommentRepository;
import com.popups.pupoo.reply.persistence.ReviewCommentRepository;
import com.popups.pupoo.report.domain.enums.ReportReasonCode;
import com.popups.pupoo.report.domain.enums.ReportStatus;
import com.popups.pupoo.report.domain.enums.ReportTargetType;
import com.popups.pupoo.report.domain.model.ContentReport;
import com.popups.pupoo.report.dto.ReportResponse;
import com.popups.pupoo.report.persistence.ContentReportRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 신고 기능.
 * - 정책: 동일 유저의 동일 대상 중복 신고 금지(uk_report_unique)
 * - 정책: 신고 접수는 PENDING으로 저장
 */
@Service
public class ReportService {

    private final SecurityUtil securityUtil;
    private final ContentReportRepository reportRepository;

    private final PostRepository postRepository;
    private final ReviewRepository reviewRepository;
    private final GalleryRepository galleryRepository;
    private final PostCommentRepository postCommentRepository;
    private final ReviewCommentRepository reviewCommentRepository;

    public ReportService(SecurityUtil securityUtil,
                         ContentReportRepository reportRepository,
                         PostRepository postRepository,
                         ReviewRepository reviewRepository,
                         GalleryRepository galleryRepository,
                         PostCommentRepository postCommentRepository,
                         ReviewCommentRepository reviewCommentRepository) {
        this.securityUtil = securityUtil;
        this.reportRepository = reportRepository;
        this.postRepository = postRepository;
        this.reviewRepository = reviewRepository;
        this.galleryRepository = galleryRepository;
        this.postCommentRepository = postCommentRepository;
        this.reviewCommentRepository = reviewCommentRepository;
    }

    @Transactional
    public ReportResponse reportPost(Long postId, ReportReasonCode reasonCode, String reasonDetail) {
        Long userId = securityUtil.currentUserId();

        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
        if (post.isDeleted()) throw new BusinessException(ErrorCode.RESOURCE_NOT_FOUND);

        ensureNotDuplicate(userId, ReportTargetType.POST, postId);

        validateReason(reasonCode, reasonDetail);

        ContentReport report = reportRepository.save(ContentReport.pending(userId, ReportTargetType.POST, postId, reasonCode, reasonDetail));
        return ReportResponse.from(report);
    }

    @Transactional
    public ReportResponse reportReview(Long reviewId, ReportReasonCode reasonCode, String reasonDetail) {
        Long userId = securityUtil.currentUserId();

        Review review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
        if (review.isDeleted()) throw new BusinessException(ErrorCode.RESOURCE_NOT_FOUND);

        ensureNotDuplicate(userId, ReportTargetType.REVIEW, reviewId);

        validateReason(reasonCode, reasonDetail);

        ContentReport report = reportRepository.save(ContentReport.pending(userId, ReportTargetType.REVIEW, reviewId, reasonCode, reasonDetail));

        // 리뷰는 DB에 REPORTED 상태가 있으므로 즉시 표시 가능하게 한다.
        review.report();

        return ReportResponse.from(report);
    }

    @Transactional
    public ReportResponse reportPostComment(Long commentId, ReportReasonCode reasonCode, String reasonDetail) {
        Long userId = securityUtil.currentUserId();

        PostComment comment = postCommentRepository.findById(commentId)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
        if (comment.isDeleted()) throw new BusinessException(ErrorCode.RESOURCE_NOT_FOUND);

        ensureNotDuplicate(userId, ReportTargetType.POST_COMMENT, commentId);

        validateReason(reasonCode, reasonDetail);

        ContentReport report = reportRepository.save(ContentReport.pending(userId, ReportTargetType.POST_COMMENT, commentId, reasonCode, reasonDetail));
        return ReportResponse.from(report);
    }

    @Transactional
    public ReportResponse reportReviewComment(Long commentId, ReportReasonCode reasonCode, String reasonDetail) {
        Long userId = securityUtil.currentUserId();

        ReviewComment comment = reviewCommentRepository.findById(commentId)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
        if (comment.isDeleted()) throw new BusinessException(ErrorCode.RESOURCE_NOT_FOUND);

        ensureNotDuplicate(userId, ReportTargetType.REVIEW_COMMENT, commentId);

        validateReason(reasonCode, reasonDetail);

        ContentReport report = reportRepository.save(ContentReport.pending(userId, ReportTargetType.REVIEW_COMMENT, commentId, reasonCode, reasonDetail));
        return ReportResponse.from(report);
    }

    @Transactional
    public ReportResponse reportGallery(Long galleryId, ReportReasonCode reasonCode, String reasonDetail) {
        Long userId = securityUtil.currentUserId();

        galleryRepository.findByGalleryIdAndGalleryStatus(galleryId, GalleryStatus.PUBLIC)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));

        ensureNotDuplicate(userId, ReportTargetType.GALLERY, galleryId);

        validateReason(reasonCode, reasonDetail);

        ContentReport report = reportRepository.save(
                ContentReport.pending(userId, ReportTargetType.GALLERY, galleryId, reasonCode, reasonDetail)
        );
        return ReportResponse.from(report);
    }

    private void validateReason(ReportReasonCode reasonCode, String reasonDetail) {
        if (reasonCode == null) {
            throw new BusinessException(ErrorCode.INVALID_REQUEST);
        }
        if (reasonCode == ReportReasonCode.OTHER) {
            if (reasonDetail == null || reasonDetail.isBlank()) {
                throw new BusinessException(ErrorCode.INVALID_REQUEST);
            }
        }
    }

    private void ensureNotDuplicate(Long userId, ReportTargetType type, Long targetId) {
        if (reportRepository.existsByReporterUserIdAndTargetTypeAndTargetId(userId, type, targetId)) {
            throw new BusinessException(ErrorCode.DUPLICATE_RESOURCE);
        }
    }

    /**
     * 관리자 신고 처리.
     * - 정책: admin_logs는 쓰기 작업만 기록 (AOP 기반 자동 적재)
     */
    @Transactional
    @AdminAudit(
            actionSpel = "'REPORT_' + (#accept ? 'ACCEPT' : 'REJECT') + '|reportId=' + #reportId",
            targetTypeSpel = "#result.targetType",
            targetIdSpel = "#result.targetId"
    )
    public ReportResponse decide(Long reportId, boolean accept, String reason) {
        Long adminId = securityUtil.currentUserId();

        ContentReport report = reportRepository.findById(reportId)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));

        if (report.getStatus() != ReportStatus.PENDING) {
            throw new BusinessException(ErrorCode.INVALID_REQUEST);
        }

        if (accept) {
            report.accept(adminId);
        } else {
            report.reject(adminId);
        }


        return ReportResponse.from(report);
    }
}
