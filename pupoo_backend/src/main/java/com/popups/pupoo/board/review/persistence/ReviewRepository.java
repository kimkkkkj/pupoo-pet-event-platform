// file: src/main/java/com/popups/pupoo/board/review/persistence/ReviewRepository.java
package com.popups.pupoo.board.review.persistence;

import com.popups.pupoo.board.review.domain.enums.ReviewStatus;
import com.popups.pupoo.board.review.domain.model.Review;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface ReviewRepository extends JpaRepository<Review, Long> {
    Optional<Review> findByEventIdAndUserId(Long eventId, Long userId);

    // 공개 조회: 삭제되지 않고 PUBLIC 상태인 후기만 조회
    Optional<Review> findByReviewIdAndDeletedFalseAndReviewStatus(Long reviewId, ReviewStatus reviewStatus);

    // 공개 조회: 삭제되지 않고 PUBLIC 상태인 후기 목록 조회
    Page<Review> findByDeletedFalseAndReviewStatus(ReviewStatus reviewStatus, Pageable pageable);

    @Query("""
        select r from Review r
        where r.deleted = false and r.reviewStatus = :status and r.rating = :rating
        order by r.createdAt desc, r.reviewId desc
        """)
    Page<Review> findByDeletedFalseAndReviewStatusAndRating(@Param("status") ReviewStatus reviewStatus,
                                                           @Param("rating") byte rating,
                                                           Pageable pageable);

    @Query("""
        select r from Review r
        where r.deleted = false and r.reviewStatus = :status and r.rating = :rating
          and (:keyword is null or :keyword = '' or r.content like concat('%', :keyword, '%'))
        order by r.createdAt desc, r.reviewId desc
        """)
    Page<Review> searchPublicByContentAndRating(@Param("status") ReviewStatus reviewStatus,
                                                 @Param("keyword") String keyword,
                                                 @Param("rating") byte rating,
                                                 Pageable pageable);

    @Query("""
        select r
        from Review r
        where r.deleted = false
          and r.reviewStatus = :status
          and (:keyword is null or :keyword = '' or r.content like concat('%', :keyword, '%'))
        order by r.createdAt desc, r.reviewId desc
        """)
    Page<Review> searchPublicByContent(@Param("status") ReviewStatus status,
                                      @Param("keyword") String keyword,
                                      Pageable pageable);

    @Query("""
        select r
        from Review r
        where r.deleted = false
          and r.reviewStatus = :status
          and (:writerId is null or r.userId = :writerId)
        order by r.createdAt desc, r.reviewId desc
        """)
    Page<Review> searchPublicByWriter(@Param("status") ReviewStatus status,
                                     @Param("writerId") Long writerId,
                                     Pageable pageable);

    @Query("""
        select r
        from Review r
        join Event e on e.eventId = r.eventId
        where r.deleted = false
          and r.reviewStatus = :status
          and (:rating is null or r.rating = :rating)
          and (:writerId is null or r.userId = :writerId)
          and (
                :keyword is null
             or :keyword = ''
             or r.reviewTitle like concat('%', :keyword, '%')
             or r.content like concat('%', :keyword, '%')
             or e.eventName like concat('%', :keyword, '%')
          )
        order by r.createdAt desc, r.reviewId desc
        """)
    Page<Review> searchPublicSortedByLatest(
            @Param("status") ReviewStatus status,
            @Param("rating") Byte rating,
            @Param("keyword") String keyword,
            @Param("writerId") Long writerId,
            Pageable pageable
    );

    @Query("""
        select r
        from Review r
        join Event e on e.eventId = r.eventId
        where r.deleted = false
          and r.reviewStatus = :status
          and (:rating is null or r.rating = :rating)
          and (:writerId is null or r.userId = :writerId)
          and (
                :keyword is null
             or :keyword = ''
             or r.reviewTitle like concat('%', :keyword, '%')
             or r.content like concat('%', :keyword, '%')
             or e.eventName like concat('%', :keyword, '%')
          )
        order by r.viewCount desc, r.createdAt desc, r.reviewId desc
        """)
    Page<Review> searchPublicSortedByViews(
            @Param("status") ReviewStatus status,
            @Param("rating") Byte rating,
            @Param("keyword") String keyword,
            @Param("writerId") Long writerId,
            Pageable pageable
    );

    @Query(value = """
        SELECT r.*
        FROM reviews r
        JOIN event e ON e.event_id = r.event_id
        WHERE r.is_deleted = 0
          AND r.review_status = :status
          AND (:rating is null OR r.rating = :rating)
          AND (:writerId is null OR r.user_id = :writerId)
          AND (
                :keyword is null
             OR :keyword = ''
             OR r.review_title LIKE CONCAT('%', :keyword, '%')
             OR r.content LIKE CONCAT('%', :keyword, '%')
             OR e.event_name LIKE CONCAT('%', :keyword, '%')
          )
        ORDER BY (
            SELECT COUNT(*)
            FROM review_comments c
            WHERE c.review_id = r.review_id
              AND c.is_deleted = 0
        ) DESC,
        r.created_at DESC,
        r.review_id DESC
        """, countQuery = """
        SELECT COUNT(*)
        FROM reviews r
        JOIN event e ON e.event_id = r.event_id
        WHERE r.is_deleted = 0
          AND r.review_status = :status
          AND (:rating is null OR r.rating = :rating)
          AND (:writerId is null OR r.user_id = :writerId)
          AND (
                :keyword is null
             OR :keyword = ''
             OR r.review_title LIKE CONCAT('%', :keyword, '%')
             OR r.content LIKE CONCAT('%', :keyword, '%')
             OR e.event_name LIKE CONCAT('%', :keyword, '%')
          )
        """, nativeQuery = true)
    Page<Review> searchPublicSortedByCommentCount(
            @Param("status") String status,
            @Param("rating") Byte rating,
            @Param("keyword") String keyword,
            @Param("writerId") Long writerId,
            Pageable pageable
    );

    /**
     * 관리자 모더레이션 큐 조회용: 삭제/블라인드 포함 검색.
     */
    @Query("""
        select r
        from Review r
        where (:eventId is null or r.eventId = :eventId)
          and (:reviewIds is null or r.reviewId in :reviewIds)
          and (:userId is null or r.userId = :userId)
          and (:deleted is null or r.deleted = :deleted)
          and (:reviewStatus is null or r.reviewStatus = :reviewStatus)
          and (
                :keyword is null
             or :keyword = ''
             or r.content like concat('%', :keyword, '%')
          )
          and (:from is null or r.createdAt >= :from)
          and (:to is null or r.createdAt <= :to)
        """)
    Page<Review> adminSearch(@Param("eventId") Long eventId,
                             @Param("userId") Long userId,
                             @Param("reviewStatus") ReviewStatus reviewStatus,
                             @Param("deleted") Boolean deleted,
                             @Param("keyword") String keyword,
                             @Param("from") LocalDateTime from,
                             @Param("to") LocalDateTime to,
                             @Param("reviewIds") List<Long> reviewIds,
                             Pageable pageable);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("""
        update Review r
        set r.viewCount = r.viewCount + 1
        where r.reviewId = :reviewId
          and r.deleted = false
        """)
    int increaseViewCount(@Param("reviewId") Long reviewId);

    long countByEventIdAndDeletedFalseAndReviewStatus(Long eventId, ReviewStatus reviewStatus);

    @Query("""
        select avg(r.rating)
        from Review r
        where r.eventId = :eventId
          and r.deleted = false
          and r.reviewStatus = :reviewStatus
        """)
    Double findAverageRatingByEventIdAndReviewStatus(@Param("eventId") Long eventId,
                                                     @Param("reviewStatus") ReviewStatus reviewStatus);
}
