package com.popups.pupoo.notification.application;

import com.popups.pupoo.common.audit.application.AdminLogService;
import com.popups.pupoo.common.audit.domain.enums.AdminTargetType;
import com.popups.pupoo.notification.domain.enums.NotificationType;
import com.popups.pupoo.notification.dto.AdminNotificationPublishResult;
import com.popups.pupoo.notification.dto.NotificationBroadcastRequest;
import com.popups.pupoo.notification.dto.NotificationCreateRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 관리자 알림 발송과 관리자 감사 로그 기록을 연결하는 서비스다.
 * 실제 fan-out은 NotificationService에 위임하고, 여기서는 관리자 행위를 감사 로그로 남긴다.
 */
@Service
public class NotificationAdminService {

    private final NotificationService notificationService;
    private final AdminLogService adminLogService;

    public NotificationAdminService(NotificationService notificationService,
                                    AdminLogService adminLogService) {
        this.notificationService = notificationService;
        this.adminLogService = adminLogService;
    }

    /**
     * 특정 행사 대상 관리자 알림을 발송한다.
     */
    @Transactional
    public AdminNotificationPublishResult publishByEvent(NotificationCreateRequest request, Long adminUserId) {
        AdminNotificationPublishResult result = notificationService.publishAdminEventNotification(adminUserId, request);
        adminLogService.write("NOTIFICATION_PUBLISH", AdminTargetType.EVENT, request.getEventId());
        return result;
    }

    /**
     * 전체 발송 관리자 알림을 발송한다.
     * 알림 타입에 따라 감사 로그 대상은 시스템 또는 공지로 구분한다.
     */
    @Transactional
    public AdminNotificationPublishResult publishBroadcast(NotificationBroadcastRequest request, Long adminUserId) {
        AdminNotificationPublishResult result = notificationService.publishAdminBroadcastNotification(adminUserId, request);
        AdminTargetType targetType = request.getType() == NotificationType.SYSTEM
                ? AdminTargetType.SYSTEM
                : AdminTargetType.NOTICE;
        Long targetId = request.getTargetId() == null ? 0L : request.getTargetId();
        adminLogService.write("NOTIFICATION_PUBLISH", targetType, targetId);
        return result;
    }
}
