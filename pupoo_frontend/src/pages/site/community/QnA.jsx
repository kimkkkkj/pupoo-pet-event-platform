import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import PageHeader from "../components/PageHeader";
import PageLoading from "../components/PageLoading";
import EmptyState from "../components/EmptyState";
import CommunityPagination from "./shared/CommunityPagination";
import {
  ChevronDown,
  Search,
  Plus,
  X,
  Pencil,
  Trash2,
  AlertTriangle,
  Loader2,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  ListFilter,
  CircleHelp,
} from "lucide-react";
import { qnaApi, unwrap } from "../../../api/qnaApi";
import { COMMUNITY_CATEGORIES, getBoardBadge } from "./communityConfig";
import CommunityContentTextarea from "./shared/CommunityContentTextarea";
import BadgeTag from "./shared/BadgeTag";
import { hasMeaningfulCommunityContent } from "./shared/communityHtml";

const FILTER_OPTIONS = [
  "전체",
  "답변완료",
  "미답변",
];
const SORT_OPTIONS = [
  { key: "recent", label: "최신순" },
  { key: "views", label: "조회순" },
];

/* date formatter */
function fmtDate(dt) {
  if (!dt) return "-";
  const d = new Date(dt);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

function hasAnswer(item) {
  const normalizedStatus = String(item?.status ?? item?.answerStatus ?? "").trim().toUpperCase();
  if (["CLOSED", "ANSWERED", "COMPLETED", "RESOLVED", "DONE"].includes(normalizedStatus)) {
    return true;
  }
  if (["OPEN", "PENDING", "WAITING", "UNANSWERED"].includes(normalizedStatus)) {
    return false;
  }
  return (
    Boolean(String(item?.answerContent ?? item?.answer ?? "").trim()) ||
    Boolean(item?.answeredAt) ||
    Boolean(item?.answerDate)
  );
}

/* toast */
function Toast({ msg, type = "success", onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2200);
    return () => clearTimeout(t);
  }, [onDone]);
  const bg = type === "success" ? "#3a4520" : "#EF4444";
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
        fontFamily: "'Noto Sans KR', sans-serif",
        boxShadow: "0 8px 30px rgba(0,0,0,0.18)",
        display: "flex",
        alignItems: "center",
        gap: 8,
      }}
    >
      {type === "success" ? "완료" : "오류"} {msg}
    </div>
  );
}

/* overlay */
function Overlay({ children, onClose }) {
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
          background: "#fff",
          borderRadius: 16,
          width: 520,
          maxHeight: "85vh",
          overflow: "auto",
          boxShadow: "0 24px 60px rgba(0,0,0,0.18)",
        }}
      >
        {children}
      </div>
    </div>
  );
}

/* delete confirm modal */
function ConfirmModal({ title, msg, onConfirm, onCancel, loading }) {
  return (
    <Overlay onClose={onCancel}>
      <div style={{ padding: "28px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 14,
          }}
        >
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              background: "#FEF2F2",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <AlertTriangle size={18} color="#EF4444" />
          </div>
          <h3
            style={{ fontSize: 16, fontWeight: 700, color: "#222", margin: 0 }}
          >
            {title}
          </h3>
        </div>
        <p
          style={{
            fontSize: 14,
            color: "#64748B",
            lineHeight: 1.6,
            whiteSpace: "pre-line",
            margin: "0 0 24px",
          }}
        >
          {msg}
        </p>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button
            onClick={onCancel}
            disabled={loading}
            style={{
              padding: "9px 20px",
              borderRadius: 8,
              border: "1px solid #ddd",
              background: "#fff",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              color: "#666",
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
              opacity: loading ? 0.5 : 1,
            }}
          >
            {loading ? "삭제 중..." : "삭제"}
          </button>
        </div>
      </div>
    </Overlay>
  );
}

/* write and edit modal */
function WriteModal({ item, onSave, onClose, saving }) {
  const isEdit = !!item;
  const [form, setForm] = useState({
    title: item?.title || "",
    content: item?.content || "",
  });
  const [err, setErr] = useState("");

  const handleSave = () => {
    if (!form.title.trim()) {
      setErr("제목을 입력해 주세요.");
      return;
    }
    if (!hasMeaningfulCommunityContent(form.content)) {
      setErr("내용을 입력해 주세요.");
      return;
    }
    onSave(form);
  };

  return (
    <Overlay onClose={onClose}>
      <div style={{ padding: "28px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 24,
          }}
        >
          <h3
            style={{ fontSize: 18, fontWeight: 700, color: "#222", margin: 0 }}
          >
            {isEdit ? "질문 수정" : "질문 등록"}
          </h3>
          <button
            onClick={onClose}
            style={{
              width: 30,
              height: 30,
              borderRadius: 8,
              border: "1px solid #eee",
              background: "#fff",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <X size={14} color="#999" />
          </button>
        </div>

        {err && (
          <div
            style={{
              background: "#FEF2F2",
              border: "1px solid #FECACA",
              borderRadius: 8,
              padding: "10px 14px",
              fontSize: 13,
              color: "#DC2626",
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
          <label
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "#555",
              marginBottom: 6,
              display: "block",
            }}
          >
            제목 <span style={{ color: "#EF4444" }}>*</span>
          </label>
          <input
            value={form.title}
            onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
            placeholder="질문 제목을 입력해 주세요"
            style={{
              width: "100%",
              padding: "10px 14px",
              borderRadius: 8,
              border: "1px solid #ddd",
              fontSize: 14,
              color: "#222",
              outline: "none",
              boxSizing: "border-box",
              fontFamily: "'Noto Sans KR', sans-serif",
            }}
            onFocus={(e) => (e.target.style.borderColor = "#2EB893")}
            onBlur={(e) => (e.target.style.borderColor = "#ddd")}
          />
        </div>

        <div style={{ marginBottom: 24 }}>
          <label
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "#555",
              marginBottom: 6,
              display: "block",
            }}
          >
            내용 <span style={{ color: "#EF4444" }}>*</span>
          </label>
          <CommunityContentTextarea
            value={form.content}
            onChange={(value) => setForm((p) => ({ ...p, content: value }))}
            placeholder="질문 내용을 입력해 주세요."
            height={280}
          />
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={onClose}
            disabled={saving}
            style={{
              flex: 1,
              padding: "11px 0",
              borderRadius: 8,
              border: "1px solid #ddd",
              background: "#fff",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
              color: "#666",
              fontFamily: "'Noto Sans KR', sans-serif",
            }}
          >
            취소
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              flex: 1,
              padding: "11px 0",
              borderRadius: 8,
              border: "none",
              background: "#111827",
              color: "#fff",
              fontSize: 14,
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: "'Noto Sans KR', sans-serif",
              opacity: saving ? 0.5 : 1,
            }}
          >
            {saving ? "저장 중..." : isEdit ? "수정 완료" : "등록하기"}
          </button>
        </div>
      </div>
    </Overlay>
  );
}

/* main component */


export default function ServicePage() {
  const navigate = useNavigate();
  const badge = getBoardBadge("QNA");
  const [currentPath, setCurrentPath] = useState("/community/qna");
  const [filter, setFilter] = useState("전체");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState("recent");
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const [filterDdOpen, setFilterDdOpen] = useState(false);
  const filterDdRef = useRef(null);
  const sortDdRef = useRef(null);
  const [viewportWidth, setViewportWidth] = useState(() =>
    typeof window === "undefined" ? 1440 : window.innerWidth,
  );
  const [openReplies, setOpenReplies] = useState({});

  /* data state */
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const PAGE_SIZE = 10;

  const [writeModal, setWriteModal] = useState(null); // null | { } | { item }
  const [deleteModal, setDeleteModal] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = "success") => setToast({ msg, type });

  const toggleReply = (id) => {
    setOpenReplies((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  /* fetch question list */
  const fetchList = useCallback(async (requestedPage = 1) => {
    setLoading(true);
    setError(null);
    try {
      const statusFilter =
        filter === "답변완료" ? "ANSWERED" : filter === "미답변" ? "UNANSWERED" : undefined;
      const response = await qnaApi.list(requestedPage, PAGE_SIZE, {
        statusFilter,
        keyword: search.trim(),
        sortKey,
      });
      const data = unwrap(response) || {};
      setItems(Array.isArray(data.content) ? data.content : []);
      setTotalElements(Number(data.totalElements) || 0);
      setTotalPages(Math.max(1, Number(data.totalPages) || 1));
    } catch (err) {
      console.error("[QnA] fetch error:", err);
      setError("질문 목록을 불러오지 못했습니다.");
      setItems([]);
      setTotalElements(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [filter, search, sortKey]);

  useEffect(() => {
    fetchList(page);
  }, [fetchList, page]);

  const currentPage = Math.min(page, totalPages);
  const pagedItems = items;

  useEffect(() => {
    setPage(1);
  }, [filter, search, sortKey]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const isMobile = viewportWidth < 768;
  const isTablet = viewportWidth >= 768 && viewportWidth < 1024;

  const currentSortLabel =
    SORT_OPTIONS.find((option) => option.key === sortKey)?.label ||
    "최신순";

  useEffect(() => {
    const h = (e) => {
      if (filterDdRef.current && !filterDdRef.current.contains(e.target)) setFilterDdOpen(false);
      if (sortDdRef.current && !sortDdRef.current.contains(e.target)) setSortMenuOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  /* create question */
  const handleCreate = async (form) => {
    setSaving(true);
    try {
      const res = await qnaApi.create(form);
      setWriteModal(null);
      showToast("질문이 등록되었습니다.");
      if (page === 1) {
        fetchList(1);
      } else {
        setPage(1);
      }
    } catch (err) {
      console.error("[QnA] create error:", err);
      showToast("등록에 실패했습니다.", "error");
    } finally {
      setSaving(false);
    }
  };

  /* update question */
  const handleUpdate = async (form) => {
    setSaving(true);
    try {
      await qnaApi.update(writeModal.item.qnaId, form);
      setWriteModal(null);
      showToast("질문이 수정되었습니다.");
      if (page === 1) {
        fetchList(1);
      } else {
        setPage(1);
      }
    } catch (err) {
      console.error("[QnA] update error:", err);
      showToast("수정에 실패했습니다.", "error");
    } finally {
      setSaving(false);
    }
  };

  /* delete question */
  const handleDelete = async () => {
    setSaving(true);
    try {
      await qnaApi.delete(deleteModal.qnaId);
      setDeleteModal(null);
      showToast("질문이 삭제되었습니다.");
      if (page === 1) {
        fetchList(1);
      } else {
        setPage(1);
      }
    } catch (err) {
      console.error("[QnA] delete error:", err);
      setDeleteModal(null);
      showToast("삭제에 실패했습니다.", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader
        title="질문/답변"
        subtitle={"서비스 이용과 관련한 문의사항을 등록하고 답변을 확인할 수 있습니다."}
        icon={<CircleHelp size={42} color="#90C450" strokeWidth={1.6} />}
        titleStyle={{ fontSize: 46, lineHeight: "66px", letterSpacing: "-1px" }}
        subtitleStyle={{ fontSize: 20 }}
        categories={COMMUNITY_CATEGORIES}
        currentPath={currentPath}
        onNavigate={setCurrentPath}
      />
      <main
        style={{
          width: isMobile
            ? "min(100%, calc(100% - 24px))"
            : isTablet
              ? "min(1400px, calc(100% - 32px))"
              : "min(1400px, calc(100% - 40px))",
          margin: "0 auto",
          padding: isMobile ? "20px 0 40px" : isTablet ? "28px 0 52px" : "40px 0 64px",
          fontFamily: "'Noto Sans KR', sans-serif",
        }}
      >
        {/* top filter and search bar */}
        <div
          style={{
            display: "flex",
            flexDirection: isMobile ? "column" : "row",
            alignItems: isMobile ? "stretch" : "center",
            justifyContent: "space-between",
            paddingBottom: "16px",
            marginBottom: "8px",
            gap: isMobile ? 12 : 8,
          }}
        >
          <span style={{ fontSize: "15px", fontWeight: "600", color: "#222" }}>
            총 {totalElements}건
          </span>

          <div style={{ display: "flex", alignItems: "center", gap: 8, width: isMobile ? "100%" : "auto", height: isMobile ? "auto" : 48, flexWrap: isMobile ? "wrap" : "nowrap", rowGap: isMobile ? 8 : 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 0, background: isMobile ? "transparent" : "#fff", border: isMobile ? "none" : "1px solid #e2e5ea", borderRadius: 12, height: isMobile ? "auto" : 48, width: isMobile ? "100%" : "auto", flexWrap: isMobile ? "wrap" : "nowrap", padding: 0, rowGap: isMobile ? 8 : 0 }}>
              {/* status dropdown */}
              <div style={{ position: "relative", flex: isMobile ? "1 1 100%" : "0 0 auto" }} ref={filterDdRef}>
                <button
                  type="button"
                  onClick={() => setFilterDdOpen((v) => !v)}
                  style={{ height: isMobile ? 40 : 48, width: isMobile ? "100%" : "auto", padding: "0 36px 0 14px", border: isMobile ? "none" : "none", background: isMobile ? "#f3f4f6" : "transparent", borderRadius: isMobile ? 8 : 0, color: "#9ca3af", fontSize: 13, fontWeight: 500, cursor: "pointer", textAlign: "left", outline: "none", fontFamily: "inherit", whiteSpace: "nowrap", minWidth: isMobile ? 0 : 120, display: "inline-flex", alignItems: "center", gap: 7 }}
                >
                  <ListFilter size={14} style={{ color: "#9ca3af" }} />
                  {filter}
                </button>
                <ChevronDown size={15} style={{ position: "absolute", right: 12, top: "50%", transform: filterDdOpen ? "translateY(-50%) rotate(180deg)" : "translateY(-50%)", color: "#9ca3af", pointerEvents: "none", transition: "transform .15s ease" }} />
                {filterDdOpen && (
                  <div style={{ position: "absolute", top: "calc(100% + 8px)", left: 0, minWidth: 200, background: "#fff", borderRadius: 16, padding: "8px 0", boxShadow: "0 4px 24px rgba(0,0,0,.10)", zIndex: 50, maxHeight: 280, overflowY: "auto" }}>
                    {FILTER_OPTIONS.map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => { setFilter(opt); setFilterDdOpen(false); }}
                        style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "11px 16px", border: "none", background: "none", color: filter === opt ? "#111827" : "#6b7280", fontSize: 13, fontWeight: filter === opt ? 600 : 500, cursor: "pointer", textAlign: "left", fontFamily: "inherit" }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "#f9fafb")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                      >
                        <ListFilter size={14} style={{ color: "#9ca3af", flexShrink: 0 }} />
                        {opt}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {!isMobile && <div style={{ width: 1, height: 20, background: "#dbe2ea", flexShrink: 0 }} />}

              {/* sort button */}
              <div style={{ position: "relative", flex: isMobile ? "1 1 100%" : "0 0 auto" }} ref={sortDdRef}>
                <button
                  type="button"
                  onClick={() => setSortMenuOpen((prev) => !prev)}
                  style={{ height: isMobile ? 40 : 48, width: isMobile ? "100%" : "auto", padding: "0 36px 0 14px", border: isMobile ? "none" : "none", background: isMobile ? "#f3f4f6" : "transparent", borderRadius: isMobile ? 8 : 0, color: "#9ca3af", fontSize: 13, fontWeight: 500, cursor: "pointer", textAlign: "left", outline: "none", fontFamily: "inherit", whiteSpace: "nowrap", minWidth: isMobile ? 0 : 110, display: "inline-flex", alignItems: "center", gap: 7 }}
                >
                  <SlidersHorizontal size={14} style={{ color: "#9ca3af" }} />
                  {currentSortLabel}
                </button>
                <ChevronDown size={15} style={{ position: "absolute", right: 12, top: "50%", transform: sortMenuOpen ? "translateY(-50%) rotate(180deg)" : "translateY(-50%)", color: "#9ca3af", pointerEvents: "none", transition: "transform .15s ease" }} />
                {sortMenuOpen && (
                  <div style={{ position: "absolute", top: "calc(100% + 8px)", left: 0, minWidth: 200, background: "#fff", borderRadius: 16, padding: "8px 0", boxShadow: "0 4px 24px rgba(0,0,0,.10)", zIndex: 50, maxHeight: 280, overflowY: "auto" }}>
                    {SORT_OPTIONS.map((option) => (
                      <button
                        key={option.key}
                        type="button"
                        onClick={() => { setSortKey(option.key); setSortMenuOpen(false); }}
                        style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "11px 16px", border: "none", background: "none", color: sortKey === option.key ? "#111827" : "#6b7280", fontSize: 13, fontWeight: sortKey === option.key ? 600 : 500, cursor: "pointer", textAlign: "left", fontFamily: "inherit" }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "#f9fafb")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                      >
                        <SlidersHorizontal size={14} style={{ color: "#9ca3af", flexShrink: 0 }} />
                        {option.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {!isMobile && <div style={{ width: 1, height: 20, background: "#dbe2ea", flexShrink: 0 }} />}

              {/* search input */}
              <div style={{ position: "relative", flex: isMobile ? "1 1 100%" : "1 1 auto", minWidth: 0, width: isMobile ? "100%" : "auto" }}>
                <Search
                  size={16}
                  strokeWidth={2}
                  style={{
                    position: "absolute",
                    left: 14,
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "#9ca3af",
                    pointerEvents: "none",
                  }}
                />
                <input
                  className="board-search-input"
                  type="text"
                  placeholder="질문 또는 답변 검색"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{
                    border: isMobile ? "1px solid #e2e5ea" : "none",
                    background: isMobile ? "#fff" : "transparent",
                    padding: "0 14px 0 40px",
                    borderRadius: isMobile ? 12 : "0 12px 12px 0",
                    height: isMobile ? 48 : 48,
                    fontSize: 13,
                    fontWeight: 500,
                    color: "#111827",
                    outline: "none",
                    width: isMobile ? "100%" : 280,
                  }}
                />
              </div>
            </div>

            <button
              onClick={() => navigate("/community/qna/write")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                padding: "0 24px",
                borderRadius: 12,
                border: "none",
                background: "#111827",
                color: "#fff",
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: "'Noto Sans KR', sans-serif",
                transition: "background .15s",
                width: isMobile ? "100%" : "auto", height: isMobile ? 40 : 48,
                justifyContent: "center",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "#3a6ce7")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "#2EB893")
              }
            >
              <Plus size={14} strokeWidth={2.5} /> 질문하기
            </button>
          </div>
        </div>

        {/* loading */}
        {loading && (
          <PageLoading message="질문 목록을 불러오는 중입니다" />
        )}

        {/* error */}
        {!loading && error && (
          <EmptyState type="error" message="질문 목록을 불러오지 못했습니다." description="네트워크 연결을 확인하고 다시 시도해 주세요." />
        )}

        {/* list */}
        {!loading && !error && (
          <div>
            <div style={{
              display: "flex",
              alignItems: "center",
              padding: "12px 16px",
              background: "#f9fafb",
              borderTop: "2px solid #333",
              borderBottom: "1px solid #e5e7eb",
              fontSize: 13,
              fontWeight: 600,
              color: "#6b7280",
            }}>
              <span style={{ width: 60, textAlign: "center", flexShrink: 0 }}>번호</span>
              <span style={{ flex: 1, textAlign: "center" }}>제목</span>
              <span style={{ width: 100, textAlign: "center", flexShrink: 0 }}>작성자</span>
              <span style={{ width: 100, textAlign: "center", flexShrink: 0 }}>등록일</span>
              <span style={{ width: 80, textAlign: "center", flexShrink: 0 }}>조회수</span>
            </div>
            {pagedItems.map((q, index) => {
              const isClosed = hasAnswer(q);
              const statusLabel = isClosed ? "답변완료" : "미답변";
              const rowNumber = totalElements - ((currentPage - 1) * PAGE_SIZE) - index;
              const authorLabel =
                q?.author ||
                q?.nickname ||
                q?.userName ||
                (q?.userId ? `회원 #${q.userId}` : "익명 사용자");

              return (
                <div
                  key={q.qnaId}
                  style={{ borderBottom: "1px solid #f0f0f0" }}
                >
                  <div
                    style={{
                      display: "flex",
                      flexDirection: isMobile ? "column" : "row",
                      alignItems: isMobile ? "stretch" : "center",
                      gap: isMobile ? 8 : 0,
                      padding: isMobile ? "14px 12px" : "18px 16px",
                      cursor: "pointer",
                      transition: "background 0.15s",
                    }}
                    onClick={() => navigate(`/community/qna/${q.qnaId}`)}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = "#f9f9f9")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = "transparent")
                    }
                  >
                    {!isMobile && <span style={{ width: 60, textAlign: "center", fontSize: 14, color: "#9ca3af", flexShrink: 0 }}>{rowNumber}</span>}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", minWidth: 0 }}>
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            color: isClosed ? "#2EB893" : "#999",
                            border: `1px solid ${isClosed ? "#2EB893" : "#ccc"}`,
                            borderRadius: 20,
                            padding: "2px 9px",
                            whiteSpace: "nowrap",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 3,
                            flexShrink: 0,
                          }}
                        >
                          {statusLabel}
                        </span>
                        <BadgeTag badge={badge} style={isMobile ? { ...badge.style, padding: "4px 10px", fontSize: 11 } : undefined} />
                        <span
                          style={{
                            flex: 1,
                            minWidth: 0,
                            fontSize: isMobile ? 14 : 15,
                            color: "#111827",
                            fontWeight: 500,
                            overflow: "hidden",
                            textOverflow: isMobile ? "clip" : "ellipsis",
                            whiteSpace: isMobile ? "normal" : "nowrap",
                            wordBreak: "keep-all",
                            overflowWrap: "break-word",
                          }}
                        >
                          {q.title}
                        </span>
                      </div>
                      {isMobile && (
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginTop: 6, fontSize: 13, color: "#6b7280" }}>
                          <span>{authorLabel}</span>
                          <span style={{ color: "#cbd5e1" }}>·</span>
                          <span style={{ color: "#9ca3af", whiteSpace: "nowrap" }}>{fmtDate(q.createdAt)}</span>
                          <span style={{ color: "#cbd5e1" }}>·</span>
                          <span style={{ color: "#9ca3af" }}>조회 {q.viewCount ?? 0}</span>
                        </div>
                      )}
                    </div>
                    {!isMobile && <span style={{ width: 100, textAlign: "center", fontSize: 14, color: "#6b7280", flexShrink: 0 }}>{authorLabel}</span>}
                    {!isMobile && (
                      <span style={{ width: 100, textAlign: "center", fontSize: 14, color: "#9ca3af", whiteSpace: "nowrap", flexShrink: 0 }}>
                        {fmtDate(q.createdAt)}
                      </span>
                    )}
                    {!isMobile && <span style={{ width: 80, textAlign: "center", fontSize: 13, color: "#9ca3af", flexShrink: 0 }}>{q.viewCount ?? 0}</span>}
                  </div>
                </div>
                );
              })}

            {pagedItems.length === 0 && (
              <div
                style={{
                  textAlign: "center",
                  padding: "60px 0",
                  color: "#999",
                  fontSize: "14px",
                }}
              >
                {items.length === 0
                  ? "아직 질문이 없습니다. 첫 번째 질문을 등록해 보세요."
                  : "검색 결과가 없습니다."}
              </div>
            )}
          </div>
        )}

        {/* pagination */}
        {!loading && !error ? (
          <CommunityPagination
            currentPage={currentPage}
            totalPages={totalPages}
            onChange={setPage}
          />
        ) : null}
      </main>

      {/* write and edit modal */}
      {writeModal?.item ? (
        <WriteModal
          item={writeModal.item}
          onSave={handleUpdate}
          onClose={() => setWriteModal(null)}
          saving={saving}
        />
      ) : null}

      {/* delete confirm modal */}
      {deleteModal && (
        <ConfirmModal
          title="질문 삭제"
          loading={saving}
          msg={`"${deleteModal.title}"을 삭제하시겠습니까?\n삭제된 데이터는 복구할 수 없습니다.`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteModal(null)}
        />
      )}

      {/* toast */}
      {toast && (
        <Toast
          msg={toast.msg}
          type={toast.type}
          onDone={() => setToast(null)}
        />
      )}
    </>
  );
}




