import PageHeader from "../components/PageHeader";
import PageLoading from "../components/PageLoading";
import EmptyState from "../components/EmptyState";
import EventDetailModal from "./EventDetailModal";
import { useEffect, useState } from "react";
import { eventApi } from "../../../app/http/eventApi";
import { loadImageCache, injectEventImages } from "../../admin/shared/eventImageStore";
import { normalizeEventTitle } from "../../../shared/utils/eventDisplay";
import { resolveImageUrl } from "../../../shared/utils/publicAssetUrl";
import {
  MapPin,
  Calendar,
  ChevronRight,
  Search,
  Zap,
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

  .ev-root {
    box-sizing: border-box;
    font-family: 'Pretendard Variable', 'Pretendard', -apple-system, sans-serif;
    background: #f8f9fc;
    min-height: 100vh;
  }
  .ev-root *, .ev-root *::before, .ev-root *::after { box-sizing: border-box; font-family: inherit; }

  .ev-header { background: #fff; border-bottom: 1px solid #e9ecef; padding: 0 32px; }
  .ev-header-inner { max-width: 1400px; margin: 0 auto; display: flex; align-items: center; justify-content: space-between; height: 64px; }
  .ev-header-left { display: flex; flex-direction: column; }
  .ev-header-title { font-size: 17px; font-weight: 800; color: #111827; }
  .ev-header-sub { font-size: 12px; color: #9ca3af; margin-top: 1px; }
  .ev-nav { display: flex; gap: 4px; }
  .ev-nav-btn { height: 34px; padding: 0 14px; border: none; border-radius: 8px; font-size: 13px; font-weight: 500; color: #6b7280; background: transparent; cursor: pointer; font-family: inherit; transition: all 0.15s; }
  .ev-nav-btn:hover { background: #f8f9fc; color: #111827; }
  .ev-nav-btn.active { background: #90C450; color: #fff; font-weight: 600; }

  .ev-container { width: min(1400px, calc(100% - 40px)); margin: 0 auto; padding: 32px 0 64px; }

  .ev-live-chip {
    display: inline-flex; align-items: center; gap: 7px;
    height: 52px; padding: 0 20px;
    background: #fff; border: 1.5px solid #e2e8f0; border-radius: 14px;
    font-size: 16px; font-weight: 700; color: #111827;
    white-space: nowrap; flex-shrink: 0;
  }
  .ev-live-dot { width: 8px; height: 8px; border-radius: 50%; background: #ef4444; animation: ev-pulse 1.4s ease-in-out infinite; }
  .ev-live-count { color: #ef4444; font-weight: 800; }
  @keyframes ev-pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.5; transform: scale(0.8); } }

  .ev-stat-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin-bottom: 24px; }
  .ev-stat-card { background: #fff; border: 1px solid #e9ecef; border-radius: 13px; padding: 20px 22px; display: flex; align-items: center; gap: 14px; }
  .ev-stat-icon { width: 44px; height: 44px; border-radius: 11px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .ev-stat-label { font-size: 12px; color: #6b7280; font-weight: 500; }
  .ev-stat-value { font-size: 22px; font-weight: 800; color: #111827; }

  .ev-card { background: #fff; border: 1px solid #e9ecef; border-radius: 13px; padding: 24px 28px; margin-bottom: 16px; }
  .ev-card-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 18px; padding-bottom: 14px; border-bottom: 1px solid #f1f3f5; }
  .ev-card-title { font-size: 15px; font-weight: 700; color: #111827; display: flex; align-items: center; gap: 8px; margin: 0; }
  .ev-card-title-icon { width: 24px; height: 24px; border-radius: 6px; background: #fffbeb; display: flex; align-items: center; justify-content: center; }
  .ev-card-tag { font-size: 11px; font-weight: 600; color: #6b7280; background: #f8f9fc; padding: 3px 10px; border-radius: 100px; }

  .ev-toolbar { display: flex; gap: 10px; align-items: center; margin-bottom: 16px; }
  .ev-toolbar-top { display: flex; gap: 12px; row-gap: 10px; align-items: center; justify-content: space-between; margin-bottom: 18px; }
  .ev-search-box { position: relative; width: 280px; flex-shrink: 0; }


  .ev-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 18px; }
  .ev-event-card {
    background: #fff; border: 1px solid #e9ecef; border-radius: 16px;
    overflow: hidden; transition: box-shadow 0.25s, transform 0.25s; cursor: pointer;
    display: flex; flex-direction: column;
  }
  .ev-event-card:hover { box-shadow: 0 6px 18px rgba(0,0,0,0.06); transform: translateY(-3px); }
  .ev-event-card:hover .ev-card-btn { background: #90C450; color: #fff; border-color: #90C450; }

  .ev-card-thumb { position: relative; overflow: hidden; background: #f1f5f9; }
  .ev-card-thumb img { width: 100%; display: block; transition: transform 0.4s ease; }
  .ev-event-card:hover .ev-card-thumb img { transform: scale(1.03); }
  .ev-card-thumb-overlay { position: absolute; inset: 0; background: linear-gradient(to bottom, transparent 60%, rgba(0,0,0,0.35) 100%); pointer-events: none; }
  .ev-card-thumb-label { position: absolute; top: 12px; left: 12px; display: flex; align-items: center; gap: 5px; background: rgba(239,68,68,0.9); color: #fff; padding: 4px 12px; border-radius: 100px; font-size: 13px; font-weight: 700; backdrop-filter: blur(4px); }
  .ev-card-thumb-fallback { width: 100%; aspect-ratio: 3/4; display: flex; align-items: center; justify-content: center; font-size: 48px; }

  .ev-event-card-body { padding: 16px 18px 18px; flex: 1; display: flex; flex-direction: column; }
  .ev-event-category { font-size: 13px; font-weight: 700; color: #90C450; margin-bottom: 6px; letter-spacing: 0.3px; }
  .ev-event-title { font-size: 16.5px; font-weight: 700; color: #111827; margin-bottom: 10px; line-height: 1.45; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
  .ev-event-meta { display: flex; flex-direction: column; gap: 4px; margin-bottom: 14px; }
  .ev-event-meta-row { display: flex; align-items: center; gap: 6px; font-size: 14px; color: #6b7280; }
  .ev-event-footer { margin-top: auto; padding-top: 12px; border-top: 1px solid #f1f3f5; }
  .ev-progress-wrap { margin-bottom: 10px; }
  .ev-progress-label { display: flex; justify-content: space-between; font-size: 13px; color: #9ca3af; margin-bottom: 5px; }
  .ev-progress-track { height: 6px; background: #f1f3f5; border-radius: 100px; overflow: hidden; }
  .ev-progress-fill { height: 100%; border-radius: 100px; background: linear-gradient(90deg, #90C450, #6366f1); transition: width 0.6s ease; }
  .ev-card-btn { width: 100%; height: 42px; border: 1px solid #e2e8f0; border-radius: 10px; background: #fff; font-size: 15px; font-weight: 700; color: #374151; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 4px; font-family: inherit; transition: all 0.15s; }
  .ev-card-btn:hover { background: #90C450; color: #fff; border-color: #90C450; }

  @media (max-width: 1024px) {
    .ev-container { width: calc(100% - 32px); padding: 28px 0 56px; }
    .ev-stat-grid { grid-template-columns: repeat(2, 1fr); }
    .ev-grid { grid-template-columns: repeat(3, 1fr); }
    .ev-toolbar-top { flex-wrap: wrap; }
    .ev-search-box { width: min(320px, 100%); }
  }
  @media (max-width: 860px) {
    .ev-stat-grid { grid-template-columns: 1fr; }
    .ev-grid { grid-template-columns: repeat(2, 1fr); }
    .ev-toolbar-top { flex-direction: column; align-items: flex-start; }
    .ev-search-box { width: 100%; }
  }
  @media (max-width: 600px) {
    .ev-container { width: calc(100% - 20px); padding: 16px 0 32px; }
    .ev-live-chip { height: 44px; padding: 0 14px; font-size: 14px; border-radius: 12px; }
    .ev-toolbar-top { gap: 8px; margin-bottom: 14px; }
    .ev-stat-grid { gap: 10px; margin-bottom: 18px; }
    .ev-stat-card { padding: 14px 16px; gap: 10px; }
    .ev-stat-icon { width: 36px; height: 36px; border-radius: 10px; }
    .ev-stat-value { font-size: 19px; }
    .ev-card { padding: 16px 14px; margin-bottom: 12px; border-radius: 14px; }
    .ev-card-header { margin-bottom: 14px; padding-bottom: 10px; }
    .ev-toolbar { gap: 8px; margin-bottom: 12px; }
    .ev-grid { grid-template-columns: 1fr; }
    .ev-event-card { border-radius: 14px; }
    .ev-event-card-body { padding: 12px 12px 14px; }
    .ev-event-category { font-size: 12px; margin-bottom: 4px; }
    .ev-event-title { font-size: 15px; margin-bottom: 8px; }
    .ev-event-meta { gap: 3px; margin-bottom: 10px; }
    .ev-event-meta-row { font-size: 12.5px; }
    .ev-event-footer { padding-top: 10px; }
    .ev-progress-wrap { margin-bottom: 8px; }
    .ev-card-btn { height: 38px; font-size: 13px; border-radius: 9px; }
  }
`;

function formatDate(value) {
  if (!value) return "일정 미정";
  const s = String(value);
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return "일정 미정";
  return `${m[1]}.${m[2]}.${m[3]}`;
}

function formatDateRange(startAt, endAt) {
  const startDate = formatDate(startAt);
  const endDate = formatDate(endAt);

  if (startDate === "일정 미정" && endDate === "일정 미정") return "일정 미정";
  if (startDate === "일정 미정") return `~ ${endDate}`;
  if (endDate === "일정 미정") return `${startDate} ~`;
  return `${startDate} ~ ${endDate}`;
}

function toSortTimestamp(value) {
  if (!value) return Number.POSITIVE_INFINITY;
  const ts = Date.parse(String(value));
  return Number.isNaN(ts) ? Number.POSITIVE_INFINITY : ts;
}

function toDateOrNull(value) {
  if (!value) return null;
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? null : d;
}

function isOngoingByDate(raw) {
  const now = new Date();
  now.setHours(12, 0, 0, 0);
  const start = toDateOrNull(raw?.startAt ?? raw?.startDateTime ?? raw?.startDate);
  const end = toDateOrNull(raw?.endAt ?? raw?.endDateTime ?? raw?.endDate);
  if (start) start.setHours(0, 0, 0, 0);
  if (end) end.setHours(23, 59, 59, 999);
  if (start && now < start) return false;
  if (end && now > end) return false;
  return Boolean(start || end);
}

function mapEvent(raw) {
  const eventId = raw?.eventId ?? raw?.id ?? null;
  const eventName = normalizeEventTitle(raw?.eventName ?? raw?.title, raw);
  const category = raw?.category ?? raw?.eventCategory ?? "행사";
  const location = raw?.location ?? raw?.place ?? "장소 미정";
  const startAt = raw?.startAt ?? raw?.startDateTime ?? raw?.startDate ?? null;
  const endAt = raw?.endAt ?? raw?.endDateTime ?? raw?.endDate ?? null;
  const participants = Number(raw?.participants ?? raw?.appliedCount ?? 0);
  const capacity = Number(raw?.capacity ?? raw?.maxParticipants ?? 1);

  return {
    id: eventId,
    title: eventName,
    category,
    location,
    organizer: raw?.organizer ?? "정보 없음",
    organizerPhone: raw?.organizerPhone ?? null,
    organizerEmail: raw?.organizerEmail ?? null,
    image: raw?.imageUrl ?? raw?.posterUrl ?? raw?.thumbnail ?? null,
    date: formatDateRange(startAt, endAt),
    endSortKey: toSortTimestamp(endAt),
    participants: Number.isFinite(participants) ? participants : 0,
    capacity: Number.isFinite(capacity) && capacity > 0 ? capacity : 1,
    fallback: "🐶",
  };
}

function EventThumb({ ev }) {
  return (
    <div className="ev-card-thumb">
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
      <div
        className="ev-card-thumb-fallback"
        style={{
          display: ev.image ? "none" : "flex",
          background: "linear-gradient(135deg, rgb(144, 196, 80) 0%, rgb(99, 234, 241) 100%)",
        }}
      >
        {ev.fallback}
      </div>
      <div className="ev-card-thumb-overlay" />
      <div className="ev-card-thumb-label">
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#fff", animation: "ev-pulse 1.4s ease-in-out infinite" }} />
        LIVE
      </div>
    </div>
  );
}

export default function Current() {
  const [query, setQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [currentPath, setCurrentPath] = useState("/event/current");
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    const fetchEvents = async () => {
      setLoading(true);
      setError("");

      try {
        const res = await eventApi.getEvents({
          page: 0,
          size: 500,
        });
        const content = res?.data?.data?.content;
        let list = Array.isArray(content) ? content.filter(isOngoingByDate) : [];

        /* 이미지 캐시(IndexedDB) 로드 후 주입 */
        await loadImageCache();
        list = injectEventImages(list);

        if (mounted) {
          setEvents(
            list
              .map(mapEvent)
              .sort((a, b) => a.endSortKey - b.endSortKey),
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

  const filtered = events.filter(
    (e) =>
      e.title.includes(query) ||
      e.category.includes(query) ||
      e.location.includes(query),
  );

  return (
    <div className="ev-root">
      <style>{styles}</style>
      <PageHeader
        title="현재 진행 행사"
        subtitle={SUBTITLE_MAP[currentPath]}
        icon={<Zap size={42} color="#90C450" strokeWidth={1.6} />}
        titleStyle={{ fontSize: 46, lineHeight: "66px", letterSpacing: "-1px" }}
        subtitleStyle={{ fontSize: 20 }}
        categories={SERVICE_CATEGORIES}
        currentPath={currentPath}
        onNavigate={setCurrentPath}
      />

      <main className="ev-container">
        {loading ? (
          <PageLoading />
        ) : error ? (
          <EmptyState type="error" message="행사를 불러오지 못했습니다" description="네트워크 연결을 확인하고 다시 시도해 주세요." />
        ) : (
          <>
          {/* 검색 바 + 상태 칩 */}
          <div className="ev-toolbar-top">
            <div className="ev-live-chip">
              <div className="ev-live-dot" />
              진행 중 <span className="ev-live-count">{events.length}</span>
            </div>
            <div className="ev-search-box">
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
                  position: "absolute", left: 38,
                  top: "50%",
                  transform: "translateY(-50%)",
                  fontSize: 15,
                  color: "#94a3b8",
                  fontWeight: 600,
                  pointerEvents: "none", zIndex: 1,
                }}>행사 검색</span>
              )}
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
                style={{
                  width: "100%", height: 44,
                  borderRadius: 12,
                  border: searchFocused ? "2px solid #90C450" : "1.5px solid #e2e8f0",
                  padding: "0 14px 0 38px",
                  fontSize: 15, fontWeight: 700, color: "#0f172a",
                  background: "#fff", outline: "none",
                  transition: "border-color 0.25s, box-shadow 0.25s, padding 0.2s",
                  boxShadow: searchFocused ? "0 0 0 3px rgba(37,99,235,0.1)" : "none",
                  fontFamily: "inherit",
                }}
              />
            </div>
          </div>

          <div className="ev-grid">
            {filtered.length === 0 ? (
              <div style={{ gridColumn: "1 / -1" }}>
                <EmptyState
                  message={query ? `"${query}" 검색 결과가 없습니다` : "진행 중인 행사가 없습니다"}
                  description={query ? "다른 검색어로 다시 시도해 보세요" : "현재 진행 중인 행사가 등록되지 않았습니다"}
                />
              </div>
            ) : null}
            {filtered.map((ev) => {
              return (
                <div
                  key={ev.id}
                  className="ev-event-card"
                  onClick={() => setSelectedEvent(ev)}
                >
                  <EventThumb ev={ev} />
                  <div className="ev-event-card-body">
                    <div className="ev-event-category">{ev.category}</div>
                    <div className="ev-event-title">{ev.title}</div>
                    <div className="ev-event-meta">
                      <div className="ev-event-meta-row">
                        <MapPin size={12} />
                        {ev.location}
                      </div>
                      <div className="ev-event-meta-row">
                        <Calendar size={12} />
                        {ev.date}
                      </div>
                    </div>
                    <div className="ev-event-footer">
                      <button
                        className="ev-card-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedEvent(ev);
                        }}
                      >
                        상세보기 <ChevronRight size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          </>
        )}
      </main>

      {/* Detail Modal */}
      {selectedEvent && (
        <EventDetailModal
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
        />
      )}
    </div>
  );
}
