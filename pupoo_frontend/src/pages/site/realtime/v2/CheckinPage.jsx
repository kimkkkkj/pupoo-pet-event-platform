import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { QrCode } from "lucide-react";
import { adminRealtimeApi } from "../../../../app/http/adminRealtimeApi";
import RealtimeLayout from "./RealtimeLayout";
import { CheckinLanding } from "./RealtimeLandings";
import { clampPct, dateKey, fmtHM, fmtStamp, livePhase, num, toArray, toDate, unwrap, usePolling } from "./realtimeKit";

export default function CheckinPage() {
  const { eventId } = useParams();
  if (!eventId) return <CheckinLanding />;
  return <CheckinView eventId={eventId} />;
}

function CheckinView({ eventId }) {
  const navigate = useNavigate();
  const { data, loading, error, loadedAt, refreshing, refresh } = usePolling(
    async () => unwrap(await adminRealtimeApi.getCheckinStatusSnapshot(eventId)),
    [eventId],
  );

  const view = useMemo(() => {
    if (!data) return null;
    const summary = data.eventSummary || {};
    const now = new Date();
    const phase = livePhase(summary, now);
    const isOpen = phase.phase === "open";
    const s = data.checkinSummary || {};
    const today = dateKey(now);
    const logs = toArray(data.recentCheckinLogs)
      .map((l) => ({ id: l.logId, at: l.checkedAt, place: l.boothName || "행사장 입구", type: String(l.checkType || "").toUpperCase() }))
      .sort((a, b) => (toDate(b.at)?.getTime() ?? 0) - (toDate(a.at)?.getTime() ?? 0));
    const todayIn = logs.filter((l) => l.type === "CHECKIN" && dateKey(l.at) === today).length;
    const todayOut = logs.filter((l) => l.type !== "CHECKIN" && dateKey(l.at) === today).length;
    const programs = toArray(data.programCheckinSummaries).map((p) => ({
      id: p.programId,
      name: p.programTitle || `프로그램 ${p.programId}`,
      place: p.boothName || "",
      approved: num(p.approvedCount || p.appliedCount),
      checked: num(p.checkedInCount),
      waiting: num(p.waitingCount),
      state: p.ended ? "종료" : p.started ? "진행 중" : "시작 전",
    }));
    return {
      summary, phase, isOpen, logs, todayIn, programs,
      // 누적 값(currentInsideCount)은 며칠 전 기록이 남을 수 있어, 오늘 입장·퇴장 기록으로 계산한다
      inside: Math.max(0, todayIn - todayOut),
      total: num(s.totalCheckins),
      approved: num(s.approvedApplicants),
      rate: clampPct(s.checkedInRate),
      qr: num(s.issuedQrCount),
      myQr: data.myQrInfo || null,
    };
  }, [data]);

  const hero = (() => {
    if (!view) return null;
    const { phase, isOpen, inside, total } = view;
    if (isOpen) return { title: <>지금 행사장 안에<br /><b>{inside.toLocaleString()}명</b>이 있어요</>, sub: view.todayIn > 0 ? `오늘 ${view.todayIn}명이 입장했어요 · 행사 기간 누적 ${total.toLocaleString()}명` : `오늘은 아직 입장 기록이 없어요 · 행사 기간 누적 ${total.toLocaleString()}명` };
    const head = phase.phase === "before" ? "아직 입장이 시작되지 않았어요" : phase.phase === "after" ? "오늘 입장이 마감됐어요" : phase.phase === "planned" ? "행사 개막 전이에요" : "종료된 행사예요";
    return { title: head, sub: total > 0 ? `지금까지 누적 ${total.toLocaleString()}명이 입장했어요. 입장은 ${phase.win.text}에 할 수 있어요.` : `입장은 운영 시간(${phase.win.text})에 할 수 있어요.` };
  })();

  return (
    <RealtimeLayout tab="checkin" eventId={eventId} summary={view?.summary} loading={loading} loadedAt={loadedAt} refreshing={refreshing} onRefresh={refresh}>
      {error && !data ? <div className="rk-error">체크인 정보를 불러오지 못했어요. 15초 뒤 자동으로 다시 시도해요.</div> : null}
      {view ? (
        <div className="rk-stack">
          <section className="rk-panel">
            <span className="rk-verdict-label" style={{ color: view.isOpen ? "var(--ink)" : "#78716c" }}>
              <i style={{ background: view.isOpen ? "#3f7d3a" : "var(--mute)" }} />{view.isOpen ? "입장 진행 중" : "입장 시간 아님"}
            </span>
            <h2 className="rk-verdict-title" style={{ fontWeight: 700 }}>{hero.title}</h2>
            <p className="rk-verdict-sub">{hero.sub}</p>
            <div className="rk-stats" style={{ "--cols": 3 }}>
              <div className="rk-stat">
                <div className="rk-stat-label">누적 입장</div>
                <div className="rk-stat-value">{view.total.toLocaleString()}<small>명</small></div>
                <div className="rk-stat-hint">행사 기간 전체</div>
              </div>
              <div className="rk-stat">
                <div className="rk-stat-label">입장률</div>
                <div className="rk-stat-value">{view.rate}<small>%</small></div>
                <div className="rk-stat-hint">참가 확정 {view.approved.toLocaleString()}명 중</div>
              </div>
              <div className="rk-stat">
                <div className="rk-stat-label">발급된 입장 QR</div>
                <div className="rk-stat-value">{view.qr.toLocaleString()}<small>장</small></div>
                <div className="rk-stat-hint">결제 완료 후 자동 발급</div>
              </div>
            </div>
          </section>

          {view.myQr ? (
            <section className="rk-panel" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
              <div>
                <p className="rk-sec-eyebrow">내 입장권</p>
                <h3 className="rk-sec-title">이 행사의 입장 QR이 준비돼 있어요</h3>
              </div>
              <button type="button" className="rk-btn" onClick={() => navigate(`/registration/qrcheckin?eventId=${eventId}`)}>
                <QrCode size={18} />내 QR 보기
              </button>
            </section>
          ) : null}

          {view.programs.length ? (
            <section className="rk-panel">
              <div className="rk-sec-head">
                <div>
                  <p className="rk-sec-eyebrow">프로그램</p>
                  <h3 className="rk-sec-title">프로그램별 체크인</h3>
                  <p className="rk-sec-note">참가 확정 인원 중 몇 명이 체크인했는지 보여드려요.</p>
                </div>
              </div>
              <ul className="rk-list">
                {view.programs.map((p) => {
                  const pct = p.approved > 0 ? Math.min(100, Math.round((p.checked / p.approved) * 100)) : 0;
                  return (
                    <li key={p.id} className="rk-row link" onClick={() => navigate(`/program/detail?programId=${p.id}`)}>
                      <div>
                        <div className="rk-row-name">{p.name}</div>
                        <div className="rk-row-sub">{[p.state, p.place].filter(Boolean).join(" · ")}</div>
                      </div>
                      <div className="rk-row-end">
                        <div className="rk-minibar"><span style={{ width: `${pct}%` }} /></div>
                        <span className="rk-row-big">{p.checked}<small>/ {p.approved}명</small></span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          ) : null}

          <section className="rk-panel">
            <div className="rk-sec-head">
              <div>
                <p className="rk-sec-eyebrow">기록</p>
                <h3 className="rk-sec-title">최근 입장·퇴장</h3>
                <p className="rk-sec-note">개인정보 보호를 위해 장소와 시각만 보여드려요.</p>
              </div>
            </div>
            {view.logs.length === 0 ? (
              <div className="rk-empty"><strong>아직 입장 기록이 없어요</strong>입장이 시작되면 이곳에 순서대로 쌓여요.</div>
            ) : (
              <ul className="rk-list">
                {view.logs.slice(0, 10).map((l) => (
                  <li key={l.id} className="rk-row">
                    <div>
                      <div className="rk-row-name" style={{ fontSize: 16 }}>{l.place}</div>
                      <div className="rk-row-sub">{dateKey(l.at) === dateKey(new Date()) ? `오늘 ${fmtHM(l.at)}` : fmtStamp(l.at)}</div>
                    </div>
                    <span className="rk-state" style={{ color: l.type === "CHECKIN" ? "var(--ink)" : "var(--sub)" }}>
                      <i style={{ background: l.type === "CHECKIN" ? "#3f7d3a" : "var(--mute)" }} />{l.type === "CHECKIN" ? "입장" : "퇴장"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      ) : null}
    </RealtimeLayout>
  );
}
