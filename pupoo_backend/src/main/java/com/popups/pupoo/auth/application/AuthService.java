// file: src/main/java/com/popups/pupoo/auth/application/AuthService.java
package com.popups.pupoo.auth.application;

import com.popups.pupoo.auth.domain.model.RefreshToken;
import com.popups.pupoo.auth.dto.LoginRequest;
import com.popups.pupoo.auth.dto.LoginResponse;
import com.popups.pupoo.auth.dto.TokenResponse;
import com.popups.pupoo.auth.persistence.RefreshTokenRepository;
import com.popups.pupoo.auth.support.RefreshCookieRequestSupport;
import com.popups.pupoo.auth.token.JwtProvider;
import com.popups.pupoo.common.exception.BusinessException;
import com.popups.pupoo.common.exception.ErrorCode;
import com.popups.pupoo.common.observability.application.OperationsMetricsService;
import com.popups.pupoo.user.application.UserService;
import com.popups.pupoo.user.domain.enums.RoleName;
import com.popups.pupoo.user.domain.enums.UserStatus;
import com.popups.pupoo.user.domain.model.User;
import com.popups.pupoo.user.dto.UserCreateRequest;
import com.popups.pupoo.user.persistence.UserRepository;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.time.LocalDateTime;

/**
 * 로그인과 토큰 발급을 담당하는 인증 코어 서비스다.
 * 사용자 상태를 검증한 뒤 access token, refresh token, refresh cookie를 일관된 정책으로 발급한다.
 */
@Service
public class AuthService {

    private static final String REFRESH_COOKIE_NAME = "refresh_token";
    private static final Logger log = LoggerFactory.getLogger(AuthService.class);

    private final UserRepository userRepository;
    private final UserService userService;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final TokenService tokenService;
    private final JwtProvider jwtProvider;
    private final EmailVerificationService emailVerificationService;
    private final OperationsMetricsService operationsMetricsService;
    private final boolean refreshCookieSecure;
    private final int refreshCookieMaxAgeSeconds;
    private final String refreshCookiePath;

    public AuthService(
            UserRepository userRepository,
            UserService userService,
            RefreshTokenRepository refreshTokenRepository,
            PasswordEncoder passwordEncoder,
            TokenService tokenService,
            JwtProvider jwtProvider,
            EmailVerificationService emailVerificationService,
            OperationsMetricsService operationsMetricsService,
            @Value("${auth.refresh.cookie.secure:true}") boolean refreshCookieSecure,
            @Value("${auth.refresh.cookie.max-age-seconds:1209600}") int refreshCookieMaxAgeSeconds,
            @Value("${auth.refresh.cookie.path:/api/auth}") String refreshCookiePath
    ) {
        this.userRepository = userRepository;
        this.userService = userService;
        this.refreshTokenRepository = refreshTokenRepository;
        this.passwordEncoder = passwordEncoder;
        this.tokenService = tokenService;
        this.jwtProvider = jwtProvider;
        this.emailVerificationService = emailVerificationService;
        this.operationsMetricsService = operationsMetricsService;
        this.refreshCookieSecure = refreshCookieSecure;
        this.refreshCookieMaxAgeSeconds = refreshCookieMaxAgeSeconds;
        this.refreshCookiePath = refreshCookiePath;
    }

    /**
     * 소셜 로그인 서비스도 동일한 사용자 상태 정책을 재사용할 수 있도록 공개 헬퍼를 제공한다.
     */
    public void validateUserStatusForAuthPublic(User user) {
        validateUserStatusForAuth(user);
    }

    /**
     * 회원가입 직후 자동 로그인까지 처리한다.
     * 계정 생성 성공 후에만 토큰을 발급하고, 커밋 이후 계정 이메일 인증 메일을 비동기 후처리로 보낸다.
     */
    @Transactional
    public LoginResponse signup(UserCreateRequest req, HttpServletResponse response) {
        User saved = userService.create(req);
        validateUserStatusForAuth(saved, "signup");

        LoginResponse loginResponse = issueTokensAndSetCookie(saved, response);
        operationsMetricsService.recordLoginSuccess("signup");
        Long userId = saved.getUserId();

        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    try {
                        emailVerificationService.requestEmailVerification(userId);
                    } catch (Throwable t) {
                        log.error("Email verification dispatch failed after signup commit. userId={}", userId, t);
                    }
                }
            });
        }

        return loginResponse;
    }

    /**
     * 이메일/비밀번호 로그인 흐름이다.
     * 사용자 상태와 비밀번호를 모두 검증한 뒤 마지막 로그인 시각을 갱신하고 토큰을 발급한다.
     */
    @Transactional
    public LoginResponse login(LoginRequest req, HttpServletResponse response) {
        User user = userRepository.findByEmail(req.getEmail())
                .orElseThrow(() -> {
                    operationsMetricsService.recordLoginFailure("password", "user_not_found");
                    return new BusinessException(ErrorCode.USER_NOT_FOUND);
                });

        validateUserStatusForAuth(user, "password");

        if (!passwordEncoder.matches(req.getPassword(), user.getPassword())) {
            operationsMetricsService.recordLoginFailure("password", "invalid_credentials");
            throw new BusinessException(ErrorCode.INVALID_CREDENTIALS);
        }

        user.setLastLoginAt(LocalDateTime.now());
        userRepository.save(user);

        LoginResponse loginResponse = issueTokensAndSetCookie(user, response);
        operationsMetricsService.recordLoginSuccess("password");
        return loginResponse;
    }

    /**
     * 카카오 등 외부 인증이 끝난 User 엔티티로 로그인 처리를 재사용한다.
     */
    @Transactional
    public LoginResponse loginByUser(User user, HttpServletResponse response) {
        validateUserStatusForAuth(user, "social");

        user.setLastLoginAt(LocalDateTime.now());
        userRepository.save(user);

        LoginResponse loginResponse = issueTokensAndSetCookie(user, response);
        operationsMetricsService.recordLoginSuccess("social");
        return loginResponse;
    }

    /**
     * refresh token rotation 정책을 적용한다.
     * 기존 refresh row를 삭제한 뒤 새 refresh token과 새 cookie를 발급하고, access token은 응답 본문으로 반환한다.
     */
    @Transactional
    public TokenResponse refreshToken(String refreshToken, HttpServletResponse response) {
        if (refreshToken == null || refreshToken.isBlank()) {
            operationsMetricsService.recordRefreshFailure("missing_cookie");
            throw new BusinessException(ErrorCode.REFRESH_TOKEN_MISSING);
        }

        RefreshToken stored = refreshTokenRepository.findByToken(refreshToken)
                .orElseThrow(() -> {
                    operationsMetricsService.recordRefreshFailure("invalid_token");
                    return new BusinessException(ErrorCode.REFRESH_TOKEN_INVALID);
                });

        try {
            jwtProvider.validateRefreshToken(refreshToken);
        } catch (BusinessException exception) {
            operationsMetricsService.recordRefreshFailure(resolveFailureReason(exception));
            throw exception;
        }

        Long userId = jwtProvider.getUserId(refreshToken);
        User user = userRepository.findById(userId)
                .orElseThrow(() -> {
                    operationsMetricsService.recordRefreshFailure("user_not_found");
                    return new BusinessException(ErrorCode.USER_NOT_FOUND);
                });

        validateUserStatusForAuth(user, "refresh");

        String roleName = user.getRoleName().name();
        String newAccess = tokenService.createAccessToken(userId, roleName);

        refreshTokenRepository.delete(stored);

        String newRefresh = tokenService.createRefreshToken(userId);
        RefreshToken newRt = new RefreshToken();
        newRt.setUserId(userId);
        newRt.setToken(newRefresh);
        newRt.setCreatedAt(LocalDateTime.now());
        newRt.setExpiredAt(LocalDateTime.now().plusSeconds(refreshCookieMaxAgeSeconds));
        refreshTokenRepository.save(newRt);

        setRefreshCookie(response, newRefresh);
        operationsMetricsService.recordRefreshSuccess();

        return new TokenResponse(newAccess);
    }

    /**
     * 로그아웃 시 refresh token 저장소와 cookie를 함께 정리한다.
     */
    @Transactional
    public void logout(String refreshToken, HttpServletResponse response) {
        if (refreshToken != null && !refreshToken.isBlank()) {
            refreshTokenRepository.findByToken(refreshToken)
                    .ifPresent(refreshTokenRepository::delete);
        }

        expireRefreshCookie(response);
    }

    /**
     * 인증 성공 후 공통으로 사용하는 토큰 발급 루틴이다.
     */
    private LoginResponse issueTokensAndSetCookie(User user, HttpServletResponse response) {
        Long userId = user.getUserId();
        String roleName = user.getRoleName().name();

        String access = tokenService.createAccessToken(userId, roleName);
        String refresh = tokenService.createRefreshToken(userId);

        RefreshToken rt = new RefreshToken();
        rt.setUserId(userId);
        rt.setToken(refresh);
        rt.setCreatedAt(LocalDateTime.now());
        rt.setExpiredAt(LocalDateTime.now().plusSeconds(refreshCookieMaxAgeSeconds));
        refreshTokenRepository.save(rt);

        setRefreshCookie(response, refresh);

        return new LoginResponse(access, userId, roleName);
    }

    /**
     * 인증 흐름에서 허용되지 않는 사용자 상태를 차단한다.
     * `DELETED`는 soft delete 상태이므로 로그인과 토큰 재발급을 모두 막고,
     * `SUSPENDED`는 제재 계정으로 별도 에러 코드를 반환한다.
     */
    private void validateUserStatusForAuth(User user) {
        normalizeLegacyAuthFields(user);

        UserStatus status = user.getStatus();
        if (status == UserStatus.DELETED) {
            throw new BusinessException(ErrorCode.USER_INACTIVE);
        }
        if (status == UserStatus.SUSPENDED) {
            throw new BusinessException(ErrorCode.USER_SUSPENDED);
        }
    }

    private void validateUserStatusForAuth(User user, String flowKind) {
        try {
            validateUserStatusForAuth(user);
        } catch (BusinessException exception) {
            recordAuthFailure(flowKind, resolveFailureReason(exception));
            throw exception;
        }
    }

    private void recordAuthFailure(String flowKind, String reason) {
        if ("refresh".equals(flowKind)) {
            operationsMetricsService.recordRefreshFailure(reason);
            return;
        }
        operationsMetricsService.recordLoginFailure(flowKind, reason);
    }

    private String resolveFailureReason(BusinessException exception) {
        if (exception == null || exception.getErrorCode() == null) {
            return "business_error";
        }

        return switch (exception.getErrorCode()) {
            case USER_NOT_FOUND -> "user_not_found";
            case INVALID_CREDENTIALS -> "invalid_credentials";
            case USER_INACTIVE -> "user_inactive";
            case USER_SUSPENDED -> "user_suspended";
            case REFRESH_TOKEN_MISSING -> "missing_cookie";
            case REFRESH_TOKEN_INVALID -> "invalid_token";
            default -> "business_error";
        };
    }

    private void normalizeLegacyAuthFields(User user) {
        boolean changed = false;

        if (user.getStatus() == null) {
            user.setStatus(UserStatus.ACTIVE);
            changed = true;
        }
        if (user.getRoleName() == null) {
            user.setRoleName(RoleName.USER);
            changed = true;
        }

        if (changed) {
            userRepository.save(user);
        }
    }

    /**
     * refresh token은 HttpOnly cookie로만 내려 인증 헤더와 분리한다.
     */
    private void setRefreshCookie(HttpServletResponse response, String token) {
        ResponseCookie cookie = ResponseCookie.from(REFRESH_COOKIE_NAME, token)
                .httpOnly(true)
                .secure(RefreshCookieRequestSupport.shouldUseSecureAttribute(refreshCookieSecure))
                .path(refreshCookiePath)
                .sameSite("Lax")
                .maxAge(refreshCookieMaxAgeSeconds)
                .build();

        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
    }

    /**
     * 로그아웃과 refresh 실패 시 기존 refresh cookie를 비운다.
     */
    private void expireRefreshCookie(HttpServletResponse response) {
        ResponseCookie cookie = ResponseCookie.from(REFRESH_COOKIE_NAME, "")
                .httpOnly(true)
                .secure(RefreshCookieRequestSupport.shouldUseSecureAttribute(refreshCookieSecure))
                .path(refreshCookiePath)
                .sameSite("Lax")
                .maxAge(0)
                .build();

        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
    }
}
