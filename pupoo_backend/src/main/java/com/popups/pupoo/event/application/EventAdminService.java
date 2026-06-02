// file: src/main/java/com/popups/pupoo/event/application/EventAdminService.java
package com.popups.pupoo.event.application;

import com.popups.pupoo.common.audit.application.AdminLogService;
import com.popups.pupoo.common.audit.domain.enums.AdminTargetType;
import com.popups.pupoo.common.exception.BusinessException;
import com.popups.pupoo.common.exception.ErrorCode;
import com.popups.pupoo.event.domain.enums.EventStatus;
import com.popups.pupoo.event.domain.model.Event;
import com.popups.pupoo.event.domain.model.EventInterestMap;
import com.popups.pupoo.event.dto.AdminEventCreateRequest;
import com.popups.pupoo.event.dto.AdminEventUpdateRequest;
import com.popups.pupoo.event.dto.EventResponse;
import com.popups.pupoo.event.persistence.EventInterestMapRepository;
import com.popups.pupoo.event.persistence.EventRegistrationRepository;
import com.popups.pupoo.event.persistence.EventRepository;
import com.popups.pupoo.notification.application.NotificationService;
import com.popups.pupoo.notification.domain.enums.InboxTargetType;
import com.popups.pupoo.notification.domain.enums.NotificationType;
import com.popups.pupoo.storage.support.StorageKeyNormalizer;
import com.popups.pupoo.storage.support.StorageUrlResolver;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class EventAdminService {

    private final EventRepository eventRepository;
    private final EventInterestMapRepository eventInterestMapRepository;
    private final EventRegistrationRepository eventRegistrationRepository;
    private final NotificationService notificationService;
    private final AdminLogService adminLogService;
    private final StorageKeyNormalizer storageKeyNormalizer;
    private final StorageUrlResolver storageUrlResolver;

    public EventAdminService(
            EventRepository eventRepository,
            EventInterestMapRepository eventInterestMapRepository,
            EventRegistrationRepository eventRegistrationRepository,
            NotificationService notificationService,
            AdminLogService adminLogService,
            StorageKeyNormalizer storageKeyNormalizer,
            StorageUrlResolver storageUrlResolver
    ) {
        this.eventRepository = eventRepository;
        this.eventInterestMapRepository = eventInterestMapRepository;
        this.eventRegistrationRepository = eventRegistrationRepository;
        this.notificationService = notificationService;
        this.adminLogService = adminLogService;
        this.storageKeyNormalizer = storageKeyNormalizer;
        this.storageUrlResolver = storageUrlResolver;
    }

    @Transactional
    public EventResponse createEvent(AdminEventCreateRequest request) {
        Event event = Event.create(
                request.getEventName(),
                request.getDescription(),
                request.getStartAt(),
                request.getEndAt(),
                request.getLocation(),
                storageKeyNormalizer.normalizeToKey(request.getImageUrl()),
                request.getOrganizer(),
                request.getStatus(),
                request.getRoundNo(),
                request.getBaseFee()
        );
        Event saved = eventRepository.save(event);

        saveEventInterests(saved.getEventId(), request.getInterestIds());

        notificationService.publishEventInterestNotification(
                saved.getEventId(),
                NotificationType.EVENT,
                "새 행사가 등록되었어요",
                saved.getEventName(),
                InboxTargetType.EVENT,
                saved.getEventId()
        );

        adminLogService.write("EVENT_CREATE", AdminTargetType.EVENT, saved.getEventId());
        return toEventResponse(saved);
    }

    @Transactional
    public EventResponse updateEvent(Long eventId, AdminEventUpdateRequest request) {
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new BusinessException(
                        ErrorCode.INVALID_REQUEST,
                        "존재하지 않는 행사입니다. eventId=" + eventId
                ));

        event.update(
                request.getEventName(),
                request.getDescription(),
                request.getStartAt(),
                request.getEndAt(),
                request.getLocation(),
                storageKeyNormalizer.normalizeToKey(request.getImageUrl()),
                request.getOrganizer(),
                request.getStatus(),
                request.getRoundNo(),
                request.getBaseFee() != null ? request.getBaseFee() : event.getBaseFee()
        );

        saveEventInterests(eventId, request.getInterestIds());

        notificationService.publishEventInterestNotification(
                eventId,
                NotificationType.EVENT,
                "행사 정보가 업데이트되었어요",
                event.getEventName(),
                InboxTargetType.EVENT,
                eventId
        );

        adminLogService.write("EVENT_UPDATE", AdminTargetType.EVENT, eventId);
        return toEventResponse(event);
    }

    public Page<EventResponse> list(
            String keyword,
            EventStatus status,
            LocalDateTime fromAt,
            LocalDateTime toAt,
            Pageable pageable
    ) {
        return eventRepository.search(keyword, status, fromAt, toAt, pageable).map(this::toEventResponse);
    }

    public EventResponse get(Long eventId) {
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new BusinessException(
                        ErrorCode.INVALID_REQUEST,
                        "존재하지 않는 행사입니다. eventId=" + eventId
                ));
        return toEventResponse(event);
    }

    @Transactional
    public EventResponse changeStatus(Long eventId, EventStatus status) {
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new BusinessException(
                        ErrorCode.INVALID_REQUEST,
                        "존재하지 않는 행사입니다. eventId=" + eventId
                ));

        event.changeStatus(status);
        adminLogService.write("EVENT_STATUS_CHANGE", AdminTargetType.EVENT, eventId);
        return toEventResponse(event);
    }

    @Transactional
    public void hardDeleteEvent(Long eventId) {
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new BusinessException(
                        ErrorCode.INVALID_REQUEST,
                        "존재하지 않는 행사입니다. eventId=" + eventId
                ));

        eventInterestMapRepository.deleteByEventId(eventId);
        try {
            eventRegistrationRepository.deleteByEventId(eventId);
        } catch (Exception ignored) {
        }

        eventRepository.delete(event);
        eventRepository.flush();
        adminLogService.write("EVENT_HARD_DELETE", AdminTargetType.EVENT, eventId);
    }

    private void saveEventInterests(Long eventId, List<Long> interestIds) {
        eventInterestMapRepository.deleteByEventId(eventId);
        if (interestIds == null || interestIds.isEmpty()) {
            return;
        }

        List<EventInterestMap> mappings = interestIds.stream()
                .distinct()
                .map(interestId -> EventInterestMap.create(eventId, interestId))
                .collect(Collectors.toList());
        eventInterestMapRepository.saveAll(mappings);
    }

    private EventResponse toEventResponse(Event event) {
        return EventResponse.from(event, storageUrlResolver.toPublicUrl(event.getImageUrl()));
    }
}
