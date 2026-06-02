// file: src/main/java/com/popups/pupoo/auth/dto/SignupVerifyOtpRequest.java
package com.popups.pupoo.auth.dto;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * 회원가입 OTP 검증 요청 DTO
 */
@Getter
@Setter
@NoArgsConstructor
public class SignupVerifyOtpRequest {
    private String signupKey;
    private String phone;
    private String otpCode;
}
