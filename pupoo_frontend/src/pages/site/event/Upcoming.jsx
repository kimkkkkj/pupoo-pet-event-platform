import PageHeader from "../components/PageHeader";
import PageLoading from "../components/PageLoading";
import EmptyState from "../components/EmptyState";
import EventDetailModal from "./EventDetailModal";
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { eventApi } from "../../../app/http/eventApi";
import { axiosInstance } from "../../../app/http/axiosInstance";
import { tokenStore } from "../../../app/http/tokenStore";
import { normalizeEventTitle } from "../../../shared/utils/eventDisplay";
import { resolveImageUrl } from "../../../shared/utils/publicAssetUrl";
import {
  MapPin,
  Clock,
  ChevronRight,
  Search,
  Bell,
  BellRing,
  Tag,
  CalendarClock,
} from "lucide-react";

export const SERVICE_CATEGORIES = [
  { label: "현재 진행 행사", path: "/event/current" },
  { label: "예정 행사", path: "/event/upcoming" },
  { label: "종료 행사", path: "/event/closed" },
  { label: "행사 사전 등록", path: "/event/preregister" },
  { label: "행사 일정 안내", path: "/event/eventschedule" },
];

export const SUBTITLE_MAP = {
  "/event/current": "현재 진행 중인 행사 목록을 확인합니다",
  "/event/upcoming": "예정된 행사 일정을 확인합니다",
  "/event/closed": "종료된 행사 목록을 확인합니다",
  "/event/preregister": "행사 사전 등록을 진행합니다",
  "/event/eventschedule": "행사 일정을 안내합니다",
};

const styles = `
  @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.min.css');

  .up-root {
    box-sizing: border-box;
    font-family: 'Pretendard Variable', 'Pretendard', -apple-system, sans-serif;
    background: #f8f9fc;
    min-height: 100vh;
  }
  .up-root *, .up-root *::before, .up-root *::after { box-sizing: border-box; font-family: inherit; }

  .up-header {
    background: #fff; border-bottom: 1px solid #e9ecef; padding: 0 32px;
  }
  .up-header-inner {
    max-width: 1400px; margin: 0 auto;
    display: flex; align-items: center; justify-content: space-between; height: 64px;
  }
  .up-header-title { font-size: 17px; font-weight: 800; color: #111827; }
  .up-header-sub { font-size: 12px; color: #9ca3af; margin-top: 1px; }
  .up-nav { display: flex; gap: 4px; }
  .up-nav-btn {
    height: 34px; padding: 0 14px; border: none; border-radius: 8px;
    font-size: 13px; font-weight: 500; color: #6b7280; background: transparent;
    cursor: pointer; font-family: inherit; transition: all 0.15s;
  }
  .up-nav-btn:hover { background: #f8f9fc; color: #111827; }
  .up-nav-btn.active { background: #90C450; color: #fff; font-weight: 600; }

  .up-container { width: min(1400px, calc(100% - 40px)); margin: 0 auto; padding: 32px 0 64px; }

  .up-toolbar-top { display: flex; gap: 12px; align-items: center; justify-content: space-between; margin-bottom: 18px; flex-wrap: wrap; }
  .up-toolbar-left { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
  .up-search-box { position: relative; width: 280px; flex-shrink: 0; }

  .up-status-chip {
    display: inline-flex; align-items: center; gap: 7px;
    height: 52px; padding: 0 20px;
    background: #fff; border: 1.5px solid #e2e8f0; border-radius: 14px;
    font-size: 16px; font-weight: 700; color: #111827;
    white-space: nowrap; flex-shrink: 0;
  }
  .up-status-dot { width: 8px; height: 8px; border-radius: 50%; background: #90C450; animation: up-pulse 1.4s ease-in-out infinite; }
  .up-status-count { color: #90C450; font-weight: 800; }
  @keyframes up-pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.5; transform: scale(0.8); } }

  .up-filter-btn {
    height: 36px; padding: 0 14px; border: 1px solid #e5e7eb; border-radius: 999px;
    background: transparent; font-size: 14px; font-weight: 600; color: #6b7280;
    cursor: pointer; display: flex; align-items: center; gap: 5px; font-family: inherit;
    transition: all 0.15s; white-space: nowrap;
  }
  .up-filter-btn:hover { border-color: #90C450; color: #90C450; }
  .up-filter-btn.active { border: none; background: #90C450; color: #fff; font-weight: 700; }

  /* Card grid */
  .up-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
  .up-event-card {
    background: #fff; border: 1px solid #e9ecef; border-radius: 16px;
    overflow: hidden; display: flex;
    transition: box-shadow 0.25s, transform 0.25s; cursor: pointer;
  }
  .up-event-card:hover { box-shadow: 0 12px 36px rgba(0,0,0,0.08); transform: translateY(-2px); }

  .up-thumb {
    width: 180px; flex-shrink: 0;
    overflow: hidden; background: #f4f8ee; position: relative;
  }
  .up-thumb img { width: 100%; height: 100%; object-fit: cover; display: block; transition: transform 0.4s; }
  .up-event-card:hover .up-thumb img { transform: scale(1.03); }
  .up-thumb-fallback {
    width: 100%; height: 100%; min-height: 200px;
    display: flex; align-items: center; justify-content: center; font-size: 36px;
    background: linear-gradient(135deg, #90C450 0%, rgb(99, 234, 241) 100%);
  }
  .up-d-badge {
    position: absolute; top: 10px; right: 10px;
    font-size: 13px; font-weight: 800; color: #fff;
    padding: 3px 9px; border-radius: 7px;
    background: linear-gradient(135deg, #ef4444, #f97316);
    box-shadow: 0 2px 8px rgba(239,68,68,0.3);
  }

  .up-event-body { flex: 1; padding: 18px 20px; display: flex; flex-direction: column; min-width: 0; }
  .up-event-top { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; flex-wrap: wrap; }
  .up-event-category { font-size: 12px; font-weight: 700; padding: 3px 9px; border-radius: 6px; }
  .up-event-title { font-size: 16px; font-weight: 700; color: #111827; margin-bottom: 10px; line-height: 1.45; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
  .up-event-meta { display: flex; flex-direction: column; gap: 5px; margin-bottom: 12px; }
  .up-event-meta-item { display: flex; align-items: center; gap: 6px; font-size: 13.5px; color: #6b7280; }
  .up-event-footer { margin-top: auto; display: flex; align-items: center; justify-content: space-between; padding-top: 12px; border-top: 1px solid #f1f3f5; gap: 8px; }
  .up-participants { font-size: 13px; color: #6b7280; }
  .up-participants strong { font-size: 15px; font-weight: 800; color: #111827; }
  .up-action-row { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
  .up-alarm-btn {
    height: 34px; padding: 0 10px; border-radius: 8px; font-size: 13px; font-weight: 600;
    cursor: pointer; display: flex; align-items: center; gap: 4px; font-family: inherit;
    transition: all 0.15s;
  }
  .up-alarm-btn.off { border: 1px solid #e2e8f0; background: #fff; color: #374151; }
  .up-alarm-btn.off:hover { border-color: #90C450; color: #90C450; }
  .up-alarm-btn.on { border: 1px solid #90C450; background: #f4f8ee; color: #90C450; }
  .up-pre-btn {
    height: 34px; padding: 0 13px; border-radius: 8px; border: none;
    font-size: 13.5px; font-weight: 700; cursor: pointer; font-family: inherit;
    background: #90C450; color: #fff; transition: all 0.15s; white-space: nowrap;
  }
  .up-pre-btn:hover { background: #1640b8; }
  .up-pre-btn:disabled { opacity: 0.55; cursor: not-allowed; }

  @media (max-width: 900px) {
    .up-grid { grid-template-columns: 1fr; }
  }
  @media (max-width: 860px) {
    .up-toolbar-top { flex-direction: column; align-items: stretch; }
    .up-toolbar-left { flex-wrap: nowrap; overflow-x: auto; overflow-y: hidden; scrollbar-width: none; -ms-overflow-style: none; padding-bottom: 2px; }
    .up-toolbar-left::-webkit-scrollbar { display: none; }
    .up-search-box { width: 100%; }
  }
  @media (max-width: 600px) {
    .up-container { width: calc(100% - 20px); padding: 16px 0 40px; }
    .up-status-chip { height: 44px; padding: 0 14px; font-size: 14px; border-radius: 12px; }
    .up-event-card { flex-direction: column; }
    .up-thumb { width: 100%; height: 180px; }
    .up-thumb-fallback { min-height: 180px; }
    .up-event-body { padding: 12px 14px 14px; }
    .up-event-title { font-size: 15px; margin-bottom: 8px; }
    .up-event-meta { gap: 3px; margin-bottom: 10px; }
    .up-event-meta-item { font-size: 12.5px; }
    .up-event-footer { flex-wrap: wrap; gap: 8px; }
    .up-participants { font-size: 12px; }
    .up-action-row { width: 100%; justify-content: flex-end; }
    .up-alarm-btn { height: 36px; font-size: 13px; }
    .up-pre-btn { height: 36px; flex: 1; justify-content: center; font-size: 13.5px; }
  }
`;

const CATEGORY_COLORS = {
  컨퍼런스: { bg: "#eff4ff", color: "#90C450" },
  워크샵: { bg: "#f5f3ff", color: "#7c3aed" },
  세미나: { bg: "#ecfdf5", color: "#059669" },
  포럼: { bg: "#fff7ed", color: "#d97706" },
  전시: { bg: "#fef2f2", color: "#dc2626" },
  네트워킹: { bg: "#f0fdf4", color: "#90C450" },
};

function formatDate(value) {
  if (!value) return "일정 미정";
  const s = String(value);
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return "일정 미정";
  return `${m[1]}.${m[2]}.${m[3]}`;
}

function toDateOrNull(value) {
  if (!value) return null;
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? null : d;
}

function isPlannedByTime(raw) {
  const now = new Date();
  const status = String(raw?.status || "").toUpperCase();
  if (status === "CANCELLED") return false;
  const start = toDateOrNull(raw?.startAt ?? raw?.startDateTime ?? raw?.startDate);
  return start ? start > now : false;
}

function formatTime(startAt, endAt) {
  const pick = (v) => {
    if (!v) return "";
    const m = String(v).match(/(\d{2}):(\d{2})/);
    return m ? `${m[1]}:${m[2]}` : "";
  };
  const a = pick(startAt);
  const b = pick(endAt);
  if (a && b) return `${a} ~ ${b}`;
  if (a || b) return a || b;
  return "시간 미정";
}

function buildDateParts(startAt) {
  if (!startAt) {
    return { month: "", day: "", dow: "" };
  }
  const s = String(startAt);
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) {
    return { month: "", day: "", dow: "" };
  }
  const year = Number(m[1]);
  const month = m[2];
  const day = m[3];

  const date = new Date(year, Number(month) - 1, Number(day));
  const week = ["일", "월", "화", "수", "목", "금", "토"];
  const dow = Number.isNaN(date.getTime()) ? "" : week[date.getDay()];

  return { month, day, dow };
}

function mapEvent(raw) {
  const eventId = raw?.eventId ?? raw?.id ?? null;
  const title = normalizeEventTitle(raw?.eventName ?? raw?.title, raw);
  const category = raw?.category ?? raw?.eventCategory ?? "행사";
  const location = raw?.location ?? raw?.place ?? "장소 미정";
  const startAt = raw?.startAt ?? raw?.startDateTime ?? raw?.startDate ?? null;
  const endAt = raw?.endAt ?? raw?.endDateTime ?? raw?.endDate ?? null;
  const parts = buildDateParts(startAt);
  const sortTime = Date.parse(String(startAt || endAt || ""));
  const baseDateRaw = startAt || endAt;
  const baseMatch = baseDateRaw
    ? String(baseDateRaw).match(/^(\d{4})-(\d{2})-(\d{2})/)
    : null;
  let dday = 0;
  if (baseMatch) {
    const eventDate = new Date(
      Number(baseMatch[1]),
      Number(baseMatch[2]) - 1,
      Number(baseMatch[3]),
    );
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const diffMs = eventDate.getTime() - today.getTime();
    dday = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  }

  return {
    id: eventId,
    category,
    title,
    date: formatDate(startAt),
    month: parts.month,
    day: parts.day,
    dow: parts.dow,
    location,
    time: startAt || endAt ? formatTime(startAt, endAt) : "시간 미정",
    sortKey: Number.isNaN(sortTime) ? Number.POSITIVE_INFINITY : sortTime,
    capacity: Number(raw?.capacity ?? raw?.maxParticipants ?? 0),
    registered: Number(
      raw?.preRegistrationCount ??
      raw?.appliedCount ??
      raw?.participants ??
      raw?.registered ??
      0,
    ),
    baseFee: raw?.baseFee ?? raw?.participationFee ?? raw?.fee ?? 0,
    organizer: raw?.organizer ?? "정보 없음",
    organizerPhone: raw?.organizerPhone ?? null,
    organizerEmail: raw?.organizerEmail ?? null,
    dday,
    image: raw?.imageUrl ?? raw?.posterUrl ?? raw?.thumbnail ?? null,
    fallback: "🎪",
  };
}

export default function Upcoming() {
  const navigate = useNavigate();
  const location = useLocation();
  const [query, setQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [filter, setFilter] = useState("all");
  const [alarms, setAlarms] = useState({});
  const [currentPath, setCurrentPath] = useState("/event/upcoming");
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submittingId, setSubmittingId] = useState(null);

  useEffect(() => {
    let mounted = true;

    const fetchEvents = async () => {
      setLoading(true);
      setError("");

      try {
        const res = await eventApi.getEvents({
          status: "PLANNED",
          page: 0,
          size: 100,
        });
        const content = res?.data?.data?.content;
        let list = Array.isArray(content) ? content : [];

        if (list.length === 0) {
          const fallbackRes = await eventApi.getEvents({
            page: 0,
            size: 200,
          });
          const fallbackContent = fallbackRes?.data?.data?.content;
          const all = Array.isArray(fallbackContent) ? fallbackContent : [];
          list = all.filter(isPlannedByTime);
        }

        if (mounted) {
          setEvents(
            list
              .map(mapEvent)
              .sort((a, b) => a.sortKey - b.sortKey)
              .slice(0, 20),
          );
        }
      } catch (e) {
        const msg =
          e?.response?.data?.message || "네트워크 연결을 확인하고 다시 시도해 주세요.";
        if (mounted) setError(msg);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchEvents();
    return () => {
      mounted = false;
    };
  }, []);

  const filtered = events.filter((e) => {
    const matchQ = e.title.includes(query) || e.category.includes(query);
    const matchF = filter === "all" || e.category === filter;
    return matchQ && matchF;
  });

  const categories = [
    ...new Set(
      events
        .map((e) => e.category)
        .filter((c) => c && c !== "행사"),
    ),
  ];

  
  const handlePreApply = async (ev, clickEvent) => {
    clickEvent.stopPropagation();
    if (!ev?.id || submittingId) return;

    if (!tokenStore.getAccess()) {
      navigate("/auth/login", {
        state: { from: `${location.pathname}${location.search}` },
      });
      return;
    }

    const amount = Number(ev?.baseFee ?? 0);
    const params = new URLSearchParams({
      eventId: String(ev.id),
      amount: String(Number.isFinite(amount) ? amount : 0),
      title: ev?.title || "",
      returnUrl: location?.pathname || "/",
    });

    setSubmittingId(ev.id);
    try {
      await axiosInstance.post("/api/event-registrations", {
        eventId: Number(ev.id),
      });
      navigate(`/payment/checkout?${params.toString()}`);
    } catch (e) {
      if (e?.response?.status === 409) {
        navigate(`/payment/checkout?${params.toString()}`);
      } else if (e?.response?.status === 401) {
        navigate("/auth/login", {
          state: { from: `${location.pathname}${location.search}` },
        });
      } else {
        const msg =
          e?.response?.data?.error?.message ||
          e?.response?.data?.message ||
          "사전신청 처리에 실패했습니다.";
        window.alert(msg);
      }
    } finally {
      setSubmittingId(null);
    }
  };

  return (
    <div className="up-root">
      <style>{styles}</style>
      <PageHeader
        title="예정 행사"
        subtitle={SUBTITLE_MAP[currentPath]}
        icon={<CalendarClock size={42} color="#90C450" strokeWidth={1.6} />}
        titleStyle={{ fontSize: 46, lineHeight: "66px", letterSpacing: "-1px" }}
        subtitleStyle={{ fontSize: 20 }}
        categories={SERVICE_CATEGORIES}
        currentPath={currentPath}
        onNavigate={setCurrentPath}
      />

      <main className="up-container">
        {loading ? (
          <PageLoading />
        ) : error ? (
          <EmptyState type="error" message="행사를 불러오지 못했습니다" description="네트워크 연결을 확인하고 다시 시도해 주세요." />
        ) : (
          <>
          {/* 검색 바 + 상태 칩 */}
          <div className="up-toolbar-top">
            <div className="up-toolbar-left">
              <div className="up-status-chip">
                <div className="up-status-dot" />
                예정 <span className="up-status-count">{events.length}</span>
              </div>
              {categories.map((c) => (
                <button
                  key={c}
                  className={`up-filter-btn${filter === c ? " active" : ""}`}
                  onClick={() => setFilter(filter === c ? "all" : c)}
                >
                  <Tag size={10} /> {c}
                </button>
              ))}
            </div>
            <div className="up-search-box">
              <Search
                size={16}
                color={searchFocused ? "#90C450" : "#94a3b8"}
                style={{
                  position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)",
                  transition: "color 0.25s", zIndex: 1,
                }}
              />
              {!searchFocused && !query && (
                <span style={{
                  position: "absolute", left: 38, top: "50%", transform: "translateY(-50%)",
                  fontSize: 15, color: "#94a3b8", fontWeight: 600, pointerEvents: "none", zIndex: 1,
                }}>행사 검색</span>
              )}
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
                style={{
                  width: "100%", height: 44, borderRadius: 12,
                  border: searchFocused ? "2px solid #90C450" : "1.5px solid #e2e8f0",
                  padding: "0 14px 0 38px",
                  fontSize: 15, fontWeight: 700, color: "#0f172a",
                  background: "#fff", outline: "none",
                  transition: "border-color 0.25s, box-shadow 0.25s",
                  boxShadow: searchFocused ? "0 0 0 3px rgba(37,99,235,0.1)" : "none",
                  fontFamily: "inherit",
                }}
              />
            </div>
          </div>

        <div className="up-grid">
          {filtered.length === 0 ? (
            <div style={{ gridColumn: "1 / -1" }}>
              <EmptyState
                message={query ? `"${query}" 검색 결과가 없습니다` : "예정된 행사가 없습니다"}
                description={query ? "다른 검색어로 다시 시도해 보세요" : "현재 예정된 행사가 등록되지 않았습니다"}
              />
            </div>
          ) : null}
          {filtered.map((ev) => {
            const cc = CATEGORY_COLORS[ev.category] || {
              bg: "#f3f4f6",
              color: "#374151",
            };
            const isOn = alarms[ev.id];
            return (
              <div
                key={ev.id}
                className="up-event-card"
                onClick={() => setSelectedEvent(ev)}
              >
                <div className="up-thumb">
                  {ev.image ? (
                    <img
                      src={resolveImageUrl(ev.image)}
                      alt={ev.title}
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                        const fallback = e.currentTarget.nextElementSibling;
                        if (fallback) fallback.style.display = "flex";
                      }}
                    />
                  ) : null}
                  <div className="up-thumb-fallback" style={{ display: ev.image ? "none" : "flex" }}>
                    {ev.fallback}
                  </div>
                  <span className="up-d-badge">D-{ev.dday}</span>
                </div>
                <div className="up-event-body">
                  <div className="up-event-top">
                    <span
                      className="up-event-category"
                      style={{ background: cc.bg, color: cc.color }}
                    >
                      {ev.category}
                    </span>
                  </div>
                  <div className="up-event-title">{ev.title}</div>
                  <div className="up-event-meta">
                    <div className="up-event-meta-item">
                      <MapPin size={12} />
                      {ev.location}
                    </div>
                    <div className="up-event-meta-item">
                      <Clock size={12} />
                      {ev.date} · {ev.time}
                    </div>
                  </div>
                  <div className="up-event-footer">
                    <div className="up-participants">
                      사전 등록&nbsp;&nbsp;<strong>{Number(ev.registered || 0).toLocaleString()}</strong>명
                    </div>
                    <div className="up-action-row">
                      <button
                        className={`up-alarm-btn ${isOn ? "on" : "off"}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setAlarms((a) => ({ ...a, [ev.id]: !a[ev.id] }));
                        }}
                      >
                        {isOn ? <BellRing size={12} /> : <Bell size={12} />}
                        {isOn ? "알림 ON" : "알림"}
                      </button>
                      <button
                        className="up-pre-btn"
                        onClick={(e) => handlePreApply(ev, e)}
                        disabled={submittingId === ev.id}
                      >
                        {submittingId === ev.id ? "처리중" : "사전신청"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
          </>
        )}
      </main>

      {selectedEvent && (
        <EventDetailModal
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
        />
      )}
    </div>
  );
}





