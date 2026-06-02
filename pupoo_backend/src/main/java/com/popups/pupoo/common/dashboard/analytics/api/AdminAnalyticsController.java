// file: src/main/java/com.popups.pupoo.common.dashboard.analytics/api/AdminAnalyticsController.java
package com.popups.pupoo.common.dashboard.analytics.api;

import com.popups.pupoo.common.dashboard.analytics.application.AdminAnalyticsQueryService;
import com.popups.pupoo.common.dashboard.analytics.dto.AdminCongestionByHourResponse;
import com.popups.pupoo.common.dashboard.analytics.dto.AdminEventPerformanceResponse;
import com.popups.pupoo.common.dashboard.analytics.dto.AdminYearlyCompareResponse;
import com.popups.pupoo.common.api.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/admin/analytics")
public class AdminAnalyticsController {

    private final AdminAnalyticsQueryService queryService;

    @GetMapping("/events")
    public ApiResponse<List<AdminEventPerformanceResponse>> eventPerformance(
            @RequestParam(required = false) LocalDateTime fromAt,
            @RequestParam(required = false) LocalDateTime toAt,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size
    ) {
        Pageable pageable = PageRequest.of(page, size);
        return ApiResponse.success(queryService.eventPerformance(fromAt, toAt, pageable));
    }

    @GetMapping("/events/{eventId}/congestion-by-hour")
    public ApiResponse<List<AdminCongestionByHourResponse>> congestionByHour(@PathVariable Long eventId) {
        return ApiResponse.success(queryService.congestionByHour(eventId));
    }

    @GetMapping("/yearly")
    public ApiResponse<List<AdminYearlyCompareResponse>> yearly(
            @RequestParam int fromYear,
            @RequestParam int toYear
    ) {
        return ApiResponse.success(queryService.yearlyCompare(fromYear, toYear));
    }
}
