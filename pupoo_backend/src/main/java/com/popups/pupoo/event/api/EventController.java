package com.popups.pupoo.event.api;

import com.popups.pupoo.common.api.ApiResponse;
import com.popups.pupoo.common.api.PageResponse;
import com.popups.pupoo.event.application.EventService;
import com.popups.pupoo.event.domain.enums.EventStatus;
import com.popups.pupoo.event.dto.ClosedEventAnalyticsResponse;
import com.popups.pupoo.event.dto.EventResponse;
import com.popups.pupoo.gallery.application.GalleryService;
import com.popups.pupoo.gallery.dto.GalleryResponse;
import org.springframework.data.domain.Pageable;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/events")
public class EventController {

    private final EventService eventService;
    private final GalleryService galleryService;

    public EventController(EventService eventService, GalleryService galleryService) {
        this.eventService = eventService;
        this.galleryService = galleryService;
    }

    @GetMapping
    public ApiResponse<PageResponse<EventResponse>> getEvents(
            Pageable pageable,
            @RequestParam(name = "keyword", required = false) String keyword,
            @RequestParam(name = "status", required = false) EventStatus status,
            @RequestParam(name = "fromAt", required = false) LocalDateTime fromAt,
            @RequestParam(name = "toAt", required = false) LocalDateTime toAt
    ) {
        return ApiResponse.success(
                PageResponse.from(eventService.getEvents(pageable, keyword, status, fromAt, toAt))
        );
    }

    @GetMapping("/{eventId}")
    public ApiResponse<EventResponse> getEvent(@PathVariable("eventId") Long eventId) {
        return ApiResponse.success(eventService.getEvent(eventId));
    }

    @GetMapping("/closed/analytics")
    public ApiResponse<List<ClosedEventAnalyticsResponse>> getClosedEventAnalytics() {
        return ApiResponse.success(eventService.getClosedEventAnalytics());
    }

    @GetMapping("/{eventId}/galleries")
    public ApiResponse<PageResponse<GalleryResponse>> getEventGalleries(
            @PathVariable("eventId") Long eventId,
            Pageable pageable,
            @RequestParam(name = "sort", required = false) String sort,
            @RequestParam(name = "keyword", required = false) String keyword
    ) {
        return ApiResponse.success(
                PageResponse.from(galleryService.listByEventId(eventId, pageable.getPageNumber(), pageable.getPageSize(), sort, keyword))
        );
    }
}
