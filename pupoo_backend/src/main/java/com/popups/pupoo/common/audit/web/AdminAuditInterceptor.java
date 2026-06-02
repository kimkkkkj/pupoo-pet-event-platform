package com.popups.pupoo.common.audit.web;

import com.popups.pupoo.auth.security.util.SecurityUtil;
import com.popups.pupoo.common.audit.application.AdminLogService;
import com.popups.pupoo.common.audit.domain.enums.AdminTargetType;
import com.popups.pupoo.common.exception.BusinessException;
import com.popups.pupoo.common.exception.ErrorCode;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Component
@RequiredArgsConstructor
public class AdminAuditInterceptor implements HandlerInterceptor {

    public static final String REQUEST_ATTRIBUTE = "ADMIN_AUDIT_LOGGED";

    private static final Pattern NUMERIC_SEGMENT = Pattern.compile("/(\\d+)(?:/|$)");

    private final AdminLogService adminLogService;
    private final SecurityUtil securityUtil;

    @Override
    public void afterCompletion(
            HttpServletRequest request,
            HttpServletResponse response,
            Object handler,
            Exception ex
    ) {
        if (!supports(request)) {
            return;
        }
        if (Boolean.TRUE.equals(request.getAttribute(REQUEST_ATTRIBUTE))) {
            return;
        }
        if (!securityUtil.isAdmin()) {
            return;
        }

        String action = truncate(buildAction(request), 255);
        if (action == null || action.isBlank()) {
            return;
        }

        if (isFailure(response, ex)) {
            String errorCode = resolveFailureCode(response, ex);
            action = truncate(action + "|FAIL|" + errorCode, 255);
            adminLogService.writeFailure(
                    action,
                    resolveTargetType(request.getRequestURI()),
                    resolveTargetId(request.getRequestURI()),
                    errorCode
            );
            return;
        }

        adminLogService.write(
                action,
                resolveTargetType(request.getRequestURI()),
                resolveTargetId(request.getRequestURI())
        );
    }

    private boolean supports(HttpServletRequest request) {
        String method = request.getMethod();
        if (!("POST".equals(method) || "PATCH".equals(method) || "PUT".equals(method) || "DELETE".equals(method))) {
            return false;
        }

        String path = request.getRequestURI();
        return path != null
                && path.startsWith("/api/admin/")
                && !path.startsWith("/api/admin/logs");
    }

    private boolean isFailure(HttpServletResponse response, Exception ex) {
        return ex != null || response.getStatus() >= 400;
    }

    private String resolveFailureCode(HttpServletResponse response, Exception ex) {
        if (ex instanceof BusinessException businessException) {
            ErrorCode errorCode = businessException.getErrorCode();
            return errorCode == null ? ErrorCode.INTERNAL_ERROR.name() : errorCode.name();
        }
        if (response.getStatus() >= 500) {
            return ErrorCode.INTERNAL_ERROR.name();
        }
        return "HTTP_" + response.getStatus();
    }

    private String buildAction(HttpServletRequest request) {
        String method = request.getMethod().toUpperCase(Locale.ROOT);
        String path = normalizePath(request.getRequestURI());

        if ("POST".equals(method) && path.matches("^/api/admin/dashboard/events$")) return "행사 생성";
        if ("PATCH".equals(method) && path.matches("^/api/admin/dashboard/events/\\d+$")) return "행사 수정";
        if ("DELETE".equals(method) && path.matches("^/api/admin/dashboard/events/\\d+$")) return "행사 삭제";
        if ("POST".equals(method) && path.matches("^/api/admin/dashboard/events/bulk-delete$")) return "행사 일괄 삭제";

        if ("POST".equals(method) && path.matches("^/api/admin/dashboard/programs$")) return "프로그램 생성";
        if ("PATCH".equals(method) && path.matches("^/api/admin/dashboard/programs/\\d+$")) return "프로그램 수정";
        if ("DELETE".equals(method) && path.matches("^/api/admin/dashboard/programs/\\d+$")) return "프로그램 삭제";
        if ("POST".equals(method) && path.matches("^/api/admin/dashboard/programs/bulk-delete$")) return "프로그램 일괄 삭제";
        if ("PATCH".equals(method) && path.matches("^/api/admin/dashboard/program-applies/\\d+/status$")) return "프로그램 신청 상태 변경";
        if ("DELETE".equals(method) && path.matches("^/api/admin/dashboard/program-applies/\\d+$")) return "프로그램 신청 삭제";

        if ("POST".equals(method) && path.matches("^/api/admin/dashboard/booths$")) return "부스 생성";
        if ("PATCH".equals(method) && path.matches("^/api/admin/dashboard/booths/\\d+$")) return "부스 수정";
        if ("DELETE".equals(method) && path.matches("^/api/admin/dashboard/booths/\\d+$")) return "부스 삭제";
        if ("POST".equals(method) && path.matches("^/api/admin/dashboard/booths/bulk-delete$")) return "부스 일괄 삭제";

        if ("PATCH".equals(method) && path.matches("^/api/admin/dashboard/registrations/\\d+/status$")) return "참가자 상태 변경";
        if ("DELETE".equals(method) && path.matches("^/api/admin/dashboard/registrations/\\d+$")) return "참가자 삭제";
        if ("POST".equals(method) && path.matches("^/api/admin/dashboard/registrations/bulk-delete$")) return "참가자 일괄 삭제";

        if ("POST".equals(method) && path.matches("^/api/admin/refunds/\\d+/approve$")) return "환불 승인";
        if ("POST".equals(method) && path.matches("^/api/admin/refunds/\\d+/execute$")) return "환불 실행";
        if ("PATCH".equals(method) && path.matches("^/api/admin/refunds/\\d+/approve$")) return "환불 승인";
        if ("PATCH".equals(method) && path.matches("^/api/admin/refunds/\\d+/reject$")) return "환불 거절";
        if ("POST".equals(method) && path.matches("^/api/admin/dashboard/payments/\\d+/refund$")) return "결제 환불";
        if ("POST".equals(method) && path.matches("^/api/admin/dashboard/payments/bulk-refund$")) return "결제 일괄 환불";

        if ("POST".equals(method) && path.matches("^/api/admin/notices.*")) return "공지 생성";
        if ("PATCH".equals(method) && path.matches("^/api/admin/notices.*")) return "공지 수정";
        if ("DELETE".equals(method) && path.matches("^/api/admin/notices.*")) return "공지 삭제";

        if ("POST".equals(method) && path.matches("^/api/admin/users.*")) return "관리자 사용자 생성";
        if ("PATCH".equals(method) && path.matches("^/api/admin/users.*")) return "관리자 사용자 수정";
        if ("DELETE".equals(method) && path.matches("^/api/admin/users.*")) return "관리자 사용자 삭제";

        return method + " " + path;
    }

    private AdminTargetType resolveTargetType(String path) {
        String normalized = normalizePath(path);

        if (normalized.contains("/events")) return AdminTargetType.EVENT;
        if (normalized.contains("/programs")) return AdminTargetType.PROGRAM;
        if (normalized.contains("/booths")) return AdminTargetType.BOOTH;
        if (normalized.contains("/notices")) return AdminTargetType.NOTICE;
        if (normalized.contains("/posts")) return AdminTargetType.POST;
        if (normalized.contains("/qna") || normalized.contains("/faq")) return AdminTargetType.QNA;
        if (normalized.contains("/inquiries")) return AdminTargetType.INQUIRY;
        if (normalized.contains("/gallery")) return AdminTargetType.GALLERY;
        if (normalized.contains("/reviews")) return AdminTargetType.REVIEW;
        if (normalized.contains("/payments")) return AdminTargetType.PAYMENT;
        if (normalized.contains("/refunds")) return AdminTargetType.REFUND;
        if (normalized.contains("/qr")) return AdminTargetType.QR;
        if (normalized.contains("/users")) return AdminTargetType.USER;

        return AdminTargetType.OTHER;
    }

    private Long resolveTargetId(String path) {
        Matcher matcher = NUMERIC_SEGMENT.matcher(normalizePath(path));
        return matcher.find() ? Long.parseLong(matcher.group(1)) : null;
    }

    private String normalizePath(String path) {
        if (path == null || path.isBlank()) {
            return "";
        }
        return path.replaceAll("/+$", "");
    }

    private String truncate(String value, int maxLength) {
        if (value == null || value.length() <= maxLength) {
            return value;
        }
        return value.substring(0, maxLength);
    }
}
