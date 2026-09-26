// 실시간 현황(통합·대기·체크인·투표) 공용 도구
// - 시간 판단: 운영 시간 안인지, 개장 전·마감 후인지, 데이터가 지금 값인지(신선도)
// - 혼잡 단계: 화면 전체가 같은 기준과 같은 말을 쓴다
import { useCallback, useEffect, useRef, useState } from "react";

/* ── 혼잡 단계 (0~29 여유 / 30~59 보통 / 60~79 혼잡 / 80~ 매우 혼잡) ── */
export const LEVELS = [
  { key: "calm", min: 0, label: "여유", color: "#3f7d3a", soft: "#eef5ea", headline: "지금은 여유로워요", advice: "둘러보기 좋은 시간이에요." },
  { key: "normal", min: 30, label: "보통", color: "#9a6b0a", soft: "#fbf4e2", headline: "지금은 적당히 붐벼요", advice: "인기 프로그램은 조금 기다릴 수 있어요." },
  { key: "busy", min: 60, label: "혼잡", color: "#b8501c", soft: "#fbeee6", headline: "지금은 붐비는 편이에요", advice: "이동할 때 여유를 두고, 대기 짧은 곳부터 둘러보세요." },
  { key: "packed", min: 80, label: "매우 혼잡", color: "#a82424", soft: "#f9e9e9", headline: "지금은 매우 붐벼요", advice: "잠시 후 방문하거나 한산한 구역을 먼저 이용해 보세요." },
];

export function levelOf(pct) {
  const v = clampPct(pct);
  return [...LEVELS].reverse().find((l) => v >= l.min) || LEVELS[0];
}

export function clampPct(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

export function num(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export const toArray = (v) => (Array.isArray(v) ? v : []);
export const unwrap = (res) => res?.data?.data ?? res?.data ?? null;

/* ── 날짜·시간 ── */
export function toDate(v) {
  if (!v) return null;
  const d = v instanceof Date ? v : new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}
const pad = (n) => String(n).padStart(2, "0");
export const fmtHM = (v) => { const d = toDate(v); return d ? `${pad(d.getHours())}:${pad(d.getMinutes())}` : "--:--"; };
export const fmtMD = (v) => { const d = toDate(v); return d ? `${d.getMonth() + 1}월 ${d.getDate()}일` : ""; };
export const fmtDot = (v) => { const d = toDate(v); return d ? `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}` : ""; };
export const fmtRange = (a, b) => [fmtDot(a), fmtDot(b)].filter(Boolean).join(" ~ ");
export const fmtStamp = (v) => { const d = toDate(v); return d ? `${d.getMonth() + 1}.${d.getDate()} ${pad(d.getHours())}:${pad(d.getMinutes())}` : ""; };
export const dateKey = (v) => { const d = toDate(v); return d ? `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` : ""; };
const minutesOfDay = (d) => d.getHours() * 60 + d.getMinutes();

/* ── 운영 시간 ──
 * 행사 시작·종료 시각의 '시:분'을 하루 운영 시간으로 본다 (예: 09:00 ~ 18:00).
 * 00:00처럼 시각 정보가 없으면 09:00 ~ 18:00으로 가정한다. */
export function operatingWindow(summary) {
  const s = toDate(summary?.startAt);
  const e = toDate(summary?.endAt);
  let open = s ? minutesOfDay(s) : 0;
  let close = e ? minutesOfDay(e) : 0;
  if (!open || !close || close <= open + 60) { open = 9 * 60; close = 18 * 60; }
  const label = (m) => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
  return { open, close, openLabel: label(open), closeLabel: label(close), text: `${label(open)} ~ ${label(close)}` };
}

/* 지금 행사 상태
 * planned: 개막 전 / ended: 종료 / before: 오늘 개장 전 / open: 운영 중 / after: 오늘 마감 후 */
export function livePhase(summary, now = new Date()) {
  const status = String(summary?.status || "").toUpperCase();
  const start = toDate(summary?.startAt);
  const end = toDate(summary?.endAt);
  const win = operatingWindow(summary);
  const startDay = start ? dateKey(start) : "";
  const endDay = end ? dateKey(end) : "";
  const today = dateKey(now);

  if (status === "ENDED" || (endDay && today > endDay)) return { phase: "ended", win };
  if (status === "PLANNED" || (startDay && today < startDay)) {
    const days = start ? Math.max(1, Math.ceil((new Date(startDay) - new Date(today)) / 86400000)) : null;
    return { phase: "planned", win, daysLeft: days };
  }
  const m = minutesOfDay(now);
  if (m < win.open) return { phase: "before", win };
  if (m >= win.close) return { phase: "after", win, isLastDay: today === endDay };
  return { phase: "open", win, minutesLeft: win.close - m };
}

export function phaseText(p) {
  switch (p.phase) {
    case "open": return { chip: "운영 중", line: `${p.win.closeLabel}에 마감해요` };
    case "before": return { chip: "개장 전", line: `오늘 ${p.win.openLabel}에 문을 열어요` };
    case "after": return { chip: "오늘 운영 종료", line: p.isLastDay ? "행사 마지막 날 운영이 끝났어요" : `내일 ${p.win.openLabel}에 다시 열어요` };
    case "planned": return { chip: "개막 전", line: p.daysLeft ? `${p.daysLeft}일 뒤 시작해요` : "곧 시작해요" };
    default: return { chip: "종료", line: "행사가 끝났어요" };
  }
}

/* 측정값이 '지금 값'으로 볼 만큼 최근인지 (기본 90분 이내) */
export function isFresh(ts, now = new Date(), maxMinutes = 90) {
  const d = toDate(ts);
  if (!d) return false;
  const diff = (now - d) / 60000;
  return diff >= -5 && diff <= maxMinutes;
}

/* ── 하루 방문 흐름 (백엔드 대체 예측과 같은 곡선) ──
 * 운영 시간 밖은 거의 0, 개장 직후 한산 → 운영 시간의 55% 지점 최고 → 마감 전 감소, 주말 가중 */
export function dayCurve(date, win) {
  const d = toDate(date) || new Date();
  const m = minutesOfDay(d);
  if (m < win.open || m >= win.close) return 0.04;
  const p = (m - win.open) / (win.close - win.open);
  const curve = 0.35 + 0.95 * Math.exp(-((p - 0.55) ** 2) / (2 * 0.2 * 0.2));
  const dow = d.getDay();
  const weekday = dow === 0 || dow === 6 ? 1.15 : dow === 5 ? 1.0 : 0.85;
  return curve * weekday;
}

/* 행사마다 고정된 방문 규모 차이 (0.65~1.19배) — 모든 행사가 같은 숫자로 보이지 않게 */
export function eventScale(eventId) {
  const id = Math.abs(Number(eventId) || 0);
  return 0.65 + ((id * 37) % 55) / 100;
}

/* 예측 데이터가 없을 때 쓰는 행사별 혼잡도 (하루 곡선 × 행사 규모) */
export function busyAt(eventId, date, win) {
  return clampPct(45 * dayCurve(date, win) * eventScale(eventId));
}

/* 주말 피크(=1) 대비 지금 시간대의 붐빔 비율 (운영 시간 밖은 거의 0)
 * 기록된 대기·혼잡을 "피크 때 수준"으로 보고 지금 시간대만큼 줄여 예상할 때 쓴다 */
export function peakShare(date, win) {
  return Math.min(1, dayCurve(date, win) / (1.3 * 1.15));
}

/* 기록값을 지금 시간대 기준으로 예상 (상한 cap) */
export function estimateNow(recorded, now, win, cap = 100) {
  return Math.min(cap, Math.round(num(recorded) * peakShare(now, win)));
}

/* 예측 타임라인에서 오늘 시간대별 평균 (운영 시간만) */
export function hourlyFromTimeline(timeline, day, win) {
  const buckets = new Map();
  toArray(timeline).forEach((pt) => {
    const d = toDate(pt?.time);
    if (!d || dateKey(d) !== day) return;
    const h = d.getHours();
    const b = buckets.get(h) || { sum: 0, n: 0 };
    b.sum += num(pt?.score); b.n += 1;
    buckets.set(h, b);
  });
  const rows = [];
  for (let h = Math.floor(win.open / 60); h < Math.ceil(win.close / 60); h += 1) {
    const b = buckets.get(h);
    rows.push({ hour: h, value: b ? clampPct(b.sum / b.n) : null });
  }
  return rows;
}

/* 타임라인에서 지금 시각과 가장 가까운 값 (10분 이내) */
export function scoreNear(timeline, now = new Date()) {
  let best = null;
  toArray(timeline).forEach((pt) => {
    const d = toDate(pt?.time);
    if (!d) return;
    const diff = Math.abs(d - now);
    if (diff <= 10 * 60000 && (!best || diff < best.diff)) best = { diff, score: num(pt?.score) };
  });
  return best ? clampPct(best.score) : null;
}

/* 9 → "오전 9시", 12 → "낮 12시", 17 → "오후 5시" */
export function hourLabel(h) {
  if (h < 12) return `오전 ${h}시`;
  if (h === 12) return "낮 12시";
  return `오후 ${h - 12}시`;
}

/* 혼잡도 → 예상 대기(분) */
export function waitFromPct(pct) {
  const v = clampPct(pct);
  if (v < 25) return 0;
  return Math.round((v - 25) * 0.6);
}

/* 대기 한 줄: 최근 값이면 그대로(live), 운영 중인데 오래된 기록뿐이면 시간대 흐름으로 예상(estimate),
 * 운영 시간 밖이면 마지막 기록(record) */
export function waitRow(r, type, phase, now = new Date()) {
  const at = r.updatedAt;
  const isOpen = phase.phase === "open";
  const recordedMin = num(r.waitMin);
  const recordedTeams = num(r.waitCount);
  const fresh = isOpen && isFresh(at, now);
  let mode = "record";
  let waitMin = recordedMin;
  let teams = recordedTeams;
  if (fresh) mode = "live";
  else if (isOpen) {
    // 기록값을 피크 수준으로 보고 지금 시간대 비율만큼 예상 (대기 90분·60팀 상한)
    waitMin = estimateNow(recordedMin, now, phase.win, 90);
    teams = estimateNow(recordedTeams, now, phase.win, 60);
    mode = "estimate";
  }
  return {
    key: `${type}-${r.id ?? r.boothId ?? r.programId}`,
    type,
    id: type === "program" ? r.programId : r.boothId,
    name: type === "program" ? (r.programTitle || `프로그램 ${r.programId}`) : (r.boothTitle || r.placeName || `부스 ${r.boothId}`),
    sub: type === "program" ? (r.timeText || `${fmtHM(r.startAt)} ~ ${fmtHM(r.endAt)}`) : (r.zoneLabel || ""),
    waitMin, teams, mode, at,
  };
}

/* 콘테스트 투표 단계 (시간 우선, 없으면 서버 상태 문자열) */
export function contestStage(c, now = new Date()) {
  const s = toDate(c.startAt); const e = toDate(c.endAt);
  if (s && e) {
    if (now < s) return { key: "upcoming", label: "투표 예정", line: `${fmtMD(s)} ${fmtHM(s)}에 투표가 열려요` };
    if (now > e) return { key: "ended", label: "투표 종료", line: `${fmtMD(e)} ${fmtHM(e)}에 마감됐어요` };
    return { key: "live", label: "투표 진행 중", line: `${fmtHM(e)}에 마감해요` };
  }
  const st = String(c.status || "");
  if (st.includes("종료")) return { key: "ended", label: "투표 종료", line: "" };
  if (st.includes("진행")) return { key: "live", label: "투표 진행 중", line: "" };
  return { key: "upcoming", label: "투표 예정", line: "" };
}

/* ── 15초 자동 갱신 ──
 * 개발 모드(StrictMode)의 이중 실행에도 로딩이 멈추지 않도록 요청 번호로 최신 응답만 반영한다. */
export function usePolling(fetcher, deps, intervalMs = 15000) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadedAt, setLoadedAt] = useState(null);
  const reqRef = useRef(0);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const load = useCallback(async ({ silent = false } = {}) => {
    const id = ++reqRef.current;
    if (!silent) setLoading(true); else setRefreshing(true);
    try {
      const next = await fetcherRef.current();
      if (id !== reqRef.current) return;
      setData(next);
      setError("");
      setLoadedAt(new Date());
    } catch (e) {
      if (id !== reqRef.current) return;
      setError(e?.response?.data?.error?.message || e?.message || "불러오지 못했어요");
    } finally {
      if (id === reqRef.current) { setLoading(false); setRefreshing(false); }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    load();
    const t = setInterval(() => {
      if (document.visibilityState !== "hidden") load({ silent: true });
    }, intervalMs);
    return () => { clearInterval(t); reqRef.current += 1; };
  }, [load, intervalMs]);

  return { data, error, loading, refreshing, loadedAt, refresh: () => load({ silent: true }) };
}
