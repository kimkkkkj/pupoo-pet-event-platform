// file: src/main/java/com/popups/pupoo/auth/domain/enums/TokenType.java
package com.popups.pupoo.auth.domain.enums;

/**
 * 토큰 종류.
 * - ACCESS: Authorization 헤더로 전달
 * - REFRESH: HttpOnly 쿠키(refresh_token)로 전달
 */
public enum TokenType {
    ACCESS,
    REFRESH
}
