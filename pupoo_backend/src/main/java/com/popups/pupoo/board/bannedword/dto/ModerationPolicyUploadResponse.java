package com.popups.pupoo.board.bannedword.dto;

import com.popups.pupoo.board.bannedword.domain.model.ModerationPolicyUpload;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class ModerationPolicyUploadResponse {

    private final Long policyUploadId;
    private final String originalFilename;
    private final String fileExt;
    private final Long fileSizeBytes;
    private final String contentSha256;
    private final String storageProvider;
    private final String storageBucket;
    private final String storageObjectKey;
    private final String storageUri;
    private final Long uploadedByUserId;
    private final LocalDateTime uploadedAt;
    private final String aiApplyStatus;
    private final String milvusCollectionName;
    private final String activePolicyFilename;
    private final Integer chunkCount;
    private final Integer embeddingDim;
    private final String aiErrorMessage;
    private final LocalDateTime aiAppliedAt;
    private final String adminNote;

    public static ModerationPolicyUploadResponse from(ModerationPolicyUpload e) {
        return ModerationPolicyUploadResponse.builder()
                .policyUploadId(e.getPolicyUploadId())
                .originalFilename(e.getOriginalFilename())
                .fileExt(e.getFileExt())
                .fileSizeBytes(e.getFileSizeBytes())
                .contentSha256(e.getContentSha256())
                .storageProvider(e.getStorageProvider())
                .storageBucket(e.getStorageBucket())
                .storageObjectKey(e.getStorageObjectKey())
                .storageUri(e.getStorageUri())
                .uploadedByUserId(e.getUploadedByUserId())
                .uploadedAt(e.getUploadedAt())
                .aiApplyStatus(e.getAiApplyStatus())
                .milvusCollectionName(e.getMilvusCollectionName())
                .activePolicyFilename(e.getActivePolicyFilename())
                .chunkCount(e.getChunkCount())
                .embeddingDim(e.getEmbeddingDim())
                .aiErrorMessage(e.getAiErrorMessage())
                .aiAppliedAt(e.getAiAppliedAt())
                .adminNote(e.getAdminNote())
                .build();
    }
}
