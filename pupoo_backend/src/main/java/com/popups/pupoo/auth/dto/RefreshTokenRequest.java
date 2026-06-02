// file: src/main/java/com/popups/pupoo/auth/dto/RefreshTokenRequest.java
package com.popups.pupoo.auth.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class RefreshTokenRequest {

    private String refreshToken;

}
