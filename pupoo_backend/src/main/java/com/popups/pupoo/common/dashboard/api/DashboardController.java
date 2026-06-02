// file: src/main/java/com/popups/pupoo/common/dashboard/api/DashboardController.java
package com.popups.pupoo.common.dashboard.api;

import com.popups.pupoo.common.api.ApiResponse;
import com.popups.pupoo.common.dashboard.application.DashboardQueryService;
import com.popups.pupoo.common.dashboard.dto.AdminDashboardResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

/**
 * 관리자 대시보드 API
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/admin/dashboard")
public class DashboardController {

    private final DashboardQueryService dashboardQueryService;

    @GetMapping
    public ApiResponse<AdminDashboardResponse> summary() {
        return ApiResponse.success(dashboardQueryService.summary());
    }

    /**
     * URL 매핑 정합성을 위해 단건 조회 형태도 제공한다.
     * - 현재는 대시보드 요약과 동일 응답을 반환한다.
     */
    @GetMapping("/{id}")
    public ApiResponse<AdminDashboardResponse> summaryById(@PathVariable Long id) {
        return ApiResponse.success(dashboardQueryService.summary());
    }
}
