// file: src/main/java/com/popups/pupoo/gallery/dto/GalleryLikeResponse.java
package com.popups.pupoo.gallery.dto;

import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class GalleryLikeResponse {
    private Long galleryId;
    private Long userId;
    private LocalDateTime createdAt;
}
