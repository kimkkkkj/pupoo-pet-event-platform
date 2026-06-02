package com.popups.pupoo.ai.persistence;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;

public interface RealtimeWaitSyncQueryRepository {

    List<RunningProgramRow> findRunningPrograms(LocalDateTime baseTime);

    List<ProgramQueueCountRow> findProgramQueueCounts(Collection<Long> programIds);

    List<ProgramAppliedCountRow> findProgramAppliedCounts(Collection<Long> programIds);

    List<ProgramCheckinCountRow> findProgramCheckinCounts(
            Collection<Long> programIds,
            LocalDateTime fromInclusive,
            LocalDateTime toExclusive
    );

    List<BoothAverageStayRow> findRecentBoothAverageStays(
            Collection<Long> boothIds,
            LocalDateTime fromInclusive,
            LocalDateTime toExclusive,
            int sampleSize
    );

    List<ActiveBoothRow> findActiveBooths(LocalDateTime baseTime);

    record RunningProgramRow(
            Long programId,
            Long boothId,
            Integer capacity,
            BigDecimal throughputPerMin
    ) {
    }

    record ProgramQueueCountRow(Long programId, int queueCount) {
    }

    record ProgramAppliedCountRow(Long programId, int appliedCount) {
    }

    record ProgramCheckinCountRow(Long programId, int checkinCount) {
    }

    record BoothAverageStayRow(Long boothId, BigDecimal avgStayMinutes, int sampleCount) {
    }

    record ActiveBoothRow(Long boothId, Integer concurrency) {
    }
}
