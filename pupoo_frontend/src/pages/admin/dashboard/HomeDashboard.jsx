import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  Bell,
  CalendarDays,
  CreditCard,
  Layers,
  Radio,
  RefreshCw,
  RotateCcw,
  Search,
  Users,
  Wallet,
} from "lucide-react";
import {
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import ds, { cardStyle, cong } from "../shared/designTokens";
import { Bar2, ChartTip, Pill } from "../shared/Components";
import { axiosInstance } from "../../../app/http/axiosInstance";
import { getToken } from "../../../api/noticeApi";
import { sortAdminEventsByOperationalPriority } from "../shared/adminStatus";

const EVENT_STATUS_META = {
  ONGOING: { label: "운영 중", color: ds.green, bg: ds.greenSoft },
  PLANNED: { label: "예정", color: ds.amber, bg: ds.amberSoft },
  ENDED: { label: "종료", color: ds.ink4, bg: ds.lineSoft },
  CANCELLED: { label: "취소", color: ds.red, bg: ds.redSoft },
};

const PAYMENT_STATUS_META = {
  APPROVED: { label: "승인 결제", color: ds.green },
  REQUESTED: { label: "결제 요청", color: ds.sky },
  FAILED: { label: "결제 실패", color: ds.red },
  CANCELLED: { label: "결제 취소", color: ds.ink4 },
  REFUNDED: { label: "결제 환불", color: ds.amber },
};

const REFUND_STATUS_META = {
  REQUESTED: { label: "환불 요청", color: ds.amber },
  APPROVED: { label: "환불 승인", color: ds.sky },
  REJECTED: { label: "환불 거절", color: ds.red },
  REFUNDED: { label: "환불 완료", color: ds.green },
};

const DEMO_CONGESTION_PROFILES = [
  [10, 12, 16, 21, 28, 34, 39, 36, 30, 24, 19, 15],
  [18, 24, 31, 43, 57, 68, 76, 72, 63, 55, 48, 39],
  [24, 32, 41, 54, 68, 81, 90, 87, 79, 70, 58, 46],
  [8, 10, 14, 19, 27, 40, 58, 73, 81, 77, 61, 44],
  [34, 49, 63, 74, 82, 78, 70, 60, 50, 42, 35, 28],
  [14, 18, 17, 23, 35, 48, 57, 53, 40, 29, 22, 18],
];
const MULTI_EVENT_COLORS = [
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#3b82f6",
  "#1e3a8a",
  "#7c3aed",
  "#14b8a6",
  "#38bdf8",
  "#ec4899",
];

const authHeaders = () => {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const unwrapPayload = (response) => response?.data?.data ?? response?.data ?? null;

const toArray = (payload) =>
  Array.isArray(payload?.content)
    ? payload.content
    : Array.isArray(payload)
      ? payload
      : [];

const parseAmount = (value) => {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : 0;
};

const safePercent = (value, total) =>
  total > 0 ? Math.round((value / total) * 100) : 0;

const normalizeCongestionPercent = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return 0;
  if (numeric <= 5) {
    return Math.min(Math.max(Math.round(numeric * 20), 0), 100);
  }
  return Math.min(Math.max(Math.round(numeric), 0), 100);
};

const formatNumber = (value) => Number(value || 0).toLocaleString("ko-KR");

const formatCompactWon = (value) => {
  const amount = parseAmount(value);
  if (Math.abs(amount) >= 100000000) {
    const unit = amount / 100000000;
    return `${unit.toFixed(unit >= 10 ? 0 : 1).replace(/\.0$/, "")}억 원`;
  }
  if (Math.abs(amount) >= 10000) {
    return `${Math.round(amount / 10000).toLocaleString("ko-KR")}만 원`;
  }
  return `${Math.round(amount).toLocaleString("ko-KR")}원`;
};

const formatDateRange = (startAt, endAt) => {
  const parse = (value) => {
    const date = value ? new Date(value) : null;
    return date && !Number.isNaN(date.getTime()) ? date : null;
  };
  const start = parse(startAt);
  const end = parse(endAt);
  if (!start && !end) return "일정 정보 없음";
  if (start && end) {
    return `${start.getMonth() + 1}.${start.getDate()} ~ ${end.getMonth() + 1}.${end.getDate()}`;
  }
  const target = start || end;
  return `${target.getMonth() + 1}.${target.getDate()}`;
};

const toDateInputValue = (value) => {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const buildDateKeysFromRange = (startAt, endAt, maxDays = 90) => {
  const start = startAt ? new Date(startAt) : null;
  const end = endAt ? new Date(endAt) : null;
  if (!start || !end || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
    return [];
  }

  const cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const last = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  const keys = [];
  while (cursor <= last && keys.length < maxDays) {
    keys.push(toDateInputValue(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return keys;
};

const formatShortDateLabel = (dateKey) => {
  if (!dateKey) return "";
  const date = new Date(`${dateKey}T00:00:00`);
  if (Number.isNaN(date.getTime())) return dateKey;
  return `${date.getMonth() + 1}-${date.getDate()}`;
};

const toDateTimeInputValue = (value) => {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
};

const clampDateToEventRange = (dateValue, event) => {
  const selected = toDateInputValue(dateValue);
  const start = toDateInputValue(event?.startAt);
  const end = toDateInputValue(event?.endAt);

  if (!selected) return start || end || "";
  if (start && selected < start) return start;
  if (end && selected > end) return end;
  return selected;
};

const buildEventDayWindowParams = (dateValue, event) => {
  const day = toDateInputValue(dateValue);
  if (!day) return {};

  const eventStart = event?.startAt ? new Date(event.startAt) : null;
  const eventEnd = event?.endAt ? new Date(event.endAt) : null;
  const hasEventWindow =
    eventStart &&
    eventEnd &&
    !Number.isNaN(eventStart.getTime()) &&
    !Number.isNaN(eventEnd.getTime());

  const dayStart = new Date(`${day}T00:00:00`);
  const dayEnd = new Date(`${day}T23:59:59`);
  let fromDate = dayStart;
  let toDate = dayEnd;

  if (hasEventWindow) {
    fromDate = new Date(dayStart);
    fromDate.setHours(
      eventStart.getHours(),
      eventStart.getMinutes(),
      eventStart.getSeconds(),
      0,
    );
    toDate = new Date(dayStart);
    toDate.setHours(
      eventEnd.getHours(),
      eventEnd.getMinutes(),
      eventEnd.getSeconds(),
      0,
    );

    if (toDate < fromDate) {
      toDate = new Date(dayEnd);
    }

    if (fromDate < eventStart) fromDate = eventStart;
    if (toDate > eventEnd) toDate = eventEnd;
  }

  if (fromDate < dayStart) fromDate = dayStart;
  if (toDate > dayEnd) toDate = dayEnd;
  if (fromDate > toDate) fromDate = toDate;

  return {
    from: toDateTimeInputValue(fromDate),
    to: toDateTimeInputValue(toDate),
  };
};

const normalizeCongestionPercentPrecise = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return 0;
  const scaled = numeric <= 5 ? numeric * 20 : numeric;
  const clamped = Math.min(Math.max(scaled, 0), 100);
  return Math.round(clamped * 10) / 10;
};
const normalizeAiPredictionRows = (predictionPayload) => {
  // 두 모델 출력을 같은 시간축으로 정규화해 차트에서 항상 두 줄을 그릴 수 있게 한다.
  const timeline = Array.isArray(predictionPayload?.timeline)
    ? predictionPayload.timeline
    : [];
  const lstmTimeline = Array.isArray(predictionPayload?.lstmTimeline)
    ? predictionPayload.lstmTimeline
    : [];
  const lstmByTime = new Map(
    lstmTimeline
      .map((point) => {
        const time = point?.time ? new Date(point.time) : null;
        if (!time || Number.isNaN(time.getTime())) return null;
        return [time.getTime(), normalizeCongestionPercentPrecise(point?.score)];
      })
      .filter(Boolean),
  );
  const lstmScore = predictionPayload?.lstmPredictedAvgScore;
  const normalizedLstm = Number.isFinite(Number(lstmScore))
    ? normalizeCongestionPercentPrecise(lstmScore)
    : null;

  const normalizedRows = timeline
    .map((point) => {
      const time = point?.time ? new Date(point.time) : null;
      if (!time || Number.isNaN(time.getTime())) return null;
      const epoch = time.getTime();
      const lstmAtTime = lstmByTime.has(epoch)
        ? lstmByTime.get(epoch)
        : normalizedLstm;
      return {
        time,
        label: `${String(time.getHours()).padStart(2, "0")}:${String(time.getMinutes()).padStart(2, "0")}`,
        measured: null,
        lightgbm: normalizeCongestionPercentPrecise(point?.score),
        lstm: lstmAtTime,
      };
    })
    .filter(Boolean)
    .sort((left, right) => left.time.getTime() - right.time.getTime());

  return normalizedRows;
};

const formatRelativeTime = (value) => {
  const target = value ? new Date(value) : null;
  if (!target || Number.isNaN(target.getTime())) return "방금 전";
  const diff = Date.now() - target.getTime();
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (diff < minute) return "방금 전";
  if (diff < hour) return `${Math.floor(diff / minute)}분 전`;
  if (diff < day) return `${Math.floor(diff / hour)}시간 전`;
  return `${Math.floor(diff / day)}일 전`;
};

const requestPayload = async (url, params = {}) => {
  const response = await axiosInstance.get(url, {
    headers: authHeaders(),
    params,
  });
  return unwrapPayload(response);
};

const safePayload = async (url, params = {}, fallback = null) => {
  try {
    return await requestPayload(url, params);
  } catch (error) {
    console.error(`[HomeDashboard] request failed: ${url}`, error);
    return fallback;
  }
};

const fetchPagedRecords = async (
  url,
  params = {},
  { maxPages = 6, pageSize = 200 } = {},
) => {
  const rows = [];
  for (let page = 0; page < maxPages; page += 1) {
    const payload = await safePayload(
      url,
      { ...params, page, size: pageSize },
      { content: [], totalPages: 0, last: true },
    );
    const content = toArray(payload);
    rows.push(...content);
    const totalPages = Number(payload?.totalPages);
    if (payload?.last || !Number.isFinite(totalPages) || page >= totalPages - 1) {
      break;
    }
  }
  return rows;
};

const toAdminStatus = (status) => {
  const normalized = String(status ?? "").toUpperCase();
  if (normalized === "ONGOING") return "active";
  if (normalized === "ENDED" || normalized === "CANCELLED") return "ended";
  return "pending";
};

const sortRealtimeEvents = (items = []) =>
  sortAdminEventsByOperationalPriority(
    items.map((event) => ({
      ...event,
      __rawStatus: event.status,
      status: toAdminStatus(event.status),
    })),
  ).map(({ __rawStatus, ...event }) => ({
    ...event,
    status: __rawStatus,
    adminStatus: toAdminStatus(__rawStatus),
  }));

const toEventTimestamp = (...values) => {
  for (const value of values) {
    const timestamp = value ? new Date(value).getTime() : Number.NaN;
    if (Number.isFinite(timestamp)) return timestamp;
  }
  return 0;
};

const getRecentEventPriority = (event) => {
  const status = String(event?.status || "").toUpperCase();
  if (status === "ENDED" || status === "CANCELLED") return 0;
  if (status === "PLANNED") return 1;
  return 2;
};

const pickCongestionGraphEvents = (events = [], limit = 10) => {
  const ongoingEvents = events
    .filter((event) => event.status === "ONGOING")
    .slice(0, limit);

  if (ongoingEvents.length >= limit) {
    return {
      items: ongoingEvents,
      ongoingCount: ongoingEvents.length,
      recentCount: 0,
      totalCount: ongoingEvents.length,
    };
  }

  const recentEvents = events
    .filter((event) => event.status !== "ONGOING")
    .slice()
    .sort(
      (a, b) =>
        getRecentEventPriority(a) - getRecentEventPriority(b) ||
        toEventTimestamp(b?.endAt, b?.startAt, b?.updatedAt, b?.createdAt) -
          toEventTimestamp(a?.endAt, a?.startAt, a?.updatedAt, a?.createdAt) ||
        (Number(b?.eventId) || 0) - (Number(a?.eventId) || 0),
    )
    .slice(0, Math.max(limit - ongoingEvents.length, 0));

  return {
    items: [...ongoingEvents, ...recentEvents],
    ongoingCount: ongoingEvents.length,
    recentCount: recentEvents.length,
    totalCount: ongoingEvents.length + recentEvents.length,
  };
};

const describeCongestionGraphScope = (meta = {}) => {
  const ongoingCount = Number(meta.ongoingCount) || 0;
  const recentCount = Number(meta.recentCount) || 0;
  const totalCount =
    Number(meta.totalCount) || ongoingCount + recentCount;

  if (recentCount > 0 && ongoingCount > 0) {
    return `진행 중 ${formatNumber(ongoingCount)}건 + 최근 ${formatNumber(recentCount)}건`;
  }
  if (recentCount > 0) {
    return `최근 ${formatNumber(totalCount)}건`;
  }
  return `진행 중 ${formatNumber(totalCount)}건`;
};

const toEventId = (row) => {
  const eventId = Number(row?.eventId ?? row?.event?.eventId ?? null);
  return Number.isFinite(eventId) ? eventId : null;
};

const average = (rows = []) => {
  if (!rows.length) return 0;
  return Math.round(rows.reduce((sum, row) => sum + Number(row.value || 0), 0) / rows.length);
};

const buildDummyCongestionRows = (event) => {
  const seed = Number(event?.eventId) || 1;
  const profile = DEMO_CONGESTION_PROFILES[seed % DEMO_CONGESTION_PROFILES.length];
  const scale = 0.9 + ((seed * 7) % 22) / 100;
  const offset = ((seed * 11) % 16) - 8;

  return profile.map((value, index) => {
    const wave = ((seed + index * 5) % 11) - 5;
    const adjusted = Math.max(
      6,
      Math.min(97, Math.round(value * scale + offset + wave)),
    );
    const hour = 9 + index;
    return {
      hour,
      label: `${String(hour).padStart(2, "0")}:00`,
      value: adjusted,
      isDummy: true,
    };
  });
};

const normalizeCongestionRows = (payload) =>
  toArray(payload)
    .map((row) => ({
      hour: Number(row.hour) || 0,
      label: `${String(Number(row.hour) || 0).padStart(2, "0")}:00`,
      value: normalizeCongestionPercent(
        row?.avgCongestionLevel ?? row?.avgCongestion ?? row?.avg_level,
      ),
    }))
    .sort((a, b) => a.hour - b.hour);

const buildCongestionLine = (event, payload, color) => {
  const rawRows = normalizeCongestionRows(payload);
  const useDummy = false;
  const rows = rawRows;
  return {
    eventId: Number(event?.eventId) || 0,
    eventName: event?.eventName || `행사 ${event?.eventId}`,
    color,
    rows,
    useDummy,
  };
};

const mergeCongestionChartRows = (lines = []) => {
  const bucket = new Map();
  lines.forEach((line) => {
    line.rows.forEach((row) => {
      const hour = Number(row.hour) || 0;
      const current = bucket.get(hour) || { hour, label: row.label };
      current[`event_${line.eventId}`] = row.value;
      bucket.set(hour, current);
    });
  });
  return Array.from(bucket.values()).sort((a, b) => a.hour - b.hour);
};

const summarizeCongestionLines = (lines = []) => {
  const latestValues = lines
    .map((line) => Number(line.rows[line.rows.length - 1]?.value) || 0)
    .filter((value) => Number.isFinite(value));
  const peakValues = lines.flatMap((line) =>
    line.rows.map((row) => Number(row.value) || 0),
  );
  return {
    average: latestValues.length
      ? Math.round(
          latestValues.reduce((sum, value) => sum + value, 0) /
            latestValues.length,
        )
      : 0,
    peak: peakValues.length ? Math.max(...peakValues) : 0,
    eventCount: lines.length,
  };
};

const summarizeRealtimeCongestionRows = (rows = []) => {
  const values = toArray(rows)
    .map((row) => {
      const rawLevel = row?.congestionLevel;
      const hasMeasuredLevel =
        rawLevel !== null && rawLevel !== undefined && rawLevel !== "";
      if (!hasMeasuredLevel) return null;
      return normalizeCongestionPercent(rawLevel);
    })
    .filter((value) => Number.isFinite(value));
  if (values.length === 0) {
    return {
      current: 0,
      peak: 0,
      pointCount: 0,
    };
  }
  return {
    current: Math.round(values.reduce((sum, value) => sum + value, 0) / values.length),
    peak: Math.max(...values),
    pointCount: values.length,
  };
};

const summarizeRealtimeByEvents = (eventRealtimeRows = []) => {
  const summaries = eventRealtimeRows.map((eventRow) => ({
    eventId: Number(eventRow?.eventId) || 0,
    eventName: eventRow?.eventName || "",
    summary: summarizeRealtimeCongestionRows(eventRow?.rows),
  }));
  const effective = summaries.filter((item) => item.summary.pointCount > 0);
  const currentValues = effective.map((item) => item.summary.current);
  const peakValues = effective.map((item) => item.summary.peak);

  return {
    current: currentValues.length
      ? Math.round(currentValues.reduce((sum, value) => sum + value, 0) / currentValues.length)
      : 0,
    peak: peakValues.length ? Math.max(...peakValues) : 0,
    eventCount: effective.length,
  };
};

const eventOptionLabel = (event) =>
  `${event.eventName} · ${formatDateRange(event.startAt, event.endAt)}`;

function MetricCard({ icon: Icon, label, value, sub, color, bg, compact = false }) {
  return (
    <div style={{ ...cardStyle, padding: compact ? "15px 16px" : "18px 20px", display: "flex", flexDirection: "column", gap: compact ? 10 : 14, minWidth: 0, minHeight: compact ? 126 : 142 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <span style={{ fontSize: 12.5, fontWeight: 700, color: ds.ink3, minWidth: 0, whiteSpace: "normal", wordBreak: "keep-all", overflowWrap: "break-word", lineHeight: 1.4 }}>{label}</span>
        <div style={{ width: compact ? 30 : 34, height: compact ? 30 : 34, borderRadius: compact ? 9 : 10, background: bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Icon size={16} color={color} strokeWidth={2.2} />
        </div>
      </div>
      <div style={{ fontSize: compact ? (typeof value === "string" && value.length > 10 ? 19 : 24) : (typeof value === "string" && value.length > 10 ? 22 : 29), fontWeight: 800, color: ds.ink, lineHeight: 1.08, wordBreak: "keep-all", overflowWrap: "break-word", minWidth: 0 }}>
        {value}
      </div>
      <div style={{ fontSize: 12, color: ds.ink4, lineHeight: 1.45, minWidth: 0, wordBreak: "keep-all", overflowWrap: "break-word" }}>{sub}</div>
    </div>
  );
}

function SectionCard({ title, subtitle, action, children, compact = false, handset = false }) {
  return (
    <div style={{ ...cardStyle, padding: 0, overflow: "hidden" }}>
      <div style={{ padding: compact ? "15px 16px 12px" : "18px 20px 14px", borderBottom: `1px solid ${ds.line}`, display: "flex", flexDirection: handset ? "column" : "row", alignItems: handset ? "stretch" : "flex-start", justifyContent: "space-between", gap: 12 }}>
        <div>
          <div style={{ fontSize: 14.5, fontWeight: 800, color: ds.ink }}>{title}</div>
          {subtitle && <div style={{ fontSize: 11.5, color: ds.ink4, marginTop: 4 }}>{subtitle}</div>}
        </div>
        {action}
      </div>
      <div style={{ padding: compact ? 16 : 20 }}>{children}</div>
    </div>
  );
}

function ChartEmpty({ title, description }) {
  return (
    <div style={{ minHeight: 220, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", gap: 8 }}>
      <div style={{ fontSize: 13.5, fontWeight: 700, color: ds.ink3 }}>{title}</div>
      <div style={{ fontSize: 12, color: ds.ink4 }}>{description}</div>
    </div>
  );
}

function FilterControl({ value, onChange, placeholder, compact = false }) {
  return (
    <div style={{ position: "relative", minWidth: 0, width: compact ? "100%" : "auto" }}>
      <div style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: ds.ink4, pointerEvents: "none" }}>
        <Search size={13} strokeWidth={2.2} />
      </div>
      <input
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        style={{ width: "100%", minWidth: compact ? 0 : 180, height: 36, padding: "0 12px 0 32px", borderRadius: 10, border: `1px solid ${ds.line}`, background: ds.card, color: ds.ink, fontSize: 12.5, fontFamily: ds.ff, outline: "none" }}
      />
    </div>
  );
}

export default function HomeDashboard({ initialEventId = null }) {
  const [viewportWidth, setViewportWidth] = useState(() =>
    typeof window === "undefined" ? 1440 : window.innerWidth,
  );
  const [snapshot, setSnapshot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [selectedEventId, setSelectedEventId] = useState(initialEventId ? String(initialEventId) : "ALL");
  const [selectedCongestionDate, setSelectedCongestionDate] = useState("");
  const [eventSearch, setEventSearch] = useState("");

  useEffect(() => {
    if (initialEventId == null) return;
    setSelectedEventId(String(initialEventId));
  }, [initialEventId]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const syncViewport = () => setViewportWidth(window.innerWidth);
    syncViewport();
    window.addEventListener("resize", syncViewport);
    return () => window.removeEventListener("resize", syncViewport);
  }, []);
  const loadDashboard = useCallback(async ({ silent = false } = {}) => {
    if (silent) setRefreshing(true);
    else setLoading(true);

    try {
      const currentYear = new Date().getFullYear();
      const [summaryPayload, eventPayload, performancePayload, yearlyPayload, logPayload, payments, refunds] = await Promise.all([
        safePayload("/api/admin/dashboard/realtime/summary", {}, {}),
        safePayload("/api/admin/dashboard/realtime/events", { page: 0, size: 120, sort: "startAt,asc" }, { content: [] }),
        safePayload("/api/admin/analytics/events", { page: 0, size: 120 }, []),
        safePayload("/api/admin/analytics/yearly", { fromYear: currentYear - 4, toYear: currentYear }, []),
        safePayload("/api/admin/logs", { page: 0, size: 5 }, { content: [] }),
        fetchPagedRecords("/api/admin/payments", { sort: "requestedAt,desc" }),
        fetchPagedRecords("/api/admin/refunds", { sort: "requestedAt,desc" }),
      ]);

      const allEvents = sortRealtimeEvents(toArray(eventPayload));
      const liveEvents = allEvents.filter((event) => event.status === "ONGOING");
      const graphEventSelection = pickCongestionGraphEvents(allEvents, 10);
      const graphEvents = graphEventSelection.items;
      const recentLogs = toArray(logPayload).slice(0, 5);
      const eventPerformance = toArray(performancePayload)
        .map((event) => {
          const approvedRegistrationCount = Number(event.approvedRegistrationCount) || 0;
          const checkinCount = Number(event.checkinCount) || 0;
          return {
            ...event,
            approvedRegistrationCount,
            checkinCount,
            attendanceRate: safePercent(checkinCount, approvedRegistrationCount),
            noShowCount: Math.max(approvedRegistrationCount - checkinCount, 0),
          };
        })
        .sort((a, b) => b.checkinCount - a.checkinCount || b.approvedRegistrationCount - a.approvedRegistrationCount);

      const selectedEvent = selectedEventId !== "ALL"
        ? allEvents.find((event) => String(event.eventId) === String(selectedEventId)) || null
        : null;
      const selectedEventStatus = selectedEvent?.status;
      const selectedEventIsPlanned = selectedEventStatus === "PLANNED";
      // 종료 행사는 실제 집계 혼잡도를 기준으로 보여주고, 예측축은 진행중/예정 행사에만 사용한다.
      const selectedEventSupportsDateSelection =
        selectedEventStatus === "PLANNED" || selectedEventStatus === "ONGOING";
      const selectedEventDate = selectedEventSupportsDateSelection
        ? clampDateToEventRange(
            selectedCongestionDate || toDateInputValue(new Date()),
            selectedEvent,
          )
        : "";
      const focusEvent = selectedEvent || graphEvents[0] || liveEvents[0] || allEvents[0] || null;
      const isAllEventCongestionView = !selectedEvent && graphEvents.length > 0;
      const allEventGraphMeta = {
        ...graphEventSelection,
        totalCount: graphEvents.length,
      };
      const [focusCongestionPayload, focusBoothPayload, multiEventCongestionPayloads, multiEventRealtimePayloads] = await Promise.all([
        focusEvent
          ? safePayload(`/api/admin/analytics/events/${focusEvent.eventId}/congestion-by-hour`, {}, [])
          : Promise.resolve([]),
        focusEvent
          ? safePayload(`/api/admin/dashboard/realtime/events/${focusEvent.eventId}/congestions`, { limit: 24 }, [])
          : Promise.resolve([]),
        isAllEventCongestionView
          ? Promise.all(
              graphEvents.map((event, index) =>
                safePayload(`/api/admin/analytics/events/${event.eventId}/congestion-by-hour`, {}, []).then((payload) =>
                  buildCongestionLine(
                    event,
                    payload,
                    MULTI_EVENT_COLORS[index % MULTI_EVENT_COLORS.length],
                  ),
                ),
              ),
            )
          : Promise.resolve([]),
        isAllEventCongestionView
          ? Promise.all(
              graphEvents.map((event) =>
                safePayload(
                  `/api/admin/dashboard/realtime/events/${event.eventId}/congestions`,
                  { limit: 24 },
                  [],
                ).then((payload) => ({
                  eventId: event.eventId,
                  eventName: event.eventName,
                  rows: toArray(payload),
                })),
              ),
            )
          : Promise.resolve([]),
      ]);
      const selectedEventWindowParams = buildEventDayWindowParams(
        selectedEventDate,
        selectedEvent,
      );
      const [selectedEventPredictionPayload, selectedEventDailyPredictionRows] =
        selectedEventSupportsDateSelection
          ? await Promise.all([
              safePayload(
                `/api/admin/ai/events/${selectedEvent.eventId}/congestion/predict`,
                selectedEventWindowParams,
                null,
              ),
              selectedEventIsPlanned ? (async () => {
                const dateKeys = buildDateKeysFromRange(
                  selectedEvent?.startAt,
                  selectedEvent?.endAt,
                );
                if (!dateKeys.length) return [];

                const dailyPayloads = await Promise.all(
                  dateKeys.map((dateKey) =>
                    safePayload(
                      `/api/admin/ai/events/${selectedEvent.eventId}/congestion/predict`,
                      buildEventDayWindowParams(dateKey, selectedEvent),
                      null,
                    ).then((payload) => ({ dateKey, payload })),
                  ),
                );

                return dailyPayloads
                  .map(({ dateKey, payload }) => {
                    const lightgbm = normalizeCongestionPercentPrecise(payload?.predictedAvgScore);
                    let lstm = null;
                    if (payload?.lstmPredictedAvgScore !== null && payload?.lstmPredictedAvgScore !== undefined) {
                      lstm = normalizeCongestionPercentPrecise(payload.lstmPredictedAvgScore);
                    } else if (Array.isArray(payload?.lstmTimeline) && payload.lstmTimeline.length > 0) {
                      const scores = payload.lstmTimeline
                        .map((point) => normalizeCongestionPercentPrecise(point?.score))
                        .filter((score) => Number.isFinite(score));
                      if (scores.length > 0) {
                        lstm = Math.round((scores.reduce((sum, score) => sum + score, 0) / scores.length) * 10) / 10;
                      }
                    }
                    return {
                      dateKey,
                      label: formatShortDateLabel(dateKey),
                      lightgbm,
                      lstm,
                    };
                  })
                  .filter((row) => Number.isFinite(Number(row.lightgbm)))
                  .sort((left, right) => left.dateKey.localeCompare(right.dateKey));
              })() : Promise.resolve([]),
            ])
          : [null, []];
      const selectedPredictionRows = normalizeAiPredictionRows(
        selectedEventPredictionPayload,
      );
      const useSelectedDatePrediction =
        selectedEventSupportsDateSelection &&
        Boolean(selectedEventDate) &&
        selectedPredictionRows.length > 0;
      const realtimeFocusLine = focusEvent
        ? buildCongestionLine(focusEvent, focusCongestionPayload, ds.amber)
        : { rows: [], useDummy: false };
      const focusLine = useSelectedDatePrediction && selectedPredictionRows.length > 0
        ? { rows: selectedPredictionRows, useDummy: false, isPrediction: true }
        : {
            rows: realtimeFocusLine.rows.map((row) => ({
              ...row,
              measured: row.value,
              lightgbm: row.value,
              lstm: null,
            })),
            useDummy: realtimeFocusLine.useDummy,
            isPrediction: false,
          };
      const usingDummyCongestion = Boolean(focusLine.useDummy);
      const focusCongestion = focusLine.rows;
      const allEventCongestionLines = isAllEventCongestionView
        ? multiEventCongestionPayloads
        : [];
      const allEventCongestionChartData = mergeCongestionChartRows(
        allEventCongestionLines,
      );
      const allEventCongestionSummary = summarizeCongestionLines(
        allEventCongestionLines,
      );
      const allEventRealtimeSummary = summarizeRealtimeByEvents(
        multiEventRealtimePayloads,
      );
      const usingAnyDummyCongestion = isAllEventCongestionView
        ? allEventCongestionLines.some((line) => line.useDummy)
        : usingDummyCongestion;

      const topBooths = toArray(focusBoothPayload)
        .map((row) => {
          const rawLevel = row?.congestionLevel;
          const hasMeasuredLevel =
            rawLevel !== null && rawLevel !== undefined && rawLevel !== "";
          if (!hasMeasuredLevel) return null;

          const congestionLevel = normalizeCongestionPercent(rawLevel);
          return {
            ...row,
            congestionLevel,
            state: cong(congestionLevel),
          };
        })
        .filter(Boolean)
        .sort((a, b) => b.congestionLevel - a.congestionLevel)
        .slice(0, 5);
      const focusRealtimeSummary = summarizeRealtimeCongestionRows(
        focusBoothPayload,
      );

      const paymentRows = Array.isArray(payments) ? payments : [];
      const refundRows = Array.isArray(refunds) ? refunds : [];
      const scopedPaymentRows = selectedEvent
        ? paymentRows.filter((payment) => toEventId(payment) === Number(selectedEvent.eventId))
        : paymentRows;
      const scopedRefundRows = selectedEvent
        ? refundRows.filter((refund) => toEventId(refund) === Number(selectedEvent.eventId))
        : refundRows;
      const selectedPerformance = selectedEvent
        ? eventPerformance.find((event) => Number(event.eventId) === Number(selectedEvent.eventId)) || null
        : null;

      const approvedPaymentCount = scopedPaymentRows.filter((payment) => payment.status === "APPROVED").length;
      const approvedPaymentAmount = scopedPaymentRows
        .filter((payment) => payment.status === "APPROVED")
        .reduce((sum, payment) => sum + parseAmount(payment.amount), 0);
      const failedPaymentCount = scopedPaymentRows.filter((payment) => payment.status === "FAILED").length;
      const requestedRefundCount = scopedRefundRows.filter((refund) => refund.status === "REQUESTED").length;
      const completedRefundCount = scopedRefundRows.filter((refund) => refund.status === "REFUNDED").length;

      const summary = allEvents.reduce(
        (counts, event) => {
          if (event.status === "ONGOING") counts.ongoingCount += 1;
          else if (event.status === "PLANNED") counts.plannedCount += 1;
          else if (event.status === "CANCELLED") counts.cancelledCount += 1;
          else counts.endedCount += 1;
          return counts;
        },
        {
          plannedCount: 0,
          ongoingCount: 0,
          endedCount: 0,
          cancelledCount: 0,
          todayCheckinCount: Number(summaryPayload?.todayCheckinCount) || 0,
        },
      );
      const totalEventCount = allEvents.length;
      const totalParticipantCount = eventPerformance.reduce(
        (sum, event) => sum + (Number(event.approvedRegistrationCount) || 0),
        0,
      );
      const pendingEventCount = Number(summary.plannedCount) || 0;

      const yearlyMap = new Map();
      for (let year = currentYear - 4; year <= currentYear; year += 1) {
        yearlyMap.set(year, { year, label: `${String(year).slice(-2)}년`, eventCount: 0, approvedRegistrationCount: 0, refundRequestCount: 0 });
      }
      toArray(yearlyPayload).forEach((row) => {
        const year = Number(row.year);
        if (!yearlyMap.has(year)) return;
        const target = yearlyMap.get(year);
        target.eventCount = Number(row.eventCount) || 0;
        target.approvedRegistrationCount = Number(row.approvedRegistrationCount) || 0;
      });
      refundRows.forEach((refund) => {
        const target = refund.requestedAt ? new Date(refund.requestedAt) : null;
        const year = target && !Number.isNaN(target.getTime()) ? target.getFullYear() : null;
        if (year && yearlyMap.has(year)) yearlyMap.get(year).refundRequestCount += 1;
      });
      const operationsTrend = Array.from(yearlyMap.values()).sort((a, b) => a.year - b.year);

      const paymentStatusRows = Object.entries(PAYMENT_STATUS_META).map(([status, meta]) => {
        const count = scopedPaymentRows.filter((payment) => payment.status === status).length;
        return { ...meta, status, count, pct: safePercent(count, scopedPaymentRows.length) };
      });
      const refundStatusRows = Object.entries(REFUND_STATUS_META).map(([status, meta]) => {
        const count = scopedRefundRows.filter((refund) => refund.status === status).length;
        return { ...meta, status, count, pct: safePercent(count, scopedRefundRows.length), value: count };
      });
      const refundDonutRows = refundStatusRows.filter((row) => row.count > 0);

      const alerts = [];
      if (requestedRefundCount > 0) {
        alerts.push({
          icon: RotateCcw,
          color: ds.amber,
          bg: ds.amberSoft,
          message: `환불 요청 ${formatNumber(requestedRefundCount)}건이 승인 대기 중입니다.`,
          detail: selectedEvent ? `${selectedEvent.eventName} 행사 기준 집계입니다.` : "결제 관리에서 우선 확인이 필요합니다.",
        });
      }
      if (failedPaymentCount > 0) {
        alerts.push({
          icon: CreditCard,
          color: ds.red,
          bg: ds.redSoft,
          message: `결제 실패 ${formatNumber(failedPaymentCount)}건이 있습니다.`,
          detail: selectedEvent ? `${selectedEvent.eventName} 행사 기준 집계입니다.` : "승인 재시도 또는 결제수단 점검이 필요합니다.",
        });
      }
      if (topBooths[0]?.congestionLevel >= 80) {
        alerts.push({
          icon: Layers,
          color: ds.red,
          bg: ds.redSoft,
          message: `${topBooths[0].placeName} 부스가 가장 혼잡합니다.`,
          detail: `혼잡도 ${topBooths[0].congestionLevel}%`,
        });
      }
      if (summary.cancelledCount > 0 && !selectedEvent) {
        alerts.push({
          icon: CalendarDays,
          color: ds.ink3,
          bg: ds.lineSoft,
          message: `취소된 행사 ${formatNumber(summary.cancelledCount)}건이 포함되어 있습니다.`,
          detail: "홈 기준 전체 운영 현황에 반영되었습니다.",
        });
      }
      if (alerts.length === 0) {
        alerts.push({
          icon: Bell,
          color: ds.green,
          bg: ds.greenSoft,
          message: "즉시 확인이 필요한 운영 이슈가 없습니다.",
          detail: "실시간 지표 기준 정상 범위로 집계되었습니다.",
        });
      }

      setSnapshot({
        summary,
        totalEventCount,
        totalParticipantCount,
        pendingEventCount,
        allEvents,
        liveEvents,
        focusEvent,
        selectedCongestionDate: selectedEventSupportsDateSelection
          ? selectedEventDate || null
          : null,
        isPredictionCongestionView: Boolean(focusLine.isPrediction),
        plannedDailyCongestion: selectedEventDailyPredictionRows,
        focusCongestion,
        usingDummyCongestion: usingAnyDummyCongestion,
        isAllEventCongestionView,
        allEventCongestionLines,
        allEventGraphMeta,
        allEventCongestionChartData,
        allEventCongestionSummary,
        allEventRealtimeSummary,
        topBooths,
        focusRealtimeSummary,
        eventPerformance,
        selectedPerformance,
        approvedPaymentAmount,
        approvedPaymentCount,
        requestedRefundCount,
        completedRefundCount,
        operationsTrend,
        paymentStatusRows,
        refundStatusRows,
        refundDonutRows,
        alerts: alerts.slice(0, 4),
        recentLogs,
        scopedRegistrationCount: Number(selectedPerformance?.approvedRegistrationCount) || 0,
        scopedCheckinCount: Number(selectedPerformance?.checkinCount) || 0,
        scopedAttendanceRate: Number(selectedPerformance?.attendanceRate) || 0,
        scopedNoShowCount: Number(selectedPerformance?.noShowCount) || 0,
        updatedAt: new Date(),
      });
      setError("");
    } catch (loadError) {
      console.error("[HomeDashboard] load failed:", loadError);
      setError("홈 대시보드 데이터를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedCongestionDate, selectedEventId]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    const timerId = setInterval(() => {
      loadDashboard({ silent: true });
    }, 30000);
    return () => clearInterval(timerId);
  }, [loadDashboard]);

  useEffect(() => {
    if (!snapshot?.allEvents?.length || selectedEventId === "ALL") return;
    if (!snapshot.allEvents.some((event) => String(event.eventId) === String(selectedEventId))) {
      setSelectedEventId("ALL");
    }
  }, [snapshot?.allEvents, selectedEventId]);

  useEffect(() => {
    if (!snapshot?.focusEvent || selectedEventId === "ALL") return;
    const defaultDate = clampDateToEventRange(
      selectedCongestionDate || snapshot.selectedCongestionDate,
      snapshot.focusEvent,
    );
    if (defaultDate && defaultDate !== selectedCongestionDate) {
      setSelectedCongestionDate(defaultDate);
    }
  }, [
    selectedCongestionDate,
    selectedEventId,
    snapshot?.focusEvent,
    snapshot?.selectedCongestionDate,
  ]);

  const filteredEvents = useMemo(() => {
    if (!snapshot?.allEvents?.length) return [];
    const keyword = eventSearch.trim().toLowerCase();
    if (!keyword) return snapshot.allEvents;
    return snapshot.allEvents.filter((event) => {
      const name = String(event.eventName || "").toLowerCase();
      const date = String(formatDateRange(event.startAt, event.endAt)).toLowerCase();
      return name.includes(keyword) || date.includes(keyword);
    });
  }, [eventSearch, snapshot?.allEvents]);
  const isHandset = viewportWidth < 768;
  const isTablet = viewportWidth >= 768 && viewportWidth < 1024;
  const isCompact = viewportWidth < 1024;

  if (loading && !snapshot) {
    return (
      <div style={{ minHeight: 420, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14 }}>
        <div style={{ width: 38, height: 38, borderRadius: "50%", border: `3px solid ${ds.brandSoft}`, borderTopColor: ds.brand, animation: "spin 1s linear infinite" }} />
        <div style={{ fontSize: 13.5, fontWeight: 700, color: ds.ink3 }}>운영 지표를 불러오는 중입니다...</div>
      </div>
    );
  }

  if (!snapshot) {
    return (
      <div style={cardStyle}>
        <div style={{ fontSize: 14, fontWeight: 700, color: ds.red }}>
          {error || "홈 대시보드 데이터를 표시할 수 없습니다."}
        </div>
      </div>
    );
  }

  const selectedScope = selectedEventId !== "ALL" && snapshot.focusEvent;
  const isSelectedPlannedEvent =
    selectedScope && snapshot.focusEvent?.status === "PLANNED";
  const isSelectedEndedEvent =
    selectedScope && snapshot.focusEvent?.status === "ENDED";
  const showPlannedPrediction = isSelectedPlannedEvent;
  const isAllEventCongestionView =
    !selectedScope &&
    snapshot.isAllEventCongestionView &&
    snapshot.allEventCongestionLines.length > 0;
  const focusStatus = snapshot.focusEvent
    ? EVENT_STATUS_META[snapshot.focusEvent.status] || EVENT_STATUS_META.PLANNED
    : null;
  const topBooth = snapshot.topBooths[0] || null;
  const hasTrendData = snapshot.operationsTrend.some(
    (row) => row.eventCount || row.approvedRegistrationCount || row.refundRequestCount,
  );
  const focusEventStartDate = toDateInputValue(snapshot.focusEvent?.startAt);
  const focusEventEndDate = toDateInputValue(snapshot.focusEvent?.endAt);
  const effectiveCongestionDate = selectedScope
    ? clampDateToEventRange(
        selectedCongestionDate || snapshot.selectedCongestionDate,
        snapshot.focusEvent,
      )
    : "";
  const congestionGraphScope = describeCongestionGraphScope(
    snapshot.allEventGraphMeta,
  );
  const congestionSubtitle = isAllEventCongestionView
    ? `${congestionGraphScope}의 시간대별 실시간 혼잡도`
    : snapshot.focusEvent
      ? snapshot.isPredictionCongestionView
        ? `${snapshot.focusEvent.eventName} · ${effectiveCongestionDate || "선택일"} 시간대별 예상 혼잡도`
        : isSelectedPlannedEvent
          ? `${snapshot.focusEvent.eventName} · 일별 혼잡도 예측 대기`
          : isSelectedEndedEvent
            ? `${snapshot.focusEvent.eventName} 행사 기준 시간대별 실제 혼잡도`
            : `${snapshot.focusEvent.eventName} 행사 기준 시간대별 실시간 혼잡도`
      : "행사를 선택하면 시간대별 혼잡 추이를 보여줍니다.";

  return (
    <div style={{ display: "flex", flexDirection: isCompact ? "column" : "row", gap: isHandset ? 14 : 20 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", flexDirection: isCompact ? "column" : "row", alignItems: isCompact ? "stretch" : "flex-start", justifyContent: "space-between", gap: isHandset ? 12 : 16, marginBottom: isHandset ? 14 : 18, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: ds.ink }}>실시간 운영 대시보드</div>
            <div style={{ fontSize: 12.5, color: ds.ink4, marginTop: 4 }}>
              행사 상태, 체크인, 혼잡도, 결제/환불, 관리자 활동을 30초마다 자동으로 갱신합니다.
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: isHandset ? "column" : "row", alignItems: isHandset ? "stretch" : "center", gap: 10, flexWrap: "wrap", width: isCompact ? "100%" : "auto" }}>
            <FilterControl
              value={eventSearch}
              onChange={(event) => setEventSearch(event.target.value)}
              placeholder="행사 검색"
              compact={isCompact}
            />
            <select
              value={selectedEventId}
              onChange={(event) => setSelectedEventId(event.target.value)}
              style={{ minWidth: isCompact ? 0 : 240, width: isCompact ? "100%" : "auto", height: 36, padding: "0 12px", borderRadius: 10, border: `1px solid ${ds.line}`, background: ds.card, color: ds.ink, fontSize: 12.5, fontFamily: ds.ff, outline: "none" }}
            >
              <option value="ALL">전체 행사 보기</option>
              {filteredEvents.map((event) => (
                <option key={event.eventId} value={String(event.eventId)}>
                  {eventOptionLabel(event)}
                </option>
              ))}
            </select>
            {selectedEventId !== "ALL" && (
              <button
                onClick={() => setSelectedEventId("ALL")}
                style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, width: isHandset ? "100%" : "auto", padding: "7px 10px", borderRadius: ds.rs, border: `1px solid ${ds.line}`, background: ds.card, color: ds.ink3, fontSize: 12, fontWeight: 700, fontFamily: ds.ff, cursor: "pointer" }}
              >
                전체 보기
              </button>
            )}
            <span style={{ fontSize: 11.5, color: ds.ink4, width: isHandset ? "100%" : "auto" }}>최근 갱신 {formatRelativeTime(snapshot.updatedAt)}</span>
            <button
              onClick={() => loadDashboard()}
              style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, width: isHandset ? "100%" : "auto", padding: "7px 12px", borderRadius: ds.rs, border: `1px solid ${ds.line}`, background: ds.card, color: ds.ink3, fontSize: 12, fontWeight: 700, fontFamily: ds.ff, cursor: "pointer" }}
            >
              <RefreshCw size={13} strokeWidth={2.2} />
              {refreshing ? "갱신 중" : "새로고침"}
            </button>
          </div>
        </div>

        {error && (
          <div style={{ ...cardStyle, padding: "12px 16px", marginBottom: 16, color: ds.amber, fontSize: 12.5, fontWeight: 700 }}>
            {error}
          </div>
        )}

        {selectedScope && focusStatus && (
          <div style={{ ...cardStyle, padding: isHandset ? "12px 14px" : "14px 16px", marginBottom: 16, display: "flex", flexDirection: isHandset ? "column" : "row", alignItems: isHandset ? "stretch" : "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: ds.ink }}>{snapshot.focusEvent.eventName}</div>
              <div style={{ fontSize: 11.5, color: ds.ink4, marginTop: 4 }}>
                {formatDateRange(snapshot.focusEvent.startAt, snapshot.focusEvent.endAt)} 기준 상세 운영 지표
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <Pill color={focusStatus.color} bg={focusStatus.bg}>{focusStatus.label}</Pill>
            </div>
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: isHandset ? "repeat(2, minmax(0, 1fr))" : isTablet ? "repeat(2, minmax(0, 1fr))" : "repeat(auto-fit, minmax(180px, 1fr))", gap: isHandset ? 10 : 14, marginBottom: 16 }}>
          {selectedScope ? (
            <>
              <MetricCard icon={Users} label="승인 등록" value={formatNumber(snapshot.scopedRegistrationCount)} sub="선택 행사 승인 신청 기준" color={ds.brand} bg={ds.brandSoft} compact={isCompact} />
              <MetricCard icon={Radio} label="체크인" value={formatNumber(snapshot.scopedCheckinCount)} sub={`노쇼 ${formatNumber(snapshot.scopedNoShowCount)}명`} color={ds.green} bg={ds.greenSoft} compact={isCompact} />
              <MetricCard icon={CalendarDays} label="체크인율" value={`${formatNumber(snapshot.scopedAttendanceRate)}%`} sub="등록 대비 실참석 비율" color={ds.amber} bg={ds.amberSoft} compact={isCompact} />
              <MetricCard icon={Wallet} label="승인 결제액" value={formatCompactWon(snapshot.approvedPaymentAmount)} sub={`승인 결제 ${formatNumber(snapshot.approvedPaymentCount)}건`} color={ds.violet} bg={ds.violetSoft} compact={isCompact} />
              <MetricCard icon={RotateCcw} label="환불 요청" value={formatNumber(snapshot.requestedRefundCount)} sub={`환불 완료 ${formatNumber(snapshot.completedRefundCount)}건`} color={ds.red} bg={ds.redSoft} compact={isCompact} />
            </>
          ) : (
            <>
              <MetricCard icon={CalendarDays} label="전체 행사" value={formatNumber(snapshot.totalEventCount)} sub={`예정 ${formatNumber(snapshot.summary.plannedCount)} · 종료 ${formatNumber(snapshot.summary.endedCount)}`} color={ds.brand} bg={ds.brandSoft} compact={isCompact} />
              <MetricCard icon={Radio} label="진행 중 행사" value={formatNumber(snapshot.summary.ongoingCount)} sub={`취소 ${formatNumber(snapshot.summary.cancelledCount)}건 포함`} color={ds.green} bg={ds.greenSoft} compact={isCompact} />
              <MetricCard icon={Users} label="오늘 체크인" value={formatNumber(snapshot.summary.todayCheckinCount)} sub="실시간 체크인 누적 기준" color={ds.sky} bg={ds.skySoft} compact={isCompact} />
              <MetricCard icon={Wallet} label="승인 결제액" value={formatCompactWon(snapshot.approvedPaymentAmount)} sub={`승인 결제 ${formatNumber(snapshot.approvedPaymentCount)}건`} color={ds.violet} bg={ds.violetSoft} compact={isCompact} />
              <MetricCard icon={RotateCcw} label="환불 요청" value={formatNumber(snapshot.requestedRefundCount)} sub={`환불 완료 ${formatNumber(snapshot.completedRefundCount)}건`} color={ds.amber} bg={ds.amberSoft} compact={isCompact} />
            </>
          )}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: isCompact ? "1fr" : "minmax(0, 1fr) 300px", gap: 14, marginBottom: 14 }}>
        <SectionCard
          title="실시간 혼잡 추이"
          subtitle={congestionSubtitle}
          compact={isCompact}
          handset={isHandset}
            action={(
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", justifyContent: isHandset ? "flex-start" : "flex-end", width: isHandset ? "100%" : "auto" }}>
                {selectedScope &&
                (snapshot.focusEvent?.status === "ONGOING" ||
                  snapshot.focusEvent?.status === "PLANNED") ? (
                  <input
                    type="date"
                    value={effectiveCongestionDate}
                    min={focusEventStartDate || undefined}
                    max={focusEventEndDate || undefined}
                    onChange={(event) => {
                      setSelectedCongestionDate(event.target.value);
                    }}
                    style={{
                      height: 30,
                      padding: "0 8px",
                      borderRadius: 8,
                      border: `1px solid ${ds.line}`,
                      background: ds.card,
                      color: ds.ink,
                      fontSize: 12,
                      fontFamily: ds.ff,
                    }}
                  />
                ) : null}
                {isAllEventCongestionView ? (
                  <Pill color={ds.green} bg={ds.greenSoft}>
                    {congestionGraphScope}
                  </Pill>
                ) : topBooth ? (
                  <Pill color={topBooth.state.c} bg={topBooth.state.bg}>
                    최고 혼잡 {topBooth.placeName} {topBooth.congestionLevel}%
                  </Pill>
                ) : null}
              </div>
            )}
          >
            {isAllEventCongestionView ? (
              <>
                <div style={{ display: "grid", gridTemplateColumns: isHandset ? "1fr" : "repeat(3, minmax(0, 1fr))", gap: 10, marginBottom: 14 }}>
                  <div style={{ background: ds.bg, borderRadius: 10, padding: "12px 14px" }}>
                    <div style={{ fontSize: 11, color: ds.ink4, marginBottom: 6 }}>현재 실시간 혼잡도</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: ds.ink }}>
                      {formatNumber(snapshot.allEventRealtimeSummary.current || snapshot.allEventCongestionSummary.average)}%
                    </div>
                  </div>
                  <div style={{ background: ds.bg, borderRadius: 10, padding: "12px 14px" }}>
                    <div style={{ fontSize: 11, color: ds.ink4, marginBottom: 6 }}>최고 혼잡도</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: ds.ink }}>
                      {formatNumber(snapshot.allEventRealtimeSummary.peak || snapshot.allEventCongestionSummary.peak)}%
                    </div>
                  </div>
                  <div style={{ background: ds.bg, borderRadius: 10, padding: "12px 14px" }}>
                    <div style={{ fontSize: 11, color: ds.ink4, marginBottom: 6 }}>집계 행사</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: ds.ink }}>
                      {formatNumber(snapshot.allEventRealtimeSummary.eventCount || snapshot.allEventCongestionSummary.eventCount)}
                    </div>
                  </div>
                </div>
                {snapshot.allEventCongestionChartData.length > 0 ? (
                  <>
                    <ResponsiveContainer width="100%" height={260}>
                      <LineChart data={snapshot.allEventCongestionChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke={ds.lineSoft} vertical={false} />
                        <XAxis dataKey="label" tick={{ fontSize: 11, fill: ds.ink4 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: ds.ink4 }} axisLine={false} tickLine={false} width={34} domain={[0, 100]} tickFormatter={(value) => `${value}%`} />
                        <Tooltip content={<ChartTip suffix="%" light showName />} />
                        {snapshot.allEventCongestionLines.map((line) => (
                          <Line
                            key={line.eventId}
                            type="monotoneX"
                            dataKey={`event_${line.eventId}`}
                            name={line.eventName}
                            stroke={line.color}
                            strokeWidth={2}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            dot={false}
                            activeDot={{ r: 3.2, fill: line.color, stroke: line.color, strokeWidth: 0 }}
                            connectNulls
                          />
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 12 }}>
                      {snapshot.allEventCongestionLines.map((line) => (
                        <div
                          key={line.eventId}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                            padding: "6px 10px",
                            borderRadius: 999,
                            background: ds.bg,
                            border: `1px solid ${ds.line}`,
                            fontSize: 11.5,
                            color: ds.ink3,
                            fontWeight: 700,
                          }}
                        >
                          <span style={{ width: 8, height: 8, borderRadius: "50%", background: line.color, flexShrink: 0 }} />
                          <span>{line.eventName}</span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <ChartEmpty title="표시할 혼잡 추이가 없습니다." description="진행 중 또는 최근 행사 데이터가 누적되면 자동으로 반영됩니다." />
                )}
              </>
            ) : snapshot.focusCongestion.length > 0 ? (
              <>
                {showPlannedPrediction && snapshot.plannedDailyCongestion?.length > 0 ? (
                  <div style={{ marginBottom: 16, padding: "12px 14px", borderRadius: 10, background: ds.bg, border: `1px solid ${ds.lineSoft}` }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: ds.ink3, marginBottom: 8 }}>
                      행사 기간 일별 평균 혼잡도
                    </div>
                    <ResponsiveContainer width="100%" height={180}>
                      <LineChart data={snapshot.plannedDailyCongestion}>
                        <CartesianGrid strokeDasharray="3 3" stroke={ds.lineSoft} vertical={false} />
                        <XAxis
                          dataKey="label"
                          tick={{ fontSize: 11, fill: ds.ink4 }}
                          axisLine={false}
                          tickLine={false}
                          interval="preserveStartEnd"
                          minTickGap={18}
                        />
                        <YAxis tick={{ fontSize: 11, fill: ds.ink4 }} axisLine={false} tickLine={false} width={34} domain={[0, 100]} tickFormatter={(value) => `${value}%`} />
                        <Tooltip content={<ChartTip suffix="%" light showName />} />
                        <Line
                          type="monotoneX"
                          dataKey="lightgbm"
                          name="LightGBM"
                          stroke={ds.amber}
                          strokeWidth={2}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          dot={false}
                          activeDot={{ r: 3, fill: ds.amber, stroke: ds.amber, strokeWidth: 0 }}
                          connectNulls
                        />
                          <Line
                            type="monotoneX"
                            dataKey="lstm"
                            name="LSTM"
                            stroke={ds.violet}
                            strokeWidth={2.4}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeDasharray="6 4"
                            dot={false}
                            activeDot={{ r: 3, fill: ds.violet, stroke: ds.violet, strokeWidth: 0 }}
                            connectNulls
                          />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ) : null}
                <div style={{ display: "grid", gridTemplateColumns: isHandset ? "1fr" : "repeat(4, minmax(0, 1fr))", gap: 10, marginBottom: 14 }}>
                  <div style={{ background: ds.bg, borderRadius: 10, padding: "12px 14px" }}>
                    <div style={{ fontSize: 11, color: ds.ink4, marginBottom: 6 }}>
                      현재 실시간 혼잡도
                    </div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: ds.ink }}>
                      {formatNumber(snapshot.focusRealtimeSummary?.current || 0)}%
                    </div>
                  </div>
                  <div style={{ background: ds.bg, borderRadius: 10, padding: "12px 14px" }}>
                    <div style={{ fontSize: 11, color: ds.ink4, marginBottom: 6 }}>
                      {snapshot.isPredictionCongestionView ? "예상 평균 혼잡도" : "평균 혼잡도"}
                    </div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: ds.ink }}>
                      {formatNumber(average(snapshot.focusCongestion.map((row) => ({ value: row.lightgbm ?? 0 }))))}%
                    </div>
                  </div>
                  <div style={{ background: ds.bg, borderRadius: 10, padding: "12px 14px" }}>
                    <div style={{ fontSize: 11, color: ds.ink4, marginBottom: 6 }}>
                      {snapshot.isPredictionCongestionView ? "예상 최대 혼잡도" : "최고 혼잡도"}
                    </div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: ds.ink }}>
                      {formatNumber(Math.max(...snapshot.focusCongestion.map((row) => Number(row.lightgbm) || 0)))}%
                    </div>
                  </div>
                  <div style={{ background: ds.bg, borderRadius: 10, padding: "12px 14px" }}>
                    <div style={{ fontSize: 11, color: ds.ink4, marginBottom: 6 }}>
                      {snapshot.isPredictionCongestionView ? "예측 시간 포인트" : "집계 시간 포인트"}
                    </div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: ds.ink }}>
                      {formatNumber(snapshot.focusCongestion.length)}
                    </div>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={snapshot.focusCongestion}>
                    <CartesianGrid strokeDasharray="3 3" stroke={ds.lineSoft} vertical={false} />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 11, fill: ds.ink4 }}
                      axisLine={false}
                      tickLine={false}
                      interval="preserveStartEnd"
                      minTickGap={18}
                    />
                    <YAxis tick={{ fontSize: 11, fill: ds.ink4 }} axisLine={false} tickLine={false} width={34} domain={[0, 100]} tickFormatter={(value) => `${value}%`} />
                    <Tooltip content={<ChartTip suffix="%" light showName />} />
                    <Line
                      type="monotoneX"
                      dataKey="lightgbm"
                      name={snapshot.isPredictionCongestionView ? "LightGBM" : "혼잡도"}
                      stroke={ds.amber}
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      dot={false}
                      activeDot={{ r: 3.2, fill: ds.amber, stroke: ds.amber, strokeWidth: 0 }}
                      connectNulls
                    />
                    {snapshot.isPredictionCongestionView ? (
                      <Line
                        type="monotoneX"
                        dataKey="lstm"
                        name="LSTM"
                        stroke={ds.violet}
                        strokeWidth={2.4}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeDasharray="6 4"
                        dot={false}
                        activeDot={{ r: 3, fill: ds.violet, stroke: ds.violet, strokeWidth: 0 }}
                        connectNulls
                      />
                    ) : null}
                  </LineChart>
                </ResponsiveContainer>
              </>
            ) : (
              <ChartEmpty
                title="표시할 혼잡 추이가 없습니다."
                description={
                  isSelectedPlannedEvent && !showPlannedPrediction
                    ? "좌측의 일별 혼잡도 예측 버튼을 눌러 행사일 기준 예측을 조회해 주세요."
                    : "행사를 선택하면 자동으로 반영됩니다."
                }
              />
            )}
          </SectionCard>

          <SectionCard title={selectedScope ? "선택 행사 운영 성과" : "참가 성과 상위 행사"} subtitle={selectedScope ? "등록 · 체크인 · 노쇼 요약" : "승인 등록 대비 체크인율 기준"} compact={isCompact} handset={isHandset}>
            {selectedScope ? (
              snapshot.selectedPerformance ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, marginBottom: 8 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 700, color: ds.ink }}>{snapshot.focusEvent.eventName}</div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: ds.amber }}>{snapshot.scopedAttendanceRate}%</div>
                    </div>
                    <Bar2 pct={snapshot.scopedAttendanceRate} color={ds.amber} h={7} />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: isHandset ? "1fr" : "repeat(2, minmax(0, 1fr))", gap: 10 }}>
                    {[
                      { label: "승인 등록", value: formatNumber(snapshot.scopedRegistrationCount) },
                      { label: "체크인", value: formatNumber(snapshot.scopedCheckinCount) },
                      { label: "노쇼", value: formatNumber(snapshot.scopedNoShowCount) },
                      { label: "승인 결제", value: formatNumber(snapshot.approvedPaymentCount) },
                    ].map((item) => (
                      <div key={item.label} style={{ background: ds.bg, borderRadius: 10, padding: "12px 14px" }}>
                        <div style={{ fontSize: 11, color: ds.ink4, marginBottom: 6 }}>{item.label}</div>
                        <div style={{ fontSize: 19, fontWeight: 800, color: ds.ink }}>{item.value}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <ChartEmpty title="선택 행사 운영 성과가 없습니다." description="등록 승인 또는 체크인 데이터가 누적되면 여기에서 비교할 수 있습니다." />
              )
            ) : snapshot.eventPerformance.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {snapshot.eventPerformance.slice(0, 5).map((event) => (
                  <div key={event.eventId}>
                    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, marginBottom: 8 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 700, color: ds.ink, minWidth: 0 }}>{event.eventName}</div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: ds.brand, flexShrink: 0 }}>{event.attendanceRate}%</div>
                    </div>
                    <Bar2 pct={event.attendanceRate} color={ds.brand} h={7} />
                    <div style={{ marginTop: 7, display: "flex", justifyContent: "space-between", fontSize: 11, color: ds.ink4 }}>
                      <span>등록 {formatNumber(event.approvedRegistrationCount)} · 체크인 {formatNumber(event.checkinCount)}</span>
                      <span>노쇼 {formatNumber(event.noShowCount)}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <ChartEmpty title="행사 성과 데이터가 없습니다." description="등록 승인과 체크인 데이터가 누적되면 여기에서 비교할 수 있습니다." />
            )}
          </SectionCard>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: isCompact ? "1fr" : "minmax(0, 1fr) 300px", gap: 14 }}>
          <SectionCard title="연도별 운영 추이" subtitle="플랫폼 전체 기준 행사 수 · 승인 등록 · 환불 요청" compact={isCompact} handset={isHandset}>
            {hasTrendData ? (
              <>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={snapshot.operationsTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke={ds.lineSoft} vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: ds.ink4 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: ds.ink4 }} axisLine={false} tickLine={false} width={38} allowDecimals={false} />
                    <Tooltip content={<ChartTip suffix="건" light />} />
                    <Line type="monotone" dataKey="eventCount" stroke={ds.amber} strokeWidth={3} dot={{ r: 3, fill: ds.amber }} activeDot={{ r: 5 }} name="행사 수" />
                    <Line type="monotone" dataKey="approvedRegistrationCount" stroke={ds.sky} strokeWidth={2.2} dot={{ r: 2.5, fill: ds.sky }} activeDot={{ r: 4 }} name="승인 등록" />
                    <Line type="monotone" dataKey="refundRequestCount" stroke={ds.brand} strokeWidth={2.2} dot={{ r: 2.5, fill: ds.brand }} activeDot={{ r: 4 }} name="환불 요청" />
                  </LineChart>
                </ResponsiveContainer>
                <div style={{ display: "flex", justifyContent: "center", gap: 18, marginTop: 10, fontSize: 11.5, color: ds.ink3, flexWrap: "wrap" }}>
                  {[
                    { label: "행사 수", color: ds.amber },
                    { label: "승인 등록", color: ds.sky },
                    { label: "환불 요청", color: ds.brand },
                  ].map((item) => (
                    <span key={item.label} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: item.color }} />
                      {item.label}
                    </span>
                  ))}
                </div>
              </>
            ) : (
              <ChartEmpty title="연도별 운영 추이를 표시할 데이터가 없습니다." description="행사 또는 결제/환불 이력이 누적되면 자동으로 시각화됩니다." />
            )}
          </SectionCard>

          <SectionCard title="결제/환불 상태" subtitle={`결제 ${formatNumber(snapshot.paymentStatusRows.reduce((sum, row) => sum + row.count, 0))}건 · 환불 ${formatNumber(snapshot.refundStatusRows.reduce((sum, row) => sum + row.count, 0))}건`} compact={isCompact} handset={isHandset}>
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: ds.ink3, marginBottom: 12 }}>환불 처리 흐름</div>
                {snapshot.refundDonutRows.length > 0 ? (
                  <div style={{ display: "flex", flexDirection: isHandset ? "column" : "row", alignItems: isHandset ? "stretch" : "center", gap: 14 }}>
                    <div style={{ width: 112, height: 112, flexShrink: 0 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={snapshot.refundDonutRows} dataKey="value" innerRadius={30} outerRadius={50} stroke="none" paddingAngle={2}>
                            {snapshot.refundDonutRows.map((row) => (
                              <Cell key={row.status} fill={row.color} />
                            ))}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
                      {snapshot.refundDonutRows.map((row) => (
                        <div key={row.status} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ width: 8, height: 8, borderRadius: "50%", background: row.color, flexShrink: 0 }} />
                          <span style={{ flex: 1, fontSize: 12, color: ds.ink3, fontWeight: 600 }}>{row.label}</span>
                          <span style={{ fontSize: 12, color: ds.ink, fontWeight: 700, flexShrink: 0 }}>{formatNumber(row.count)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <ChartEmpty title="환불 이력이 없습니다." description="환불 요청이 발생하면 상태 분포가 자동으로 반영됩니다." />
                )}
              </div>

              <div style={{ borderTop: `1px solid ${ds.line}` }} />

              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: ds.ink3, marginBottom: 12 }}>결제 상태 분포</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {snapshot.paymentStatusRows.map((row) => (
                    <div key={row.status}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 6 }}>
                        <span style={{ fontSize: 12, color: ds.ink3, fontWeight: 600 }}>{row.label}</span>
                        <span style={{ fontSize: 12, color: ds.ink, fontWeight: 700 }}>{formatNumber(row.count)}</span>
                      </div>
                      <Bar2 pct={row.pct} color={row.color} h={6} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </SectionCard>
        </div>
      </div>

      <div style={{ width: isCompact ? "100%" : 280, flexShrink: 0, display: "flex", flexDirection: "column", gap: 14 }}>
        <SectionCard title="운영 알림" subtitle="지금 확인이 필요한 운영 신호" compact={isCompact} handset={isHandset}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {snapshot.alerts.map((alert, index) => {
              const Icon = alert.icon;
              return (
                <div key={`${alert.message}-${index}`} style={{ display: "flex", gap: 10 }}>
                  <div style={{ width: 30, height: 30, borderRadius: 8, background: alert.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Icon size={14} color={alert.color} strokeWidth={2.2} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: ds.ink2, lineHeight: 1.4 }}>{alert.message}</div>
                    <div style={{ fontSize: 11, color: ds.ink4, marginTop: 3 }}>{alert.detail}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </SectionCard>

        <SectionCard title="진행 중 행사" subtitle={`현재 운영 중 ${formatNumber(snapshot.liveEvents.length)}건`} action={snapshot.liveEvents.length > 0 ? <Pill color={ds.green} bg={ds.greenSoft}>라이브</Pill> : null} compact={isCompact} handset={isHandset}>
          {snapshot.liveEvents.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {snapshot.liveEvents.slice(0, 5).map((event) => {
                const status = EVENT_STATUS_META[event.status] || EVENT_STATUS_META.ONGOING;
                return (
                  <div key={event.eventId} style={{ paddingBottom: 12, borderBottom: `1px solid ${ds.lineSoft}` }}>
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 12.5, fontWeight: 700, color: ds.ink, lineHeight: 1.4 }}>{event.eventName}</div>
                        <div style={{ fontSize: 11, color: ds.ink4, marginTop: 4 }}>{formatDateRange(event.startAt, event.endAt)}</div>
                      </div>
                      <Pill color={status.color} bg={status.bg}>{status.label}</Pill>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <ChartEmpty title="진행 중 행사가 없습니다." description="운영 상태가 ONGOING인 행사가 생기면 자동으로 표시됩니다." />
          )}
        </SectionCard>

        <SectionCard title="최근 관리자 활동" subtitle="최근 로그 5건 기준" action={snapshot.recentLogs.length > 0 ? <Pill color={ds.sky} bg={ds.skySoft}>LIVE</Pill> : null} compact={isCompact} handset={isHandset}>
          {snapshot.recentLogs.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {snapshot.recentLogs.map((log) => (
                <div key={log.logId} style={{ display: "flex", gap: 10, paddingBottom: 12, borderBottom: `1px solid ${ds.lineSoft}` }}>
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: log.failed ? ds.redSoft : ds.skySoft, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    {log.failed ? (
                      <Bell size={13} color={ds.red} strokeWidth={2.2} />
                    ) : (
                      <Activity size={13} color={ds.sky} strokeWidth={2.2} />
                    )}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: ds.ink2, lineHeight: 1.4 }}>{log.actionLabel}</div>
                    <div style={{ fontSize: 11, color: ds.ink4, marginTop: 3 }}>
                      {log.adminName || "관리자"} · {formatRelativeTime(log.createdAt)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <ChartEmpty title="관리자 활동 로그가 없습니다." description="관리자 작업이 기록되면 여기에서 바로 확인할 수 있습니다." />
          )}
        </SectionCard>
      </div>
    </div>
  );
}
