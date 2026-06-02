// file: src/main/java/com/popups/pupoo/auth/security/authorization/EndpointPolicy.java
package com.popups.pupoo.auth.security.authorization;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpMethod;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.regex.Pattern;

/**
 * 엔드포인트 접근 정책
 *
 * 공개(permitAll) 정책(확정)
 * - 게시글/공지사항/이벤트/프로그램/부스 "조회(GET)"만 공개
 *   - 공개 범위는 "목록 + 상세"로 제한한다. (하위 리소스/관리/신청/대기열 등은 인증 필요)
 * - 인증 관련 엔드포인트(로그인/리프레시/로그아웃/회원가입)는 예외적으로 공개
 * - 그 외 모든 요청은 인증 필요
 */
@Component
public class EndpointPolicy {

    /**
     * 인증 없이 접근을 허용할 POST 엔드포인트
     * - 인증 기능 자체는 PUBLIC 예외로 허용한다.
     */
    private static final List<String> PUBLIC_POST_ENDPOINTS = List.of(
            "/api/auth/login",
            "/api/auth/refresh",
            "/api/auth/logout",
            "/api/auth/sms/send",
            "/api/auth/sms/verify",

            "/api/auth/signup/start",
            "/api/auth/signup/verify-otp",
            "/api/auth/signup/email/request",
            "/api/auth/signup/email/confirm",
            "/api/auth/signup/complete"
    );

    /**
     * 인증 없이 접근을 허용할 GET 엔드포인트(정규식)
     * - 조회 전용 PUBLIC 정책(게시글/공지사항/이벤트/프로그램/부스)
     * - 반드시 목록/상세만 허용한다.
     */
    private static final List<Pattern> PUBLIC_GET_PATTERNS = List.of(
            Pattern.compile("^/api/posts(?:/\\d+)?$"),
            Pattern.compile("^/api/notices(?:/\\d+)?$"),
            Pattern.compile("^/api/events(?:/\\d+)?$"),
            Pattern.compile("^/api/programs(?:/\\d+)?$"),
            Pattern.compile("^/api/speakers(?:/\\d+)?$"),
            Pattern.compile("^/api/booths(?:/\\d+)?$"),

            // 운영/문서
            Pattern.compile("^/actuator/health(?:/.*)?$"),
            Pattern.compile("^/swagger-ui(?:/.*)?$"),
            Pattern.compile("^/v3/api-docs(?:/.*)?$"),
            Pattern.compile("^/api/ping$")
    );

    /**
     * 요청이 PUBLIC(permitAll)인지 판단한다.
     */
    public boolean isPublic(HttpServletRequest request) {
        String method = request.getMethod();
        String path = normalizePath(request.getRequestURI());

        if (HttpMethod.GET.matches(method)) {
            return matchesAny(path, PUBLIC_GET_PATTERNS);
        }

        if (HttpMethod.POST.matches(method)) {
            return PUBLIC_POST_ENDPOINTS.contains(path);
        }

        return false;
    }

    private boolean matchesAny(String path, List<Pattern> patterns) {
        for (Pattern p : patterns) {
            if (p.matcher(path).matches()) {
                return true;
            }
        }
        return false;
    }

    private String normalizePath(String uri) {
        if (uri == null || uri.isBlank()) return "/";
        int q = uri.indexOf('?');
        return q >= 0 ? uri.substring(0, q) : uri;
    }
}
