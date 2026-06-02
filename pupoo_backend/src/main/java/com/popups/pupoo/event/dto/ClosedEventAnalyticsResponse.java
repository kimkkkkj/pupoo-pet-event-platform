package com.popups.pupoo.event.dto;

import com.popups.pupoo.event.domain.enums.EventStatus;

import java.time.LocalDateTime;

public class ClosedEventAnalyticsResponse {

    private Long eventId;
    private String eventName;
    private String description;
    private String imageUrl;
    private LocalDateTime startAt;
    private LocalDateTime endAt;
    private String location;
    private EventStatus status;
    private long participantCount;
    private int capacity;
    private int participationRate;
    private double averageRating;
    private long reviewCount;

    public static ClosedEventAnalyticsResponse from(
            EventResponse event,
            long participantCount,
            int capacity,
            int participationRate,
            double averageRating,
            long reviewCount
    ) {
        ClosedEventAnalyticsResponse response = new ClosedEventAnalyticsResponse();
        response.eventId = event.getEventId();
        response.eventName = event.getEventName();
        response.description = event.getDescription();
        response.imageUrl = event.getImageUrl();
        response.startAt = event.getStartAt();
        response.endAt = event.getEndAt();
        response.location = event.getLocation();
        response.status = event.getStatus();
        response.participantCount = participantCount;
        response.capacity = capacity;
        response.participationRate = participationRate;
        response.averageRating = averageRating;
        response.reviewCount = reviewCount;
        return response;
    }

    public Long getEventId() { return eventId; }
    public String getEventName() { return eventName; }
    public String getDescription() { return description; }
    public String getImageUrl() { return imageUrl; }
    public LocalDateTime getStartAt() { return startAt; }
    public LocalDateTime getEndAt() { return endAt; }
    public String getLocation() { return location; }
    public EventStatus getStatus() { return status; }
    public long getParticipantCount() { return participantCount; }
    public int getCapacity() { return capacity; }
    public int getParticipationRate() { return participationRate; }
    public double getAverageRating() { return averageRating; }
    public long getReviewCount() { return reviewCount; }
}
