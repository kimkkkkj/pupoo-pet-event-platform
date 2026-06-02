// file: src/main/java/com/popups/pupoo/gallery/domain/model/GalleryImage.java
package com.popups.pupoo.gallery.domain.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "gallery_images")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Builder(toBuilder = true)
public class GalleryImage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "image_id", nullable = false)
    private Long imageId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "gallery_id", nullable = false)
    private Gallery gallery;

    // TODO(step-01-storage-policy): keep the legacy column name for now, but store a storage key instead of a full URL.
    @Column(name = "original_url", nullable = false, length = 500)
    private String originalUrl;

    // TODO(step-01-storage-policy): thumbnails should also store storage keys when thumb generation is introduced.
    @Column(name = "thumb_url", length = 500)
    private String thumbUrl;

    @Column(name = "image_order")
    private Integer imageOrder;

    @Column(name = "mime_type", columnDefinition = "ENUM('jpeg','jpg','png','gif','webp','tiff','svg')")
    private String mimeType;

    @Column(name = "file_size")
    private Integer fileSize;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    public Long getGalleryId() {
        return gallery == null ? null : gallery.getGalleryId();
    }
}
