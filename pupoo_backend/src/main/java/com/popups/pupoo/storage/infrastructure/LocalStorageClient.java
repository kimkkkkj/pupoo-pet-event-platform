// file: src/main/java/com/popups/pupoo/storage/infrastructure/LocalStorageClient.java
package com.popups.pupoo.storage.infrastructure;

import com.popups.pupoo.common.exception.BusinessException;
import com.popups.pupoo.common.exception.ErrorCode;
import org.springframework.stereotype.Component;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.NoSuchFileException;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;

/**
 * 로컬 파일시스템 접근을 담당하는 저수준(Local) 클라이언트.
 *
 *
 * 부분 쓰기(업로드 중단 등)로 인한 손상 파일을 줄이기 위해
 * 임시 파일에 먼저 기록한 뒤(Temp file), 최종 경로로 원자적 이동(move)한다.
 *
 *
 * 추후 Ubuntu 서버에서 Nginx로 정적 파일을 서빙할 때도 그대로 재사용 가능하다.
 */
@Component
public class LocalStorageClient {

    public void write(Path absolutePath, byte[] bytes) {
        Path target = absolutePath.toAbsolutePath().normalize();
        Path parent = target.getParent();
        if (parent == null) {
            throw new BusinessException(ErrorCode.INTERNAL_ERROR, "Invalid upload path: no parent");
        }
        try {
            Files.createDirectories(parent);
        } catch (IOException e) {
            throw new BusinessException(ErrorCode.INTERNAL_ERROR, "Failed to create upload directory: " + e.getMessage());
        }
        try {
            Files.write(target, bytes, StandardOpenOption.CREATE, StandardOpenOption.TRUNCATE_EXISTING);
        } catch (IOException e) {
            throw new BusinessException(ErrorCode.INTERNAL_ERROR, "Failed to write file: " + e.getMessage());
        }
    }

    public InputStream read(Path absolutePath) {
        try {
            byte[] bytes = Files.readAllBytes(absolutePath);
            return new ByteArrayInputStream(bytes);
        } catch (NoSuchFileException e) {
            throw new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "File not found");
        } catch (IOException e) {
            throw new BusinessException(ErrorCode.INTERNAL_ERROR, "Failed to read file: " + e.getMessage());
        }
    }

    public void delete(Path absolutePath) {
        try {
            Files.deleteIfExists(absolutePath);
        } catch (IOException e) {
            throw new BusinessException(ErrorCode.INTERNAL_ERROR, "Failed to delete file: " + e.getMessage());
        }
    }

    public boolean exists(Path absolutePath) {
        return Files.exists(absolutePath);
    }
}
