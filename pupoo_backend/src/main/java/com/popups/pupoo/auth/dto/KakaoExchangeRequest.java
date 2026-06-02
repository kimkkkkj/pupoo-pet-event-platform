// KakaoExchangeRequest.java
package com.popups.pupoo.auth.dto;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class KakaoExchangeRequest {
    private String code;
    private String redirectUri;
}
