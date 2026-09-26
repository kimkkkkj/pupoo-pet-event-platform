import { useEffect, useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, ImageOff, MapPin, Search, X } from "lucide-react";
import PageHeader from "../components/PageHeader";
import PageLoading from "../components/PageLoading";
import EmptyState from "../components/EmptyState";
import EventDetailModal from "./EventDetailModal";
import { eventApi } from "../../../app/http/eventApi";
import { normalizeEventTitle } from "../../../shared/utils/eventDisplay";
import { resolveImageUrl } from "../../../shared/utils/publicAssetUrl";

const EVENT_CATEGORIES = [
  { label: "현재 진행 행사", path: "/event/current" },
  { label: "예정 행사", path: "/event/upcoming" },
  { label: "종료 행사", path: "/event/closed" },
  { label: "행사 일정 안내", path: "/event/eventschedule" },
];

const WEEKDAY_LABELS = ["월", "화", "수", "목", "금", "토", "일"];
const STATUS_META = {
  ONGOING: { label: "진행 중", color: "#16a34a", soft: "#ecfdf3" },
  UPCOMING: { label: "예정", color: "#2f8f78", soft: "#e6f7f2" },
  ENDED: { label: "종료", color: "#6b7280", soft: "#f3f4f6" },
};

// 행사별 막대 색. eventId 기준으로 고정돼 달을 넘겨도 같은 행사는 같은 색을 유지한다.
// bg: 막대 배경(파스텔), fg: 글자색(같은 계열의 진한 톤), accent: 포인트 선·목록 표시용
const EVENT_PALETTE = [
  { bg: "#E3F4EF", fg: "#1F6F5C", accent: "#5FBFA5" }, // 민트
  { bg: "#E6EEFB", fg: "#2F4F8F", accent: "#7C9EE0" }, // 블루
  { bg: "#FCEBE3", fg: "#8A4A2E", accent: "#E9A283" }, // 코랄
  { bg: "#EFEAFA", fg: "#58459A", accent: "#A897DB" }, // 퍼플
  { bg: "#FBE8EE", fg: "#8C3A55", accent: "#E39AB2" }, // 핑크
  { bg: "#E2F2F7", fg: "#22657A", accent: "#6FB8CF" }, // 스카이
  { bg: "#FAF0DC", fg: "#7A5A1A", accent: "#D9B25E" }, // 앰버
  { bg: "#EAF3E1", fg: "#466B2B", accent: "#93BF6E" }, // 그린
];
function eventColor(evt) {
  const id = Number(evt?.eventId);
  const idx = Number.isFinite(id) ? Math.abs(id) % EVENT_PALETTE.length : 0;
  return EVENT_PALETTE[idx];
}

const styles = `
  .es-root { min-height: 100vh; background: #f8f9fc; }
  .es-wrap {
    width: min(1400px, calc(100% - 40px));
    margin: 0 auto; padding: 28px 0 72px;
    font-family: "Noto Sans KR", -apple-system, sans-serif;
  }
  .es-layout { display: grid; grid-template-columns: minmax(0, 1fr) 340px; gap: 20px; align-items: start; }

  /* ── Calendar ── */
  .es-cal-card { background: #fff; border: 1px solid #e8eaee; border-radius: 18px; overflow: hidden; }
  .es-cal-header {
    display: flex; align-items: center; justify-content: space-between; gap: 12px;
    padding: 18px 22px; border-bottom: 1px solid #f0f1f4;
  }
  .es-cal-nav-group { display: flex; align-items: center; gap: 4px; }
  .es-cal-title { font-size: 20px; font-weight: 800; color: #111827; letter-spacing: -0.4px; min-width: 132px; text-align: center; }
  .es-icon-btn {
    width: 34px; height: 34px; border-radius: 10px; border: 1px solid #e5e7eb; background: #fff; color: #6b7280;
    cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.15s;
  }
  .es-icon-btn:hover { background: #f9fafb; color: #111827; }
  .es-today-btn {
    height: 34px; padding: 0 14px; border-radius: 10px; border: 1px solid #e5e7eb; background: #fff;
    color: #374151; font-size: 13px; font-weight: 700; cursor: pointer; font-family: inherit; margin-left: 6px;
  }
  .es-today-btn:hover { background: #f9fafb; }
  .es-cal-summary { font-size: 13px; color: #9ca3af; font-weight: 600; }
  .es-cal-summary b { color: #111827; font-weight: 800; }

  .es-cal-grid-wrap { overflow-x: auto; }
  .es-cal-grid { min-width: 680px; }
  .es-cal-weekdays { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); background: #fafbfc; border-bottom: 1px solid #f0f1f4; }
  .es-cal-weekday { padding: 10px 0; font-size: 12px; color: #9ca3af; font-weight: 700; text-align: center; }
  .es-cal-weekday:nth-child(6) { color: #3DBFA0; }
  .es-cal-weekday:nth-child(7) { color: #f87171; }

  .es-week {
    --bar-top: 36px; --bar-step: 26px;
    position: relative; display: grid; grid-template-columns: repeat(7, minmax(0, 1fr));
    border-bottom: 1px solid #f3f4f6;
  }
  .es-week:last-child { border-bottom: none; }
  .es-day {
    min-height: calc(var(--bar-top) + var(--lanes, 0) * var(--bar-step) + var(--more, 0px) + 10px);
    min-height: max(92px, calc(var(--bar-top) + var(--lanes, 0) * var(--bar-step) + var(--more, 0px) + 10px));
    padding: 6px 8px; border-right: 1px solid #f3f4f6; background: #fff;
  }
  .es-day:nth-child(7) { border-right: none; }
  .es-day.outside { background: #fafbfc; }
  .es-day-num {
    width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
    font-size: 12.5px; font-weight: 600; color: #4b5563;
  }
  .es-day:nth-child(6) .es-day-num { color: #3DBFA0; }
  .es-day:nth-child(7) .es-day-num { color: #f87171; }
  .es-day.outside .es-day-num { color: #d1d5db !important; }
  .es-day.today .es-day-num { background: #111827; color: #fff !important; font-weight: 800; }

  .es-bars { position: absolute; inset: 0; pointer-events: none; }
  .es-bar {
    position: absolute; height: 22px; pointer-events: auto;
    display: flex; align-items: center; gap: 6px; padding: 0 9px;
    border: none; border-left: 3px solid; border-radius: 6px;
    cursor: pointer; font-family: inherit; text-align: left; overflow: hidden;
    transition: opacity 0.18s, box-shadow 0.18s, filter 0.18s;
  }
  .es-bar:hover, .es-bar.focus { box-shadow: 0 3px 10px rgba(15,23,42,0.12); }
  .es-bar.cont-left { border-left-width: 0; border-top-left-radius: 0; border-bottom-left-radius: 0; }
  .es-bar.cont-right { border-top-right-radius: 0; border-bottom-right-radius: 0; }
  .es-bar.ended { filter: grayscale(0.6); opacity: 0.6; }
  .es-bar.dim { opacity: 0.18; }
  .es-bar-name { font-size: 12.5px; font-weight: 700; color: inherit; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .es-bar-range { font-size: 11px; font-weight: 600; color: inherit; opacity: 0.6; white-space: nowrap; flex-shrink: 0; }

  /* 넘치는 행사는 날짜마다가 아니라 주마다 한 번만 */
  .es-week-more {
    position: absolute; right: 8px; bottom: 6px; z-index: 2;
    height: 22px; padding: 0 10px; border-radius: 999px; border: 1px solid #e5e7eb; background: #fff;
    color: #6b7280; font-size: 12px; font-weight: 700; font-family: inherit; cursor: pointer;
  }
  .es-week-more:hover { background: #f3f4f6; color: #111827; }
  .es-week-more.active { background: #111827; border-color: #111827; color: #fff; }

  .es-pop {
    position: absolute; right: 8px; z-index: 20; width: 300px;
    background: #fff; border: 1px solid #e5e7eb; border-radius: 14px;
    box-shadow: 0 14px 36px rgba(15,23,42,0.16); padding: 14px;
    animation: es-pop-in 0.14s ease-out;
  }
  @keyframes es-pop-in { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: none; } }
  .es-pop-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
  .es-pop-title { font-size: 14px; font-weight: 800; color: #111827; }
  .es-pop-title span { margin-left: 6px; font-size: 12px; font-weight: 600; color: #9ca3af; }
  .es-pop-close { width: 26px; height: 26px; border-radius: 8px; border: none; background: transparent; color: #9ca3af; cursor: pointer; display: flex; align-items: center; justify-content: center; }
  .es-pop-close:hover { background: #f3f4f6; color: #374151; }
  .es-pop-list { display: flex; flex-direction: column; gap: 6px; max-height: 300px; overflow-y: auto; }

  /* ── Sidebar ── */
  .es-side { display: flex; flex-direction: column; gap: 14px; position: sticky; top: 96px; }
  .es-search {
    display: flex; align-items: center; gap: 8px; height: 46px; padding: 0 14px;
    background: #fff; border: 1px solid #e8eaee; border-radius: 14px; transition: box-shadow 0.2s, border-color 0.2s;
  }
  .es-search:focus-within { border-color: #3DBFA0; box-shadow: 0 0 0 3px rgba(61,191,160,0.15); }
  .es-search input { flex: 1; min-width: 0; border: none; outline: none; background: transparent; font-size: 15px; color: #111827; font-family: inherit; }
  .es-search input::placeholder { color: #b0b5bd; }
  .es-search-clear { width: 20px; height: 20px; border-radius: 50%; border: none; background: #d1d5db; color: #fff; cursor: pointer; display: flex; align-items: center; justify-content: center; }

  .es-list-card { background: #fff; border: 1px solid #e8eaee; border-radius: 18px; overflow: hidden; }
  .es-list-head { display: flex; align-items: baseline; justify-content: space-between; padding: 16px 18px 12px; }
  .es-list-title { font-size: 16px; font-weight: 800; color: #111827; }
  .es-list-count { font-size: 13px; font-weight: 700; color: #9ca3af; }
  .es-list-hint { padding: 0 18px 10px; font-size: 12px; color: #9ca3af; }
  .es-list { display: flex; flex-direction: column; max-height: calc(100vh - 290px); overflow-y: auto; padding: 0 8px 8px; }
  .es-list::-webkit-scrollbar { width: 4px; }
  .es-list::-webkit-scrollbar-thumb { background: #e5e7eb; border-radius: 2px; }
  .es-item {
    display: flex; align-items: center; gap: 12px; width: 100%; padding: 10px; border-radius: 12px;
    border: none; background: transparent; cursor: pointer; font-family: inherit; text-align: left; transition: background 0.15s;
  }
  .es-item:hover, .es-item.focus { background: #f6f7f9; }
  .es-item-thumb {
    position: relative; width: 48px; aspect-ratio: 3 / 4; border-radius: 8px; overflow: hidden; flex-shrink: 0;
    background: #f1f3f5; display: flex; align-items: center; justify-content: center; color: #cbd5e1;
  }
  .es-item-thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .es-item-thumb.ended img { filter: grayscale(0.85); }
  .es-item-thumb i { position: absolute; left: 0; top: 0; bottom: 0; width: 3px; }
  .es-item-body { flex: 1; min-width: 0; }
  .es-item-top { display: flex; align-items: center; gap: 6px; margin-bottom: 4px; }
  .es-item-name { font-size: 14.5px; font-weight: 800; color: #111827; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .es-chip { flex-shrink: 0; font-size: 11px; font-weight: 800; padding: 2px 7px; border-radius: 999px; }
  .es-item-meta { display: flex; flex-direction: column; gap: 2px; font-size: 12.5px; color: #6b7280; }
  .es-item-meta span { display: inline-flex; align-items: center; gap: 5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .es-list-empty { padding: 28px 0; text-align: center; font-size: 14px; color: #9ca3af; }

  /* ── Responsive ── */
  @media (max-width: 1100px) {
    .es-layout { grid-template-columns: 1fr; }
    .es-side { position: static; }
    .es-list { max-height: none; }
  }
  @media (max-width: 720px) {
    .es-wrap { width: min(100%, calc(100% - 20px)); padding: 16px 0 48px; }
    .es-cal-header { padding: 14px 16px; }
    .es-cal-title { font-size: 17px; min-width: 110px; }
    .es-cal-summary { display: none; }
  }
  @media (max-width: 600px) {
    /* 모바일: 달력 격자 대신 월 이동 + 목록으로 본다 */
    .es-cal-grid-wrap { display: none; }
    .es-cal-header { border-bottom: none; }
  }
`;

function toDate(value) {
  if (!value) return null;
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
}
function startOfDay(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
function addDays(d, n) { const r = new Date(d); r.setDate(r.getDate() + n); return startOfDay(r); }
function startOfWeekMon(d) { const b = startOfDay(d); const w = b.getDay(); return addDays(b, -(w === 0 ? 6 : w - 1)); }
function sameDay(a, b) { return a && b && startOfDay(a).getTime() === startOfDay(b).getTime(); }
function formatMonthKey(d) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; }
function formatMonthLabel(m) { return `${m.getFullYear()}년 ${m.getMonth() + 1}월`; }
function formatShortRange(s, e) {
  const a = toDate(s), b = toDate(e) || a;
  if (!a) return "일정 미정";
  const x = `${a.getMonth() + 1}/${a.getDate()}`;
  if (!b || sameDay(a, b)) return x;
  return `${x} - ${b.getMonth() + 1}/${b.getDate()}`;
}
function toStatus(status, startAt, endAt) {
  const n = String(status || "").toUpperCase();
  if (["OPEN", "ONGOING", "CURRENT"].includes(n)) return "ONGOING";
  if (["UPCOMING", "SCHEDULED", "PLANNED"].includes(n)) return "UPCOMING";
  if (["CLOSED", "ENDED"].includes(n)) return "ENDED";
  const t = startOfDay(new Date()).getTime();
  const s = startOfDay(toDate(startAt) || new Date()).getTime();
  const e = startOfDay(toDate(endAt) || toDate(startAt) || new Date()).getTime();
  if (s <= t && e >= t) return "ONGOING";
  if (s > t) return "UPCOMING";
  return "ENDED";
}
function buildMonthGrid(events, monthKey) {
  const [y, m] = String(monthKey).split("-").map(Number);
  const ms = new Date(y, m - 1, 1), me = new Date(y, m, 0);
  const gs = startOfWeekMon(ms), ge = addDays(startOfWeekMon(me), 6);
  const evts = events
    .filter((e) => e.startDate.getTime() <= me.getTime() && e.endDate.getTime() >= ms.getTime())
    .sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
  const weeks = [];
  for (let c = gs; c.getTime() <= ge.getTime(); c = addDays(c, 7))
    weeks.push({ key: c.toISOString(), days: Array.from({ length: 7 }, (_, i) => addDays(c, i)) });
  return { monthStart: ms, monthEnd: me, monthEvents: evts, weeks };
}

const MAX_BAR_LANES = 3;

// 한 주(7일) 안에서 행사를 기간 막대로 자르고, 겹치지 않게 줄(lane)을 배정한다.
function buildWeekLayout(days, events, rangeStart, rangeEnd) {
  const lo = Math.max(days[0].getTime(), rangeStart.getTime());
  const hi = Math.min(days[6].getTime(), rangeEnd.getTime());
  if (lo > hi) return { segments: [], visibleLanes: 0, hidden: [], weekEvents: [] };

  const colOf = (t) => days.findIndex((d) => d.getTime() === t);
  const segments = events
    .filter((e) => e.startDate.getTime() <= hi && e.endDate.getTime() >= lo)
    .map((e) => {
      const s = Math.max(e.startDate.getTime(), lo);
      const en = Math.min(e.endDate.getTime(), hi);
      return { evt: e, startCol: colOf(s), endCol: colOf(en), contLeft: e.startDate.getTime() < s, contRight: e.endDate.getTime() > en };
    })
    .sort((a, b) => a.startCol - b.startCol || (b.endCol - b.startCol) - (a.endCol - a.startCol));

  const laneEnds = [];
  segments.forEach((seg) => {
    let lane = laneEnds.findIndex((end) => end < seg.startCol);
    if (lane === -1) lane = laneEnds.length;
    laneEnds[lane] = seg.endCol;
    seg.lane = lane;
  });

  // 숨길 행사가 1개뿐이면 "+1개" 버튼과 막대 한 줄의 높이가 같으므로 그냥 한 줄 더 보여준다.
  const visibleLanes = laneEnds.length <= MAX_BAR_LANES + 1 ? laneEnds.length : MAX_BAR_LANES;

  return {
    segments,
    visibleLanes,
    hidden: segments.filter((s) => s.lane >= visibleLanes).map((s) => s.evt),
    weekEvents: segments.map((s) => s.evt),
  };
}

function EventListItem({ evt, focused, onHover, onClick }) {
  const meta = STATUS_META[evt.statusLabel] || STATUS_META.UPCOMING;
  const [imgFailed, setImgFailed] = useState(false);
  const img = evt.imageUrl && !imgFailed ? resolveImageUrl(evt.imageUrl) : "";
  return (
    <button
      type="button"
      className={`es-item${focused ? " focus" : ""}`}
      onMouseEnter={() => onHover(evt.eventId)}
      onMouseLeave={() => onHover(null)}
      onFocus={() => onHover(evt.eventId)}
      onBlur={() => onHover(null)}
      onClick={() => onClick(evt)}
    >
      <span className={`es-item-thumb${evt.statusLabel === "ENDED" ? " ended" : ""}`}>
        {img ? <img src={img} alt="" loading="lazy" onError={() => setImgFailed(true)} /> : <ImageOff size={16} />}
        <i style={{ background: eventColor(evt).accent }} />
      </span>
      <span className="es-item-body">
        <span className="es-item-top">
          <span className="es-item-name">{evt.eventName}</span>
          <span className="es-chip" style={{ background: meta.soft, color: meta.color }}>{meta.label}</span>
        </span>
        <span className="es-item-meta">
          <span><CalendarDays size={12} />{formatShortRange(evt.startAt, evt.endAt)}</span>
          {evt.location !== "장소 미정" && <span><MapPin size={12} />{evt.location}</span>}
        </span>
      </span>
    </button>
  );
}

export default function EventSchedule() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [hoveredId, setHoveredId] = useState(null);
  const [weekPopover, setWeekPopover] = useState(null); // week index
  const currentMonthKey = formatMonthKey(new Date());
  const [selectedMonthKey, setSelectedMonthKey] = useState(currentMonthKey);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true); setError("");
      try {
        const res = await eventApi.getEvents({ page: 0, size: 200, sort: "startAt,asc" });
        if (!mounted) return;
        const rows = Array.isArray(res?.data?.data?.content) ? res.data.data.content : [];
        const mapped = rows.map((row) => {
          const startDate = startOfDay(toDate(row?.startAt) || new Date());
          const endDate = startOfDay(toDate(row?.endAt) || toDate(row?.startAt) || new Date());
          return {
            eventId: row?.eventId,
            eventName: normalizeEventTitle(row?.eventName, row),
            location: row?.location || "장소 미정",
            imageUrl: row?.imageUrl || null,
            startAt: row?.startAt || null,
            endAt: row?.endAt || row?.startAt || null,
            startDate,
            endDate: endDate.getTime() >= startDate.getTime() ? endDate : startDate,
            statusLabel: toStatus(row?.status, row?.startAt, row?.endAt),
          };
        }).sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
        setEvents(mapped);
      } catch (err) {
        if (!mounted) return;
        setEvents([]); setError(err?.response?.data?.message || "네트워크 연결을 확인하고 다시 시도해 주세요.");
      } finally { if (mounted) setLoading(false); }
    };
    load();
    return () => { mounted = false; };
  }, []);

  const monthModel = useMemo(() => buildMonthGrid(events, selectedMonthKey), [events, selectedMonthKey]);
  const today = startOfDay(new Date());

  const navigateMonth = (delta) => {
    const [y, m] = selectedMonthKey.split("-").map(Number);
    setSelectedMonthKey(formatMonthKey(new Date(y, m - 1 + delta, 1)));
  };

  const filteredMonthEvents = useMemo(() => {
    const kw = query.trim().toLowerCase();
    if (!kw) return monthModel.monthEvents;
    return monthModel.monthEvents.filter((e) => e.eventName.toLowerCase().includes(kw) || e.location.toLowerCase().includes(kw));
  }, [monthModel, query]);

  const weekLayouts = useMemo(
    () => monthModel.weeks.map((week) => buildWeekLayout(week.days, filteredMonthEvents, monthModel.monthStart, monthModel.monthEnd)),
    [monthModel, filteredMonthEvents],
  );

  // 주별 팝업: 월/검색어가 바뀌면 닫고, 바깥 클릭·ESC로도 닫는다.
  useEffect(() => { setWeekPopover(null); }, [selectedMonthKey, query]);
  useEffect(() => {
    if (weekPopover == null) return undefined;
    const onDown = (e) => { if (!e.target.closest(".es-pop") && !e.target.closest(".es-week-more")) setWeekPopover(null); };
    const onKey = (e) => { if (e.key === "Escape") setWeekPopover(null); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [weekPopover]);

  return (
    <div className="es-root">
      <style>{styles}</style>
      <PageHeader
        title="행사 일정 안내"
        subtitle="월별 행사 일정을 한눈에 확인하세요."
        icon={<CalendarDays size={42} color="#90C450" strokeWidth={1.6} />}
        titleStyle={{ fontSize: 46, lineHeight: "66px", letterSpacing: "-1px" }}
        subtitleStyle={{ fontSize: 20 }}
        categories={EVENT_CATEGORIES}
      />

      <main className="es-wrap">
        <div className="es-layout">
          {/* ── 달력 ── */}
          <section className="es-cal-card">
            <div className="es-cal-header">
              <div className="es-cal-nav-group">
                <button type="button" className="es-icon-btn" onClick={() => navigateMonth(-1)} aria-label="이전 달"><ChevronLeft size={16} /></button>
                <span className="es-cal-title">{formatMonthLabel(monthModel.monthStart)}</span>
                <button type="button" className="es-icon-btn" onClick={() => navigateMonth(1)} aria-label="다음 달"><ChevronRight size={16} /></button>
                <button type="button" className="es-today-btn" onClick={() => setSelectedMonthKey(currentMonthKey)}>오늘</button>
              </div>
              <span className="es-cal-summary">이번 달 행사 <b>{filteredMonthEvents.length}</b>건</span>
            </div>

            {loading ? <PageLoading /> : error ? <EmptyState type="error" message="일정을 불러오지 못했습니다" description="네트워크 연결을 확인하고 다시 시도해 주세요." /> : (
              <div className="es-cal-grid-wrap">
                <div className="es-cal-grid">
                  <div className="es-cal-weekdays">
                    {WEEKDAY_LABELS.map((l) => <div key={l} className="es-cal-weekday">{l}</div>)}
                  </div>
                  {monthModel.weeks.map((week, wi) => {
                    const layout = weekLayouts[wi];
                    const { visibleLanes } = layout;
                    const hasMore = layout.hidden.length > 0;
                    const popAtBottom = wi >= monthModel.weeks.length / 2;
                    return (
                      <div key={week.key} className="es-week" style={{ "--lanes": visibleLanes, "--more": hasMore ? "26px" : "0px" }}>
                        {week.days.map((day) => {
                          const outside = day.getMonth() !== monthModel.monthStart.getMonth();
                          return (
                            <div key={day.toISOString()} className={`es-day${outside ? " outside" : ""}${sameDay(day, today) ? " today" : ""}`}>
                              <div className="es-day-num">{day.getDate()}</div>
                            </div>
                          );
                        })}

                        <div className="es-bars">
                          {layout.segments.filter((seg) => seg.lane < visibleLanes).map((seg) => {
                            const span = seg.endCol - seg.startCol + 1;
                            const range = formatShortRange(seg.evt.startAt, seg.evt.endAt);
                            const c = eventColor(seg.evt);
                            const isFocus = hoveredId === seg.evt.eventId;
                            const isDim = hoveredId != null && !isFocus;
                            return (
                              <button
                                key={seg.evt.eventId}
                                type="button"
                                className={`es-bar${seg.contLeft ? " cont-left" : ""}${seg.contRight ? " cont-right" : ""}${seg.evt.statusLabel === "ENDED" ? " ended" : ""}${isFocus ? " focus" : ""}${isDim ? " dim" : ""}`}
                                title={`${seg.evt.eventName} (${range})`}
                                onMouseEnter={() => setHoveredId(seg.evt.eventId)}
                                onMouseLeave={() => setHoveredId(null)}
                                onClick={() => setSelectedEvent(seg.evt)}
                                style={{
                                  top: `calc(var(--bar-top) + ${seg.lane} * var(--bar-step))`,
                                  left: `calc(${seg.startCol} * 100% / 7 + ${seg.contLeft ? 0 : 4}px)`,
                                  width: `calc(${span} * 100% / 7 - ${(seg.contLeft ? 0 : 4) + (seg.contRight ? 0 : 4)}px)`,
                                  background: c.bg, color: c.fg, borderLeftColor: c.accent,
                                }}
                              >
                                <span className="es-bar-name">{seg.evt.eventName}</span>
                                {span >= 3 && !seg.contLeft && <span className="es-bar-range">{range}</span>}
                              </button>
                            );
                          })}
                        </div>

                        {hasMore && (
                          <button
                            type="button"
                            className={`es-week-more${weekPopover === wi ? " active" : ""}`}
                            onClick={() => setWeekPopover((prev) => (prev === wi ? null : wi))}
                          >
                            +{layout.hidden.length}개 행사
                          </button>
                        )}

                        {weekPopover === wi && (
                          <div className="es-pop" role="dialog" style={popAtBottom ? { bottom: 34 } : { top: "calc(100% - 4px)" }}>
                            <div className="es-pop-head">
                              <span className="es-pop-title">
                                {formatShortRange(week.days[0], week.days[6])} 주간
                                <span>행사 {layout.weekEvents.length}건</span>
                              </span>
                              <button type="button" className="es-pop-close" onClick={() => setWeekPopover(null)} aria-label="닫기"><X size={14} /></button>
                            </div>
                            <div className="es-pop-list">
                              {layout.weekEvents.map((evt) => (
                                <EventListItem
                                  key={evt.eventId}
                                  evt={evt}
                                  focused={hoveredId === evt.eventId}
                                  onHover={setHoveredId}
                                  onClick={(e) => { setWeekPopover(null); setSelectedEvent(e); }}
                                />
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </section>

          {/* ── 검색 + 이달의 행사 ── */}
          <aside className="es-side">
            <label className="es-search">
              <Search size={16} color="#9ca3af" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="행사명, 장소 검색" />
              {query && <button type="button" className="es-search-clear" onClick={() => setQuery("")} aria-label="검색어 지우기"><X size={11} /></button>}
            </label>

            <div className="es-list-card">
              <div className="es-list-head">
                <span className="es-list-title">{monthModel.monthStart.getMonth() + 1}월의 행사</span>
                <span className="es-list-count">{filteredMonthEvents.length}건</span>
              </div>
              {filteredMonthEvents.length > 0 && <div className="es-list-hint">마우스를 올리면 달력에서 해당 행사가 강조돼요</div>}
              <div className="es-list">
                {filteredMonthEvents.length === 0 ? (
                  <div className="es-list-empty">{query ? `"${query}" 검색 결과가 없어요` : "이 달에는 등록된 행사가 없어요"}</div>
                ) : (
                  filteredMonthEvents.map((evt) => (
                    <EventListItem
                      key={evt.eventId}
                      evt={evt}
                      focused={hoveredId === evt.eventId}
                      onHover={setHoveredId}
                      onClick={setSelectedEvent}
                    />
                  ))
                )}
              </div>
            </div>
          </aside>
        </div>
      </main>

      {selectedEvent && <EventDetailModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />}
    </div>
  );
}
