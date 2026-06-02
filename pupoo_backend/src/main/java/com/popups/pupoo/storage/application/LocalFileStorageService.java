// file: src/main/java/com/popups/pupoo/storage/application/LocalFileStorageService.java
package com.popups.pupoo.storage.application;

import com.popups.pupoo.common.exception.BusinessException;
import com.popups.pupoo.common.exception.ErrorCode;
import com.popups.pupoo.storage.config.StorageProperties;
import com.popups.pupoo.storage.infrastructure.LocalStorageClient;
import com.popups.pupoo.storage.port.ObjectStoragePort;
import com.popups.pupoo.storage.support.StorageKeyNormalizer;
import com.popups.pupoo.storage.support.StorageUrlResolver;
import org.springframework.boot.autoconfigure.condition.ConditionalOnExpression;
import org.springframework.stereotype.Service;

import java.io.InputStream;
import java.nio.file.Path;
import java.nio.file.Paths;

@Service
@ConditionalOnExpression("'${storage.mode:LOCAL}'.equalsIgnoreCase('LOCAL')")
public class LocalFileStorageService implements ObjectStoragePort {

    private final LocalStorageClient localStorageClient;
    private final StorageKeyNormalizer storageKeyNormalizer;
    private final StorageUrlResolver storageUrlResolver;
    private final String basePath;
    private final String keyPrefix;

    public LocalFileStorageService(
            LocalStorageClient localStorageClient,
            StorageProperties storageProperties,
            StorageKeyNormalizer storageKeyNormalizer,
            StorageUrlResolver storageUrlResolver
    ) {
        this.localStorageClient = localStorageClient;
        this.storageKeyNormalizer = storageKeyNormalizer;
        this.storageUrlResolver = storageUrlResolver;
        this.basePath = storageProperties.getBasePath();
        this.keyPrefix = normalizeKeyPrefix(storageProperties.getKeyPrefix());
    }

    @Override
    public void putObject(String bucket, String key, byte[] bytes, String contentType) {
        if (key == null || key.isBlank()) {
            throw new BusinessException(ErrorCode.INVALID_REQUEST, "key is required");
        }
        localStorageClient.write(resolvePath(key), bytes);
    }

    @Override
    public InputStream getObject(String bucket, String key) {
        if (key == null || key.isBlank()) {
            throw new BusinessException(ErrorCode.INVALID_REQUEST, "key is required");
        }
        return localStorageClient.read(resolvePath(key));
    }

    @Override
    public void deleteObject(String bucket, String key) {
        if (key == null || key.isBlank()) {
            throw new BusinessException(ErrorCode.INVALID_REQUEST, "key is required");
        }
        localStorageClient.delete(resolvePath(key));
    }

    @Override
    public String getPublicPath(String bucket, String key) {
        if (key == null || key.isBlank()) {
            throw new BusinessException(ErrorCode.INVALID_REQUEST, "key is required");
        }
        return storageUrlResolver.toPublicUrlFromKey(key);
    }

    private Path resolvePath(String key) {
        String normalizedKey = storageKeyNormalizer.normalizeToKey(key);
        String relativeKey = stripConfiguredPrefix(stripLeadingSlash(normalizedKey));
        return Paths.get(basePath, relativeKey);
    }

    private String stripConfiguredPrefix(String key) {
        if (keyPrefix.isBlank()) {
            return key;
        }
        if (key.equals(keyPrefix)) {
            return "";
        }
        if (key.startsWith(keyPrefix + "/")) {
            return key.substring(keyPrefix.length() + 1);
        }
        return key;
    }

    private static String stripLeadingSlash(String key) {
        return key.startsWith("/") ? key.substring(1) : key;
    }

    private static String normalizeKeyPrefix(String prefix) {
        if (prefix == null || prefix.isBlank()) {
            return "";
        }
        String normalized = prefix.trim().replace('\\', '/');
        while (normalized.startsWith("/")) {
            normalized = normalized.substring(1);
        }
        while (normalized.endsWith("/")) {
            normalized = normalized.substring(0, normalized.length() - 1);
        }
        return normalized;
    }
}
