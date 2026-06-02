import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, CheckCircle, Loader2, Paperclip } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { postApi } from "../../../app/http/postApi";
import { fileApi } from "../../../app/http/fileApi";
import { tokenStore } from "../../../app/http/tokenStore";
import CommunityContentTextarea from "./shared/CommunityContentTextarea";
import { hasMeaningfulCommunityContent } from "./shared/communityHtml";
import CommunityWriteLayout from "./shared/CommunityWriteLayout";
import ModerationNoticeBox, {
  normalizeModerationPayload,
} from "./shared/ModerationNoticeBox";

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
        background: "#EFF6FF",
        border: "1px solid #BFDBFE",
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
      깨끗한 커뮤니티 조성을 위해 AI가 게시글 콘텐츠를 검토 중입니다.
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

function getErrorMessage(err, fallbackMessage) {
  const body = err?.response?.data;
  return body?.error?.message || body?.message || body?.errorMessage || fallbackMessage;
}

export default function CommunityBoardEditPage({
  pageTitle,
  pageSubtitle,
  currentPath,
  badgeType,
}) {
  const navigate = useNavigate();
  const { postId } = useParams();
  const numericPostId = Number(postId);
  const isMountedRef = useRef(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [error, setError] = useState("");
  const [moderation, setModeration] = useState(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [initialTitle, setInitialTitle] = useState("");
  const [initialContent, setInitialContent] = useState("");
  const [file, setFile] = useState(null);
  const [existingAttachment, setExistingAttachment] = useState(null);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!tokenStore.getAccess()) {
      navigate("/auth/login", { state: { from: `${currentPath}/${postId}/edit` } });
      return;
    }

    let mounted = true;
    const run = async () => {
      setLoading(true);
      setError("");
      try {
        const detail = await postApi.get(numericPostId);
        if (!mounted) return;
        const loadedTitle = detail.postTitle || "";
        const loadedContent = detail.content || "";
        setTitle(loadedTitle);
        setContent(loadedContent);
        setInitialTitle(loadedTitle);
        setInitialContent(loadedContent);

        try {
          const att = await fileApi.getByPostId(numericPostId);
          if (mounted && att?.fileId) setExistingAttachment(att);
        } catch (_) {}
      } catch (err) {
        console.error("[CommunityBoardEditPage] load failed:", err);
        if (mounted) setError("게시글을 불러오지 못했습니다.");
      } finally {
        if (mounted) setLoading(false);
      }
    };
    run();
    return () => {
      mounted = false;
    };
  }, [currentPath, navigate, numericPostId, postId]);

  const localError = useMemo(() => {
    if (!title.trim()) return "제목을 입력해 주세요.";
    if (!hasMeaningfulCommunityContent(content)) return "내용을 입력해 주세요.";
    return "";
  }, [content, title]);
  const isFormLocked = saving || Boolean(successMessage);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (localError) {
      setError(localError);
      return;
    }
    if (!tokenStore.getAccess()) {
      navigate("/auth/login", { state: { from: `${currentPath}/${postId}/edit` } });
      return;
    }

    setSaving(true);
    setError("");
    setSuccessMessage("");
    setModeration(null);

    try {
      const nextTitle = title.trim();
      const hasPostContentChange =
        nextTitle !== String(initialTitle || "").trim() || content !== String(initialContent || "");
      let updateResult = null;

      // 파일만 교체하는 경우, 본문 수정 API(모더레이션 포함)를 건너뛰고 첨부 업로드만 수행한다.
      if (hasPostContentChange) {
        updateResult = await postApi.update(numericPostId, {
          postTitle: nextTitle,
          content,
        });
      }

      if (!isMountedRef.current) return;

      if (file) {
        if (existingAttachment?.fileId) {
          try {
            await fileApi.delete(existingAttachment.fileId);
          } catch (_) {
            // 기존 첨부 삭제 실패는 신규 업로드를 막지 않는다.
          }
        }
        await fileApi.upload(file, "POST", numericPostId);
        setExistingAttachment({
          fileId: null,
          originalName: file.name,
        });
      }
      if (hasPostContentChange) {
        setInitialTitle(nextTitle);
        setInitialContent(content);
      }
      if (!isMountedRef.current) return;

      const normalizedModeration = normalizeModerationPayload(updateResult?.moderation);
      console.debug("[CommunityBoardEditPage] moderation payload:", {
        decision: normalizedModeration?.decision ?? null,
        message: normalizedModeration?.message ?? null,
        reason: normalizedModeration?.reason ?? null,
      });
      setModeration(normalizedModeration);
      setSuccessMessage("수정 완료되었습니다.");
      setSaving(false);
    } catch (err) {
      console.error("[CommunityBoardEditPage] update failed:", err);
      if (!isMountedRef.current) return;
      console.debug("[CommunityBoardEditPage] moderation error payload:", {
        decision: null,
        message: err?.response?.data?.error?.message ?? err?.response?.data?.message ?? null,
        reason: err?.response?.data?.error?.reason ?? err?.response?.data?.reason ?? null,
      });
      setError(getErrorMessage(err, "글 수정에 실패했습니다."));
      setSaving(false);
    }
  };

  return (
    <CommunityWriteLayout
      pageTitle={pageTitle}
      pageSubtitle={pageSubtitle}
      currentPath={currentPath}
      badgeType={badgeType}
      formTitle={`${pageTitle} 글 수정`}
      formDescription="제목과 본문을 수정하고, 필요하면 첨부 파일을 교체할 수 있습니다."
      footer={
        <>
          <button
            type="button"
            onClick={() => navigate(`${currentPath}/${postId}`)}
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
            }}
          >
            취소
          </button>
          <button
            type="submit"
            form="community-board-edit-form"
            disabled={isFormLocked || loading}
            style={{
              height: 44,
              padding: "0 18px",
              borderRadius: 10,
              border: "none",
              background: "#1d4ed8",
              fontSize: 14,
              fontWeight: 800,
              color: "#fff",
              cursor: isFormLocked || loading ? "not-allowed" : "pointer",
              opacity: isFormLocked || loading ? 0.6 : 1,
            }}
          >
            {saving ? "수정 중..." : "수정하기"}
          </button>
        </>
      }
    >
      <form id="community-board-edit-form" onSubmit={handleSubmit}>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        <ErrorBox message={error} />
        {saving && !successMessage ? <InProgressBox /> : null}
        <SuccessBox message={successMessage} />
        <ModerationNoticeBox moderation={moderation} />

        {loading ? (
          <div style={{ fontSize: 14, color: "#64748b" }}>게시글 정보를 불러오는 중입니다.</div>
        ) : (
          <div
            style={{
              display: "grid",
              gap: 18,
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
                  padding: "0 14px",
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
                height={340}
              />
            </label>

            <label
              style={{
                display: "block",
                cursor: isFormLocked ? "not-allowed" : "pointer",
                border: "1px solid #e2e8f0",
                borderRadius: 14,
                padding: "18px 20px",
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
                {file
                  ? `새 파일: ${file.name}`
                  : existingAttachment
                    ? `기존 파일: ${existingAttachment.originalName || "첨부파일"}`
                    : "클릭하여 파일을 선택하세요. (선택 사항)"}
              </div>
            </label>
          </div>
        )}
      </form>
    </CommunityWriteLayout>
  );
}
