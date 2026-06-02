package com.popups.pupoo.auth.application;

import com.popups.pupoo.auth.config.AuthProperties;
import com.popups.pupoo.auth.dto.SmsOtpSendRequest;
import com.popups.pupoo.auth.dto.SmsOtpVerifyRequest;
import com.popups.pupoo.auth.persistence.SmsOtpRedisRepository;
import com.popups.pupoo.auth.port.SmsOtpSenderPort;
import com.popups.pupoo.auth.support.KoreanPhoneNumberNormalizer;
import com.popups.pupoo.auth.support.VerificationHashSupport;
import com.popups.pupoo.common.exception.BusinessException;
import com.popups.pupoo.common.exception.ErrorCode;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.ZoneId;

@Service
public class SmsOtpService {

    private static final SecureRandom RANDOM = new SecureRandom();
    private static final Duration ISSUED_MARKER_TTL = Duration.ofDays(1);

    private final SmsOtpRedisRepository smsOtpRedisRepository;
    private final SmsOtpSenderPort smsOtpSenderPort;
    private final AuthProperties authProperties;
    private final VerificationHashSupport verificationHashSupport;
    private final ZoneId zoneId;

    public SmsOtpService(
            SmsOtpRedisRepository smsOtpRedisRepository,
            SmsOtpSenderPort smsOtpSenderPort,
            AuthProperties authProperties,
            VerificationHashSupport verificationHashSupport,
            @Value("${app.timezone:Asia/Seoul}") String zoneId
    ) {
        this.smsOtpRedisRepository = smsOtpRedisRepository;
        this.smsOtpSenderPort = smsOtpSenderPort;
        this.authProperties = authProperties;
        this.verificationHashSupport = verificationHashSupport;
        this.zoneId = ZoneId.of(zoneId);
    }

    public void sendOtp(SmsOtpSendRequest request) {
        validateHashSalt();
        validateSmsEnabled();

        String phoneNumber = KoreanPhoneNumberNormalizer.normalizeToE164(request == null ? null : request.getPhoneNumber());
        AuthProperties.Sms sms = authProperties.getSms();

        if (smsOtpRedisRepository.hasCooldown(phoneNumber)) {
            throw new BusinessException(ErrorCode.SMS_OTP_COOLDOWN, "인증번호 재전송 가능 시간이 아직 지나지 않았습니다.");
        }

        long minuteCount = smsOtpRedisRepository.incrementMinuteRequestCount(phoneNumber, Duration.ofMinutes(1));
        if (minuteCount > sms.getMaxRequestsPerMinute()) {
            throw new BusinessException(ErrorCode.SMS_OTP_REQUEST_LIMIT, "분당 인증번호 요청 횟수를 초과했습니다.");
        }

        long dailyCount = smsOtpRedisRepository.incrementDailyRequestCount(phoneNumber, zoneId);
        if (dailyCount > sms.getMaxRequestsPerDay()) {
            throw new BusinessException(ErrorCode.SMS_OTP_REQUEST_LIMIT, "일일 인증번호 요청 횟수를 초과했습니다.");
        }

        String code = generateSixDigitCode();
        Duration otpTtl = Duration.ofSeconds(sms.getOtpExpirySeconds());

        smsOtpRedisRepository.saveOtp(
                phoneNumber,
                verificationHashSupport.hashWithCurrentSalt(code),
                otpTtl,
                ISSUED_MARKER_TTL
        );
        smsOtpRedisRepository.clearFailureCount(phoneNumber);
        smsOtpRedisRepository.setCooldown(phoneNumber, Duration.ofSeconds(sms.getResendCooldownSeconds()));

        try {
            smsOtpSenderPort.sendOtp(phoneNumber, buildOtpMessage(code));
        } catch (RuntimeException e) {
            smsOtpRedisRepository.clearOtpAfterSendFailure(phoneNumber);
            throw e;
        }
    }

    public void verifyOtp(SmsOtpVerifyRequest request) {
        validateHashSalt();

        String phoneNumber = KoreanPhoneNumberNormalizer.normalizeToE164(request == null ? null : request.getPhoneNumber());
        AuthProperties.Sms sms = authProperties.getSms();

        if (smsOtpRedisRepository.getFailureCount(phoneNumber) >= sms.getMaxVerifyFailures()) {
            throw new BusinessException(ErrorCode.SMS_OTP_VERIFY_BLOCKED, "인증번호 검증 실패 횟수를 초과했습니다.");
        }

        String storedHash = smsOtpRedisRepository.findOtpHash(phoneNumber)
                .orElseGet(() -> {
                    if (smsOtpRedisRepository.hasIssuedMarker(phoneNumber)) {
                        throw new BusinessException(ErrorCode.PHONE_OTP_EXPIRED, "인증번호가 만료되었습니다.");
                    }
                    throw new BusinessException(ErrorCode.SMS_OTP_NOT_FOUND, "발급된 인증번호가 없습니다.");
                });

        String code = request == null ? null : request.getCode();
        if (code == null || !code.matches("\\d{6}")) {
            throw new BusinessException(ErrorCode.VALIDATION_FAILED, "인증번호는 숫자 6자리여야 합니다.");
        }

        if (!verificationHashSupport.matchesAnySalt(code, storedHash)) {
            int failureCount = smsOtpRedisRepository.incrementFailureCount(
                    phoneNumber,
                    Duration.ofSeconds(sms.getOtpExpirySeconds())
            );
            if (failureCount >= sms.getMaxVerifyFailures()) {
                throw new BusinessException(ErrorCode.SMS_OTP_VERIFY_BLOCKED, "인증번호 검증 실패 횟수를 초과했습니다.");
            }
            throw new BusinessException(ErrorCode.SMS_OTP_MISMATCH, "인증번호가 일치하지 않습니다.");
        }

        smsOtpRedisRepository.clearVerificationState(phoneNumber);
    }

    private void validateHashSalt() {
        verificationHashSupport.ensureConfigured();
    }

    private void validateSmsEnabled() {
        if (!authProperties.getSms().isEnabled()) {
            throw new BusinessException(ErrorCode.SMS_DISABLED, "SMS 발송이 비활성화되어 있습니다.");
        }
    }

    private String generateSixDigitCode() {
        return String.valueOf(RANDOM.nextInt(900000) + 100000);
    }

    private String buildOtpMessage(String code) {
        return "[PUPOO] 인증번호는 " + code + " 입니다.";
    }
}
