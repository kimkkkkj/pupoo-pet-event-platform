package com.popups.pupoo.storage.support;

import com.popups.pupoo.storage.config.StorageProperties;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.util.List;
import java.util.Locale;
import java.util.Set;

/**
 * Normalizes incoming legacy paths and URLs into storage keys.
 */
@Component
public class StorageKeyNormalizer {

    private static final List<String> CLASSPATH_MARKERS = List.of(
            "/src/main/resources/uploads/",
            "src/main/resources/uploads/",
            "/main/resources/uploads/",
            "main/resources/uploads/",
            "/resources/uploads/",
            "resources/uploads/"
    );

    private static final Set<String> KNOWN_STORAGE_FOLDERS = Set.of(
            "event",
            "event_images",
            "experience",
            "program",
            "program_apply",
            "gallery",
            "gallery_thumb",
            "notice",
            "post",
            "board",
            "qr",
            "qr_codes",
            "speaker",
            "speakers"
    );

    private final StorageProperties storageProperties;

    public StorageKeyNormalizer(StorageProperties storageProperties) {
        this.storageProperties = storageProperties;
    }

    public String normalizeToKey(String rawValue) {
        if (!StringUtils.hasText(rawValue)) {
            return null;
        }

        String sanitized = sanitize(rawValue);
        String storageKey = extractStorageKey(sanitized);
        if (storageKey != null) {
            return storageKey;
        }

        if (isAbsoluteUrl(sanitized)) {
            // TODO(step-01-storage-policy): fail hard after all legacy absolute URLs are migrated to storage keys.
            return sanitized;
        }

        return sanitized;
    }

    public String extractStorageKey(String rawValue) {
        if (!StringUtils.hasText(rawValue)) {
            return null;
        }

        String sanitized = sanitize(rawValue);
        String pathCandidate = toPathCandidate(sanitized);
        String lowerPath = pathCandidate.toLowerCase(Locale.ROOT);

        for (String marker : CLASSPATH_MARKERS) {
            int markerIndex = lowerPath.indexOf(marker);
            if (markerIndex >= 0) {
                return ensureKeyPrefix(pathCandidate.substring(markerIndex + marker.lastIndexOf("uploads/")));
            }
        }

        int uploadsIndex = lowerPath.indexOf("/uploads/");
        if (uploadsIndex >= 0) {
            return ensureKeyPrefix(pathCandidate.substring(uploadsIndex + 1));
        }

        uploadsIndex = lowerPath.indexOf("uploads/");
        if (uploadsIndex >= 0) {
            return ensureKeyPrefix(pathCandidate.substring(uploadsIndex));
        }

        int staticIndex = lowerPath.indexOf("/static/");
        if (staticIndex >= 0) {
            // Legacy local URLs may still arrive as /static/... during the migration window.
            return ensureKeyPrefix(pathCandidate.substring(staticIndex + "/static/".length()));
        }

        staticIndex = lowerPath.indexOf("static/");
        if (staticIndex >= 0) {
            return ensureKeyPrefix(pathCandidate.substring(staticIndex + "static/".length()));
        }

        String relativePath = stripLeadingSlash(pathCandidate);
        if (!StringUtils.hasText(relativePath)) {
            return null;
        }

        if (relativePath.startsWith(normalizedKeyPrefix() + "/")) {
            return relativePath;
        }

        if (isKnownStoragePath(relativePath)) {
            return ensureKeyPrefix(relativePath);
        }

        return null;
    }

    public String ensureKeyPrefix(String rawKey) {
        String normalized = sanitize(rawKey);
        String keyPrefix = normalizedKeyPrefix();
        if (!StringUtils.hasText(keyPrefix)) {
            return normalized;
        }
        if (normalized.equals(keyPrefix) || normalized.startsWith(keyPrefix + "/")) {
            return normalized;
        }
        return keyPrefix + "/" + normalized;
    }

    public String extractFileName(String rawValue) {
        if (!StringUtils.hasText(rawValue)) {
            return null;
        }

        String normalized = sanitize(rawValue);
        int slashIndex = normalized.lastIndexOf('/');
        return slashIndex >= 0 ? normalized.substring(slashIndex + 1) : normalized;
    }

    private boolean isKnownStoragePath(String candidate) {
        int slashIndex = candidate.indexOf('/');
        String firstSegment = slashIndex >= 0 ? candidate.substring(0, slashIndex) : candidate;
        return KNOWN_STORAGE_FOLDERS.contains(firstSegment);
    }

    private String toPathCandidate(String value) {
        String withoutQuery = stripQueryAndFragment(value);
        if (!isAbsoluteUrl(withoutQuery)) {
            return withoutQuery;
        }

        int schemeIndex = withoutQuery.indexOf("://");
        if (schemeIndex < 0) {
            return withoutQuery;
        }

        int pathIndex = withoutQuery.indexOf('/', schemeIndex + 3);
        if (pathIndex < 0) {
            return "";
        }

        return withoutQuery.substring(pathIndex);
    }

    private String stripQueryAndFragment(String value) {
        int queryIndex = value.indexOf('?');
        int fragmentIndex = value.indexOf('#');
        int endIndex = value.length();

        if (queryIndex >= 0) {
            endIndex = Math.min(endIndex, queryIndex);
        }
        if (fragmentIndex >= 0) {
            endIndex = Math.min(endIndex, fragmentIndex);
        }

        return value.substring(0, endIndex);
    }

    private boolean isAbsoluteUrl(String value) {
        String lower = value.toLowerCase(Locale.ROOT);
        return lower.startsWith("http://") || lower.startsWith("https://");
    }

    private String normalizedKeyPrefix() {
        return stripLeadingSlash(stripTrailingSlash(storageProperties.getKeyPrefix()));
    }

    private String sanitize(String value) {
        String normalized = value.trim().replace('\\', '/');
        normalized = stripTrailingSlash(normalized);
        return stripLeadingSlash(normalized);
    }

    private String stripLeadingSlash(String value) {
        String normalized = value;
        while (normalized.startsWith("/")) {
            normalized = normalized.substring(1);
        }
        return normalized;
    }

    private String stripTrailingSlash(String value) {
        String normalized = value;
        while (normalized.endsWith("/")) {
            normalized = normalized.substring(0, normalized.length() - 1);
        }
        return normalized;
    }
}
