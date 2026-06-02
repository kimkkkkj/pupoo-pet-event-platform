import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Edit3 } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { unwrap, qnaApi } from "../../../api/qnaApi";
import { reportApi } from "../../../app/http/reportApi";
import { tokenStore } from "../../../app/http/tokenStore";
import { userApi } from "../../../app/http/userApi";
import CommunityDetailLayout from "./shared/CommunityDetailLayout";
import ReportModal from "../components/ReportModal";

function fmtDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(
    date.getDate(),
  ).padStart(2, "0")}`;
}

function hasAnswer(item) {
  const normalizedStatus = String(item?.status ?? item?.answerStatus ?? "")
    .trim()
    .toUpperCase();
  if (
    ["CLOSED", "ANSWERED", "COMPLETED", "RESOLVED", "DONE"].includes(
      normalizedStatus,
    )
  ) {
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

export default function QnADetailPage() {
  const navigate = useNavigate();
  const { qnaId } = useParams();
  const numericQnaId = Number(qnaId);
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reportNotice, setReportNotice] = useState("");
  const [reportTarget, setReportTarget] = useState(null);
  const [meUserId, setMeUserId] = useState(null);

  const detailPath = `/community/qna/${numericQnaId}`;

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await qnaApi.get(numericQnaId);
        const data = unwrap(res);
        if (mounted) setItem(data);
      } catch (err) {
        console.error("[QnADetailPage] load failed:", err);
        if (mounted) {
          setError(
            err?.response?.data?.message || "질문을 불러오지 못했습니다.",
          );
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };
    run();
    return () => {
      mounted = false;
    };
  }, [numericQnaId]);

  useEffect(() => {
    if (tokenStore.getAccess()) {
      userApi
        .getMe()
        .then((data) => setMeUserId(data?.userId ?? null))
        .catch(() => setMeUserId(null));
    }
  }, []);

  const isOwner = meUserId != null && item?.userId === meUserId;

  const metaItems = useMemo(() => {
    if (!item) return [];
    const answered =
      item.status === "ANSWERED" ||
      item.status === "CLOSED" ||
      Boolean(String(item?.answerContent ?? "").trim()) ||
      Boolean(item?.answeredAt);
    const rows = [
      { label: "작성일", value: fmtDate(item.createdAt) },
      { label: "조회수", value: item.viewCount ?? 0 },
      {
        label: "답변",
        value: answered ? "답변 완료" : "미답변",
      },
    ];
    if (item.publicationStatus === "HIDDEN") {
      rows.push({
        label: "노출",
        value: "숨김 (다른 사용자에게는 목록·검색에 마스킹)",
      });
    }
    return rows;
  }, [item]);

  const ensureAuthed = useCallback(() => {
    if (!tokenStore.getAccess()) {
      navigate("/auth/login", { state: { from: detailPath } });
      return false;
    }
    return true;
  }, [detailPath, navigate]);

  const openQnaReport = useCallback(() => {
    if (!item?.qnaId || !ensureAuthed()) return;
    setReportNotice("");
    setReportTarget({
      targetId: item.qnaId,
      title: "QnA 신고",
      successMessage: "QnA 신고가 접수되었습니다.",
    });
  }, [ensureAuthed, item]);

  const submitReport = useCallback(
    async (payload) => {
      if (!reportTarget?.targetId) return;
      await reportApi.reportPost(reportTarget.targetId, payload);
    },
    [reportTarget],
  );

  return (
    <>
      <CommunityDetailLayout
        pageTitle="질문/답변"
        pageSubtitle="궁금한 내용을 확인하고 답변 상태를 볼 수 있습니다."
        currentPath="/community/qna"
        badgeType="QNA"
        articleTitle={
          loading ? "불러오는 중" : item?.title || "질문을 찾을 수 없습니다."
        }
        metaItems={metaItems}
        content={
          error ? `<p>${error}</p>` : item?.content || "<p>내용이 없습니다.</p>"
        }
        extraHead={
          !loading && item ? (
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
              ) : (
                <span />
              )}
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {isOwner && (
                  <button
                    type="button"
                    onClick={() =>
                      navigate(`/community/qna/${item.qnaId}/edit`)
                    }
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
                  onClick={openQnaReport}
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
        extraContent={
          !loading && item?.answerContent ? (
            <div
              style={{
                marginTop: 32,
                padding: "20px 24px",
                borderRadius: 0,
                background: "#fafafa",
                borderLeft: "3px solid #111827",
              }}
            >
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: "#374151",
                  marginBottom: 8,
                }}
              >
                관리자 답변{" "}
                {item.answeredAt ? `· ${fmtDate(item.answeredAt)}` : ""}
              </div>
              <div
                style={{
                  fontSize: 14,
                  color: "#334155",
                  lineHeight: 1.8,
                  whiteSpace: "pre-wrap",
                }}
              >
                {item.answerContent}
              </div>
            </div>
          ) : null
        }
      />
      <ReportModal
        open={Boolean(reportTarget)}
        title={reportTarget?.title || "신고하기"}
        onClose={() => setReportTarget(null)}
        onSubmit={submitReport}
        onSuccess={() =>
          setReportNotice(
            reportTarget?.successMessage || "신고가 접수되었습니다.",
          )
        }
      />
    </>
  );
}
