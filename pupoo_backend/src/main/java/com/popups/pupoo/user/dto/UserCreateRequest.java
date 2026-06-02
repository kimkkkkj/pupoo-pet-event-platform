// file: src/main/java/com/popups/pupoo/user/dto/UserCreateRequest.java
package com.popups.pupoo.user.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public class UserCreateRequest {

    @Email
    @NotBlank
    private String email;

    @NotBlank
    private String password;

    @NotBlank
    private String nickname;

    @NotBlank
    private String phone;

    //  int → boolean
    private boolean showAge;
    private boolean showGender;
    private boolean showPet;

    public UserCreateRequest() {}

    public String getEmail() { return email; }
    public String getPassword() { return password; }
    public String getNickname() { return nickname; }
    public String getPhone() { return phone; }

    public boolean isShowAge() { return showAge; }
    public boolean isShowGender() { return showGender; }
    public boolean isShowPet() { return showPet; }

    public void setEmail(String email) { this.email = email; }
    public void setPassword(String password) { this.password = password; }
    public void setNickname(String nickname) { this.nickname = nickname; }
    public void setPhone(String phone) { this.phone = phone; }
    public void setShowAge(boolean showAge) { this.showAge = showAge; }
    public void setShowGender(boolean showGender) { this.showGender = showGender; }
    public void setShowPet(boolean showPet) { this.showPet = showPet; }
}
