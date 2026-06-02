// file: src/main/java/com/popups/pupoo/auth/application/SignupSessionService.java
package com.popups.pupoo.auth.application;

import com.popups.pupoo.auth.domain.enums.EmailSessionStatus;
import com.popups.pupoo.auth.domain.enums.OtpSessionStatus;
import com.popups.pupoo.auth.domain.enums.SignupType;
import com.popups.pupoo.auth.domain.model.RefreshToken;
import com.popups.pupoo.auth.domain.model.SignupSession;
import com.popups.pupoo.auth.dto.EmailVerificationRequestResponse;
import com.popups.pupoo.auth.dto.LoginResponse;
import com.popups.pupoo.auth.dto.SignupCompleteRequest;
import com.popups.pupoo.auth.dto.SignupEmailConfirmRequest;
import com.popups.pupoo.auth.dto.SignupEmailRequest;
import com.popups.pupoo.auth.dto.SignupStartRequest;
import com.popups.pupoo.auth.dto.SignupStartResponse;
import com.popups.pupoo.auth.dto.SignupVerifyOtpRequest;
import com.popups.pupoo.auth.persistence.RefreshTokenRepository;
import com.popups.pupoo.auth.persistence.SignupSessionRepository;
import com.popups.pupoo.auth.port.EmailVerificationSenderPort;
import com.popups.pupoo.auth.port.SmsOtpSenderPort;
import com.popups.pupoo.auth.support.RefreshCookieRequestSupport;
import com.popups.pupoo.auth.support.VerificationHashSupport;
import com.popups.pupoo.common.exception.BusinessException;
import com.popups.pupoo.common.exception.ErrorCode;
import com.popups.pupoo.common.observability.application.OperationsMetricsService;
import com.popups.pupoo.user.application.UserService;
import com.popups.pupoo.user.domain.model.User;
import com.popups.pupoo.user.dto.UserCreateRequest;
import com.popups.pupoo.user.social.application.SocialAccountService;
import com.popups.pupoo.user.social.dto.SocialLinkRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * 회원가입 세션 기반 인증 흐름을 관리한다.
 * `signup_sessions`를 기준으로 휴대폰 OTP와 이메일 인증 상태를 분리해 저장하고,
 * 모든 검증이 끝났을 때만 실제 사용자 계정을 생성한다.
 */
@Service
public class SignupSessionService {

    private static final SecureRandom RANDOM = new SecureRandom();
    private static final String REFRESH_COOKIE_NAME = "refresh_token";

    private final SignupSessionRepository signupSessionRepository;
    private final UserService userService;
    private final SocialAccountService socialAccountService;
    private final RefreshTokenRepository refreshTokenRepository;
    private final TokenService tokenService;
    private final PasswordEncoder passwordEncoder;
    private final EmailVerificationSenderPort emailVerificationSenderPort;
    private final SmsOtpSenderPort smsOtpSenderPort;
    private final VerificationHashSupport verificationHashSupport;
    private final OperationsMetricsService operationsMetricsService;
    private final int otpTtlMinutes;
    private final int otpCooldownSeconds;
    private final int otpDailyLimit;
    private final int otpMaxFailCount;
    private final int otpBlockMinutes;
    private final int emailTtlMinutes;
    private final int emailMaxFailCount;
    private final boolean exposeDevCode;
    private final String smsProvider;
    private final boolean refreshCookieSecure;
    private final int refreshCookieMaxAgeSeconds;

    public SignupSessionService(
            SignupSessionRepository signupSessionRepository,
            UserService userService,
            SocialAccountService socialAccountService,
            RefreshTokenRepository refreshTokenRepository,
            TokenService tokenService,
            PasswordEncoder passwordEncoder,
            EmailVerificationSenderPort emailVerificationSenderPort,
            SmsOtpSenderPort smsOtpSenderPort,
            VerificationHashSupport verificationHashSupport,
            OperationsMetricsService operationsMetricsService,
            @Value("${signup.otp.ttl-minutes:5}") int otpTtlMinutes,
            @Value("${signup.otp.cooldown-seconds:60}") int otpCooldownSeconds,
            @Value("${signup.otp.daily-limit:5}") int otpDailyLimit,
            @Value("${signup.otp.max-fail-count:5}") int otpMaxFailCount,
            @Value("${signup.otp.block-minutes:15}") int otpBlockMinutes,
            @Value("${signup.email.ttl-minutes:10}") int emailTtlMinutes,
            @Value("${signup.email.max-fail-count:5}") int emailMaxFailCount,
            @Value("${verification.dev.expose:true}") boolean exposeDevCode,
            @Value("${auth.sms.provider:dev}") String smsProvider,
            @Value("${auth.refresh.cookie.secure:true}") boolean refreshCookieSecure,
            @Value("${auth.refresh.cookie.max-age-seconds:1209600}") int refreshCookieMaxAgeSeconds
    ) {
        this.signupSessionRepository = signupSessionRepository;
        this.userService = userService;
        this.socialAccountService = socialAccountService;
        this.refreshTokenRepository = refreshTokenRepository;
        this.tokenService = tokenService;
        this.passwordEncoder = passwordEncoder;
        this.emailVerificationSenderPort = emailVerificationSenderPort;
        this.smsOtpSenderPort = smsOtpSenderPort;
        this.verificationHashSupport = verificationHashSupport;
        this.operationsMetricsService = operationsMetricsService;
        this.otpTtlMinutes = otpTtlMinutes;
        this.otpCooldownSeconds = otpCooldownSeconds;
        this.otpDailyLimit = otpDailyLimit;
        this.otpMaxFailCount = otpMaxFailCount;
        this.otpBlockMinutes = otpBlockMinutes;
        this.emailTtlMinutes = emailTtlMinutes;
        this.emailMaxFailCount = emailMaxFailCount;
        this.exposeDevCode = exposeDevCode;
        this.smsProvider = smsProvider;
        this.refreshCookieSecure = refreshCookieSecure;
        this.refreshCookieMaxAgeSeconds = refreshCookieMaxAgeSeconds;
    }

    /**
     * 회원가입 시작 요청을 세션으로 고정하고 OTP를 발송한다.
     * 이 단계에서는 `users`를 만들지 않으며, 일일 발송 제한과 쿨다운 정책을 함께 적용한다.
     */
    @Transactional
    public SignupStartResponse start(SignupStartRequest request) {
        try {
            validateSalt();

        if (request == null || request.getSignupType() == null) {
            throw new BusinessException(ErrorCode.VALIDATION_FAILED);
        }

        String phone = normalizePhone(request.getPhone());
        String nickname = safeTrim(request.getNickname());

        if (nickname == null || nickname.isBlank()) {
            throw new BusinessException(ErrorCode.VALIDATION_FAILED);
        }

        if (isBlank(request.getEmail()) || isBlank(request.getPassword())) {
            throw new BusinessException(ErrorCode.VALIDATION_FAILED);
        }

        if (request.getSignupType() == SignupType.SOCIAL) {
            if (isBlank(request.getSocialProvider()) || isBlank(request.getSocialProviderUid())) {
                throw new BusinessException(ErrorCode.VALIDATION_FAILED);
            }
        }

        userService.validateSignupAvailability(request.getEmail(), nickname, phone);

        signupSessionRepository.findTopByPhoneAndOtpLastSentAtIsNotNullOrderByOtpLastSentAtDesc(phone)
                .ifPresent(latest -> {
                    LocalDateTime limit = latest.getOtpLastSentAt().plusSeconds(otpCooldownSeconds);
                    if (LocalDateTime.now().isBefore(limit)) {
                        throw new BusinessException(ErrorCode.SIGNUP_OTP_COOLDOWN);
                    }
                });

        LocalDateTime startOfDay = LocalDate.now().atStartOfDay();
        long sentToday = signupSessionRepository.countByPhoneAndOtpLastSentAtAfter(phone, startOfDay);
        if (sentToday >= otpDailyLimit) {
            throw new BusinessException(ErrorCode.SIGNUP_OTP_DAILY_LIMIT);
        }

        SignupSession session = new SignupSession();
        session.setSignupKey(UUID.randomUUID().toString());
        session.setSignupType(request.getSignupType());
        session.setEmail(safeTrim(request.getEmail()));
        session.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        session.setNickname(nickname);
        session.setPhone(phone);

        if (request.getSignupType() == SignupType.SOCIAL) {
            session.setSocialProvider(safeTrim(request.getSocialProvider()));
            session.setSocialProviderUid(safeTrim(request.getSocialProviderUid()));
            session.setEmailStatus(EmailSessionStatus.NOT_REQUIRED);
        } else {
            session.setEmailStatus(EmailSessionStatus.PENDING);
        }

        session.setOtpStatus(OtpSessionStatus.PENDING);
        session.setExpiresAt(LocalDateTime.now().plusMinutes(30));

        String otp = generateSixDigitCode();
        session.setOtpLastSentAt(LocalDateTime.now());
        session.setOtpCodeHash(verificationHashSupport.hashWithCurrentSalt(otp));
        session.setOtpExpiresAt(LocalDateTime.now().plusMinutes(otpTtlMinutes));
        session.setOtpFailCount(0);
        session.setOtpBlockedUntil(null);

        SignupSession saved = signupSessionRepository.save(session);

        // SMS 발송 구현은 Port로 분리되어 dev와 AWS SNS 중 설정값에 따라 선택된다.
        smsOtpSenderPort.sendOtp(phone, buildOtpMessage(otp, otpTtlMinutes));

        operationsMetricsService.recordSignupStartSuccess();

        int remaining = Math.max(0, otpDailyLimit - (int) (sentToday + 1));
        return new SignupStartResponse(
                saved.getSignupKey(),
                otpCooldownSeconds,
                remaining,
                saved.getExpiresAt(),
                shouldExposeSmsCode() ? otp : null
        );
        } catch (BusinessException exception) {
            operationsMetricsService.recordSignupStartFailure(resolveFailureReason(exception));
            throw exception;
        } catch (RuntimeException exception) {
            operationsMetricsService.recordSignupStartFailure("internal_error");
            throw exception;
        }
    }

    /**
     * 세션에 저장된 OTP와 입력값을 비교한다.
     * 성공 시 `otp_status`를 `VERIFIED`로 바꾸고, 실패 시 실패 횟수와 차단 시간을 갱신한다.
     */
    @Transactional
    public void verifyOtp(SignupVerifyOtpRequest request) {
        validateSalt();

        SignupSession session = getActiveSession(request == null ? null : request.getSignupKey());

        if (session.getOtpStatus() == OtpSessionStatus.VERIFIED) {
            return;
        }

        if (session.getOtpBlockedUntil() != null && LocalDateTime.now().isBefore(session.getOtpBlockedUntil())) {
            throw new BusinessException(ErrorCode.SIGNUP_OTP_BLOCKED);
        }

        if (session.getOtpExpiresAt() == null || session.getOtpExpiresAt().isBefore(LocalDateTime.now())) {
            throw new BusinessException(ErrorCode.PHONE_OTP_EXPIRED);
        }

        if (session.getOtpFailCount() >= otpMaxFailCount) {
            session.setOtpBlockedUntil(LocalDateTime.now().plusMinutes(otpBlockMinutes));
            signupSessionRepository.save(session);
            throw new BusinessException(ErrorCode.SIGNUP_OTP_BLOCKED);
        }

        String phone = normalizePhone(request.getPhone());
        if (!phone.equals(session.getPhone())) {
            throw new BusinessException(ErrorCode.VALIDATION_FAILED);
        }

        session.setOtpFailCount(session.getOtpFailCount() + 1);

        if (session.getOtpCodeHash() == null
                || !verificationHashSupport.matchesAnySalt(safeTrim(request.getOtpCode()), session.getOtpCodeHash())) {
            signupSessionRepository.save(session);
            throw new BusinessException(ErrorCode.PHONE_OTP_INVALID);
        }

        session.setOtpStatus(OtpSessionStatus.VERIFIED);
        session.setOtpVerifiedAt(LocalDateTime.now());
        session.setOtpFailCount(0);
        session.setOtpBlockedUntil(null);
        signupSessionRepository.save(session);
    }

    /**
     * 이메일 가입 세션에만 이메일 인증 코드를 발급한다.
     * 휴대폰 OTP가 검증된 뒤에만 실행되며, 메일 발송 자체는 auth 전용 Email Port로 위임한다.
     */
    @Transactional
    public EmailVerificationRequestResponse requestEmail(SignupEmailRequest request) {
        validateSalt();

        SignupSession session = getActiveSession(request == null ? null : request.getSignupKey());

        if (session.getSignupType() != SignupType.EMAIL) {
            throw new BusinessException(ErrorCode.INVALID_REQUEST);
        }

        if (session.getOtpStatus() != OtpSessionStatus.VERIFIED) {
            throw new BusinessException(ErrorCode.SIGNUP_NOT_OTP_VERIFIED);
        }

        if (session.getEmailStatus() == EmailSessionStatus.VERIFIED) {
            throw new BusinessException(ErrorCode.EMAIL_ALREADY_VERIFIED);
        }

        String code = generateSixDigitCode();
        session.setEmailCodeHash(verificationHashSupport.hashWithCurrentSalt(code));
        session.setEmailExpiresAt(LocalDateTime.now().plusMinutes(emailTtlMinutes));
        session.setEmailLastSentAt(LocalDateTime.now());
        session.setEmailFailCount(0);
        signupSessionRepository.save(session);

        emailVerificationSenderPort.sendVerificationEmail(session.getEmail(), code);

        return new EmailVerificationRequestResponse(session.getEmailExpiresAt(), exposeDevCode ? code : null);
    }

    /**
     * 이메일 인증 코드를 검증한다.
     * 성공 시 세션의 `email_status`를 `VERIFIED`로 바꾸고 검증 시각을 남긴다.
     */
    @Transactional
    public void confirmEmail(SignupEmailConfirmRequest request) {
        validateSalt();

        SignupSession session = getActiveSession(request == null ? null : request.getSignupKey());

        if (session.getSignupType() != SignupType.EMAIL) {
            throw new BusinessException(ErrorCode.INVALID_REQUEST);
        }

        if (session.getOtpStatus() != OtpSessionStatus.VERIFIED) {
            throw new BusinessException(ErrorCode.SIGNUP_NOT_OTP_VERIFIED);
        }

        if (session.getEmailStatus() == EmailSessionStatus.VERIFIED) {
            return;
        }

        if (session.getEmailExpiresAt() == null || session.getEmailExpiresAt().isBefore(LocalDateTime.now())) {
            throw new BusinessException(ErrorCode.EMAIL_VERIFICATION_TOKEN_EXPIRED);
        }

        if (session.getEmailFailCount() >= emailMaxFailCount) {
            throw new BusinessException(ErrorCode.SIGNUP_EMAIL_TOO_MANY_ATTEMPTS);
        }

        session.setEmailFailCount(session.getEmailFailCount() + 1);

        if (session.getEmailCodeHash() == null
                || !verificationHashSupport.matchesAnySalt(safeTrim(request.getCode()), session.getEmailCodeHash())) {
            signupSessionRepository.save(session);
            throw new BusinessException(ErrorCode.EMAIL_VERIFICATION_TOKEN_INVALID);
        }

        session.setEmailStatus(EmailSessionStatus.VERIFIED);
        session.setEmailVerifiedAt(LocalDateTime.now());
        signupSessionRepository.save(session);
    }

    /**
     * 검증이 끝난 세션을 실제 사용자 계정으로 승격한다.
     * 이메일 가입은 `email_status=VERIFIED`가 필수이며, 소셜 가입은 계정 생성 후 소셜 계정을 연결한다.
     */
    @Transactional
    public LoginResponse complete(SignupCompleteRequest request, HttpServletResponse response) {
        try {
            validateSalt();

        SignupSession session = getActiveSession(request == null ? null : request.getSignupKey());

        if (session.getOtpStatus() != OtpSessionStatus.VERIFIED) {
            throw new BusinessException(ErrorCode.SIGNUP_NOT_OTP_VERIFIED);
        }

        if (session.getSignupType() == SignupType.EMAIL && session.getEmailStatus() != EmailSessionStatus.VERIFIED) {
            throw new BusinessException(ErrorCode.SIGNUP_EMAIL_NOT_VERIFIED);
        }

        UserCreateRequest userCreateRequest = new UserCreateRequest();
        userCreateRequest.setEmail(session.getEmail());
        userCreateRequest.setNickname(session.getNickname());
        userCreateRequest.setPhone(session.getPhone());
        userCreateRequest.setShowAge(false);
        userCreateRequest.setShowGender(false);
        userCreateRequest.setShowPet(false);

        User saved = userService.createWithPasswordHash(userCreateRequest, session.getPasswordHash());

        if (session.getSignupType() == SignupType.SOCIAL) {
            SocialLinkRequest linkRequest = new SocialLinkRequest();
            linkRequest.setProvider(session.getSocialProvider());
            linkRequest.setProviderUid(session.getSocialProviderUid());
            socialAccountService.createMySocialAccount(saved.getUserId(), linkRequest);
        }

        Long userId = saved.getUserId();
        String roleName = saved.getRoleName().name();

        String access = tokenService.createAccessToken(userId, roleName);
        String refresh = tokenService.createRefreshToken(userId);

        RefreshToken refreshToken = new RefreshToken();
        refreshToken.setUserId(userId);
        refreshToken.setToken(refresh);
        refreshToken.setCreatedAt(LocalDateTime.now());
        refreshToken.setExpiredAt(LocalDateTime.now().plusSeconds(refreshCookieMaxAgeSeconds));
        refreshTokenRepository.save(refreshToken);

        setRefreshCookie(response, refresh);
        signupSessionRepository.delete(session);

        operationsMetricsService.recordSignupCompleteSuccess();
        operationsMetricsService.recordLoginSuccess("signup");
        return new LoginResponse(access, userId, roleName);
        } catch (BusinessException exception) {
            operationsMetricsService.recordSignupCompleteFailure(resolveFailureReason(exception));
            throw exception;
        } catch (RuntimeException exception) {
            operationsMetricsService.recordSignupCompleteFailure("internal_error");
            throw exception;
        }
    }

    /**
     * 만료되지 않은 회원가입 세션만 반환한다.
     * 세션이 만료되면 `otp_status`를 `EXPIRED`로 바꾼 뒤 예외를 던진다.
     */
    private SignupSession getActiveSession(String signupKey) {
        if (signupKey == null || signupKey.isBlank()) {
            throw new BusinessException(ErrorCode.VALIDATION_FAILED);
        }

        SignupSession session = signupSessionRepository.findBySignupKey(signupKey)
                .orElseThrow(() -> new BusinessException(ErrorCode.SIGNUP_SESSION_NOT_FOUND));

        if (session.getExpiresAt() != null && session.getExpiresAt().isBefore(LocalDateTime.now())) {
            session.setOtpStatus(OtpSessionStatus.EXPIRED);
            signupSessionRepository.save(session);
            throw new BusinessException(ErrorCode.SIGNUP_SESSION_EXPIRED);
        }

        return session;
    }

    private void validateSalt() {
        verificationHashSupport.ensureConfigured();
    }

    private String generateSixDigitCode() {
        int value = RANDOM.nextInt(900000) + 100000;
        return String.valueOf(value);
    }

    private String buildOtpMessage(String otp, int ttlMinutes) {
        return "[PUPOO] 인증번호는 " + otp + " 입니다.";
    }

    private String normalizePhone(String phone) {
        if (phone == null) {
            throw new BusinessException(ErrorCode.VALIDATION_FAILED);
        }
        return phone.replaceAll("[^0-9]", "");
    }

    private String safeTrim(String value) {
        return value == null ? null : value.trim();
    }

    private boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }

    // 기능: SMS가 dev provider면 OTP를 테스트 응답에 노출한다.
    private boolean shouldExposeSmsCode() {
        return exposeDevCode || (smsProvider != null && "dev".equalsIgnoreCase(smsProvider.trim()));
    }

    private String resolveFailureReason(BusinessException exception) {
        if (exception == null || exception.getErrorCode() == null) {
            return "business_error";
        }

        return switch (exception.getErrorCode()) {
            case VALIDATION_FAILED -> "validation_failed";
            case SIGNUP_SESSION_NOT_FOUND -> "session_not_found";
            case SIGNUP_SESSION_EXPIRED -> "session_expired";
            case SIGNUP_OTP_COOLDOWN -> "otp_cooldown";
            case SIGNUP_OTP_DAILY_LIMIT -> "otp_daily_limit";
            case SIGNUP_NOT_OTP_VERIFIED -> "otp_not_verified";
            case SIGNUP_EMAIL_NOT_VERIFIED -> "email_not_verified";
            case DUPLICATE_EMAIL -> "duplicate_email";
            case DUPLICATE_NICKNAME -> "duplicate_nickname";
            case DUPLICATE_PHONE -> "duplicate_phone";
            case SMS_SEND_FAILED -> "sms_send_failed";
            case SMS_DISABLED -> "sms_disabled";
            default -> "business_error";
        };
    }

    /**
     * 회원가입 완료 후 refresh token을 HttpOnly cookie로 내려준다.
     */
    private void setRefreshCookie(HttpServletResponse response, String token) {
        ResponseCookie cookie = ResponseCookie.from(REFRESH_COOKIE_NAME, token)
                .httpOnly(true)
                .secure(RefreshCookieRequestSupport.shouldUseSecureAttribute(refreshCookieSecure))
                .path("/api/auth")
                .sameSite("Lax")
                .maxAge(refreshCookieMaxAgeSeconds)
                .build();

        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
    }
}
