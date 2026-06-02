// file: src/main/java/com/popups/pupoo/storage/dto/UploadResponse.java
package com.popups.pupoo.storage.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class UploadResponse {

    private Long fileId;
    private String originalName;
    private String storedName;
    private String publicPath; // Final public URL resolved by the backend from the stored key.

    public static UploadResponse of(Long fileId, String originalName, String storedName, String publicPath) {
        return new UploadResponse(fileId, originalName, storedName, publicPath);
    }
}
