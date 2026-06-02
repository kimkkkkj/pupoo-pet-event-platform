// file: src/main/java/com/popups/pupoo/gallery/api/GalleryController.java
package com.popups.pupoo.gallery.api;

import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.popups.pupoo.auth.security.util.SecurityUtil;
import com.popups.pupoo.common.api.ApiResponse;
import com.popups.pupoo.common.api.IdResponse;
import com.popups.pupoo.common.api.PageResponse;
import com.popups.pupoo.gallery.application.GalleryAdminService;
import com.popups.pupoo.gallery.application.GalleryService;
import com.popups.pupoo.gallery.dto.GalleryCreateRequest;
import com.popups.pupoo.gallery.dto.GalleryLikeResponse;
import com.popups.pupoo.gallery.dto.GalleryResponse;
import com.popups.pupoo.gallery.dto.GalleryUpdateRequest;
import com.popups.pupoo.report.application.ReportService;
import com.popups.pupoo.report.dto.ReportCreateRequest;
import com.popups.pupoo.report.dto.ReportResponse;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/galleries")
public class GalleryController {

    private final GalleryService galleryService;
    private final GalleryAdminService galleryAdminService;
    private final ReportService reportService;
    private final SecurityUtil securityUtil;

    @GetMapping("/{galleryId}")
    public ApiResponse<GalleryResponse> get(@PathVariable("galleryId") Long galleryId) {
        return ApiResponse.success(galleryService.get(galleryId));
    }

    @GetMapping
    public ApiResponse<PageResponse<GalleryResponse>> list(
            @RequestParam(name = "page",defaultValue = "0") int page,
            @RequestParam(name = "size",defaultValue = "10") int size,
            @RequestParam(name = "sort", required = false) String sort,
            @RequestParam(name = "keyword", required = false) String keyword) {
        return ApiResponse.success(PageResponse.from(galleryService.list(page, size, sort, keyword)));
    }

    @PostMapping
    public ApiResponse<GalleryResponse> create(@Valid @RequestBody GalleryCreateRequest request) {
        Long userId = securityUtil.currentUserId();
        return ApiResponse.success(galleryAdminService.createByUser(userId, request));
    }

    @PatchMapping("/{galleryId}")
    public ApiResponse<GalleryResponse> update(@PathVariable("galleryId") Long galleryId,
                                               @Valid @RequestBody GalleryUpdateRequest request) {
        Long currentUserId = securityUtil.currentUserId();
        boolean isAdmin = securityUtil.isAdmin();
        return ApiResponse.success(
                galleryAdminService.updateByAuthorOrAdmin(galleryId, request, currentUserId, isAdmin));
    }

    @DeleteMapping("/{galleryId}")
    public ApiResponse<IdResponse> delete(@PathVariable("galleryId") Long galleryId) {
        Long currentUserId = securityUtil.currentUserId();
        boolean isAdmin = securityUtil.isAdmin();
        galleryAdminService.deleteByAuthorOrAdmin(galleryId, currentUserId, isAdmin);
        return ApiResponse.success(new IdResponse(galleryId));
    }

    @PostMapping("/{galleryId}/report")
    public ApiResponse<ReportResponse> report(@PathVariable("galleryId") Long galleryId,
                                              @Valid @RequestBody ReportCreateRequest request) {
        return ApiResponse.success(
                reportService.reportGallery(galleryId, request.getReasonCode(), request.getReasonDetail())
        );
    }

    @PostMapping("/{galleryId}/like")
    public ApiResponse<GalleryLikeResponse> like(@PathVariable("galleryId") Long galleryId) {
        Long userId = securityUtil.currentUserId();
        return ApiResponse.success(galleryService.like(userId, galleryId));
    }

    @DeleteMapping("/{galleryId}/like")
    public ApiResponse<IdResponse> unlike(@PathVariable("galleryId") Long galleryId) {
        Long userId = securityUtil.currentUserId();
        galleryService.unlike(userId, galleryId);
        return ApiResponse.success(new IdResponse(galleryId));
    }
}
