import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import PageLoading from "../components/PageLoading";
import EmptyState from "../components/EmptyState";
import {
  Radio,
  Signal,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  MapPin,
  Search,
} from "lucide-react";
import { axiosInstance } from "../../../app/http/axiosInstance";
import { eventApi } from "../../../app/http/eventApi";
import { programApi } from "../../../app/http/programApi";
import { aiApi } from "../../../app/http/aiApi";
import { normalizePrediction } from "./aiCongestionViewModel";
import { adminRealtimeApi } from "../../../app/http/adminRealtimeApi";
import { useAutoRefresh } from "./useRealtimeAnimations";

const STATUS_CONFIG = {
  live: {
    label: "LIVE",
    color: "#ef4444",
    bg: "#fef2f2",
    border: "#fecaca",
  },
  upcoming: {
    label: "\uC608\uC815",
    color: "#90C450",
    bg: "#E6F7F2",
    border: "#CCF0E4",
  },
  ended: {
    label: "\uC885\uB8CC",
    color: "#6b7280",
    bg: "#f3f4f6",
    border: "#e5e7eb",
  },
  cancelled: {
    label: "\uCDE8\uC18C",
    color: "#b91c1c",
    bg: "#fef2f2",
    border: "#fecaca",
  },
};

const EVENT_VIEW_BUTTONS = [
  { key: "dashboard", label: "통합현황", path: "/realtime/dashboard", color: "#90C450" },
  { key: "waiting", label: "대기현황", path: "/realtime/waitingstatus", color: "#e67e22" },
  { key: "checkin", label: "체크인현황", path: "/realtime/checkinstatus", color: "#0ea5e9" },
  { key: "vote", label: "투표현황", path: "/realtime/votestatus", color: "#8b5cf6" },
];

const selectorStyles = `
  @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.min.css');

  .rte-selector {
    max-width: 1400px;
    margin: 0 auto;
    font-family: 'Pretendard Variable', 'Pretendard', -apple-system, sans-serif;
    --rte-accent: #90C450;
    --rte-accent-light: rgba(78,86,231,0.08);
    --rte-live-dot: #ef4444;
    --rte-upcoming-dot: #90C450;
  }
  .rte-selector *, .rte-selector *::before, .rte-selector *::after {
    box-sizing: border-box;
    font-family: inherit;
  }

  /* ── 툴바 (필터탭 + 검색 한 줄) ── */
  .rte-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
    flex-wrap: wrap;
    margin-bottom: 18px;
  }
  .rte-toolbar-left {
    display: flex;
    align-items: center;
    gap: 0;
    background: #fff;
    border: 1px solid #e2e5ea;
    border-radius: 12px;
    height: 48px;
    min-width: 0;
    flex: 0 0 auto;
    width: 420px;
    transition: border-color 0.15s, box-shadow 0.15s;
  }
  .rte-toolbar-left:focus-within {
    border-color: #111827;
    box-shadow: 0 0 0 2px rgba(17,24,39,0.08);
  }
  .rte-dropdown { position: relative; flex: 0 0 auto; }
  .rte-dropdown-btn {
    height: 48px; padding: 0 36px 0 18px; border-radius: 12px 0 0 12px;
    border: none; background: transparent; color: #9ca3af; font-size: 14px; font-weight: 500;
    cursor: pointer; text-align: left; outline: none; font-family: inherit;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .rte-dropdown-arrow {
    position: absolute; right: 12px; top: 50%; transform: translateY(-50%);
    color: #9ca3af; pointer-events: none; transition: transform .15s ease;
  }
  .rte-dropdown-arrow.open { transform: translateY(-50%) rotate(180deg); }
  .rte-dropdown-divider {
    width: 1px; height: 20px; background: #dbe2ea; flex-shrink: 0;
  }
  .rte-dropdown-list {
    position: absolute; top: calc(100% + 8px); left: 0; min-width: 280px;
    background: #fff; border-radius: 16px; padding: 8px 0;
    box-shadow: 0 4px 24px rgba(0,0,0,0.10); z-index: 50;
    max-height: 280px; overflow-y: auto;
  }
  .rte-dropdown-item {
    display: flex; align-items: center; gap: 10px;
    width: 100%; padding: 11px 16px; border: none; background: none;
    font-size: 13px; font-weight: 500; color: #6b7280; cursor: pointer;
    text-align: left; transition: background .1s ease; font-family: inherit;
  }
  .rte-dropdown-item:hover { background: #f9fafb; }
  .rte-dropdown-item.active { color: #111827; font-weight: 600; }
  .rte-dropdown-item .dd-icon { color: #9ca3af; flex-shrink: 0; }
  .rte-search-wrap {
    position: relative;
    flex: 1;
    height: 100%;
    min-width: 0;
  }
  .rte-search-input {
    width: 100%;
    height: 100%;
    padding: 0 16px 0 40px;
    border-radius: 0 12px 12px 0;
    border: none;
    background: transparent;
    color: #111827;
    font-size: 14px;
    font-weight: 500;
    outline: none;
    font-family: inherit;
  }
  .rte-search-input::placeholder { color: #9ca3af; font-size: 13px; font-weight: 500; font-family: inherit; }
  .rte-search-icon {
    position: absolute;
    left: 14px;
    top: 50%;
    transform: translateY(-50%);
    color: #9ca3af;
    pointer-events: none;
  }

  /* ── 필터 탭 ── */
  .rte-filter-tabs {
    display: flex;
    align-items: center;
    gap: 0;
    border: 1px solid #e5e7eb;
    border-radius: 12px;
    overflow: hidden;
  }
  .rte-filter-tab {
    height: 44px; padding: 0 22px; border: none;
    background: transparent; color: #6b7280; font-size: 14px; font-weight: 600;
    cursor: pointer; transition: all 0.15s; font-family: inherit;
    white-space: nowrap; display: inline-flex; align-items: center; gap: 6px;
  }
  .rte-filter-tab + .rte-filter-tab { border-left: 1px solid #e5e7eb; }
  .rte-filter-tab:hover { color: #111827; background: #f9fafb; }
  .rte-filter-tab.active {
    background: #1f2937;
    color: #fff;
  }
  .rte-filter-count {
    font-size: 11px;
    font-weight: 700;
    min-width: 20px;
    height: 20px;
    border-radius: 100px;
    display: flex; align-items: center; justify-content: center;
    background: rgba(0,0,0,0.06);
  }
  .rte-filter-tab.active .rte-filter-count {
    background: rgba(255,255,255,0.2);
  }

  /* ── 리스트 ── */
  .rte-event-list {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  /* ── 행 (카드) ── */
  .rte-row {
    display: flex;
    flex-direction: column;
    padding: 32px 36px;
    background: #fff;
    border: 1px solid #e5e7eb;
    border-radius: 16px;
    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    opacity: 0;
    transform: translateY(4px);
    animation: rte-row-in 0.3s ease forwards;
    box-shadow: 0 1px 4px rgba(0,0,0,0.03);
    position: relative;
  }

  /* ── 종료 행사 ── */
  .rte-row.ended {
    background: #e8eaed;
    border-color: #d1d5db;
    cursor: default;
    box-shadow: none;
  }
  .rte-row.ended .rte-status-label { color: #9ca3af !important; }
  .rte-row.ended .rte-name { color: #9ca3af; }
  .rte-row.ended .rte-meta-text { color: #c5c9cf; }
  .rte-row.ended:hover {
    background: #e8eaed;
    border-color: #d1d5db;
  }

  /* ── hover 시 효과 (부드러운 다크 전환) ── */
  .rte-row:not(.ended):hover {
    background: #222a4e;
    border-color: transparent;
    box-shadow: 0 8px 32px rgba(30,37,72,0.22);
    transform: translateY(-2px);
  }
  .rte-row:not(.ended):hover .rte-status-label { color: rgba(255,255,255,0.7) !important; }
  .rte-row:not(.ended):hover .rte-live-dot { box-shadow: 0 0 12px rgba(255,255,255,0.5); }
  .rte-row:not(.ended):hover .rte-upcoming-dot { box-shadow: 0 0 12px rgba(255,255,255,0.4); }
  .rte-row:not(.ended):hover .rte-name { color: #fff; }
  .rte-row:not(.ended):hover .rte-new-badge { background: rgba(255,255,255,0.2); }
  .rte-row:not(.ended):hover .rte-meta-text { color: rgba(255,255,255,0.45); }
  .rte-row:not(.ended):hover .rte-metric-card {
    background: rgba(255,255,255,0.07);
    border-color: rgba(255,255,255,0.1);
  }
  .rte-row:not(.ended):hover .rte-metric-card-num { color: #fff !important; }
  .rte-row:not(.ended):hover .rte-metric-card-label { color: rgba(255,255,255,0.5); }
  .rte-row:not(.ended):hover .rte-metric-card-unit { color: rgba(255,255,255,0.4); }
  .rte-row:not(.ended):hover .rte-metric-bar { background: rgba(255,255,255,0.1); }
  .rte-row:not(.ended):hover .rte-metric-bar-fill { opacity: 0.85; }

  /* ── 뷰 버튼 (카드 하단) ── */
  .rte-view-links {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 10px;
    margin-top: 22px;
    padding-top: 20px;
    border-top: 1px solid #f0f0f0;
  }
  .rte-view-link {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 13px 10px;
    border-radius: 12px;
    border: 1px solid #e2e5ea;
    background: #f8f9fc;
    font-size: 14px;
    font-weight: 700;
    color: #4b5563;
    cursor: pointer;
    transition: all 0.2s ease;
    font-family: inherit;
    white-space: nowrap;
  }
  .rte-view-link .rte-vl-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    flex-shrink: 0;
    transition: all 0.2s ease;
  }
  .rte-view-link .rte-vl-arrow {
    color: #c5c9cf;
    transition: all 0.2s ease;
    flex-shrink: 0;
  }
  .rte-view-link:hover {
    background: #111827;
    color: #fff;
    border-color: #111827;
    transform: translateY(-1px);
    box-shadow: 0 3px 10px rgba(0,0,0,0.12);
  }
  .rte-view-link:hover .rte-vl-dot { background: #fff !important; }
  .rte-view-link:hover .rte-vl-arrow { color: rgba(255,255,255,0.6); transform: translateX(2px); }
  .rte-view-link:active { transform: translateY(0); }
  .rte-row:not(.ended):hover .rte-view-links { border-top-color: rgba(255,255,255,0.12); }
  .rte-row:not(.ended):hover .rte-view-link {
    background: rgba(255,255,255,0.1);
    border-color: rgba(255,255,255,0.18);
    color: rgba(255,255,255,0.75);
  }
  .rte-row:not(.ended):hover .rte-view-link .rte-vl-arrow { color: rgba(255,255,255,0.3); }
  .rte-row:not(.ended):hover .rte-view-link:hover {
    background: rgba(255,255,255,0.22);
    border-color: rgba(255,255,255,0.4);
    color: #fff;
    box-shadow: none;
    transform: translateY(-1px);
  }
  .rte-row:not(.ended):hover .rte-view-link:hover .rte-vl-dot { background: #fff !important; }
  .rte-row:not(.ended):hover .rte-view-link:hover .rte-vl-arrow { color: #fff; }
  .rte-row.ended .rte-view-links { opacity: 0.35; pointer-events: none; }

  /* ── 상단: 상태 + 이름 ── */
  .rte-left {
    flex: 1;
    min-width: 0;
  }
  .rte-status-label {
    font-size: 14px;
    font-weight: 800;
    margin-bottom: 10px;
    display: flex;
    align-items: center;
    gap: 8px;
    letter-spacing: 0.03em;
  }
  .rte-live-dot {
    width: 10px; height: 10px;
    border-radius: 50%;
    background: var(--rte-live-dot);
    box-shadow: 0 0 8px var(--rte-live-dot);
    animation: rte-pulse 1.6s ease-in-out infinite;
  }
  .rte-upcoming-dot {
    width: 10px; height: 10px;
    border-radius: 50%;
    background: var(--rte-upcoming-dot);
    box-shadow: 0 0 8px var(--rte-upcoming-dot);
    animation: rte-blink 2.4s ease-in-out infinite;
  }
  @keyframes rte-pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.5; transform: scale(0.75); }
  }
  @keyframes rte-blink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.3; }
  }
  .rte-name {
    font-size: 28px;
    font-weight: 900;
    color: #111827;
    line-height: 1.25;
    letter-spacing: -0.02em;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .rte-new-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 3px 10px;
    border-radius: 999px;
    background: var(--rte-live-dot);
    color: #fff;
    font-size: 11px;
    font-weight: 800;
    flex-shrink: 0;
    letter-spacing: 0.04em;
  }
  .rte-meta-line {
    display: flex;
    align-items: center;
    gap: 16px;
    margin-top: 10px;
    font-size: 15px;
    color: #9ca3af;
    font-weight: 500;
  }
  .rte-meta-text {
    display: inline-flex;
    align-items: center;
    gap: 5px;
  }

  /* ── 지표 그리드 ── */
  .rte-metrics-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    gap: 12px;
    margin-top: 20px;
  }
  .rte-metric-card {
    border: 1px solid #ebebeb;
    border-radius: 14px;
    background: #fff;
    padding: 18px 20px;
  }
  .rte-metric-card.has-ring {
    display: flex;
    align-items: center;
    gap: 14px;
  }
  .rte-metric-card-info {
    flex: 1;
    min-width: 0;
  }
  .rte-metric-card-label {
    font-size: 13px;
    font-weight: 600;
    color: #9ca3af;
    margin-bottom: 6px;
  }
  .rte-metric-card-row {
    display: flex;
    align-items: baseline;
    gap: 3px;
  }
  .rte-metric-card.has-ring .rte-metric-card-row { justify-content: flex-start; }
  .rte-metric-card:not(.has-ring) .rte-metric-card-row { justify-content: center; }
  .rte-metric-card-num {
    font-size: 28px;
    font-weight: 900;
    color: #111827;
    font-variant-numeric: tabular-nums;
    line-height: 1;
    letter-spacing: -0.02em;
  }
  .rte-metric-card-unit {
    font-size: 14px;
    font-weight: 700;
    color: #9ca3af;
  }
  .rte-metric-bar {
    height: 6px;
    border-radius: 3px;
    background: #f0f1f3;
    margin-top: 10px;
    overflow: hidden;
  }
  .rte-metric-bar-fill {
    height: 100%;
    border-radius: 3px;
    transition: width 0.8s ease;
  }

  /* ── 중간: 태그 (hidden - merged into meta) ── */
  .rte-tags { display: none; }

  .rte-row.ended .rte-metric-card {
    background: #dcdfe3;
    border-color: #c5c9cf;
  }
  .rte-row.ended .rte-metric-card-num { color: #9ca3af; }
  .rte-row.ended .rte-metric-card-unit { color: #c5c9cf; }
  .rte-row.ended .rte-metric-card-label { color: #c5c9cf; }
  .rte-row.ended .rte-metric-bar { background: #e5e5e5; }
  .rte-row.ended .rte-metric-bar-fill { background: #c5c9cf !important; }

  /* ── legacy (hidden) ── */
  .rte-metrics { display: none; }

  /* ── 빈 상태 ── */
  .rte-empty {
    text-align: center;
    padding: 80px 20px;
    color: #9ca3af;
    border-top: 1px solid #ebebeb;
    border-bottom: 1px solid #ebebeb;
  }
  .rte-empty-icon {
    width: 52px; height: 52px;
    border-radius: 14px;
    background: #f8f9fc;
    display: flex; align-items: center; justify-content: center;
    margin: 0 auto 14px;
  }
  .rte-empty-text { font-size: 15px; font-weight: 700; color: #6b7280; }
  .rte-empty-sub { font-size: 13px; margin-top: 6px; }

  @keyframes rte-row-in {
    to { opacity: 1; transform: translateY(0); }
  }
  @media (max-width: 900px) {
    .rte-row { padding: 28px 24px; }
    .rte-name { font-size: 22px; }
    .rte-metrics-grid { grid-template-columns: repeat(2, 1fr); }
    .rte-view-links { grid-template-columns: repeat(2, 1fr); }
  }
  @media (max-width: 640px) {
    .rte-toolbar { flex-direction: column; align-items: stretch; gap: 10px; }
    .rte-toolbar-left { width: 100%; }
    .rte-filter-tabs { width: 100%; }
    .rte-filter-tab { flex: 1; justify-content: center; font-size: 13px; padding: 0 12px; height: 40px; }
    .rte-row { padding: 22px 18px; }
    .rte-name { font-size: 20px; white-space: normal; }
    .rte-meta-line { gap: 8px; font-size: 13px; flex-wrap: wrap; }
    .rte-metrics-grid { grid-template-columns: 1fr 1fr; gap: 8px; }
    .rte-metric-card { padding: 14px 12px; }
    .rte-metric-card-num { font-size: 22px; }
    .rte-view-links { grid-template-columns: 1fr 1fr; gap: 8px; }
    .rte-view-link { font-size: 13px; padding: 12px 10px; }
  }
`;

const unwrapData = (response, fallback) => response?.data?.data ?? response?.data ?? fallback;

const toArray = (payload) =>
  Array.isArray(payload?.content)
    ? payload.content
    : Array.isArray(payload)
      ? payload
      : [];

const toValidDate = (value) => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const toDateKey = (value) => {
  const date = toValidDate(value);
  if (!date) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const buildDateKeysFromRange = (startAt, endAt, maxDays = 60) => {
  const startDate = toValidDate(startAt);
  const endDate = toValidDate(endAt);
  if (!startDate || !endDate || endDate < startDate) return [];

  const cursor = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  const limit = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
  const keys = [];

  while (cursor <= limit && keys.length < maxDays) {
    keys.push(toDateKey(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  return keys;
};

const clipRangeByDate = (startAt, endAt, dateKey) => {
  const startDate = toValidDate(startAt);
  const endDate = toValidDate(endAt);
  const baseDate = toValidDate(`${dateKey}T00:00:00`);
  if (!startDate || !endDate || !baseDate || endDate < startDate) {
    return { startAt: null, endAt: null };
  }

  const dayStart = new Date(baseDate);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(baseDate);
  dayEnd.setHours(23, 59, 59, 999);

  if (endDate < dayStart || startDate > dayEnd) {
    return { startAt: null, endAt: null };
  }

  const clippedStart = startDate > dayStart ? startDate : dayStart;
  const clippedEnd = endDate < dayEnd ? endDate : dayEnd;
  return { startAt: clippedStart, endAt: clippedEnd };
};

const hasExplicitTimeRange = (startDate, endDate) => {
  if (!startDate || !endDate) return false;
  const isMidnight = (value) =>
    value.getHours() === 0 &&
    value.getMinutes() === 0 &&
    value.getSeconds() === 0 &&
    value.getMilliseconds() === 0;
  return !(isMidnight(startDate) && isMidnight(endDate));
};

const buildOperationRangeByDate = (startAt, endAt, dateKey) => {
  const clipped = clipRangeByDate(startAt, endAt, dateKey);
  if (!clipped.startAt || !clipped.endAt) return { startAt: null, endAt: null };

  const eventStart = toValidDate(startAt);
  const eventEnd = toValidDate(endAt);
  const baseDate = toValidDate(`${dateKey}T00:00:00`);
  if (!eventStart || !eventEnd || !baseDate) {
    return clipped;
  }
  if (!hasExplicitTimeRange(eventStart, eventEnd)) {
    return clipped;
  }

  const rangeStart = new Date(baseDate);
  rangeStart.setHours(eventStart.getHours(), 0, 0, 0);

  const rangeEnd = new Date(baseDate);
  rangeEnd.setHours(eventEnd.getHours(), 59, 59, 999);

  if (rangeEnd < rangeStart) {
    return clipped;
  }

  return {
    startAt: rangeStart,
    endAt: rangeEnd,
  };
};

const resolveEventAiRangeParams = (event, status) => {
  const dateOptions = buildDateKeysFromRange(event?.startAt, event?.endAt);
  if (dateOptions.length === 0) {
    return {};
  }

  const todayKey = toDateKey(new Date());
  const selectedDateKey = (() => {
    if (status === "active" && dateOptions.includes(todayKey)) {
      return todayKey;
    }
    if (status === "ended") {
      return dateOptions[dateOptions.length - 1];
    }
    return dateOptions[0];
  })();

  const operationRange = buildOperationRangeByDate(
    event?.startAt,
    event?.endAt,
    selectedDateKey,
  );

  if (!operationRange.startAt || !operationRange.endAt) {
    return {};
  }

  return {
    from: operationRange.startAt,
    to: operationRange.endAt,
  };
};

const congestionLevelToPercent = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return 0;
  return Math.min(Math.round(numeric * 20), 100);
};

const toCongestionLevelOrNull = (value) => {
  if (value === null || value === undefined || value === "") return null;
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
  if (numeric < 1 || numeric > 5) return null;
  return numeric;
};

const summarizeRealtimeCongestionPercent = (rows) => {
  const values = toArray(rows)
    .map((row) => toCongestionLevelOrNull(row?.congestionLevel))
    .filter((value) => value !== null)
    .map((level) => congestionLevelToPercent(level))
    .filter((value) => Number.isFinite(value));
  if (values.length === 0) return null;
  return Math.max(
    0,
    Math.min(
      100,
      Math.round(values.reduce((sum, value) => sum + value, 0) / values.length),
    ),
  );
};

const safePercent = (value) =>
  Math.max(0, Math.min(100, Math.round(Number(value) || 0)));

const resolveEventCongestionPercent = ({
  rawStatus,
  measuredAverage,
  hourlyAverage,
  aiAverage,
}) => {
  const normalizedStatus = String(rawStatus ?? "").toUpperCase();
  const isPlanned =
    normalizedStatus === "PLANNED" ||
    normalizedStatus === "PENDING" ||
    normalizedStatus === "UPCOMING";

  const measured = measuredAverage == null ? 0 : safePercent(measuredAverage);
  const hourly = hourlyAverage == null ? 0 : safePercent(hourlyAverage);
  const ai = aiAverage == null ? 0 : safePercent(aiAverage);

  if (isPlanned) {
    return safePercent(ai || 0);
  }
  if (measured > 0) {
    return measured;
  }
  if (ai > 0) {
    return ai;
  }
  if (hourly > 0) {
    return hourly;
  }
  return safePercent(ai || 0);
};

const hexToRgb = (hex) => {
  const value = String(hex || "").replace("#", "");
  if (value.length !== 6) return { r: 0, g: 0, b: 0 };
  return {
    r: parseInt(value.slice(0, 2), 16),
    g: parseInt(value.slice(2, 4), 16),
    b: parseInt(value.slice(4, 6), 16),
  };
};

const rgbToHex = (r, g, b) =>
  `#${Math.round(r).toString(16).padStart(2, "0")}${Math.round(g)
    .toString(16)
    .padStart(2, "0")}${Math.round(b).toString(16).padStart(2, "0")}`;

const rgbToHsl = (r, g, b) => {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const delta = max - min;
  let h = 0;
  const l = (max + min) / 2;
  let s = 0;

  if (delta !== 0) {
    s = delta / (1 - Math.abs(2 * l - 1));
    if (max === rn) h = ((gn - bn) / delta) % 6;
    else if (max === gn) h = (bn - rn) / delta + 2;
    else h = (rn - gn) / delta + 4;
    h *= 60;
    if (h < 0) h += 360;
  }

  return { h, s, l };
};

const hslToRgb = (h, s, l) => {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hp = h / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let r1 = 0;
  let g1 = 0;
  let b1 = 0;
  if (hp >= 0 && hp < 1) [r1, g1, b1] = [c, x, 0];
  else if (hp < 2) [r1, g1, b1] = [x, c, 0];
  else if (hp < 3) [r1, g1, b1] = [0, c, x];
  else if (hp < 4) [r1, g1, b1] = [0, x, c];
  else if (hp < 5) [r1, g1, b1] = [x, 0, c];
  else [r1, g1, b1] = [c, 0, x];
  const m = l - c / 2;
  return {
    r: (r1 + m) * 255,
    g: (g1 + m) * 255,
    b: (b1 + m) * 255,
  };
};

const blendHslColor = (startHex, endHex, ratio) => {
  const normalized = Math.max(0, Math.min(1, Number(ratio) || 0));
  const startRgb = hexToRgb(startHex);
  const endRgb = hexToRgb(endHex);
  const start = rgbToHsl(startRgb.r, startRgb.g, startRgb.b);
  const end = rgbToHsl(endRgb.r, endRgb.g, endRgb.b);

  const hueDiff = ((end.h - start.h + 540) % 360) - 180;
  const h = (start.h + hueDiff * normalized + 360) % 360;
  const s = start.s + (end.s - start.s) * normalized;
  const l = start.l + (end.l - start.l) * normalized;
  const rgb = hslToRgb(h, s, l);
  return rgbToHex(rgb.r, rgb.g, rgb.b);
};

const getCongestionValueColor = (value) => {
  if (!Number.isFinite(Number(value))) return "#d1d5db";
  const percent = Math.max(0, Math.min(100, Math.round(Number(value))));
  if (percent < 35) return "#22c55e"; // green
  if (percent < 70) return "#f59e0b"; // yellow/amber
  return "#ef4444"; // red
};

const formatDateRange = (startAt, endAt) => {
  const start = startAt ? new Date(startAt) : null;
  const end = endAt ? new Date(endAt) : null;
  const validStart = start && !Number.isNaN(start.getTime()) ? start : null;
  const validEnd = end && !Number.isNaN(end.getTime()) ? end : null;

  if (!validStart && !validEnd) return "\uC77C\uC815 \uC815\uBCF4 \uC5C6\uC74C";
  if (validStart && validEnd) {
    return `${validStart.getFullYear()}.${String(validStart.getMonth() + 1).padStart(2, "0")}.${String(validStart.getDate()).padStart(2, "0")} ~ ${validEnd.getFullYear()}.${String(validEnd.getMonth() + 1).padStart(2, "0")}.${String(validEnd.getDate()).padStart(2, "0")}`;
  }
  const target = validStart || validEnd;
  return `${target.getFullYear()}.${String(target.getMonth() + 1).padStart(2, "0")}.${String(target.getDate()).padStart(2, "0")}`;
};

const toAdminStatus = (status) => {
  const normalized = String(status ?? "").toUpperCase();
  if (normalized === "ONGOING") return "active";
  if (normalized === "ENDED" || normalized === "CANCELLED") return "ended";
  return "pending";
};

const toSelectorStatus = (status) => {
  const normalized = String(status ?? "").toUpperCase();
  if (normalized === "ONGOING") return "live";
  if (normalized === "ENDED") return "ended";
  if (normalized === "CANCELLED") return "cancelled";
  return "upcoming";
};

const SELECTOR_STATUS_ORDER = {
  live: 0,
  upcoming: 1,
  ended: 2,
  cancelled: 2,
};

const toSortDate = (value) => {
  const parsed = toValidDate(value);
  return parsed ? parsed.getTime() : null;
};

const compareNullableTime = (left, right, direction = "asc") => {
  if (left != null && right != null) {
    return direction === "asc" ? left - right : right - left;
  }
  if (left != null || right != null) {
    return left != null ? -1 : 1;
  }
  return 0;
};

const toSortId = (value) => {
  const numeric = Number(value);
  if (Number.isFinite(numeric)) return numeric;
  return Number(String(value ?? "").replace(/\D/g, "")) || 0;
};

const compareRealtimeEventsByPriority = (left, right) => {
  const leftRank = SELECTOR_STATUS_ORDER[left?.selectorStatus] ?? 99;
  const rightRank = SELECTOR_STATUS_ORDER[right?.selectorStatus] ?? 99;
  if (leftRank !== rightRank) return leftRank - rightRank;

  const leftStart = toSortDate(left?.startAt);
  const rightStart = toSortDate(right?.startAt);
  const leftEnd = toSortDate(left?.endAt);
  const rightEnd = toSortDate(right?.endAt);

  if (leftRank === 0) {
    const endCompare = compareNullableTime(leftEnd, rightEnd, "asc");
    if (endCompare !== 0) return endCompare;
    const startCompare = compareNullableTime(leftStart, rightStart, "asc");
    if (startCompare !== 0) return startCompare;
  } else if (leftRank === 1) {
    const startCompare = compareNullableTime(leftStart, rightStart, "asc");
    if (startCompare !== 0) return startCompare;
    const endCompare = compareNullableTime(leftEnd, rightEnd, "asc");
    if (endCompare !== 0) return endCompare;
  } else if (leftRank === 2) {
    const endCompare = compareNullableTime(leftEnd, rightEnd, "desc");
    if (endCompare !== 0) return endCompare;
    const startCompare = compareNullableTime(leftStart, rightStart, "desc");
    if (startCompare !== 0) return startCompare;
  }

  return toSortId(right?.eventId ?? right?.id) - toSortId(left?.eventId ?? left?.id);
};

const sortRealtimeEventsByPriority = (events = []) =>
  [...(Array.isArray(events) ? events : [])].sort(compareRealtimeEventsByPriority);

const FILTER_VALUES = new Set(["all", "live", "upcoming"]);

const normalizeFilterValue = (value) =>
  FILTER_VALUES.has(String(value)) ? String(value) : "all";

const EVENT_SELECTOR_CACHE_PREFIX = "realtime:event-selector:v1";
const EVENT_SELECTOR_CACHE_TTL_MILLIS = 5 * 60 * 1000;

const buildEventSelectorCacheKey = (metricType, programCategory) =>
  `${EVENT_SELECTOR_CACHE_PREFIX}:${metricType || "dashboard"}:${programCategory || "all"}`;

const readEventSelectorCache = (key) => {
  if (!key) return null;
  try {
    const raw = window.sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const ts = Number(parsed?.ts);
    if (!Number.isFinite(ts) || Date.now() - ts > EVENT_SELECTOR_CACHE_TTL_MILLIS) {
      return null;
    }
    const events = Array.isArray(parsed?.events) ? parsed.events : null;
    return events ? events : null;
  } catch {
    return null;
  }
};

const writeEventSelectorCache = (key, events) => {
  if (!key || !Array.isArray(events)) return;
  try {
    window.sessionStorage.setItem(
      key,
      JSON.stringify({
        ts: Date.now(),
        events,
      }),
    );
  } catch {
    // ignore storage failures
  }
};

async function fetchAdminData(url, params, fallback) {
  try {
    const response = await axiosInstance.get(url, {
      params,
    });
    return unwrapData(response, fallback);
  } catch {
    return fallback;
  }
}

const THEME_CONFIGS = {
  dashboard: { accent: "#90C450", liveDot: "#ef4444", upcomingDot: "#90C450" },
  waiting:   { accent: "#e67e22", liveDot: "#e67e22", upcomingDot: "#f59e0b" },
  checkin:   { accent: "#0ea5e9", liveDot: "#0ea5e9", upcomingDot: "#38bdf8" },
  vote:      { accent: "#8b5cf6", liveDot: "#8b5cf6", upcomingDot: "#a78bfa" },
};

const MiniRing = ({ percent, color, size = 52 }) => {
  const sw = 5;
  const r = (size - sw) / 2;
  const c = 2 * Math.PI * r;
  const p = Number.isFinite(percent) ? Math.max(0, Math.min(100, percent)) : 0;
  const offset = c * (1 - p / 100);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flexShrink: 0 }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#f0f1f3" strokeWidth={sw} />
      {p > 0 && (
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color || "#90C450"} strokeWidth={sw}
          strokeDasharray={c} strokeDashoffset={offset}
          strokeLinecap="round" transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: "stroke-dashoffset 0.8s ease" }} />
      )}
    </svg>
  );
};

const getMetricBarFill = (key, event) => {
  switch (key) {
    case "checkedIn": return event.registrations > 0 ? Math.min(100, Math.round(event.checkedIn / event.registrations * 100)) : 0;
    case "registrations": return Math.min(100, Math.max(8, Math.round(Math.sqrt(event.registrations) * 4)));
    case "avgWait": return event.avgWaitMin != null ? Math.min(100, Math.round(event.avgWaitMin * 3.3)) : 0;
    case "voteCount": return event.registrations > 0 && event.voteCount != null ? Math.min(100, Math.round(event.voteCount / event.registrations * 100)) : 0;
    case "programCount": return event.programCount != null ? Math.min(100, Math.max(8, Math.round(event.programCount * 5))) : 0;
    default: return 0;
  }
};

const METRIC_BAR_COLORS = {
  registrations: "#90C450",
  checkedIn: "#22c55e",
  avgWait: "#f59e0b",
  voteCount: "#8b5cf6",
  programCount: "#0ea5e9",
};

const METRIC_CONFIGS = {
  dashboard: [
    { key: "registrations", label: "사전등록", unit: "명", format: (e) => e.registrations.toLocaleString(), hideUpcoming: false },
    { key: "checkedIn", label: "체크인", unit: "명", format: (e) => e.status === "upcoming" ? "-" : e.checkedIn.toLocaleString(), hideUnit: (e) => e.status === "upcoming" },
    { key: "congestion", label: "혼잡도", unit: "%", format: (e) => e.congestion != null ? e.congestion : "-", hideUnit: (e) => e.congestion == null, color: (e) => e.congestion != null ? getCongestionValueColor(e.congestion) : undefined },
  ],
  waiting: [
    { key: "registrations", label: "대기자", unit: "명", format: (e) => e.waitingCount != null ? e.waitingCount.toLocaleString() : e.registrations.toLocaleString() },
    { key: "avgWait", label: "평균대기", unit: "분", format: (e) => e.avgWaitMin != null ? e.avgWaitMin : "-", hideUnit: (e) => e.avgWaitMin == null },
    { key: "congestion", label: "혼잡도", unit: "%", format: (e) => e.congestion != null ? e.congestion : "-", hideUnit: (e) => e.congestion == null, color: (e) => e.congestion != null ? getCongestionValueColor(e.congestion) : undefined },
  ],
  checkin: [
    { key: "registrations", label: "사전등록", unit: "명", format: (e) => e.registrations.toLocaleString() },
    { key: "checkedIn", label: "체크인", unit: "명", format: (e) => e.status === "upcoming" ? "-" : e.checkedIn.toLocaleString(), hideUnit: (e) => e.status === "upcoming" },
    { key: "checkinRate", label: "체크인율", unit: "%", format: (e) => e.registrations > 0 && e.status !== "upcoming" ? Math.round((e.checkedIn / e.registrations) * 100) : "-", hideUnit: (e) => e.registrations <= 0 || e.status === "upcoming", color: (e) => { if (e.registrations <= 0 || e.status === "upcoming") return undefined; const rate = Math.round((e.checkedIn / e.registrations) * 100); return rate >= 70 ? "#22c55e" : rate >= 40 ? "#f59e0b" : "#ef4444"; } },
  ],
  vote: [
    { key: "voteCount", label: "투표수", unit: "건", format: (e) => e.voteCount != null ? e.voteCount.toLocaleString() : "-", hideUnit: (e) => e.voteCount == null },
    { key: "voteRate", label: "참여율", unit: "%", format: (e) => e.voteRate != null ? e.voteRate : "-", hideUnit: (e) => e.voteRate == null },
    { key: "programCount", label: "프로그램", unit: "개", format: (e) => e.programCount != null ? e.programCount.toLocaleString() : "-", hideUnit: (e) => e.programCount == null },
  ],
};

export default function RealtimeEventSelector({ onSelectEvent, pageTitle, programCategory, onCountsReady, metricType = "dashboard" }) {
  const theme = THEME_CONFIGS[metricType] || THEME_CONFIGS.dashboard;
  const navigate = useNavigate();
  const { tick } = useAutoRefresh(15000);
  const cacheKey = useMemo(
    () => buildEventSelectorCacheKey(metricType, programCategory),
    [metricType, programCategory],
  );
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState(() =>
    normalizeFilterValue(searchParams.get("status")),
  );
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ddOpen, setDdOpen] = useState(false);
  const [selectedDropdownFilter, setSelectedDropdownFilter] = useState("all");
  const ddRef = useRef(null);
  const inFlightRef = useRef(false);
  const lastAutoRefreshTickRef = useRef(tick);
  const hasSeedDataRef = useRef(false);

  const DROPDOWN_FILTERS = [
    { key: "all", label: "전체 행사" },
    { key: "live", label: "진행중 행사" },
    { key: "upcoming", label: "예정 행사" },
  ];

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ddRef.current && !ddRef.current.contains(e.target)) setDdOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const nextFilter = normalizeFilterValue(searchParams.get("status"));
    setFilter((prev) => (prev === nextFilter ? prev : nextFilter));
  }, [searchParams]);

  useEffect(() => {
    const cachedEvents = readEventSelectorCache(cacheKey);
    if (cachedEvents) {
      setEvents(cachedEvents);
      setLoading(false);
      hasSeedDataRef.current = true;
      return;
    }
    hasSeedDataRef.current = false;
    setEvents([]);
    setLoading(true);
  }, [cacheKey]);

  const handleFilterChange = (nextFilter) => {
    const normalized = normalizeFilterValue(nextFilter);
    setFilter(normalized);

    const nextParams = new URLSearchParams(searchParams);
    if (normalized === "all") {
      nextParams.delete("status");
    } else {
      nextParams.set("status", normalized);
    }
    setSearchParams(nextParams, { replace: true });
  };

  const handleSelectEventView = (eventId, targetPath, event) => {
    event.stopPropagation();
    navigate(`${targetPath}/${eventId}`);
  };

  useEffect(() => {
    let mounted = true;

    const load = async ({ preserveLoading = false } = {}) => {
      if (inFlightRef.current) return;
      inFlightRef.current = true;
      if (!preserveLoading && mounted) setLoading(true);

      try {
        const response = await adminRealtimeApi.getEventsSnapshot();
        const payload = unwrapData(response, {});
        const eventRows = toArray(payload?.events);

        const filteredByCategory = eventRows.filter((row) => {
          if (!programCategory) return true;
          if (programCategory === "CONTEST") {
            return Number(row?.contestProgramCount ?? 0) > 0;
          }
          return Number(row?.programCount ?? 0) > 0;
        });

        const mappedRows = sortRealtimeEventsByPriority(
          filteredByCategory.map((row) => {
            const rawStatus = String(row?.rawStatus ?? row?.status ?? "").toUpperCase();
            const selectorStatus =
              String(row?.selectorStatus || "").toLowerCase() || toSelectorStatus(rawStatus);
            const registrations = Number(row?.registrations ?? 0) || 0;
            const checkedInRaw = Number(row?.checkedIn ?? 0) || 0;
            const checkedIn = rawStatus === "PLANNED" ? 0 : checkedInRaw;
            const voteCount = Number(row?.voteCount ?? 0) || 0;

            return {
              id: Number(row?.eventId),
              name: row?.eventName || "행사 정보 없음",
              startAt: row?.startAt ?? null,
              endAt: row?.endAt ?? null,
              date: formatDateRange(row?.startAt, row?.endAt),
              location: row?.location || "장소 정보 없음",
              rawStatus,
              selectorStatus,
              status: selectorStatus,
              registrations,
              checkedIn,
              checkinRate:
                Number.isFinite(Number(row?.checkinRate)) ? Number(row?.checkinRate) : null,
              congestion:
                row?.congestion == null
                  ? selectorStatus === "ended" ? 0 : null
                  : Number(row.congestion),
              waitingCount: Number(row?.waitingCount ?? 0) || 0,
              avgWaitMin:
                Number.isFinite(Number(row?.avgWaitMin)) ? Number(row.avgWaitMin) : null,
              voteCount,
              voteRate:
                Number.isFinite(Number(row?.voteRate))
                  ? Number(row.voteRate)
                  : registrations > 0
                    ? Math.round((voteCount / registrations) * 100)
                    : null,
              programCount: Number(row?.programCount ?? 0) || 0,
            };
          }),
        ).map((row, index) => ({
          ...row,
          delay: index * 60,
        }));

        if (!mounted) return;
        setEvents(mappedRows);
        writeEventSelectorCache(cacheKey, mappedRows);
        hasSeedDataRef.current = true;
        setLoading(false);
      } catch (error) {
        console.error("[RealtimeEventSelector] load failed:", error);
        if (mounted) {
          if (!hasSeedDataRef.current) {
            setEvents([]);
          }
          setLoading(false);
        }
      } finally {
        inFlightRef.current = false;
        if (mounted && !preserveLoading) setLoading(false);
      }
    };

    load({ preserveLoading: hasSeedDataRef.current });
    return () => {
      mounted = false;
    };
  }, [programCategory, cacheKey]);

  useEffect(() => {
    if (lastAutoRefreshTickRef.current === tick) return;
    lastAutoRefreshTickRef.current = tick;
    if (document.visibilityState === "hidden") return;

    let mounted = true;
    const load = async () => {
      if (inFlightRef.current) return;
      inFlightRef.current = true;
      try {
        const response = await adminRealtimeApi.getEventsSnapshot();
        const payload = unwrapData(response, {});
        const eventRows = toArray(payload?.events);
        const filteredByCategory = eventRows.filter((row) => {
          if (!programCategory) return true;
          if (programCategory === "CONTEST") {
            return Number(row?.contestProgramCount ?? 0) > 0;
          }
          return Number(row?.programCount ?? 0) > 0;
        });
        const mappedRows = sortRealtimeEventsByPriority(
          filteredByCategory.map((row) => {
            const rawStatus = String(row?.rawStatus ?? row?.status ?? "").toUpperCase();
            const selectorStatus =
              String(row?.selectorStatus || "").toLowerCase() || toSelectorStatus(rawStatus);
            const registrations = Number(row?.registrations ?? 0) || 0;
            const checkedInRaw = Number(row?.checkedIn ?? 0) || 0;
            const checkedIn = rawStatus === "PLANNED" ? 0 : checkedInRaw;
            const voteCount = Number(row?.voteCount ?? 0) || 0;
            return {
              id: Number(row?.eventId),
              name: row?.eventName || "행사 정보 없음",
              startAt: row?.startAt ?? null,
              endAt: row?.endAt ?? null,
              date: formatDateRange(row?.startAt, row?.endAt),
              location: row?.location || "장소 정보 없음",
              rawStatus,
              selectorStatus,
              status: selectorStatus,
              registrations,
              checkedIn,
              checkinRate:
                Number.isFinite(Number(row?.checkinRate)) ? Number(row?.checkinRate) : null,
              congestion:
                row?.congestion == null
                  ? selectorStatus === "ended" ? 0 : null
                  : Number(row.congestion),
              waitingCount: Number(row?.waitingCount ?? 0) || 0,
              avgWaitMin:
                Number.isFinite(Number(row?.avgWaitMin)) ? Number(row.avgWaitMin) : null,
              voteCount,
              voteRate:
                Number.isFinite(Number(row?.voteRate))
                  ? Number(row.voteRate)
                  : registrations > 0
                    ? Math.round((voteCount / registrations) * 100)
                    : null,
              programCount: Number(row?.programCount ?? 0) || 0,
            };
          }),
        ).map((row, index) => ({
          ...row,
          delay: index * 60,
        }));
        if (mounted) {
          setEvents(mappedRows);
          writeEventSelectorCache(cacheKey, mappedRows);
          hasSeedDataRef.current = true;
          setLoading(false);
        }
      } catch (error) {
        console.error("[RealtimeEventSelector] auto refresh failed:", error);
        if (mounted) setLoading(false);
      } finally {
        inFlightRef.current = false;
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [programCategory, tick, cacheKey]);

  const filtered = useMemo(() => {
    return events.filter((event) => {
      const isClosedEvent = event.status === "ended" || event.status === "cancelled";
      if (isClosedEvent) return false;

      const keyword = search.trim().toLowerCase();
      const matchSearch =
        keyword === "" ||
        event.name.toLowerCase().includes(keyword) ||
        event.location.toLowerCase().includes(keyword) ||
        event.date.toLowerCase().includes(keyword);
      const matchFilter =
        filter === "all" ||
        event.status === filter;
      const matchDropdown =
        selectedDropdownFilter === "all" ||
        event.status === selectedDropdownFilter;
      return matchSearch && matchFilter && matchDropdown;
    });
  }, [events, filter, search, selectedDropdownFilter]);

  const activeEvents = useMemo(
    () => events.filter((event) => event.status !== "ended" && event.status !== "cancelled"),
    [events],
  );

  const counts = {
    all: activeEvents.length,
    live: activeEvents.filter((event) => event.status === "live").length,
    upcoming: activeEvents.filter((event) => event.status === "upcoming").length,
    ended: events.filter((event) => event.status === "ended" || event.status === "cancelled").length,
  };

  useEffect(() => {
    if (onCountsReady) onCountsReady(counts);
  }, [counts.all, counts.live, counts.upcoming, counts.ended]);

  return (
    <>
      <style>{selectorStyles}</style>
      <div
        className="rte-selector"
        style={{
          "--rte-accent": theme.accent,
          "--rte-live-dot": theme.liveDot,
          "--rte-upcoming-dot": theme.upcomingDot,
        }}
      >
        <div className="rte-toolbar">
          {/* 필터 탭 */}
          <div className="rte-filter-tabs">
            {[
              { key: "all", label: "전체 행사" },
              { key: "live", label: "진행중 행사" },
              { key: "upcoming", label: "예정 행사" },
            ].map((tab) => (
              <button
                key={tab.key}
                className={`rte-filter-tab${filter === tab.key ? " active" : ""}`}
                onClick={() => handleFilterChange(tab.key)}
                type="button"
              >
                {tab.label}
                <span className="rte-filter-count">{counts[tab.key] ?? 0}</span>
              </button>
            ))}
          </div>

          {/* 검색 */}
          <div className="rte-toolbar-left">
            <div className="rte-search-wrap">
              <Search size={15} className="rte-search-icon" />
              <input
                className="rte-search-input"
                type="text"
                placeholder="행사명, 장소 검색"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="rte-event-list">
          {loading && events.length === 0 ? (
            <PageLoading message="행사 목록을 불러오는 중입니다" />
          ) : filtered.length === 0 ? (
            events.length === 0
              ? <EmptyState message="등록된 행사가 없습니다" description="행사가 등록되면 이곳에 표시됩니다" />
              : <EmptyState message="조건에 맞는 행사가 없습니다" description="다른 검색어나 필터를 시도해보세요" />
          ) : (
            filtered.map((event) => {
              const statusConfig = STATUS_CONFIG[event.status] || STATUS_CONFIG.upcoming;
              const rowClass = event.status === "live" ? "live"
                : event.status === "upcoming" ? "upcoming" : "ended";
              const isEnded = rowClass === "ended";
              return (
                <div
                  key={event.id}
                  className={`rte-row ${rowClass}`}
                  style={{ animationDelay: `${event.delay}ms` }}
                >
                  {/* 상단: 상태 + 행사명 */}
                  <div className="rte-left">
                    <div className="rte-status-label" style={{ color: event.status === "live" ? theme.liveDot : event.status === "upcoming" ? theme.upcomingDot : statusConfig.color }}>
                      {event.status === "live" && <span className="rte-live-dot" />}
                      {event.status === "upcoming" && <span className="rte-upcoming-dot" />}
                      {statusConfig.label}
                    </div>
                    <div className="rte-name">
                      {event.name}
                      {event.status === "live" && <span className="rte-new-badge">NEW</span>}
                    </div>
                    <div className="rte-meta-line">
                      <span className="rte-meta-text">
                        <MapPin size={14} />
                        {event.location}
                      </span>
                      <span className="rte-meta-text">
                        <CalendarDays size={14} />
                        {event.date}
                      </span>
                    </div>
                  </div>

                  {/* 지표 그리드 */}
                  <div className="rte-metrics-grid">
                    {(METRIC_CONFIGS[metricType] || METRIC_CONFIGS.dashboard).map((m) => {
                      const val = m.format(event);
                      const showUnit = m.hideUnit ? !m.hideUnit(event) : val !== "-";
                      const isEnded = event.status === "ended";
                      const numColor = isEnded ? "#9ca3af" : (m.color ? m.color(event) : undefined);
                      const isPercent = m.unit === "%";
                      const rawPercent = isPercent ? (typeof val === "number" ? val : parseFloat(val)) : null;
                      const hasRing = isPercent && Number.isFinite(rawPercent);
                      const barFill = !isPercent && val !== "-" ? getMetricBarFill(m.key, event) : null;
                      const barColor = isEnded ? "#c5c9cf" : (METRIC_BAR_COLORS[m.key] || numColor || "#90C450");
                      const ringColor = isEnded ? "#c5c9cf" : (numColor || "#90C450");
                      return (
                        <div className={`rte-metric-card${hasRing ? " has-ring" : ""}`} key={m.key}>
                          {hasRing && (
                            <MiniRing percent={rawPercent} color={ringColor} />
                          )}
                          <div className="rte-metric-card-info">
                            <div className="rte-metric-card-label">{m.label}</div>
                            <div className="rte-metric-card-row">
                              <span
                                className="rte-metric-card-num"
                                style={numColor ? { color: numColor } : undefined}
                              >
                                {val}
                              </span>
                              {showUnit && <span className="rte-metric-card-unit">{m.unit}</span>}
                            </div>
                            {barFill != null && barFill > 0 && (
                              <div className="rte-metric-bar">
                                <div className="rte-metric-bar-fill" style={{ width: `${barFill}%`, background: barColor }} />
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* 하단: 뷰 버튼 */}
                  <div className="rte-view-links">
                    {EVENT_VIEW_BUTTONS.map((btn) => (
                        <button
                          key={btn.key}
                          className="rte-view-link"
                          style={{ "--btn-color": btn.color }}
                          onClick={(e) => handleSelectEventView(event.id, btn.path, e)}
                          type="button"
                        >
                          <span className="rte-vl-dot" style={{ background: btn.color }} />
                          {btn.label}
                          <ChevronRight size={14} className="rte-vl-arrow" />
                        </button>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </>
  );
}

