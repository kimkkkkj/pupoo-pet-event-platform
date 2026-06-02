// file: src/main/java/com/popups/pupoo/auth/domain/model/RefreshToken.java
package com.popups.pupoo.auth.domain.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "refresh_token")
public class RefreshToken {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "refresh_token_id")
    private Long refreshTokenId;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "token", nullable = false, length = 500)
    private String token;

    @Column(name = "expired_at", nullable = false)
    private LocalDateTime expiredAt;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;
public Long getUserId() { return userId; }
public LocalDateTime getExpiredAt() { return expiredAt; }
public void setUserId(Long userId) { this.userId = userId; }
public void setExpiredAt(LocalDateTime expiredAt) { this.expiredAt = expiredAt; }
}
