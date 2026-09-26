import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CreditCard, Inbox, CalendarDays, Wallet, Hash, ReceiptText, RotateCcw } from "lucide-react";
import PageHeader from "../components/PageHeader";
import PageLoading from "../components/PageLoading";
import { axiosInstance } from "../../../app/http/axiosInstance";
import { tokenStore } from "../../../app/http/tokenStore";
import { eventApi } from "../../../app/http/eventApi";
import { resolveImageUrl } from "../../../shared/utils/publicAssetUrl";

export const SERVICE_CATEGORIES = [
  { label: "행사 참가 신청", path: "/registration/apply" },
  { label: "신청 내역 조회", path: "/registration/applyhistory" },
  { label: "결제 내역", path: "/registration/paymenthistory" },
  { label: "QR 체크인", path: "/registration/qrcheckin" },
];

export const SUBTITLE_MAP = {
  "/registration/apply": "행사 참가 신청 현황을 확인할 수 있습니다.",
  "/registration/applyhistory": "행사 신청 이력을 확인할 수 있습니다.",
  "/registration/paymenthistory": "결제와 환불 처리 상태를 확인할 수 있습니다.",
  "/registration/qrcheckin": "행사 입장용 QR 코드를 확인할 수 있습니다.",
};

const styles = `
  .ph-root { box-sizing: border-box; font-family: 'Pretendard Variable', 'Pretendard', -apple-system, sans-serif; background: #f8f9fc; min-height: 100vh; color: #111827; }
  .ph-root *, .ph-root *::before, .ph-root *::after { box-sizing: border-box; font-family: inherit; }
  .ph-wrap { width: min(1400px, calc(100% - 48px)); margin: 0 auto; padding: 8px 0 96px; }

  /* 요약: 신청 내역과 같은 큼직한 숫자 카드 */
  .ph-summary { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; margin: 28px 0 24px; }
  .ph-stat {
    display: flex; flex-direction: column; gap: 6px; padding: 20px 22px; border-radius: 18px; border: none; text-align: left;
    background: #fff; box-shadow: 0 0 0 1px rgba(15, 23, 42, .06); cursor: pointer; transition: box-shadow .15s, transform .15s;
  }
  .ph-stat:hover { transform: translateY(-1px); box-shadow: 0 0 0 1px rgba(15, 23, 42, .1), 0 8px 20px rgba(15, 23, 42, .06); }
  .ph-stat.active { box-shadow: 0 0 0 2px #111827; }
  .ph-stat.static { cursor: default; }
  .ph-stat.static:hover { transform: none; box-shadow: 0 0 0 1px rgba(15, 23, 42, .06); }
  .ph-stat-label { font-size: 14px; font-weight: 700; color: #6b7280; display: inline-flex; align-items: center; gap: 7px; }
  .ph-stat-label i { width: 8px; height: 8px; border-radius: 50%; background: #d1d5db; }
  .ph-stat-val { font-size: 34px; font-weight: 900; letter-spacing: -0.5px; line-height: 1.1; color: #111827; }
  .ph-stat-val small { font-size: 16px; font-weight: 700; color: #9ca3af; margin-left: 3px; }
  .ph-stat.done .ph-stat-label i { background: #22c55e; }
  .ph-stat.refund .ph-stat-label i { background: #f59e0b; }
  .ph-stat.money .ph-stat-label i { background: #6FA436; }
  .ph-stat.money .ph-stat-val { color: #4d7a1f; }

  /* 필터 */
  .ph-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; }
  .ph-toolbar-title { font-size: 18px; font-weight: 900; color: #111827; }
  .ph-toolbar-title em { font-style: normal; margin-left: 6px; font-size: 15px; font-weight: 700; color: #9ca3af; }
  .ph-filters { display: flex; gap: 6px; flex-wrap: wrap; }
  .ph-filter {
    height: 42px; padding: 0 16px; border-radius: 999px; border: 1.5px solid #e5e7eb; background: #fff;
    font-size: 14.5px; font-weight: 700; color: #4b5563; cursor: pointer; display: inline-flex; align-items: center; gap: 6px;
  }
  .ph-filter:hover { border-color: #cbd5e1; color: #111827; }
  .ph-filter.active { background: #111827; border-color: #111827; color: #fff; }
  .ph-filter em { font-style: normal; font-size: 12.5px; font-weight: 800; opacity: .7; }

  /* 카드 */
  .ph-list { display: flex; flex-direction: column; gap: 14px; }
  .ph-card {
    display: grid; grid-template-columns: 120px minmax(0, 1fr) auto; align-items: stretch;
    background: #fff; border-radius: 20px; overflow: hidden; box-shadow: 0 0 0 1px rgba(15, 23, 42, .06), 0 6px 18px rgba(15, 23, 42, .04);
  }
  .ph-thumb { position: relative; background: #eef1f4; overflow: hidden; min-height: 150px; display: flex; align-items: center; justify-content: center; color: #cbd5e1; }
  .ph-thumb img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
  .ph-card.off .ph-thumb img { filter: grayscale(1); opacity: .7; }
  .ph-body { padding: 22px 26px; display: flex; flex-direction: column; justify-content: center; gap: 10px; min-width: 0; }
  .ph-head { display: flex; align-items: center; gap: 10px; min-width: 0; }
  .ph-chip { flex-shrink: 0; display: inline-flex; align-items: center; height: 28px; padding: 0 12px; border-radius: 999px; font-size: 13px; font-weight: 800; }
  .ph-chip.done { background: #ecfdf3; color: #15803d; }
  .ph-chip.wait { background: #eef4ff; color: #1d4ed8; }
  .ph-chip.refund { background: #fff7ed; color: #c2410c; }
  .ph-chip.off { background: #f3f4f6; color: #6b7280; }
  .ph-chip.fail { background: #fef2f2; color: #b91c1c; }
  .ph-title { font-size: 21px; font-weight: 900; letter-spacing: -0.3px; color: #0f172a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .ph-card.off .ph-title { color: #6b7280; }
  .ph-meta { display: flex; flex-wrap: wrap; gap: 6px 18px; }
  .ph-meta span { display: inline-flex; align-items: center; gap: 7px; font-size: 15px; font-weight: 500; color: #4b5563; }
  .ph-meta svg { color: #9ca3af; flex-shrink: 0; }
  .ph-meta .order { font-size: 13.5px; color: #9ca3af; font-variant-numeric: tabular-nums; }

  .ph-side { display: flex; flex-direction: column; align-items: flex-end; justify-content: center; gap: 10px; padding: 22px 26px 22px 0; }
  .ph-amount { font-size: 26px; font-weight: 900; letter-spacing: -0.4px; color: #111827; white-space: nowrap; }
  .ph-amount small { font-size: 15px; font-weight: 700; margin-left: 2px; }
  .ph-card.off .ph-amount { color: #9ca3af; text-decoration: line-through; text-decoration-thickness: 2px; }
  .ph-refund-btn {
    height: 42px; padding: 0 18px; border-radius: 12px; border: 1.5px solid #e5e7eb; background: #fff; color: #4b5563;
    font-size: 14.5px; font-weight: 800; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; white-space: nowrap;
  }
  .ph-refund-btn:hover:not(:disabled) { border-color: #fca5a5; color: #b91c1c; background: #fff5f5; }
  .ph-refund-btn:disabled { opacity: .6; cursor: default; }
  .ph-refund-btn .spin { animation: ph-spin .8s linear infinite; }
  @keyframes ph-spin { to { transform: rotate(360deg); } }

  /* 합계 */
  .ph-total {
    display: flex; align-items: center; justify-content: space-between; margin-top: 16px; padding: 20px 26px; border-radius: 18px;
    background: #111827; color: #fff;
  }
  .ph-total-label { font-size: 16px; font-weight: 700; color: rgba(255,255,255,.8); }
  .ph-total-amount { font-size: 28px; font-weight: 900; letter-spacing: -0.4px; }
  .ph-total-amount small { font-size: 16px; font-weight: 700; margin-left: 2px; }

  /* 빈 상태·오류 (신청 내역과 같은 모양) */
  .ph-empty { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 80px 20px; color: #d1d5db; }
  .ph-empty span { font-size: 15px; color: #9ca3af; font-weight: 500; }

  @media (max-width: 860px) {
    .ph-summary { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .ph-toolbar { flex-direction: column; align-items: flex-start; }
    .ph-card { grid-template-columns: 96px minmax(0, 1fr); }
    .ph-side { grid-column: 1 / -1; flex-direction: row; justify-content: space-between; align-items: center; padding: 0 18px 18px; }
  }
  @media (max-width: 600px) {
    .ph-wrap { width: calc(100% - 28px); padding-bottom: 56px; }
    .ph-stat { padding: 16px; }
    .ph-stat-val { font-size: 26px; }
    .ph-body { padding: 16px; }
    .ph-head { flex-direction: column; align-items: flex-start; gap: 6px; }
    .ph-title { font-size: 18px; white-space: normal; }
    .ph-meta span { font-size: 14px; }
    .ph-thumb { min-height: 130px; }
    .ph-amount { font-size: 22px; }
    .ph-total { padding: 16px 18px; }
    .ph-total-amount { font-size: 22px; }
  }
`;

function toNumberAmount(amount) {
  const value = Number(amount);
  return Number.isFinite(value) ? value : 0;
}

function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function parseDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function isAutoRefundEligible(payment) {
  const startAt = parseDate(payment?.eventStartAt);
  if (!startAt) return true;
  return Date.now() < startAt.getTime();
}

function methodLabelOf(paymentMethod) {
  switch (String(paymentMethod || "").toUpperCase()) {
    case "KAKAOPAY": return "카카오페이";
    case "CARD": return "카드";
    case "BANK": return "계좌이체";
    default: return paymentMethod || "기타";
  }
}

function getStatusMeta(payment) {
  const refundStatus = String(payment?.refund?.status || "").toUpperCase();
  if (refundStatus === "REQUESTED") return { label: "환불 요청", tone: "refund" };
  if (refundStatus === "APPROVED") return { label: "환불 승인", tone: "refund" };
  if (refundStatus === "REJECTED") return { label: "환불 거절", tone: "fail" };
  if (refundStatus === "REFUNDED") return { label: "환불 완료", tone: "off" };

  switch (String(payment?.status || "").toUpperCase()) {
    case "APPROVED": return { label: "결제 완료", tone: "done" };
    case "REQUESTED": return { label: "결제 진행 중", tone: "wait" };
    case "FAILED": return { label: "결제 실패", tone: "fail" };
    case "CANCELLED": return { label: "결제 취소", tone: "off" };
    case "REFUNDED": return { label: "환불 완료", tone: "off" };
    default: return { label: payment?.status || "-", tone: "off" };
  }
}

// 필터 묶음: 결제 완료 / 환불(요청·승인·완료·거절) / 실패·취소
function filterOf(payment) {
  if (payment?.refund || String(payment?.status || "").toUpperCase() === "REFUNDED") return "refund";
  const s = String(payment?.status || "").toUpperCase();
  if (s === "APPROVED") return "done";
  if (s === "FAILED" || s === "CANCELLED") return "off";
  return "wait";
}

const FILTERS = [
  { key: "all", label: "전체" },
  { key: "done", label: "결제 완료" },
  { key: "refund", label: "환불" },
  { key: "off", label: "실패 · 취소" },
];

export default function PaymentHistory({ onNavigate }) {
  const navigate = useNavigate();
  const currentPath = "/registration/paymenthistory";
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [payments, setPayments] = useState([]);
  const [refunds, setRefunds] = useState([]);
  const [filter, setFilter] = useState("all");
  const [posterById, setPosterById] = useState({});

  const loadHistory = useCallback(async () => {
    if (!tokenStore.getAccess()) {
      setError("로그인이 필요합니다.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const [paymentsRes, refundsRes] = await Promise.all([
        axiosInstance.get("/api/payments/my", { params: { page: 0, size: 20, sort: "requestedAt,desc" } }),
        axiosInstance.get("/api/refunds/my", { params: { page: 0, size: 200, sort: "requestedAt,desc" } }),
      ]);
      setPayments(paymentsRes?.data?.data?.content ?? []);
      setRefunds(refundsRes?.data?.data?.content ?? []);
    } catch (err) {
      setError(err?.response?.data?.error?.message || err?.response?.data?.message || "결제 내역을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  useEffect(() => {
    const ids = [...new Set(payments.map((p) => p?.eventId).filter(Boolean))].filter((id) => !(id in posterById));
    if (!ids.length) return undefined;
    let alive = true;
    Promise.all(ids.map(async (id) => {
      try {
        const res = await eventApi.getEventDetail(id);
        const url = res?.data?.data?.imageUrl;
        return [id, url ? resolveImageUrl(url) : ""];
      } catch { return [id, ""]; }
    })).then((entries) => { if (alive) setPosterById((prev) => ({ ...prev, ...Object.fromEntries(entries) })); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payments]);

  const refundIndex = useMemo(
    () => refunds.reduce((acc, r) => { if (r?.paymentId != null) acc[String(r.paymentId)] = r; return acc; }, {}),
    [refunds],
  );

  const paymentRows = useMemo(
    () => payments.map((p) => ({ ...p, refund: refundIndex[String(p?.paymentId)] || null })),
    [payments, refundIndex],
  );

  const stats = useMemo(() => {
    const approved = paymentRows.filter((p) => p.status === "APPROVED" && !p.refund);
    return {
      total: paymentRows.length,
      approved: approved.length,
      amount: approved.reduce((s, p) => s + toNumberAmount(p.amount), 0),
    };
  }, [paymentRows]);

  // 환불은 전용 화면에서 사유를 받고 진행한다
  const handleRefund = (payment) => {
    if (!payment?.paymentId || payment?.status !== "APPROVED" || payment?.refund) return;
    navigate(`/payment/refund?paymentId=${payment.paymentId}`);
  };

  const counts = useMemo(() => {
    const c = (key) => paymentRows.filter((p) => filterOf(p) === key).length;
    return { all: paymentRows.length, done: c("done"), refund: c("refund"), off: c("off") };
  }, [paymentRows]);

  const visibleRows = useMemo(
    () => (filter === "all" ? paymentRows : paymentRows.filter((p) => filterOf(p) === filter)),
    [filter, paymentRows],
  );

  const won = (amount) => <>{toNumberAmount(amount).toLocaleString("ko-KR")}<small>원</small></>;

  const summary = [
    { key: "all", label: "전체 결제", tone: "", value: <>{counts.all}<small>건</small></> },
    { key: "done", label: "결제 완료", tone: "done", value: <>{counts.done}<small>건</small></> },
    { key: "refund", label: "환불", tone: "refund", value: <>{counts.refund}<small>건</small></> },
    { key: null, label: "유효 결제 금액", tone: "money", value: won(stats.amount) },
  ];

  return (
    <div className="ph-root">
      <style>{styles}</style>

      <PageHeader
        title="결제 내역"
        icon={<CreditCard size={40} strokeWidth={1.8} style={{ color: "#90C450" }} />}
        subtitle={SUBTITLE_MAP[currentPath]}
        categories={SERVICE_CATEGORIES}
        currentPath={currentPath}
        onNavigate={onNavigate}
        bgColor="#f8f9fc"
      />

      <div className="ph-wrap">
        {/* 요약: 누르면 해당 상태만 보기 (금액 카드는 표시만) */}
        <div className="ph-summary">
          {summary.map((s) => (
            <button
              key={s.label}
              type="button"
              className={`ph-stat ${s.tone}${s.key === null ? " static" : ""}${s.key !== null && filter === s.key ? " active" : ""}`}
              onClick={() => { if (s.key !== null) setFilter(s.key); }}
              tabIndex={s.key === null ? -1 : 0}
            >
              <span className="ph-stat-label"><i />{s.label}</span>
              <span className="ph-stat-val">{s.value}</span>
            </button>
          ))}
        </div>

        <div className="ph-toolbar">
          <span className="ph-toolbar-title">결제 내역{!loading && <em>{visibleRows.length}건</em>}</span>
          <div className="ph-filters">
            {FILTERS.map((f) => (
              <button key={f.key} type="button" className={`ph-filter${filter === f.key ? " active" : ""}`} onClick={() => setFilter(f.key)}>
                {f.label}<em>{counts[f.key]}</em>
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <PageLoading />
        ) : (error || visibleRows.length === 0) ? (
          <div className="ph-empty">
            <Inbox size={48} strokeWidth={1.2} />
            <span>{error || (paymentRows.length ? "조건에 맞는 결제 내역이 없습니다." : "결제 내역이 없습니다.")}</span>
          </div>
        ) : (
          <>
            <div className="ph-list">
              {visibleRows.map((payment) => {
                const meta = getStatusMeta(payment);
                const canRefund = payment.status === "APPROVED" && !payment.refund;
                const refundLabel = isAutoRefundEligible(payment) ? "환불하기" : "환불 신청";
                const poster = payment.eventId ? posterById[payment.eventId] : "";

                return (
                  <div key={payment.paymentId || payment.orderNo} className={`ph-card${meta.tone === "off" || meta.tone === "fail" ? " off" : ""}`}>
                    <div className="ph-thumb">
                      {poster ? <img src={poster} alt="" loading="lazy" /> : <ReceiptText size={30} />}
                    </div>

                    <div className="ph-body">
                      <div className="ph-head">
                        <span className={`ph-chip ${meta.tone}`}>{meta.label}</span>
                        <span className="ph-title">{payment.eventTitle || "행사 결제"}</span>
                      </div>
                      <div className="ph-meta">
                        <span><Wallet size={16} />{methodLabelOf(payment.paymentMethod)}</span>
                        <span><CalendarDays size={16} />{formatDateTime(payment.requestedAt)}</span>
                        <span className="order"><Hash size={14} />{payment.orderNo || `PAY-${payment.paymentId}`}</span>
                      </div>
                    </div>

                    <div className="ph-side">
                      <span className="ph-amount">{won(payment.amount)}</span>
                      {canRefund && (
                        <button
                          type="button"
                          className="ph-refund-btn"
                          onClick={() => handleRefund(payment)}
                        >
                          <RotateCcw size={15} />{refundLabel}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="ph-total">
              <span className="ph-total-label">유효 결제 금액</span>
              <span className="ph-total-amount">{won(stats.amount)}</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
