// file: src/main/java/com/popups/pupoo/reply/application/ReplyTargetValidator.java
package com.popups.pupoo.reply.application;

import com.popups.pupoo.board.post.domain.enums.PostStatus;
import com.popups.pupoo.board.post.domain.model.Post;
import com.popups.pupoo.board.post.persistence.PostRepository;
import com.popups.pupoo.board.review.domain.enums.ReviewStatus;
import com.popups.pupoo.board.review.domain.model.Review;
import com.popups.pupoo.board.review.persistence.ReviewRepository;
import com.popups.pupoo.common.exception.BusinessException;
import com.popups.pupoo.common.exception.ErrorCode;
import com.popups.pupoo.reply.domain.enums.ReplyTargetType;
import org.springframework.stereotype.Component;

@Component
public class ReplyTargetValidator {

    private final PostRepository postRepository;
    private final ReviewRepository reviewRepository;

    public ReplyTargetValidator(PostRepository postRepository, ReviewRepository reviewRepository) {
        this.postRepository = postRepository;
        this.reviewRepository = reviewRepository;
    }

    public void validate(ReplyTargetType targetType, Long targetId) {
        if (targetType == ReplyTargetType.POST) {
            Post post = postRepository.findById(targetId)
                    .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "게시글이 존재하지 않습니다."));
            if (post.isDeleted()) {
                throw new BusinessException(ErrorCode.INVALID_REQUEST, "삭제된 게시글에는 댓글을 작성할 수 없습니다.");
            }
            return;
        }

        if (targetType == ReplyTargetType.REVIEW) {
            Review review = reviewRepository.findById(targetId)
                    .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "후기가 존재하지 않습니다."));
            if (review.isDeleted()) {
                throw new BusinessException(ErrorCode.INVALID_REQUEST, "삭제된 후기에는 댓글을 작성할 수 없습니다.");
            }
            return;
        }

        throw new BusinessException(ErrorCode.INVALID_REQUEST, "지원하지 않는 댓글 대상 타입입니다.");
    }

    /**
     * 공개 댓글 목록 조회 정책 검증.
     * - POST 대상: deleted=false + status=PUBLISHED
     * - REVIEW 대상: deleted=false + reviewStatus=PUBLIC
     */
    public void validatePublicReadable(ReplyTargetType targetType, Long targetId) {
        if (targetType == ReplyTargetType.POST) {
            Post post = postRepository.findById(targetId)
                    .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "게시글이 존재하지 않습니다."));
            if (post.isDeleted() || post.getStatus() != PostStatus.PUBLISHED) {
                throw new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "게시글이 존재하지 않습니다.");
            }
            return;
        }

        if (targetType == ReplyTargetType.REVIEW) {
            Review review = reviewRepository.findById(targetId)
                    .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "후기가 존재하지 않습니다."));
            if (review.isDeleted() || review.getReviewStatus() != ReviewStatus.PUBLIC) {
                throw new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "후기가 존재하지 않습니다.");
            }
            return;
        }

        throw new BusinessException(ErrorCode.INVALID_REQUEST, "지원하지 않는 댓글 대상 타입입니다.");
    }

}
