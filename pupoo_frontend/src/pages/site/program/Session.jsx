import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import PageHeader from "../components/PageHeader";
import PageLoading from "../components/PageLoading";
import EventSelectPage from "../components/EventSelectPage";
import {
  SERVICE_CATEGORIES,
  SUBTITLE_MAP,
} from "../constants/programConstants";
import { eventApi } from "../../../app/http/eventApi";
import { programApi } from "../../../app/http/programApi";
import { boothApi } from "../../../app/http/boothApi";
import {
  loadImageCache as loadProgramImageCache,
  injectProgramImages,
} from "../../admin/shared/programImageStore";
import {
  loadImageCache as loadEventImageCache,
  injectEventImages,
} from "../../admin/shared/eventImageStore";
import {
  CalendarDays,
  CalendarCheck,
  CalendarX,
  Clock,
  MapPin,
  ChevronRight,
  Mic2,
} from "lucide-react";
import { resolveImageUrl } from "../../../shared/utils/publicAssetUrl";

const styles = `
  .pg-root { background:#f8f9fc; min-height:100vh; }
  .pg-wrap { max-width:1400px; margin:0 auto; padding:32px 25px 64px; }

  .pg-stats { display:grid; grid-template-columns:repeat(4,1fr); gap:14px; margin-bottom:18px; }
  .pg-stat { background:#fff; border:1px solid #e9ecef; border-radius:13px; padding:18px 20px; display:flex; align-items:center; gap:12px; }
  .pg-stat-ico { width:40px; height:40px; border-radius:10px; display:flex; align-items:center; justify-content:center; }
  .pg-stat-lb { font-size:12px; color:#6b7280; }
  .pg-stat-v { font-size:22px; font-weight:800; color:#111827; }

  .pg-filter { display:flex; gap:8px; flex-wrap:wrap; margin-bottom:14px; }
  .pg-filter button {
    border:1px solid #e5e7eb; background:#fff; color:#6b7280;
    padding:7px 14px; border-radius:999px; font-size:12px; font-weight:700; cursor:pointer;
  }
  .pg-filter button.active { background:#90C450; border-color:#90C450; color:#fff; }

  .pg-grid { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:14px; }
  .pg-card {
    background:#fff; border:1px solid #e9ecef; border-radius:14px; padding:0;
    display:flex; flex-direction:column; gap:12px; overflow:hidden;
  }
  .pg-card.live { border-color:#3a4520; background:#f0fdf9; }
  .pg-thumb {
    width:100%; aspect-ratio: 16/10;
    background: linear-gradient(135deg,#E6F7F2 0%, #f8fafc 100%);
    position: relative; overflow: hidden;
  }
  .pg-thumb img { width:100%; height:100%; object-fit:cover; display:block; }
  .pg-thumb-ph {
    position:absolute; inset:0; display:flex; flex-direction:column;
    align-items:center; justify-content:center; gap:8px; color:#c5cdd8;
    background: linear-gradient(135deg,#f0f4ff 0%,#f8fafc 100%);
  }
  .pg-thumb-ph-text { font-size:12px; font-weight:600; color:#b0bcce; letter-spacing:0.02em; }
  .pg-body { padding:16px; display:flex; flex-direction:column; gap:12px; }
  .pg-card-head { display:flex; align-items:center; justify-content:space-between; gap:10px; }
  .pg-badge { padding:4px 10px; border-radius:999px; font-size:11px; font-weight:700; }
  .pg-badge.live { background:#ecfdf5; color:#059669; }
  .pg-badge.upcoming { background:#fff7ed; color:#d97706; }
  .pg-badge.done { background:#f8f9fc; color:#9ca3af; }
  .pg-title { font-size:16px; font-weight:800; color:#111827; line-height:1.35; }
  .pg-desc { font-size:12.5px; color:#6b7280; line-height:1.45; min-height:36px; }
  .pg-meta { display:flex; flex-direction:column; gap:7px; font-size:12px; color:#6b7280; }
  .pg-meta-row { display:flex; align-items:center; gap:6px; }
  .pg-foot { display:flex; align-items:center; justify-content:space-between; gap:8px; padding-top:8px; border-top:1px solid #f1f3f5; }
  .pg-cat { font-size:11px; font-weight:700; color:#8b5cf6; background:#f3e8ff; border-radius:999px; padding:3px 9px; }
  .pg-host { font-size:12px; color:#6b7280; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .pg-detail { border:0; background:transparent; color:#90C450; font-size:12px; font-weight:700; cursor:pointer; display:inline-flex; align-items:center; gap:4px; }
  .pg-card.done-card {
    opacity: 0.52; pointer-events: none; filter: grayscale(0.4);
    border-color: #e9ecef; background: #f8f9fc;
  }
  .pg-card.done-card .pg-detail { pointer-events: auto; cursor: not-allowed; color: #9ca3af; }
  .pg-card-empty { display:flex; flex-direction:column; align-items:center; justify-content:center; padding:56px 24px; }

  @media (max-width: 1100px) { .pg-grid { grid-template-columns:repeat(2,minmax(0,1fr)); } }
  @media (max-width: 700px) {
    .pg-wrap { padding:20px 16px 48px; }
    .pg-stats { grid-template-columns:repeat(2,1fr); }
    .pg-grid { grid-template-columns:1fr; }
  }
`;

const STATUS_LABEL = { live: "진행 중", upcoming: "예정", done: "완료" };

function parseDate(v) {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}
function fmtDate(v) {
  const d = parseDate(v);
  if (!d) return "일정 미정";
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}
function fmtTime(v) {
  const m = String(v ?? "").match(/(\d{2}):(\d{2})/);
  return m ? `${m[1]}:${m[2]}` : "";
}
function toStatus(item) {
  if (item?.ongoing) return "live";
  if (item?.ended) return "done";
  if (item?.upcoming) return "upcoming";
  const now = Date.now();
  const s = parseDate(item?.startAt)?.getTime();
  const e = parseDate(item?.endAt)?.getTime();
  if (s && now < s) return "upcoming";
  if (e && now > e) return "done";
  return "live";
}
function toEventStatus(rawStatus, startAt, endAt) {
  const raw = String(rawStatus ?? "").toUpperCase();
  if (raw.includes("ONGOING") || raw.includes("LIVE")) return "live";
  if (raw.includes("END")) return "ended";
  const now = Date.now();
  const s = parseDate(startAt)?.getTime();
  const e = parseDate(endAt)?.getTime();
  if (s && now < s) return "upcoming";
  if (e && now > e) return "ended";
  return "upcoming";
}
function formatDateRange(startAt, endAt) {
  const pick = (v) => {
    const m = String(v ?? "").match(/^(\d{4})-(\d{2})-(\d{2})/);
    return m ? `${m[1]}.${m[2]}.${m[3]}` : "";
  };
  const a = pick(startAt),
    b = pick(endAt);
  return a && b ? `${a} ~ ${b}` : a || b || "일정 미정";
}

function SessionList({ eventId }) {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    if (!eventId) return;
    let mounted = true;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const [list, boothRes] = await Promise.all([
          programApi.getAllProgramsByEvent({
            eventId: Number(eventId),
            category: "SESSION",
            sort: "startAt,asc",
          }),
          boothApi.getEventBooths({
            eventId: Number(eventId),
            page: 0,
            size: 200,
            sort: "boothId,asc",
          }),
        ]);
        if (!mounted) return;
        const booths = Array.isArray(boothRes?.data?.data?.content)
          ? boothRes.data.data.content
          : [];
        const boothMap = new Map(
          booths
            .map((b) => [Number(b?.boothId), b?.placeName])
            .filter(([id, n]) => Number.isFinite(id) && !!n),
        );
        await loadProgramImageCache();
        const raw = Array.isArray(list) ? list : [];
        const injected = injectProgramImages(raw);
        injected.sort(
          (a, b) => Number(b?.programId ?? 0) - Number(a?.programId ?? 0),
        );
        const mapped = injected.map((item, idx) => ({
          id: Number(item?.programId ?? idx + 1),
          title: item?.programTitle ?? item?.programName ?? `세션 ${idx + 1}`,
          description: item?.description ?? "",
          schedule: `${fmtDate(item?.startAt)} ${fmtTime(item?.startAt)}~${fmtTime(item?.endAt)}`,
          location:
            item?.location ??
            item?.place ??
            boothMap.get(Number(item?.boothId)) ??
            "장소 미정",
          thumbnail: item?.imageUrl ?? item?.image_url ?? null,
          status: toStatus(item),
          detailPath: `/program/detail?programId=${item?.programId ?? item?.id}`,
        }));
        setSessions(mapped);
      } catch (e) {
        if (!mounted) return;
        setError(
          e?.response?.data?.message ||
            e?.message ||
            "세션 데이터를 불러오지 못했습니다.",
        );
        setSessions([]);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [eventId]);

  const filtered = useMemo(
    () =>
      filter === "all" ? sessions : sessions.filter((s) => s.status === filter),
    [sessions, filter],
  );
  const liveCount = sessions.filter((s) => s.status === "live").length;
  const upcomingCount = sessions.filter((s) => s.status === "upcoming").length;
  const doneCount = sessions.filter((s) => s.status === "done").length;

  return (
    <main className="pg-wrap">
      <div className="pg-stats">
        <div className="pg-stat">
          <div className="pg-stat-ico" style={{ background: "#f3e8ff" }}>
            <Mic2 size={18} color="#8b5cf6" />
          </div>
          <div>
            <div className="pg-stat-lb">전체 세션</div>
            <div className="pg-stat-v">{sessions.length}개</div>
          </div>
        </div>
        <div className="pg-stat">
          <div className="pg-stat-ico" style={{ background: "#ecfdf5" }}>
            <Clock size={18} color="#3a4520" />
          </div>
          <div>
            <div className="pg-stat-lb">진행 중</div>
            <div className="pg-stat-v">{liveCount}개</div>
          </div>
        </div>
        <div className="pg-stat">
          <div className="pg-stat-ico" style={{ background: "#fff7ed" }}>
            <CalendarDays size={18} color="#d97706" />
          </div>
          <div>
            <div className="pg-stat-lb">예정</div>
            <div className="pg-stat-v">{upcomingCount}개</div>
          </div>
        </div>
        <div className="pg-stat">
          <div className="pg-stat-ico" style={{ background: "#f3f4f6" }}>
            <CalendarCheck size={18} color="#6b7280" />
          </div>
          <div>
            <div className="pg-stat-lb">완료</div>
            <div className="pg-stat-v">{doneCount}개</div>
          </div>
        </div>
      </div>

      <div className="pg-filter">
        {[
          ["all", "전체"],
          ["live", "진행 중"],
          ["upcoming", "예정"],
          ["done", "완료"],
        ].map(([k, l]) => (
          <button
            key={k}
            className={filter === k ? "active" : ""}
            onClick={() => setFilter(k)}
          >
            {l}
          </button>
        ))}
      </div>

      {loading && <PageLoading />}
      {!loading && error && <div className="pg-card-empty">{error}</div>}
      {!loading && !error && filtered.length === 0 && (
        <div className="pg-card-empty">
          <Mic2
            size={48}
            strokeWidth={1.2}
            style={{ marginBottom: 16, color: "#d1d5db" }}
          />
          <div
            style={{
              fontSize: 15,
              fontWeight: 700,
              color: "#374151",
              marginBottom: 6,
            }}
          >
            세션 정보가 없습니다
          </div>
          <div style={{ fontSize: 13, color: "#9ca3af" }}>
            등록된 세션 강연이 없어요.
          </div>
        </div>
      )}
      {!loading && !error && filtered.length > 0 && (
        <div className="pg-grid">
          {filtered.map((p) => {
            const isDone = p.status === "done";
            return (
              <div
                key={p.id}
                className={`pg-card ${p.status === "live" ? "live" : ""} ${isDone ? "done-card" : ""}`}
              >
                <div className="pg-thumb">
                  {p.thumbnail ? (
                    <img
                      src={resolveImageUrl(p.thumbnail)}
                      alt={p.title}
                      loading="lazy"
                      onError={(e) => {
                        e.target.style.display = "none";
                        e.target.nextSibling.style.display = "flex";
                      }}
                    />
                  ) : null}
                  <div
                    className="pg-thumb-ph"
                    style={{ display: p.thumbnail ? "none" : "flex" }}
                  >
                    <Mic2 size={28} strokeWidth={1.2} color="#c5cdd8" />
                    <span className="pg-thumb-ph-text">이미지 없음</span>
                  </div>
                </div>
                <div className="pg-body">
                  <div className="pg-card-head">
                    <span className={`pg-badge ${p.status}`}>
                      {STATUS_LABEL[p.status]}
                    </span>
                    <span className="pg-cat">세션</span>
                  </div>
                  <div className="pg-title">{p.title}</div>
                  <div className="pg-desc">
                    {p.description || "설명이 없습니다."}
                  </div>
                  <div className="pg-meta">
                    <div className="pg-meta-row">
                      <CalendarDays size={12} /> {p.schedule}
                    </div>
                    <div className="pg-meta-row">
                      <MapPin size={12} /> {p.location}
                    </div>
                  </div>
                  <div className="pg-foot">
                    <span className="pg-host"></span>
                    <button
                      className="pg-detail"
                      onClick={() => !isDone && navigate(p.detailPath)}
                      style={
                        isDone
                          ? { color: "#9ca3af", cursor: "not-allowed" }
                          : {}
                      }
                    >
                      {isDone ? (
                        "기간 만료"
                      ) : (
                        <>
                          상세보기 <ChevronRight size={13} />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}

export default function Session() {
  const navigate = useNavigate();
  const { eventId } = useParams();
  const currentPath = "/program/session";
  const [events, setEvents] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(false);

  useEffect(() => {
    if (eventId) return;
    let mounted = true;
    (async () => {
      setEventsLoading(true);
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
        const injectedEvents = injectEventImages(
          list.map((evt) => ({
            eventId: evt?.eventId,
            id: evt?.eventId,
            imageUrl: evt?.imageUrl || null,
          })),
        );
        const imgByEventId = Object.fromEntries(
          injectedEvents.map((e) => [String(e.eventId || e.id), e.imageUrl]),
        );
        setEvents(
          list.map((evt) => ({
            id: evt?.eventId,
            name: evt?.eventName ?? "행사",
            description: evt?.description ?? "",
            date: formatDateRange(evt?.startAt, evt?.endAt),
            location: evt?.location ?? "장소 미정",
            organizer: evt?.organizer ?? "주최 정보 없음",
            status: toEventStatus(evt?.status, evt?.startAt, evt?.endAt),
            participants: 0,
            thumbnail: imgByEventId[String(evt?.eventId)] || null,
            imageUrl: imgByEventId[String(evt?.eventId)] || null,
            color: "#8b5cf6",
          })),
        );
      } catch {
        if (!mounted) return;
        setEvents([]);
      } finally {
        if (mounted) setEventsLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [eventId]);

  if (!eventId)
    return (
      <div className="pg-root">
        <style>{styles}</style>
        <PageHeader
          title="세션 및 강연"
          subtitle="행사를 선택해 세션 프로그램을 확인하세요"
          categories={SERVICE_CATEGORIES}
          currentPath={currentPath}
          onNavigate={(path) => navigate(path)}
        />
        <EventSelectPage events={events} basePath="/program/session" />
        {eventsLoading && <PageLoading />}
      </div>
    );

  return (
    <div className="pg-root">
      <style>{styles}</style>
      <PageHeader
        title="세션 및 강연"
        subtitle={SUBTITLE_MAP[currentPath]}
        categories={SERVICE_CATEGORIES}
        currentPath={currentPath}
        onNavigate={(path) => navigate(path)}
      />
      <SessionList eventId={eventId} />
    </div>
  );
}
