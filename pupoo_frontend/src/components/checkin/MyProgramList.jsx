import { useMemo, useState } from "react";

const getStatusText = (status) => {
  const normalized = String(status ?? "").toUpperCase();
  return normalized === "CHECKED_IN" ? "참여 완료" : "참여 예정";
};

export default function MyProgramList({
  myPrograms = [],
  participatedEvents = [],
  loading = false,
}) {
  const [openEvents, setOpenEvents] = useState(false);
  const hasParticipatedEvents = participatedEvents.length > 0;
  const eventCountText = useMemo(
    () => `참여한 행사 ${participatedEvents.length}건`,
    [participatedEvents.length],
  );

  return (
    <section
      className="ck-card my-program-list-card"
      style={{ position: "relative", overflow: "visible" }}
    >
      <div className="ck-card-header">
        <h2 className="ck-card-title">내가 신청한 프로그램</h2>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {hasParticipatedEvents ? (
            <button
              type="button"
              onClick={() => setOpenEvents((prev) => !prev)}
              style={{
                border: "1px solid #dbe2ea",
                background: "#fff",
                color: "#374151",
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 700,
                padding: "6px 10px",
                cursor: "pointer",
              }}
              title="참여한 행사 목록 보기"
            >
              {eventCountText}
            </button>
          ) : null}
          <span className="ck-live-count">총 {myPrograms.length}건</span>
        </div>
      </div>
      {openEvents && hasParticipatedEvents ? (
        <div
          style={{
            position: "absolute",
            top: 58,
            right: 22,
            minWidth: 280,
            maxWidth: 380,
            background: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: 10,
            boxShadow: "0 10px 30px rgba(17,24,39,0.12)",
            padding: "10px 12px",
            zIndex: 30,
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 800, color: "#111827", marginBottom: 8 }}>
            참여한 행사 목록
          </div>
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 6 }}>
            {participatedEvents.map((event) => (
              <li key={event.eventId} style={{ fontSize: 12, color: "#374151", lineHeight: 1.4 }}>
                {event.eventName}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {loading && myPrograms.length === 0 ? (
        <div className="ck-empty">프로그램 목록을 불러오는 중입니다.</div>
      ) : myPrograms.length === 0 ? (
        <div className="ck-empty">신청하거나 참여한 프로그램이 없습니다.</div>
      ) : (
        <ul className="program-list ck-my-program-list">
          {myPrograms.map((program, index) => (
            <li
              key={program.programApplyId ?? `${program.programId}-${index}`}
              className="ck-my-program-item"
            >
              <div className="ck-my-program-main">
                <div className="time ck-my-program-time">{program.time}</div>
                <div className="name ck-my-program-title">{program.programName}</div>
              </div>
              <div className="ck-my-program-right">
                <div className="status ck-my-program-meta">
                  상태 : {getStatusText(program.status)}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
