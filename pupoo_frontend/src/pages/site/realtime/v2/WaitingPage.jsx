import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { adminRealtimeApi } from "../../../../app/http/adminRealtimeApi";
import RealtimeLayout from "./RealtimeLayout";
import { WaitingLanding } from "./RealtimeLandings";
import { fmtHM, fmtStamp, livePhase, toArray, unwrap, usePolling, waitRow } from "./realtimeKit";

export default function WaitingPage() {
  const { eventId } = useParams();
  if (!eventId) return <WaitingLanding />;
  return <WaitingView eventId={eventId} />;
}

function WaitingView({ eventId }) {
  const navigate = useNavigate();
  const [kind, setKind] = useState("all");
  const [order, setOrder] = useState("long");
  const { data, loading, error, loadedAt, refreshing, refresh } = usePolling(
    async () => unwrap(await adminRealtimeApi.getWaitingStatusSnapshot(eventId)),
    [eventId],
  );

  const view = useMemo(() => {
    if (!data) return null;
    const summary = data.eventSummary || {};
    const now = new Date();
    const phase = livePhase(summary, now);
    const isOpen = phase.phase === "open";

    // 대기 한 줄: 최근 값이면 그대로, 운영 중인데 오래된 기록뿐이면 시간대 흐름으로 예상, 운영 시간 밖이면 기록만
    const toRow = (r, type) => waitRow(r, type, phase, now);

    const rows = [
      ...toArray(data.programWaitSummaries).map((r) => toRow(r, "program")),
      ...toArray(data.boothWaitSummaries).map((r) => toRow(r, "booth")),
    ];
    const liveRows = isOpen ? rows : [];
    const waiting = liveRows.filter((r) => r.waitMin > 0);
    const longest = waiting.length ? [...waiting].sort((a, b) => b.waitMin - a.waitMin)[0] : null;
    const shortest = liveRows.length ? [...liveRows].sort((a, b) => a.waitMin - b.waitMin)[0] : null;
    const avg = waiting.length ? Math.round(waiting.reduce((s, r) => s + r.waitMin, 0) / waiting.length) : 0;

    return { summary, phase, isOpen, rows, waiting, longest, shortest, avg, noWait: liveRows.filter((r) => r.waitMin === 0).length };
  }, [data]);

  const list = useMemo(() => {
    if (!view) return [];
    const filtered = view.rows.filter((r) => kind === "all" || r.type === kind);
    return filtered.sort((a, b) => (order === "long" ? b.waitMin - a.waitMin : a.waitMin - b.waitMin));
  }, [view, kind, order]);
  const maxWait = Math.max(30, ...list.map((r) => r.waitMin));
  const counts = view ? { all: view.rows.length, program: view.rows.filter((r) => r.type === "program").length, booth: view.rows.filter((r) => r.type === "booth").length } : {};

  const hero = (() => {
    if (!view) return null;
    const { phase, isOpen, longest, shortest } = view;
    if (!isOpen) {
      const title = phase.phase === "before" ? "아직 대기 줄이 없어요" : phase.phase === "planned" ? "행사 개막 전이에요" : phase.phase === "ended" ? "종료된 행사예요" : "오늘 운영이 끝났어요";
      return { title, sub: `대기 정보는 운영 시간(${phase.win.text})에 실시간으로 표시돼요.` };
    }
    if (!longest) return { title: "지금은 기다리는 곳이 없어요", sub: "어디든 바로 참여할 수 있어요." };
    return {
      title: <>가장 오래 기다리는 곳은<br /><b>{longest.name}</b>, 약 {longest.waitMin}분이에요</>,
      sub: shortest && shortest.key !== longest.key ? `${shortest.name}은(는) ${shortest.waitMin === 0 ? "바로 들어갈 수 있어요" : `${shortest.waitMin}분이면 들어갈 수 있어요`}.` : "",
    };
  })();

  return (
    <RealtimeLayout tab="waiting" eventId={eventId} summary={view?.summary} loading={loading} loadedAt={loadedAt} refreshing={refreshing} onRefresh={refresh}>
      {error && !data ? <div className="rk-error">대기 정보를 불러오지 못했어요. 15초 뒤 자동으로 다시 시도해요.</div> : null}
      {view ? (
        <div className="rk-stack">
          <section className="rk-panel">
            <span className="rk-verdict-label" style={{ color: view.isOpen ? "var(--ink)" : "#78716c" }}>
              <i style={{ background: view.isOpen ? "#3f7d3a" : "var(--mute)" }} />{view.isOpen ? "지금 대기" : "운영 시간 아님"}
            </span>
            <h2 className="rk-verdict-title" style={{ fontWeight: 700 }}>{hero.title}</h2>
            {hero.sub ? <p className="rk-verdict-sub">{hero.sub}</p> : null}
            <div className="rk-stats">
              <div className="rk-stat">
                <div className="rk-stat-label">기다리는 곳</div>
                <div className={`rk-stat-value${view.isOpen ? "" : " dim"}`}>{view.isOpen ? view.waiting.length : "–"}{view.isOpen ? <small>곳</small> : null}</div>
                <div className="rk-stat-hint">{view.isOpen ? `전체 ${view.rows.length}곳 중` : "운영 시간에 표시돼요"}</div>
              </div>
              <div className="rk-stat">
                <div className="rk-stat-label">평균 대기</div>
                <div className={`rk-stat-value${view.isOpen ? "" : " dim"}`}>{view.isOpen ? view.avg : "–"}{view.isOpen ? <small>분</small> : null}</div>
                <div className="rk-stat-hint">{view.isOpen ? "대기가 있는 곳 기준" : "운영 시간에 표시돼요"}</div>
              </div>
              <div className="rk-stat">
                <div className="rk-stat-label">바로 입장</div>
                <div className={`rk-stat-value${view.isOpen ? "" : " dim"}`}>{view.isOpen ? view.noWait : "–"}{view.isOpen ? <small>곳</small> : null}</div>
                <div className="rk-stat-hint">{view.isOpen ? "대기 없이 참여 가능" : "운영 시간에 표시돼요"}</div>
              </div>
            </div>
          </section>

          <section className="rk-panel">
            <div className="rk-sec-head">
              <div>
                <p className="rk-sec-eyebrow">대기 목록</p>
                <h3 className="rk-sec-title">{view.isOpen ? "곳곳의 대기 시간" : "마지막으로 기록된 대기"}</h3>
                <p className="rk-sec-note">
                  {view.isOpen
                    ? (view.rows.some((r) => r.mode === "estimate") ? "최근 측정값이 없는 곳은 시간대 흐름을 반영해 예상했어요." : "현장에서 측정한 대기 시간이에요.")
                    : "지금은 운영 시간이 아니라 실시간 대기가 없어요. 참고용 마지막 기록이에요."}
                </p>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <div className="rk-seg">
                  {[["all", "전체"], ["program", "프로그램"], ["booth", "부스"]].map(([k, label]) => (
                    <button key={k} type="button" className={kind === k ? "on" : ""} onClick={() => setKind(k)} disabled={!counts[k] && k !== "all"}>{label} {counts[k] ?? 0}</button>
                  ))}
                </div>
                <div className="rk-seg">
                  <button type="button" className={order === "long" ? "on" : ""} onClick={() => setOrder("long")}>긴 순</button>
                  <button type="button" className={order === "short" ? "on" : ""} onClick={() => setOrder("short")}>짧은 순</button>
                </div>
              </div>
            </div>

            {list.length === 0 ? (
              <div className="rk-empty"><strong>표시할 대기 정보가 없어요</strong>프로그램이나 부스 운영이 시작되면 이곳에 보여드려요.</div>
            ) : (
              <ul className="rk-list">
                {list.map((r) => {
                  const dim = r.mode === "record";
                  return (
                    <li key={r.key} className={`rk-row${r.type === "program" ? " link" : ""}`} onClick={r.type === "program" ? () => navigate(`/program/detail?programId=${r.id}`) : undefined}>
                      <div>
                        <div className="rk-row-name">{r.name}</div>
                        <div className="rk-row-sub">
                          {[r.type === "program" ? "프로그램" : "부스", r.sub, r.mode === "live" ? `${fmtHM(r.at)} 측정` : r.mode === "estimate" ? "지금 시간대 예상" : `기록 ${fmtStamp(r.at)}`].filter(Boolean).join(" · ")}
                        </div>
                      </div>
                      <div className="rk-row-end">
                        <div className="rk-minibar"><span style={{ width: `${Math.min(100, (r.waitMin / maxWait) * 100)}%`, background: dim ? "var(--mute)" : "var(--ink)" }} /></div>
                        <span className={`rk-row-big${dim ? " dim" : ""}`} style={{ minWidth: 88 }}>
                          {r.waitMin === 0 ? "바로 입장" : <>{r.waitMin}<small>분</small></>}
                        </span>
                        <span className="rk-row-sub" style={{ margin: 0, minWidth: 44 }}>{r.teams > 0 ? `${r.teams}팀` : ""}</span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      ) : null}
    </RealtimeLayout>
  );
}
