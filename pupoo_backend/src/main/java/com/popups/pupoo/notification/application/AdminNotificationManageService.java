package com.popups.pupoo.notification.application;

import com.popups.pupoo.common.audit.application.AdminLogService;
import com.popups.pupoo.common.audit.domain.enums.AdminTargetType;
import com.popups.pupoo.common.exception.BusinessException;
import com.popups.pupoo.common.exception.ErrorCode;
import com.popups.pupoo.event.domain.model.Event;
import com.popups.pupoo.event.persistence.EventRepository;
import com.popups.pupoo.notification.domain.enums.AdminAlertMode;
import com.popups.pupoo.notification.domain.enums.AdminNotificationStatus;
import com.popups.pupoo.notification.domain.enums.InboxTargetType;
import com.popups.pupoo.notification.domain.enums.NotificationType;
import com.popups.pupoo.notification.domain.enums.RecipientScope;
import com.popups.pupoo.notification.dto.AdminNotificationDraftRequest;
import com.popups.pupoo.notification.dto.AdminNotificationItemResponse;
import com.popups.pupoo.notification.dto.AdminNotificationPublishResult;
import com.popups.pupoo.notification.dto.AdminNotificationSaveCommand;
import com.popups.pupoo.notification.dto.AdminNotificationStoredItem;
import com.popups.pupoo.notification.dto.NotificationBroadcastRequest;
import com.popups.pupoo.notification.dto.NotificationCreateRequest;
import com.popups.pupoo.notification.persistence.AdminNotificationRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
@Transactional(readOnly = true)
public class AdminNotificationManageService {

    private static final DateTimeFormatter SENT_DATE_FORMAT = DateTimeFormatter.ofPattern("yyyy.MM.dd");

    private final AdminNotificationRepository adminNotificationRepository;
    private final EventRepository eventRepository;
    private final NotificationAdminService notificationAdminService;
    private final NotificationService notificationService;
    private final AdminLogService adminLogService;

    public AdminNotificationManageService(AdminNotificationRepository adminNotificationRepository,
                                          EventRepository eventRepository,
                                          NotificationAdminService notificationAdminService,
                                          NotificationService notificationService,
                                          AdminLogService adminLogService) {
        this.adminNotificationRepository = adminNotificationRepository;
        this.eventRepository = eventRepository;
        this.notificationAdminService = notificationAdminService;
        this.notificationService = notificationService;
        this.adminLogService = adminLogService;
    }

    public List<AdminNotificationItemResponse> list() {
        return adminNotificationRepository.findVisibleAll().stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public AdminNotificationItemResponse createDraft(AdminNotificationDraftRequest request, Long adminUserId) {
        AdminNotificationSaveCommand command = toSaveCommand(request, adminUserId, AdminNotificationStatus.DRAFT);
        Long adminNotificationId = adminNotificationRepository.save(command);
        adminLogService.write("ADMIN_NOTIFICATION_CREATE", AdminTargetType.OTHER, adminNotificationId);
        return adminNotificationRepository.findVisibleById(adminNotificationId)
                .map(this::toResponse)
                .orElseThrow(() -> new IllegalStateException("Failed to load admin notification draft"));
    }

    @Transactional
    public AdminNotificationItemResponse updateDraft(Long adminNotificationId,
                                                     AdminNotificationDraftRequest request,
                                                     Long adminUserId) {
        AdminNotificationStoredItem stored = getVisibleItem(adminNotificationId);
        AdminNotificationSaveCommand command = toSaveCommand(
                request,
                stored.adminUserId() == null ? adminUserId : stored.adminUserId(),
                stored.status()
        );
        adminNotificationRepository.update(adminNotificationId, command);
        adminLogService.write("ADMIN_NOTIFICATION_UPDATE", AdminTargetType.OTHER, adminNotificationId);
        return adminNotificationRepository.findVisibleById(adminNotificationId)
                .map(this::toResponse)
                .orElseThrow(() -> new IllegalStateException("Failed to load admin notification"));
    }

    @Transactional
    public void delete(Long adminNotificationId) {
        getVisibleItem(adminNotificationId);
        adminNotificationRepository.softDelete(adminNotificationId);
        adminLogService.write("ADMIN_NOTIFICATION_DELETE", AdminTargetType.OTHER, adminNotificationId);
    }

    @Transactional
    public AdminNotificationItemResponse send(Long adminNotificationId, Long adminUserId) {
        AdminNotificationStoredItem stored = getVisibleItem(adminNotificationId);
        if (stored.status() == AdminNotificationStatus.SENT) {
            return toResponse(stored);
        }

        AdminNotificationPublishResult result = stored.alertMode() == AdminAlertMode.EVENT
                ? notificationAdminService.publishByEvent(
                        NotificationCreateRequest.of(
                                stored.notificationType(),
                                stored.title(),
                                stored.content(),
                                InboxTargetType.EVENT,
                                stored.eventId(),
                                stored.eventId(),
                                List.of(),
                                stored.recipientScopes().isEmpty() ? null : stored.recipientScopes().get(0),
                                stored.recipientScopes()
                        ),
                        adminUserId
                )
                : notificationAdminService.publishBroadcast(
                        NotificationBroadcastRequest.of(
                                stored.notificationType(),
                                stored.title(),
                                stored.content(),
                                InboxTargetType.NOTICE,
                                0L,
                                List.of()
                        ),
                        adminUserId
                );

        adminNotificationRepository.markSent(
                adminNotificationId,
                result.notificationId(),
                result.targetCount(),
                LocalDateTime.now()
        );
        adminLogService.write("ADMIN_NOTIFICATION_SEND", AdminTargetType.OTHER, adminNotificationId);
        return adminNotificationRepository.findVisibleById(adminNotificationId)
                .map(this::toResponse)
                .orElseThrow(() -> new IllegalStateException("Failed to load sent admin notification"));
    }

    private AdminNotificationStoredItem getVisibleItem(Long adminNotificationId) {
        return adminNotificationRepository.findVisibleById(adminNotificationId)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
    }

    private AdminNotificationSaveCommand toSaveCommand(AdminNotificationDraftRequest request,
                                                       Long adminUserId,
                                                       AdminNotificationStatus status) {
        AdminAlertMode alertMode = resolveAlertMode(request.getAlertMode());
        if (alertMode == AdminAlertMode.EVENT) {
            Long eventId = request.getEventId();
            if (eventId == null) {
                throw new BusinessException(ErrorCode.INVALID_REQUEST, "eventId is required when alertMode is EVENT");
            }
            Event event = eventRepository.findById(eventId)
                    .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "event not found: " + eventId));
            List<RecipientScope> scopes = notificationService.normalizeAdminRecipientScopes(
                    request.getRecipientScope(),
                    request.getRecipientScopes()
            );
            int targetCount = notificationService.countAdminEventRecipients(eventId, scopes);
            return new AdminNotificationSaveCommand(
                    adminUserId,
                    request.getTitle(),
                    request.getContent(),
                    AdminAlertMode.EVENT,
                    NotificationType.EVENT,
                    event.getEventId(),
                    event.getEventName(),
                    event.getStatus().name(),
                    event.getEventName(),
                    null,
                    scopes,
                    targetCount,
                    status
            );
        }

        String specialTargetKey = resolveSpecialTargetKey(alertMode, request.getSpecialTargetKey());
        String targetLabel = resolveSpecialTargetLabel(alertMode, specialTargetKey);
        return new AdminNotificationSaveCommand(
                adminUserId,
                request.getTitle(),
                request.getContent(),
                alertMode,
                alertMode == AdminAlertMode.SYSTEM ? NotificationType.SYSTEM : NotificationType.NOTICE,
                null,
                targetLabel,
                null,
                targetLabel,
                specialTargetKey,
                List.of(),
                notificationService.countAllActiveRecipients(),
                status
        );
    }

    private AdminNotificationItemResponse toResponse(AdminNotificationStoredItem item) {
        List<String> scopes = item.recipientScopes().stream()
                .map(RecipientScope::name)
                .toList();
        String recipientScope = scopes.isEmpty() ? null : scopes.get(0);
        String target = item.alertMode() == AdminAlertMode.EVENT
                ? resolveRecipientTargetLabel(item.recipientScopes())
                : item.alertTargetLabel();
        return new AdminNotificationItemResponse(
                item.adminNotificationId(),
                item.title(),
                item.content(),
                item.status().name().toLowerCase(),
                item.eventId(),
                item.eventName(),
                item.eventStatus(),
                item.alertMode().name().toLowerCase(),
                item.notificationType().name(),
                item.alertTargetLabel(),
                item.specialTargetKey(),
                recipientScope,
                scopes,
                target,
                item.targetCount(),
                item.sentAt() == null ? null : item.sentAt().format(SENT_DATE_FORMAT),
                item.sentAt() == null ? null : item.sentAt().toString()
        );
    }

    private String resolveSpecialTargetKey(AdminAlertMode alertMode, String rawValue) {
        if (alertMode == AdminAlertMode.IMPORTANT) {
            return rawValue == null || rawValue.isBlank() ? "IMPORTANT_ALL" : rawValue;
        }
        if (alertMode == AdminAlertMode.SYSTEM) {
            return rawValue == null || rawValue.isBlank() ? "SYSTEM_INFO" : rawValue;
        }
        return null;
    }

    private String resolveSpecialTargetLabel(AdminAlertMode alertMode, String specialTargetKey) {
        if (alertMode == AdminAlertMode.SYSTEM) {
            return "시스템 관련 알림";
        }
        if (alertMode == AdminAlertMode.IMPORTANT) {
            return "전체 중요 알림";
        }
        return specialTargetKey == null ? "" : specialTargetKey;
    }

    private String resolveRecipientTargetLabel(List<RecipientScope> scopes) {
        if (scopes == null || scopes.isEmpty()) {
            return "관심 구독자";
        }
        return scopes.stream()
                .map(scope -> switch (scope) {
                    case INTEREST_SUBSCRIBERS -> "관심 구독자";
                    case EVENT_REGISTRANTS -> "행사 신청자";
                    case EVENT_PAYERS -> "결제 완료자";
                })
                .distinct()
                .reduce((left, right) -> left + ", " + right)
                .orElse("관심 구독자");
    }

    private AdminAlertMode resolveAlertMode(String rawValue) {
        try {
            return AdminAlertMode.from(rawValue);
        } catch (IllegalArgumentException exception) {
            throw new BusinessException(
                    ErrorCode.INVALID_REQUEST,
                    "alertMode must be one of EVENT, IMPORTANT, SYSTEM"
            );
        }
    }
}
