import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown, ChevronLeft, ChevronRight, HelpCircle, Loader2, Search, SlidersHorizontal } from "lucide-react";
import PageHeader from "../components/PageHeader";
import PageLoading from "../components/PageLoading";
import EmptyState from "../components/EmptyState";
import CommunityPagination from "./shared/CommunityPagination";
import { axiosInstance } from "../../../app/http/axiosInstance";
import { COMMUNITY_CATEGORIES, getBoardBadge } from "./communityConfig";
import BadgeTag from "./shared/BadgeTag";

const PAGE_SIZE = 10;
const SORT_OPTIONS = [
  { key: "recent", label: "최신순" },
  { key: "views", label: "조회순" },
];

function fmtDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`;
}

export default function CommunityFaq() {
  const navigate = useNavigate();
  const badge = getBoardBadge("FAQ");
  const [viewportWidth, setViewportWidth] = useState(() =>
    typeof window === "undefined" ? 1440 : window.innerWidth,
  );
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState("recent");
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const sortDdRef = useRef(null);
  const [items, setItems] = useState([]);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);

  const fetchFaqs = useCallback(async (requestedPage = 1) => {
    setLoading(true);
    setError("");
    try {
      const response = await axiosInstance.get("/api/faqs", {
        params: {
          page: Math.max(0, (Number(requestedPage) || 1) - 1),
          size: PAGE_SIZE,
          searchType: "TITLE_CONTENT",
          keyword: search.trim(),
          sort: sortKey === "views" ? "viewCount,desc" : "createdAt,desc",
        },
      });
      const data = response.data?.data || response.data || {};
      setItems(Array.isArray(data.content) ? data.content : []);
      setTotalElements(Number(data.totalElements) || 0);
      setTotalPages(Math.max(1, Number(data.totalPages) || 1));
    } catch (err) {
      console.error("[Community FAQ] list fetch failed:", err);
      setError("FAQ 목록을 불러오지 못했습니다.");
      setItems([]);
      setTotalElements(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [search, sortKey]);

  useEffect(() => {
    fetchFaqs(page);
  }, [fetchFaqs, page]);

  const currentPage = Math.min(page, totalPages);
  const pagedItems = items;

  useEffect(() => {
    setPage(1);
  }, [search, sortKey]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const currentSortLabel =
    SORT_OPTIONS.find((option) => option.key === sortKey)?.label ||
    "최신순";

  useEffect(() => {
    const h = (e) => {
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
        title="자주 묻는 질문"
        subtitle="자주 문의하는 내용을 빠르게 확인할 수 있는 안내 게시판입니다."
        icon={<HelpCircle size={42} color="#90C450" strokeWidth={1.6} />}
        titleStyle={{ fontSize: 46, lineHeight: "66px", letterSpacing: "-1px" }}
        subtitleStyle={{ fontSize: 20 }}
        categories={COMMUNITY_CATEGORIES}
        currentPath="/community/faq"
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
            alignItems: "center",
            justifyContent: "space-between",
            paddingBottom: "16px",
            marginBottom: "8px",
            gap: isMobile ? 12 : 16,
            flexWrap: "wrap",
          }}
        >
          <span style={{ fontSize: "15px", fontWeight: "600", color: "#222" }}>
            총 {totalElements}건
          </span>

          <div style={{ display: "flex", alignItems: "center", gap: 8, width: isMobile ? "100%" : "auto" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 0, background: isMobile ? "transparent" : "#fff", border: isMobile ? "none" : "1px solid #e2e5ea", borderRadius: 12, height: isMobile ? "auto" : 48, width: isMobile ? "100%" : "auto", flexWrap: isMobile ? "wrap" : "nowrap", padding: 0, rowGap: isMobile ? 8 : 0 }}>
              {/* sort button */}
              <div style={{ position: "relative", flex: isMobile ? "1 1 100%" : "0 0 auto" }} ref={sortDdRef}>
                <button
                  type="button"
                  onClick={() => setSortMenuOpen((prev) => !prev)}
                  style={{ height: isMobile ? 48 : 48, padding: "0 36px 0 14px", border: isMobile ? "1px solid #e2e5ea" : "none", background: isMobile ? "#fff" : "transparent", borderRadius: isMobile ? 12 : 0, color: "#9ca3af", fontSize: 13, fontWeight: 500, cursor: "pointer", textAlign: "left", outline: "none", fontFamily: "inherit", whiteSpace: "nowrap", minWidth: isMobile ? 0 : 110, width: isMobile ? "100%" : "auto", display: "inline-flex", alignItems: "center", gap: 7 }}
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
                  placeholder="자주 묻는 질문 검색"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
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

        {loading ? (
          <PageLoading message="FAQ를 불러오는 중입니다" />
        ) : error ? (
          <EmptyState type="error" message="FAQ를 불러오지 못했습니다" description="네트워크 연결을 확인하고 다시 시도해 주세요." />
        ) : (
          <>
            <div>
              {!isMobile && <div style={{
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
              </div>}
              {pagedItems.map((faq, index) => {
                const rowNumber = totalElements - ((currentPage - 1) * PAGE_SIZE) - index;
                return (
                  <div
                    key={faq.postId}
                    onClick={() => navigate(`/community/faq/${faq.postId}`)}
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
                    onMouseEnter={(event) => {
                      event.currentTarget.style.background = "#f9f9f9";
                    }}
                    onMouseLeave={(event) => {
                      event.currentTarget.style.background = "transparent";
                    }}
                  >
                    {!isMobile && <span style={{ width: 60, textAlign: "center", fontSize: 14, color: "#9ca3af", flexShrink: 0 }}>{rowNumber}</span>}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", minWidth: 0 }}>
                        <BadgeTag badge={badge} style={isMobile ? { ...badge.style, padding: "4px 10px", fontSize: 11 } : undefined} />
                        <span style={{ flex: 1, minWidth: 0, fontSize: isMobile ? 14 : 15, color: "#111827", fontWeight: 500, overflow: "hidden", textOverflow: isMobile ? "clip" : "ellipsis", whiteSpace: isMobile ? "normal" : "nowrap", wordBreak: "keep-all", overflowWrap: "break-word" }}>
                          {faq.title}
                        </span>
                      </div>
                      {isMobile && (
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginTop: 6, fontSize: 13, color: "#6b7280" }}>
                          <span>관리자</span>
                          <span style={{ color: "#cbd5e1" }}>·</span>
                          <span style={{ color: "#9ca3af", whiteSpace: "nowrap" }}>{fmtDate(faq.createdAt)}</span>
                          <span style={{ color: "#cbd5e1" }}>·</span>
                          <span style={{ color: "#9ca3af" }}>조회 {faq.viewCount ?? 0}</span>
                        </div>
                      )}
                    </div>
                    {!isMobile && <span style={{ width: 100, textAlign: "center", fontSize: 14, color: "#6b7280", flexShrink: 0 }}>관리자</span>}
                    {!isMobile && <span style={{ width: 100, textAlign: "center", fontSize: 14, color: "#9ca3af", whiteSpace: "nowrap", flexShrink: 0 }}>{fmtDate(faq.createdAt)}</span>}
                    {!isMobile && <span style={{ width: 80, textAlign: "center", fontSize: 13, color: "#9ca3af", flexShrink: 0 }}>{faq.viewCount ?? 0}</span>}
                  </div>
                );
              })}

              {pagedItems.length === 0 ? (
                <div
                  style={{ textAlign: "center", padding: "60px 0", color: "#999", fontSize: "14px" }}
                >
                  검색 결과가 없습니다.
                </div>
              ) : null}
            </div>

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
