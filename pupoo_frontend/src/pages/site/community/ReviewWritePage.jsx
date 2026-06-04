import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, CheckCircle, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { eventApi } from "../../../app/http/eventApi";
import { reviewApi } from "../../../app/http/reviewApi";
import { tokenStore } from "../../../app/http/tokenStore";
import { normalizeEventTitle } from "../../../shared/utils/eventDisplay";
import CommunityContentTextarea from "./shared/CommunityContentTextarea";
import { hasMeaningfulCommunityContent } from "./shared/communityHtml";
import CommunityWriteLayout from "./shared/CommunityWriteLayout";
import ModerationNoticeBox, {
  buildModerationBlockFromError,
} from "./shared/ModerationNoticeBox";

const DRAFT_KEY_REVIEW = "draft_community_review";

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

export default function ReviewWritePage() {
  const navigate = useNavigate();
  const isMountedRef = useRef(true);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [error, setError] = useState("");
  const [moderation, setModeration] = useState(null);
  const [form, setForm] = useState({
    eventId: "",
    rating: "5",
    title: "",
    content: "",
  });

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    if (!tokenStore.getAccess()) {
      navigate("/auth/login", { state: { from: "/community/review/write" } });
      return () => {
        mounted = false;
      };
    }

    const run = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await eventApi.getClosedAnalytics();
        const rows = Array.isArray(res?.data?.data) ? res.data.data : [];
        if (!mounted) return;
        setEvents(
          rows.map((event) => ({
            eventId: String(event?.eventId ?? ""),
            eventName: normalizeEventTitle(event?.eventName, event),
          })),
        );
      } catch (err) {
        console.error("[ReviewWritePage] events load failed:", err);
        if (!mounted) return;
        setEvents([]);
        setError("후기를 작성할 행사 목록을 불러오지 못했습니다.");
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
  }, [navigate]);

  const localError = useMemo(() => {
    if (!form.eventId) return "행사를 선택해 주세요.";
    if (!String(form.title || "").trim()) return "제목을 입력해 주세요.";
    if (!hasMeaningfulCommunityContent(form.content)) return "내용을 입력해 주세요.";
    return "";
  }, [form]);
  const isFormLocked = saving || Boolean(successMessage);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (localError) {
      setError(localError);
      return;
    }
    if (!tokenStore.getAccess()) {
      navigate("/auth/login", { state: { from: "/community/review/write" } });
      return;
    }

    try {
      localStorage.setItem(DRAFT_KEY_REVIEW, JSON.stringify({
        eventId: form.eventId,
        rating: form.rating,
        title: String(form.title || "").trim(),
        content: form.content,
      }));
    } catch (_) {}

    setSaving(true);
    setError("");
    setSuccessMessage("");
    setModeration(null);

    try {
      const created = await reviewApi.create({
        eventId: Number(form.eventId),
        rating: Number(form.rating),
        reviewTitle: String(form.title || "").trim(),
        content: form.content,
      });

      if (!isMountedRef.current) return;

      try {
        localStorage.removeItem(DRAFT_KEY_REVIEW);
      } catch (_) {}

      setSuccessMessage("등록 완료되었습니다.");
      setSaving(false);
    } catch (err) {
      console.error("[ReviewWritePage] create failed:", err);
      if (!isMountedRef.current) return;
      if (err?.response?.status === 401) {
        navigate("/auth/login", { state: { from: "/community/review/write" } });
        return;
      }
      const blockPayload = buildModerationBlockFromError(err);
      if (blockPayload) {
        setModeration(blockPayload);
        setError("");
      } else {
        setError(err?.response?.data?.message || err?.response?.data?.error?.message || "후기 등록에 실패했습니다.");
      }
      setSaving(false);
    }
  };

  return (
    <CommunityWriteLayout
      pageTitle="행사후기"
      pageSubtitle="행사에 참여한 사용자의 후기와 별점을 확인하세요"
      currentPath="/community/review"
      badgeType="REVIEW"
      formTitle="행사후기 작성"
      formDescription="참여한 행사에 대한 경험과 만족도를 자유롭게 작성해 주세요."
      footer={
        <>
          <button
            type="button"
            onClick={() => navigate("/community/review")}
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
            form="community-review-write-form"
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
            }}
          >
            {saving ? "등록 중..." : "등록하기"}
          </button>
        </>
      }
    >
      <form id="community-review-write-form" onSubmit={handleSubmit}>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        <ErrorBox message={error} />
        {saving && !successMessage ? <InProgressBox /> : null}
        <SuccessBox message={successMessage} />
        <ModerationNoticeBox moderation={moderation} />

        {loading ? (
          <div style={{ fontSize: 14, fontWeight: 500, color: "#adb5bd" }}>행사 목록을 불러오는 중입니다.</div>
        ) : (
          <div
            style={{
              display: "grid",
              gap: 18,
              pointerEvents: isFormLocked ? "none" : undefined,
              opacity: isFormLocked ? 0.75 : 1,
            }}
          >
            <div style={{ display: "grid", gridTemplateColumns: "1fr 180px", gap: 14 }}>
              <label style={{ display: "grid", gap: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#334155" }}>행사 선택</span>
                <select
                  value={form.eventId}
                  onChange={(event) => handleChange("eventId", event.target.value)}
                  disabled={isFormLocked}
                  style={{
                    height: 46,
                    borderRadius: 10,
                    border: "1px solid #cbd5e1",
                    padding: "0 14px",
                    fontSize: 14,
                    color: "#0f172a",
                    background: isFormLocked ? "#f1f5f9" : "#fff",
                  }}
                >
                  <option value="">행사를 선택해 주세요</option>
                  {events.map((event) => (
                    <option key={event.eventId} value={event.eventId}>
                      {event.eventName}
                    </option>
                  ))}
                </select>
              </label>

              <label style={{ display: "grid", gap: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#334155" }}>별점</span>
                <select
                  value={form.rating}
                  onChange={(event) => handleChange("rating", event.target.value)}
                  disabled={isFormLocked}
                  style={{
                    height: 46,
                    borderRadius: 10,
                    border: "1px solid #cbd5e1",
                    padding: "0 14px",
                    fontSize: 14,
                    color: "#0f172a",
                    background: isFormLocked ? "#f1f5f9" : "#fff",
                  }}
                >
                  {[5, 4, 3, 2, 1].map((value) => (
                    <option key={value} value={String(value)}>
                      {`${value}점`}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label style={{ display: "grid", gap: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#334155" }}>제목</span>
              <input
                value={form.title}
                onChange={(event) => handleChange("title", event.target.value)}
                placeholder="후기 제목을 입력해 주세요"
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
                value={form.content}
                onChange={(value) => handleChange("content", value)}
                placeholder="행사 경험과 만족도를 자유롭게 작성해 주세요."
                height={320}
              />
            </label>
          </div>
        )}
      </form>
    </CommunityWriteLayout>
  );
}
