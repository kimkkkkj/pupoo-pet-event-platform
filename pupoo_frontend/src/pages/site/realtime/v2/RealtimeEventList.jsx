import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown, ChevronRight, Search } from "lucide-react";
import PageLoading from "../../components/PageLoading";
import { adminRealtimeApi } from "../../../../app/http/adminRealtimeApi";
import { eventApi } from "../../../../app/http/eventApi";
import { toPublicAssetUrl } from "../../../../shared/utils/publicAssetUrl";
import { REALTIME_TABS, RealtimeHeader, rkStyles } from "./RealtimeLayout";
import {
  LEVELS, busyAt, fmtMD, fmtRange, hourLabel, levelOf, livePhase, operatingWindow, phaseText,
  toArray, unwrap, usePolling,
} from "./realtimeKit";

const listStyles = `
  .rl-summary { display: flex; justify-content: space-between; align-items: center; gap: 20px; flex-wrap: wrap; margin: 28px 0 30px; padding: 24px 28px; background: #fff; border: 1px solid var(--line); border-radius: 18px; }
  .rl-summary-eyebrow { margin: 0 0 6px; font-size: 14px; font-weight: 700; color: var(--mute); }
  .rl-summary-title { margin: 0; font-size: 26px; font-weight: 800; letter-spacing: -0.03em; line-height: 1.35; word-break: keep-all; }
  .rl-summary-title b { color: var(--accent); }
  .rl-search { position: relative; width: 300px; max-width: 100%; }
  .rl-search svg { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: var(--mute); }
  .rl-search input { width: 100%; height: 48px; padding: 0 14px 0 42px; border-radius: 12px; border: 1px solid var(--line); background: #fafaf8; font-family: inherit; font-size: 15px; color: var(--ink); outline: none; }
  .rl-search input:focus { border-color: var(--ink); background: #fff; }

  .rl-group { margin-top: 34px; }
  .rl-group-head { display: flex; align-items: baseline; gap: 10px; margin: 0 0 14px; }
  .rl-group-title { margin: 0; font-size: 21px; font-weight: 800; letter-spacing: -0.02em; }
  .rl-group-count { font-size: 16px; font-weight: 700; color: var(--mute); }
  .rl-group-note { margin-left: auto; font-size: 14px; color: var(--sub); }

  /* 큰 카드 (진행 중) */
  .rl-feature-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
  .rl-feature { display: grid; grid-template-columns: 168px minmax(0, 1fr); background: #fff; border: 1px solid var(--line); border-radius: 18px; overflow: hidden; cursor: pointer; transition: border-color .15s, box-shadow .15s, transform .15s; }
  .rl-feature:hover { border-color: #c9c5bd; box-shadow: 0 12px 28px rgba(28, 25, 23, .07); transform: translateY(-2px); }
  .rl-poster { position: relative; background: var(--soft); overflow: hidden; min-height: 224px; }
  .rl-poster img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
  .rl-feature-body { display: flex; flex-direction: column; padding: 22px 24px; min-width: 0; }
  .rl-status { display: inline-flex; align-items: center; gap: 7px; font-size: 14px; font-weight: 800; color: var(--sub); }
  .rl-status i { width: 8px; height: 8px; border-radius: 50%; background: var(--mute); }
  .rl-status.open { color: #3f7d3a; }
  .rl-status.open i { background: #3f7d3a; box-shadow: 0 0 0 4px rgba(63, 125, 58, .14); animation: rk-pulse 1.8s ease-in-out infinite; }
  .rl-status span { font-weight: 600; color: var(--mute); }
  .rl-name { margin: 8px 0 4px; font-size: 21px; font-weight: 800; letter-spacing: -0.02em; word-break: keep-all; }
  .rl-meta { font-size: 14px; color: var(--sub); }
  .rl-headline { margin: 16px 0 10px; font-size: 22px; font-weight: 800; letter-spacing: -0.03em; line-height: 1.35; word-break: keep-all; }
  .rl-meter { display: flex; gap: 3px; width: 150px; }
  .rl-meter span { flex: 1; height: 7px; border-radius: 2px; background: var(--soft); }
  .rl-detail { margin-top: 8px; font-size: 14.5px; color: var(--sub); }
  .rl-detail b { color: var(--ink); }
  .rl-go { margin-top: auto; padding-top: 16px; display: inline-flex; align-items: center; gap: 4px; font-size: 15px; font-weight: 800; color: var(--ink); }

  /* 작은 카드 (개막 예정·지난 행사) */
  .rl-mini-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 12px; }
  .rl-mini { display: grid; grid-template-columns: 64px minmax(0, 1fr) auto; gap: 16px; align-items: center; padding: 14px 18px 14px 14px; background: #fff; border: 1px solid var(--line); border-radius: 14px; cursor: pointer; transition: border-color .15s; }
  .rl-mini:hover { border-color: #c9c5bd; }
  .rl-mini .rl-poster { min-height: 0; width: 64px; height: 84px; border-radius: 8px; }
  .rl-mini-name { font-size: 17px; font-weight: 800; word-break: keep-all; }
  .rl-mini-sub { margin-top: 4px; font-size: 14px; color: var(--sub); }
  .rl-mini.past { opacity: .75; }
  .rl-mini.past .rl-poster img { filter: grayscale(1); }
  .rl-toggle { display: inline-flex; align-items: center; gap: 6px; height: 44px; padding: 0 16px; border-radius: 12px; border: 1px solid var(--line); background: #fff; font-family: inherit; font-size: 15px; font-weight: 700; color: var(--ink); cursor: pointer; }
  .rl-toggle:hover { border-color: var(--ink); }

  @media (max-width: 1000px) { .rl-feature-grid { grid-template-columns: 1fr; } }
  @media (max-width: 560px) {
    .rl-summary { padding: 20px 18px; }
    .rl-summary-title { font-size: 21px; }
    .rl-feature { grid-template-columns: 112px minmax(0, 1fr); }
    .rl-poster { min-height: 180px; }
    .rl-feature-body { padding: 16px; }
    .rl-name { font-size: 18px; }
    .rl-headline { font-size: 18px; }
    .rl-mini-grid { grid-template-columns: 1fr; }
    .rl-group-note { display: none; }
  }
`;

const LIVE_PHASES = ["open", "before", "after"];

// 남은 운영 시간 중 가장 한산한 시각
function bestHourLeft(e, now) {
  const from = e.phase.phase === "open" ? now.getHours() + 1 : Math.floor(e.win.open / 60);
  let best = null;
  for (let h = from; h < Math.ceil(e.win.close / 60); h += 1) {
    const d = new Date(now); d.setHours(h, 30, 0, 0);
    const v = busyAt(e.eventId, d, e.win);
    if (!best || v < best.v) best = { h, v };
  }
  return best;
}
function peakHour(e, now) {
  let peak = null;
  for (let h = Math.floor(e.win.open / 60); h < Math.ceil(e.win.close / 60); h += 1) {
    const d = new Date(now); d.setHours(h, 30, 0, 0);
    const v = busyAt(e.eventId, d, e.win);
    if (!peak || v > peak.v) peak = { h, v };
  }
  return peak;
}

// 카드에서 강조할 한 문장과 보조 정보 (통합 현황 전용 목록)
function highlight(e, now) {
  const p = e.phase.phase;
  if (p !== "open") {
    return {
      before: { headline: `오늘 ${e.win.openLabel}에 문을 열어요`, detail: <>보통 <b>{hourLabel(peakHour(e, now)?.h ?? 14)}</b>쯤 가장 붐벼요</> },
      after: { headline: "오늘 운영이 끝났어요", detail: e.phase.isLastDay ? "행사 마지막 날 운영이 끝났어요" : <>내일 <b>{e.win.openLabel}</b>에 다시 열어요</> },
      planned: { headline: `${e.phase.daysLeft ?? ""}일 뒤 개막해요`, detail: `${fmtMD(e.startAt)} 시작 · 운영 ${e.win.text}` },
      ended: { headline: "종료된 행사예요", detail: fmtRange(e.startAt, e.endAt) },
    }[p];
  }
  const pct = busyAt(e.eventId, now, e.win);
  const lv = levelOf(pct);
  const best = bestHourLeft(e, now);
  return {
    headline: lv.headline,
    level: lv,
    detail: <>{lv.label} <b>{pct}%</b>{best ? <> · 추천 <b>{hourLabel(best.h)}</b></> : null}</>,
  };
}

// 통합 현황 첫 화면: 포스터가 들어간 행사 카드 (대기·체크인·투표는 RealtimeLandings)
export default function RealtimeEventList() {
  const tab = "dashboard";
  const navigate = useNavigate();
  const current = REALTIME_TABS.find((t) => t.key === tab) || REALTIME_TABS[0];
  const [keyword, setKeyword] = useState("");
  const [showPast, setShowPast] = useState(false);

  const { data, loading, error } = usePolling(async () => {
    const [rt, ev] = await Promise.allSettled([
      adminRealtimeApi.getEventsSnapshot(),
      eventApi.getEvents({ page: 0, size: 100 }),
    ]);
    if (rt.status !== "fulfilled") throw rt.reason;
    const posters = {};
    if (ev.status === "fulfilled") {
      toArray(ev.value?.data?.data?.content).forEach((row) => { if (row?.imageUrl) posters[row.eventId] = toPublicAssetUrl(row.imageUrl); });
    }
    return { rows: toArray(unwrap(rt.value)?.events), posters };
  }, []);

  const now = new Date();
  const events = useMemo(() => toArray(data?.rows)
    .map((row) => {
      const summary = { eventId: row.eventId, eventName: row.eventName, status: row.rawStatus ?? row.status, startAt: row.startAt, endAt: row.endAt, location: row.location };
      const phase = livePhase(summary);
      return { ...summary, raw: row, phase, text: phaseText(phase), win: operatingWindow(summary), poster: data?.posters?.[row.eventId] || "" };
    })
    .filter((e) => String(e.status).toUpperCase() !== "CANCELLED")
    .sort((a, b) => String(a.startAt).localeCompare(String(b.startAt))), [data]);

  const kw = keyword.trim();
  const match = (e) => !kw || e.eventName?.includes(kw) || e.location?.includes(kw);
  const live = events.filter((e) => LIVE_PHASES.includes(e.phase.phase) && match(e));
  const planned = events.filter((e) => e.phase.phase === "planned" && match(e));
  const past = events.filter((e) => e.phase.phase === "ended" && match(e)).reverse();

  // 맨 위 한 줄 요약
  const summaryLine = (() => {
    const openNow = live.filter((e) => e.phase.phase === "open");
    if (openNow.length) {
      const calmest = [...openNow].sort((a, b) => busyAt(a.eventId, now, a.win) - busyAt(b.eventId, now, b.win))[0];
      return { eyebrow: `지금 문 연 행사 ${openNow.length}곳`, title: <>지금 가장 여유로운 곳은 <b>{calmest.eventName}</b>이에요</> };
    }
    if (live.length) {
      const first = live[0];
      return { eyebrow: "지금은 운영 시간이 아니에요", title: first.phase.phase === "before" ? <>오늘 <b>{first.win.openLabel}</b>에 {live.length}개 행사가 문을 열어요</> : <>오늘 운영이 모두 끝났어요. 내일 <b>{first.win.openLabel}</b>에 다시 열어요</> };
    }
    if (planned.length) return { eyebrow: "진행 중인 행사가 없어요", title: <>다음 행사는 <b>{planned[0].eventName}</b>, {fmtMD(planned[0].startAt)}에 시작해요</> };
    return { eyebrow: current.label, title: "표시할 행사가 없어요" };
  })();

  const liveTitle = live.some((e) => e.phase.phase === "open") ? "지금 운영 중" : "오늘 진행하는 행사";

  const miniCard = (e, isPast = false) => {
    const h = highlight(e, now);
    return (
      <article key={e.eventId} className={`rl-mini${isPast ? " past" : ""}`} onClick={() => navigate(`${current.path}/${e.eventId}`)}>
        <div className="rl-poster">{e.poster ? <img src={e.poster} alt="" loading="lazy" /> : null}</div>
        <div style={{ minWidth: 0 }}>
          <div className="rl-mini-name">{e.eventName}</div>
          <div className="rl-mini-sub">{h.headline}</div>
          <div className="rl-mini-sub" style={{ color: "var(--mute)" }}>{[fmtRange(e.startAt, e.endAt), e.location].filter(Boolean).join(" · ")}</div>
        </div>
        <ChevronRight size={20} color="#a8a29e" />
      </article>
    );
  };

  return (
    <div className="rk">
      <style>{rkStyles}</style>
      <style>{listStyles}</style>
      <RealtimeHeader tab={tab} />
      <div className="rk-wrap">
        {loading && !data ? (
          <PageLoading message="행사 목록을 불러오는 중이에요" />
        ) : error && !data ? (
          <div className="rk-error" style={{ marginTop: 28 }}>행사 목록을 불러오지 못했어요. 잠시 후 자동으로 다시 시도해요.</div>
        ) : (
          <>
            <section className="rl-summary">
              <div>
                <p className="rl-summary-eyebrow">{summaryLine.eyebrow}</p>
                <h2 className="rl-summary-title">{summaryLine.title}</h2>
              </div>
              <label className="rl-search">
                <Search size={17} />
                <input value={keyword} onChange={(ev) => setKeyword(ev.target.value)} placeholder="행사명이나 장소로 찾기" />
              </label>
            </section>

            {live.length ? (
              <section className="rl-group">
                <div className="rl-group-head">
                  <h3 className="rl-group-title">{liveTitle}</h3>
                  <span className="rl-group-count">{live.length}</span>
                  <span className="rl-group-note">카드를 누르면 {current.label}으로 이동해요</span>
                </div>
                <div className="rl-feature-grid">
                  {live.map((e) => {
                    const h = highlight(e, now);
                    const idx = h.level ? LEVELS.findIndex((l) => l.key === h.level.key) : -1;
                    return (
                      <article key={e.eventId} className="rl-feature" onClick={() => navigate(`${current.path}/${e.eventId}`)}>
                        <div className="rl-poster">{e.poster ? <img src={e.poster} alt={`${e.eventName} 포스터`} loading="lazy" /> : null}</div>
                        <div className="rl-feature-body">
                          <span className={`rl-status ${e.phase.phase}`}><i />{e.text.chip}{e.phase.phase === "open" ? <span>· {e.text.line}</span> : null}</span>
                          <h4 className="rl-name">{e.eventName}</h4>
                          <div className="rl-meta">{[e.location, `운영 ${e.win.text}`].filter(Boolean).join(" · ")}</div>
                          <p className="rl-headline" style={h.level ? { color: h.level.color } : undefined}>{h.headline}</p>
                          {h.level ? (
                            <div className="rl-meter">{LEVELS.map((l, i) => <span key={l.key} style={i <= idx ? { background: h.level.color } : undefined} />)}</div>
                          ) : null}
                          <div className="rl-detail">{h.detail}</div>
                          <span className="rl-go">{current.label} 보기<ChevronRight size={17} /></span>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            ) : null}

            {planned.length ? (
              <section className="rl-group">
                <div className="rl-group-head">
                  <h3 className="rl-group-title">개막 예정</h3>
                  <span className="rl-group-count">{planned.length}</span>
                </div>
                <div className="rl-mini-grid">{planned.map((e) => miniCard(e))}</div>
              </section>
            ) : null}

            {past.length ? (
              <section className="rl-group">
                <div className="rl-group-head">
                  <h3 className="rl-group-title">지난 행사</h3>
                  <span className="rl-group-count">{past.length}</span>
                </div>
                {showPast ? (
                  <div className="rl-mini-grid">{past.map((e) => miniCard(e, true))}</div>
                ) : (
                  <button type="button" className="rl-toggle" onClick={() => setShowPast(true)}>지난 행사 {past.length}곳 보기<ChevronDown size={17} /></button>
                )}
              </section>
            ) : null}

            {!live.length && !planned.length && !past.length ? (
              <div className="rk-panel rk-empty" style={{ marginTop: 20 }}><strong>조건에 맞는 행사가 없어요</strong>다른 이름으로 찾아보세요.</div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
