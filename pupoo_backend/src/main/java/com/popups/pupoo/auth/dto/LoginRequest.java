// file: src/main/java/com/popups/pupoo/auth/dto/LoginRequest.java
package com.popups.pupoo.auth.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class LoginRequest {

    private String email;
    private String password;
}
