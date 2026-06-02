import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { eventApi } from "../../../../app/http/eventApi";

/**
 * EventList
 * - 배너(사용처)마다 버튼 텍스트/노출/동작을 props로 주입해서 재사용
 */
export default function EventList({
  title = "행사 목록",
  statusList = [],
  pageSize = 10,

  // ✅ 배너별 버튼 정책 주입 (없으면 기본값)
  buttonConfig = {
    showWhen: (ev) => ev.status !== "ENDED" && ev.status !== "CANCELLED",
    primaryText: "사전신청",
    secondaryText: "사전신청확인",
    onPrimary: (ev, navigate) =>
      navigate(`/event/detail?eventId=${ev.eventId}`),
    onSecondary: (ev, navigate) =>
      navigate(`/event/preregister?eventId=${ev.eventId}`),
  },
}) {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [events, setEvents] = useState([]);

  const statusKey = useMemo(() => {
    const list = Array.isArray(statusList) ? statusList : [];
    return list.slice().sort().join(",");
  }, [statusList]);

  const didFetchRef = useRef(false);

  const fetchEvents = async (signal) => {
    setLoading(true);
    setErrorMsg("");

    try {
      if (!statusKey) {
        const res = await eventApi.getEvents({ page: 0, size: pageSize });
        if (signal.aborted) return;
        setEvents(res.data.data.content || []);
        return;
      }

      const statuses = statusKey.split(",");

      if (statuses.length === 1) {
        const res = await eventApi.getEvents({
          status: statuses[0],
          page: 0,
          size: pageSize,
        });
        if (signal.aborted) return;
        setEvents(res.data.data.content || []);
        return;
      }

      const results = await Promise.all(
        statuses.map((s) =>
          eventApi.getEvents({ status: s, page: 0, size: pageSize }),
        ),
      );

      if (signal.aborted) return;

      const merged = results.flatMap((r) => r.data.data.content || []);
      const dedup = Array.from(
        new Map(merged.map((e) => [e.eventId, e])).values(),
      );
      setEvents(dedup);
    } catch (e) {
      if (signal.aborted) return;

      const statusCode = e?.response?.status;
      const msg =
        e?.response?.data?.message ||
        e?.response?.data?.error ||
        e?.message ||
        "이벤트 조회 실패";

      setErrorMsg(statusCode ? `[${statusCode}] ${msg}` : msg);
      setEvents([]);
    } finally {
      if (!signal.aborted) setLoading(false);
    }
  };

  useEffect(() => {
    if (didFetchRef.current) {
      // 필요하면 return;로 막을 수 있음
    }
    didFetchRef.current = true;

    const controller = new AbortController();
    fetchEvents(controller.signal);

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusKey, pageSize]);

  const goDetail = (eventId) => {
    navigate(`/event/detail?eventId=${eventId}`);
  };

  // ✅ config 병합(빠진 값 대비)
  const cfg = {
    showWhen: (ev) => ev.status !== "ENDED" && ev.status !== "CANCELLED",
    primaryText: null,
    secondaryText: null,
    onPrimary: null,
    onSecondary: null,
    ...buttonConfig,
  };

  return (
    <div style={{ padding: 16 }}>
      <h2 style={{ marginBottom: 40 }}>{title}</h2>

      {loading && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 20px", gap: 16 }}>
          <span className="inline-dots" />
          <span style={{ fontSize: 14, fontWeight: 500, color: "#adb5bd" }}>데이터를 불러오는 중입니다</span>
          <style>{`.inline-dots{display:inline-flex;gap:6px}.inline-dots::before,.inline-dots::after,& .inline-dots{content:'';width:12px;height:12px;border-radius:50%;background:#bcc3ce;animation:idot 1.4s ease-in-out infinite both}.inline-dots::before{animation-delay:-0.32s}.inline-dots::after{animation-delay:0s}@keyframes idot{0%,80%,100%{transform:scale(0)}40%{transform:scale(1)}}`}</style>
        </div>
      )}

      {errorMsg && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "80px 20px", gap: 8, color: "#adb5bd", fontSize: 14, fontWeight: 500 }}>
          {errorMsg}
        </div>
      )}

      {!loading && !errorMsg && events.length === 0 && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "80px 20px", color: "#adb5bd", fontSize: 14, fontWeight: 500 }}>조회 결과가 없습니다.</div>
      )}

      <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
        {events.map((ev) => {
          const showButtons = !!cfg.showWhen?.(ev);

          return (
            <div
              key={ev.eventId}
              onClick={() => goDetail(ev.eventId)}
              style={{
                border: "1px solid #ddd",
                borderRadius: 10,
                cursor: "pointer",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "16px 20px",
                gap: 12,
              }}
            >
              {/* 왼쪽: 행사 정보 */}
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700 }}>{ev.eventName}</div>
                <div style={{ opacity: 0.7 }}>status: {ev.status}</div>
                <div style={{ opacity: 0.7 }}>
                  {String(ev.startAt ?? "")} ~ {String(ev.endAt ?? "")}
                </div>
                {ev.location && (
                  <div style={{ opacity: 0.7 }}>location: {ev.location}</div>
                )}
              </div>

              {/* 오른쪽: 버튼(배너별 커스텀 가능) */}
              {showButtons && (cfg.primaryText || cfg.secondaryText) && (
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 10 }}
                >
                  {cfg.primaryText && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        cfg.onPrimary?.(ev, navigate);
                      }}
                      style={{
                        padding: "6px 12px",
                        borderRadius: 8,
                        border: "1px solid #dcdcdc",
                        backgroundColor: "#f8f8f8",
                        fontSize: 14,
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {cfg.primaryText}
                    </button>
                  )}

                  {cfg.secondaryText && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        cfg.onSecondary?.(ev, navigate);
                      }}
                      style={{
                        padding: "6px 12px",
                        borderRadius: 8,
                        border: "1px solid #dcdcdc",
                        backgroundColor: "#f8f8f8",
                        fontSize: 14,
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {cfg.secondaryText}
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
