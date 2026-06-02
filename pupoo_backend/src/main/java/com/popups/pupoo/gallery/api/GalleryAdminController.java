// file: src/main/java/com/popups/pupoo/gallery/api/GalleryAdminController.java
package com.popups.pupoo.gallery.api;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.popups.pupoo.auth.security.util.SecurityUtil;
import com.popups.pupoo.common.api.ApiResponse;
import com.popups.pupoo.common.api.IdResponse;
import com.popups.pupoo.common.api.PageResponse;
import com.popups.pupoo.common.exception.BusinessException;
import com.popups.pupoo.common.exception.ErrorCode;
import com.popups.pupoo.gallery.application.GalleryAdminService;
import com.popups.pupoo.gallery.dto.GalleryCreateRequest;
import com.popups.pupoo.gallery.dto.GalleryResponse;
import com.popups.pupoo.gallery.dto.GalleryUpdateRequest;
import com.popups.pupoo.gallery.domain.enums.GalleryStatus;

/**
 * 관리자용 갤러리 API
 * - POST /api/galleries
 * - PATCH /api/galleries/{galleryId}
 * - DELETE /api/galleries/{galleryId}
 */
@RestController
@RequestMapping("/api/admin/galleries")
public class GalleryAdminController {

    private final GalleryAdminService galleryAdminService;
    private final SecurityUtil securityUtil;
    
    public GalleryAdminController(GalleryAdminService galleryAdminService, SecurityUtil securityUtil) {
        this.galleryAdminService = galleryAdminService;
        this.securityUtil = securityUtil;
    }

    @GetMapping
    public ApiResponse<PageResponse<GalleryResponse>> list(
            @RequestParam(name = "page", defaultValue = "0") int page,
            @RequestParam(name = "size", defaultValue = "20") int size,
            @RequestParam(name = "status", required = false) String status
    ) {
        GalleryStatus statusEnum = null;
        if (status != null && !status.isBlank()) {
            try {
                statusEnum = GalleryStatus.valueOf(status);
            } catch (IllegalArgumentException e) {
                throw new BusinessException(ErrorCode.VALIDATION_FAILED, "status 값이 올바르지 않습니다.");
            }
        }
        return ApiResponse.success(PageResponse.from(galleryAdminService.list(page, size, statusEnum)));
    }
    
    @PostMapping
    public ApiResponse<GalleryResponse> create(@RequestBody GalleryCreateRequest request) {
        Long adminUserId = securityUtil.currentUserId();
        return ApiResponse.success(galleryAdminService.create(adminUserId, request));
    }

    @PatchMapping("/{galleryId}")
    public ApiResponse<GalleryResponse> update(
            @PathVariable("galleryId") Long galleryId,
            @RequestBody GalleryUpdateRequest request) {
        return ApiResponse.success(galleryAdminService.update(galleryId, request));
    }

    @DeleteMapping("/{galleryId}")
    public ApiResponse<IdResponse> delete(@PathVariable("galleryId") Long galleryId) {
        galleryAdminService.delete(galleryId);
        return ApiResponse.success(new IdResponse(galleryId));
    }
}
