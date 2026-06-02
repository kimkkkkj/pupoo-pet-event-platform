// file: src/main/java/com/popups/pupoo/storage/dto/UploadRequest.java
package com.popups.pupoo.storage.dto;

import com.popups.pupoo.common.exception.BusinessException;
import com.popups.pupoo.common.exception.ErrorCode;
import com.popups.pupoo.storage.infrastructure.StorageKeyGenerator;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class UploadRequest {

    private String targetType; // POST / NOTICE (GALLERY/QR은 각 도메인 API에서 별도 처리)
    private Long contentId;    // postId 또는 noticeId
    public StorageKeyGenerator.UploadTargetType parsedTargetType() {
        if (targetType == null || targetType.isBlank()) {
            throw new BusinessException(ErrorCode.VALIDATION_FAILED, "targetType is required");
        }
        try {
            return StorageKeyGenerator.UploadTargetType.valueOf(targetType.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new BusinessException(ErrorCode.VALIDATION_FAILED, "invalid targetType: " + targetType);
        }
    }

    public void validateForFilesTable() {
        StorageKeyGenerator.UploadTargetType t = parsedTargetType();
        if (t != StorageKeyGenerator.UploadTargetType.POST && t != StorageKeyGenerator.UploadTargetType.NOTICE) {
            throw new BusinessException(ErrorCode.INVALID_REQUEST,
                    "이 엔드포인트는 POST/NOTICE만 지원한다. 다른 타입은 Gallery/QR API를 사용한다.");
        }
        if (contentId == null || contentId <= 0) {
            throw new BusinessException(ErrorCode.VALIDATION_FAILED, "contentId is required");
        }
    }
}
