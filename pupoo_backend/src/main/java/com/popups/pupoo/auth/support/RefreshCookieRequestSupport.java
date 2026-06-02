package com.popups.pupoo.auth.support;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

public final class RefreshCookieRequestSupport {

    private RefreshCookieRequestSupport() {
    }

    public static boolean shouldUseSecureAttribute(boolean configuredSecure) {
        if (!configuredSecure) {
            return false;
        }

        HttpServletRequest request = currentRequest();
        if (request == null) {
            return true;
        }

        if (request.isSecure()) {
            return true;
        }

        return isHttpsForwarded(request.getHeader("X-Forwarded-Proto"))
                || isHttpsForwarded(request.getHeader("Forwarded"))
                || "on".equalsIgnoreCase(request.getHeader("X-Forwarded-Ssl"))
                || "https".equalsIgnoreCase(request.getHeader("X-Forwarded-Scheme"));
    }

    private static HttpServletRequest currentRequest() {
        var attributes = RequestContextHolder.getRequestAttributes();
        if (!(attributes instanceof ServletRequestAttributes servletAttributes)) {
            return null;
        }
        return servletAttributes.getRequest();
    }

    private static boolean isHttpsForwarded(String headerValue) {
        if (headerValue == null || headerValue.isBlank()) {
            return false;
        }

        String normalized = headerValue.trim().toLowerCase();
        if (normalized.startsWith("https")) {
            return true;
        }

        return normalized.contains("proto=https");
    }
}
