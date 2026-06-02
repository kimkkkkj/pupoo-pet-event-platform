package com.popups.pupoo.ai.application;

import com.popups.pupoo.event.domain.enums.EventStatus;
import com.popups.pupoo.event.domain.model.Event;
import com.popups.pupoo.event.persistence.EventRepository;
import com.popups.pupoo.program.domain.model.Program;
import com.popups.pupoo.program.persistence.ProgramRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.data.domain.Pageable;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
@ConditionalOnProperty(prefix = "ai.scheduler", name = "enabled", havingValue = "true", matchIfMissing = true)
public class AiPredictionScheduler {

    private final EventRepository eventRepository;
    private final ProgramRepository programRepository;
    private final AiCongestionService aiCongestionService;

    @Scheduled(
            fixedDelayString = "${ai.scheduler.fixed-delay-ms:300000}",
            initialDelayString = "${ai.scheduler.initial-delay-ms:30000}"
    )
    public void runRealtimePredictionBatch() {
        List<Event> ongoingEvents = eventRepository.findByStatus(EventStatus.ONGOING);
        if (ongoingEvents.isEmpty()) {
            log.debug("AI prediction scheduler skipped: no ongoing events.");
            return;
        }

        LocalDateTime now = LocalDateTime.now();
        int eventSuccess = 0;
        int eventFailed = 0;
        int programSuccess = 0;
        int programFailed = 0;

        for (Event event : ongoingEvents) {
            try {
                aiCongestionService.predictEvent(event.getEventId());
                eventSuccess++;
            } catch (Exception exception) {
                eventFailed++;
                log.warn("AI scheduled event prediction failed. eventId={}", event.getEventId(), exception);
            }

            List<Program> programs = programRepository.findByEventId(event.getEventId(), Pageable.unpaged()).getContent();
            for (Program program : programs) {
                if (program.getEndAt().isBefore(now)) {
                    continue;
                }
                try {
                    aiCongestionService.predictProgram(program.getProgramId());
                    programSuccess++;
                } catch (Exception exception) {
                    programFailed++;
                    log.warn(
                            "AI scheduled program prediction failed. eventId={}, programId={}",
                            event.getEventId(),
                            program.getProgramId(),
                            exception
                    );
                }
            }
        }

        log.info(
                "AI prediction scheduler completed. ongoingEvents={}, eventSuccess={}, eventFailed={}, programSuccess={}, programFailed={}",
                ongoingEvents.size(),
                eventSuccess,
                eventFailed,
                programSuccess,
                programFailed
        );
    }
}
