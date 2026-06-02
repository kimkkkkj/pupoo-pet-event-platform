// file: src/main/java/com/popups/pupoo/storage/api/StorageController.java
package com.popups.pupoo.storage.api;

import com.popups.pupoo.common.api.ApiResponse;
import com.popups.pupoo.common.api.IdResponse;
import com.popups.pupoo.common.exception.BusinessException;
import com.popups.pupoo.common.exception.ErrorCode;
import com.popups.pupoo.storage.application.StorageService;
import com.popups.pupoo.storage.dto.FileDownloadResponse;
import com.popups.pupoo.storage.dto.FileResponse;
import com.popups.pupoo.storage.dto.UploadRequest;
import com.popups.pupoo.storage.dto.UploadResponse;
import com.popups.pupoo.storage.infrastructure.StorageKeyGenerator.UploadTargetType;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.net.URI;
import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/files")
public class StorageController {

    private final StorageService storageService;

    public StorageController(StorageService storageService) {
        this.storageService = storageService;
    }

    @PostMapping
    public ApiResponse<UploadResponse> upload(
            @RequestPart("file") MultipartFile file,
            @RequestParam("targetType") String targetType,
            @RequestParam("contentId") Long contentId
    ) {
        try {
            UploadRequest req = new UploadRequest(targetType, contentId);
            if (req.parsedTargetType() == UploadTargetType.NOTICE) {
                throw new BusinessException(ErrorCode.FORBIDDEN, "notice file upload is admin-only");
            }
            return ApiResponse.success(storageService.uploadForFilesTable(file, req));
        } catch (BusinessException e) {
            throw e;
        } catch (Exception e) {
            log.error("File upload failed: contentId={} targetType={}", contentId, targetType, e);
            String msg = e.getMessage() != null && !e.getMessage().isBlank() ? e.getMessage() : e.getClass().getSimpleName();
            throw new BusinessException(ErrorCode.INTERNAL_ERROR, "File upload failed: " + msg);
        }
    }

    @PostMapping("/admin/notice")
    public ApiResponse<UploadResponse> uploadNoticeByAdmin(
            @RequestPart("file") MultipartFile file,
            @RequestParam("noticeId") Long noticeId
    ) {
        UploadRequest req = new UploadRequest("NOTICE", noticeId);
        return ApiResponse.success(storageService.uploadForFilesTable(file, req));
    }

    @GetMapping("/by-post/{postId}")
    public ApiResponse<FileResponse> getByPostId(@PathVariable Long postId) {
        FileResponse file = storageService.getFileByPostId(postId);
        return ApiResponse.success(file);
    }

    @GetMapping("/by-post/{postId}/list")
    public ApiResponse<List<FileResponse>> getListByPostId(@PathVariable Long postId) {
        return ApiResponse.success(storageService.getFilesByPostId(postId));
    }

    @GetMapping("/{fileId}")
    public ApiResponse<FileResponse> get(@PathVariable Long fileId) {
        return ApiResponse.success(storageService.getFile(fileId));
    }

    @GetMapping("/{fileId}/download")
    public ResponseEntity<ApiResponse<FileDownloadResponse>> redirectToStatic(@PathVariable Long fileId) {
        FileResponse file = storageService.getFile(fileId);
        FileDownloadResponse data = new FileDownloadResponse();
        data.fileName = file.getOriginalName();
        String redirectUrl = resolveRedirectUrl(file.getPublicPath());
        data.downloadUrl = redirectUrl;
        return ResponseEntity.status(302)
                .header(HttpHeaders.LOCATION, URI.create(redirectUrl).toString())
                .body(ApiResponse.success(data));
    }

    @DeleteMapping("/{fileId}")
    public ApiResponse<IdResponse> delete(@PathVariable Long fileId) {
        storageService.deleteByUser(fileId);
        return ApiResponse.success(new IdResponse(fileId));
    }

    @DeleteMapping("/admin/{fileId}")
    public ApiResponse<IdResponse> deleteByAdmin(
            @PathVariable Long fileId,
            @RequestParam(value = "reason", required = false) String reason
    ) {
        storageService.deleteByAdmin(fileId, reason);
        return ApiResponse.success(new IdResponse(fileId));
    }

    private String resolveRedirectUrl(String publicPath) {
        if (!StringUtils.hasText(publicPath)) {
            throw new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "file public path not found");
        }
        if (isAbsoluteUrl(publicPath)) {
            return publicPath;
        }
        return ServletUriComponentsBuilder.fromCurrentContextPath()
                .path(publicPath.startsWith("/") ? publicPath : "/" + publicPath)
                .build()
                .toUriString();
    }

    private boolean isAbsoluteUrl(String value) {
        String normalized = value.toLowerCase();
        return normalized.startsWith("http://") || normalized.startsWith("https://");
    }
}
