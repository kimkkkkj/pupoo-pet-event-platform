package com.popups.pupoo.common.dashboard.dto;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 화면 단위 집계 응답 DTO 모음.
 * - 관리자 실시간 대시보드 5개 화면 + 이벤트 선택 화면에서 공통 사용한다.
 */
public final class AdminRealtimeAggregateResponse {

    private AdminRealtimeAggregateResponse() {
    }

    public record Metadata(
            LocalDateTime serverTime,
            int pollingRecommendedSeconds,
            String metricType
    ) {
    }

    public record EventSummary(
            Long eventId,
            String eventName,
            String status,
            LocalDateTime startAt,
            LocalDateTime endAt,
            String location
    ) {
    }

    public record EventCounts(
            long all,
            long live,
            long upcoming,
            long ended
    ) {
    }

    public record EventListItem(
            Long eventId,
            String eventName,
            String rawStatus,
            String selectorStatus,
            LocalDateTime startAt,
            LocalDateTime endAt,
            String location,
            long registrations,
            long checkedIn,
            Integer checkinRate,
            Integer congestion,
            long waitingCount,
            Integer avgWaitMin,
            long voteCount,
            Integer voteRate,
            long programCount,
            long contestProgramCount
    ) {
    }

    public record EventsSnapshot(
            List<EventListItem> events,
            EventCounts counts,
            Metadata metadata
    ) {
    }

    public record RealtimeSummary(
            long totalApplicants,
            long approvedApplicants,
            long issuedQrCount,
            long totalCheckins,
            long totalCheckouts,
            long currentInsideCount,
            long activeProgramCount,
            long activeBoothCount,
            Double averageCongestionLevel,
            long hotspotCount,
            LocalDateTime latestUpdatedAt
    ) {
    }

    public record QuickStats(
            long waitingProgramCount,
            long waitingBoothCount,
            long liveContestCount,
            long recentVotesCount,
            long recentCheckinsCount
    ) {
    }

    public record OverviewSnapshot(
            EventSummary eventSummary,
            RealtimeSummary realtimeSummary,
            QuickStats quickStats,
            Metadata metadata
    ) {
    }

    public record DashboardSummaryCards(
            long totalApplicants,
            long approvedApplicants,
            Integer participationRate,
            Integer checkedInRate,
            long currentInsideCount,
            long totalPrograms,
            long activePrograms,
            long totalBooths,
            long activeBooths,
            Integer averageCongestionPercent,
            String currentCongestionSource
    ) {
    }

    public record CongestionPrediction(
            Double predictedAvgScore,
            Double predictedPeakScore,
            Integer predictedLevel,
            Integer predictedWaitMinutes,
            Double confidence,
            boolean fallbackUsed,
            List<CongestionTimelinePoint> timeline
    ) {
    }

    public record CongestionTimelinePoint(
            LocalDateTime time,
            Double score,
            Integer predictedLevel
    ) {
    }

    public record CongestionSummary(
            Integer currentCongestionLevel,
            Integer currentCongestionPercent,
            Integer predictedCongestionLevel,
            Integer predictedCongestionPercent,
            LocalDateTime peakExpectedTime,
            LocalDateTime latestMeasuredAt,
            LocalDateTime latestPredictedAt,
            CongestionPrediction prediction
    ) {
    }

    public record ProgramExperienceWait(
            Integer waitCount,
            Integer waitMin,
            LocalDateTime updatedAt
    ) {
    }

    public record ProgramCongestionSummary(
            Long programId,
            String programTitle,
            String category,
            Long boothId,
            String boothName,
            Integer currentCongestionLevel,
            Integer currentCongestionPercent,
            Integer predictedCongestionLevel,
            Integer predictedCongestionPercent,
            Integer waitCount,
            Integer waitMin,
            long appliedCount,
            long approvedCount,
            long checkedInCount,
            boolean started,
            boolean ended,
            LocalDateTime startAt,
            LocalDateTime endAt,
            ProgramExperienceWait experienceWait
    ) {
    }

    public record BoothCongestionSummary(
            Long boothId,
            String placeName,
            String type,
            String zone,
            Integer waitCount,
            Integer waitMin,
            Integer congestionLevel,
            Integer congestionPercent,
            LocalDateTime updatedAt,
            Long programId,
            LocalDateTime measuredAt
    ) {
    }

    public record TrendPoint(
            Integer hour,
            Double avgCongestionLevel
    ) {
    }

    public record TrendSummary(
            List<TrendPoint> hourlyRows
    ) {
    }

    public record ProgramPerformance(
            long approvedRegistrationCount,
            long checkinCount
    ) {
    }

    public record DashboardSnapshot(
            EventSummary eventSummary,
            DashboardSummaryCards dashboardSummaryCards,
            CongestionSummary congestionSummary,
            List<ProgramCongestionSummary> programCongestionSummaries,
            List<BoothCongestionSummary> boothCongestionSummaries,
            TrendSummary trendSummary,
            ProgramPerformance performance,
            Metadata metadata
    ) {
    }

    public record WaitingSummary(
            long totalWaitingCount,
            long totalWaitingPrograms,
            long totalWaitingBooths,
            Integer averageWaitMin,
            Integer longestWaitMin,
            long hotspotCount,
            LocalDateTime latestUpdatedAt
    ) {
    }

    public record BoothWaitSummary(
            String id,
            Long boothId,
            String boothTitle,
            String zone,
            String zoneLabel,
            String subText,
            Integer waitCount,
            Integer waitMin,
            Integer congestionPercent,
            Integer congestionScore,
            String congestionLabel,
            String congestionTone,
            LocalDateTime updatedAt
    ) {
    }

    public record ProgramWaitSummary(
            String id,
            Long programId,
            String programTitle,
            LocalDateTime startAt,
            LocalDateTime endAt,
            String timeText,
            Integer waitCount,
            Integer waitMin,
            Integer congestionPercent,
            Integer congestionScore,
            String congestionLabel,
            String congestionTone,
            LocalDateTime updatedAt
    ) {
    }

    public record HotspotSummary(
            String type,
            Long targetId,
            String targetName,
            Integer waitCount,
            Integer waitMin,
            int priorityOrder
    ) {
    }

    public record WaitingStatusSnapshot(
            EventSummary eventSummary,
            WaitingSummary waitingSummary,
            List<BoothWaitSummary> boothWaitSummaries,
            List<ProgramWaitSummary> programWaitSummaries,
            List<HotspotSummary> hotspotTopN,
            Metadata metadata
    ) {
    }

    public record CheckinSummary(
            long totalApplicants,
            long approvedApplicants,
            long issuedQrCount,
            long totalCheckins,
            long totalCheckouts,
            long currentInsideCount,
            Integer checkedInRate,
            LocalDateTime latestUpdatedAt
    ) {
    }

    public record ProgramCheckinSummary(
            Long programId,
            String programTitle,
            String category,
            Long boothId,
            String boothName,
            long appliedCount,
            long approvedCount,
            long checkedInCount,
            long waitingCount,
            boolean started,
            boolean ended
    ) {
    }

    public record RecentCheckinLog(
            Long logId,
            Long qrId,
            Long boothId,
            String boothName,
            String checkType,
            LocalDateTime checkedAt
    ) {
    }

    public record ParticipatedEventSummary(
            Long eventId,
            String eventName,
            LocalDateTime startAt
    ) {
    }

    public record MyProgramSummary(
            Long programApplyId,
            Long programId,
            Long eventId,
            String programName,
            String time,
            String status,
            String requestNo
    ) {
    }

    public record MyCheckinSummary(
            String programName,
            String programDescription,
            String programTime,
            String programLocation,
            String status,
            Integer myPosition,
            Integer totalApply,
            Integer waitingCount,
            String estimatedWaitTime
    ) {
    }

    public record MyQrSummary(
            Long qrId,
            String imageUrl
    ) {
    }

    public record ProgramCheckinStatusSummary(
            String programName,
            int totalApply,
            int checkedIn,
            int waiting
    ) {
    }

    public record CheckinStatusSnapshot(
            EventSummary eventSummary,
            CheckinSummary checkinSummary,
            List<ProgramCheckinSummary> programCheckinSummaries,
            List<RecentCheckinLog> recentCheckinLogs,
            List<MyProgramSummary> myPrograms,
            List<ParticipatedEventSummary> participatedEvents,
            MyCheckinSummary myCheckin,
            MyQrSummary myQrInfo,
            ProgramCheckinStatusSummary programCheckinStatus,
            Metadata metadata
    ) {
    }

    public record VoteSummary(
            long totalContestCount,
            long activeContestCount,
            long totalVotes,
            LocalDateTime latestVoteAt,
            LocalDateTime latestUpdatedAt
    ) {
    }

    public record VoteCandidate(
            Long applyId,
            String name,
            String imageUrl,
            String ownerNickname,
            long votes,
            int rank,
            double pct,
            long gapFromLeader,
            long gapFromPrevious,
            String status
    ) {
    }

    public record VoteContest(
            String key,
            Long programId,
            String title,
            String status,
            LocalDateTime startAt,
            LocalDateTime endAt,
            long totalVotes,
            long participantCount,
            List<VoteCandidate> items
    ) {
    }

    public record VoteStatusSnapshot(
            EventSummary eventSummary,
            VoteSummary voteSummary,
            List<VoteContest> contests,
            Metadata metadata
    ) {
    }
}
