// 대기·체크인·투표 메뉴의 첫 화면 (행사를 고르기 전)
// 통합 현황은 행사 카드로 시작하고, 나머지는 메뉴의 주인공(장소·입장 인원·콘테스트)으로 시작한다.
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, QrCode } from "lucide-react";
import PageLoading from "../../components/PageLoading";
import PetAvatar from "../../../../shared/components/pet/PetAvatar";
import { adminRealtimeApi } from "../../../../app/http/adminRealtimeApi";
import { tokenStore } from "../../../../app/http/tokenStore";
import { RealtimeHeader, rkStyles } from "./RealtimeLayout";
import {
  clampPct, contestStage, fmtHM, fmtMD, livePhase, num, operatingWindow, phaseText,
  toArray, unwrap, usePolling, waitRow,
} from "./realtimeKit";

const landingStyles = `
  .rd-summary { margin: 28px 0 24px; padding: 26px 28px; background: #fff; border: 1px solid var(--line); border-radius: 18px; }
  .rd-eyebrow { margin: 0 0 6px; font-size: 14px; font-weight: 700; color: var(--mute); }
  .rd-title { margin: 0; font-size: 28px; font-weight: 800; letter-spacing: -0.03em; line-height: 1.35; word-break: keep-all; }
  .rd-title b { color: var(--accent); }
  .rd-sub { margin: 8px 0 0; font-size: 15.5px; color: var(--sub); }
  .rd-chips { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 18px; }
  .rd-chip { height: 38px; padding: 0 14px; border-radius: 999px; border: 1px solid var(--line); background: #fff; font-family: inherit; font-size: 14.5px; font-weight: 700; color: var(--sub); cursor: pointer; }
  .rd-chip:hover { border-color: #c9c5bd; color: var(--ink); }
  .rd-chip.on { background: var(--ink); border-color: var(--ink); color: #fff; }
  .rd-cols { display: grid; grid-template-columns: minmax(0, 1.25fr) minmax(0, 1fr); gap: 18px; align-items: start; }

  /* 순위 줄 */
  .rd-rank { display: grid; grid-template-columns: 32px minmax(0, 1fr) 110px auto; gap: 14px; align-items: center; padding: 15px 4px; border-bottom: 1px solid var(--line); cursor: pointer; }
  .rd-rank:hover { background: #fafaf8; }
  .rd-rank-no { font-size: 20px; font-weight: 800; color: var(--mute); text-align: center; font-variant-numeric: tabular-nums; }
  .rd-rank:first-child .rd-rank-no { color: var(--ink); }
  .rd-place { font-size: 17px; font-weight: 700; word-break: keep-all; }
  .rd-event { margin-top: 3px; font-size: 13.5px; color: var(--sub); }
  .rd-bar { height: 8px; border-radius: 4px; background: var(--soft); overflow: hidden; }
  .rd-bar span { display: block; height: 100%; border-radius: 4px; background: var(--ink); }
  .rd-big { font-size: 20px; font-weight: 800; font-variant-numeric: tabular-nums; white-space: nowrap; text-align: right; min-width: 72px; }
  .rd-big small { font-size: 14px; font-weight: 700; color: var(--sub); margin-left: 2px; }
  .rd-big.ok { color: #3f7d3a; font-size: 16px; }
  .rd-big.dim, .rd-rank.dim .rd-bar span { color: var(--mute); background: var(--mute); }
  .rd-rank.dim .rd-big { background: none; }

  /* 입장 막대 */
  .rd-entry { display: grid; grid-template-columns: minmax(0, 220px) minmax(0, 1fr) 120px; gap: 18px; align-items: center; padding: 18px 4px; border-bottom: 1px solid var(--line); cursor: pointer; }
  .rd-entry:hover { background: #fafaf8; }
  .rd-entry.dim { opacity: .6; }
  .rd-entry-bar { height: 14px; border-radius: 7px; background: var(--soft); overflow: hidden; }
  .rd-entry-bar span { display: block; height: 100%; border-radius: 7px; background: var(--accent); }
  .rd-entry-num { text-align: right; }
  .rd-entry-rate { font-size: 22px; font-weight: 800; font-variant-numeric: tabular-nums; }
  .rd-entry-rate small { font-size: 14px; font-weight: 700; color: var(--sub); }
  .rd-entry-sub { font-size: 13.5px; color: var(--sub); }

  /* 콘테스트 */
  .rd-contest-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(420px, 1fr)); gap: 16px; }
  .rd-contest { display: flex; flex-direction: column; padding: 24px 26px; background: #fff; border: 1px solid var(--line); border-radius: 18px; }
  .rd-contest.live { border-color: #1c1917; box-shadow: 0 10px 26px rgba(28, 25, 23, .07); }
  .rd-contest-stage { display: inline-flex; align-items: center; gap: 7px; font-size: 14px; font-weight: 800; color: var(--sub); }
  .rd-contest-stage i { width: 8px; height: 8px; border-radius: 50%; background: var(--mute); }
  .rd-contest.live .rd-contest-stage { color: #b8501c; }
  .rd-contest.live .rd-contest-stage i { background: #dc2626; animation: rk-pulse 1.4s ease-in-out infinite; }
  .rd-contest-stage span { font-weight: 600; color: var(--mute); }
  .rd-contest-name { margin: 8px 0 2px; font-size: 22px; font-weight: 800; letter-spacing: -0.02em; word-break: keep-all; }
  .rd-contest-event { font-size: 14px; color: var(--sub); }
  .rd-podium { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; margin: 20px 0 18px; }
  .rd-pet { display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 14px 8px; border-radius: 14px; background: var(--soft); text-align: center; }
  .rd-pet.first { background: #fbf4e2; }
  .rd-pet-rank { font-size: 13px; font-weight: 800; color: var(--sub); }
  .rd-pet.first .rd-pet-rank { color: #9a6b0a; }
  .rd-pet-name { font-size: 16px; font-weight: 800; word-break: keep-all; }
  .rd-pet-votes { font-size: 14px; font-weight: 700; color: var(--sub); font-variant-numeric: tabular-nums; }
  .rd-pet.empty { color: var(--mute); font-size: 14px; justify-content: center; min-height: 128px; }
  .rd-contest-actions { display: flex; gap: 8px; margin-top: auto; }
  .rd-contest-actions .rk-btn { flex: 1; height: 48px; }

  .rd-note { margin: 14px 0 0; font-size: 14px; color: var(--mute); text-align: center; }
  @media (max-width: 1000px) { .rd-cols { grid-template-columns: 1fr; } }
  @media (max-width: 640px) {
    .rd-summary { padding: 20px 18px; }
    .rd-title { font-size: 22px; }
    .rd-rank { grid-template-columns: 26px minmax(0, 1fr) auto; }
    .rd-bar { display: none; }
    .rd-entry { grid-template-columns: minmax(0, 1fr) 90px; }
    .rd-entry-bar { grid-column: 1 / -1; grid-row: 2; }
    .rd-contest-grid { grid-template-columns: 1fr; }
    .rd-contest { padding: 20px 18px; }
  }
`;

const LIVE = ["open", "before", "after"];

function toEvent(row) {
  const summary = { eventId: row.eventId, eventName: row.eventName, status: row.rawStatus ?? row.status, startAt: row.startAt, endAt: row.endAt, location: row.location };
  const phase = livePhase(summary);
  return { ...summary, raw: row, phase, text: phaseText(phase), win: operatingWindow(summary) };
}

function Shell({ tab, children, loading, error, data }) {
  return (
    <div className="rk">
      <style>{rkStyles}</style>
      <style>{landingStyles}</style>
      <RealtimeHeader tab={tab} />
      <div className="rk-wrap">
        {loading && !data ? <PageLoading message="실시간 정보를 불러오는 중이에요" />
          : error && !data ? <div className="rk-error" style={{ marginTop: 28 }}>정보를 불러오지 못했어요. 잠시 후 자동으로 다시 시도해요.</div>
          : children}
      </div>
    </div>
  );
}

/* ───────── 대기 현황: 장소 중심 순위표 ───────── */
export function WaitingLanding() {
  const navigate = useNavigate();
  const [eventFilter, setEventFilter] = useState("all");
  const { data, loading, error } = usePolling(async () => {
    const events = toArray(unwrap(await adminRealtimeApi.getEventsSnapshot())?.events).map(toEvent)
      .filter((e) => LIVE.includes(e.phase.phase));
    const snaps = await Promise.allSettled(events.map((e) => adminRealtimeApi.getWaitingStatusSnapshot(e.eventId)));
    return events.map((e, i) => ({ event: e, snap: snaps[i].status === "fulfilled" ? unwrap(snaps[i].value) : null }));
  }, []);

  const view = useMemo(() => {
    if (!data) return null;
    const now = new Date();
    const rows = [];
    data.forEach(({ event, snap }) => {
      if (!snap) return;
      [
        ...toArray(snap.programWaitSummaries).map((r) => waitRow(r, "program", event.phase, now)),
        ...toArray(snap.boothWaitSummaries).map((r) => waitRow(r, "booth", event.phase, now)),
      ].forEach((r) => rows.push({ ...r, eventId: event.eventId, eventName: event.eventName }));
    });
    const anyOpen = data.some(({ event }) => event.phase.phase === "open");
    const firstWin = data[0]?.event?.win;
    return { rows, anyOpen, events: data.map((d) => d.event), firstPhase: data[0]?.event?.phase?.phase, firstWin };
  }, [data]);

  const filtered = view ? view.rows.filter((r) => eventFilter === "all" || String(r.eventId) === eventFilter) : [];
  const longList = [...filtered].sort((a, b) => b.waitMin - a.waitMin).slice(0, 8);
  const quickList = [...filtered].filter((r) => r.waitMin <= 10).sort((a, b) => a.waitMin - b.waitMin).slice(0, 6);
  const maxWait = Math.max(30, ...longList.map((r) => r.waitMin));
  const top = longList[0];
  const open = view?.anyOpen;

  const rankRow = (r, i) => (
    <div key={`${r.eventId}-${r.key}`} className={`rd-rank${open ? "" : " dim"}`} onClick={() => navigate(`/realtime/waitingstatus/${r.eventId}`)}>
      <span className="rd-rank-no">{i + 1}</span>
      <div style={{ minWidth: 0 }}>
        <div className="rd-place">{r.name}</div>
        <div className="rd-event">{r.eventName} · {r.type === "program" ? "프로그램" : "부스"}{r.mode === "estimate" ? " · 예상" : ""}</div>
      </div>
      <div className="rd-bar"><span style={{ width: `${Math.min(100, (r.waitMin / maxWait) * 100)}%` }} /></div>
      <span className={`rd-big${open ? "" : " dim"}`}>{r.waitMin === 0 ? "바로 입장" : <>{r.waitMin}<small>분</small></>}</span>
    </div>
  );

  return (
    <Shell tab="waiting" loading={loading} error={error} data={data}>
      {view ? (
        <>
          <section className="rd-summary">
            {open && top ? (
              <>
                <p className="rd-eyebrow">진행 중인 행사 {view.events.length}곳의 대기를 모았어요</p>
                <h2 className="rd-title">지금 가장 오래 기다리는 곳은 <b>{top.name}</b>, 약 {top.waitMin}분이에요</h2>
                <p className="rd-sub">{top.eventName}{quickList[0] ? ` · ${quickList[0].name}은(는) ${quickList[0].waitMin === 0 ? "바로 들어갈 수 있어요" : `${quickList[0].waitMin}분이면 들어가요`}` : ""}</p>
              </>
            ) : (
              <>
                <p className="rd-eyebrow">지금은 운영 시간이 아니에요</p>
                <h2 className="rd-title">{view.firstPhase === "before" ? <>오늘 <b>{view.firstWin?.openLabel}</b>부터 실시간 대기가 표시돼요</> : view.events.length ? <>오늘 운영이 끝났어요. 내일 <b>{view.firstWin?.openLabel}</b>부터 다시 보여드려요</> : "진행 중인 행사가 없어요"}</h2>
                <p className="rd-sub">아래는 참고용 마지막 기록이에요.</p>
              </>
            )}
          </section>

          {view.events.length > 1 ? (
            <div className="rd-chips">
              <button type="button" className={`rd-chip${eventFilter === "all" ? " on" : ""}`} onClick={() => setEventFilter("all")}>전체</button>
              {view.events.map((e) => (
                <button key={e.eventId} type="button" className={`rd-chip${eventFilter === String(e.eventId) ? " on" : ""}`} onClick={() => setEventFilter(String(e.eventId))}>{e.eventName}</button>
              ))}
            </div>
          ) : null}

          <div className="rd-cols">
            <section className="rk-panel">
              <div className="rk-sec-head"><div>
                <p className="rk-sec-eyebrow">순위</p>
                <h3 className="rk-sec-title">{open ? "지금 줄이 긴 곳" : "마지막 기록 기준 대기"}</h3>
                <p className="rk-sec-note">누르면 그 행사의 대기 현황으로 이동해요.</p>
              </div></div>
              {longList.length ? <div style={{ borderTop: "1px solid var(--line)" }}>{longList.map(rankRow)}</div>
                : <div className="rk-empty"><strong>대기 정보가 없어요</strong>프로그램이나 부스 운영이 시작되면 보여드려요.</div>}
            </section>

            <section className="rk-panel">
              <div className="rk-sec-head"><div>
                <p className="rk-sec-eyebrow">빠른 입장</p>
                <h3 className="rk-sec-title">바로 들어갈 수 있는 곳</h3>
                <p className="rk-sec-note">대기 10분 이하인 곳이에요.</p>
              </div></div>
              {open && quickList.length ? <div style={{ borderTop: "1px solid var(--line)" }}>{quickList.map(rankRow)}</div>
                : <div className="rk-empty"><strong>{open ? "지금은 모두 10분 넘게 기다려요" : "운영 시간에 보여드려요"}</strong>{open ? "잠시 후 다시 확인해 보세요." : ""}</div>}
            </section>
          </div>
        </>
      ) : null}
    </Shell>
  );
}

/* ───────── 체크인 현황: 숫자판 ───────── */
export function CheckinLanding() {
  const navigate = useNavigate();
  const loggedIn = Boolean(tokenStore.getAccess());
  const { data, loading, error } = usePolling(async () => toArray(unwrap(await adminRealtimeApi.getEventsSnapshot())?.events).map(toEvent), []);

  const view = useMemo(() => {
    if (!data) return null;
    const list = data.filter((e) => String(e.status).toUpperCase() !== "CANCELLED")
      .map((e) => ({ ...e, reg: num(e.raw.registrations), inCount: num(e.raw.checkedIn), rate: clampPct(e.raw.checkinRate) }));
    const live = list.filter((e) => LIVE.includes(e.phase.phase)).sort((a, b) => b.rate - a.rate);
    const others = list.filter((e) => !LIVE.includes(e.phase.phase)).sort((a, b) => String(a.startAt).localeCompare(String(b.startAt)));
    const totalIn = live.reduce((s, e) => s + e.inCount, 0);
    const totalReg = live.reduce((s, e) => s + e.reg, 0);
    return { live, others, totalIn, totalReg, anyOpen: live.some((e) => e.phase.phase === "open") };
  }, [data]);

  const entryRow = (e, dim = false) => (
    <div key={e.eventId} className={`rd-entry${dim ? " dim" : ""}`} onClick={() => navigate(`/realtime/checkinstatus/${e.eventId}`)}>
      <div style={{ minWidth: 0 }}>
        <div className="rd-place">{e.eventName}</div>
        <div className="rd-event">{e.phase.phase === "open" ? `운영 중 · ${e.win.closeLabel} 마감` : e.text.chip}{e.location ? ` · ${e.location}` : ""}</div>
      </div>
      <div className="rd-entry-bar"><span style={{ width: `${e.rate}%` }} /></div>
      <div className="rd-entry-num">
        <div className="rd-entry-rate">{e.rate}<small>%</small></div>
        <div className="rd-entry-sub">입장 {e.inCount} / 등록 {e.reg}</div>
      </div>
    </div>
  );

  return (
    <Shell tab="checkin" loading={loading} error={error} data={data}>
      {view ? (
        <>
          <section className="rd-summary" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
            <div>
              <p className="rd-eyebrow">{view.anyOpen ? `지금 입장이 진행 중인 행사 ${view.live.filter((e) => e.phase.phase === "open").length}곳` : "진행 중인 행사 입장 현황"}</p>
              <h2 className="rd-title">지금까지 <b>{view.totalIn.toLocaleString()}명</b>이 입장했어요</h2>
              <p className="rd-sub">진행 중인 행사의 사전 등록 {view.totalReg.toLocaleString()}명 기준 · 행사별 입장률은 아래에서 비교해 보세요</p>
            </div>
            {loggedIn ? (
              <button type="button" className="rk-btn" onClick={() => navigate("/registration/qrcheckin")}><QrCode size={18} />내 입장 QR</button>
            ) : null}
          </section>

          <section className="rk-panel">
            <div className="rk-sec-head"><div>
              <p className="rk-sec-eyebrow">행사별 비교</p>
              <h3 className="rk-sec-title">입장률</h3>
              <p className="rk-sec-note">사전 등록한 사람 중 실제로 입장한 비율이에요. 누르면 행사별 체크인 현황으로 이동해요.</p>
            </div></div>
            {view.live.length ? <div style={{ borderTop: "1px solid var(--line)" }}>{view.live.map((e) => entryRow(e))}</div>
              : <div className="rk-empty"><strong>진행 중인 행사가 없어요</strong>행사가 시작되면 입장 현황을 보여드려요.</div>}
          </section>

          {view.others.length ? (
            <section className="rk-panel" style={{ marginTop: 18 }}>
              <div className="rk-sec-head"><div>
                <p className="rk-sec-eyebrow">그 밖의 행사</p>
                <h3 className="rk-sec-title">개막 예정 · 지난 행사</h3>
              </div></div>
              <div style={{ borderTop: "1px solid var(--line)" }}>{view.others.map((e) => entryRow(e, true))}</div>
            </section>
          ) : null}
        </>
      ) : null}
    </Shell>
  );
}

/* ───────── 투표 현황: 콘테스트 중심 ───────── */
export function VoteLanding() {
  const navigate = useNavigate();
  const { data, loading, error } = usePolling(async () => {
    const events = toArray(unwrap(await adminRealtimeApi.getEventsSnapshot())?.events).map(toEvent)
      .filter((e) => num(e.raw.contestProgramCount) > 0);
    const snaps = await Promise.allSettled(events.map((e) => adminRealtimeApi.getVoteStatusSnapshot(e.eventId)));
    const contests = [];
    events.forEach((e, i) => {
      const snap = snaps[i].status === "fulfilled" ? unwrap(snaps[i].value) : null;
      toArray(snap?.contests).forEach((c) => contests.push({
        ...c,
        eventId: e.eventId,
        eventName: e.eventName,
        totalVotes: num(c.totalVotes),
        items: toArray(c.items).map((it) => ({ ...it, votes: num(it.votes) })).sort((a, b) => b.votes - a.votes || num(a.rank) - num(b.rank)),
        stage: contestStage(c),
      }));
    });
    return contests;
  }, []);

  const groups = useMemo(() => {
    const list = toArray(data);
    return {
      live: list.filter((c) => c.stage.key === "live"),
      upcoming: list.filter((c) => c.stage.key === "upcoming").sort((a, b) => String(a.startAt).localeCompare(String(b.startAt))),
      ended: list.filter((c) => c.stage.key === "ended").sort((a, b) => String(b.endAt).localeCompare(String(a.endAt))),
    };
  }, [data]);

  const hero = (() => {
    const { live, upcoming, ended } = groups;
    if (live.length) {
      const c = live[0]; const lead = c.items[0];
      return { eyebrow: `투표 진행 중 ${live.length}개`, title: lead && lead.votes > 0 ? <><b>{c.title}</b>에서 {lead.name}이(가) 1위를 달리고 있어요</> : <><b>{c.title}</b> 투표가 열렸어요</>, sub: `${c.eventName} · ${c.stage.line}` };
    }
    if (upcoming.length) return { eyebrow: "지금 진행 중인 투표는 없어요", title: <>다음 투표는 <b>{upcoming[0].title}</b>이에요</>, sub: `${upcoming[0].eventName} · ${upcoming[0].stage.line}` };
    if (ended.length) return { eyebrow: "모든 투표가 끝났어요", title: <><b>{ended[0].title}</b> 우승은 {ended[0].items[0]?.name || "-"}이에요</>, sub: ended[0].eventName };
    return { eyebrow: "투표 현황", title: "열린 콘테스트가 없어요", sub: "콘테스트가 열리는 행사에서 실시간 순위를 볼 수 있어요." };
  })();

  const card = (c) => {
    const top3 = c.items.slice(0, 3);
    const isEnded = c.stage.key === "ended";
    return (
      <article key={`${c.eventId}-${c.programId}`} className={`rd-contest${c.stage.key === "live" ? " live" : ""}`}>
        <span className="rd-contest-stage"><i />{c.stage.label}{c.stage.line ? <span>· {c.stage.line}</span> : null}</span>
        <h4 className="rd-contest-name">{c.title}</h4>
        <div className="rd-contest-event">{c.eventName} · {fmtMD(c.startAt)} {fmtHM(c.startAt)} ~ {fmtHM(c.endAt)} · 누적 {c.totalVotes.toLocaleString()}표</div>
        <div className="rd-podium">
          {(top3.length ? top3.map((_, i) => i) : [0]).map((i) => {
            const it = top3[i];
            if (!it) return i === 0 ? <div key={i} className="rd-pet empty" style={{ gridColumn: "1 / -1" }}>참가 신청을 받고 있어요</div> : null;
            return (
              <div key={it.applyId ?? i} className={`rd-pet${i === 0 ? " first" : ""}`}>
                <span className="rd-pet-rank">{isEnded && i === 0 ? "우승" : `${i + 1}위`}</span>
                <PetAvatar src={it.imageUrl} name={it.name} size={56} radius={14} background="#fff" iconColor="#a8a29e" />
                <span className="rd-pet-name">{it.name}</span>
                <span className="rd-pet-votes">{it.votes.toLocaleString()}표</span>
              </div>
            );
          })}
        </div>
        <div className="rd-contest-actions">
          {c.stage.key === "live" ? (
            <button type="button" className="rk-btn" onClick={() => navigate(`/program/contest/${c.eventId}/detail/${c.programId}`)}>투표하러 가기</button>
          ) : null}
          <button type="button" className="rk-btn ghost" onClick={() => navigate(`/realtime/votestatus/${c.eventId}`)}>전체 순위 보기<ChevronRight size={16} /></button>
        </div>
      </article>
    );
  };

  return (
    <Shell tab="vote" loading={loading} error={error} data={data}>
      {data ? (
        <>
          <section className="rd-summary">
            <p className="rd-eyebrow">{hero.eyebrow}</p>
            <h2 className="rd-title">{hero.title}</h2>
            <p className="rd-sub">{hero.sub}</p>
          </section>
          {[["live", "투표 진행 중"], ["upcoming", "투표 예정"], ["ended", "지난 콘테스트"]].map(([key, title]) => groups[key].length ? (
            <section key={key} style={{ marginTop: 30 }}>
              <div className="rl-group-head" style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 14 }}>
                <h3 className="rk-sec-title">{title}</h3>
                <span style={{ fontSize: 16, fontWeight: 700, color: "var(--mute)" }}>{groups[key].length}</span>
              </div>
              <div className="rd-contest-grid">{groups[key].map(card)}</div>
            </section>
          ) : null)}
          {!data.length ? <div className="rk-panel rk-empty"><strong>열린 콘테스트가 없어요</strong>콘테스트가 있는 행사에서 투표할 수 있어요.</div> : null}
        </>
      ) : null}
    </Shell>
  );
}
