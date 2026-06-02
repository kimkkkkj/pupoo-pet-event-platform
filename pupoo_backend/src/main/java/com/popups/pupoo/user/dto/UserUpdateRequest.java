// file: src/main/java/com/popups/pupoo/user/dto/UserUpdateRequest.java
package com.popups.pupoo.user.dto;

/**
 * 현재 로그인 사용자 정보 수정 요청 DTO
 * - PATCH 요청이므로 부분 수정이 가능해야 한다.
 * - Boolean 래퍼 타입을 사용하여 null이면 변경하지 않도록 한다.
 * - phone은 본인인증 후 별도 플로우에서만 변경 가능하므로 포함하지 않는다.
 */
public class UserUpdateRequest {

    private String nickname;

    private Boolean showAge;
    private Boolean showGender;
    private Boolean showPet;

    public UserUpdateRequest() {}

    public String getNickname() { return nickname; }

    public Boolean getShowAge() { return showAge; }
    public Boolean getShowGender() { return showGender; }
    public Boolean getShowPet() { return showPet; }

    public void setNickname(String nickname) { this.nickname = nickname; }
    public void setShowAge(Boolean showAge) { this.showAge = showAge; }
    public void setShowGender(Boolean showGender) { this.showGender = showGender; }
    public void setShowPet(Boolean showPet) { this.showPet = showPet; }
}
