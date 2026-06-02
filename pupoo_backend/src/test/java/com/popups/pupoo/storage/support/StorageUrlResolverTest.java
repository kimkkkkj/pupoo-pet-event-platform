package com.popups.pupoo.storage.support;

import com.popups.pupoo.storage.config.StorageProperties;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class StorageUrlResolverTest {

    @Test
    void usesPublicBaseUrlForLocalMode() {
        StorageUrlResolver resolver = createResolver("local", "http://localhost:8080", "https://cdn.pupoo.site");

        assertThat(resolver.toPublicUrlFromKey("uploads/event/a.jpg"))
                .isEqualTo("http://localhost:8080/uploads/event/a.jpg");
    }

    @Test
    void normalizesLeadingSlashWithoutDuplicatingUploadsPrefix() {
        StorageUrlResolver resolver = createResolver("local", "http://localhost:8080", "https://cdn.pupoo.site");

        assertThat(resolver.toPublicUrlFromKey("/uploads/event/a.jpg"))
                .isEqualTo("http://localhost:8080/uploads/event/a.jpg");
    }

    @Test
    void usesCdnUrlForObjectStorageModes() {
        StorageUrlResolver resolver = createResolver("s3", "http://localhost:8080", "https://cdn.pupoo.site");

        assertThat(resolver.toPublicUrlFromKey("uploads/event/a.jpg"))
                .isEqualTo("https://cdn.pupoo.site/uploads/event/a.jpg");
    }

    @Test
    void fallsBackToPublicBaseUrlWhenObjectStorageHasNoCdn() {
        StorageUrlResolver resolver = createResolver("s3", "https://api.pupoo.site", "");

        assertThat(resolver.toPublicUrlFromKey("uploads/event/a.jpg"))
                .isEqualTo("https://api.pupoo.site/uploads/event/a.jpg");
    }

    @Test
    void returnsNullForNullOrBlankValues() {
        StorageUrlResolver resolver = createResolver("local", "http://localhost:8080", "https://cdn.pupoo.site");

        assertThat(resolver.toPublicUrlFromKey(null)).isNull();
        assertThat(resolver.toPublicUrlFromKey("   ")).isNull();
        assertThat(resolver.toPublicUrl(null)).isNull();
        assertThat(resolver.toPublicUrl("   ")).isNull();
    }

    @Test
    void passesThroughAbsoluteUrlDuringCompatibilityWindow() {
        StorageUrlResolver resolver = createResolver("local", "http://localhost:8080", "https://cdn.pupoo.site");
        String absoluteUrl = "https://legacy.pupoo.com/uploads/event/a.jpg";

        assertThat(resolver.toPublicUrl(absoluteUrl)).isEqualTo(absoluteUrl);
        assertThat(resolver.toPublicUrlFromKey(absoluteUrl)).isEqualTo(absoluteUrl);
    }

    private StorageUrlResolver createResolver(String mode, String publicBaseUrl, String cdnBaseUrl) {
        StorageProperties storageProperties = new StorageProperties();
        storageProperties.setMode(mode);
        storageProperties.setKeyPrefix("uploads");
        storageProperties.setPublicBaseUrl(publicBaseUrl);
        storageProperties.setCdnBaseUrl(cdnBaseUrl);

        StorageKeyNormalizer normalizer = new StorageKeyNormalizer(storageProperties);
        return new StorageUrlResolver(storageProperties, normalizer);
    }
}
