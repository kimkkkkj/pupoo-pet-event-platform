package com.popups.pupoo.common.dashboard.dto;

import com.popups.pupoo.event.domain.model.Event;
import lombok.Builder;
import lombok.Getter;

import java.time.format.DateTimeFormatter;

@Getter
@Builder
public class DashboardPastEventResponse {

    private static final DateTimeFormatter FMT = DateTimeFormatter.ofPattern("yyyy.MM.dd");

    private Long eventId;
    private String id;
    private String name;
    private String date;
    private String location;
    private long participants;
    private int capacity;
    private int zoneUsage;
    private int eventRate;
    private int avgCongestion;
    private String imageUrl;

    public static DashboardPastEventResponse from(
            Event event,
            long participantCount,
            int capacity,
            int zoneUsage,
            int eventRate,
            int avgCongestion,
            String imageUrl
    ) {
        return DashboardPastEventResponse.builder()
                .eventId(event.getEventId())
                .id("PE-" + String.format("%03d", event.getEventId()))
                .name(event.getEventName())
                .date(event.getStartAt().format(FMT))
                .location(event.getLocation() != null ? event.getLocation() : "")
                .participants(participantCount)
                .capacity(capacity)
                .zoneUsage(zoneUsage)
                .eventRate(eventRate)
                .avgCongestion(avgCongestion)
                .imageUrl(imageUrl)
                .build();
    }
}
