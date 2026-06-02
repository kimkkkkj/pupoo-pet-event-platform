// file: src/main/java/com/popups/pupoo/user/social/domain/enums/SocialProvider.java
package com.popups.pupoo.user.social.domain.enums;

import java.util.Locale;

public enum SocialProvider {
    NAVER,
    KAKAO,
    GOOGLE,
    APPLE;

    public static SocialProvider from(String value) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException("provider is null or blank");
        }
        return SocialProvider.valueOf(value.trim().toUpperCase(Locale.ROOT));
    }
}
