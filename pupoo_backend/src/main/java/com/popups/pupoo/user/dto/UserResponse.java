// file: src/main/java/com/popups/pupoo/user/dto/UserResponse.java
package com.popups.pupoo.user.dto;

import com.popups.pupoo.user.domain.enums.RoleName;
import com.popups.pupoo.user.domain.enums.UserStatus;
import com.popups.pupoo.user.domain.model.User;

import java.time.LocalDateTime;

/**
 * 사용자 응답 DTO (관리자/조회 공통)
 */
public class UserResponse {

    private final Long userId;
    private final String email;
    private final String nickname;
    private final String phone;
    private final UserStatus status;
    private final RoleName roleName;
    private final boolean emailVerified;
    private final boolean phoneVerified;
    private final LocalDateTime createdAt;
    private final LocalDateTime lastLoginAt;
    private final LocalDateTime lastModifiedAt;

    private UserResponse(Long userId, String email, String nickname, String phone,
                         UserStatus status, RoleName roleName,
                         boolean emailVerified, boolean phoneVerified,
                         LocalDateTime createdAt, LocalDateTime lastLoginAt, LocalDateTime lastModifiedAt) {
        this.userId = userId;
        this.email = email;
        this.nickname = nickname;
        this.phone = phone;
        this.status = status;
        this.roleName = roleName;
        this.emailVerified = emailVerified;
        this.phoneVerified = phoneVerified;
        this.createdAt = createdAt;
        this.lastLoginAt = lastLoginAt;
        this.lastModifiedAt = lastModifiedAt;
    }

    public static UserResponse from(User u) {
        return new UserResponse(
                u.getUserId(),
                u.getEmail(),
                u.getNickname(),
                u.getPhone(),
                u.getStatus(),
                u.getRoleName(),
                u.isEmailVerified(),
                u.isPhoneVerified(),
                u.getCreatedAt(),
                u.getLastLoginAt(),
                u.getLastModifiedAt()
        );
    }

    public Long getUserId() { return userId; }
    public String getEmail() { return email; }
    public String getNickname() { return nickname; }
    public String getPhone() { return phone; }
    public UserStatus getStatus() { return status; }
    public RoleName getRoleName() { return roleName; }
    public boolean isEmailVerified() { return emailVerified; }
    public boolean isPhoneVerified() { return phoneVerified; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getLastLoginAt() { return lastLoginAt; }
    public LocalDateTime getLastModifiedAt() { return lastModifiedAt; }
}
