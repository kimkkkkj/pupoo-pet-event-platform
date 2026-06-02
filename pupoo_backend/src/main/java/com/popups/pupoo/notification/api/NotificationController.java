// file: src/main/java/com/popups/pupoo/notification/api/NotificationController.java
package com.popups.pupoo.notification.api;

import com.popups.pupoo.auth.security.util.SecurityUtil;
import com.popups.pupoo.common.api.ApiResponse;
import com.popups.pupoo.common.api.MessageResponse;
import com.popups.pupoo.notification.application.NotificationSseService;
import com.popups.pupoo.notification.application.NotificationStreamTokenService;
import com.popups.pupoo.notification.application.NotificationService;
import com.popups.pupoo.notification.dto.NotificationListResponse;
import com.popups.pupoo.notification.dto.NotificationResponse;
import com.popups.pupoo.notification.dto.NotificationSettingsResponse;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

/**
 * 알림 조회와 SSE 연결 API를 제공한다.
 */
@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    private final NotificationService notificationService;
    private final NotificationSseService notificationSseService;
    private final NotificationStreamTokenService notificationStreamTokenService;
    private final SecurityUtil securityUtil;

    public NotificationController(NotificationService notificationService,
                                  NotificationSseService notificationSseService,
                                  NotificationStreamTokenService notificationStreamTokenService,
                                  SecurityUtil securityUtil) {
        this.notificationService = notificationService;
        this.notificationSseService = notificationSseService;
        this.notificationStreamTokenService = notificationStreamTokenService;
        this.securityUtil = securityUtil;
    }

    /**
     * 로그인 사용자의 알림 SSE 연결을 연다.
     */
    @PostMapping("/stream/session")
    public ApiResponse<String> prepareStreamSession(HttpServletResponse response) {
        Long userId = securityUtil.currentUserId();
        String roleName = securityUtil.currentRoleName();
        notificationStreamTokenService.issueCookie(response, userId, roleName);
        return ApiResponse.success("ok");
    }

    /**
     * 로그인 사용자의 알림 SSE 연결을 연다.
     */
    @GetMapping(path = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter stream() {
        Long userId = securityUtil.currentUserId();
        return notificationSseService.connect(userId);
    }

    /**
     * 안 읽은 인앱 알림 수를 조회한다.
     */
    @GetMapping("/unread-count")
    public ApiResponse<Long> unreadCount() {
        Long userId = securityUtil.currentUserId();
        return ApiResponse.success(notificationService.getUnreadCount(userId));
    }

    /**
     * 현재 사용자의 인앱 알림 목록을 페이지 단위로 조회한다.
     */
    @GetMapping
    public ApiResponse<NotificationListResponse> myInbox(@PageableDefault(size = 20) Pageable pageable) {
        Long userId = securityUtil.currentUserId();
        return ApiResponse.success(notificationService.getMyInbox(userId, pageable));
    }

    /**
     * 알림 클릭 시 읽음 처리한다.
     */
    @PostMapping("/{inboxId}/click")
    public ApiResponse<NotificationResponse> click(@PathVariable Long inboxId) {
        Long userId = securityUtil.currentUserId();
        return ApiResponse.success(notificationService.click(userId, inboxId));
    }

    /**
     * 현재 사용자의 인박스 알림을 삭제한다.
     */
    @DeleteMapping("/{inboxId}")
    public ApiResponse<MessageResponse> delete(@PathVariable Long inboxId) {
        Long userId = securityUtil.currentUserId();
        notificationService.delete(userId, inboxId);
        return ApiResponse.success(new MessageResponse("NOTIFICATION_DELETED"));
    }

    /**
     * 현재 사용자의 알림 설정을 조회한다.
     */
    @GetMapping("/settings")
    public ApiResponse<NotificationSettingsResponse> getSettings() {
        Long userId = securityUtil.currentUserId();
        return ApiResponse.success(notificationService.getSettings(userId));
    }

    /**
     * 현재 사용자의 마케팅 수신 동의 여부를 갱신한다.
     */
    @PutMapping("/settings")
    public ApiResponse<NotificationSettingsResponse> updateSettings(@RequestParam boolean allowMarketing) {
        Long userId = securityUtil.currentUserId();
        return ApiResponse.success(notificationService.updateAllowMarketing(userId, allowMarketing));
    }
}
