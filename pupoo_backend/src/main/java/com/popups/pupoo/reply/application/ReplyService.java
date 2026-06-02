// file: src/main/java/com/popups/pupoo/reply/application/ReplyService.java
package com.popups.pupoo.reply.application;

import java.time.LocalDateTime;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.popups.pupoo.board.bannedword.application.BannedWordService;
import com.popups.pupoo.board.bannedword.application.ModerationBlockMessageResolver;
import com.popups.pupoo.board.bannedword.application.ModerationClient;
import com.popups.pupoo.board.bannedword.application.ModerationResult;
import com.popups.pupoo.board.bannedword.domain.enums.BannedLogContentType;
import com.popups.pupoo.board.boardinfo.domain.enums.BoardType;
import com.popups.pupoo.board.boardinfo.persistence.BoardRepository;
import com.popups.pupoo.board.post.domain.model.Post;
import com.popups.pupoo.board.post.persistence.PostRepository;
import com.popups.pupoo.common.exception.BusinessException;
import com.popups.pupoo.common.exception.ErrorCode;
import com.popups.pupoo.reply.domain.enums.ReplyStatus;
import com.popups.pupoo.reply.domain.enums.ReplyTargetType;
import com.popups.pupoo.reply.domain.model.PostComment;
import com.popups.pupoo.reply.domain.model.ReviewComment;
import com.popups.pupoo.reply.dto.ReplyCreateRequest;
import com.popups.pupoo.reply.dto.ReplyResponse;
import com.popups.pupoo.reply.dto.ReplyUpdateRequest;
import com.popups.pupoo.reply.persistence.PostCommentRepository;
import com.popups.pupoo.reply.persistence.ReviewCommentRepository;
import com.popups.pupoo.user.persistence.UserRepository;

/**
 * 게시글 댓글과 리뷰 댓글의 생성/조회/수정/삭제를 통합 처리한다.
 *
 * 댓글은 별도 신고 상태를 들고 있지 않고,
 * 현재 구현 기준 응답 상태는 ACTIVE와 DELETED만 노출한다.
 */
@Service
@Transactional(readOnly = true)
public class ReplyService {

    private final PostCommentRepository postCommentRepository;
    private final ReviewCommentRepository reviewCommentRepository;
    private final ReplyTargetValidator targetValidator;
    private final PostRepository postRepository;
    private final BoardRepository boardRepository;
    private final BannedWordService bannedWordService;
    private final ModerationClient moderationClient;
    private final ModerationBlockMessageResolver moderationBlockMessageResolver;
    private final UserRepository userRepository;

    public ReplyService(PostCommentRepository postCommentRepository,
                        ReviewCommentRepository reviewCommentRepository,
                        ReplyTargetValidator targetValidator,
                        PostRepository postRepository,
                        BoardRepository boardRepository,
                        BannedWordService bannedWordService,
                        ModerationClient moderationClient,
                        ModerationBlockMessageResolver moderationBlockMessageResolver,
                        UserRepository userRepository) {
        this.postCommentRepository = postCommentRepository;
        this.reviewCommentRepository = reviewCommentRepository;
        this.targetValidator = targetValidator;
        this.postRepository = postRepository;
        this.boardRepository = boardRepository;
        this.bannedWordService = bannedWordService;
        this.moderationClient = moderationClient;
        this.moderationBlockMessageResolver = moderationBlockMessageResolver;
        this.userRepository = userRepository;
    }

    private String getWriterEmail(Long userId) {
        if (userId == null) return null;
        return userRepository.findById(userId).map(u -> u.getEmail()).orElse(null);
    }

    /**
     * 댓글 생성 전 대상 존재 여부, 댓글 허용 여부, 금칙어 정책을 순서대로 검증한다.
     * AI moderation 차단 건은 저장하지 않고 로그만 남긴 뒤 예외를 반환한다.
     */
    @Transactional
    public ReplyResponse create(Long userId, ReplyCreateRequest request) {
        targetValidator.validate(request.getTargetType(), request.getTargetId());

        if (request.getTargetType() == ReplyTargetType.POST) {
            validateReplyAllowedForPost(request.getTargetId());
        }

        Long boardIdForModeration;
        if (request.getTargetType() == ReplyTargetType.POST) {
            Post post = postRepository.findByPostIdAndDeletedFalse(request.getTargetId())
                    .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "게시글이 존재하지 않습니다."));
            boardIdForModeration = post.getBoard() != null ? post.getBoard().getBoardId() : null;
        } else if (request.getTargetType() == ReplyTargetType.REVIEW) {
            boardIdForModeration = boardRepository.findByBoardType(BoardType.REVIEW)
                    .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "REVIEW 게시판이 존재하지 않습니다."))
                    .getBoardId();
        } else {
            boardIdForModeration = null;
        }

        ModerationResult modResult = null;
        if (!bannedWordService.shouldSkipModeration(userId) && boardIdForModeration != null) {
            modResult = moderationClient.moderate(request.getContent() != null ? request.getContent() : "", boardIdForModeration, "COMMENT");
            if (modResult != null && modResult.isBlock()) {
                bannedWordService.logAiModeration(
                        boardIdForModeration,
                        null,
                        BannedLogContentType.COMMENT,
                        userId,
                        modResult
                );
                // 기술/서버 장애 등으로 BLOCK 된 경우에도 reason/stack을 반영해 안내문구를 다르게 노출한다.
                String msg = moderationBlockMessageResolver.resolveCreateBlockMessage("댓글", modResult);
                throw new BusinessException(ErrorCode.VALIDATION_FAILED, msg);
            }
        }

        LocalDateTime now = LocalDateTime.now();

        if (request.getTargetType() == ReplyTargetType.POST) {
            Post post = postRepository.findByPostIdAndDeletedFalse(request.getTargetId())
                    .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "게시글이 존재하지 않습니다."));
            Long boardId = post.getBoard() != null ? post.getBoard().getBoardId() : null;

            PostComment saved = postCommentRepository.save(PostComment.builder()
                    .postId(request.getTargetId())
                    .userId(userId)
                    .content(request.getContent())
                    .createdAt(now)
                    .updatedAt(now)
                    .deleted(false)
                    .build());
            return toResponse(saved, ReplyTargetType.POST, request.getTargetId(), boardId);
        }

        if (request.getTargetType() == ReplyTargetType.REVIEW) {
            Long reviewBoardId = boardRepository.findByBoardType(BoardType.REVIEW)
                    .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "REVIEW 게시판이 존재하지 않습니다."))
                    .getBoardId();

            ReviewComment saved = reviewCommentRepository.save(ReviewComment.builder()
                    .reviewId(request.getTargetId())
                    .userId(userId)
                    .content(request.getContent())
                    .createdAt(now)
                    .updatedAt(now)
                    .deleted(false)
                    .build());
            return toResponse(saved, ReplyTargetType.REVIEW, request.getTargetId(), reviewBoardId);
        }

        throw new BusinessException(ErrorCode.INVALID_REQUEST, "지원하지 않는 댓글 대상 타입입니다.");
    }

    private void validateReplyAllowedForPost(Long postId) {
        Post post = postRepository.findByPostIdAndDeletedFalse(postId)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "게시글이 존재하지 않습니다."));

        // 숨김 처리된 게시글은 공개 댓글 흐름에서 제외한다.
        if (post.getStatus() == com.popups.pupoo.board.post.domain.enums.PostStatus.HIDDEN) {
            throw new BusinessException(ErrorCode.FORBIDDEN, "숨김 처리된 게시글에는 댓글을 작성할 수 없습니다.");
        }

        // 현재 댓글은 FREE와 INFO 게시판 게시글에만 허용한다.
        BoardType bt = (post.getBoard() == null) ? null : post.getBoard().getBoardType();
        if (bt != BoardType.FREE && bt != BoardType.INFO) {
            throw new BusinessException(ErrorCode.FORBIDDEN, "해당 게시판에는 댓글을 작성할 수 없습니다.");
        }
        if (!post.isCommentEnabled()) {
            throw new BusinessException(ErrorCode.FORBIDDEN, "댓글이 비활성화된 게시글입니다.");
        }
    }

    /**
     * 공개 댓글 목록 조회 시 부모 콘텐츠가 공개 가능한 상태인지 먼저 검증한다.
     */
    public Page<ReplyResponse> list(ReplyTargetType targetType, Long targetId, int page, int size) {
        validatePageRequest(page, size);
        targetValidator.validatePublicReadable(targetType, targetId);

        if (targetType == ReplyTargetType.POST) {
            Long boardId = postRepository.findByPostIdAndDeletedFalse(targetId)
                    .map(p -> p.getBoard() != null ? p.getBoard().getBoardId() : null)
                    .orElse(null);
            return postCommentRepository
                    .findAllByPostIdAndDeletedFalseOrderByCreatedAtDesc(targetId, PageRequest.of(page, size))
                    .map(c -> toResponse(c, ReplyTargetType.POST, targetId, boardId));
        }

        if (targetType == ReplyTargetType.REVIEW) {
            Long reviewBoardId = boardRepository.findByBoardType(BoardType.REVIEW).map(b -> b.getBoardId()).orElse(null);
            return reviewCommentRepository
                    .findAllByReviewIdAndDeletedFalseOrderByCreatedAtDesc(targetId, PageRequest.of(page, size))
                    .map(c -> toResponse(c, ReplyTargetType.REVIEW, targetId, reviewBoardId));
        }

        throw new BusinessException(ErrorCode.INVALID_REQUEST, "지원하지 않는 댓글 대상 타입입니다.");
    }

    /**
     * 수정은 작성자 본인만 가능하다.
     */
    @Transactional
    public ReplyResponse update(Long userId, ReplyTargetType targetType, Long replyId, ReplyUpdateRequest request) {
        LocalDateTime now = LocalDateTime.now();

        if (targetType == ReplyTargetType.POST) {
            PostComment comment = postCommentRepository.findByCommentIdAndDeletedFalse(replyId)
                    .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "댓글이 존재하지 않습니다."));

            if (!comment.getUserId().equals(userId)) {
                throw new BusinessException(ErrorCode.FORBIDDEN, "수정 권한이 없습니다.");
            }

            Long boardId = postRepository.findByPostIdAndDeletedFalse(comment.getPostId())
                    .map(p -> p.getBoard() != null ? p.getBoard().getBoardId() : null).orElse(null);

            if (!bannedWordService.shouldSkipModeration(userId) && boardId != null) {
                ModerationResult modResult = moderationClient.moderate(
                        request.getContent() != null ? request.getContent() : "", boardId, "COMMENT");
                if (modResult != null && modResult.isBlock()) {
                    bannedWordService.logAiModeration(
                            boardId, replyId, BannedLogContentType.COMMENT, userId, modResult);
                    String msg = moderationBlockMessageResolver.resolveCreateBlockMessage("댓글", modResult);
                    throw new BusinessException(ErrorCode.VALIDATION_FAILED, msg);
                }
            }

            PostComment saved = postCommentRepository.save(comment.updateContent(request.getContent(), now));
            return toResponse(saved, ReplyTargetType.POST, comment.getPostId(), boardId);
        }

        if (targetType == ReplyTargetType.REVIEW) {
            ReviewComment comment = reviewCommentRepository.findByCommentIdAndDeletedFalse(replyId)
                    .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "댓글이 존재하지 않습니다."));

            if (!comment.getUserId().equals(userId)) {
                throw new BusinessException(ErrorCode.FORBIDDEN, "수정 권한이 없습니다.");
            }

            Long reviewBoardId = boardRepository.findByBoardType(BoardType.REVIEW)
                    .map(b -> b.getBoardId()).orElse(null);

            if (!bannedWordService.shouldSkipModeration(userId) && reviewBoardId != null) {
                ModerationResult modResult = moderationClient.moderate(
                        request.getContent() != null ? request.getContent() : "", reviewBoardId, "COMMENT");
                if (modResult != null && modResult.isBlock()) {
                    bannedWordService.logAiModeration(
                            reviewBoardId, replyId, BannedLogContentType.COMMENT, userId, modResult);
                    String msg = moderationBlockMessageResolver.resolveCreateBlockMessage("댓글", modResult);
                    throw new BusinessException(ErrorCode.VALIDATION_FAILED, msg);
                }
            }

            ReviewComment saved = reviewCommentRepository.save(comment.updateContent(request.getContent(), now));
            return toResponse(saved, ReplyTargetType.REVIEW, comment.getReviewId(), reviewBoardId);
        }

        throw new BusinessException(ErrorCode.INVALID_REQUEST, "지원하지 않는 댓글 대상 타입입니다.");
    }

    /**
     * 삭제는 hard delete가 아니라 deleted 플래그를 세우는 soft delete다.
     */
    @Transactional
    public void delete(Long userId, ReplyTargetType targetType, Long replyId) {
        LocalDateTime now = LocalDateTime.now();

        if (targetType == ReplyTargetType.POST) {
            PostComment comment = postCommentRepository.findByCommentIdAndDeletedFalse(replyId)
                    .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "댓글이 존재하지 않습니다."));

            if (!comment.getUserId().equals(userId)) {
                throw new BusinessException(ErrorCode.FORBIDDEN, "삭제 권한이 없습니다.");
            }

            postCommentRepository.save(comment.markDeleted(now));
            return;
        }

        if (targetType == ReplyTargetType.REVIEW) {
            ReviewComment comment = reviewCommentRepository.findByCommentIdAndDeletedFalse(replyId)
                    .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "댓글이 존재하지 않습니다."));

            if (!comment.getUserId().equals(userId)) {
                throw new BusinessException(ErrorCode.FORBIDDEN, "삭제 권한이 없습니다.");
            }

            reviewCommentRepository.save(comment.markDeleted(now));
            return;
        }

        throw new BusinessException(ErrorCode.INVALID_REQUEST, "지원하지 않는 댓글 대상 타입입니다.");
    }

    private ReplyResponse toResponse(PostComment c, ReplyTargetType type, Long targetId, Long boardId) {
        String content = c.getContent();
        return ReplyResponse.builder()
                .replyId(c.getCommentId())
                .targetType(type)
                .targetId(targetId)
                .userId(c.getUserId())
                .writerEmail(getWriterEmail(c.getUserId()))
                .content(content)
                .status(c.isDeleted() ? ReplyStatus.DELETED : ReplyStatus.ACTIVE)
                .createdAt(c.getCreatedAt())
                .updatedAt(c.getUpdatedAt())
                .build();
    }

    private ReplyResponse toResponse(ReviewComment c, ReplyTargetType type, Long targetId, Long boardId) {
        String content = c.getContent();
        return ReplyResponse.builder()
                .replyId(c.getCommentId())
                .targetType(type)
                .targetId(targetId)
                .userId(c.getUserId())
                .writerEmail(getWriterEmail(c.getUserId()))
                .content(content)
                .status(c.isDeleted() ? ReplyStatus.DELETED : ReplyStatus.ACTIVE)
                .createdAt(c.getCreatedAt())
                .updatedAt(c.getUpdatedAt())
                .build();
    }

    /**
     * 과도한 페이지 요청으로 인한 조회 부하를 막기 위해 범위를 제한한다.
     */
    private void validatePageRequest(int page, int size) {
        if (page < 0) {
            throw new BusinessException(ErrorCode.INVALID_REQUEST, "page는 0 이상이어야 합니다.");
        }
        if (size < 1 || size > 100) {
            throw new BusinessException(ErrorCode.INVALID_REQUEST, "size는 1~100 범위여야 합니다.");
        }
    }
}
