const LEVEL_LABEL_MAP = {
  1: "여유",
  2: "원활",
  3: "보통",
  4: "인기",
  5: "매우 인기",
};

const LEVEL_TONE_MAP = {
  1: { color: "#047857", bg: "#ecfdf5", border: "#a7f3d0" },
  2: { color: "#7ab33e", bg: "#E6F7F2", border: "#CCF0E4" },
  3: { color: "#b45309", bg: "#fffbeb", border: "#fde68a" },
  4: { color: "#c2410c", bg: "#fff7ed", border: "#fdba74" },
  5: { color: "#b91c1c", bg: "#fef2f2", border: "#fecaca" },
};

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function toNumber(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function normalizeScorePercent(value) {
  const numeric = toNumber(value, 0);
  if (!Number.isFinite(numeric) || numeric <= 0) return 0;
  // AI congestion score is provided in 0~5 scale in current backend payload.
  if (numeric <= 5) {
    return clamp(Math.round(numeric * 20), 0, 100);
  }
  return clamp(Math.round(numeric), 0, 100);
}

function smoothTimelineScores(points = []) {
  if (!Array.isArray(points) || points.length <= 2) return points;

  const withMovingAverage = points.map((point, index) => {
    const window = [points[index - 1], point, points[index + 1]]
      .map((item) => Number(item?.score))
      .filter((value) => Number.isFinite(value));
    if (window.length === 0) return point;
    const averaged = Math.round(window.reduce((sum, value) => sum + value, 0) / window.length);
    return { ...point, score: clamp(averaged, 0, 100) };
  });

  const emaAlpha = 0.6;
  const maxStepDelta = 6;
  let prev = Number(withMovingAverage[0]?.score);
  if (!Number.isFinite(prev)) return withMovingAverage;

  const stabilized = withMovingAverage.map((point, index) => {
    if (index === 0) return point;
    const current = Number(point?.score);
    if (!Number.isFinite(current)) return point;

    let nextScore = Math.round((emaAlpha * current) + ((1 - emaAlpha) * prev));
    const delta = nextScore - prev;
    if (Math.abs(delta) > maxStepDelta) {
      nextScore = prev + (Math.sign(delta) * maxStepDelta);
    }
    nextScore = clamp(nextScore, 0, 100);
    prev = nextScore;
    return { ...point, score: nextScore };
  });

  return stabilized;
}

function toValidDate(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function estimateUpcomingCongestionPercent(registrations, startAt, endAt) {
  const totalRegistrations = Math.max(0, Number(registrations) || 0);
  if (totalRegistrations <= 0) return 0;

  const startDate = toValidDate(startAt);
  const endDate = toValidDate(endAt);
  let operationDays = 1;

  if (startDate && endDate && endDate >= startDate) {
    const dayMs = 24 * 60 * 60 * 1000;
    const startDay = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
    const endDay = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
    operationDays = Math.max(1, Math.ceil((endDay.getTime() - startDay.getTime() + dayMs) / dayMs));
  }

  const registrationsPerDay = totalRegistrations / operationDays;
  const estimated = Math.round((registrationsPerDay / 300) * 100);
  return clamp(estimated, 5, 85);
}

export function resolveUnifiedAverageCongestion({
  status,
  measuredAverage,
  hourlyAverage,
  endedRatio,
  endedProgramAiAverage,
  aiAverage,
  aiFallbackUsed = false,
  approvedCount = 0,
  checkinCount = 0,
  startAt = null,
  endAt = null,
} = {}) {
  const normalizedStatus = String(status ?? "").toUpperCase();
  const isPlannedEvent =
    normalizedStatus === "PLANNED" ||
    normalizedStatus === "PENDING" ||
    normalizedStatus === "UPCOMING";
  const isEndedLikeEvent =
    normalizedStatus === "ENDED" ||
    normalizedStatus === "CANCELLED";

  const measured = normalizeScorePercent(measuredAverage);
  const hourly = normalizeScorePercent(hourlyAverage);
  const ai = normalizeScorePercent(aiAverage);
  const endedProgramAi = normalizeScorePercent(endedProgramAiAverage);

  const resolvedEndedRatio = (() => {
    const explicitEndedRatio = Number(endedRatio);
    if (Number.isFinite(explicitEndedRatio)) {
      return clamp(Math.round(explicitEndedRatio), 0, 100);
    }

    const approved = Math.max(0, toNumber(approvedCount, 0));
    const checkin = Math.max(0, toNumber(checkinCount, 0));
    if (approved <= 0 && checkin <= 0) return 0;

    const denominator = approved > 0 ? approved : checkin;
    return clamp(Math.round((checkin / Math.max(denominator, 1)) * 100), 0, 100);
  })();

  if (isPlannedEvent) {
    if (ai > 0) {
      return ai;
    }
    return estimateUpcomingCongestionPercent(approvedCount, startAt, endAt);
  }

  if (isEndedLikeEvent) {
    if (hourly > 0) return hourly;
    if (measured > 0) return measured;
    if (resolvedEndedRatio > 0) return resolvedEndedRatio;
    if (endedProgramAi > 0) return endedProgramAi;
    if (ai > 0) return ai;
    return 0;
  }

  if (measured > 0) return measured;
  if (ai > 0) return ai;
  if (hourly > 0) return hourly;
  return ai > 0 ? ai : 0;
}

function resolveLevel(score, level) {
  const explicitLevel = Number(level);
  if ([1, 2, 3, 4, 5].includes(explicitLevel)) return explicitLevel;

  const normalizedScore = clamp(Math.round(toNumber(score, 0)), 0, 100);
  if (normalizedScore >= 81) return 5;
  if (normalizedScore >= 61) return 4;
  if (normalizedScore >= 41) return 3;
  if (normalizedScore >= 21) return 2;
  return 1;
}

export function getLevelMeta(score, level) {
  const resolved = resolveLevel(score, level);
  return {
    level: resolved,
    label: LEVEL_LABEL_MAP[resolved] ?? LEVEL_LABEL_MAP[1],
    tone: LEVEL_TONE_MAP[resolved] ?? LEVEL_TONE_MAP[1],
  };
}

export function normalizePrediction(payload) {
  if (!payload || typeof payload !== "object") return null;

  const avgScore = normalizeScorePercent(payload.predictedAvgScore);
  const peakScore = normalizeScorePercent(payload.predictedPeakScore ?? avgScore);
  const lstmAvgScoreRaw = payload.lstmPredictedAvgScore;
  const lstmAvgScore =
    lstmAvgScoreRaw === null || lstmAvgScoreRaw === undefined
      ? null
      : normalizeScorePercent(lstmAvgScoreRaw);
  const waitMinutes = Math.max(0, Math.round(toNumber(payload.predictedWaitMinutes, 0)));
  const confidence = clamp(toNumber(payload.confidence, 0), 0, 1);
  const levelMeta = getLevelMeta(peakScore, payload.predictedLevel);

  const timelineRaw = Array.isArray(payload.timeline)
    ? payload.timeline
        .map((point) => {
          const score = normalizeScorePercent(point?.score);
          const pointLevel = getLevelMeta(score, point?.predictedLevel);
          return {
            time: point?.time ?? point?.timestamp ?? null,
            score,
            level: pointLevel.level,
            label: pointLevel.label,
            tone: pointLevel.tone,
          };
        })
        .filter((point) => point.time)
    : [];
  const timeline = smoothTimelineScores(timelineRaw);

  return {
    targetType: String(payload.targetType ?? ""),
    eventId: payload.eventId ?? null,
    programId: payload.programId ?? null,
    baseTime: payload.baseTime ?? null,
    avgScore,
    peakScore,
    level: levelMeta.level,
    levelLabel: levelMeta.label,
    levelTone: levelMeta.tone,
    waitMinutes,
    confidence,
    lstmAvgScore,
    fallbackUsed: Boolean(payload.fallbackUsed),
    timeline,
  };
}

export function normalizeRecommendation(payload) {
  if (!payload || typeof payload !== "object") return null;

  const recommendations = Array.isArray(payload.recommendations)
    ? payload.recommendations.map((item) => {
        const score = normalizeScorePercent(item?.predictedScore);
        const levelMeta = getLevelMeta(score, item?.predictedLevel);
        return {
          programId: item?.programId ?? null,
          title: item?.title ?? "Untitled",
          category: item?.category ?? null,
          target: item?.target ?? null,
          zone: item?.zone ?? null,
          startAt: item?.startAt ?? null,
          endAt: item?.endAt ?? null,
          score,
          level: levelMeta.level,
          levelLabel: levelMeta.label,
          levelTone: levelMeta.tone,
          waitMinutes: Math.max(0, Math.round(toNumber(item?.predictedWaitMinutes, 0))),
          reason: item?.reason ?? "",
        };
      })
    : [];

  return {
    eventId: payload.eventId ?? null,
    programId: payload.programId ?? null,
    thresholdScore: clamp(toNumber(payload.thresholdScore, 75), 0, 100),
    fallbackUsed: Boolean(payload.fallbackUsed),
    message: String(payload.message ?? ""),
    recommendations,
  };
}

export function formatKoreanTime(value) {
  if (!value) return "--:--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--:--";
  return date.toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

