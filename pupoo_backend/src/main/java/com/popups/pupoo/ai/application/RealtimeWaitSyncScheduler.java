package com.popups.pupoo.ai.application;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
@ConditionalOnProperty(
        prefix = "ai.wait.sync.scheduler",
        name = "enabled",
        havingValue = "true",
        matchIfMissing = true
)
public class RealtimeWaitSyncScheduler {

    private final RealtimeWaitSyncService realtimeWaitSyncService;

    @Scheduled(
            fixedDelayString = "${ai.wait.sync.scheduler.fixed-delay-ms:15000}",
            initialDelayString = "${ai.wait.sync.scheduler.initial-delay-ms:5000}"
    )
    public void syncRealtimeWaits() {
        try {
            RealtimeWaitSyncService.WaitSyncResult result = realtimeWaitSyncService.syncCurrentSnapshot();
            log.info(
                    "Realtime wait scheduler completed. baseTime={}, programUpsertCount={}, boothUpsertCount={}",
                    result.baseTime(),
                    result.programUpsertCount(),
                    result.boothUpsertCount()
            );
        } catch (Exception exception) {
            log.error("Realtime wait scheduler failed.", exception);
        }
    }
}
