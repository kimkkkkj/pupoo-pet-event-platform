package com.popups.pupoo.notification.api;

import com.popups.pupoo.auth.security.util.SecurityUtil;
import com.popups.pupoo.common.api.ApiResponse;
import com.popups.pupoo.common.api.MessageResponse;
import com.popups.pupoo.notification.application.AdminNotificationManageService;
import com.popups.pupoo.notification.application.NotificationAdminService;
import com.popups.pupoo.notification.dto.AdminNotificationDraftRequest;
import com.popups.pupoo.notification.dto.AdminNotificationItemResponse;
import com.popups.pupoo.notification.dto.NotificationBroadcastRequest;
import com.popups.pupoo.notification.dto.NotificationCreateRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * 관리자 알림 API다.
 * 이벤트 발송, 브로드캐스트 발송, 초안 생성과 발송을 담당한다.
 */
@RestController
@Slf4j
@RequiredArgsConstructor
@RequestMapping("/api/admin/notifications")
public class AdminNotificationController {

    private final NotificationAdminService notificationAdminService;
    private final AdminNotificationManageService adminNotificationManageService;
    private final SecurityUtil securityUtil;

    @GetMapping
    public ApiResponse<List<AdminNotificationItemResponse>> list() {
        return ApiResponse.success(adminNotificationManageService.list());
    }

    @PostMapping
    public ApiResponse<AdminNotificationItemResponse> createDraft(@Valid @RequestBody AdminNotificationDraftRequest request) {
        Long adminUserId = securityUtil.currentUserId();
        log.info("Admin notification draft create requested: adminUserId={}", adminUserId);
        return ApiResponse.success(adminNotificationManageService.createDraft(request, adminUserId));
    }

    @PutMapping("/{adminNotificationId}")
    public ApiResponse<AdminNotificationItemResponse> updateDraft(@PathVariable Long adminNotificationId,
                                                                  @Valid @RequestBody AdminNotificationDraftRequest request) {
        Long adminUserId = securityUtil.currentUserId();
        log.info("Admin notification draft update requested: adminUserId={} adminNotificationId={}", adminUserId, adminNotificationId);
        return ApiResponse.success(adminNotificationManageService.updateDraft(adminNotificationId, request, adminUserId));
    }

    @DeleteMapping("/{adminNotificationId}")
    public ApiResponse<MessageResponse> delete(@PathVariable Long adminNotificationId) {
        Long adminUserId = securityUtil.currentUserId();
        log.info("Admin notification draft delete requested: adminUserId={} adminNotificationId={}", adminUserId, adminNotificationId);
        adminNotificationManageService.delete(adminNotificationId);
        return ApiResponse.success(new MessageResponse("ADMIN_NOTIFICATION_DELETED"));
    }

    @PostMapping("/{adminNotificationId}/send")
    public ApiResponse<AdminNotificationItemResponse> send(@PathVariable Long adminNotificationId) {
        Long adminUserId = securityUtil.currentUserId();
        log.info("Admin notification draft send requested: adminUserId={} adminNotificationId={}", adminUserId, adminNotificationId);
        return ApiResponse.success(adminNotificationManageService.send(adminNotificationId, adminUserId));
    }

    /**
     * 이벤트 기반 알림을 발송한다.
     * channels는 APP, EMAIL, SMS, PUSH를 지원하며 기본값은 APP이다.
     * recipientScope는 INTEREST_SUBSCRIBERS, EVENT_REGISTRANTS, EVENT_PAYERS를 지원한다.
     */
    @PostMapping("/event")
    public ApiResponse<MessageResponse> publishEvent(@Valid @RequestBody NotificationCreateRequest request) {
        Long adminUserId = securityUtil.currentUserId();
        notificationAdminService.publishByEvent(request, adminUserId);
        return ApiResponse.success(new MessageResponse("NOTIFICATION_PUBLISHED"));
    }

    @PostMapping("/broadcast")
    public ApiResponse<MessageResponse> publishBroadcast(@Valid @RequestBody NotificationBroadcastRequest request) {
        Long adminUserId = securityUtil.currentUserId();
        notificationAdminService.publishBroadcast(request, adminUserId);
        return ApiResponse.success(new MessageResponse("NOTIFICATION_PUBLISHED"));
    }
}
