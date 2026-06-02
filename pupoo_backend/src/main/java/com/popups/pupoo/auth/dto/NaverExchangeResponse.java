package com.popups.pupoo.auth.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class NaverExchangeResponse {
    private String providerUid;
    private String email;
    private String nickname;
}
