import { UserCheck } from "lucide-react";

const STATUS_TEXT = {
  WAITING: "체크인 대기",
  CHECKED_IN: "체크인 완료",
  NOT_STARTED: "시작 전",
  CANCELED: "참여 취소",
  PENDING: "집계 중",
};

const STATUS_TONE = {
  WAITING: "wait",
  CHECKED_IN: "done",
  NOT_STARTED: "pending",
  CANCELED: "cancel",
  PENDING: "pending",
};

const formatPosition = (myCheckin) => {
  if (!myCheckin) return "-";
  const position = Number(myCheckin.myPosition);
  const totalApply = Number(myCheckin.totalApply);
  const totalText = Number.isFinite(totalApply) && totalApply > 0
    ? `${totalApply}명`
    : "집계 중";

  if (myCheckin.status !== "WAITING" || !Number.isFinite(position) || position <= 0) {
    return `집계 중/${totalText}`;
  }
  return `${position}번째/${totalText}`;
};

const formatExpectedWaitTime = (myCheckin) => {
  if (!myCheckin || myCheckin.status !== "WAITING") return "-";
  const text = String(myCheckin.estimatedWaitTime ?? "").trim();
  return text || "집계 중";
};

const getQrImageUrl = (qrInfo, qrImageUrl) =>
  String(qrImageUrl || "").trim()
  || String(
    qrInfo?.originalUrl
    || qrInfo?.qrImageUrl
    || qrInfo?.imageUrl
    || qrInfo?.url
    || "",
  ).trim();

export default function MyCheckinStatusCard({ myCheckin, qrInfo, qrImageUrl, qrLoading }) {
  const programName = myCheckin?.programName || "참여 프로그램 없음";
  const programDescription = String(myCheckin?.programDescription || "").trim();
  const programTime = myCheckin?.programTime || "운영 시간 정보 없음";
  const programLocation = String(myCheckin?.programLocation || "").trim();
  const programMetaText = programLocation ? `${programTime} · ${programLocation}` : programTime;
  const statusKey = String(myCheckin?.status ?? "PENDING").toUpperCase();
  const statusText = STATUS_TEXT[statusKey] || "집계 중";
  const tone = STATUS_TONE[statusKey] || "pending";
  const positionText = formatPosition(myCheckin);
  const expectedWaitTimeText = formatExpectedWaitTime(myCheckin);
  const qrImageSrc = getQrImageUrl(qrInfo, qrImageUrl);

  return (
    <section className="ck-card my-checkin-card">
      <div className="ck-card-header">
        <h2 className="ck-card-title">
          <span className="ck-card-title-icon">
            <UserCheck size={14} color="#1a4fd6" />
          </span>
          내 체크인 상태
        </h2>
        <span className={`ck-status-chip ck-status-chip-${tone}`}>상태: {statusText}</span>
      </div>

      <div className="ck-my-split">
        <div className="ck-my-left">
          <div className="program-name ck-my-status-title">{programName}</div>
          {programDescription ? (
            <div className="ck-my-status-program-desc">{programDescription}</div>
          ) : null}
          <div className="program-time ck-my-status-desc">{programMetaText}</div>
        </div>

        <div className="ck-my-right">
          <div className="ck-my-qr-box">
            {qrLoading ? (
              <div className="ck-my-qr-fallback">QR 불러오는 중...</div>
            ) : qrImageSrc ? (
              <img className="ck-my-qr-img" src={qrImageSrc} alt="내 QR 코드" />
            ) : (
              <div className="ck-my-qr-fallback">QR 없음</div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
