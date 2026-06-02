// file: src/main/java/com/popups/pupoo/auth/security/util/SecurityUtil.java
package com.popups.pupoo.auth.security.util;

import com.popups.pupoo.common.exception.BusinessException;
import com.popups.pupoo.common.exception.ErrorCode;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

/**
 * SecurityContextHolder 기반 현재 사용자 식별 유틸.
 *
 * 프로젝트 전제:
 * - JwtAuthenticationFilter에서 principal = userId(Long)로 세팅한다.
 */
@Component
public class SecurityUtil {

    public Long currentUserIdOrNull() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            return null;
        }

        Object principal = auth.getPrincipal();
        if (principal == null) {
            return null;
        }

        if (principal instanceof Long userId) {
            return userId;
        }

        if (principal instanceof Integer i) {
            return i.longValue();
        }

        if (principal instanceof String s) {
            if ("anonymousUser".equalsIgnoreCase(s)) {
                return null;
            }
            try {
                return Long.parseLong(s.trim());
            } catch (NumberFormatException e) {
                return null;
            }
        }

        return null;
    }

    public Long currentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();

        if (auth == null || !auth.isAuthenticated()) {
            throw new BusinessException(ErrorCode.UNAUTHORIZED);
        }

        Object principal = auth.getPrincipal();
        if (principal == null) {
            throw new BusinessException(ErrorCode.UNAUTHORIZED);
        }

        if (principal instanceof Long userId) {
            return userId;
        }

        if (principal instanceof Integer i) {
            return i.longValue();
        }

        if (principal instanceof String s) {
            if ("anonymousUser".equalsIgnoreCase(s)) {
                throw new BusinessException(ErrorCode.UNAUTHORIZED);
            }
            try {
                return Long.parseLong(s.trim());
            } catch (NumberFormatException e) {
                throw new BusinessException(ErrorCode.INVALID_REQUEST);
            }
        }

        throw new BusinessException(ErrorCode.INVALID_REQUEST);
    }

    /**
     * 현재 인증 주체가 ADMIN 권한인지 확인한다.
     * - JwtAuthenticationFilter에서 authorities = ROLE_<roleName> 형태로 세팅한다.
     */
    public boolean isAdmin() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            return false;
        }
        for (GrantedAuthority a : auth.getAuthorities()) {
            if (a == null) {
                continue;
            }
            String authority = a.getAuthority();
            if ("ROLE_ADMIN".equals(authority) || "ROLE_SUPER_ADMIN".equals(authority)) {
                return true;
            }
        }
        return false;
    }

    public String currentRoleName() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            throw new BusinessException(ErrorCode.UNAUTHORIZED);
        }

        for (GrantedAuthority authority : auth.getAuthorities()) {
            if (authority == null) {
                continue;
            }

            String value = authority.getAuthority();
            if (value != null && value.startsWith("ROLE_") && value.length() > 5) {
                return value.substring(5);
            }
        }

        throw new BusinessException(ErrorCode.INVALID_REQUEST);
    }
}
