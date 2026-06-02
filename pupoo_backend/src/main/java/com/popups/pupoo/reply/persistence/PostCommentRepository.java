// file: src/main/java/com/popups/pupoo/reply/persistence/PostCommentRepository.java
package com.popups.pupoo.reply.persistence;

import com.popups.pupoo.reply.domain.model.PostComment;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface PostCommentRepository extends JpaRepository<PostComment, Long> {

    Page<PostComment> findAllByPostIdAndDeletedFalseOrderByCreatedAtDesc(Long postId, Pageable pageable);

    Optional<PostComment> findByCommentIdAndDeletedFalse(Long commentId);

    /**
     * 관리자 모더레이션 큐(게시글 댓글) 조회.
     */
    @Query("""
        select c
        from PostComment c
        where (:postId is null or c.postId = :postId)
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
    Page<PostComment> adminSearch(@Param("postId") Long postId,
                                 @Param("userId") Long userId,
                                 @Param("deleted") Boolean deleted,
                                 @Param("keyword") String keyword,
                                 @Param("from") LocalDateTime from,
                                 @Param("to") LocalDateTime to,
                                 @Param("commentIds") List<Long> commentIds,
                                 Pageable pageable);

    @Query("""
        select c.postId, count(c)
        from PostComment c
        where c.deleted = false
          and c.postId in :postIds
        group by c.postId
        """)
    List<Object[]> countByPostIds(@Param("postIds") List<Long> postIds);
}
