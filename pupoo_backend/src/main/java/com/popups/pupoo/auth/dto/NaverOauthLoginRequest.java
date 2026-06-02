package com.popups.pupoo.auth.dto;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class NaverOauthLoginRequest {
    private String code;
    private String state;
    private String redirectUri;
}
