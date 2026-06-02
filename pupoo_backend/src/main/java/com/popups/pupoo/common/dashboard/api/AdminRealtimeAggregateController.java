package com.popups.pupoo.common.dashboard.api;

import com.popups.pupoo.common.api.ApiResponse;
import com.popups.pupoo.common.dashboard.application.AdminRealtimeAggregateService;
import com.popups.pupoo.common.dashboard.dto.AdminRealtimeAggregateResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping({"/api/admin/realtime/events", "/api/realtime/events"})
public class AdminRealtimeAggregateController {

    private final AdminRealtimeAggregateService aggregateService;

    @GetMapping
    public ApiResponse<AdminRealtimeAggregateResponse.EventsSnapshot> events() {
        return ApiResponse.success(aggregateService.eventsSnapshot());
    }

    @GetMapping("/{eventId}/overview")
    public ApiResponse<AdminRealtimeAggregateResponse.OverviewSnapshot> overview(
            @PathVariable Long eventId
    ) {
        return ApiResponse.success(aggregateService.overviewSnapshot(eventId));
    }

    @GetMapping("/{eventId}/dashboard")
    public ApiResponse<AdminRealtimeAggregateResponse.DashboardSnapshot> dashboard(
            @PathVariable Long eventId
    ) {
        return ApiResponse.success(aggregateService.dashboardSnapshot(eventId));
    }

    @GetMapping("/{eventId}/waiting-status")
    public ApiResponse<AdminRealtimeAggregateResponse.WaitingStatusSnapshot> waitingStatus(
            @PathVariable Long eventId
    ) {
        return ApiResponse.success(aggregateService.waitingStatusSnapshot(eventId));
    }

    @GetMapping("/{eventId}/checkin-status")
    public ApiResponse<AdminRealtimeAggregateResponse.CheckinStatusSnapshot> checkinStatus(
            @PathVariable Long eventId
    ) {
        return ApiResponse.success(aggregateService.checkinStatusSnapshot(eventId));
    }

    @GetMapping("/{eventId}/vote-status")
    public ApiResponse<AdminRealtimeAggregateResponse.VoteStatusSnapshot> voteStatus(
            @PathVariable Long eventId
    ) {
        return ApiResponse.success(aggregateService.voteStatusSnapshot(eventId));
    }
}
