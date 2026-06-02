// file: src/main/java/com/popups/pupoo/common/dashboard/dto/AdminRealtimeEventListResponse.java
package com.popups.pupoo.common.dashboard.dto;

import com.popups.pupoo.event.domain.enums.EventStatus;

import java.time.LocalDateTime;

public class AdminRealtimeEventListResponse {

    private Long eventId;
    private String eventName;
    private EventStatus status;
    private LocalDateTime startAt;
    private LocalDateTime endAt;

    public AdminRealtimeEventListResponse(Long eventId, String eventName, EventStatus status, LocalDateTime startAt, LocalDateTime endAt) {
        this.eventId = eventId;
        this.eventName = eventName;
        this.status = status;
        this.startAt = startAt;
        this.endAt = endAt;
    }

    public Long getEventId() { return eventId; }
    public String getEventName() { return eventName; }
    public EventStatus getStatus() { return status; }
    public LocalDateTime getStartAt() { return startAt; }
    public LocalDateTime getEndAt() { return endAt; }
}
