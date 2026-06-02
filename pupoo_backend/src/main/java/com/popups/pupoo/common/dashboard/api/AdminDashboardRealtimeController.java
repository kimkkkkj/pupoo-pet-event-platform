// file: src/main/java/com/popups/pupoo/common/dashboard/api/AdminDashboardRealtimeController.java
package com.popups.pupoo.common.dashboard.api;

import com.popups.pupoo.common.api.ApiResponse;
import com.popups.pupoo.common.dashboard.application.AdminDashboardRealtimeQueryService;
import com.popups.pupoo.common.dashboard.dto.AdminRealtimeCongestionResponse;
import com.popups.pupoo.common.dashboard.dto.AdminRealtimeEventListResponse;
import com.popups.pupoo.common.dashboard.dto.AdminRealtimeSummaryResponse;
import com.popups.pupoo.event.domain.enums.EventStatus;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/admin/dashboard/realtime")
public class AdminDashboardRealtimeController {

    private final AdminDashboardRealtimeQueryService queryService;

    @GetMapping("/summary")
    public ApiResponse<AdminRealtimeSummaryResponse> summary() {
        return ApiResponse.success(queryService.summary());
    }

    @GetMapping("/events")
    public ApiResponse<Page<AdminRealtimeEventListResponse>> events(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) EventStatus status,
            Pageable pageable
    ) {
        return ApiResponse.success(queryService.events(keyword, status, pageable));
    }

    @GetMapping("/events/{eventId}/congestions")
    public ApiResponse<List<AdminRealtimeCongestionResponse>> congestions(
            @PathVariable Long eventId,
            @RequestParam(defaultValue = "50") int limit
    ) {
        return ApiResponse.success(queryService.congestions(eventId, limit));
    }
}
