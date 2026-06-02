import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { noticeApi, unwrap } from "../../../api/noticeApi";
import { reviewApi } from "../../../app/http/reviewApi";
import { eventApi } from "../../../app/http/eventApi";
import { programApi } from "../../../app/http/programApi";
import { normalizeEventTitle } from "../../../shared/utils/eventDisplay";
import { LazyInlineVideo } from "../../../shared/components/video/LazyInlineVideo";
import {
  createImageFallbackHandler,
  resolveImageUrl,
  toPublicAssetUrl,
} from "../../../shared/utils/publicAssetUrl";

/* 행사 카드에 순환 적용할 대체 이미지를 준비한다. */
const DOG_IMGS = [
  "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=600&h=800&fit=crop",
  "https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=600&h=800&fit=crop",
  "https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?w=600&h=800&fit=crop",
  "https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=600&h=800&fit=crop",
  "https://images.unsplash.com/photo-1552053831-71594a27632d?w=600&h=800&fit=crop",
  "https://images.unsplash.com/photo-1517849845537-4d257902454a?w=600&h=800&fit=crop",
  "https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=600&h=800&fit=crop",
  "https://images.unsplash.com/photo-1518717758536-85ae29035b6d?w=600&h=800&fit=crop",
];
const dogImg = (id) => DOG_IMGS[Math.abs(Number(id) || 0) % DOG_IMGS.length];

const HOME_HERO_VIDEOS = [
  {
    src: toPublicAssetUrl("/uploads/home/home-1.mp4"),
    poster: toPublicAssetUrl("/uploads/home/home-1-poster.jpg"),
  },
  {
    src: toPublicAssetUrl("/uploads/home/home-2.mp4"),
    poster: toPublicAssetUrl("/uploads/home/home-2-poster.jpg"),
  },
  {
    src: toPublicAssetUrl("/uploads/home/home-3.mp4"),
    poster: toPublicAssetUrl("/uploads/home/home-3-poster.jpg"),
  },
];

/* 화면 곳곳에서 재사용하는 날짜 표기 함수다. */
function fmtEventDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d)) return "";
  const week = ["일", "월", "화", "수", "목", "금", "토"];
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}(${week[d.getDay()]})`;
}

function fmtTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d)) return "";
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function toTimeValue(value) {
  if (!value) return null;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : null;
}

function isCurrentEvent(raw) {
  const status = String(raw?.status || "").toUpperCase();
  if (status === "ONGOING" || status === "CURRENT") return true;
  const start = toTimeValue(raw?.startAt ?? raw?.startDateTime);
  const end = toTimeValue(raw?.endAt ?? raw?.endDateTime);
  const now = Date.now();
  return start != null && end != null && start <= now && end >= now;
}

function isUpcomingEvent(raw) {
  const status = String(raw?.status || "").toUpperCase();
  if (status === "PLANNED" || status === "UPCOMING") return true;
  const start = toTimeValue(raw?.startAt ?? raw?.startDateTime);
  return start != null && start > Date.now();
}

function mapApiEvent(raw) {
  const id = raw?.eventId ?? raw?.id;
  const title = normalizeEventTitle(raw?.eventName ?? raw?.title, raw);
  return {
    id,
    title,
    description: raw?.description ?? "",
    location: raw?.location ?? raw?.place ?? "장소 미정",
    category: raw?.category ?? raw?.eventCategory ?? "행사",
    startAt: raw?.startAt ?? raw?.startDateTime ?? null,
    endAt: raw?.endAt ?? raw?.endDateTime ?? null,
    image: raw?.imageUrl ?? raw?.posterUrl ?? raw?.thumbnail ?? dogImg(id),
    participants: raw?.participants ?? raw?.appliedCount ?? 0,
    capacity: raw?.capacity ?? raw?.maxParticipants ?? 0,
    status: raw?.status ?? "",
  };
}

/* 프로그램 응답을 화면에서 쓰기 쉬운 세션 형태로 변환한다. */
function mapSession(raw, eventMap) {
  const id = raw?.programId ?? raw?.id;
  const eventId = raw?.eventId;
  const ev = eventMap?.get(Number(eventId));
  return {
    id,
    eventId,
    title: raw?.programTitle ?? raw?.programName ?? raw?.title ?? "세션",
    description: raw?.description ?? "",
    location: raw?.location ?? raw?.place ?? raw?.boothName ?? ev?.location ?? "장소 미정",
    category: raw?.category ?? raw?.programCategory ?? "",
    startAt: raw?.startAt ?? raw?.startDateTime ?? null,
    endAt: raw?.endAt ?? raw?.endDateTime ?? null,
    image: raw?.imageUrl ?? ev?.imageUrl ?? dogImg(id),
    eventName: normalizeEventTitle(ev?.eventName, ev || {}),
    status: raw?.status ?? "",
    ongoing: Boolean(raw?.ongoing),
    upcoming: Boolean(raw?.upcoming),
    ended: Boolean(raw?.ended),
  };
}

// ================= 스크롤 리빌 애니메이션 =================
function useScrollReveal(options = {}) {
  const { threshold = 0.15, rootMargin = "0px 0px -60px 0px" } = options;
  const ref = useRef(null);
  const [isVisible, setIsVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            observer.unobserve(el);
          }
        },
        { threshold, rootMargin },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold, rootMargin]);
  return [ref, isVisible];
}

function RevealSection({ children, className = "", delay = 0 }) {
  const [ref, isVisible] = useScrollReveal();
  return (
      <div
          ref={ref}
          className={className}
          style={{
            opacity: isVisible ? 1 : 0,
            transform: isVisible ? "translateY(0)" : "translateY(40px)",
            transition: `opacity 0.7s cubic-bezier(0.16,1,0.3,1) ${delay}s, transform 0.7s cubic-bezier(0.16,1,0.3,1) ${delay}s`,
          }}
      >
        {children}
      </div>
  );
}

// ================= 현재 행사 섹션(DB 연동, 좌우 3개씩 고정) =================
function EventSection() {
  const navigate = useNavigate();
  const [hoveredCard, setHoveredCard] = useState(null);
  const [events, setEvents] = useState([]);

  useEffect(() => {
    eventApi
        .getEvents({ page: 0, size: 100 })
        .then((res) => {
          const list = Array.isArray(res.data?.data?.content) ? res.data.data.content : Array.isArray(res.data?.data) ? res.data.data : [];
          const currentRows = list
              .filter(isCurrentEvent)
              .sort((a, b) => toTimeValue(a?.startAt) - toTimeValue(b?.startAt));
          const fallbackRows = list
              .filter(isUpcomingEvent)
              .sort((a, b) => toTimeValue(a?.startAt) - toTimeValue(b?.startAt));
          const source = currentRows.length > 0 ? currentRows : fallbackRows;
          setEvents(source.slice(0, 6).map(mapApiEvent));
        })
        .catch(() => setEvents([]));
  }, []);

  // 최대 6개 행사를 좌우 3개씩 나눠 배치한다.
  const leftItems = events.slice(0, 3);
  const rightItems = events.length > 3 ? events.slice(3, 6) : events.slice(0, Math.min(3, events.length));
  const sides = [
    { items: leftItems, color: { bg: "bg-gradient-to-r from-[#E6F7F2] to-[#EDF9F5]", text: "text-[#90C450]" } },
    { items: rightItems, color: { bg: "bg-gradient-to-r from-emerald-50 to-teal-100/50", text: "text-teal-700" } },
  ];
  const groupDate = (items) => {
    const first = items.find((e) => e.startAt);
    return first ? fmtEventDate(first.startAt) : "일정 미정";
  };

  return (
      <section className="w-full bg-gradient-to-b from-gray-50 to-white py-16">
        <div className="max-w-[1400px] mx-auto px-[25px]">
          <RevealSection>
            <div className="text-center mb-10">
              <p className="text-[14px] font-semibold text-gray-500 uppercase mb-1">진행 중인 행사 안내</p>
              <h2 className="text-4xl font-bold text-gray-900 mb-4 leading-tight">현재 진행 중인 행사</h2>
              <button onClick={() => navigate("/event/current")} className="inline-flex items-center gap-1.5 text-white text-sm font-semibold px-6 py-2 rounded-full transition-all duration-300" style={{ background: "#90C450" }}>자세히 보기</button>
            </div>
          </RevealSection>
          <RevealSection delay={0.15}>
            {events.length === 0 ? (
                <div className="text-center text-gray-400 py-12">진행 중인 행사가 없습니다.</div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 relative">
                  <div className="hidden lg:block absolute left-1/2 top-6 bottom-0 -translate-x-1/2">
                    <div className="w-px h-full" style={{ backgroundImage: "radial-gradient(circle, #d1d5db 1px, transparent 1px)", backgroundSize: "1px 5px" }} />
                  </div>
                  {sides.map((side, si) => (
                      <div key={si} className="space-y-4">
                        <div className={`${side.color.bg} ${side.color.text} text-center py-3 rounded-xl font-semibold text-sm`}>{groupDate(side.items)}</div>
                        <div className="space-y-4">
                          {side.items.map((ev, idx) => (
                              <EventCard
                                  key={ev.id || idx}
                                  event={{ title: ev.title, time: ev.startAt && ev.endAt ? `${fmtTime(ev.startAt)} ~ ${fmtTime(ev.endAt)}` : "시간 미정", location: ev.location }}
                                  isHovered={hoveredCard === `${si}-${idx}`}
                                  onHover={() => setHoveredCard(`${si}-${idx}`)}
                                  onLeave={() => setHoveredCard(null)}
                                  onClick={() => navigate("/event/current")}
                              />
                          ))}
                        </div>
                      </div>
                  ))}
                </div>
            )}
          </RevealSection>
        </div>
      </section>
  );
}

function EventCard({ event, isHovered, onHover, onLeave, onClick }) {
  return (
      <div className="cursor-pointer" onMouseEnter={onHover} onMouseLeave={onLeave} onClick={onClick}>
        <div className={`rounded-xl p-5 border border-gray-200 transition-all duration-300 ${isHovered ? "bg-gray-100 border-gray-300" : "bg-white"}`}>
          <div className="text-center">
            <h3 className="text-base font-semibold text-gray-900 mb-1">{event.title}</h3>
            <p className="text-[13px] text-gray-600 leading-tight">{event.time}</p>
            <p className="text-[13px] text-gray-600 leading-tight">{event.location}</p>
            <div className={`overflow-hidden transition-all duration-300 ease-out ${isHovered ? "max-h-16 mt-3" : "max-h-0 mt-0"}`}>
              <button type="button" onClick={(e) => { e.stopPropagation(); onClick?.(); }} className="text-white text-xs font-semibold px-4 py-1.5 rounded-full" style={{ background: "#90C450" }}>자세히 보기</button>
            </div>
          </div>
        </div>
      </div>
  );
}

// ================= 무한 루프 캐러셀 훅 =================
function useInfiniteSlider(itemCount, slideSize) {
  const CLONES = 15;
  const CENTER = itemCount * 7;
  const [index, setIndex] = useState(CENTER);
  const [transition, setTransition] = useState(true);
  const resetTimer = useRef(null);
  const next = () => setIndex((p) => p + 1);
  const prev = () => setIndex((p) => p - 1);
  const goTo = (realIdx) => setIndex(CENTER + realIdx);
  useEffect(() => {
    clearTimeout(resetTimer.current);
    resetTimer.current = setTimeout(() => {
      const mod = (((index - CENTER) % itemCount) + itemCount) % itemCount;
      const target = CENTER + mod;
      if (target !== index) { setTransition(false); setIndex(target); }
    }, 650);
    return () => clearTimeout(resetTimer.current);
  }, [index, itemCount]);
  useEffect(() => {
    if (!transition) {
      const t = requestAnimationFrame(() => { requestAnimationFrame(() => setTransition(true)); });
      return () => cancelAnimationFrame(t);
    }
  }, [transition]);
  const realIndex = ((index % itemCount) + itemCount) % itemCount;
  const offset = index * slideSize;
  return { index, realIndex, offset, transition, next, prev, goTo, setIndex, setTransition, CLONES };
}

// ================= 세션 라인업 섹션(프로그램 DB 연동) =================
function SessionLineup() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const evRes = await eventApi.getEvents({ page: 0, size: 100 });
        const events = Array.isArray(evRes.data?.data?.content) ? evRes.data.data.content : Array.isArray(evRes.data?.data) ? evRes.data.data : [];
        const currentEvents = events
            .filter(isCurrentEvent)
            .sort((a, b) => toTimeValue(a?.startAt) - toTimeValue(b?.startAt));
        const sourceEvents = currentEvents.length > 0
            ? currentEvents
            : events.filter(isUpcomingEvent).sort((a, b) => toTimeValue(a?.startAt) - toTimeValue(b?.startAt));
        const targetEvents = sourceEvents.slice(0, 6);
        const eventMap = new Map(targetEvents.map((e) => [Number(e.eventId ?? e.id), e]));

        const allSessions = [];
        for (const ev of targetEvents) {
          try {
            const list = await programApi.getAllProgramsByEvent({ eventId: ev.eventId ?? ev.id, pageSize: 50 });
            list.forEach((p) => allSessions.push(mapSession(p, eventMap)));
          } catch { /* 개별 행사 프로그램 조회 실패는 건너뛴다. */ }
        }
        const sorted = allSessions.sort((a, b) => {
          const score = (item) => (item.ongoing ? 0 : item.upcoming ? 1 : item.ended ? 3 : 2);
          const diff = score(a) - score(b);
          if (diff !== 0) return diff;
          return (toTimeValue(a.startAt) || 0) - (toTimeValue(b.startAt) || 0);
        });
        setSessions(sorted);
      } catch {
        setSessions([]);
      }
    })();
  }, []);

  const items = sessions.slice(0, 10);
  const GAP = 20;
  const VISIBLE = 4;
  const PEEK = 0.35;
  const CARD_W = Math.floor((1400 - GAP * VISIBLE) / (VISIBLE + PEEK));
  const SLIDE = CARD_W + GAP;
  const slider = useInfiniteSlider(Math.max(items.length, 1), SLIDE);
  const extended = items.length > 0 ? Array.from({ length: slider.CLONES }, () => items).flat() : [];
  const [hovered, setHovered] = useState(null);
  const dragRef = useRef({ startX: 0, currentX: 0, dragging: false });
  const trackRef = useRef(null);
  const onPointerDown = (e) => { dragRef.current = { startX: e.clientX, currentX: e.clientX, dragging: true }; slider.setTransition(false); };
  const onPointerMove = (e) => {
    if (!dragRef.current.dragging) return;
    dragRef.current.currentX = e.clientX;
    const track = trackRef.current;
    if (track) { track.style.transform = `translate3d(${-slider.offset + (dragRef.current.currentX - dragRef.current.startX)}px, 0, 0)`; }
  };
  const onPointerUp = () => {
    if (!dragRef.current.dragging) return;
    const delta = dragRef.current.currentX - dragRef.current.startX;
    dragRef.current.dragging = false;
    slider.setTransition(true);
    if (delta < -50) slider.next();
    else if (delta > 50) slider.prev();
  };

  const catLabel = (c) => {
    const raw = String(c).toUpperCase();
    if (raw.includes("SESSION")) return "세션";
    if (raw.includes("EXPERIENCE")) return "체험";
    if (raw.includes("CONTEST")) return "콘테스트";
    return "프로그램";
  };

  return (
      <div className="w-full bg-white py-20">
        <div className="max-w-[1400px] mx-auto px-[25px]">
          <RevealSection>
            <div className="text-center mb-10">
              <p className="text-[14px] font-semibold text-gray-500 uppercase mb-1">PuPoo Session</p>
              <h2 className="text-2xl md:text-4xl font-bold text-gray-900 mb-4 leading-tight"><span className="md:hidden">현재 행사에서<br />운영 중인 프로그램</span><span className="hidden md:inline">현재 행사에서 운영 중인 프로그램</span></h2>
              <button onClick={() => navigate("/program/current")} className="inline-flex items-center gap-1.5 text-white text-sm font-semibold px-6 py-2 rounded-full transition-all duration-300" style={{ background: "#90C450" }}>전체 프로그램 보기</button>
            </div>
          </RevealSection>
          <RevealSection delay={0.12}>
            {items.length === 0 ? (
                <div className="text-center text-gray-400 py-12">연결된 프로그램이 없습니다.</div>
            ) : (
                <>
                  <div className="overflow-hidden cursor-grab active:cursor-grabbing" onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerLeave={onPointerUp} style={{ userSelect: "none" }}>
                    <div ref={trackRef} className="flex" style={{ gap: GAP, transform: `translate3d(-${slider.offset}px, 0, 0)`, transition: slider.transition ? "transform 600ms cubic-bezier(0.16,1,0.3,1)" : "none", willChange: "transform" }}>
                      {extended.map((s, i) => {
                        const isH = hovered === i;
                        return (
                            <div key={i} style={{ width: CARD_W, transform: isH ? "translateY(-4px)" : "translateY(0)", transition: "transform 0.3s cubic-bezier(0.16,1,0.3,1)" }} className="shrink-0" onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)} onClick={() => navigate("/program/current")}>
                              <div className="relative overflow-hidden rounded-2xl bg-gray-100 aspect-[3/4]" style={{ boxShadow: isH ? "0 8px 24px rgba(0,0,0,0.12)" : "0 1px 4px rgba(0,0,0,0.04)", transition: "box-shadow 0.3s ease" }}>
                                <img
                                    src={resolveImageUrl(s.image, dogImg(s.id))}
                                    alt={s.title}
                                    className={`w-full h-full object-cover transition-transform duration-500 ease-out ${isH ? "scale-[1.03]" : "scale-100"}`}
                                    draggable={false}
                                    onError={createImageFallbackHandler(dogImg(s.id))}
                                />
                                <div className="absolute inset-x-0 bottom-0 h-2/5" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.55), transparent)" }} />
                                <div className="absolute bottom-0 left-0 right-0 p-5">
                                  <p className="text-white font-bold text-lg leading-snug">{s.title}</p>
                                  <p className="text-white/60 text-sm mt-0.5">{s.eventName}</p>
                                  <p className="text-white/50 text-xs mt-1">
                                    {s.startAt ? `${fmtEventDate(s.startAt)} ${fmtTime(s.startAt)}` : "일정 미정"}
                                    {s.location ? ` · ${s.location}` : ""}
                                  </p>
                                </div>
                              </div>
                              <div className="mt-3">
                                <span className="inline-block text-[11px] font-bold text-white px-2.5 py-1 rounded-md" style={{ background: "#90C450" }}>{catLabel(s.category)}</span>
                                <span className="inline-block text-[11px] font-medium bg-gray-200 text-gray-600 px-2.5 py-1 rounded-md ml-1.5">{s.eventName}</span>
                              </div>
                            </div>
                        );
                      })}
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-8">
                    <div className="flex items-center gap-5">
                  <span className="text-sm font-bold tabular-nums text-gray-900">
                    {String(slider.realIndex + 1).padStart(2, "0")}
                    <span className="text-gray-300 mx-1.5">/</span>
                    {String(items.length).padStart(2, "0")}
                  </span>
                      <div className="flex gap-1.5">
                        {items.map((_, i) => (
                            <button key={i} onClick={() => slider.goTo(i)} className={`h-[3px] rounded-full transition-all duration-500 ${i === slider.realIndex ? "w-8 bg-gray-900" : "w-3 bg-gray-300 hover:bg-gray-400"}`} />
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={slider.prev} className="w-11 h-11 rounded-full border border-gray-200 bg-white flex items-center justify-center transition-all duration-200 hover:border-gray-400 active:scale-95">
                        <svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
                      </button>
                      <button onClick={slider.next} className="w-11 h-11 rounded-full border border-gray-200 bg-white flex items-center justify-center transition-all duration-200 hover:border-gray-400 active:scale-95">
                        <svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                      </button>
                    </div>
                  </div>
                </>
            )}
          </RevealSection>
        </div>
      </div>
  );
}

// ================= 추천 행사 캐러셀(DB 연동) =================
function RecommendCarousel() {
  const [events, setEvents] = useState([]);
  useEffect(() => {
    eventApi.getEvents({ page: 0, size: 8 })
        .then((res) => {
          const list = res.data?.data?.content || res.data?.data || [];
          setEvents(list.map(mapApiEvent));
        })
        .catch(() => setEvents([]));
  }, []);

  const items = events.length > 0 ? events : [];
  const GAP = 24;
  const PEEK = 0.4;
  const CARD_W = Math.floor((1400 - GAP * 3) / (3 + PEEK));
  const SLIDE = CARD_W + GAP;
  const slider = useInfiniteSlider(Math.max(items.length, 1), SLIDE);
  const extended = items.length > 0 ? Array.from({ length: slider.CLONES }, () => items).flat() : [];
  const dragRef = useRef({ startX: 0, currentX: 0, dragging: false });
  const trackRef = useRef(null);
  const onPointerDown = (e) => { dragRef.current = { startX: e.clientX, currentX: e.clientX, dragging: true }; slider.setTransition(false); };
  const onPointerMove = (e) => {
    if (!dragRef.current.dragging) return;
    dragRef.current.currentX = e.clientX;
    const track = trackRef.current;
    if (track) { track.style.transform = `translate3d(${-slider.offset + (dragRef.current.currentX - dragRef.current.startX)}px, 0, 0)`; }
  };
  const onPointerUp = () => {
    if (!dragRef.current.dragging) return;
    const delta = dragRef.current.currentX - dragRef.current.startX;
    dragRef.current.dragging = false;
    slider.setTransition(true);
    if (delta < -50) slider.next();
    else if (delta > 50) slider.prev();
  };

  if (items.length === 0) return <div className="text-center text-gray-400 py-12">추천 행사를 불러오는 중입니다.</div>;

  return (
      <div className="relative w-full">
        <RevealSection>
          <div className="overflow-hidden cursor-grab active:cursor-grabbing" onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerLeave={onPointerUp} style={{ userSelect: "none" }}>
            <div ref={trackRef} className="flex" style={{ gap: GAP, transform: `translate3d(-${slider.offset}px, 0, 0)`, transition: slider.transition ? "transform 600ms cubic-bezier(0.16,1,0.3,1)" : "none", willChange: "transform" }}>
              {extended.map((ev, i) => (
                  <div key={i} style={{ width: CARD_W }} className="shrink-0 group">
                    <div className="relative overflow-hidden rounded-2xl">
                      <img src={resolveImageUrl(ev.image, dogImg(ev.id))} alt={ev.title} draggable={false} className="h-[260px] w-full object-cover transition-transform duration-700 group-hover:scale-105" onError={createImageFallbackHandler(dogImg(ev.id))} />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    </div>
                    <div className="mt-4">
                      <div className="text-[17px] font-bold text-gray-900">{ev.title}</div>
                      <div className="text-sm text-gray-500 mt-1.5">
                        {ev.description ? (ev.description.length > 40 ? ev.description.slice(0, 40) + "..." : ev.description) : ev.startAt ? fmtEventDate(ev.startAt) : "상세 정보 보기"}
                      </div>
                      <span className="inline-block mt-3 text-xs font-medium bg-gray-200 text-gray-600 px-3 py-1 rounded-md">{ev.location}</span>
                    </div>
                  </div>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between mt-8">
            <div className="flex items-center gap-5">
            <span className="text-sm font-bold tabular-nums text-gray-900">
              {String(slider.realIndex + 1).padStart(2, "0")}
              <span className="text-gray-300 mx-1.5">/</span>
              {String(items.length).padStart(2, "0")}
            </span>
              <div className="flex gap-1.5">
                {items.map((_, i) => (
                    <button key={i} onClick={() => slider.goTo(i)} className={`h-[3px] rounded-full transition-all duration-500 ${i === slider.realIndex ? "w-8 bg-gray-900" : "w-3 bg-gray-300 hover:bg-gray-400"}`} />
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={slider.prev} className="w-11 h-11 rounded-full border border-gray-200 bg-white flex items-center justify-center transition-all hover:border-gray-400 active:scale-95">
                <svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
              </button>
              <button onClick={slider.next} className="w-11 h-11 rounded-full border border-gray-200 bg-white flex items-center justify-center transition-all hover:border-gray-400 active:scale-95">
                <svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
              </button>
            </div>
          </div>
        </RevealSection>
      </div>
  );
}

// ================= 공지사항 섹션(API 연동) =================
function fmtDate(dt) {
  if (!dt) return "-";
  const d = new Date(dt);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

function getReviewHeadline(item) {
  const explicitTitle = String(item?.reviewTitle || item?.title || "").trim();
  if (explicitTitle) return explicitTitle;
  const firstLine = String(item?.content || "").split("\n").map((line) => line.trim()).find(Boolean);
  if (!firstLine) return "행사 후기";
  return firstLine.length > 58 ? `${firstLine.slice(0, 58)}...` : firstLine;
}

function NoticeSection() {
  const navigate = useNavigate();
  const [notices, setNotices] = useState([]);
  const [reviews, setReviews] = useState([]);

  useEffect(() => {
    noticeApi.list(1, 3).then((res) => { const d = unwrap(res); setNotices(d?.content?.slice(0, 3) || []); }).catch(() => setNotices([]));
  }, []);
  useEffect(() => {
    reviewApi.list({ page: 0, size: 3 }).then((d) => {
      const content = Array.isArray(d?.content) ? d.content : Array.isArray(d) ? d : [];
      setReviews(content.slice(0, 3));
    }).catch(() => setReviews([]));
  }, []);

  const sections = [
    { title: "공지사항", items: notices.map((n) => ({ title: n.title, date: fmtDate(n.createdAt) })), morePath: "/community/notice" },
    { title: "후기 게시판", items: reviews.map((r) => ({ title: getReviewHeadline(r), date: fmtDate(r.createdAt) })), morePath: "/community/review" },
  ];

  return (
      <section className="bg-black text-white py-24">
        <div className="max-w-[1400px] mx-auto px-[25px] grid md:grid-cols-2 gap-16">
          {sections.map((section, idx) => (
              <RevealSection key={idx} delay={idx * 0.12}>
                <div>
                  <div className="flex justify-between items-center mb-10">
                    <h3 className="text-3xl font-extrabold">{section.title}</h3>
                    <button type="button" className="text-sm text-white/70 hover:text-white transition" onClick={() => section.morePath && navigate(section.morePath)}>more +</button>
                  </div>
                  <div className="space-y-10">
                    {section.items.length > 0
                        ? section.items.map((item, i) => (
                            <div key={i} className="group cursor-pointer" onClick={() => section.morePath && navigate(section.morePath)}>
                              <div className="flex justify-between">
                                <div>
                                  <div className="text-lg font-semibold group-hover:text-gray-300 transition">{item.title}</div>
                                  <div className="mt-3 text-sm text-white/60">{item.date}</div>
                                </div>
                                <div className="text-3xl text-white/60 group-hover:text-white transition">+</div>
                              </div>
                              <div className="mt-6 border-b border-white/20" />
                            </div>
                        ))
                        : [1, 2, 3].map((i) => (
                            <div key={i} className="group cursor-pointer">
                              <div className="flex justify-between">
                                <div>
                                  <div className="text-lg font-semibold text-white/30">불러오는 중...</div>
                                  <div className="mt-3 text-sm text-white/20">-</div>
                                </div>
                              </div>
                              <div className="mt-6 border-b border-white/20" />
                            </div>
                        ))}
                  </div>
                </div>
              </RevealSection>
          ))}
        </div>
      </section>
  );
}

// ================= 홈 메인 화면 =================
export default function Home() {
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [fade, setFade] = useState(true);
  const [progress, setProgress] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const videoRef = useRef(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
      const updateProgress = () => { if (video.duration) setProgress((video.currentTime / video.duration) * 100); };
      const handleEnded = () => {
        setFade(false); setProgress(0);
        setTimeout(() => { setCurrentVideoIndex((p) => (p === HOME_HERO_VIDEOS.length - 1 ? 0 : p + 1)); setFade(true); }, 600);
      };
    video.addEventListener("timeupdate", updateProgress);
    video.addEventListener("ended", handleEnded);
    return () => { video.removeEventListener("timeupdate", updateProgress); video.removeEventListener("ended", handleEnded); };
  }, [currentVideoIndex]);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    isPlaying ? v.pause() : v.play();
    setIsPlaying(!isPlaying);
  };

  return (
      <div>
        <section className="relative h-dvh w-full overflow-hidden">
          <LazyInlineVideo
            ref={videoRef}
            key={currentVideoIndex}
            src={HOME_HERO_VIDEOS[currentVideoIndex]?.src}
            poster={HOME_HERO_VIDEOS[currentVideoIndex]?.poster}
            autoPlay
            muted
            loop={false}
            playsInline
            preload="none"
            active
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${fade ? "opacity-100" : "opacity-0"}`}
          />
          <div className="absolute inset-0 bg-black/40" />
          <div className="relative h-full flex items-center justify-center">
            <div className="max-w-[1400px] w-full px-[25px] text-white">
              <h1 className="text-4xl md:text-6xl font-extrabold leading-tight">
                지금 가장 주목할
                <br />
                반려견 페스티벌
              </h1>
              <p className="mt-6 text-lg md:text-xl text-white/90">참여 가능한 행사를 바로 확인해 보세요.</p>
            </div>
          </div>
          <div className="absolute bottom-16 left-1/2 -translate-x-1/2 w-[300px]">
            <div className="relative h-[2px] bg-white/30">
              <div className="absolute left-0 top-0 h-full bg-white transition-[width] duration-200 ease-linear" style={{ width: `${progress}%` }} />
            </div>
            <div className="flex justify-between items-center mt-3 text-white text-sm">
              <span>{String(currentVideoIndex + 1).padStart(2, "0")} / {String(HOME_HERO_VIDEOS.length).padStart(2, "0")}</span>
              <button type="button" onClick={togglePlay} className="flex items-center justify-center w-7 h-7 rounded-full hover:bg-white/20 transition">
                {isPlaying ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><rect x="6" y="4" width="4" height="16" rx="1" /><rect x="14" y="4" width="4" height="16" rx="1" /></svg>
                ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z" /></svg>
                )}
              </button>
            </div>
          </div>
        </section>

        <SessionLineup />
        <EventSection />

        <section className="bg-[#f4f5f7] py-24 overflow-hidden">
          <div className="max-w-[1400px] mx-auto px-[25px]">
            <RevealSection>
              <h2 className="text-2xl md:text-3xl font-extrabold mb-8">
                <span className="text-[#90C450]">당신이</span> 좋아할 만한 추천 행사
              </h2>
            </RevealSection>
            <RevealSection delay={0.08}>
              <div className="bg-[#e9eaee] rounded-xl px-6 py-4 text-sm text-gray-700 mb-12">사용자 취향에 맞는 행사를 추천하고 있습니다.</div>
            </RevealSection>
            <RecommendCarousel />
          </div>
        </section>

        <NoticeSection />
      </div>
  );
}
