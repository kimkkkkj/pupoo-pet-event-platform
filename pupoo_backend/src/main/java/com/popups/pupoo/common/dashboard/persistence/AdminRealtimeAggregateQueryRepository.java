package com.popups.pupoo.common.dashboard.persistence;

import java.time.LocalDateTime;
import java.util.List;

public interface AdminRealtimeAggregateQueryRepository {

    List<EventRegistrationSummaryRow> findEventRegistrationSummaries();

    List<EventQrSummaryRow> findEventQrSummaries();

    List<EventWaitingSummaryRow> findBoothWaitingSummariesByEvent();

    List<EventWaitingSummaryRow> findProgramWaitingSummariesByEvent();

    List<EventVoteSummaryRow> findEventVoteSummaries();

    List<EventProgramCountRow> findEventProgramCounts();

    List<EventCongestionSummaryRow> findEventCongestionSummaries();

    List<RegistrationStatusCountRow> findRegistrationStatusCounts(Long eventId);

    List<ProgramApplyStatusCountRow> findProgramApplyStatusCounts(Long eventId);

    List<ProgramCheckedInCountRow> findProgramCheckedInCounts(Long eventId);

    List<RecentCheckinLogRow> findRecentCheckinLogs(Long eventId, int limit);

    List<ProgramCongestionRow> findLatestProgramCongestions(Long eventId);

    List<BoothCongestionRow> findLatestBoothCongestions(Long eventId);

    List<HourlyCongestionRow> findHourlyCongestions(Long eventId);

    List<ProgramVoteCountRow> findProgramVoteCounts(Long eventId);

    List<ProgramApplyVoteCountRow> findProgramApplyVoteCounts(Long eventId);

    LocalDateTime findLatestVoteAt(Long eventId);

    record EventRegistrationSummaryRow(
            Long eventId,
            long totalApplicants,
            long appliedCount,
            long approvedCount
    ) {
    }

    record EventQrSummaryRow(
            Long eventId,
            long issuedQrCount,
            long totalCheckins,
            long totalCheckouts,
            LocalDateTime latestCheckinAt,
            LocalDateTime latestCheckedAt
    ) {
    }

    record EventWaitingSummaryRow(
            Long eventId,
            long waitingCount,
            Double avgWaitMin,
            Integer longestWaitMin
    ) {
    }

    record EventVoteSummaryRow(
            Long eventId,
            long totalVotes,
            LocalDateTime latestVoteAt
    ) {
    }

    record EventProgramCountRow(
            Long eventId,
            long totalPrograms,
            long contestPrograms,
            long activePrograms
    ) {
    }

    record EventCongestionSummaryRow(
            Long eventId,
            Integer avgCongestionPercent
    ) {
    }

    record RegistrationStatusCountRow(
            String status,
            long count
    ) {
    }

    record ProgramApplyStatusCountRow(
            Long programId,
            String status,
            long count
    ) {
    }

    record ProgramCheckedInCountRow(
            Long programId,
            long count
    ) {
    }

    record RecentCheckinLogRow(
            Long logId,
            Long qrId,
            Long boothId,
            String boothName,
            String checkType,
            LocalDateTime checkedAt
    ) {
    }

    record ProgramCongestionRow(
            Long programId,
            Integer congestionLevel,
            LocalDateTime measuredAt
    ) {
    }

    record BoothCongestionRow(
            Long boothId,
            Long programId,
            Integer congestionLevel,
            LocalDateTime measuredAt
    ) {
    }

    record HourlyCongestionRow(
            Integer hour,
            Double avgCongestionLevel
    ) {
    }

    record ProgramVoteCountRow(
            Long programId,
            long voteCount
    ) {
    }

    record ProgramApplyVoteCountRow(
            Long programId,
            Long programApplyId,
            long voteCount
    ) {
    }
}
