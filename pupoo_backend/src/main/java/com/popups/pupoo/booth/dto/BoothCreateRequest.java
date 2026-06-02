package com.popups.pupoo.booth.dto;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class BoothCreateRequest {
    private Long eventId;
    private String placeName;
    private String type;        // BOOTH_EXPERIENCE, BOOTH_FOOD, ...
    private String description;
    private String company;
    private String zone;        // ZONE_A, ZONE_B, ZONE_C, OTHER
    private String status;      // OPEN, CLOSED, PAUSED (기본: OPEN)
}
