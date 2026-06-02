// file: src/main/java/com/popups/pupoo/auth/token/JwtProviderImpl.java
package com.popups.pupoo.auth.token;

import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.List;
import java.util.stream.Stream;
import java.util.UUID;

import javax.crypto.SecretKey;

import com.popups.pupoo.auth.support.SecretRotationSupport;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import com.popups.pupoo.common.exception.BusinessException;
import com.popups.pupoo.common.exception.ErrorCode;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;

@Component
public class JwtProviderImpl implements JwtProvider {

    private final SecretKey secretKey;
    private final List<SecretKey> verificationKeys;
    private final String issuer;

    public JwtProviderImpl(
            @Value("${auth.jwt.secret}") String secret,
            @Value("${auth.jwt.previous-secrets:}") String previousSecrets,
            @Value("${auth.jwt.issuer:pupoo}") String issuer
    ) {
        this.secretKey = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.verificationKeys = buildVerificationKeys(secret, previousSecrets);
        this.issuer = issuer;
    }

    /**
     * ACCESS TOKEN
     * - subject: user_id
     * - claim: role
     */
    @Override
    public String createAccessToken(Long userId, String roleName, long ttlSeconds) {
        long now = System.currentTimeMillis();

        return Jwts.builder()
                .setIssuer(issuer)
                .setSubject(String.valueOf(userId))  // 내부 식별자
                .claim("role", roleName)            //  role은 access에만
                .setIssuedAt(new Date(now))
                .setExpiration(new Date(now + ttlSeconds * 1000))
                .signWith(secretKey, SignatureAlgorithm.HS256)
                .compact();
    }

    /**
     * REFRESH TOKEN
     * - subject: user_id
     * - role claim 없음
     */
    @Override
    public String createRefreshToken(Long userId, long ttlSeconds) {
        long now = System.currentTimeMillis();

        return Jwts.builder()
                .setIssuer(issuer)
                .setSubject(String.valueOf(userId))
                // Ensure refresh rotation always issues a unique token even within the same second.
                .setId(UUID.randomUUID().toString())
                .setIssuedAt(new Date(now))
                .setExpiration(new Date(now + ttlSeconds * 1000))
                .signWith(secretKey, SignatureAlgorithm.HS256)
                .compact();
    }

    @Override
    public void validateAccessToken(String token) {
        parseClaims(token);
    }

    @Override
    public void validateRefreshToken(String token) {
        parseClaims(token);
    }

    @Override
    public Long getUserId(String token) {
        Claims claims = parseClaims(token);
        return Long.valueOf(claims.getSubject());
    }

    /**
     * role은 access 토큰에서만 호출해야 함
     */
    @Override
    public String getRoleName(String token) {
        Claims claims = parseClaims(token);
        Object role = claims.get("role");
        if (role == null) {
            // 기능: access 토큰에서 role claim 누락
            throw new BusinessException(ErrorCode.JWT_INVALID);
        }
        return String.valueOf(role);
    }

    private Claims parseClaims(String token) {
        for (SecretKey verificationKey : verificationKeys) {
            try {
                return Jwts.parserBuilder()
                        .setSigningKey(verificationKey)
                        .requireIssuer(issuer)
                        .build()
                        .parseClaimsJws(token)
                        .getBody();
            } catch (JwtException ignored) {
                // Try rotated verification keys before failing the request.
            }
        }

        // 기능: JWT 파싱/검증 실패
        throw new BusinessException(ErrorCode.JWT_INVALID);
    }

    private List<SecretKey> buildVerificationKeys(String currentSecret, String previousSecrets) {
        return Stream.concat(
                        Stream.of(currentSecret),
                        SecretRotationSupport.parseSecretList(previousSecrets).stream()
                )
                .distinct()
                .map(secret -> Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8)))
                .toList();
    }
}
