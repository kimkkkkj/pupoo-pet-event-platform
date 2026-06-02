// file: src/main/java/com/popups/pupoo/auth/dto/SignupStartResponse.java
package com.popups.pupoo.auth.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * 회원가입 시작 응답 DTO
 */
@Data
@AllArgsConstructor
public class SignupStartResponse {

    private String signupKey;
    private int otpCooldownSeconds;
    private int otpDailyRemaining;
    private LocalDateTime expiresAt;

    /**
     * 개발 환경(Postman 테스트)에서만 사용하는 필드.
     * 운영 환경에서는 절대 노출되면 안 된다.
     */
    private String devOtp;
}
