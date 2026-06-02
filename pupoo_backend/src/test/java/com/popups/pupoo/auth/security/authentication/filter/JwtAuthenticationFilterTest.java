package com.popups.pupoo.auth.security.authentication.filter;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.popups.pupoo.auth.token.JwtProvider;
import jakarta.servlet.ServletException;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

import java.io.IOException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class JwtAuthenticationFilterTest {

    private JwtProvider jwtProvider;
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    @BeforeEach
    void setUp() {
        SecurityContextHolder.clearContext();
        jwtProvider = mock(JwtProvider.class);
        jwtAuthenticationFilter = new JwtAuthenticationFilter(jwtProvider, new ObjectMapper());
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void authenticatesNotificationStreamRequestUsingDedicatedCookie() throws ServletException, IOException {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/notifications/stream");
        request.setCookies(new jakarta.servlet.http.Cookie("notification_stream_token", "stream-cookie-token"));
        MockHttpServletResponse response = new MockHttpServletResponse();

        when(jwtProvider.getUserId("stream-cookie-token")).thenReturn(12L);
        when(jwtProvider.getRoleName("stream-cookie-token")).thenReturn("USER");

        jwtAuthenticationFilter.doFilter(request, response, new MockFilterChain());

        verify(jwtProvider).validateAccessToken("stream-cookie-token");
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        assertThat(authentication).isNotNull();
        assertThat(authentication.getPrincipal()).isEqualTo(12L);
        assertThat(authentication.getAuthorities())
                .extracting("authority")
                .containsExactly("ROLE_USER");
    }

    @Test
    void ignoresLegacyQueryStringTokenForNotificationStream() throws ServletException, IOException {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/notifications/stream");
        request.setQueryString("access_token=legacy-query-token");
        request.addParameter("access_token", "legacy-query-token");
        MockHttpServletResponse response = new MockHttpServletResponse();

        jwtAuthenticationFilter.doFilter(request, response, new MockFilterChain());

        verify(jwtProvider, never()).validateAccessToken("legacy-query-token");
        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
        assertThat(response.getStatus()).isEqualTo(200);
    }
}
