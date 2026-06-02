package com.popups.pupoo.board.bannedword.application;

import com.popups.pupoo.board.bannedword.dto.ModerationPolicyArchiveResult;
import com.popups.pupoo.storage.config.StorageProperties;
import com.popups.pupoo.storage.port.ObjectStoragePort;
import com.popups.pupoo.storage.support.StorageKeyNormalizer;
import com.popups.pupoo.storage.support.StorageUrlResolver;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.Locale;
import java.util.Optional;

/**
 * 모더레이션 정책 원본을 {@link ObjectStoragePort}로 저장한다.
 * S3 모드(AWS S3·IBM COS 등 S3 호환)와 로컬 모드를 지원한다.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ModerationPolicyObjectArchiveService {

    private static final String DUMMY_BUCKET = "local";
    private static final int MAX_FILENAME_LEN = 180;

    private final ObjectStoragePort objectStoragePort;
    private final StorageProperties storageProperties;
    private final StorageKeyNormalizer storageKeyNormalizer;
    private final StorageUrlResolver storageUrlResolver;

    /**
     * 실패 시 빈 Optional — 업로드 이력·AI 반영은 계속 진행할 수 있다.
     */
    public Optional<ModerationPolicyArchiveResult> archive(byte[] bytes, String originalFilename, long policyUploadId) {
        if (bytes == null || bytes.length == 0) {
            return Optional.empty();
        }
        try {
            String safe = safeFileName(originalFilename);
            String relative = "moderation-policies/" + policyUploadId + "_" + safe;
            String objectKey = storageKeyNormalizer.ensureKeyPrefix(relative);
            String contentType = guessContentType(safe);

            objectStoragePort.putObject(DUMMY_BUCKET, objectKey, bytes, contentType);

            String mode = storageProperties.getMode() == null ? "local" : storageProperties.getMode().trim();
            boolean s3Like = mode.equalsIgnoreCase("s3");
            String provider = s3Like ? "s3" : "local";
            String bucket = s3Like && StringUtils.hasText(storageProperties.getBucket())
                    ? storageProperties.getBucket().trim()
                    : null;

            String publicOrRelative = storageUrlResolver.toPublicUrlFromKey(objectKey);
            String uri = publicOrRelative;
            if (s3Like && StringUtils.hasText(bucket)) {
                if (!StringUtils.hasText(uri) || uri.startsWith("/")) {
                    uri = "s3://" + bucket + "/" + objectKey;
                }
            }

            return Optional.of(new ModerationPolicyArchiveResult(provider, bucket, objectKey, uri));
        } catch (Exception e) {
            log.warn("moderation policy object archive skipped: {}", e.getMessage());
            return Optional.empty();
        }
    }

    private static String safeFileName(String original) {
        if (!StringUtils.hasText(original)) {
            return "policy";
        }
        String name = original.trim();
        int slash = Math.max(name.lastIndexOf('/'), name.lastIndexOf('\\'));
        if (slash >= 0) {
            name = name.substring(slash + 1);
        }
        if (!StringUtils.hasText(name)) {
            return "policy";
        }
        name = name.replaceAll("[^a-zA-Z0-9._-]", "_");
        if (name.length() > MAX_FILENAME_LEN) {
            name = name.substring(0, MAX_FILENAME_LEN);
        }
        return name;
    }

    private static String guessContentType(String filename) {
        if (filename == null) {
            return "application/octet-stream";
        }
        String lower = filename.toLowerCase(Locale.ROOT);
        if (lower.endsWith(".json")) {
            return "application/json";
        }
        if (lower.endsWith(".txt")) {
            return "text/plain; charset=UTF-8";
        }
        return "application/octet-stream";
    }
}
