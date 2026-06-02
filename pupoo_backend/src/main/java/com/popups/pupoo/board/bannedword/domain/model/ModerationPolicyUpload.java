package com.popups.pupoo.board.bannedword.domain.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * 모더레이션 정책 파일 업로드 이력 (moderation_policy_uploads)
 */
@Entity
@Table(name = "moderation_policy_uploads")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Builder
public class ModerationPolicyUpload {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "policy_upload_id", nullable = false)
    private Long policyUploadId;

    @Column(name = "original_filename", nullable = false, length = 512)
    private String originalFilename;

    @Column(name = "file_ext", length = 16)
    private String fileExt;

    @Column(name = "file_size_bytes")
    private Long fileSizeBytes;

    /** DB 스키마는 SHA-256 hex 고정 길이용 CHAR(64) — VARCHAR 와 혼용 시 validate 실패 방지 */
    @Column(name = "content_sha256", columnDefinition = "CHAR(64)")
    private String contentSha256;

    @Column(name = "storage_provider", length = 32)
    private String storageProvider;

    @Column(name = "storage_bucket", length = 255)
    private String storageBucket;

    @Column(name = "storage_object_key", length = 1024)
    private String storageObjectKey;

    @Column(name = "storage_uri", columnDefinition = "TEXT")
    private String storageUri;

    @Column(name = "uploaded_by_user_id", nullable = false)
    private Long uploadedByUserId;

    @Column(name = "uploaded_at", nullable = false, insertable = false, updatable = false)
    private LocalDateTime uploadedAt;

    @Column(name = "ai_apply_status", nullable = false, length = 32)
    @Builder.Default
    private String aiApplyStatus = "PENDING";

    @Column(name = "milvus_collection_name", length = 256)
    private String milvusCollectionName;

    @Column(name = "active_policy_filename", length = 512)
    private String activePolicyFilename;

    @Column(name = "chunk_count")
    private Integer chunkCount;

    @Column(name = "embedding_dim")
    private Integer embeddingDim;

    @Column(name = "ai_error_message", columnDefinition = "TEXT")
    private String aiErrorMessage;

    @Column(name = "ai_applied_at")
    private LocalDateTime aiAppliedAt;

    @Column(name = "admin_note", length = 500)
    private String adminNote;
}
