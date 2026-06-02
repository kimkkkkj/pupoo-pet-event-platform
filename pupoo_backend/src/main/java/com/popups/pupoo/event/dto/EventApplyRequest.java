// file: src/main/java/com/popups/pupoo/event/dto/EventApplyRequest.java
package com.popups.pupoo.event.dto;

/** POST /api/event-registrations 요청 DTO */
public class EventApplyRequest {
    private Long eventId;

    public Long getEventId() { return eventId; }
    public void setEventId(Long eventId) { this.eventId = eventId; }
}
