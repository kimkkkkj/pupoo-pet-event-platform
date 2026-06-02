// file: src/main/java/com/popups/pupoo/gallery/dto/GalleryImageCreateRequest.java
package com.popups.pupoo.gallery.dto;

import com.popups.pupoo.gallery.domain.enums.GalleryImageMimeType;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class GalleryImageCreateRequest {

    private String originalUrl;
    private String thumbUrl;
    private Integer imageOrder;
    private GalleryImageMimeType mimeType;
    private Integer fileSize;

    public String getOriginalUrl() { return originalUrl; }
    public String getThumbUrl() { return thumbUrl; }
    public Integer getImageOrder() { return imageOrder; }
    public GalleryImageMimeType getMimeType() { return mimeType; }
    public Integer getFileSize() { return fileSize; }

    public void setOriginalUrl(String originalUrl) { this.originalUrl = originalUrl; }
    public void setThumbUrl(String thumbUrl) { this.thumbUrl = thumbUrl; }
    public void setImageOrder(Integer imageOrder) { this.imageOrder = imageOrder; }
    public void setMimeType(GalleryImageMimeType mimeType) { this.mimeType = mimeType; }
    public void setFileSize(Integer fileSize) { this.fileSize = fileSize; }
}
