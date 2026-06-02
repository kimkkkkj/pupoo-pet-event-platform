// file: src/main/java/com/popups/pupoo/user/social/dto/SocialAccountResponse.java
package com.popups.pupoo.user.social.dto;

import com.popups.pupoo.user.social.domain.model.SocialAccount;

public class SocialAccountResponse {

    private Long socialId;
    private String provider;
    private String providerUid;

    public static SocialAccountResponse from(SocialAccount socialAccount) {
        SocialAccountResponse res = new SocialAccountResponse();
        res.socialId = socialAccount.getSocialId();
        res.provider = socialAccount.getProvider().name();
        res.providerUid = socialAccount.getProviderUid();
        return res;
    }

    public Long getSocialId() {
        return socialId;
    }

    public String getProvider() {
        return provider;
    }

    public String getProviderUid() {
        return providerUid;
    }
}
