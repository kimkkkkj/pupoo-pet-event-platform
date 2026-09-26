import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown, ChevronLeft, ChevronRight, HelpCircle, Loader2, Search, SlidersHorizontal, ExternalLink } from "lucide-react";
import PageHeader from "../components/PageHeader";
import PageLoading from "../components/PageLoading";
import EmptyState from "../components/EmptyState";
import CommunityPagination from "./shared/CommunityPagination";
import { axiosInstance } from "../../../app/http/axiosInstance";
import { COMMUNITY_CATEGORIES } from "./communityConfig";
import { prepareContentForDisplay } from "./shared/communityHtml";

const PAGE_SIZE = 10;
const SORT_OPTIONS = [
  { key: "recent", label: "최신순" },
  { key: "views", label: "조회순" },
];

export default function CommunityFaq() {
  const navigate = useNavigate();
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
  // 아코디언: 펼친 질문 id와 불러온 답변 캐시 { [postId]: { loading, content, error } }
  const [openId, setOpenId] = useState(null);
  const [answers, setAnswers] = useState({});

  const toggleFaq = async (postId) => {
    if (openId === postId) { setOpenId(null); return; }
    setOpenId(postId);
    if (answers[postId]?.content || answers[postId]?.loading) return;
    setAnswers((prev) => ({ ...prev, [postId]: { loading: true } }));
    try {
      const res = await axiosInstance.get(`/api/faqs/${postId}`);
      const data = res?.data?.data || res?.data || {};
      setAnswers((prev) => ({ ...prev, [postId]: { content: data.answerContent || data.content || "<p>내용이 없습니다.</p>" } }));
    } catch {
      setAnswers((prev) => ({ ...prev, [postId]: { error: "답변을 불러오지 못했습니다." } }));
    }
  };

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
    setOpenId(null);
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
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} .board-search-input::placeholder{color:#9ca3af;font-size:13px;font-weight:500;}
        .faq-list { border-top: 2px solid #111827; }
        .faq-item { border-bottom: 1px solid #f1f3f5; }
        .faq-q { width: 100%; display: flex; align-items: center; gap: 14px; padding: 18px 16px; border: none; background: transparent; cursor: pointer; text-align: left; font-family: inherit; transition: background 0.15s; }
        .faq-q:hover { background: #f7fbf2; }
        .faq-item.open .faq-q { background: #f4f8ee; }
        .faq-mark { flex-shrink: 0; width: 28px; height: 28px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 900; }
        .faq-mark.q { background: #e3f0d2; color: #4d7a1f; }
        .faq-mark.a { background: #f1f3f5; color: #6b7280; }
        .faq-q-text { flex: 1; min-width: 0; font-size: 15.5px; font-weight: 600; color: #111827; word-break: keep-all; }
        .faq-chev { flex-shrink: 0; color: #9ca3af; transition: transform 0.2s; }
        .faq-item.open .faq-chev { transform: rotate(180deg); color: #4d7a1f; }
        .faq-a { display: flex; gap: 14px; padding: 4px 16px 22px; background: #f4f8ee; }
        .faq-a-body { flex: 1; min-width: 0; font-size: 14.5px; line-height: 1.8; color: #374151; padding-top: 3px; }
        .faq-a-body p { margin: 0 0 6px; }
        .faq-a-more { display: inline-flex; align-items: center; gap: 4px; margin-top: 10px; border: none; background: none; padding: 0; font-size: 12.5px; font-weight: 700; color: #6b7280; cursor: pointer; font-family: inherit; }
        .faq-a-more:hover { color: #111827; }
        .faq-empty { text-align: center; padding: 64px 0; color: #9ca3af; font-size: 14px; }
      `}</style>
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
            {/* 자주 묻는 질문: 질문을 누르면 그 자리에서 답변이 펼쳐진다 */}
            <div className="faq-list">
              {pagedItems.map((faq) => {
                const open = openId === faq.postId;
                const answer = answers[faq.postId];
                return (
                  <div key={faq.postId} className={`faq-item${open ? " open" : ""}`}>
                    <button type="button" className="faq-q" onClick={() => toggleFaq(faq.postId)} aria-expanded={open}>
                      <span className="faq-mark q">Q</span>
                      <span className="faq-q-text">{faq.title}</span>
                      <ChevronDown size={18} className="faq-chev" />
                    </button>
                    {open && (
                      <div className="faq-a">
                        <span className="faq-mark a">A</span>
                        <div className="faq-a-body">
                          {answer?.loading ? (
                            <span style={{ color: "#9ca3af" }}>답변을 불러오는 중입니다…</span>
                          ) : answer?.error ? (
                            <span style={{ color: "#b91c1c" }}>{answer.error}</span>
                          ) : (
                            <div dangerouslySetInnerHTML={{ __html: prepareContentForDisplay(answer?.content || "") }} />
                          )}
                          <div>
                            <button type="button" className="faq-a-more" onClick={() => navigate(`/community/faq/${faq.postId}`)}>
                              자세히 보기 <ExternalLink size={12} />
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              {pagedItems.length === 0 ? <div className="faq-empty">검색 결과가 없습니다.</div> : null}
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
