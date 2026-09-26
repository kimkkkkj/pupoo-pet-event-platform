import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown, ChevronLeft, ChevronRight, ListFilter, Loader2, Megaphone, Search, SlidersHorizontal } from "lucide-react";
import PageHeader from "../components/PageHeader";
import PageLoading from "../components/PageLoading";
import EmptyState from "../components/EmptyState";
import CommunityPagination from "./shared/CommunityPagination";
import BoardTable, { BoardTitle, isNewPost } from "./shared/BoardTable";
import { noticeApi, unwrap } from "../../../api/noticeApi";
import {
  COMMUNITY_CATEGORIES,
  getBoardBadge,
  getNoticeScopeBadge,
} from "./communityConfig";

const PAGE_SIZE = 10;

const SORT_OPTIONS = [
  { key: "recent", label: "최신순" },
  { key: "views", label: "조회순" },
  { key: "oldest", label: "오래된순" },
];

const SCOPE_OPTIONS = [
  { key: "all", label: "모든 공지" },
  { key: "ALL", label: "전체공지" },
  { key: "EVENT", label: "행사공지" },
];

function fmtDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`;
}

export default function Notice() {
  const navigate = useNavigate();
  const badge = getBoardBadge("NOTICE");
  const [viewportWidth, setViewportWidth] = useState(() =>
    typeof window === "undefined" ? 1440 : window.innerWidth,
  );
  const [search, setSearch] = useState("");
  const [scopeKey, setScopeKey] = useState("all");
  const [sortKey, setSortKey] = useState("recent");
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const [scopeDdOpen, setScopeDdOpen] = useState(false);
  const scopeDdRef = useRef(null);
  const sortDdRef = useRef(null);
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [totalFromApi, setTotalFromApi] = useState(0);
  const [totalPagesFromApi, setTotalPagesFromApi] = useState(1);
  const [keyword, setKeyword] = useState("");

  const fetchNotices = useCallback(async (pageNum) => {
    setLoading(true);
    setError("");
    try {
      const res = await noticeApi.list(
        pageNum,
        PAGE_SIZE,
        "TITLE_CONTENT",
        keyword.trim() || undefined,
        scopeKey === "all" ? undefined : scopeKey,
        sortKey,
      );
      const data = unwrap(res);
      const content = Array.isArray(data?.content) ? data.content : [];
      setNotices(content);
      setTotalFromApi(Number(data?.totalElements) ?? 0);
      setTotalPagesFromApi(Math.max(1, Number(data?.totalPages) ?? 1));
    } catch (err) {
      console.error("[Notice] fetch error:", err);
      setError("공지사항을 불러오지 못했습니다.");
      setNotices([]);
      setTotalFromApi(0);
      setTotalPagesFromApi(1);
    } finally {
      setLoading(false);
    }
  }, [scopeKey, sortKey, keyword]);

  useEffect(() => {
    fetchNotices(page);
  }, [page, scopeKey, sortKey, keyword, fetchNotices]);

  const totalPages = Math.max(1, totalPagesFromApi);
  const currentPage = Math.min(page, totalPages);
  const paged = notices;

  const currentSortLabel = SORT_OPTIONS.find((option) => option.key === sortKey)?.label || "최신순";
  const currentScopeLabel = SCOPE_OPTIONS.find((option) => option.key === scopeKey)?.label || "모든 공지";

  useEffect(() => {
    const h = (e) => {
      if (scopeDdRef.current && !scopeDdRef.current.contains(e.target)) setScopeDdOpen(false);
      if (sortDdRef.current && !sortDdRef.current.contains(e.target)) setSortMenuOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const syncViewport = () => setViewportWidth(window.innerWidth);
    syncViewport();
    window.addEventListener("resize", syncViewport);
    return () => window.removeEventListener("resize", syncViewport);
  }, []);

  const isMobile = viewportWidth < 768;
  const isTablet = viewportWidth >= 768 && viewportWidth < 1024;

  return (
    <>
      <PageHeader
        title="공지사항"
        subtitle="중요한 행사와 서비스 소식을 확인해 보세요."
        icon={<Megaphone size={42} color="#90C450" strokeWidth={1.6} />}
        titleStyle={{ fontSize: 46, lineHeight: "66px", letterSpacing: "-1px" }}
        subtitleStyle={{ fontSize: 20 }}
        categories={COMMUNITY_CATEGORIES}
        currentPath="/community/notice"
        onNavigate={(path) => navigate(path)}
      />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} .board-search-input::placeholder{color:#9ca3af;font-size:13px;font-weight:500;}`}</style>
      <main
        style={{
          width: isMobile
            ? "calc(100% - 20px)"
            : isTablet
              ? "calc(100% - 28px)"
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
          <span style={{ fontSize: 14, fontWeight: 600, color: "#555" }}>총 {totalFromApi}개</span>

          <div style={{ display: "flex", alignItems: "center", gap: 8, width: isMobile ? "100%" : "auto" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 0,
                background: isMobile ? "transparent" : "#fff", border: isMobile ? "none" : "1px solid #e2e5ea",
                borderRadius: 12,
                height: isMobile ? "auto" : 48,
                width: isMobile ? "100%" : "auto",
                flexWrap: isMobile ? "wrap" : "nowrap",
                padding: 0,
                rowGap: isMobile ? 8 : 0,
              }}
            >
              {/* scope dropdown */}
              <div style={{ position: "relative", flex: isMobile ? "1 1 100%" : "0 0 auto" }} ref={scopeDdRef}>
                <button
                  type="button"
                  onClick={() => setScopeDdOpen((v) => !v)}
                  style={{ height: 40, width: isMobile ? "100%" : "auto", padding: "0 36px 0 14px", border: isMobile ? "none" : "none", background: isMobile ? "#f3f4f6" : "transparent", borderRadius: isMobile ? 8 : 0, color: "#9ca3af", fontSize: 13, fontWeight: 500, cursor: "pointer", textAlign: "left", outline: "none", fontFamily: "inherit", whiteSpace: "nowrap", minWidth: isMobile ? 0 : 120, display: "inline-flex", alignItems: "center", gap: 7 }}
                >
                  <ListFilter size={14} style={{ color: "#9ca3af" }} />
                  {currentScopeLabel}
                </button>
                <ChevronDown size={15} style={{ position: "absolute", right: 12, top: "50%", transform: scopeDdOpen ? "translateY(-50%) rotate(180deg)" : "translateY(-50%)", color: "#9ca3af", pointerEvents: "none", transition: "transform .15s ease" }} />
                {scopeDdOpen && (
                  <div style={{ position: "absolute", top: "calc(100% + 8px)", left: 0, minWidth: 200, background: "#fff", borderRadius: 16, padding: "8px 0", boxShadow: "0 4px 24px rgba(0,0,0,.10)", zIndex: 50, maxHeight: 280, overflowY: "auto" }}>
                    {SCOPE_OPTIONS.map((option) => (
                      <button
                        key={option.key}
                        type="button"
                        onClick={() => { setScopeKey(option.key); setScopeDdOpen(false); setPage(1); }}
                        style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "11px 16px", border: "none", background: "none", color: scopeKey === option.key ? "#111827" : "#6b7280", fontSize: 13, fontWeight: scopeKey === option.key ? 600 : 500, cursor: "pointer", textAlign: "left", fontFamily: "inherit" }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "#f9fafb")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                      >
                        <ListFilter size={14} style={{ color: "#9ca3af", flexShrink: 0 }} />
                        {option.label}
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
                  style={{ height: 40, width: isMobile ? "100%" : "auto", padding: "0 36px 0 14px", border: isMobile ? "none" : "none", background: isMobile ? "#f3f4f6" : "transparent", borderRadius: isMobile ? 8 : 0, color: "#9ca3af", fontSize: 13, fontWeight: 500, cursor: "pointer", textAlign: "left", outline: "none", fontFamily: "inherit", whiteSpace: "nowrap", minWidth: isMobile ? 0 : 110, display: "inline-flex", alignItems: "center", gap: 7 }}
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
                        onClick={() => { setSortKey(option.key); setSortMenuOpen(false); setPage(1); }}
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
                  placeholder="공지사항 검색"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      setKeyword(search.trim());
                      setPage(1);
                    }
                  }}
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
          </div>
        </div>

        {loading && (
          <PageLoading message="공지사항을 불러오는 중입니다" />
        )}

        {!loading && error && (
          <EmptyState type="error" message="공지사항을 불러오지 못했습니다" description="네트워크 연결을 확인하고 다시 시도해 주세요." />
        )}

        {!loading && !error && (
          <>
            <BoardTable
              columns={[
                { key: "author", label: "작성자", width: 110 },
                { key: "date", label: "작성일", width: 110, muted: true },
                { key: "views", label: "조회", width: 70, muted: true },
              ]}
              rows={paged.map((notice, index) => {
                const scope = getNoticeScopeBadge(notice.scope);
                return {
                  key: notice.noticeId,
                  pinned: Boolean(notice.pinned),
                  no: totalFromApi - ((currentPage - 1) * PAGE_SIZE) - index,
                  onClick: () => navigate(`/community/notice/${notice.noticeId}`),
                  title: <BoardTitle prefix={`[${scope.compactLabel}]`} text={notice.title} isNew={isNewPost(notice.createdAt)} />,
                  cells: { author: "관리자", date: fmtDate(notice.createdAt), views: notice.viewCount ?? 0 },
                  meta: ["관리자", fmtDate(notice.createdAt), `조회 ${notice.viewCount ?? 0}`],
                };
              })}
              emptyText={keyword ? "검색 결과가 없습니다." : "공지사항이 없습니다."}
            />

            <CommunityPagination
              currentPage={currentPage}
              totalPages={totalPages}
              onChange={setPage}
            />
          </>
        )}
      </main>
    </>
  );
}
