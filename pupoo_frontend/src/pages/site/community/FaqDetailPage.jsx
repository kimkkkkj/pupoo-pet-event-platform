import { useEffect, useMemo, useState } from "react";
import { axiosInstance } from "../../../app/http/axiosInstance";
import { useParams } from "react-router-dom";
import CommunityDetailLayout from "./shared/CommunityDetailLayout";

function fmtDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`;
}

export default function FaqDetailPage() {
  const { postId } = useParams();
  const numericPostId = Number(postId);
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await axiosInstance.get(`/api/faqs/${numericPostId}`);
        const data = res?.data?.data || res?.data;
        if (mounted) setItem(data);
      } catch (err) {
        console.error("[FaqDetailPage] load failed:", err);
        if (mounted) setError(err?.response?.data?.message || "FAQ를 불러오지 못했습니다.");
      } finally {
        if (mounted) setLoading(false);
      }
    };
    run();
    return () => {
      mounted = false;
    };
  }, [numericPostId]);

  const metaItems = useMemo(() => {
    if (!item) return [];
    return [
      { label: "작성일", value: fmtDate(item.createdAt) },
      { label: "조회수", value: item.viewCount ?? 0 },
      ...(item.answeredAt ? [{ label: "답변일", value: fmtDate(item.answeredAt) }] : []),
    ];
  }, [item]);

  return (
    <CommunityDetailLayout
      pageTitle="자주묻는질문"
      pageSubtitle="자주 문의되는 내용을 빠르게 확인할 수 있습니다"
      currentPath="/community/faq"
      badgeType="FAQ"
      articleTitle={loading ? "불러오는 중" : item?.title || "FAQ를 찾을 수 없습니다."}
      metaItems={metaItems}
      content={error ? `<p>${error}</p>` : item?.content || "<p>내용이 없습니다.</p>"}
      extraContent={
        !loading && item?.answerContent ? (
          <div style={{ marginTop: 32, padding: "20px 24px", borderRadius: 0, background: "#fafafa", borderLeft: "3px solid #111827" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 8 }}>답변</div>
            <div style={{ fontSize: 14, color: "#334155", lineHeight: 1.8, whiteSpace: "pre-wrap" }}>
              {item.answerContent}
            </div>
          </div>
        ) : null
      }
    />
  );
}
