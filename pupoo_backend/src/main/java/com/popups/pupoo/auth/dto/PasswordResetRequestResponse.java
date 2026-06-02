package com.popups.pupoo.auth.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PasswordResetRequestResponse {

    private LocalDateTime expiresAt;
    private String verificationCode;
}
