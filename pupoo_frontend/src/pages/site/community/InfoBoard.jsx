import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import PageHeader from "../components/PageHeader";
import PageLoading from "../components/PageLoading";
import EmptyState from "../components/EmptyState";
import CommunityPagination from "./shared/CommunityPagination";
import {
  Search,
  Loader2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  X,
  MessageCircle,
  Plus,
  AlertTriangle,
  Paperclip,
  SlidersHorizontal,
  BookOpen,
} from "lucide-react";
import { postApi } from "../../../app/http/postApi";
import { postReplyApi } from "../../../app/http/replyApi";
import { tokenStore } from "../../../app/http/tokenStore";
import { boardApi } from "../../../app/http/boardApi";
import { fileApi } from "../../../app/http/fileApi";
import { toPublicAssetUrl } from "../../../shared/utils/publicAssetUrl";
import { COMMUNITY_CATEGORIES, getBoardBadge } from "./communityConfig";
import BadgeTag from "./shared/BadgeTag";
import CommunityContentTextarea from "./shared/CommunityContentTextarea";
import { hasMeaningfulCommunityContent } from "./shared/communityHtml";
import ModerationNoticeBox, {
  normalizeModerationPayload,
} from "./shared/ModerationNoticeBox";

const PAGE_SIZE = 10;

const SORT_OPTIONS = [
  { key: "recent", label: "최신순" },
  { key: "views", label: "조회순" },
  { key: "comments", label: "댓글순" },
];

function fmtDate(dt) {
  if (!dt) return "-";
  const d = new Date(dt);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

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

function WriteModal({ onClose, onSave, saving, errorMessage, moderation }) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [file, setFile] = useState(null);
  const [localError, setLocalError] = useState("");

  const handleSubmit = () => {
    if (!title.trim()) {
      setLocalError("제목을 입력해 주세요.");
      return;
    }
    if (!hasMeaningfulCommunityContent(content)) {
      setLocalError("내용을 입력해 주세요.");
      return;
    }
    setLocalError("");
    onSave({
      title: title.trim(),
      content,
      file,
    });
  };

  return (
    <Overlay onClose={onClose}>
      <div style={{ padding: 28 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 24,
          }}
        >
          <h3 style={{ fontSize: 18, fontWeight: 700, color: "#222", margin: 0 }}>글쓰기</h3>
          <button
            type="button"
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

        {localError ? (
          <div
            style={{
              background: "#FEF2F2",
              border: "1px solid #FECACA",
              borderRadius: 8,
              padding: "10px 14px",
              fontSize: 13,
              color: "#DC2626",
              marginBottom: 12,
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <AlertTriangle size={14} /> {localError}
          </div>
        ) : null}

        {errorMessage ? (
          <div
            style={{
              background: "#FEF2F2",
              border: "1px solid #FECACA",
              borderRadius: 8,
              padding: "10px 14px",
              fontSize: 13,
              color: "#DC2626",
              marginBottom: 12,
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <AlertTriangle size={14} /> {errorMessage}
          </div>
        ) : null}

        <ModerationNoticeBox moderation={moderation} />

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
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="제목을 입력해 주세요"
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
          />
        </div>

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
            내용 <span style={{ color: "#EF4444" }}>*</span>
          </label>
          <CommunityContentTextarea
            value={content}
            onChange={setContent}
            placeholder="내용을 입력해 주세요."
            height={280}
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
            첨부파일 (선택)
          </label>
          <input
            type="file"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            style={{
              width: "100%",
              padding: "9px 10px",
              borderRadius: 8,
              border: "1px solid #ddd",
              fontSize: 13,
              color: "#334155",
              background: "#fff",
            }}
          />
          {file ? (
            <div style={{ marginTop: 8, fontSize: 12, color: "#475569" }}>선택됨: {file.name}</div>
          ) : null}
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button
            type="button"
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
            type="button"
            onClick={handleSubmit}
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
              opacity: saving ? 0.6 : 1,
            }}
          >
            {saving ? "등록 중..." : "등록하기"}
          </button>
        </div>
      </div>
    </Overlay>
  );
}
function DetailModal({
  item,
  loading,
  onClose,
  replies,
  replyLoading,
  replyError,
  replyText,
  onReplyTextChange,
  onReplySubmit,
  replySubmitting,
  attachment,
  attachmentLoading,
  attachmentError,
}) {
  if (!item) return null;

  const badge = getBoardBadge("INFO");

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 5000,
          background: "rgba(0,0,0,0.4)",
          backdropFilter: "blur(4px)",
        }}
      />
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 5001,
          background: "#fff",
          borderRadius: 16,
          width: "90%",
          maxWidth: 760,
          maxHeight: "85vh",
          overflow: "auto",
          boxShadow: "0 24px 60px rgba(0,0,0,0.2)",
        }}
      >
        <div
          style={{
            padding: "24px 28px 0",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
          }}
        >
          <div style={{ flex: 1, paddingRight: 16 }}>
            <BadgeTag badge={badge} />
            <h2
              style={{
                fontSize: 20,
                fontWeight: 800,
                color: "#1E293B",
                margin: "10px 0 0",
                lineHeight: 1.4,
              }}
            >
              {item.postTitle || "제목 없음"}
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              border: "1px solid #E2E8F0",
              background: "#fff",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <X size={16} color="#94A3B8" />
          </button>
        </div>

        <div
          style={{
            padding: "10px 28px 0",
            display: "flex",
            gap: 16,
            flexWrap: "wrap",
            fontSize: 13,
            color: "#94A3B8",
          }}
        >
          <span>작성일 {fmtDate(item.createdAt)}</span>
          <span>조회수 {item.viewCount ?? 0}</span>
          <span>댓글 {replies.length}</span>
        </div>

        <div style={{ margin: "16px 28px", borderBottom: "1px solid #E2E8F0" }} />

        <div style={{ padding: "0 28px 12px" }}>
          {loading ? (
            <div style={{ fontSize: 14, fontWeight: 500, color: "#adb5bd" }}>상세 내용을 불러오는 중입니다.</div>
          ) : (
            <p
              style={{
                fontSize: 15,
                color: "#334155",
                lineHeight: 1.75,
                whiteSpace: "pre-wrap",
                margin: 0,
              }}
            >
              {item.content || "내용이 없습니다."}
            </p>
          )}
        </div>

        <div style={{ padding: "0 28px 14px" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#334155", marginBottom: 8 }}>첨부파일</div>
          {attachmentLoading ? (
        <div style={{ fontSize: 14, fontWeight: 500, color: "#adb5bd" }}>첨부파일 정보를 불러오는 중입니다.</div>
          ) : attachment ? (
            <a
              href={toPublicAssetUrl(attachment.publicPath)}
              target="_blank"
              rel="noreferrer"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                fontSize: 13,
                color: "#7ab33e",
                textDecoration: "none",
                fontWeight: 600,
              }}
            >
              <Paperclip size={13} />
                {attachment.originalName || "첨부파일 다운로드"}
            </a>
          ) : (
            <div style={{ fontSize: 12, color: "#94A3B8" }}>첨부파일이 없습니다.</div>
          )}
          {attachmentError ? (
            <div style={{ marginTop: 6, fontSize: 12, color: "#B91C1C" }}>{attachmentError}</div>
          ) : null}
        </div>

        <div style={{ margin: "0 28px", borderBottom: "1px solid #E2E8F0" }} />

        <div style={{ padding: "16px 28px 24px" }}>
          <h3 style={{ margin: "0 0 10px", fontSize: 15, fontWeight: 700, color: "#1E293B" }}>
            댓글
          </h3>

          <div style={{ marginBottom: 12 }}>
            <textarea
              value={replyText}
              onChange={(e) => onReplyTextChange(e.target.value)}
              placeholder="댓글을 입력해 주세요. (로그인 필요)"
              rows={3}
              style={{
                width: "100%",
                borderRadius: 8,
                border: "1px solid #CBD5E1",
                padding: 10,
                resize: "vertical",
                fontSize: 13,
                color: "#334155",
                fontFamily: "'Noto Sans KR', sans-serif",
              }}
            />
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
              <button
                type="button"
                onClick={onReplySubmit}
                disabled={replySubmitting}
                style={{
                  border: "none",
                  borderRadius: 8,
                  background: "#0F766E",
                  color: "#fff",
                  padding: "8px 14px",
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: replySubmitting ? "not-allowed" : "pointer",
                  opacity: replySubmitting ? 0.6 : 1,
                }}
              >
              {replySubmitting ? "등록 중..." : "댓글 등록"}
              </button>
            </div>
            {replyError ? (
              <div style={{ marginTop: 8, fontSize: 12, color: "#B91C1C" }}>{replyError}</div>
            ) : null}
          </div>

          {replyLoading ? (
            <div style={{ fontSize: 14, fontWeight: 500, color: "#adb5bd" }}>댓글을 불러오는 중입니다.</div>
          ) : replies.length === 0 ? (
            <div style={{ fontSize: 14, fontWeight: 500, color: "#adb5bd" }}>댓글이 없습니다.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {replies.map((reply) => (
                <div
                  key={reply.replyId}
                  style={{
                    border: "1px solid #E2E8F0",
                    borderRadius: 10,
                    padding: "10px 12px",
                    background: "#F8FAFC",
                  }}
                >
                  <div style={{ fontSize: 12, color: "#64748B", marginBottom: 4 }}>
                    {reply.writerEmail || `user#${reply.userId || "-"}`} · {fmtDate(reply.createdAt)}
                  </div>
                  <div style={{ fontSize: 13, color: "#334155", whiteSpace: "pre-wrap" }}>
                    {reply.content}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default function InfoBoard() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [currentPath, setCurrentPath] = useState("/community/info");
  const [sortKey, setSortKey] = useState("recent");
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const sortDdRef = useRef(null);
  const [viewportWidth, setViewportWidth] = useState(() =>
    typeof window === "undefined" ? 1440 : window.innerWidth,
  );

  const [items, setItems] = useState([]);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);

  const [selected, setSelected] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [replies, setReplies] = useState([]);
  const [replyLoading, setReplyLoading] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [replyError, setReplyError] = useState("");
  const [replySubmitting, setReplySubmitting] = useState(false);
  const [attachment, setAttachment] = useState(null);
  const [attachmentLoading, setAttachmentLoading] = useState(false);
  const [attachmentError, setAttachmentError] = useState("");
  const [infoBoardId, setInfoBoardId] = useState(null);
  const [writeModalOpen, setWriteModalOpen] = useState(false);
  const [writeSaving, setWriteSaving] = useState(false);
  const [writeError, setWriteError] = useState("");
  const [writeModeration, setWriteModeration] = useState(null);

  const getErrorMessage = useCallback((err, fallbackMessage) => {
    const body = err?.response?.data;
    return body?.error?.message || body?.message || body?.errorMessage || fallbackMessage;
  }, []);

  const fetchBoardPage = useCallback(async (requestedPage = 1) => {
    setLoading(true);
    setError(null);
    try {
      const apiPage = Math.max(0, (Number(requestedPage) || 1) - 1);
      const d = await postApi.listByBoardType("INFO", {
        page: apiPage,
        size: PAGE_SIZE,
        searchType: "TITLE_CONTENT",
        keyword: search.trim(),
        sortKey,
      });
      const content = Array.isArray(d?.content) ? d.content : [];
      setItems(content);
      setTotalElements(Number(d?.totalElements) || 0);
      setTotalPages(Math.max(1, Number(d?.totalPages) || 1));
    } catch (e) {
      console.error("[InfoBoard] list fetch failed:", e);
      setError("정보게시판 목록을 불러오지 못했습니다.");
      setItems([]);
      setTotalElements(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [search, sortKey]);

  useEffect(() => {
    fetchBoardPage(page);
  }, [page, fetchBoardPage]);

  useEffect(() => {
    let mounted = true;
    boardApi
      .getBoards(true)
      .then((rows) => {
        if (!mounted) return;
        const matched = (Array.isArray(rows) ? rows : []).find(
          (row) => String(row?.boardType || "").toUpperCase() === "INFO",
        );
        setInfoBoardId(Number(matched?.boardId) || null);
      })
      .catch(() => {
        if (!mounted) return;
        setInfoBoardId(null);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const currentPage = Math.min(page, totalPages);
  const pagedItems = items;

  useEffect(() => {
    setPage(1);
  }, [search, sortKey]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const loadReplies = useCallback(async (postId) => {
    setReplyLoading(true);
    setReplyError("");
    try {
      const d = await postReplyApi.list(postId, 0, 200);
      const list = Array.isArray(d?.content) ? d.content : [];
      setReplies(list);
    } catch (err) {
      console.error("[InfoBoard] reply fetch failed:", err);
      setReplies([]);
      setReplyError("댓글을 불러오지 못했습니다.");
    } finally {
      setReplyLoading(false);
    }
  }, []);

  const loadAttachment = useCallback(async (postId) => {
    setAttachmentLoading(true);
    setAttachmentError("");
    try {
      const data = await fileApi.getByPostId(postId);
      setAttachment(data || null);
    } catch (err) {
      const status = err?.response?.status;
      if (status === 404) {
        setAttachment(null);
        setAttachmentError("");
      } else {
        setAttachment(null);
      setAttachmentError("첨부파일을 불러오지 못했습니다.");
      }
    } finally {
      setAttachmentLoading(false);
    }
  }, []);

  const openDetail = useCallback(async (item) => {
    setSelected(item);
    setDetailLoading(true);
    setReplyText("");
    setReplyError("");
    setAttachment(null);
    setAttachmentError("");
    try {
      const detail = await postApi.get(item.postId);
      setSelected(detail);
      setItems((prev) =>
        prev.map((row) => (row.postId === detail.postId ? { ...row, ...detail } : row)),
      );
      await Promise.all([loadReplies(detail.postId), loadAttachment(detail.postId)]);
    } catch (err) {
      console.error("[InfoBoard] detail fetch failed:", err);
      setReplyError("상세 정보를 불러오지 못했습니다.");
    } finally {
      setDetailLoading(false);
    }
  }, [loadReplies, loadAttachment]);

  const closeDetail = () => {
    setSelected(null);
    setReplies([]);
    setReplyText("");
    setReplyError("");
    setAttachment(null);
    setAttachmentError("");
    setAttachmentLoading(false);
  };

  const submitReply = async () => {
    if (!selected?.postId) return;
    if (!tokenStore.getAccess()) {
      setReplyError("댓글 작성은 로그인이 필요합니다.");
      return;
    }
    const content = replyText.trim();
    if (!content) {
      setReplyError("댓글 내용을 입력해 주세요.");
      return;
    }

    setReplySubmitting(true);
    setReplyError("");
    try {
      await postReplyApi.create(selected.postId, content);
      setReplyText("");
      await loadReplies(selected.postId);
    } catch (err) {
      console.error("[InfoBoard] reply create failed:", err);
      setReplyError("댓글 등록에 실패했습니다.");
    } finally {
      setReplySubmitting(false);
    }
  };

  const submitPost = async ({ title, content, file }) => {
    if (!tokenStore.getAccess()) {
      setWriteError("글쓰기는 로그인이 필요합니다.");
      return;
    }
    if (!infoBoardId) {
      setWriteError("게시판 정보를 찾을 수 없습니다. 잠시 후 다시 시도해 주세요.");
      return;
    }

    setWriteSaving(true);
    setWriteError("");
    setWriteModeration(null);
    try {
      const created = await postApi.create({
        boardId: infoBoardId,
        postTitle: title,
        content,
      });
      const createdPostId = Number(created?.postId ?? created);
      if (file && createdPostId) {
        await fileApi.upload(file, "POST", createdPostId);
      }
      const normalizedModeration = normalizeModerationPayload(created?.moderation);
      console.debug("[InfoBoard] moderation payload:", {
        decision: normalizedModeration?.decision ?? null,
        message: normalizedModeration?.message ?? null,
        reason: normalizedModeration?.reason ?? null,
      });
      setWriteModeration(normalizedModeration);
      setWriteModalOpen(false);
      if (page === 1) {
        await fetchBoardPage(1);
      } else {
        setPage(1);
      }
    } catch (err) {
      console.error("[InfoBoard] create failed:", err);
      console.debug("[InfoBoard] moderation error payload:", {
        decision: null,
        message: err?.response?.data?.error?.message ?? err?.response?.data?.message ?? null,
        reason: err?.response?.data?.error?.reason ?? err?.response?.data?.reason ?? null,
      });
      setWriteError(getErrorMessage(err, "글 등록에 실패했습니다."));
    } finally {
      setWriteSaving(false);
    }
  };

  const badge = getBoardBadge("INFO");
  const currentSortLabel =
    SORT_OPTIONS.find((option) => option.key === sortKey)?.label || "최신순";

  const isMobile = viewportWidth < 768;
  const isTablet = viewportWidth >= 768 && viewportWidth < 1024;

  useEffect(() => {
    const h = (e) => {
      if (sortDdRef.current && !sortDdRef.current.contains(e.target)) setSortMenuOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  useEffect(() => {
    const syncViewport = () => setViewportWidth(window.innerWidth);
    syncViewport();
    window.addEventListener("resize", syncViewport);
    return () => window.removeEventListener("resize", syncViewport);
  }, []);

  return (
    <>
      <PageHeader
        title="정보게시판"
        subtitle="행사와 반려생활 관련 주요 정보를 확인하는 게시판입니다."
        icon={<BookOpen size={42} color="#90C450" strokeWidth={1.6} />}
        titleStyle={{ fontSize: 46, lineHeight: "66px", letterSpacing: "-1px" }}
        subtitleStyle={{ fontSize: 20 }}
        categories={COMMUNITY_CATEGORIES}
        currentPath={currentPath}
        onNavigate={setCurrentPath}
      />

      <style>{`@keyframes spin{to{transform:rotate(360deg)}} .board-search-input::placeholder{color:#9ca3af;font-size:13px;font-weight:500;}`}</style>
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
          <span style={{ fontSize: 14, fontWeight: 600, color: "#555" }}>총 {totalElements}개</span>

          <div style={{ display: "flex", alignItems: "center", gap: 8, width: isMobile ? "100%" : "auto", height: isMobile ? "auto" : 48, flexWrap: isMobile ? "wrap" : "nowrap", rowGap: isMobile ? 8 : 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 0, background: isMobile ? "transparent" : "#fff", border: isMobile ? "none" : "1px solid #e2e5ea", borderRadius: 12, height: isMobile ? "auto" : 48, width: isMobile ? "100%" : "auto", flexWrap: isMobile ? "wrap" : "nowrap", padding: 0, rowGap: isMobile ? 8 : 0 }}>
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
                  placeholder="정보게시판 글 검색"
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
              type="button"
              onClick={() => navigate("/community/info/write")}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
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
                flexShrink: 0,
                width: isMobile ? "100%" : "auto",
                height: isMobile ? 40 : 48,
              }}
            >
              <Plus size={14} strokeWidth={2.5} /> 글쓰기
            </button>
          </div>
        </div>

        {loading && (
          <PageLoading message="목록을 불러오는 중입니다" />
        )}

        {!loading && error && (
          <EmptyState type="error" message="게시글을 불러오지 못했습니다" description="네트워크 연결을 확인하고 다시 시도해 주세요." />
        )}

        {!loading && !error && (
          <>
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
              {pagedItems.map((item, index) => {
                const rowNumber = totalElements - ((currentPage - 1) * PAGE_SIZE) - index;
                const authorLabel = item?.author || item?.nickname || item?.userName || "관리자";
                return (
                  <div
                    key={item.postId}
                    onClick={() => navigate(`/community/info/${item.postId}`)}
                    style={{
                      display: "flex",
                      flexDirection: isMobile ? "column" : "row",
                      alignItems: isMobile ? "stretch" : "center",
                      gap: isMobile ? 8 : 0,
                      padding: isMobile ? "14px 12px" : "18px 16px",
                      borderBottom: "1px solid #f0f0f0",
                      cursor: "pointer",
                      transition: "background 0.15s",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#f9f9f9")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    {!isMobile && (
                      <span style={{ width: 60, textAlign: "center", fontSize: 14, color: "#9ca3af", flexShrink: 0 }}>{rowNumber}</span>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", minWidth: 0 }}>
                        <BadgeTag badge={badge} style={isMobile ? { ...badge.style, padding: "4px 10px", fontSize: 11 } : undefined} />
                        <span style={{ flex: 1, minWidth: 0, fontSize: isMobile ? 14 : 15, color: "#111827", fontWeight: 500, overflow: "hidden", textOverflow: isMobile ? "clip" : "ellipsis", whiteSpace: isMobile ? "normal" : "nowrap", wordBreak: "keep-all", overflowWrap: "break-word" }}>
                          {item.postTitle}
                        </span>
                        {Number(item.commentCount ?? 0) > 0 && (
                          <span style={{ fontSize: 12, color: "#9ca3af", fontWeight: 600, flexShrink: 0 }}>
                            ({Number(item.commentCount ?? 0)})
                          </span>
                        )}
                      </div>
                      {isMobile && (
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginTop: 6, fontSize: 13, color: "#6b7280" }}>
                          <span>{authorLabel}</span>
                          <span style={{ color: "#cbd5e1" }}>·</span>
                          <span style={{ color: "#9ca3af", whiteSpace: "nowrap" }}>{fmtDate(item.createdAt)}</span>
                          <span style={{ color: "#cbd5e1" }}>·</span>
                          <span style={{ color: "#9ca3af" }}>조회 {item.viewCount ?? 0}</span>
                        </div>
                      )}
                    </div>
                    {!isMobile && <span style={{ width: 100, textAlign: "center", fontSize: 14, color: "#6b7280", flexShrink: 0 }}>{authorLabel}</span>}
                    {!isMobile && (
                      <span style={{ width: 100, textAlign: "center", fontSize: 14, color: "#9ca3af", whiteSpace: "nowrap", flexShrink: 0 }}>
                        {fmtDate(item.createdAt)}
                      </span>
                    )}
                    {!isMobile && <span style={{ width: 80, textAlign: "center", fontSize: 13, color: "#9ca3af", flexShrink: 0 }}>{item.viewCount ?? 0}</span>}
                  </div>
                );
              })}

              {pagedItems.length === 0 && (
                <div style={{ textAlign: "center", padding: "60px 0", color: "#999", fontSize: "14px" }}>
                  {search.trim() ? "검색 결과가 없습니다." : "게시글이 없습니다."}
                </div>
              )}
            </div>

            <CommunityPagination
              currentPage={currentPage}
              totalPages={totalPages}
              onChange={setPage}
            />
          </>
        )}
      </main>

      <DetailModal
        item={selected}
        loading={detailLoading}
        onClose={closeDetail}
        replies={replies}
        replyLoading={replyLoading}
        replyError={replyError}
        replyText={replyText}
        onReplyTextChange={setReplyText}
        onReplySubmit={submitReply}
        replySubmitting={replySubmitting}
        attachment={attachment}
        attachmentLoading={attachmentLoading}
        attachmentError={attachmentError}
      />
      {writeModalOpen ? (
        <WriteModal
          onClose={() => {
            setWriteModalOpen(false);
            setWriteError("");
            setWriteModeration(null);
          }}
          onSave={submitPost}
          saving={writeSaving}
          errorMessage={writeError}
          moderation={writeModeration}
        />
      ) : null}

    </>
  );
}
