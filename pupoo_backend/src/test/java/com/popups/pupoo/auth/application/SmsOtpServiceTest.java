package com.popups.pupoo.auth.application;

import com.popups.pupoo.auth.config.AuthProperties;
import com.popups.pupoo.auth.dto.SmsOtpSendRequest;
import com.popups.pupoo.auth.dto.SmsOtpVerifyRequest;
import com.popups.pupoo.auth.persistence.SmsOtpRedisRepository;
import com.popups.pupoo.auth.port.SmsOtpSenderPort;
import com.popups.pupoo.auth.support.VerificationHashSupport;
import com.popups.pupoo.common.exception.BusinessException;
import com.popups.pupoo.common.exception.ErrorCode;
import com.popups.pupoo.common.util.HashUtil;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.time.Duration;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class SmsOtpServiceTest {

    private static final Pattern CODE_PATTERN = Pattern.compile("(\\d{6})");

    private SmsOtpRedisRepository smsOtpRedisRepository;
    private SmsOtpSenderPort smsOtpSenderPort;
    private SmsOtpService smsOtpService;

    @BeforeEach
    void setUp() {
        smsOtpRedisRepository = mock(SmsOtpRedisRepository.class);
        smsOtpSenderPort = mock(SmsOtpSenderPort.class);

        AuthProperties authProperties = new AuthProperties();
        authProperties.getSms().setEnabled(true);
        authProperties.getSms().setOtpExpirySeconds(300);
        authProperties.getSms().setResendCooldownSeconds(60);
        authProperties.getSms().setMaxRequestsPerMinute(3);
        authProperties.getSms().setMaxRequestsPerDay(5);
        authProperties.getSms().setMaxVerifyFailures(3);

        smsOtpService = new SmsOtpService(
                smsOtpRedisRepository,
                smsOtpSenderPort,
                authProperties,
                new VerificationHashSupport("test-salt", ""),
                "Asia/Seoul"
        );
    }

    @Test
    void sendsOtpAfterNormalizingPhoneNumber() {
        when(smsOtpRedisRepository.hasCooldown("+821012345678")).thenReturn(false);
        when(smsOtpRedisRepository.incrementMinuteRequestCount(eq("+821012345678"), any(Duration.class))).thenReturn(1L);
        when(smsOtpRedisRepository.incrementDailyRequestCount(eq("+821012345678"), any())).thenReturn(1L);

        smsOtpService.sendOtp(new SmsOtpSendRequest("010-1234-5678"));

        ArgumentCaptor<String> messageCaptor = ArgumentCaptor.forClass(String.class);
        verify(smsOtpSenderPort).sendOtp(eq("+821012345678"), messageCaptor.capture());
        assertEquals("[PUPOO] 인증번호는 " + extractCode(messageCaptor.getValue()) + " 입니다.", messageCaptor.getValue());
        verify(smsOtpRedisRepository).saveOtp(eq("+821012345678"), anyString(), eq(Duration.ofSeconds(300)), eq(Duration.ofDays(1)));
    }

    @Test
    void rejectsSendWhenCooldownExists() {
        when(smsOtpRedisRepository.hasCooldown("+821012345678")).thenReturn(true);

        BusinessException exception = assertThrows(
                BusinessException.class,
                () -> smsOtpService.sendOtp(new SmsOtpSendRequest("01012345678"))
        );

        assertEquals(ErrorCode.SMS_OTP_COOLDOWN, exception.getErrorCode());
        verify(smsOtpSenderPort, never()).sendOtp(anyString(), anyString());
    }

    @Test
    void throwsExpiredWhenOtpAlreadyIssuedButMissing() {
        when(smsOtpRedisRepository.getFailureCount("+821012345678")).thenReturn(0);
        when(smsOtpRedisRepository.findOtpHash("+821012345678")).thenReturn(Optional.empty());
        when(smsOtpRedisRepository.hasIssuedMarker("+821012345678")).thenReturn(true);

        BusinessException exception = assertThrows(
                BusinessException.class,
                () -> smsOtpService.verifyOtp(new SmsOtpVerifyRequest("01012345678", "123456"))
        );

        assertEquals(ErrorCode.PHONE_OTP_EXPIRED, exception.getErrorCode());
    }

    @Test
    void throwsMismatchWhenOtpCodeDoesNotMatch() {
        when(smsOtpRedisRepository.getFailureCount("+821012345678")).thenReturn(0);
        when(smsOtpRedisRepository.findOtpHash("+821012345678"))
                .thenReturn(Optional.of(HashUtil.sha256Hex("654321" + "test-salt")));
        when(smsOtpRedisRepository.incrementFailureCount(eq("+821012345678"), eq(Duration.ofSeconds(300)))).thenReturn(1);

        BusinessException exception = assertThrows(
                BusinessException.class,
                () -> smsOtpService.verifyOtp(new SmsOtpVerifyRequest("01012345678", "123456"))
        );

        assertEquals(ErrorCode.SMS_OTP_MISMATCH, exception.getErrorCode());
    }

    @Test
    void clearsOtpWhenVerificationSucceeds() {
        when(smsOtpRedisRepository.getFailureCount("+821012345678")).thenReturn(0);
        when(smsOtpRedisRepository.findOtpHash("+821012345678"))
                .thenReturn(Optional.of(HashUtil.sha256Hex("123456" + "test-salt")));

        smsOtpService.verifyOtp(new SmsOtpVerifyRequest("01012345678", "123456"));

        verify(smsOtpRedisRepository).clearVerificationState("+821012345678");
    }

    @Test
    void clearsOtpStateWhenSmsSendFails() {
        when(smsOtpRedisRepository.hasCooldown("+821012345678")).thenReturn(false);
        when(smsOtpRedisRepository.incrementMinuteRequestCount(eq("+821012345678"), any(Duration.class))).thenReturn(1L);
        when(smsOtpRedisRepository.incrementDailyRequestCount(eq("+821012345678"), any())).thenReturn(1L);
        doThrow(new BusinessException(ErrorCode.SMS_SEND_FAILED, "인증번호 문자 발송에 실패했습니다."))
                .when(smsOtpSenderPort)
                .sendOtp(eq("+821012345678"), anyString());

        assertThrows(BusinessException.class, () -> smsOtpService.sendOtp(new SmsOtpSendRequest("01012345678")));

        verify(smsOtpRedisRepository).clearOtpAfterSendFailure("+821012345678");
    }

    private String extractCode(String message) {
        Matcher matcher = CODE_PATTERN.matcher(message);
        if (!matcher.find()) {
            throw new IllegalStateException("OTP code not found");
        }
        return matcher.group(1);
    }
}
