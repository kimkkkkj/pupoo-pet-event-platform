// file: src/main/java/com/popups/pupoo/user/social/dto/SocialUnlinkRequest.java
package com.popups.pupoo.user.social.dto;

import jakarta.validation.constraints.NotBlank;

public class SocialUnlinkRequest {

    @NotBlank
    private String provider;

    public String getProvider() {
        return provider;
    }
}
