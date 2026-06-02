package com.popups.pupoo.common.audit.application;

import com.popups.pupoo.auth.security.util.SecurityUtil;
import com.popups.pupoo.common.audit.domain.enums.AdminLogResult;
import com.popups.pupoo.common.audit.domain.enums.AdminTargetType;
import com.popups.pupoo.common.audit.domain.model.AdminLog;
import com.popups.pupoo.common.audit.persistence.AdminLogRepository;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

@Service
@RequiredArgsConstructor
public class AdminLogService {

    private final AdminLogRepository adminLogRepository;
    private final SecurityUtil securityUtil;

    @Transactional
    public void write(String action, AdminTargetType targetType, Long targetId) {
        write(action, targetType, targetId, AdminLogResult.SUCCESS, null);
    }

    @Transactional
    public void writeFailure(String action, AdminTargetType targetType, Long targetId, String errorCode) {
        write(action, targetType, targetId, AdminLogResult.FAIL, errorCode);
    }

    @Transactional
    public void write(String action,
                      AdminTargetType targetType,
                      Long targetId,
                      AdminLogResult result,
                      String errorCode) {
        try {
            Long adminId = securityUtil.currentUserId();
            adminLogRepository.save(AdminLog.builder()
                    .adminId(adminId)
                    .action(action)
                    .result(result == null ? AdminLogResult.SUCCESS : result)
                    .errorCode(errorCode)
                    .ipAddress(resolveClientIp())
                    .targetType(targetType)
                    .targetId(targetId)
                    .build());
        } catch (Exception ignored) {
            // Admin logging must not block admin operations.
        }
    }

    private String resolveClientIp() {
        if (!(RequestContextHolder.getRequestAttributes() instanceof ServletRequestAttributes attributes)) {
            return null;
        }

        HttpServletRequest request = attributes.getRequest();
        String forwardedFor = request.getHeader("X-Forwarded-For");
        if (forwardedFor != null && !forwardedFor.isBlank()) {
            return forwardedFor.split(",")[0].trim();
        }

        String realIp = request.getHeader("X-Real-IP");
        if (realIp != null && !realIp.isBlank()) {
            return realIp.trim();
        }

        return request.getRemoteAddr();
    }
}
