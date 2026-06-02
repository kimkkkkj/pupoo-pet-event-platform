// file: src/main/java/com/popups/pupoo/storage/dto/FileResponse.java
package com.popups.pupoo.storage.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class FileResponse {

    private Long fileId;
    private String originalName;
    private String publicPath;
    public static FileResponse of(Long fileId, String originalName, String publicPath) {
        return new FileResponse(fileId, originalName, publicPath);
    }
}
