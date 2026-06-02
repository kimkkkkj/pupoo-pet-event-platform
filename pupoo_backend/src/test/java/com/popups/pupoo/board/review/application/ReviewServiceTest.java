package com.popups.pupoo.board.review.application;

import com.popups.pupoo.board.bannedword.application.BannedWordService;
import com.popups.pupoo.board.bannedword.application.ModerationBlockMessageResolver;
import com.popups.pupoo.board.bannedword.application.ModerationClient;
import com.popups.pupoo.board.boardinfo.persistence.BoardRepository;
import com.popups.pupoo.board.review.domain.enums.ReviewStatus;
import com.popups.pupoo.board.review.domain.model.Review;
import com.popups.pupoo.board.review.persistence.ReviewRepository;
import com.popups.pupoo.event.persistence.EventRepository;
import com.popups.pupoo.reply.persistence.ReviewCommentRepository;
import com.popups.pupoo.user.persistence.UserRepository;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class ReviewServiceTest {

    @Test
    void delete_marksExistingReviewDeletedWithoutDroppingRequiredFields() {
        ReviewRepository reviewRepository = mock(ReviewRepository.class);
        Review review = Review.builder()
                .reviewId(3903L)
                .eventId(11L)
                .userId(7L)
                .rating((byte) 5)
                .reviewTitle("AUTO-VERIFY review title")
                .content("AUTO-VERIFY review content")
                .viewCount(3)
                .createdAt(LocalDateTime.of(2026, 3, 27, 14, 0))
                .updatedAt(LocalDateTime.of(2026, 3, 27, 14, 5))
                .deleted(false)
                .reviewStatus(ReviewStatus.PUBLIC)
                .build();
        when(reviewRepository.findById(3903L)).thenReturn(Optional.of(review));

        ReviewService service = new ReviewService(
                reviewRepository,
                mock(ReviewCommentRepository.class),
                mock(BoardRepository.class),
                mock(BannedWordService.class),
                mock(ModerationClient.class),
                mock(ModerationBlockMessageResolver.class),
                mock(EventRepository.class),
                mock(UserRepository.class)
        );

        service.delete(7L, 3903L);

        assertThat(review.isDeleted()).isTrue();
        assertThat(review.getReviewStatus()).isEqualTo(ReviewStatus.DELETED);
        assertThat(review.getReviewTitle()).isEqualTo("AUTO-VERIFY review title");
        assertThat(review.getContent()).isEqualTo("AUTO-VERIFY review content");
        verify(reviewRepository).save(review);
    }
}
