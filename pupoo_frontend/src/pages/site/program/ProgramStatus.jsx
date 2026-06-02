import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  CalendarDays,
  CalendarCheck,
  CalendarX,
  CalendarClock,
  Clock3,
  Layers3,
  MapPin,
  ChevronRight,
  Sparkles,
  Search,
  ChevronDown,
  Zap,
  ArchiveX,
  Clock,
  Calendar,
  Tag,
  Bell,
  BellRing,
  Users,
  Star,
  MessageSquareText,
} from "lucide-react";
import PageHeader from "../components/PageHeader";
import PageLoading from "../components/PageLoading";
import EmptyState from "../components/EmptyState";
import { eventApi } from "../../../app/http/eventApi";
import { programApi } from "../../../app/http/programApi";
import { boothApi } from "../../../app/http/boothApi";
import {
  loadImageCache as loadProgramImageCache,
  injectProgramImages,
} from "../../admin/shared/programImageStore";
import { resolveImageUrl } from "../../../shared/utils/publicAssetUrl";
import CommunityPagination from "../community/shared/CommunityPagination";

const PROGRAM_STATUS_CATEGORIES = [
  { label: "현재 진행 프로그램", path: "/program/current" },
  { label: "예정 프로그램", path: "/program/upcoming" },
  { label: "종료 프로그램", path: "/program/closed" },
];

const CATEGORY_FILTERS = [
  { key: "ALL", label: "전체" },
  { key: "SESSION", label: "세션/강연" },
  { key: "EXPERIENCE", label: "체험존" },
  { key: "CONTEST", label: "콘테스트 및 투표" },
];

const PAGE_CONFIG = {
  current: {
    title: "현재 진행 프로그램",
    subtitle: "현재 진행 행사에 속한 프로그램을 확인하세요",
    icon: <Zap size={42} color="#90C450" strokeWidth={1.6} />,
  },
  upcoming: {
    title: "예정 프로그램",
    subtitle: "예정 행사에 속한 프로그램을 미리 확인하세요",
    icon: <CalendarClock size={42} color="#90C450" strokeWidth={1.6} />,
  },
  closed: {
    title: "종료 프로그램",
    subtitle: "종료 행사에 속한 프로그램 이력을 확인하세요",
    icon: <ArchiveX size={42} color="#90C450" strokeWidth={1.6} />,
  },
};

const styles = `
  .ps-root { background:#f8f9fc; min-height:100vh; }
  .ps-wrap { max-width:1400px; margin:0 auto; padding:32px 0px 64px; }

  .ps-sub-tabs {
    display:flex; gap:8px; margin-bottom:24px;
    background:#f8f9fc; border-radius:999px; padding:4px; width:fit-content;
  }
  .ps-sub-tab {
    padding:10px 24px; border-radius:999px; border:none;
    background:transparent; color:#9ca3af; font-size:15px; font-weight:600;
    cursor:pointer; transition:all 0.15s; white-space:nowrap;
  }
  .ps-sub-tab:hover { color:#374151; }
  .ps-sub-tab.active {
    background:#1f2937; color:#fff;
    box-shadow:0 1px 3px rgba(0,0,0,0.12);
  }

  .ps-toolbar {
    display:flex; align-items:center; justify-content:space-between; gap:14px;
    flex-wrap:wrap; margin-bottom:18px;
  }
  .ps-toolbar-left {
    display:flex; align-items:center; gap:0;
    background:#fff; border:1px solid #e2e5ea; border-radius:12px; height:48px;
    min-width:0; flex:0 0 auto; width:420px;
    transition: border-color 0.15s, box-shadow 0.15s;
  }
  .ps-toolbar-left:focus-within {
    border-color:#111827; box-shadow:0 0 0 2px rgba(17,24,39,0.08);
  }
  .ps-dropdown { position:relative; flex:0 0 auto; }
  .ps-dropdown-btn {
    height:48px; padding:0 36px 0 18px; border-radius:12px 0 0 12px;
    border:none; background:transparent; color:#9ca3af; font-size:14px; font-weight:500;
    cursor:pointer; text-align:left; outline:none; font-family:inherit;
    white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
  }
  .ps-dropdown-arrow {
    position:absolute; right:12px; top:50%; transform:translateY(-50%);
    color:#9ca3af; pointer-events:none; transition:transform .15s ease;
  }
  .ps-dropdown-arrow.open { transform:translateY(-50%) rotate(180deg); }
  .ps-dropdown-divider {
    width:1px; height:20px; background:#dbe2ea; flex-shrink:0;
  }
  .ps-dropdown-list {
    position:absolute; top:calc(100% + 8px); left:0; min-width:280px;
    background:#fff; border-radius:16px; padding:8px 0;
    box-shadow:0 4px 24px rgba(0,0,0,.10); z-index:50;
    max-height:280px; overflow-y:auto;
  }
  .ps-dropdown-item {
    display:flex; align-items:center; gap:10px;
    width:100%; padding:11px 16px; border:none; background:none;
    color:#6b7280; font-size:13px; font-weight:500; cursor:pointer;
    text-align:left; transition:background .1s ease; font-family:inherit;
  }
  .ps-dropdown-item:hover { background:#f9fafb; }
  .ps-dropdown-item.active { color:#111827; font-weight:600; }
  .ps-dropdown-item .dd-icon { color:#9ca3af; flex-shrink:0; }
  .ps-search-wrap {
    position:relative; width:100%; height:100%;
  }
  .ps-search-input {
    width:100%; height:100%; padding:0 16px 0 40px; border-radius:0 12px 12px 0;
    border:none; background:transparent; color:#111827; font-size:14px; font-weight:500;
    outline:none; font-family:inherit;
  }
  .ps-search-input::placeholder { color:#9ca3af; }
  .ps-search-icon {
    position:absolute; left:14px; top:50%; transform:translateY(-50%);
    color:#9ca3af; pointer-events:none;
  }
  .ps-filter { display:inline-flex; gap:0; }
  .ps-filter button {
    border:1px solid #e2e5ea; background:#fff; color:#9ca3af;
    padding:12px 24px; border-radius:0; font-size:15px; font-weight:700; cursor:pointer;
    transition:all .15s ease; margin-left:-1px; font-family:inherit;
  }
  .ps-filter button:first-child { border-radius:12px 0 0 12px; margin-left:0; }
  .ps-filter button:last-child { border-radius:0 12px 12px 0; }
  .ps-filter button:hover { color:#374151; background:#f9fafb; }
  .ps-filter button.active { background:#111827; border-color:#111827; color:#fff; z-index:1; position:relative; }
  .ps-filter-badge {
    display:inline-flex; align-items:center; justify-content:center;
    min-width:20px; height:20px; border-radius:99px; padding:0 6px;
    font-size:11px; font-weight:800; margin-left:8px;
    background:#e5e7eb; color:#6b7280;
  }
  .ps-filter button.active .ps-filter-badge {
    background:rgba(255,255,255,0.2); color:#fff;
  }

  /* ── Current: 4-column vertical cards (matching ev-) ── */
  .ps-grid-current { display:grid; grid-template-columns:repeat(4,1fr); gap:18px; }
  .ps-card-current {
    background:#fff; border:1px solid #e9ecef; border-radius:16px;
    overflow:hidden; transition:box-shadow 0.25s, transform 0.25s; cursor:pointer;
    display:flex; flex-direction:column;
  }
  .ps-card-current:hover { box-shadow:0 6px 18px rgba(0,0,0,0.06); transform:translateY(-3px); }
  .ps-card-current:hover .ps-card-current-btn { background:#90C450; color:#fff; border-color:#90C450; }
  .ps-card-current-thumb { position:relative; overflow:hidden; background:#f1f5f9; }
  .ps-card-current-thumb img { width:100%; display:block; transition:transform 0.4s ease; }
  .ps-card-current:hover .ps-card-current-thumb img { transform:scale(1.03); }
  .ps-card-current-thumb-overlay { position:absolute; inset:0; background:linear-gradient(to bottom, transparent 60%, rgba(0,0,0,0.35) 100%); pointer-events:none; }
  .ps-card-current-thumb-label {
    position:absolute; top:12px; left:12px; display:flex; align-items:center; gap:5px;
    background:rgba(239,68,68,0.9); color:#fff; padding:4px 12px; border-radius:100px;
    font-size:13px; font-weight:700; backdrop-filter:blur(4px);
  }
  .ps-card-current-thumb-fallback {
    width:100%; aspect-ratio:3/4; display:flex; align-items:center; justify-content:center;
    font-size:48px; background:linear-gradient(135deg, #E6F7F2 0%, #f8fafc 100%); color:#bfccdf;
  }
  .ps-card-current-body { padding:16px 18px 18px; flex:1; display:flex; flex-direction:column; }
  .ps-card-current-category { font-size:13px; font-weight:700; color:#90C450; margin-bottom:6px; letter-spacing:0.3px; }
  .ps-card-current-event { font-size:13px; font-weight:700; color:#0f766e; margin-bottom:4px; }
  .ps-card-current-title { font-size:16.5px; font-weight:700; color:#111827; margin-bottom:10px; line-height:1.45; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }
  .ps-card-current-meta { display:flex; flex-direction:column; gap:4px; margin-bottom:14px; }
  .ps-card-current-meta-row { display:flex; align-items:center; gap:6px; font-size:14px; color:#6b7280; }
  .ps-card-current-footer { margin-top:auto; padding-top:12px; border-top:1px solid #f1f3f5; }
  .ps-card-current-progress-wrap { margin-bottom:10px; }
  .ps-card-current-progress-label { display:flex; justify-content:space-between; font-size:13px; color:#9ca3af; margin-bottom:5px; }
  .ps-card-current-progress-track { height:6px; background:#f1f3f5; border-radius:100px; overflow:hidden; }
  .ps-card-current-progress-fill { height:100%; border-radius:100px; background:linear-gradient(90deg, #90C450, #6366f1); transition:width 0.6s ease; }
  .ps-card-current-btn {
    width:100%; height:42px; border:1px solid #e2e8f0; border-radius:10px; background:#fff;
    font-size:15px; font-weight:700; color:#374151; cursor:pointer; display:flex;
    align-items:center; justify-content:center; gap:4px; font-family:inherit; transition:all 0.15s;
  }
  .ps-card-current-btn:hover { background:#90C450; color:#fff; border-color:#90C450; }

  /* ── Upcoming: 2-column horizontal cards (matching up-) ── */
  .ps-grid-upcoming { display:grid; grid-template-columns:repeat(2,1fr); gap:16px; }
  .ps-card-upcoming {
    background:#fff; border:1px solid #e9ecef; border-radius:16px;
    overflow:hidden; display:flex;
    transition:box-shadow 0.25s, transform 0.25s; cursor:pointer;
  }
  .ps-card-upcoming:hover { box-shadow:0 12px 36px rgba(0,0,0,0.08); transform:translateY(-2px); }
  .ps-card-upcoming-thumb {
    width:180px; flex-shrink:0; overflow:hidden; background:#E6F7F2; position:relative;
  }
  .ps-card-upcoming-thumb img { width:100%; height:100%; object-fit:cover; display:block; transition:transform 0.4s; }
  .ps-card-upcoming:hover .ps-card-upcoming-thumb img { transform:scale(1.03); }
  .ps-card-upcoming-thumb-fallback {
    width:100%; height:100%; min-height:200px;
    display:flex; align-items:center; justify-content:center; font-size:36px;
    background:linear-gradient(135deg, #E6F7F2 0%, #f8fafc 100%); color:#bfccdf;
  }
  .ps-card-upcoming-d-badge {
    position:absolute; top:12px; right:12px;
    font-size:14px; font-weight:800; color:#fff;
    padding:4px 10px; border-radius:8px;
    background:linear-gradient(135deg, #ef4444, #f97316);
    box-shadow:0 2px 8px rgba(239,68,68,0.3);
  }
  .ps-card-upcoming-body { flex:1; padding:20px 22px; display:flex; flex-direction:column; min-width:0; }
  .ps-card-upcoming-top { display:flex; align-items:center; gap:8px; margin-bottom:8px; flex-wrap:wrap; }
  .ps-card-upcoming-category { font-size:13px; font-weight:700; padding:3px 10px; border-radius:6px; }
  .ps-card-upcoming-title { font-size:17px; font-weight:700; color:#111827; margin-bottom:10px; line-height:1.45; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }
  .ps-card-upcoming-meta { display:flex; flex-direction:column; gap:5px; margin-bottom:14px; }
  .ps-card-upcoming-meta-item { display:flex; align-items:center; gap:6px; font-size:14.5px; color:#6b7280; }
  .ps-card-upcoming-footer { margin-top:auto; display:flex; align-items:center; justify-content:space-between; padding-top:12px; border-top:1px solid #f1f3f5; gap:8px; }
  .ps-card-upcoming-event-name { font-size:14px; color:#6b7280; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .ps-card-upcoming-detail-btn {
    height:34px; padding:0 14px; border-radius:8px; border:none;
    font-size:14.5px; font-weight:700; cursor:pointer; font-family:inherit;
    background:#90C450; color:#fff; transition:all 0.15s; flex-shrink:0;
    display:flex; align-items:center; gap:4px;
  }
  .ps-card-upcoming-detail-btn:hover { background:#1640b8; }

  /* ── Closed: 2-column horizontal cards (matching upcoming, muted) ── */
  .ps-grid-closed { display:grid; grid-template-columns:repeat(2,1fr); gap:16px; }
  .ps-card-closed {
    background:#fff; border:1px solid #e9ecef; border-radius:16px;
    overflow:hidden; display:flex;
    transition:box-shadow 0.25s, transform 0.25s; cursor:pointer;
  }
  .ps-card-closed:hover { box-shadow:0 12px 36px rgba(0,0,0,0.08); transform:translateY(-2px); }
  .ps-card-closed-thumb {
    width:180px; flex-shrink:0; overflow:hidden; background:#f1f5f9; position:relative;
  }
  .ps-card-closed-thumb img { width:100%; height:100%; object-fit:cover; display:block; filter:grayscale(40%) brightness(0.92); transition:filter 0.4s, transform 0.4s; }
  .ps-card-closed:hover .ps-card-closed-thumb img { filter:grayscale(10%) brightness(0.97); transform:scale(1.03); }
  .ps-card-closed-thumb-ph {
    width:100%; height:100%; min-height:200px;
    display:flex; flex-direction:column; align-items:center; justify-content:center; gap:8px; font-size:36px;
    background:linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%); color:#94a3b8;
  }
  .ps-card-closed-thumb-ph span { font-size:12px; font-weight:600; color:#94a3b8; }
  .ps-card-closed-badge {
    position:absolute; top:12px; right:12px;
    font-size:13px; font-weight:800; color:#fff;
    padding:4px 10px; border-radius:8px;
    background:rgba(107,114,128,0.85); backdrop-filter:blur(4px);
    display:inline-flex; align-items:center; gap:5px;
  }
  .ps-card-closed-body { flex:1; padding:20px 22px; display:flex; flex-direction:column; min-width:0; }
  .ps-card-closed-top { display:flex; align-items:center; gap:8px; margin-bottom:8px; flex-wrap:wrap; }
  .ps-card-closed-category { font-size:13px; font-weight:700; padding:3px 10px; border-radius:6px; }
  .ps-card-closed-title { font-size:17px; font-weight:700; color:#475569; margin-bottom:10px; line-height:1.45; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }
  .ps-card-closed-meta { display:flex; flex-direction:column; gap:5px; margin-bottom:14px; }
  .ps-card-closed-meta-row { display:flex; align-items:center; gap:6px; font-size:14.5px; color:#94a3b8; }
  .ps-card-closed-footer {
    margin-top:auto; display:flex; align-items:center; justify-content:space-between; padding-top:12px; border-top:1px solid #f1f3f5; gap:8px;
  }
  .ps-card-closed-event-name { font-size:14px; color:#94a3b8; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .ps-card-closed-detail-btn {
    height:34px; padding:0 14px; border-radius:8px; border:none;
    font-size:14.5px; font-weight:700; cursor:pointer; font-family:inherit;
    background:#6b7280; color:#fff; transition:all 0.15s; flex-shrink:0;
    display:flex; align-items:center; gap:4px;
  }
  .ps-card-closed-detail-btn:hover { background:#4b5563; }

  .ps-empty {
    background:#fff; border:1px solid #e9ecef; border-radius:16px; padding:70px 24px;
    display:flex; flex-direction:column; align-items:center; justify-content:center; color:#94a3b8;
  }
  .ps-empty strong { color:#475569; margin-bottom:6px; }

  @keyframes ps-pulse { 0%, 100% { opacity:1; transform:scale(1); } 50% { opacity:0.5; transform:scale(0.8); } }

  @media (max-width:1100px) {
    .ps-grid-current { grid-template-columns:repeat(3,1fr); }
  }
  @media (max-width:900px) {
    .ps-grid-upcoming { grid-template-columns:1fr; }
    .ps-grid-closed { grid-template-columns:1fr; }
  }
  @media (max-width:860px) {
    .ps-grid-current { grid-template-columns:repeat(2,1fr); }
  }
  @media (max-width:760px) {
    .ps-wrap { padding:20px 16px 48px; }
    .ps-stats { grid-template-columns:repeat(2,1fr); }
    .ps-grid-current { grid-template-columns:1fr; }
    .ps-toolbar { flex-direction:column; align-items:stretch; gap:10px; }
    .ps-toolbar-left { width:100%; flex-wrap:nowrap; border-radius:10px; height:40px; background:#f3f4f6; border:none; }
    .ps-dropdown-btn { border-radius:10px 0 0 10px; height:40px; font-size:13px; }
    .ps-search-input { border-radius:0 10px 10px 0; font-size:13px; }
    .ps-filter {
      display:flex; flex-wrap:nowrap; overflow-x:auto; scrollbar-width:none; gap:8px;
      padding-bottom:2px; width:100%;
    }
    .ps-filter::-webkit-scrollbar { display:none; }
    .ps-filter button {
      flex-shrink:0; border-radius:6px !important; margin-left:0 !important;
      padding:5px 12px; font-size:12px; height:28px; display:flex; align-items:center;
      border:none !important; background:rgb(235,235,235) !important; color:#888 !important;
    }
    .ps-filter button.active {
      background:#111827 !important; color:#fff !important;
    }
    .ps-filter button:first-child { border-radius:999px !important; }
    .ps-filter button:last-child { border-radius:999px !important; }
    .ps-select, .ps-search-wrap { width:100%; min-width:0; }
  }
  @media (max-width:600px) {
    .ps-sub-tabs {
      width:100%; overflow-x:auto; scrollbar-width:none; border-radius:12px; gap:4px;
    }
    .ps-sub-tabs::-webkit-scrollbar { display:none; }
    .ps-sub-tab { padding:5px 12px; font-size:12px; height:28px; border-radius:6px !important; }
    .ps-card-upcoming { flex-direction:column; }
    .ps-card-upcoming-thumb { width:100%; height:180px; }
    .ps-card-upcoming-body { padding:14px 16px; }
    .ps-card-upcoming-title { font-size:15px; }
    .ps-card-upcoming-meta-item { font-size:13px; }
    .ps-card-upcoming-footer { flex-direction:column; align-items:flex-start; gap:8px; }
    .ps-card-upcoming-detail-btn { width:100%; justify-content:center; }
    .ps-card-closed { flex-direction:column; }
    .ps-card-closed-thumb { width:100%; height:180px; }
    .ps-card-closed-body { padding:14px 16px; }
    .ps-card-closed-title { font-size:15px; }
    .ps-card-closed-meta-row { font-size:13px; }
    .ps-card-closed-footer { flex-direction:column; align-items:flex-start; gap:8px; }
    .ps-card-closed-detail-btn { width:100%; justify-content:center; }
    .ps-card-current-body { padding:12px 14px 14px; }
    .ps-card-current-title { font-size:15px; }
    .ps-card-current-meta-row { font-size:13px; }
  }
`;

const CATEGORY_COLORS = {
  SESSION: { bg: "#E6F7F2", color: "#90C450" },
  EXPERIENCE: { bg: "#ecfdf5", color: "#059669" },
  CONTEST: { bg: "#fff7ed", color: "#ea580c" },
  ETC: { bg: "#f3f4f6", color: "#374151" },
};

function toDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDate(value) {
  const date = toDate(value);
  if (!date) return "일정 미정";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}.${m}.${d}`;
}

function formatTime(value) {
  const match = String(value ?? "").match(/(\d{2}):(\d{2})/);
  return match ? `${match[1]}:${match[2]}` : "";
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function diffDays(dateA, dateB) {
  const oneDay = 24 * 60 * 60 * 1000;
  return Math.round(
    (startOfDay(dateA).getTime() - startOfDay(dateB).getTime()) / oneDay,
  );
}

function rebaseProgramDate(value, sourceBaseDate, targetBaseDate) {
  const original = toDate(value);
  if (!original || !sourceBaseDate || !targetBaseDate) return original;
  const offsetDays = diffDays(original, sourceBaseDate);
  const rebased = new Date(startOfDay(targetBaseDate));
  rebased.setDate(rebased.getDate() + offsetDays);
  rebased.setHours(
    original.getHours(),
    original.getMinutes(),
    original.getSeconds(),
    original.getMilliseconds(),
  );
  return rebased;
}

function formatDateTimeRange(startAt, endAt) {
  if (!startAt && !endAt) return "일정 미정";
  const dayText = startAt ? formatDate(startAt) : formatDate(endAt);
  const startText = formatTime(startAt);
  const endText = formatTime(endAt);
  if (startText && endText) return `${dayText} ${startText}~${endText}`;
  if (startText || endText) return `${dayText} ${startText || endText}`.trim();
  return dayText;
}

function toProgramRuntimeStatus(startAt, endAt) {
  const now = Date.now();
  const startTs = startAt?.getTime?.() ?? Number.NaN;
  const endTs = endAt?.getTime?.() ?? Number.NaN;
  if (Number.isFinite(startTs) && now < startTs) return "upcoming";
  if (Number.isFinite(endTs) && now > endTs) return "done";
  return "live";
}

function getPageApiStatus(statusKey) {
  if (statusKey === "current") return "ONGOING";
  if (statusKey === "upcoming") return "PLANNED";
  return "ENDED";
}

function toEventPageStatus(item) {
  const raw = String(item?.status ?? item?.eventStatus ?? "").toUpperCase();
  if (raw.includes("ONGOING") || raw.includes("LIVE")) return "current";
  if (raw.includes("PLANNED") || raw.includes("UPCOMING")) return "upcoming";
  if (raw.includes("END")) return "closed";
  const startAt = toDate(item?.startAt ?? item?.startDateTime);
  const endAt = toDate(item?.endAt ?? item?.endDateTime);
  const now = Date.now();
  if (endAt && now > endAt.getTime()) return "closed";
  if (startAt && now >= startAt.getTime()) return "current";
  return "upcoming";
}

function sortEventsByPage(events, statusKey) {
  const list = [...events];
  if (statusKey === "current") {
    return list.sort((a, b) => {
      const aTime = toDate(a?.endAt ?? a?.endDateTime)?.getTime() ?? Number.POSITIVE_INFINITY;
      const bTime = toDate(b?.endAt ?? b?.endDateTime)?.getTime() ?? Number.POSITIVE_INFINITY;
      return aTime - bTime;
    });
  }
  if (statusKey === "upcoming") {
    return list.sort((a, b) => {
      const aTime = toDate(a?.startAt ?? a?.startDateTime)?.getTime() ?? Number.POSITIVE_INFINITY;
      const bTime = toDate(b?.startAt ?? b?.startDateTime)?.getTime() ?? Number.POSITIVE_INFINITY;
      return aTime - bTime;
    });
  }
  return list.sort((a, b) => {
    const aTime = toDate(a?.endAt ?? a?.endDateTime)?.getTime() ?? 0;
    const bTime = toDate(b?.endAt ?? b?.endDateTime)?.getTime() ?? 0;
    return bTime - aTime;
  });
}

function compareProgramsByPage(left, right, statusKey) {
  const eventDiff =
    (left.eventSortOrder ?? Number.POSITIVE_INFINITY) -
    (right.eventSortOrder ?? Number.POSITIVE_INFINITY);
  if (eventDiff !== 0) return eventDiff;

  if (statusKey === "closed") {
    const leftEnd = left.endSortAt ?? 0;
    const rightEnd = right.endSortAt ?? 0;
    if (leftEnd !== rightEnd) return rightEnd - leftEnd;
  } else {
    const leftStart = left.startSortAt ?? Number.POSITIVE_INFINITY;
    const rightStart = right.startSortAt ?? Number.POSITIVE_INFINITY;
    if (leftStart !== rightStart) return leftStart - rightStart;
  }

  return (left.programId ?? 0) - (right.programId ?? 0);
}

function normalizeCategory(value) {
  const raw = String(value ?? "").toUpperCase();
  if (
    raw.includes("SESSION") ||
    raw.includes("LECTURE") ||
    raw.includes("SEMINAR") ||
    raw.includes("세션") ||
    raw.includes("강연") ||
    raw.includes("교육") ||
    raw.includes("상담") ||
    raw.includes("문화")
  ) {
    return "SESSION";
  }
  if (
    raw.includes("EXPERIENCE") ||
    raw.includes("EXHIBIT") ||
    raw.includes("BOOTH") ||
    raw.includes("체험")
  ) {
    return "EXPERIENCE";
  }
  if (
    raw.includes("CONTEST") ||
    raw.includes("VOTE") ||
    raw.includes("COMPETITION") ||
    raw.includes("콘테스트") ||
    raw.includes("대회") ||
    raw.includes("투표")
  ) {
    return "CONTEST";
  }
  return "ETC";
}

function categoryLabel(value) {
  if (value === "SESSION") return "세션/강연";
  if (value === "EXPERIENCE") return "체험존";
  if (value === "CONTEST") return "콘테스트";
  return "기타";
}

function resolveDetailPath(program) {
  if (program.categoryKey === "CONTEST") {
    return `/program/contest/${program.eventId}/detail/${program.programId}`;
  }
  return `/program/detail?programId=${program.programId}`;
}

function computeDday(startAt) {
  const date = toDate(startAt);
  if (!date) return 0;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffMs = startOfDay(date).getTime() - today.getTime();
  return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
}

function toSafeNonNegativeNumber(value, fallback = 0) {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.max(0, num);
}

function resolveParticipantCount(programRow) {
  return toSafeNonNegativeNumber(
    programRow?.participantCount ??
      programRow?.participants ??
      programRow?.appliedCount ??
      programRow?.applyCount ??
      0,
  );
}

function resolveCapacity(programRow, eventInfo, participants) {
  const capacity = toSafeNonNegativeNumber(
    programRow?.capacity ??
      programRow?.maxParticipants ??
      eventInfo?.capacity ??
      0,
  );
  return capacity > 0 ? capacity : Math.max(participants, 0);
}

/* ── Card renderers ── */

function CurrentCard({ program, onClick }) {
  return (
    <div className="ps-card-current" onClick={onClick}>
      <div className="ps-card-current-thumb">
        {program.imageUrl ? (
          <img
            src={resolveImageUrl(program.imageUrl)}
            alt={program.title}
            loading="lazy"
            onError={(e) => {
              e.currentTarget.style.display = "none";
              const fb = e.currentTarget.nextElementSibling;
              if (fb) fb.style.display = "flex";
            }}
          />
        ) : null}
        <div
          className="ps-card-current-thumb-fallback"
          style={{ display: program.imageUrl ? "none" : "flex" }}
        >
          <CalendarDays size={28} strokeWidth={1.3} />
        </div>
        <div className="ps-card-current-thumb-overlay" />
        <div className="ps-card-current-thumb-label">
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#fff", animation: "ps-pulse 1.4s ease-in-out infinite" }} />
          LIVE
        </div>
      </div>
      <div className="ps-card-current-body">
        <div className="ps-card-current-category">{program.categoryLabel}</div>
        <div className="ps-card-current-event">{program.eventName}</div>
        <div className="ps-card-current-title">{program.title}</div>
        <div className="ps-card-current-meta">
          <div className="ps-card-current-meta-row">
            <MapPin size={12} /> {program.location}
          </div>
          <div className="ps-card-current-meta-row">
            <Calendar size={12} /> {program.schedule}
          </div>
        </div>
        <div className="ps-card-current-footer">
          <button
            className="ps-card-current-btn"
            onClick={(e) => { e.stopPropagation(); onClick(); }}
          >
            상세보기 <ChevronRight size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}

function UpcomingCard({ program, onClick }) {
  const cc = CATEGORY_COLORS[program.categoryKey] || CATEGORY_COLORS.ETC;
  const dday = computeDday(program.startSortAt);

  return (
    <div className="ps-card-upcoming" onClick={onClick}>
      <div className="ps-card-upcoming-thumb">
        {program.imageUrl ? (
          <img
            src={resolveImageUrl(program.imageUrl)}
            alt={program.title}
            loading="lazy"
            onError={(e) => {
              e.currentTarget.style.display = "none";
              const fb = e.currentTarget.nextElementSibling;
              if (fb) fb.style.display = "flex";
            }}
          />
        ) : null}
        <div
          className="ps-card-upcoming-thumb-fallback"
          style={{ display: program.imageUrl ? "none" : "flex" }}
        >
          <CalendarDays size={28} strokeWidth={1.3} />
        </div>
        <span className="ps-card-upcoming-d-badge">D-{dday}</span>
      </div>
      <div className="ps-card-upcoming-body">
        <div className="ps-card-upcoming-top">
          <span
            className="ps-card-upcoming-category"
            style={{ background: cc.bg, color: cc.color }}
          >
            {program.categoryLabel}
          </span>
          {program.dayLabel && (
            <span
              className="ps-card-upcoming-category"
              style={{ background: "#f3f4f6", color: "#475569" }}
            >
              {program.dayLabel}
            </span>
          )}
        </div>
        <div className="ps-card-upcoming-title">{program.title}</div>
        <div className="ps-card-upcoming-meta">
          <div className="ps-card-upcoming-meta-item">
            <MapPin size={12} /> {program.location}
          </div>
          <div className="ps-card-upcoming-meta-item">
            <Clock size={12} /> {program.schedule}
          </div>
        </div>
        <div className="ps-card-upcoming-footer">
          <span className="ps-card-upcoming-event-name">{program.eventName}</span>
          <button
            className="ps-card-upcoming-detail-btn"
            onClick={(e) => { e.stopPropagation(); onClick(); }}
          >
            상세보기 <ChevronRight size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}

function ClosedCard({ program, onClick }) {
  const cc = CATEGORY_COLORS[program.categoryKey] || CATEGORY_COLORS.ETC;

  return (
    <div className="ps-card-closed" onClick={onClick}>
      <div className="ps-card-closed-thumb">
        {program.imageUrl ? (
          <img
            src={resolveImageUrl(program.imageUrl)}
            alt={program.title}
            loading="lazy"
            onError={(e) => {
              e.currentTarget.style.display = "none";
              const ph = e.currentTarget.nextElementSibling;
              if (ph) ph.style.display = "flex";
            }}
          />
        ) : null}
        <div
          className="ps-card-closed-thumb-ph"
          style={{ display: program.imageUrl ? "none" : "flex" }}
        >
          <CalendarDays size={28} strokeWidth={1.3} />
          <span>이미지 없음</span>
        </div>
        <span className="ps-card-closed-badge">
          <CalendarX size={12} /> 종료
        </span>
      </div>
      <div className="ps-card-closed-body">
        <div className="ps-card-closed-top">
          <span
            className="ps-card-closed-category"
            style={{ background: cc.bg, color: cc.color, opacity: 0.7 }}
          >
            {program.categoryLabel}
          </span>
          {program.dayLabel && (
            <span
              className="ps-card-closed-category"
              style={{ background: "#f3f4f6", color: "#475569", opacity: 0.7 }}
            >
              {program.dayLabel}
            </span>
          )}
        </div>
        <div className="ps-card-closed-title">{program.title}</div>
        <div className="ps-card-closed-meta">
          <div className="ps-card-closed-meta-row">
            <MapPin size={12} /> {program.location}
          </div>
          <div className="ps-card-closed-meta-row">
            <Clock size={12} /> {program.schedule}
          </div>
        </div>
        <div className="ps-card-closed-footer">
          <span className="ps-card-closed-event-name">{program.eventName}</span>
          <button
            className="ps-card-closed-detail-btn"
            onClick={(e) => { e.stopPropagation(); onClick(); }}
            type="button"
          >
            상세보기 <ChevronRight size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ProgramStatus({ statusKey = "current" }) {
  const navigate = useNavigate();
  const { eventId } = useParams();
  const config = PAGE_CONFIG[statusKey] ?? PAGE_CONFIG.current;
  const safeEventId = Number(eventId);

  const PAGE_SIZE = statusKey === "current" ? 12 : 8;
  const [events, setEvents] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [ddOpen, setDdOpen] = useState(false);
  const ddRef = useRef(null);

  useEffect(() => {
    const onClick = (e) => { if (ddRef.current && !ddRef.current.contains(e.target)) setDdOpen(false); };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const eventsRes = await eventApi.getEvents({
          status: getPageApiStatus(statusKey),
          page: 0,
          size: 200,
          sort: statusKey === "current" ? "endAt,asc" : "startAt,asc",
        });
        if (!mounted) return;
        let eventRows = Array.isArray(eventsRes?.data?.data?.content)
          ? eventsRes.data.data.content
          : [];

        if (eventRows.length === 0) {
          const fallbackRes = await eventApi.getEvents({
            page: 0,
            size: 200,
            sort: "startAt,asc",
          });
          if (!mounted) return;
          const allRows = Array.isArray(fallbackRes?.data?.data?.content)
            ? fallbackRes.data.data.content
            : [];
          eventRows = allRows.filter(
            (row) => toEventPageStatus(row) === statusKey,
          );
        }

        if (eventRows.length === 0) {
          setEvents([]);
          setPrograms([]);
          return;
        }

        const orderedEvents = sortEventsByPage(eventRows, statusKey);

        const [programLists, boothLists] = await Promise.all([
          Promise.all(
            orderedEvents.map((row) =>
              programApi
                .getAllProgramsByEvent({
                  eventId: row.eventId,
                  sort: "startAt,asc",
                })
                .catch(() => []),
            ),
          ),
          Promise.all(
            orderedEvents.map((row) =>
              boothApi
                .getEventBooths({
                  eventId: row.eventId,
                  page: 0,
                  size: 200,
                  sort: "boothId,asc",
                })
                .then((res) =>
                  Array.isArray(res?.data?.data?.content)
                    ? res.data.data.content
                    : [],
                )
                .catch(() => []),
            ),
          ),
        ]);
        if (!mounted) return;

        const eventMap = new Map(
          orderedEvents.map((row) => [Number(row?.eventId), row]),
        );
        const eventOrderMap = new Map(
          orderedEvents.map((row, index) => [Number(row?.eventId), index]),
        );
        const rawProgramBaseDateByEvent = new Map();
        programLists.forEach((list, index) => {
          const eventId = Number(orderedEvents[index]?.eventId);
          const dates = (Array.isArray(list) ? list : [])
            .map((row) => toDate(row?.startAt ?? row?.startDateTime))
            .filter(Boolean)
            .sort((a, b) => a.getTime() - b.getTime());
          if (Number.isFinite(eventId) && dates.length > 0) {
            rawProgramBaseDateByEvent.set(eventId, dates[0]);
          }
        });
        const boothMap = new Map();
        boothLists.flat().forEach((row) => {
          const boothId = Number(row?.boothId);
          if (Number.isFinite(boothId) && row?.placeName) {
            boothMap.set(boothId, row.placeName);
          }
        });

        await loadProgramImageCache();
        const matchingPrograms = injectProgramImages(
          programLists.flat().filter(Boolean),
        )
          .map((row, idx) => {
            const normalizedCategory = normalizeCategory(
              row?.category ?? row?.programCategory,
            );
            const eventInfo = eventMap.get(Number(row?.eventId)) ?? {};
            const eventStartDate = toDate(
              eventInfo?.startAt ?? eventInfo?.startDateTime,
            );
            const rawBaseDate = rawProgramBaseDateByEvent.get(
              Number(row?.eventId),
            );
            const rebasedStartAt = rebaseProgramDate(
              row?.startAt ?? row?.startDateTime ?? null,
              rawBaseDate,
              eventStartDate,
            );
            const rebasedEndAt = rebaseProgramDate(
              row?.endAt ?? row?.endDateTime ?? null,
              rawBaseDate,
              eventStartDate,
            );
            const participants = resolveParticipantCount(row);
            const capacity = resolveCapacity(row, eventInfo, participants);
            const dayIndex =
              rebasedStartAt && eventStartDate
                ? diffDays(rebasedStartAt, eventStartDate) + 1
                : null;
            return {
              key: `${row?.programId ?? row?.id ?? idx}`,
              programId: Number(row?.programId ?? row?.id ?? idx),
              eventId: Number(row?.eventId),
              eventSortOrder:
                eventOrderMap.get(Number(row?.eventId)) ??
                Number.POSITIVE_INFINITY,
              eventName: eventInfo?.eventName ?? `행사 ${row?.eventId}`,
              title:
                row?.programTitle ??
                row?.programName ??
                row?.title ??
                `프로그램 ${idx + 1}`,
              description: row?.description ?? "",
              location:
                row?.location ??
                row?.place ??
                row?.zone ??
                boothMap.get(Number(row?.boothId)) ??
                "장소 미정",
              schedule: formatDateTimeRange(rebasedStartAt, rebasedEndAt),
              dayLabel: dayIndex ? `${dayIndex}일차` : "",
              startSortAt:
                rebasedStartAt?.getTime?.() ?? Number.POSITIVE_INFINITY,
              endSortAt: rebasedEndAt?.getTime?.() ?? 0,
              imageUrl: row?.imageUrl ?? row?.image_url ?? null,
              status: toProgramRuntimeStatus(rebasedStartAt, rebasedEndAt),
              categoryKey: normalizedCategory,
              categoryLabel: categoryLabel(normalizedCategory),
              capacity,
              participants,
            };
          })
          .sort((a, b) => compareProgramsByPage(a, b, statusKey));

        const eligibleEventIds = new Set(
          matchingPrograms.map((row) => Number(row.eventId)),
        );
        const eligibleEvents = orderedEvents.filter((row) =>
          eligibleEventIds.has(Number(row?.eventId)),
        );
        const selectedPrograms = Number.isFinite(safeEventId)
          ? matchingPrograms.filter((row) => Number(row.eventId) === safeEventId)
          : matchingPrograms;

        setEvents(eligibleEvents);
        setPrograms(selectedPrograms);
      } catch (err) {
        if (!mounted) return;
        setPrograms([]);
        setError(
          err?.response?.data?.message ??
            "네트워크 연결을 확인하고 다시 시도해 주세요.",
        );
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, [safeEventId, statusKey]);

  useEffect(() => {
    setCategoryFilter("ALL");
    setPage(1);
  }, [safeEventId, statusKey]);

  useEffect(() => {
    setSearchQuery("");
  }, [safeEventId, statusKey]);

  const filteredPrograms = useMemo(() => {
    const keyword = searchQuery.trim().toLowerCase();
    return programs.filter((row) => {
      const matchCategory =
        categoryFilter === "ALL" || row.categoryKey === categoryFilter;
      if (!matchCategory) return false;
      if (!keyword) return true;
      return [
        row.title,
        row.description,
        row.location,
        row.eventName,
        row.categoryLabel,
      ].some((value) => String(value ?? "").toLowerCase().includes(keyword));
    });
  }, [programs, categoryFilter, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredPrograms.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pagedPrograms = useMemo(
    () => filteredPrograms.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [filteredPrograms, currentPage, PAGE_SIZE],
  );

  useEffect(() => {
    setPage(1);
  }, [categoryFilter, searchQuery]);

  const statPrograms = programs;
  const sessionCount = statPrograms.filter(
    (row) => row.categoryKey === "SESSION",
  ).length;
  const experienceCount = statPrograms.filter(
    (row) => row.categoryKey === "EXPERIENCE",
  ).length;
  const contestCount = statPrograms.filter(
    (row) => row.categoryKey === "CONTEST",
  ).length;

  const handleEventChange = (nextEventId) => {
    if (!nextEventId) {
      navigate(`/program/${statusKey}`);
      return;
    }
    navigate(`/program/${statusKey}/${nextEventId}`);
  };

  const gridClass =
    statusKey === "current"
      ? "ps-grid-current"
      : statusKey === "upcoming"
        ? "ps-grid-upcoming"
        : "ps-grid-closed";

  return (
    <div className="ps-root">
      <style>{styles}</style>
      <PageHeader
        title={config.title}
        subtitle={config.subtitle}
        icon={config.icon}
        titleStyle={{ fontSize: 46, lineHeight: "66px", letterSpacing: "-1px" }}
        subtitleStyle={{ fontSize: 20 }}
        categories={PROGRAM_STATUS_CATEGORIES}
        className="ps-page-header"
      />

      <main className="ps-wrap">

        <div className="ps-toolbar">
          <div className="ps-toolbar-left">
            <div className="ps-dropdown" ref={ddRef}>
              <button
                className="ps-dropdown-btn"
                onClick={() => setDdOpen((v) => !v)}
                type="button"
              >
                {Number.isFinite(safeEventId)
                  ? (events.find((r) => r?.eventId === safeEventId)?.eventName ?? `행사 ${safeEventId}`)
                  : "전체 행사"}
              </button>
              <ChevronDown size={15} className={`ps-dropdown-arrow${ddOpen ? " open" : ""}`} />
              {ddOpen && (
                <div className="ps-dropdown-list">
                  <button
                    className={`ps-dropdown-item${!Number.isFinite(safeEventId) ? " active" : ""}`}
                    onClick={() => { handleEventChange(""); setDdOpen(false); }}
                    type="button"
                  >
                    <Search size={14} className="dd-icon" />
                    전체 행사
                  </button>
                  {events.map((row) => (
                    <button
                      key={row?.eventId}
                      className={`ps-dropdown-item${safeEventId === row?.eventId ? " active" : ""}`}
                      onClick={() => { handleEventChange(String(row?.eventId)); setDdOpen(false); }}
                      type="button"
                    >
                      <Search size={14} className="dd-icon" />
                      {row?.eventName ?? `행사 ${row?.eventId}`}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="ps-dropdown-divider" />
            <div className="ps-search-wrap">
              <Search size={15} className="ps-search-icon" />
              <input
                className="ps-search-input"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="어떤 프로그램을 찾고 계세요?"
              />
            </div>
          </div>

          <div className="ps-filter">
            {CATEGORY_FILTERS.map((row) => {
              const countMap = { ALL: statPrograms.length, SESSION: sessionCount, EXPERIENCE: experienceCount, CONTEST: contestCount };
              return (
                <button
                  key={row.key}
                  className={categoryFilter === row.key ? "active" : ""}
                  onClick={() => setCategoryFilter(row.key)}
                  type="button"
                >
                  {row.label}
                  <span className="ps-filter-badge">{countMap[row.key] ?? 0}</span>
                </button>
              );
            })}
          </div>
        </div>

        {loading ? (
          <PageLoading message="프로그램 목록을 불러오는 중입니다" />
        ) : error ? (
          <EmptyState type="error" message="프로그램을 불러오지 못했습니다" description="네트워크 연결을 확인하고 다시 시도해 주세요." />
        ) : filteredPrograms.length === 0 ? (
          <div className="ps-empty">
            <strong>조건에 맞는 프로그램이 없습니다</strong>
            <span>행사나 분류를 바꿔 다시 확인해 주세요.</span>
          </div>
        ) : (
          <>
            <div className={gridClass}>
              {pagedPrograms.map((program) => {
                const goDetail = () => navigate(resolveDetailPath(program));

                if (statusKey === "current") {
                  return (
                    <CurrentCard
                      key={program.key}
                      program={program}
                      onClick={goDetail}
                    />
                  );
                }

                if (statusKey === "upcoming") {
                  return (
                    <UpcomingCard
                      key={program.key}
                      program={program}
                      onClick={goDetail}
                    />
                  );
                }

                return (
                  <ClosedCard
                    key={program.key}
                    program={program}
                    onClick={goDetail}
                  />
                );
              })}
            </div>

            <CommunityPagination
              currentPage={currentPage}
              totalPages={totalPages}
              onChange={setPage}
            />
          </>
        )}
      </main>
    </div>
  );
}
