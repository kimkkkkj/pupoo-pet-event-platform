// file: src/main/java/com/popups/pupoo/auth/domain/enums/SignupType.java
package com.popups.pupoo.auth.domain.enums;

/**
 * 회원가입 타입
 * - EMAIL: 이메일 가입(이메일 인증 필요)
 * - SOCIAL: 소셜 가입(이메일 인증 면제, OTP는 필수)
 */
public enum SignupType {
    EMAIL,
    SOCIAL
}
