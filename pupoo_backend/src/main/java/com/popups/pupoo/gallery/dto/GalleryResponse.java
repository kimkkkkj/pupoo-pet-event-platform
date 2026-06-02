// file: src/main/java/com/popups/pupoo/gallery/dto/GalleryResponse.java
package com.popups.pupoo.gallery.dto;

import java.time.LocalDateTime;
import java.util.List;

import com.popups.pupoo.gallery.domain.enums.GalleryStatus;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class GalleryResponse {

    private Long galleryId;
    private Long eventId;
    private Long userId;

    private String title;
    private String description;

    private Integer viewCount;
    private Long likeCount;
    private Long thumbnailImageId;

    private GalleryStatus status;

    private List<String> imageUrls;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
