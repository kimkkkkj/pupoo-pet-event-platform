package com.popups.pupoo.board.bannedword.application;

import com.popups.pupoo.board.bannedword.domain.model.ModerationPolicyUpload;
import com.popups.pupoo.board.bannedword.dto.ModerationPolicyUploadResponse;
import com.popups.pupoo.board.bannedword.persistence.ModerationPolicyUploadRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HexFormat;

@Service
@RequiredArgsConstructor
public class ModerationPolicyUploadService {

    private static final int ERR_MSG_MAX = 8000;

    private final ModerationPolicyUploadRepository moderationPolicyUploadRepository;

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public ModerationPolicyUpload createPending(
            byte[] content,
            String originalFilename,
            String fileExt,
            Long uploadedByUserId) {
        String sha = sha256Hex(content);
        ModerationPolicyUpload row = ModerationPolicyUpload.builder()
                .originalFilename(originalFilename != null ? originalFilename : "")
                .fileExt(fileExt)
                .fileSizeBytes(content != null ? (long) content.length : null)
                .contentSha256(sha)
                .uploadedByUserId(uploadedByUserId)
                .aiApplyStatus("PENDING")
                .build();
        return moderationPolicyUploadRepository.save(row);
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void attachStorage(
            Long policyUploadId,
            String storageProvider,
            String storageBucket,
            String objectKey,
            String storageUri) {
        ModerationPolicyUpload row = moderationPolicyUploadRepository.findById(policyUploadId)
                .orElseThrow();
        row.setStorageProvider(storageProvider);
        row.setStorageBucket(storageBucket);
        row.setStorageObjectKey(objectKey);
        row.setStorageUri(storageUri);
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void markSuccess(
            Long policyUploadId,
            String milvusCollectionName,
            String activePolicyFilename,
            Integer chunkCount,
            Integer embeddingDim) {
        ModerationPolicyUpload row = moderationPolicyUploadRepository.findById(policyUploadId)
                .orElseThrow();
        row.setAiApplyStatus("SUCCESS");
        row.setMilvusCollectionName(milvusCollectionName);
        row.setActivePolicyFilename(activePolicyFilename);
        row.setChunkCount(chunkCount);
        row.setEmbeddingDim(embeddingDim);
        row.setAiErrorMessage(null);
        row.setAiAppliedAt(LocalDateTime.now());
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void markOrchestrationDispatched(Long policyUploadId) {
        ModerationPolicyUpload row = moderationPolicyUploadRepository.findById(policyUploadId)
                .orElseThrow();
        row.setAiApplyStatus("DISPATCHED");
        row.setAiErrorMessage(null);
        row.setAiAppliedAt(LocalDateTime.now());
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void markFailed(Long policyUploadId, String errorMessage) {
        ModerationPolicyUpload row = moderationPolicyUploadRepository.findById(policyUploadId)
                .orElseThrow();
        row.setAiApplyStatus("FAILED");
        row.setAiErrorMessage(truncate(errorMessage, ERR_MSG_MAX));
        row.setAiAppliedAt(LocalDateTime.now());
    }

    @Transactional(readOnly = true)
    public Page<ModerationPolicyUploadResponse> page(Pageable pageable) {
        return moderationPolicyUploadRepository.findAllByOrderByPolicyUploadIdDesc(pageable)
                .map(ModerationPolicyUploadResponse::from);
    }

    private static String sha256Hex(byte[] content) {
        if (content == null || content.length == 0) {
            return null;
        }
        try {
            byte[] digest = java.security.MessageDigest.getInstance("SHA-256").digest(content);
            return HexFormat.of().formatHex(digest);
        } catch (java.security.NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 not available", e);
        }
    }

    private static String truncate(String s, int max) {
        if (s == null) {
            return null;
        }
        return s.length() <= max ? s : s.substring(0, max);
    }
}
