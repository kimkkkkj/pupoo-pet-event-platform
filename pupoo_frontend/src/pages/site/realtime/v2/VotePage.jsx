import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import PetAvatar from "../../../../shared/components/pet/PetAvatar";
import { adminRealtimeApi } from "../../../../app/http/adminRealtimeApi";
import RealtimeLayout from "./RealtimeLayout";
import { VoteLanding } from "./RealtimeLandings";
import { contestStage, fmtHM, fmtMD, num, toArray, unwrap, usePolling } from "./realtimeKit";

const voteStyles = `
  .vp-contest + .vp-contest { margin-top: 18px; }
  .vp-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; flex-wrap: wrap; padding-bottom: 18px; border-bottom: 1px solid var(--line); }
  .vp-total { text-align: right; }
  .vp-total-num { font-size: 34px; font-weight: 800; letter-spacing: -0.03em; font-variant-numeric: tabular-nums; }
  .vp-total-num small { font-size: 16px; font-weight: 700; color: var(--sub); margin-left: 3px; }
  .vp-rank { display: grid; grid-template-columns: 36px 52px minmax(0, 1fr) 180px 90px; gap: 14px; align-items: center; padding: 14px 4px; border-bottom: 1px solid var(--line); }
  .vp-rank-no { font-size: 20px; font-weight: 800; color: var(--mute); text-align: center; font-variant-numeric: tabular-nums; }
  .vp-rank.first .vp-rank-no { color: var(--ink); }
  .vp-name { font-size: 17px; font-weight: 700; word-break: keep-all; }
  .vp-owner { margin-top: 3px; font-size: 14px; color: var(--sub); }
  .vp-bar { height: 8px; border-radius: 4px; background: var(--soft); overflow: hidden; }
  .vp-bar span { display: block; height: 100%; border-radius: 4px; background: #c9c5bd; }
  .vp-rank.first .vp-bar span { background: var(--ink); }
  .vp-votes { text-align: right; font-size: 18px; font-weight: 800; font-variant-numeric: tabular-nums; }
  .vp-votes small { display: block; font-size: 13px; font-weight: 600; color: var(--mute); }
  .vp-foot { display: flex; justify-content: flex-end; margin-top: 18px; }
  @media (max-width: 760px) {
    .vp-rank { grid-template-columns: 28px 44px minmax(0, 1fr) 70px; }
    .vp-bar { display: none; }
    .vp-total { text-align: left; }
  }
`;

export default function VotePage() {
  const { eventId } = useParams();
  if (!eventId) return <VoteLanding />;
  return <VoteView eventId={eventId} />;
}

function VoteView({ eventId }) {
  const navigate = useNavigate();
  const { data, loading, error, loadedAt, refreshing, refresh } = usePolling(
    async () => unwrap(await adminRealtimeApi.getVoteStatusSnapshot(eventId)),
    [eventId],
  );

  const view = useMemo(() => {
    if (!data) return null;
    const contests = toArray(data.contests).map((c) => {
      const items = toArray(c.items).map((it) => ({ ...it, votes: num(it.votes), pct: Math.round(num(it.pct)) }))
        .sort((a, b) => b.votes - a.votes || num(a.rank) - num(b.rank));
      return { ...c, items, totalVotes: num(c.totalVotes), stage: contestStage(c) };
    }).sort((a, b) => ({ live: 0, upcoming: 1, ended: 2 }[a.stage.key] - { live: 0, upcoming: 1, ended: 2 }[b.stage.key]));
    const live = contests.filter((c) => c.stage.key === "live");
    return {
      summary: data.eventSummary || {},
      contests,
      live,
      totalVotes: contests.reduce((s, c) => s + c.totalVotes, 0),
    };
  }, [data]);

  const hero = (() => {
    if (!view) return null;
    const { contests, live } = view;
    if (!contests.length) return { label: "콘테스트 없음", title: "이 행사에는 투표할 콘테스트가 없어요", sub: "콘테스트가 열리는 행사에서 실시간 순위를 볼 수 있어요." };
    if (live.length) {
      const c = live[0]; const leader = c.items[0];
      return { label: "투표 진행 중", title: leader && leader.votes > 0 ? <><b>{c.title}</b>에서<br />{leader.name}이(가) 1위를 달리고 있어요</> : <><b>{c.title}</b> 투표가 진행 중이에요</>, sub: c.stage.line };
    }
    const next = contests.find((c) => c.stage.key === "upcoming");
    if (next) return { label: "투표 예정", title: <><b>{next.title}</b> 투표가 곧 열려요</>, sub: next.stage.line };
    return { label: "투표 종료", title: "모든 콘테스트 투표가 끝났어요", sub: "최종 순위를 아래에서 확인해 보세요." };
  })();

  return (
    <RealtimeLayout tab="vote" eventId={eventId} summary={view?.summary} loading={loading} loadedAt={loadedAt} refreshing={refreshing} onRefresh={refresh}>
      <style>{voteStyles}</style>
      {error && !data ? <div className="rk-error">투표 정보를 불러오지 못했어요. 15초 뒤 자동으로 다시 시도해요.</div> : null}
      {view ? (
        <div className="rk-stack">
          <section className="rk-panel">
            <span className="rk-verdict-label" style={{ color: view.live.length ? "var(--ink)" : "#78716c" }}>
              <i style={{ background: view.live.length ? "#3f7d3a" : "var(--mute)" }} />{hero.label}
            </span>
            <h2 className="rk-verdict-title" style={{ fontWeight: 700 }}>{hero.title}</h2>
            {hero.sub ? <p className="rk-verdict-sub">{hero.sub}</p> : null}
            <div className="rk-stats">
              <div className="rk-stat">
                <div className="rk-stat-label">콘테스트</div>
                <div className="rk-stat-value">{view.contests.length}<small>개</small></div>
                <div className="rk-stat-hint">진행 중 {view.live.length}개</div>
              </div>
              <div className="rk-stat">
                <div className="rk-stat-label">전체 투표</div>
                <div className="rk-stat-value">{view.totalVotes.toLocaleString()}<small>표</small></div>
                <div className="rk-stat-hint">모든 콘테스트 합계</div>
              </div>
              <div className="rk-stat">
                <div className="rk-stat-label">참가 반려동물</div>
                <div className="rk-stat-value">{view.contests.reduce((s, c) => s + c.items.length, 0)}<small>마리</small></div>
                <div className="rk-stat-hint">콘테스트 참가 신청 기준</div>
              </div>
            </div>
          </section>

          {view.contests.map((c) => (
            <section key={c.key || c.programId} className="rk-panel vp-contest">
              <div className="vp-head">
                <div>
                  <p className="rk-sec-eyebrow">{c.stage.label}{c.stage.line ? ` · ${c.stage.line}` : ""}</p>
                  <h3 className="rk-sec-title">{c.title}</h3>
                  <p className="rk-sec-note">{fmtMD(c.startAt)} {fmtHM(c.startAt)} ~ {fmtHM(c.endAt)}</p>
                </div>
                <div className="vp-total">
                  <div className="rk-sec-eyebrow" style={{ margin: 0 }}>누적 투표</div>
                  <div className="vp-total-num">{c.totalVotes.toLocaleString()}<small>표</small></div>
                </div>
              </div>

              {c.items.length === 0 ? (
                <div className="rk-empty"><strong>아직 참가한 반려동물이 없어요</strong>참가 신청이 들어오면 순위가 표시돼요.</div>
              ) : (
                c.items.map((it, i) => (
                  <div key={it.applyId ?? i} className={`vp-rank${i === 0 && it.votes > 0 ? " first" : ""}`}>
                    <span className="vp-rank-no">{i + 1}</span>
                    <PetAvatar src={it.imageUrl} name={it.name} size={48} radius={12} background="#f5f5f3" iconColor="#a8a29e" />
                    <div style={{ minWidth: 0 }}>
                      <div className="vp-name">{it.name}</div>
                      <div className="vp-owner">{it.ownerNickname ? `보호자 ${it.ownerNickname}` : ""}</div>
                    </div>
                    <div className="vp-bar"><span style={{ width: `${c.totalVotes > 0 ? it.pct : 0}%` }} /></div>
                    <div className="vp-votes">{it.votes.toLocaleString()}표<small>{c.totalVotes > 0 ? `${it.pct}%` : "–"}</small></div>
                  </div>
                ))
              )}

              <div className="vp-foot">
                <button type="button" className={`rk-btn${c.stage.key === "live" ? "" : " ghost"}`} onClick={() => navigate(`/program/contest/${eventId}/detail/${c.programId}`)}>
                  {c.stage.key === "live" ? "투표하러 가기" : "콘테스트 자세히 보기"}<ChevronRight size={17} />
                </button>
              </div>
            </section>
          ))}
        </div>
      ) : null}
    </RealtimeLayout>
  );
}
