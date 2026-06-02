package com.popups.pupoo.ai.application;

import com.popups.pupoo.ai.persistence.AiCongestionAggregationQueryRepository;
import com.popups.pupoo.ai.persistence.RealtimeWaitSyncQueryRepository;
import com.popups.pupoo.booth.domain.model.BoothWait;
import com.popups.pupoo.booth.persistence.BoothWaitRepository;
import com.popups.pupoo.program.domain.model.ExperienceWait;
import com.popups.pupoo.program.persistence.ExperienceWaitRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class RealtimeWaitSyncService {

    private static final int MAX_WAIT_MINUTES = 240;
    private static final int MIN_CONCURRENCY = 1;
    private static final double MIN_STAY_MINUTES = 1.0d;
    private static final double MAX_STAY_MINUTES = 180.0d;
    private static final double DEFAULT_STAY_MINUTES_FALLBACK = 12.0d;

    private final RealtimeWaitSyncQueryRepository realtimeWaitSyncQueryRepository;
    private final AiCongestionAggregationQueryRepository aiCongestionAggregationQueryRepository;
    private final ExperienceWaitRepository experienceWaitRepository;
    private final BoothWaitRepository boothWaitRepository;

    @Value("${ai.wait.sync.lookback-minutes:15}")
    private int lookbackMinutes;

    @Value("${ai.wait.sync.applied-weight:0.35}")
    private double appliedWeight;

    @Value("${ai.wait.sync.stay-lookback-hours:24}")
    private int stayLookbackHours;

    @Value("${ai.wait.sync.stay-sample-size:40}")
    private int staySampleSize;

    @Value("${ai.wait.sync.default-stay-minutes:12}")
    private double defaultStayMinutes;

    @Transactional
    public WaitSyncResult syncCurrentSnapshot() {
        LocalDateTime baseTime = LocalDateTime.now().withNano(0);
        return syncAt(baseTime);
    }

    @Transactional
    public WaitSyncResult syncAt(LocalDateTime baseTime) {
        if (baseTime == null) {
            throw new IllegalArgumentException("baseTime must not be null");
        }

        int queueLookback = Math.max(1, lookbackMinutes);
        LocalDateTime queueWindowFrom = baseTime.minusMinutes(queueLookback);
        int normalizedStayLookbackHours = Math.max(1, stayLookbackHours);
        int normalizedStaySampleSize = Math.max(1, staySampleSize);
        LocalDateTime stayWindowFrom = baseTime.minusHours(normalizedStayLookbackHours);

        List<RealtimeWaitSyncQueryRepository.RunningProgramRow> runningPrograms =
                realtimeWaitSyncQueryRepository.findRunningPrograms(baseTime);
        List<Long> runningProgramIds = runningPrograms.stream()
                .map(RealtimeWaitSyncQueryRepository.RunningProgramRow::programId)
                .toList();

        Map<Long, Integer> queueCountMap = toProgramCountMap(
                realtimeWaitSyncQueryRepository.findProgramQueueCounts(runningProgramIds),
                RealtimeWaitSyncQueryRepository.ProgramQueueCountRow::programId,
                RealtimeWaitSyncQueryRepository.ProgramQueueCountRow::queueCount
        );
        Map<Long, Integer> appliedCountMap = toProgramCountMap(
                realtimeWaitSyncQueryRepository.findProgramAppliedCounts(runningProgramIds),
                RealtimeWaitSyncQueryRepository.ProgramAppliedCountRow::programId,
                RealtimeWaitSyncQueryRepository.ProgramAppliedCountRow::appliedCount
        );

        Map<Long, ExperienceWait> existingProgramWaitMap = runningProgramIds.isEmpty()
                ? Map.of()
                : experienceWaitRepository.findAllByProgramIdIn(runningProgramIds).stream()
                .collect(Collectors.toMap(
                        ExperienceWait::getProgramId,
                        Function.identity(),
                        (left, right) -> left
                ));

        List<RealtimeWaitSyncQueryRepository.ActiveBoothRow> activeBooths =
                realtimeWaitSyncQueryRepository.findActiveBooths(baseTime);
        List<Long> activeBoothIds = activeBooths.stream()
                .map(RealtimeWaitSyncQueryRepository.ActiveBoothRow::boothId)
                .distinct()
                .toList();
        Map<Long, Integer> boothConcurrencyMap = toBoothConcurrencyMap(activeBooths);

        List<Long> stayTargetBoothIds = new ArrayList<>(activeBoothIds);
        runningPrograms.stream()
                .map(RealtimeWaitSyncQueryRepository.RunningProgramRow::boothId)
                .filter(boothId -> boothId != null)
                .forEach(stayTargetBoothIds::add);
        stayTargetBoothIds = stayTargetBoothIds.stream().distinct().toList();

        Map<Long, Double> boothAverageStayMap = stayTargetBoothIds.isEmpty()
                ? Map.of()
                : toBoothAverageStayMap(
                        realtimeWaitSyncQueryRepository.findRecentBoothAverageStays(
                                stayTargetBoothIds,
                                stayWindowFrom,
                                baseTime,
                                normalizedStaySampleSize
                        )
                );
        Map<Long, AiCongestionAggregationQueryRepository.BoothQrLogCountRow> boothLogMap =
                aiCongestionAggregationQueryRepository.findBoothQrLogCounts(queueWindowFrom, baseTime).stream()
                        .collect(Collectors.toMap(
                                AiCongestionAggregationQueryRepository.BoothQrLogCountRow::boothId,
                                Function.identity(),
                                (left, right) -> left
                        ));

        Map<Long, BoothProgramAggregate> boothProgramAggregateMap = new HashMap<>();
        List<ExperienceWait> programUpserts = new ArrayList<>(runningPrograms.size());
        for (RealtimeWaitSyncQueryRepository.RunningProgramRow program : runningPrograms) {
            long programId = program.programId();
            int queueCount = Math.max(queueCountMap.getOrDefault(programId, 0), 0);
            int weightedAppliedCount = calculateWeightedAppliedCount(
                    Math.max(appliedCountMap.getOrDefault(programId, 0), 0)
            );
            queueCount += weightedAppliedCount;
            double avgStayMinutes = resolveAverageStayMinutes(program.boothId(), boothAverageStayMap);
            double throughputPerMin = resolveProgramThroughputPerMinute(program.throughputPerMin());
            int concurrentCapacity = resolveProgramConcurrentCapacity(
                    program.boothId(),
                    boothConcurrencyMap,
                    boothLogMap,
                    boothAverageStayMap,
                    queueLookback
            );
            int waitMin = throughputPerMin > 0.0d
                    ? calculateWaitMinByThroughput(queueCount, throughputPerMin)
                    : calculateWaitMinByStay(queueCount, avgStayMinutes, concurrentCapacity);

            ExperienceWait wait = existingProgramWaitMap.get(programId);
            if (wait == null) {
                wait = ExperienceWait.create(programId, queueCount, waitMin);
            } else {
                wait.applySnapshot(queueCount, waitMin);
            }
            programUpserts.add(wait);

            Long boothId = program.boothId();
            if (boothId != null) {
                boothProgramAggregateMap.merge(
                        boothId,
                        new BoothProgramAggregate(queueCount, waitMin),
                        (left, right) -> new BoothProgramAggregate(
                                left.waitCount() + right.waitCount(),
                                Math.max(left.waitMin(), right.waitMin())
                        )
                );
            }
        }

        if (!programUpserts.isEmpty()) {
            experienceWaitRepository.saveAll(programUpserts);
        }

        Map<Long, BoothWait> existingBoothWaitMap = activeBoothIds.isEmpty()
                ? Map.of()
                : boothWaitRepository.findAllByBoothIdIn(activeBoothIds).stream()
                .collect(Collectors.toMap(
                        BoothWait::getBoothId,
                        Function.identity(),
                        (left, right) -> left
                ));

        List<BoothWait> boothUpserts = new ArrayList<>(activeBoothIds.size());
        for (Long boothId : activeBoothIds) {
            BoothProgramAggregate programAggregate = boothProgramAggregateMap.getOrDefault(
                    boothId,
                    BoothProgramAggregate.ZERO
            );
            int waitCount = Math.max(programAggregate.waitCount(), 0);
            int waitMin = waitCount <= 0 ? 0 : Math.max(programAggregate.waitMin(), 0);

            BoothWait wait = existingBoothWaitMap.get(boothId);
            if (wait == null) {
                wait = BoothWait.create(boothId, waitCount, waitMin, baseTime);
            } else {
                wait.applySnapshot(waitCount, waitMin, baseTime);
            }
            boothUpserts.add(wait);
        }

        if (!boothUpserts.isEmpty()) {
            boothWaitRepository.saveAll(boothUpserts);
        }

        log.info(
                "Realtime wait sync completed. baseTime={}, queueLookbackMinutes={}, stayLookbackHours={}, staySampleSize={}, programUpsertCount={}, boothUpsertCount={}",
                baseTime,
                queueLookback,
                normalizedStayLookbackHours,
                normalizedStaySampleSize,
                programUpserts.size(),
                boothUpserts.size()
        );
        return new WaitSyncResult(baseTime, queueLookback, programUpserts.size(), boothUpserts.size());
    }

    private <T> Map<Long, Integer> toProgramCountMap(
            List<T> rows,
            Function<T, Long> keyExtractor,
            Function<T, Integer> countExtractor
    ) {
        if (rows == null || rows.isEmpty()) {
            return Map.of();
        }
        return rows.stream()
                .collect(Collectors.toMap(
                        keyExtractor,
                        row -> Math.max(countExtractor.apply(row), 0),
                        Integer::max
                ));
    }

    private Map<Long, Integer> toBoothConcurrencyMap(List<RealtimeWaitSyncQueryRepository.ActiveBoothRow> rows) {
        if (rows == null || rows.isEmpty()) {
            return Map.of();
        }
        return rows.stream()
                .collect(Collectors.toMap(
                        RealtimeWaitSyncQueryRepository.ActiveBoothRow::boothId,
                        row -> resolveBoothConcurrency(row.concurrency()),
                        Integer::max
                ));
    }

    private Map<Long, Double> toBoothAverageStayMap(List<RealtimeWaitSyncQueryRepository.BoothAverageStayRow> rows) {
        if (rows == null || rows.isEmpty()) {
            return Map.of();
        }
        return rows.stream()
                .collect(Collectors.toMap(
                        RealtimeWaitSyncQueryRepository.BoothAverageStayRow::boothId,
                        row -> normalizeStayMinutes(
                                row.avgStayMinutes() == null
                                        ? sanitizeDefaultStayMinutes()
                                        : row.avgStayMinutes().doubleValue()
                        ),
                        Double::max
                ));
    }

    private int calculateWeightedAppliedCount(int appliedCount) {
        if (appliedCount <= 0) {
            return 0;
        }
        double normalizedWeight = normalizeAppliedWeight(appliedWeight);
        if (normalizedWeight <= 0.0d) {
            return 0;
        }
        return (int) Math.ceil(appliedCount * normalizedWeight);
    }

    private double normalizeAppliedWeight(double configuredWeight) {
        if (Double.isNaN(configuredWeight) || Double.isInfinite(configuredWeight)) {
            return 0.0d;
        }
        return Math.max(0.0d, Math.min(configuredWeight, 1.0d));
    }

    private double resolveProgramThroughputPerMinute(BigDecimal throughputPerMin) {
        if (throughputPerMin == null) {
            return 0.0d;
        }
        return normalizeThroughputPerMinute(throughputPerMin.doubleValue());
    }

    private double normalizeThroughputPerMinute(double throughputPerMin) {
        if (Double.isNaN(throughputPerMin) || Double.isInfinite(throughputPerMin) || throughputPerMin <= 0.0d) {
            return 0.0d;
        }
        return throughputPerMin;
    }

    private int resolveProgramConcurrentCapacity(
            Long boothId,
            Map<Long, Integer> boothConcurrencyMap,
            Map<Long, AiCongestionAggregationQueryRepository.BoothQrLogCountRow> boothLogMap,
            Map<Long, Double> boothAverageStayMap,
            int lookbackMinutes
    ) {
        return resolveObservedConcurrentCapacity(
                boothId,
                boothConcurrencyMap,
                boothLogMap,
                boothAverageStayMap,
                lookbackMinutes
        );
    }

    private int resolveBoothConcurrentCapacity(
            Long boothId,
            Map<Long, Integer> boothConcurrencyMap,
            Map<Long, AiCongestionAggregationQueryRepository.BoothQrLogCountRow> boothLogMap,
            Map<Long, Double> boothAverageStayMap,
            int lookbackMinutes
    ) {
        return resolveObservedConcurrentCapacity(
                boothId,
                boothConcurrencyMap,
                boothLogMap,
                boothAverageStayMap,
                lookbackMinutes
        );
    }

    private int resolveObservedConcurrentCapacity(
            Long boothId,
            Map<Long, Integer> boothConcurrencyMap,
            Map<Long, AiCongestionAggregationQueryRepository.BoothQrLogCountRow> boothLogMap,
            Map<Long, Double> boothAverageStayMap,
            int lookbackMinutes
    ) {
        if (boothId == null) {
            return MIN_CONCURRENCY;
        }
        int fallbackConcurrency = resolveBoothConcurrency(
                boothConcurrencyMap == null ? null : boothConcurrencyMap.get(boothId)
        );
        if (boothLogMap == null || boothLogMap.isEmpty()) {
            return fallbackConcurrency;
        }

        AiCongestionAggregationQueryRepository.BoothQrLogCountRow boothLog = boothLogMap.get(boothId);
        if (boothLog == null) {
            return fallbackConcurrency;
        }

        int checkins = Math.max(boothLog.checkins(), 0);
        int safeLookbackMinutes = Math.max(lookbackMinutes, 1);
        if (checkins <= 0) {
            return fallbackConcurrency;
        }

        double avgStayMinutes = resolveAverageStayMinutes(boothId, boothAverageStayMap);
        double observedThroughputPerMin = checkins / (double) safeLookbackMinutes;
        int observedConcurrency = (int) Math.ceil(observedThroughputPerMin * avgStayMinutes);
        return Math.max(observedConcurrency, MIN_CONCURRENCY);
    }

    private int resolveBoothConcurrency(Integer concurrency) {
        if (concurrency == null || concurrency <= 0) {
            return MIN_CONCURRENCY;
        }
        return Math.max(concurrency, MIN_CONCURRENCY);
    }

    private double resolveAverageStayMinutes(Long boothId, Map<Long, Double> boothAverageStayMap) {
        if (boothId == null) {
            return sanitizeDefaultStayMinutes();
        }
        return normalizeStayMinutes(
                boothAverageStayMap.getOrDefault(boothId, sanitizeDefaultStayMinutes())
        );
    }

    private double sanitizeDefaultStayMinutes() {
        if (Double.isNaN(defaultStayMinutes) || Double.isInfinite(defaultStayMinutes) || defaultStayMinutes <= 0.0d) {
            return DEFAULT_STAY_MINUTES_FALLBACK;
        }
        return Math.max(MIN_STAY_MINUTES, Math.min(defaultStayMinutes, MAX_STAY_MINUTES));
    }

    private double normalizeStayMinutes(double stayMinutes) {
        if (Double.isNaN(stayMinutes) || Double.isInfinite(stayMinutes) || stayMinutes <= 0.0d) {
            return sanitizeDefaultStayMinutes();
        }
        return Math.max(MIN_STAY_MINUTES, Math.min(stayMinutes, MAX_STAY_MINUTES));
    }

    private int calculateWaitMinByStay(int waitCount, double avgStayMinutes, int concurrency) {
        if (waitCount <= 0) {
            return 0;
        }

        int safeConcurrency = Math.max(concurrency, MIN_CONCURRENCY);
        double safeStayMinutes = normalizeStayMinutes(avgStayMinutes);
        double estimated = (waitCount * safeStayMinutes) / safeConcurrency;
        int estimatedMinutes = (int) Math.ceil(Math.max(estimated, 0.0d));
        return Math.min(Math.max(estimatedMinutes, 0), MAX_WAIT_MINUTES);
    }

    private int calculateWaitMinByThroughput(int waitCount, double throughputPerMin) {
        if (waitCount <= 0) {
            return 0;
        }
        double safeThroughputPerMin = normalizeThroughputPerMinute(throughputPerMin);
        if (safeThroughputPerMin <= 0.0d) {
            return 0;
        }
        double estimated = waitCount / safeThroughputPerMin;
        int estimatedMinutes = (int) Math.ceil(Math.max(estimated, 0.0d));
        return Math.min(Math.max(estimatedMinutes, 0), MAX_WAIT_MINUTES);
    }

    private record BoothProgramAggregate(int waitCount, int waitMin) {
        private static final BoothProgramAggregate ZERO = new BoothProgramAggregate(0, 0);
    }

    public record WaitSyncResult(
            LocalDateTime baseTime,
            int lookbackMinutes,
            int programUpsertCount,
            int boothUpsertCount
    ) {
    }
}
