// file: src/main/java/com/popups/pupoo/event/dto/EventRegistrationResponse.java
package com.popups.pupoo.event.dto;

import com.popups.pupoo.event.domain.enums.RegistrationStatus;
import com.popups.pupoo.event.domain.model.EventRegistration;

import java.time.LocalDateTime;

/** 참가 신청 응답 DTO (v2.5 기준) */
public class EventRegistrationResponse {

    private Long applyId;
    private Long eventId;
    private Long userId;
    private RegistrationStatus status;
    private LocalDateTime appliedAt;

    public static EventRegistrationResponse from(EventRegistration r) {
        EventRegistrationResponse resp = new EventRegistrationResponse();
        resp.applyId = r.getApplyId();
        resp.eventId = r.getEventId();
        resp.userId = r.getUserId();
        resp.status = r.getStatus();
        resp.appliedAt = r.getAppliedAt();
        return resp;
    }

    public Long getApplyId() { return applyId; }
    public Long getEventId() { return eventId; }
    public Long getUserId() { return userId; }
    public RegistrationStatus getStatus() { return status; }
    public LocalDateTime getAppliedAt() { return appliedAt; }
}
