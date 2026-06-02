// file: src/main/java/com/popups/pupoo/gallery/persistence/GalleryRepository.java
package com.popups.pupoo.gallery.persistence;

import com.popups.pupoo.gallery.domain.enums.GalleryStatus;
import com.popups.pupoo.gallery.domain.model.Gallery;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface GalleryRepository extends JpaRepository<Gallery, Long> {

	Page<Gallery> findByEventId(Long eventId, Pageable pageable);

	Page<Gallery> findByEventIdAndGalleryStatus(Long eventId, GalleryStatus galleryStatus, Pageable pageable);

    Page<Gallery> findByGalleryStatus(GalleryStatus galleryStatus, Pageable pageable);

    java.util.Optional<Gallery> findByGalleryIdAndGalleryStatus(Long galleryId, GalleryStatus galleryStatus);

    @Query(value = """
        SELECT g.*
        FROM galleries g
        JOIN event e ON e.event_id = g.event_id
        WHERE g.event_id = :eventId
          AND g.gallery_status = :status
          AND (
                :keyword is null
             OR :keyword = ''
             OR g.gallery_title LIKE CONCAT('%', :keyword, '%')
             OR g.gallery_description LIKE CONCAT('%', :keyword, '%')
             OR e.event_name LIKE CONCAT('%', :keyword, '%')
          )
        ORDER BY g.created_at DESC, g.gallery_id DESC
        """, countQuery = """
        SELECT COUNT(*)
        FROM galleries g
        JOIN event e ON e.event_id = g.event_id
        WHERE g.event_id = :eventId
          AND g.gallery_status = :status
          AND (
                :keyword is null
             OR :keyword = ''
             OR g.gallery_title LIKE CONCAT('%', :keyword, '%')
             OR g.gallery_description LIKE CONCAT('%', :keyword, '%')
             OR e.event_name LIKE CONCAT('%', :keyword, '%')
          )
        """, nativeQuery = true)
    Page<Gallery> searchByEventIdAndKeywordSortedByLatest(
            @Param("eventId") Long eventId,
            @Param("status") String status,
            @Param("keyword") String keyword,
            Pageable pageable
    );

    @Query(value = """
        SELECT g.*
        FROM galleries g
        JOIN event e ON e.event_id = g.event_id
        WHERE g.event_id = :eventId
          AND g.gallery_status = :status
          AND (
                :keyword is null
             OR :keyword = ''
             OR g.gallery_title LIKE CONCAT('%', :keyword, '%')
             OR g.gallery_description LIKE CONCAT('%', :keyword, '%')
             OR e.event_name LIKE CONCAT('%', :keyword, '%')
          )
        ORDER BY (
            SELECT COUNT(*)
            FROM gallery_likes l
            WHERE l.gallery_id = g.gallery_id
        ) DESC,
        g.created_at DESC,
        g.gallery_id DESC
        """, countQuery = """
        SELECT COUNT(*)
        FROM galleries g
        JOIN event e ON e.event_id = g.event_id
        WHERE g.event_id = :eventId
          AND g.gallery_status = :status
          AND (
                :keyword is null
             OR :keyword = ''
             OR g.gallery_title LIKE CONCAT('%', :keyword, '%')
             OR g.gallery_description LIKE CONCAT('%', :keyword, '%')
             OR e.event_name LIKE CONCAT('%', :keyword, '%')
          )
        """, nativeQuery = true)
    Page<Gallery> searchByEventIdAndKeywordSortedByLikes(
            @Param("eventId") Long eventId,
            @Param("status") String status,
            @Param("keyword") String keyword,
            Pageable pageable
    );

    @Query(value = """
        SELECT g.*
        FROM galleries g
        JOIN event e ON e.event_id = g.event_id
        WHERE g.gallery_status = :status
          AND (
                :keyword is null
             OR :keyword = ''
             OR g.gallery_title LIKE CONCAT('%', :keyword, '%')
             OR g.gallery_description LIKE CONCAT('%', :keyword, '%')
             OR e.event_name LIKE CONCAT('%', :keyword, '%')
          )
        ORDER BY g.created_at DESC, g.gallery_id DESC
        """, countQuery = """
        SELECT COUNT(*)
        FROM galleries g
        JOIN event e ON e.event_id = g.event_id
        WHERE g.gallery_status = :status
          AND (
                :keyword is null
             OR :keyword = ''
             OR g.gallery_title LIKE CONCAT('%', :keyword, '%')
             OR g.gallery_description LIKE CONCAT('%', :keyword, '%')
             OR e.event_name LIKE CONCAT('%', :keyword, '%')
          )
        """, nativeQuery = true)
    Page<Gallery> searchByKeywordSortedByLatest(
            @Param("status") String status,
            @Param("keyword") String keyword,
            Pageable pageable
    );

    @Query(value = """
        SELECT g.*
        FROM galleries g
        JOIN event e ON e.event_id = g.event_id
        WHERE g.gallery_status = :status
          AND (
                :keyword is null
             OR :keyword = ''
             OR g.gallery_title LIKE CONCAT('%', :keyword, '%')
             OR g.gallery_description LIKE CONCAT('%', :keyword, '%')
             OR e.event_name LIKE CONCAT('%', :keyword, '%')
          )
        ORDER BY (
            SELECT COUNT(*)
            FROM gallery_likes l
            WHERE l.gallery_id = g.gallery_id
        ) DESC,
        g.created_at DESC,
        g.gallery_id DESC
        """, countQuery = """
        SELECT COUNT(*)
        FROM galleries g
        JOIN event e ON e.event_id = g.event_id
        WHERE g.gallery_status = :status
          AND (
                :keyword is null
             OR :keyword = ''
             OR g.gallery_title LIKE CONCAT('%', :keyword, '%')
             OR g.gallery_description LIKE CONCAT('%', :keyword, '%')
             OR e.event_name LIKE CONCAT('%', :keyword, '%')
          )
        """, nativeQuery = true)
    Page<Gallery> searchByKeywordSortedByLikes(
            @Param("status") String status,
            @Param("keyword") String keyword,
            Pageable pageable
    );
}
