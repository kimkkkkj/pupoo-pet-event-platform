/**
 * PaymentManage — 결제 관리 (DB 연동)
 *
 * ★ 연동 포인트:
 *   1. 홈(사이트) 사전신청 → /api/events/{id}/payments (결제 생성)
 *   2. 카카오페이 결제 완료 → /api/payments/{id}/approve (승인)
 *   3. 이 페이지에서 결제 내역 조회·환불 처리
 *
 * ★ 환불 정책:
 *   - 이벤트 시작 전: 환불 가능
 *   - 이벤트 시작 후: 환불 불가 (추후 관리자 승인 기능 추가 예정)
 *
 * API:
 *   GET  /api/admin/dashboard/events                      — 행사 목록
 *   GET  /api/admin/dashboard/events/{eventId}/payments    — 결제 목록
 *   POST /api/admin/dashboard/payments/{paymentId}/refund  — 환불 처리
 *   POST /api/admin/dashboard/payments/bulk-refund         — 일괄 환불
 */
import { useState, useEffect, useCallback } from "react";
import {
  Search,
  Check,
  ChevronLeft,
  AlertTriangle,
  CreditCard,
  CalendarDays,
  MapPin,
  ArrowRight,
  RefreshCw,
  Ban,
  Receipt,
  TrendingUp,
  X,
  Loader2,
} from "lucide-react";
import ds, { statusMap } from "../shared/designTokens";
import { Pill } from "../shared/Components";
import { injectEventImages, loadImageCache } from "../shared/eventImageStore";
import { axiosInstance } from "../../../app/http/axiosInstance";
import { getToken } from "../../../api/noticeApi";
import { sortAdminEventsByOperationalPriority } from "../shared/adminStatus";
import { resolveImageUrl } from "../../../shared/utils/publicAssetUrl";
import { Toast, Overlay, Checkbox, StatCard, EmptyState } from "../shared/adminUi";
import EventPicker from "../shared/EventPicker";

/* ── 스타일 ── */
const styles = `
.ev-card-ended { opacity:0.42 !important; filter:grayscale(0.65) !important; pointer-events:none !important; }
.ev-card-ended img { filter:blur(1px) !important; }
.card-manage-btn:active,.card-manage-btn:focus,.card-manage-btn:focus-visible{outline:none!important;box-shadow:none!important;filter:none!important;opacity:1!important;-webkit-tap-highlight-color:transparent;}
@keyframes toastIn{from{opacity:0;transform:translateY(-12px)}to{opacity:1;transform:translateY(0)}}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes slideUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
@keyframes spin{to{transform:rotate(360deg)}}
`;

function getViewportFlags() {
  if (typeof window === "undefined") {
    return { isMobile: false, isTablet: false, isCompact: false };
  }

  const width = window.innerWidth;
  return {
    isMobile: width < 768,
    isTablet: width >= 768 && width < 1024,
    isCompact: width < 1024,
  };
}

/* ── 인증 ── */
function authHeaders() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/* ── 상태 계산 ── */

/* ── 결제 상태 매핑 ── */
const PAY_STATUS = {
  APPROVED: { l: "결제완료", c: ds.green, bg: ds.greenSoft },
  READY: { l: "결제대기", c: ds.amber, bg: ds.amberSoft },
  PENDING: { l: "처리중", c: ds.amber, bg: ds.amberSoft },
  CANCELLED: { l: "취소", c: ds.ink4, bg: ds.lineSoft },
  REFUNDED: { l: "환불완료", c: ds.red, bg: ds.redSoft },
  FAILED: { l: "실패", c: ds.red, bg: ds.redSoft },
};

/* ── 결제수단 매핑 ── */
const METHOD_LABEL = {
  KAKAOPAY: "카카오페이",
  CARD: "카드",
  BANK: "계좌이체",
  NAVERPAY: "네이버페이",
  TOSSPAY: "토스페이",
};

/* ── 날짜·금액 포맷 ── */
function fmtDateTime(dt) {
  if (!dt) return "-";
  const d = new Date(dt);
  const date = `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
  const time = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  return `${date} ${time}`;
}
function fmtAmount(n) {
  const num = Number(n);
  if (!Number.isFinite(num)) return "\u20A90";
  return `\u20A9${num.toLocaleString("ko-KR")}`;
}

/* ── 이벤트 시작 여부 ── */
function hasEventStarted(event) {
  if (!event) return false;
  const startStr = event.startAt || event.date?.split("~")[0]?.trim();
  if (!startStr) return false;
  const start = new Date(
    startStr.includes("T") ? startStr : startStr + "T00:00:00",
  );
  return new Date() >= start;
}

function Spinner({ size = 20 }) {
  return (
    <Loader2
      size={size}
      color={ds.brand}
      style={{ animation: "spin 1s linear infinite" }}
    />
  );
}

/* ══════════════════════════════════════════
   메인 컴포넌트
   ══════════════════════════════════════════ */
export default function PaymentManage({ subTab = "all" }) {
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selected, setSelected] = useState(new Set());
  const [modal, setModal] = useState(null);
  const [toast, setToast] = useState(null);
  const [detailItem, setDetailItem] = useState(null);
  const [viewportWidth, setViewportWidth] = useState(1280);
  // eventFilter는 Dashboard subTab으로 대체

  const showToast = useCallback((msg, type = "success") => {
    setToast({ msg, type });
  }, []);
  const isMobile = viewportWidth < 768;
  const isTablet = viewportWidth >= 768 && viewportWidth < 1024;
  const isCompact = viewportWidth < 1024;

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const syncViewport = () => setViewportWidth(window.innerWidth);
    syncViewport();
    window.addEventListener("resize", syncViewport);
    return () => window.removeEventListener("resize", syncViewport);
  }, []);

  /* ── 행사 목록 로드 ── */
  const calcStatus = (s, e) => {
    if (!s && !e) return "pending";
    const norm = (v) => (v ? v.replace(/\./g, "-").trim() : v);
    const n = new Date();
    const start = s
      ? new Date(norm(s).includes("T") ? norm(s) : norm(s) + "T00:00:00+09:00")
      : null;
    const end = e
      ? new Date(norm(e).includes("T") ? norm(e) : norm(e) + "T23:59:59+09:00")
      : null;
    if (end && !isNaN(end) && n > end) return "ended";
    if (start && !isNaN(start) && n < start) return "pending";
    return "active";
  };

  const loadEvents = async () => {
    setLoading(true);
    try {
      await loadImageCache();
      const res = await axiosInstance.get("/api/admin/dashboard/events", {
        headers: authHeaders(),
      });
      const list = res.data?.data || res.data || [];
      const mapped = list.map((e) => ({
        ...e,
        status: calcStatus(
          e.startAt || e.date?.split("~")[0]?.trim(),
          e.endAt || e.date?.split("~")[1]?.trim(),
        ),
      }));
      setEvents(sortAdminEventsByOperationalPriority(injectEventImages(mapped)));
    } catch (err) {
      console.error("행사 로드 실패:", err);
    } finally {
      setLoading(false);
    }
  };

  /* ── 결제 내역 로드 ── */
  const loadPayments = async (eventId) => {
    setLoadingPayments(true);
    try {
      const res = await axiosInstance.get(
        `/api/admin/dashboard/events/${eventId}/payments`,
        { headers: authHeaders() },
      );
      const list = res.data?.data?.content || res.data?.data || res.data || [];
      setPayments(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error("결제 내역 로드 실패:", err);
      setPayments([]);
    } finally {
      setLoadingPayments(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, []);

  const selectEvent = (ev) => {
    setSelectedEvent(ev);
    setSelected(new Set());
    setSearch("");
    setStatusFilter("ALL");
    const eid = ev.eventId || ev.id?.replace?.("EV-", "") || ev.id;
    loadPayments(eid);
  };

  const goBack = () => {
    setSelectedEvent(null);
    setPayments([]);
    setSelected(new Set());
    setSearch("");
    setStatusFilter("ALL");
  };

  /* ── 환불 처리 ── */
  const handleRefund = async (paymentId) => {
    setModal(null);
    setDetailItem(null);
    try {
      await axiosInstance.post(
        `/api/admin/dashboard/payments/${paymentId}/refund`,
        {},
        { headers: authHeaders() },
      );
      const eid =
        selectedEvent.eventId ||
        selectedEvent.id?.replace?.("EV-", "") ||
        selectedEvent.id;
      await loadPayments(eid);
      showToast("환불이 완료되었습니다.");
    } catch (err) {
      const msg =
        err?.response?.data?.error?.message ||
        err?.response?.data?.message ||
        "환불 처리에 실패했습니다.";
      showToast(msg, "error");
    }
  };

  /* ── 일괄 환불 ── */
  const handleBulkRefund = async () => {
    setModal(null);
    const ids = [...selected];
    try {
      await axiosInstance.post(
        "/api/admin/dashboard/payments/bulk-refund",
        { paymentIds: ids },
        { headers: authHeaders() },
      );
      const eid =
        selectedEvent.eventId ||
        selectedEvent.id?.replace?.("EV-", "") ||
        selectedEvent.id;
      await loadPayments(eid);
      setSelected(new Set());
      showToast(`${ids.length}건 환불이 완료되었습니다.`);
    } catch (err) {
      const msg =
        err?.response?.data?.error?.message ||
        err?.response?.data?.message ||
        "일괄 환불 처리에 실패했습니다.";
      showToast(msg, "error");
    }
  };

  const handleRefresh = () => {
    if (!selectedEvent) return;
    const eid =
      selectedEvent.eventId ||
      selectedEvent.id?.replace?.("EV-", "") ||
      selectedEvent.id;
    loadPayments(eid);
  };

  /* ── 필터링 ── */
  const filtered = payments.filter((p) => {
    if (statusFilter !== "ALL" && p.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        (p.buyerName || "").toLowerCase().includes(q) ||
        (p.buyerEmail || "").toLowerCase().includes(q) ||
        (p.orderNo || "").toLowerCase().includes(q) ||
        String(p.paymentId || "").includes(q)
      );
    }
    return true;
  });

  /* ── 선택 관리 ── */
  const refundableFiltered = filtered.filter((p) => p.status === "APPROVED");
  const isAllSelected =
    refundableFiltered.length > 0 &&
    refundableFiltered.every((r) => selected.has(r.paymentId));
  const hasSelected = selected.size > 0;
  const toggleAll = () => {
    if (isAllSelected) setSelected(new Set());
    else setSelected(new Set(refundableFiltered.map((r) => r.paymentId)));
  };
  const toggleOne = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  /* ── 통계 ── */
  const stats = {
    total: payments.length,
    approved: payments.filter((p) => p.status === "APPROVED").length,
    refunded: payments.filter((p) => p.status === "REFUNDED").length,
    totalAmount: payments
      .filter((p) => p.status === "APPROVED")
      .reduce((acc, p) => acc + (Number(p.amount) || 0), 0),
  };

  const eventStarted = hasEventStarted(selectedEvent);

  /* ═══════════════════════ RENDER ═══════════════════════ */
  return (
    <div>
      <style>{styles}</style>
      {toast && (
        <Toast
          msg={toast.msg}
          type={toast.type}
          onDone={() => setToast(null)}
        />
      )}

      {/* ═══ VIEW 1: 행사 선택 ═══ */}
      {!selectedEvent && (
        <EventPicker
          events={events}
          loading={loading}
          filter={subTab}
          onSelect={selectEvent}
          actionLabel="결제 내역 보기"
          icon={CreditCard}
          isMobile={isMobile}
        />
      )}

      {/* ═══ VIEW 2: 결제 내역 ═══ */}
      {selectedEvent && (
        <div>
          {/* 헤더 */}
          <div
            style={{
              display: "flex",
              alignItems: isCompact ? "flex-start" : "center",
              gap: 12,
              marginBottom: 20,
              flexWrap: "wrap",
            }}
          >
            <button
              onClick={goBack}
              style={{
                width: 34,
                height: 34,
                borderRadius: 8,
                border: `1px solid ${ds.line}`,
                background: ds.card,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
              }}
            >
              <ChevronLeft size={16} color={ds.ink3} />
            </button>
            <div style={{ flex: 1 }}>
              <h2
                style={{
                  fontSize: 17,
                  fontWeight: 700,
                  color: ds.ink,
                  margin: 0,
                }}
              >
                {selectedEvent.title || selectedEvent.name || "행사"}
              </h2>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginTop: 4,
                }}
              >
                <Pill
                  c={(statusMap[selectedEvent.status] || statusMap.pending).c}
                  bg={(statusMap[selectedEvent.status] || statusMap.pending).bg}
                >
                  {(statusMap[selectedEvent.status] || statusMap.pending).l}
                </Pill>
                {selectedEvent.date && (
                  <span style={{ fontSize: 12, color: ds.ink4 }}>
                    {selectedEvent.date}
                  </span>
                )}
                {eventStarted && (
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: ds.amber,
                      background: ds.amberSoft,
                      padding: "2px 8px",
                      borderRadius: 4,
                    }}
                  >
                    행사 시작됨 · 환불 제한
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={handleRefresh}
              title="새로고침"
              style={{
                width: 34,
                height: 34,
                borderRadius: 8,
                border: `1px solid ${ds.line}`,
                background: ds.card,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
              }}
            >
              <RefreshCw size={14} color={ds.ink3} />
            </button>
          </div>

          {/* 통계 카드 */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: isCompact
                ? "repeat(2, minmax(0, 1fr))"
                : "repeat(4, 1fr)",
              gap: 12,
              marginBottom: 20,
            }}
          >
            <StatCard
              icon={Receipt}
              label="전체 결제"
              value={`${stats.total}건`}
              color={ds.ink3}
              bg={ds.bg}
            />
            <StatCard
              icon={CreditCard}
              label="결제 완료"
              value={`${stats.approved}건`}
              color={ds.green}
              bg={ds.greenSoft}
            />
            <StatCard
              icon={Ban}
              label="환불 완료"
              value={`${stats.refunded}건`}
              color={ds.red}
              bg={ds.redSoft}
            />
            <StatCard
              icon={TrendingUp}
              label="총 결제액"
              value={fmtAmount(stats.totalAmount)}
              color={ds.brand}
              bg={ds.brandSoft}
            />
          </div>

          {/* 툴바 */}
          <div
            style={{
              display: "flex",
              alignItems: isCompact ? "stretch" : "center",
              gap: 10,
              marginBottom: 14,
              flexWrap: "wrap",
            }}
          >
            <div
              style={{
                position: "relative",
                flex: 1,
                minWidth: isCompact ? "100%" : 200,
              }}
            >
              <Search
                size={14}
                color={ds.ink4}
                style={{
                  position: "absolute",
                  left: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                }}
              />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="이름, 이메일, 주문번호 검색..."
                style={{
                  width: "100%",
                  padding: "8px 12px 8px 34px",
                  borderRadius: 8,
                  border: `1.5px solid ${ds.line}`,
                  fontSize: 13,
                  fontFamily: ds.ff,
                  color: ds.ink,
                  outline: "none",
                  background: ds.bg,
                  boxSizing: "border-box",
                }}
                onFocus={(e) => (e.target.style.borderColor = ds.brand)}
                onBlur={(e) => (e.target.style.borderColor = ds.line)}
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                padding: "8px 12px",
                borderRadius: 8,
                border: `1.5px solid ${ds.line}`,
                fontSize: 13,
                fontFamily: ds.ff,
                color: ds.ink,
                background: ds.card,
                cursor: "pointer",
                outline: "none",
                minWidth: isCompact ? "100%" : 0,
              }}
            >
              <option value="ALL">전체 상태</option>
              <option value="APPROVED">결제완료</option>
              <option value="READY">결제대기</option>
              <option value="REFUNDED">환불완료</option>
              <option value="CANCELLED">취소</option>
              <option value="FAILED">실패</option>
            </select>
            {hasSelected && !eventStarted && (
              <button
                onClick={() =>
                  setModal({ type: "bulkRefund", count: selected.size })
                }
                style={{
                  padding: "6px 14px",
                  borderRadius: 7,
                  border: `1px solid ${ds.red}33`,
                  background: ds.redSoft,
                  color: ds.red,
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                  fontFamily: ds.ff,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 5,
                  width: isCompact ? "100%" : "auto",
                }}
              >
                <Ban size={12} /> 선택 환불 ({selected.size})
              </button>
            )}
          </div>

          {/* 테이블 */}
          {loadingPayments ? (
            <div
              style={{
                textAlign: "center",
                padding: 60,
                color: ds.ink4,
                fontSize: 13,
              }}
            >
              <Spinner size={28} />
              <div style={{ marginTop: 12 }}>결제 내역을 불러오는 중...</div>
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState icon={CreditCard} title={search || statusFilter !== "ALL" ? "검색 결과가 없습니다" : "결제 내역이 없습니다"} description={search || statusFilter !== "ALL" ? "검색 조건을 바꿔 보세요." : "사전 신청 결제가 진행되면 여기에 표시됩니다."} />
          ) : (
            <div
              style={{
                background: ds.card,
                borderRadius: 12,
                border: `1px solid ${ds.line}`,
                overflow: "hidden",
              }}
            >
              {isMobile ? (
                <div style={{ display: "grid", gap: 12, padding: 12 }}>
                  {filtered.map((p) => {
                    const ps = PAY_STATUS[p.status] || PAY_STATUS.PENDING;
                    const isChecked = selected.has(p.paymentId);
                    return (
                      <div
                        key={p.paymentId || p.orderNo}
                        onClick={() => setDetailItem(p)}
                        style={{
                          background: isChecked ? `${ds.brand}06` : ds.bg,
                          border: `1px solid ${isChecked ? `${ds.brand}22` : ds.line}`,
                          borderRadius: 12,
                          padding: "14px 14px 12px",
                          display: "grid",
                          gap: 12,
                          cursor: "pointer",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                          <Checkbox checked={isChecked} onChange={() => toggleOne(p.paymentId)} />
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ fontWeight: 700, fontSize: 13.5, color: ds.ink, whiteSpace: "normal", wordBreak: "keep-all", overflowWrap: "break-word", lineHeight: 1.45 }}>
                              {p.eventTitle || selectedEvent.title || "행사 결제"}
                            </div>
                            <div style={{ fontSize: 12.5, color: ds.ink4, marginTop: 4 }}>
                              {p.orderNo || `#${p.paymentId}`}
                            </div>
                          </div>
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4,
                              fontSize: 12,
                              fontWeight: 700,
                              padding: "3px 10px",
                              borderRadius: 99,
                              background: ps.bg,
                              color: ps.c,
                              flexShrink: 0,
                            }}
                          >
                            <span style={{ width: 5, height: 5, borderRadius: "50%", background: ps.c }} />
                            {ps.l}
                          </span>
                        </div>

                        <div style={{ display: "grid", gap: 8 }}>
                          <div style={{ display: "grid", gap: 4 }}>
                            <span style={{ fontSize: 12, color: ds.ink4, fontWeight: 700 }}>결제자</span>
                            <span style={{ fontSize: 12.5, color: ds.ink, fontWeight: 600, whiteSpace: "normal", wordBreak: "keep-all", overflowWrap: "break-word" }}>
                              {p.buyerName || p.nickname || "-"}
                            </span>
                            <span style={{ fontSize: 12.5, color: ds.ink4, whiteSpace: "normal", wordBreak: "keep-all", overflowWrap: "break-word" }}>
                              {p.buyerEmail || p.email || ""}
                            </span>
                          </div>
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8 }}>
                            <div style={{ display: "grid", gap: 4, minWidth: 0 }}>
                              <span style={{ fontSize: 12, color: ds.ink4, fontWeight: 700 }}>결제 수단</span>
                              <span style={{ fontSize: 12.5, color: ds.ink3, whiteSpace: "normal", wordBreak: "keep-all", overflowWrap: "break-word" }}>
                                {METHOD_LABEL[p.paymentMethod] || p.paymentMethod || "-"}
                              </span>
                            </div>
                            <div style={{ display: "grid", gap: 4, minWidth: 0 }}>
                              <span style={{ fontSize: 12, color: ds.ink4, fontWeight: 700 }}>금액</span>
                              <span style={{ fontSize: 12.5, color: ds.ink, fontWeight: 700 }}>{fmtAmount(p.amount)}</span>
                            </div>
                          </div>
                          <div style={{ display: "grid", gap: 4 }}>
                            <span style={{ fontSize: 12, color: ds.ink4, fontWeight: 700 }}>결제일</span>
                            <span style={{ fontSize: 12.5, color: ds.ink3 }}>{fmtDateTime(p.requestedAt || p.createdAt)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
              <>
              {/* 테이블 헤더 */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "36px 1fr 1fr 120px 110px 120px 80px",
                  minWidth: isCompact ? 760 : "100%",
                  padding: "10px 16px",
                  fontSize: 12,
                  fontWeight: 700,
                  color: ds.ink4,
                  borderBottom: `1px solid ${ds.line}`,
                  background: ds.bg,
                  alignItems: "center",
                }}
              >
                <Checkbox checked={isAllSelected} onChange={toggleAll} />
                <span>주문 정보</span>
                <span>결제자</span>
                <span>결제 수단</span>
                <span>금액</span>
                <span>결제일</span>
                <span style={{ textAlign: "center" }}>상태</span>
              </div>

              {filtered.map((p) => {
                const ps = PAY_STATUS[p.status] || PAY_STATUS.PENDING;
                const isChecked = selected.has(p.paymentId);
                return (
                  <div
                    key={p.paymentId || p.orderNo}
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "36px 1fr 1fr 120px 110px 120px 80px",
                      minWidth: isCompact ? 760 : "100%",
                      padding: "14px 16px",
                      fontSize: 13,
                      color: ds.ink,
                      borderBottom: `1px solid ${ds.line}`,
                      alignItems: "center",
                      background: isChecked ? `${ds.brand}06` : "transparent",
                      transition: "background .15s",
                      cursor: "pointer",
                    }}
                    onMouseEnter={(e) => {
                      if (!isChecked) e.currentTarget.style.background = ds.bg;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = isChecked
                        ? `${ds.brand}06`
                        : "transparent";
                    }}
                    onClick={() => setDetailItem(p)}
                  >
                    <Checkbox
                      checked={isChecked}
                      onChange={() => toggleOne(p.paymentId)}
                    />
                    <div>
                      <div
                        style={{
                          fontWeight: 600,
                          fontSize: 13,
                          color: ds.ink,
                          marginBottom: 2,
                        }}
                      >
                        {p.eventTitle || selectedEvent.title || "행사 결제"}
                      </div>
                      <div style={{ fontSize: 12, color: ds.ink4 }}>
                        {p.orderNo || `#${p.paymentId}`}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>
                        {p.buyerName || p.nickname || "-"}
                      </div>
                      <div style={{ fontSize: 12, color: ds.ink4 }}>
                        {p.buyerEmail || p.email || ""}
                      </div>
                    </div>
                    <span style={{ fontSize: 12.5 }}>
                      {METHOD_LABEL[p.paymentMethod] || p.paymentMethod || "-"}
                    </span>
                    <span
                      style={{ fontWeight: 700, fontSize: 13, color: ds.ink }}
                    >
                      {fmtAmount(p.amount)}
                    </span>
                    <span style={{ fontSize: 12, color: ds.ink3 }}>
                      {fmtDateTime(p.requestedAt || p.createdAt)}
                    </span>
                    <div style={{ textAlign: "center" }}>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          fontSize: 12,
                          fontWeight: 700,
                          padding: "3px 10px",
                          borderRadius: 99,
                          background: ps.bg,
                          color: ps.c,
                        }}
                      >
                        <span
                          style={{
                            width: 5,
                            height: 5,
                            borderRadius: "50%",
                            background: ps.c,
                          }}
                        />
                        {ps.l}
                      </span>
                    </div>
                  </div>
                );
              })}
              </>
              )}
            </div>
          )}
          {filtered.length > 0 && (
            <div
              style={{
                marginTop: 10,
                fontSize: 12,
                color: ds.ink4,
                textAlign: "right",
              }}
            >
              총 {filtered.length}건
              {statusFilter !== "ALL" &&
                ` (필터: ${PAY_STATUS[statusFilter]?.l || statusFilter})`}
            </div>
          )}
        </div>
      )}

      {/* ═══ 상세 모달 ═══ */}
      {detailItem && (
        <Overlay onClose={() => setDetailItem(null)}>
          <div style={{ padding: isMobile ? 20 : isCompact ? 24 : 28 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: isMobile ? "flex-start" : "center",
                flexDirection: isMobile ? "column" : "row",
                marginBottom: 20,
                gap: 12,
              }}
            >
              <h3
                style={{
                  fontSize: 17,
                  fontWeight: 700,
                  color: ds.ink,
                  margin: 0,
                }}
              >
                결제 상세
              </h3>
              <button
                onClick={() => setDetailItem(null)}
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 8,
                  border: "none",
                  background: ds.lineSoft,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                }}
              >
                <X size={14} color={ds.ink3} />
              </button>
            </div>

            {(() => {
              const ps = PAY_STATUS[detailItem.status] || PAY_STATUS.PENDING;
              return (
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "6px 14px",
                    borderRadius: 99,
                    background: ps.bg,
                    color: ps.c,
                    fontWeight: 700,
                    fontSize: 13,
                    marginBottom: 20,
                  }}
                >
                  <span
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: "50%",
                      background: ps.c,
                    }}
                  />
                  {ps.l}
                </div>
              );
            })()}

            <div
              style={{
                background: ds.bg,
                borderRadius: 12,
                padding: isMobile ? 16 : 20,
                marginBottom: 20,
              }}
            >
              {[
                {
                  l: "주문번호",
                  v: detailItem.orderNo || `#${detailItem.paymentId}`,
                },
                {
                  l: "행사명",
                  v: detailItem.eventTitle || selectedEvent?.title || "-",
                },
                {
                  l: "결제자",
                  v: detailItem.buyerName || detailItem.nickname || "-",
                },
                {
                  l: "이메일",
                  v: detailItem.buyerEmail || detailItem.email || "-",
                },
                {
                  l: "전화번호",
                  v: detailItem.buyerPhone || detailItem.phone || "-",
                },
                {
                  l: "결제 수단",
                  v:
                    METHOD_LABEL[detailItem.paymentMethod] ||
                    detailItem.paymentMethod ||
                    "-",
                },
                { l: "결제 금액", v: fmtAmount(detailItem.amount) },
                {
                  l: "결제일시",
                  v: fmtDateTime(
                    detailItem.requestedAt || detailItem.createdAt,
                  ),
                },
                ...(detailItem.refundedAt
                  ? [{ l: "환불일시", v: fmtDateTime(detailItem.refundedAt) }]
                  : []),
              ].map((r) => (
                <div
                  key={r.l}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    flexDirection: isMobile ? "column" : "row",
                    alignItems: isMobile ? "flex-start" : "center",
                    gap: isMobile ? 6 : 16,
                    padding: "8px 0",
                    borderBottom: `1px solid ${ds.line}`,
                    fontSize: 13,
                  }}
                >
                  <span style={{ color: ds.ink4, fontWeight: 600 }}>{r.l}</span>
                  <span
                    style={{
                      color: ds.ink,
                      fontWeight: r.l === "결제 금액" ? 700 : 500,
                    }}
                  >
                    {r.v}
                  </span>
                </div>
              ))}
            </div>

            {detailItem.status === "APPROVED" && (
              <div>
                {eventStarted ? (
                  <div
                    style={{
                      background: ds.amberSoft,
                      border: "1px solid #FDE68A",
                      borderRadius: 10,
                      padding: "12px 16px",
                      fontSize: 12.5,
                      color: ds.amber,
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <AlertTriangle size={15} />
                    행사가 이미 시작되어 자동 환불이 불가합니다. 관리자 환불
                    승인 기능은 추후 업데이트 예정입니다.
                  </div>
                ) : (
                  <button
                    onClick={() =>
                      setModal({
                        type: "refund",
                        paymentId: detailItem.paymentId,
                        name: detailItem.buyerName || detailItem.nickname,
                        amount: detailItem.amount,
                      })
                    }
                    style={{
                      width: "100%",
                      padding: "12px",
                      borderRadius: 10,
                      border: `1px solid ${ds.red}33`,
                      background: ds.redSoft,
                      color: ds.red,
                      fontSize: 14,
                      fontWeight: 700,
                      cursor: "pointer",
                      fontFamily: ds.ff,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                    }}
                  >
                    <Ban size={15} /> 환불 처리
                  </button>
                )}
              </div>
            )}
          </div>
        </Overlay>
      )}

      {/* ═══ 환불 확인 모달 ═══ */}
      {modal?.type === "refund" && (
        <Overlay onClose={() => setModal(null)}>
          <div style={{ padding: isMobile ? 20 : isCompact ? 24 : 28 }}>
            <div
              style={{
                display: "flex",
                alignItems: isMobile ? "flex-start" : "center",
                flexDirection: isMobile ? "column" : "row",
                gap: 12,
                marginBottom: 14,
              }}
            >
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  background: ds.redSoft,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <AlertTriangle size={18} color={ds.red} />
              </div>
              <h3
                style={{
                  fontSize: 16,
                  fontWeight: 700,
                  color: ds.ink,
                  margin: 0,
                }}
              >
                환불 처리
              </h3>
            </div>
            <p
              style={{
                fontSize: 13.5,
                color: ds.ink3,
                lineHeight: 1.6,
                margin: "0 0 8px",
              }}
            >
              <strong>{modal.name}</strong>님의 결제를 환불하시겠습니까?
            </p>
            <p
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: ds.ink,
                margin: "0 0 8px",
              }}
            >
              환불 금액: {fmtAmount(modal.amount)}
            </p>
            <p style={{ fontSize: 12, color: ds.red, margin: "0 0 24px" }}>
              환불 처리된 결제는 복구할 수 없습니다.
            </p>
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 8,
                flexDirection: isMobile ? "column-reverse" : "row",
              }}
            >
              <button
                onClick={() => setModal(null)}
                style={{
                  padding: "9px 20px",
                  borderRadius: 8,
                  border: `1px solid ${ds.line}`,
                  background: ds.card,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: ds.ff,
                  color: ds.ink3,
                  width: isMobile ? "100%" : "auto",
                }}
              >
                취소
              </button>
              <button
                onClick={() => handleRefund(modal.paymentId)}
                style={{
                  padding: "9px 20px",
                  borderRadius: 8,
                  border: "none",
                  background: ds.red,
                  color: "#fff",
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: "pointer",
                  fontFamily: ds.ff,
                  width: isMobile ? "100%" : "auto",
                }}
              >
                환불 확인
              </button>
            </div>
          </div>
        </Overlay>
      )}

      {/* ═══ 일괄 환불 확인 모달 ═══ */}
      {modal?.type === "bulkRefund" && (
        <Overlay onClose={() => setModal(null)}>
          <div style={{ padding: isMobile ? 20 : isCompact ? 24 : 28 }}>
            <div
              style={{
                display: "flex",
                alignItems: isMobile ? "flex-start" : "center",
                flexDirection: isMobile ? "column" : "row",
                gap: 12,
                marginBottom: 14,
              }}
            >
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  background: ds.redSoft,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <AlertTriangle size={18} color={ds.red} />
              </div>
              <h3
                style={{
                  fontSize: 16,
                  fontWeight: 700,
                  color: ds.ink,
                  margin: 0,
                }}
              >
                일괄 환불
              </h3>
            </div>
            <p
              style={{
                fontSize: 13.5,
                color: ds.ink3,
                lineHeight: 1.6,
                margin: "0 0 8px",
              }}
            >
              선택한 <strong>{modal.count}건</strong>의 결제를 모두
              환불하시겠습니까?
            </p>
            <p style={{ fontSize: 12, color: ds.red, margin: "0 0 24px" }}>
              환불 처리된 결제는 복구할 수 없습니다.
            </p>
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 8,
                flexDirection: isMobile ? "column-reverse" : "row",
              }}
            >
              <button
                onClick={() => setModal(null)}
                style={{
                  padding: "9px 20px",
                  borderRadius: 8,
                  border: `1px solid ${ds.line}`,
                  background: ds.card,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: ds.ff,
                  color: ds.ink3,
                  width: isMobile ? "100%" : "auto",
                }}
              >
                취소
              </button>
              <button
                onClick={handleBulkRefund}
                style={{
                  padding: "9px 20px",
                  borderRadius: 8,
                  border: "none",
                  background: ds.red,
                  color: "#fff",
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: "pointer",
                  fontFamily: ds.ff,
                  width: isMobile ? "100%" : "auto",
                }}
              >
                일괄 환불
              </button>
            </div>
          </div>
        </Overlay>
      )}
    </div>
  );
}
