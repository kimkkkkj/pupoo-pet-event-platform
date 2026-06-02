// file: src/main/java/com.popups.pupoo.common.dashboard.analytics/dto/AdminYearlyCompareResponse.java
package com.popups.pupoo.common.dashboard.analytics.dto;

public class AdminYearlyCompareResponse {

    private int year;
    private long eventCount;
    private long approvedRegistrationCount;

    public AdminYearlyCompareResponse(int year, long eventCount, long approvedRegistrationCount) {
        this.year = year;
        this.eventCount = eventCount;
        this.approvedRegistrationCount = approvedRegistrationCount;
    }

    public int getYear() { return year; }
    public long getEventCount() { return eventCount; }
    public long getApprovedRegistrationCount() { return approvedRegistrationCount; }
}
