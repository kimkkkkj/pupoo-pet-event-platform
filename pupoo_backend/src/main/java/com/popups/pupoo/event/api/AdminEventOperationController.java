// file: src/main/java/com/popups/pupoo/event/api/AdminEventOperationController.java
package com.popups.pupoo.event.api;

import com.popups.pupoo.common.api.ApiResponse;
import com.popups.pupoo.event.application.AdminEventPosterService;
import com.popups.pupoo.event.application.EventAdminService;
import com.popups.pupoo.event.dto.AdminEventCreateRequest;
import com.popups.pupoo.event.dto.AdminEventPosterAssetResponse;
import com.popups.pupoo.event.dto.AdminEventPosterGenerateRequest;
import com.popups.pupoo.event.dto.AdminEventUpdateRequest;
import com.popups.pupoo.event.dto.EventResponse;

import com.popups.pupoo.event.domain.enums.EventStatus;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;

/**
 * 관리자용 행사 운영 API
 * URL 매핑:
 * - POST  /api/admin/events           행사 등록
 * - PATCH /api/admin/events/{eventId} 행사 수정
 * - GET   /api/admin/events           행사 목록(검색)
 * - GET   /api/admin/events/{eventId} 행사 상세
 * - PATCH /api/admin/events/{eventId}/status 행사 상태 변경
 */
@RestController
@RequestMapping("/api/admin/events")
public class AdminEventOperationController {

    private final EventAdminService eventAdminService;
    private final AdminEventPosterService adminEventPosterService;

    public AdminEventOperationController(
            EventAdminService eventAdminService,
            AdminEventPosterService adminEventPosterService
    ) {
        this.eventAdminService = eventAdminService;
        this.adminEventPosterService = adminEventPosterService;
    }

    /** 행사 등록(관리자) */
    @PostMapping
    public ApiResponse<EventResponse> createEvent(@RequestBody AdminEventCreateRequest request) {
        return ApiResponse.success(eventAdminService.createEvent(request));
    }

    /** 행사 수정(관리자) */
    @PatchMapping("/{eventId}")
    public ApiResponse<EventResponse> updateEvent(
            @PathVariable("eventId") Long eventId,
            @RequestBody AdminEventUpdateRequest request
    ) {
        return ApiResponse.success(eventAdminService.updateEvent(eventId, request));
    }

    /** 행사 목록(관리자) */
    @GetMapping
    public ApiResponse<Page<EventResponse>> list(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) EventStatus status,
            @RequestParam(required = false) LocalDateTime fromAt,
            @RequestParam(required = false) LocalDateTime toAt,
            Pageable pageable
    ) {
        return ApiResponse.success(eventAdminService.list(keyword, status, fromAt, toAt, pageable));
    }

    /** 행사 상세(관리자) */
    @GetMapping("/{eventId}")
    public ApiResponse<EventResponse> get(@PathVariable Long eventId) {
        return ApiResponse.success(eventAdminService.get(eventId));
    }

    /** 행사 상태 변경(관리자) */
    @PatchMapping("/{eventId}/status")
    public ApiResponse<EventResponse> changeStatus(
            @PathVariable Long eventId,
            @RequestParam EventStatus status
    ) {
        return ApiResponse.success(eventAdminService.changeStatus(eventId, status));
    }

    @PostMapping("/poster/generate")
    public ApiResponse<AdminEventPosterAssetResponse> generatePoster(
            @Valid @RequestBody AdminEventPosterGenerateRequest request
    ) {
        return ApiResponse.success(adminEventPosterService.generatePoster(request));
    }

    @PostMapping(value = "/poster/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ApiResponse<AdminEventPosterAssetResponse> uploadPoster(
            @RequestPart("file") MultipartFile file
    ) {
        return ApiResponse.success(adminEventPosterService.uploadPoster(file));
    }
}
