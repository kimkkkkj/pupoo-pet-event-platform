import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, CheckCircle, Loader2 } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { reviewApi } from "../../../app/http/reviewApi";
import { tokenStore } from "../../../app/http/tokenStore";
import CommunityContentTextarea from "./shared/CommunityContentTextarea";
import { hasMeaningfulCommunityContent } from "./shared/communityHtml";
import CommunityWriteLayout from "./shared/CommunityWriteLayout";

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

export default function ReviewEditPage() {
  const navigate = useNavigate();
  const { reviewId } = useParams();
  const numericReviewId = Number(reviewId);
  const isMountedRef = useRef(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [error, setError] = useState("");
  const [eventName, setEventName] = useState("");
  const [form, setForm] = useState({
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
    if (!tokenStore.getAccess()) {
      navigate("/auth/login", { state: { from: `/community/review/${reviewId}/edit` } });
      return;
    }

    let mounted = true;
    const run = async () => {
      setLoading(true);
      setError("");
      try {
        const detail = await reviewApi.get(numericReviewId);
        if (!mounted) return;
        setForm({
          rating: String(detail.rating || 5),
          title: detail.reviewTitle || "",
          content: detail.content || "",
        });
        setEventName(detail.eventName || "");
      } catch (err) {
        console.error("[ReviewEditPage] load failed:", err);
        if (mounted) setError("후기를 불러오지 못했습니다.");
      } finally {
        if (mounted) setLoading(false);
      }
    };
    run();
    return () => {
      mounted = false;
    };
  }, [navigate, numericReviewId, reviewId]);

  const localError = useMemo(() => {
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
      navigate("/auth/login", { state: { from: `/community/review/${reviewId}/edit` } });
      return;
    }

    setSaving(true);
    setError("");
    setSuccessMessage("");

    try {
      await reviewApi.update(numericReviewId, {
        rating: Number(form.rating),
        reviewTitle: String(form.title || "").trim(),
        content: form.content,
      });

      if (!isMountedRef.current) return;

      setSuccessMessage("수정 완료되었습니다.");
      setSaving(false);
    } catch (err) {
      console.error("[ReviewEditPage] update failed:", err);
      if (!isMountedRef.current) return;
      if (err?.response?.status === 401) {
        navigate("/auth/login", { state: { from: `/community/review/${reviewId}/edit` } });
        return;
      }
      setError(err?.response?.data?.message || err?.response?.data?.error?.message || "후기 수정에 실패했습니다.");
      setSaving(false);
    }
  };

  return (
    <CommunityWriteLayout
      pageTitle="행사후기"
      pageSubtitle="행사에 참여한 사용자의 후기와 별점을 확인하세요"
      currentPath="/community/review"
      badgeType="REVIEW"
      formTitle="행사후기 수정"
      formDescription="후기 내용을 수정할 수 있습니다."
      footer={
        <>
          <button
            type="button"
            onClick={() => navigate(`/community/review/${reviewId}`)}
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
            form="community-review-edit-form"
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
      <form id="community-review-edit-form" onSubmit={handleSubmit}>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        <ErrorBox message={error} />
        {saving && !successMessage ? <InProgressBox /> : null}
        <SuccessBox message={successMessage} />

        {loading ? (
          <div style={{ fontSize: 14, fontWeight: 500, color: "#adb5bd" }}>후기 정보를 불러오는 중입니다.</div>
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
                <span style={{ fontSize: 13, fontWeight: 700, color: "#334155" }}>행사</span>
                <input
                  value={eventName}
                  disabled
                  readOnly
                  style={{
                    height: 46,
                    borderRadius: 10,
                    border: "1px solid #cbd5e1",
                    padding: "0 14px",
                    fontSize: 14,
                    color: "#64748b",
                    background: "#f1f5f9",
                  }}
                />
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
