// file: src/main/java/com/popups/pupoo/auth/application/PhoneVerificationService.java
package com.popups.pupoo.auth.application;

import com.popups.pupoo.auth.domain.model.PhoneVerificationToken;
import com.popups.pupoo.auth.dto.PhoneVerificationConfirmRequest;
import com.popups.pupoo.auth.dto.PhoneVerificationRequest;
import com.popups.pupoo.auth.dto.PhoneVerificationRequestResponse;
import com.popups.pupoo.auth.persistence.PhoneVerificationTokenRepository;
import com.popups.pupoo.auth.port.SmsOtpSenderPort;
import com.popups.pupoo.auth.support.VerificationHashSupport;
import com.popups.pupoo.common.exception.BusinessException;
import com.popups.pupoo.common.exception.ErrorCode;
import com.popups.pupoo.user.domain.model.User;
import com.popups.pupoo.user.persistence.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;

/**
 * 기능: 사용자 휴대폰 인증과 휴대폰 번호 변경 인증을 처리한다.
 * 설명: OTP 생성과 검증 책임은 서비스에 두고 실제 SMS 발송은 포트 뒤로 분리한다.
 * 흐름: requestPhoneVerification/requestPhoneChange -> confirmPhoneVerification/confirmPhoneChange 순서로 동작한다.
 */
@Service
public class PhoneVerificationService {

    private static final SecureRandom RANDOM = new SecureRandom();

    private final UserRepository userRepository;
    private final PhoneVerificationTokenRepository tokenRepository;
    private final SmsOtpSenderPort smsOtpSenderPort;

    private final VerificationHashSupport verificationHashSupport;
    private final int otpTtlMinutes;
    private final int requestCooldownSeconds;
    private final int maxAttempts;
    private final boolean exposeDevCode;
    private final String smsProvider;

    public PhoneVerificationService(
            UserRepository userRepository,
            PhoneVerificationTokenRepository tokenRepository,
            SmsOtpSenderPort smsOtpSenderPort,
            VerificationHashSupport verificationHashSupport,
            @Value("${verification.phone.ttl-minutes:5}") int otpTtlMinutes,
            @Value("${verification.request.cooldown-seconds:60}") int requestCooldownSeconds,
            @Value("${verification.phone.max-attempts:5}") int maxAttempts,
            @Value("${verification.dev.expose:true}") boolean exposeDevCode,
            @Value("${auth.sms.provider:dev}") String smsProvider
    ) {
        this.userRepository = userRepository;
        this.tokenRepository = tokenRepository;
        this.smsOtpSenderPort = smsOtpSenderPort;
        this.verificationHashSupport = verificationHashSupport;
        this.otpTtlMinutes = otpTtlMinutes;
        this.requestCooldownSeconds = requestCooldownSeconds;
        this.maxAttempts = maxAttempts;
        this.exposeDevCode = exposeDevCode;
        this.smsProvider = smsProvider;
    }

    /**
     * 기능: 현재 사용자 휴대폰 인증 OTP를 발급한다.
     * 설명: phone_verified 상태와 쿨다운을 확인한 뒤 OTP를 저장하고 SMS 발송 포트를 호출한다.
     * 흐름: 사용자 조회 -> 상태 확인 -> OTP 생성/저장 -> SMS 포트 호출 -> 응답 반환 순서다.
     */
    @Transactional
    public PhoneVerificationRequestResponse requestPhoneVerification(Long userId, PhoneVerificationRequest request) {
        validateHashSalt();

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_PROFILE_NOT_FOUND));

        if (user.isPhoneVerified()) {
            throw new BusinessException(ErrorCode.PHONE_ALREADY_VERIFIED);
        }

        String phone = normalizePhone(request.getPhone());

        tokenRepository.findTopByUserIdAndPhoneAndUsedAtIsNullOrderByCreatedAtDesc(userId, phone).ifPresent(latest -> {
            LocalDateTime cooldownLimit = latest.getCreatedAt().plusSeconds(requestCooldownSeconds);
            if (LocalDateTime.now().isBefore(cooldownLimit)) {
                throw new BusinessException(ErrorCode.VERIFICATION_TOO_MANY_REQUESTS);
            }
        });

        String code = generateSixDigitCode();
        String codeHash = verificationHashSupport.hashWithCurrentSalt(code);

        LocalDateTime expiresAt = LocalDateTime.now().plusMinutes(otpTtlMinutes);
        tokenRepository.save(new PhoneVerificationToken(userId, phone, codeHash, expiresAt));

        // 기능: 휴대폰 OTP 발송 구현을 포트 뒤로 숨겨 provider 전환 시 서비스 코드를 고정한다.
        // 설명: 인증 서비스는 번호와 메시지만 전달하고 실제 AWS SNS 또는 dev 로그 처리는 어댑터가 맡는다.
        // 흐름: OTP 저장 후 포트에 메시지를 전달한다.
        smsOtpSenderPort.sendOtp(phone, buildOtpMessage(code));

        return new PhoneVerificationRequestResponse(expiresAt, shouldExposeSmsCode() ? code : null);
    }

    /**
     * 기능: 휴대폰 번호 변경용 OTP를 발급한다.
     * 설명: 현재 번호와 중복 여부를 확인한 뒤 새 번호로 OTP를 저장하고 발송한다.
     * 흐름: 사용자 조회 -> 번호 검증 -> OTP 저장 -> SMS 포트 호출 -> 응답 반환 순서다.
     */
    @Transactional
    public PhoneVerificationRequestResponse requestPhoneChange(Long userId, PhoneVerificationRequest request) {
        validateHashSalt();

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_PROFILE_NOT_FOUND));

        String phone = normalizePhone(request.getPhone());
        if (phone.equals(normalizePhone(user.getPhone()))) {
            throw new BusinessException(ErrorCode.INVALID_REQUEST, "same phone");
        }
        if (userRepository.existsByPhone(phone)) {
            throw new BusinessException(ErrorCode.DUPLICATE_PHONE);
        }

        tokenRepository.findTopByUserIdAndPhoneAndUsedAtIsNullOrderByCreatedAtDesc(userId, phone).ifPresent(latest -> {
            LocalDateTime cooldownLimit = latest.getCreatedAt().plusSeconds(requestCooldownSeconds);
            if (LocalDateTime.now().isBefore(cooldownLimit)) {
                throw new BusinessException(ErrorCode.VERIFICATION_TOO_MANY_REQUESTS);
            }
        });

        String code = generateSixDigitCode();
        String codeHash = verificationHashSupport.hashWithCurrentSalt(code);
        LocalDateTime expiresAt = LocalDateTime.now().plusMinutes(otpTtlMinutes);

        tokenRepository.save(new PhoneVerificationToken(userId, phone, codeHash, expiresAt));
        smsOtpSenderPort.sendOtp(phone, buildOtpMessage(code));

        return new PhoneVerificationRequestResponse(expiresAt, shouldExposeSmsCode() ? code : null);
    }

    /**
     * 기능: 현재 사용자 휴대폰 인증 OTP를 검증한다.
     * 설명: 최신 미사용 토큰을 기준으로 만료 여부와 시도 횟수를 확인한 뒤 사용자 인증 상태를 갱신한다.
     * 흐름: 사용자 조회 -> 토큰 조회 -> 만료/횟수 검사 -> 코드 비교 -> phoneVerified 저장 순서다.
     */
    @Transactional
    public void confirmPhoneVerification(Long userId, PhoneVerificationConfirmRequest request) {
        validateHashSalt();

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_PROFILE_NOT_FOUND));

        if (user.isPhoneVerified()) {
            throw new BusinessException(ErrorCode.PHONE_ALREADY_VERIFIED);
        }

        String phone = normalizePhone(request.getPhone());
        PhoneVerificationToken token = tokenRepository.findTopByUserIdAndPhoneAndUsedAtIsNullOrderByCreatedAtDesc(userId, phone)
                .orElseThrow(() -> new BusinessException(ErrorCode.PHONE_OTP_INVALID));

        if (token.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new BusinessException(ErrorCode.PHONE_OTP_EXPIRED);
        }

        if (token.getAttemptCount() >= maxAttempts) {
            throw new BusinessException(ErrorCode.PHONE_OTP_TOO_MANY_ATTEMPTS);
        }

        token.increaseAttemptCount();

        if (!verificationHashSupport.matchesAnySalt(request.getCode(), token.getCodeHash())) {
            tokenRepository.save(token);
            throw new BusinessException(ErrorCode.PHONE_OTP_INVALID);
        }

        user.setPhoneVerified(true);
        userRepository.save(user);

        token.markUsed(LocalDateTime.now());
        tokenRepository.save(token);
    }

    /**
     * 기능: 휴대폰 번호 변경 OTP를 검증하고 새 번호를 반영한다.
     * 설명: 인증된 새 번호가 중복되지 않는지 확인한 뒤 사용자 번호와 인증 상태를 갱신한다.
     * 흐름: 사용자 조회 -> 토큰 조회 -> 코드 검증 -> 중복 검사 -> 번호 저장 순서다.
     */
    @Transactional
    public void confirmPhoneChange(Long userId, PhoneVerificationConfirmRequest request) {
        validateHashSalt();

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_PROFILE_NOT_FOUND));

        String phone = normalizePhone(request.getPhone());
        PhoneVerificationToken token = tokenRepository.findTopByUserIdAndPhoneAndUsedAtIsNullOrderByCreatedAtDesc(userId, phone)
                .orElseThrow(() -> new BusinessException(ErrorCode.PHONE_OTP_INVALID));

        if (token.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new BusinessException(ErrorCode.PHONE_OTP_EXPIRED);
        }
        if (token.getAttemptCount() >= maxAttempts) {
            throw new BusinessException(ErrorCode.PHONE_OTP_TOO_MANY_ATTEMPTS);
        }

        token.increaseAttemptCount();
        if (!verificationHashSupport.matchesAnySalt(request.getCode(), token.getCodeHash())) {
            tokenRepository.save(token);
            throw new BusinessException(ErrorCode.PHONE_OTP_INVALID);
        }

        if (!phone.equals(normalizePhone(user.getPhone())) && userRepository.existsByPhone(phone)) {
            throw new BusinessException(ErrorCode.DUPLICATE_PHONE);
        }

        user.setPhone(phone);
        user.setPhoneVerified(true);
        userRepository.save(user);

        token.markUsed(LocalDateTime.now());
        tokenRepository.save(token);
    }

    private void validateHashSalt() {
        verificationHashSupport.ensureConfigured();
    }

    private String generateSixDigitCode() {
        int value = RANDOM.nextInt(900000) + 100000;
        return String.valueOf(value);
    }

    private String buildOtpMessage(String code) {
        return "[PUPOO] 인증번호는 " + code + " 입니다.";
    }

    private String normalizePhone(String phone) {
        if (phone == null) {
            throw new BusinessException(ErrorCode.VALIDATION_FAILED);
        }
        return phone.replaceAll("[^0-9]", "");
    }

    // 기능: SMS가 dev provider면 OTP를 테스트 응답에 노출한다.
    private boolean shouldExposeSmsCode() {
        return exposeDevCode || (smsProvider != null && "dev".equalsIgnoreCase(smsProvider.trim()));
    }
}
