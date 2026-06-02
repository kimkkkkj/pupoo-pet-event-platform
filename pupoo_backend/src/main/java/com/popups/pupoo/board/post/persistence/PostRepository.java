// file: src/main/java/com/popups/pupoo/board/post/persistence/PostRepository.java
package com.popups.pupoo.board.post.persistence;

import com.popups.pupoo.board.post.domain.enums.PostStatus;
import com.popups.pupoo.board.post.domain.model.Post;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface PostRepository extends JpaRepository<Post, Long> {

    @Query("""
        select p
        from Post p
        where p.board.boardId = :boardId
          and p.deleted = false
          and (:keyword is null or :keyword = '' or p.postTitle like concat('%', :keyword, '%'))
          and (:status is null or p.status = :status)
        """)
    Page<Post> searchByTitle(@Param("boardId") Long boardId,
                             @Param("keyword") String keyword,
                             @Param("status") PostStatus status,
                             Pageable pageable);

    @Query("""
        select p
        from Post p
        where p.board.boardId = :boardId
          and p.deleted = false
          and (:keyword is null or :keyword = '' or p.content like concat('%', :keyword, '%'))
          and (:status is null or p.status = :status)
        """)
    Page<Post> searchByContent(@Param("boardId") Long boardId,
                               @Param("keyword") String keyword,
                               @Param("status") PostStatus status,
                               Pageable pageable);

    @Query("""
        select p
        from Post p
        where p.board.boardId = :boardId
          and p.deleted = false
          and (:writerId is null or p.userId = :writerId)
          and (:status is null or p.status = :status)
        """)
    Page<Post> searchByWriter(@Param("boardId") Long boardId,
                              @Param("writerId") Long writerId,
                              @Param("status") PostStatus status,
                              Pageable pageable);

    @Query("""
        select p
        from Post p
        where p.board.boardId = :boardId
          and p.deleted = false
          and (
                :keyword is null
             or :keyword = ''
             or p.postTitle like concat('%', :keyword, '%')
             or p.content like concat('%', :keyword, '%')
          )
          and (:status is null or p.status = :status)
        """)
    Page<Post> search(@Param("boardId") Long boardId,
                      @Param("keyword") String keyword,
                      @Param("status") PostStatus status,
                      Pageable pageable);

    /**
     * 댓글 수 기준(삭제되지 않은 댓글) 내림차순 정렬 + 페이징.
     * - Free/Info 게시판 목록에서 `commentCount` 기반 정렬이 필요할 때 사용.
     * - ORDER BY에 correlated subquery를 사용해 전체 데이터 기준 정렬을 보장한다.
     */
    @Query(value = """
        SELECT p.*
        FROM posts p
        WHERE p.board_id = :boardId
          AND p.is_deleted = 0
          AND p.status = :status
          AND (
            :keyword is null
            OR :keyword = ''
            OR p.post_title LIKE CONCAT('%', :keyword, '%')
            OR p.content LIKE CONCAT('%', :keyword, '%')
          )
        ORDER BY (
            SELECT COUNT(*)
            FROM post_comments c
            WHERE c.post_id = p.post_id
              AND c.is_deleted = 0
        ) DESC,
        p.created_at DESC
        """, countQuery = """
        SELECT COUNT(*)
        FROM posts p
        WHERE p.board_id = :boardId
          AND p.is_deleted = 0
          AND p.status = :status
          AND (
            :keyword is null
            OR :keyword = ''
            OR p.post_title LIKE CONCAT('%', :keyword, '%')
            OR p.content LIKE CONCAT('%', :keyword, '%')
          )
        """, nativeQuery = true)
    Page<Post> searchByTitleContentSortedByCommentCount(
            @Param("boardId") Long boardId,
            @Param("keyword") String keyword,
            @Param("status") String status,
            Pageable pageable
    );

    @Query(value = """
        SELECT p.*
        FROM posts p
        WHERE p.board_id = :boardId
          AND p.is_deleted = 0
          AND p.status = :status
          AND (
            :keyword is null
            OR :keyword = ''
            OR p.post_title LIKE CONCAT('%', :keyword, '%')
          )
        ORDER BY (
            SELECT COUNT(*)
            FROM post_comments c
            WHERE c.post_id = p.post_id
              AND c.is_deleted = 0
        ) DESC,
        p.created_at DESC
        """, countQuery = """
        SELECT COUNT(*)
        FROM posts p
        WHERE p.board_id = :boardId
          AND p.is_deleted = 0
          AND p.status = :status
          AND (
            :keyword is null
            OR :keyword = ''
            OR p.post_title LIKE CONCAT('%', :keyword, '%')
          )
        """, nativeQuery = true)
    Page<Post> searchByTitleSortedByCommentCount(
            @Param("boardId") Long boardId,
            @Param("keyword") String keyword,
            @Param("status") String status,
            Pageable pageable
    );

    @Query(value = """
        SELECT p.*
        FROM posts p
        WHERE p.board_id = :boardId
          AND p.is_deleted = 0
          AND p.status = :status
          AND (
            :keyword is null
            OR :keyword = ''
            OR p.content LIKE CONCAT('%', :keyword, '%')
          )
        ORDER BY (
            SELECT COUNT(*)
            FROM post_comments c
            WHERE c.post_id = p.post_id
              AND c.is_deleted = 0
        ) DESC,
        p.created_at DESC
        """, countQuery = """
        SELECT COUNT(*)
        FROM posts p
        WHERE p.board_id = :boardId
          AND p.is_deleted = 0
          AND p.status = :status
          AND (
            :keyword is null
            OR :keyword = ''
            OR p.content LIKE CONCAT('%', :keyword, '%')
          )
        """, nativeQuery = true)
    Page<Post> searchByContentSortedByCommentCount(
            @Param("boardId") Long boardId,
            @Param("keyword") String keyword,
            @Param("status") String status,
            Pageable pageable
    );

    @Query(value = """
        SELECT p.*
        FROM posts p
        WHERE p.board_id = :boardId
          AND p.is_deleted = 0
          AND p.status = :status
          AND p.user_id = :writerId
        ORDER BY (
            SELECT COUNT(*)
            FROM post_comments c
            WHERE c.post_id = p.post_id
              AND c.is_deleted = 0
        ) DESC,
        p.created_at DESC
        """, countQuery = """
        SELECT COUNT(*)
        FROM posts p
        WHERE p.board_id = :boardId
          AND p.is_deleted = 0
          AND p.status = :status
          AND p.user_id = :writerId
        """, nativeQuery = true)
    Page<Post> searchByWriterSortedByCommentCount(
            @Param("boardId") Long boardId,
            @Param("writerId") Long writerId,
            @Param("status") String status,
            Pageable pageable
    );

    Optional<Post> findByPostIdAndDeletedFalse(Long postId);

    @Query("""
        select p
          from Post p
          join fetch p.board b
         where p.postId in :postIds
    """)
    List<Post> findAllWithBoardByPostIdIn(@Param("postIds") List<Long> postIds);

    Optional<Post> findByPostIdAndUserIdAndDeletedFalse(Long postId, Long userId);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("""
        update Post p
        set p.viewCount = p.viewCount + 1
        where p.postId = :postId
          and p.deleted = false
        """)
    int increaseViewCount(@Param("postId") Long postId);

    @Query(value = "SELECT view_count FROM posts WHERE post_id = :postId AND is_deleted = 0", nativeQuery = true)
    int getViewCountByPostId(@Param("postId") Long postId);

    /**
     * 관리자 모더레이션 큐 조회용: 삭제/숨김 포함 검색.
     */
    @Query("""
        select p
        from Post p
        where (:boardId is null or p.board.boardId = :boardId)
          and (:postIds is null or p.postId in :postIds)
          and (:userId is null or p.userId = :userId)
          and (:deleted is null or p.deleted = :deleted)
          and (:status is null or p.status = :status)
          and (
                :keyword is null
             or :keyword = ''
             or p.postTitle like concat('%', :keyword, '%')
             or p.content like concat('%', :keyword, '%')
          )
          and (:from is null or p.createdAt >= :from)
          and (:to is null or p.createdAt <= :to)
        """)
    Page<Post> adminSearch(@Param("boardId") Long boardId,
                           @Param("keyword") String keyword,
                           @Param("status") PostStatus status,
                           @Param("deleted") Boolean deleted,
                           @Param("userId") Long userId,
                           @Param("from") LocalDateTime from,
                           @Param("to") LocalDateTime to,
                           @Param("postIds") List<Long> postIds,
                           Pageable pageable);
}
