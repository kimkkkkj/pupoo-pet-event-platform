import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import PageHeader from "../components/PageHeader";
import EventSelectPage from "../components/EventSelectPage";
import {
  SERVICE_CATEGORIES,
  SUBTITLE_MAP,
} from "../constants/programConstants";
import { eventApi } from "../../../app/http/eventApi";
import { programApi } from "../../../app/http/programApi";
import { boothApi } from "../../../app/http/boothApi";
import {
  loadImageCache as loadEventImageCache,
  injectEventImages,
} from "../../admin/shared/eventImageStore";
import {
  loadImageCache as loadProgramImageCache,
  injectProgramImages,
} from "../../admin/shared/programImageStore";
import {
  CalendarDays,
  Clock,
  MapPin,
  Users,
  CheckCircle2,
  Circle,
  AlertCircle,
  CalendarCheck,
} from "lucide-react";

const styles = `
  @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.min.css');

  .sc-root {
    box-sizing: border-box;
    font-family: 'Pretendard Variable', 'Pretendard', -apple-system, sans-serif;
    background: #f8f9fc;
    min-height: 100vh;
  }
  .sc-root *, .sc-root *::before, .sc-root *::after { box-sizing: border-box; font-family: inherit; }
  .sc-container { max-width: 1400px; margin: 0 auto; padding: 32px 25px 64px; }

  .sc-stat-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 20px; }
  .sc-stat-card {
    background: #fff; border: 1px solid #e9ecef; border-radius: 13px; padding: 20px 22px;
    display: flex; align-items: center; gap: 14px;
  }
  .sc-stat-icon { width: 44px; height: 44px; border-radius: 11px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .sc-stat-label { font-size: 12px; color: #6b7280; font-weight: 500; }
  .sc-stat-value { font-size: 22px; font-weight: 800; color: #111827; }

  .sc-card { background: #fff; border: 1px solid #e9ecef; border-radius: 13px; padding: 24px 28px; margin-bottom: 16px; }
  .sc-card-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 18px; padding-bottom: 14px; border-bottom: 1px solid #f1f3f5; }
  .sc-card-title { font-size: 15px; font-weight: 700; color: #111827; display: flex; align-items: center; gap: 8px; margin: 0; }
  .sc-card-title-icon { width: 24px; height: 24px; border-radius: 6px; background: #fffbeb; display: flex; align-items: center; justify-content: center; }
  .sc-card-tag { font-size: 11px; font-weight: 600; color: #6b7280; background: #f8f9fc; padding: 3px 10px; border-radius: 100px; }

  .sc-main-grid { display: grid; grid-template-columns: 320px 1fr; gap: 14px; }

  /* Day selector */
  .sc-day-list { display: flex; flex-direction: column; gap: 8px; }
  .sc-day-item {
    display: flex; align-items: center; gap: 12px;
    padding: 16px 18px; border: 1px solid #e9ecef; border-radius: 10px;
    background: #fff; cursor: pointer; transition: all 0.15s;
  }
  .sc-day-item:hover { border-color: #90C450; }
  .sc-day-item.active { border-color: #90C450; background: #f5f8ff; box-shadow: 0 0 0 3px rgba(26,79,214,0.08); }
  .sc-day-icon {
    width: 44px; height: 44px; border-radius: 10px; background: #f8f9fc;
    display: flex; flex-direction: column; align-items: center; justify-content: center; flex-shrink: 0;
  }
  .sc-day-icon.active { background: #90C450; }
  .sc-day-icon .sc-day-d { font-size: 16px; font-weight: 900; color: #111827; line-height: 1; }
  .sc-day-icon.active .sc-day-d { color: #fff; }
  .sc-day-icon .sc-day-w { font-size: 9px; font-weight: 600; color: #9ca3af; }
  .sc-day-icon.active .sc-day-w { color: rgba(255,255,255,0.7); }
  .sc-day-info { flex: 1; }
  .sc-day-title { font-size: 14px; font-weight: 700; color: #111827; }
  .sc-day-sub { font-size: 12px; color: #9ca3af; margin-top: 2px; }
  .sc-day-count {
    font-size: 11px; font-weight: 700; color: #90C450; background: #eff4ff;
    padding: 3px 10px; border-radius: 100px;
  }

  /* Schedule timeline */
  .sc-timeline { display: flex; flex-direction: column; gap: 0; }
  .sc-time-group { margin-bottom: 20px; }
  .sc-time-label {
    font-size: 12px; font-weight: 700; color: #90C450; background: #eff4ff;
    display: inline-flex; padding: 3px 10px; border-radius: 100px; margin-bottom: 10px;
  }
  .sc-event-list { display: flex; flex-direction: column; gap: 8px; }
  .sc-event-item {
    display: flex; align-items: flex-start; gap: 14px;
    padding: 16px 18px; border: 1px solid #e9ecef; border-radius: 10px;
    background: #fff; transition: all 0.15s; cursor: pointer;
  }
  .sc-event-item:hover { border-color: #90C450; background: #f8faff; }
  .sc-event-item.active { border-color: #3a4520; background: #f0fdf9; }
  .sc-event-item.done { opacity: 0.55; }
  .sc-event-dot { margin-top: 4px; flex-shrink: 0; }
  .sc-event-info { flex: 1; }
  .sc-event-name { font-size: 14px; font-weight: 700; color: #111827; }
  .sc-event-meta { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 4px; font-size: 12px; color: #9ca3af; }
  .sc-event-meta-item { display: flex; align-items: center; gap: 3px; }
  .sc-event-tags { display: flex; gap: 6px; margin-top: 8px; }
  .sc-event-tag {
    font-size: 10px; font-weight: 600; padding: 2px 8px; border-radius: 100px;
  }
  .sc-event-tag.session { background: #eff4ff; color: #90C450; }
  .sc-event-tag.contest { background: #fef3c7; color: #d97706; }
  .sc-event-tag.experience { background: #fce7f3; color: #ec4899; }
  .sc-event-tag.ceremony { background: #f5f3ff; color: #8b5cf6; }
  .sc-event-badge {
    padding: 3px 10px; border-radius: 100px; font-size: 11px; font-weight: 600; flex-shrink: 0;
  }
  .sc-event-badge.live { background: #ecfdf5; color: #059669; }
  .sc-event-badge.upcoming { background: #fff7ed; color: #d97706; }
  .sc-event-badge.done { background: #f8f9fc; color: #9ca3af; }

  @media (max-width: 1023px) {
    .sc-container { padding: 28px 20px 56px; }
    .sc-stat-grid { grid-template-columns: repeat(2, 1fr); }
    .sc-main-grid { grid-template-columns: 1fr; }
    .sc-card { padding: 20px 22px; }
  }
  @media (max-width: 767px) {
    .sc-container { padding: 16px 12px 30px; }
    .sc-stat-grid { grid-template-columns: 1fr; }
    .sc-stat-grid { gap: 10px; margin-bottom: 14px; }
    .sc-stat-card { padding: 14px 15px; gap: 10px; }
    .sc-stat-icon { width: 36px; height: 36px; border-radius: 10px; }
    .sc-stat-value { font-size: 19px; }
    .sc-card { padding: 16px 14px; margin-bottom: 12px; }
    .sc-card-header { flex-wrap: wrap; gap: 10px; }
    .sc-day-item { padding: 12px 12px; gap: 10px; }
    .sc-day-icon { width: 38px; height: 38px; border-radius: 9px; }
    .sc-day-icon .sc-day-d { font-size: 14px; }
    .sc-day-title { font-size: 13px; }
    .sc-day-sub { font-size: 11px; }
    .sc-event-item { flex-direction: column; gap: 8px; padding: 12px; }
    .sc-event-dot { margin-top: 0; }
    .sc-event-badge { align-self: flex-start; }
    .sc-event-name { font-size: 13px; }
    .sc-event-meta { gap: 8px; margin-top: 3px; font-size: 11px; }
  }
`;

const TIME_LABELS = { morning: "오전", afternoon: "오후", evening: "저녁" };
const TYPE_LABEL = {
  session: "세션",
  contest: "콘테스트",
  experience: "체험",
  ceremony: "행사",
};
const STATUS_LABEL = { live: "진행 중", upcoming: "예정", done: "완료" };

function formatDateRange(startAt, endAt) {
  const toDatePart = (value) => {
    if (!value) return "";
    return String(value).slice(0, 10).replace(/-/g, ".");
  };
  const start = toDatePart(startAt);
  const end = toDatePart(endAt);
  if (start && end) return `${start} ~ ${end}`;
  return start || end || "일정 미정";
}

function toEventStatus(rawStatus, startAt, endAt) {
  const status = String(rawStatus || "").toUpperCase();
  if (status.includes("END")) return "ended";
  if (status.includes("ONGOING") || status.includes("LIVE")) return "live";
  if (status.includes("UPCOMING") || status.includes("PLANNED"))
    return "upcoming";

  const now = Date.now();
  const startTs = Date.parse(String(startAt || ""));
  const endTs = Date.parse(String(endAt || ""));
  if (Number.isFinite(endTs) && now > endTs) return "ended";
  if (Number.isFinite(startTs) && now >= startTs) return "live";
  return "upcoming";
}

function toDateKey(value) {
  if (!value) return null;
  const m = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
}

function toDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatYmd(key) {
  if (!key) return "일정 미정";
  return key.replaceAll("-", ".");
}

function getWeekdayLabel(key) {
  const d = toDate(`${key}T00:00:00`);
  if (!d) return "-";
  return ["일", "월", "화", "수", "목", "금", "토"][d.getDay()];
}

function getTimeLabel(startAt, endAt) {
  const pick = (v) => {
    if (!v) return "";
    const m = String(v).match(/(\d{2}):(\d{2})/);
    return m ? `${m[1]}:${m[2]}` : "";
  };
  const a = pick(startAt);
  const b = pick(endAt);
  if (a && b) return `${a}~${b}`;
  return a || b || "시간 미정";
}

function getPeriod(timeText) {
  const m = String(timeText).match(/(\d{1,2}):(\d{2})/);
  if (!m) return "afternoon";
  const minutes = Number(m[1]) * 60 + Number(m[2]);
  if (minutes < 12 * 60) return "morning";
  if (minutes < 18 * 60) return "afternoon";
  return "evening";
}

function getType(raw) {
  const v = String(raw ?? "").toUpperCase();
  if (v.includes("SESSION") || v.includes("SEMINAR") || v.includes("LECTURE"))
    return "session";
  if (v.includes("CONTEST") || v.includes("VOTE")) return "contest";
  if (v.includes("EXPERIENCE") || v.includes("EXHIBIT")) return "experience";
  return "ceremony";
}

function getStatus(raw) {
  const v = String(raw ?? "").toUpperCase();
  if (v.includes("LIVE") || v.includes("ONGOING") || v.includes("PROGRESS"))
    return "live";
  if (v.includes("DONE") || v.includes("END") || v.includes("FINISH"))
    return "done";
  return "upcoming";
}

function getProgramStatus(item) {
  if (item?.ongoing) return "live";
  if (item?.ended) return "done";
  if (item?.upcoming) return "upcoming";
  return getStatus(item?.status ?? item?.programStatus);
}

function normalizeProgram(item, idx, boothMap = new Map()) {
  const startAt = item?.startAt ?? item?.startDateTime ?? null;
  const endAt = item?.endAt ?? item?.endDateTime ?? null;
  const time = getTimeLabel(startAt, endAt);
  const boothId = Number(item?.boothId);
  return {
    id: item?.id ?? item?.programId ?? `p-${idx}`,
    dateKey: toDateKey(startAt ?? item?.date ?? item?.day),
    name:
      item?.programTitle ??
      item?.programName ??
      item?.title ??
      item?.name ??
      `프로그램 ${idx + 1}`,
    time,
    zone:
      item?.location ??
      item?.place ??
      item?.zone ??
      item?.boothName ??
      boothMap.get(boothId) ??
      "장소 미정",
    people: Number(
      item?.participantCount ??
        item?.participants ??
        item?.applyCount ??
        item?.capacity ??
        0,
    ),
    type: getType(item?.category ?? item?.programCategory),
    status: getProgramStatus(item),
    period: getPeriod(time),
  };
}

function buildDateKeys(eventDetail, programs) {
  const programKeys = [...new Set(programs.map((p) => p.dateKey).filter(Boolean))].sort();
  if (programKeys.length > 0) {
    return programKeys;
  }

  const startKey = toDateKey(eventDetail?.startAt);
  const endKey = toDateKey(eventDetail?.endAt);
  if (startKey && endKey) {
    const out = [];
    let cursor = new Date(`${startKey}T00:00:00`);
    const end = new Date(`${endKey}T00:00:00`);
    while (cursor.getTime() <= end.getTime()) {
      const y = cursor.getFullYear();
      const m = String(cursor.getMonth() + 1).padStart(2, "0");
      const d = String(cursor.getDate()).padStart(2, "0");
      out.push(`${y}-${m}-${d}`);
      cursor.setDate(cursor.getDate() + 1);
    }
    return out;
  }
  return [];
}

function ScheduleContent({ eventDetail, programs, loading, error }) {
  const days = useMemo(() => {
    const keys = buildDateKeys(eventDetail, programs);
    return keys.map((key, idx) => {
      const count = programs.filter((p) => p.dateKey === key).length;
      return {
        key,
        date: key.slice(8, 10),
        weekday: getWeekdayLabel(key),
        title: `${idx + 1}일차 · ${formatYmd(key)}`,
        sub: `${count}개 프로그램`,
        events: count,
      };
    });
  }, [eventDetail, programs]);

  const [selectedDay, setSelectedDay] = useState(0);
  useEffect(() => {
    setSelectedDay(0);
  }, [days.length]);

  const selected = days[selectedDay];
  const selectedPrograms = selected
    ? programs.filter((p) => p.dateKey === selected.key)
    : [];
  const scheduleByPeriod = {
    morning: selectedPrograms.filter((p) => p.period === "morning"),
    afternoon: selectedPrograms.filter((p) => p.period === "afternoon"),
    evening: selectedPrograms.filter((p) => p.period === "evening"),
  };
  const liveCount = programs.filter((p) => p.status === "live").length;

  return (
    <>
      <div className="sc-stat-grid">
        {[
          {
            label: "행사 기간",
            value: `${days.length}일`,
            icon: <CalendarDays size={20} color="#90C450" />,
            bg: "#eff4ff",
          },
          {
            label: "선택 일자 프로그램",
            value: `${selectedPrograms.length}개`,
            icon: <CalendarCheck size={20} color="#3a4520" />,
            bg: "#ecfdf5",
          },
          {
            label: "전체 프로그램",
            value: `${programs.length}개`,
            icon: <Users size={20} color="#f59e0b" />,
            bg: "#fffbeb",
          },
          {
            label: "진행 중",
            value: `${liveCount}개`,
            icon: <AlertCircle size={20} color="#ef4444" />,
            bg: "#fff0f0",
          },
        ].map((s) => (
          <div key={s.label} className="sc-stat-card">
            <div className="sc-stat-icon" style={{ background: s.bg }}>
              {s.icon}
            </div>
            <div>
              <div className="sc-stat-label">{s.label}</div>
              <div className="sc-stat-value">{s.value}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="sc-main-grid">
        <div className="sc-card">
          <div className="sc-card-header">
            <div className="sc-card-title">
              <div className="sc-card-title-icon">
                <CalendarDays size={14} color="#f59e0b" />
              </div>
              일자 선택
            </div>
            <span className="sc-card-tag">{days.length}일</span>
          </div>
          <div className="sc-day-list">
            {days.map((d, i) => (
              <div
                key={d.key}
                className={`sc-day-item${selectedDay === i ? " active" : ""}`}
                onClick={() => setSelectedDay(i)}
              >
                <div
                  className={`sc-day-icon${selectedDay === i ? " active" : ""}`}
                >
                  <span className="sc-day-d">{d.date}</span>
                  <span className="sc-day-w">{d.weekday}</span>
                </div>
                <div className="sc-day-info">
                  <div className="sc-day-title">{d.title}</div>
                  <div className="sc-day-sub">{d.sub}</div>
                </div>
                <span className="sc-day-count">{d.events}개</span>
              </div>
            ))}
          </div>
        </div>

        <div className="sc-card">
          <div className="sc-card-header">
            <div className="sc-card-title">
              <div className="sc-card-title-icon">
                <Clock size={14} color="#f59e0b" />
              </div>
              {selected ? `${selected.title} 일정` : "일정"}
            </div>
            <span className="sc-card-tag">
              {selectedPrograms.length}개 프로그램
            </span>
          </div>
          {loading ? (
            <div className="sc-card-tag">로딩 중...</div>
          ) : error ? (
            <div className="sc-card-tag">{error}</div>
          ) : (
            <div className="sc-timeline">
              {Object.entries(scheduleByPeriod).map(([period, events]) => (
                <div key={period} className="sc-time-group">
                  <div className="sc-time-label">{TIME_LABELS[period]}</div>
                  <div className="sc-event-list">
                    {events.map((e) => (
                      <div
                        key={e.id}
                        className={`sc-event-item${e.status === "live" ? " active" : ""}${e.status === "done" ? " done" : ""}`}
                      >
                        <div className="sc-event-dot">
                          {e.status === "done" ? (
                            <CheckCircle2 size={16} color="#3a4520" />
                          ) : e.status === "live" ? (
                            <AlertCircle size={16} color="#3a4520" />
                          ) : (
                            <Circle size={16} color="#d1d5db" />
                          )}
                        </div>
                        <div className="sc-event-info">
                          <div className="sc-event-name">{e.name}</div>
                          <div className="sc-event-meta">
                            <span className="sc-event-meta-item">
                              <Clock size={11} /> {e.time}
                            </span>
                            <span className="sc-event-meta-item">
                              <MapPin size={11} /> {e.zone}
                            </span>
                            <span className="sc-event-meta-item">
                              <Users size={11} /> {e.people}명
                            </span>
                          </div>
                          <div className="sc-event-tags">
                            <span className={`sc-event-tag ${e.type}`}>
                              {TYPE_LABEL[e.type]}
                            </span>
                          </div>
                        </div>
                        <span className={`sc-event-badge ${e.status}`}>
                          {STATUS_LABEL[e.status]}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default function ProgramAll() {
  const navigate = useNavigate();
  const { eventId } = useParams();
  const currentPath = "/program/all";
  const safeEventId = Number(eventId);
  const [events, setEvents] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [eventsError, setEventsError] = useState("");
  const [eventDetail, setEventDetail] = useState(null);
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const categories = useMemo(() => {
    if (!Number.isFinite(safeEventId)) return SERVICE_CATEGORIES;
    return SERVICE_CATEGORIES.map((category) => {
      const basePath = String(category.path ?? "").replace(/\/\d+$/, "");
      if (!basePath.startsWith("/program/")) return category;
      return {
        ...category,
        path: `${basePath}/${safeEventId}`,
      };
    });
  }, [safeEventId]);

  useEffect(() => {
    if (Number.isFinite(safeEventId)) return;
    let mounted = true;
    const fetchEvents = async () => {
      setEventsLoading(true);
      setEventsError("");
      try {
        const res = await eventApi.getEvents({
          page: 0,
          size: 200,
          sort: "startAt,desc",
        });
        if (!mounted) return;
        const list = Array.isArray(res?.data?.data?.content)
          ? res.data.data.content
          : [];
        await loadEventImageCache();
        const injected = injectEventImages(
          list.map((evt) => ({ ...evt, id: evt?.eventId })),
        );
        const imgById = {};
        injected.forEach((ev) => {
          if (ev.imageUrl) imgById[String(ev.id || ev.eventId)] = ev.imageUrl;
        });
        setEvents(
          list.map((evt) => ({
            id: evt?.eventId,
            name: evt?.eventName ?? "행사",
            description: evt?.description ?? "",
            date: formatDateRange(evt?.startAt, evt?.endAt),
            location: evt?.location ?? "장소 미정",
            organizer: evt?.organizer ?? "주최 정보 없음",
            status: toEventStatus(evt?.status, evt?.startAt, evt?.endAt),
            participants:
              Number(evt?.participantCount ?? evt?.participants ?? 0) || 0,
            imageUrl: imgById[String(evt?.eventId)] || evt?.imageUrl || null,
            thumbnail: imgById[String(evt?.eventId)] || evt?.imageUrl || null,
            color: "#90C450",
          })),
        );
      } catch (e) {
        if (!mounted) return;
        setEvents([]);
        setEventsError(
          e?.response?.data?.message ||
            e?.message ||
            "행사 목록을 불러오지 못했습니다.",
        );
      } finally {
        if (mounted) setEventsLoading(false);
      }
    };
    fetchEvents();
    return () => {
      mounted = false;
    };
  }, [safeEventId]);

  useEffect(() => {
    if (!Number.isFinite(safeEventId)) return;
    let mounted = true;
    const fetchData = async () => {
      setLoading(true);
      setError("");
      try {
        const [eventRes, programRes, boothRes] = await Promise.all([
          eventApi.getEventDetail(safeEventId),
          programApi.getAllProgramsByEvent({
            eventId: safeEventId,
            sort: "startAt,asc",
          }),
          boothApi.getEventBooths({
            eventId: safeEventId,
            page: 0,
            size: 200,
            sort: "boothId,asc",
          }),
        ]);
        if (!mounted) return;
        setEventDetail(eventRes?.data?.data ?? null);
        const booths = Array.isArray(boothRes?.data?.data?.content)
          ? boothRes.data.data.content
          : [];
        const boothMap = new Map(
          booths
            .map((item) => [Number(item?.boothId), item?.placeName])
            .filter(([id, name]) => Number.isFinite(id) && !!name),
        );
        await loadProgramImageCache();
        const list = injectProgramImages(
          Array.isArray(programRes) ? programRes : [],
        );
        const filtered = list.filter(
          (item) => Number(item?.eventId) === safeEventId,
        );
        setPrograms(
          filtered.map((item, idx) => normalizeProgram(item, idx, boothMap)),
        );
      } catch (e) {
        if (!mounted) return;
        setError(
          e?.response?.data?.message ||
            e?.message ||
            "프로그램 데이터를 불러오지 못했습니다.",
        );
        setPrograms([]);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchData();
    return () => {
      mounted = false;
    };
  }, [safeEventId]);

  if (!Number.isFinite(safeEventId)) {
    return (
      <div className="sc-root">
        <style>{styles}</style>
        <PageHeader
          title="전체 프로그램"
          subtitle="행사를 선택해 프로그램 일정을 확인하세요"
          categories={categories}
          currentPath={currentPath}
          onNavigate={(path) => navigate(path)}
        />
        <EventSelectPage events={events} basePath="/program/all" />
        {eventsLoading ? (
          <main className="sc-container">
            <div className="sc-card-tag">행사 목록을 불러오는 중입니다.</div>
          </main>
        ) : null}
        {!eventsLoading && eventsError ? (
          <main className="sc-container">
            <div className="sc-card-tag">{eventsError}</div>
          </main>
        ) : null}
      </div>
    );
  }

  return (
    <div className="sc-root">
      <style>{styles}</style>
      <PageHeader
        title="전체 프로그램"
        subtitle={SUBTITLE_MAP["/program/all"]}
        categories={categories}
        currentPath={currentPath}
        onNavigate={(path) => navigate(path)}
      />
      <main className="sc-container">
        <ScheduleContent
          eventDetail={eventDetail}
          programs={programs}
          loading={loading}
          error={error}
        />
      </main>
    </div>
  );
}
