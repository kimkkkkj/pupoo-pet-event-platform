// file: src/main/java/com/popups/pupoo/common/dashboard/dto/AdminRealtimeCongestionResponse.java
package com.popups.pupoo.common.dashboard.dto;

import java.time.LocalDateTime;

public class AdminRealtimeCongestionResponse {

    private Long boothId;
    private String placeName;
    private Integer congestionLevel;
    private LocalDateTime measuredAt;
    private Long programId;

    public AdminRealtimeCongestionResponse(Long boothId, String placeName, Integer congestionLevel, LocalDateTime measuredAt, Long programId) {
        this.boothId = boothId;
        this.placeName = placeName;
        this.congestionLevel = congestionLevel;
        this.measuredAt = measuredAt;
        this.programId = programId;
    }

    public Long getBoothId() { return boothId; }
    public String getPlaceName() { return placeName; }
    public Integer getCongestionLevel() { return congestionLevel; }
    public LocalDateTime getMeasuredAt() { return measuredAt; }
    public Long getProgramId() { return programId; }
}
