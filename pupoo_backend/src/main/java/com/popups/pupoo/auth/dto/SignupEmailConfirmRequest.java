// file: src/main/java/com/popups/pupoo/auth/dto/SignupEmailConfirmRequest.java
package com.popups.pupoo.auth.dto;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * 회원가입 이메일 인증 확인 요청 DTO
 */
@Getter
@Setter
@NoArgsConstructor
public class SignupEmailConfirmRequest {
    private String signupKey;
    private String code;
}
