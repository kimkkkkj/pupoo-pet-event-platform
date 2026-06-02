// file: src/main/java/com/popups/pupoo/event/dto/EventResponse.java
package com.popups.pupoo.event.dto;

import com.popups.pupoo.event.domain.enums.EventStatus;
import com.popups.pupoo.event.domain.model.Event;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public class EventResponse {

    private Long eventId;
    private String eventName;
    private String description;
    private String imageUrl;
    private LocalDateTime startAt;
    private LocalDateTime endAt;
    private String location;
    private String organizer;
    private String organizerPhone;
    private String organizerEmail;
    private EventStatus status;
    private Integer roundNo;
    private BigDecimal baseFee;
    private Long todayCheckinCount;
    private Long totalParticipantCount;
    private Long preRegistrationCount;

    public static EventResponse from(Event event, String imageUrl) {
        EventResponse response = new EventResponse();
        response.eventId = event.getEventId();
        response.eventName = event.getEventName();
        response.description = event.getDescription();
        response.imageUrl = imageUrl;
        response.startAt = event.getStartAt();
        response.endAt = event.getEndAt();
        response.location = event.getLocation();
        response.organizer = event.getOrganizer();
        response.organizerPhone = event.getOrganizerPhone();
        response.organizerEmail = event.getOrganizerEmail();
        response.status = event.getStatus();
        response.roundNo = event.getRoundNo();
        response.baseFee = event.getBaseFee();
        return response;
    }

    public Long getEventId() { return eventId; }
    public String getEventName() { return eventName; }
    public String getDescription() { return description; }
    public String getImageUrl() { return imageUrl; }
    public LocalDateTime getStartAt() { return startAt; }
    public LocalDateTime getEndAt() { return endAt; }
    public String getLocation() { return location; }
    public String getOrganizer() { return organizer; }
    public String getOrganizerPhone() { return organizerPhone; }
    public String getOrganizerEmail() { return organizerEmail; }
    public EventStatus getStatus() { return status; }
    public Integer getRoundNo() { return roundNo; }
    public BigDecimal getBaseFee() { return baseFee; }
    public Long getTodayCheckinCount() { return todayCheckinCount; }
    public Long getTotalParticipantCount() { return totalParticipantCount; }
    public Long getPreRegistrationCount() { return preRegistrationCount; }

    public void setImageUrl(String imageUrl) { this.imageUrl = imageUrl; }
    public void setStatus(EventStatus status) { this.status = status; }
    public void setTodayCheckinCount(Long todayCheckinCount) { this.todayCheckinCount = todayCheckinCount; }
    public void setTotalParticipantCount(Long totalParticipantCount) { this.totalParticipantCount = totalParticipantCount; }
    public void setPreRegistrationCount(Long preRegistrationCount) { this.preRegistrationCount = preRegistrationCount; }
}
