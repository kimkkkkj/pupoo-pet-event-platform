// file: src/main/java/com.popups.pupoo.common.dashboard.analytics/dto/AdminEventPerformanceResponse.java
package com.popups.pupoo.common.dashboard.analytics.dto;

public class AdminEventPerformanceResponse {

    private Long eventId;
    private String eventName;
    private long activeRegistrationCount;
    private long approvedRegistrationCount;
    private long checkinCount;

    public AdminEventPerformanceResponse(
            Long eventId,
            String eventName,
            long activeRegistrationCount,
            long approvedRegistrationCount,
            long checkinCount
    ) {
        this.eventId = eventId;
        this.eventName = eventName;
        this.activeRegistrationCount = activeRegistrationCount;
        this.approvedRegistrationCount = approvedRegistrationCount;
        this.checkinCount = checkinCount;
    }

    public AdminEventPerformanceResponse(Long eventId, String eventName, long approvedRegistrationCount, long checkinCount) {
        this(eventId, eventName, approvedRegistrationCount, approvedRegistrationCount, checkinCount);
    }

    public Long getEventId() { return eventId; }
    public String getEventName() { return eventName; }
    public long getActiveRegistrationCount() { return activeRegistrationCount; }
    public long getApprovedRegistrationCount() { return approvedRegistrationCount; }
    public long getCheckinCount() { return checkinCount; }
}
