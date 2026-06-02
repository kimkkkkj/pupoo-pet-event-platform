package com.popups.pupoo.auth.dto;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class KakaoOauthLoginResponse {
    private boolean newUser;          // 신규 여부
    private String accessToken;       // 기존회원이면 발급
    private Long userId;              // 기존회원이면
    private String roleName;          // 기존회원이면

    // 신규회원 가입 플로우 프리필드
    private String email;
    private String nickname;
    private String socialProvider;    // "KAKAO"
    private String socialProviderUid; // 카카오 user id
}