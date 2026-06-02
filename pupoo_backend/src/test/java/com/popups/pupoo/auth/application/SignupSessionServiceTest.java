package com.popups.pupoo.auth.application;

import com.popups.pupoo.auth.domain.enums.SignupType;
import com.popups.pupoo.auth.dto.SignupStartRequest;
import com.popups.pupoo.auth.persistence.RefreshTokenRepository;
import com.popups.pupoo.auth.persistence.SignupSessionRepository;
import com.popups.pupoo.auth.port.EmailVerificationSenderPort;
import com.popups.pupoo.auth.port.SmsOtpSenderPort;
import com.popups.pupoo.auth.support.VerificationHashSupport;
import com.popups.pupoo.common.exception.BusinessException;
import com.popups.pupoo.common.exception.ErrorCode;
import com.popups.pupoo.common.observability.application.OperationsMetricsService;
import com.popups.pupoo.user.application.UserService;
import com.popups.pupoo.user.social.application.SocialAccountService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.password.PasswordEncoder;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;

class SignupSessionServiceTest {

    private SignupSessionRepository signupSessionRepository;
    private UserService userService;
    private PasswordEncoder passwordEncoder;
    private SmsOtpSenderPort smsOtpSenderPort;
    private SignupSessionService signupSessionService;

    @BeforeEach
    void setUp() {
        signupSessionRepository = mock(SignupSessionRepository.class);
        userService = mock(UserService.class);
        SocialAccountService socialAccountService = mock(SocialAccountService.class);
        RefreshTokenRepository refreshTokenRepository = mock(RefreshTokenRepository.class);
        TokenService tokenService = mock(TokenService.class);
        passwordEncoder = mock(PasswordEncoder.class);
        EmailVerificationSenderPort emailVerificationSenderPort = mock(EmailVerificationSenderPort.class);
        smsOtpSenderPort = mock(SmsOtpSenderPort.class);
        VerificationHashSupport verificationHashSupport = new VerificationHashSupport("test-salt", "");
        OperationsMetricsService operationsMetricsService = mock(OperationsMetricsService.class);

        signupSessionService = new SignupSessionService(
                signupSessionRepository,
                userService,
                socialAccountService,
                refreshTokenRepository,
                tokenService,
                passwordEncoder,
                emailVerificationSenderPort,
                smsOtpSenderPort,
                verificationHashSupport,
                operationsMetricsService,
                5,
                60,
                5,
                5,
                15,
                10,
                5,
                true,
                "dev",
                true,
                1209600
        );
    }

    @Test
    void startRejectsDuplicatePhoneBeforeCreatingSessionOrSendingOtp() {
        SignupStartRequest request = new SignupStartRequest();
        request.setSignupType(SignupType.EMAIL);
        request.setEmail("tester@example.com");
        request.setPassword("password");
        request.setNickname("tester");
        request.setPhone("+82 10-1234-5678");

        doThrow(new BusinessException(ErrorCode.DUPLICATE_PHONE, "이미 가입된 전화번호입니다."))
                .when(userService)
                .validateSignupAvailability("tester@example.com", "tester", "821012345678");

        BusinessException exception = assertThrows(
                BusinessException.class,
                () -> signupSessionService.start(request)
        );

        assertThat(exception.getErrorCode()).isEqualTo(ErrorCode.DUPLICATE_PHONE);
        assertThat(exception.getMessage()).isEqualTo("이미 가입된 전화번호입니다.");
        verify(userService).validateSignupAvailability("tester@example.com", "tester", "821012345678");
        verify(signupSessionRepository, never()).findTopByPhoneAndOtpLastSentAtIsNotNullOrderByOtpLastSentAtDesc(anyString());
        verify(signupSessionRepository, never()).save(org.mockito.ArgumentMatchers.any());
        verify(passwordEncoder, never()).encode(anyString());
        verifyNoInteractions(smsOtpSenderPort);
    }
}
