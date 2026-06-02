package com.popups.pupoo.common.dashboard.analytics.api;

import com.popups.pupoo.common.api.ApiResponse;
import com.popups.pupoo.common.dashboard.analytics.application.AdminAnalyticsQueryService;
import com.popups.pupoo.common.dashboard.analytics.dto.AdminCongestionByHourResponse;
import com.popups.pupoo.common.dashboard.analytics.dto.AdminEventPerformanceResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Public read-only analytics for site realtime pages.
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/analytics")
public class PublicAnalyticsController {

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
}
