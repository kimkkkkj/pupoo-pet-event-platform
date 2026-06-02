import { useState, useEffect, useCallback, useRef } from "react";
import { Plus, Trash2, X, AlertTriangle, Loader2, ShieldAlert, Upload, FileText, CheckCircle, ScrollText, Search, History } from "lucide-react";
import ds from "../shared/designTokens";
import { boardApi } from "../../../app/http/boardApi";
import {
  bannedWordApi,
  moderationLogsApi,
  policyApi,
  BANNED_WORD_CATEGORIES,
} from "../../../app/http/bannedWordApi";

function fmtDate(dt) {
  if (!dt) return "-";
  const d = new Date(dt);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

function fmtDateTime(dt) {
  if (!dt) return "-";
  const d = new Date(dt);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function getCategoryLabel(value) {
  return BANNED_WORD_CATEGORIES.find((c) => c.value === value)?.label ?? value;
}

/* ── Toast ── */
function Toast({ msg, type = "success", onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2200);
    return () => clearTimeout(t);
  }, [onDone]);
  const bg = type === "success" ? "#3a4520" : type === "error" ? "#EF4444" : "#F59E0B";
  return (
    <div
      style={{
        position: "fixed",
        top: 24,
        right: 24,
        zIndex: 9999,
        background: bg,
        color: "#fff",
        padding: "12px 22px",
        borderRadius: 10,
        fontSize: 13.5,
        fontWeight: 600,
        fontFamily: ds.ff,
        boxShadow: "0 8px 30px rgba(0,0,0,0.18)",
      }}
    >
      {type === "success" ? "✓" : "✕"} {msg}
    </div>
  );
}

/* ── Confirm Modal ── */
function ConfirmModal({ title, msg, onConfirm, onCancel, loading }) {
  return (
    <div
      onClick={onCancel}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 5000,
        background: "rgba(0,0,0,0.32)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: ds.bg,
          borderRadius: 16,
          width: 400,
          padding: 28,
          boxShadow: "0 24px 60px rgba(0,0,0,0.18)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
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
            <AlertTriangle size={18} color="#EF4444" />
          </div>
          <h3 style={{ fontSize: 16, fontWeight: 800, color: ds.ink, margin: 0 }}>
            {title}
          </h3>
        </div>
        <p style={{ fontSize: 13.5, color: ds.ink3, lineHeight: 1.6, margin: "0 0 24px" }}>
          {msg}
        </p>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button
            onClick={onCancel}
            disabled={loading}
            style={{
              padding: "9px 20px",
              borderRadius: 8,
              border: `1px solid ${ds.line}`,
              background: ds.bg,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: ds.ff,
              color: ds.ink3,
            }}
          >
            취소
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            style={{
              padding: "9px 20px",
              borderRadius: 8,
              border: "none",
              background: "#EF4444",
              color: "#fff",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: ds.ff,
              opacity: loading ? 0.5 : 1,
            }}
          >
            {loading ? "삭제 중..." : "삭제"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Form Modal (추가/수정) ── */
function FormModal({ item, onSave, onClose, saving }) {
  const isEdit = !!item?.bannedWordId;
  const [bannedWord, setBannedWord] = useState(item?.bannedWord ?? "");
  const [category, setCategory] = useState(item?.category ?? "OTHER");
  const [replacement, setReplacement] = useState(item?.replacement ?? "");
  const [err, setErr] = useState("");

  const handleSubmit = () => {
    const word = bannedWord.trim();
    if (!word) {
      setErr("금지어를 입력하세요.");
      return;
    }
    setErr("");
    onSave({
      bannedWord: word,
      category,
      replacement: replacement.trim() || undefined,
      bannedWordId: item?.bannedWordId,
    });
  };

  const inputStyle = {
    width: "100%",
    padding: "10px 14px",
    borderRadius: 9,
    border: `1.5px solid ${ds.line}`,
    fontSize: 13.5,
    fontFamily: ds.ff,
    color: ds.ink,
    outline: "none",
    boxSizing: "border-box",
    background: ds.bg,
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 5000,
        background: "rgba(0,0,0,0.32)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: ds.bg,
          borderRadius: 16,
          width: 440,
          padding: 28,
          boxShadow: "0 24px 60px rgba(0,0,0,0.18)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 800, color: ds.ink, margin: 0 }}>
            {isEdit ? "금지어 수정" : "금지어 추가"}
          </h3>
          <button
            onClick={onClose}
            style={{
              width: 28,
              height: 28,
              borderRadius: 7,
              border: "none",
              background: ds.lineSoft,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <X size={14} color={ds.ink4} />
          </button>
        </div>

        {err && (
          <div
            style={{
              background: ds.redSoft,
              border: `1px solid ${ds.red}33`,
              borderRadius: 9,
              padding: "10px 14px",
              fontSize: 12.5,
              color: ds.red,
              marginBottom: 18,
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <AlertTriangle size={14} /> {err}
          </div>
        )}

        <div style={{ marginBottom: 18 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: ds.ink3, marginBottom: 6, display: "block" }}>
            금지어 <span style={{ color: "#EF4444" }}>*</span>
          </label>
          <input
            style={inputStyle}
            value={bannedWord}
            onChange={(e) => setBannedWord(e.target.value)}
            placeholder="등록할 금지어를 입력하세요"
            maxLength={100}
          />
        </div>

        <div style={{ marginBottom: 18 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: ds.ink3, marginBottom: 6, display: "block" }}>
            카테고리 <span style={{ color: "#EF4444" }}>*</span>
          </label>
          <select
            style={{ ...inputStyle, cursor: "pointer" }}
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {BANNED_WORD_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: 24 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: ds.ink3, marginBottom: 6, display: "block" }}>
            대체어 (선택)
          </label>
          <input
            style={inputStyle}
            value={replacement}
            onChange={(e) => setReplacement(e.target.value)}
            placeholder="노출 시 치환할 텍스트 (비워두면 마스킹 등 정책에 따름)"
            maxLength={100}
          />
        </div>

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button
            onClick={onClose}
            disabled={saving}
            style={{
              padding: "10px 20px",
              borderRadius: 9,
              border: `1px solid ${ds.line}`,
              background: ds.bg,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: ds.ff,
              color: ds.ink3,
            }}
          >
            취소
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            style={{
              padding: "10px 20px",
              borderRadius: 9,
              border: "none",
              background: ds.brand,
              color: "#fff",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: ds.ff,
              opacity: saving ? 0.5 : 1,
            }}
          >
            {saving ? "저장 중..." : isEdit ? "수정" : "등록"}
          </button>
        </div>
      </div>
    </div>
  );
}

const spinStyle = `
@keyframes spin { to { transform: rotate(360deg); } }
`;

const BANNED_PAGE_SIZE = 10;
const LOG_PAGE_SIZE = 10;
const POLICY_UPLOAD_HISTORY_PAGE_SIZE = 10;

function truncate(str, max = 48) {
  if (str == null || str === "") return "-";
  const s = String(str);
  return s.length > max ? `${s.slice(0, max)}…` : s;
}

/** board_banned_logs.content_type 표시용 */
function logContentTypeLabel(code) {
  if (!code) return "-";
  const c = String(code).toUpperCase();
  if (c === "POST") return "게시글";
  if (c === "COMMENT") return "댓글";
  return code;
}

/** posts.status (게시글 로그일 때 contentPostStatus) */
function logPostStatusLabel(code) {
  if (!code) return "-";
  const c = String(code).toUpperCase();
  if (c === "HIDDEN") return "숨김";
  if (c === "PUBLISHED") return "공개";
  if (c === "DRAFT") return "임시";
  return code;
}

/** 사유 컬럼: 줄바꿈·다중 공백을 한 줄로 */
function ragReasonOneLine(s) {
  if (s == null || s === "") return "-";
  return String(s).replace(/\s+/g, " ").trim();
}

/* ══════════════════════════════════════════════
   AI 모더레이션 BLOCK 로그 (페이징)
   — 금지어 관리의 게시판 선택과 별도: 기본은 전체(모든 게시판·댓글)
   ══════════════════════════════════════════════ */
function ModerationLogSection({ boards }) {
  /** null = 전체 게시판 (API boardId 미전송) */
  const [logBoardFilter, setLogBoardFilter] = useState(null);
  const [logPage, setLogPage] = useState(0);
  const [logItems, setLogItems] = useState([]);
  const [logLoading, setLogLoading] = useState(false);
  /** totalElements·size로 계산 (목록 건수와 페이지 수 일치, 범위 초과 방지) */
  const [logTotalPages, setLogTotalPages] = useState(0);
  const [logTotalElements, setLogTotalElements] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLogLoading(true);
      try {
        const res = await moderationLogsApi.list(
          logPage,
          LOG_PAGE_SIZE,
          logBoardFilter ?? undefined
        );
        if (cancelled) return;

        const totalElements = Number(res?.totalElements ?? 0);
        const pageSize = Number(res?.size ?? LOG_PAGE_SIZE) || LOG_PAGE_SIZE;
        const computedTotalPages =
          totalElements === 0 ? 0 : Math.ceil(totalElements / pageSize);

        if (computedTotalPages > 0 && logPage >= computedTotalPages) {
          setLogPage(computedTotalPages - 1);
          return;
        }

        setLogItems(res?.content ?? []);
        setLogTotalElements(totalElements);
        setLogTotalPages(computedTotalPages);
      } catch (e) {
        console.warn("[ModerationLogSection] 로그 로드 실패:", e);
        if (!cancelled) {
          setLogItems([]);
          setLogTotalPages(0);
          setLogTotalElements(0);
        }
      } finally {
        if (!cancelled) setLogLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [logPage, logBoardFilter]);

  const boardName = (id) =>
    boards.find((b) => b.boardId === id)?.name ||
    boards.find((b) => b.boardId === id)?.boardType ||
    (id != null ? `#${id}` : "-");

  return (
    <div
      style={{
        background: ds.bg,
        borderRadius: 12,
        border: `1px solid ${ds.line}`,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "10px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 10,
          borderBottom: `1px solid ${ds.line}`,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          <ScrollText size={17} color={ds.brand} />
          <span style={{ fontSize: 13.5, fontWeight: 800, color: ds.ink }}>
            AI 모더레이션 BLOCK 로그
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <label style={{ fontSize: 11.5, fontWeight: 600, color: ds.ink4, display: "flex", alignItems: "center", gap: 6 }}>
            게시판
            <select
              value={logBoardFilter ?? ""}
              onChange={(e) => {
                const v = e.target.value;
                setLogBoardFilter(v === "" ? null : Number(v));
                setLogPage(0);
              }}
              style={{
                padding: "5px 10px",
                borderRadius: 8,
                border: `1px solid ${ds.line}`,
                background: ds.bg,
                fontSize: 12.5,
                fontFamily: ds.ff,
                color: ds.ink,
                cursor: "pointer",
                minWidth: 160,
              }}
            >
              <option value="">전체 (모든 게시판·댓글)</option>
              {boards.map((b) => (
                <option key={b.boardId} value={b.boardId}>
                  {b.name || b.boardType || `게시판 #${b.boardId}`}
                </option>
              ))}
            </select>
          </label>
          <span style={{ fontSize: 11.5, fontWeight: 600, color: ds.ink4 }}>
            총 {logTotalElements}건
          </span>
        </div>
      </div>

      {logLoading && (
        <div style={{ padding: 40, textAlign: "center" }}>
          <Loader2 size={24} color={ds.ink4} style={{ animation: "spin 1s linear infinite" }} />
          <div style={{ fontSize: 12, color: ds.ink4, marginTop: 10 }}>로그 불러오는 중...</div>
        </div>
      )}

      {!logLoading && logItems.length === 0 && (
        <div style={{ padding: 36, textAlign: "center", color: ds.ink4, fontSize: 12.5 }}>
          기록된 로그가 없습니다.
        </div>
      )}

      {!logLoading && logItems.length > 0 && (
        <>
          <div style={{ overflowX: "auto" }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "128px 72px 72px 64px 64px 100px 72px 52px 52px minmax(160px, 1fr)",
                gap: 8,
                padding: "6px 14px",
                borderBottom: `1px solid ${ds.line}`,
                fontSize: 10,
                fontWeight: 700,
                color: ds.ink4,
                textTransform: "uppercase",
                letterSpacing: "0.02em",
                minWidth: 920,
              }}
            >
              <span>일시</span>
              <span>게시판</span>
              <span>유형</span>
              <span>글ID</span>
              <span>유저</span>
              <span>탐지</span>
              <span>조치</span>
              <span>노출</span>
              <span>AI</span>
              <span>사유</span>
            </div>
            {logItems.map((row) => (
              <div
                key={row.logId}
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "128px 72px 72px 64px 64px 100px 72px 52px 52px minmax(160px, 1fr)",
                  gap: 8,
                  alignItems: "center",
                  padding: "5px 14px",
                  borderBottom: `1px solid ${ds.lineSoft}`,
                  fontSize: 11.5,
                  color: ds.ink3,
                  minWidth: 920,
                }}
              >
                <span style={{ fontSize: 11, color: ds.ink4, whiteSpace: "nowrap" }}>
                  {fmtDateTime(row.createdAt)}
                </span>
                <span
                  style={{ fontWeight: 600, color: ds.ink, fontSize: 11 }}
                  title={row.boardId != null ? String(row.boardId) : ""}
                >
                  {truncate(boardName(row.boardId), 10)}
                </span>
                <span style={{ fontSize: 11 }} title={row.contentType ?? ""}>
                  {logContentTypeLabel(row.contentType)}
                </span>
                <span style={{ fontSize: 11, color: ds.ink4 }}>{row.contentId ?? "-"}</span>
                <span style={{ fontSize: 11, color: ds.ink4 }}>{row.userId ?? "-"}</span>
                <span
                  style={{ fontWeight: 600, color: ds.ink, fontSize: 11 }}
                  title={row.detectedWord}
                >
                  {truncate(row.detectedWord, 12)}
                </span>
                <span style={{ fontSize: 10.5, fontWeight: 700, color: "#B45309" }}>
                  {row.filterActionTaken ?? "-"}
                </span>
                <span style={{ fontSize: 10.5, fontWeight: 700, color: ds.ink3 }} title={row.contentPostStatus ?? ""}>
                  {logPostStatusLabel(row.contentPostStatus)}
                </span>
                <span style={{ fontSize: 11, color: ds.ink4 }}>
                  {row.aiScore != null ? row.aiScore.toFixed(2) : "-"}
                </span>
                <div
                  style={{
                    fontSize: 11,
                    color: ds.ink4,
                    lineHeight: 1.25,
                    minWidth: 0,
                    maxWidth: "100%",
                    overflowX: "auto",
                    overflowY: "hidden",
                    whiteSpace: "nowrap",
                    WebkitOverflowScrolling: "touch",
                    scrollbarWidth: "thin",
                  }}
                  title={row.ragReason != null ? String(row.ragReason) : ""}
                >
                  {ragReasonOneLine(row.ragReason)}
                </div>
              </div>
            ))}
          </div>
          {logTotalPages > 1 && (
            <div
              style={{
                padding: "8px 14px",
                borderTop: `1px solid ${ds.line}`,
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                gap: 8,
              }}
            >
              <button
                type="button"
                onClick={() => setLogPage((p) => Math.max(0, p - 1))}
                disabled={logPage <= 0}
                style={{
                  padding: "5px 10px",
                  borderRadius: 6,
                  border: `1px solid ${ds.line}`,
                  background: ds.bg,
                  fontSize: 12,
                  color: logPage <= 0 ? ds.ink4 : ds.ink3,
                  cursor: logPage <= 0 ? "default" : "pointer",
                  fontFamily: ds.ff,
                }}
              >
                이전
              </button>
              <span style={{ fontSize: 12, color: ds.ink4 }}>
                {logPage + 1} / {logTotalPages}
              </span>
              <button
                type="button"
                onClick={() => setLogPage((p) => Math.min(logTotalPages - 1, p + 1))}
                disabled={logPage >= logTotalPages - 1}
                style={{
                  padding: "5px 10px",
                  borderRadius: 6,
                  border: `1px solid ${ds.line}`,
                  background: ds.bg,
                  fontSize: 12,
                  color: logPage >= logTotalPages - 1 ? ds.ink4 : ds.ink3,
                  cursor: logPage >= logTotalPages - 1 ? "default" : "pointer",
                  fontFamily: ds.ff,
                }}
              >
                다음
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════
   정책 파일 업로드/적용 섹션
   ══════════════════════════════════════════════ */
function policyStatusStyle(status) {
  const s = (status || "").toUpperCase();
  if (s === "SUCCESS") return { bg: "#DCFCE7", color: "#166534", label: "성공" };
  if (s === "FAILED") return { bg: "#FEE2E2", color: "#991B1B", label: "실패" };
  if (s === "PENDING") return { bg: "#FEF9C3", color: "#854D0E", label: "처리중" };
  if (s === "DISPATCHED") return { bg: "#E0E7FF", color: "#3730A3", label: "오케스트레이트" };
  return { bg: ds.card, color: ds.ink3, label: status || "-" };
}

function PolicySection({ showToast }) {
  const [activePolicy, setActivePolicy] = useState(null);
  const [policyLoading, setPolicyLoading] = useState(true);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const fileInputRef = useRef(null);

  const [histPage, setHistPage] = useState(0);
  const [histItems, setHistItems] = useState([]);
  const [histLoading, setHistLoading] = useState(false);
  const [histTotalPages, setHistTotalPages] = useState(0);
  const [histTotalElements, setHistTotalElements] = useState(0);

  const loadUploadHistory = useCallback(async (page) => {
    setHistLoading(true);
    try {
      const res = await policyApi.listUploads(page, POLICY_UPLOAD_HISTORY_PAGE_SIZE);
      const totalElements = Number(res?.totalElements ?? 0);
      const pageSize = Number(res?.size ?? POLICY_UPLOAD_HISTORY_PAGE_SIZE) || POLICY_UPLOAD_HISTORY_PAGE_SIZE;
      const computedTotalPages = totalElements === 0 ? 0 : Math.ceil(totalElements / pageSize);
      let targetPage = page;
      if (computedTotalPages > 0 && targetPage >= computedTotalPages) {
        targetPage = computedTotalPages - 1;
      }
      setHistPage(targetPage);
      setHistItems(res?.content ?? []);
      setHistTotalElements(totalElements);
      setHistTotalPages(computedTotalPages);
    } catch (e) {
      console.warn("[PolicySection] 업로드 이력 로드 실패:", e);
      setHistItems([]);
      setHistTotalPages(0);
      setHistTotalElements(0);
    } finally {
      setHistLoading(false);
    }
  }, []);

  const fetchActivePolicy = useCallback(async () => {
    setPolicyLoading(true);
    try {
      const data = await policyApi.getActive();
      setActivePolicy(data);
    } catch (e) {
      console.warn("[PolicySection] 활성 정책 조회 실패:", e);
      setActivePolicy(null);
    } finally {
      setPolicyLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchActivePolicy();
  }, [fetchActivePolicy]);

  useEffect(() => {
    loadUploadHistory(histPage);
  }, [histPage, loadUploadHistory]);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext !== "txt" && ext !== "json") {
      showToast("지원하지 않는 파일 형식입니다. (.txt/.json만 지원)", "error");
      return;
    }
    setSelectedFile(file);
    setUploadResult(null);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    setUploading(true);
    setUploadResult(null);
    try {
      const result = await policyApi.upload(selectedFile);
      setUploadResult(result);
      if (String(result?.status).toLowerCase() === "dispatched") {
        showToast("Orchestrate 로 전달되었습니다. 스킬이 pupoo_ai 를 호출해 반영합니다.");
      } else {
        showToast("정책이 반영되었습니다.");
      }
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      await fetchActivePolicy();
      await loadUploadHistory(0);
    } catch (e) {
      const msg = e?.response?.data?.message || e?.response?.data?.data?.message || "정책 반영에 실패했습니다.";
      showToast(msg, "error");
    } finally {
      setUploading(false);
    }
  };

  const infoRow = (label, value) => (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: `1px solid ${ds.lineSoft}` }}>
      <span style={{ fontSize: 12.5, color: ds.ink4, fontWeight: 600 }}>{label}</span>
      <span style={{ fontSize: 12.5, color: ds.ink, fontWeight: 600, textAlign: "right", maxWidth: "65%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {value || "-"}
      </span>
    </div>
  );

  return (
    <div
      style={{
        background: ds.bg,
        borderRadius: 12,
        border: `1px solid ${ds.line}`,
        overflow: "hidden",
        marginTop: 20,
      }}
    >
      <div
        style={{
          padding: "14px 20px",
          display: "flex",
          alignItems: "center",
          gap: 8,
          borderBottom: `1px solid ${ds.line}`,
        }}
      >
        <FileText size={18} color={ds.brand} />
        <span style={{ fontSize: 14, fontWeight: 800, color: ds.ink }}>AI 정책 파일 관리</span>
      </div>

      <div style={{ padding: 20, display: "flex", gap: 20, flexWrap: "wrap" }}>
        {/* 현재 적용 정책 */}
        <div style={{ flex: "1 1 280px", minWidth: 260 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: ds.ink3, marginBottom: 10 }}>현재 적용 정책</div>
          {policyLoading ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 0" }}>
              <Loader2 size={16} color={ds.ink4} style={{ animation: "spin 1s linear infinite" }} />
              <span style={{ fontSize: 12.5, color: ds.ink4 }}>조회 중...</span>
            </div>
          ) : activePolicy?.activeFilename ? (
            <div style={{ background: ds.card, borderRadius: 10, padding: "12px 16px" }}>
              {infoRow("파일명", activePolicy.activeFilename)}
              {infoRow("컬렉션", activePolicy.activeCollection)}
              {infoRow("적용일시", fmtDateTime(activePolicy.activatedAt))}
            </div>
          ) : (
            <div
              style={{
                background: ds.card,
                borderRadius: 10,
                padding: "20px 16px",
                textAlign: "center",
                color: ds.ink4,
                fontSize: 13,
              }}
            >
              적용된 정책이 없습니다.
            </div>
          )}
        </div>

        {/* 업로드 영역 */}
        <div style={{ flex: "1 1 280px", minWidth: 260 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: ds.ink3, marginBottom: 10 }}>정책 파일 업로드</div>
          <div
            style={{
              background: ds.card,
              borderRadius: 10,
              padding: "16px",
              border: `1.5px dashed ${selectedFile ? ds.brand : ds.line}`,
              transition: "border-color .15s",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,.json"
                onChange={handleFileChange}
                style={{ display: "none" }}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  padding: "8px 14px",
                  borderRadius: 8,
                  border: `1px solid ${ds.line}`,
                  background: ds.bg,
                  color: ds.ink3,
                  fontSize: 12.5,
                  fontWeight: 600,
                  cursor: uploading ? "default" : "pointer",
                  fontFamily: ds.ff,
                  opacity: uploading ? 0.5 : 1,
                }}
              >
                <Upload size={13} /> 파일 선택
              </button>
              <span style={{ fontSize: 12, color: ds.ink4, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {selectedFile ? selectedFile.name : ".txt 또는 .json 파일"}
              </span>
            </div>
            <button
              onClick={handleUpload}
              disabled={!selectedFile || uploading}
              style={{
                width: "100%",
                padding: "10px 0",
                borderRadius: 8,
                border: "none",
                background: selectedFile && !uploading ? ds.brand : ds.ink4,
                color: "#fff",
                fontSize: 13,
                fontWeight: 700,
                cursor: selectedFile && !uploading ? "pointer" : "default",
                fontFamily: ds.ff,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                transition: "background .15s",
                opacity: !selectedFile ? 0.5 : 1,
              }}
            >
              {uploading ? (
                <>
                  <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> 반영 중... (시간이 걸릴 수 있습니다)
                </>
              ) : (
                <>
                  <Upload size={14} /> 업로드 & 즉시 반영
                </>
              )}
            </button>
          </div>

          {uploadResult && (
            <div
              style={{
                marginTop: 10,
                background: String(uploadResult.status).toLowerCase() === "dispatched" ? "#EEF2FF" : ds.greenSoft,
                borderRadius: 8,
                padding: "10px 14px",
                display: "flex",
                alignItems: "flex-start",
                gap: 8,
              }}
            >
              <CheckCircle
                size={15}
                color={String(uploadResult.status).toLowerCase() === "dispatched" ? "#4F46E5" : "#22C55E"}
                style={{ marginTop: 1, flexShrink: 0 }}
              />
              <div
                style={{
                  fontSize: 12,
                  color: String(uploadResult.status).toLowerCase() === "dispatched" ? "#3730A3" : "#22C55E",
                  fontWeight: 600,
                  lineHeight: 1.5,
                }}
              >
                {String(uploadResult.status).toLowerCase() === "dispatched" ? (
                  <>
                    Orchestrate 전달 완료 — {uploadResult.activeFilename || uploadResult.originalFilename || "정책 파일"}
                    <br />
                    <span style={{ fontWeight: 400, color: ds.ink3, fontSize: 11.5 }}>
                      이력 ID: {uploadResult.policyUploadId ?? "—"} · Milvus 반영은 스킬 파이프라인 완료 후 확인하세요.
                    </span>
                  </>
                ) : (
                  <>
                    반영 완료 — {uploadResult.activeFilename}
                    <br />
                    <span style={{ fontWeight: 400, color: ds.ink3, fontSize: 11.5 }}>
                      이력 ID: {uploadResult.policyUploadId ?? "—"} | 컬렉션: {uploadResult.activeCollection} | 청크:{" "}
                      {uploadResult.chunkCount}개
                    </span>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 정책 파일 업로드 이력 (DB moderation_policy_uploads) */}
      <div style={{ borderTop: `1px solid ${ds.line}`, padding: "14px 20px 18px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <History size={17} color={ds.brand} />
            <span style={{ fontSize: 13.5, fontWeight: 800, color: ds.ink }}>정책 업로드 이력</span>
          </div>
          <span style={{ fontSize: 11.5, fontWeight: 600, color: ds.ink4 }}>총 {histTotalElements}건</span>
        </div>

        {histLoading ? (
          <div style={{ padding: 28, textAlign: "center" }}>
            <Loader2 size={22} color={ds.ink4} style={{ animation: "spin 1s linear infinite" }} />
            <div style={{ fontSize: 12, color: ds.ink4, marginTop: 8 }}>이력 불러오는 중...</div>
          </div>
        ) : histItems.length === 0 ? (
          <div style={{ fontSize: 12.5, color: ds.ink4, padding: "12px 0" }}>등록된 업로드 이력이 없습니다.</div>
        ) : (
          <>
            <div style={{ overflowX: "auto", borderRadius: 8, border: `1px solid ${ds.lineSoft}` }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11.5, fontFamily: ds.ff }}>
                <thead>
                  <tr style={{ background: ds.card, color: ds.ink4, textAlign: "left" }}>
                    <th style={{ padding: "8px 10px", fontWeight: 700 }}>ID</th>
                    <th style={{ padding: "8px 10px", fontWeight: 700 }}>업로드 시각</th>
                    <th style={{ padding: "8px 10px", fontWeight: 700 }}>파일명</th>
                    <th style={{ padding: "8px 10px", fontWeight: 700 }}>AI</th>
                    <th style={{ padding: "8px 10px", fontWeight: 700 }}>저장소</th>
                    <th style={{ padding: "8px 10px", fontWeight: 700 }}>URI / 위치</th>
                    <th style={{ padding: "8px 10px", fontWeight: 700 }}>Milvus</th>
                    <th style={{ padding: "8px 10px", fontWeight: 700 }}>비고</th>
                  </tr>
                </thead>
                <tbody>
                  {histItems.map((row) => {
                    const st = policyStatusStyle(row.aiApplyStatus);
                    const uri = row.storageUri;
                    const isHttp = uri && /^https?:\/\//i.test(String(uri));
                    return (
                      <tr key={row.policyUploadId} style={{ borderTop: `1px solid ${ds.lineSoft}`, color: ds.ink }}>
                        <td style={{ padding: "8px 10px", fontWeight: 700 }}>{row.policyUploadId}</td>
                        <td style={{ padding: "8px 10px", whiteSpace: "nowrap" }}>{fmtDateTime(row.uploadedAt)}</td>
                        <td style={{ padding: "8px 10px", maxWidth: 160 }} title={row.originalFilename}>
                          <span style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {row.originalFilename || "-"}
                          </span>
                        </td>
                        <td style={{ padding: "8px 10px" }}>
                          <span
                            style={{
                              display: "inline-block",
                              padding: "2px 8px",
                              borderRadius: 6,
                              fontWeight: 700,
                              fontSize: 10.5,
                              background: st.bg,
                              color: st.color,
                            }}
                          >
                            {st.label}
                          </span>
                        </td>
                        <td style={{ padding: "8px 10px", whiteSpace: "nowrap", color: ds.ink3 }}>
                          {row.storageProvider ? `${row.storageProvider}${row.storageBucket ? ` · ${truncate(row.storageBucket, 20)}` : ""}` : "—"}
                        </td>
                        <td style={{ padding: "8px 10px", maxWidth: 220 }} title={uri || row.storageObjectKey || ""}>
                          {isHttp ? (
                            <a href={uri} target="_blank" rel="noopener noreferrer" style={{ color: ds.brand, wordBreak: "break-all" }}>
                              {truncate(uri, 56)}
                            </a>
                          ) : (
                            <span style={{ color: ds.ink3, wordBreak: "break-all" }}>{truncate(uri || row.storageObjectKey, 56)}</span>
                          )}
                        </td>
                        <td style={{ padding: "8px 10px", maxWidth: 140 }} title={row.milvusCollectionName || ""}>
                          <span style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {row.milvusCollectionName || "—"}
                          </span>
                        </td>
                        <td style={{ padding: "8px 10px", color: ds.ink4, maxWidth: 200 }} title={row.aiErrorMessage || ""}>
                          {row.aiApplyStatus === "FAILED" ? truncate(ragReasonOneLine(row.aiErrorMessage), 64) : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {histTotalPages > 1 && (
              <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 8, marginTop: 12 }}>
                <button
                  type="button"
                  onClick={() => setHistPage((p) => Math.max(0, p - 1))}
                  disabled={histPage <= 0}
                  style={{
                    padding: "5px 10px",
                    borderRadius: 6,
                    border: `1px solid ${ds.line}`,
                    background: ds.bg,
                    fontSize: 12,
                    color: histPage <= 0 ? ds.ink4 : ds.ink3,
                    cursor: histPage <= 0 ? "default" : "pointer",
                    fontFamily: ds.ff,
                  }}
                >
                  이전
                </button>
                <span style={{ fontSize: 12, color: ds.ink4 }}>
                  {histPage + 1} / {histTotalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setHistPage((p) => Math.min(histTotalPages - 1, p + 1))}
                  disabled={histPage >= histTotalPages - 1}
                  style={{
                    padding: "5px 10px",
                    borderRadius: 6,
                    border: `1px solid ${ds.line}`,
                    background: ds.bg,
                    fontSize: 12,
                    color: histPage >= histTotalPages - 1 ? ds.ink4 : ds.ink3,
                    cursor: histPage >= histTotalPages - 1 ? "default" : "pointer",
                    fontFamily: ds.ff,
                  }}
                >
                  다음
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════
   메인 컴포넌트
   ══════════════════════════════════════════════ */
export default function BannedWordsManage() {
  const [boards, setBoards] = useState([]);
  const [selectedBoardId, setSelectedBoardId] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [boardsLoading, setBoardsLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [toast, setToast] = useState(null);
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const lastSearchAppliedRef = useRef("");

  /** 입력 디바운스 후 검색어 반영 + 검색 변경 시 첫 페이지로 */
  useEffect(() => {
    const t = setTimeout(() => {
      const next = searchInput.trim();
      if (lastSearchAppliedRef.current !== next) {
        lastSearchAppliedRef.current = next;
        setPage(0);
      }
      setSearchQuery(next);
    }, 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  const fetchBoards = useCallback(async () => {
    setBoardsLoading(true);
    try {
      const list = await boardApi.getBoards(false);
      const arr = Array.isArray(list) ? list : list?.content ?? [];
      setBoards(arr);
      if (arr.length > 0 && !selectedBoardId) {
        setSelectedBoardId(arr[0].boardId);
      }
    } catch (e) {
      console.warn("[BannedWordsManage] 게시판 목록 로드 실패:", e);
      showToast("게시판 목록을 불러오지 못했습니다.", "error");
    } finally {
      setBoardsLoading(false);
    }
  }, [selectedBoardId]);

  const fetchList = useCallback(async () => {
    if (!selectedBoardId) {
      setItems([]);
      return;
    }
    setLoading(true);
    try {
      const res = await bannedWordApi.list(selectedBoardId, page, BANNED_PAGE_SIZE, searchQuery);
      setItems(res?.content ?? []);
      setTotalPages(res?.totalPages ?? 0);
      setTotalElements(res?.totalElements ?? 0);
    } catch (e) {
      console.warn("[BannedWordsManage] 금지어 목록 로드 실패:", e);
      showToast("금지어 목록을 불러오지 못했습니다.", "error");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [selectedBoardId, page, searchQuery]);

  useEffect(() => {
    fetchBoards();
  }, []);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const showToast = (msg, type = "success") => setToast({ msg, type });

  const handleCreate = async (body) => {
    setSaving(true);
    try {
      await bannedWordApi.create(selectedBoardId, {
        bannedWord: body.bannedWord,
        category: body.category,
        replacement: body.replacement,
      });
      setModal(null);
      showToast("금지어가 등록되었습니다.");
      fetchList();
    } catch (e) {
      const msg = e?.response?.data?.message || "등록에 실패했습니다.";
      showToast(msg, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (body) => {
    if (!body.bannedWordId) return;
    setSaving(true);
    try {
      await bannedWordApi.update(body.bannedWordId, {
        bannedWord: body.bannedWord,
        category: body.category,
        replacement: body.replacement,
      });
      setModal(null);
      showToast("금지어가 수정되었습니다.");
      fetchList();
    } catch (e) {
      const msg = e?.response?.data?.message || "수정에 실패했습니다.";
      showToast(msg, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    const id = modal?.item?.bannedWordId;
    if (!id) return;
    setSaving(true);
    try {
      await bannedWordApi.delete(id);
      setModal(null);
      showToast("금지어가 삭제되었습니다.");
      fetchList();
    } catch (e) {
      const msg = e?.response?.data?.message || "삭제에 실패했습니다.";
      showToast(msg, "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <style>{spinStyle}</style>

      {/* ── AI 모더레이션 BLOCK 로그 (상단) ── */}
      <ModerationLogSection boards={boards} />

      {/* ── 금지어/정책 영역: 챗봇 우측 공간 확보 ── */}
      <div
        style={{
          display: "grid",
          // 아이콘 중심 기준: (중심~오른쪽 끝) == (중심~테이블 오른쪽 끝)
          // 데스크톱 기준 right(14px) + 아이콘폭(180px)/2 = 104px 이므로,
          // 테이블 우측 경계는 화면 오른쪽에서 약 208px 지점에 배치
          gridTemplateColumns: "minmax(0, 1fr) 208px",
          gap: 0,
          alignItems: "start",
          marginTop: 20,
        }}
      >
        <div>
          {/* ── 금지어 목록 ── */}
          <div
            style={{
              background: ds.bg,
              borderRadius: 12,
              border: `1px solid ${ds.line}`,
              overflow: "hidden",
            }}
          >
        <div
          style={{
            padding: "10px 16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 10,
            borderBottom: `1px solid ${ds.line}`,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              flexWrap: "wrap",
              minWidth: 0,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
              <ShieldAlert size={17} color={ds.brand} />
              <span style={{ fontSize: 13.5, fontWeight: 800, color: ds.ink }}>금지어 목록</span>
            </div>
            {/* 게시판 드롭다운 + 검색창을 한 줄에 고정 (줄바꿈 시에도 붙어 있음) */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                flexWrap: "nowrap",
                flexShrink: 0,
                minWidth: 0,
              }}
            >
              <select
                value={selectedBoardId ?? ""}
                onChange={(e) => {
                  setSelectedBoardId(e.target.value ? Number(e.target.value) : null);
                  setPage(0);
                  setSearchInput("");
                  setSearchQuery("");
                  lastSearchAppliedRef.current = "";
                }}
                style={{
                  padding: "6px 10px",
                  borderRadius: 8,
                  border: `1px solid ${ds.line}`,
                  background: ds.bg,
                  fontSize: 12.5,
                  fontFamily: ds.ff,
                  color: ds.ink,
                  cursor: "pointer",
                  minWidth: 150,
                  flexShrink: 0,
                }}
              >
                <option value="">게시판 선택</option>
                {boards.map((b) => (
                  <option key={b.boardId} value={b.boardId}>
                    {b.name || b.boardType || `게시판 #${b.boardId}`}
                  </option>
                ))}
              </select>
              {selectedBoardId && (
                <label
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "5px 10px",
                    borderRadius: 8,
                    border: `1px solid ${ds.line}`,
                    background: ds.bg,
                    width: 200,
                    flexShrink: 0,
                    boxSizing: "border-box",
                  }}
                >
                  <Search size={14} color={ds.ink4} style={{ flexShrink: 0 }} aria-hidden />
                  <input
                    type="search"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder="금지어 검색"
                    autoComplete="off"
                    style={{
                      flex: 1,
                      minWidth: 0,
                      border: "none",
                      background: "transparent",
                      fontSize: 12.5,
                      fontFamily: ds.ff,
                      color: ds.ink,
                      outline: "none",
                    }}
                  />
                  {searchInput ? (
                    <button
                      type="button"
                      onClick={() => setSearchInput("")}
                      aria-label="검색어 지우기"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: 2,
                        border: "none",
                        background: "transparent",
                        cursor: "pointer",
                        color: ds.ink4,
                        borderRadius: 4,
                      }}
                    >
                      <X size={14} />
                    </button>
                  ) : null}
                </label>
              )}
            </div>
            {selectedBoardId && (
              <span style={{ fontSize: 11.5, fontWeight: 600, color: ds.ink4, flexShrink: 0 }}>
                총 {totalElements}개
              </span>
            )}
          </div>
          {selectedBoardId && (
            <button
              onClick={() => setModal({ type: "form" })}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                padding: "7px 14px",
                borderRadius: 7,
                border: "none",
                background: ds.brand,
                color: "#fff",
                fontSize: 12.5,
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: ds.ff,
              }}
            >
              <Plus size={13} strokeWidth={2.5} /> 금지어 추가
            </button>
          )}
        </div>

        {boardsLoading && (
          <div style={{ padding: 60, textAlign: "center" }}>
            <Loader2 size={28} color={ds.ink4} style={{ animation: "spin 1s linear infinite" }} />
            <div style={{ fontSize: 13, color: ds.ink4, marginTop: 12 }}>게시판 목록 불러오는 중...</div>
          </div>
        )}

        {!boardsLoading && !selectedBoardId && (
          <div style={{ padding: 60, textAlign: "center", color: ds.ink4, fontSize: 13.5 }}>
            위에서 게시판을 선택하면 해당 게시판의 금지어 목록을 관리할 수 있습니다.
          </div>
        )}

        {!boardsLoading && selectedBoardId && loading && (
          <div style={{ padding: 60, textAlign: "center" }}>
            <Loader2 size={28} color={ds.ink4} style={{ animation: "spin 1s linear infinite" }} />
            <div style={{ fontSize: 13, color: ds.ink4, marginTop: 12 }}>금지어 목록 불러오는 중...</div>
          </div>
        )}

        {!boardsLoading && selectedBoardId && !loading && items.length === 0 && (
          <div style={{ padding: 60, textAlign: "center", color: ds.ink4, fontSize: 13.5 }}>
            {searchQuery
              ? "검색 결과가 없습니다. 다른 검색어를 입력해 보세요."
              : '등록된 금지어가 없습니다. "금지어 추가"로 등록하세요.'}
          </div>
        )}

        {!boardsLoading && selectedBoardId && !loading && items.length > 0 && (
          <>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 110px 72px 88px 72px",
                gap: 8,
                padding: "6px 14px",
                borderBottom: `1px solid ${ds.line}`,
                fontSize: 10,
                fontWeight: 700,
                color: ds.ink4,
                textTransform: "uppercase",
                letterSpacing: "0.03em",
              }}
            >
              <span>금지어</span>
              <span>카테고리</span>
              <span>적용</span>
              <span>등록일</span>
              <span></span>
            </div>
            {items.map((row) => (
              <div
                key={row.bannedWordId}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 110px 72px 88px 72px",
                  gap: 8,
                  alignItems: "center",
                  padding: "5px 14px",
                  borderBottom: `1px solid ${ds.lineSoft}`,
                  fontSize: 12,
                  color: ds.ink3,
                }}
              >
                <span style={{ fontWeight: 600, color: ds.ink, lineHeight: 1.3 }}>{row.bannedWord}</span>
                <span style={{ fontSize: 11.5, lineHeight: 1.3 }}>{getCategoryLabel(row.category)}</span>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    padding: "1px 6px",
                    borderRadius: 4,
                    background: row.boardId ? ds.skySoft : ds.amberSoft,
                    color: row.boardId ? ds.sky : ds.amber,
                    textAlign: "center",
                  }}
                >
                  {row.boardId ? "게시판" : "공통"}
                </span>
                <span style={{ fontSize: 11, color: ds.ink4 }}>{fmtDate(row.createdAt)}</span>
                <div style={{ display: "flex", gap: 3 }}>
                  <button
                    type="button"
                    onClick={() => setModal({ type: "form", item: row })}
                    style={{
                      padding: "3px 6px",
                      borderRadius: 5,
                      border: `1px solid ${ds.brand}25`,
                      background: `${ds.brand}06`,
                      fontSize: 10.5,
                      fontWeight: 600,
                      color: ds.brand,
                      cursor: "pointer",
                      fontFamily: ds.ff,
                    }}
                  >
                    수정
                  </button>
                  <button
                    type="button"
                    onClick={() => setModal({ type: "delete", item: row })}
                    style={{
                      padding: "3px 6px",
                      borderRadius: 5,
                      border: "1px solid #FECACA50",
                      background: "transparent",
                      fontSize: 10.5,
                      fontWeight: 600,
                      color: "#EF4444",
                      cursor: "pointer",
                      fontFamily: ds.ff,
                    }}
                  >
                    삭제
                  </button>
                </div>
              </div>
            ))}
            {totalPages > 1 && (
              <div
                style={{
                  padding: "8px 14px",
                  borderTop: `1px solid ${ds.line}`,
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page <= 0}
                  style={{
                    padding: "5px 10px",
                    borderRadius: 6,
                    border: `1px solid ${ds.line}`,
                    background: ds.bg,
                    fontSize: 12,
                    color: page <= 0 ? ds.ink4 : ds.ink3,
                    cursor: page <= 0 ? "default" : "pointer",
                    fontFamily: ds.ff,
                  }}
                >
                  이전
                </button>
                <span style={{ fontSize: 12, color: ds.ink4 }}>
                  {page + 1} / {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  style={{
                    padding: "5px 10px",
                    borderRadius: 6,
                    border: `1px solid ${ds.line}`,
                    background: ds.bg,
                    fontSize: 12,
                    color: page >= totalPages - 1 ? ds.ink4 : ds.ink3,
                    cursor: page >= totalPages - 1 ? "default" : "pointer",
                    fontFamily: ds.ff,
                  }}
                >
                  다음
                </button>
              </div>
            )}
          </>
        )}

          </div>

          {/* ── AI 정책 파일 관리 (하단) ── */}
          <PolicySection showToast={showToast} />
        </div>

        {/* 챗봇과 겹치지 않도록 우측 여백 컬럼 */}
        <div aria-hidden="true" />
      </div>

      {modal?.type === "form" && (
        <FormModal
          item={modal.item}
          onSave={modal.item ? handleUpdate : handleCreate}
          onClose={() => setModal(null)}
          saving={saving}
        />
      )}

      {modal?.type === "delete" && (
        <ConfirmModal
          title="금지어 삭제"
          msg={`"${modal.item?.bannedWord}" 을(를) 삭제하시겠습니까?`}
          onConfirm={handleDelete}
          onCancel={() => setModal(null)}
          loading={saving}
        />
      )}

      {toast && <Toast msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />}
    </div>
  );
}
