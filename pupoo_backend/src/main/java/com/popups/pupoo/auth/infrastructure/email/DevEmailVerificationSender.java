package com.popups.pupoo.auth.infrastructure.email;

import com.popups.pupoo.auth.port.EmailVerificationSenderPort;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.time.LocalDateTime;

/**
 * 기능: 개발 환경용 인증 이메일 발송 대체 구현이다.
 * 설명: 실제 이메일 대신 인증 관련 payload를 로그로 남겨 auth 흐름을 검증할 수 있게 한다.
 * 흐름: 서비스가 포트를 호출하면 인증 유형과 대상 값을 dev 로그로 기록한다.
 */
public class DevEmailVerificationSender implements EmailVerificationSenderPort {

    private static final Logger log = LoggerFactory.getLogger(DevEmailVerificationSender.class);

    private final String provider;

    public DevEmailVerificationSender(String provider) {
        this.provider = provider;
    }

    @Override
    public void sendVerificationEmail(String email, String code) {
        log.info("[AUTH_EMAIL_PROVIDER={}] signup verification email={}, code=<masked>", provider, maskEmail(email));
    }

    @Override
    public void sendPasswordResetEmail(String email, String token) {
        log.info("[AUTH_EMAIL_PROVIDER={}] password reset email={}, token=<masked>", provider, maskEmail(email));
    }

    @Override
    public void sendAccountVerificationEmail(String email, String token) {
        log.info("[AUTH_EMAIL_PROVIDER={}] account verification email={}, token=<masked>", provider, maskEmail(email));
    }

    @Override
    public void sendEmailChangeVerificationEmail(String email, String token, LocalDateTime expiresAt) {
        log.info("[AUTH_EMAIL_PROVIDER={}] email change email={}, token=<masked>, expiresAt={}",
                provider, maskEmail(email), expiresAt);
    }

    private String maskEmail(String email) {
        if (email == null || email.isBlank()) {
            return "<empty>";
        }

        int atIndex = email.indexOf('@');
        if (atIndex <= 1 || atIndex == email.length() - 1) {
            return "***";
        }

        String localPart = email.substring(0, atIndex);
        String domainPart = email.substring(atIndex + 1);
        return localPart.charAt(0) + "***@" + domainPart;
    }
}
