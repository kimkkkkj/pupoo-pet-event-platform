// file: src/main/java/com/popups/pupoo/storage/domain/model/StoredFile.java
package com.popups.pupoo.storage.domain.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;

import java.time.LocalDateTime;

/**
 * 업로드 파일 메타데이터 엔티티다.
 * 실제 오브젝트 삭제는 지연 배치로 처리하므로 soft delete 시점과 오브젝트 삭제 시점을 따로 기록한다.
 */
@Getter
@Entity
@Table(name = "files")
public class StoredFile {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "file_id")
    private Long fileId;

    @Column(name = "original_name", nullable = false, length = 255)
    private String originalName;

    /**
     * legacy 컬럼명은 `stored_name`이지만 현재는 파일명 대신 전체 스토리지 키를 저장할 수 있다.
     */
    @Column(name = "stored_name", nullable = false, length = 255, unique = true)
    private String storedName;

    /**
     * 업로더 사용자 ID다.
     */
    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "post_id")
    private Long postId;

    @Column(name = "notice_id")
    private Long noticeId;

    /**
     * soft delete 시각이다.
     */
    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    @Column(name = "deleted_by")
    private Long deletedBy;

    @Column(name = "delete_reason", length = 255)
    private String deleteReason;

    /**
     * 배치가 실제 오브젝트 삭제까지 마친 시각이다.
     */
    @Column(name = "object_deleted_at")
    private LocalDateTime objectDeletedAt;

    protected StoredFile() {}

    private StoredFile(String originalName, String storedName, Long userId, Long postId, Long noticeId) {
        this.originalName = originalName;
        this.storedName = storedName;
        this.userId = userId;
        this.postId = postId;
        this.noticeId = noticeId;
    }

    public static StoredFile forPost(String originalName, String storedName, Long userId, Long postId) {
        return new StoredFile(originalName, storedName, userId, postId, null);
    }

    public static StoredFile forNotice(String originalName, String storedName, Long userId, Long noticeId) {
        return new StoredFile(originalName, storedName, userId, null, noticeId);
    }

    public boolean isDeleted() {
        return deletedAt != null;
    }

    public void markDeleted(Long deletedBy, String reason) {
        if (this.deletedAt != null) return;
        this.deletedAt = LocalDateTime.now();
        this.deletedBy = deletedBy;
        this.deleteReason = reason;
    }

    public void markObjectDeleted() {
        this.objectDeletedAt = LocalDateTime.now();
    }
}
