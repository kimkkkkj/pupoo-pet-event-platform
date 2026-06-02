// file: src/main/java/com/popups/pupoo/auth/security/authentication/filter/JwtExceptionFilter.java
package com.popups.pupoo.auth.security.authentication.filter;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.popups.pupoo.common.api.ErrorResponse;
import com.popups.pupoo.common.exception.ErrorCode;
import io.jsonwebtoken.JwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.MediaType;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * JWT 처리 중 발생하는 예외를 JSON 응답으로 변환하는 필터.
 *
 * 의도
 * - JwtAuthenticationFilter 등에서 던진 JwtException을 공통 에러 포맷으로 내려준다.
 * - Security ExceptionTranslationFilter보다 앞단에서 동작하도록 SecurityConfig에 배치한다.
 */
public class JwtExceptionFilter extends OncePerRequestFilter {

    private final ObjectMapper objectMapper;

    public JwtExceptionFilter(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        try {
            filterChain.doFilter(request, response);
        } catch (JwtException ex) {
            // JWT 서명/만료/형식 오류 등
            writeError(response, request, ErrorCode.JWT_INVALID, ex.getMessage());
        }
    }

    private void writeError(HttpServletResponse response, HttpServletRequest request, ErrorCode errorCode, String message) throws IOException {
        response.setStatus(errorCode.getStatus().value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding("UTF-8");

        ErrorResponse body = new ErrorResponse(
                errorCode.getCode(),
                (message == null || message.isBlank()) ? errorCode.getMessage() : message,
                errorCode.getStatus().value(),
                request.getRequestURI()
        );

        response.getWriter().write(objectMapper.writeValueAsString(body));
    }
}
