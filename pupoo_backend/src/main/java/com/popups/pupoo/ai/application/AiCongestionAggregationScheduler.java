package com.popups.pupoo.ai.application;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Slf4j
@Service
@RequiredArgsConstructor
@ConditionalOnProperty(prefix = "ai.scheduler", name = "enabled", havingValue = "true", matchIfMissing = true)
public class AiCongestionAggregationScheduler {

    private final AiCongestionAggregationService aiCongestionAggregationService;

    @Scheduled(cron = "${ai.aggregation.scheduler.cron:0 */5 * * * *}", zone = "${ai.aggregation.scheduler.zone:Asia/Seoul}")
    public void aggregateCurrentBucket() {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime bucket = aiCongestionAggregationService.floorToFiveMinutes(now);
        try {
            AiCongestionAggregationService.BucketAggregationResult result =
                    aiCongestionAggregationService.aggregateForBucket(bucket);
            log.info(
                    "AI congestion scheduler completed. bucket={}, eventUpsertCount={}, programUpsertCount={}",
                    bucket,
                    result.eventUpsertCount(),
                    result.programUpsertCount()
            );
        } catch (Exception exception) {
            log.error("AI congestion scheduler failed. bucket={}", bucket, exception);
        }
    }
}
