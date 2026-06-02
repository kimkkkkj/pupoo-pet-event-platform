import { useEffect, useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, MapPin, Search, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import PageHeader from "../components/PageHeader";
import PageLoading from "../components/PageLoading";
import EmptyState from "../components/EmptyState";
import EventDetailModal from "./EventDetailModal";
import { eventApi } from "../../../app/http/eventApi";
import { normalizeEventTitle } from "../../../shared/utils/eventDisplay";

const EVENT_CATEGORIES = [
  { label: "현재 진행 행사", path: "/event/current" },
  { label: "예정 행사", path: "/event/upcoming" },
  { label: "종료 행사", path: "/event/closed" },
  { label: "행사 일정 안내", path: "/event/eventschedule" },
];

const WEEKDAY_LABELS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
const MINI_WD = ["월", "화", "수", "목", "금", "토", "일"];
const STATUS_META = {
  ONGOING: { label: "진행 중", color: "#22c55e", soft: "#f0fdf4" },
  UPCOMING: { label: "예정", color: "#3DBFA0", soft: "#E6F7F2" },
  ENDED: { label: "종료", color: "#9ca3af", soft: "#f9fafb" },
};

const styles = `
  .es-root { min-height: 100vh; background: #f8f9fc; }
  .es-wrap {
    width: min(1400px, calc(100% - 40px));
    margin: 0 auto; padding: 28px 0 72px;
    font-family: "Noto Sans KR", -apple-system, sans-serif;
  }
  .es-layout {
    display: grid; grid-template-columns: 1fr 300px;
    gap: 24px; align-items: start;
  }

  /* ── Calendar Card ── */
  .es-cal-card {
    background: #fff; border: 1px solid #e8e8e8;
    border-radius: 16px; overflow: hidden;
  }
  .es-cal-header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 20px 28px;
  }
  .es-cal-header-left { display: flex; align-items: center; gap: 6px; }
  .es-cal-title {
    font-size: 14px; font-weight: 700; color: #111827;
    letter-spacing: -0.3px; min-width: 160px; text-align: center;
  }
  .es-cal-nav {
    width: 32px; height: 32px; border-radius: 8px;
    border: 1px solid #e5e7eb; background: #fff; color: #6b7280;
    cursor: pointer; display: flex; align-items: center; justify-content: center;
    transition: all 0.15s;
  }
  .es-cal-nav:hover { background: #f9fafb; border-color: #d1d5db; color: #374151; }
  .es-cal-today-btn {
    padding: 6px 16px; border-radius: 8px; border: 1px solid #e5e7eb;
    background: #fff; color: #6b7280; font-size: 13px; font-weight: 600;
    cursor: pointer; transition: all 0.15s; font-family: inherit; margin-left: 8px;
  }
  .es-cal-today-btn:hover { background: #f9fafb; color: #374151; }
  .es-cal-legend {
    display: flex; align-items: center; gap: 20px;
    padding: 0 28px 16px; border-bottom: 1px solid #f0f0f0;
  }
  .es-cal-legend-item { display: flex; align-items: center; gap: 6px; font-size: 14px; font-weight: 600; color: #6b7280; }
  .es-cal-legend-dot { width: 8px; height: 8px; border-radius: 50%; }

  /* ── Calendar Grid ── */
  .es-cal-grid-wrap { overflow-x: auto; }
  .es-cal-grid { min-width: 700px; }
  .es-cal-weekdays {
    display: grid; grid-template-columns: repeat(7, minmax(0, 1fr));
    border-bottom: 1px solid #e8e8e8;
  }
  .es-cal-weekday {
    padding: 12px 0; font-size: 14px; color: #9ca3af;
    font-weight: 600; text-align: center; letter-spacing: 0.5px;
  }
  .es-cal-weekday:last-child { color: #f87171; }
  .es-cal-weekday:nth-child(6) { color: #5CCDB2; }
  .es-cal-week-row { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); }
  .es-cal-day {
    border-right: 1px solid #f3f4f6; border-bottom: 1px solid #f3f4f6;
    padding: 8px 10px 10px; background: #fff; min-height: 120px;
    cursor: default; transition: background 0.12s;
  }
  .es-cal-day:nth-child(7) { border-right: none; }
  .es-cal-day:hover { background: #fafbfc; }
  .es-cal-day.outside { background: #f8f9fc; }
  .es-cal-day.outside .es-cal-day-num { color: #d4d4d8; }
  .es-cal-day-num {
    font-size: 12px; font-weight: 600; color: #52525b;
    margin-bottom: 5px; width: 30px; height: 30px;
    display: flex; align-items: center; justify-content: center; border-radius: 50%;
  }
  .es-cal-day:nth-child(7) .es-cal-day-num { color: #f87171; }
  .es-cal-day:nth-child(6) .es-cal-day-num { color: #5CCDB2; }
  .es-cal-day.outside:nth-child(7) .es-cal-day-num,
  .es-cal-day.outside:nth-child(6) .es-cal-day-num { color: #d4d4d8; }
  .es-cal-day.today .es-cal-day-num { background: #3DBFA0; color: #fff !important; font-weight: 700; }
  .es-cell-events { display: flex; flex-direction: column; gap: 2px; }
  .es-cell-evt {
    display: flex; align-items: center; gap: 5px; padding: 9.5px 5px;
    border-radius: 4px; cursor: pointer; transition: background 0.12s;
    border: none; background: transparent; width: 100%; text-align: left; font-family: inherit;
  }
  .es-cell-evt:hover { background: #f8f9fc; }
  .es-cell-evt-dot { width: 5px; height: 5px; border-radius: 50%; flex-shrink: 0; }
  .es-cell-evt-name {
    font-size: 14px; font-weight: 500; color: #4b4b4b;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: 1.4;
  }
  .es-cell-more { font-size: 12px; color: #a1a1aa; font-weight: 600; padding: 1px 5px; }

  /* ═══ Sidebar ═══ */
  .es-sidebar { display: flex; flex-direction: column; gap: 16px; }

  /* ── Search ── */
  .es-search-card {
    background: #fff; border: 1px solid #e8e8e8; border-radius: 14px;
    padding: 4px; display: flex; align-items: center; gap: 8px;
  }
  .es-search-inner {
    flex: 1; display: flex; align-items: center; gap: 8px;
    background: #f8f9fc; border-radius: 10px; padding: 0 12px; height: 40px;
    transition: all 0.2s;
  }
  .es-search-inner:focus-within { background: #fff; box-shadow: 0 0 0 2px #3DBFA0; }
  .es-search-input {
    flex: 1; border: none; outline: none; background: transparent;
    font-size: 15.5px; font-weight: 400; color: #111827; font-family: inherit;
    min-width: 0;
  }
  .es-search-input::placeholder { color: #b0b5bd; }
  .es-search-clear {
    width: 20px; height: 20px; border-radius: 50%; border: none;
    background: #d1d5db; color: #fff; cursor: pointer;
    display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    transition: background 0.12s;
  }
  .es-search-clear:hover { background: #9ca3af; }

  /* ── Mini Calendar ── */
  .es-mini {
    background: #fff; border: 1px solid #e8e8e8; border-radius: 14px; padding: 16px;
  }
  .es-mini-head {
    display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;
  }
  .es-mini-title { font-size: 16px; font-weight: 700; color: #111827; }
  .es-mini-navs { display: flex; gap: 2px; }
  .es-mini-nav {
    width: 26px; height: 26px; border-radius: 6px; border: none;
    background: transparent; color: #9ca3af; cursor: pointer;
    display: flex; align-items: center; justify-content: center; transition: all 0.12s;
  }
  .es-mini-nav:hover { background: #f8f9fc; color: #374151; }
  .es-mini-wds { display: grid; grid-template-columns: repeat(7, 1fr); margin-bottom: 4px; }
  .es-mini-wd {
    text-align: center; font-size: 13px; font-weight: 600; color: #b0b5bd; padding: 3px 0;
  }
  .es-mini-wd:nth-child(6) { color: #5CCDB2; }
  .es-mini-wd:last-child { color: #fca5a5; }
  .es-mini-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 1px; }
  .es-mini-day {
    text-align: center; font-size: 14px; font-weight: 500; color: #52525b;
    padding: 5px 0; border-radius: 8px; cursor: pointer;
    transition: all 0.1s; border: none; background: transparent; font-family: inherit;
  }
  .es-mini-day:hover { background: #f8f9fc; }
  .es-mini-day.out { color: #d4d4d8; }
  .es-mini-day.today { background: #3DBFA0; color: #fff; font-weight: 700; }

  .es-mini-day.has-evt { font-weight: 700; color: #111827; position: relative; }
  .es-mini-day.has-evt::after {
    content: ""; display: block; width: 4px; height: 4px;
    border-radius: 50%; background: #3DBFA0; margin: 1px auto 0;
  }
  .es-mini-day.today.has-evt::after { background: #fff; }

  /* ── Event List ── */
  .es-list-card {
    background: #fff; border: 1px solid #e8e8e8; border-radius: 14px; padding: 16px;
  }
  .es-list-title {
    font-size: 16px; font-weight: 700; color: #111827; margin-bottom: 12px;
    display: flex; align-items: center; justify-content: space-between;
  }
  .es-list-count {
    font-size: 14px; font-weight: 600; color: #9ca3af;
  }
  .es-list-scroll {
    display: flex; flex-direction: column; gap: 6px;
    max-height: 400px; overflow-y: auto;
  }
  .es-list-scroll::-webkit-scrollbar { width: 3px; }
  .es-list-scroll::-webkit-scrollbar-thumb { background: #e5e7eb; border-radius: 2px; }
  .es-list-item {
    display: flex; align-items: stretch; gap: 10px;
    padding: 10px 12px; border-radius: 10px; background: #f8f9fc;
    cursor: pointer; transition: all 0.15s; border: 1px solid transparent;
  }
  .es-list-item:hover { background: #f8f9fc; border-color: #e5e7eb; }
  .es-list-bar { width: 3px; border-radius: 2px; flex-shrink: 0; }
  .es-list-body { flex: 1; min-width: 0; }
  .es-list-name {
    font-size: 15px; font-weight: 700; color: #111827;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-bottom: 3px;
  }
  .es-list-meta {
    font-size: 13px; color: #9ca3af; font-weight: 500;
    display: flex; align-items: center; gap: 4px;
  }
  .es-list-empty {
    font-size: 14.5px; color: #d1d5db; text-align: center; padding: 20px 0;
  }

  /* ── Responsive ── */
  @media (max-width: 1024px) {
    .es-layout { grid-template-columns: 1fr; }
    .es-sidebar { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .es-list-card { grid-column: 1 / -1; }
  }
  @media (max-width: 720px) {
    .es-wrap { width: min(100%, calc(100% - 20px)); padding: 16px 0 48px; }
    .es-cal-header { flex-wrap: wrap; gap: 10px; padding: 16px 20px; }
    .es-cal-legend { padding: 0 20px 14px; }
    .es-cal-day { min-height: 84px; padding: 5px 5px 6px; }
    .es-cell-evt-name { font-size: 10px; }
    .es-sidebar { grid-template-columns: 1fr; }
  }
  @media (max-width: 600px) {
    /* 큰 달력 숨기고 미니 달력 + 목록 뷰로 전환 */
    .es-cal-card { display: none; }
    .es-layout { grid-template-columns: 1fr; }
    .es-sidebar { grid-template-columns: 1fr; }
    .es-mini { padding: 20px; }
    .es-mini-title { font-size: 18px; }
    .es-mini-nav { width: 32px; height: 32px; }
    .es-mini-wd { font-size: 13px; padding: 6px 0; }
    .es-mini-day { font-size: 15px; padding: 8px 0; border-radius: 10px; }
    .es-mini-day.has-evt::after { width: 5px; height: 5px; }
    .es-list-name { font-size: 14px; }
    .es-list-meta { font-size: 12px; }
    .es-list-scroll { max-height: none; }
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
  const x = `${a.getMonth()+1}/${a.getDate()}`;
  if (!b || sameDay(a, b)) return x;
  return `${x} - ${b.getMonth()+1}/${b.getDate()}`;
}
function toStatus(status, startAt, endAt) {
  const n = String(status || "").toUpperCase();
  if (["OPEN","ONGOING","CURRENT"].includes(n)) return "ONGOING";
  if (["UPCOMING","SCHEDULED"].includes(n)) return "UPCOMING";
  if (["CLOSED","ENDED"].includes(n)) return "ENDED";
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
function buildMiniDays(year, month) {
  const ms = new Date(year, month, 1), me = new Date(year, month + 1, 0);
  const gs = startOfWeekMon(ms), ge = addDays(startOfWeekMon(me), 6);
  const days = [];
  for (let c = gs; c.getTime() <= ge.getTime(); c = addDays(c, 1)) days.push(c);
  return { days, monthStart: ms, monthEnd: me };
}

function getEventDetailPath(evt) {
  const status = evt?.statusLabel;
  if (status === "ONGOING") return `/program/current/${evt.eventId}`;
  if (status === "UPCOMING") return `/program/upcoming/${evt.eventId}`;
  return `/program/closed/${evt.eventId}`;
}

export default function EventSchedule() {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [selectedEvent, setSelectedEvent] = useState(null);
  const currentMonthKey = formatMonthKey(new Date());
  const [selectedMonthKey, setSelectedMonthKey] = useState(currentMonthKey);
  const [miniYear, setMiniYear] = useState(() => new Date().getFullYear());
  const [miniMonth, setMiniMonth] = useState(() => new Date().getMonth());

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
          const rawEnd = toDate(row?.endAt) || toDate(row?.startAt) || new Date();
          const endDate = startOfDay(rawEnd);
          const statusLabel = toStatus(row?.status, row?.startAt, row?.endAt);
          return {
            eventId: row?.eventId,
            eventName: normalizeEventTitle(row?.eventName, row),
            location: row?.location || "장소 미정",
            startAt: row?.startAt || null,
            endAt: row?.endAt || row?.startAt || null,
            startDate,
            endDate: endDate.getTime() >= startDate.getTime() ? endDate : startDate,
            statusLabel,
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
    const d = new Date(y, m - 1 + delta, 1);
    setSelectedMonthKey(formatMonthKey(d));
  };

  const filteredMonthEvents = useMemo(() => {
    const kw = query.trim().toLowerCase();
    if (!kw) return monthModel.monthEvents;
    return monthModel.monthEvents.filter((e) => e.eventName.toLowerCase().includes(kw) || e.location.toLowerCase().includes(kw));
  }, [monthModel, query]);

  const groupedEvents = useMemo(() => {
    const g = { ONGOING: [], UPCOMING: [], ENDED: [] };
    filteredMonthEvents.forEach((e) => { if (g[e.statusLabel]) g[e.statusLabel].push(e); });
    return g;
  }, [filteredMonthEvents]);

  const getEventsForDay = (day) => {
    const t = day.getTime();
    return filteredMonthEvents.filter((e) => e.startDate.getTime() <= t && e.endDate.getTime() >= t);
  };

  // Mini calendar
  const miniModel = useMemo(() => buildMiniDays(miniYear, miniMonth), [miniYear, miniMonth]);
  const miniHasEvent = (day) => {
    const t = day.getTime();
    return events.some((e) => e.startDate.getTime() <= t && e.endDate.getTime() >= t);
  };
  const navigateMini = (delta) => {
    const d = new Date(miniYear, miniMonth + delta, 1);
    setMiniYear(d.getFullYear()); setMiniMonth(d.getMonth());
  };
  const onMiniDayClick = (day) => {
    const key = formatMonthKey(day);
    setSelectedMonthKey(key);
    setMiniYear(day.getFullYear()); setMiniMonth(day.getMonth());
  };

  // Sync mini when main navigates
  useEffect(() => {
    const [y, m] = selectedMonthKey.split("-").map(Number);
    setMiniYear(y); setMiniMonth(m - 1);
  }, [selectedMonthKey]);

  return (
    <div className="es-root">
      <style>{styles}</style>
      <PageHeader
        title="행사 일정 안내"
        subtitle="조회할 월을 선택하면 해당 월 일정만 달력에 표시됩니다."
        icon={<CalendarDays size={42} color="#90C450" strokeWidth={1.6} />}
        titleStyle={{ fontSize: 46, lineHeight: "66px", letterSpacing: "-1px" }}
        subtitleStyle={{ fontSize: 20 }}
        categories={EVENT_CATEGORIES}
      />

      <main className="es-wrap">
        <div className="es-layout">
          {/* ── Main Calendar ── */}
          <section className="es-cal-card">
            <div className="es-cal-header">
              <div className="es-cal-header-left">
                <button type="button" className="es-cal-nav" onClick={() => navigateMonth(-1)}><ChevronLeft size={16} /></button>
                <span className="es-cal-title">{formatMonthLabel(monthModel.monthStart)}</span>
                <button type="button" className="es-cal-nav" onClick={() => navigateMonth(1)}><ChevronRight size={16} /></button>
                <button type="button" className="es-cal-today-btn" onClick={() => setSelectedMonthKey(currentMonthKey)}>오늘</button>
              </div>
              <div className="es-cal-legend" style={{ padding: 0, border: "none" }}>
                {Object.entries(STATUS_META).map(([k, m]) => (
                  <span key={k} className="es-cal-legend-item">
                    <span className="es-cal-legend-dot" style={{ background: m.color }} />{m.label}
                  </span>
                ))}
              </div>
            </div>

            {loading ? <PageLoading /> : error ? <EmptyState type="error" message="일정을 불러오지 못했습니다" description="네트워크 연결을 확인하고 다시 시도해 주세요." /> : (
              <div className="es-cal-grid-wrap">
                <div className="es-cal-grid">
                  <div className="es-cal-weekdays">
                    {WEEKDAY_LABELS.map((l) => <div key={l} className="es-cal-weekday">{l}</div>)}
                  </div>
                  {monthModel.weeks.map((week) => (
                    <div key={week.key} className="es-cal-week-row">
                      {week.days.map((day) => {
                        const outside = day.getMonth() !== monthModel.monthStart.getMonth();
                        const dayEvents = outside ? [] : getEventsForDay(day);
                        return (
                          <div key={day.toISOString()} className={`es-cal-day${outside ? " outside" : ""}${sameDay(day, today) ? " today" : ""}`}>
                            <div className="es-cal-day-num">{day.getDate()}</div>
                            {dayEvents.length > 0 && (
                              <div className="es-cell-events">
                                {dayEvents.map((evt) => (
                                  <button key={evt.eventId} type="button" className="es-cell-evt" title={evt.eventName} onClick={() => setSelectedEvent(evt)}>
                                    <span className="es-cell-evt-dot" style={{ background: (STATUS_META[evt.statusLabel] || STATUS_META.UPCOMING).color }} />
                                    <span className="es-cell-evt-name">{evt.eventName}</span>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* ── Sidebar ── */}
          <aside className="es-sidebar">
            {/* Search */}
            <div className="es-search-card">
              <div className="es-search-inner">
                <Search size={14} color="#b0b5bd" style={{ flexShrink: 0 }} />
                <input className="es-search-input" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="행사명, 장소 검색" />
                {query && <button type="button" className="es-search-clear" onClick={() => setQuery("")}><X size={10} /></button>}
              </div>
            </div>

            {/* Mini Calendar */}
            <div className="es-mini">
              <div className="es-mini-head">
                <span className="es-mini-title">{miniYear}년 {miniMonth + 1}월</span>
                <div className="es-mini-navs">
                  <button type="button" className="es-mini-nav" onClick={() => navigateMini(-1)}><ChevronLeft size={14} /></button>
                  <button type="button" className="es-mini-nav" onClick={() => navigateMini(1)}><ChevronRight size={14} /></button>
                </div>
              </div>
              <div className="es-mini-wds">
                {MINI_WD.map((w) => <div key={w} className="es-mini-wd">{w}</div>)}
              </div>
              <div className="es-mini-grid">
                {miniModel.days.map((day) => {
                  const out = day.getMonth() !== miniMonth;
                  const isToday = sameDay(day, today);
                  const isSel = false;
                  const hasEvt = !out && miniHasEvent(day);
                  return (
                    <button
                      key={day.toISOString()} type="button"
                      className={`es-mini-day${out ? " out" : ""}${isToday ? " today" : ""}${isSel ? " sel" : ""}${hasEvt ? " has-evt" : ""}`}
                      onClick={() => onMiniDayClick(day)}
                    >
                      {day.getDate()}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Event List */}
            <div className="es-list-card">
              <div className="es-list-title">
                {formatMonthLabel(monthModel.monthStart)} 일정
                <span className="es-list-count">{filteredMonthEvents.length}건</span>
              </div>
              <div className="es-list-scroll">
                {filteredMonthEvents.length === 0 ? (
                  <div className="es-list-empty">{query ? `"${query}" 검색 결과 없음` : "등록된 일정이 없습니다"}</div>
                ) : (
                  filteredMonthEvents.map((evt) => {
                    const meta = STATUS_META[evt.statusLabel] || STATUS_META.UPCOMING;
                    return (
                      <div key={evt.eventId} className="es-list-item" onClick={() => setSelectedEvent(evt)}>
                        <div className="es-list-bar" style={{ background: meta.color }} />
                        <div className="es-list-body">
                          <div className="es-list-name">{evt.eventName}</div>
                          <div className="es-list-meta">
                            <CalendarDays size={11} />
                            {formatShortRange(evt.startAt, evt.endAt)}
                            {evt.location !== "장소 미정" && (
                              <><MapPin size={11} style={{ marginLeft: 4 }} />{evt.location}</>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </aside>
        </div>
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
