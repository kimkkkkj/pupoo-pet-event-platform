// file: src/main/java/com/popups/pupoo/user/domain/model/User.java
package com.popups.pupoo.user.domain.model;

import com.popups.pupoo.user.domain.enums.RoleName;
import com.popups.pupoo.user.domain.enums.UserStatus;
import jakarta.persistence.*;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "users",
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_users_email", columnNames = "email"),
                @UniqueConstraint(name = "uk_users_phone", columnNames = "phone"),
                @UniqueConstraint(name = "uk_users_nickname", columnNames = "nickname")
        }
)
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "email", nullable = false, length = 255)
    private String email;

    @Column(name = "password", nullable = false, length = 255)
    private String password;

    @Column(name = "nickname", nullable = false, length = 30)
    private String nickname;

    @Column(name = "phone", nullable = false, length = 30)
    private String phone;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private UserStatus status;

    @Enumerated(EnumType.STRING)
    @Column(name = "role_name", nullable = false, length = 20)
    private RoleName roleName;

    //  DB tinyint(1) 플래그면 boolean이 정석
    @Column(name = "show_age", nullable = false, columnDefinition = "TINYINT(1)")
    private boolean showAge;

    @Column(name = "show_gender", nullable = false, columnDefinition = "TINYINT(1)")
    private boolean showGender;

    @Column(name = "show_pet", nullable = false, columnDefinition = "TINYINT(1)")
    private boolean showPet;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "last_login_at")
    private LocalDateTime lastLoginAt;

    @Column(name = "last_modified_at", nullable = false)
    private LocalDateTime lastModifiedAt;

    @Column(name = "email_verified", nullable = false, columnDefinition = "TINYINT(1)")
    private boolean emailVerified;

    @Column(name = "phone_verified", nullable = false, columnDefinition = "TINYINT(1)")
    private boolean phoneVerified;

    public User() {}

    @PrePersist
    protected void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        if (this.createdAt == null) this.createdAt = now;
        if (this.lastModifiedAt == null) this.lastModifiedAt = now;
        if (this.status == null) this.status = UserStatus.ACTIVE;
        if (this.roleName == null) this.roleName = RoleName.USER;
    }

    public Long getUserId() { return userId; }
    public String getEmail() { return email; }
    public String getPassword() { return password; }
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

    public boolean isEmailVerified() { return emailVerified; }
    public boolean isPhoneVerified() { return phoneVerified; }

    public void setUserId(Long userId) { this.userId = userId; }
    public void setEmail(String email) { this.email = email; }
    public void setPassword(String password) { this.password = password; this.lastModifiedAt = LocalDateTime.now(); }
    public void setNickname(String nickname) { this.nickname = nickname; }
    public void setPhone(String phone) { this.phone = phone; }
    public void setStatus(UserStatus status) { this.status = status; }
    public void setRoleName(RoleName roleName) { this.roleName = roleName; }
    public void setShowAge(boolean showAge) { this.showAge = showAge; }
    public void setShowGender(boolean showGender) { this.showGender = showGender; }
    public void setShowPet(boolean showPet) { this.showPet = showPet; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public void setLastLoginAt(LocalDateTime lastLoginAt) { this.lastLoginAt = lastLoginAt; }
    public void setLastModifiedAt(LocalDateTime lastModifiedAt) { this.lastModifiedAt = lastModifiedAt; }

    public void setEmailVerified(boolean emailVerified) { this.emailVerified = emailVerified; }
    public void setPhoneVerified(boolean phoneVerified) { this.phoneVerified = phoneVerified; }
}
