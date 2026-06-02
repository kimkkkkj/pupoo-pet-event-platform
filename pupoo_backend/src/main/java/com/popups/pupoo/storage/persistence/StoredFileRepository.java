// file: src/main/java/com/popups/pupoo/storage/persistence/StoredFileRepository.java
package com.popups.pupoo.storage.persistence;

import com.popups.pupoo.storage.domain.model.StoredFile;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface StoredFileRepository extends JpaRepository<StoredFile, Long> {

    Optional<StoredFile> findByFileIdAndDeletedAtIsNull(Long fileId);

    Optional<StoredFile> findByPostIdAndDeletedAtIsNull(Long postId);

    List<StoredFile> findAllByPostIdAndDeletedAtIsNullOrderByFileIdDesc(Long postId);

    Optional<StoredFile> findByNoticeIdAndDeletedAtIsNull(Long noticeId);

    List<StoredFile> findTop100ByDeletedAtIsNotNullAndObjectDeletedAtIsNullAndDeletedAtBefore(LocalDateTime cutoff);
}