package com.popups.pupoo.auth.support;

import java.util.Arrays;
import java.util.List;

public final class SecretRotationSupport {

    private SecretRotationSupport() {
    }

    public static List<String> parseSecretList(String rawValue) {
        if (rawValue == null || rawValue.isBlank()) {
            return List.of();
        }

        return Arrays.stream(rawValue.split("[,;\\r\\n]+"))
                .map(String::trim)
                .filter(value -> !value.isBlank())
                .distinct()
                .toList();
    }
}
