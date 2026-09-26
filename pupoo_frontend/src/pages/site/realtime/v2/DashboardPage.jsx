import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { adminRealtimeApi } from "../../../../app/http/adminRealtimeApi";
import RealtimeLayout, { LevelMeter } from "./RealtimeLayout";
import RealtimeEventList from "./RealtimeEventList";
import {
  LEVELS, busyAt, clampPct, dateKey, dayCurve, estimateNow, fmtHM, fmtMD, fmtStamp, hourLabel, hourlyFromTimeline, isFresh, levelOf,
  livePhase, num, scoreNear, toArray, toDate, unwrap, usePolling, waitFromPct,
} from "./realtimeKit";

export default function DashboardPage() {
  const { eventId } = useParams();
  if (!eventId) return <RealtimeEventList />;
  return <DashboardView eventId={eventId} />;
}

function DashboardView({ eventId }) {
  const navigate = useNavigate();
  const [sort, setSort] = useState("short");
  const { data, loading, error, loadedAt, refreshing, refresh } = usePolling(
    async () => unwrap(await adminRealtimeApi.getDashboardSnapshot(eventId)),
    [eventId],
  );

  const view = useMemo(() => {
    if (!data) return null;
    const summary = data.eventSummary || {};
    const now = new Date();
    const phase = livePhase(summary, now);
    const win = phase.win;
    // 실제 AI 예측일 때만 타임라인을 쓰고, 대체 예측이면 하루 곡선(백엔드 대체 예측과 같은 공식)을 쓴다
    const prediction = data.congestionSummary?.prediction;
    const timeline = prediction && prediction.fallbackUsed === false ? prediction.timeline : [];
    const today = dateKey(now);
    const isOpen = phase.phase === "open";

    // 지금 혼잡도: 운영 중일 때만. 최근(90분 내) 측정값 → 예측 타임라인 → 하루 곡선 순
    const booths = toArray(data.boothCongestionSummaries);
    const freshBooths = booths.filter((b) => isFresh(b.measuredAt || b.updatedAt, now));
    let current = null;
    let source = "";
    if (isOpen) {
      if (freshBooths.length) {
        current = clampPct(freshBooths.reduce((s, b) => s + num(b.congestionPercent), 0) / freshBooths.length);
        source = "현장 측정";
      } else {
        current = scoreNear(timeline, now) ?? busyAt(summary.eventId, now, win);
        source = "AI 예측";
      }
    }

    // 오늘 시간대 흐름 (운영 시간만). 오늘이 행사 기간이 아니면 하루 곡선으로 '평소 흐름'을 보여준다
    const inPeriod = ["open", "before", "after"].includes(phase.phase);
    let hours = inPeriod ? hourlyFromTimeline(timeline, today, win) : [];
    if (!hours.length || hours.every((h) => h.value === null)) {
      const base = new Date(now);
      hours = [];
      for (let h = Math.floor(win.open / 60); h < Math.ceil(win.close / 60); h += 1) {
        base.setHours(h, 30, 0, 0);
        hours.push({ hour: h, value: busyAt(summary.eventId, base, win) });
      }
    }
    const nowHour = now.getHours();
    hours = hours.map((h) => ({
      ...h,
      value: h.value ?? 0,
      isNow: isOpen && h.hour === nowHour,
      isFuture: inPeriod && (phase.phase === "before" || (isOpen && h.hour > nowHour)),
    }));
    const pickFrom = isOpen ? hours.filter((h) => h.hour > nowHour) : hours;
    const best = pickFrom.length ? [...pickFrom].sort((a, b) => a.value - b.value || a.hour - b.hour)[0] : null;
    const peak = hours.length ? [...hours].sort((a, b) => b.value - a.value)[0] : null;

    // 프로그램: 운영 중이면 대기 정보, 아니면 시간표
    const programs = toArray(data.programCongestionSummaries).map((p) => {
      const waitMin = num(p.experienceWait?.waitMin ?? p.waitMin);
      const fresh = isOpen && isFresh(p.experienceWait?.updatedAt, now);
      // 오늘 시작 전 / 진행 중 / 오늘 끝남 / 다른 날짜
      const s = toDate(p.startAt); const e = toDate(p.endAt);
      const timing = !s || !e ? "unknown"
        : dateKey(s) !== today ? "otherDay"
        : now < s ? "upcoming"
        : now > e ? "done"
        : "running";
      const running = timing === "running";
      return {
        id: p.programId,
        name: p.programTitle || `프로그램 ${p.programId}`,
        place: p.boothName || "",
        time: `${fmtHM(p.startAt)} ~ ${fmtHM(p.endAt)}`,
        startAt: p.startAt,
        running,
        timing,
        waitMin: fresh || (isOpen && running) ? (fresh ? waitMin : waitFromPct(current ?? 0)) : null,
        pct: clampPct(p.currentCongestionPercent),
      };
    });

    // 구역: 최근 측정값이 있으면 그대로, 운영 중인데 오래된 기록뿐이면 시간대 흐름을 반영한 예상값
    const zones = booths.map((b) => {
      const at = b.measuredAt || b.updatedAt;
      const pct = clampPct(b.congestionPercent);
      const fresh = isOpen && isFresh(at, now);
      const estimated = isOpen && !fresh
        ? estimateNow(pct, now, win, 95)
        : null;
      return { name: b.placeName || `부스 ${b.boothId}`, pct, at, fresh, estimated };
    });

    return {
      summary, phase, isOpen, current, source, hours, best, peak, programs, zones,
      wait: isOpen ? waitFromPct(current) : null,
      inside: num(data.dashboardSummaryCards?.currentInsideCount),
      approved: num(data.dashboardSummaryCards?.approvedApplicants ?? data.performance?.approvedRegistrationCount),
    };
  }, [data]);

  const programs = useMemo(() => {
    if (!view) return [];
    const list = [...view.programs];
    if (view.isOpen) {
      list.sort((a, b) => sort === "popular" ? b.pct - a.pct : (a.waitMin ?? 999) - (b.waitMin ?? 999));
    } else {
      list.sort((a, b) => String(a.startAt).localeCompare(String(b.startAt)));
    }
    return list;
  }, [view, sort]);

  const level = view?.current != null ? levelOf(view.current) : null;
  const verdict = (() => {
    if (!view) return null;
    const { phase, peak, best } = view;
    if (phase.phase === "open") return { label: level.label, color: level.color, title: level.headline, sub: level.advice };
    if (phase.phase === "before") return { label: "개장 전", color: "#78716c", title: "아직 문을 열기 전이에요", sub: `오늘 ${phase.win.openLabel}에 열어요. 개장 직후와 마감 전이 한산하고${peak ? `, ${hourLabel(peak.hour)} 전후가 가장 붐빌 예정이에요.` : "요."}` };
    if (phase.phase === "after") return { label: "운영 종료", color: "#78716c", title: "오늘 운영이 끝났어요", sub: phase.isLastDay ? "행사 마지막 날 운영이 모두 끝났어요." : `내일 ${phase.win.openLabel}에 다시 열어요.${peak ? ` 보통 ${hourLabel(peak.hour)}쯤 가장 붐벼요.` : ""}` };
    if (phase.phase === "planned") return { label: "개막 전", color: "#78716c", title: `${phase.daysLeft ?? ""}일 뒤 개막해요`, sub: `운영 시간은 ${phase.win.text}예요.${peak ? ` 보통 ${hourLabel(peak.hour)}쯤 가장 붐벼요.` : ""}` };
    return { label: "종료", color: "#78716c", title: "종료된 행사예요", sub: "행사 기간의 기록을 아래에서 볼 수 있어요." };
  })();

  return (
    <RealtimeLayout tab="dashboard" eventId={eventId} summary={view?.summary} loading={loading} loadedAt={loadedAt} refreshing={refreshing} onRefresh={refresh}>
      {error && !data ? <div className="rk-error">실시간 정보를 불러오지 못했어요. 15초 뒤 자동으로 다시 시도해요.</div> : null}
      {view ? (
        <div className="rk-stack">
          {/* 결론 */}
          <section className="rk-panel">
            <div className="rk-verdict">
              <div>
                <span className="rk-verdict-label" style={{ color: verdict.color }}><i style={{ background: verdict.color }} />{verdict.label}</span>
                <h2 className="rk-verdict-title">{verdict.title}</h2>
                <p className="rk-verdict-sub">{verdict.sub}</p>
              </div>
              {level ? <LevelMeter level={level} levels={LEVELS} /> : null}
            </div>
            <div className="rk-stats">
              <div className="rk-stat">
                <div className="rk-stat-label">혼잡도</div>
                <div className={`rk-stat-value${view.current == null ? " dim" : ""}`}>{view.current ?? "–"}{view.current != null ? <small>%</small> : null}</div>
                <div className="rk-stat-hint">{view.current != null ? `${view.source} 기준` : "운영 시간에 표시돼요"}</div>
              </div>
              <div className="rk-stat">
                <div className="rk-stat-label">예상 대기</div>
                <div className={`rk-stat-value${view.wait == null ? " dim" : ""}`}>{view.wait ?? "–"}{view.wait != null ? <small>분</small> : null}</div>
                <div className="rk-stat-hint">{view.wait == null ? "운영 시간에 표시돼요" : view.wait === 0 ? "바로 참여할 수 있어요" : "체험 프로그램 평균 예상"}</div>
              </div>
              <div className="rk-stat">
                <div className="rk-stat-label">참가 확정</div>
                <div className="rk-stat-value">{view.approved.toLocaleString()}<small>명</small></div>
                <div className="rk-stat-hint">결제까지 마친 참가자 · 입장 인원은 체크인 현황에서</div>
              </div>
            </div>
          </section>

          {/* 시간대 흐름 */}
          <section className="rk-panel">
            <div className="rk-sec-head">
              <div>
                <p className="rk-sec-eyebrow">{view.phase.phase === "open" || view.phase.phase === "before" ? "오늘 흐름" : "하루 흐름"}</p>
                <h3 className="rk-sec-title">
                  {view.phase.phase === "open" ? "언제가 덜 붐빌까요?" : view.phase.phase === "ended" ? "시간대별로 이렇게 붐볐어요" : "시간대별 예상 붐빔"}
                </h3>
                <p className="rk-sec-note">
                  {view.best && view.phase.phase === "open"
                    ? <>남은 시간 중에는 <b>{hourLabel(view.best.hour)}</b>가 가장 여유로울 것 같아요.</>
                    : view.peak ? <>보통 <b>{hourLabel(view.peak.hour)}</b> 전후가 가장 붐비고, 개장 직후와 마감 전은 한산해요.</> : null}
                </p>
              </div>
            </div>
            <div className="rk-bars" role="img" aria-label="시간대별 혼잡도">
              {view.hours.map((h) => {
                const isBest = view.phase.phase === "open" && view.best?.hour === h.hour;
                return (
                  <div key={h.hour} className={`rk-bar${h.isNow ? " now" : ""}${isBest ? " best" : ""}${h.isFuture && !h.isNow && !isBest ? " future" : ""}`}>
                    <span className="rk-bar-val">{h.value || ""}</span>
                    <div className="rk-bar-track"><div className="rk-bar-fill" style={{ height: `${Math.max(h.value, 3)}%` }} /></div>
                    <span className="rk-bar-hour">{h.isNow ? "지금" : `${h.hour}시`}</span>
                  </div>
                );
              })}
            </div>
            <div className="rk-legend">
              {view.isOpen ? <span><i style={{ background: "var(--ink)" }} />지금</span> : null}
              {view.isOpen ? <span><i style={{ background: "var(--accent)" }} />추천 시간</span> : null}
              <span><i style={{ background: "#d6d3d1" }} />{view.phase.phase === "ended" ? "기록" : "지난 시간"}</span>
              {view.phase.phase !== "ended" ? <span><i style={{ background: "repeating-linear-gradient(135deg,#e7e5e0 0 4px,#f1f0ec 4px 8px)" }} />예상</span> : null}
            </div>
          </section>

          {/* 프로그램 */}
          {programs.length ? (
            <section className="rk-panel">
              <div className="rk-sec-head">
                <div>
                  <p className="rk-sec-eyebrow">프로그램</p>
                  <h3 className="rk-sec-title">{view.isOpen && programs.some((p) => p.running) ? "지금 참여할 수 있는 프로그램" : "프로그램 일정"}</h3>
                  <p className="rk-sec-note">{view.isOpen && programs.some((p) => p.running) ? "누르면 프로그램 상세로 이동해요." : "진행 중인 프로그램에는 대기 시간이 함께 표시돼요."}</p>
                </div>
                {view.isOpen && programs.filter((p) => p.running).length > 1 ? (
                  <div className="rk-seg">
                    <button type="button" className={sort === "short" ? "on" : ""} onClick={() => setSort("short")}>대기 짧은 순</button>
                    <button type="button" className={sort === "popular" ? "on" : ""} onClick={() => setSort("popular")}>인기순</button>
                  </div>
                ) : null}
              </div>
              <ul className="rk-list">
                {programs.map((p) => (
                  <li key={p.id} className="rk-row link" onClick={() => navigate(`/program/detail?programId=${p.id}`)}>
                    <div>
                      <div className="rk-row-name">{p.name}</div>
                      <div className="rk-row-sub">{[p.time, p.place].filter(Boolean).join(" · ")}{p.running && view.isOpen ? " · 진행 중" : ""}</div>
                    </div>
                    <div className="rk-row-end">
                      {p.waitMin != null ? (
                        <span className="rk-row-big">{p.waitMin === 0 ? "대기 없음" : <>{p.waitMin}<small>분 대기</small></>}</span>
                      ) : (
                        <span className="rk-row-big dim" style={{ fontSize: 15 }}>
                          {p.timing === "done" ? "오늘 운영 끝" : p.timing === "otherDay" ? `${fmtMD(p.startAt)} ${fmtHM(p.startAt)}` : `${fmtHM(p.startAt)} 시작`}
                        </span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {/* 구역 */}
          {view.zones.length ? (
            <section className="rk-panel">
              <div className="rk-sec-head">
                <div>
                  <p className="rk-sec-eyebrow">구역</p>
                  <h3 className="rk-sec-title">구역별 붐빔</h3>
                  <p className="rk-sec-note">
                    {!view.isOpen ? "운영 시간이 아니라 마지막으로 측정된 기록을 보여드려요."
                      : view.zones.some((z) => z.estimated != null) ? "최근 측정값이 없는 곳은 마지막 기록에 시간대 흐름을 반영해 예상했어요."
                      : "현장에서 측정한 붐빔이에요."}
                  </p>
                </div>
              </div>
              <ul className="rk-list">
                {view.zones.map((z) => {
                  const lv = levelOf(z.pct);
                  return (
                    <li key={z.name} className="rk-row">
                      <div>
                        <div className="rk-row-name">{z.name}</div>
                        <div className="rk-row-sub">{z.fresh ? `${fmtHM(z.at)} 측정` : z.estimated != null ? "지금 시간대 예상" : `마지막 기록 ${fmtStamp(z.at)}`}</div>
                      </div>
                      <div className="rk-row-end">
                        {z.estimated != null ? (
                          <span className="rk-state" style={{ color: levelOf(z.estimated).color }}><i style={{ background: levelOf(z.estimated).color }} />{levelOf(z.estimated).label} {z.estimated}% <span style={{ color: "var(--mute)", fontWeight: 600 }}>예상</span></span>
                        ) : z.fresh ? (
                          <span className="rk-state" style={{ color: lv.color }}><i style={{ background: lv.color }} />{lv.label} {z.pct}%</span>
                        ) : (
                          <span className="rk-state" style={{ color: "var(--mute)" }}><i style={{ background: "var(--mute)" }} />{lv.label} {z.pct}%</span>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          ) : null}
        </div>
      ) : null}
    </RealtimeLayout>
  );
}
