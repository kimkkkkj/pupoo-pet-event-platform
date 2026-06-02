// file: src/main/java/com/popups/pupoo/gallery/application/GalleryAdminService.java
package com.popups.pupoo.gallery.application;

import com.popups.pupoo.common.audit.application.AdminLogService;
import com.popups.pupoo.common.audit.domain.enums.AdminTargetType;
import com.popups.pupoo.common.exception.BusinessException;
import com.popups.pupoo.common.exception.ErrorCode;
import com.popups.pupoo.gallery.domain.enums.GalleryStatus;
import com.popups.pupoo.gallery.domain.model.Gallery;
import com.popups.pupoo.gallery.domain.model.GalleryImage;
import com.popups.pupoo.gallery.dto.GalleryCreateRequest;
import com.popups.pupoo.gallery.dto.GalleryResponse;
import com.popups.pupoo.gallery.dto.GalleryUpdateRequest;
import com.popups.pupoo.gallery.persistence.GalleryImageRepository;
import com.popups.pupoo.gallery.persistence.GalleryRepository;
import com.popups.pupoo.storage.support.StorageKeyNormalizer;
import com.popups.pupoo.storage.support.StorageUrlResolver;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class GalleryAdminService {

    private final GalleryRepository galleryRepository;
    private final GalleryImageRepository galleryImageRepository;
    private final AdminLogService adminLogService;
    private final StorageKeyNormalizer storageKeyNormalizer;
    private final StorageUrlResolver storageUrlResolver;

    public Page<GalleryResponse> list(int page, int size, GalleryStatus status) {
        Page<Gallery> source = (status == null)
                ? galleryRepository.findAll(PageRequest.of(page, size))
                : galleryRepository.findByGalleryStatus(status, PageRequest.of(page, size));

        return source.map(this::toResponse);
    }

    @Transactional
    public GalleryResponse create(Long adminUserId, GalleryCreateRequest request) {
        Gallery gallery = Gallery.builder()
                .eventId(request.getEventId())
                .userId(adminUserId)
                .galleryTitle(request.getTitle())
                .description(request.getDescription())
                .viewCount(0)
                .thumbnailImageId(null)
                .galleryStatus(GalleryStatus.PUBLIC)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        Gallery saved = galleryRepository.save(gallery);
        adminLogService.write("GALLERY_CREATE", AdminTargetType.GALLERY, saved.getGalleryId());

        Gallery updated = saveImages(saved, normalizeImageKeys(request.getImageUrls()));
        return toResponse(updated);
    }

    @Transactional
    public GalleryResponse createByUser(Long userId, GalleryCreateRequest request) {
        Gallery gallery = Gallery.builder()
                .eventId(request.getEventId())
                .userId(userId)
                .galleryTitle(request.getTitle())
                .description(request.getDescription())
                .viewCount(0)
                .thumbnailImageId(null)
                .galleryStatus(GalleryStatus.PUBLIC)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        Gallery saved = galleryRepository.save(gallery);
        Gallery updated = saveImages(saved, normalizeImageKeys(request.getImageUrls()));
        return toResponse(updated);
    }

    @Transactional
    public GalleryResponse update(Long galleryId, GalleryUpdateRequest request) {
        Gallery gallery = galleryRepository.findById(galleryId)
                .orElseThrow(() -> new IllegalArgumentException("갤러리가 존재하지 않습니다."));

        Gallery updated = galleryRepository.save(gallery.toBuilder()
                .galleryTitle(request.getTitle())
                .description(request.getDescription())
                .updatedAt(LocalDateTime.now())
                .build());

        adminLogService.write("GALLERY_UPDATE", AdminTargetType.GALLERY, galleryId);
        return toResponse(updated);
    }

    @Transactional
    public GalleryResponse updateByAuthorOrAdmin(
            Long galleryId,
            GalleryUpdateRequest request,
            Long currentUserId,
            boolean isAdmin
    ) {
        Gallery gallery = galleryRepository.findById(galleryId)
                .orElseThrow(() -> new IllegalArgumentException("갤러리가 존재하지 않습니다."));

        if (!isAdmin && (gallery.getUserId() == null || !gallery.getUserId().equals(currentUserId))) {
            throw new BusinessException(ErrorCode.FORBIDDEN, "수정 권한이 없습니다.");
        }

        Gallery updated = galleryRepository.save(gallery.toBuilder()
                .galleryTitle(request.getTitle())
                .description(request.getDescription())
                .updatedAt(LocalDateTime.now())
                .build());

        if (isAdmin) {
            adminLogService.write("GALLERY_UPDATE", AdminTargetType.GALLERY, galleryId);
        }

        return toResponse(updated);
    }

    @Transactional
    public void delete(Long galleryId) {
        Gallery gallery = galleryRepository.findById(galleryId)
                .orElseThrow(() -> new IllegalArgumentException("갤러리가 존재하지 않습니다."));

        galleryRepository.save(gallery.toBuilder()
                .galleryStatus(GalleryStatus.DELETED)
                .updatedAt(LocalDateTime.now())
                .build());
        adminLogService.write("GALLERY_DELETE", AdminTargetType.GALLERY, galleryId);
    }

    @Transactional
    public void deleteByAuthorOrAdmin(Long galleryId, Long currentUserId, boolean isAdmin) {
        Gallery gallery = galleryRepository.findById(galleryId)
                .orElseThrow(() -> new IllegalArgumentException("갤러리가 존재하지 않습니다."));

        if (!isAdmin && (gallery.getUserId() == null || !gallery.getUserId().equals(currentUserId))) {
            throw new BusinessException(ErrorCode.FORBIDDEN, "삭제 권한이 없습니다.");
        }

        galleryRepository.save(gallery.toBuilder()
                .galleryStatus(GalleryStatus.DELETED)
                .updatedAt(LocalDateTime.now())
                .build());

        if (isAdmin) {
            adminLogService.write("GALLERY_DELETE", AdminTargetType.GALLERY, galleryId);
        }
    }

    private Gallery saveImages(Gallery gallery, List<String> imageKeys) {
        int order = 1;
        Long firstImageId = null;

        for (String imageKey : imageKeys) {
            GalleryImage image = GalleryImage.builder()
                    .gallery(gallery)
                    .originalUrl(imageKey)
                    .thumbUrl(null)
                    .imageOrder(order++)
                    .mimeType(null)
                    .fileSize(null)
                    .createdAt(LocalDateTime.now())
                    .build();
            GalleryImage savedImage = galleryImageRepository.save(image);
            if (firstImageId == null) {
                firstImageId = savedImage.getImageId();
            }
        }

        if (firstImageId == null) {
            return gallery;
        }

        return galleryRepository.save(gallery.toBuilder()
                .thumbnailImageId(firstImageId)
                .updatedAt(LocalDateTime.now())
                .build());
    }

    private List<String> normalizeImageKeys(List<String> imageUrls) {
        if (imageUrls == null || imageUrls.isEmpty()) {
            return List.of();
        }
        return imageUrls.stream()
                .map(storageKeyNormalizer::normalizeToKey)
                .filter(StringUtils::hasText)
                .toList();
    }

    private GalleryResponse toResponse(Gallery gallery) {
        List<String> imageUrls = storageUrlResolver.toPublicUrls(
                galleryImageRepository.findAllByGallery_GalleryIdOrderByImageOrderAsc(gallery.getGalleryId())
                        .stream()
                        .map(GalleryImage::getOriginalUrl)
                        .toList()
        );

        return GalleryResponse.builder()
                .galleryId(gallery.getGalleryId())
                .eventId(gallery.getEventId())
                .userId(gallery.getUserId())
                .title(gallery.getGalleryTitle())
                .description(gallery.getDescription())
                .viewCount(gallery.getViewCount())
                .thumbnailImageId(gallery.getThumbnailImageId())
                .status(gallery.getGalleryStatus())
                .imageUrls(imageUrls)
                .createdAt(gallery.getCreatedAt())
                .updatedAt(gallery.getUpdatedAt())
                .build();
    }
}
