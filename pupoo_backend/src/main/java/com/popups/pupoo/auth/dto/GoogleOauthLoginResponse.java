package com.popups.pupoo.auth.dto;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class GoogleOauthLoginResponse {
    private boolean newUser;
    private String accessToken;
    private Long userId;
    private String roleName;

    private String email;
    private String nickname;
    private String socialProvider;
    private String socialProviderUid;
}
