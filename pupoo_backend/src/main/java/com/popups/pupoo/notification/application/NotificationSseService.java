package com.popups.pupoo.notification.application;

import com.popups.pupoo.notification.dto.NotificationSsePayload;
import com.popups.pupoo.common.observability.application.OperationsMetricsService;
import io.micrometer.core.instrument.MeterRegistry;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.Collection;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class NotificationSseService {

    private static final Logger log = LoggerFactory.getLogger(NotificationSseService.class);
    private static final long SSE_TIMEOUT_MILLIS = 30L * 60L * 1000L;
    private static final String CONNECTED_EVENT_NAME = "connected";
    private static final String NOTIFICATION_EVENT_NAME = "notification-received";

    private final OperationsMetricsService operationsMetricsService;
    private final Map<Long, Map<String, SseEmitter>> emittersByUserId = new ConcurrentHashMap<>();

    public NotificationSseService(OperationsMetricsService operationsMetricsService, MeterRegistry meterRegistry) {
        this.operationsMetricsService = operationsMetricsService;
        meterRegistry.gauge("pupoo.notification.sse.connections.active", this, NotificationSseService::activeConnectionCount);
    }

    public SseEmitter connect(Long userId) {
        SseEmitter emitter = new SseEmitter(SSE_TIMEOUT_MILLIS);
        String emitterId = UUID.randomUUID().toString();
        boolean reconnect = hasExistingEmitter(userId);

        emittersByUserId
                .computeIfAbsent(userId, ignored -> new ConcurrentHashMap<>())
                .put(emitterId, emitter);

        operationsMetricsService.recordSseConnect(reconnect);

        emitter.onCompletion(() -> removeEmitter(userId, emitterId, "completed"));
        emitter.onTimeout(() -> {
            removeEmitter(userId, emitterId, "timeout");
            emitter.complete();
        });
        emitter.onError(ex -> {
            removeEmitter(userId, emitterId, "error");
            emitter.completeWithError(ex);
        });

        try {
            emitter.send(SseEmitter.event()
                    .name(CONNECTED_EVENT_NAME)
                    .data(Map.of("status", "connected")));
        } catch (IOException | IllegalStateException ex) {
            removeEmitter(userId, emitterId, "error");
            emitter.complete();
            throw new IllegalStateException("Failed to initialize notification SSE stream", ex);
        }

        return emitter;
    }

    public void sendNotification(Collection<Long> userIds, NotificationSsePayload payload) {
        for (Long userId : userIds) {
            sendNotification(userId, payload);
        }
    }

    public void sendNotification(Long userId, NotificationSsePayload payload) {
        Map<String, SseEmitter> emitters = emittersByUserId.get(userId);
        if (emitters == null || emitters.isEmpty()) {
            return;
        }

        emitters.forEach((emitterId, emitter) -> {
            try {
                emitter.send(SseEmitter.event()
                        .name(NOTIFICATION_EVENT_NAME)
                        .data(payload));
            } catch (IOException | IllegalStateException ex) {
                log.debug("Failed to push notification SSE. userId={}, emitterId={}", userId, emitterId, ex);
                removeEmitter(userId, emitterId, "send_failure");
                emitter.complete();
            }
        });
    }

    public long activeConnectionCount() {
        return emittersByUserId.values().stream()
                .mapToLong(Map::size)
                .sum();
    }

    private boolean hasExistingEmitter(Long userId) {
        Map<String, SseEmitter> emitters = emittersByUserId.get(userId);
        return emitters != null && !emitters.isEmpty();
    }

    private void removeEmitter(Long userId, String emitterId, String reason) {
        Map<String, SseEmitter> emitters = emittersByUserId.get(userId);
        if (emitters == null) {
            return;
        }

        SseEmitter removed = emitters.remove(emitterId);
        if (removed == null) {
            return;
        }

        if (emitters.isEmpty()) {
            emittersByUserId.remove(userId, emitters);
        }

        operationsMetricsService.recordSseDisconnect(reason);
    }
}
