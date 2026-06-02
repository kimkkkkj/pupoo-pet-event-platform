// file: src/main/java/com/popups/pupoo/auth/domain/model/PhoneVerificationToken.java
package com.popups.pupoo.auth.domain.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 휴대폰 인증(OTP) 토큰
 *
 * - code 원문은 저장하지 않고 code_hash(SHA-256 hex)만 저장한다.
 * - 1회용 사용 처리는 used_at으로 관리한다.
 * - 브루트포스 방어를 위해 attempt_count를 증가시키며, 초과 시 인증 실패로 처리한다.
 */
@Getter
@NoArgsConstructor
@Entity
@Table(
        name = "phone_verification_token",
        indexes = {
                @Index(name = "ix_pvt_user_phone_created_at", columnList = "user_id, phone, created_at")
        },
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_pvt_code_hash", columnNames = {"code_hash"})
        }
)
public class PhoneVerificationToken {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "phone_verification_token_id", nullable = false)
    private Long phoneVerificationTokenId;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "phone", nullable = false, length = 20)
    private String phone;

    @Column(name = "code_hash", nullable = false, length = 64)
    private String codeHash;

    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;

    @Column(name = "used_at")
    private LocalDateTime usedAt;

    @Column(name = "attempt_count", nullable = false)
    private int attemptCount;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;
    public PhoneVerificationToken(Long userId, String phone, String codeHash, LocalDateTime expiresAt) {
        this.userId = userId;
        this.phone = phone;
        this.codeHash = codeHash;
        this.expiresAt = expiresAt;
    }

    @PrePersist
    protected void onCreate() {
        if (this.createdAt == null) {
            this.createdAt = LocalDateTime.now();
        }
    }
public Long getUserId() { return userId; }
public String getCodeHash() { return codeHash; }
public LocalDateTime getUsedAt() { return usedAt; }
public LocalDateTime getCreatedAt() { return createdAt; }

    public void increaseAttemptCount() {
        this.attemptCount++;
    }

    public void markUsed(LocalDateTime usedAt) {
        this.usedAt = usedAt;
    }
}
