import { Users } from "lucide-react";

const toCount = (value) => {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) return 0;
  return number;
};

export default function ProgramCheckinProgressCard({ programCheckinStatus, loading }) {
  const hasData = Boolean(programCheckinStatus?.programName);
  const checkedIn = toCount(programCheckinStatus?.checkedIn);
  const waiting = toCount(programCheckinStatus?.waiting);
  const fallbackTotal = checkedIn + waiting;
  const totalApply = Math.max(toCount(programCheckinStatus?.totalApply), fallbackTotal);
  const progress = totalApply > 0 ? Math.round((checkedIn / totalApply) * 100) : 0;

  return (
    <section className="ck-card program-checkin-progress-card">
      <div className="ck-card-header">
        <h2 className="ck-card-title">
          <span className="ck-card-title-icon">
            <Users size={14} color="#1a4fd6" />
          </span>
          프로그램 체크인 진행률
        </h2>
        {hasData ? <span className="ck-live-count">진행률 {progress}%</span> : null}
      </div>

      {loading && !hasData ? (
        <div className="ck-empty">프로그램 체크인 진행 상황을 불러오는 중입니다.</div>
      ) : !hasData ? (
        <div className="ck-empty">참여 중인 프로그램 체크인 정보가 없습니다.</div>
      ) : (
        <div className="ck-progress-list">
          <div className="ck-progress-item">
            <div className="ck-progress-name">{programCheckinStatus.programName}</div>
            <div className="ck-progress-meta">체크인 완료 {checkedIn}명</div>
            <div className="ck-progress-meta">대기 {waiting}명</div>

            <div className="ck-progress-track">
              <div className="ck-progress-fill" style={{ width: `${progress}%` }} />
            </div>
            <div className="ck-progress-val">{progress}%</div>
          </div>
        </div>
      )}
    </section>
  );
}
