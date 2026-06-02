// file: src/main/java/com/popups/pupoo/user/dto/UserMeResponse.java
package com.popups.pupoo.user.dto;

import com.popups.pupoo.user.domain.enums.RoleName;
import com.popups.pupoo.user.domain.enums.UserStatus;
import com.popups.pupoo.user.domain.model.User;

import java.time.LocalDateTime;

public class UserMeResponse {

    private final Long userId;
    private final String email;
    private final String nickname;
    private final String phone;
    private final UserStatus status;
    private final RoleName roleName;

    private final boolean showAge;
    private final boolean showGender;
    private final boolean showPet;

    private final LocalDateTime createdAt;
    private final LocalDateTime lastLoginAt;
    private final LocalDateTime lastModifiedAt;

    private UserMeResponse(
            Long userId,
            String email,
            String nickname,
            String phone,
            UserStatus status,
            RoleName roleName,
            boolean showAge,
            boolean showGender,
            boolean showPet,
            LocalDateTime createdAt,
            LocalDateTime lastLoginAt,
            LocalDateTime lastModifiedAt
    ) {
        this.userId = userId;
        this.email = email;
        this.nickname = nickname;
        this.phone = phone;
        this.status = status;
        this.roleName = roleName;
        this.showAge = showAge;
        this.showGender = showGender;
        this.showPet = showPet;
        this.createdAt = createdAt;
        this.lastLoginAt = lastLoginAt;
        this.lastModifiedAt = lastModifiedAt;
    }

    /**
     * User 엔티티를 /me 응답 DTO로 변환한다.
     */
    public static UserMeResponse from(User user) {
        return new UserMeResponse(
                user.getUserId(),
                user.getEmail(),
                user.getNickname(),
                user.getPhone(),
                user.getStatus(),
                user.getRoleName(),
                user.isShowAge(),
                user.isShowGender(),
                user.isShowPet(),
                user.getCreatedAt(),
                user.getLastLoginAt(),
                user.getLastModifiedAt()
        );
    }

    public Long getUserId() { return userId; }
    public String getEmail() { return email; }
    public String getNickname() { return nickname; }
    public String getPhone() { return phone; }
    public UserStatus getStatus() { return status; }
    public RoleName getRoleName() { return roleName; }
    public boolean isShowAge() { return showAge; }
    public boolean isShowGender() { return showGender; }
    public boolean isShowPet() { return showPet; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getLastLoginAt() { return lastLoginAt; }
    public LocalDateTime getLastModifiedAt() { return lastModifiedAt; }
}
