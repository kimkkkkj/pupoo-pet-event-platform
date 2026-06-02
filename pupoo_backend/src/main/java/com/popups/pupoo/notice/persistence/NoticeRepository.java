// file: src/main/java/com/popups/pupoo/notice/persistence/NoticeRepository.java
package com.popups.pupoo.notice.persistence;

import com.popups.pupoo.notice.domain.model.Notice;
import com.popups.pupoo.notice.domain.enums.NoticeStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface NoticeRepository extends JpaRepository<Notice, Long> {

    long countByStatus(NoticeStatus status);

    // 공개 조회: PUBLISHED 상태 공지만 조회
    Page<Notice> findByStatus(NoticeStatus status, Pageable pageable);

    @Query("""
        select n from Notice n
        where n.status = :status
          and (:scope is null or n.scope = :scope)
          and (:pinned is null or n.pinned = :pinned)
        order by n.pinned desc, n.createdAt desc, n.noticeId desc
        """)
    Page<Notice> findByStatusWithScopeAndPinned(@Param("status") NoticeStatus status,
                                               @Param("scope") String scope,
                                               @Param("pinned") Boolean pinned,
                                               Pageable pageable);

    @Query("""
        select n from Notice n
        where n.status = :status
          and (:scope is null or n.scope = :scope)
          and (:pinned is null or n.pinned = :pinned)
          and (:keyword is null or :keyword = '' or n.noticeTitle like concat('%', :keyword, '%') or n.content like concat('%', :keyword, '%'))
        order by n.pinned desc, n.createdAt desc, n.noticeId desc
        """)
    Page<Notice> searchByTitleOrContentWithScopeAndPinned(@Param("status") NoticeStatus status,
                                                          @Param("keyword") String keyword,
                                                          @Param("scope") String scope,
                                                          @Param("pinned") Boolean pinned,
                                                          Pageable pageable);

    Page<Notice> findByStatusAndCreatedByAdminId(NoticeStatus status, Long createdByAdminId, Pageable pageable);

    @Query("""
        select n
        from Notice n
        where n.status = :status
          and (:keyword is null or :keyword = '' or n.noticeTitle like concat('%', :keyword, '%'))
        order by n.pinned desc, n.createdAt desc, n.noticeId desc
        """)
    Page<Notice> searchByTitle(@Param("status") NoticeStatus status,
                              @Param("keyword") String keyword,
                              Pageable pageable);

    @Query("""
        select n
        from Notice n
        where n.status = :status
          and (:keyword is null or :keyword = '' or n.content like concat('%', :keyword, '%'))
        order by n.pinned desc, n.createdAt desc, n.noticeId desc
        """)
    Page<Notice> searchByContent(@Param("status") NoticeStatus status,
                                @Param("keyword") String keyword,
                                Pageable pageable);

    @Query("""
        select n
        from Notice n
        where n.status = :status
          and (
                :keyword is null
             or :keyword = ''
             or n.noticeTitle like concat('%', :keyword, '%')
             or n.content like concat('%', :keyword, '%')
          )
        order by n.pinned desc, n.createdAt desc, n.noticeId desc
        """)
    Page<Notice> searchByTitleOrContent(@Param("status") NoticeStatus status,
                                       @Param("keyword") String keyword,
                                       Pageable pageable);

    /**
     * 공지 목록: 고정(is_pinned=1)은 항상 포함, 비고정(is_pinned=0)만 scope/keyword 필터 적용.
     * scope는 대소문자 무시 비교. 정렬은 Service에서 Pageable로 전달 (pinned desc + sort).
     */
    @Query("""
        select n from Notice n
        where n.status = :status
          and (n.pinned = true or (
            n.pinned = false
            and (:scope is null or LOWER(n.scope) = LOWER(:scope))
            and ((:keyword is null or :keyword = '') or (n.noticeTitle like concat('%', :keyword, '%') or n.content like concat('%', :keyword, '%')))
          ))
        """)
    Page<Notice> findPublishedPinnedFirstFilterNonPinnedOnly(
            @Param("status") NoticeStatus status,
            @Param("scope") String scope,
            @Param("keyword") String keyword,
            Pageable pageable);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("""
        update Notice n
        set n.viewCount = n.viewCount + 1
        where n.noticeId = :noticeId
        """)
    int increaseViewCount(@Param("noticeId") Long noticeId);

    @Query("""
        select n
        from Notice n
        where (:status is null or n.status = :status)
          and (:scope is null or lower(n.scope) = lower(:scope))
          and (:pinned is null or n.pinned = :pinned)
          and (
                :keyword is null
             or :keyword = ''
             or n.noticeTitle like concat('%', :keyword, '%')
             or n.content like concat('%', :keyword, '%')
          )
        order by n.pinned desc, n.createdAt desc, n.noticeId desc
        """)
    Page<Notice> searchAdmin(@Param("status") NoticeStatus status,
                             @Param("keyword") String keyword,
                             @Param("scope") String scope,
                             @Param("pinned") Boolean pinned,
                             Pageable pageable);

}
