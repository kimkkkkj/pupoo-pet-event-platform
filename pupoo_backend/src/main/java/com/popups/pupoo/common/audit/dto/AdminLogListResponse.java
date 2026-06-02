package com.popups.pupoo.common.audit.dto;

import com.popups.pupoo.common.audit.domain.enums.AdminTargetType;
import com.popups.pupoo.common.audit.domain.model.AdminLog;
import com.popups.pupoo.user.domain.model.User;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class AdminLogListResponse {

    private final Long logId;
    private final Long adminId;
    private final String adminName;
    private final String adminEmail;
    private final String action;
    private final String actionLabel;
    private final boolean failed;
    private final String errorCode;
    private final AdminTargetType targetType;
    private final Long targetId;
    private final LocalDateTime createdAt;

    public static AdminLogListResponse from(AdminLog log, User adminUser) {
        ActionPayload actionPayload = ActionPayload.from(log.getAction());
        String adminName = resolveAdminName(log.getAdminId(), adminUser);
        String adminEmail = adminUser != null ? adminUser.getEmail() : null;

        return AdminLogListResponse.builder()
                .logId(log.getLogId())
                .adminId(log.getAdminId())
                .adminName(adminName)
                .adminEmail(adminEmail)
                .action(log.getAction())
                .actionLabel(actionPayload.actionLabel())
                .failed(actionPayload.failed())
                .errorCode(actionPayload.errorCode())
                .targetType(log.getTargetType())
                .targetId(log.getTargetId())
                .createdAt(log.getCreatedAt())
                .build();
    }

    private static String resolveAdminName(Long adminId, User adminUser) {
        if (adminUser != null && adminUser.getNickname() != null && !adminUser.getNickname().isBlank()) {
            return adminUser.getNickname();
        }
        return adminId == null ? "알 수 없음" : "관리자 #" + adminId;
    }

    private record ActionPayload(String actionLabel, boolean failed, String errorCode) {
        private static final String FAIL_MARKER = "|FAIL|";

        static ActionPayload from(String rawAction) {
            if (rawAction == null || rawAction.isBlank()) {
                return new ActionPayload("-", false, null);
            }

            int failIndex = rawAction.indexOf(FAIL_MARKER);
            if (failIndex < 0) {
                return new ActionPayload(rawAction, false, null);
            }

            String actionLabel = rawAction.substring(0, failIndex);
            String errorCode = rawAction.substring(failIndex + FAIL_MARKER.length());
            return new ActionPayload(actionLabel, true, errorCode.isBlank() ? null : errorCode);
        }
    }
}
