package com.popups.pupoo.ai.persistence;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;

public interface AiCongestionAggregationQueryRepository {

    List<EventTargetRow> findEventTargets(LocalDateTime bucketTime);

    List<ProgramTargetRow> findProgramTargets(LocalDateTime bucketTime);

    List<EventQrLogCountRow> findEventQrLogCounts(LocalDateTime fromInclusive, LocalDateTime toExclusive);

    List<BoothQrLogCountRow> findBoothQrLogCounts(LocalDateTime fromInclusive, LocalDateTime toExclusive);

    List<EventActiveApplyCountRow> findEventActiveApplyCounts();

    List<ProgramActiveApplyCountRow> findProgramActiveApplyCounts();

    List<EventWaitAggregateRow> findEventWaitAggregates();

    List<ProgramWaitRow> findProgramWaits();

    List<EventRunningProgramCountRow> findRunningProgramCounts(LocalDateTime bucketTime);

    List<EventTotalProgramCountRow> findTotalProgramCounts();

    List<ProgramCheckinCountRow> findProgramCheckinCounts(
            Collection<Long> programIds,
            LocalDateTime fromInclusive,
            LocalDateTime toExclusive
    );

    record EventTargetRow(Long eventId, LocalDateTime startAt) {
    }

    record ProgramTargetRow(
            Long programId,
            Long eventId,
            Long boothId,
            Integer capacity,
            BigDecimal throughputPerMin,
            LocalDateTime startAt
    ) {
    }

    record EventQrLogCountRow(Long eventId, int checkins, int checkouts) {
    }

    record BoothQrLogCountRow(Long boothId, int checkins, int checkouts) {
    }

    record EventActiveApplyCountRow(Long eventId, int activeApplyCount) {
    }

    record ProgramActiveApplyCountRow(Long programId, int activeApplyCount) {
    }

    record EventWaitAggregateRow(Long eventId, int totalWaitCount, BigDecimal avgWaitMin) {
    }

    record ProgramWaitRow(Long programId, int waitCount, Integer waitMin) {
    }

    record EventRunningProgramCountRow(Long eventId, int runningProgramCount) {
    }

    record EventTotalProgramCountRow(Long eventId, int totalProgramCount) {
    }

    record ProgramCheckinCountRow(Long programId, int checkinCount) {
    }
}
