import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { noticeApi, unwrap } from "../../../api/noticeApi";
import CommunityDetailLayout from "./shared/CommunityDetailLayout";
import { normalizeEventTitle } from "../../../shared/utils/eventDisplay";
import { getNoticeScopeBadge } from "./communityConfig";

function fmtDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`;
}

export default function NoticeDetailPage() {
  const { noticeId } = useParams();
  const numericNoticeId = Number(noticeId);
  const [notice, setNotice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await noticeApi.get(numericNoticeId);
        const data = unwrap(res);
        if (mounted) setNotice(data);
      } catch (err) {
        console.error("[NoticeDetailPage] load failed:", err);
        if (mounted) setError(err?.response?.data?.message || "공지사항을 불러오지 못했습니다.");
      } finally {
        if (mounted) setLoading(false);
      }
    };
    run();
    return () => {
      mounted = false;
    };
  }, [numericNoticeId]);

  const metaItems = useMemo(() => {
    if (!notice) return [];
    return [
      { label: "작성일", value: fmtDate(notice.createdAt) },
      { label: "조회수", value: notice.viewCount ?? 0 },
      ...(notice.updatedAt && notice.updatedAt !== notice.createdAt
        ? [{ label: "수정일", value: fmtDate(notice.updatedAt) }]
        : []),
    ];
  }, [notice]);

  const scopeBadge = getNoticeScopeBadge(notice?.scope);
  const isEventNotice = String(notice?.scope || "").toUpperCase() === "EVENT";
  const eventLabel = isEventNotice && notice?.eventName
    ? normalizeEventTitle(notice.eventName, notice)
    : "";

  return (
    <CommunityDetailLayout
      pageTitle="공지사항"
      pageSubtitle="중요한 행사와 서비스 소식을 확인하세요"
      currentPath="/community/notice"
      badgeType="NOTICE"
      articleTitle={loading ? "불러오는 중" : notice?.title || "공지사항을 찾을 수 없습니다."}
      metaItems={metaItems}
      content={error ? `<p>${error}</p>` : notice?.content || "<p>내용이 없습니다.</p>"}
      extraHead={
        !loading && notice ? (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "3px 8px",
                borderRadius: 4,
                border: `1px solid ${scopeBadge.borderColor}`,
                background: scopeBadge.background,
                color: scopeBadge.color,
                fontSize: 11.5,
                fontWeight: 600,
                lineHeight: 1,
                letterSpacing: 0.2,
              }}
            >
              {scopeBadge.label}
            </span>
            {notice.pinned ? <span style={{ fontSize: 12, fontWeight: 800, color: "#dc2626" }}>📌 고정</span> : null}
            {eventLabel ? <span style={{ fontSize: 12, color: "#64748b" }}>{eventLabel}</span> : null}
          </div>
        ) : null
      }
    />
  );
}
