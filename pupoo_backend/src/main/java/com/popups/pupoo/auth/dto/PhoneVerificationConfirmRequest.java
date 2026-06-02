// file: src/main/java/com/popups/pupoo/auth/dto/PhoneVerificationConfirmRequest.java
package com.popups.pupoo.auth.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PhoneVerificationConfirmRequest {

    @NotBlank
    private String phone;

    @NotBlank
    private String code;
}
