import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Search,
  RefreshCw,
  AlertTriangle,
  Check,
  ChevronLeft,
  ChevronRight,
  Shield,
} from "lucide-react";
import ds from "../shared/designTokens";
import { axiosInstance } from "../../../app/http/axiosInstance";

const PAGE_SIZE = 20;

const TARGET_TYPE_OPTIONS = [
  { value: "", label: "전체 대상" },
  { value: "EVENT", label: "행사" },
  { value: "PROGRAM", label: "프로그램" },
  { value: "BOOTH", label: "부스" },
  { value: "NOTICE", label: "공지" },
  { value: "POST", label: "게시글" },
  { value: "QNA", label: "QnA" },
  { value: "INQUIRY", label: "문의" },
  { value: "REVIEW", label: "후기" },
  { value: "PAYMENT", label: "결제" },
  { value: "REFUND", label: "환불" },
  { value: "GALLERY", label: "갤러리" },
  { value: "QR", label: "QR" },
  { value: "USER", label: "회원" },
  { value: "SYSTEM", label: "시스템" },
  { value: "OTHER", label: "기타" },
];

const TARGET_TYPE_META = {
  EVENT: { label: "행사", color: ds.green, background: ds.greenSoft },
  PROGRAM: { label: "프로그램", color: ds.brand, background: ds.brandSoft },
  BOOTH: { label: "부스", color: ds.sky, background: ds.skySoft },
  NOTICE: { label: "공지", color: ds.brand, background: ds.brandSoft },
  POST: { label: "게시글", color: ds.sky, background: ds.skySoft },
  QNA: { label: "QnA", color: ds.violet, background: ds.violetSoft },
  INQUIRY: { label: "문의", color: ds.violet, background: ds.violetSoft },
  REVIEW: { label: "후기", color: ds.violet, background: ds.violetSoft },
  PAYMENT: { label: "결제", color: ds.amber, background: ds.amberSoft },
  REFUND: { label: "환불", color: ds.red, background: ds.redSoft },
  GALLERY: { label: "갤러리", color: ds.green, background: ds.greenSoft },
  QR: { label: "QR", color: ds.sky, background: ds.skySoft },
  USER: { label: "회원", color: ds.green, background: ds.greenSoft },
  SYSTEM: { label: "시스템", color: ds.ink2, background: ds.lineSoft },
  OTHER: { label: "기타", color: ds.ink2, background: ds.lineSoft },
};

const panelStyle = {
  background: ds.card,
  border: `1px solid ${ds.line}`,
  borderRadius: ds.r,
  boxShadow: ds.sh,
};

const inputStyle = {
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

const selectStyle = {
  ...inputStyle,
  appearance: "none",
  cursor: "pointer",
  paddingRight: 40,
};

const buttonStyle = {
  height: 42,
  borderRadius: 10,
  border: `1px solid ${ds.line}`,
  background: ds.bg,
  color: ds.ink2,
  fontSize: 13,
  fontWeight: 700,
  fontFamily: ds.ff,
  padding: "0 14px",
  cursor: "pointer",
};

const formatDateTime = (value) => {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const mi = String(date.getMinutes()).padStart(2, "0");
  const ss = String(date.getSeconds()).padStart(2, "0");
  return `${yyyy}.${mm}.${dd} ${hh}:${mi}:${ss}`;
};

const resolveTargetMeta = (targetType) =>
  TARGET_TYPE_META[targetType] || TARGET_TYPE_META.OTHER;

function SummaryCard({ label, value, hint }) {
  return (
    <div
      style={{
        ...panelStyle,
        padding: 20,
        minHeight: 108,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
      }}
    >
      <div style={{ fontSize: 12, color: ds.ink3, fontWeight: 700 }}>{label}</div>
      <div style={{ fontSize: 28, color: ds.inkW, fontWeight: 800 }}>{value}</div>
      <div style={{ fontSize: 11.5, color: ds.ink4 }}>{hint}</div>
    </div>
  );
}

function PageButton({ disabled, onClick, children }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      style={{
        ...buttonStyle,
        minWidth: 88,
        opacity: disabled ? 0.45 : 1,
        cursor: disabled ? "not-allowed" : "pointer",
      }}
    >
      {children}
    </button>
  );
}

export default function AdminLogManage() {
  const [viewportWidth, setViewportWidth] = useState(() =>
    typeof window === "undefined" ? 1440 : window.innerWidth,
  );
  const [page, setPage] = useState(0);
  const [keyword, setKeyword] = useState("");
  const [appliedKeyword, setAppliedKeyword] = useState("");
  const [targetType, setTargetType] = useState("");
  const [logsPage, setLogsPage] = useState({
    content: [],
    page: 0,
    size: PAGE_SIZE,
    totalElements: 0,
    totalPages: 0,
    last: true,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [lastLoadedAt, setLastLoadedAt] = useState(null);

  const loadLogs = useCallback(
    async ({ silent = false } = {}) => {
      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      try {
        const response = await axiosInstance.get("/api/admin/logs", {
          params: {
            page,
            size: PAGE_SIZE,
            keyword: appliedKeyword || undefined,
            targetType: targetType || undefined,
          },
        });

        const payload = response?.data?.data;
        setLogsPage({
          content: Array.isArray(payload?.content) ? payload.content : [],
          page: payload?.page ?? page,
          size: payload?.size ?? PAGE_SIZE,
          totalElements: payload?.totalElements ?? 0,
          totalPages: payload?.totalPages ?? 0,
          last: Boolean(payload?.last ?? true),
        });
        setLastLoadedAt(new Date());
        setError("");
      } catch (err) {
        console.error("[AdminLogManage] log load failed:", err);
        setError("관리자 로그를 불러오지 못했습니다.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [page, appliedKeyword, targetType],
  );

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  useEffect(() => {
    const timerId = setInterval(() => {
      loadLogs({ silent: true });
    }, 10000);

    return () => clearInterval(timerId);
  }, [loadLogs]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const syncViewport = () => setViewportWidth(window.innerWidth);
    syncViewport();
    window.addEventListener("resize", syncViewport);
    return () => window.removeEventListener("resize", syncViewport);
  }, []);

  const currentLogs = logsPage.content;
  const isMobile = viewportWidth < 768;
  const failedCount = useMemo(
    () => currentLogs.filter((log) => log.failed).length,
    [currentLogs],
  );
  const uniqueTargetCount = useMemo(() => {
    return new Set(
      currentLogs.map((log) => `${log.targetType || "OTHER"}:${log.targetId || "-"}`),
    ).size;
  }, [currentLogs]);

  const handleSearch = () => {
    const nextKeyword = keyword.trim();
    if (page !== 0) {
      setPage(0);
      if (appliedKeyword !== nextKeyword) {
        setAppliedKeyword(nextKeyword);
      }
      return;
    }
    if (appliedKeyword !== nextKeyword) {
      setAppliedKeyword(nextKeyword);
      return;
    }
    loadLogs();
  };

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <div
        style={{
          ...panelStyle,
          padding: 20,
          display: "grid",
          gap: 16,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "grid", gap: 8 }}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                width: "fit-content",
                padding: "6px 10px",
                borderRadius: 999,
                background: ds.brandSoft,
                color: ds.brand,
                fontSize: 12,
                fontWeight: 800,
              }}
            >
              <Shield size={14} />
              관리자 감사 로그
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: ds.inkW }}>
              관리자 작업 이력 조회
            </div>
            <div style={{ fontSize: 13, color: ds.ink3, lineHeight: 1.6 }}>
              admin_logs 기준 최신 작업 이력을 조회합니다. 현재 페이지는 10초마다 자동 새로고침됩니다.
            </div>
          </div>

          <button
            type="button"
            onClick={() => loadLogs({ silent: true })}
            style={{
              ...buttonStyle,
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <RefreshCw size={14} />
            {refreshing ? "새로고침 중" : "즉시 새로고침"}
          </button>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile
              ? "1fr"
              : "minmax(280px, 1.6fr) minmax(180px, 0.9fr) auto",
            gap: 12,
          }}
        >
          <div style={{ position: "relative" }}>
            <Search
              size={15}
              color={ds.ink4}
              style={{
                position: "absolute",
                left: 14,
                top: "50%",
                transform: "translateY(-50%)",
              }}
            />
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSearch();
              }}
              placeholder="액션, 관리자 ID, 대상 ID로 검색"
              style={{ ...inputStyle, paddingLeft: 40 }}
            />
          </div>

          <div style={{ position: "relative" }}>
            <select
              value={targetType}
              onChange={(e) => {
                setPage(0);
                setTargetType(e.target.value);
              }}
              style={selectStyle}
            >
              {TARGET_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={handleSearch}
            style={{
              ...buttonStyle,
              borderColor: `${ds.brand}55`,
              background: ds.brand,
              color: "#fff",
              minWidth: isMobile ? 0 : 104,
              width: isMobile ? "100%" : "auto",
            }}
          >
            검색
          </button>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "repeat(2, minmax(0, 1fr))" : "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 14,
        }}
      >
        <SummaryCard
          label="전체 로그"
          value={logsPage.totalElements.toLocaleString()}
          hint="현재 조건 기준 총 로그 수"
        />
        <SummaryCard
          label="현재 페이지 실패"
          value={failedCount.toLocaleString()}
          hint="현재 목록에서 실패로 기록된 건수"
        />
        <SummaryCard
          label="현재 페이지 대상 수"
          value={uniqueTargetCount.toLocaleString()}
          hint="현재 목록에 포함된 대상 조합 수"
        />
      </div>

      <div style={{ ...panelStyle, overflow: "hidden" }}>
        <div
          style={{
            padding: "16px 20px",
            borderBottom: `1px solid ${ds.line}`,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 800, color: ds.inkW }}>
            로그 목록
          </div>
          <div style={{ fontSize: 12, color: ds.ink4 }}>
            최근 동기화: {lastLoadedAt ? formatDateTime(lastLoadedAt) : "-"}
          </div>
        </div>

        {isMobile ? (
          <div style={{ display: "grid", gap: 12, padding: 12 }}>
            {loading ? (
              <div
                style={{
                  padding: "56px 18px",
                  textAlign: "center",
                  color: ds.ink3,
                  fontSize: 13.5,
                }}
              >
                관리자 로그를 불러오는 중입니다.
              </div>
            ) : error ? (
              <div
                style={{
                  padding: "40px 18px",
                  textAlign: "center",
                  color: ds.red,
                  fontSize: 13.5,
                  fontWeight: 700,
                }}
              >
                {error}
              </div>
            ) : currentLogs.length === 0 ? (
              <div
                style={{
                  padding: "56px 18px",
                  textAlign: "center",
                  color: ds.ink3,
                  fontSize: 13.5,
                }}
              >
                조회된 관리자 로그가 없습니다.
              </div>
            ) : (
              currentLogs.map((log) => {
                const targetMeta = resolveTargetMeta(log.targetType);
                return (
                  <div
                    key={log.logId}
                    style={{
                      border: `1px solid ${ds.line}`,
                      borderRadius: 12,
                      background: ds.bg,
                      padding: 14,
                      display: "grid",
                      gap: 10,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
                      <div style={{ display: "grid", gap: 4, minWidth: 0 }}>
                        <div style={{ color: ds.inkW, fontSize: 14, fontWeight: 800, wordBreak: "break-word" }}>
                          {log.actionLabel || log.action || "-"}
                        </div>
                        <div style={{ color: ds.ink4, fontSize: 11.5 }}>
                          {formatDateTime(log.createdAt)}
                        </div>
                      </div>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          padding: "5px 10px",
                          borderRadius: 999,
                          fontSize: 11.5,
                          fontWeight: 800,
                          color: log.failed ? ds.red : ds.green,
                          background: log.failed ? ds.redSoft : ds.greenSoft,
                          flexShrink: 0,
                        }}
                      >
                        {log.failed ? <AlertTriangle size={13} /> : <Check size={13} />}
                        {log.failed ? "실패" : "성공"}
                      </span>
                    </div>

                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          padding: "5px 10px",
                          borderRadius: 999,
                          fontSize: 11.5,
                          fontWeight: 800,
                          color: targetMeta.color,
                          background: targetMeta.background,
                        }}
                      >
                        {targetMeta.label}
                      </span>
                      <span style={{ fontSize: 12, color: ds.ink3, fontWeight: 700 }}>
                        대상 ID {log.targetId ?? "-"}
                      </span>
                    </div>

                    <div style={{ display: "grid", gap: 4 }}>
                      <div style={{ color: ds.inkW, fontSize: 13, fontWeight: 700 }}>
                        {log.adminName || `관리자 #${log.adminId}`}
                      </div>
                      <div style={{ color: ds.ink4, fontSize: 11.5, wordBreak: "break-word" }}>
                        ID {log.adminId}
                        {log.adminEmail ? ` · ${log.adminEmail}` : ""}
                      </div>
                      {log.errorCode ? (
                        <div style={{ color: ds.red, fontSize: 11.5 }}>
                          오류 코드: {log.errorCode}
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        ) : (
        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              minWidth: 1040,
            }}
          >
            <thead>
              <tr style={{ background: "rgba(255,255,255,0.03)" }}>
                {["일시", "관리자", "액션", "대상", "대상 ID", "상태"].map((label) => (
                  <th
                    key={label}
                    style={{
                      padding: "14px 18px",
                      textAlign: "left",
                      fontSize: 12,
                      color: ds.ink3,
                      fontWeight: 700,
                      borderBottom: `1px solid ${ds.line}`,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={6}
                    style={{
                      padding: "56px 18px",
                      textAlign: "center",
                      color: ds.ink3,
                      fontSize: 13.5,
                    }}
                  >
                    관리자 로그를 불러오는 중입니다.
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td
                    colSpan={6}
                    style={{
                      padding: "40px 18px",
                      textAlign: "center",
                      color: ds.red,
                      fontSize: 13.5,
                      fontWeight: 700,
                    }}
                  >
                    {error}
                  </td>
                </tr>
              ) : currentLogs.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    style={{
                      padding: "56px 18px",
                      textAlign: "center",
                      color: ds.ink3,
                      fontSize: 13.5,
                    }}
                  >
                    조회된 관리자 로그가 없습니다.
                  </td>
                </tr>
              ) : (
                currentLogs.map((log) => {
                  const targetMeta = resolveTargetMeta(log.targetType);
                  return (
                    <tr key={log.logId}>
                      <td
                        style={{
                          padding: "16px 18px",
                          borderBottom: `1px solid ${ds.line}`,
                          color: ds.ink2,
                          fontSize: 12.5,
                          whiteSpace: "nowrap",
                          verticalAlign: "top",
                        }}
                      >
                        {formatDateTime(log.createdAt)}
                      </td>
                      <td
                        style={{
                          padding: "16px 18px",
                          borderBottom: `1px solid ${ds.line}`,
                          verticalAlign: "top",
                        }}
                      >
                        <div style={{ display: "grid", gap: 4 }}>
                          <div style={{ color: ds.inkW, fontSize: 13, fontWeight: 700 }}>
                            {log.adminName || `관리자 #${log.adminId}`}
                          </div>
                          <div style={{ color: ds.ink4, fontSize: 11.5 }}>
                            ID {log.adminId}
                            {log.adminEmail ? ` · ${log.adminEmail}` : ""}
                          </div>
                        </div>
                      </td>
                      <td
                        style={{
                          padding: "16px 18px",
                          borderBottom: `1px solid ${ds.line}`,
                          verticalAlign: "top",
                        }}
                      >
                        <div style={{ display: "grid", gap: 6 }}>
                          <div style={{ color: ds.inkW, fontSize: 13, fontWeight: 700 }}>
                            {log.actionLabel || log.action || "-"}
                          </div>
                          {log.errorCode && (
                            <div style={{ color: ds.red, fontSize: 11.5 }}>
                              오류 코드: {log.errorCode}
                            </div>
                          )}
                        </div>
                      </td>
                      <td
                        style={{
                          padding: "16px 18px",
                          borderBottom: `1px solid ${ds.line}`,
                          verticalAlign: "top",
                        }}
                      >
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            padding: "5px 10px",
                            borderRadius: 999,
                            fontSize: 11.5,
                            fontWeight: 800,
                            color: targetMeta.color,
                            background: targetMeta.background,
                          }}
                        >
                          {targetMeta.label}
                        </span>
                      </td>
                      <td
                        style={{
                          padding: "16px 18px",
                          borderBottom: `1px solid ${ds.line}`,
                          color: ds.ink2,
                          fontSize: 12.5,
                          verticalAlign: "top",
                        }}
                      >
                        {log.targetId ?? "-"}
                      </td>
                      <td
                        style={{
                          padding: "16px 18px",
                          borderBottom: `1px solid ${ds.line}`,
                          verticalAlign: "top",
                        }}
                      >
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                            padding: "5px 10px",
                            borderRadius: 999,
                            fontSize: 11.5,
                            fontWeight: 800,
                            color: log.failed ? ds.red : ds.green,
                            background: log.failed ? ds.redSoft : ds.greenSoft,
                          }}
                        >
                          {log.failed ? (
                            <AlertTriangle size={13} />
                          ) : (
                            <Check size={13} />
                          )}
                          {log.failed ? "실패" : "성공"}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        )}

        <div
          style={{
            padding: "16px 20px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: isMobile ? "stretch" : "center",
            gap: 12,
            flexWrap: "wrap",
            flexDirection: isMobile ? "column" : "row",
          }}
        >
          <div style={{ fontSize: 12.5, color: ds.ink3 }}>
            총 {logsPage.totalElements.toLocaleString()}건 중 {(logsPage.page + 1).toLocaleString()} /{" "}
            {Math.max(logsPage.totalPages, 1).toLocaleString()} 페이지
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8, width: isMobile ? "100%" : "auto" }}>
            <PageButton
              disabled={page <= 0}
              onClick={() => setPage((prev) => Math.max(prev - 1, 0))}
            >
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <ChevronLeft size={14} />
                이전
              </span>
            </PageButton>

            <PageButton
              disabled={logsPage.totalPages === 0 || page >= logsPage.totalPages - 1}
              onClick={() =>
                setPage((prev) =>
                  logsPage.totalPages > 0 ? Math.min(prev + 1, logsPage.totalPages - 1) : prev,
                )
              }
            >
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                다음
                <ChevronRight size={14} />
              </span>
            </PageButton>
          </div>
        </div>
      </div>
    </div>
  );
}
