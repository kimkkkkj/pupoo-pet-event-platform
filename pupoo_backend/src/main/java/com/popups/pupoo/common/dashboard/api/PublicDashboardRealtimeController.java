package com.popups.pupoo.common.dashboard.api;

import com.popups.pupoo.common.api.ApiResponse;
import com.popups.pupoo.common.dashboard.application.AdminDashboardRealtimeQueryService;
import com.popups.pupoo.common.dashboard.dto.AdminRealtimeCongestionResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Public read-only realtime congestion API for site dashboard.
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/dashboard/realtime")
public class PublicDashboardRealtimeController {

    private final AdminDashboardRealtimeQueryService queryService;

    @GetMapping("/events/{eventId}/congestions")
    public ApiResponse<List<AdminRealtimeCongestionResponse>> congestions(
            @PathVariable Long eventId,
            @RequestParam(defaultValue = "50") int limit
    ) {
        return ApiResponse.success(queryService.congestions(eventId, limit));
    }
}
