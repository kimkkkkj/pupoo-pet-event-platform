// file: src/main/java/com/popups/pupoo/auth/security/authentication/filter/JwtAuthenticationFilter.java
package com.popups.pupoo.auth.security.authentication.filter;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.popups.pupoo.auth.token.JwtProvider;
import com.popups.pupoo.common.api.ApiResponse;
import com.popups.pupoo.common.api.ErrorResponse;
import com.popups.pupoo.common.exception.ErrorCode;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private static final String NOTIFICATION_STREAM_PATH = "/api/notifications/stream";
    private static final String NOTIFICATION_STREAM_COOKIE_NAME = "notification_stream_token";

    private final JwtProvider jwtProvider;

    /**
     * ObjectMapper는 Spring Boot가 관리하는 Bean을 주입받아 사용한다.
     * - 이유: LocalDateTime 등 Java Time 직렬화 모듈(JSR-310)이 등록된 ObjectMapper를 써야 한다.
     * - new ObjectMapper()를 쓰면 JavaTimeModule 누락으로 401 응답 직렬화 중 500이 날 수 있다.
     */
    private final ObjectMapper objectMapper;

    public JwtAuthenticationFilter(JwtProvider jwtProvider, ObjectMapper objectMapper) {
        this.jwtProvider = jwtProvider;
        this.objectMapper = objectMapper;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {

        try {
            String accessToken = resolveBearerToken(request);

            // 인증 토큰이 없으면 미인증 상태로 다음 필터로 넘긴다.
            if (accessToken == null) {
                filterChain.doFilter(request, response);
                return;
            }

            // 토큰이 있는 요청은 strict 정책으로 검증 실패 시 즉시 401 처리한다.
            jwtProvider.validateAccessToken(accessToken);

            Long userId = jwtProvider.getUserId(accessToken);
            String roleName = jwtProvider.getRoleName(accessToken);

            var authorities = List.of(new SimpleGrantedAuthority("ROLE_" + roleName));
            var authentication = new UsernamePasswordAuthenticationToken(userId, null, authorities);
            SecurityContextHolder.getContext().setAuthentication(authentication);

            filterChain.doFilter(request, response);
        } catch (Exception e) {
            SecurityContextHolder.clearContext();
            writeUnauthorized(response, request);
        }
    }

    /**
     * Bearer 토큰 추출
     * - Authorization 헤더 없으면 null (anonymous 처리)
     * - SSE 스트림은 전용 HttpOnly cookie를 보조로 허용
     * - 헤더가 있는데 형식이 다르면 strict 401
     */
    private String resolveBearerToken(HttpServletRequest request) {
        String header = request.getHeader("Authorization");

        if (header == null || header.isBlank()) {
            String streamToken = resolveNotificationStreamToken(request);
            if (streamToken != null) {
                return streamToken;
            }
            return null;
        }

        if (!header.startsWith("Bearer ")) {
            throw new IllegalArgumentException("Invalid Authorization header format");
        }

        String token = header.substring(7).trim();
        if (token.isEmpty()) {
            throw new IllegalArgumentException("Empty Bearer token");
        }

        return token;
    }

    private String resolveNotificationStreamToken(HttpServletRequest request) {
        if (!NOTIFICATION_STREAM_PATH.equals(request.getRequestURI())) {
            return null;
        }

        Cookie[] cookies = request.getCookies();
        if (cookies == null) {
            return null;
        }

        for (Cookie cookie : cookies) {
            if (!NOTIFICATION_STREAM_COOKIE_NAME.equals(cookie.getName())) {
                continue;
            }

            String token = cookie.getValue();
            if (token != null && !token.isBlank()) {
                return token.trim();
            }
        }

        return null;
    }

    private void writeUnauthorized(HttpServletResponse response, HttpServletRequest request) throws IOException {
        ErrorCode code = ErrorCode.JWT_INVALID;

        response.setStatus(code.getStatus().value());
        response.setCharacterEncoding("UTF-8");
        response.setContentType("application/json");

        ErrorResponse error = new ErrorResponse(
                code.getCode(),
                code.getMessage(),
                code.getStatus().value(),
                request.getRequestURI()
        );

        ApiResponse<Object> body = ApiResponse.fail(error);
        response.getWriter().write(objectMapper.writeValueAsString(body));
    }

    /**
     * JWT 필터를 타지 않아도 되는 경로
     * - /api/auth/** : 로그인/refresh/logout/OAuth
     * - OPTIONS : 프리플라이트
     * - swagger/actuator : 운영 점검용
     */
    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI();

        if (HttpMethod.OPTIONS.matches(request.getMethod())) {
            return true;
        }

        if (path.startsWith("/api/auth/")) {
            return true;
        }

        if (path.startsWith("/swagger-ui/")
                || path.startsWith("/v3/api-docs/")
                || path.equals("/actuator/health")
                || path.startsWith("/actuator/health/")
                || path.equals("/api/ping")
                || path.equals("/error")) {
            return true;
        }

        return false;
    }
}
