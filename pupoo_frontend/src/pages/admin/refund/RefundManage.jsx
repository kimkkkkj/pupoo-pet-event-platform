import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  ExternalLink,
  Loader2,
  RefreshCw,
  Wallet,
  X,
} from "lucide-react";
import ds from "../shared/designTokens";
import { axiosInstance } from "../../../app/http/axiosInstance";

const PAGE_SIZE = 20;

const statusOptions = [
  { value: "", label: "전체 상태" },
  { value: "REQUESTED", label: "환불 요청" },
  { value: "APPROVED", label: "환불 승인" },
  { value: "REJECTED", label: "환불 거절" },
  { value: "REFUNDED", label: "환불 완료" },
];

const statusMeta = {
  REQUESTED: { label: "환불 요청", color: ds.amber, bg: ds.amberSoft },
  APPROVED: { label: "환불 승인", color: ds.brand, bg: ds.brandSoft },
  REJECTED: { label: "환불 거절", color: ds.red, bg: ds.redSoft },
  REFUNDED: { label: "환불 완료", color: ds.green, bg: ds.greenSoft },
};

const panel = {
  background: ds.card,
  border: `1px solid ${ds.line}`,
  borderRadius: ds.r,
  boxShadow: ds.sh,
};

const input = {
  height: 42,
  borderRadius: 10,
  border: `1px solid ${ds.line}`,
  background: ds.bg,
  color: ds.ink,
  padding: "0 14px",
  fontSize: 13.5,
  fontFamily: ds.ff,
  outline: "none",
};

const buttonBase = {
  height: 36,
  padding: "0 12px",
  borderRadius: 10,
  border: `1px solid ${ds.line}`,
  background: ds.bg,
  color: ds.ink,
  fontSize: 12,
  fontWeight: 800,
  fontFamily: ds.ff,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 6,
  cursor: "pointer",
};

const detailButton = {
  height: 30,
  padding: "0 10px",
  borderRadius: 10,
  border: `1px solid ${ds.line}`,
  background: "none",
  color: ds.ink3,
  fontSize: 12,
  fontWeight: 800,
  fontFamily: ds.ff,
  cursor: "pointer",
};

function fmtDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(
    date.getDate(),
  ).padStart(2, "0")} ${String(date.getHours()).padStart(2, "0")}:${String(
    date.getMinutes(),
  ).padStart(2, "0")}`;
}

function fmtAmount(value) {
  const amount = Number(value);
  return Number.isFinite(amount) ? `₩${amount.toLocaleString("ko-KR")}` : "₩0";
}

function buildPagination(currentPage, totalPages) {
  if (totalPages <= 1) return [0];

  const pages = new Set([0, totalPages - 1, currentPage - 1, currentPage, currentPage + 1]);
  const ordered = Array.from(pages)
    .filter((value) => value >= 0 && value < totalPages)
    .sort((a, b) => a - b);

  const items = [];
  for (let index = 0; index < ordered.length; index += 1) {
    const value = ordered[index];
    const previous = ordered[index - 1];
    if (index > 0 && value - previous > 1) {
      items.push(`gap-${previous}-${value}`);
    }
    items.push(value);
  }
  return items;
}

function Badge({ value }) {
  const meta = statusMeta[String(value || "").toUpperCase()] || {
    label: value || "-",
    color: ds.ink3,
    bg: ds.lineSoft,
  };

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        height: 28,
        padding: "0 12px",
        borderRadius: 999,
        background: meta.bg,
        color: meta.color,
        fontSize: 12,
        fontWeight: 800,
      }}
    >
      {meta.label}
    </span>
  );
}

function StatCard({ label, value, hint }) {
  return (
    <div style={{ ...panel, padding: 18 }}>
      <div style={{ fontSize: 12, color: ds.ink3, fontWeight: 700 }}>{label}</div>
      <div style={{ marginTop: 10, fontSize: 28, color: ds.inkW, fontWeight: 800 }}>{value}</div>
      <div style={{ marginTop: 6, fontSize: 11.5, color: ds.ink4 }}>{hint}</div>
    </div>
  );
}

export default function RefundManage() {
  const [page, setPage] = useState(0);
  const [status, setStatus] = useState("");
  const [refundPage, setRefundPage] = useState({
    content: [],
    totalElements: 0,
    totalPages: 0,
    last: true,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [lastLoadedAt, setLastLoadedAt] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [actionLoading, setActionLoading] = useState("");
  const [viewportWidth, setViewportWidth] = useState(1280);
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

  const loadRefunds = useCallback(
    async ({ silent = false } = {}) => {
      if (silent) setRefreshing(true);
      else setLoading(true);

      try {
        const res = await axiosInstance.get("/api/admin/refunds", {
          params: {
            page,
            size: PAGE_SIZE,
            status: status || undefined,
            sort: "requestedAt,desc",
          },
        });

        const payload = res?.data?.data;
        const rows = Array.isArray(payload?.content) ? payload.content : [];
        setRefundPage({
          content: rows,
          totalElements: Number(payload?.totalElements ?? 0),
          totalPages: Number(payload?.totalPages ?? 0),
          last: Boolean(payload?.last ?? true),
        });
        setLastLoadedAt(new Date());
        setError("");
      } catch (err) {
        console.error("[RefundManage] list load failed:", err);
        setError("환불 목록을 불러오지 못했습니다.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [page, status],
  );

  const loadDetail = useCallback(async (refundId) => {
    if (!refundId) return;
    setDetailLoading(true);
    setDetailError("");
    try {
      const res = await axiosInstance.get(`/api/admin/refunds/${refundId}`);
      setDetail(res?.data?.data ?? null);
    } catch (err) {
      console.error("[RefundManage] detail load failed:", err);
      setDetail(null);
      setDetailError("환불 상세를 불러오지 못했습니다.");
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRefunds();
  }, [loadRefunds]);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      setDetailError("");
      return;
    }
    loadDetail(selectedId);
  }, [loadDetail, selectedId]);

  const pageStats = useMemo(() => {
    const rows = refundPage.content;
    return {
      requested: rows.filter((item) => item.status === "REQUESTED").length,
      approved: rows.filter((item) => item.status === "APPROVED").length,
      refunded: rows.filter((item) => item.status === "REFUNDED").length,
    };
  }, [refundPage.content]);

  const paginationItems = useMemo(
    () => buildPagination(page, refundPage.totalPages),
    [page, refundPage.totalPages],
  );

  const rangeText = useMemo(() => {
    if (refundPage.totalElements === 0) return "0건";
    const start = page * PAGE_SIZE + 1;
    const end = Math.min((page + 1) * PAGE_SIZE, refundPage.totalElements);
    return `${start}-${end} / 총 ${refundPage.totalElements}건`;
  }, [page, refundPage.totalElements]);

  const active = detail || refundPage.content.find((item) => item.refundId === selectedId) || null;

  const openEvent = useCallback((eventId) => {
    if (!eventId) return;
    window.open(`/program/all/${eventId}`, "_blank", "noopener,noreferrer");
  }, []);

  const handleAction = useCallback(
    async (item, action) => {
      const refundId = item?.refundId;
      if (!refundId || actionLoading) return;

      let request;
      let successMessage = "";

      if (action === "approve") {
        const input = window.prompt("승인 메모가 있으면 입력하세요. 비워둬도 됩니다.", "");
        if (input == null) return;
        const reason = String(input || "").trim();
        request = () =>
          axiosInstance.patch(
            `/api/admin/refunds/${refundId}/approve`,
            {},
            { params: reason ? { reason } : undefined },
          );
        successMessage = "환불을 승인했습니다.";
      } else if (action === "reject") {
        const input = window.prompt("거절 사유를 입력해주세요.", "");
        if (input == null) return;
        const reason = String(input || "").trim();
        if (!reason) {
          window.alert("거절 사유를 입력해주세요.");
          return;
        }
        request = () =>
          axiosInstance.patch(
            `/api/admin/refunds/${refundId}/reject`,
            {},
            { params: { reason } },
          );
        successMessage = "환불 요청을 거절했습니다.";
      } else if (action === "execute") {
        const confirmed = window.confirm("승인된 환불을 실제로 처리합니다. 계속하시겠습니까?");
        if (!confirmed) return;
        request = () => axiosInstance.post(`/api/admin/refunds/${refundId}/execute`);
        successMessage = "환불 처리가 완료되었습니다.";
      } else {
        return;
      }

      setActionLoading(`${action}-${refundId}`);
      try {
        await request();
        await loadRefunds({ silent: true });
        if (selectedId === refundId) {
          await loadDetail(refundId);
        }
        window.alert(successMessage);
      } catch (err) {
        const message =
          err?.response?.data?.error?.message ||
          err?.response?.data?.message ||
          "환불 처리 중 오류가 발생했습니다.";
        window.alert(message);
      } finally {
        setActionLoading("");
      }
    },
    [actionLoading, loadDetail, loadRefunds, selectedId],
  );

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div
        style={{
          display: "flex",
          alignItems: isCompact ? "stretch" : "center",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div>
          <div style={{ fontSize: 26, fontWeight: 800, color: ds.inkW }}>환불 관리</div>
          <div style={{ marginTop: 6, fontSize: 13, color: ds.ink4 }}>
            행사 시작 전 환불은 자동 완료되고, 시작 후 환불은 관리자 승인과 실행으로 처리됩니다.
          </div>
        </div>
        <div style={{ display: "flex", alignItems: isCompact ? "stretch" : "center", gap: 8, flexWrap: "wrap", width: isCompact ? "100%" : "auto" }}>
          <select
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setPage(0);
            }}
            style={{ ...input, minWidth: isCompact ? "100%" : 180 }}
          >
            {statusOptions.map((option) => (
              <option key={option.value || "all"} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => loadRefunds({ silent: true })}
            style={{ ...buttonBase, width: isMobile ? "100%" : "auto" }}
            disabled={refreshing}
          >
            {refreshing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            새로고침
          </button>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : isTablet ? "repeat(2, minmax(0, 1fr))" : "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 12,
        }}
      >
        <StatCard label="전체 환불" value={refundPage.totalElements} hint={rangeText} />
        <StatCard label="요청" value={pageStats.requested} hint="현재 페이지 기준" />
        <StatCard label="승인" value={pageStats.approved} hint="실행 대기 포함" />
        <StatCard label="완료" value={pageStats.refunded} hint="현재 페이지 기준" />
      </div>

      <div style={{ ...panel, overflow: "hidden" }}>
        <div
          style={{
            padding: "16px 18px",
            borderBottom: `1px solid ${ds.line}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Wallet size={16} color={ds.brand} />
            <div style={{ fontSize: 14, fontWeight: 800, color: ds.ink }}>환불 요청 목록</div>
          </div>
          <div style={{ fontSize: 12, color: ds.ink4 }}>
            {lastLoadedAt ? `마지막 조회 ${fmtDateTime(lastLoadedAt)}` : "-"}
          </div>
        </div>

        {error ? (
          <div style={{ padding: 18, color: ds.red, fontSize: 13, fontWeight: 700 }}>{error}</div>
        ) : null}

        {loading ? (
          <div
            style={{
              minHeight: 260,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: ds.ink4,
              gap: 8,
            }}
          >
            <Loader2 size={16} className="animate-spin" />
            환불 목록을 불러오는 중입니다.
          </div>
        ) : refundPage.content.length === 0 ? (
          <div
            style={{
              minHeight: 220,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: ds.ink4,
              fontSize: 13,
            }}
          >
            조회된 환불 요청이 없습니다.
          </div>
        ) : (
          <>
            {isMobile ? (
              <div style={{ display: "grid", gap: 12 }}>
                {refundPage.content.map((item) => {
                  const rowBusy = actionLoading.endsWith(`${item.refundId}`);
                  return (
                    <div key={item.refundId} style={{ background: ds.card, borderRadius: 12, border: `1px solid ${ds.line}`, padding: 14, display: "grid", gap: 10 }}>
                      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
                        <div style={{ minWidth: 0 }}>
                          <div><Badge value={item.status} /></div>
                          <div style={{ fontSize: 11.5, color: ds.ink4, marginTop: 6 }}>환불 ID #{item.refundId}</div>
                        </div>
                        <div style={{ fontSize: 12, color: ds.ink3, textAlign: "right" }}>
                          {fmtDateTime(item.requestedAt)}
                        </div>
                      </div>
                      <div style={{ display: "grid", gap: 6 }}>
                        <span style={{ fontSize: 11, color: ds.ink4, fontWeight: 700 }}>행사</span>
                        <div style={{ fontSize: 13, color: ds.ink, fontWeight: 700, whiteSpace: "normal", wordBreak: "keep-all", overflowWrap: "break-word", lineHeight: 1.45 }}>
                          {item.eventTitle || "행사 정보 없음"}
                        </div>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8 }}>
                        <div style={{ display: "grid", gap: 4 }}>
                          <span style={{ fontSize: 11, color: ds.ink4, fontWeight: 700 }}>결제 ID</span>
                          <span style={{ fontSize: 12.5, color: ds.ink }}>#{item.paymentId}</span>
                        </div>
                        <div style={{ display: "grid", gap: 4 }}>
                          <span style={{ fontSize: 11, color: ds.ink4, fontWeight: 700 }}>신청 ID</span>
                          <span style={{ fontSize: 12.5, color: ds.ink }}>{item.eventApplyId ? `#${item.eventApplyId}` : "-"}</span>
                        </div>
                      </div>
                      <div style={{ display: "grid", gap: 4 }}>
                        <span style={{ fontSize: 11, color: ds.ink4, fontWeight: 700 }}>환불 금액</span>
                        <span style={{ fontSize: 13, fontWeight: 800, color: ds.ink }}>{fmtAmount(item.refundAmount)}</span>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        <button type="button" onClick={() => setSelectedId(item.refundId)} style={{ ...detailButton, width: "100%", justifyContent: "center" }}>
                          상세
                        </button>
                        {item.status === "REQUESTED" ? (
                          <>
                            <button
                              type="button"
                              onClick={() => handleAction(item, "approve")}
                              disabled={rowBusy}
                              style={{ ...buttonBase, width: "100%", justifyContent: "center", borderColor: `${ds.brand}33`, background: ds.brandSoft, color: ds.brand }}
                            >
                              {actionLoading === `approve-${item.refundId}` ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                              승인
                            </button>
                            <button
                              type="button"
                              onClick={() => handleAction(item, "reject")}
                              disabled={rowBusy}
                              style={{ ...buttonBase, width: "100%", justifyContent: "center", borderColor: `${ds.red}33`, background: ds.redSoft, color: ds.red }}
                            >
                              {actionLoading === `reject-${item.refundId}` ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />}
                              거절
                            </button>
                          </>
                        ) : null}
                        {item.status === "APPROVED" ? (
                          <button
                            type="button"
                            onClick={() => handleAction(item, "execute")}
                            disabled={rowBusy}
                            style={{ ...buttonBase, width: "100%", justifyContent: "center", borderColor: `${ds.green}33`, background: ds.greenSoft, color: ds.green }}
                          >
                            {actionLoading === `execute-${item.refundId}` ? <Loader2 size={14} className="animate-spin" /> : <Clock3 size={14} />}
                            환불 실행
                          </button>
                        ) : item.status === "REJECTED" || item.status === "REFUNDED" ? (
                          <span style={{ fontSize: 12, color: ds.ink4 }}>처리 완료</span>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 980 }}>
                <thead>
                  <tr style={{ background: ds.bg }}>
                    {[
                      "상태",
                      "행사",
                      "결제 ID",
                      "신청 ID",
                      "환불 금액",
                      "요청일",
                      "완료일",
                      "사유",
                      "처리",
                    ].map((label) => (
                      <th
                        key={label}
                        style={{
                          padding: "12px 14px",
                          borderBottom: `1px solid ${ds.line}`,
                          textAlign: "left",
                          fontSize: 12,
                          fontWeight: 800,
                          color: ds.ink3,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {refundPage.content.map((item) => {
                    const rowBusy = actionLoading.endsWith(`${item.refundId}`);
                    return (
                      <tr key={item.refundId} style={{ borderBottom: `1px solid ${ds.line}` }}>
                        <td style={{ padding: "14px" }}>
                          <Badge value={item.status} />
                        </td>
                        <td style={{ padding: "14px" }}>
                          <div style={{ display: "grid", gap: 6 }}>
                            <button
                              type="button"
                              onClick={() => openEvent(item.eventId)}
                              disabled={!item.eventId}
                              style={{
                                border: "none",
                                background: "none",
                                padding: 0,
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 6,
                                color: item.eventId ? ds.brand : ds.ink4,
                                fontSize: 13,
                                fontWeight: 800,
                                cursor: item.eventId ? "pointer" : "default",
                                textAlign: "left",
                              }}
                            >
                              <span>{item.eventTitle || "행사 정보 없음"}</span>
                              {item.eventId ? <ExternalLink size={13} /> : null}
                            </button>
                            <span style={{ fontSize: 11.5, color: ds.ink4 }}>환불 ID #{item.refundId}</span>
                          </div>
                        </td>
                        <td style={{ padding: "14px", fontSize: 13, color: ds.ink }}>#{item.paymentId}</td>
                        <td style={{ padding: "14px", fontSize: 13, color: ds.ink }}>
                          {item.eventApplyId ? `#${item.eventApplyId}` : "-"}
                        </td>
                        <td style={{ padding: "14px", fontSize: 13, fontWeight: 800, color: ds.ink }}>
                          {fmtAmount(item.refundAmount)}
                        </td>
                        <td style={{ padding: "14px", fontSize: 13, color: ds.ink3 }}>
                          {fmtDateTime(item.requestedAt)}
                        </td>
                        <td style={{ padding: "14px", fontSize: 13, color: ds.ink3 }}>
                          {fmtDateTime(item.completedAt)}
                        </td>
                        <td style={{ padding: "14px" }}>
                          <button
                            type="button"
                            onClick={() => setSelectedId(item.refundId)}
                            style={detailButton}
                          >
                            상세
                          </button>
                        </td>
                        <td style={{ padding: "14px" }}>
                          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                            {item.status === "REQUESTED" ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleAction(item, "approve")}
                                  disabled={rowBusy}
                                  style={{
                                    ...buttonBase,
                                    borderColor: `${ds.brand}33`,
                                    background: ds.brandSoft,
                                    color: ds.brand,
                                  }}
                                >
                                  {actionLoading === `approve-${item.refundId}` ? (
                                    <Loader2 size={14} className="animate-spin" />
                                  ) : (
                                    <Check size={14} />
                                  )}
                                  승인
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleAction(item, "reject")}
                                  disabled={rowBusy}
                                  style={{
                                    ...buttonBase,
                                    borderColor: `${ds.red}33`,
                                    background: ds.redSoft,
                                    color: ds.red,
                                  }}
                                >
                                  {actionLoading === `reject-${item.refundId}` ? (
                                    <Loader2 size={14} className="animate-spin" />
                                  ) : (
                                    <X size={14} />
                                  )}
                                  거절
                                </button>
                              </>
                            ) : null}
                            {item.status === "APPROVED" ? (
                              <button
                                type="button"
                                onClick={() => handleAction(item, "execute")}
                                disabled={rowBusy}
                                style={{
                                  ...buttonBase,
                                  borderColor: `${ds.green}33`,
                                  background: ds.greenSoft,
                                  color: ds.green,
                                }}
                              >
                                {actionLoading === `execute-${item.refundId}` ? (
                                  <Loader2 size={14} className="animate-spin" />
                                ) : (
                                  <Clock3 size={14} />
                                )}
                                환불 실행
                              </button>
                            ) : item.status === "REJECTED" || item.status === "REFUNDED" ? (
                              <span style={{ fontSize: 12, color: ds.ink4 }}>처리 완료</span>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            )}

            {refundPage.totalPages > 1 ? (
              <div
                style={{
                  padding: "14px 18px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  flexWrap: "wrap",
                }}
              >
                <div style={{ fontSize: 12, color: ds.ink4 }}>{rangeText}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <button
                    type="button"
                    onClick={() => setPage((prev) => Math.max(0, prev - 1))}
                    disabled={page <= 0}
                    style={{ ...buttonBase, width: 36, padding: 0 }}
                  >
                    <ChevronLeft size={14} />
                  </button>
                  {paginationItems.map((item) =>
                    typeof item === "string" ? (
                      <span key={item} style={{ padding: "0 6px", color: ds.ink4 }}>
                        ...
                      </span>
                    ) : (
                      <button
                        key={item}
                        type="button"
                        onClick={() => setPage(item)}
                        style={{
                          ...buttonBase,
                          minWidth: 36,
                          padding: "0 10px",
                          background: item === page ? ds.brand : ds.bg,
                          borderColor: item === page ? ds.brand : ds.line,
                          color: item === page ? "#fff" : ds.ink,
                        }}
                      >
                        {item + 1}
                      </button>
                    ),
                  )}
                  <button
                    type="button"
                    onClick={() => setPage((prev) => Math.min(refundPage.totalPages - 1, prev + 1))}
                    disabled={page >= refundPage.totalPages - 1}
                    style={{ ...buttonBase, width: 36, padding: 0 }}
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            ) : null}
          </>
        )}
      </div>

      {selectedId ? (
        <>
          <div
            onClick={() => setSelectedId(null)}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 3000,
              background: "rgba(15, 23, 42, 0.52)",
            }}
          />
          <div
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 3001,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: isMobile ? 12 : 20,
            }}
          >
            <div
              style={{
                width: isCompact ? "min(620px, calc(100vw - 24px))" : "min(620px, 100%)",
                maxHeight: isMobile ? "92vh" : "88vh",
                background: ds.card,
                borderRadius: 20,
                border: `1px solid ${ds.line}`,
                boxShadow: "0 28px 70px rgba(15,23,42,0.22)",
                overflow: "auto",
              }}
            >
              <div
                style={{
                  padding: isMobile ? "16px 18px" : "18px 20px",
                  borderBottom: `1px solid ${ds.line}`,
                  display: "flex",
                  alignItems: isMobile ? "flex-start" : "center",
                  justifyContent: "space-between",
                  gap: 12,
                  flexDirection: isMobile ? "column" : "row",
                }}
              >
                <div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: ds.ink }}>환불 상세</div>
                  <div style={{ marginTop: 4, fontSize: 12, color: ds.ink4 }}>환불 ID #{selectedId}</div>
                </div>
                <button type="button" onClick={() => setSelectedId(null)} style={{ ...buttonBase, width: 36, padding: 0 }}>
                  <X size={14} />
                </button>
              </div>

              <div style={{ padding: isMobile ? 16 : 20, display: "grid", gap: 14 }}>
                {detailLoading ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, color: ds.ink4 }}>
                    <Loader2 size={16} className="animate-spin" />
                    환불 상세를 불러오는 중입니다.
                  </div>
                ) : detailError ? (
                  <div style={{ color: ds.red, fontSize: 13, fontWeight: 700 }}>{detailError}</div>
                ) : active ? (
                  <>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: isMobile ? "1fr" : "repeat(2, minmax(0, 1fr))",
                        gap: 12,
                      }}
                    >
                      <div style={{ ...panel, padding: 14 }}>
                        <div style={{ fontSize: 12, color: ds.ink4, fontWeight: 700 }}>상태</div>
                        <div style={{ marginTop: 8 }}>
                          <Badge value={active.status} />
                        </div>
                      </div>
                      <div style={{ ...panel, padding: 14 }}>
                        <div style={{ fontSize: 12, color: ds.ink4, fontWeight: 700 }}>환불 금액</div>
                        <div style={{ marginTop: 8, fontSize: 18, fontWeight: 800, color: ds.ink }}>
                          {fmtAmount(active.refundAmount)}
                        </div>
                      </div>
                    </div>

                    <div style={{ ...panel, padding: 16, display: "grid", gap: 12 }}>
                      <div>
                        <div style={{ fontSize: 12, color: ds.ink4, fontWeight: 700 }}>행사</div>
                        <div style={{ marginTop: 6, display: "flex", alignItems: isMobile ? "flex-start" : "center", gap: 8, flexWrap: "wrap" }}>
                          <span style={{ fontSize: 14, fontWeight: 800, color: ds.ink }}>
                            {active.eventTitle || "행사 정보 없음"}
                          </span>
                          {active.eventId ? (
                            <button
                              type="button"
                              onClick={() => openEvent(active.eventId)}
                              style={{
                                border: "none",
                                background: "none",
                                color: ds.brand,
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 4,
                                fontSize: 12,
                                fontWeight: 800,
                                cursor: "pointer",
                                padding: 0,
                              }}
                            >
                              원문 보기
                              <ExternalLink size={12} />
                            </button>
                          ) : null}
                        </div>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12 }}>
                        <div>
                          <div style={{ fontSize: 12, color: ds.ink4, fontWeight: 700 }}>결제 ID</div>
                          <div style={{ marginTop: 6, fontSize: 14, color: ds.ink }}>#{active.paymentId}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: 12, color: ds.ink4, fontWeight: 700 }}>신청 ID</div>
                          <div style={{ marginTop: 6, fontSize: 14, color: ds.ink }}>
                            {active.eventApplyId ? `#${active.eventApplyId}` : "-"}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: 12, color: ds.ink4, fontWeight: 700 }}>요청일</div>
                          <div style={{ marginTop: 6, fontSize: 14, color: ds.ink }}>{fmtDateTime(active.requestedAt)}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: 12, color: ds.ink4, fontWeight: 700 }}>완료일</div>
                          <div style={{ marginTop: 6, fontSize: 14, color: ds.ink }}>{fmtDateTime(active.completedAt)}</div>
                        </div>
                      </div>
                    </div>

                    <div style={{ ...panel, padding: 16 }}>
                      <div style={{ fontSize: 12, color: ds.ink4, fontWeight: 700 }}>환불 사유</div>
                      <div
                        style={{
                          marginTop: 8,
                          fontSize: 14,
                          color: ds.ink,
                          lineHeight: 1.7,
                          whiteSpace: "pre-wrap",
                        }}
                      >
                        {active.reason || "-"}
                      </div>
                    </div>

                    <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, flexWrap: "wrap", flexDirection: isMobile ? "column" : "row" }}>
                      {active.status === "REQUESTED" ? (
                        <>
                          <button
                            type="button"
                            onClick={() => handleAction(active, "approve")}
                            disabled={Boolean(actionLoading)}
                            style={{
                              ...buttonBase,
                              borderColor: `${ds.brand}33`,
                            background: ds.brandSoft,
                            color: ds.brand,
                            width: isMobile ? "100%" : "auto",
                          }}
                          >
                            승인
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAction(active, "reject")}
                            disabled={Boolean(actionLoading)}
                            style={{
                              ...buttonBase,
                              borderColor: `${ds.red}33`,
                            background: ds.redSoft,
                            color: ds.red,
                            width: isMobile ? "100%" : "auto",
                          }}
                          >
                            거절
                          </button>
                        </>
                      ) : null}
                      {active.status === "APPROVED" ? (
                        <button
                          type="button"
                          onClick={() => handleAction(active, "execute")}
                          disabled={Boolean(actionLoading)}
                          style={{
                            ...buttonBase,
                            borderColor: `${ds.green}33`,
                            background: ds.greenSoft,
                            color: ds.green,
                            width: isMobile ? "100%" : "auto",
                          }}
                        >
                          환불 실행
                        </button>
                      ) : null}
                    </div>
                  </>
                ) : null}
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
