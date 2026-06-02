package com.popups.pupoo.storage.support;

import com.popups.pupoo.storage.config.StorageProperties;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class StorageKeyNormalizerTest {

    @Test
    void normalizesLegacyClasspathPathToStorageKey() {
        StorageKeyNormalizer normalizer = createNormalizer();

        assertThat(normalizer.normalizeToKey("src\\main\\resources\\uploads\\event\\a.jpg"))
                .isEqualTo("uploads/event/a.jpg");
    }

    @Test
    void normalizesLeadingSlashUploadPathToStorageKey() {
        StorageKeyNormalizer normalizer = createNormalizer();

        assertThat(normalizer.normalizeToKey("/uploads/gallery/x.png"))
                .isEqualTo("uploads/gallery/x.png");
    }

    @Test
    void returnsNullForNullOrBlankValues() {
        StorageKeyNormalizer normalizer = createNormalizer();

        assertThat(normalizer.normalizeToKey(null)).isNull();
        assertThat(normalizer.normalizeToKey("   ")).isNull();
    }

    private StorageKeyNormalizer createNormalizer() {
        StorageProperties storageProperties = new StorageProperties();
        storageProperties.setKeyPrefix("uploads");
        return new StorageKeyNormalizer(storageProperties);
    }
}
