// file: src/main/java/com/popups/pupoo/auth/dto/LoginResponse.java
package com.popups.pupoo.auth.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class LoginResponse {

    private String accessToken;
    private Long userId;
    private String roleName;
}
