// file: src/main/java/com/popups/pupoo/gallery/persistence/GalleryImageRepository.java
package com.popups.pupoo.gallery.persistence;

import com.popups.pupoo.gallery.domain.model.GalleryImage;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface GalleryImageRepository extends JpaRepository<GalleryImage, Long> {
    List<GalleryImage> findAllByGallery_GalleryIdOrderByImageOrderAsc(Long galleryId);
}
