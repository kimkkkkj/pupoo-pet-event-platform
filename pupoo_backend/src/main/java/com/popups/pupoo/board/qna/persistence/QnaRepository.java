// file: src/main/java/com/popups/pupoo/board/qna/persistence/QnaRepository.java
package com.popups.pupoo.board.qna.persistence;

import com.popups.pupoo.board.post.domain.enums.PostStatus;
import com.popups.pupoo.board.post.domain.model.Post;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface QnaRepository extends JpaRepository<Post, Long> {

    @Query("""
        select p
        from Post p
        join p.board b
        where b.boardType = com.popups.pupoo.board.boardinfo.domain.enums.BoardType.QNA
          and p.deleted = false
        order by p.createdAt desc
    """)
    Page<Post> findAllQna(Pageable pageable);

    @Query("""
        select p
        from Post p
        join p.board b
        where b.boardType = com.popups.pupoo.board.boardinfo.domain.enums.BoardType.QNA
          and p.deleted = false
          and p.postId = :postId
    """)
    Optional<Post> findQnaById(@Param("postId") Long postId);


    /** 공개 목록: PUBLISHED + HIDDEN(숨김·마감 등). HIDDEN은 응답에서 마스킹 처리. */
    @Query("""
        select p
        from Post p
        join p.board b
        where b.boardType = com.popups.pupoo.board.boardinfo.domain.enums.BoardType.QNA
          and p.deleted = false
          and p.status in :statuses
        order by p.createdAt desc
    """)
    Page<Post> findAllQnaVisible(@Param("statuses") List<PostStatus> statuses, Pageable pageable);

    @Query("""
        select p
        from Post p
        join p.board b
        where b.boardType = com.popups.pupoo.board.boardinfo.domain.enums.BoardType.QNA
          and p.deleted = false
          and p.status in :statuses
          and (:answeredOnly is null or ((:answeredOnly = true and p.answeredAt is not null) or (:answeredOnly = false and p.answeredAt is null)))
        order by p.createdAt desc
    """)
    Page<Post> findAllQnaVisibleWithAnsweredFilter(@Param("statuses") List<PostStatus> statuses,
                                                   @Param("answeredOnly") Boolean answeredOnly,
                                                   Pageable pageable);

    @Query("""
        select p
        from Post p
        join p.board b
        where b.boardType = com.popups.pupoo.board.boardinfo.domain.enums.BoardType.QNA
          and p.deleted = false
          and p.status in :statuses
          and (:answeredOnly is null or ((:answeredOnly = true and p.answeredAt is not null) or (:answeredOnly = false and p.answeredAt is null)))
          and (
                :keyword is null
             or :keyword = ''
             or p.postTitle like concat('%', :keyword, '%')
             or p.content like concat('%', :keyword, '%')
             or p.answerContent like concat('%', :keyword, '%')
          )
        order by p.createdAt desc
    """)
    Page<Post> searchAllQnaVisibleRecent(
            @Param("statuses") List<PostStatus> statuses,
            @Param("answeredOnly") Boolean answeredOnly,
            @Param("keyword") String keyword,
            Pageable pageable
    );

    @Query("""
        select p
        from Post p
        join p.board b
        where b.boardType = com.popups.pupoo.board.boardinfo.domain.enums.BoardType.QNA
          and p.deleted = false
          and p.status in :statuses
          and (:answeredOnly is null or ((:answeredOnly = true and p.answeredAt is not null) or (:answeredOnly = false and p.answeredAt is null)))
          and (
                :keyword is null
             or :keyword = ''
             or p.postTitle like concat('%', :keyword, '%')
             or p.content like concat('%', :keyword, '%')
             or p.answerContent like concat('%', :keyword, '%')
          )
        order by p.viewCount desc, p.createdAt desc
    """)
    Page<Post> searchAllQnaVisibleViews(
            @Param("statuses") List<PostStatus> statuses,
            @Param("answeredOnly") Boolean answeredOnly,
            @Param("keyword") String keyword,
            Pageable pageable
    );

    @Query("""
        select p
        from Post p
        join p.board b
        where b.boardType = com.popups.pupoo.board.boardinfo.domain.enums.BoardType.QNA
          and p.deleted = false
          and p.status in :statuses
          and (:answeredOnly is null or ((:answeredOnly = true and p.answeredAt is not null) or (:answeredOnly = false and p.answeredAt is null)))
          and (
                :keyword is null
             or :keyword = ''
             or p.postTitle like concat('%', :keyword, '%')
             or p.content like concat('%', :keyword, '%')
             or p.answerContent like concat('%', :keyword, '%')
          )
        order by p.createdAt asc
    """)
    Page<Post> searchAllQnaVisibleOldest(
            @Param("statuses") List<PostStatus> statuses,
            @Param("answeredOnly") Boolean answeredOnly,
            @Param("keyword") String keyword,
            Pageable pageable
    );

    @Query("""
        select p
        from Post p
        join p.board b
        where b.boardType = com.popups.pupoo.board.boardinfo.domain.enums.BoardType.QNA
          and p.deleted = false
          and p.status = :status
          and p.postId = :postId
    """)
    Optional<Post> findQnaPublishedById(@Param("postId") Long postId, @Param("status") PostStatus status);

}
