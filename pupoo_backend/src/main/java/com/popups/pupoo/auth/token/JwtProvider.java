// file: src/main/java/com/popups/pupoo/auth/token/JwtProvider.java
package com.popups.pupoo.auth.token;

public interface JwtProvider {

    String createAccessToken(Long userId, String roleName, long ttlSeconds);

    String createRefreshToken(Long userId, long ttlSeconds);

    void validateAccessToken(String token);

    void validateRefreshToken(String token);

    Long getUserId(String token);

    String getRoleName(String token);
}
