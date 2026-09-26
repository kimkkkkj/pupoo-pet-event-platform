import { useNavigate } from "react-router-dom";
import { Activity, ArrowLeft, DoorOpen, Hourglass, RefreshCw, Trophy } from "lucide-react";
import PageHeader from "../../components/PageHeader";
import PageLoading from "../../components/PageLoading";
import { fmtHM, fmtRange, livePhase, operatingWindow, phaseText } from "./realtimeKit";

// 메뉴마다 무엇을 보여주는지 제목·아이콘·설명으로 구분한다
export const REALTIME_TABS = [
  { key: "dashboard", label: "통합 현황", path: "/realtime/dashboard", Icon: Activity, desc: "행사장이 얼마나 붐비는지, 언제 가면 좋은지 알려드려요" },
  { key: "waiting", label: "대기 현황", path: "/realtime/waitingstatus", Icon: Hourglass, desc: "프로그램과 부스마다 얼마나 기다려야 하는지 보여드려요" },
  { key: "checkin", label: "체크인 현황", path: "/realtime/checkinstatus", Icon: DoorOpen, desc: "몇 명이 입장했고 지금 안에 몇 명이 있는지 보여드려요" },
  { key: "vote", label: "투표 현황", path: "/realtime/votestatus", Icon: Trophy, desc: "콘테스트별 실시간 순위와 투표 수를 보여드려요" },
];

/* 사이트 공통 제목 영역 + 초록 탭 막대 (행사를 고른 뒤에는 탭이 같은 행사로 이동) */
export function RealtimeHeader({ tab, eventId }) {
  const current = REALTIME_TABS.find((t) => t.key === tab) || REALTIME_TABS[0];
  const { Icon } = current;
  const withId = (t) => (eventId ? `${t.path}/${eventId}` : t.path);
  return (
    <PageHeader
      title={current.label}
      subtitle={current.desc}
      icon={<Icon size={42} color="#90C450" strokeWidth={1.6} />}
      titleStyle={{ fontSize: 46, lineHeight: "66px", letterSpacing: "-1px" }}
      subtitleStyle={{ fontSize: 20 }}
      categories={REALTIME_TABS.map((t) => ({ label: t.label, path: withId(t) }))}
      currentPath={withId(current)}
    />
  );
}

/* 네 화면 공용 스타일: 흰 바탕 + 가는 선, 색은 상태 표시에만 */
export const rkStyles = `
  .rk { --ink: #1c1917; --sub: #57534e; --mute: #a8a29e; --line: #e7e5e0; --soft: #f5f5f3; --accent: #5E8F2A;
        background: #f7f7f5; min-height: 100vh; color: var(--ink);
        font-family: 'Pretendard Variable', 'Pretendard', 'Noto Sans KR', sans-serif; }
  .rk * { box-sizing: border-box; }
  .rk-wrap { width: min(1400px, calc(100% - 40px)); margin: 0 auto; padding: 8px 0 96px; }

  /* 행사 머리 */
  .rk-back { display: inline-flex; align-items: center; gap: 6px; height: 40px; padding: 0 14px; border-radius: 10px; border: 1px solid var(--line); background: #fff; font-family: inherit; font-size: 14.5px; font-weight: 700; color: var(--ink); cursor: pointer; transition: border-color .15s; }
  .rk-back:hover { border-color: var(--ink); }
  .rk-head { display: flex; justify-content: space-between; align-items: center; gap: 24px; flex-wrap: wrap; padding: 24px 28px; margin: 28px 0 14px; background: #fff; border: 1px solid var(--line); border-radius: 16px; }
  .rk-head-side { display: flex; flex-direction: column; align-items: flex-end; gap: 12px; }
  .rk-toolbar { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; margin-bottom: 18px; }
  .rk-eyebrow { margin: 0 0 8px; font-size: 13.5px; font-weight: 700; color: var(--mute); letter-spacing: .02em; }
  .rk-title { margin: 0; font-size: 32px; font-weight: 800; letter-spacing: -0.03em; line-height: 1.2; word-break: keep-all; }
  .rk-meta { margin: 10px 0 0; display: flex; flex-wrap: wrap; gap: 4px 18px; font-size: 15px; color: var(--sub); }
  .rk-meta span { white-space: nowrap; }
  .rk-phase { text-align: right; }
  .rk-phase-chip { display: inline-flex; align-items: center; gap: 8px; font-size: 16px; font-weight: 800; }
  .rk-phase-chip i { width: 9px; height: 9px; border-radius: 50%; background: var(--mute); }
  .rk-phase-chip.open i { background: #3f7d3a; box-shadow: 0 0 0 4px rgba(63, 125, 58, .15); animation: rk-pulse 1.8s ease-in-out infinite; }
  .rk-phase-line { margin: 4px 0 0; font-size: 14.5px; color: var(--sub); }
  @keyframes rk-pulse { 0%,100% { opacity: 1; } 50% { opacity: .35; } }

  /* 탭 */
  .rk-tabs { display: flex; gap: 28px; border-bottom: 1px solid var(--line); margin-bottom: 28px; overflow-x: auto; scrollbar-width: none; }
  .rk-tabs::-webkit-scrollbar { display: none; }
  .rk-tab { position: relative; padding: 14px 0 16px; border: none; background: none; font-family: inherit; font-size: 17px; font-weight: 700; color: var(--mute); cursor: pointer; white-space: nowrap; }
  .rk-tab:hover { color: var(--sub); }
  .rk-tab.on { color: var(--ink); }
  .rk-tab.on::after { content: ""; position: absolute; left: 0; right: 0; bottom: -1px; height: 2px; background: var(--ink); }

  .rk-updated { display: flex; align-items: center; gap: 12px; font-size: 13.5px; color: var(--mute); }
  .rk-refresh { display: inline-flex; align-items: center; gap: 6px; border: none; background: none; padding: 4px 0; font-family: inherit; font-size: 13.5px; font-weight: 700; color: var(--sub); cursor: pointer; }
  .rk-refresh:hover { color: var(--ink); }
  .rk-refresh .spin { animation: rk-spin .8s linear infinite; }
  @keyframes rk-spin { to { transform: rotate(360deg); } }

  /* 패널·섹션 */
  .rk-stack { display: flex; flex-direction: column; gap: 18px; }
  .rk-panel { background: #fff; border: 1px solid var(--line); border-radius: 16px; padding: 28px 30px; }
  .rk-sec-head { display: flex; justify-content: space-between; align-items: flex-end; gap: 16px; flex-wrap: wrap; margin-bottom: 20px; }
  .rk-sec-eyebrow { margin: 0 0 6px; font-size: 13px; font-weight: 700; color: var(--mute); }
  .rk-sec-title { margin: 0; font-size: 21px; font-weight: 800; letter-spacing: -0.02em; }
  .rk-sec-note { margin: 6px 0 0; font-size: 15px; color: var(--sub); line-height: 1.6; word-break: keep-all; }

  /* 결론 */
  .rk-verdict { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 24px; align-items: center; }
  .rk-verdict-label { display: inline-flex; align-items: center; gap: 8px; font-size: 15px; font-weight: 800; }
  .rk-verdict-label i { width: 10px; height: 10px; border-radius: 50%; }
  .rk-verdict-title { margin: 10px 0 8px; font-size: 38px; font-weight: 800; letter-spacing: -0.035em; line-height: 1.2; word-break: keep-all; }
  .rk-verdict-sub { margin: 0; font-size: 17px; color: var(--sub); line-height: 1.6; word-break: keep-all; }
  .rk-meter { display: flex; gap: 4px; width: 220px; }
  .rk-meter span { flex: 1; height: 10px; border-radius: 3px; background: var(--soft); }
  .rk-meter-cap { display: flex; justify-content: space-between; margin-top: 8px; font-size: 12.5px; color: var(--mute); }

  /* 숫자 줄 */
  .rk-stats { display: grid; grid-template-columns: repeat(var(--cols, 3), minmax(0, 1fr)); margin-top: 26px; border-top: 1px solid var(--line); }
  .rk-stat { padding: 20px 0 2px; }
  .rk-stat + .rk-stat { padding-left: 24px; border-left: 1px solid var(--line); }
  .rk-stat-label { font-size: 14.5px; font-weight: 600; color: var(--sub); }
  .rk-stat-value { margin-top: 6px; font-size: 40px; font-weight: 800; letter-spacing: -0.03em; line-height: 1.05; font-variant-numeric: tabular-nums; }
  .rk-stat-value small { margin-left: 3px; font-size: 17px; font-weight: 700; color: var(--sub); }
  .rk-stat-value.dim { color: var(--mute); }
  .rk-stat-hint { margin-top: 6px; font-size: 13.5px; color: var(--mute); }

  /* 안내줄 */
  .rk-notice { display: flex; gap: 10px; align-items: flex-start; padding: 14px 16px; border-radius: 12px; background: var(--soft); font-size: 14.5px; color: var(--sub); line-height: 1.6; }
  .rk-notice b { color: var(--ink); }

  /* 막대 그래프 */
  .rk-bars { display: flex; align-items: flex-end; gap: 6px; height: 220px; overflow-x: auto; padding-top: 4px; }
  .rk-bar { flex: 1 0 40px; height: 100%; display: flex; flex-direction: column; align-items: center; gap: 8px; }
  .rk-bar-val { height: 16px; font-size: 12.5px; font-weight: 700; color: var(--mute); font-variant-numeric: tabular-nums; }
  .rk-bar-track { flex: 1; width: 100%; max-width: 44px; display: flex; align-items: flex-end; }
  .rk-bar-fill { width: 100%; border-radius: 6px 6px 2px 2px; background: #d6d3d1; transition: height .5s ease; }
  .rk-bar.future .rk-bar-fill { background: repeating-linear-gradient(135deg, #e7e5e0 0 6px, #f1f0ec 6px 12px); }
  .rk-bar.now .rk-bar-fill { background: var(--ink); }
  .rk-bar.best .rk-bar-fill { background: var(--accent); }
  .rk-bar-hour { font-size: 13.5px; font-weight: 600; color: var(--sub); white-space: nowrap; }
  .rk-bar.now .rk-bar-hour, .rk-bar.now .rk-bar-val { color: var(--ink); font-weight: 800; }
  .rk-bar.best .rk-bar-hour, .rk-bar.best .rk-bar-val { color: var(--accent); font-weight: 800; }
  .rk-legend { display: flex; flex-wrap: wrap; gap: 6px 18px; margin-top: 16px; font-size: 13.5px; color: var(--sub); }
  .rk-legend span { display: inline-flex; align-items: center; gap: 7px; }
  .rk-legend i { width: 14px; height: 10px; border-radius: 3px; display: inline-block; }

  /* 목록 */
  .rk-list { list-style: none; margin: 0; padding: 0; border-top: 1px solid var(--line); }
  .rk-row { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 16px; align-items: center; padding: 16px 4px; border-bottom: 1px solid var(--line); }
  .rk-row.link { cursor: pointer; }
  .rk-row.link:hover { background: #fafaf8; }
  .rk-row-name { font-size: 17px; font-weight: 700; color: var(--ink); word-break: keep-all; }
  .rk-row-sub { margin-top: 4px; font-size: 14px; color: var(--sub); }
  .rk-row-end { display: flex; align-items: center; gap: 14px; text-align: right; }
  .rk-row-big { font-size: 20px; font-weight: 800; font-variant-numeric: tabular-nums; white-space: nowrap; }
  .rk-row-big small { font-size: 14px; font-weight: 700; color: var(--sub); margin-left: 2px; }
  .rk-row-big.dim { color: var(--mute); }
  .rk-state { display: inline-flex; align-items: center; gap: 6px; font-size: 14px; font-weight: 700; white-space: nowrap; }
  .rk-state i { width: 8px; height: 8px; border-radius: 50%; }
  .rk-seg { display: inline-flex; gap: 2px; padding: 3px; border-radius: 10px; background: var(--soft); }
  .rk-seg button { height: 36px; padding: 0 14px; border: none; border-radius: 8px; background: none; font-family: inherit; font-size: 14px; font-weight: 700; color: var(--sub); cursor: pointer; }
  .rk-seg button.on { background: #fff; color: var(--ink); box-shadow: 0 1px 3px rgba(0, 0, 0, .08); }
  .rk-minibar { width: 120px; height: 6px; border-radius: 3px; background: var(--soft); overflow: hidden; }
  .rk-minibar span { display: block; height: 100%; border-radius: 3px; background: var(--ink); }

  .rk-empty { padding: 40px 12px; text-align: center; font-size: 15.5px; color: var(--sub); line-height: 1.7; }
  .rk-empty strong { display: block; margin-bottom: 4px; font-size: 17px; color: var(--ink); }
  .rk-error { padding: 14px 16px; border-radius: 12px; border: 1px solid #efd9c7; background: #fdf6f0; color: #8a4a1c; font-size: 14.5px; font-weight: 600; }

  .rk-btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; height: 46px; padding: 0 20px; border-radius: 12px; border: 1px solid var(--ink); background: var(--ink); color: #fff; font-family: inherit; font-size: 15px; font-weight: 700; cursor: pointer; }
  .rk-btn.ghost { background: #fff; color: var(--ink); border-color: var(--line); }
  .rk-btn:hover { opacity: .9; }

  @media (max-width: 860px) {
    .rk-wrap { width: calc(100% - 28px); }
    .rk-title { font-size: 26px; }
    .rk-phase { text-align: left; }
    .rk-head { padding: 20px 18px; margin-top: 18px; }
    .rk-head-side { align-items: flex-start; }
    .rk-panel { padding: 22px 18px; }
    .rk-verdict { grid-template-columns: 1fr; }
    .rk-verdict-title { font-size: 28px; }
    .rk-stats { grid-template-columns: 1fr 1fr; }
    .rk-stat:nth-child(odd) { padding-left: 0; border-left: none; }
    .rk-stat-value { font-size: 32px; }
    .rk-tabs { gap: 20px; }
    .rk-tab { font-size: 16px; }
    .rk-minibar { display: none; }
  }
`;

/* 행사 하나를 보는 화면의 공용 틀 */
export default function RealtimeLayout({ tab, eventId, summary, loading, loadedAt, refreshing, onRefresh, children }) {
  const navigate = useNavigate();
  const current = REALTIME_TABS.find((t) => t.key === tab) || REALTIME_TABS[0];
  const phase = summary ? livePhase(summary) : null;
  const text = phase ? phaseText(phase) : null;
  const win = summary ? operatingWindow(summary) : null;

  return (
    <div className="rk">
      <style>{rkStyles}</style>
      <RealtimeHeader tab={tab} eventId={eventId} />
      <div className="rk-wrap">
        {loading && !summary ? (
          <PageLoading message="실시간 정보를 불러오는 중이에요" />
        ) : (
          <>
            <header className="rk-head">
              <div>
                <h2 className="rk-title">{summary?.eventName || "행사 정보 없음"}</h2>
                <p className="rk-meta">
                  {summary?.startAt ? <span>{fmtRange(summary.startAt, summary.endAt)}</span> : null}
                  {summary?.location ? <span>{summary.location}</span> : null}
                  {win ? <span>운영 {win.text}</span> : null}
                </p>
              </div>
              {text ? (
                <div className="rk-phase">
                  <span className={`rk-phase-chip ${phase.phase}`}><i />{text.chip}</span>
                  <p className="rk-phase-line">{text.line}</p>
                </div>
              ) : null}
            </header>

            <div className="rk-toolbar">
              <button type="button" className="rk-back" onClick={() => navigate(current.path)}>
                <ArrowLeft size={16} />다른 행사 보기
              </button>
              <div className="rk-updated">
                <span>{loadedAt ? `${fmtHM(loadedAt)} 기준 · 15초마다 자동 갱신` : ""}</span>
                {onRefresh ? (
                  <button type="button" className="rk-refresh" onClick={onRefresh}>
                    <RefreshCw size={14} className={refreshing ? "spin" : ""} />새로고침
                  </button>
                ) : null}
              </div>
            </div>

            {children}
          </>
        )}
      </div>
    </div>
  );
}

/* 혼잡 단계 4칸 막대 (현재 단계까지 채움) */
export function LevelMeter({ level, levels }) {
  const idx = levels.findIndex((l) => l.key === level?.key);
  return (
    <div>
      <div className="rk-meter">
        {levels.map((l, i) => <span key={l.key} style={i <= idx ? { background: level.color } : undefined} />)}
      </div>
      <div className="rk-meter-cap"><span>여유</span><span>매우 혼잡</span></div>
    </div>
  );
}
