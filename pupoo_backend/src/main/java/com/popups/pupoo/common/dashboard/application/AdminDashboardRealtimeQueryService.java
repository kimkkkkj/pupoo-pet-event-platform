// file: src/main/java/com/popups/pupoo/common/dashboard/application/AdminDashboardRealtimeQueryService.java
package com.popups.pupoo.common.dashboard.application;

import com.popups.pupoo.booth.domain.model.Booth;
import com.popups.pupoo.booth.dto.BoothCongestionResponse;
import com.popups.pupoo.booth.persistence.BoothCongestionQueryRepository;
import com.popups.pupoo.booth.persistence.BoothRepository;
import com.popups.pupoo.common.dashboard.dto.AdminRealtimeCongestionResponse;
import com.popups.pupoo.common.dashboard.dto.AdminRealtimeEventListResponse;
import com.popups.pupoo.common.dashboard.dto.AdminRealtimeSummaryResponse;
import com.popups.pupoo.event.domain.enums.EventStatus;
import com.popups.pupoo.event.domain.model.Event;
import com.popups.pupoo.event.persistence.EventRepository;
import com.popups.pupoo.qr.persistence.QrCheckinRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AdminDashboardRealtimeQueryService {

    private final EventRepository eventRepository;
    private final QrCheckinRepository qrCheckinRepository;
    private final BoothRepository boothRepository;
    private final BoothCongestionQueryRepository boothCongestionQueryRepository;

    public AdminRealtimeSummaryResponse summary() {
        LocalDate today = LocalDate.now();
        long planned = 0;
        long ongoing = 0;
        long ended = 0;
        long cancelled = 0;

        for (Event event : eventRepository.findAll()) {
            EventStatus realtimeStatus = resolveRealtimeStatus(event, today);
            if (realtimeStatus == EventStatus.PLANNED) planned += 1;
            else if (realtimeStatus == EventStatus.ONGOING) ongoing += 1;
            else if (realtimeStatus == EventStatus.ENDED) ended += 1;
            else if (realtimeStatus == EventStatus.CANCELLED) cancelled += 1;
        }

        LocalDateTime from = LocalDateTime.of(today, LocalTime.MIN);
        LocalDateTime to = LocalDateTime.of(today, LocalTime.MAX);
        long todayCheckin = qrCheckinRepository.countByCheckedAtBetween(from, to);

        return new AdminRealtimeSummaryResponse(planned, ongoing, ended, cancelled, todayCheckin);
    }

    public Page<AdminRealtimeEventListResponse> events(String keyword, EventStatus status, Pageable pageable) {
        LocalDate today = LocalDate.now();
        String normalizedKeyword = normalizeKeyword(keyword);

        List<AdminRealtimeEventListResponse> rows = eventRepository
                .findAll(Sort.by(Sort.Direction.DESC, "startAt").and(Sort.by(Sort.Direction.DESC, "eventId")))
                .stream()
                .filter(event -> matchesKeyword(event, normalizedKeyword))
                .map(event -> new AdminRealtimeEventListResponse(
                        event.getEventId(),
                        event.getEventName(),
                        resolveRealtimeStatus(event, today),
                        event.getStartAt(),
                        event.getEndAt()
                ))
                .filter(event -> status == null || event.getStatus() == status)
                .toList();

        int start = Math.toIntExact(pageable.getOffset());
        if (start >= rows.size()) {
            return new PageImpl<>(List.of(), pageable, rows.size());
        }

        int end = Math.min(start + pageable.getPageSize(), rows.size());
        return new PageImpl<>(rows.subList(start, end), pageable, rows.size());
    }

    public List<AdminRealtimeCongestionResponse> congestions(Long eventId, int limit) {
        Pageable pageable = PageRequest.of(0, Math.max(1, limit), Sort.by(Sort.Direction.ASC, "boothId"));
        List<Booth> booths = boothRepository.findEventBooths(eventId, null, null, pageable).getContent();

        return booths.stream()
                .map(b -> {
                    BoothCongestionResponse r = boothCongestionQueryRepository.findLatestByBoothId(b.getBoothId()).orElse(null);
                    if (r == null) {
                        return new AdminRealtimeCongestionResponse(b.getBoothId(), b.getPlaceName(), null, null, null);
                    }
                    return new AdminRealtimeCongestionResponse(b.getBoothId(), b.getPlaceName(), r.congestionLevel, r.measuredAt, r.programId);
                })
                .toList();
    }

    private boolean matchesKeyword(Event event, String keyword) {
        if (keyword == null) {
            return true;
        }
        String eventName = event.getEventName() == null ? "" : event.getEventName().toLowerCase();
        String description = event.getDescription() == null ? "" : event.getDescription().toLowerCase();
        return eventName.contains(keyword) || description.contains(keyword);
    }

    private String normalizeKeyword(String keyword) {
        if (keyword == null) {
            return null;
        }
        String trimmed = keyword.trim().toLowerCase();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private EventStatus resolveRealtimeStatus(Event event, LocalDate today) {
        if (event.getStatus() == EventStatus.CANCELLED) {
            return EventStatus.CANCELLED;
        }

        LocalDate startDate = event.getStartAt() == null ? null : event.getStartAt().toLocalDate();
        LocalDate endDate = event.getEndAt() == null ? null : event.getEndAt().toLocalDate();

        if (startDate != null && startDate.isAfter(today)) {
            return EventStatus.PLANNED;
        }
        if (endDate != null && endDate.isBefore(today)) {
            return EventStatus.ENDED;
        }
        return EventStatus.ONGOING;
    }
}
