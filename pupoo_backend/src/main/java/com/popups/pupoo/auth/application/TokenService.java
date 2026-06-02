// file: src/main/java/com/popups/pupoo/auth/application/TokenService.java
package com.popups.pupoo.auth.application;

import com.popups.pupoo.auth.token.JwtProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class TokenService {

    private final JwtProvider jwtProvider;
    private final long accessTtlSeconds;
    private final long refreshTtlSeconds;

    public TokenService(
            JwtProvider jwtProvider,
            @Value("${auth.access.ttl-seconds:3600}") long accessTtlSeconds,
            @Value("${auth.refresh.ttl-seconds:1209600}") long refreshTtlSeconds
    ) {
        this.jwtProvider = jwtProvider;
        this.accessTtlSeconds = accessTtlSeconds;
        this.refreshTtlSeconds = refreshTtlSeconds;
    }

    public String createAccessToken(Long userId, String roleName) {
        return jwtProvider.createAccessToken(userId, roleName, accessTtlSeconds);
    }

    public String createAccessToken(Long userId, String roleName, long ttlSeconds) {
        return jwtProvider.createAccessToken(userId, roleName, ttlSeconds);
    }

    public String createRefreshToken(Long userId) {
        return jwtProvider.createRefreshToken(userId, refreshTtlSeconds);
    }

    public long getAccessTtlSeconds() {
        return accessTtlSeconds;
    }

    public long getRefreshTtlSeconds() {
        return refreshTtlSeconds;
    }
}
