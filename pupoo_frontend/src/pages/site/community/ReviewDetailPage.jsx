import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Edit3, Flag, MessageCircle, Star } from "lucide-react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { reviewApi } from "../../../app/http/reviewApi";
import { eventApi } from "../../../app/http/eventApi";
import { reviewReplyApi } from "../../../app/http/replyApi";
import { reportApi } from "../../../app/http/reportApi";
import { tokenStore } from "../../../app/http/tokenStore";
import { userApi } from "../../../app/http/userApi";
import CommunityDetailLayout from "./shared/CommunityDetailLayout";
import { normalizeEventTitle } from "../../../shared/utils/eventDisplay";
import ReportModal from "../components/ReportModal";

function fmtDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`;
}

function maskDisplayName(value, maxUnits) {
  const src = String(value || "").trim();
  if (!src) return "";
  let used = 0;
  let out = "";
  for (const ch of src) {
    const units = ch.charCodeAt(0) <= 127 ? 1 : 2;
    if (used + units > maxUnits) return `${out}*`;
    out += ch;
    used += units;
  }
  return out;
}

function Stars({ value }) {
  return (
    <div style={{ display: "inline-flex", gap: 3, alignItems: "center" }}>
      {Array.from({ length: 5 }, (_, index) => (
        <Star
          key={index}
          size={14}
          fill={index < value ? "#f59e0b" : "none"}
          color={index < value ? "#f59e0b" : "#cbd5e1"}
        />
      ))}
    </div>
  );
}

export default function ReviewDetailPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { reviewId } = useParams();
  const numericReviewId = Number(reviewId);

  const [review, setReview] = useState(null);
  const [eventName, setEventName] = useState("");
  const [replies, setReplies] = useState([]);
  const [replyText, setReplyText] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [replyLoading, setReplyLoading] = useState(true);
  const [replyError, setReplyError] = useState("");
  const [replySubmitting, setReplySubmitting] = useState(false);
  const [reportNotice, setReportNotice] = useState("");
  const [reportTarget, setReportTarget] = useState(null);
  const [meUserId, setMeUserId] = useState(null);
  const [editingReplyId, setEditingReplyId] = useState(null);
  const [editReplyText, setEditReplyText] = useState("");
  const [editReplySubmitting, setEditReplySubmitting] = useState(false);
  const [editReplyError, setEditReplyError] = useState("");

  const detailPath = `/community/review/${review?.reviewId ?? numericReviewId}`;

  const loadReplies = useCallback(async (id) => {
    setReplyLoading(true);
    setReplyError("");
    try {
      const res = await reviewReplyApi.list(id, 0, 100);
      const rows = Array.isArray(res?.content) ? res.content : Array.isArray(res) ? res : [];
      setReplies(rows);
    } catch (err) {
      console.error("[ReviewDetailPage] replies load failed:", err);
      setReplyError("댓글을 불러오지 못했습니다.");
      setReplies([]);
    } finally {
      setReplyLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      setLoading(true);
      setError("");
      try {
        const detail = await reviewApi.get(numericReviewId);
        if (!mounted) return;
        setReview(detail);
        if (detail?.eventId) {
          try {
            const eventRes = await eventApi.getEventDetail(detail.eventId);
            if (mounted) {
              const eventDetail = eventRes?.data?.data || {};
              setEventName(normalizeEventTitle(eventDetail?.eventName || detail.eventName, eventDetail));
            }
          } catch {
            if (mounted) setEventName(detail.eventName || "");
          }
        }
        await loadReplies(numericReviewId);
      } catch (err) {
        console.error("[ReviewDetailPage] load failed:", err);
        if (mounted) setError(err?.response?.data?.message || "후기를 불러오지 못했습니다.");
      } finally {
        if (mounted) setLoading(false);
      }
    };
    run();
    return () => {
      mounted = false;
    };
  }, [loadReplies, numericReviewId]);

  useEffect(() => {
    if (tokenStore.getAccess()) {
      userApi.getMe().then((data) => setMeUserId(data?.userId ?? null)).catch(() => setMeUserId(null));
    }
  }, []);

  useEffect(() => {
    if (!location.hash) return;
    const anchorId = location.hash.replace(/^#/, "");
    if (!anchorId) return;

    const frameId = window.requestAnimationFrame(() => {
      const element = document.getElementById(anchorId);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [location.hash, replies.length]);

  const submitReply = async () => {
    if (!review?.reviewId) return;
    if (!tokenStore.getAccess()) {
      navigate("/auth/login", { state: { from: `/community/review/${review.reviewId}` } });
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
      await reviewReplyApi.create(review.reviewId, content);
      setReplyText("");
      await loadReplies(review.reviewId);
    } catch (err) {
      console.error("[ReviewDetailPage] reply create failed:", err);
      setReplyError(err?.response?.data?.message || "댓글 등록에 실패했습니다.");
    } finally {
      setReplySubmitting(false);
    }
  };

  const startEditReply = useCallback((reply) => {
    setEditingReplyId(reply.replyId);
    setEditReplyText(reply.content || "");
    setEditReplyError("");
  }, []);

  const cancelEditReply = useCallback(() => {
    setEditingReplyId(null);
    setEditReplyText("");
    setEditReplyError("");
  }, []);

  const submitEditReply = useCallback(async () => {
    if (!editingReplyId) return;
    const content = editReplyText.trim();
    if (!content) {
      setEditReplyError("댓글 내용을 입력해 주세요.");
      return;
    }
    setEditReplySubmitting(true);
    setEditReplyError("");
    try {
      await reviewReplyApi.update(editingReplyId, content);
      setEditingReplyId(null);
      setEditReplyText("");
      if (review?.reviewId) await loadReplies(review.reviewId);
    } catch (err) {
      console.error("[ReviewDetailPage] reply edit failed:", err);
      setEditReplyError(err?.response?.data?.message || "댓글 수정에 실패했습니다.");
    } finally {
      setEditReplySubmitting(false);
    }
  }, [editReplyText, editingReplyId, loadReplies, review]);

  const ensureAuthed = useCallback(() => {
    if (!tokenStore.getAccess()) {
      navigate("/auth/login", { state: { from: detailPath } });
      return false;
    }
    return true;
  }, [detailPath, navigate]);

  const isOwner = meUserId != null && review?.userId === meUserId;

  const openReviewReport = useCallback(() => {
    if (!review?.reviewId || !ensureAuthed()) return;
    setReportNotice("");
    setReportTarget({
      kind: "review",
      targetId: review.reviewId,
      title: "후기 신고",
      successMessage: "후기 신고가 접수되었습니다.",
    });
  }, [ensureAuthed, review]);

  const openReplyReport = useCallback(
    (reply) => {
      if (!reply?.replyId || !ensureAuthed()) return;
      setReportNotice("");
      setReportTarget({
        kind: "reply",
        targetId: reply.replyId,
        title: "댓글 신고",
        successMessage: "댓글 신고가 접수되었습니다.",
      });
    },
    [ensureAuthed],
  );

  const submitReport = useCallback(
    async (payload) => {
      if (!reportTarget) return;
      if (reportTarget.kind === "review") {
        await reportApi.reportReview(reportTarget.targetId, payload);
        return;
      }
      await reportApi.reportReply("REVIEW", reportTarget.targetId, payload);
    },
    [reportTarget],
  );

  const metaItems = useMemo(() => {
    if (!review) return [];
    const authorLabel =
      review?.writerNickname ||
      review?.writerEmail ||
      review?.author ||
      review?.nickname ||
      review?.userName ||
      (review?.userId ? `회원 #${review.userId}` : "익명 사용자");
    return [
      { label: "작성일", value: fmtDate(review.createdAt) },
      { label: "조회수", value: review.viewCount ?? 0 },
      { label: "작성자", value: maskDisplayName(authorLabel, 30) },
      { label: "행사명", value: eventName || review.eventName || "행사 정보 없음" },
    ];
  }, [eventName, review]);

  return (
    <CommunityDetailLayout
      pageTitle="행사후기"
      pageSubtitle="행사에 참여한 사용자의 실제 후기를 확인하세요"
      currentPath="/community/review"
      badgeType="REVIEW"
      articleTitle={loading ? "불러오는 중" : review?.reviewTitle || review?.title || "행사 후기"}
      metaItems={metaItems}
      content={error ? `<p>${error}</p>` : review?.content || "<p>내용이 없습니다.</p>"}
      extraHead={
        !loading && review ? (
          <div
            style={{
              marginTop: 12,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <Stars value={review.rating || 0} />
              {reportNotice ? (
                <div
                  style={{
                    padding: "7px 12px",
                    borderRadius: 999,
                    background: "#ecfdf5",
                    border: "1px solid #bbf7d0",
                    color: "#166534",
                    fontSize: 12,
                    fontWeight: 800,
                  }}
                >
                  {reportNotice}
                </div>
              ) : null}
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              {isOwner && (
                <button
                  type="button"
                  onClick={() => navigate(`/community/review/${review.reviewId}/edit`)}
                  style={{
                    height: 38,
                    padding: "0 14px",
                    borderRadius: 999,
                    border: "1px solid #cbd5e1",
                    background: "#fff",
                    color: "#374151",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    fontSize: 12,
                    fontWeight: 800,
                    cursor: "pointer",
                  }}
                >
                  <Edit3 size={14} />
                  수정하기
                </button>
              )}
              <button
                type="button"
                onClick={openReviewReport}
                style={{
                  height: 38,
                  padding: "0 14px",
                  borderRadius: 999,
                  border: "1px solid #fecaca",
                  background: "#fff5f5",
                  color: "#b91c1c",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: 12,
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                <AlertTriangle size={14} />
                신고하기
              </button>
            </div>
          </div>
        ) : null
      }
    >
      <section style={{ padding: 0, paddingBottom: 32 }}>
        <div style={{ borderTop: "1px solid #e5e7eb", padding: "28px 0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, fontSize: 15, fontWeight: 700, color: "#111827" }}>
            <MessageCircle size={16} />
            댓글 {replies.length}
          </div>
          <div style={{ marginBottom: 14 }}>
            <textarea
              value={replyText}
              onChange={(event) => setReplyText(event.target.value)}
              placeholder="댓글을 입력해 주세요."
              rows={4}
              style={{
                width: "100%",
                borderRadius: 8,
                border: "1px solid #d1d5db",
                padding: "12px 14px",
                resize: "vertical",
                fontSize: 14,
                lineHeight: 1.6,
                fontFamily: "'Noto Sans KR', sans-serif",
                outline: "none",
                transition: "border-color .15s",
              }}
            />
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
              <button
                type="button"
                onClick={submitReply}
                disabled={replySubmitting}
                style={{
                  border: "1px solid #111827",
                  borderRadius: 6,
                  background: "#111827",
                  color: "#fff",
                  padding: "10px 20px",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: replySubmitting ? "not-allowed" : "pointer",
                  opacity: replySubmitting ? 0.6 : 1,
                }}
              >
                {replySubmitting ? "등록 중..." : "댓글 등록"}
              </button>
            </div>
            {replyError ? <div style={{ marginTop: 10, fontSize: 12, color: "#dc2626" }}>{replyError}</div> : null}
          </div>

          {replyLoading ? (
            <div style={{ fontSize: 14, fontWeight: 500, color: "#adb5bd" }}>댓글을 불러오는 중입니다.</div>
          ) : replies.length === 0 ? (
            <div style={{ fontSize: 14, fontWeight: 500, color: "#adb5bd" }}>등록된 댓글이 없습니다.</div>
          ) : (
            <div style={{ display: "grid", gap: 0 }}>
              {replies.map((reply) => {
                const isReplyOwner = meUserId != null && reply.userId === meUserId;
                const isEditing = editingReplyId === reply.replyId;
                return (
                  <div id={`reply-${reply.replyId}`} key={reply.replyId} style={{ borderBottom: "1px solid #f3f4f6", padding: "16px 0", scrollMarginTop: 120 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 6 }}>
                      <div style={{ fontSize: 12, color: "#64748b" }}>
                        {reply.writerEmail || `user#${reply.userId || "-"}`} · {fmtDate(reply.createdAt)}
                      </div>
                      <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                        {isReplyOwner && !isEditing && (
                          <button
                            type="button"
                            onClick={() => startEditReply(reply)}
                            style={{ border: "none", background: "none", color: "#d1d5db", cursor: "pointer", padding: 4, borderRadius: 4, display: "flex", alignItems: "center", transition: "color .15s" }}
                            onMouseEnter={(e) => { e.currentTarget.style.color = "#1d4ed8"; }}
                            onMouseLeave={(e) => { e.currentTarget.style.color = "#d1d5db"; }}
                            title="수정하기"
                          >
                            <Edit3 size={14} />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => openReplyReport(reply)}
                          style={{ border: "none", background: "none", color: "#d1d5db", cursor: "pointer", padding: 4, borderRadius: 4, display: "flex", alignItems: "center", transition: "color .15s" }}
                          onMouseEnter={(e) => { e.currentTarget.style.color = "#dc2626"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.color = "#d1d5db"; }}
                          title="신고하기"
                        >
                          <Flag size={14} />
                        </button>
                      </div>
                    </div>
                    {isEditing ? (
                      <div>
                        <textarea
                          value={editReplyText}
                          onChange={(e) => setEditReplyText(e.target.value)}
                          rows={3}
                          style={{ width: "100%", borderRadius: 8, border: "1px solid #d1d5db", padding: "10px 12px", resize: "vertical", fontSize: 14, lineHeight: 1.6, fontFamily: "'Noto Sans KR', sans-serif", outline: "none" }}
                        />
                        {editReplyError && <div style={{ marginTop: 6, fontSize: 12, color: "#dc2626" }}>{editReplyError}</div>}
                        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 8 }}>
                          <button type="button" onClick={cancelEditReply} disabled={editReplySubmitting} style={{ border: "1px solid #cbd5e1", borderRadius: 6, background: "#fff", color: "#475569", padding: "6px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>취소</button>
                          <button type="button" onClick={submitEditReply} disabled={editReplySubmitting} style={{ border: "1px solid #111827", borderRadius: 6, background: "#111827", color: "#fff", padding: "6px 14px", fontSize: 13, fontWeight: 600, cursor: editReplySubmitting ? "not-allowed" : "pointer", opacity: editReplySubmitting ? 0.6 : 1 }}>{editReplySubmitting ? "수정 중..." : "수정"}</button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ fontSize: 14, color: "#334155", whiteSpace: "pre-wrap", lineHeight: 1.7 }}>
                        {reply.content}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
      <ReportModal
        open={Boolean(reportTarget)}
        title={reportTarget?.title || "신고하기"}
        onClose={() => setReportTarget(null)}
        onSubmit={submitReport}
        onSuccess={() =>
          setReportNotice(reportTarget?.successMessage || "신고가 접수되었습니다.")
        }
      />
    </CommunityDetailLayout>
  );
}
