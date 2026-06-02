// file: src/main/java/com/popups/pupoo/reply/persistence/ReviewCommentRepository.java
package com.popups.pupoo.reply.persistence;

import com.popups.pupoo.reply.domain.model.ReviewComment;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface ReviewCommentRepository extends JpaRepository<ReviewComment, Long> {

    Page<ReviewComment> findAllByReviewIdAndDeletedFalseOrderByCreatedAtDesc(Long reviewId, Pageable pageable);

    Optional<ReviewComment> findByCommentIdAndDeletedFalse(Long commentId);

    /**
     * 관리자 모더레이션 큐(리뷰 댓글) 조회.
     */
    @Query("""
        select c
        from ReviewComment c
        where (:reviewId is null or c.reviewId = :reviewId)
          and (:commentIds is null or c.commentId in :commentIds)
          and (:userId is null or c.userId = :userId)
          and (:deleted is null or c.deleted = :deleted)
          and (
                :keyword is null
             or :keyword = ''
             or c.content like concat('%', :keyword, '%')
          )
          and (:from is null or c.createdAt >= :from)
          and (:to is null or c.createdAt <= :to)
        """)
    Page<ReviewComment> adminSearch(@Param("reviewId") Long reviewId,
                                   @Param("userId") Long userId,
                                   @Param("deleted") Boolean deleted,
                                   @Param("keyword") String keyword,
                                   @Param("from") LocalDateTime from,
                                   @Param("to") LocalDateTime to,
                                   @Param("commentIds") List<Long> commentIds,
                                   Pageable pageable);

    @Query("""
        select c.reviewId, count(c)
        from ReviewComment c
        where c.deleted = false
          and c.reviewId in :reviewIds
        group by c.reviewId
        """)
    List<Object[]> countByReviewIds(@Param("reviewIds") List<Long> reviewIds);
}
