package com.popups.pupoo.auth.support;

import com.popups.pupoo.common.exception.BusinessException;
import com.popups.pupoo.common.exception.ErrorCode;
import com.popups.pupoo.common.util.HashUtil;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.stream.Stream;

@Component
public class VerificationHashSupport {

    private static final String MISSING_SENTINEL = "__MISSING__";

    private final String currentSalt;
    private final List<String> allSalts;

    public VerificationHashSupport(
            @Value("${verification.hash.salt:__MISSING__}") String currentSalt,
            @Value("${verification.hash.previous-salts:}") String previousSalts
    ) {
        this.currentSalt = currentSalt;
        this.allSalts = Stream.concat(
                        Stream.of(currentSalt),
                        SecretRotationSupport.parseSecretList(previousSalts).stream()
                )
                .map(String::trim)
                .filter(value -> !value.isBlank())
                .distinct()
                .toList();
    }

    public void ensureConfigured() {
        requireCurrentSalt();
    }

    public String hashWithCurrentSalt(String rawValue) {
        return hashWithSalt(rawValue, requireCurrentSalt());
    }

    public boolean matchesAnySalt(String rawValue, String expectedHash) {
        ensureConfigured();

        if (expectedHash == null || expectedHash.isBlank()) {
            return false;
        }

        return candidateHashes(rawValue).stream().anyMatch(expectedHash::equals);
    }

    public List<String> candidateHashes(String rawValue) {
        ensureConfigured();

        return allSalts.stream()
                .filter(this::isUsableSalt)
                .map(salt -> hashWithSalt(rawValue, salt))
                .distinct()
                .toList();
    }

    private String requireCurrentSalt() {
        if (!isUsableSalt(currentSalt)) {
            throw new BusinessException(ErrorCode.INTERNAL_ERROR);
        }
        return currentSalt;
    }

    private boolean isUsableSalt(String salt) {
        return salt != null && !salt.isBlank() && !MISSING_SENTINEL.equals(salt);
    }

    private String hashWithSalt(String rawValue, String salt) {
        return HashUtil.sha256Hex(String.valueOf(rawValue) + salt);
    }
}
