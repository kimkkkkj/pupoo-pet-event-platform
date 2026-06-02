package com.popups.pupoo.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SmsOtpVerifyRequest {

    @NotBlank
    private String phoneNumber;

    @NotBlank
    @Pattern(regexp = "\\d{6}", message = "code must be 6 digits")
    private String code;
}
