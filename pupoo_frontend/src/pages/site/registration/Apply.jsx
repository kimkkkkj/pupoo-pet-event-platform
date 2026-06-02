import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Search, TicketCheck, ArrowRight, ClipboardList, X } from "lucide-react";
import PageHeader from "../components/PageHeader";
import PageLoading from "../components/PageLoading";
import { eventApi } from "../../../app/http/eventApi";
import { axiosInstance } from "../../../app/http/axiosInstance";
import { tokenStore } from "../../../app/http/tokenStore";

const SERVICE_CATEGORIES = [
  { label: "행사 참가 신청", path: "/registration/apply" },
  { label: "신청 내역 조회", path: "/registration/applyhistory" },
  { label: "결제 내역", path: "/registration/paymenthistory" },
  { label: "QR 체크인", path: "/registration/qrcheckin" },
];

const SUBTITLE_MAP = {
  "/registration/apply": "행사에 참가 신청하세요",
  "/registration/applyhistory": "나의 행사 참가 신청 이력을 확인하세요",
  "/registration/paymenthistory": "결제 완료된 내역을 확인하세요",
  "/registration/qrcheckin": "내 QR 코드를 확인하세요",
};

const CARD_GRADIENTS = [
  "linear-gradient(135deg, #e0dcd4 0%, #c8d8e8 100%)",
  "linear-gradient(135deg, #ddd0e8 0%, #f4ddd0 100%)",
  "linear-gradient(135deg, #cce4df 0%, #d4daf0 100%)",
  "linear-gradient(135deg, #f0e0cc 0%, #e4d0e0 100%)",
];

const styles = `
  .reg-root {
    box-sizing: border-box;
    font-family: inherit;
    background: #fff;
    min-height: 100vh;
    color: #1a1a1a;
  }
  .reg-root *, .reg-root *::before, .reg-root *::after { box-sizing: border-box; font-family: inherit; }
  .reg-container {
    width: min(1400px, calc(100% - 40px));
    margin: 0 auto;
    padding: 36px 0 80px;
  }

  .reg-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 18px;
    gap: 14px;
    flex-wrap: wrap;
  }
  .reg-toolbar-left {
    display: flex;
    align-items: center;
    gap: 0;
    background: #fff;
    border: 1px solid #e2e5ea;
    border-radius: 12px;
    height: 48px;
    width: 420px;
    transition: border-color 0.15s, box-shadow 0.15s;
  }
  .reg-toolbar-left:focus-within {
    border-color: #111827;
    box-shadow: 0 0 0 2px rgba(17,24,39,0.08);
  }
  .reg-search-wrap {
    position: relative;
    display: flex;
    align-items: center;
    flex: 1;
    height: 100%;
  }
  .reg-search-icon {
    position: absolute;
    left: 14px;
    top: 50%;
    transform: translateY(-50%);
    color: #9ca3af;
    pointer-events: none;
  }
  .reg-search-input {
    height: 100%;
    width: 100%;
    padding: 0 16px 0 40px;
    border-radius: 12px;
    border: none;
    background: transparent;
    color: #111827;
    font-size: 14px;
    font-weight: 500;
    outline: none;
    font-family: inherit;
  }
  .reg-search-input::placeholder { color: #9ca3af; font-size: 13px; font-weight: 500; }
  .reg-filter {
    display: flex;
    align-items: center;
    gap: 0;
    border: 1px solid #e5e7eb;
    border-radius: 12px;
    overflow: hidden;
  }
  .reg-filter button {
    height: 44px; padding: 0 22px; border: none;
    background: transparent; color: #6b7280; font-size: 14px; font-weight: 600;
    cursor: pointer; transition: all 0.15s; font-family: inherit;
    white-space: nowrap; display: inline-flex; align-items: center; gap: 6px;
  }
  .reg-filter button + button { border-left: 1px solid #e5e7eb; }
  .reg-filter button:hover { color: #111827; background: #f9fafb; }
  .reg-filter button.active {
    background: #1f2937; color: #fff;
  }
  .reg-filter-count {
    display: inline-flex; align-items: center; justify-content: center;
    min-width: 20px; height: 20px; padding: 0 6px;
    border-radius: 999px; font-size: 11px; font-weight: 700;
    background: rgba(255,255,255,0.2); margin-left: 2px;
  }
  .reg-filter button:not(.active) .reg-filter-count {
    background: #f8f9fc; color: #9ca3af;
  }

  .reg-total {
    font-size: 15px;
    font-weight: 700;
    color: #111827;
  }

  .reg-event-list {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 28px;
  }

  .reg-card {
    background: #fff;
    border-radius: 16px;
    overflow: hidden;
    cursor: pointer;
    transition: box-shadow 0.3s, transform 0.3s;
    display: flex;
    flex-direction: column;
    box-shadow: 0 2px 8px rgba(0,0,0,0.06);
  }
  .reg-card:hover {
    box-shadow: 0 8px 28px rgba(0,0,0,0.12);
    transform: translateY(-4px);
  }

  .reg-card-art {
    height: 220px;
    position: relative;
    overflow: hidden;
  }
  .reg-card-bookmark {
    position: absolute;
    top: 0;
    right: 20px;
    width: 32px;
    height: 40px;
    background: #f5ba42;
    clip-path: polygon(0 0, 100% 0, 100% 100%, 50% 75%, 0 100%);
    z-index: 2;
  }

  .reg-card-body {
    padding: 24px 24px 22px;
    display: flex;
    flex-direction: column;
    flex: 1;
  }
  .reg-card-name {
    font-size: 17px;
    font-weight: 800;
    color: #222;
    line-height: 1.4;
    letter-spacing: -0.02em;
    margin-bottom: 8px;
  }
  .reg-card-meta {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    color: #999;
    font-weight: 500;
    margin-bottom: 16px;
  }
  .reg-card-meta-dot {
    width: 3px;
    height: 3px;
    border-radius: 50%;
    background: #ccc;
    flex-shrink: 0;
  }
  .reg-card-divider {
    height: 1px;
    background: #f0f0f0;
    margin-bottom: 14px;
  }
  .reg-card-bottom {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: auto;
    gap: 12px;
  }
  .reg-card-price {
    font-size: 13px;
    font-weight: 600;
    color: #999;
    flex: 1;
    min-width: 0;
  }
  .reg-card-price.free { color: #059669; }
  .reg-card-actions {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
    justify-content: flex-end;
  }
  .reg-card-apply {
    padding: 8px 18px;
    border: none;
    border-radius: 10px;
    background: #3DBFA0;
    color: #fff;
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
    font-family: inherit;
    transition: background 0.15s, transform 0.1s;
    display: inline-flex;
    align-items: center;
    gap: 5px;
  }
  .reg-card-apply:hover { background: #90C450; }
  .reg-card-apply:active { background: #7ab33e; transform: scale(0.97); }
  .reg-card-apply:disabled { opacity: 0.35; cursor: not-allowed; }
  .reg-card-apply.secondary {
    background: #f8f9fc;
    color: #666;
  }
  .reg-card-apply.secondary:hover { background: #e5e7eb; }
  .reg-card-apply.danger {
    background: #fff1f2;
    color: #e11d48;
  }
  .reg-card-apply.danger:hover { background: #ffe4e6; }

  .reg-msg {
    text-align: center;
    padding: 48px 20px;
    border-radius: 16px;
    font-size: 14px;
    font-weight: 500;
    grid-column: 1 / -1;
  }
  .reg-msg.error {
    background: #fef2f2;
    color: #dc2626;
  }
  .reg-msg.ok { color: #166534; }

  .reg-empty {
    text-align: center;
    padding: 80px 20px;
    color: #bbb;
    font-size: 14px;
    grid-column: 1 / -1;
  }

  @media (max-width: 1100px) {
    .reg-event-list { grid-template-columns: repeat(2, 1fr); }
  }
  @media (max-width: 640px) {
    .reg-event-list { grid-template-columns: 1fr; }
    .reg-container { width: calc(100% - 20px); padding: 20px 0 48px; }
    .reg-toolbar { flex-direction: column; align-items: stretch; gap: 10px; }
    .reg-toolbar-left { width: 100%; }
    .reg-filter { width: 100%; }
    .reg-filter button { flex: 1; justify-content: center; font-size: 13px; padding: 0 14px; height: 40px; }
    .reg-card-body { padding: 16px 16px 14px; }
    .reg-card-art { height: 180px; }
    .reg-card-bottom { flex-direction: column; align-items: stretch; }
    .reg-card-actions { width: 100%; justify-content: stretch; }
    .reg-card-actions .reg-card-apply { flex: 1; justify-content: center; }
  }
`;

function formatDate(value) {
  if (!value) return "일정 미정";
  const s = String(value);
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return "일정 미정";
  return `${m[1]}.${m[2]}.${m[3]}`;
}

function normalizeDateKeyword(value) {
  return String(value || "").trim().replace(/\./g, "-");
}

function formatPrice(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) return "무료";
  return `${amount.toLocaleString()}원`;
}

export default function Apply() {
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = "/registration/apply";

  const [events, setEvents] = useState([]);
  const [statusFilter, setStatusFilter] = useState("ONGOING");
  const [searchKeyword, setSearchKeyword] = useState("");
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [registrationByEvent, setRegistrationByEvent] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [cancellingApplyId, setCancellingApplyId] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let mounted = true;

    const fetchData = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await eventApi.getEvents({ page: 0, size: 100, sort: "startAt,asc" });
        const rows = res?.data?.data?.content ?? [];
        const available = rows
          .filter((e) => e?.status === "ONGOING" || e?.status === "PLANNED")
          .sort((a, b) => {
            const aTime = a?.endAt ? new Date(a.endAt).getTime() : Number.POSITIVE_INFINITY;
            const bTime = b?.endAt ? new Date(b.endAt).getTime() : Number.POSITIVE_INFINITY;
            return aTime - bTime;
          });

        if (!mounted) return;
        setEvents(available);

        const ongoing = available.find((e) => e.status === "ONGOING");
        const planned = available.find((e) => e.status === "PLANNED");
        setSelectedEventId((ongoing ?? planned ?? available[0])?.eventId ?? null);

        if (tokenStore.getAccess()) {
          const regRes = await axiosInstance.get("/api/users/me/event-registrations", {
            params: { page: 0, size: 200, sort: "appliedAt,desc" },
          });
          const regRows = regRes?.data?.data?.content ?? [];
          const map = {};
          for (const row of regRows) {
            if (!row?.eventId || map[row.eventId]) continue;
            map[row.eventId] = {
              applyId: row.applyId,
              status: row.status,
            };
          }
          if (mounted) setRegistrationByEvent(map);
        }
      } catch (e) {
        if (!mounted) return;
        const message =
          e?.response?.data?.error?.message ||
          e?.response?.data?.message ||
          "행사 목록을 불러오지 못했습니다.";
        setError(message);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchData();
    return () => {
      mounted = false;
    };
  }, []);

  const filteredEvents = useMemo(() => {
    const keywordRaw = searchKeyword.trim();
    const keyword = keywordRaw.toLowerCase();
    const keywordDate = normalizeDateKeyword(keywordRaw);
    return events.filter((e) => {
      if (e?.status !== statusFilter) return false;
      if (!keyword) return true;
      const name = String(e?.eventName || "").toLowerCase();
      const location = String(e?.location || "").toLowerCase();
      const startDate = String(e?.startAt || "").slice(0, 10);
      const endDate = String(e?.endAt || "").slice(0, 10);
      return (
        name.includes(keyword) ||
        location.includes(keyword) ||
        startDate.includes(keywordDate) ||
        endDate.includes(keywordDate)
      );
    });
  }, [events, statusFilter, searchKeyword]);

  useEffect(() => {
    if (!filteredEvents.some((e) => Number(e.eventId) === Number(selectedEventId))) {
      setSelectedEventId(filteredEvents[0]?.eventId ?? null);
    }
  }, [filteredEvents, selectedEventId]);

  const navigateToCheckout = (targetEventId) => {
    const targetEvent = events.find((e) => Number(e.eventId) === Number(targetEventId)) || null;
    const amount = Number(targetEvent?.baseFee ?? 0);
    const params = new URLSearchParams({
      eventId: String(targetEventId),
      amount: String(Number.isFinite(amount) ? amount : 0),
      title: targetEvent?.eventName || "",
      returnUrl: location?.pathname || "/",
    });
    navigate(`/payment/checkout?${params.toString()}`);
  };

  const handleApply = async (targetEventId = selectedEventId) => {
    if (!targetEventId || submitting) return;

    if (!tokenStore.getAccess()) {
      navigate("/auth/login", {
        state: { from: `${location.pathname}${location.search}` },
      });
      return;
    }

    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const applyRes = await axiosInstance.post("/api/event-registrations", {
        eventId: Number(targetEventId),
      });
      const appliedRow = applyRes?.data?.data ?? applyRes?.data ?? null;
      setRegistrationByEvent((prev) => ({
        ...prev,
        [targetEventId]: {
          applyId: appliedRow?.applyId ?? prev[targetEventId]?.applyId ?? null,
          status: "APPLIED",
        },
      }));
      navigateToCheckout(targetEventId);
    } catch (e) {
      if (e?.response?.status === 409) {
        navigateToCheckout(targetEventId);
      } else if (e?.response?.status === 401) {
        navigate("/auth/login", {
          state: { from: `${location.pathname}${location.search}` },
        });
      } else {
        const message =
          e?.response?.data?.error?.message ||
          e?.response?.data?.message ||
          "참가 신청에 실패했습니다.";
        setError(message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelRegistration = async (targetEventId) => {
    const registration = registrationByEvent[targetEventId];
    if (!registration?.applyId || cancellingApplyId) return;

    setCancellingApplyId(registration.applyId);
    setError("");
    setSuccess("");
    try {
      await axiosInstance.delete(`/api/event-registrations/${registration.applyId}`);
      setRegistrationByEvent((prev) => {
        const next = { ...prev };
        delete next[targetEventId];
        return next;
      });
      setSuccess("참가 신청을 취소했습니다.");
    } catch (e) {
      const message =
        e?.response?.data?.error?.message ||
        e?.response?.data?.message ||
        "참가 신청 취소에 실패했습니다.";
      setError(message);
    } finally {
      setCancellingApplyId(null);
    }
  };

  return (
    <div className="reg-root">
      <style>{styles}</style>

      <PageHeader
        title="행사 참가 신청"
        icon={<TicketCheck size={40} strokeWidth={1.8} style={{ color: "#90C450" }} />}
        subtitle={SUBTITLE_MAP[currentPath]}
        categories={SERVICE_CATEGORIES}
        bgColor="#fff"
      />

      <main className="reg-container">
        <div className="reg-toolbar">
          <div className="reg-toolbar-left">
            <div className="reg-search-wrap">
              <Search size={15} className="reg-search-icon" />
              <input
                className="reg-search-input"
                type="text"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                placeholder="행사명 또는 장소를 검색하세요"
              />
            </div>
          </div>
          <div className="reg-filter">
            <button type="button" className={statusFilter === "ONGOING" ? "active" : ""} onClick={() => setStatusFilter("ONGOING")}>
              진행 중<span className="reg-filter-count">{events.filter((e) => e.status === "ONGOING").length}</span>
            </button>
            <button type="button" className={statusFilter === "PLANNED" ? "active" : ""} onClick={() => setStatusFilter("PLANNED")}>
              예정<span className="reg-filter-count">{events.filter((e) => e.status === "PLANNED").length}</span>
            </button>
          </div>
        </div>

        {loading ? (
          <PageLoading />
        ) : filteredEvents.length === 0 ? (
          <div className="reg-empty" style={{ fontSize: 14, fontWeight: 500, color: "#adb5bd" }}>신청 가능한 행사가 없습니다.</div>
        ) : (
          <div className="reg-event-list">
            {filteredEvents.map((ev, idx) => {
              const selected = Number(ev.eventId) === Number(selectedEventId);
              const registration = registrationByEvent[ev.eventId] || null;
              const registrationStatus = String(registration?.status || "").toUpperCase();
              const isApplied = registrationStatus === "APPLIED" || registrationStatus === "신청완료";
              const isApproved = registrationStatus === "APPROVED" || registrationStatus === "승인완료";
              const priceText = formatPrice(ev.baseFee);
              const isFree = priceText === "무료";
              const pal = CARD_GRADIENTS[idx % CARD_GRADIENTS.length];
              const statusLabel = ev.status === "ONGOING" ? "진행 중" : ev.status === "PLANNED" ? "예정" : ev.status || "-";
              return (
                <div
                  key={ev.eventId}
                  className={`reg-card${selected ? " selected" : ""}`}
                  onClick={() => setSelectedEventId(ev.eventId)}
                >
                  <div className="reg-card-art" style={{ background: pal }}>
                    <div className="reg-card-bookmark" />
                  </div>
                  <div className="reg-card-body">
                    <div className="reg-card-name">{ev.eventName}</div>
                    <div className="reg-card-meta">
                      <span>{statusLabel}</span>
                      <span className="reg-card-meta-dot" />
                      <span>{formatDate(ev.startAt)} ~ {formatDate(ev.endAt)}</span>
                    </div>
                    <div className="reg-card-divider" />
                    <div className="reg-card-bottom">
                      <span className={`reg-card-price${isFree ? " free" : ""}`}>{ev.location || priceText}</span>
                      {isApproved ? (
                        <button
                          className="reg-card-apply secondary"
                          onClick={(e) => { e.stopPropagation(); navigate("/registration/applyhistory"); }}
                          type="button"
                        ><ClipboardList size={14} />신청내역</button>
                      ) : isApplied ? (
                        <div className="reg-card-actions">
                          <button
                            className="reg-card-apply danger"
                            onClick={(e) => { e.stopPropagation(); handleCancelRegistration(ev.eventId); }}
                            disabled={cancellingApplyId === registration?.applyId}
                            type="button"
                          >
                            {cancellingApplyId === registration?.applyId ? "취소 중..." : <><X size={14} />신청 취소</>}
                          </button>
                          <button
                            className="reg-card-apply secondary"
                            onClick={(e) => { e.stopPropagation(); navigateToCheckout(ev.eventId); }}
                            disabled={submitting}
                            type="button"
                          >
                            <ArrowRight size={14} />결제하기
                          </button>
                        </div>
                      ) : (
                        <button
                          className="reg-card-apply"
                          onClick={(e) => { e.stopPropagation(); handleApply(ev.eventId); }}
                          disabled={submitting}
                          type="button"
                        >{submitting ? "신청 중..." : <><TicketCheck size={14} />참가 신청</>}</button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {success ? <div className="reg-msg ok">{success}</div> : null}
      </main>
    </div>
  );
}
