// file: src/main/java/com/popups/pupoo/auth/domain/model/SignupSession.java
package com.popups.pupoo.auth.domain.model;

import com.popups.pupoo.auth.domain.enums.EmailSessionStatus;
import com.popups.pupoo.auth.domain.enums.OtpSessionStatus;
import com.popups.pupoo.auth.domain.enums.SignupType;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * 회원가입 진행 세션
 *
 * 정책
 * - OTP 인증 완료 전에는 users 테이블에 사용자 생성 금지
 * - EMAIL 가입은 email_status=VERIFIED 까지 완료되어야 가입 완료(complete) 가능
 */
@Entity
@Table(name = "signup_sessions")
@Getter
@Setter
@NoArgsConstructor
public class SignupSession {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "signup_session_id")
    private Long signupSessionId;

    @Column(name = "signup_key", nullable = false, length = 36, unique = true)
    private String signupKey;

    @Enumerated(EnumType.STRING)
    @Column(name = "signup_type", nullable = false, length = 20)
    private SignupType signupType;

    @Column(name = "social_provider", length = 30)
    private String socialProvider;

    @Column(name = "social_provider_uid", length = 255)
    private String socialProviderUid;

    @Column(name = "email", length = 255)
    private String email;

    @Column(name = "password_hash", length = 255)
    private String passwordHash;

    @Column(name = "nickname", nullable = false, length = 30)
    private String nickname;

    @Column(name = "phone", nullable = false, length = 30)
    private String phone;

    @Enumerated(EnumType.STRING)
    @Column(name = "otp_status", nullable = false, length = 20)
    private OtpSessionStatus otpStatus = OtpSessionStatus.PENDING;

    @Column(name = "otp_verified_at")
    private LocalDateTime otpVerifiedAt;

    @Column(name = "otp_last_sent_at")
    private LocalDateTime otpLastSentAt;

    @Column(name = "otp_code_hash", length = 128)
    private String otpCodeHash;

    @Column(name = "otp_expires_at")
    private LocalDateTime otpExpiresAt;

    @Column(name = "otp_fail_count", nullable = false)
    private int otpFailCount;

    @Column(name = "otp_blocked_until")
    private LocalDateTime otpBlockedUntil;

    @Enumerated(EnumType.STRING)
    @Column(name = "email_status", nullable = false, length = 20)
    private EmailSessionStatus emailStatus = EmailSessionStatus.PENDING;

    @Column(name = "email_verified_at")
    private LocalDateTime emailVerifiedAt;

    @Column(name = "email_code_hash", length = 128)
    private String emailCodeHash;

    @Column(name = "email_expires_at")
    private LocalDateTime emailExpiresAt;

    @Column(name = "email_last_sent_at")
    private LocalDateTime emailLastSentAt;

    @Column(name = "email_fail_count", nullable = false)
    private int emailFailCount;

    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;

    @Column(name = "created_at", nullable = false, updatable = false, insertable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false, insertable = false)
    private LocalDateTime updatedAt;
}
