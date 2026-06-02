// file: src/main/java/com/popups/pupoo/common/dashboard/dto/AdminRealtimeSummaryResponse.java
package com.popups.pupoo.common.dashboard.dto;

public class AdminRealtimeSummaryResponse {

    private long plannedCount;
    private long ongoingCount;
    private long endedCount;
    private long cancelledCount;

    private long todayCheckinCount;

    public AdminRealtimeSummaryResponse(long plannedCount, long ongoingCount, long endedCount, long cancelledCount, long todayCheckinCount) {
        this.plannedCount = plannedCount;
        this.ongoingCount = ongoingCount;
        this.endedCount = endedCount;
        this.cancelledCount = cancelledCount;
        this.todayCheckinCount = todayCheckinCount;
    }

    public long getPlannedCount() { return plannedCount; }
    public long getOngoingCount() { return ongoingCount; }
    public long getEndedCount() { return endedCount; }
    public long getCancelledCount() { return cancelledCount; }
    public long getTodayCheckinCount() { return todayCheckinCount; }
}
