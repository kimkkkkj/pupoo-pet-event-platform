// file: src/main/java/com/popups/pupoo/storage/infrastructure/StorageKeyGenerator.java
package com.popups.pupoo.storage.infrastructure;

import com.popups.pupoo.common.exception.BusinessException;
import com.popups.pupoo.common.exception.ErrorCode;
import com.popups.pupoo.common.util.FileNameUtil;
import com.popups.pupoo.storage.support.StorageKeyNormalizer;
import org.springframework.stereotype.Component;

/**
 * Generates storage keys used by both local storage + Nginx and future object storages.
 */
@Component
public class StorageKeyGenerator {

    private final StorageKeyNormalizer storageKeyNormalizer;

    public StorageKeyGenerator(StorageKeyNormalizer storageKeyNormalizer) {
        this.storageKeyNormalizer = storageKeyNormalizer;
    }

    public enum UploadTargetType {
        POST, NOTICE, GALLERY, QR
    }

    /**
     * Generates a key like: post/{id}/{storedName}
     */
    public String generateKey(UploadTargetType type, Long contentId, String originalFilename) {
        String folder = resolveFolder(type, contentId);
        String storedName = FileNameUtil.generateStoredName(originalFilename);
        return storageKeyNormalizer.ensureKeyPrefix(folder + "/" + storedName);
    }

    public String buildKey(UploadTargetType type, Long contentId, String storedName) {
        String folder = resolveFolder(type, contentId);
        return storageKeyNormalizer.ensureKeyPrefix(folder + "/" + extractFileName(storedName));
    }

    public String generateStandaloneKey(String folder, String originalFilename) {
        String normalizedFolder = normalizeFolder(folder);
        String storedName = FileNameUtil.generateStoredName(originalFilename);
        return storageKeyNormalizer.ensureKeyPrefix(normalizedFolder + "/" + storedName);
    }

    public String buildStandaloneKey(String folder, String storedName) {
        String normalizedFolder = normalizeFolder(folder);
        if (storedName == null || storedName.isBlank()) {
            throw new BusinessException(ErrorCode.INVALID_REQUEST, "storedName is required");
        }
        return storageKeyNormalizer.ensureKeyPrefix(normalizedFolder + "/" + extractFileName(storedName));
    }

    public String resolveFolder(UploadTargetType type, Long contentId) {
        if (type == null || contentId == null || contentId <= 0) {
            throw new BusinessException(ErrorCode.INVALID_REQUEST, "Invalid upload target or contentId");
        }

        return switch (type) {
            case POST -> "post/" + contentId;
            case NOTICE -> "notice/" + contentId;
            case GALLERY -> "gallery/" + contentId;
            case QR -> "qr/" + contentId;
        };
    }

    /**
     * 갤러리 임시 업로드용 키 (files 테이블 없이 스토리지만 사용).
     * gallery/temp/{userId}/{storedName}
     */
    public String generateKeyForGalleryTemp(Long userId, String originalFilename) {
        if (userId == null) {
            throw new BusinessException(ErrorCode.INVALID_REQUEST, "userId is required for gallery temp upload");
        }
        String storedName = FileNameUtil.generateStoredName(originalFilename);
        return storageKeyNormalizer.ensureKeyPrefix("gallery/temp/" + userId + "/" + storedName);
    }

    private String normalizeFolder(String folder) {
        if (folder == null || folder.isBlank()) {
            throw new BusinessException(ErrorCode.INVALID_REQUEST, "folder is required");
        }

        String normalized = folder.trim().replace('\\', '/');
        while (normalized.startsWith("/")) {
            normalized = normalized.substring(1);
        }
        while (normalized.endsWith("/")) {
            normalized = normalized.substring(0, normalized.length() - 1);
        }
        if (normalized.isBlank()) {
            throw new BusinessException(ErrorCode.INVALID_REQUEST, "folder is required");
        }
        return normalized;
    }

    public String extractFileName(String rawValue) {
        String fileName = storageKeyNormalizer.extractFileName(rawValue);
        if (fileName == null || fileName.isBlank()) {
            throw new BusinessException(ErrorCode.INVALID_REQUEST, "storedName is required");
        }
        return fileName;
    }
}
