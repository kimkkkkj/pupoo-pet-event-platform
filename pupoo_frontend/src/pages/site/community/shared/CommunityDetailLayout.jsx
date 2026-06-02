import { ArrowLeft, List } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import PageHeader from "../../components/PageHeader";
import { COMMUNITY_CATEGORIES, getBoardBadge } from "../communityConfig";
import { prepareContentForDisplay } from "./communityHtml";
import BadgeTag from "./BadgeTag";

const styles = {
  main: {
    width: "min(1400px, calc(100% - 40px))",
    margin: "0 auto",
    padding: "48px 0 80px",
    fontFamily: "'Noto Sans KR', sans-serif",
  },
  bottomButtons: {
    display: "flex",
    justifyContent: "center",
    gap: 10,
    marginTop: 40,
    paddingTop: 32,
    borderTop: "1px solid #e5e7eb",
  },
  listButton: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    border: "1px solid #d1d5db",
    background: "#fff",
    padding: "12px 28px",
    borderRadius: 8,
    fontSize: 15,
    fontWeight: 700,
    color: "#374151",
    cursor: "pointer",
    transition: "all .15s",
    fontFamily: "'Noto Sans KR', sans-serif",
  },
  card: {
    background: "#fff",
    borderRadius: 0,
    overflow: "hidden",
  },
  head: {
    paddingBottom: 28,
    borderBottom: "2px solid #111827",
  },
  badgeRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  title: {
    fontSize: 26,
    lineHeight: 1.4,
    fontWeight: 700,
    color: "#111827",
    margin: 0,
    letterSpacing: -0.3,
  },
  metaRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: 20,
    marginTop: 16,
    fontSize: 13,
    color: "#9ca3af",
  },
  metaLabel: {
    color: "#9ca3af",
    fontWeight: 400,
  },
  metaValue: {
    color: "#6b7280",
    fontWeight: 500,
  },
  metaDivider: {
    width: 1,
    height: 12,
    background: "#e5e7eb",
  },
  body: {
    padding: "36px 0",
  },
  content: {
    color: "#374151",
    fontSize: 17.5,
    lineHeight: 2,
    wordBreak: "keep-all",
  },
};

export default function CommunityDetailLayout({
  pageTitle,
  pageSubtitle,
  currentPath,
  badgeType,
  articleTitle,
  metaItems = [],
  content,
  extraHead = null,
  extraContent = null,
  children = null,
}) {
  const navigate = useNavigate();
  const badge = getBoardBadge(badgeType);
  const [viewportWidth, setViewportWidth] = useState(() =>
    typeof window === "undefined" ? 1440 : window.innerWidth,
  );

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const syncViewport = () => setViewportWidth(window.innerWidth);
    syncViewport();
    window.addEventListener("resize", syncViewport);
    return () => window.removeEventListener("resize", syncViewport);
  }, []);

  const isMobile = viewportWidth < 768;
  const isTablet = viewportWidth >= 768 && viewportWidth < 1024;
  const isCompact = viewportWidth < 1024;

  const mainStyle = {
    ...styles.main,
    width: isMobile
      ? "calc(100% - 24px)"
      : isTablet
        ? "calc(100% - 32px)"
        : styles.main.width,
    padding: isMobile ? "24px 0 40px" : isTablet ? "32px 0 56px" : styles.main.padding,
  };

  const headStyle = {
    ...styles.head,
    paddingBottom: isMobile ? 20 : isTablet ? 24 : styles.head.paddingBottom,
  };

  const titleStyle = {
    ...styles.title,
    fontSize: isMobile ? 22 : isTablet ? 24 : styles.title.fontSize,
    lineHeight: isMobile ? 1.45 : styles.title.lineHeight,
  };

  const metaRowStyle = {
    ...styles.metaRow,
    gap: isMobile ? 10 : isTablet ? 14 : styles.metaRow.gap,
    marginTop: isMobile ? 12 : styles.metaRow.marginTop,
    flexDirection: isMobile ? "column" : "row",
    alignItems: isMobile ? "flex-start" : "stretch",
  };

  const bodyStyle = {
    ...styles.body,
    padding: isMobile ? "24px 0" : isTablet ? "30px 0" : styles.body.padding,
  };

  const contentStyle = {
    ...styles.content,
    fontSize: isMobile ? 15.5 : isTablet ? 16.5 : styles.content.fontSize,
    lineHeight: isMobile ? 1.8 : styles.content.lineHeight,
    wordBreak: isMobile ? "break-word" : styles.content.wordBreak,
  };

  const bottomButtonsStyle = {
    ...styles.bottomButtons,
    gap: isMobile ? 8 : styles.bottomButtons.gap,
    marginTop: isMobile ? 28 : isTablet ? 32 : styles.bottomButtons.marginTop,
    paddingTop: isMobile ? 24 : styles.bottomButtons.paddingTop,
    flexWrap: isCompact ? "wrap" : "nowrap",
    flexDirection: isMobile ? "column" : "row",
  };

  const listButtonStyle = {
    ...styles.listButton,
    width: isMobile ? "100%" : "auto",
    padding: isMobile ? "12px 18px" : isTablet ? "12px 22px" : styles.listButton.padding,
  };

  return (
    <>
      <PageHeader
        title={pageTitle}
        subtitle={pageSubtitle}
        categories={COMMUNITY_CATEGORIES}
        currentPath={currentPath}
        onNavigate={(path) => navigate(path)}
      />
      <main style={mainStyle}>
        <article style={styles.card}>
          <header style={headStyle}>
            <div style={styles.badgeRow}>
              <BadgeTag badge={badge} />
            </div>
            <h1 style={titleStyle}>{articleTitle}</h1>
            {extraHead}
            {metaItems.length > 0 && (
              <div style={metaRowStyle}>
                {metaItems.map((item, i) => (
                  <span
                    key={`${item.label}-${item.value}`}
                    style={{
                      display: "flex",
                      alignItems: isMobile ? "flex-start" : "center",
                      gap: 0,
                      flexWrap: isMobile ? "wrap" : "nowrap",
                    }}
                  >
                    {!isMobile && i > 0 ? (
                      <span style={{ ...styles.metaDivider, marginRight: 20 }} />
                    ) : null}
                    <span style={styles.metaLabel}>{item.label}</span>
                    <span style={{ width: 6 }} />
                    <span style={styles.metaValue}>{item.value}</span>
                  </span>
                ))}
              </div>
            )}
          </header>

          <div style={bodyStyle}>
            <div
              style={contentStyle}
              dangerouslySetInnerHTML={{ __html: prepareContentForDisplay(content || "") }}
            />
            {extraContent}
          </div>
          {children}
        </article>

        <div style={bottomButtonsStyle}>
          <button
            type="button"
            style={listButtonStyle}
            onClick={() => navigate(currentPath)}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#f3f4f6";
              e.currentTarget.style.borderColor = "#9ca3af";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "#fff";
              e.currentTarget.style.borderColor = "#d1d5db";
            }}
          >
            <List size={18} />
            목록
          </button>
          <button
            type="button"
            style={{
              ...listButtonStyle,
              background: "#111827",
              color: "#fff",
              borderColor: "#111827",
            }}
            onClick={() => navigate(-1)}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = "0.85";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = "1";
            }}
          >
            <ArrowLeft size={18} />
            뒤로가기
          </button>
        </div>
      </main>
    </>
  );
}
