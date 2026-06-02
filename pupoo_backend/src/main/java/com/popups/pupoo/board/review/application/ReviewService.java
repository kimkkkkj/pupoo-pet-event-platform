// file: src/main/java/com/popups/pupoo/board/review/application/ReviewService.java
package com.popups.pupoo.board.review.application;

import com.popups.pupoo.board.bannedword.application.BannedWordService;
import com.popups.pupoo.board.bannedword.domain.enums.BannedLogContentType;
import com.popups.pupoo.board.bannedword.application.ModerationClient;
import com.popups.pupoo.board.bannedword.application.ModerationResult;
import com.popups.pupoo.board.bannedword.application.ModerationBlockMessageResolver;
import com.popups.pupoo.board.boardinfo.domain.enums.BoardType;
import com.popups.pupoo.board.boardinfo.persistence.BoardRepository;
import com.popups.pupoo.board.review.domain.enums.ReviewStatus;
import com.popups.pupoo.board.review.domain.model.Review;
import com.popups.pupoo.board.review.dto.*;
import com.popups.pupoo.board.review.persistence.ReviewRepository;
import com.popups.pupoo.common.exception.BusinessException;
import com.popups.pupoo.common.exception.ErrorCode;
import com.popups.pupoo.common.search.SearchType;
import com.popups.pupoo.event.persistence.EventRepository;
import com.popups.pupoo.reply.persistence.ReviewCommentRepository;
import com.popups.pupoo.user.persistence.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ReviewService {

    private final ReviewRepository reviewRepository;
    private final ReviewCommentRepository reviewCommentRepository;
    private final BoardRepository boardRepository;
    private final BannedWordService bannedWordService;
    private final ModerationClient moderationClient;
    private final ModerationBlockMessageResolver moderationBlockMessageResolver;
    private final EventRepository eventRepository;
    private final UserRepository userRepository;

    @Transactional
    public ReviewResponse create(Long userId, ReviewCreateRequest request) {
        Long reviewBoardId = boardRepository.findByBoardType(BoardType.REVIEW)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "REVIEW 게시판(board_type=REVIEW)이 존재하지 않습니다."))
                .getBoardId();

        ModerationResult modResult = null;
        if (!bannedWordService.shouldSkipModeration(userId)) {
            String effectiveTitle = resolveReviewTitleForModeration(
                    request.getReviewTitle(), request.getContent());
            String textToModerate = buildReviewModerationText(effectiveTitle, request.getContent());
            modResult = moderationClient.moderate(textToModerate, reviewBoardId, "POST");
            if (modResult != null && modResult.isBlock()) {
                // 생성 단계에서 BLOCK 된 후기 역시 로그에 남긴다 (contentId는 아직 없음).
                bannedWordService.logAiModeration(
                        reviewBoardId,
                        null,
                        BannedLogContentType.POST,
                        userId,
                        modResult
                );
                // 기술/서버 장애 등으로 BLOCK 된 경우에도 reason/stack을 반영해 안내문구를 다르게 노출한다.
                String msg = moderationBlockMessageResolver.resolveCreateBlockMessage("후기", modResult);
                throw new BusinessException(ErrorCode.VALIDATION_FAILED, msg);
            }
        }

        // 저장 제목은 모더레이션과 동일: 요청 제목이 있으면 사용, 없으면 본문 첫 줄 유도
        String reviewTitle = resolveReviewTitleForModeration(request.getReviewTitle(), request.getContent());

        Review review = Review.builder()
                .eventId(request.getEventId())
                .userId(userId)
                .rating((byte) request.getRating().shortValue())
                .reviewTitle(reviewTitle)
                .content(request.getContent())
                .viewCount(0)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .deleted(false)
                .reviewStatus(ReviewStatus.PUBLIC)
                .build();
        Review saved = reviewRepository.save(review);
        return toResponse(saved);
    }

    @Transactional
    public ReviewResponse get(Long reviewId) {
        reviewRepository.increaseViewCount(reviewId);

        // 공개 조회 정책: PUBLIC + deleted=false만 반환한다.
        Review review = reviewRepository.findByReviewIdAndDeletedFalseAndReviewStatus(reviewId, ReviewStatus.PUBLIC)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "후기가 존재하지 않습니다."));
        return toResponse(review);
    }

    public Page<ReviewResponse> list(SearchType searchType, String keyword, int page, int size, Integer rating) {
        return list(searchType, keyword, page, size, rating, "latest");
    }

    public Page<ReviewResponse> list(SearchType searchType,
                                       String keyword,
                                       int page,
                                       int size,
                                       Integer rating,
                                       String sortKey) {
        validatePageRequest(page, size);
        PageRequest pageable = PageRequest.of(page, size);

        Byte ratingByte = null;
        if (rating != null && rating >= 1 && rating <= 5) {
            ratingByte = rating.byteValue();
        }

        Long writerId = null;
        if (searchType == SearchType.WRITER) {
            writerId = parseLongOrNull(keyword);
        }

        String keywordEffective = (keyword == null || keyword.isBlank()) ? null : keyword;

        String sk = (sortKey == null || sortKey.isBlank()) ? "latest" : sortKey.trim().toLowerCase();
        String publicStatus = ReviewStatus.PUBLIC.name();
        Page<Review> resultPage = switch (sk) {
            case "comments", "comment", "commentcount" -> reviewRepository.searchPublicSortedByCommentCount(
                    publicStatus,
                    ratingByte,
                    keywordEffective,
                    writerId,
                    pageable
            );
            case "views" -> reviewRepository.searchPublicSortedByViews(
                    ReviewStatus.PUBLIC,
                    ratingByte,
                    keywordEffective,
                    writerId,
                    pageable
            );
            default -> reviewRepository.searchPublicSortedByLatest(
                    ReviewStatus.PUBLIC,
                    ratingByte,
                    keywordEffective,
                    writerId,
                    pageable
            );
        };

        List<Review> reviews = resultPage.getContent();
        Map<Long, Long> commentCountMap = fetchCommentCounts(reviews);
        List<ReviewResponse> content = reviews.stream()
                .map(r -> {
                    Long reviewId = r.getReviewId();
                    long cnt = reviewId != null ? commentCountMap.getOrDefault(reviewId, 0L) : 0L;
                    return toResponse(r, cnt);
                })
                .toList();

        return new PageImpl<>(content, resultPage.getPageable(), resultPage.getTotalElements());
    }

    public Page<ReviewResponse> list(int page, int size) {
        return list(SearchType.TITLE_CONTENT, null, page, size, null);
    }

    public Page<ReviewResponse> list(SearchType searchType, String keyword, int page, int size) {
        return list(searchType, keyword, page, size, null);
    }

    private static Long parseLongOrNull(String keyword) {
        if (keyword == null || keyword.isBlank()) return null;
        try {
            return Long.parseLong(keyword.trim());
        } catch (NumberFormatException e) {
            return null;
        }
    }

    @Transactional
    public ReviewResponse update(Long userId, Long reviewId, ReviewUpdateRequest request) {
        Review review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new IllegalArgumentException("후기가 존재하지 않습니다."));
        if (!review.getUserId().equals(userId)) {
            throw new SecurityException("수정 권한이 없습니다.");
        }

        Long reviewBoardId = boardRepository.findByBoardType(BoardType.REVIEW)
                .map(b -> b.getBoardId()).orElse(null);

        if (!bannedWordService.shouldSkipModeration(userId) && reviewBoardId != null) {
            String effectiveTitle = resolveReviewTitleForUpdate(request, review);
            String textToModerate = buildReviewModerationText(effectiveTitle, request.getContent());
            ModerationResult modResult = moderationClient.moderate(textToModerate, reviewBoardId, "POST");
            if (modResult != null && modResult.isBlock()) {
                bannedWordService.logAiModeration(
                        reviewBoardId, reviewId, BannedLogContentType.POST, userId, modResult);
                String msg = moderationBlockMessageResolver.resolveCreateBlockMessage("후기", modResult);
                throw new BusinessException(ErrorCode.VALIDATION_FAILED, msg);
            }
        }

        review.update(
                (byte) request.getRating().shortValue(),
                request.getReviewTitle() != null
                        ? request.getReviewTitle()
                        : (review.getReviewTitle() != null
                                ? review.getReviewTitle()
                                : deriveTitleFromContent(request.getContent())),
                request.getContent(),
                LocalDateTime.now()
        );

        Review saved = reviewRepository.save(review);
        return toResponse(saved);
    }

    @Transactional
    public void delete(Long userId, Long reviewId) {
        Review review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new IllegalArgumentException("후기가 존재하지 않습니다."));
        if (!review.getUserId().equals(userId)) {
            throw new SecurityException("삭제 권한이 없습니다.");
        }

        review.softDelete(LocalDateTime.now());
        reviewRepository.save(review);
    }

    /**
     * 페이징 파라미터 검증
     * - page는 0 이상
     * - size는 1~100 범위
     */
    /** content 첫 줄을 제목으로 사용(최대 255자) */
    private static String deriveTitleFromContent(String content) {
        if (content == null || content.isBlank()) return "행사 후기";
        String firstLine = content.lines().map(String::trim).filter(s -> !s.isEmpty()).findFirst().orElse("행사 후기");
        return firstLine.length() > 255 ? firstLine.substring(0, 255) : firstLine;
    }

    /**
     * AI 모더레이션 입력: 제목 + 본문 (게시글 PostService와 동일하게 결합).
     */
    private static String buildReviewModerationText(String title, String content) {
        String t = title != null ? title.trim() : "";
        String c = content != null ? content : "";
        return (t + " " + c).trim();
    }

    /**
     * 생성 시 모더레이션에 쓸 제목: 요청에 제목이 있으면 그대로, 없으면 본문에서 유도(저장 로직과 동일).
     */
    private static String resolveReviewTitleForModeration(String reviewTitle, String content) {
        if (reviewTitle != null && !reviewTitle.isBlank()) {
            return reviewTitle.trim();
        }
        return deriveTitleFromContent(content);
    }

    /**
     * 수정 시 모더레이션에 쓸 제목: {@link ReviewService#update} 의 reviewTitle 빌더와 동일한 규칙.
     */
    private static String resolveReviewTitleForUpdate(ReviewUpdateRequest request, Review review) {
        if (request.getReviewTitle() != null) {
            return request.getReviewTitle().trim();
        }
        if (review.getReviewTitle() != null) {
            return review.getReviewTitle().trim();
        }
        return deriveTitleFromContent(request.getContent());
    }

    private void validatePageRequest(int page, int size) {
        if (page < 0) {
            throw new BusinessException(ErrorCode.VALIDATION_FAILED, "page는 0 이상이어야 합니다.");
        }
        if (size < 1 || size > 100) {
            throw new BusinessException(ErrorCode.VALIDATION_FAILED, "size는 1~100 범위여야 합니다.");
        }
    }

    private ReviewResponse toResponse(Review r) {
        return toResponse(r, 0L);
    }

    private ReviewResponse toResponse(Review r, long commentCount) {
        String eventName = eventRepository.findById(r.getEventId()).map(e -> e.getEventName()).orElse(null);
        String writerEmail = null;
        String writerNickname = null;
        if (r.getUserId() != null) {
            var u = userRepository.findById(r.getUserId());
            writerEmail = u.map(user -> user.getEmail()).orElse(null);
            writerNickname = u.map(user -> user.getNickname()).orElse(null);
        }
        return ReviewResponse.from(r, eventName, writerEmail, writerNickname, r.getReviewTitle(), r.getContent(), commentCount);
    }

    private Map<Long, Long> fetchCommentCounts(List<Review> reviews) {
        if (reviews == null || reviews.isEmpty()) return new HashMap<>();
        List<Long> reviewIds = reviews.stream().map(Review::getReviewId).toList();
        List<Object[]> rows = reviewCommentRepository.countByReviewIds(reviewIds);
        Map<Long, Long> map = new HashMap<>();
        for (Object[] row : rows) {
            if (row == null || row.length < 2) continue;
            Long reviewId = row[0] != null ? ((Number) row[0]).longValue() : null;
            Long cnt = row[1] != null ? ((Number) row[1]).longValue() : 0L;
            if (reviewId != null) map.put(reviewId, cnt);
        }
        return map;
    }
}
