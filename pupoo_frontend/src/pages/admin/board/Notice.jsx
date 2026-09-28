import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  X,
  Pencil,
  Trash2,
  Search,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Check,
  Loader2,
  RefreshCw,
  Megaphone,
} from "lucide-react";
import ds from "../shared/designTokens";
import {
  adminNoticeApi,
  unwrap,
  getToken,
  clearToken,
} from "../../../api/noticeApi";
import { Toast, Overlay, ConfirmModal, Checkbox, Field, IconButton, DetailDialog, Tag, EmptyState, FormSheet, Button, ChoiceCards } from "../shared/adminUi";

const styles = `
@keyframes toastIn{from{opacity:0;transform:translateY(-12px)}to{opacity:1;transform:translateY(0)}}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes modalIn{from{transform:translateY(20px) scale(0.98);opacity:0}to{transform:translateY(0) scale(1);opacity:1}}
@keyframes slideUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
@keyframes slideIn{from{transform:translateX(100%)}to{transform:translateX(0)}}
@keyframes rowFadeOut{from{opacity:1;transform:translateX(0)}to{opacity:0;transform:translateX(-30px)}}
@keyframes spin{to{transform:rotate(360deg)}}
.row-removing{animation:rowFadeOut .3s ease forwards}
.board-row:hover .board-actions{opacity:1}
`;

const NOTICE_DRAFT_KEY = "pupoo_admin_chatbot_notice_draft";
const NOTICE_SYNC_EVENT = "pupoo-admin-chatbot-sync-notice";

function fmtDate(dt) {
  if (!dt) return "-";
  const d = new Date(dt);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

function buildNoticeExecution(form) {
  return {
    supported: true,
    executeType: "SAVE_NOTICE",
    targetType: "NOTICE",
    status: form?.status || "DRAFT",
    supportedExecuteTypes: ["SAVE_NOTICE"],
  };
}

function syncNoticeDraft(detail) {
  if (typeof window === "undefined") return;
  if (detail == null) {
    sessionStorage.removeItem(NOTICE_DRAFT_KEY);
  } else {
    sessionStorage.setItem(NOTICE_DRAFT_KEY, JSON.stringify(detail));
  }
  window.dispatchEvent(
    new CustomEvent(NOTICE_SYNC_EVENT, {
      detail,
    }),
  );
}

const inputStyle = {
  width: "100%",
  padding: "10px 14px",
  borderRadius: 9,
  border: `1.5px solid ${ds.line}`,
  fontSize: 13.5,
  fontFamily: ds.ff,
  color: ds.ink,
  outline: "none",
  background: ds.bg,
  boxSizing: "border-box",
  transition: "border-color .15s, box-shadow .15s",
};
const inputFocus = (e) => {
  e.target.style.borderColor = ds.brand;
  e.target.style.boxShadow = `0 0 0 3px ${ds.brand}15`;
};
const inputBlur = (e) => {
  e.target.style.borderColor = ds.line;
  e.target.style.boxShadow = "none";
};
function Spinner({ size = 20 }) {
  return (
    <Loader2
      size={size}
      color={ds.ink4}
      style={{ animation: "spin 1s linear infinite" }}
    />
  );
}

/* ── 상세 모달 ── */
const NOTICE_STATUS_LABEL = { PUBLISHED: "게시 중", DRAFT: "임시 저장", HIDDEN: "숨김", DELETED: "삭제됨" };

function DetailModal({ item, onClose, onEdit, onDelete }) {
  return (
    <DetailDialog
      kind="공지사항"
      title={item.title}
      badges={item.pinned ? <Tag>고정</Tag> : null}
      items={[
        { label: "공개 범위", value: item.scope === "ALL" ? "전체" : "행사" },
        { label: "상태", value: NOTICE_STATUS_LABEL[item.status] || item.status || "-" },
        { label: "작성일", value: fmtDate(item.createdAt) },
        { label: "수정일", value: fmtDate(item.updatedAt) },
      ]}
      content={item.content}
      onClose={onClose}
      onEdit={() => onEdit(item)}
      onDelete={() => onDelete(item)}
    />
  );
}

/* ── 슬라이드 패널 ── */
function SlidePanel({ item, initialForm, onSave, onClose, isEdit, saving, onDraftChange }) {
  const [form, setForm] = useState(
    item
      ? {
          noticeId: item.noticeId ?? null,
          title: item.title,
          content: item.content || "",
          pinned: item.pinned ?? false,
          scope: item.scope || "ALL",
          status: item.status || "PUBLISHED",
        }
      : initialForm
        ? {
            noticeId: initialForm.noticeId ?? null,
            title: initialForm.title || "",
            content: initialForm.content || "",
            pinned: initialForm.pinned ?? false,
            scope: initialForm.scope || "ALL",
            status: initialForm.status || "DRAFT",
          }
        : { noticeId: null, title: "", content: "", pinned: false, scope: "ALL", status: "PUBLISHED" },
  );
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));
  const [err, setErr] = useState("");

  useEffect(() => {
    onDraftChange?.(form);
  }, [form, onDraftChange]);

  const handleSave = () => {
    if (!form.title.trim()) {
      setErr("제목은 필수입니다.");
      return;
    }
    onSave(form);
  };

  const labelStyle = { display: "block", marginBottom: 8, fontSize: 13, fontWeight: 600, color: ds.ink2 };
  const contentLength = (form.content || "").length;

  return (
    <FormSheet
      title={isEdit ? "공지사항 수정" : "새 공지사항"}
      description={isEdit ? "공지사항을 수정합니다" : "사이트 공지사항에 올릴 글을 작성합니다"}
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose} disabled={saving}>
            취소
          </Button>
          <Button variant="primary" onClick={handleSave} disabled={saving}>
            {saving ? "저장 중..." : isEdit ? "수정 완료" : "등록하기"}
          </Button>
        </>
      }
    >
      {err && (
        <div
          role="alert"
          style={{
            background: ds.redSoft,
            borderRadius: 8,
            padding: "10px 14px",
            fontSize: 13,
            color: ds.red,
            marginBottom: 18,
            fontWeight: 500,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <AlertTriangle size={14} /> {err}
        </div>
      )}

      {/* 공개 범위 */}
      <div style={{ marginBottom: 22 }}>
        <span style={labelStyle}>
          공개 범위{!isEdit ? <span style={{ color: ds.red, marginLeft: 3 }}>*</span> : null}
        </span>
        {isEdit ? (
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: ds.ink4 }}>
            <Tag tone="neutral">{SCOPE_CHOICES.find((c) => c.id === form.scope)?.label || "전체"}</Tag>
            공개 범위는 등록 후에 바꿀 수 없어요.
          </div>
        ) : (
          <ChoiceCards label="공개 범위" options={SCOPE_CHOICES} value={form.scope} onChange={(v) => set("scope", v)} />
        )}
      </div>

      <Field label="제목" required full>
        <input
          style={inputStyle}
          value={form.title}
          maxLength={100}
          onChange={(e) => set("title", e.target.value)}
          placeholder="예: 10월 행사 입장 안내"
        />
      </Field>

      <Field label="내용" full>
        <textarea
          rows={12}
          style={{ ...inputStyle, resize: "vertical", minHeight: 260 }}
          value={form.content}
          onChange={(e) => set("content", e.target.value)}
          placeholder="이용자에게 알릴 내용을 입력하세요"
        />
        <div style={{ marginTop: 6, fontSize: 12, color: ds.ink4, textAlign: "right" }}>{contentLength.toLocaleString()}자</div>
      </Field>

      {/* 게시 상태 */}
      <div className="adm-full" style={{ marginBottom: 18 }}>
        <span style={labelStyle}>게시 상태</span>
        <ChoiceCards label="게시 상태" options={STATUS_CHOICES} value={form.status} onChange={(v) => set("status", v)} minWidth={180} />
      </div>

      <label className="adm-full" style={{ display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 18, cursor: "pointer", fontSize: 14, color: ds.ink2 }}>
        <input
          type="checkbox"
          checked={!!form.pinned}
          onChange={(e) => set("pinned", e.target.checked)}
          style={{ width: 16, height: 16, margin: 0, cursor: "pointer" }}
        />
        목록 맨 위에 고정
      </label>
    </FormSheet>
  );
}

const SCOPE_CHOICES = [
  { id: "ALL", label: "전체", desc: "사이트를 방문한 모든 이용자에게 보여요" },
  { id: "EVENT", label: "행사", desc: "행사 안내·일정처럼 행사와 관련된 공지예요" },
];
const STATUS_CHOICES = [
  { id: "PUBLISHED", label: "게시 중", desc: "저장하면 바로 사이트에 보여요" },
  { id: "DRAFT", label: "임시 저장", desc: "나중에 마저 쓰고 게시할 수 있어요" },
  { id: "HIDDEN", label: "숨김", desc: "사이트에는 보이지 않아요" },
];


/* ═══════════════════════════════════════════
   메인 컴포넌트 (로그인은 AdminLogin에서 처리)
   ═══════════════════════════════════════════ */
export default function Notice() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [viewportWidth, setViewportWidth] = useState(() =>
    typeof window === "undefined" ? 1440 : window.innerWidth,
  );
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const PAGE_SIZE = 10;

  const [modal, setModal] = useState(null);
  const [panel, setPanel] = useState(null);
  const [toast, setToast] = useState(null);
  const [removing, setRemoving] = useState(null);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(new Set());
  const [prefillExecution, setPrefillExecution] = useState(null);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const syncViewport = () => setViewportWidth(window.innerWidth);
    syncViewport();
    window.addEventListener("resize", syncViewport);
    return () => window.removeEventListener("resize", syncViewport);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const applyPrefill = (payload) => {
      const formData = payload?.formData || payload;
      if (!formData) return;
      setPrefillExecution(payload?.execution || null);
      setPanel({ type: "create", initialForm: formData });
    };

    const savedDraft = sessionStorage.getItem(NOTICE_DRAFT_KEY);
    if (savedDraft) {
      try {
        applyPrefill(JSON.parse(savedDraft));
      } catch {
        // ignore storage parse failure
      }
    }

    const handlePrefill = (event) => {
        applyPrefill(event?.detail);
      };

    window.addEventListener("pupoo-admin-chatbot-prefill-notice", handlePrefill);
    return () => window.removeEventListener("pupoo-admin-chatbot-prefill-notice", handlePrefill);
  }, []);

  const showToast = (msg, type = "success") => setToast({ msg, type });
  const syncPanelDraft = useCallback((form) => {
    if (!form) return;
    const detail = {
      formData: form,
      execution: buildNoticeExecution(form),
    };
    setPrefillExecution(detail.execution);
    syncNoticeDraft(detail);
  }, []);

  // 저장하지 않고 닫으면 임시 초안도 지운다. (남아 있으면 다음 방문 때 작성 화면이 자동으로 열린다)
  const closePanel = useCallback(() => {
    setPanel(null);
    setPrefillExecution(null);
    syncNoticeDraft(null);
  }, []);

  const fetchList = useCallback(async (p = 1) => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminNoticeApi.list(p, PAGE_SIZE);
      const d = unwrap(res);
      setItems(d.content || []);
      setTotalPages(d.totalPages || 0);
      setTotalElements(d.totalElements ?? d.content?.length ?? 0);
      setPage(p);
    } catch (err) {
      console.error("[Notice] fetch error:", err);
      if (err?.response?.status === 401) {
        setError("로그인이 필요합니다. 로그인 페이지에서 다시 로그인해주세요.");
      } else {
        setError("공지사항을 불러오는데 실패했습니다.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchList(1);
  }, [fetchList]);

  const rows = items.filter((e) => !search || e.title?.includes(search));
  const isMobile = viewportWidth < 768;

  /* ── 선택 관련 ── */
  const isAllSelected =
    rows.length > 0 && rows.every((r) => selected.has(r.noticeId));
  const hasSelected = selected.size > 0;
  const toggleAll = () => {
    if (isAllSelected) setSelected(new Set());
    else setSelected(new Set(rows.map((r) => r.noticeId)));
  };
  const toggleOne = (id) => {
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  const handleCreate = async (form) => {
    setSaving(true);
    try {
      await adminNoticeApi.create(form);
      syncNoticeDraft(null);
      setPrefillExecution(null);
      setPanel(null);
      showToast("공지사항이 등록되었습니다.");
      fetchList(1);
    } catch (err) {
      console.error("[Notice] create error:", err);
      showToast("등록에 실패했습니다.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (form) => {
    setSaving(true);
    try {
      await adminNoticeApi.update(panel.item.noticeId, form);
      syncNoticeDraft(null);
      setPrefillExecution(null);
      setPanel(null);
      showToast("공지사항이 수정되었습니다.");
      fetchList(page);
    } catch (err) {
      console.error("[Notice] update error:", err);
      showToast("수정에 실패했습니다.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    const id = modal.item.noticeId;
    setSaving(true);
    try {
      await adminNoticeApi.delete(id);
      setModal(null);
      setRemoving(id);
      setTimeout(() => {
        setRemoving(null);
        showToast("공지사항이 삭제되었습니다.");
        fetchList(page);
      }, 300);
    } catch (err) {
      console.error("[Notice] delete error:", err);
      setModal(null);
      showToast("삭제에 실패했습니다.", "error");
    } finally {
      setSaving(false);
    }
  };

  /* ── 선택 삭제 ── */
  const handleBatchDelete = async () => {
    setSaving(true);
    const ids = [...selected];
    try {
      for (const id of ids) {
        await adminNoticeApi.delete(id);
      }
      setModal(null);
      setSelected(new Set());
      showToast(`${ids.length}건이 삭제되었습니다.`);
      fetchList(page);
    } catch (err) {
      console.error("[Notice] batch delete error:", err);
      setModal(null);
      showToast("일괄 삭제에 실패했습니다.", "error");
    } finally {
      setSaving(false);
    }
  };

  /* ── 전체 삭제 ── */
  const handleDeleteAll = async () => {
    setSaving(true);
    try {
      for (const r of rows) {
        await adminNoticeApi.delete(r.noticeId);
      }
      setModal(null);
      setSelected(new Set());
      showToast(`${rows.length}건이 전체 삭제되었습니다.`);
      fetchList(1);
    } catch (err) {
      console.error("[Notice] delete all error:", err);
      setModal(null);
      showToast("전체 삭제에 실패했습니다.", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <style>{styles}</style>
      {prefillExecution && (
        <div
          style={{
            marginBottom: 14,
            background: prefillExecution.supported ? ds.brandSoft : ds.redSoft,
            border: `1px solid ${prefillExecution.supported ? "rgba(4,89,247,0.35)" : "rgba(240,82,74,0.35)"}`,
            color: prefillExecution.supported ? ds.brandText : ds.red,
            borderRadius: 10,
            padding: "12px 14px",
            fontSize: 12.5,
            fontWeight: 600,
            lineHeight: 1.6,
          }}
        >
          {prefillExecution.supported
            ? `AI 비서가 작성한 초안을 채웠어요. 저장 상태: ${NOTICE_STATUS_LABEL[prefillExecution.status || "DRAFT"] || prefillExecution.status}`
            : prefillExecution.reason || "현재 요청은 실행이 제한됩니다."}
        </div>
      )}
      <div
        style={{
          background: ds.card,
          borderRadius: 12,
          border: `1px solid ${ds.line}`,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: isMobile ? "14px" : "14px 20px",
            display: "flex",
            flexDirection: isMobile ? "column" : "row",
            alignItems: isMobile ? "stretch" : "center",
            justifyContent: "space-between",
            borderBottom: `1px solid ${ds.line}`,
            gap: isMobile ? 12 : 8,
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
            <Checkbox
              checked={isAllSelected && rows.length > 0}
              onChange={toggleAll}
            />
            <span style={{ fontSize: 14, fontWeight: 700, color: ds.ink }}>
              공지사항
            </span>
            <span style={{ fontSize: 12, fontWeight: 600, color: ds.ink4 }}>
              총 {totalElements}개
            </span>
            {hasSelected && (
              <span
                style={{
                  fontSize: 12.5,
                  fontWeight: 700,
                  color: ds.brand,
                  background: `${ds.brand}0C`,
                  padding: "4px 10px",
                  borderRadius: 6,
                }}
              >
                {selected.size}건 선택됨
              </span>
            )}
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              flexWrap: "wrap",
              width: isMobile ? "100%" : "auto",
            }}
          >
            {hasSelected && (
              <button
                onClick={() => setModal({ type: "batchDelete" })}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  padding: "7px 12px",
                  borderRadius: 7,
                  border: `1px solid ${ds.red}`,
                  background: ds.red,
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#fff",
                  cursor: "pointer",
                  fontFamily: ds.ff,
                }}
              >
                <Trash2 size={12} /> 선택 삭제
              </button>
            )}
            {rows.length > 0 && (
              <button
                onClick={() => setModal({ type: "deleteAll" })}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  padding: "7px 12px",
                  borderRadius: 7,
                  border: `1px solid ${ds.line}`,
                  background: ds.card,
                  fontSize: 12,
                  fontWeight: 600,
                  color: ds.ink3,
                  cursor: "pointer",
                  fontFamily: ds.ff,
                }}
              >
                <Trash2 size={12} /> 전체 삭제
              </button>
            )}
            <button
              onClick={() => fetchList(page)}
              style={{
                padding: "7px 10px",
                borderRadius: 7,
                border: `1px solid ${ds.line}`,
                background: ds.card,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 4,
                fontSize: 12,
                fontWeight: 600,
                color: ds.ink3,
                fontFamily: ds.ff,
              }}
            >
              <RefreshCw size={13} /> 새로고침
            </button>
            <div style={{ position: "relative", flex: isMobile ? "1 1 100%" : "0 0 auto" }}>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="검색어를 입력하세요."
                style={{
                  width: isMobile ? "100%" : 220,
                  padding: "7px 14px 7px 34px",
                  borderRadius: 8,
                  border: `1px solid ${ds.line}`,
                  fontSize: 13,
                  fontFamily: ds.ff,
                  color: ds.ink,
                  outline: "none",
                  background: ds.bg,
                }}
                onFocus={(e) => (e.target.style.borderColor = ds.brand)}
                onBlur={(e) => (e.target.style.borderColor = ds.line)}
              />
              <Search
                size={14}
                color={ds.ink4}
                style={{
                  position: "absolute",
                  left: 11,
                  top: "50%",
                  transform: "translateY(-50%)",
                }}
              />
            </div>
            <button
              onClick={() => setPanel({ type: "create" })}
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
                width: isMobile ? "100%" : "auto",
                justifyContent: "center",
              }}
            >
              <Plus size={13} strokeWidth={2.5} /> 공지 등록
            </button>
          </div>
        </div>

        {loading && (
          <div
            style={{
              textAlign: "center",
              padding: "60px 20px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 12,
            }}
          >
            <Spinner size={28} />
            <span style={{ fontSize: 13, color: ds.ink4 }}>
              불러오는 중...
            </span>
          </div>
        )}

        {!loading && error && (
          <div
            style={{
              padding: "60px 20px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 8,
            }}
          >
            <div
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: ds.ink3,
                marginBottom: 8,
              }}
            >
              {error}
            </div>
            <button
              onClick={() => fetchList(page)}
              style={{
                padding: "8px 20px",
                borderRadius: 8,
                border: `1px solid ${ds.line}`,
                background: ds.card,
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: ds.ff,
                color: ds.ink3,
              }}
            >
              다시 시도
            </button>
          </div>
        )}

        {!loading &&
          !error &&
          rows.map((r) => (
            <div
              key={r.noticeId}
              className={`board-row ${removing === r.noticeId ? "row-removing" : ""}`}
              onClick={() => setModal({ type: "detail", item: r })}
              style={{
                display: "flex",
                flexDirection: isMobile ? "column" : "row",
                alignItems: isMobile ? "stretch" : "center",
                padding: isMobile ? "12px 14px" : "10px 16px 10px 20px",
                borderBottom: `1px solid ${ds.line}`,
                cursor: "pointer",
                transition: "background .1s",
                position: "relative",
                gap: isMobile ? 12 : 0,
                background: selected.has(r.noticeId)
                  ? `${ds.brand}06`
                  : "transparent",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = selected.has(r.noticeId)
                  ? `${ds.brand}0A`
                  : ds.cardHover)
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = selected.has(r.noticeId)
                  ? `${ds.brand}06`
                  : "transparent")
              }
            >
              <div style={{ display: "flex", alignItems: "center", gap: 14, width: "100%", minWidth: 0 }}>
                <Checkbox checked={selected.has(r.noticeId)} onChange={() => toggleOne(r.noticeId)} />
                <span style={{ width: 44, flexShrink: 0, fontSize: 13, color: ds.ink3 }}>
                  {r.scope === "ALL" ? "전체" : "행사"}
                </span>
                <div style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 8 }}>
                  {r.pinned && (
                    <span
                      style={{
                        flexShrink: 0,
                        height: 22,
                        padding: "0 7px",
                        borderRadius: 6,
                        background: ds.brandSoft,
                        color: ds.brandText,
                        fontSize: 12,
                        fontWeight: 600,
                        display: "inline-flex",
                        alignItems: "center",
                      }}
                    >
                      고정
                    </span>
                  )}
                  <span
                    style={{
                      fontSize: 14.5,
                      fontWeight: 500,
                      color: ds.ink,
                      whiteSpace: isMobile ? "normal" : "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      wordBreak: "keep-all",
                    }}
                  >
                    {r.title}
                  </span>
                </div>
                {!isMobile && (
                  <span style={{ width: 96, flexShrink: 0, fontSize: 13.5, color: ds.ink3, textAlign: "right" }}>
                    {fmtDate(r.createdAt)}
                  </span>
                )}
                <div style={{ display: "flex", gap: 2, flexShrink: 0 }}>
                  <IconButton
                    icon={Pencil}
                    label="수정"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPanel({ type: "edit", item: r });
                    }}
                  />
                  <IconButton
                    icon={Trash2}
                    label="삭제"
                    danger
                    onClick={(e) => {
                      e.stopPropagation();
                      setModal({ type: "delete", item: r });
                    }}
                  />
                </div>
              </div>
            </div>
          ))}

        {!loading && !error && rows.length === 0 && (
          <EmptyState icon={Megaphone} title="공지사항이 없습니다" description="오른쪽 위 '공지 등록'으로 첫 공지를 작성해 보세요." />
        )}

        {!loading && !error && totalPages > 1 && (
          <div
            style={{
              padding: "14px 20px",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: 6,
              borderTop: `1px solid ${ds.line}`,
            }}
          >
            <button
              onClick={() => fetchList(page - 1)}
              disabled={page <= 1}
              style={{
                width: 30,
                height: 30,
                borderRadius: 7,
                border: `1px solid ${ds.line}`,
                background: ds.card,
                cursor: page <= 1 ? "default" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                opacity: page <= 1 ? 0.4 : 1,
              }}
            >
              <ChevronLeft size={14} color={ds.ink3} />
            </button>
            {Array.from({ length: totalPages }, (_, i) => (
              <button
                key={i}
                onClick={() => fetchList(i + 1)}
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 7,
                  border: i + 1 === page ? "none" : `1px solid ${ds.line}`,
                  background: i + 1 === page ? ds.brand : ds.card,
                  color: i + 1 === page ? "#fff" : ds.ink4,
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                  fontFamily: ds.ff,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {i + 1}
              </button>
            ))}
            <button
              onClick={() => fetchList(page + 1)}
              disabled={page >= totalPages}
              style={{
                width: 30,
                height: 30,
                borderRadius: 7,
                border: `1px solid ${ds.line}`,
                background: ds.card,
                cursor: page >= totalPages ? "default" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                opacity: page >= totalPages ? 0.4 : 1,
              }}
            >
              <ChevronRight size={14} color={ds.ink3} />
            </button>
          </div>
        )}
      </div>

      {panel?.type === "create" && (
        <SlidePanel
          initialForm={panel.initialForm}
          onSave={handleCreate}
          onClose={closePanel}
          saving={saving}
          onDraftChange={syncPanelDraft}
        />
      )}
      {panel?.type === "edit" && (
        <SlidePanel
          item={panel.item}
          isEdit
          onSave={handleUpdate}
          onClose={closePanel}
          saving={saving}
          onDraftChange={syncPanelDraft}
        />
      )}
      {modal?.type === "detail" && (
        <DetailModal
          item={modal.item}
          onClose={() => setModal(null)}
          onEdit={(item) => {
            setModal(null);
            setPanel({ type: "edit", item });
          }}
          onDelete={(item) => setModal({ type: "delete", item })}
        />
      )}
      {modal?.type === "delete" && (
        <ConfirmModal
          title="공지사항 삭제"
          loading={saving}
          msg={`"${modal.item.title}" 공지사항을 삭제하시겠습니까?\n삭제된 데이터는 복구할 수 없습니다.`}
          onConfirm={handleDelete}
          onCancel={() => setModal(null)}
        />
      )}
      {modal?.type === "batchDelete" && (
        <ConfirmModal
          title="선택 삭제"
          loading={saving}
          msg={`선택한 ${selected.size}건을 삭제하시겠습니까?\n삭제된 데이터는 복구할 수 없습니다.`}
          onConfirm={handleBatchDelete}
          onCancel={() => setModal(null)}
        />
      )}
      {modal?.type === "deleteAll" && (
        <ConfirmModal
          title="전체 삭제"
          loading={saving}
          msg={`현재 목록의 ${rows.length}건을 전체 삭제하시겠습니까?\n삭제된 데이터는 복구할 수 없습니다.`}
          onConfirm={handleDeleteAll}
          onCancel={() => setModal(null)}
        />
      )}
      {toast && (
        <Toast
          msg={toast.msg}
          type={toast.type}
          onDone={() => setToast(null)}
        />
      )}
    </div>
  );
}
