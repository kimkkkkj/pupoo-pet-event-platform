import { useCallback, useEffect, useMemo, useState } from "react";
import { CreditCard, Loader2, Inbox, CalendarDays, Wallet, Hash, ReceiptText } from "lucide-react";
import PageHeader from "../components/PageHeader";
import PageLoading from "../components/PageLoading";
import { axiosInstance } from "../../../app/http/axiosInstance";
import { tokenStore } from "../../../app/http/tokenStore";

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
  .ph-root {
    box-sizing: border-box;
    font-family: 'Pretendard Variable', 'Pretendard', -apple-system, sans-serif;
    background: #fff;
    min-height: 100vh;
    color: #111;
  }
  .ph-root *, .ph-root *::before, .ph-root *::after { box-sizing: border-box; font-family: inherit; }
  .ph-wrap {
    width: min(1400px, calc(100% - 48px));
    margin: 0 auto;
    padding: 0 0 80px;
  }

  /* ── 상단 요약 (카카오 st) ── */
  .ph-summary {
    display: flex;
    gap: 0;
    margin: 32px 0;
    background: #fff;
    border: 1px solid #e5e7eb;
    border-radius: 14px;
    overflow: hidden;
  }
  .ph-summary-card {
    flex: 1;
    padding: 24px 20px;
    display: flex;
    align-items: center;
    gap: 16px;
    border-right: 1px solid #e5e7eb;
  }
  .ph-summary-card:last-child { border-right: none; }
  .ph-summary-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    flex-shrink: 0;
    background: #d1d5db;
  }
  .ph-summary-dot.dot-green { background: #90C450; }
  .ph-summary-dot.dot-blue { background: #90C450; }
  .ph-summary-text {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .ph-summary-label {
    font-size: 13px;
    font-weight: 500;
    color: #888;
  }
  .ph-summary-val {
    font-size: 24px;
    font-weight: 800;
    color: #222;
    letter-spacing: -0.02em;
    line-height: 1.2;
  }

  /* ── 서브탭 필터 ── */
  .ph-sub-tabs {
    display: flex;
    gap: 8px;
    margin-bottom: 24px;
    background: #f8f9fc;
    border-radius: 999px;
    padding: 4px;
    width: fit-content;
  }
  .ph-sub-tab {
    padding: 10px 24px;
    border-radius: 999px;
    border: none;
    background: transparent;
    color: #9ca3af;
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s;
    white-space: nowrap;
  }
  .ph-sub-tab:hover { color: #374151; }
  .ph-sub-tab.active {
    background: #1f2937;
    color: #fff;
    box-shadow: 0 1px 3px rgba(0,0,0,0.12);
  }

  /* ── 툴바 (검색) ── */
  .ph-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
    flex-wrap: wrap;
    margin-bottom: 24px;
  }
  .ph-toolbar-left {
    display: flex;
    align-items: center;
    gap: 16px;
  }
  .ph-toolbar-title {
    font-size: 18px;
    font-weight: 800;
    color: #111;
  }
  .ph-count {
    font-size: 14px;
    color: #9ca3af;
    font-weight: 600;
    white-space: nowrap;
  }
  .ph-count strong {
    color: #111;
    font-weight: 800;
  }
  .ph-search-wrap {
    display: flex;
    align-items: center;
    background: #fff;
    border: 1px solid #e2e5ea;
    border-radius: 12px;
    height: 48px;
    min-width: 0;
    flex: 0 0 auto;
    width: 320px;
    position: relative;
    transition: border-color 0.15s, box-shadow 0.15s;
  }
  .ph-search-wrap:focus-within {
    border-color: #111827;
    box-shadow: 0 0 0 2px rgba(17,24,39,0.08);
  }
  .ph-search-input {
    width: 100%;
    height: 100%;
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
  .ph-search-input::placeholder { color: #9ca3af; }
  .ph-search-icon {
    position: absolute;
    left: 14px;
    top: 50%;
    transform: translateY(-50%);
    color: #9ca3af;
    pointer-events: none;
  }

  /* ── 카드 리스트 ── */
  .ph-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .ph-card {
    display: flex;
    align-items: center;
    gap: 24px;
    padding: 28px 32px;
    border: 1px solid #f0f0f0;
    border-radius: 16px;
    background: #fff;
    transition: all 0.15s;
  }
  .ph-card:hover {
    background: #f9fafb;
  }
  .ph-card-status {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    width: 80px;
    flex-shrink: 0;
    gap: 4px;
  }
  .ph-status-dot {
    width: 12px;
    height: 12px;
    border-radius: 50%;
  }
  .ph-status-label {
    font-size: 14px;
    font-weight: 700;
  }
  .ph-card-body {
    flex: 1;
    min-width: 0;
  }
  .ph-card-title {
    font-size: 19px;
    font-weight: 800;
    color: #111;
    margin-bottom: 12px;
    line-height: 1.3;
  }
  .ph-card-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
  }
  .ph-meta-item {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 15px;
    color: #6b7280;
    font-weight: 500;
  }
  .ph-meta-item svg {
    color: #9ca3af;
    flex-shrink: 0;
  }
  .ph-card-right {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 10px;
    flex-shrink: 0;
  }
  .ph-amount {
    font-size: 22px;
    font-weight: 900;
    color: #111;
    letter-spacing: -0.03em;
  }
  .ph-refund-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 10px 20px;
    border-radius: 10px;
    border: 1px solid #fecaca;
    background: #fff;
    font-size: 15px;
    font-weight: 600;
    color: #ef4444;
    cursor: pointer;
    font-family: inherit;
    transition: all 0.15s;
    white-space: nowrap;
  }
  .ph-refund-btn:hover { background: #fef2f2; }
  .ph-refund-btn:disabled { opacity: 0.5; cursor: not-allowed; }

  /* ── 합계 ── */
  .ph-total {
    margin-top: 20px;
    padding: 24px;
    border-radius: 16px;
    background: #f9fafb;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .ph-total-label {
    font-size: 17px;
    font-weight: 700;
    color: #6b7280;
  }
  .ph-total-amount {
    font-size: 30px;
    font-weight: 900;
    color: #111;
    letter-spacing: -0.03em;
  }

  /* ── 빈 상태 ── */
  .ph-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 80px 20px;
    gap: 12px;
    color: #d1d5db;
  }
  .ph-empty span {
    font-size: 15px;
    color: #9ca3af;
    font-weight: 500;
  }

  @media (max-width: 768px) {
    .ph-summary { flex-direction: column; }
    .ph-summary-card { border-right: none; border-bottom: 1px solid #e5e7eb; }
    .ph-summary-card:last-child { border-bottom: none; }
    .ph-card {
      flex-direction: column;
      align-items: flex-start;
      gap: 14px;
    }
    .ph-card-status {
      flex-direction: row;
      width: auto;
      gap: 8px;
    }
    .ph-card-right {
      flex-direction: row;
      width: 100%;
      justify-content: space-between;
      align-items: center;
    }
    .ph-toolbar { flex-direction: column; align-items: stretch; gap: 10px; }
    .ph-search-wrap { width: 100%; }
    .ph-sub-tabs {
      width: 100%;
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
      scrollbar-width: none;
      -ms-overflow-style: none;
    }
    .ph-sub-tabs::-webkit-scrollbar { display: none; }
    .ph-sub-tab { padding: 8px 16px; font-size: 14px; }
  }
  @media (max-width: 600px) {
    .ph-wrap { width: calc(100% - 20px); padding: 0 0 48px; }
    .ph-summary { margin: 20px 0; }
    .ph-summary-card { padding: 14px 16px; }
    .ph-summary-val { font-size: 20px; }
    .ph-card { padding: 16px 14px; gap: 10px; }
    .ph-card-title { font-size: 15px; margin-bottom: 6px; }
    .ph-meta-item { font-size: 13px; }
    .ph-amount { font-size: 18px; }
    .ph-refund-btn { font-size: 13px; padding: 8px 14px; }
    .ph-total { padding: 14px 16px; }
    .ph-total-label { font-size: 14px; }
    .ph-total-amount { font-size: 22px; }
  }
`;

function toNumberAmount(amount) {
  const value = Number(amount);
  return Number.isFinite(value) ? value : 0;
}

function formatAmount(amount) {
  const num = toNumberAmount(amount).toLocaleString("ko-KR");
  return <>{num}<span style={{ fontSize: '0.65em', fontWeight: 600, marginLeft: 2 }}>원</span></>;
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
  if (refundStatus === "REQUESTED") return { label: "환불 요청", color: "#ca8a04" };
  if (refundStatus === "APPROVED") return { label: "환불 승인", color: "#3DBFA0" };
  if (refundStatus === "REJECTED") return { label: "환불 거절", color: "#ef4444" };
  if (refundStatus === "REFUNDED") return { label: "환불 완료", color: "#6b7280" };

  switch (String(payment?.status || "").toUpperCase()) {
    case "APPROVED": return { label: "결제 완료", color: "#90C450" };
    case "REQUESTED": return { label: "결제 요청", color: "#90C450" };
    case "FAILED": return { label: "결제 실패", color: "#ef4444" };
    case "CANCELLED": return { label: "취소됨", color: "#ef4444" };
    case "REFUNDED": return { label: "환불 완료", color: "#6b7280" };
    default: return { label: payment?.status || "-", color: "#6b7280" };
  }
}

export default function PaymentHistory({ onNavigate }) {
  const currentPath = "/registration/paymenthistory";
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [payments, setPayments] = useState([]);
  const [refunds, setRefunds] = useState([]);
  const [refundingId, setRefundingId] = useState(null);

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

  const handleRefund = async (payment) => {
    const paymentId = payment?.paymentId;
    if (!paymentId || payment?.status !== "APPROVED" || payment?.refund || refundingId) return;

    const autoRefund = isAutoRefundEligible(payment);
    const confirmed = window.confirm(
      autoRefund
        ? "행사 시작 전 환불은 자동으로 처리됩니다. 환불하시겠습니까?"
        : "행사 시작 후 환불은 관리자 승인이 필요합니다. 환불을 신청하시겠습니까?",
    );
    if (!confirmed) return;

    let reason = autoRefund ? "행사 시작 전 자동 환불 요청" : "";
    if (!autoRefund) {
      const input = window.prompt("환불 사유를 입력해주세요.", "개인 사정");
      if (input == null) return;
      reason = String(input || "").trim();
      if (!reason) { window.alert("환불 사유를 입력해주세요."); return; }
    }

    setRefundingId(paymentId);
    try {
      await axiosInstance.post("/api/refunds", { paymentId, refundAmount: toNumberAmount(payment?.amount), reason });
      await loadHistory();
      window.alert(autoRefund ? "환불이 완료되었습니다." : "환불 요청이 접수되었습니다.");
    } catch (err) {
      window.alert(err?.response?.data?.error?.message || err?.response?.data?.message || "환불 처리 중 오류가 발생했습니다.");
    } finally {
      setRefundingId(null);
    }
  };

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
        bgColor="#fff"
      />

      <div className="ph-wrap">
        {/* 요약 */}
        <div className="ph-summary">
          <div className="ph-summary-card">
            <div className="ph-summary-dot" />
            <div className="ph-summary-text">
              <div className="ph-summary-label">전체 결제</div>
              <div className="ph-summary-val">{stats.total}</div>
            </div>
          </div>
          <div className="ph-summary-card">
            <div className="ph-summary-dot dot-green" />
            <div className="ph-summary-text">
              <div className="ph-summary-label">결제 완료</div>
              <div className="ph-summary-val">{stats.approved}</div>
            </div>
          </div>
          <div className="ph-summary-card">
            <div className="ph-summary-dot dot-blue" />
            <div className="ph-summary-text">
              <div className="ph-summary-label">유효 금액</div>
              <div className="ph-summary-val">{formatAmount(stats.amount)}</div>
            </div>
          </div>
        </div>

        {/* 툴바 */}
        <div className="ph-toolbar">
          <div className="ph-toolbar-left">
            <span className="ph-toolbar-title">결제 내역</span>
            {!loading && <span className="ph-count"><strong>{stats.total}</strong>건</span>}
          </div>
        </div>

        {/* 리스트 */}
        {loading ? (
          <PageLoading />
        ) : (error || paymentRows.length === 0) ? (
          <div className="ph-empty">
            <Inbox size={48} strokeWidth={1.2} />
            <span>{error || "결제 내역이 없습니다."}</span>
          </div>
        ) : (
          <>
            <div className="ph-list">
              {paymentRows.map((payment) => {
                const meta = getStatusMeta(payment);
                const canRefund = payment.status === "APPROVED" && !payment.refund;
                const refundLabel = isAutoRefundEligible(payment) ? "환불" : "환불 신청";

                return (
                  <div key={payment.paymentId || payment.orderNo} className="ph-card">
                    {/* 상태 */}
                    <div className="ph-card-status">
                      <div className="ph-status-dot" style={{ background: meta.color }} />
                      <span className="ph-status-label" style={{ color: meta.color }}>{meta.label}</span>
                    </div>

                    {/* 본문 */}
                    <div className="ph-card-body">
                      <div className="ph-card-title">{payment.eventTitle || "행사 결제"}</div>
                      <div className="ph-card-meta">
                        <span className="ph-meta-item">
                          <Wallet size={14} />
                          {methodLabelOf(payment.paymentMethod)}
                        </span>
                        <span className="ph-meta-item">
                          <CalendarDays size={14} />
                          {formatDateTime(payment.requestedAt)}
                        </span>
                        <span className="ph-meta-item">
                          <Hash size={14} />
                          {payment.orderNo || `PAY-${payment.paymentId}`}
                        </span>
                      </div>
                    </div>

                    {/* 금액 + 환불 */}
                    <div className="ph-card-right">
                      <span className="ph-amount">{formatAmount(payment.amount)}</span>
                      {canRefund && (
                        <button
                          type="button"
                          className="ph-refund-btn"
                          onClick={() => handleRefund(payment)}
                          disabled={refundingId === payment.paymentId}
                        >
                          {refundingId === payment.paymentId ? <><Loader2 size={13} /> 처리 중</> : refundLabel}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 합계 */}
            <div className="ph-total">
              <span className="ph-total-label">유효 결제 금액</span>
              <span className="ph-total-amount">{formatAmount(stats.amount)}</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
