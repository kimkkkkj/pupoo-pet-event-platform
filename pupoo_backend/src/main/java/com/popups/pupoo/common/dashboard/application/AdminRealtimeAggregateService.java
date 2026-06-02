package com.popups.pupoo.common.dashboard.application;

import com.popups.pupoo.ai.application.AiCongestionService;
import com.popups.pupoo.ai.domain.enums.AiPredictionTargetType;
import com.popups.pupoo.ai.domain.model.AiEventCongestionTimeseries;
import com.popups.pupoo.ai.domain.model.AiPredictionLog;
import com.popups.pupoo.ai.dto.AiCongestionPredictionResponse;
import com.popups.pupoo.ai.dto.AiTimelinePoint;
import com.popups.pupoo.ai.persistence.AiEventCongestionTimeseriesRepository;
import com.popups.pupoo.ai.persistence.AiPredictionLogRepository;
import com.popups.pupoo.ai.persistence.RealtimeWaitSyncQueryRepository;
import com.popups.pupoo.auth.security.util.SecurityUtil;
import com.popups.pupoo.booth.domain.enums.BoothStatus;
import com.popups.pupoo.booth.domain.enums.BoothZone;
import com.popups.pupoo.booth.domain.model.Booth;
import com.popups.pupoo.booth.domain.model.BoothWait;
import com.popups.pupoo.booth.persistence.BoothRepository;
import com.popups.pupoo.booth.persistence.BoothWaitRepository;
import com.popups.pupoo.common.dashboard.dto.AdminRealtimeAggregateResponse;
import com.popups.pupoo.common.dashboard.persistence.AdminRealtimeAggregateQueryRepository;
import com.popups.pupoo.common.exception.BusinessException;
import com.popups.pupoo.common.exception.ErrorCode;
import com.popups.pupoo.event.domain.model.Event;
import com.popups.pupoo.event.persistence.EventRepository;
import com.popups.pupoo.pet.domain.model.Pet;
import com.popups.pupoo.pet.persistence.PetRepository;
import com.popups.pupoo.program.apply.domain.enums.ApplyStatus;
import com.popups.pupoo.program.apply.domain.model.ProgramApply;
import com.popups.pupoo.program.apply.persistence.ProgramApplyRepository;
import com.popups.pupoo.program.domain.enums.ProgramCategory;
import com.popups.pupoo.program.domain.model.ExperienceWait;
import com.popups.pupoo.program.domain.model.Program;
import com.popups.pupoo.program.persistence.ExperienceWaitRepository;
import com.popups.pupoo.program.persistence.ProgramRepository;
import com.popups.pupoo.qr.domain.enums.QrCheckType;
import com.popups.pupoo.qr.domain.model.QrCheckin;
import com.popups.pupoo.qr.domain.model.QrCode;
import com.popups.pupoo.qr.persistence.QrCheckinRepository;
import com.popups.pupoo.qr.persistence.QrCodeRepository;
import com.popups.pupoo.storage.support.StorageUrlResolver;
import com.popups.pupoo.user.domain.model.User;
import com.popups.pupoo.user.persistence.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;
import java.util.function.Function;
import java.util.function.Supplier;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AdminRealtimeAggregateService {

    private static final int DEFAULT_POLL_SECONDS = 15;
    private static final long SNAPSHOT_CACHE_TTL_MILLIS = 8_000L;
    private static final long SNAPSHOT_CACHE_MAX_STALE_MILLIS = 120_000L;
    private static final long IN_FLIGHT_WAIT_TIMEOUT_MILLIS = 30_000L;
    private static final int MAX_WAIT_MINUTES = 240;
    private static final double DEFAULT_PROGRAM_STAY_MINUTES = 12.0d;
    private static final double MIN_STAY_MINUTES = 1.0d;
    private static final double MAX_STAY_MINUTES = 180.0d;
    private static final int DEFAULT_WAIT_STAY_LOOKBACK_HOURS = 24;
    private static final int DEFAULT_WAIT_STAY_SAMPLE_SIZE = 40;
    private static final int PREDICTION_TIMELINE_STEP_MINUTES = 60;
    private static final int PREDICTION_TIMELINE_HORIZON_MINUTES = 180;
    private static final int PREDICTION_TIMELINE_MAX_DAYS = 60;
    private static final DateTimeFormatter TIME_FORMATTER = DateTimeFormatter.ofPattern("HH:mm");

    private final EventRepository eventRepository;
    private final ProgramRepository programRepository;
    private final BoothRepository boothRepository;
    private final BoothWaitRepository boothWaitRepository;
    private final ExperienceWaitRepository experienceWaitRepository;
    private final ProgramApplyRepository programApplyRepository;
    private final QrCodeRepository qrCodeRepository;
    private final QrCheckinRepository qrCheckinRepository;
    private final AiEventCongestionTimeseriesRepository aiEventCongestionTimeseriesRepository;
    private final AiPredictionLogRepository aiPredictionLogRepository;
    private final AiCongestionService aiCongestionService;
    private final UserRepository userRepository;
    private final PetRepository petRepository;
    private final SecurityUtil securityUtil;
    private final StorageUrlResolver storageUrlResolver;
    private final AdminRealtimeAggregateQueryRepository aggregateQueryRepository;
    private final RealtimeWaitSyncQueryRepository realtimeWaitSyncQueryRepository;
    private final ConcurrentHashMap<String, SnapshotCacheEntry> snapshotCache = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, CompletableFuture<Object>> inFlightSnapshotLoads = new ConcurrentHashMap<>();

    private record SnapshotCacheEntry(Object value, long expiresAtMillis) {
    }

    public AdminRealtimeAggregateResponse.EventsSnapshot eventsSnapshot() {
        return getOrLoadSnapshot("events", this::buildEventsSnapshot);
    }

    private AdminRealtimeAggregateResponse.EventsSnapshot buildEventsSnapshot() {
        LocalDateTime now = LocalDateTime.now();
        List<Event> events = eventRepository.findAll(
                Sort.by(Sort.Direction.ASC, "startAt").and(Sort.by(Sort.Direction.ASC, "eventId"))
        );

        Map<Long, AdminRealtimeAggregateQueryRepository.EventRegistrationSummaryRow> registrationMap =
                aggregateQueryRepository.findEventRegistrationSummaries().stream()
                        .collect(Collectors.toMap(
                                AdminRealtimeAggregateQueryRepository.EventRegistrationSummaryRow::eventId,
                                Function.identity(),
                                (left, right) -> left
                        ));
        Map<Long, AdminRealtimeAggregateQueryRepository.EventQrSummaryRow> qrMap =
                aggregateQueryRepository.findEventQrSummaries().stream()
                        .collect(Collectors.toMap(
                                AdminRealtimeAggregateQueryRepository.EventQrSummaryRow::eventId,
                                Function.identity(),
                                (left, right) -> left
                        ));
        Map<Long, AdminRealtimeAggregateQueryRepository.EventWaitingSummaryRow> boothWaitMap =
                aggregateQueryRepository.findBoothWaitingSummariesByEvent().stream()
                        .collect(Collectors.toMap(
                                AdminRealtimeAggregateQueryRepository.EventWaitingSummaryRow::eventId,
                                Function.identity(),
                                (left, right) -> left
                        ));
        Map<Long, AdminRealtimeAggregateQueryRepository.EventWaitingSummaryRow> programWaitMap =
                aggregateQueryRepository.findProgramWaitingSummariesByEvent().stream()
                        .collect(Collectors.toMap(
                                AdminRealtimeAggregateQueryRepository.EventWaitingSummaryRow::eventId,
                                Function.identity(),
                                (left, right) -> left
                        ));
        Map<Long, AdminRealtimeAggregateQueryRepository.EventVoteSummaryRow> voteMap =
                aggregateQueryRepository.findEventVoteSummaries().stream()
                        .collect(Collectors.toMap(
                                AdminRealtimeAggregateQueryRepository.EventVoteSummaryRow::eventId,
                                Function.identity(),
                                (left, right) -> left
                        ));
        Map<Long, AdminRealtimeAggregateQueryRepository.EventProgramCountRow> programCountMap =
                aggregateQueryRepository.findEventProgramCounts().stream()
                        .collect(Collectors.toMap(
                                AdminRealtimeAggregateQueryRepository.EventProgramCountRow::eventId,
                                Function.identity(),
                                (left, right) -> left
                        ));
        Map<Long, AdminRealtimeAggregateQueryRepository.EventCongestionSummaryRow> congestionMap =
                aggregateQueryRepository.findEventCongestionSummaries().stream()
                        .collect(Collectors.toMap(
                                AdminRealtimeAggregateQueryRepository.EventCongestionSummaryRow::eventId,
                                Function.identity(),
                                (left, right) -> left
                        ));
        Map<Long, Integer> aiRealtimePredictedCongestionMap = buildRealtimeEventPredictionPercentMap(events, now);
        Map<Long, Integer> predictedCongestionLogMap = aiPredictionLogRepository.findLatestEventPredictions().stream()
                .filter(log -> log.getEventId() != null)
                .collect(Collectors.toMap(
                        AiPredictionLog::getEventId,
                        log -> normalizePredictionScore(log.getPredictedAvgScore60m()),
                        (left, right) -> left
                ));
        Map<Long, Integer> timeseriesPredictedCongestionMap = findLatestTimeseriesPredictionByEvent(
                events.stream()
                        .map(Event::getEventId)
                        .filter(Objects::nonNull)
                        .toList(),
                now
        );

        List<AdminRealtimeAggregateResponse.EventListItem> items = events.stream()
                .map(event -> {
                    Long eventId = event.getEventId();
                    String selectorStatus = resolveSelectorStatus(event, now);

                    AdminRealtimeAggregateQueryRepository.EventRegistrationSummaryRow registration =
                            registrationMap.get(eventId);
                    long registrations = registration == null
                            ? 0L
                            : safeLong(registration.appliedCount()) + safeLong(registration.approvedCount());

                    AdminRealtimeAggregateQueryRepository.EventQrSummaryRow qrSummary = qrMap.get(eventId);
                    long checkedIn = qrSummary == null ? 0L : safeLong(qrSummary.totalCheckins());

                    AdminRealtimeAggregateQueryRepository.EventWaitingSummaryRow boothWaiting = boothWaitMap.get(eventId);
                    AdminRealtimeAggregateQueryRepository.EventWaitingSummaryRow programWaiting = programWaitMap.get(eventId);
                    long waitingCount =
                            (boothWaiting == null ? 0L : safeLong(boothWaiting.waitingCount()))
                                    + (programWaiting == null ? 0L : safeLong(programWaiting.waitingCount()));
                    Integer avgWaitMin = mergeAverageWait(boothWaiting, programWaiting);

                    AdminRealtimeAggregateQueryRepository.EventVoteSummaryRow voteSummary = voteMap.get(eventId);
                    long voteCount = voteSummary == null ? 0L : safeLong(voteSummary.totalVotes());

                    AdminRealtimeAggregateQueryRepository.EventProgramCountRow programCounts =
                            programCountMap.get(eventId);
                    long totalPrograms = programCounts == null ? 0L : safeLong(programCounts.totalPrograms());
                    long contestPrograms = programCounts == null ? 0L : safeLong(programCounts.contestPrograms());

                    Integer checkinRate = computeRate(checkedIn, registrations);
                    Integer voteRate = computeRate(voteCount, registrations);
                    Integer measuredCongestion = Optional.ofNullable(congestionMap.get(eventId))
                            .map(AdminRealtimeAggregateQueryRepository.EventCongestionSummaryRow::avgCongestionPercent)
                            .map(this::clampPercent)
                            .orElse(null);
                    Integer predictedCongestion = Optional.ofNullable(aiRealtimePredictedCongestionMap.get(eventId))
                            .orElse(Optional.ofNullable(predictedCongestionLogMap.get(eventId))
                                    .orElse(timeseriesPredictedCongestionMap.get(eventId)));
                    predictedCongestion = Optional.ofNullable(predictedCongestion)
                            .map(this::clampPercent)
                            .orElse(null);
                    Integer congestion = resolveEventCongestionPercent(
                            String.valueOf(event.getStatus()),
                            measuredCongestion,
                            predictedCongestion
                    );

                    return new AdminRealtimeAggregateResponse.EventListItem(
                            eventId,
                            nullToEmpty(event.getEventName()),
                            String.valueOf(event.getStatus()),
                            selectorStatus,
                            event.getStartAt(),
                            event.getEndAt(),
                            nullToEmpty(event.getLocation()),
                            registrations,
                            checkedIn,
                            checkinRate,
                            congestion,
                            waitingCount,
                            avgWaitMin,
                            voteCount,
                            voteRate,
                            totalPrograms,
                            contestPrograms
                    );
                })
                .toList();

        long live = items.stream().filter(item -> "live".equals(item.selectorStatus())).count();
        long upcoming = items.stream().filter(item -> "upcoming".equals(item.selectorStatus())).count();
        long ended = items.stream().filter(item -> "ended".equals(item.selectorStatus())).count();
        long all = items.stream().filter(item -> !"cancelled".equals(item.selectorStatus())).count();

        return new AdminRealtimeAggregateResponse.EventsSnapshot(
                items,
                new AdminRealtimeAggregateResponse.EventCounts(all, live, upcoming, ended),
                metadata(DEFAULT_POLL_SECONDS, "overview")
        );
    }

    public AdminRealtimeAggregateResponse.OverviewSnapshot overviewSnapshot(Long eventId) {
        return getOrLoadSnapshot(snapshotKey("overview", eventId), () -> buildOverviewSnapshot(eventId));
    }

    private AdminRealtimeAggregateResponse.OverviewSnapshot buildOverviewSnapshot(Long eventId) {
        Event event = getEvent(eventId);
        LocalDateTime now = LocalDateTime.now();

        List<Program> programs = findPrograms(eventId);
        List<Booth> booths = findBooths(eventId);
        Set<Long> experienceProgramIds = programs.stream()
                .filter(program -> program.getCategory() == ProgramCategory.EXPERIENCE)
                .map(Program::getProgramId)
                .collect(Collectors.toSet());
        Map<Long, ExperienceWait> experienceWaitMap = findExperienceWaitMap(programs);
        Map<Long, BoothWait> boothWaitMap = findBoothWaitMap(booths);
        Map<Long, AdminRealtimeAggregateQueryRepository.BoothCongestionRow> boothCongestionMap =
                findBoothCongestionMap(eventId);

        Map<String, Long> registrationByStatus = findRegistrationStatusMap(eventId);
        long totalApplicants = registrationByStatus.values().stream().mapToLong(this::safeLong).sum();
        long approvedApplicants = registrationByStatus.getOrDefault("APPROVED", 0L);

        long issuedQrCount = qrCodeRepository.countByEvent_EventId(eventId);
        long totalCheckins = qrCheckinRepository.countByQrCode_Event_EventIdAndCheckType(eventId, QrCheckType.CHECKIN);
        long totalCheckouts = qrCheckinRepository.countByQrCode_Event_EventIdAndCheckType(eventId, QrCheckType.CHECKOUT);
        long currentInside = Math.max(0L, totalCheckins - totalCheckouts);

        long activeProgramCount = programs.stream().filter(program -> isProgramOperatingNow(program, now)).count();
        long activeBoothCount = booths.stream().filter(booth -> booth.getStatus() == BoothStatus.OPEN).count();

        long waitingProgramCount = experienceProgramIds.stream()
                .map(experienceWaitMap::get)
                .filter(Objects::nonNull)
                .filter(wait -> hasWaiting(wait.getWaitCount(), wait.getWaitMin()))
                .count();
        long waitingBoothCount = booths.stream()
                .map(Booth::getBoothId)
                .map(boothWaitMap::get)
                .filter(Objects::nonNull)
                .filter(wait -> hasWaiting(wait.getWaitCount(), wait.getWaitMin()))
                .count();
        long liveContestCount = programs.stream()
                .filter(program -> program.getCategory() == ProgramCategory.CONTEST)
                .filter(program -> isProgramOperatingNow(program, now))
                .count();

        long recentVotesCount = aggregateQueryRepository.findProgramVoteCounts(eventId).stream()
                .mapToLong(AdminRealtimeAggregateQueryRepository.ProgramVoteCountRow::voteCount)
                .sum();
        long recentCheckinsCount = qrCheckinRepository.countByQrCode_Event_EventIdAndCheckTypeAndCheckedAtBetween(
                eventId,
                QrCheckType.CHECKIN,
                now.minusMinutes(30),
                now
        );

        List<Integer> waitMinutes = new ArrayList<>();
        List<Integer> congestionLevels = new ArrayList<>();
        List<LocalDateTime> updatedAtCandidates = new ArrayList<>();

        boothWaitMap.values().forEach(wait -> {
            if (wait == null) return;
            if (wait.getWaitMin() != null) waitMinutes.add(wait.getWaitMin());
            if (wait.getUpdatedAt() != null) updatedAtCandidates.add(wait.getUpdatedAt());
        });
        experienceProgramIds.stream()
                .map(experienceWaitMap::get)
                .filter(Objects::nonNull)
                .forEach(wait -> {
            if (wait == null) return;
            if (wait.getWaitMin() != null) waitMinutes.add(wait.getWaitMin());
            if (wait.getUpdatedAt() != null) updatedAtCandidates.add(wait.getUpdatedAt());
        });
        boothCongestionMap.values().forEach(congestion -> {
            if (congestion == null) return;
            if (congestion.congestionLevel() != null) congestionLevels.add(congestion.congestionLevel());
            if (congestion.measuredAt() != null) updatedAtCandidates.add(congestion.measuredAt());
        });

        Optional<QrCheckin> latestCheckin = qrCheckinRepository
                .findTopByQrCode_Event_EventIdAndCheckTypeOrderByCheckedAtDesc(eventId, QrCheckType.CHECKIN);
        latestCheckin.map(QrCheckin::getCheckedAt).ifPresent(updatedAtCandidates::add);
        Optional.ofNullable(aggregateQueryRepository.findLatestVoteAt(eventId)).ifPresent(updatedAtCandidates::add);

        double averageCongestionLevel = congestionLevels.isEmpty()
                ? 0.0
                : congestionLevels.stream().mapToInt(Integer::intValue).average().orElse(0.0);
        long hotspotCount = computeHotspotCount(waitMinutes);
        LocalDateTime latestUpdatedAt = updatedAtCandidates.stream()
                .filter(Objects::nonNull)
                .max(LocalDateTime::compareTo)
                .orElse(null);

        return new AdminRealtimeAggregateResponse.OverviewSnapshot(
                toEventSummary(event),
                new AdminRealtimeAggregateResponse.RealtimeSummary(
                        totalApplicants,
                        approvedApplicants,
                        issuedQrCount,
                        totalCheckins,
                        totalCheckouts,
                        currentInside,
                        activeProgramCount,
                        activeBoothCount,
                        roundOneDecimal(averageCongestionLevel),
                        hotspotCount,
                        latestUpdatedAt
                ),
                new AdminRealtimeAggregateResponse.QuickStats(
                        waitingProgramCount,
                        waitingBoothCount,
                        liveContestCount,
                        recentVotesCount,
                        recentCheckinsCount
                ),
                metadata(DEFAULT_POLL_SECONDS, "overview")
        );
    }

    public AdminRealtimeAggregateResponse.DashboardSnapshot dashboardSnapshot(Long eventId) {
        return getOrLoadSnapshot(snapshotKey("dashboard", eventId), () -> buildDashboardSnapshot(eventId));
    }

    private AdminRealtimeAggregateResponse.DashboardSnapshot buildDashboardSnapshot(Long eventId) {
        Event event = getEvent(eventId);
        LocalDateTime now = LocalDateTime.now();

        List<Program> programs = findPrograms(eventId);
        List<Booth> booths = findBooths(eventId);
        Map<Long, Booth> boothById = booths.stream()
                .collect(Collectors.toMap(Booth::getBoothId, Function.identity(), (left, right) -> left));
        Map<Long, ExperienceWait> experienceWaitMap = findExperienceWaitMap(programs);
        Map<Long, BoothWait> boothWaitMap = findBoothWaitMap(booths);
        ProgramWaitEstimationContext waitEstimationContext =
                buildProgramWaitEstimationContext(programs, now);

        Map<String, Long> registrationByStatus = findRegistrationStatusMap(eventId);
        long totalApplicants = registrationByStatus.values().stream().mapToLong(this::safeLong).sum();
        long approvedApplicants = registrationByStatus.getOrDefault("APPROVED", 0L);
        long totalCheckins = qrCheckinRepository.countByQrCode_Event_EventIdAndCheckType(eventId, QrCheckType.CHECKIN);
        long totalCheckouts = qrCheckinRepository.countByQrCode_Event_EventIdAndCheckType(eventId, QrCheckType.CHECKOUT);
        long currentInside = Math.max(0L, totalCheckins - totalCheckouts);

        Map<Long, Map<String, Long>> programApplyStatusMap = buildProgramApplyStatusMap(eventId);
        Map<Long, Long> checkedInCountMap = aggregateQueryRepository.findProgramCheckedInCounts(eventId).stream()
                .collect(Collectors.toMap(
                        AdminRealtimeAggregateQueryRepository.ProgramCheckedInCountRow::programId,
                        AdminRealtimeAggregateQueryRepository.ProgramCheckedInCountRow::count,
                        (left, right) -> left
                ));
        Map<Long, AdminRealtimeAggregateQueryRepository.BoothCongestionRow> boothCongestionMap =
                findBoothCongestionMap(eventId);

        List<AdminRealtimeAggregateResponse.ProgramCongestionSummary> programSummaries = programs.stream()
                .map(program -> {
                    Long programId = program.getProgramId();
                    Map<String, Long> statusCounts = programApplyStatusMap.getOrDefault(programId, Map.of());
                    long appliedCount = activeApplyCount(statusCounts);
                    long approvedCount = safeLong(statusCounts.getOrDefault("APPROVED", 0L))
                            + safeLong(statusCounts.getOrDefault("CHECKED_IN", 0L));
                    long checkedInCount = safeLong(checkedInCountMap.getOrDefault(programId, 0L));

                    boolean isExperienceProgram = program.getCategory() == ProgramCategory.EXPERIENCE;
                    ExperienceWait wait = isExperienceProgram ? experienceWaitMap.get(programId) : null;
                    Integer waitCount = wait == null ? null : wait.getWaitCount();
                    Integer rawWaitMin = wait == null ? null : wait.getWaitMin();
                    Integer waitMin = normalizeProgramWaitMinutes(
                            waitCount,
                            rawWaitMin,
                            program.getThroughputPerMin(),
                            program.getBoothId(),
                            waitEstimationContext
                    );

                    Integer currentPercent = deriveCongestionPercentFromWait(waitCount, waitMin);
                    Integer currentLevel = percentToLevel(currentPercent);

                    Booth booth = boothById.get(program.getBoothId());

                    return new AdminRealtimeAggregateResponse.ProgramCongestionSummary(
                            programId,
                            nullToEmpty(program.getProgramTitle()),
                            String.valueOf(program.getCategory()),
                            program.getBoothId(),
                            booth == null ? null : booth.getPlaceName(),
                            currentLevel,
                            currentPercent,
                            null,
                            null,
                            waitCount,
                            waitMin,
                            appliedCount,
                            approvedCount,
                            checkedInCount,
                            hasStarted(program, now),
                            hasEnded(program, now),
                            program.getStartAt(),
                            program.getEndAt(),
                            wait == null
                                    ? null
                                    : new AdminRealtimeAggregateResponse.ProgramExperienceWait(
                                    wait.getWaitCount(),
                                    waitMin,
                                    wait.getUpdatedAt()
                            )
                    );
                })
                .toList();

        List<AdminRealtimeAggregateResponse.BoothCongestionSummary> boothSummaries = booths.stream()
                .map(booth -> {
                    BoothWait boothWait = boothWaitMap.get(booth.getBoothId());
                    AdminRealtimeAggregateQueryRepository.BoothCongestionRow boothCongestion =
                            boothCongestionMap.get(booth.getBoothId());
                    Integer congestionLevel = boothCongestion == null ? null : boothCongestion.congestionLevel();
                    Integer congestionPercent = levelToPercent(congestionLevel);
                    LocalDateTime updatedAt = maxDateTime(
                            boothWait == null ? null : boothWait.getUpdatedAt(),
                            boothCongestion == null ? null : boothCongestion.measuredAt()
                    );

                    return new AdminRealtimeAggregateResponse.BoothCongestionSummary(
                            booth.getBoothId(),
                            booth.getPlaceName(),
                            String.valueOf(booth.getType()),
                            String.valueOf(booth.getZone()),
                            boothWait == null ? null : boothWait.getWaitCount(),
                            boothWait == null ? null : boothWait.getWaitMin(),
                            congestionLevel,
                            congestionPercent,
                            updatedAt,
                            boothCongestion == null ? null : boothCongestion.programId(),
                            boothCongestion == null ? null : boothCongestion.measuredAt()
                    );
                })
                .toList();

        List<Integer> measuredLevels = boothSummaries.stream()
                .map(AdminRealtimeAggregateResponse.BoothCongestionSummary::congestionLevel)
                .filter(Objects::nonNull)
                .toList();
        Integer currentLevel = measuredLevels.isEmpty()
                ? null
                : (int) Math.round(measuredLevels.stream().mapToInt(Integer::intValue).average().orElse(0.0));
        Integer currentPercent = levelToPercent(currentLevel);
        LocalDateTime latestMeasuredAt = boothSummaries.stream()
                .map(AdminRealtimeAggregateResponse.BoothCongestionSummary::measuredAt)
                .filter(Objects::nonNull)
                .max(LocalDateTime::compareTo)
                .orElse(null);

        Integer predictedPercent = null;
        Integer predictedPeakPercent = null;
        Integer predictedLevel = null;
        LocalDateTime latestPredictedAt = null;
        AdminRealtimeAggregateResponse.CongestionPrediction prediction = null;

        AiCongestionPredictionResponse aiRealtimePrediction = fetchRealtimeEventPrediction(event, now);
        if (aiRealtimePrediction != null) {
            predictedPercent = normalizePredictionScore(aiRealtimePrediction.predictedAvgScore());
            predictedPeakPercent = Optional.ofNullable(normalizePredictionScore(aiRealtimePrediction.predictedPeakScore()))
                    .orElse(predictedPercent);
            predictedLevel = aiRealtimePrediction.predictedLevel() > 0
                    ? aiRealtimePrediction.predictedLevel()
                    : percentToLevel(predictedPeakPercent);
            latestPredictedAt = aiRealtimePrediction.baseTime();
            prediction = toCongestionPrediction(aiRealtimePrediction, predictedPercent, predictedPeakPercent, predictedLevel);
        }

        if (predictedPercent == null) {
            Optional<AiPredictionLog> aiLogOptional = aiPredictionLogRepository
                    .findTopByTargetTypeAndEventIdOrderByPredictionBaseTimeDesc(AiPredictionTargetType.EVENT, eventId);
            AiPredictionLog aiLog = aiLogOptional.orElse(null);
            AiEventCongestionTimeseries latestTimeseries = aiEventCongestionTimeseriesRepository
                    .findLatestByEventIdsBeforeOrAt(List.of(eventId), now)
                    .stream()
                    .findFirst()
                    .orElse(null);

            Integer fallbackPredictedPercent = latestTimeseries == null
                    ? null
                    : normalizePredictionScore(latestTimeseries.getCongestionScore());
            LocalDateTime fallbackPredictedAt = latestTimeseries == null
                    ? null
                    : latestTimeseries.getTimestampMinute();

            predictedPercent = aiLog == null
                    ? fallbackPredictedPercent
                    : normalizePredictionScore(aiLog.getPredictedAvgScore60m());
            predictedPeakPercent = aiLog == null
                    ? fallbackPredictedPercent
                    : Optional.ofNullable(normalizePredictionScore(aiLog.getPredictedPeakScore60m()))
                    .orElse(predictedPercent);
            predictedLevel = aiLog == null
                    ? percentToLevel(predictedPercent)
                    : toInt(aiLog.getPredictedLevel());
            latestPredictedAt = aiLog == null ? fallbackPredictedAt : aiLog.getPredictionBaseTime();

            prediction = predictedPercent == null
                    ? null
                    : new AdminRealtimeAggregateResponse.CongestionPrediction(
                    aiLog == null
                            ? predictedPercent.doubleValue()
                            : toDouble(aiLog.getPredictedAvgScore60m()),
                    aiLog == null
                            ? predictedPeakPercent == null ? predictedPercent.doubleValue() : predictedPeakPercent.doubleValue()
                            : Optional.ofNullable(toDouble(aiLog.getPredictedPeakScore60m()))
                            .orElse(Optional.ofNullable(toDouble(aiLog.getPredictedAvgScore60m()))
                                    .orElse(predictedPercent.doubleValue())),
                    predictedLevel,
                    null,
                    aiLog == null ? 0.0d : null,
                    aiLog == null,
                    buildPredictionTimeline(
                            eventId,
                            latestPredictedAt,
                            predictedPercent,
                            predictedPeakPercent,
                            predictedLevel,
                            event.getStartAt(),
                            event.getEndAt()
                    )
            );
        }

        LocalDateTime peakExpectedTime = resolvePeakExpectedTime(
                prediction == null ? List.of() : prediction.timeline(),
                latestPredictedAt
        );

        long activePrograms = programs.stream().filter(program -> isProgramOperatingNow(program, now)).count();
        long activeBooths = booths.stream().filter(booth -> booth.getStatus() == BoothStatus.OPEN).count();
        String congestionSource = currentPercent != null && currentPercent > 0
                ? "MEASURED"
                : prediction != null ? "AI" : "ESTIMATED";

        List<AdminRealtimeAggregateResponse.TrendPoint> trendPoints = aggregateQueryRepository
                .findHourlyCongestions(eventId).stream()
                .map(row -> new AdminRealtimeAggregateResponse.TrendPoint(
                        row.hour(),
                        row.avgCongestionLevel()
                ))
                .toList();

        return new AdminRealtimeAggregateResponse.DashboardSnapshot(
                toEventSummary(event),
                new AdminRealtimeAggregateResponse.DashboardSummaryCards(
                        totalApplicants,
                        approvedApplicants,
                        computeRate(approvedApplicants, totalApplicants),
                        computeRate(totalCheckins, Math.max(approvedApplicants, 1L)),
                        currentInside,
                        programs.size(),
                        activePrograms,
                        booths.size(),
                        activeBooths,
                        currentPercent == null ? 0 : clampPercent(currentPercent),
                        congestionSource
                ),
                new AdminRealtimeAggregateResponse.CongestionSummary(
                        currentLevel,
                        currentPercent,
                        predictedLevel,
                        predictedPercent,
                        peakExpectedTime,
                        latestMeasuredAt,
                        latestPredictedAt,
                        prediction
                ),
                programSummaries,
                boothSummaries,
                new AdminRealtimeAggregateResponse.TrendSummary(trendPoints),
                new AdminRealtimeAggregateResponse.ProgramPerformance(
                        approvedApplicants,
                        totalCheckins
                ),
                metadata(DEFAULT_POLL_SECONDS, "dashboard")
        );
    }

    public AdminRealtimeAggregateResponse.WaitingStatusSnapshot waitingStatusSnapshot(Long eventId) {
        return getOrLoadSnapshot(snapshotKey("waiting", eventId), () -> buildWaitingStatusSnapshot(eventId));
    }

    private AdminRealtimeAggregateResponse.WaitingStatusSnapshot buildWaitingStatusSnapshot(Long eventId) {
        Event event = getEvent(eventId);
        LocalDateTime now = LocalDateTime.now();

        List<Program> experiencePrograms = findPrograms(eventId).stream()
                .filter(program -> program.getCategory() == ProgramCategory.EXPERIENCE)
                .filter(program -> isProgramOperatingNow(program, now))
                .toList();
        List<Booth> booths = findBooths(eventId);

        Map<Long, ExperienceWait> experienceWaitMap = findExperienceWaitMap(experiencePrograms);
        Map<Long, BoothWait> boothWaitMap = findBoothWaitMap(booths);
        ProgramWaitEstimationContext waitEstimationContext =
                buildProgramWaitEstimationContext(experiencePrograms, now);

        List<AdminRealtimeAggregateResponse.BoothWaitSummary> boothRows = booths.stream()
                .map(booth -> {
                    BoothWait wait = boothWaitMap.get(booth.getBoothId());
                    Integer waitCount = wait == null ? null : wait.getWaitCount();
                    Integer waitMin = wait == null ? null : wait.getWaitMin();
                    Integer congestionPercent = deriveCongestionPercentFromWait(waitCount, waitMin);
                    Integer congestionScore = computeCongestionScore(waitCount, waitMin);
                    String tone = resolveWaitTone(congestionScore);
                    return new AdminRealtimeAggregateResponse.BoothWaitSummary(
                            "booth-" + booth.getBoothId(),
                            booth.getBoothId(),
                            nullToEmpty(booth.getPlaceName()),
                            booth.getZone() == null ? null : booth.getZone().name(),
                            formatZoneName(booth.getZone()),
                            nullToEmpty(booth.getCompany()),
                            waitCount,
                            waitMin,
                            congestionPercent,
                            congestionScore,
                            resolveWaitLabel(tone),
                            tone,
                            wait == null ? null : wait.getUpdatedAt()
                    );
                })
                .sorted(waitingBoothComparator())
                .toList();

        List<AdminRealtimeAggregateResponse.ProgramWaitSummary> programRows = experiencePrograms.stream()
                .map(program -> {
                    ExperienceWait wait = experienceWaitMap.get(program.getProgramId());
                    Integer waitCount = wait == null ? null : wait.getWaitCount();
                    Integer rawWaitMin = wait == null ? null : wait.getWaitMin();
                    Integer waitMin = normalizeProgramWaitMinutes(
                            waitCount,
                            rawWaitMin,
                            program.getThroughputPerMin(),
                            program.getBoothId(),
                            waitEstimationContext
                    );
                    Integer congestionPercent = deriveCongestionPercentFromWait(waitCount, waitMin);
                    Integer congestionScore = computeCongestionScore(waitCount, waitMin);
                    String tone = resolveWaitTone(congestionScore);

                    return new AdminRealtimeAggregateResponse.ProgramWaitSummary(
                            "program-" + program.getProgramId(),
                            program.getProgramId(),
                            nullToEmpty(program.getProgramTitle()),
                            program.getStartAt(),
                            program.getEndAt(),
                            formatTimeRange(program.getStartAt(), program.getEndAt()),
                            waitCount,
                            waitMin,
                            congestionPercent,
                            congestionScore,
                            resolveWaitLabel(tone),
                            tone,
                            wait == null ? null : wait.getUpdatedAt()
                    );
                })
                .sorted(waitingProgramComparator())
                .toList();

        long totalWaitingCount = boothRows.stream()
                .map(AdminRealtimeAggregateResponse.BoothWaitSummary::waitCount)
                .filter(Objects::nonNull)
                .mapToLong(Integer::longValue)
                .sum()
                + programRows.stream()
                .map(AdminRealtimeAggregateResponse.ProgramWaitSummary::waitCount)
                .filter(Objects::nonNull)
                .mapToLong(Integer::longValue)
                .sum();
        long totalWaitingPrograms = programRows.stream()
                .filter(row -> hasWaiting(row.waitCount(), row.waitMin()))
                .count();
        long totalWaitingBooths = boothRows.stream()
                .filter(row -> hasWaiting(row.waitCount(), row.waitMin()))
                .count();

        List<Integer> waitMinutes = new ArrayList<>();
        boothRows.stream().map(AdminRealtimeAggregateResponse.BoothWaitSummary::waitMin)
                .filter(Objects::nonNull).forEach(waitMinutes::add);
        programRows.stream().map(AdminRealtimeAggregateResponse.ProgramWaitSummary::waitMin)
                .filter(Objects::nonNull).forEach(waitMinutes::add);

        Integer averageWaitMin = waitMinutes.isEmpty()
                ? 0
                : (int) Math.round(waitMinutes.stream().mapToInt(Integer::intValue).average().orElse(0.0));
        Integer longestWaitMin = waitMinutes.isEmpty() ? 0 : waitMinutes.stream().max(Integer::compareTo).orElse(0);

        List<LocalDateTime> updatedAtCandidates = new ArrayList<>();
        boothRows.stream().map(AdminRealtimeAggregateResponse.BoothWaitSummary::updatedAt)
                .filter(Objects::nonNull).forEach(updatedAtCandidates::add);
        programRows.stream().map(AdminRealtimeAggregateResponse.ProgramWaitSummary::updatedAt)
                .filter(Objects::nonNull).forEach(updatedAtCandidates::add);

        List<AdminRealtimeAggregateResponse.HotspotSummary> hotspots = buildHotspots(boothRows, programRows);

        return new AdminRealtimeAggregateResponse.WaitingStatusSnapshot(
                toEventSummary(event),
                new AdminRealtimeAggregateResponse.WaitingSummary(
                        totalWaitingCount,
                        totalWaitingPrograms,
                        totalWaitingBooths,
                        averageWaitMin,
                        longestWaitMin,
                        hotspots.size(),
                        updatedAtCandidates.stream().max(LocalDateTime::compareTo).orElse(null)
                ),
                boothRows,
                programRows,
                hotspots,
                metadata(DEFAULT_POLL_SECONDS, "waiting")
        );
    }

    public AdminRealtimeAggregateResponse.CheckinStatusSnapshot checkinStatusSnapshot(Long eventId) {
        Long userId = securityUtil.currentUserIdOrNull();
        return getOrLoadSnapshot(
                snapshotKey("checkin", eventId, userId),
                () -> buildCheckinStatusSnapshot(eventId, userId)
        );
    }

    private AdminRealtimeAggregateResponse.CheckinStatusSnapshot buildCheckinStatusSnapshot(Long eventId, Long userId) {
        Event event = getEvent(eventId);
        LocalDateTime now = LocalDateTime.now();

        List<Program> programs = findPrograms(eventId);
        Map<Long, Program> programById = programs.stream()
                .collect(Collectors.toMap(Program::getProgramId, Function.identity(), (left, right) -> left));
        Map<Long, Booth> boothById = findBooths(eventId).stream()
                .collect(Collectors.toMap(Booth::getBoothId, Function.identity(), (left, right) -> left));

        Map<String, Long> registrationByStatus = findRegistrationStatusMap(eventId);
        long totalApplicants = registrationByStatus.values().stream().mapToLong(this::safeLong).sum();
        long approvedApplicants = registrationByStatus.getOrDefault("APPROVED", 0L);
        long issuedQrCount = qrCodeRepository.countByEvent_EventId(eventId);
        long totalCheckins = qrCheckinRepository.countByQrCode_Event_EventIdAndCheckType(eventId, QrCheckType.CHECKIN);
        long totalCheckouts = qrCheckinRepository.countByQrCode_Event_EventIdAndCheckType(eventId, QrCheckType.CHECKOUT);
        long currentInside = Math.max(0L, totalCheckins - totalCheckouts);

        Map<Long, Map<String, Long>> applyStatusMap = buildProgramApplyStatusMap(eventId);
        Map<Long, Long> checkedInCountMap = aggregateQueryRepository.findProgramCheckedInCounts(eventId).stream()
                .collect(Collectors.toMap(
                        AdminRealtimeAggregateQueryRepository.ProgramCheckedInCountRow::programId,
                        AdminRealtimeAggregateQueryRepository.ProgramCheckedInCountRow::count,
                        (left, right) -> left
                ));

        List<AdminRealtimeAggregateResponse.ProgramCheckinSummary> programCheckinSummaries = programs.stream()
                .map(program -> {
                    Map<String, Long> statusCounts = applyStatusMap.getOrDefault(program.getProgramId(), Map.of());
                    long appliedCount = safeLong(statusCounts.getOrDefault("APPLIED", 0L));
                    long approvedCount = safeLong(statusCounts.getOrDefault("APPROVED", 0L));
                    long checkedInCount = safeLong(checkedInCountMap.getOrDefault(program.getProgramId(), 0L));
                    long waitingCount = appliedCount
                            + safeLong(statusCounts.getOrDefault("WAITING", 0L))
                            + approvedCount;

                    Booth booth = boothById.get(program.getBoothId());

                    return new AdminRealtimeAggregateResponse.ProgramCheckinSummary(
                            program.getProgramId(),
                            nullToEmpty(program.getProgramTitle()),
                            String.valueOf(program.getCategory()),
                            program.getBoothId(),
                            booth == null ? null : booth.getPlaceName(),
                            activeApplyCount(statusCounts),
                            approvedCount + checkedInCount,
                            checkedInCount,
                            waitingCount,
                            hasStarted(program, now),
                            hasEnded(program, now)
                    );
                })
                .toList();

        Map<Long, AdminRealtimeAggregateResponse.ProgramCheckinSummary> programCheckinSummaryByProgramId =
                programCheckinSummaries.stream()
                        .collect(Collectors.toMap(
                                AdminRealtimeAggregateResponse.ProgramCheckinSummary::programId,
                                Function.identity(),
                                (left, right) -> left
                        ));

        List<AdminRealtimeAggregateResponse.RecentCheckinLog> recentLogs = aggregateQueryRepository
                .findRecentCheckinLogs(eventId, 20).stream()
                .map(row -> new AdminRealtimeAggregateResponse.RecentCheckinLog(
                        row.logId(),
                        row.qrId(),
                        row.boothId(),
                        row.boothName(),
                        row.checkType(),
                        row.checkedAt()
                ))
                .toList();

        List<AdminRealtimeAggregateResponse.MyProgramSummary> myPrograms = List.of();
        List<AdminRealtimeAggregateResponse.ParticipatedEventSummary> participatedEvents = List.of();
        AdminRealtimeAggregateResponse.MyCheckinSummary myCheckin = null;
        AdminRealtimeAggregateResponse.MyQrSummary myQrSummary = null;
        AdminRealtimeAggregateResponse.ProgramCheckinStatusSummary primaryProgramStatus = null;

        if (userId != null && !programs.isEmpty()) {
            List<Long> programIds = programs.stream().map(Program::getProgramId).toList();
            List<ProgramApply> applies = programApplyRepository.findByUserIdAndProgramIdIn(userId, programIds);

            myPrograms = applies.stream()
                    .filter(apply -> !isCancelledOrRejected(apply.getStatus()))
                    .map(apply -> {
                        Program program = programById.get(apply.getProgramId());
                        if (program == null) {
                            return null;
                        }
                        String status = resolveMyProgramStatus(apply, program, now);
                        return new AdminRealtimeAggregateResponse.MyProgramSummary(
                                apply.getProgramApplyId(),
                                apply.getProgramId(),
                                program.getEventId(),
                                nullToEmpty(program.getProgramTitle()),
                                formatTimeRange(event.getStartAt(), event.getEndAt()),
                                status,
                                apply.getTicketNo() == null || apply.getTicketNo().isBlank()
                                        ? "PA-" + apply.getProgramApplyId()
                                        : apply.getTicketNo()
                        );
                    })
                    .filter(Objects::nonNull)
                    .sorted(Comparator.comparing(AdminRealtimeAggregateResponse.MyProgramSummary::programId))
                    .toList();

            boolean hasCheckedInProgram = myPrograms.stream()
                    .anyMatch(program -> "CHECKED_IN".equalsIgnoreCase(program.status()));
            if (hasCheckedInProgram) {
                participatedEvents = List.of(new AdminRealtimeAggregateResponse.ParticipatedEventSummary(
                        event.getEventId(),
                        nullToEmpty(event.getEventName()),
                        event.getStartAt()
                ));
            }

            AdminRealtimeAggregateResponse.MyProgramSummary primaryProgram =
                    myPrograms.isEmpty() ? null : myPrograms.get(0);
            if (primaryProgram != null) {
                AdminRealtimeAggregateResponse.ProgramCheckinSummary summary =
                        programCheckinSummaryByProgramId.get(primaryProgram.programId());

                primaryProgramStatus = summary == null
                        ? null
                        : new AdminRealtimeAggregateResponse.ProgramCheckinStatusSummary(
                        summary.programTitle(),
                        (int) summary.appliedCount(),
                        (int) summary.checkedInCount(),
                        (int) summary.waitingCount()
                );

                Program program = programById.get(primaryProgram.programId());
                Booth booth = program == null ? null : boothById.get(program.getBoothId());

                myCheckin = new AdminRealtimeAggregateResponse.MyCheckinSummary(
                        primaryProgram.programName(),
                        program == null ? "" : nullToEmpty(program.getDescription()),
                        primaryProgram.time(),
                        booth == null ? "" : nullToEmpty(booth.getPlaceName()),
                        primaryProgram.status(),
                        null,
                        summary == null ? 0 : (int) summary.appliedCount(),
                        summary == null ? 0 : (int) summary.waitingCount(),
                        "WAITING".equalsIgnoreCase(primaryProgram.status()) ? "집계 중" : "-"
                );
            }

            Optional<QrCode> latestQr = qrCodeRepository.findLatest(userId, eventId);
            if (latestQr.isPresent()) {
                myQrSummary = new AdminRealtimeAggregateResponse.MyQrSummary(
                        latestQr.get().getQrId(),
                        null
                );
            }
        }

        LocalDateTime latestUpdatedAt = recentLogs.stream()
                .map(AdminRealtimeAggregateResponse.RecentCheckinLog::checkedAt)
                .filter(Objects::nonNull)
                .max(LocalDateTime::compareTo)
                .orElse(null);

        return new AdminRealtimeAggregateResponse.CheckinStatusSnapshot(
                toEventSummary(event),
                new AdminRealtimeAggregateResponse.CheckinSummary(
                        totalApplicants,
                        approvedApplicants,
                        issuedQrCount,
                        totalCheckins,
                        totalCheckouts,
                        currentInside,
                        computeRate(totalCheckins, Math.max(approvedApplicants, 1L)),
                        latestUpdatedAt
                ),
                programCheckinSummaries,
                recentLogs,
                myPrograms,
                participatedEvents,
                myCheckin,
                myQrSummary,
                primaryProgramStatus,
                metadata(DEFAULT_POLL_SECONDS, "checkin")
        );
    }

    public AdminRealtimeAggregateResponse.VoteStatusSnapshot voteStatusSnapshot(Long eventId) {
        return getOrLoadSnapshot(snapshotKey("vote", eventId), () -> buildVoteStatusSnapshot(eventId));
    }

    private AdminRealtimeAggregateResponse.VoteStatusSnapshot buildVoteStatusSnapshot(Long eventId) {
        Event event = getEvent(eventId);
        LocalDateTime now = LocalDateTime.now();

        List<Program> contestPrograms = findPrograms(eventId).stream()
                .filter(program -> program.getCategory() == ProgramCategory.CONTEST)
                .sorted(Comparator.comparing(Program::getStartAt))
                .toList();
        List<Long> contestProgramIds = contestPrograms.stream().map(Program::getProgramId).toList();

        Map<Long, Long> programVotesMap = aggregateQueryRepository.findProgramVoteCounts(eventId).stream()
                .collect(Collectors.toMap(
                        AdminRealtimeAggregateQueryRepository.ProgramVoteCountRow::programId,
                        AdminRealtimeAggregateQueryRepository.ProgramVoteCountRow::voteCount,
                        (left, right) -> left
                ));
        Map<Long, Map<Long, Long>> applyVotesByProgram = new HashMap<>();
        aggregateQueryRepository.findProgramApplyVoteCounts(eventId).forEach(row -> {
            applyVotesByProgram
                    .computeIfAbsent(row.programId(), key -> new HashMap<>())
                    .put(row.programApplyId(), row.voteCount());
        });

        List<ProgramApply> candidates = contestProgramIds.isEmpty()
                ? List.of()
                : programApplyRepository.findByProgramIdInAndStatusIn(
                contestProgramIds,
                List.of(ApplyStatus.APPLIED, ApplyStatus.WAITING, ApplyStatus.APPROVED, ApplyStatus.CHECKED_IN)
        );
        Map<Long, List<ProgramApply>> candidatesByProgram = candidates.stream()
                .collect(Collectors.groupingBy(ProgramApply::getProgramId));

        Map<Long, String> userNicknameMap = resolveUserNicknameMap(candidates);
        Map<Long, String> petNameMap = resolvePetNameMap(candidates);

        List<AdminRealtimeAggregateResponse.VoteContest> contests = contestPrograms.stream()
                .map(program -> {
                    List<ProgramApply> programCandidates =
                            candidatesByProgram.getOrDefault(program.getProgramId(), List.of());
                    Map<Long, ProgramApply> candidateByApplyId = programCandidates.stream()
                            .collect(Collectors.toMap(
                                    ProgramApply::getProgramApplyId,
                                    Function.identity(),
                                    (left, right) -> left
                            ));

                    Map<Long, Long> voteByApplyId =
                            applyVotesByProgram.getOrDefault(program.getProgramId(), Map.of());

                    Set<Long> applyIds = new HashSet<>(candidateByApplyId.keySet());
                    applyIds.addAll(voteByApplyId.keySet());

                    List<VoteCandidateRaw> mergedCandidates = applyIds.stream()
                            .map(applyId -> {
                                ProgramApply apply = candidateByApplyId.get(applyId);
                                String displayName = buildCandidateDisplayName(apply, petNameMap);
                                String ownerNickname = buildOwnerNickname(apply, userNicknameMap);
                                String imageUrl = apply == null ? null : storageUrlResolver.toPublicUrl(apply.getImageUrl());
                                long votes = safeLong(voteByApplyId.getOrDefault(applyId, 0L));
                                String status = apply == null || apply.getStatus() == null
                                        ? "UNKNOWN"
                                        : apply.getStatus().name();
                                return new VoteCandidateRaw(
                                        applyId,
                                        displayName,
                                        ownerNickname,
                                        imageUrl,
                                        votes,
                                        status
                                );
                            })
                            .sorted((left, right) -> {
                                int voteDiff = Long.compare(right.votes(), left.votes());
                                if (voteDiff != 0) return voteDiff;
                                return left.name().compareToIgnoreCase(right.name());
                            })
                            .toList();

                    long totalVotes = safeLong(programVotesMap.getOrDefault(program.getProgramId(), 0L));
                    if (totalVotes <= 0L) {
                        totalVotes = mergedCandidates.stream().mapToLong(VoteCandidateRaw::votes).sum();
                    }

                    long leaderVotes = mergedCandidates.isEmpty() ? 0L : mergedCandidates.get(0).votes();
                    List<AdminRealtimeAggregateResponse.VoteCandidate> items = new ArrayList<>();
                    long previousVotes = leaderVotes;
                    int rank = 1;
                    for (VoteCandidateRaw candidate : mergedCandidates) {
                        double pct = totalVotes <= 0L ? 0.0 : (candidate.votes() * 100.0) / totalVotes;
                        long gapFromLeader = Math.max(0L, leaderVotes - candidate.votes());
                        long gapFromPrevious = rank == 1 ? 0L : Math.max(0L, previousVotes - candidate.votes());
                        items.add(new AdminRealtimeAggregateResponse.VoteCandidate(
                                candidate.applyId(),
                                candidate.name(),
                                candidate.imageUrl(),
                                candidate.ownerNickname(),
                                candidate.votes(),
                                rank,
                                pct,
                                gapFromLeader,
                                gapFromPrevious,
                                candidate.status()
                        ));
                        previousVotes = candidate.votes();
                        rank += 1;
                    }

                    return new AdminRealtimeAggregateResponse.VoteContest(
                            "contest-" + program.getProgramId(),
                            program.getProgramId(),
                            nullToEmpty(program.getProgramTitle()),
                            resolveContestStatus(program, now),
                            program.getStartAt(),
                            program.getEndAt(),
                            totalVotes,
                            items.size(),
                            items
                    );
                })
                .toList();

        long totalVotes = contests.stream().mapToLong(AdminRealtimeAggregateResponse.VoteContest::totalVotes).sum();
        long activeContestCount = contests.stream()
                .filter(contest -> "진행 중".equals(contest.status()))
                .count();

        return new AdminRealtimeAggregateResponse.VoteStatusSnapshot(
                toEventSummary(event),
                new AdminRealtimeAggregateResponse.VoteSummary(
                        contests.size(),
                        activeContestCount,
                        totalVotes,
                        aggregateQueryRepository.findLatestVoteAt(eventId),
                        LocalDateTime.now()
                ),
                contests,
                metadata(DEFAULT_POLL_SECONDS, "vote")
        );
    }

    private String snapshotKey(String snapshotType, Long eventId) {
        return snapshotType + ":" + eventId;
    }

    private String snapshotKey(String snapshotType, Long eventId, Long userId) {
        String userKey = userId == null ? "anon" : "u" + userId;
        return snapshotType + ":" + eventId + ":" + userKey;
    }

    private <T> T getOrLoadSnapshot(String key, Supplier<T> loader) {
        long now = System.currentTimeMillis();
        SnapshotCacheEntry cached = snapshotCache.get(key);
        if (cached != null) {
            if (cached.expiresAtMillis() > now) {
                return castSnapshotValue(cached.value());
            }

            long staleMillis = now - cached.expiresAtMillis();
            if (staleMillis <= SNAPSHOT_CACHE_MAX_STALE_MILLIS) {
                triggerAsyncSnapshotRefresh(key, loader);
                return castSnapshotValue(cached.value());
            }
        }

        CompletableFuture<Object> leaderFuture = new CompletableFuture<>();
        CompletableFuture<Object> existingFuture = inFlightSnapshotLoads.putIfAbsent(key, leaderFuture);

        if (existingFuture == null) {
            try {
                T loaded = loader.get();
                snapshotCache.put(
                        key,
                        new SnapshotCacheEntry(loaded, System.currentTimeMillis() + SNAPSHOT_CACHE_TTL_MILLIS)
                );
                leaderFuture.complete(loaded);
                return loaded;
            } catch (RuntimeException ex) {
                leaderFuture.completeExceptionally(ex);
                throw ex;
            } catch (Error err) {
                leaderFuture.completeExceptionally(err);
                throw err;
            } finally {
                inFlightSnapshotLoads.remove(key, leaderFuture);
                cleanupExpiredSnapshotCache();
            }
        }

        try {
            Object shared = existingFuture.get(IN_FLIGHT_WAIT_TIMEOUT_MILLIS, TimeUnit.MILLISECONDS);
            return castSnapshotValue(shared);
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
        } catch (Exception ignored) {
            // If shared load failed or timed out, fall back to direct recompute below.
        }

        SnapshotCacheEntry latest = snapshotCache.get(key);
        if (latest != null && latest.expiresAtMillis() > System.currentTimeMillis()) {
            return castSnapshotValue(latest.value());
        }

        return loader.get();
    }

    private <T> void triggerAsyncSnapshotRefresh(String key, Supplier<T> loader) {
        CompletableFuture<Object> leaderFuture = new CompletableFuture<>();
        CompletableFuture<Object> existingFuture = inFlightSnapshotLoads.putIfAbsent(key, leaderFuture);
        if (existingFuture != null) {
            return;
        }

        CompletableFuture.runAsync(() -> {
            try {
                T loaded = loader.get();
                snapshotCache.put(
                        key,
                        new SnapshotCacheEntry(loaded, System.currentTimeMillis() + SNAPSHOT_CACHE_TTL_MILLIS)
                );
                leaderFuture.complete(loaded);
            } catch (Throwable throwable) {
                leaderFuture.completeExceptionally(throwable);
            } finally {
                inFlightSnapshotLoads.remove(key, leaderFuture);
                cleanupExpiredSnapshotCache();
            }
        });
    }

    @SuppressWarnings("unchecked")
    private <T> T castSnapshotValue(Object value) {
        return (T) value;
    }

    private void cleanupExpiredSnapshotCache() {
        if (snapshotCache.size() < 512) {
            return;
        }
        long now = System.currentTimeMillis();
        snapshotCache.entrySet().removeIf(entry -> entry.getValue().expiresAtMillis() <= now);
    }

    private Event getEvent(Long eventId) {
        return eventRepository.findById(eventId)
                .orElseThrow(() -> new BusinessException(ErrorCode.EVENT_NOT_FOUND));
    }

    private List<Program> findPrograms(Long eventId) {
        return programRepository.findByEventId(
                        eventId,
                        PageRequest.of(0, 1000, Sort.by(Sort.Direction.ASC, "startAt"))
                )
                .getContent();
    }

    private List<Booth> findBooths(Long eventId) {
        return boothRepository.findEventBooths(
                        eventId,
                        null,
                        null,
                        PageRequest.of(0, 1000, Sort.by(Sort.Direction.ASC, "boothId"))
                )
                .getContent();
    }

    private Map<Long, ExperienceWait> findExperienceWaitMap(List<Program> programs) {
        List<Long> programIds = programs.stream()
                .map(Program::getProgramId)
                .filter(Objects::nonNull)
                .toList();
        if (programIds.isEmpty()) return Map.of();
        return experienceWaitRepository.findAllByProgramIdIn(programIds).stream()
                .collect(Collectors.toMap(ExperienceWait::getProgramId, Function.identity(), (left, right) -> left));
    }

    private Map<Long, BoothWait> findBoothWaitMap(List<Booth> booths) {
        List<Long> boothIds = booths.stream()
                .map(Booth::getBoothId)
                .filter(Objects::nonNull)
                .toList();
        if (boothIds.isEmpty()) return Map.of();
        return boothWaitRepository.findAllByBoothIdIn(boothIds).stream()
                .collect(Collectors.toMap(BoothWait::getBoothId, Function.identity(), (left, right) -> left));
    }

    private Map<String, Long> findRegistrationStatusMap(Long eventId) {
        Map<String, Long> result = new HashMap<>();
        aggregateQueryRepository.findRegistrationStatusCounts(eventId)
                .forEach(row -> result.put(row.status(), row.count()));
        return result;
    }

    private Map<Long, Map<String, Long>> buildProgramApplyStatusMap(Long eventId) {
        Map<Long, Map<String, Long>> byProgram = new HashMap<>();
        aggregateQueryRepository.findProgramApplyStatusCounts(eventId).forEach(row -> {
            byProgram.computeIfAbsent(row.programId(), key -> new HashMap<>())
                    .put(row.status(), row.count());
        });
        return byProgram;
    }

    private Map<Long, AdminRealtimeAggregateQueryRepository.BoothCongestionRow> findBoothCongestionMap(Long eventId) {
        return aggregateQueryRepository.findLatestBoothCongestions(eventId).stream()
                .collect(Collectors.toMap(
                        AdminRealtimeAggregateQueryRepository.BoothCongestionRow::boothId,
                        Function.identity(),
                        (left, right) -> left
                ));
    }

    private AdminRealtimeAggregateResponse.EventSummary toEventSummary(Event event) {
        return new AdminRealtimeAggregateResponse.EventSummary(
                event.getEventId(),
                nullToEmpty(event.getEventName()),
                String.valueOf(event.getStatus()),
                event.getStartAt(),
                event.getEndAt(),
                nullToEmpty(event.getLocation())
        );
    }

    private AdminRealtimeAggregateResponse.Metadata metadata(int pollingSeconds, String metricType) {
        return new AdminRealtimeAggregateResponse.Metadata(LocalDateTime.now(), pollingSeconds, metricType);
    }

    private String resolveSelectorStatus(Event event, LocalDateTime now) {
        if (event == null || event.getStatus() == null) return "upcoming";
        String rawStatus = event.getStatus().name();
        if ("CANCELLED".equals(rawStatus)) return "cancelled";
        if (event.getStartAt() != null && now.isBefore(event.getStartAt())) return "upcoming";
        if (event.getEndAt() != null && now.isAfter(event.getEndAt())) return "ended";
        if ("ENDED".equals(rawStatus)) return "ended";
        return "live";
    }

    private Integer mergeAverageWait(
            AdminRealtimeAggregateQueryRepository.EventWaitingSummaryRow booth,
            AdminRealtimeAggregateQueryRepository.EventWaitingSummaryRow program
    ) {
        List<Double> values = new ArrayList<>();
        if (booth != null && booth.avgWaitMin() != null) values.add(booth.avgWaitMin());
        if (program != null && program.avgWaitMin() != null) values.add(program.avgWaitMin());
        if (values.isEmpty()) return 0;
        double average = values.stream().mapToDouble(Double::doubleValue).average().orElse(0.0);
        return Math.max(0, (int) Math.round(average));
    }

    private int clampPercent(Integer value) {
        int numeric = value == null ? 0 : value;
        if (numeric < 0) return 0;
        if (numeric > 100) return 100;
        return numeric;
    }

    private Integer resolveEventCongestionPercent(
            String rawStatus,
            Integer measuredPercent,
            Integer predictedPercent
    ) {
        String normalizedStatus = rawStatus == null ? "" : rawStatus.toUpperCase(Locale.ROOT);
        boolean planned =
                "PLANNED".equals(normalizedStatus)
                        || "PENDING".equals(normalizedStatus)
                        || "UPCOMING".equals(normalizedStatus);

        int measured = clampPercent(measuredPercent);
        int predicted = clampPercent(predictedPercent);

        if (planned) {
            return predicted;
        }
        if (measured > 0) {
            return measured;
        }
        if (predicted > 0) {
            return predicted;
        }
        return 0;
    }

    private Integer computeRate(long numerator, long denominator) {
        if (denominator <= 0) return 0;
        double raw = (numerator * 100.0) / denominator;
        if (raw < 0.0) return 0;
        if (raw > 100.0) return 100;
        return (int) Math.round(raw);
    }

    private long safeLong(Long value) {
        return value == null ? 0L : value;
    }

    private int toInt(Byte value) {
        return value == null ? 0 : value.intValue();
    }

    private Double roundOneDecimal(double value) {
        return Math.round(value * 10.0) / 10.0;
    }

    private Integer levelToPercent(Integer level) {
        if (level == null) return null;
        int value = level * 20;
        return clampPercent(value);
    }

    private Integer percentToLevel(Integer percent) {
        if (percent == null) return null;
        int normalized = clampPercent(percent);
        if (normalized <= 0) return null;
        int level = (int) Math.ceil(normalized / 20.0d);
        if (level < 1) return 1;
        if (level > 5) return 5;
        return level;
    }

    private Integer normalizePredictionScore(BigDecimal score) {
        if (score == null) return null;
        return normalizePredictionScore(score.doubleValue());
    }

    private Integer normalizePredictionScore(Double score) {
        if (score == null) return null;
        return normalizePredictionScore(score.doubleValue());
    }

    private Integer normalizePredictionScore(double raw) {
        return clampPercent((int) Math.round(normalizePredictionScorePercent(raw)));
    }

    private double normalizePredictionScorePercent(double raw) {
        if (Double.isNaN(raw) || Double.isInfinite(raw)) {
            return 0.0d;
        }
        if (raw <= 5.0) {
            return Math.max(0.0d, Math.min(100.0d, raw * 20.0d));
        }
        return Math.max(0.0d, Math.min(100.0d, raw));
    }

    private Integer normalizeProgramWaitMinutes(
            Integer waitCount,
            Integer waitMin,
            BigDecimal throughputPerMin,
            Long boothId,
            ProgramWaitEstimationContext context
    ) {
        int queue = Math.max(0, waitCount == null ? 0 : waitCount);
        int rawWait = Math.max(0, waitMin == null ? 0 : waitMin);
        if (queue <= 0) {
            return 0;
        }

        if (rawWait > 0) {
            return Math.min(rawWait, MAX_WAIT_MINUTES);
        }

        double throughput = resolveProgramThroughputPerMinute(throughputPerMin);
        if (throughput > 0.0d) {
            int estimatedByThroughput = (int) Math.ceil(queue / throughput);
            return Math.min(Math.max(estimatedByThroughput, 0), MAX_WAIT_MINUTES);
        }

        int concurrentCapacity = resolveProgramConcurrentCapacity(boothId, context);
        double avgStayMinutes = resolveProgramAverageStayMinutes(boothId, context);
        int estimatedWait = (int) Math.ceil((queue * avgStayMinutes) / Math.max(concurrentCapacity, 1));
        return Math.min(Math.max(estimatedWait, 0), MAX_WAIT_MINUTES);
    }

    private double resolveProgramThroughputPerMinute(BigDecimal throughputPerMin) {
        if (throughputPerMin == null) {
            return 0.0d;
        }
        double value = throughputPerMin.doubleValue();
        if (Double.isNaN(value) || Double.isInfinite(value) || value <= 0.0d) {
            return 0.0d;
        }
        return value;
    }

    private ProgramWaitEstimationContext buildProgramWaitEstimationContext(List<Program> programs, LocalDateTime baseTime) {
        if (programs == null || programs.isEmpty() || baseTime == null) {
            return ProgramWaitEstimationContext.EMPTY;
        }

        List<Long> boothIds = programs.stream()
                .map(Program::getBoothId)
                .filter(Objects::nonNull)
                .distinct()
                .toList();
        if (boothIds.isEmpty()) {
            return ProgramWaitEstimationContext.EMPTY;
        }

        Set<Long> boothIdSet = new HashSet<>(boothIds);
        Map<Long, Integer> concurrentCapacityByBooth = realtimeWaitSyncQueryRepository.findActiveBooths(baseTime).stream()
                .filter(row -> row.boothId() != null && boothIdSet.contains(row.boothId()))
                .collect(Collectors.toMap(
                        RealtimeWaitSyncQueryRepository.ActiveBoothRow::boothId,
                        row -> Math.max(1, row.concurrency() == null ? 1 : row.concurrency()),
                        Integer::max
                ));

        LocalDateTime stayWindowFrom = baseTime.minusHours(DEFAULT_WAIT_STAY_LOOKBACK_HOURS);
        Map<Long, Double> avgStayMinutesByBooth = realtimeWaitSyncQueryRepository.findRecentBoothAverageStays(
                        boothIds,
                        stayWindowFrom,
                        baseTime,
                        DEFAULT_WAIT_STAY_SAMPLE_SIZE
                ).stream()
                .filter(row -> row.boothId() != null)
                .collect(Collectors.toMap(
                        RealtimeWaitSyncQueryRepository.BoothAverageStayRow::boothId,
                        row -> normalizeStayMinutes(row.avgStayMinutes() == null
                                ? DEFAULT_PROGRAM_STAY_MINUTES
                                : row.avgStayMinutes().doubleValue()),
                        Double::max
                ));

        return new ProgramWaitEstimationContext(concurrentCapacityByBooth, avgStayMinutesByBooth);
    }

    private int resolveProgramConcurrentCapacity(Long boothId, ProgramWaitEstimationContext context) {
        if (boothId == null || context == null || context.concurrentCapacityByBooth() == null) {
            return 1;
        }
        return Math.max(1, context.concurrentCapacityByBooth().getOrDefault(boothId, 1));
    }

    private double resolveProgramAverageStayMinutes(Long boothId, ProgramWaitEstimationContext context) {
        if (boothId == null || context == null || context.avgStayMinutesByBooth() == null) {
            return DEFAULT_PROGRAM_STAY_MINUTES;
        }
        return normalizeStayMinutes(
                context.avgStayMinutesByBooth().getOrDefault(boothId, DEFAULT_PROGRAM_STAY_MINUTES)
        );
    }

    private double normalizeStayMinutes(double stayMinutes) {
        if (Double.isNaN(stayMinutes) || Double.isInfinite(stayMinutes) || stayMinutes <= 0.0d) {
            return DEFAULT_PROGRAM_STAY_MINUTES;
        }
        return Math.max(MIN_STAY_MINUTES, Math.min(stayMinutes, MAX_STAY_MINUTES));
    }

    private record ProgramWaitEstimationContext(
            Map<Long, Integer> concurrentCapacityByBooth,
            Map<Long, Double> avgStayMinutesByBooth
    ) {
        private static final ProgramWaitEstimationContext EMPTY = new ProgramWaitEstimationContext(Map.of(), Map.of());
    }

    private Map<Long, Integer> buildRealtimeEventPredictionPercentMap(List<Event> events, LocalDateTime now) {
        if (events == null || events.isEmpty()) {
            return Map.of();
        }
        Map<Long, Integer> predictionMap = new HashMap<>();
        for (Event event : events) {
            AiCongestionPredictionResponse prediction = fetchRealtimeEventPrediction(event, now);
            if (prediction == null || event == null || event.getEventId() == null) {
                continue;
            }
            Integer predictedPercent = normalizePredictionScore(prediction.predictedAvgScore());
            if (predictedPercent != null) {
                predictionMap.put(event.getEventId(), predictedPercent);
            }
        }
        return predictionMap;
    }

    private AiCongestionPredictionResponse fetchRealtimeEventPrediction(Event event, LocalDateTime now) {
        if (event == null || event.getEventId() == null || event.getStatus() == null) {
            return null;
        }
        String selectorStatus = resolveSelectorStatus(event, now);
        if (!"live".equals(selectorStatus) && !"upcoming".equals(selectorStatus)) {
            return null;
        }

        LocalDateTime from = "live".equals(selectorStatus)
                ? maxDateTime(now, event.getStartAt())
                : event.getStartAt();
        LocalDateTime to = event.getEndAt();
        if (from == null || to == null) {
            return null;
        }
        if (from.isAfter(to)) {
            from = to;
        }

        try {
            return aiCongestionService.predictEventForRealtime(event.getEventId(), from, to);
        } catch (RuntimeException ignored) {
            return null;
        }
    }

    private AdminRealtimeAggregateResponse.CongestionPrediction toCongestionPrediction(
            AiCongestionPredictionResponse response,
            Integer predictedPercent,
            Integer predictedPeakPercent,
            Integer predictedLevel
    ) {
        if (response == null) {
            return null;
        }
        Double avgScore = Optional.of(normalizePredictionScorePercent(response.predictedAvgScore()))
                .orElse(predictedPercent == null ? null : predictedPercent.doubleValue());
        Double peakScore = Optional.of(normalizePredictionScorePercent(response.predictedPeakScore()))
                .orElse(predictedPeakPercent == null ? avgScore : predictedPeakPercent.doubleValue());
        if (avgScore == null || peakScore == null) {
            return null;
        }
        List<AdminRealtimeAggregateResponse.CongestionTimelinePoint> timeline = mapAiTimelinePoints(response.timeline());
        return new AdminRealtimeAggregateResponse.CongestionPrediction(
                avgScore,
                peakScore,
                predictedLevel,
                Math.max(0, response.predictedWaitMinutes()),
                response.confidence(),
                response.fallbackUsed(),
                timeline
        );
    }

    private List<AdminRealtimeAggregateResponse.CongestionTimelinePoint> mapAiTimelinePoints(
            List<AiTimelinePoint> timeline
    ) {
        if (timeline == null || timeline.isEmpty()) {
            return List.of();
        }
        LinkedHashMap<LocalDateTime, AdminRealtimeAggregateResponse.CongestionTimelinePoint> deduped =
                new LinkedHashMap<>();
        timeline.stream()
                .filter(point -> point != null && point.time() != null)
                .sorted(Comparator.comparing(AiTimelinePoint::time))
                .forEach(point -> deduped.put(
                        point.time(),
                        new AdminRealtimeAggregateResponse.CongestionTimelinePoint(
                                point.time(),
                                normalizePredictionScorePercent(point.score()),
                                point.level() > 0 ? point.level() : percentToLevel(normalizePredictionScore(point.score()))
                        )
                ));
        return new ArrayList<>(deduped.values());
    }

    private LocalDateTime resolvePeakExpectedTime(
            List<AdminRealtimeAggregateResponse.CongestionTimelinePoint> timeline,
            LocalDateTime fallback
    ) {
        if (timeline == null || timeline.isEmpty()) {
            return fallback;
        }
        return timeline.stream()
                .filter(point -> point != null && point.time() != null && point.score() != null)
                .max(Comparator
                        .comparing(AdminRealtimeAggregateResponse.CongestionTimelinePoint::score)
                        .thenComparing(AdminRealtimeAggregateResponse.CongestionTimelinePoint::time))
                .map(AdminRealtimeAggregateResponse.CongestionTimelinePoint::time)
                .orElse(fallback);
    }

    private Double toDouble(BigDecimal score) {
        return score == null ? null : score.doubleValue();
    }

    private Map<Long, Integer> findLatestTimeseriesPredictionByEvent(Collection<Long> eventIds, LocalDateTime baseTime) {
        if (eventIds == null || eventIds.isEmpty()) {
            return Map.of();
        }
        List<Long> normalizedEventIds = eventIds.stream()
                .filter(Objects::nonNull)
                .distinct()
                .toList();
        if (normalizedEventIds.isEmpty()) {
            return Map.of();
        }
        return aiEventCongestionTimeseriesRepository.findLatestByEventIdsBeforeOrAt(normalizedEventIds, baseTime).stream()
                .filter(row -> row.getEventId() != null)
                .collect(Collectors.toMap(
                        AiEventCongestionTimeseries::getEventId,
                        row -> normalizePredictionScore(row.getCongestionScore()),
                        (left, right) -> left
                ));
    }

    private List<AdminRealtimeAggregateResponse.CongestionTimelinePoint> buildPredictionTimeline(
            Long eventId,
            LocalDateTime baseTime,
            Integer predictedPercent,
            Integer predictedPeakPercent,
            Integer predictedLevel,
            LocalDateTime eventStartAt,
            LocalDateTime timelineLimitAt
    ) {
        if (predictedPercent == null) {
            return List.of();
        }

        int baseScore = clampPercent(predictedPercent);
        int peakScore = clampPercent(predictedPeakPercent == null ? predictedPercent : predictedPeakPercent);
        if (eventStartAt == null || timelineLimitAt == null || timelineLimitAt.isBefore(eventStartAt)) {
            return buildRollingPredictionTimeline(baseTime, baseScore, peakScore, predictedLevel);
        }

        LocalDate startDate = eventStartAt.toLocalDate();
        LocalDate endDate = timelineLimitAt.toLocalDate();
        long daySpan = Duration.between(
                startDate.atStartOfDay(),
                endDate.plusDays(1).atStartOfDay()
        ).toDays();
        int dayCount = (int) Math.max(1, Math.min(daySpan, PREDICTION_TIMELINE_MAX_DAYS));
        Map<LocalDate, Integer> historicalDailyScores = findHistoricalDailyScores(eventId, eventStartAt, timelineLimitAt);
        Map<Integer, Double> weekdayAverageScores = historicalDailyScores.entrySet().stream()
                .collect(Collectors.groupingBy(
                        entry -> entry.getKey().getDayOfWeek().getValue(),
                        Collectors.averagingDouble(entry -> entry.getValue() == null ? baseScore : entry.getValue())
                ));
        double peakRatio = baseScore <= 0
                ? 1.0d
                : Math.max(1.0d, peakScore / (double) Math.max(1, baseScore));

        List<AdminRealtimeAggregateResponse.CongestionTimelinePoint> points = new ArrayList<>();
        for (int dayOffset = 0; dayOffset < dayCount; dayOffset += 1) {
            LocalDate targetDate = startDate.plusDays(dayOffset);
            int dailyBaseScore = resolveDailyBaseScore(
                    targetDate,
                    dayOffset,
                    dayCount,
                    baseScore,
                    historicalDailyScores,
                    weekdayAverageScores
            );
            int dailyPeakScore = clampPercent((int) Math.round(dailyBaseScore * peakRatio));
            if (dailyPeakScore < dailyBaseScore) {
                dailyPeakScore = dailyBaseScore;
            }

            LocalDateTime dayStart = targetDate.atTime(eventStartAt.getHour(), 0);
            LocalDateTime dayEnd = targetDate.atTime(timelineLimitAt.getHour(), 59);
            if (dayEnd.isBefore(dayStart)) {
                dayEnd = dayEnd.plusDays(1);
            }

            LocalDateTime windowStart = maxDateTime(dayStart, eventStartAt);
            LocalDateTime windowEnd = minDateTime(dayEnd, timelineLimitAt);
            if (windowEnd == null || windowStart == null || windowEnd.isBefore(windowStart)) {
                continue;
            }

            long windowMinutes = Math.max(1L, Duration.between(windowStart, windowEnd).toMinutes());
            int pointCount = Math.max(1, (int) Math.ceil(windowMinutes / (double) PREDICTION_TIMELINE_STEP_MINUTES));
            for (int index = 0; index < pointCount; index += 1) {
                double progress = pointCount == 1 ? 0.5d : (index + 1) / (double) pointCount;
                int score = scoreFromProgress(dailyBaseScore, dailyPeakScore, progress);
                Integer level = Optional.ofNullable(percentToLevel(score)).orElse(predictedLevel);
                LocalDateTime predictedAt = windowStart.plusMinutes((long) (index + 1) * PREDICTION_TIMELINE_STEP_MINUTES);
                if (predictedAt.isAfter(windowEnd)) {
                    predictedAt = windowEnd;
                }
                points.add(new AdminRealtimeAggregateResponse.CongestionTimelinePoint(
                        predictedAt,
                        (double) score,
                        level
                ));
            }
        }

        if (points.isEmpty()) {
            return buildRollingPredictionTimeline(baseTime, baseScore, peakScore, predictedLevel);
        }

        LinkedHashMap<LocalDateTime, AdminRealtimeAggregateResponse.CongestionTimelinePoint> deduped = new LinkedHashMap<>();
        points.stream()
                .sorted(Comparator.comparing(AdminRealtimeAggregateResponse.CongestionTimelinePoint::time))
                .forEach(point -> deduped.put(point.time(), point));
        return new ArrayList<>(deduped.values());
    }

    private List<AdminRealtimeAggregateResponse.CongestionTimelinePoint> buildRollingPredictionTimeline(
            LocalDateTime baseTime,
            int baseScore,
            int peakScore,
            Integer predictedLevel
    ) {
        LocalDateTime timelineBase = baseTime == null ? LocalDateTime.now() : baseTime;
        int pointCount = Math.max(1, (int) Math.ceil(PREDICTION_TIMELINE_HORIZON_MINUTES / (double) PREDICTION_TIMELINE_STEP_MINUTES));
        List<AdminRealtimeAggregateResponse.CongestionTimelinePoint> points = new ArrayList<>(pointCount);
        for (int i = 0; i < pointCount; i += 1) {
            double progress = pointCount == 1 ? 0.5d : (i + 1) / (double) pointCount;
            int score = scoreFromProgress(baseScore, peakScore, progress);
            Integer level = Optional.ofNullable(percentToLevel(score)).orElse(predictedLevel);
            points.add(new AdminRealtimeAggregateResponse.CongestionTimelinePoint(
                    timelineBase.plusMinutes((long) (i + 1) * PREDICTION_TIMELINE_STEP_MINUTES),
                    (double) score,
                    level
            ));
        }
        return points;
    }

    private Map<LocalDate, Integer> findHistoricalDailyScores(
            Long eventId,
            LocalDateTime eventStartAt,
            LocalDateTime eventEndAt
    ) {
        if (eventId == null || eventStartAt == null || eventEndAt == null) {
            return Map.of();
        }
        LocalDateTime queryStart = eventStartAt.toLocalDate().atStartOfDay();
        LocalDateTime queryEnd = minDateTime(LocalDateTime.now(), eventEndAt);
        if (queryEnd == null || queryEnd.isBefore(queryStart)) {
            return Map.of();
        }

        Map<LocalDate, DoubleSummaryStatistics> statsByDate = new LinkedHashMap<>();
        aiEventCongestionTimeseriesRepository.findByEventIdAndTimestampMinuteBetweenOrderByTimestampMinuteAsc(
                        eventId,
                        queryStart,
                        queryEnd
                ).forEach(row -> {
                    if (row == null || row.getTimestampMinute() == null) {
                        return;
                    }
                    Integer normalized = normalizePredictionScore(row.getCongestionScore());
                    if (normalized == null) {
                        return;
                    }
                    LocalDate date = row.getTimestampMinute().toLocalDate();
                    statsByDate.computeIfAbsent(date, ignored -> new DoubleSummaryStatistics())
                            .accept(normalized);
                });

        if (statsByDate.isEmpty()) {
            return Map.of();
        }

        Map<LocalDate, Integer> result = new LinkedHashMap<>();
        statsByDate.forEach((date, stats) -> {
            if (stats != null && stats.getCount() > 0) {
                result.put(date, clampPercent((int) Math.round(stats.getAverage())));
            }
        });
        return result;
    }

    private int resolveDailyBaseScore(
            LocalDate targetDate,
            int dayOffset,
            int totalDays,
            int baseScore,
            Map<LocalDate, Integer> historicalDailyScores,
            Map<Integer, Double> weekdayAverageScores
    ) {
        Integer historical = historicalDailyScores.get(targetDate);
        if (historical != null) {
            return clampPercent(historical);
        }

        double weekdayFactor = resolveWeekdayFactor(targetDate == null ? null : targetDate.getDayOfWeek().getValue(), weekdayAverageScores, baseScore);
        double progressFactor = resolveEventProgressFactor(dayOffset, totalDays);
        int estimated = clampPercent((int) Math.round(baseScore * weekdayFactor * progressFactor));
        if (estimated <= 0 && baseScore > 0) {
            return baseScore;
        }
        return estimated;
    }

    private double resolveWeekdayFactor(Integer dayOfWeek, Map<Integer, Double> weekdayAverageScores, int baseScore) {
        if (dayOfWeek != null && weekdayAverageScores != null && !weekdayAverageScores.isEmpty()) {
            Double weekdayAvg = weekdayAverageScores.get(dayOfWeek);
            if (weekdayAvg != null && weekdayAvg > 0.0d && baseScore > 0) {
                return Math.max(0.75d, Math.min(1.25d, weekdayAvg / Math.max(1.0d, baseScore)));
            }
        }

        if (dayOfWeek == null) {
            return 1.0d;
        }
        return switch (dayOfWeek) {
            case 6 -> 1.08d;
            case 7 -> 1.12d;
            case 1 -> 0.92d;
            default -> 1.0d;
        };
    }

    private double resolveEventProgressFactor(int dayOffset, int totalDays) {
        if (totalDays <= 1) {
            return 1.0d;
        }
        double progress = dayOffset / (double) (totalDays - 1);
        return 0.9d + (0.2d * Math.sin(progress * Math.PI));
    }

    private int scoreFromProgress(int baseScore, int peakScore, double progress) {
        double normalizedProgress = Math.max(0.0d, Math.min(1.0d, progress));
        int delta = Math.max(0, peakScore - baseScore);
        if (delta <= 0) {
            return baseScore;
        }
        int tailScore = clampPercent(baseScore + (int) Math.round(delta * 0.35d));
        if (normalizedProgress <= 0.45d) {
            double riseRatio = normalizedProgress / 0.45d;
            return clampPercent((int) Math.round(baseScore + (delta * riseRatio)));
        }
        double settleRatio = (normalizedProgress - 0.45d) / 0.55d;
        return clampPercent((int) Math.round(peakScore - ((peakScore - tailScore) * settleRatio)));
    }

    private boolean hasStarted(Program program, LocalDateTime now) {
        if (program.getStartAt() == null) return false;
        return !now.isBefore(program.getStartAt());
    }

    private boolean hasEnded(Program program, LocalDateTime now) {
        if (program.getEndAt() == null) return false;
        return now.isAfter(program.getEndAt());
    }

    private boolean isProgramOperatingNow(Program program, LocalDateTime now) {
        if (program.getStartAt() == null || program.getEndAt() == null) return false;
        return !now.isBefore(program.getStartAt()) && !now.isAfter(program.getEndAt());
    }

    private long computeHotspotCount(List<Integer> waitMinutes) {
        return waitMinutes.stream().filter(wait -> wait != null && wait >= 10).count();
    }

    private LocalDateTime maxDateTime(LocalDateTime left, LocalDateTime right) {
        if (left == null) return right;
        if (right == null) return left;
        return left.isAfter(right) ? left : right;
    }

    private LocalDateTime minDateTime(LocalDateTime left, LocalDateTime right) {
        if (left == null) return right;
        if (right == null) return left;
        return left.isBefore(right) ? left : right;
    }

    private int deriveCongestionPercentFromWait(Integer waitCount, Integer waitMin) {
        Integer score = computeCongestionScore(waitCount, waitMin);
        return score == null ? 0 : clampPercent(score);
    }

    private Integer computeCongestionScore(Integer waitCount, Integer waitMin) {
        if (waitCount == null || waitMin == null) return null;
        int minuteScore = Math.min(100, Math.max(0, waitMin * 4));
        int countScore = Math.min(100, Math.max(0, waitCount * 5));
        return (int) Math.round((minuteScore * 0.7) + (countScore * 0.3));
    }

    private String resolveWaitTone(Integer congestionScore) {
        if (congestionScore == null) return "idle";
        if (congestionScore <= 20) return "relaxed";
        if (congestionScore <= 45) return "normal";
        if (congestionScore <= 70) return "busy";
        return "critical";
    }

    private String resolveWaitLabel(String tone) {
        if ("relaxed".equals(tone)) return "여유";
        if ("normal".equals(tone)) return "보통";
        if ("busy".equals(tone)) return "혼잡";
        if ("critical".equals(tone)) return "매우 혼잡";
        return "집계 중";
    }

    private Comparator<AdminRealtimeAggregateResponse.BoothWaitSummary> waitingBoothComparator() {
        return (left, right) -> {
            int leftWaitMin = left.waitMin() == null ? -1 : left.waitMin();
            int rightWaitMin = right.waitMin() == null ? -1 : right.waitMin();
            if (leftWaitMin != rightWaitMin) return Integer.compare(rightWaitMin, leftWaitMin);

            int leftWaitCount = left.waitCount() == null ? -1 : left.waitCount();
            int rightWaitCount = right.waitCount() == null ? -1 : right.waitCount();
            if (leftWaitCount != rightWaitCount) return Integer.compare(rightWaitCount, leftWaitCount);

            return left.boothTitle().compareToIgnoreCase(right.boothTitle());
        };
    }

    private Comparator<AdminRealtimeAggregateResponse.ProgramWaitSummary> waitingProgramComparator() {
        return (left, right) -> {
            int leftWaitMin = left.waitMin() == null ? -1 : left.waitMin();
            int rightWaitMin = right.waitMin() == null ? -1 : right.waitMin();
            if (leftWaitMin != rightWaitMin) return Integer.compare(rightWaitMin, leftWaitMin);

            int leftWaitCount = left.waitCount() == null ? -1 : left.waitCount();
            int rightWaitCount = right.waitCount() == null ? -1 : right.waitCount();
            if (leftWaitCount != rightWaitCount) return Integer.compare(rightWaitCount, leftWaitCount);

            return left.programTitle().compareToIgnoreCase(right.programTitle());
        };
    }

    private List<AdminRealtimeAggregateResponse.HotspotSummary> buildHotspots(
            List<AdminRealtimeAggregateResponse.BoothWaitSummary> booths,
            List<AdminRealtimeAggregateResponse.ProgramWaitSummary> programs
    ) {
        List<AdminRealtimeAggregateResponse.HotspotSummary> hotspots = new ArrayList<>();

        booths.stream()
                .filter(row -> hasWaiting(row.waitCount(), row.waitMin()))
                .forEach(row -> hotspots.add(new AdminRealtimeAggregateResponse.HotspotSummary(
                        "BOOTH",
                        row.boothId(),
                        row.boothTitle(),
                        row.waitCount(),
                        row.waitMin(),
                        0
                )));

        programs.stream()
                .filter(row -> hasWaiting(row.waitCount(), row.waitMin()))
                .forEach(row -> hotspots.add(new AdminRealtimeAggregateResponse.HotspotSummary(
                        "PROGRAM",
                        row.programId(),
                        row.programTitle(),
                        row.waitCount(),
                        row.waitMin(),
                        0
                )));

        hotspots.sort((left, right) -> {
            int waitMinDiff = Integer.compare(
                    right.waitMin() == null ? 0 : right.waitMin(),
                    left.waitMin() == null ? 0 : left.waitMin()
            );
            if (waitMinDiff != 0) return waitMinDiff;
            return Integer.compare(
                    right.waitCount() == null ? 0 : right.waitCount(),
                    left.waitCount() == null ? 0 : left.waitCount()
            );
        });

        List<AdminRealtimeAggregateResponse.HotspotSummary> top = new ArrayList<>();
        int order = 1;
        for (AdminRealtimeAggregateResponse.HotspotSummary row : hotspots) {
            if (order > 5) break;
            top.add(new AdminRealtimeAggregateResponse.HotspotSummary(
                    row.type(),
                    row.targetId(),
                    row.targetName(),
                    row.waitCount(),
                    row.waitMin(),
                    order
            ));
            order += 1;
        }
        return top;
    }

    private boolean hasWaiting(Integer waitCount, Integer waitMin) {
        if (waitCount == null && waitMin == null) return false;
        int teams = waitCount == null ? 0 : waitCount;
        int minutes = waitMin == null ? 0 : waitMin;
        return teams > 0 || minutes > 0;
    }

    private String formatZoneName(BoothZone zone) {
        if (zone == null) return "미분류";
        return switch (zone) {
            case ZONE_A -> "A구역";
            case ZONE_B -> "B구역";
            case ZONE_C -> "C구역";
            default -> "기타";
        };
    }

    private String formatTimeRange(LocalDateTime startAt, LocalDateTime endAt) {
        if (startAt == null && endAt == null) return "운영 시간 정보 없음";
        if (startAt != null && endAt != null) {
            return startAt.format(TIME_FORMATTER) + " ~ " + endAt.format(TIME_FORMATTER);
        }
        if (startAt != null) return startAt.format(TIME_FORMATTER) + " 시작";
        return endAt.format(TIME_FORMATTER) + " 종료";
    }

    private boolean isCancelledOrRejected(ApplyStatus status) {
        return status == ApplyStatus.CANCELLED || status == ApplyStatus.REJECTED;
    }

    private String resolveMyProgramStatus(ProgramApply apply, Program program, LocalDateTime now) {
        if (program.getStartAt() != null && now.isBefore(program.getStartAt())) {
            return "NOT_STARTED";
        }
        if (apply.getCheckedInAt() != null || apply.getStatus() == ApplyStatus.CHECKED_IN) {
            return "CHECKED_IN";
        }
        if (isCancelledOrRejected(apply.getStatus())) {
            return "CANCELED";
        }
        return "WAITING";
    }

    private long activeApplyCount(Map<String, Long> statusCounts) {
        long applied = safeLong(statusCounts.getOrDefault("APPLIED", 0L));
        long waiting = safeLong(statusCounts.getOrDefault("WAITING", 0L));
        long approved = safeLong(statusCounts.getOrDefault("APPROVED", 0L));
        long checkedIn = safeLong(statusCounts.getOrDefault("CHECKED_IN", 0L));
        return applied + waiting + approved + checkedIn;
    }

    private Map<Long, String> resolveUserNicknameMap(List<ProgramApply> candidates) {
        List<Long> userIds = candidates.stream()
                .map(ProgramApply::getUserId)
                .filter(Objects::nonNull)
                .distinct()
                .toList();
        if (userIds.isEmpty()) return Map.of();

        List<User> users = userRepository.findAllById(userIds);
        return users.stream()
                .collect(Collectors.toMap(User::getUserId, User::getNickname, (left, right) -> left));
    }

    private Map<Long, String> resolvePetNameMap(List<ProgramApply> candidates) {
        List<Long> petIds = candidates.stream()
                .map(ProgramApply::getPetId)
                .filter(Objects::nonNull)
                .distinct()
                .toList();
        if (petIds.isEmpty()) return Map.of();

        List<Pet> pets = petRepository.findAllByPetIdIn(petIds);
        return pets.stream()
                .collect(Collectors.toMap(Pet::getPetId, Pet::getPetName, (left, right) -> left));
    }

    private String buildCandidateDisplayName(ProgramApply apply, Map<Long, String> petNameMap) {
        if (apply == null) {
            return "참가자";
        }

        if (apply.getAdminPetName() != null && !apply.getAdminPetName().isBlank()) {
            return apply.getAdminPetName().trim();
        }

        if (apply.getPetId() != null) {
            String petName = petNameMap.get(apply.getPetId());
            if (petName != null && !petName.isBlank()) {
                return petName;
            }
        }

        if (apply.getTicketNo() != null && !apply.getTicketNo().isBlank()) {
            return "참가자 " + apply.getTicketNo().trim();
        }

        return "참가자 #" + apply.getProgramApplyId();
    }

    private String buildOwnerNickname(ProgramApply apply, Map<Long, String> userNicknameMap) {
        if (apply == null || apply.getUserId() == null) {
            return "보호자 정보 없음";
        }
        String nickname = userNicknameMap.get(apply.getUserId());
        if (nickname != null && !nickname.isBlank()) {
            return nickname;
        }
        return "보호자 #" + apply.getUserId();
    }

    private String resolveContestStatus(Program program, LocalDateTime now) {
        if (program.getStartAt() != null && now.isBefore(program.getStartAt())) {
            return "예정";
        }
        if (program.getEndAt() != null && now.isAfter(program.getEndAt())) {
            return "종료";
        }
        return "진행 중";
    }

    private record VoteCandidateRaw(
            Long applyId,
            String name,
            String ownerNickname,
            String imageUrl,
            long votes,
            String status
    ) {
    }

    private String nullToEmpty(String value) {
        return value == null ? "" : value;
    }
}
