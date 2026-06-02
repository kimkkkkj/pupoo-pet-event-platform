package com.popups.pupoo.notification.application;

import com.popups.pupoo.auth.application.TokenService;
import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.mock.web.MockHttpServletResponse;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class NotificationStreamTokenServiceTest {

    private TokenService tokenService;
    private NotificationStreamTokenService notificationStreamTokenService;

    @BeforeEach
    void setUp() {
        tokenService = mock(TokenService.class);
        notificationStreamTokenService = new NotificationStreamTokenService(
                tokenService,
                true,
                300,
                "/api/notifications/stream"
        );
    }

    @Test
    void issuesShortLivedHttpOnlyCookieForNotificationStream() {
        when(tokenService.getAccessTtlSeconds()).thenReturn(3600L);
        when(tokenService.createAccessToken(7L, "USER", 300L)).thenReturn("stream-token");

        HttpServletResponse response = new MockHttpServletResponse();
        notificationStreamTokenService.issueCookie(response, 7L, "USER");

        verify(tokenService).createAccessToken(7L, "USER", 300L);

        String setCookie = ((MockHttpServletResponse) response).getHeader(HttpHeaders.SET_COOKIE);
        assertThat(setCookie).isNotBlank();
        assertThat(setCookie).contains("notification_stream_token=stream-token");
        assertThat(setCookie).contains("HttpOnly");
        assertThat(setCookie).contains("Secure");
        assertThat(setCookie).contains("SameSite=Lax");
        assertThat(setCookie).contains("Path=/api/notifications/stream");
        assertThat(setCookie).contains("Max-Age=300");
    }
}
