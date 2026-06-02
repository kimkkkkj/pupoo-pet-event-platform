import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import PageLoading from "../components/PageLoading";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle,
  MapPin,
  Medal,
  RefreshCw,
  Trophy,
  Users,
  Vote,
} from "lucide-react";
import PageHeader from "../components/PageHeader";
import RealtimeEventSelector from "./RealtimeEventSelector";
import {
  SHARED_ANIM_STYLES,
  useAutoRefresh,
  useRefresh,
} from "./useRealtimeAnimations";
import { programApi } from "../../../app/http/programApi";
import { eventApi } from "../../../app/http/eventApi";
import { adminRealtimeApi } from "../../../app/http/adminRealtimeApi";
import {
  createImageFallbackHandler,
  resolveImageUrl,
} from "../../../shared/utils/publicAssetUrl";

const formatDateRange = (startAt, endAt) => {
  const fmt = (v) => { const d = v ? new Date(v) : null; return d && !Number.isNaN(d.getTime()) ? `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,"0")}.${String(d.getDate()).padStart(2,"0")}` : null; };
  const s = fmt(startAt), e = fmt(endAt);
  if (s && e) return `${s} ~ ${e}`;
  return s || e || "일정 정보 없음";
};

const formatTimestamp = (date) => {
  if (!date) return "--:--:--";
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return "--:--:--";
  return d.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
};

const styles = `
  @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.min.css');
  .vt-root { box-sizing: border-box; min-height: 100vh; background: #F8F9FC; font-family: 'Pretendard Variable', 'Pretendard', -apple-system, sans-serif; flex: 1; }
  .vt-root *, .vt-root *::before, .vt-root *::after { box-sizing: border-box; font-family: inherit; }
  .vt-container { max-width: 1400px; margin: 0 auto; padding: 20px 0 64px; }
  .vt-container.with-event { padding-top: 20px; }
  .vt-container.selector-mode { padding-top: 16px; }
  .vt-page-shell { max-width: 1400px; margin: 0 auto; }
  .vt-top-actions {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
    margin-bottom: 20px;
  }

  .vt-back-btn {
    display: inline-flex; align-items: center; gap: 8px;
    padding: 12px 22px; border-radius: 12px;
    border: 1.5px solid #111827; background: #111827; color: #fff;
    font-size: 16px; font-weight: 700; cursor: pointer;
    transition: all 0.15s; margin-bottom: 20px;
    font-family: inherit; letter-spacing: -0.01em;
  }
  .vt-top-actions .vt-back-btn { margin-bottom: 0; }
  .vt-event-mode-nav {
    display: flex;
    align-items: center;
    gap: 0;
    flex-wrap: nowrap;
    margin-left: 0;
    border: 1px solid #d9e1ec;
    border-radius: 14px;
    overflow: hidden;
    background: #fff;
  }
  .vt-mode-btn {
    height: 44px;
    border: none;
    border-right: 1px solid #e6ebf3;
    background: #fff;
    color: #8b95a7;
    padding: 0 22px;
    font-size: 14px;
    font-weight: 800;
    cursor: pointer;
    transition: all 0.15s;
    font-family: inherit;
    white-space: nowrap;
  }
  .vt-mode-btn:last-child { border-right: none; }
  .vt-mode-btn.active {
    background: #111827;
    color: #fff;
    border-right-color: #111827;
    box-shadow: none;
  }
  .vt-mode-btn:hover {
    background: #f8fafc;
    color: #64748b;
  }
  .vt-mode-btn.active:hover {
    background: #0f172a;
    color: #fff;
  }
  .vt-back-btn:hover { background: #1f2937; border-color: #1f2937; }
  .vt-back-btn:active { transform: scale(0.97); }
  .vt-live-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    margin-bottom: 14px;
  }
  .vt-live-meta {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
  }
  .vt-live-actions {
    margin-left: auto;
    display: inline-flex;
    align-items: center;
    justify-content: flex-end;
    gap: 10px;
    min-width: max-content;
  }
  .vt-live-time {
    color: #6b7280;
    font-size: 12px;
    font-weight: 600;
    white-space: nowrap;
  }

  /* ── 히어로 ── */
  .vt-hero {
    border: 1px solid #e2e8f0;
    border-radius: 16px;
    padding: 32px 36px;
    margin-bottom: 16px;
    background: linear-gradient(135deg, #fff 0%, #fafbff 100%);
    color: #111827;
    position: relative;
    overflow: hidden;
    box-shadow: 0 2px 12px rgba(0,0,0,0.04);
  }
  .vt-hero::before {
    content: "";
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 4px;
    background: linear-gradient(90deg, #90C450, #7c3aed, #90C450);
    background-size: 200% 100%;
    animation: vt-hero-bar 3s ease infinite;
  }
  @keyframes vt-hero-bar {
    0%, 100% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
  }
  .vt-hero-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 24px; }
  .vt-hero-main { min-width: 0; flex: 1 1 auto; }
  .vt-hero-title-row { display: flex; align-items: center; gap: 12px; }
  .vt-hero-title { margin: 0; font-size: 26px; line-height: 1.2; letter-spacing: -0.02em; font-weight: 800; color: #111827; }
  .vt-hero-meta { margin-top: 10px; display: flex; flex-wrap: wrap; gap: 14px; font-size: 14px; color: #9ca3af; }
  .vt-hero-meta-item { display: inline-flex; align-items: center; gap: 5px; }
  .vt-hero-divider { margin: 16px 0; border: none; border-top: 1px solid #f0f0f0; }
  .vt-hero-summary { display: flex; align-items: center; gap: 10px; font-size: 15px; color: #9ca3af; font-weight: 500; }
  .vt-hero-summary strong { font-weight: 800; color: #111827; font-size: 16px; }
  .vt-hero-summary-dot {
    width: 10px; height: 10px; border-radius: 50%;
    background: #90C450; box-shadow: 0 0 6px rgba(144,196,80,0.4);
    animation: vt-pulse 1.6s ease-in-out infinite; flex-shrink: 0;
  }

  .vt-hero-kpi-grid {
    margin-top: 0;
    display: grid; grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 10px; width: min(640px, 100%); margin-left: auto; flex-shrink: 0;
  }
  .vt-hero-kpi {
    border: 1px solid #ebebeb; border-radius: 14px;
    background: #fff; padding: 20px 22px;
  }
  .vt-hero-kpi-label { font-size: 13px; color: #9ca3af; font-weight: 600; margin-bottom: 10px; }
  .vt-hero-kpi-row { display: flex; align-items: baseline; gap: 4px; }
  .vt-hero-kpi-value { font-size: 36px; line-height: 1; font-weight: 800; color: #111827; letter-spacing: -0.02em; }
  .vt-hero-kpi-unit { font-size: 18px; color: #9ca3af; font-weight: 700; }
  .vt-hero-kpi-bar { margin-top: 14px; height: 10px; border-radius: 99px; background: #f0f0f0; overflow: hidden; }
  .vt-hero-kpi-bar-fill { height: 100%; border-radius: 99px; transition: width 0.6s ease; }
  .vt-hero-kpi-sub { margin-top: 12px; font-size: 13px; color: #6b7280; line-height: 1.5; font-weight: 600; word-break: keep-all; }
  .vt-hero-footer {
    display: flex; align-items: center; justify-content: flex-end;
    gap: 10px; margin-top: 20px; padding-top: 14px; border-top: 1px solid #f0f0f0;
  }
  .vt-timestamp { font-size: 14px; color: #9ca3af; font-weight: 500; font-variant-numeric: tabular-nums; }
  .vt-refresh-btn { width: 34px; height: 34px; border-radius: 8px; border: 1px solid #e2e8f0; background: #fff; color: #6b7280; display: inline-flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.15s; }
  .vt-refresh-btn:hover { border-color: #90C450; color: #90C450; background: #f5f8ff; }
  .vt-refresh-btn:active { transform: scale(0.93); }

  .vt-status-chip {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 5px 14px; border-radius: 999px; font-size: 13px; font-weight: 700;
  }
  .vt-status-chip-active { background: #ecfdf3; color: #166534; border: 1px solid #bbf7d0; }
  .vt-status-chip-active .vt-status-dot { width: 8px; height: 8px; border-radius: 50%; background: #22c55e; animation: vt-pulse 1.6s ease-in-out infinite; }
  .vt-status-chip-ended { background: #f3f4f6; color: #6b7280; border: 1px solid #d1d5db; }
  .vt-status-chip-planned { background: #E6F7F2; color: #90C450; border: 1px solid #CCF0E4; }
  @keyframes vt-pulse { 0%,100% { opacity: 1; transform: scale(1); } 50% { opacity: .5; transform: scale(.75); } }

  /* ── 카드 ── */
  .vt-card {
    background: #fff; border: 1px solid #e2e8f0; border-radius: 16px;
    padding: 28px 32px; margin-bottom: 16px;
    box-shadow: 0 1px 4px rgba(0,0,0,0.03);
  }
  .vt-card-header {
    display: flex; align-items: center; justify-content: space-between;
    margin-bottom: 20px; padding-bottom: 16px; border-bottom: 1px solid #f0f0f0; gap: 10px; flex-wrap: wrap;
  }
  .vt-card-title {
    margin: 0; display: inline-flex; align-items: center; gap: 10px;
    font-size: 18px; font-weight: 800; color: #111827;
  }
  .vt-card-title-icon {
    width: 32px; height: 32px; border-radius: 10px;
    display: flex; align-items: center; justify-content: center;
  }
  .vt-card-tag { font-size: 13px; color: #9ca3af; font-weight: 600; }

  /* ── 콘테스트 선택 ── */
  .vt-selector-wrap { margin-bottom: 14px; }
  .vt-selector-head-left { display: inline-flex; align-items: center; gap: 10px; min-width: 0; flex-wrap: wrap; }
  .vt-selector-status-filters { display: inline-flex; align-items: center; gap: 6px; flex-wrap: wrap; margin-left: 4px; }
  .vt-selector-status-btn {
    border: 1px solid #d1d5db; border-radius: 999px; background: #fff;
    color: #475569; font-size: 12px; font-weight: 700; line-height: 1;
    padding: 6px 10px; cursor: pointer; transition: all 0.15s; white-space: nowrap;
  }
  .vt-selector-status-btn:hover { border-color: #94a3b8; background: #f8fafc; }
  .vt-selector-status-btn.active { border-color: #90C450; background: #E6F7F2; color: #028A6C; }
  .vt-selector-list { display: flex; gap: 10px; overflow-x: auto; padding-bottom: 2px; scrollbar-width: thin; }
  .vt-selector-item { min-width: 200px; border: 1px solid #e2e8f0; border-radius: 14px; background: #fff; padding: 14px; text-align: left; cursor: pointer; transition: all 0.15s; }
  .vt-selector-item:hover { border-color: #cbd5e1; transform: translateY(-1px); box-shadow: 0 2px 8px rgba(0,0,0,0.04); }
  .vt-selector-item.active { border-color: #90C450; background: #f8fbff; box-shadow: 0 0 0 1px rgba(37, 99, 235, 0.12); }
  .vt-selector-empty { min-width: 100%; border: 1px dashed #dbe3ef; border-radius: 10px; background: #fafcff; color: #6b7280; font-size: 12px; font-weight: 600; text-align: center; padding: 14px 12px; }
  .vt-selector-top { display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-bottom: 8px; }
  .vt-selector-name { margin: 0; font-size: 13px; font-weight: 800; color: #111827; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .vt-selector-votes { margin: 0; font-size: 12px; color: #4b5563; font-weight: 700; }
  .vt-selector-status { display: inline-flex; align-items: center; justify-content: center; border-radius: 999px; padding: 2px 8px; font-size: 10px; font-weight: 800; border: 1px solid transparent; flex-shrink: 0; }
  .vt-selector-status-live { color: #166534; background: #ecfdf3; border-color: #bbf7d0; }
  .vt-selector-status-wait { color: #854d0e; background: #fffbeb; border-color: #fde68a; }
  .vt-selector-status-end { color: #475569; background: #f1f5f9; border-color: #cbd5e1; }
  .vt-selector-link { border: 0; background: transparent; color: #90C450; font-size: 13px; font-weight: 700; cursor: pointer; padding: 0; }
  .vt-selector-link:hover { text-decoration: underline; }

  /* ── 순위 + 상세 ── */
  .vt-main-grid { display: grid; grid-template-columns: minmax(0, 7fr) minmax(0, 5fr); gap: 14px; align-items: stretch; }
  .vt-ranking-title { margin: 0; font-size: 22px; line-height: 1.2; letter-spacing: -0.02em; color: #111827; font-weight: 900; }
  .vt-ranking-meta { margin: 6px 0 0; font-size: 14px; color: #6b7280; font-weight: 600; }
  .vt-ranking-list { margin-top: 14px; border: 1px solid #e8ecf2; border-radius: 16px; overflow-y: auto; max-height: 590px; background: #fff; }
  .vt-ranking-row { width: 100%; border: 0; border-bottom: 1px solid #f0f0f0; background: #fff; text-align: left; padding: 14px 16px; display: grid; grid-template-columns: 42px minmax(0, 1fr); gap: 12px; align-items: center; cursor: pointer; transition: all 0.15s; }
  .vt-ranking-row:last-child { border-bottom: 0; }
  .vt-ranking-row:hover { background: #f8fafc; }
  .vt-ranking-row.selected { background: #E6F7F2; }
  .vt-ranking-row.rank-1 { background: #fff8e8; }
  .vt-ranking-row.rank-1.selected { background: #fff2cc; }
  .vt-ranking-rank { width: 38px; height: 38px; border-radius: 12px; background: #f1f5f9; color: #475569; display: inline-flex; align-items: center; justify-content: center; font-size: 15px; font-weight: 900; }
  .vt-ranking-row.rank-1 .vt-ranking-rank { background: #fbbf24; color: #7c2d12; }
  .vt-ranking-main { min-width: 0; display: flex; flex-direction: column; gap: 7px; }
  .vt-ranking-line { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; }
  .vt-ranking-name { margin: 0; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 15px; font-weight: 800; color: #111827; }
  .vt-ranking-votes { flex-shrink: 0; font-size: 13px; color: #4b5563; font-weight: 700; display: inline-flex; align-items: center; gap: 8px; }
  .vt-ranking-votes strong { color: #111827; font-weight: 900; font-variant-numeric: tabular-nums; }
  .vt-ranking-track { width: 100%; height: 8px; border-radius: 999px; background: #e5e7eb; overflow: hidden; }
  .vt-ranking-fill { height: 100%; border-radius: inherit; background: #818cf8; }
  .vt-ranking-row.rank-1 .vt-ranking-fill { background: #f59e0b; }
  .vt-ranking-toggle { margin-top: 12px; border: 1px solid #dbe3ef; border-radius: 999px; background: #fff; color: #334155; font-size: 12px; font-weight: 700; padding: 5px 11px; cursor: pointer; }
  .vt-ranking-toggle:hover { border-color: #c2d0e4; background: #f8fafc; }

  /* ── 후보 상세 ── */
  .vt-detail-name { margin: 0; font-size: 24px; line-height: 1.2; letter-spacing: -0.02em; color: #111827; font-weight: 900; }
  .vt-detail-sub { margin: 8px 0 0; font-size: 14px; color: #6b7280; font-weight: 600; }
  .vt-detail-media { width: 100%; aspect-ratio: 16 / 10; border-radius: 16px; border: 1px solid #e8ecf2; overflow: hidden; background: #f8fafc; display: flex; align-items: center; justify-content: center; margin: 16px 0; }
  .vt-detail-media img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .vt-detail-placeholder { font-size: 14px; color: #64748b; font-weight: 700; }
  .vt-detail-metrics { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
  .vt-detail-metric { border: 1px solid #eef0f4; border-radius: 14px; background: #fafbfc; padding: 18px 20px; transition: all 0.15s; }
  .vt-detail-metric:hover { border-color: #e2e5ea; background: #f3f4f6; }
  .vt-detail-metric-label { margin: 0 0 8px; font-size: 13px; color: #9ca3af; font-weight: 600; }
  .vt-detail-metric-value { margin: 0; font-size: 22px; line-height: 1.2; letter-spacing: -0.02em; color: #111827; font-weight: 900; }

  .vt-state-card { border: none; border-radius: 14px; background: #f9fafb; min-height: 220px; padding: 24px; display: flex; align-items: center; justify-content: center; text-align: center; color: #c5c9cf; font-size: 14px; line-height: 1.5; font-weight: 500; }
  .vt-notice {
    display: flex; align-items: center; gap: 10px;
    color: #374151; background: linear-gradient(135deg, #f8fafc 0%, #E6F7F2 100%);
    border: 1px solid #e2e8f0; border-radius: 14px;
    padding: 16px 20px; margin-bottom: 18px; font-size: 14px; font-weight: 600; line-height: 1.4;
  }
  .vt-notice::before {
    content: "ℹ"; display: flex; align-items: center; justify-content: center;
    width: 28px; height: 28px; border-radius: 8px;
    background: #90C450; color: #fff; font-size: 14px; font-weight: 800; flex-shrink: 0;
  }
  .vt-empty { text-align: center; padding: 44px 0; color: #c5c9cf; font-size: 14px; font-weight: 500; }

  @media (max-width: 900px) {
    .vt-hero-top { flex-direction: column; align-items: flex-start; }
    .vt-hero-kpi-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); width: 100%; margin-left: 0; margin-top: 14px; }
    .vt-hero { padding: 28px 24px; }
    .vt-hero-title { font-size: 26px; }
    .vt-card { padding: 24px 22px; }
    .vt-main-grid { grid-template-columns: 1fr; }
    .vt-ranking-list { max-height: 420px; }
  }
	  @media (max-width: 640px) {
	    .vt-container { padding: 20px 16px 48px; }
	    .vt-top-actions { align-items: stretch; }
	    .vt-event-mode-nav { width: 100%; margin-left: 0; overflow-x: auto; }
	    .vt-mode-btn { flex: 0 0 auto; min-width: 112px; }
	    .vt-live-header { flex-wrap: wrap; }
	    .vt-live-actions { width: 100%; justify-content: flex-end; }
	    .vt-hero { padding: 22px 18px; }
	    .vt-hero-title { font-size: 22px; }
	    .vt-hero-kpi-value { font-size: 28px; }
	    .vt-card { padding: 20px 18px; }
	    .vt-detail-metrics { grid-template-columns: 1fr; }
    .vt-selector-head-left { width: 100%; }
  }
`;

export const SERVICE_CATEGORIES = [
  { label: "전체 행사", path: "/realtime/votestatus", countKey: "all" },
  { label: "진행중 행사", path: "/realtime/votestatus?status=live", countKey: "live" },
  { label: "예정 행사", path: "/realtime/votestatus?status=upcoming", countKey: "upcoming" },
  { label: "종료 행사", path: "/realtime/votestatus?status=ended", countKey: "ended" },
];

export const SUBTITLE_MAP = {
  "/realtime/dashboard": "행사 전체 현황을 실시간으로 모니터링합니다",
  "/realtime/waitingstatus": "대기열 현황을 실시간으로 확인합니다",
  "/realtime/checkinstatus": "참가자 체크인 현황을 실시간으로 확인합니다",
  "/realtime/votestatus": "진행 중인 투표의 실시간 결과를 확인합니다",
};
const EVENT_REALTIME_BUTTONS = [
  { key: "dashboard", label: "통합현황", path: "/realtime/dashboard" },
  { key: "waiting", label: "대기현황", path: "/realtime/waitingstatus" },
  { key: "checkin", label: "체크인 현황", path: "/realtime/checkinstatus" },
  { key: "vote", label: "투표현황", path: "/realtime/votestatus" },
];

const CONTEST_STATUS_FILTERS = [
  { key: "진행 중", label: "진행 중 콘테스트" },
  { key: "예정", label: "예정 콘테스트" },
  { key: "종료", label: "종료 콘테스트" },
];

const PET_FALLBACK = [
  "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=720&h=450&fit=crop",
  "https://images.unsplash.com/photo-1552053831-71594a27632d?w=720&h=450&fit=crop",
  "https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?w=720&h=450&fit=crop",
  "https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=720&h=450&fit=crop",
];

function fallbackPetImage(id) {
  return PET_FALLBACK[Math.abs(Number(id) || 0) % PET_FALLBACK.length];
}

function parseDate(value) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function toContestStatus(contest) {
  if (contest?.ongoing) return "진행 중";
  if (contest?.ended) return "종료";
  if (contest?.upcoming) return "예정";
  const now = Date.now();
  const start = parseDate(contest?.startAt)?.getTime();
  const end = parseDate(contest?.endAt)?.getTime();
  if (start && now < start) return "예정";
  if (end && now > end) return "종료";
  return "진행 중";
}

function statusClassName(status) {
  if (status === "진행 중") return "vt-selector-status-live";
  if (status === "예정") return "vt-selector-status-wait";
  return "vt-selector-status-end";
}

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toArray(value) {
  if (Array.isArray(value?.content)) return value.content;
  return Array.isArray(value) ? value : [];
}

function toCandidateRows(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.content)) return payload.content;
  if (Array.isArray(payload?.data?.content)) return payload.data.content;
  return [];
}

function toCandidateName(row) {
  if (row?.petName) return row.petName;
  if (row?.ticketNo) return `참가자 ${row.ticketNo}`;
  return `참가자 #${row?.programApplyId ?? "?"}`;
}

function formatCount(value) {
  return toNumber(value).toLocaleString("ko-KR");
}

function formatPct(value) {
  if (!Number.isFinite(value)) return "0%";
  const rounded = Math.round(value * 10) / 10;
  return `${rounded % 1 === 0 ? rounded.toFixed(0) : rounded.toFixed(1)}%`;
}

function buildContestItems(candidateRows, voteRows, totalVotesFromApi) {
  const candidateMap = new Map(
    candidateRows.map((row) => [
      Number(row?.programApplyId),
      {
        applyId: Number(row?.programApplyId),
        name: toCandidateName(row),
        imageUrl: row?.imageUrl || null,
        ownerNickname:
          row?.ownerNickname ||
          (row?.userId ? `보호자 #${row.userId}` : "보호자 정보 없음"),
      },
    ]),
  );

  const voteMap = new Map(
    (Array.isArray(voteRows) ? voteRows : []).map((row) => [
      Number(row?.programApplyId),
      toNumber(row?.voteCount),
    ]),
  );

  const mergedIds = new Set([...candidateMap.keys(), ...voteMap.keys()]);
  const merged = Array.from(mergedIds).map((applyId) => {
    const candidate = candidateMap.get(applyId);
    return {
      applyId,
      name: candidate?.name || `참가자 #${applyId}`,
      imageUrl: candidate?.imageUrl || null,
      ownerNickname: candidate?.ownerNickname || "보호자 정보 없음",
      votes: voteMap.get(applyId) ?? 0,
    };
  });

  merged.sort((a, b) => {
    const diff = b.votes - a.votes;
    if (diff !== 0) return diff;
    return a.name.localeCompare(b.name, "ko");
  });

  const leaderVotes = merged[0]?.votes ?? 0;
  const totalVotes = Number.isFinite(totalVotesFromApi) && totalVotesFromApi > 0
    ? totalVotesFromApi
    : merged.reduce((sum, item) => sum + item.votes, 0);

  const items = merged.map((item, index) => ({
    ...item,
    rank: index + 1,
    pct: totalVotes > 0 ? (item.votes / totalVotes) * 100 : 0,
    gapFromLeader: Math.max(0, leaderVotes - item.votes),
    gapFromPrevious:
      index === 0 ? 0 : Math.max(0, merged[index - 1].votes - item.votes),
  }));

  return { totalVotes, items };
}

function VoteContent({ eventId }) {
  const navigate = useNavigate();
  const [contests, setContests] = useState([]);
  const [activeContestKey, setActiveContestKey] = useState(null);
  const [contestStatusFilter, setContestStatusFilter] = useState("진행 중");
  const [selectedCandidateId, setSelectedCandidateId] = useState(null);
  const [showAllCandidates, setShowAllCandidates] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [eventDetail, setEventDetail] = useState(null);
  const [lastLoadedAt, setLastLoadedAt] = useState(new Date());
  const loadedRef = useRef(false);
  const activeKeyRef = useRef(null);
  const inFlightRef = useRef(false);
  const [manualRefreshSeed, setManualRefreshSeed] = useState(0);
  const { tick } = useAutoRefresh(15000);
  const { spinning, refresh } = useRefresh(
    () => setManualRefreshSeed((value) => value + 1),
    850,
  );

  useEffect(() => {
    setContests([]);
    setActiveContestKey(null);
    setContestStatusFilter("진행 중");
    setSelectedCandidateId(null);
    setShowAllCandidates(false);
    setLoading(true);
    setErrorMsg("");
    setEventDetail(null);
    loadedRef.current = false;
    activeKeyRef.current = null;
    inFlightRef.current = false;
  }, [eventId]);

  useEffect(() => {
    let cancelled = false;
    const fetchVoteBoard = async () => {
      if (document.visibilityState === "hidden") return;
      if (inFlightRef.current) return;
      if (!eventId) {
        if (!cancelled) {
          setContests([]);
          setLoading(false);
        }
        return;
      }

      inFlightRef.current = true;
      const firstLoad = !loadedRef.current;
      if (firstLoad) setLoading(true);
      setErrorMsg("");

      try {
        const response = await adminRealtimeApi.getVoteStatusSnapshot(Number(eventId));
        const snapshot = response?.data?.data ?? response?.data ?? null;
        if (!snapshot || typeof snapshot !== "object") {
          throw new Error("Vote snapshot is empty.");
        }

        const mappedContests = toArray(snapshot?.contests).map((contest) => {
          const contestItems = toArray(contest?.items).map((item, index) => ({
            applyId: Number(item?.applyId),
            name: item?.name || `참가자 #${item?.applyId ?? "-"}`,
            imageUrl: item?.imageUrl || null,
            ownerNickname: item?.ownerNickname || "보호자 정보 없음",
            votes: toNumber(item?.votes),
            rank: Number(item?.rank ?? index + 1),
            pct: Number(item?.pct ?? 0),
            gapFromLeader: toNumber(item?.gapFromLeader),
            gapFromPrevious: toNumber(item?.gapFromPrevious),
            status: item?.status || "UNKNOWN",
          }));

          return {
            key: contest?.key || `contest-${contest?.programId}`,
            programId: Number(contest?.programId),
            eventId: Number(
              contest?.eventId ??
                contest?.contestEventId ??
                contest?.programEventId ??
                eventId,
            ),
            title: contest?.title || `콘테스트 #${contest?.programId ?? "-"}`,
            status: contest?.status || toContestStatus(contest),
            totalVotes: toNumber(contest?.totalVotes),
            participantCount: toNumber(contest?.participantCount ?? contestItems.length),
            items: contestItems,
            startAt: contest?.startAt || null,
            endAt: contest?.endAt || null,
          };
        });

        if (cancelled) return;
        setEventDetail(snapshot?.eventSummary || null);
        setContests(mappedContests);
        setActiveContestKey((prev) => {
          if (prev && mappedContests.some((contest) => contest.key === prev)) {
            return prev;
          }
          return mappedContests[0]?.key ?? null;
        });
        setLastLoadedAt(
          snapshot?.metadata?.serverTime ||
          snapshot?.voteSummary?.latestUpdatedAt ||
          snapshot?.voteSummary?.latestVoteAt ||
          new Date(),
        );
        loadedRef.current = true;
        return;

        /* legacy fan-out path removed
        const [programs, eventResponse] = await Promise.all([
          programApi.getAllProgramsByEvent({
            eventId: Number(eventId),
            category: "CONTEST",
            sort: "startAt,asc",
          }),
          eventApi.getEventDetail(Number(eventId)).catch(() => null),
        ]);

        if (!cancelled) {
          const eventPayload = eventResponse?.data?.data ?? eventResponse?.data ?? null;
          setEventDetail(eventPayload);
        }

        const mapped = await Promise.all(
          (Array.isArray(programs) ? programs : []).map(async (program) => {
            const programId = Number(program?.programId);
            const [voteResult, candidateResult] = await Promise.allSettled([
              programApi.getContestVoteResult(programId),
              programApi.getCandidates(programId, { page: 0, size: 200 }),
            ]);

            const votePayload =
              voteResult.status === "fulfilled"
                ? voteResult.value?.data?.data ?? voteResult.value?.data ?? {}
                : {};
            const candidatePayload =
              candidateResult.status === "fulfilled"
                ? candidateResult.value?.data?.data ?? candidateResult.value?.data ?? {}
                : {};

            const candidateRows = toCandidateRows(candidatePayload);
            const voteRows = Array.isArray(votePayload?.results) ? votePayload.results : [];
            const { totalVotes, items } = buildContestItems(
              candidateRows,
              voteRows,
              toNumber(votePayload?.totalVotes),
            );

            return {
              key: `contest-${programId}`,
              programId,
              title: program?.programTitle || `콘테스트 #${programId}`,
              status: toContestStatus(program),
              totalVotes,
              participantCount: items.length,
              items,
            };
          }),
        );

        if (cancelled) return;
        setContests(mapped);
        setActiveContestKey((prev) => {
          if (prev && mapped.some((contest) => contest.key === prev)) {
            return prev;
          }
          return mapped[0]?.key ?? null;
        });
        loadedRef.current = true;
        */
      } catch (error) {
        if (!cancelled) {
          setErrorMsg(
            error?.response?.data?.message ||
              "투표 데이터를 불러오지 못했습니다.",
          );
        }
      } finally {
        inFlightRef.current = false;
        if (!cancelled && firstLoad) setLoading(false);
      }
    };

    fetchVoteBoard();
    return () => {
      cancelled = true;
    };
  }, [eventId, tick, manualRefreshSeed]);

  const filteredContests = useMemo(
    () => contests.filter((contest) => contest.status === contestStatusFilter),
    [contests, contestStatusFilter],
  );

  useEffect(() => {
    setActiveContestKey((prev) => {
      if (prev && filteredContests.some((contest) => contest.key === prev)) {
        return prev;
      }
      return filteredContests[0]?.key ?? null;
    });
  }, [filteredContests]);

  const activeContest = useMemo(
    () => filteredContests.find((contest) => contest.key === activeContestKey) || null,
    [filteredContests, activeContestKey],
  );

  useEffect(() => {
    if (!activeContest) {
      setSelectedCandidateId(null);
      activeKeyRef.current = null;
      return;
    }

    const changed = activeKeyRef.current !== activeContest.key;
    activeKeyRef.current = activeContest.key;

    if (changed) {
      setSelectedCandidateId(activeContest.items?.[0]?.applyId ?? null);
      setShowAllCandidates(false);
      return;
    }

    setSelectedCandidateId((prev) => {
      if (prev && activeContest.items.some((item) => item.applyId === prev)) {
        return prev;
      }
      return activeContest.items?.[0]?.applyId ?? null;
    });
  }, [activeContest]);

  const selectedCandidate = useMemo(() => {
    if (!activeContest) return null;
    return (
      activeContest.items.find((item) => item.applyId === selectedCandidateId) ||
      activeContest.items[0] ||
      null
    );
  }, [activeContest, selectedCandidateId]);

  const visibleCandidates = useMemo(() => {
    if (!activeContest?.items) return [];
    return showAllCandidates ? activeContest.items : activeContest.items.slice(0, 5);
  }, [activeContest, showAllCandidates]);

  const hasMoreThanFive = (activeContest?.items?.length ?? 0) > 5;
  const maxVotes = activeContest?.items?.[0]?.votes ?? 0;
  const lastUpdated = formatTimestamp(lastLoadedAt);

  const summaryByStatus = useMemo(() => {
    return contests.reduce((acc, contest) => {
      const key = contest.status;
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {});
  }, [contests]);

  if (loading && contests.length === 0) {
    return <PageLoading message="투표현황을 불러오는 중입니다" />;
  }

  if (!loading && contests.length === 0) {
    return <div className="vt-state-card">표시할 콘테스트가 없습니다.</div>;
  }

  return (
    <>
      {errorMsg ? <div className="vt-inline-banner">{errorMsg}</div> : null}

      <section className="vt-live-header">
        <div className="vt-live-meta">
          <span
            className="vt-live-badge"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "4px 11px",
              borderRadius: 999,
              border: "1px solid #fecaca",
              background: "#fff0f0",
              color: "#ef4444",
              fontSize: 11,
              fontWeight: 700,
              lineHeight: 1,
              whiteSpace: "nowrap",
            }}
          >
            <span
              className="vt-live-dot"
              style={{ width: 7, height: 7, borderRadius: "50%", background: "#ef4444" }}
            />
            LIVE 집계
          </span>
        </div>
        <div className="vt-live-actions">
          <span className="vt-live-time">마지막 갱신 {lastUpdated}</span>
          <button className="vt-refresh-btn" onClick={refresh} aria-label="새로고침">
            <RefreshCw
              size={15}
              style={{
                animation: spinning
                  ? "anim-spin 0.8s cubic-bezier(0.4,0,0.2,1)"
                  : "none",
              }}
            />
          </button>
        </div>
      </section>

      <section className="vt-card vt-selector-wrap">
        <header className="vt-card-header">
          <div className="vt-selector-head-left">
            <h2 className="vt-card-title">
              <span className="vt-card-title-icon">
                <Trophy size={14} />
              </span>
              콘테스트 선택
            </h2>
            <div className="vt-selector-status-filters">
              {CONTEST_STATUS_FILTERS.map((filter) => (
                <button
                  key={filter.key}
                  type="button"
                  className={`vt-selector-status-btn${contestStatusFilter === filter.key ? " active" : ""}`}
                  onClick={() => setContestStatusFilter(filter.key)}
                >
                  {filter.key} : {formatCount(summaryByStatus[filter.key] ?? 0)}건
                </button>
              ))}
            </div>
          </div>
          <button
            className="vt-selector-link"
            onClick={() => {
              const contestProgramId = Number(activeContest?.programId);
              const contestEventId = Number(
                activeContest?.eventId ??
                  eventDetail?.eventId ??
                  eventId,
              );
              if (Number.isFinite(contestProgramId) && contestProgramId > 0) {
                const safeContestEventId =
                  Number.isFinite(contestEventId) && contestEventId > 0
                    ? contestEventId
                    : eventId;
                navigate(
                  `/program/contest/${safeContestEventId}/detail/${contestProgramId}#candidates`,
                );
                return;
              }
              navigate("/program/contest");
            }}
          >
            투표참여 페이지로 이동
          </button>
        </header>
        <div className="vt-selector-list">
          {filteredContests.length > 0 ? (
            filteredContests.map((contest) => (
              <button
                key={contest.key}
                className={`vt-selector-item${activeContestKey === contest.key ? " active" : ""}`}
                onClick={() => setActiveContestKey(contest.key)}
              >
                <div className="vt-selector-top">
                  <p className="vt-selector-name">{contest.title}</p>
                  <span className={`vt-selector-status ${statusClassName(contest.status)}`}>
                    {contest.status}
                  </span>
                </div>
                <p className="vt-selector-votes">총 {formatCount(contest.totalVotes)}표</p>
              </button>
            ))
          ) : (
            <div className="vt-selector-empty">{contestStatusFilter} 상태의 콘테스트가 없습니다.</div>
          )}
        </div>
      </section>

      <section className="vt-main-grid">
        <article className="vt-card">
          <header className="vt-card-header">
            <h2 className="vt-card-title">
              <span className="vt-card-title-icon">
                <Medal size={14} />
              </span>
              후보 순위
            </h2>
            <span className="vt-card-tag">득표 기준</span>
          </header>
          {activeContest ? (
            <>
              <p className="vt-ranking-title">{activeContest.title}</p>
              <p className="vt-ranking-meta">
                총 {formatCount(activeContest.totalVotes)}표 · 참여 후보 {formatCount(activeContest.participantCount)}팀
              </p>
              {activeContest.items.length > 0 ? (
                <div className="vt-ranking-list">
                  {visibleCandidates.map((candidate) => {
                    const width = maxVotes > 0 ? (candidate.votes / maxVotes) * 100 : 0;
                    return (
                      <button
                        key={`${candidate.applyId}-${candidate.rank}`}
                        className={`vt-ranking-row rank-${candidate.rank}${selectedCandidate?.applyId === candidate.applyId ? " selected" : ""}`}
                        onClick={() => setSelectedCandidateId(candidate.applyId)}
                      >
                        <span className="vt-ranking-rank">{candidate.rank}</span>
                        <div className="vt-ranking-main">
                          <div className="vt-ranking-line">
                            <p className="vt-ranking-name">{candidate.name}</p>
                            <span className="vt-ranking-votes">
                              <strong>{formatCount(candidate.votes)}표</strong>
                              {formatPct(candidate.pct)}
                            </span>
                          </div>
                          <div className="vt-ranking-track">
                            <div className="vt-ranking-fill" style={{ width: `${width}%` }} />
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="vt-state-card">집계된 후보 데이터가 없습니다.</div>
              )}
              {hasMoreThanFive ? (
                <button
                  className="vt-ranking-toggle"
                  onClick={() => setShowAllCandidates((prev) => !prev)}
                >
                  {showAllCandidates ? "상위 5명만 보기" : "전체 후보 보기"}
                </button>
              ) : null}
            </>
          ) : (
            <div className="vt-state-card">콘테스트를 선택하면 순위가 표시됩니다.</div>
          )}
        </article>

        <aside className="vt-card">
          <header className="vt-card-header">
            <h2 className="vt-card-title">
              <span className="vt-card-title-icon">
                <Trophy size={14} />
              </span>
              후보 상세
            </h2>
            {selectedCandidate ? (
              <span className="vt-card-tag">현재 {selectedCandidate.rank}위</span>
            ) : null}
          </header>
          {selectedCandidate ? (
            <>
              <p className="vt-detail-name">{selectedCandidate.name}</p>
              <p className="vt-detail-sub">{selectedCandidate.ownerNickname}</p>
              <div className="vt-detail-media">
                {selectedCandidate.imageUrl ? (
                  <img
                    src={resolveImageUrl(
                      selectedCandidate.imageUrl,
                      fallbackPetImage(selectedCandidate.applyId),
                    )}
                    alt={selectedCandidate.name}
                    onError={createImageFallbackHandler(
                      fallbackPetImage(selectedCandidate.applyId),
                    )}
                  />
                ) : (
                  <div className="vt-detail-placeholder">후보 이미지가 없습니다</div>
                )}
              </div>
              <div className="vt-detail-metrics">
                <div className="vt-detail-metric">
                  <p className="vt-detail-metric-label">현재 순위</p>
                  <p className="vt-detail-metric-value">{selectedCandidate.rank}위</p>
                </div>
                <div className="vt-detail-metric">
                  <p className="vt-detail-metric-label">득표수</p>
                  <p className="vt-detail-metric-value">{formatCount(selectedCandidate.votes)}표</p>
                </div>
                <div className="vt-detail-metric">
                  <p className="vt-detail-metric-label">점유율</p>
                  <p className="vt-detail-metric-value">{formatPct(selectedCandidate.pct)}</p>
                </div>
                <div className="vt-detail-metric">
                  <p className="vt-detail-metric-label">
                    {selectedCandidate.rank === 1 ? "선두 상태" : "선두와 차이"}
                  </p>
                  <p className="vt-detail-metric-value">
                    {selectedCandidate.rank === 1
                      ? "현재 선두"
                      : `${formatCount(selectedCandidate.gapFromLeader)}표`}
                  </p>
                </div>
                <div className="vt-detail-metric">
                  <p className="vt-detail-metric-label">
                    {selectedCandidate.rank <= 1 ? "직전 순위와 차이" : "바로 위 순위와 차이"}
                  </p>
                  <p className="vt-detail-metric-value">
                    {selectedCandidate.rank <= 1
                      ? "없음"
                      : `${formatCount(selectedCandidate.gapFromPrevious)}표`}
                  </p>
                </div>
              </div>
            </>
          ) : (
            <div className="vt-state-card">후보 정보가 없습니다.</div>
          )}
        </aside>
      </section>
    </>
  );
}

export default function VoteStatus() {
  const { eventId } = useParams();
  const navigate = useNavigate();

  const handleSelectEvent = useCallback(
    (selectedEventId) => {
      navigate(`/realtime/votestatus/${selectedEventId}`);
    },
    [navigate],
  );

  return (
    <div className="vt-root">
      <style>{styles}</style>
      <style>{SHARED_ANIM_STYLES}</style>
      <PageHeader
        title={eventId ? "투표현황" : "실시간현황"}
        subtitle={eventId ? "진행 중인 투표의 실시간 결과를 확인합니다" : "행사별 실시간 데이터를 한눈에 확인하세요"}
        icon={<Vote size={42} color="#90C450" strokeWidth={1.6} />}
        titleStyle={{ fontSize: 46, lineHeight: "66px", letterSpacing: "-1px" }}
        subtitleStyle={{ fontSize: 20 }}
      />
      <main className={`vt-container${eventId ? " with-event" : " selector-mode"}`}>
        <div className="vt-page-shell">
          {eventId ? (
            <>
              <div className="vt-top-actions">
                <div className="vt-event-mode-nav">
                  {EVENT_REALTIME_BUTTONS.map((button) => (
                    <button
                      key={button.key}
                      type="button"
                      className={`vt-mode-btn${button.key === "vote" ? " active" : ""}`}
                      onClick={() => navigate(`${button.path}/${eventId}`)}
                    >
                      {button.label}
                    </button>
                  ))}
                </div>
              </div>
              <VoteContent eventId={eventId} />
              <div style={{ display: "flex", justifyContent: "center", marginTop: 32 }}>
                <button className="vt-back-btn" onClick={() => navigate("/realtime/votestatus")}>
                  <ArrowLeft size={15} />
                  목록으로
                </button>
              </div>
            </>
          ) : (
            <RealtimeEventSelector
              onSelectEvent={handleSelectEvent}
              pageTitle="투표 현황"
              metricType="vote"
              programCategory="CONTEST"
            />
          )}
        </div>
      </main>
    </div>
  );
}
