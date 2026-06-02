// file: src/main/java/com/popups/pupoo/storage/api/AdminStorageController.java
package com.popups.pupoo.storage.api;

import com.popups.pupoo.common.api.ApiResponse;
import com.popups.pupoo.common.api.IdResponse;
import com.popups.pupoo.storage.application.StorageService;
import com.popups.pupoo.storage.dto.UploadRequest;
import com.popups.pupoo.storage.dto.UploadResponse;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/admin/files")
public class AdminStorageController {

    private final StorageService storageService;

    public AdminStorageController(StorageService storageService) {
        this.storageService = storageService;
    }

    /**
     * (어드민) NOTICE 첨부파일 업로드 (files 테이블에 저장).
     */
    @PostMapping("/notice")
    public ApiResponse<UploadResponse> uploadNotice(
            @RequestPart("file") MultipartFile file,
            @RequestParam("noticeId") Long noticeId
    ) {
        UploadRequest req = new UploadRequest("NOTICE", noticeId);
        return ApiResponse.success(storageService.uploadForFilesTable(file, req));
    }

    /**
     * (어드민) 파일 강제 삭제.
     * - POST/NOTICE 구분 없이 ADMIN은 삭제 가능
     * - DB soft delete만 수행(오브젝트는 지연삭제 배치에서 제거)
     */
    @DeleteMapping("/{fileId}")
    public ApiResponse<IdResponse> delete(
            @PathVariable Long fileId,
            @RequestParam(value = "reason", required = false) String reason
    ) {
        storageService.deleteByAdmin(fileId, reason);
        return ApiResponse.success(new IdResponse(fileId));
    }
}