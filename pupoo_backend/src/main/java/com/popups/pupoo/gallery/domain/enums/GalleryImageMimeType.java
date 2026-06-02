// file: src/main/java/com/popups/pupoo/gallery/domain/enums/GalleryImageMimeType.java
package com.popups.pupoo.gallery.domain.enums;

/**
 * 갤러리 이미지 MIME 타입 (DB gallery_images.mime_type ENUM과 일치 - 소문자 저장)
 */
public enum GalleryImageMimeType {
    jpeg,
    jpg,
    png,
    gif,
    webp,
    tiff,
    svg
}
