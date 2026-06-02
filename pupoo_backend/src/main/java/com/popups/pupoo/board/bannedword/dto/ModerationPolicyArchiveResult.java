package com.popups.pupoo.board.bannedword.dto;

/**
 * 정책 원본 파일을 객체 스토리지(S3·COS 호환 API 또는 로컬)에 저장한 결과.
 */
public record ModerationPolicyArchiveResult(
        String storageProvider,
        String storageBucket,
        String objectKey,
        String storageUri
) {}
