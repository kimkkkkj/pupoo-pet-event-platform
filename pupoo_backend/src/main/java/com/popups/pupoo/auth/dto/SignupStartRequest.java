// file: src/main/java/com/popups/pupoo/auth/dto/SignupStartRequest.java
package com.popups.pupoo.auth.dto;

import com.popups.pupoo.auth.domain.enums.SignupType;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * 회원가입 시작 요청 DTO
 *
 * 기능
 * - 가입 세션 생성 + OTP 발송
 *
 * 주의
 * - 이 단계에서는 users 테이블에 저장하지 않는다.
 */
@Getter
@Setter
@NoArgsConstructor
public class SignupStartRequest {

    private SignupType signupType;

    // EMAIL/SOCIAL 공통: 프로젝트는 email/password 기반 User 생성 구조이므로 소셜도 email/password 입력을 받는다.
    private String email;
    private String password;

    // 공통 필수
    private String nickname;
    private String phone;

    // SOCIAL 전용
    private String socialProvider;
    private String socialProviderUid;
}
