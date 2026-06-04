import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, CheckCircle, Loader2, Paperclip } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { boardApi } from "../../../app/http/boardApi";
import { fileApi } from "../../../app/http/fileApi";
import { postApi } from "../../../app/http/postApi";
import { tokenStore } from "../../../app/http/tokenStore";
import CommunityContentTextarea from "./shared/CommunityContentTextarea";
import { hasMeaningfulCommunityContent } from "./shared/communityHtml";
import CommunityWriteLayout from "./shared/CommunityWriteLayout";
import ModerationNoticeBox, {
  buildModerationBlockFromError,
  normalizeModerationPayload,
} from "./shared/ModerationNoticeBox";

const DRAFT_KEY_PREFIX = "draft_community_board_";

function ErrorBox({ message }) {
  if (!message) return null;
  return (
    <div
      style={{
        marginBottom: 18,
        background: "#FEF2F2",
        border: "1px solid #FECACA",
        borderRadius: 10,
        padding: "12px 14px",
        fontSize: 13,
        color: "#B91C1C",
        fontWeight: 700,
        display: "flex",
        alignItems: "center",
        gap: 8,
      }}
    >
      <AlertTriangle size={14} />
      {message}
    </div>
  );
}

function InProgressBox() {
  return (
    <div
      style={{
        marginBottom: 18,
        background: "#E6F7F2",
        border: "1px solid #CCF0E4",
        borderRadius: 10,
        padding: "12px 14px",
        fontSize: 13,
        color: "#1E40AF",
        fontWeight: 700,
        display: "flex",
        alignItems: "center",
        gap: 8,
      }}
    >
      <Loader2 size={14} style={{ flexShrink: 0, animation: "spin 1s linear infinite" }} />
      <span style={{ whiteSpace: "pre-line" }}>
        {"깨끗한 커뮤니티 조성을 위해 AI가 게시글 콘텐츠를 검토 중입니다.\n잠시만 기다려주세요"}
      </span>
    </div>
  );
}

function SuccessBox({ message }) {
  if (!message) return null;
  return (
    <div
      style={{
        marginBottom: 18,
        background: "#F0FDF4",
        border: "1px solid #BBF7D0",
        borderRadius: 10,
        padding: "12px 14px",
        fontSize: 13,
        color: "#166534",
        fontWeight: 700,
        display: "flex",
        alignItems: "center",
        gap: 8,
      }}
    >
      <CheckCircle size={14} />
      {message}
    </div>
  );
}

function getDraftKey(path) {
  return `${DRAFT_KEY_PREFIX}${(path || "").replace(/\//g, "_")}`;
}

function getErrorMessage(err, fallbackMessage) {
  const body = err?.response?.data;
  return body?.error?.message || body?.message || body?.errorMessage || fallbackMessage;
}

export default function CommunityBoardWritePage({
  pageTitle,
  pageSubtitle,
  currentPath,
  badgeType,
  boardType,
}) {
  const navigate = useNavigate();
  const isMountedRef = useRef(true);
  const [viewportWidth, setViewportWidth] = useState(() =>
    typeof window === "undefined" ? 1440 : window.innerWidth,
  );
  const [boardId, setBoardId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [error, setError] = useState("");
  const [moderation, setModeration] = useState(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [file, setFile] = useState(null);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const syncViewport = () => setViewportWidth(window.innerWidth);
    syncViewport();
    window.addEventListener("resize", syncViewport);
    return () => window.removeEventListener("resize", syncViewport);
  }, []);

  useEffect(() => {
    let mounted = true;

    if (!tokenStore.getAccess()) {
      navigate("/auth/login", { state: { from: `${currentPath}/write` } });
      return () => {
        mounted = false;
      };
    }

    const run = async () => {
      setLoading(true);
      setError("");
      try {
        const rows = await boardApi.getBoards(true);
        if (!mounted) return;
        const matched = (Array.isArray(rows) ? rows : []).find(
          (row) => String(row?.boardType || "").toUpperCase() === String(boardType || "").toUpperCase(),
        );
        const nextBoardId = Number(matched?.boardId) || null;
        setBoardId(nextBoardId);
        if (!nextBoardId) {
          setError("게시판 정보를 찾을 수 없습니다. 잠시 후 다시 시도해 주세요.");
        }
      } catch (err) {
        console.error("[CommunityBoardWritePage] board load failed:", err);
        if (!mounted) return;
        setBoardId(null);
        setError("게시판 정보를 불러오지 못했습니다.");
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    run();

    return () => {
      mounted = false;
    };
  }, [boardType, currentPath, navigate]);

  const localError = useMemo(() => {
    if (!title.trim()) return "제목을 입력해 주세요.";
    if (!hasMeaningfulCommunityContent(content)) return "내용을 입력해 주세요.";
    return "";
  }, [content, title]);

  const isMobile = viewportWidth < 768;
  const isTablet = viewportWidth >= 768 && viewportWidth < 1024;
  const isFormLocked = saving || Boolean(successMessage);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (localError) {
      setError(localError);
      return;
    }
    if (!tokenStore.getAccess()) {
      navigate("/auth/login", { state: { from: `${currentPath}/write` } });
      return;
    }
    if (!boardId) {
      setError("게시판 정보를 찾을 수 없습니다. 잠시 후 다시 시도해 주세요.");
      return;
    }

    const draftKey = getDraftKey(currentPath);
    try {
      localStorage.setItem(
        draftKey,
        JSON.stringify({ title: title.trim(), content, boardId, fileName: file?.name ?? null }),
      );
    } catch (_) {}

    setSaving(true);
    setError("");
    setSuccessMessage("");
    setModeration(null);

    try {
      const created = await postApi.create({
        boardId,
        postTitle: title.trim(),
        content,
      });

      if (!isMountedRef.current) return;

      const createdPostId = Number(created?.postId ?? created);
      if (file && createdPostId) {
        await fileApi.upload(file, "POST", createdPostId);
      }
      if (!isMountedRef.current) return;

      try {
        localStorage.removeItem(draftKey);
      } catch (_) {}

      const normalizedModeration = normalizeModerationPayload(created?.moderation);
      console.debug("[CommunityBoardWritePage] moderation payload:", {
        decision: normalizedModeration?.decision ?? null,
        message: normalizedModeration?.message ?? null,
        reason: normalizedModeration?.reason ?? null,
      });
      setModeration(normalizedModeration);
      setSuccessMessage("등록 완료되었습니다.");
      setSaving(false);
    } catch (err) {
      console.error("[CommunityBoardWritePage] create failed:", err);
      if (!isMountedRef.current) return;

      // 검열 차단이면 일반 에러 대신 전용 안내 카드로 보여준다.
      const blockPayload = buildModerationBlockFromError(err);
      if (blockPayload) {
        setModeration(blockPayload);
        setError("");
      } else {
        setError(getErrorMessage(err, "글 등록에 실패했습니다."));
      }
      setSaving(false);
    }
  };

  return (
    <CommunityWriteLayout
      pageTitle={pageTitle}
      pageSubtitle={pageSubtitle}
      currentPath={currentPath}
      badgeType={badgeType}
      formTitle={`${pageTitle} 글쓰기`}
      formDescription="제목과 본문을 입력하고, 필요하면 첨부 파일도 함께 등록할 수 있습니다."
      footer={
        <>
          <button
            type="button"
            onClick={() => navigate(currentPath)}
            style={{
              height: 44,
              padding: "0 18px",
              borderRadius: 10,
              border: "1px solid #cbd5e1",
              background: "#fff",
              fontSize: 14,
              fontWeight: 700,
              color: "#475569",
              cursor: "pointer",
              width: isMobile ? "100%" : "auto",
            }}
          >
            취소
          </button>
          <button
            type="submit"
            form="community-board-write-form"
            disabled={isFormLocked || loading}
            style={{
              height: 44,
              padding: "0 18px",
              borderRadius: 10,
              border: "none",
              background: "#7ab33e",
              fontSize: 14,
              fontWeight: 800,
              color: "#fff",
              cursor: isFormLocked || loading ? "not-allowed" : "pointer",
              opacity: isFormLocked || loading ? 0.6 : 1,
              width: isMobile ? "100%" : "auto",
            }}
          >
            {saving ? "등록 중..." : "등록하기"}
          </button>
        </>
      }
    >
      <form id="community-board-write-form" onSubmit={handleSubmit}>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        <ErrorBox message={error} />
        {saving && !successMessage ? <InProgressBox /> : null}
        <SuccessBox message={successMessage} />
        <ModerationNoticeBox moderation={moderation} />

        {loading ? (
          <div style={{ fontSize: 14, color: "#64748b" }}>게시판 정보를 확인하는 중입니다.</div>
        ) : (
          <div
            style={{
              display: "grid",
              gap: isMobile ? 14 : isTablet ? 16 : 18,
              position: "relative",
              pointerEvents: isFormLocked ? "none" : undefined,
              opacity: isFormLocked ? 0.75 : 1,
            }}
          >
            <label style={{ display: "grid", gap: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#334155" }}>제목</span>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="제목을 입력해 주세요"
                disabled={isFormLocked}
                readOnly={isFormLocked}
                style={{
                  height: 46,
                  borderRadius: 10,
                  border: "1px solid #cbd5e1",
                  padding: isMobile ? "0 12px" : "0 14px",
                  fontSize: 14,
                  color: "#0f172a",
                  background: isFormLocked ? "#f1f5f9" : "#fff",
                }}
              />
            </label>

            <label style={{ display: "grid", gap: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#334155" }}>내용</span>
              <CommunityContentTextarea
                value={content}
                onChange={setContent}
                placeholder="내용을 입력해 주세요."
                height={isMobile ? 260 : isTablet ? 300 : 340}
              />
            </label>

            <label
              style={{
                display: "block",
                cursor: isFormLocked ? "not-allowed" : "pointer",
                border: "1px solid #e2e8f0",
                borderRadius: 14,
                padding: isMobile ? "16px" : isTablet ? "18px" : "18px 20px",
                background: isFormLocked ? "#f1f5f9" : "#f8fafc",
              }}
            >
              <input
                type="file"
                disabled={isFormLocked}
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                style={{ position: "absolute", width: 0, height: 0, opacity: 0, overflow: "hidden" }}
              />
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, fontSize: 15, fontWeight: 800, color: "#0f172a" }}>
                <Paperclip size={16} />
                첨부파일
              </div>
              <div style={{ fontSize: 13, color: "#94a3b8" }}>
                {file ? `선택한 파일: ${file.name}` : "클릭하여 파일을 선택하세요. (선택 사항)"}
              </div>
            </label>
          </div>
        )}
      </form>
    </CommunityWriteLayout>
  );
}
