import { ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import PageHeader from "../../components/PageHeader";
import { COMMUNITY_CATEGORIES, getBoardBadge } from "../communityConfig";
import BadgeTag from "./BadgeTag";

const styles = {
  main: {
    width: "min(1400px, calc(100% - 40px))",
    margin: "0 auto",
    padding: "40px 0 64px",
    fontFamily: "'Noto Sans KR', sans-serif",
  },
  backButton: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    marginBottom: 18,
    border: "1px solid #dbe2ea",
    background: "#fff",
    borderRadius: 10,
    padding: "10px 14px",
    fontSize: 13,
    fontWeight: 700,
    color: "#334155",
    cursor: "pointer",
  },
  card: {
    background: "#fff",
    border: "1px solid #e2e8f0",
    borderRadius: 18,
    overflow: "hidden",
    boxShadow: "0 18px 40px rgba(15,23,42,0.06)",
  },
  head: {
    padding: "28px 32px 20px",
    borderBottom: "1px solid #edf2f7",
    background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
  },
  title: {
    fontSize: 28,
    lineHeight: 1.35,
    fontWeight: 800,
    color: "#0f172a",
    margin: "14px 0 0",
  },
  description: {
    margin: "10px 0 0",
    color: "#64748b",
    fontSize: 14,
    lineHeight: 1.7,
  },
  body: {
    padding: "28px 32px",
  },
  footer: {
    display: "flex",
    justifyContent: "flex-end",
    gap: 10,
    padding: "0 32px 32px",
  },
};

export default function CommunityWriteLayout({
  pageTitle,
  pageSubtitle,
  currentPath,
  badgeType,
  formTitle,
  formDescription,
  children,
  footer,
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

  return (
    <>
      <PageHeader
        title={pageTitle}
        subtitle={pageSubtitle}
        categories={COMMUNITY_CATEGORIES}
        currentPath={currentPath}
        onNavigate={(path) => navigate(path)}
      />

      <main
        style={{
          ...styles.main,
          width: isMobile
            ? "calc(100% - 24px)"
            : isTablet
              ? "calc(100% - 32px)"
              : styles.main.width,
          padding: isMobile ? "24px 0 40px" : isTablet ? "32px 0 52px" : styles.main.padding,
        }}
      >
        <button type="button" style={styles.backButton} onClick={() => navigate(currentPath)}>
          <ArrowLeft size={16} />
          목록으로
        </button>

        <article style={styles.card}>
          <header
            style={{
              ...styles.head,
              padding: isMobile ? "20px 18px 16px" : isTablet ? "24px 24px 18px" : styles.head.padding,
            }}
          >
            <BadgeTag badge={badge} />
            <h1
              style={{
                ...styles.title,
                fontSize: isMobile ? 22 : isTablet ? 25 : styles.title.fontSize,
                margin: isMobile ? "12px 0 0" : styles.title.margin,
              }}
            >
              {formTitle}
            </h1>
            {formDescription ? (
              <p
                style={{
                  ...styles.description,
                  fontSize: isMobile ? 13 : styles.description.fontSize,
                }}
              >
                {formDescription}
              </p>
            ) : null}
          </header>

          <div
            style={{
              ...styles.body,
              padding: isMobile ? "18px 16px" : isTablet ? "24px 24px" : styles.body.padding,
            }}
          >
            {children}
          </div>
          {footer ? (
            <div
              style={{
                ...styles.footer,
                padding: isMobile ? "0 16px 18px" : isTablet ? "0 24px 24px" : styles.footer.padding,
                flexWrap: isCompact ? "wrap" : "nowrap",
                flexDirection: isMobile ? "column" : "row",
              }}
            >
              {footer}
            </div>
          ) : null}
        </article>
      </main>
    </>
  );
}
