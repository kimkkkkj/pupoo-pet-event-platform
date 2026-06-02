// file: src/main/java/com/popups/pupoo/auth/domain/model/EmailVerificationToken.java
package com.popups.pupoo.auth.domain.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 이메일 인증 토큰
 *
 * - token 원문은 저장하지 않고 token_hash(SHA-256 hex)만 저장한다.
 * - 1회용 사용 처리는 used_at으로 관리한다.
 */
@Getter
@NoArgsConstructor
@Entity
@Table(
        name = "email_verification_token",
        indexes = {
                @Index(name = "ix_evt_user_id_created_at", columnList = "user_id, created_at")
        },
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_evt_token_hash", columnNames = {"token_hash"})
        }
)
public class EmailVerificationToken {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "email_verification_token_id", nullable = false)
    private Long emailVerificationTokenId;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "token_hash", nullable = false, length = 64)
    private String tokenHash;

    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;

    @Column(name = "used_at")
    private LocalDateTime usedAt;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;
    public EmailVerificationToken(Long userId, String tokenHash, LocalDateTime expiresAt) {
        this.userId = userId;
        this.tokenHash = tokenHash;
        this.expiresAt = expiresAt;
    }

    @PrePersist
    protected void onCreate() {
        if (this.createdAt == null) {
            this.createdAt = LocalDateTime.now();
        }
    }
public Long getUserId() { return userId; }
public LocalDateTime getExpiresAt() { return expiresAt; }
public LocalDateTime getCreatedAt() { return createdAt; }

    public void markUsed(LocalDateTime usedAt) {
        this.usedAt = usedAt;
    }
}
