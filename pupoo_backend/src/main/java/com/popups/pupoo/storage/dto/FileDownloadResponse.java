// file: src/main/java/com/popups/pupoo/storage/dto/FileDownloadResponse.java
package com.popups.pupoo.storage.dto;

/**
 * 파일 다운로드 정보 응답 DTO.
 * - presigned url을 내려주는 방식에서 사용한다.
 */
public class FileDownloadResponse {

    public String fileName;
    public String contentType;
    public Long size;
    public String downloadUrl;
}
