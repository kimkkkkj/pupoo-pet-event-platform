import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Ban,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  RefreshCw,
  Search,
  ShieldAlert,
  X,
} from "lucide-react";
import ds from "../shared/designTokens";
import { axiosInstance } from "../../../app/http/axiosInstance";

const PAGE_SIZE = 20;
const statusOptions = [
  { value: "", label: "전체 상태" },
  { value: "PENDING", label: "대기" },
  { value: "ACCEPTED", label: "승인" },
  { value: "REJECTED", label: "거절" },
];
const targetTypeOptions = [
  { value: "", label: "전체 대상" },
  { value: "POST", label: "게시글" },
  { value: "REVIEW", label: "후기" },
  { value: "POST_COMMENT", label: "게시글 댓글" },
  { value: "REVIEW_COMMENT", label: "후기 댓글" },
  { value: "GALLERY", label: "갤러리" },
];
const sortOptions = [
  { value: "LATEST", label: "최신 신고순" },
  { value: "REPORT_COUNT", label: "신고 많은 순" },
];
const statusMeta = {
  PENDING: { label: "대기", color: ds.amber, bg: ds.amberSoft },
  ACCEPTED: { label: "승인", color: ds.green, bg: ds.greenSoft },
  REJECTED: { label: "거절", color: ds.red, bg: ds.redSoft },
};
const targetMeta = {
  POST: { label: "게시글", color: ds.sky, bg: ds.skySoft },
  REVIEW: { label: "후기", color: ds.violet, bg: ds.violetSoft },
  POST_COMMENT: { label: "게시글 댓글", color: ds.brand, bg: ds.brandSoft },
  REVIEW_COMMENT: { label: "후기 댓글", color: ds.brand, bg: ds.brandSoft },
  GALLERY: { label: "갤러리", color: ds.green, bg: ds.greenSoft },
};

const panel = {
  background: ds.card,
  border: `1px solid ${ds.line}`,
  borderRadius: ds.r,
  boxShadow: ds.sh,
};

const input = {
  width: "100%",
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

const actionButton = {
  height: 34,
  padding: "0 12px",
  borderRadius: 10,
  fontSize: 12,
  fontWeight: 700,
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 6,
  border: `1px solid ${ds.line}`,
  background: ds.bg,
  color: ds.ink,
};

const detailButton = {
  height: 30,
  padding: "0 10px",
  borderRadius: 10,
  border: `1px solid ${ds.line}`,
  background: "none",
  color: ds.ink3,
  fontSize: 12,
  fontWeight: 700,
  cursor: "pointer",
};

function fmt(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}:${String(date.getSeconds()).padStart(2, "0")}`;
}

function badge(meta, fallback) {
  const resolved = meta || { label: fallback || "-", color: ds.ink2, bg: ds.lineSoft };
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        height: 28,
        padding: "0 12px",
        borderRadius: 999,
        background: resolved.bg,
        color: resolved.color,
        fontSize: 12,
        fontWeight: 800,
      }}
    >
      {resolved.label}
    </span>
  );
}

function getPrimaryActionLabel() {
  return "숨김";
}

function getTargetStatusLabel(status) {
  if (!status) return "상태 미확인";
  if (["HIDDEN", "BLINDED", "DELETED"].includes(status)) return "숨김";
  if (["PUBLISHED", "PUBLIC", "ACTIVE"].includes(status)) return "노출중";
  return status;
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

function StatCard({ label, value, hint }) {
  return (
    <div style={{ ...panel, padding: 18 }}>
      <div style={{ fontSize: 12, color: ds.ink3, fontWeight: 700 }}>{label}</div>
      <div style={{ marginTop: 10, fontSize: 28, color: ds.inkW, fontWeight: 800 }}>{value}</div>
      <div style={{ marginTop: 6, fontSize: 11.5, color: ds.ink4 }}>{hint}</div>
    </div>
  );
}

export default function ReportManage() {
  const [page, setPage] = useState(0);
  const [filters, setFilters] = useState({ status: "", targetType: "", reporterUserId: "" });
  const [applied, setApplied] = useState({ status: "", targetType: "", reporterUserId: "" });
  const [sortBy, setSortBy] = useState("LATEST");
  const [reportPage, setReportPage] = useState({ content: [], totalElements: 0, totalPages: 0, last: true });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [lastLoadedAt, setLastLoadedAt] = useState(null);
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [decisionReason, setDecisionReason] = useState("");
  const [decisionLoading, setDecisionLoading] = useState("");
  const [quickActionKey, setQuickActionKey] = useState("");
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

  const loadReports = useCallback(async ({ silent = false } = {}) => {
    if (silent) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await axiosInstance.get("/api/admin/reports", {
        params: {
          page,
          size: PAGE_SIZE,
          status: applied.status || undefined,
          targetType: applied.targetType || undefined,
          reporterUserId: applied.reporterUserId || undefined,
          sortBy,
        },
      });

      const payload = res?.data?.data;
      const nextContent = Array.isArray(payload?.content) ? payload.content : [];

      setReportPage({
        content: nextContent,
        totalElements: Number(payload?.totalElements ?? 0),
        totalPages: Number(payload?.totalPages ?? 0),
        last: Boolean(payload?.last ?? true),
      });
      setSelected((prev) => {
        if (!prev?.reportId) return prev;
        return nextContent.find((item) => item.reportId === prev.reportId) || prev;
      });
      setLastLoadedAt(new Date());
      setError("");
    } catch (err) {
      console.error("[ReportManage] load failed:", err);
      setError("신고 목록을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [applied, page, sortBy]);

  const loadDetail = useCallback(async (reportId) => {
    if (!reportId) return;
    setDetailLoading(true);
    setDetailError("");
    try {
      const res = await axiosInstance.get(`/api/admin/reports/${reportId}`);
      setDetail(res?.data?.data ?? null);
    } catch (err) {
      console.error("[ReportManage] detail failed:", err);
      setDetail(null);
      setDetailError("신고 상세를 불러오지 못했습니다.");
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  useEffect(() => {
    if (selected?.reportId) loadDetail(selected.reportId);
  }, [loadDetail, selected]);

  const pageStats = useMemo(() => ({
    pending: reportPage.content.filter((item) => item.status === "PENDING").length,
    processed: reportPage.content.filter((item) => item.status !== "PENDING").length,
    avgCount: reportPage.content.length
      ? Math.round(
          reportPage.content.reduce((sum, item) => sum + Number(item.totalReportCount || 0), 0) /
            reportPage.content.length,
        )
      : 0,
  }), [reportPage.content]);

  const paginationItems = useMemo(
    () => buildPagination(page, reportPage.totalPages),
    [page, reportPage.totalPages],
  );

  const rangeText = useMemo(() => {
    if (reportPage.totalElements === 0) return "0건";
    const start = page * PAGE_SIZE + 1;
    const end = Math.min((page + 1) * PAGE_SIZE, reportPage.totalElements);
    return `${start}-${end} / 총 ${reportPage.totalElements}건`;
  }, [page, reportPage.totalElements]);

  const active = detail || selected;
  const primaryActionLabel = getPrimaryActionLabel();

  const applyFilters = () => {
    const reporterUserId = String(filters.reporterUserId || "").trim();
    if (reporterUserId && !/^\d+$/.test(reporterUserId)) {
      setError("신고자 ID는 숫자만 입력할 수 있습니다.");
      return;
    }
    setError("");
    setPage(0);
    setApplied({
      status: filters.status,
      targetType: filters.targetType,
      reporterUserId,
    });
  };

  const patchDecision = useCallback(async (reportId, decision, reason = null) => {
    await axiosInstance.patch(`/api/admin/reports/${reportId}`, {
      decision,
      reason: reason || null,
    });
  }, []);

  const refreshAfterDecision = useCallback(async (reportId) => {
    await loadReports({ silent: true });
    if (reportId && selected?.reportId === reportId) {
      await loadDetail(reportId);
    }
  }, [loadDetail, loadReports, selected?.reportId]);

  const handleQuickDecision = useCallback(async (report, decision) => {
    if (!report?.reportId || report.status !== "PENDING") return;

    const actionLabel = decision === "ACCEPT" ? getPrimaryActionLabel() : "거절";
    const confirmed = window.confirm(`신고 #${report.reportId}를 ${actionLabel} 처리하시겠습니까?`);
    if (!confirmed) return;

    const loadingKey = `${decision}:${report.reportId}`;
    setQuickActionKey(loadingKey);
    setError("");
    try {
      await patchDecision(report.reportId, decision);
      await refreshAfterDecision(report.reportId);
    } catch (err) {
      console.error("[ReportManage] quick decision failed:", err);
      setError(err?.response?.data?.message || "신고 처리에 실패했습니다.");
    } finally {
      setQuickActionKey("");
    }
  }, [patchDecision, refreshAfterDecision]);

  const handleDecision = async (decision) => {
    if (!selected?.reportId || decisionLoading) return;
    setDecisionLoading(decision);
    setDetailError("");
    try {
      await patchDecision(selected.reportId, decision, String(decisionReason || "").trim() || null);
      await refreshAfterDecision(selected.reportId);
    } catch (err) {
      console.error("[ReportManage] decision failed:", err);
      setDetailError(err?.response?.data?.message || "신고 처리에 실패했습니다.");
    } finally {
      setDecisionLoading("");
    }
  };

  const openDetailModal = (report) => {
    setSelected(report);
    setDetail(null);
    setDetailError("");
    setDecisionReason("");
  };

  return (
    <div style={{ display: "grid", gap: 18, color: ds.ink, fontFamily: ds.ff }}>
      <div style={{ display: "grid", gap: 18 }}>
        <section style={{ ...panel, padding: isMobile ? 16 : 20, display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", alignItems: isCompact ? "stretch" : "center" }}>
          <div style={{ display: "grid", gap: 8 }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: ds.inkW }}>신고 관리</div>
            <div style={{ fontSize: 13, color: ds.ink3 }}>
              신고가 많은 대상을 우선 확인하고, 제목 클릭으로 원문 이동과 승인·거절 처리를 바로 진행합니다.
            </div>
          </div>
          <button
            type="button"
            onClick={() => loadReports({ silent: true })}
            disabled={loading || refreshing}
            style={{
              ...input,
              width: isMobile ? "100%" : 136,
              cursor: loading || refreshing ? "not-allowed" : "pointer",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              opacity: loading || refreshing ? 0.65 : 1,
            }}
          >
            <RefreshCw size={14} className={refreshing ? "animate-spin" : undefined} />
            새로고침
          </button>
        </section>

        <section style={{ display: "grid", gap: 14, gridTemplateColumns: isMobile ? "1fr" : isTablet ? "repeat(2, minmax(0, 1fr))" : "repeat(4, minmax(0, 1fr))" }}>
          <StatCard label="조회된 신고" value={reportPage.totalElements} hint="현재 필터 기준 전체 건수" />
          <StatCard label="현재 페이지 대기" value={pageStats.pending} hint="즉시 처리 가능한 신고" />
          <StatCard label="현재 페이지 처리완료" value={pageStats.processed} hint="승인 또는 거절 완료" />
          <StatCard label="평균 신고수" value={pageStats.avgCount} hint="현재 페이지 대상별 평균 신고 횟수" />
        </section>

        <section style={{ ...panel, padding: isMobile ? 16 : 20, display: "grid", gap: 16 }}>
          <div style={{ display: "grid", gap: 12, gridTemplateColumns: isMobile ? "1fr" : isTablet ? "repeat(2, minmax(0, 1fr))" : "minmax(220px, 1fr) 180px 180px 180px 132px" }}>
            <div style={{ position: "relative" }}>
              <Search size={14} color={ds.ink4} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} />
              <input
                value={filters.reporterUserId}
                onChange={(event) => setFilters((prev) => ({ ...prev, reporterUserId: event.target.value }))}
                onKeyDown={(event) => {
                  if (event.key === "Enter") applyFilters();
                }}
                inputMode="numeric"
                placeholder="신고자 ID"
                style={{ ...input, paddingLeft: 36 }}
              />
            </div>
            <select value={filters.status} onChange={(event) => setFilters((prev) => ({ ...prev, status: event.target.value }))} style={input}>
              {statusOptions.map((item) => (
                <option key={item.value || "all-status"} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
            <select value={filters.targetType} onChange={(event) => setFilters((prev) => ({ ...prev, targetType: event.target.value }))} style={input}>
              {targetTypeOptions.map((item) => (
                <option key={item.value || "all-target"} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
            <select value={sortBy} onChange={(event) => { setSortBy(event.target.value); setPage(0); }} style={input}>
              {sortOptions.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={applyFilters}
              style={{ ...input, background: ds.brand, borderColor: ds.brand, color: ds.inkW, cursor: "pointer" }}
            >
              적용
            </button>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", fontSize: 12, color: ds.ink4 }}>
            <div>마지막 조회 {fmt(lastLoadedAt)}</div>
            <div>{rangeText}</div>
          </div>
          {error ? <div style={{ padding: "12px 14px", borderRadius: 10, background: ds.redSoft, color: ds.inkW }}>{error}</div> : null}

          {isMobile ? (
            <div style={{ display: "grid", gap: 12 }}>
              {loading ? (
                <div style={{ padding: 24, borderRadius: 12, background: ds.bg, color: ds.ink3, textAlign: "center" }}>
                  신고 목록을 불러오는 중입니다.
                </div>
              ) : null}
              {!loading && reportPage.content.length === 0 ? (
                <div style={{ padding: 24, borderRadius: 12, background: ds.bg, color: ds.ink3, textAlign: "center" }}>
                  조회된 신고가 없습니다.
                </div>
              ) : null}
              {!loading
                ? reportPage.content.map((report) => {
                    const acceptKey = `ACCEPT:${report.reportId}`;
                    const rejectKey = `REJECT:${report.reportId}`;
                    const isPending = report.status === "PENDING";
                    const rowActionLabel = getPrimaryActionLabel();
                    const targetTitle = report.targetTitle || `${targetMeta[report.targetType]?.label || "대상"} #${report.targetId}`;
                    const targetStatusLabel = getTargetStatusLabel(report.targetStatus);

                    return (
                      <div key={report.reportId} style={{ background: ds.card, borderRadius: 12, border: `1px solid ${ds.line}`, padding: 14, display: "grid", gap: 10 }}>
                        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: 13, color: ds.ink4, fontWeight: 700 }}>신고 #{report.reportId}</div>
                            <div style={{ marginTop: 6 }}>{badge(statusMeta[report.status], report.status)}</div>
                          </div>
                          <div style={{ fontSize: 12, color: ds.ink4, flexShrink: 0 }}>{fmt(report.createdAt)}</div>
                        </div>
                        <div style={{ display: "grid", gap: 6 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                            {badge(targetMeta[report.targetType], report.targetType)}
                            <span style={{ fontSize: 12, color: ds.ink3 }}>#{report.targetId}</span>
                            <span style={{ fontSize: 12, color: ds.ink4 }}>현재 상태 {targetStatusLabel}</span>
                          </div>
                          <div style={{ fontSize: 13, color: ds.inkW, fontWeight: 700, lineHeight: 1.45, whiteSpace: "normal", wordBreak: "keep-all", overflowWrap: "break-word" }}>
                            {targetTitle}
                          </div>
                        </div>
                        <div style={{ display: "grid", gap: 4 }}>
                          <span style={{ fontSize: 11, color: ds.ink4, fontWeight: 700 }}>신고자 / 사유</span>
                          <div style={{ fontSize: 12.5, color: ds.inkW, whiteSpace: "normal", wordBreak: "keep-all", overflowWrap: "break-word" }}>
                            #{report.reporterUserId} · {report.reasonLabel || report.reasonCode || "-"}
                          </div>
                        </div>
                        <div style={{ display: "grid", gap: 4 }}>
                          <span style={{ fontSize: 11, color: ds.ink4, fontWeight: 700 }}>신고 수</span>
                          <div style={{ fontSize: 12.5, color: ds.ink3 }}>{report.totalReportCount}건 · 대기 {report.pendingReportCount}건</div>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                          <button type="button" onClick={() => openDetailModal(report)} style={{ ...detailButton, width: "100%" }}>
                            상세
                          </button>
                          {isPending ? (
                            <>
                              <button
                                type="button"
                                onClick={() => handleQuickDecision(report, "ACCEPT")}
                                disabled={Boolean(quickActionKey)}
                                style={{ ...actionButton, width: "100%", justifyContent: "center", background: ds.redSoft, borderColor: ds.red, color: ds.red, cursor: quickActionKey ? "not-allowed" : "pointer", opacity: quickActionKey ? 0.7 : 1 }}
                              >
                                <ShieldAlert size={13} />
                                {quickActionKey === acceptKey ? `${rowActionLabel} 중...` : rowActionLabel}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleQuickDecision(report, "REJECT")}
                                disabled={Boolean(quickActionKey)}
                                style={{ ...actionButton, width: "100%", justifyContent: "center", background: ds.bg, borderColor: ds.line, color: ds.ink, cursor: quickActionKey ? "not-allowed" : "pointer", opacity: quickActionKey ? 0.7 : 1 }}
                              >
                                <Ban size={13} />
                                {quickActionKey === rejectKey ? "거절 중..." : "거절"}
                              </button>
                            </>
                          ) : (
                            <span style={{ fontSize: 12, color: ds.ink3, fontWeight: 700 }}>처리 완료</span>
                          )}
                        </div>
                      </div>
                    );
                  })
                : null}
            </div>
          ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", minWidth: 1360, borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {["신고 ID", "상태", "대상", "신고자", "사유", "신고수", "신고일", "처리"].map((label) => (
                    <th key={label} style={{ textAlign: "left", padding: "12px 14px", fontSize: 12, color: ds.ink3, borderBottom: `1px solid ${ds.line}` }}>
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} style={{ padding: 28, color: ds.ink3, textAlign: "center" }}>
                      신고 목록을 불러오는 중입니다.
                    </td>
                  </tr>
                ) : null}
                {!loading && reportPage.content.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ padding: 28, color: ds.ink3, textAlign: "center" }}>
                      조회된 신고가 없습니다.
                    </td>
                  </tr>
                ) : null}
                {!loading
                  ? reportPage.content.map((report) => {
                      const acceptKey = `ACCEPT:${report.reportId}`;
                      const rejectKey = `REJECT:${report.reportId}`;
                      const isPending = report.status === "PENDING";
                      const rowActionLabel = getPrimaryActionLabel();
                      const targetTitle = report.targetTitle || `${targetMeta[report.targetType]?.label || "대상"} #${report.targetId}`;
                      const targetStatusLabel = getTargetStatusLabel(report.targetStatus);

                      return (
                        <tr key={report.reportId}>
                          <td style={{ padding: 14, borderBottom: `1px solid ${ds.lineSoft}`, fontSize: 13, color: ds.inkW, fontWeight: 700 }}>#{report.reportId}</td>
                          <td style={{ padding: 14, borderBottom: `1px solid ${ds.lineSoft}` }}>{badge(statusMeta[report.status], report.status)}</td>
                          <td style={{ padding: 14, borderBottom: `1px solid ${ds.lineSoft}`, minWidth: 340 }}>
                            <div style={{ display: "grid", gap: 6 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                                {badge(targetMeta[report.targetType], report.targetType)}
                                <span style={{ fontSize: 12, color: ds.ink3 }}>#{report.targetId}</span>
                                <span style={{ fontSize: 12, color: ds.ink4 }}>현재 상태 {targetStatusLabel}</span>
                              </div>
                              {report.targetPath ? (
                                <a
                                  href={report.targetPath}
                                  target="_blank"
                                  rel="noreferrer"
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: 6,
                                    minWidth: 0,
                                  maxWidth: "100%",
                                  color: ds.inkW,
                                  fontSize: 13,
                                  fontWeight: 700,
                                  lineHeight: 1.45,
                                  textDecoration: "none",
                                }}
                              >
                                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{targetTitle}</span>
                                  <ExternalLink size={13} style={{ flexShrink: 0, color: ds.brand }} />
                                </a>
                              ) : (
                                <div style={{ fontSize: 13, color: ds.inkW, fontWeight: 700, lineHeight: 1.45 }}>{targetTitle}</div>
                              )}
                            </div>
                          </td>
                          <td style={{ padding: 14, borderBottom: `1px solid ${ds.lineSoft}` }}>#{report.reporterUserId}</td>
                          <td style={{ padding: 14, borderBottom: `1px solid ${ds.lineSoft}`, maxWidth: 280 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                              <div style={{ flex: 1, minWidth: 0, fontSize: 13, color: ds.inkW, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                {report.reasonLabel || report.reasonCode || "-"}
                              </div>
                              <button
                                type="button"
                                onClick={() => openDetailModal(report)}
                                style={detailButton}
                              >
                                상세
                              </button>
                            </div>
                          </td>
                          <td style={{ padding: 14, borderBottom: `1px solid ${ds.lineSoft}` }}>
                            <div style={{ display: "grid", gap: 4 }}>
                              <div style={{ fontSize: 13, color: ds.inkW, fontWeight: 700 }}>{report.totalReportCount}건</div>
                              <div style={{ fontSize: 12, color: ds.ink3 }}>대기 {report.pendingReportCount}건</div>
                            </div>
                          </td>
                          <td style={{ padding: 14, borderBottom: `1px solid ${ds.lineSoft}`, color: ds.ink2 }}>{fmt(report.createdAt)}</td>
                          <td style={{ padding: 14, borderBottom: `1px solid ${ds.lineSoft}` }}>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                              {isPending ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleQuickDecision(report, "ACCEPT")}
                                    disabled={Boolean(quickActionKey)}
                                    style={{
                                      ...actionButton,
                                      background: ds.redSoft,
                                      borderColor: ds.red,
                                      color: ds.red,
                                      cursor: quickActionKey ? "not-allowed" : "pointer",
                                      opacity: quickActionKey ? 0.7 : 1,
                                    }}
                                  >
                                    <ShieldAlert size={13} />
                                    {quickActionKey === acceptKey ? `${rowActionLabel} 중...` : rowActionLabel}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleQuickDecision(report, "REJECT")}
                                    disabled={Boolean(quickActionKey)}
                                    style={{
                                      ...actionButton,
                                      background: ds.bg,
                                      borderColor: ds.line,
                                      color: ds.ink,
                                      cursor: quickActionKey ? "not-allowed" : "pointer",
                                      opacity: quickActionKey ? 0.7 : 1,
                                    }}
                                  >
                                    <Ban size={13} />
                                    {quickActionKey === rejectKey ? "거절 중..." : "거절"}
                                  </button>
                                </>
                              ) : (
                                <span style={{ fontSize: 12, color: ds.ink3, fontWeight: 700 }}>처리 완료</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  : null}
              </tbody>
            </table>
          </div>
          )}

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            <div style={{ fontSize: 12, color: ds.ink4 }}>정렬 기준: {sortOptions.find((item) => item.value === sortBy)?.label || "최신 신고순"}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <button
                type="button"
                disabled={page <= 0}
                onClick={() => setPage((prev) => Math.max(prev - 1, 0))}
                style={{
                  ...actionButton,
                  width: 38,
                  height: 38,
                  padding: 0,
                  cursor: page <= 0 ? "not-allowed" : "pointer",
                  opacity: page <= 0 ? 0.45 : 1,
                }}
              >
                <ChevronLeft size={14} />
              </button>
              {paginationItems.map((item) =>
                typeof item === "string" ? (
                  <span key={item} style={{ minWidth: 18, textAlign: "center", color: ds.ink4 }}>
                    ...
                  </span>
                ) : (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setPage(item)}
                    style={{
                      ...actionButton,
                      minWidth: 38,
                      height: 38,
                      padding: "0 10px",
                      background: item === page ? ds.brand : ds.card,
                      borderColor: item === page ? ds.brand : ds.line,
                      color: item === page ? ds.inkW : ds.ink,
                    }}
                  >
                    {item + 1}
                  </button>
                ),
              )}
              <button
                type="button"
                disabled={reportPage.last || reportPage.totalPages === 0}
                onClick={() => setPage((prev) => prev + 1)}
                style={{
                  ...actionButton,
                  width: 38,
                  height: 38,
                  padding: 0,
                  cursor: reportPage.last || reportPage.totalPages === 0 ? "not-allowed" : "pointer",
                  opacity: reportPage.last || reportPage.totalPages === 0 ? 0.45 : 1,
                }}
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </section>
      </div>

      {selected ? (
        <>
          <div
            onClick={() => {
              if (!decisionLoading) {
                setSelected(null);
                setDetail(null);
                setDetailError("");
              }
            }}
            style={{ position: "fixed", inset: 0, zIndex: 60, background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }}
          />
          <div style={{ position: "fixed", inset: 0, zIndex: 61, display: "flex", alignItems: "center", justifyContent: "center", padding: isMobile ? 12 : 24 }}>
            <div style={{ width: isCompact ? "min(900px, calc(100vw - 24px))" : "min(900px, 100%)", maxHeight: isMobile ? "92vh" : "90vh", overflow: "auto", background: ds.card, borderRadius: 22, border: `1px solid ${ds.line}`, boxShadow: ds.sh3 }}>
              <div style={{ padding: isMobile ? "18px 18px 16px" : "24px 26px 20px", borderBottom: `1px solid ${ds.line}`, display: "flex", justifyContent: "space-between", gap: 16, flexDirection: isMobile ? "column" : "row", alignItems: isMobile ? "flex-start" : "center" }}>
                <div style={{ display: "grid", gap: 10 }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: ds.inkW }}>신고 #{selected.reportId}</div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {badge(statusMeta[active?.status], active?.status)}
                    {badge(targetMeta[active?.targetType], active?.targetType)}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (!decisionLoading) {
                      setSelected(null);
                      setDetail(null);
                      setDetailError("");
                    }
                  }}
                  style={{ ...input, width: 38, padding: 0, cursor: decisionLoading ? "not-allowed" : "pointer" }}
                >
                  <X size={16} />
                </button>
              </div>
              <div style={{ padding: isMobile ? 18 : 26, display: "grid", gap: 18 }}>
                {detailError ? <div style={{ padding: "12px 14px", borderRadius: 10, background: ds.redSoft, color: ds.inkW }}>{detailError}</div> : null}
                {detailLoading ? <div style={{ color: ds.ink3 }}>신고 상세를 불러오는 중입니다.</div> : null}
                {!detailLoading ? (
                  <>
                    <div style={{ ...panel, padding: 18, display: "grid", gap: 10 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", minWidth: 0 }}>
                        {badge(targetMeta[active?.targetType], active?.targetType)}
                        <span style={{ fontSize: 12, color: ds.ink3 }}>#{active?.targetId || "-"}</span>
                        <span style={{ fontSize: 12, color: ds.ink4 }}>현재 상태 {getTargetStatusLabel(active?.targetStatus)}</span>
                        {active?.targetPath ? (
                          <a
                            href={active.targetPath}
                            target="_blank"
                            rel="noreferrer"
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 6,
                              minWidth: 0,
                              maxWidth: "100%",
                              color: ds.inkW,
                              fontSize: 14,
                              fontWeight: 700,
                              textDecoration: "none",
                              flexWrap: isMobile ? "wrap" : "nowrap",
                            }}
                          >
                            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: isMobile ? "normal" : "nowrap", wordBreak: isMobile ? "break-word" : "normal" }}>
                              {active?.targetTitle || `대상 #${active?.targetId || "-"}`}
                            </span>
                            <ExternalLink size={14} style={{ flexShrink: 0, color: ds.brand }} />
                          </a>
                        ) : (
                          <div style={{ fontSize: 14, color: ds.inkW, fontWeight: 700 }}>
                            {active?.targetTitle || `대상 #${active?.targetId || "-"}`}
                          </div>
                        )}
                      </div>
                    </div>

                    <div style={{ display: "grid", gap: 16, gridTemplateColumns: isMobile ? "1fr" : isTablet ? "repeat(2, minmax(0, 1fr))" : "repeat(3, minmax(0, 1fr))" }}>
                      {[
                        ["대상 ID", active?.targetId],
                        ["대상 상태", getTargetStatusLabel(active?.targetStatus)],
                        ["신고자 ID", active?.reporterUserId ? `#${active.reporterUserId}` : "-"],
                        ["신고 일시", fmt(active?.createdAt)],
                        ["처리 일시", fmt(active?.resolvedAt)],
                        ["처리 관리자", active?.resolvedByAdminId ? `#${active.resolvedByAdminId}` : "-"],
                        ["누적 신고", `${active?.totalReportCount ?? selected?.totalReportCount ?? 0}건`],
                        ["미처리 신고", `${active?.pendingReportCount ?? selected?.pendingReportCount ?? 0}건`],
                        ["사유 코드", active?.reasonLabel || active?.reasonCode || "-"],
                      ].map(([label, value]) => (
                        <div key={label} style={{ display: "grid", gap: 6 }}>
                          <div style={{ fontSize: 12, color: ds.ink4, fontWeight: 700 }}>{label}</div>
                          <div style={{ fontSize: 14, color: ds.ink }}>{value || "-"}</div>
                        </div>
                      ))}
                    </div>

                    <div style={{ ...panel, padding: 18 }}>
                      <div style={{ fontSize: 12, color: ds.ink4, fontWeight: 700 }}>신고 상세 사유</div>
                      <div style={{ marginTop: 8, fontSize: 14, color: ds.ink, lineHeight: 1.7 }}>{active?.reasonDetail || active?.reason || "-"}</div>
                    </div>

                    {active?.status === "PENDING" ? (
                      <div style={{ ...panel, padding: 18, display: "grid", gap: 12 }}>
                        <div style={{ fontSize: 13, color: ds.ink2, fontWeight: 700 }}>처리 메모</div>
                        <textarea
                          value={decisionReason}
                          onChange={(event) => setDecisionReason(event.target.value)}
                          rows={5}
                          placeholder="처리 사유를 남기면 admin_logs에 함께 기록됩니다."
                          style={{ width: "100%", borderRadius: 12, border: `1px solid ${ds.line}`, background: ds.bg, color: ds.ink, padding: isMobile ? 12 : 14, fontSize: 14, lineHeight: 1.7, resize: "vertical", fontFamily: ds.ff }}
                        />
                        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, flexWrap: "wrap", flexDirection: isMobile ? "column-reverse" : "row" }}>
                          <button
                            type="button"
                            onClick={() => handleDecision("REJECT")}
                            disabled={Boolean(decisionLoading)}
                            style={{ ...input, width: isMobile ? "100%" : 120, cursor: decisionLoading ? "not-allowed" : "pointer" }}
                          >
                            {decisionLoading === "REJECT" ? "거절 중..." : "거절"}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDecision("ACCEPT")}
                            disabled={Boolean(decisionLoading)}
                            style={{ ...input, width: isMobile ? "100%" : 140, background: ds.red, borderColor: ds.red, color: ds.inkW, cursor: decisionLoading ? "not-allowed" : "pointer" }}
                          >
                            {decisionLoading === "ACCEPT" ? `${primaryActionLabel} 중...` : primaryActionLabel}
                          </button>
                        </div>
                      </div>
                    ) : null}
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
