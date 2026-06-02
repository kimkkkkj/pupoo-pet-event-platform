package com.popups.pupoo.common.audit.api;

import com.popups.pupoo.common.api.ApiResponse;
import com.popups.pupoo.common.api.PageResponse;
import com.popups.pupoo.common.audit.application.AdminLogQueryService;
import com.popups.pupoo.common.audit.domain.enums.AdminTargetType;
import com.popups.pupoo.common.audit.dto.AdminLogListResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Locale;

/**
 * 관리자 감사 로그 조회 API다.
 * 관리자 인증이 전제되며, 검색어와 대상 타입 필터를 `AdminLogQueryService`에 전달한다.
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/admin/logs")
public class AdminLogAdminController {

    private final AdminLogQueryService adminLogQueryService;

    /**
     * 관리자 감사 로그를 페이지 단위로 조회한다.
     * `targetType=ALL` 또는 잘못된 값은 필터 없음으로 처리한다.
     */
    @GetMapping
    public ApiResponse<PageResponse<AdminLogListResponse>> list(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String targetType,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        return ApiResponse.success(
                adminLogQueryService.list(keyword, normalizeTargetType(targetType), page, size)
        );
    }

    private AdminTargetType normalizeTargetType(String targetType) {
        if (targetType == null) {
            return null;
        }

        String normalized = targetType.trim();
        if (normalized.isEmpty() || "ALL".equalsIgnoreCase(normalized)) {
            return null;
        }

        try {
            return AdminTargetType.valueOf(normalized.toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException ignored) {
            return null;
        }
    }
}
