// file: src/main/java/com/popups/pupoo/user/dto/AdminUserUpdateRequest.java
package com.popups.pupoo.user.dto;

import com.popups.pupoo.user.domain.enums.UserStatus;
import jakarta.validation.constraints.Size;

/**
 * 관리자용 사용자 수정 DTO
 * - 추후 관리자 정책 확정 시 필드/검증을 추가한다.
 */
public class AdminUserUpdateRequest {

    @Size(max = 30)
    private String nickname;

    @Size(max = 30)
    private String phone;

    private UserStatus status; // ACTIVE/SUSPENDED/DELETED (관리자 변경은 ACTIVE<->SUSPENDED만 허용)

    private Boolean showAge;
    private Boolean showGender;
    private Boolean showPet;

    public AdminUserUpdateRequest() {}

    public String getNickname() { return nickname; }
    public String getPhone() { return phone; }
    public UserStatus getStatus() { return status; }
    public Boolean getShowAge() { return showAge; }
    public Boolean getShowGender() { return showGender; }
    public Boolean getShowPet() { return showPet; }

    public void setNickname(String nickname) { this.nickname = nickname; }
    public void setPhone(String phone) { this.phone = phone; }
    public void setStatus(UserStatus status) { this.status = status; }
    public void setShowAge(Boolean showAge) { this.showAge = showAge; }
    public void setShowGender(Boolean showGender) { this.showGender = showGender; }
    public void setShowPet(Boolean showPet) { this.showPet = showPet; }
}
