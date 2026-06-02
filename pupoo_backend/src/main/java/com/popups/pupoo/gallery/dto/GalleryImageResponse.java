// file: src/main/java/com/popups/pupoo/gallery/dto/GalleryImageResponse.java
package com.popups.pupoo.gallery.dto;

import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class GalleryImageResponse {

    private Long imageId;
    private Long galleryId;

    private String originalUrl;
    private String thumbUrl;

    private Integer imageOrder;
    private String mimeType;

    private Integer fileSize;
    private LocalDateTime createdAt;
}
