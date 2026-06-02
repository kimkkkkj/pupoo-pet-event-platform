// file: src/main/java/com/popups/pupoo/gallery/application/GalleryService.java
package com.popups.pupoo.gallery.application;

import com.popups.pupoo.gallery.domain.enums.GalleryStatus;
import com.popups.pupoo.gallery.domain.model.Gallery;
import com.popups.pupoo.gallery.domain.model.GalleryImage;
import com.popups.pupoo.gallery.domain.model.GalleryLike;
import com.popups.pupoo.gallery.dto.GalleryLikeResponse;
import com.popups.pupoo.gallery.dto.GalleryResponse;
import com.popups.pupoo.gallery.persistence.GalleryImageRepository;
import com.popups.pupoo.gallery.persistence.GalleryLikeRepository;
import com.popups.pupoo.gallery.persistence.GalleryRepository;
import com.popups.pupoo.storage.support.StorageUrlResolver;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class GalleryService {

    private final GalleryRepository galleryRepository;
    private final GalleryImageRepository galleryImageRepository;
    private final GalleryLikeRepository galleryLikeRepository;
    private final StorageUrlResolver storageUrlResolver;

    @Transactional
    public GalleryResponse get(Long galleryId) {
        Gallery gallery = galleryRepository.findByGalleryIdAndGalleryStatus(galleryId, GalleryStatus.PUBLIC)
                .orElseThrow(() -> new IllegalArgumentException("갤러리가 존재하지 않습니다."));

        Gallery updated = galleryRepository.save(gallery.toBuilder()
                .viewCount(gallery.getViewCount() == null ? 1 : gallery.getViewCount() + 1)
                .updatedAt(LocalDateTime.now())
                .build());

        return toResponse(updated);
    }

    public Page<GalleryResponse> list(int page, int size) {
        return galleryRepository.findByGalleryStatus(GalleryStatus.PUBLIC, PageRequest.of(page, size))
                .map(this::toResponse);
    }

    public Page<GalleryResponse> listByEventId(Long eventId, int page, int size) {
        return galleryRepository.findByEventIdAndGalleryStatus(eventId, GalleryStatus.PUBLIC, PageRequest.of(page, size))
                .map(this::toResponse);
    }

    public Page<GalleryResponse> list(int page, int size, String sortOption, String keyword) {
        PageRequest pageable = PageRequest.of(page, size);
        String sk = sortOption == null ? "latest" : sortOption.trim().toLowerCase();
        String kw = (keyword == null || keyword.isBlank()) ? null : keyword;
        String status = GalleryStatus.PUBLIC.name();

        Page<Gallery> res = "likes".equals(sk)
                ? galleryRepository.searchByKeywordSortedByLikes(status, kw, pageable)
                : galleryRepository.searchByKeywordSortedByLatest(status, kw, pageable);
        return res.map(this::toResponse);
    }

    public Page<GalleryResponse> listByEventId(Long eventId, int page, int size, String sortOption, String keyword) {
        PageRequest pageable = PageRequest.of(page, size);
        String sk = sortOption == null ? "latest" : sortOption.trim().toLowerCase();
        String kw = (keyword == null || keyword.isBlank()) ? null : keyword;
        String status = GalleryStatus.PUBLIC.name();

        Page<Gallery> res = "likes".equals(sk)
                ? galleryRepository.searchByEventIdAndKeywordSortedByLikes(eventId, status, kw, pageable)
                : galleryRepository.searchByEventIdAndKeywordSortedByLatest(eventId, status, kw, pageable);
        return res.map(this::toResponse);
    }

    @Transactional
    public GalleryLikeResponse like(Long userId, Long galleryId) {
        Gallery gallery = galleryRepository.findByGalleryIdAndGalleryStatus(galleryId, GalleryStatus.PUBLIC)
                .orElseThrow(() -> new IllegalArgumentException("갤러리가 존재하지 않습니다."));

        GalleryLike like = galleryLikeRepository.findByGallery_GalleryIdAndUserId(galleryId, userId)
                .orElseGet(() -> galleryLikeRepository.save(
                        GalleryLike.builder()
                                .gallery(gallery)
                                .userId(userId)
                                .createdAt(LocalDateTime.now())
                                .build()
                ));

        return GalleryLikeResponse.builder()
                .galleryId(galleryId)
                .userId(userId)
                .createdAt(like.getCreatedAt())
                .build();
    }

    @Transactional
    public void unlike(Long userId, Long galleryId) {
        galleryRepository.findByGalleryIdAndGalleryStatus(galleryId, GalleryStatus.PUBLIC)
                .orElseThrow(() -> new IllegalArgumentException("갤러리가 존재하지 않습니다."));
        galleryLikeRepository.deleteByGallery_GalleryIdAndUserId(galleryId, userId);
    }

    private GalleryResponse toResponse(Gallery gallery) {
        List<String> imageUrls = storageUrlResolver.toPublicUrls(
                galleryImageRepository.findAllByGallery_GalleryIdOrderByImageOrderAsc(gallery.getGalleryId())
                        .stream()
                        .map(GalleryImage::getOriginalUrl)
                        .toList()
        );
        long likeCount = galleryLikeRepository.countByGallery_GalleryId(gallery.getGalleryId());

        return GalleryResponse.builder()
                .galleryId(gallery.getGalleryId())
                .eventId(gallery.getEventId())
                .userId(gallery.getUserId())
                .title(gallery.getGalleryTitle())
                .description(gallery.getDescription())
                .viewCount(gallery.getViewCount())
                .likeCount(likeCount)
                .thumbnailImageId(gallery.getThumbnailImageId())
                .status(gallery.getGalleryStatus())
                .imageUrls(imageUrls)
                .createdAt(gallery.getCreatedAt())
                .updatedAt(gallery.getUpdatedAt())
                .build();
    }
}
