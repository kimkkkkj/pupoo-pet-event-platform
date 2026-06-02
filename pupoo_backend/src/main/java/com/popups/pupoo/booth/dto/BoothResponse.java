// file: src/main/java/com/popups/pupoo/booth/dto/BoothResponse.java
package com.popups.pupoo.booth.dto;

import com.popups.pupoo.booth.domain.enums.*;
import com.popups.pupoo.booth.domain.model.Booth;

import java.time.LocalDateTime;

public class BoothResponse {

    public Long boothId;
    public Long eventId;
    public String placeName;
    public BoothType type;
    public String description;
    public String company;
    public BoothZone zone;
    public BoothStatus status;
    public LocalDateTime createdAt;

    // 상세에서만 채움(목록에서는 null)
    public BoothWaitResponse wait;
    public BoothCongestionResponse congestion;

    public static BoothResponse from(Booth b) {
        BoothResponse r = new BoothResponse();
        r.boothId = b.getBoothId();
        r.eventId = b.getEventId();
        r.placeName = b.getPlaceName();
        r.type = b.getType();
        r.description = b.getDescription();
        r.company = b.getCompany();
        r.zone = b.getZone();
        r.status = b.getStatus();
        r.createdAt = b.getCreatedAt();
        return r;
    }
}
