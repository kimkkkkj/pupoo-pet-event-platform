import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Search, TicketCheck, ArrowRight, ClipboardList, CalendarDays, MapPin, ChevronRight, Check } from "lucide-react";
import PageHeader from "../components/PageHeader";
import PageLoading from "../components/PageLoading";
import { eventApi } from "../../../app/http/eventApi";
import { axiosInstance } from "../../../app/http/axiosInstance";
import { tokenStore } from "../../../app/http/tokenStore";
import { resolveImageUrl } from "../../../shared/utils/publicAssetUrl";

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

const styles = `
  .reg-root {
    box-sizing: border-box;
    font-family: inherit;
    background: #f8f9fc;
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

  /* ── 신청 방법 3단계 ── */
  .rt-steps { display: flex; align-items: center; gap: 10px; margin-bottom: 20px; padding: 14px 18px; background: #fff; border: 1px solid #e8eaee; border-radius: 16px; flex-wrap: wrap; }
  .rt-steps-title { font-size: 14px; font-weight: 800; color: #111827; margin-right: 6px; }
  .rt-step { display: inline-flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 700; color: #374151; }
  .rt-step i { font-style: normal; width: 24px; height: 24px; border-radius: 50%; background: #eef6e3; color: #4d7a1f; font-size: 12px; font-weight: 900; display: flex; align-items: center; justify-content: center; }
  .rt-step-arrow { color: #cbd5e1; }

  /* ── 티켓 카드 ── */
  .rt-list { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
  .rt-ticket {
    --notch: #f8f9fc;
    position: relative; display: grid; grid-template-columns: 124px minmax(0, 1fr) 176px;
    background: #fff; border: 1px solid #e5e7eb; border-radius: 18px; overflow: hidden;
    cursor: pointer; transition: box-shadow 0.2s, transform 0.2s, border-color 0.2s;
  }
  .rt-ticket:hover { box-shadow: 0 12px 30px rgba(15,23,42,0.08); transform: translateY(-2px); }
  .rt-ticket.selected { border-color: #b5d98a; box-shadow: 0 0 0 3px rgba(144,196,80,0.15); }
  .rt-poster { position: relative; background: #eef0f3; overflow: hidden; isolation: isolate; min-height: 166px; }
  .rt-poster img.bg { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; filter: blur(16px) brightness(0.95); transform: scale(1.2); }
  .rt-poster img.fg { position: relative; z-index: 1; width: 100%; height: 100%; object-fit: contain; display: block; }
  .rt-poster-empty { height: 100%; display: flex; align-items: center; justify-content: center; color: #cbd5e1; }
  .rt-body { padding: 18px 20px; min-width: 0; display: flex; flex-direction: column; gap: 8px; }
  .rt-top { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
  .rt-chip { display: inline-flex; align-items: center; gap: 5px; height: 24px; padding: 0 10px; border-radius: 999px; font-size: 12px; font-weight: 800; }
  .rt-chip.ongoing { background: #ecfdf3; color: #15803d; }
  .rt-chip.planned { background: #eef4ff; color: #1d4ed8; }
  .rt-chip-dot { width: 6px; height: 6px; border-radius: 50%; background: #22c55e; animation: rt-pulse 1.4s ease-in-out infinite; }
  @keyframes rt-pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.35; } }
  .rt-due { font-size: 12.5px; font-weight: 700; color: #6b7280; }
  .rt-name { font-size: 19px; font-weight: 900; color: #0f172a; letter-spacing: -0.3px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .rt-meta { display: flex; flex-direction: column; gap: 4px; margin-top: 2px; }
  .rt-meta span { display: inline-flex; align-items: center; gap: 6px; font-size: 13.5px; color: #4b5563; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .rt-meta svg { color: #9ca3af; flex-shrink: 0; }

  /* 절취선: 점선 + 위아래 반원 홈 */
  .rt-stub { position: relative; border-left: 2px dashed #e5e7eb; padding: 18px 16px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; text-align: center; background: #fcfdfb; }
  .rt-stub::before, .rt-stub::after { content: ""; position: absolute; left: -11px; width: 20px; height: 20px; border-radius: 50%; background: var(--notch); border: 1px solid #e5e7eb; }
  .rt-stub::before { top: -11px; }
  .rt-stub::after { bottom: -11px; }
  .rt-price-label { font-size: 12px; font-weight: 700; color: #9ca3af; }
  .rt-price { font-size: 22px; font-weight: 900; color: #111827; letter-spacing: -0.4px; line-height: 1; }
  .rt-price.free { color: #15803d; }
  .rt-btn {
    width: 100%; height: 42px; border-radius: 12px; border: none; cursor: pointer;
    display: inline-flex; align-items: center; justify-content: center; gap: 6px;
    font-size: 14.5px; font-weight: 800; background: #6FA436; color: #fff;
    box-shadow: 0 4px 12px rgba(111,164,54,0.28); transition: background 0.15s, transform 0.15s;
  }
  .rt-btn:hover:not(:disabled) { background: #5E8F2A; transform: translateY(-1px); }
  .rt-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .rt-btn.outline { background: #fff; color: #374151; border: 1px solid #e2e8f0; box-shadow: none; }
  .rt-btn.outline:hover:not(:disabled) { background: #f8f9fc; }
  .rt-state { display: inline-flex; align-items: center; gap: 5px; font-size: 12.5px; font-weight: 800; padding: 3px 10px; border-radius: 999px; }
  /* 결제 대기: 놓치지 않도록 진한 빨강 + 깜빡이는 점 */
  .rt-state.pending { background: #dc2626; color: #fff; font-size: 11.5px; padding: 2px 9px; }
  .rt-state.pending::before { content: ""; width: 5px; height: 5px; border-radius: 50%; background: #fff; animation: rt-pulse 1.4s ease-in-out infinite; }
  .rt-state.done { background: #ecfdf3; color: #15803d; }
  .rt-link { border: none; background: none; padding: 0; font-size: 12.5px; font-weight: 600; color: #9ca3af; cursor: pointer; text-decoration: underline; text-underline-offset: 2px; }
  .rt-link:hover { color: #b91c1c; }

  @media (max-width: 1100px) { .rt-list { grid-template-columns: 1fr; } }
  @media (max-width: 640px) {
    .rt-ticket { grid-template-columns: 96px minmax(0, 1fr); }
    .rt-stub { grid-column: 1 / -1; border-left: none; border-top: 2px dashed #e5e7eb; flex-direction: row; justify-content: space-between; }
    .rt-stub::before { top: -11px; left: -11px; }
    .rt-stub::after { top: -11px; bottom: auto; left: auto; right: -11px; }
    .rt-stub .rt-btn { width: auto; padding: 0 18px; }
    .rt-name { font-size: 17px; }
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

const KO_DAYS = ["일", "월", "화", "수", "목", "금", "토"];
function formatDateWithDay(value) {
  const m = value ? String(value).match(/^(\d{4})-(\d{2})-(\d{2})/) : null;
  if (!m) return "일정 미정";
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return `${m[1]}.${m[2]}.${m[3]} (${KO_DAYS[d.getDay()]})`;
}

// 진행 중: 마감일과 남은 일수 / 예정: 시작까지 D-day
function getDueText(ev) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const toDay = (v) => {
    const m = v ? String(v).match(/^(\d{4})-(\d{2})-(\d{2})/) : null;
    return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
  };
  if (ev?.status === "PLANNED") {
    const s = toDay(ev.startAt);
    if (!s) return "";
    const d = Math.round((s - today) / 86400000);
    return d > 0 ? `시작까지 D-${d}` : "곧 시작";
  }
  const e = toDay(ev?.endAt);
  if (!e) return "";
  const left = Math.round((e - today) / 86400000);
  const md = `${e.getMonth() + 1}.${String(e.getDate()).padStart(2, "0")}`;
  return left <= 0 ? `${md} 마감 · 오늘 마감` : `${md} 마감 · ${left}일 남음`;
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
          <>
          {/* 신청 방법 3단계 */}
          <div className="rt-steps">
            <span className="rt-steps-title">신청 방법</span>
            <span className="rt-step"><i>1</i>행사 선택</span>
            <ChevronRight size={16} className="rt-step-arrow" />
            <span className="rt-step"><i>2</i>신청 · 결제</span>
            <ChevronRight size={16} className="rt-step-arrow" />
            <span className="rt-step"><i>3</i>현장 QR 체크인</span>
          </div>

          <div className="rt-list">
            {filteredEvents.map((ev) => {
              const selected = Number(ev.eventId) === Number(selectedEventId);
              const registration = registrationByEvent[ev.eventId] || null;
              const registrationStatus = String(registration?.status || "").toUpperCase();
              const isApplied = registrationStatus === "APPLIED" || registrationStatus === "신청완료";
              const isApproved = registrationStatus === "APPROVED" || registrationStatus === "승인완료";
              const priceText = formatPrice(ev.baseFee);
              const isFree = priceText === "무료";
              const isOngoing = ev.status === "ONGOING";
              const poster = ev.imageUrl ? resolveImageUrl(ev.imageUrl) : "";
              return (
                <div
                  key={ev.eventId}
                  className={`rt-ticket${selected ? " selected" : ""}`}
                  onClick={() => setSelectedEventId(ev.eventId)}
                >
                  <div className="rt-poster">
                    {poster ? (
                      <>
                        <img className="bg" src={poster} alt="" aria-hidden="true" />
                        <img className="fg" src={poster} alt={ev.eventName} loading="lazy" />
                      </>
                    ) : (
                      <div className="rt-poster-empty"><TicketCheck size={28} /></div>
                    )}
                  </div>

                  <div className="rt-body">
                    <div className="rt-top">
                      <span className={`rt-chip ${isOngoing ? "ongoing" : "planned"}`}>
                        {isOngoing && <span className="rt-chip-dot" />}
                        {isOngoing ? "진행 중" : "예정"}
                      </span>
                      <span className="rt-due">{getDueText(ev)}</span>
                    </div>
                    <div className="rt-name">{ev.eventName}</div>
                    <div className="rt-meta">
                      <span><CalendarDays size={14} />{formatDateWithDay(ev.startAt)} – {formatDateWithDay(ev.endAt)}</span>
                      <span><MapPin size={14} />{ev.location || "장소 미정"}</span>
                    </div>
                  </div>

                  {/* 티켓 꼬리: 참가비 + 신청 상태별 버튼 */}
                  <div className="rt-stub">
                    <span className="rt-price-label">참가비</span>
                    <span className={`rt-price${isFree ? " free" : ""}`}>{priceText}</span>
                    {isApproved ? (
                      <>
                        <span className="rt-state done"><Check size={13} strokeWidth={3} />참가 확정</span>
                        <button
                          type="button"
                          className="rt-btn outline"
                          onClick={(e) => { e.stopPropagation(); navigate("/registration/applyhistory"); }}
                        ><ClipboardList size={15} />신청 내역</button>
                      </>
                    ) : isApplied ? (
                      <>
                        <span className="rt-state pending">결제 대기</span>
                        <button
                          type="button"
                          className="rt-btn"
                          onClick={(e) => { e.stopPropagation(); navigateToCheckout(ev.eventId); }}
                          disabled={submitting}
                        ><ArrowRight size={15} />결제하기</button>
                        <button
                          type="button"
                          className="rt-link"
                          onClick={(e) => { e.stopPropagation(); handleCancelRegistration(ev.eventId); }}
                          disabled={cancellingApplyId === registration?.applyId}
                        >{cancellingApplyId === registration?.applyId ? "취소 중..." : "신청 취소"}</button>
                      </>
                    ) : (
                      <button
                        type="button"
                        className="rt-btn"
                        onClick={(e) => { e.stopPropagation(); handleApply(ev.eventId); }}
                        disabled={submitting}
                      >{submitting ? "신청 중..." : <><TicketCheck size={16} />참가 신청</>}</button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          </>
        )}

        {success ? <div className="reg-msg ok">{success}</div> : null}
      </main>
    </div>
  );
}
