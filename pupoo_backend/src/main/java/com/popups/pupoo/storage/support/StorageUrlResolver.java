package com.popups.pupoo.storage.support;

import com.popups.pupoo.storage.config.StorageProperties;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.util.List;
import java.util.Locale;

/**
 * Resolves final public URLs from storage keys.
 */
@Component
public class StorageUrlResolver {

    private final StorageProperties storageProperties;
    private final StorageKeyNormalizer storageKeyNormalizer;

    public StorageUrlResolver(StorageProperties storageProperties, StorageKeyNormalizer storageKeyNormalizer) {
        this.storageProperties = storageProperties;
        this.storageKeyNormalizer = storageKeyNormalizer;
    }

    public String toPublicUrl(String rawValue) {
        if (!StringUtils.hasText(rawValue)) {
            return null;
        }

        String normalized = rawValue.trim().replace('\\', '/');
        // TODO(step-01-storage-policy): remove pass-through when all legacy absolute URLs are migrated to storage keys.
        if (isAbsoluteUrl(normalized)) {
            return normalized;
        }

        String key = storageKeyNormalizer.extractStorageKey(normalized);
        if (key != null) {
            return toPublicUrlFromKey(key);
        }
        return normalized;
    }

    public String toPublicUrlFromKey(String rawKey) {
        String normalizedKey = rawKey == null ? null : rawKey.trim().replace('\\', '/');
        // TODO(step-01-storage-policy): remove pass-through when all legacy absolute URLs are migrated to storage keys.
        if (StringUtils.hasText(normalizedKey) && isAbsoluteUrl(normalizedKey)) {
            return normalizedKey;
        }

        normalizedKey = storageKeyNormalizer.normalizeToKey(rawKey);
        if (!StringUtils.hasText(normalizedKey)) {
            return null;
        }

        String baseUrl = resolveBaseUrl();
        if (!StringUtils.hasText(baseUrl)) {
            return "/" + stripLeadingSlash(normalizedKey);
        }

        return baseUrl + "/" + stripLeadingSlash(normalizedKey);
    }

    public List<String> toPublicUrls(List<String> rawValues) {
        if (rawValues == null || rawValues.isEmpty()) {
            return List.of();
        }
        return rawValues.stream()
                .map(this::toPublicUrl)
                .toList();
    }

    private String normalizeBaseUrl(String value) {
        if (!StringUtils.hasText(value)) {
            return "";
        }

        String normalized = value.trim();
        while (normalized.endsWith("/")) {
            normalized = normalized.substring(0, normalized.length() - 1);
        }
        return normalized;
    }

    private String resolveBaseUrl() {
        String publicBaseUrl = normalizeBaseUrl(storageProperties.getPublicBaseUrl());
        if (isLocalMode() && StringUtils.hasText(publicBaseUrl)) {
            return publicBaseUrl;
        }

        String cdnBaseUrl = normalizeBaseUrl(storageProperties.getCdnBaseUrl());
        if (StringUtils.hasText(cdnBaseUrl)) {
            return cdnBaseUrl;
        }

        if (StringUtils.hasText(publicBaseUrl)) {
            return publicBaseUrl;
        }

        return "";
    }

    private boolean isLocalMode() {
        String mode = storageProperties.getMode();
        if (!StringUtils.hasText(mode)) {
            return true;
        }
        String normalizedMode = mode.trim().toLowerCase(Locale.ROOT);
        return normalizedMode.equals("local");
    }

    private boolean isAbsoluteUrl(String value) {
        String lowerValue = value.toLowerCase();
        return lowerValue.startsWith("http://") || lowerValue.startsWith("https://");
    }

    private String stripLeadingSlash(String value) {
        String normalized = value;
        while (normalized.startsWith("/")) {
            normalized = normalized.substring(1);
        }
        return normalized;
    }
}
