package com.popups.pupoo.common.dashboard.dto;

import com.popups.pupoo.event.domain.enums.EventStatus;
import com.popups.pupoo.event.domain.model.Event;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;

@Getter
@Builder
public class DashboardEventResponse {

    private static final DateTimeFormatter FMT = DateTimeFormatter.ofPattern("yyyy.MM.dd");

    private Long eventId;
    private String id;
    private String name;
    private String date;
    private String location;
    private String status;
    private long participants;
    private int capacity;
    private String description;
    private String imageUrl;

    public static DashboardEventResponse from(Event event, long participantCount, String imageUrl) {
        String date = event.getStartAt().format(FMT) + " ~ " + event.getEndAt().format(FMT);
        String frontStatus = mapStatus(event);

        return DashboardEventResponse.builder()
                .eventId(event.getEventId())
                .id("EV-" + String.format("%03d", event.getEventId()))
                .name(event.getEventName())
                .date(date)
                .location(event.getLocation() != null ? event.getLocation() : "")
                .status(frontStatus)
                .participants(participantCount)
                .capacity(500)
                .description(event.getDescription() != null ? event.getDescription() : "")
                .imageUrl(imageUrl)
                .build();
    }

    private static String mapStatus(Event event) {
        if (event == null) {
            return "pending";
        }

        EventStatus status = event.getStatus();
        if (status == EventStatus.CANCELLED) {
            return "ended";
        }

        LocalDate today = LocalDate.now();
        LocalDate startDate = event.getStartAt() == null ? null : event.getStartAt().toLocalDate();
        LocalDate endDate = event.getEndAt() == null ? null : event.getEndAt().toLocalDate();

        if (startDate != null && startDate.isAfter(today)) {
            return "pending";
        }
        if (endDate != null && endDate.isBefore(today)) {
            return "ended";
        }
        return "active";
    }
}
