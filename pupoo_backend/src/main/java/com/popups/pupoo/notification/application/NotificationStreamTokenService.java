package com.popups.pupoo.notification.application;

import com.popups.pupoo.auth.application.TokenService;
import com.popups.pupoo.auth.support.RefreshCookieRequestSupport;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Service;

@Service
public class NotificationStreamTokenService {

    public static final String STREAM_COOKIE_NAME = "notification_stream_token";

    private final TokenService tokenService;
    private final boolean secureCookie;
    private final int maxAgeSeconds;
    private final String cookiePath;

    public NotificationStreamTokenService(
            TokenService tokenService,
            @Value("${notification.sse.cookie.secure:true}") boolean secureCookie,
            @Value("${notification.sse.cookie.max-age-seconds:300}") int maxAgeSeconds,
            @Value("${notification.sse.cookie.path:/api/notifications/stream}") String cookiePath
    ) {
        this.tokenService = tokenService;
        this.secureCookie = secureCookie;
        this.maxAgeSeconds = maxAgeSeconds;
        this.cookiePath = cookiePath;
    }

    public void issueCookie(HttpServletResponse response, Long userId, String roleName) {
        long streamTtlSeconds = Math.max(1, Math.min(tokenService.getAccessTtlSeconds(), maxAgeSeconds));
        String streamToken = tokenService.createAccessToken(userId, roleName, streamTtlSeconds);

        ResponseCookie cookie = ResponseCookie.from(STREAM_COOKIE_NAME, streamToken)
                .httpOnly(true)
                .secure(RefreshCookieRequestSupport.shouldUseSecureAttribute(secureCookie))
                .path(cookiePath)
                .sameSite("Lax")
                .maxAge(maxAgeSeconds)
                .build();

        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
    }
}
