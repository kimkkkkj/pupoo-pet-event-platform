// file: src/main/java/com/popups/pupoo/storage/application/StoragePurgeScheduler.java
package com.popups.pupoo.storage.application;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * soft delete 후 보존 기간이 지난 파일 오브젝트를 실제 저장소에서 정리하는 스케줄러다.
 * 메타데이터 soft delete와 실제 오브젝트 삭제 시점을 분리하는 현재 정책의 후행 작업을 담당한다.
 */
@Component
public class StoragePurgeScheduler {

    private static final int RETENTION_DAYS = 7;

    private final StorageService storageService;

    public StoragePurgeScheduler(StorageService storageService) {
        this.storageService = storageService;
    }

    /**
     * 매일 03:10에 보존 기간이 지난 soft delete 파일을 정리한다.
     */
    @Scheduled(cron = "0 10 3 * * *")
    public void purge() {
        storageService.purgeDeletedObjects(RETENTION_DAYS);
    }
}
