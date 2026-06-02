// file: src/main/java/com/popups/pupoo/event/application/EventStatusSyncService.java
package com.popups.pupoo.event.application;

import com.popups.pupoo.event.persistence.EventRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 행사 상태 자동 동기화 서비스
 *
 * 상태 변경 규칙:
 * 1. start_at > now → PLANNED
 * 2. start_at <= now <= end_at → ONGOING
 * 3. end_at < now → ENDED
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class EventStatusSyncService {

    private final EventRepository eventRepository;

    /**
     * 1분마다 행사 상태 자동 업데이트
     */
    @Scheduled(fixedRate = 60000)
    @Transactional
    public void syncEventStatus() {

        int planned = eventRepository.syncToPlanned();
        int ongoing = eventRepository.syncToOngoing();
        int ended = eventRepository.syncToEnded();

        if (planned + ongoing + ended > 0) {
            log.info("Event status sync 완료 - planned: {}, ongoing: {}, ended: {}",
                    planned, ongoing, ended);
        }
    }
}