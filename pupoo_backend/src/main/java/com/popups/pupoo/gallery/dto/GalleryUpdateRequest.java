// file: src/main/java/com/popups/pupoo/gallery/dto/GalleryUpdateRequest.java
package com.popups.pupoo.gallery.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;

@Getter
public class GalleryUpdateRequest {

    @NotBlank
    private String title;

    private String description;
}
