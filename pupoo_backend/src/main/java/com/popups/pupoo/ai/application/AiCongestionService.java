package com.popups.pupoo.ai.application;

import com.popups.pupoo.ai.client.AiInferenceClient;
import com.popups.pupoo.ai.domain.enums.AiPredictionSourceType;
import com.popups.pupoo.ai.domain.enums.AiPredictionTargetType;
import com.popups.pupoo.ai.domain.model.AiEventCongestionTimeseries;
import com.popups.pupoo.ai.domain.model.AiProgramCongestionTimeseries;
import com.popups.pupoo.ai.domain.model.EventCongestionPolicy;
import com.popups.pupoo.ai.domain.model.AiPredictionLog;
import com.popups.pupoo.ai.dto.AiCongestionPredictionResponse;
import com.popups.pupoo.ai.dto.AiEventPredictionRequest;
import com.popups.pupoo.ai.dto.AiProgramPredictionRequest;
import com.popups.pupoo.ai.dto.AiProgramRecommendationItemResponse;
import com.popups.pupoo.ai.dto.AiProgramRecommendationRequest;
import com.popups.pupoo.ai.dto.AiProgramRecommendationResponse;
import com.popups.pupoo.ai.dto.AiRecommendationProgramInput;
import com.popups.pupoo.ai.dto.AiTimelinePoint;
import com.popups.pupoo.ai.persistence.AiEventCongestionBaselineQueryRepository;
import com.popups.pupoo.ai.persistence.AiEventCongestionTimeseriesRepository;
import com.popups.pupoo.ai.persistence.AiPredictionLogRepository;
import com.popups.pupoo.ai.persistence.AiProgramCongestionTimeseriesRepository;
import com.popups.pupoo.ai.persistence.EventCongestionSignalQueryRepository;
import com.popups.pupoo.ai.persistence.EventCongestionPolicyRepository;
import com.popups.pupoo.booth.domain.model.Booth;
import com.popups.pupoo.booth.domain.model.BoothWait;
import com.popups.pupoo.booth.persistence.BoothRepository;
import com.popups.pupoo.booth.persistence.BoothWaitRepository;
import com.popups.pupoo.common.exception.BusinessException;
import com.popups.pupoo.common.exception.ErrorCode;
import com.popups.pupoo.common.observability.application.OperationsMetricsService;
import com.popups.pupoo.event.domain.enums.EventStatus;
import com.popups.pupoo.event.domain.enums.RegistrationStatus;
import com.popups.pupoo.event.domain.model.Event;
import com.popups.pupoo.event.persistence.EventRegistrationRepository;
import com.popups.pupoo.event.persistence.EventRepository;
import com.popups.pupoo.program.apply.domain.enums.ApplyStatus;
import com.popups.pupoo.program.apply.persistence.ProgramApplyRepository;
import com.popups.pupoo.program.domain.model.ExperienceWait;
import com.popups.pupoo.program.domain.model.Program;
import com.popups.pupoo.program.persistence.ExperienceWaitRepository;
import com.popups.pupoo.program.persistence.ProgramRepository;
import com.popups.pupoo.qr.persistence.QrCheckinRepository;
import com.popups.pupoo.qr.domain.enums.QrCheckType;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.EnumSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.TreeMap;

@Service
public class AiCongestionService {

    private static final Logger log = LoggerFactory.getLogger(AiCongestionService.class);
    private static final double RECOMMEND_THRESHOLD = 75.0;
    private static final String MODEL_VERSION_AI = "mock-v1";
    private static final String MODEL_VERSION_FALLBACK = "rule-v1";
    private static final int DEFAULT_WAIT_BASELINE = 50;
    private static final int DEFAULT_TARGET_WAIT_MIN = 15;
    private static final int MODEL_SEQUENCE_LENGTH = 60;
    private static final double DEFAULT_SEQUENCE_FALLBACK_SCORE = 10.0;
    private static final int PLANNED_REFERENCE_MIN_SAMPLE_SIZE = MODEL_SEQUENCE_LENGTH * 6;
    private static final int PLANNED_REFERENCE_MAX_SAMPLE_SIZE = MODEL_SEQUENCE_LENGTH * 30;
    private static final Set<ApplyStatus> PROGRAM_ACTIVE_STATUSES = EnumSet.of(
            ApplyStatus.APPLIED,
            ApplyStatus.WAITING,
            ApplyStatus.APPROVED
    );

    private final EventRepository eventRepository;
    private final ProgramRepository programRepository;
    private final EventRegistrationRepository eventRegistrationRepository;
    private final QrCheckinRepository qrCheckinRepository;
    private final ProgramApplyRepository programApplyRepository;
    private final ExperienceWaitRepository experienceWaitRepository;
    private final BoothRepository boothRepository;
    private final BoothWaitRepository boothWaitRepository;
    private final EventCongestionPolicyRepository eventCongestionPolicyRepository;
    private final AiEventCongestionBaselineQueryRepository aiEventCongestionBaselineQueryRepository;
    private final AiEventCongestionTimeseriesRepository aiEventCongestionTimeseriesRepository;
    private final AiProgramCongestionTimeseriesRepository aiProgramCongestionTimeseriesRepository;
    private final EventCongestionSignalQueryRepository eventCongestionSignalQueryRepository;
    private final AiInferenceClient aiInferenceClient;
    private final AiPredictionLogRepository aiPredictionLogRepository;
    private final OperationsMetricsService operationsMetricsService;

    public AiCongestionService(
            EventRepository eventRepository,
            ProgramRepository programRepository,
            EventRegistrationRepository eventRegistrationRepository,
            QrCheckinRepository qrCheckinRepository,
            ProgramApplyRepository programApplyRepository,
            ExperienceWaitRepository experienceWaitRepository,
            BoothRepository boothRepository,
            BoothWaitRepository boothWaitRepository,
            EventCongestionPolicyRepository eventCongestionPolicyRepository,
            AiEventCongestionBaselineQueryRepository aiEventCongestionBaselineQueryRepository,
            AiEventCongestionTimeseriesRepository aiEventCongestionTimeseriesRepository,
            AiProgramCongestionTimeseriesRepository aiProgramCongestionTimeseriesRepository,
            EventCongestionSignalQueryRepository eventCongestionSignalQueryRepository,
            AiInferenceClient aiInferenceClient,
            AiPredictionLogRepository aiPredictionLogRepository,
            OperationsMetricsService operationsMetricsService
    ) {
        this.eventRepository = eventRepository;
        this.programRepository = programRepository;
        this.eventRegistrationRepository = eventRegistrationRepository;
        this.qrCheckinRepository = qrCheckinRepository;
        this.programApplyRepository = programApplyRepository;
        this.experienceWaitRepository = experienceWaitRepository;
        this.boothRepository = boothRepository;
        this.boothWaitRepository = boothWaitRepository;
        this.eventCongestionPolicyRepository = eventCongestionPolicyRepository;
        this.aiEventCongestionBaselineQueryRepository = aiEventCongestionBaselineQueryRepository;
        this.aiEventCongestionTimeseriesRepository = aiEventCongestionTimeseriesRepository;
        this.aiProgramCongestionTimeseriesRepository = aiProgramCongestionTimeseriesRepository;
        this.eventCongestionSignalQueryRepository = eventCongestionSignalQueryRepository;
        this.aiInferenceClient = aiInferenceClient;
        this.aiPredictionLogRepository = aiPredictionLogRepository;
        this.operationsMetricsService = operationsMetricsService;
    }

    public AiCongestionPredictionResponse predictEvent(Long eventId) {
        return predictEvent(eventId, null, null);
    }

    public AiCongestionPredictionResponse predictEvent(Long eventId, LocalDateTime from, LocalDateTime to) {
        return predictEventInternal(eventId, from, to, true);
    }

    public AiCongestionPredictionResponse predictEventForRealtime(Long eventId, LocalDateTime from, LocalDateTime to) {
        return predictEventInternal(eventId, from, to, false);
    }

    private AiCongestionPredictionResponse predictEventInternal(
            Long eventId,
            LocalDateTime from,
            LocalDateTime to,
            boolean persistLog
    ) {
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new BusinessException(ErrorCode.EVENT_NOT_FOUND));
        LocalDateTime baseTime = LocalDateTime.now();
        List<Program> programs = programRepository.findByEventId(eventId, Pageable.unpaged()).getContent();
        EventCongestionPolicy policy = findEventPolicy(eventId);
        TimeWindow predictionWindow = resolveEventPredictionWindow(event, from, to);
        HistoricalBaseline historicalBaseline = collectHistoricalEventBaseline(baseTime);
        EventRegistrationSnapshot registrationSnapshot = collectEventRegistrationSnapshot(eventId);

        int entryCount = countEventFlowCount(eventId, QrCheckType.CHECKIN, baseTime);
        int checkoutCount = countEventFlowCount(eventId, QrCheckType.CHECKOUT, baseTime);
        int activeApplyCount = registrationSnapshot.preRegisteredCount();
        int preRegisteredCount = registrationSnapshot.preRegisteredCount();
        int approvedRegistrationCount = registrationSnapshot.approvedCount();
        int totalCheckinCount = countEventTotalFlowCount(eventId, QrCheckType.CHECKIN);
        int totalCheckoutCount = countEventTotalFlowCount(eventId, QrCheckType.CHECKOUT);
        int participantCount = countDistinctEventParticipants(eventId);
        int currentInsideCount = Math.max(totalCheckinCount - totalCheckoutCount, 0);
        int runningProgramCount = (int) programs.stream().filter(this::isRunningNow).count();
        int totalProgramCount = programs.size();
        WaitAggregate waitAggregate = collectEventWaitMetrics(eventId, programs);
        int capacityBaseline = resolveEventCapacityBaseline(policy, activeApplyCount);
        int waitBaseline = resolvePositive(policy == null ? null : policy.getWaitBaseline(), DEFAULT_WAIT_BASELINE);
        int targetWaitMin = resolvePositive(policy == null ? null : policy.getTargetWaitMin(), DEFAULT_TARGET_WAIT_MIN);
        double registrationForecastScore = estimatePlannedRegistrationScore(
                activeApplyCount,
                event.getStartAt(),
                event.getEndAt()
        );
        double eventBaseScore = estimateEventBaseScore(
                entryCount,
                checkoutCount,
                activeApplyCount,
                preRegisteredCount,
                participantCount,
                currentInsideCount,
                runningProgramCount,
                totalProgramCount,
                waitAggregate.totalWaitCount(),
                waitAggregate.averageWaitMinutes(),
                capacityBaseline,
                waitBaseline,
                targetWaitMin,
                registrationForecastScore,
                historicalBaseline.endedScore(),
                historicalBaseline.ongoingScore()
        );
        List<Double> eventInputSequence = buildEventInputSequence(
                event,
                baseTime,
                eventBaseScore
        );
        EventCongestionSignalQueryRepository.EventSignalSnapshot signalSnapshot =
                eventCongestionSignalQueryRepository.collectEventSignalSnapshot(eventId, baseTime);

        AiEventPredictionRequest request = new AiEventPredictionRequest(
                event.getEventId(),
                baseTime,
                predictionWindow.startAt(),
                predictionWindow.endAt(),
                entryCount,
                checkoutCount,
                activeApplyCount,
                preRegisteredCount,
                approvedRegistrationCount,
                participantCount,
                currentInsideCount,
                runningProgramCount,
                totalProgramCount,
                waitAggregate.totalWaitCount(),
                waitAggregate.averageWaitMinutes(),
                capacityBaseline,
                waitBaseline,
                targetWaitMin,
                registrationForecastScore,
                historicalBaseline.endedScore(),
                historicalBaseline.ongoingScore(),
                resolveLocationDemandScore(event.getLocation()),
                event.getLocation(),
                signalSnapshot.applicationTrendScore(),
                signalSnapshot.applyConversionScore(),
                signalSnapshot.queueOperationScore(),
                signalSnapshot.zoneDensityScore(),
                signalSnapshot.stayTimeScore(),
                signalSnapshot.manualCongestionScore(),
                signalSnapshot.revisitScore(),
                signalSnapshot.voteHeatScore(),
                signalSnapshot.paymentIntentScore(),
                eventInputSequence
        );

        AiCongestionPredictionResponse response = aiInferenceClient.predictEvent(request)
                .orElseGet(() -> fallbackEventPrediction(event, baseTime, request));
        response = enforceScoreWaitConsistency(response);
        response = applyMeasuredHistoryBeforeBaseTime(response, event.getEventId(), baseTime);
        operationsMetricsService.recordAiPrediction(response.targetType(), response.fallbackUsed());
        if (persistLog) {
            savePredictionLog(response);
        }
        return response;
    }

    public AiCongestionPredictionResponse predictProgram(Long programId) {
        return predictProgramInternal(programId, true);
    }

    private AiCongestionPredictionResponse predictProgramInternal(Long programId, boolean persistLog) {
        Program program = programRepository.findById(programId)
                .orElseThrow(() -> new BusinessException(ErrorCode.PROGRAM_NOT_FOUND));
        LocalDateTime baseTime = LocalDateTime.now();
        EventCongestionPolicy policy = findEventPolicy(program.getEventId());
        WaitAggregate waitAggregate = collectProgramWaitMetrics(programId);
        int activeApplyCount = countProgramActiveApplies(programId);
        int checkinCount = countProgramCheckins(programId, baseTime);
        int programCapacity = resolvePositive(
                program.getCapacity(),
                Math.max(activeApplyCount + waitAggregate.totalWaitCount(), 1)
        );
        double throughputPerMin = resolvePositive(
                program.getThroughputPerMin() == null ? null : program.getThroughputPerMin().doubleValue(),
                Math.max(programCapacity / 60.0, 1.0)
        );
        int targetWaitMin = resolvePositive(
                policy == null ? null : policy.getTargetWaitMin(),
                DEFAULT_TARGET_WAIT_MIN
        );
        double programBaseScore = estimateProgramBaseScore(
                activeApplyCount,
                checkinCount,
                waitAggregate.totalWaitCount(),
                waitAggregate.averageWaitMinutes(),
                programCapacity,
                throughputPerMin,
                targetWaitMin
        );
        List<Double> programInputSequence = buildProgramInputSequence(
                program.getProgramId(),
                baseTime,
                programBaseScore
        );

        AiProgramPredictionRequest request = new AiProgramPredictionRequest(
                program.getEventId(),
                program.getProgramId(),
                baseTime,
                program.getStartAt(),
                program.getEndAt(),
                activeApplyCount,
                checkinCount,
                waitAggregate.totalWaitCount(),
                waitAggregate.averageWaitMinutes(),
                programCapacity,
                throughputPerMin,
                targetWaitMin,
                toUpperText(program.getCategory() == null ? null : program.getCategory().name()),
                null,
                resolveProgramZone(program),
                programInputSequence
        );

        AiCongestionPredictionResponse response = aiInferenceClient.predictProgram(request)
                .orElseGet(() -> fallbackProgramPrediction(program, baseTime, request));
        response = enforceScoreWaitConsistency(response);
        operationsMetricsService.recordAiPrediction(response.targetType(), response.fallbackUsed());
        if (persistLog) {
            savePredictionLog(response);
        }
        return response;
    }

    public AiProgramRecommendationResponse recommendProgram(Long programId) {
        Program currentProgram = programRepository.findById(programId)
                .orElseThrow(() -> new BusinessException(ErrorCode.PROGRAM_NOT_FOUND));
        AiCongestionPredictionResponse currentPrediction = predictProgramInternal(programId, false);
        LocalDateTime baseTime = LocalDateTime.now();

        AiRecommendationProgramInput currentInput = new AiRecommendationProgramInput(
                currentProgram.getProgramId(),
                currentProgram.getEventId(),
                currentProgram.getProgramTitle(),
                toUpperText(currentProgram.getCategory() == null ? null : currentProgram.getCategory().name()),
                null,
                resolveProgramZone(currentProgram),
                currentProgram.getStartAt(),
                currentProgram.getEndAt(),
                currentPrediction.predictedPeakScore(),
                currentPrediction.predictedWaitMinutes()
        );

        if (currentInput.predictedScore() < RECOMMEND_THRESHOLD) {
            return new AiProgramRecommendationResponse(
                    currentProgram.getEventId(),
                    currentProgram.getProgramId(),
                    RECOMMEND_THRESHOLD,
                    false,
                    "혼잡도가 임계치 미만입니다.",
                    List.of()
            );
        }

        List<AiRecommendationProgramInput> candidates = buildCandidateInputs(currentProgram, baseTime);
        AiProgramRecommendationRequest request = new AiProgramRecommendationRequest(
                currentProgram.getEventId(),
                currentProgram.getProgramId(),
                baseTime,
                RECOMMEND_THRESHOLD,
                currentInput,
                candidates
        );

        return aiInferenceClient.recommendPrograms(request)
                .orElseGet(() -> fallbackRecommendation(request));
    }

    public List<AiCongestionPredictionResponse> predictProgramsByEvent(Long eventId) {
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new BusinessException(ErrorCode.EVENT_NOT_FOUND));
        List<Program> programs = programRepository.findByEventId(event.getEventId(), Pageable.unpaged()).getContent();
        List<AiCongestionPredictionResponse> result = new ArrayList<>();
        for (Program program : programs) {
            result.add(predictProgram(program.getProgramId()));
        }
        return result;
    }

    private List<AiRecommendationProgramInput> buildCandidateInputs(Program currentProgram, LocalDateTime baseTime) {
        List<Program> programs = programRepository
                .findByEventId(currentProgram.getEventId(), Pageable.unpaged())
                .getContent();
        EventCongestionPolicy policy = findEventPolicy(currentProgram.getEventId());
        int targetWaitMin = resolvePositive(
                policy == null ? null : policy.getTargetWaitMin(),
                DEFAULT_TARGET_WAIT_MIN
        );
        List<AiRecommendationProgramInput> candidates = new ArrayList<>();

        for (Program candidate : programs) {
            if (candidate.getProgramId().equals(currentProgram.getProgramId())) {
                continue;
            }
            WaitAggregate waitAggregate = collectProgramWaitMetrics(candidate.getProgramId());
            int activeApplyCount = countProgramActiveApplies(candidate.getProgramId());
            int checkinCount = countProgramCheckins(candidate.getProgramId(), baseTime);
            int programCapacity = resolvePositive(
                    candidate.getCapacity(),
                    Math.max(activeApplyCount + waitAggregate.totalWaitCount(), 1)
            );
            double throughputPerMin = resolvePositive(
                    candidate.getThroughputPerMin() == null ? null : candidate.getThroughputPerMin().doubleValue(),
                    Math.max(programCapacity / 60.0, 1.0)
            );
            double score = estimateProgramBaseScore(
                    activeApplyCount,
                    checkinCount,
                    waitAggregate.totalWaitCount(),
                    waitAggregate.averageWaitMinutes(),
                    programCapacity,
                    throughputPerMin,
                    targetWaitMin
            );
            candidates.add(new AiRecommendationProgramInput(
                    candidate.getProgramId(),
                    candidate.getEventId(),
                    candidate.getProgramTitle(),
                    toUpperText(candidate.getCategory() == null ? null : candidate.getCategory().name()),
                    null,
                    resolveProgramZone(candidate),
                    candidate.getStartAt(),
                    candidate.getEndAt(),
                    score,
                    waitFromScore(score)
            ));
        }
        return candidates;
    }

    private AiProgramRecommendationResponse fallbackRecommendation(AiProgramRecommendationRequest request) {
        AiRecommendationProgramInput current = request.currentProgram();
        List<AiRecommendationProgramInput> filtered = request.candidates().stream()
                .filter(candidate -> !candidate.programId().equals(current.programId()))
                .filter(candidate -> candidate.endAt().isAfter(request.baseTime().plusMinutes(5)))
                .filter(candidate -> candidate.predictedScore() < current.predictedScore())
                .filter(candidate -> candidate.predictedScore() < request.thresholdScore())
                .sorted(buildRecommendationComparator(current, request.baseTime()))
                .limit(3)
                .toList();

        if (filtered.isEmpty()) {
            return new AiProgramRecommendationResponse(
                    request.eventId(),
                    request.programId(),
                    request.thresholdScore(),
                    true,
                    "추천 후보가 없습니다. 예상 대기시간 " + current.predictedWaitMinutes() + "분",
                    List.of()
            );
        }

        List<AiProgramRecommendationItemResponse> items = filtered.stream()
                .map(candidate -> new AiProgramRecommendationItemResponse(
                        candidate.programId(),
                        candidate.eventId(),
                        candidate.title(),
                        candidate.category(),
                        candidate.target(),
                        candidate.zone(),
                        candidate.startAt(),
                        candidate.endAt(),
                        clampScore(candidate.predictedScore()),
                        levelFromScore(candidate.predictedScore()),
                        candidate.predictedWaitMinutes(),
                        buildReason(candidate, current)
                ))
                .toList();

        return new AiProgramRecommendationResponse(
                request.eventId(),
                request.programId(),
                request.thresholdScore(),
                true,
                "대체 프로그램 추천 결과입니다.",
                items
        );
    }

    private Comparator<AiRecommendationProgramInput> buildRecommendationComparator(
            AiRecommendationProgramInput current,
            LocalDateTime baseTime
    ) {
        return Comparator
                .comparing((AiRecommendationProgramInput candidate) -> isSameText(candidate.category(), current.category()))
                .reversed()
                .thenComparing(candidate -> isTimeFit(candidate, baseTime), Comparator.reverseOrder())
                .thenComparing(candidate -> isSameText(candidate.target(), current.target()), Comparator.reverseOrder())
                .thenComparing(candidate -> isSameText(candidate.zone(), current.zone()), Comparator.reverseOrder())
                .thenComparingDouble(AiRecommendationProgramInput::predictedScore)
                .thenComparingInt(AiRecommendationProgramInput::predictedWaitMinutes)
                .thenComparing(AiRecommendationProgramInput::startAt);
    }

    private String buildReason(AiRecommendationProgramInput candidate, AiRecommendationProgramInput current) {
        List<String> parts = new ArrayList<>();
        if (isSameText(candidate.category(), current.category())) {
            parts.add("동일 카테고리");
        }
        if (isSameText(candidate.zone(), current.zone())) {
            parts.add("동일 구역");
        }
        parts.add("혼잡도 낮음");
        return String.join(", ", parts);
    }

    private boolean isTimeFit(AiRecommendationProgramInput candidate, LocalDateTime baseTime) {
        boolean startSoon = !candidate.startAt().isBefore(baseTime) && !candidate.startAt().isAfter(baseTime.plusMinutes(30));
        boolean runningNow = !candidate.startAt().isAfter(baseTime) && !candidate.endAt().isBefore(baseTime);
        return startSoon || runningNow;
    }

    private boolean isSameText(String left, String right) {
        if (left == null || right == null) {
            return false;
        }
        return left.equalsIgnoreCase(right);
    }

    private AiCongestionPredictionResponse fallbackEventPrediction(
            Event event,
            LocalDateTime baseTime,
            AiEventPredictionRequest request
    ) {
        double baseScore = estimateEventBaseScore(
                request.entryCount(),
                request.checkoutCount(),
                request.activeApplyCount(),
                request.preRegisteredCount(),
                request.participantCount(),
                request.currentInsideCount(),
                request.runningProgramCount(),
                request.totalProgramCount(),
                request.totalWaitCount(),
                request.averageWaitMinutes(),
                request.capacityBaseline(),
                request.waitBaseline(),
                request.targetWaitMin(),
                request.registrationForecastScore(),
                request.endedBaselineScore(),
                request.ongoingBaselineScore()
        );
        List<AiTimelinePoint> timeline = buildTimeline(request.eventStartAt(), request.eventEndAt(), baseScore);
        return buildPredictionResponse("EVENT", event.getEventId(), null, baseTime, timeline, baseScore, true);
    }

    private AiCongestionPredictionResponse fallbackProgramPrediction(
            Program program,
            LocalDateTime baseTime,
            AiProgramPredictionRequest request
    ) {
        double baseScore = estimateProgramBaseScore(
                request.activeApplyCount(),
                request.checkinCount(),
                request.waitCount(),
                request.waitMinutes(),
                request.programCapacity(),
                request.throughputPerMin(),
                request.targetWaitMin()
        );
        LocalDateTime horizonStart = baseTime.isAfter(program.getStartAt()) ? baseTime : program.getStartAt();
        List<AiTimelinePoint> timeline = buildTimeline(horizonStart, program.getEndAt(), baseScore);
        return buildPredictionResponse("PROGRAM", program.getEventId(), program.getProgramId(), baseTime, timeline, baseScore, true);
    }

    private AiCongestionPredictionResponse buildPredictionResponse(
            String targetType,
            Long eventId,
            Long programId,
            LocalDateTime baseTime,
            List<AiTimelinePoint> timeline,
            double baseScore,
            boolean fallbackUsed
    ) {
        List<Double> scores = timeline.stream().map(AiTimelinePoint::score).toList();
        double avgScore = scores.isEmpty()
                ? clampScore(baseScore)
                : clampScore(scores.stream().mapToDouble(Double::doubleValue).average().orElse(baseScore));
        double peakScore = scores.isEmpty()
                ? clampScore(baseScore)
                : clampScore(scores.stream().mapToDouble(Double::doubleValue).max().orElse(baseScore));
        int predictedWaitMinutes = timeline.isEmpty()
                ? waitFromScore(baseScore)
                : (int) Math.round(
                timeline.stream()
                        .mapToInt(AiTimelinePoint::waitMinutes)
                        .average()
                        .orElse(waitFromScore(avgScore))
        );

        return new AiCongestionPredictionResponse(
                targetType,
                eventId,
                programId,
                baseTime,
                avgScore,
                peakScore,
                levelFromScore(peakScore),
                Math.max(0, predictedWaitMinutes),
                0.62,
                null,
                fallbackUsed,
                timeline,
                List.of()
        );
    }

    private List<AiTimelinePoint> buildTimeline(LocalDateTime startAt, LocalDateTime endAt, double baseScore) {
        if (endAt.isBefore(startAt)) {
            return List.of();
        }

        List<LocalDateTime> points = buildTimePoints(startAt, endAt);
        if (points.isEmpty()) {
            return List.of();
        }

        int denominator = Math.max(1, points.size() - 1);
        List<AiTimelinePoint> timeline = new ArrayList<>();
        for (int index = 0; index < points.size(); index++) {
            LocalDateTime point = points.get(index);
            double progress = (double) index / denominator;
            double multiplier = timeProfileMultiplier(point);
            double wave = Math.sin(progress * Math.PI * 2.0) * 2.2;
            double trend = (progress - 0.5) * 3.0;
            double score = clampScore((baseScore * multiplier) + wave + trend);
            timeline.add(new AiTimelinePoint(
                    point,
                    score,
                    levelFromScore(score),
                    waitFromScore(score)
            ));
        }
        return timeline;
    }

    private double timeProfileMultiplier(LocalDateTime time) {
        double hour = time.getHour() + (time.getMinute() / 60.0);
        if (hour < 10.0) return 0.85;
        if (hour < 12.0) return 1.00;
        if (hour < 14.0) return 0.92;
        if (hour < 16.0) return 1.10;
        if (hour < 18.0) return 1.00;
        return 0.88;
    }

    private List<LocalDateTime> buildTimePoints(LocalDateTime startAt, LocalDateTime endAt) {
        List<LocalDateTime> points = new ArrayList<>();
        LocalDateTime current = alignToFive(startAt);
        if (current.isBefore(startAt)) {
            current = current.plusMinutes(5);
        }

        while (!current.isAfter(endAt)) {
            points.add(current);
            current = current.plusMinutes(5);
        }

        LocalDateTime endPoint = endAt.withSecond(0).withNano(0);
        if (points.isEmpty() || points.get(points.size() - 1).isBefore(endPoint)) {
            points.add(endPoint);
        }
        return points;
    }

    private LocalDateTime alignToFive(LocalDateTime dateTime) {
        int alignedMinute = (dateTime.getMinute() / 5) * 5;
        return dateTime
                .withMinute(alignedMinute)
                .withSecond(0)
                .withNano(0);
    }

    private WaitAggregate collectEventWaitMetrics(Long eventId, List<Program> programs) {
        int totalWaitCount = 0;
        int waitMinuteCount = 0;
        double waitMinuteSum = 0.0;

        List<Booth> booths = boothRepository.findEventBooths(eventId, null, null, Pageable.unpaged()).getContent();
        for (Booth booth : booths) {
            Optional<BoothWait> wait = boothWaitRepository.findByBoothId(booth.getBoothId());
            if (wait.isEmpty()) {
                continue;
            }
            int count = safeInt(wait.get().getWaitCount());
            int waitMin = safeInt(wait.get().getWaitMin());
            totalWaitCount += count;
            if (waitMin > 0) {
                waitMinuteSum += waitMin;
                waitMinuteCount++;
            }
        }

        for (Program program : programs) {
            Optional<ExperienceWait> wait = experienceWaitRepository.findByProgramId(program.getProgramId());
            if (wait.isEmpty()) {
                continue;
            }
            int count = safeInt(wait.get().getWaitCount());
            int waitMin = safeInt(wait.get().getWaitMin());
            totalWaitCount += count;
            if (waitMin > 0) {
                waitMinuteSum += waitMin;
                waitMinuteCount++;
            }
        }

        double averageWait = waitMinuteCount == 0 ? 0.0 : waitMinuteSum / waitMinuteCount;
        return new WaitAggregate(totalWaitCount, roundOneDecimal(averageWait));
    }

    private WaitAggregate collectProgramWaitMetrics(Long programId) {
        Optional<ExperienceWait> wait = experienceWaitRepository.findByProgramId(programId);
        if (wait.isEmpty()) {
            return new WaitAggregate(0, 0.0);
        }

        return new WaitAggregate(
                safeInt(wait.get().getWaitCount()),
                safeInt(wait.get().getWaitMin())
        );
    }

    private boolean isRunningNow(Program program) {
        LocalDateTime now = LocalDateTime.now();
        return (program.getStartAt().isBefore(now) || program.getStartAt().isEqual(now))
                && (program.getEndAt().isAfter(now) || program.getEndAt().isEqual(now));
    }

    private int countEventActiveApplies(Long eventId) {
        return collectEventRegistrationSnapshot(eventId).preRegisteredCount();
    }

    private EventRegistrationSnapshot collectEventRegistrationSnapshot(Long eventId) {
        long applied = eventRegistrationRepository.countByEventIdAndStatus(eventId, RegistrationStatus.APPLIED);
        long approved = eventRegistrationRepository.countByEventIdAndStatus(eventId, RegistrationStatus.APPROVED);
        return new EventRegistrationSnapshot(
                Math.toIntExact(applied),
                Math.toIntExact(approved)
        );
    }

    private int countEventFlowCount(Long eventId, QrCheckType checkType, LocalDateTime baseTime) {
        LocalDateTime fromInclusive = baseTime.minusMinutes(1);
        long count = qrCheckinRepository.countByQrCode_Event_EventIdAndCheckTypeAndCheckedAtBetween(
                eventId,
                checkType,
                fromInclusive,
                baseTime
        );
        return Math.toIntExact(count);
    }

    private int countProgramActiveApplies(Long programId) {
        long active = programApplyRepository.countByProgramIdAndStatusIn(programId, PROGRAM_ACTIVE_STATUSES);
        return Math.toIntExact(active);
    }

    private int countEventTotalFlowCount(Long eventId, QrCheckType checkType) {
        long count = qrCheckinRepository.countByQrCode_Event_EventIdAndCheckType(eventId, checkType);
        return Math.toIntExact(count);
    }

    private int countDistinctEventParticipants(Long eventId) {
        long count = qrCheckinRepository.countDistinctCheckinUsersByEventId(eventId);
        return Math.toIntExact(count);
    }

    private int countProgramCheckins(Long programId, LocalDateTime baseTime) {
        LocalDateTime fromInclusive = baseTime.minusMinutes(1);
        long checkedIn = programApplyRepository.countByProgramIdAndCheckedInAtBetween(
                programId,
                fromInclusive,
                baseTime
        );
        return Math.toIntExact(checkedIn);
    }

    private EventCongestionPolicy findEventPolicy(Long eventId) {
        return eventCongestionPolicyRepository.findById(eventId).orElse(null);
    }

    private int resolveEventCapacityBaseline(EventCongestionPolicy policy, int activeApplyCount) {
        int fallback = Math.max(activeApplyCount, 1);
        if (policy == null) {
            return fallback;
        }
        return resolvePositive(policy.getCapacityBaseline(), fallback);
    }

    private HistoricalBaseline collectHistoricalEventBaseline(LocalDateTime baseTime) {
        LocalDateTime endedFrom = baseTime.minusDays(90);
        LocalDateTime ongoingFrom = baseTime.minusMinutes(30);
        LocalDateTime ongoingTo = baseTime.plusMinutes(5);

        Double endedScore = aiEventCongestionBaselineQueryRepository.findEndedAverageScorePercent(endedFrom, baseTime);
        Double ongoingScore = aiEventCongestionBaselineQueryRepository.findOngoingAverageScorePercent(ongoingFrom, ongoingTo);

        double normalizedEnded = endedScore == null ? 0.0 : clampScore(endedScore);
        double normalizedOngoing = ongoingScore == null ? 0.0 : clampScore(ongoingScore);
        return new HistoricalBaseline(normalizedEnded, normalizedOngoing);
    }

    private double estimatePlannedRegistrationScore(
            int activeApplyCount,
            LocalDateTime startAt,
            LocalDateTime endAt
    ) {
        if (activeApplyCount <= 0) {
            return 0.0;
        }

        int operationDays = 1;
        if (startAt != null && endAt != null && !endAt.isBefore(startAt)) {
            long inclusiveDays = ChronoUnit.DAYS.between(startAt.toLocalDate(), endAt.toLocalDate()) + 1L;
            operationDays = (int) Math.max(1L, inclusiveDays);
        }

        double registrationsPerDay = activeApplyCount / (double) operationDays;
        double estimatedScore = Math.round((registrationsPerDay / 300.0) * 100.0);
        double bounded = Math.max(5.0, Math.min(85.0, estimatedScore));
        return clampScore(bounded);
    }

    private double blendPlannedForecastScore(
            double registrationForecastScore,
            double endedBaselineScore,
            double ongoingBaselineScore
    ) {
        double weightedSum = 0.0;
        double totalWeight = 0.0;

        if (registrationForecastScore > 0.0) {
            weightedSum += registrationForecastScore * 0.65;
            totalWeight += 0.65;
        }
        if (ongoingBaselineScore > 0.0) {
            weightedSum += ongoingBaselineScore * 0.20;
            totalWeight += 0.20;
        }
        if (endedBaselineScore > 0.0) {
            weightedSum += endedBaselineScore * 0.15;
            totalWeight += 0.15;
        }

        if (totalWeight <= 0.0) {
            return 0.0;
        }

        double blended = weightedSum / totalWeight;
        return Math.min(90.0, Math.max(5.0, blended));
    }

    private List<Double> buildEventInputSequence(Event event, LocalDateTime baseTime, double fallbackScore) {
        if (event.getStatus() == EventStatus.PLANNED) {
            List<Double> referenceSequence = buildPlannedReferenceEventSequence(
                    event.getEventId(),
                    baseTime,
                    fallbackScore
            );
            if (!referenceSequence.isEmpty()) {
                return referenceSequence;
            }
        }

        return buildSingleEventInputSequence(event.getEventId(), baseTime, fallbackScore);
    }

    private List<Double> buildSingleEventInputSequence(Long eventId, LocalDateTime baseTime, double fallbackScore) {
        List<AiEventCongestionTimeseries> snapshots = aiEventCongestionTimeseriesRepository
                .findTop60ByEventIdAndTimestampMinuteLessThanEqualOrderByTimestampMinuteDesc(eventId, baseTime);
        List<Double> sequence = new ArrayList<>();
        for (int index = snapshots.size() - 1; index >= 0; index--) {
            BigDecimal score = snapshots.get(index).getCongestionScore();
            if (score == null) {
                continue;
            }
            sequence.add(clampScore(score.doubleValue()));
        }
        return normalizeInputSequence(sequence, fallbackScore);
    }

    private List<Double> buildPlannedReferenceEventSequence(
            Long targetEventId,
            LocalDateTime baseTime,
            double fallbackScore
    ) {
        List<Long> referenceEventIds = collectReferenceEventIdsForPlanned(targetEventId);
        if (referenceEventIds.isEmpty()) {
            return List.of();
        }

        int sampleSize = resolvePlannedReferenceSampleSize(referenceEventIds.size());
        List<AiEventCongestionTimeseries> snapshots = aiEventCongestionTimeseriesRepository
                .findByEventIdInAndTimestampMinuteLessThanEqualOrderByTimestampMinuteDesc(
                        referenceEventIds,
                        baseTime,
                        PageRequest.of(0, sampleSize)
                );
        if (snapshots.isEmpty()) {
            return List.of();
        }

        Map<LocalDateTime, double[]> minuteAggregate = new TreeMap<>();
        for (AiEventCongestionTimeseries snapshot : snapshots) {
            BigDecimal score = snapshot.getCongestionScore();
            LocalDateTime timestampMinute = snapshot.getTimestampMinute();
            if (score == null || timestampMinute == null) {
                continue;
            }
            double[] stat = minuteAggregate.computeIfAbsent(timestampMinute, ignored -> new double[2]);
            stat[0] += clampScore(score.doubleValue());
            stat[1] += 1.0;
        }

        if (minuteAggregate.isEmpty()) {
            return List.of();
        }

        List<Double> sequence = new ArrayList<>(minuteAggregate.size());
        for (double[] stat : minuteAggregate.values()) {
            if (stat[1] <= 0.0) {
                continue;
            }
            sequence.add(clampScore(stat[0] / stat[1]));
        }
        return normalizeInputSequence(sequence, fallbackScore);
    }

    private List<Long> collectReferenceEventIdsForPlanned(Long targetEventId) {
        Set<Long> referenceEventIds = new LinkedHashSet<>();
        eventRepository.findByStatus(EventStatus.ENDED)
                .stream()
                .map(Event::getEventId)
                .filter(eventId -> !eventId.equals(targetEventId))
                .forEach(referenceEventIds::add);
        eventRepository.findByStatus(EventStatus.ONGOING)
                .stream()
                .map(Event::getEventId)
                .filter(eventId -> !eventId.equals(targetEventId))
                .forEach(referenceEventIds::add);
        return new ArrayList<>(referenceEventIds);
    }

    private int resolvePlannedReferenceSampleSize(int referenceEventCount) {
        int scaled = MODEL_SEQUENCE_LENGTH * Math.max(referenceEventCount, 1);
        int bounded = Math.max(PLANNED_REFERENCE_MIN_SAMPLE_SIZE, scaled);
        return Math.min(PLANNED_REFERENCE_MAX_SAMPLE_SIZE, bounded);
    }

    private List<Double> buildProgramInputSequence(Long programId, LocalDateTime baseTime, double fallbackScore) {
        List<AiProgramCongestionTimeseries> snapshots = aiProgramCongestionTimeseriesRepository
                .findTop60ByProgramIdAndTimestampMinuteLessThanEqualOrderByTimestampMinuteDesc(programId, baseTime);
        List<Double> sequence = new ArrayList<>();
        for (int index = snapshots.size() - 1; index >= 0; index--) {
            BigDecimal score = snapshots.get(index).getCongestionScore();
            if (score == null) {
                continue;
            }
            sequence.add(clampScore(score.doubleValue()));
        }
        return normalizeInputSequence(sequence, fallbackScore);
    }

    private List<Double> normalizeInputSequence(List<Double> raw, double fallbackScore) {
        List<Double> normalized = new ArrayList<>();
        if (raw != null) {
            for (Double value : raw) {
                if (value == null) {
                    continue;
                }
                normalized.add(clampScore(value));
            }
        }

        if (normalized.size() > MODEL_SEQUENCE_LENGTH) {
            normalized = new ArrayList<>(
                    normalized.subList(normalized.size() - MODEL_SEQUENCE_LENGTH, normalized.size())
            );
        }

        double basePad = normalized.isEmpty()
                ? clampScore(Math.max(DEFAULT_SEQUENCE_FALLBACK_SCORE, fallbackScore))
                : normalized.get(0);
        while (normalized.size() < MODEL_SEQUENCE_LENGTH) {
            normalized.add(0, basePad);
        }
        return normalized;
    }

    private String resolveProgramZone(Program program) {
        if (program.getBoothId() == null) {
            return null;
        }
        return boothRepository.findById(program.getBoothId())
                .map(booth -> booth.getZone() == null ? null : booth.getZone().name())
                .orElse(null);
    }

    private String toUpperText(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.toUpperCase(Locale.ROOT);
    }

    private double resolveLocationDemandScore(String location) {
        if (location == null || location.isBlank()) {
            return 94.0;
        }

        String normalized = location.toLowerCase(Locale.ROOT);
        if (normalized.contains("서울")) {
            return 100.0;
        }
        if (normalized.contains("경기")) {
            return 99.0;
        }
        if (normalized.contains("인천")) {
            return 98.0;
        }
        if (normalized.contains("부산")) {
            return 97.0;
        }
        if (normalized.contains("대전")) {
            return 96.0;
        }
        if (normalized.contains("대구")) {
            return 95.0;
        }
        if (normalized.contains("광주")) {
            return 94.0;
        }
        if (normalized.contains("충청")) {
            return 93.0;
        }
        if (normalized.contains("울산")) {
            return 92.0;
        }
        if (normalized.contains("세종")) {
            return 90.0;
        }
        if (normalized.contains("강원")) {
            return 89.0;
        }
        if (normalized.contains("제주")) {
            return 88.0;
        }
        return 94.0;
    }

    private int safeInt(Integer value) {
        return value == null ? 0 : Math.max(0, value);
    }

    private int resolvePositive(Integer value, int fallback) {
        if (value == null || value <= 0) {
            return fallback;
        }
        return value;
    }

    private double resolvePositive(Double value, double fallback) {
        if (value == null || value <= 0.0) {
            return fallback;
        }
        return value;
    }

    private double safeDiv(double a, double b) {
        return b <= 0.0 ? 0.0 : (a / b);
    }

    private double clamp01(double value) {
        return Math.max(0.0, Math.min(1.0, value));
    }

    private double clamp100(double value) {
        return Math.max(0.0, Math.min(100.0, value));
    }

    private double estimateEventBaseScore(
            int entryCount,
            int checkoutCount,
            int activeApplyCount,
            int preRegisteredCount,
            int participantCount,
            int currentInsideCount,
            int runningProgramCount,
            int totalProgramCount,
            int totalWaitCount,
            double averageWaitMinutes,
            int capacityBaseline,
            int waitBaseline,
            int targetWaitMin,
            double registrationForecastScore,
            double endedBaselineScore,
            double ongoingBaselineScore
    ) {
        int netEntryCount = Math.max(entryCount - checkoutCount, 0);
        double waitBaselinePerProgram = runningProgramCount <= 0
                ? waitBaseline
                : Math.max(waitBaseline / (double) runningProgramCount, 1.0);

        double entryPressure = clamp01(safeDiv(netEntryCount, Math.max(capacityBaseline * 0.08, 1.0)));
        double waitPressure = clamp01(safeDiv(totalWaitCount, Math.max(waitBaseline, 1)));
        double avgWaitPerRunningProgram = safeDiv(totalWaitCount, Math.max(runningProgramCount, 1));
        double waitDensityPressure = clamp01(safeDiv(avgWaitPerRunningProgram, Math.max(waitBaselinePerProgram, 1.0)));
        double waitTimePressure = clamp01(safeDiv(averageWaitMinutes, Math.max(targetWaitMin, 1)));
        double preRegistrationPressure = clamp01(safeDiv(preRegisteredCount, Math.max(capacityBaseline, 1)));
        double participantConversionPressure = clamp01(safeDiv(participantCount, Math.max(preRegisteredCount, 1)));
        double insideOccupancyPressure = clamp01(safeDiv(currentInsideCount, Math.max(capacityBaseline * 0.75, 1.0)));
        double operationRelief = clamp01(safeDiv(runningProgramCount, Math.max(totalProgramCount, 1)));

        double eventUnitScore = (0.10 * entryPressure)
                + (0.16 * waitPressure)
                + (0.10 * waitDensityPressure)
                + (0.14 * waitTimePressure)
                + (0.22 * preRegistrationPressure)
                + (0.18 * participantConversionPressure)
                + (0.14 * insideOccupancyPressure)
                - (0.04 * operationRelief);

        double liveScore = eventUnitScore * 100.0;
        boolean forecastMode = netEntryCount <= 0
                && runningProgramCount <= 0
                && totalWaitCount <= 0
                && averageWaitMinutes <= 0.0;

        if (forecastMode) {
            double plannedForecastScore = blendPlannedForecastScore(
                    registrationForecastScore,
                    endedBaselineScore,
                    ongoingBaselineScore
            );

            if (plannedForecastScore > 0.0) {
                return clampScore(plannedForecastScore);
            }

            if (activeApplyCount > 0) {
                return clampScore(estimatePlannedRegistrationScore(
                        activeApplyCount,
                        null,
                        null
                ));
            }
        }

        return clampScore(liveScore);
    }

    private double estimateProgramBaseScore(
            int activeApplyCount,
            int checkinCount,
            int waitCount,
            double waitMinutes,
            int programCapacity,
            double throughputPerMin,
            int targetWaitMin
    ) {
        double checkinPressure = clamp01(safeDiv(checkinCount, Math.max(throughputPerMin, 1.0)));
        double queuePressure = clamp01(safeDiv(waitCount, Math.max(programCapacity, 1)));
        double waitTimePressure = clamp01(safeDiv(waitMinutes, Math.max(targetWaitMin, 1)));
        double applyBacklogPressure = clamp01(safeDiv(activeApplyCount, Math.max(programCapacity * 2.0, 1.0)));

        double programUnitScore = (0.20 * checkinPressure)
                + (0.40 * queuePressure)
                + (0.30 * waitTimePressure)
                + (0.10 * applyBacklogPressure);

        return clampScore(programUnitScore * 100.0);
    }

    private double clampScore(double value) {
        return roundOneDecimal(clamp100(value));
    }

    private double roundOneDecimal(double value) {
        return Math.round(value * 10.0) / 10.0;
    }

    private int levelFromScore(double score) {
        if (score <= 20.0) {
            return 1;
        }
        if (score <= 40.0) {
            return 2;
        }
        if (score <= 60.0) {
            return 3;
        }
        if (score <= 80.0) {
            return 4;
        }
        return 5;
    }

    private int waitFromScore(double score) {
        double normalized = Math.max(0.0, Math.min(100.0, score));
        if (normalized < 25.0) {
            return 0;
        }
        if (normalized < 40.0) {
            return Math.max(1, (int) Math.round((normalized - 25.0) * 0.20 + 1.0));
        }
        if (normalized < 55.0) {
            return (int) Math.round(4.0 + (normalized - 40.0) * 0.33);
        }
        if (normalized < 70.0) {
            return (int) Math.round(9.0 + (normalized - 55.0) * 0.47);
        }
        if (normalized < 85.0) {
            return (int) Math.round(16.0 + (normalized - 70.0) * 0.67);
        }
        return Math.min(60, (int) Math.round(26.0 + (normalized - 85.0) * 0.95));
    }

    private AiCongestionPredictionResponse enforceScoreWaitConsistency(AiCongestionPredictionResponse response) {
        if (response == null) {
            return null;
        }

        int normalizedWait = normalizeWaitByScore(response.predictedAvgScore(), response.predictedWaitMinutes());
        List<AiTimelinePoint> timeline = response.timeline() == null ? List.of() : response.timeline();
        List<AiTimelinePoint> normalizedTimeline = timeline.stream()
                .map(point -> new AiTimelinePoint(
                        point.time(),
                        point.score(),
                        point.level(),
                        normalizeWaitByScore(point.score(), point.waitMinutes())
                ))
                .toList();
        List<AiTimelinePoint> calendarAdjustedTimeline = applyCalendarAdjustment(normalizedTimeline);
        List<AiTimelinePoint> normalizedLstmTimeline = normalizeLstmTimeline(response, calendarAdjustedTimeline);

        List<Double> adjustedScores = calendarAdjustedTimeline.stream()
                .map(AiTimelinePoint::score)
                .toList();
        double adjustedAvgScore = adjustedScores.isEmpty()
                ? clampScore(response.predictedAvgScore())
                : clampScore(adjustedScores.stream().mapToDouble(Double::doubleValue).average().orElse(response.predictedAvgScore()));
        double adjustedPeakScore = adjustedScores.isEmpty()
                ? clampScore(response.predictedPeakScore())
                : clampScore(adjustedScores.stream().mapToDouble(Double::doubleValue).max().orElse(response.predictedPeakScore()));
        int adjustedPredictedLevel = levelFromScore(adjustedPeakScore);
        int adjustedPredictedWait = calendarAdjustedTimeline.isEmpty()
                ? normalizedWait
                : (int) Math.round(
                calendarAdjustedTimeline.stream()
                        .mapToInt(AiTimelinePoint::waitMinutes)
                        .average()
                        .orElse(normalizedWait)
        );

        return new AiCongestionPredictionResponse(
                response.targetType(),
                response.eventId(),
                response.programId(),
                response.baseTime(),
                adjustedAvgScore,
                adjustedPeakScore,
                adjustedPredictedLevel,
                Math.max(0, adjustedPredictedWait),
                response.confidence(),
                response.lstmPredictedAvgScore(),
                response.fallbackUsed(),
                calendarAdjustedTimeline,
                normalizedLstmTimeline
        );
    }

    private AiCongestionPredictionResponse applyMeasuredHistoryBeforeBaseTime(
            AiCongestionPredictionResponse response,
            Long eventId,
            LocalDateTime baseTime
    ) {
        if (response == null || eventId == null || baseTime == null) {
            return response;
        }
        if (!AiPredictionTargetType.EVENT.name().equalsIgnoreCase(response.targetType())) {
            return response;
        }

        List<AiTimelinePoint> timeline = response.timeline() == null ? List.of() : response.timeline();
        if (timeline.isEmpty()) {
            return response;
        }

        LocalDateTime timelineStart = timeline.stream()
                .map(AiTimelinePoint::time)
                .filter(java.util.Objects::nonNull)
                .min(LocalDateTime::compareTo)
                .orElse(null);
        if (timelineStart == null || baseTime.isBefore(timelineStart)) {
            return response;
        }

        List<AiEventCongestionTimeseries> measuredSnapshots = aiEventCongestionTimeseriesRepository
                .findByEventIdAndTimestampMinuteBetweenOrderByTimestampMinuteAsc(
                        eventId,
                        timelineStart,
                        baseTime
                );
        if (measuredSnapshots.isEmpty()) {
            return response;
        }

        TreeMap<LocalDateTime, Double> measuredScoreByPoint = new TreeMap<>();
        for (AiEventCongestionTimeseries snapshot : measuredSnapshots) {
            if (snapshot.getTimestampMinute() == null || snapshot.getCongestionScore() == null) {
                continue;
            }
            measuredScoreByPoint.put(
                    alignToFive(snapshot.getTimestampMinute()),
                    clampScore(snapshot.getCongestionScore().doubleValue())
            );
        }
        if (measuredScoreByPoint.isEmpty()) {
            return response;
        }

        List<AiTimelinePoint> blendedTimeline = applyMeasuredScoresToTimeline(
                timeline,
                measuredScoreByPoint,
                baseTime
        );
        List<AiTimelinePoint> blendedLstmTimeline = applyMeasuredScoresToTimeline(
                response.lstmTimeline() == null ? List.of() : response.lstmTimeline(),
                measuredScoreByPoint,
                baseTime
        );

        return new AiCongestionPredictionResponse(
                response.targetType(),
                response.eventId(),
                response.programId(),
                response.baseTime(),
                response.predictedAvgScore(),
                response.predictedPeakScore(),
                response.predictedLevel(),
                response.predictedWaitMinutes(),
                response.confidence(),
                response.lstmPredictedAvgScore(),
                response.fallbackUsed(),
                blendedTimeline,
                blendedLstmTimeline
        );
    }

    private List<AiTimelinePoint> applyMeasuredScoresToTimeline(
            List<AiTimelinePoint> timeline,
            TreeMap<LocalDateTime, Double> measuredScoreByPoint,
            LocalDateTime baseTime
    ) {
        if (timeline == null || timeline.isEmpty()) {
            return List.of();
        }
        if (measuredScoreByPoint == null || measuredScoreByPoint.isEmpty()) {
            return timeline;
        }

        List<AiTimelinePoint> replaced = new ArrayList<>(timeline.size());
        for (AiTimelinePoint point : timeline) {
            if (point.time() == null || point.time().isAfter(baseTime)) {
                replaced.add(point);
                continue;
            }

            Double measuredScore = measuredScoreByPoint.get(point.time());
            if (measuredScore == null) {
                Map.Entry<LocalDateTime, Double> floor = measuredScoreByPoint.floorEntry(point.time());
                if (floor != null) {
                    measuredScore = floor.getValue();
                }
            }

            if (measuredScore == null) {
                replaced.add(point);
                continue;
            }

            double normalizedScore = clampScore(measuredScore);
            replaced.add(new AiTimelinePoint(
                    point.time(),
                    normalizedScore,
                    levelFromScore(normalizedScore),
                    normalizeWaitByScore(normalizedScore, point.waitMinutes())
            ));
        }
        return replaced;
    }

    private List<AiTimelinePoint> applyCalendarAdjustment(List<AiTimelinePoint> timeline) {
        if (timeline == null || timeline.isEmpty()) {
            return List.of();
        }

        return timeline.stream()
                .map(point -> {
                    LocalDateTime time = point.time();
                    double dayFactor = time == null ? 1.0 : dayProfileMultiplier(time.toLocalDate());
                    double hourFactor = time == null ? 1.0 : hourProfileMultiplier(time);
                    double adjustedScore = clampScore(point.score() * dayFactor * hourFactor);
                    int adjustedWait = normalizeWaitByScore(adjustedScore, point.waitMinutes());
                    return new AiTimelinePoint(
                            point.time(),
                            adjustedScore,
                            levelFromScore(adjustedScore),
                            adjustedWait
                    );
                })
                .toList();
    }

    private double dayProfileMultiplier(LocalDate day) {
        if (day == null) {
            return 1.0;
        }
        int dayOfWeek = day.getDayOfWeek().getValue(); // 1=Mon ... 7=Sun
        double weekendBias;
        if (dayOfWeek == 6) {
            weekendBias = 1.05;
        } else if (dayOfWeek == 7) {
            weekendBias = 1.08;
        } else {
            weekendBias = 1.0;
        }
        double dayCycle = ((Math.floorMod(day.getDayOfYear(), 14)) - 7) * 0.004;
        return weekendBias + dayCycle;
    }

    private double hourProfileMultiplier(LocalDateTime time) {
        double hour = time.getHour() + (time.getMinute() / 60.0);
        double normalized = (hour - 9.0) / 9.0;
        double wave = Math.sin(normalized * Math.PI) * 0.03;
        return 1.0 + wave;
    }

    private List<AiTimelinePoint> normalizeLstmTimeline(
            AiCongestionPredictionResponse response,
            List<AiTimelinePoint> normalizedTimeline
    ) {
        List<AiTimelinePoint> inputLstmTimeline = response.lstmTimeline() == null
                ? List.of()
                : response.lstmTimeline();

        if (!inputLstmTimeline.isEmpty()) {
            List<AiTimelinePoint> normalized = inputLstmTimeline.stream()
                    .map(point -> {
                        double score = clampScore(point.score());
                        return new AiTimelinePoint(
                                point.time(),
                                score,
                                levelFromScore(score),
                                normalizeWaitByScore(score, point.waitMinutes())
                        );
                    })
                    .toList();
            return applyCalendarAdjustment(normalized);
        }

        Double lstmAvg = response.lstmPredictedAvgScore();
        if (lstmAvg == null || normalizedTimeline.isEmpty()) {
            return List.of();
        }

        double lightAvg = normalizedTimeline.stream()
                .mapToDouble(AiTimelinePoint::score)
                .average()
                .orElse(lstmAvg);

        List<AiTimelinePoint> synthesized = normalizedTimeline.stream()
                .map(point -> {
                    double lightDelta = point.score() - lightAvg;
                    // Keep LSTM smoother than LightGBM while preserving time-varying shape.
                    double lstmScore = clampScore(lstmAvg + (lightDelta * 0.35));
                    return new AiTimelinePoint(
                            point.time(),
                            lstmScore,
                            levelFromScore(lstmScore),
                            waitFromScore(lstmScore)
                    );
                })
                .toList();
        return applyCalendarAdjustment(synthesized);
    }

    private int normalizeWaitByScore(double score, int waitMinutes) {
        int boundedWait = Math.max(0, waitMinutes);
        if (score < 25.0) {
            return 0;
        }
        int scoreBaseWait = waitFromScore(score);
        int softCap = scoreBaseWait + 8;
        return Math.min(boundedWait, softCap);
    }

    private TimeWindow resolveEventPredictionWindow(Event event, LocalDateTime from, LocalDateTime to) {
        LocalDateTime eventStart = event.getStartAt();
        LocalDateTime eventEnd = event.getEndAt();

        LocalDateTime startAt = from != null ? from : eventStart;
        LocalDateTime endAt = to != null ? to : eventEnd;

        if (startAt.isBefore(eventStart)) {
            startAt = eventStart;
        }
        if (startAt.isAfter(eventEnd)) {
            startAt = eventEnd;
        }
        if (endAt.isBefore(eventStart)) {
            endAt = eventStart;
        }
        if (endAt.isAfter(eventEnd)) {
            endAt = eventEnd;
        }
        if (startAt.isAfter(endAt)) {
            startAt = endAt;
        }

        return new TimeWindow(startAt, endAt);
    }

    private void savePredictionLog(AiCongestionPredictionResponse prediction) {
        try {
            AiPredictionLog entity = AiPredictionLog.builder()
                    .targetType(resolveTargetType(prediction))
                    .eventId(prediction.eventId())
                    .programId(prediction.programId())
                    .predictionBaseTime(prediction.baseTime())
                    .predictedAvgScore60m(toScoreDecimal(prediction.predictedAvgScore()))
                    .predictedPeakScore60m(toScoreDecimal(prediction.predictedPeakScore()))
                    .predictedLevel((byte) prediction.predictedLevel())
                    .modelVersion(prediction.fallbackUsed() ? MODEL_VERSION_FALLBACK : MODEL_VERSION_AI)
                    .sourceType(AiPredictionSourceType.REALTIME)
                    .build();
            aiPredictionLogRepository.save(entity);
        } catch (Exception exception) {
            // Prediction logging must not break user-facing APIs.
            log.warn(
                    "Failed to persist ai_prediction_logs. targetType={}, eventId={}, programId={}, baseTime={}",
                    prediction.targetType(),
                    prediction.eventId(),
                    prediction.programId(),
                    prediction.baseTime(),
                    exception
            );
        }
    }

    private AiPredictionTargetType resolveTargetType(AiCongestionPredictionResponse prediction) {
        String value = prediction.targetType();
        if ("EVENT".equalsIgnoreCase(value)) {
            return AiPredictionTargetType.EVENT;
        }
        if ("PROGRAM".equalsIgnoreCase(value)) {
            return AiPredictionTargetType.PROGRAM;
        }
        return prediction.programId() == null
                ? AiPredictionTargetType.EVENT
                : AiPredictionTargetType.PROGRAM;
    }

    private BigDecimal toScoreDecimal(double score) {
        return BigDecimal.valueOf(score).setScale(2, RoundingMode.HALF_UP);
    }

    private record TimeWindow(LocalDateTime startAt, LocalDateTime endAt) {
    }

    private record HistoricalBaseline(double endedScore, double ongoingScore) {
    }

    private record EventRegistrationSnapshot(int appliedCount, int approvedCount) {
        int preRegisteredCount() {
            return Math.max(0, appliedCount + approvedCount);
        }
    }

    private record WaitAggregate(int totalWaitCount, double averageWaitMinutes) {
    }
}
