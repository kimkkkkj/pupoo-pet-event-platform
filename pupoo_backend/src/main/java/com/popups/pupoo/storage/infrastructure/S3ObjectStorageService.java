package com.popups.pupoo.storage.infrastructure;

import com.popups.pupoo.common.exception.BusinessException;
import com.popups.pupoo.common.exception.ErrorCode;
import com.popups.pupoo.storage.config.StorageProperties;
import com.popups.pupoo.storage.port.ObjectStoragePort;
import com.popups.pupoo.storage.support.StorageKeyNormalizer;
import com.popups.pupoo.storage.support.StorageUrlResolver;
import jakarta.annotation.PreDestroy;
import org.springframework.boot.autoconfigure.condition.ConditionalOnExpression;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.AwsCredentialsProvider;
import software.amazon.awssdk.auth.credentials.AwsSessionCredentials;
import software.amazon.awssdk.auth.credentials.DefaultCredentialsProvider;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.S3Configuration;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.NoSuchKeyException;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.model.S3Exception;

import java.io.InputStream;
import java.net.URI;

@Service
@ConditionalOnExpression("'${storage.mode:LOCAL}'.equalsIgnoreCase('S3')")
public class S3ObjectStorageService implements ObjectStoragePort {

    private final S3Client s3Client;
    private final String bucket;
    private final StorageKeyNormalizer storageKeyNormalizer;
    private final StorageUrlResolver storageUrlResolver;

    public S3ObjectStorageService(
            StorageProperties storageProperties,
            StorageKeyNormalizer storageKeyNormalizer,
            StorageUrlResolver storageUrlResolver
    ) {
        if (!StringUtils.hasText(storageProperties.getBucket())) {
            throw new BusinessException(ErrorCode.INTERNAL_ERROR, "storage.bucket is required");
        }
        if (!StringUtils.hasText(storageProperties.getRegion())) {
            throw new BusinessException(ErrorCode.INTERNAL_ERROR, "storage.region is required");
        }

        this.bucket = storageProperties.getBucket().trim();
        this.storageKeyNormalizer = storageKeyNormalizer;
        this.storageUrlResolver = storageUrlResolver;

        var clientBuilder = S3Client.builder()
                .region(Region.of(storageProperties.getRegion().trim()))
                .credentialsProvider(resolveCredentialsProvider(
                        storageProperties.getAccessKeyId(),
                        storageProperties.getSecretAccessKey(),
                        storageProperties.getSessionToken()
                ));

        if (StringUtils.hasText(storageProperties.getServiceEndpoint())) {
            URI endpoint = URI.create(storageProperties.getServiceEndpoint().trim());
            clientBuilder
                    .endpointOverride(endpoint)
                    .serviceConfiguration(S3Configuration.builder()
                            .pathStyleAccessEnabled(storageProperties.isPathStyleAccess())
                            .build());
        }

        this.s3Client = clientBuilder.build();
    }

    @Override
    public void putObject(String bucketIgnored, String key, byte[] bytes, String contentType) {
        String actualKey = toStorageKey(key);
        try {
            PutObjectRequest.Builder request = PutObjectRequest.builder()
                    .bucket(bucket)
                    .key(actualKey);
            if (StringUtils.hasText(contentType)) {
                request.contentType(contentType);
            }
            s3Client.putObject(request.build(), RequestBody.fromBytes(bytes));
        } catch (S3Exception e) {
            throw new BusinessException(ErrorCode.INTERNAL_ERROR, "Failed to upload file to S3: " + safeMessage(e));
        }
    }

    @Override
    public InputStream getObject(String bucketIgnored, String key) {
        String actualKey = toStorageKey(key);
        try {
            return s3Client.getObject(GetObjectRequest.builder()
                    .bucket(bucket)
                    .key(actualKey)
                    .build());
        } catch (NoSuchKeyException e) {
            throw new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "File not found");
        } catch (S3Exception e) {
            if (e.statusCode() == 404) {
                throw new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "File not found");
            }
            throw new BusinessException(ErrorCode.INTERNAL_ERROR, "Failed to read file from S3: " + safeMessage(e));
        }
    }

    @Override
    public void deleteObject(String bucketIgnored, String key) {
        String actualKey = toStorageKey(key);
        try {
            s3Client.deleteObject(DeleteObjectRequest.builder()
                    .bucket(bucket)
                    .key(actualKey)
                    .build());
        } catch (S3Exception e) {
            throw new BusinessException(ErrorCode.INTERNAL_ERROR, "Failed to delete file from S3: " + safeMessage(e));
        }
    }

    @Override
    public String getPublicPath(String bucketIgnored, String key) {
        return storageUrlResolver.toPublicUrlFromKey(key);
    }

    @PreDestroy
    public void close() {
        s3Client.close();
    }

    private String toStorageKey(String key) {
        if (!StringUtils.hasText(key)) {
            throw new BusinessException(ErrorCode.INVALID_REQUEST, "key is required");
        }
        return storageKeyNormalizer.ensureKeyPrefix(key);
    }

    private static String safeMessage(S3Exception e) {
        if (e.awsErrorDetails() != null && StringUtils.hasText(e.awsErrorDetails().errorMessage())) {
            return e.awsErrorDetails().errorMessage();
        }
        return e.getMessage();
    }

    private static AwsCredentialsProvider resolveCredentialsProvider(
            String accessKeyId,
            String secretAccessKey,
            String sessionToken
    ) {
        boolean hasAccessKey = StringUtils.hasText(accessKeyId);
        boolean hasSecretKey = StringUtils.hasText(secretAccessKey);

        if (hasAccessKey != hasSecretKey) {
            throw new BusinessException(
                    ErrorCode.INTERNAL_ERROR,
                    "storage.access-key-id and storage.secret-access-key must be configured together"
            );
        }

        if (!hasAccessKey) {
            return DefaultCredentialsProvider.create();
        }

        if (StringUtils.hasText(sessionToken)) {
            return StaticCredentialsProvider.create(
                    AwsSessionCredentials.create(accessKeyId.trim(), secretAccessKey.trim(), sessionToken.trim())
            );
        }

        return StaticCredentialsProvider.create(
                AwsBasicCredentials.create(accessKeyId.trim(), secretAccessKey.trim())
        );
    }
}
