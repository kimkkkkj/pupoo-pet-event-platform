// file: src/main/java/com/popups/pupoo/user/social/dto/SocialLinkRequest.java
package com.popups.pupoo.user.social.dto;

import jakarta.validation.constraints.NotBlank;

public class SocialLinkRequest {

    @NotBlank
    private String provider;

    @NotBlank
    private String providerUid;

    public String getProvider() {
        return provider;
    }

    public String getProviderUid() {
        return providerUid;
    }

    public void setProvider(String provider) {
        this.provider = provider;
    }

    public void setProviderUid(String providerUid) {
        this.providerUid = providerUid;
    }
}
