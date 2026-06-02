// file: src/main/java/com/popups/pupoo/auth/dto/SignupCompleteRequest.java
package com.popups.pupoo.auth.dto;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * 회원가입 완료 요청 DTO
 */
@Getter
@Setter
@NoArgsConstructor
public class SignupCompleteRequest {
    private String signupKey;
}
