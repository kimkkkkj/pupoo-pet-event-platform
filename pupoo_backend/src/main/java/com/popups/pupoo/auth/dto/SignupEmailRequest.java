// file: src/main/java/com/popups/pupoo/auth/dto/SignupEmailRequest.java
package com.popups.pupoo.auth.dto;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * 회원가입 이메일 인증 메일 발송 요청 DTO
 */
@Getter
@Setter
@NoArgsConstructor
public class SignupEmailRequest {
    private String signupKey;
}
