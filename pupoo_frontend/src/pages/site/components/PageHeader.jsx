import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Home } from "lucide-react";

const SECTION_LABELS = {
  event: "행사",
  program: "프로그램",
  community: "커뮤니티",
  realtime: "실시간 현황",
  guide: "이용 안내",
  gallery: "갤러리",
  registration: "참가 신청",
  payment: "참가 신청",
};

const styles = {
  pageHeader: {
    backgroundColor: "transparent",
    paddingTop: 150,
  },
  inner: {
    width: "min(1400px, calc(100% - 40px))",
    margin: "0 auto",
  },
  topRow: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 16,
  },
  title: {
    fontSize: 46,
    fontWeight: 800,
    color: "#111827",
    margin: 0,
    letterSpacing: "-1px",
    lineHeight: "66px",
  },
  breadcrumb: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    fontSize: 14,
    color: "#b0b5bd",
    fontWeight: 400,
    whiteSpace: "nowrap",
    paddingTop: 6,
    flexShrink: 0,
  },
  breadcrumbSep: {
    color: "#d1d5db",
    fontSize: 10,
  },
  breadcrumbCurrent: {
    color: "#6b7280",
    fontWeight: 600,
  },
  subtitle: {
    fontSize: 20,
    color: "#6b7280",
    fontWeight: 400,
    margin: "8px 0 0",
    lineHeight: 1.6,
    whiteSpace: "pre-line",
  },
  searchArea: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "30px 0 0",
  },
  tabs: {
    display: "flex",
    gap: 0,
    marginTop: 48,
  },
  tabBase: {
    flex: 1,
    padding: "13px 8px",
    fontSize: 17,
    fontWeight: 600,
    background: "rgb(235,235,235)",
    border: "none",
    cursor: "pointer",
    transition: "all 0.15s",
    fontFamily: "'JeonjuCraftGothic', Apple SD Gothic Neo, Malgun Gothic, '맑은 고딕', sans-serif",
    color: "#6b7280",
    textAlign: "center",
    whiteSpace: "nowrap",
    borderRadius: 0,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  tabActive: {
    color: "#fff",
    background: "#90C450",
    borderRadius: 8,
  },
  tabHover: {
    color: "#90C450",
  },
};

export default function PageHeader({ title, subtitle, icon, titleStyle, subtitleStyle, categories, currentPath, breadcrumbTitle, onTabClick, tabCounts, children, className, tabInactiveBg, bgColor }) {
  const [hoveredIdx, setHoveredIdx] = useState(null);
  const [viewportWidth, setViewportWidth] = useState(() =>
    typeof window === "undefined" ? 1440 : window.innerWidth,
  );
  const navigate = useNavigate();
  const location = useLocation();
  const hiddenPaths = new Set(["/event/preregister"]);
  const programMatch = location.pathname.match(
    /^\/program\/(?:all|current|upcoming|closed|experience|session|contest)(?:\/([^/?#]+))?/,
  );
  const currentEventId = programMatch?.[1] || null;

  const isProgramTabPath = (path) =>
    /^\/program\/(?:all|current|upcoming|closed|experience|session|contest)(?:\/[^/?#]+)?$/.test(path);

  const hasEventIdInPath = (path) =>
    /^\/program\/(?:all|current|upcoming|closed|experience|session|contest)\/[^/?#]+$/.test(path);

  const resolveTargetPath = (path) => {
    if (!currentEventId) return path;
    if (!isProgramTabPath(path)) return path;
    if (hasEventIdInPath(path)) return path;
    return `${path}/${currentEventId}`;
  };

  const filteredCategories = (categories || []).filter(
    (cat) => !hiddenPaths.has(cat.path),
  );

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const syncViewport = () => setViewportWidth(window.innerWidth);
    syncViewport();
    window.addEventListener("resize", syncViewport);
    return () => window.removeEventListener("resize", syncViewport);
  }, []);

  const activePath = currentPath || location.pathname;
  const pathSegments = location.pathname.split("/").filter(Boolean);
  const section = pathSegments[0] || "";
  const sectionLabel = SECTION_LABELS[section];
  const lastCrumb = breadcrumbTitle || title;
  const isDuplicate = sectionLabel && sectionLabel.replace(/\s/g, "") === lastCrumb.replace(/\s/g, "");
  const breadcrumbItems = (sectionLabel && !isDuplicate) ? ["홈", sectionLabel, lastCrumb] : ["홈", lastCrumb];

  const isMobile = viewportWidth < 768;

  const pageHeaderStyle = {
    ...styles.pageHeader,
    paddingTop: isMobile
      ? "calc(var(--pupoo-site-header-offset, 96px) + 8px)"
      : styles.pageHeader.paddingTop,
    paddingBottom: isMobile ? 12 : undefined,
    ...(bgColor ? { backgroundColor: bgColor } : {}),
  };

  const innerStyle = {
    ...styles.inner,
    width: isMobile ? "calc(100% - 32px)" : styles.inner.width,
  };

  const mergedTitleStyle = {
    ...styles.title,
    ...titleStyle,
    fontSize: isMobile ? 22 : (titleStyle?.fontSize ?? styles.title.fontSize),
    lineHeight: isMobile ? "1.3" : (titleStyle?.lineHeight ?? styles.title.lineHeight),
    letterSpacing: isMobile ? "-0.5px" : (titleStyle?.letterSpacing ?? styles.title.letterSpacing),
    marginTop: isMobile ? 25 : 0,
  };

  const mergedSubtitleStyle = {
    ...styles.subtitle,
    ...subtitleStyle,
    fontSize: isMobile ? 12 : (subtitleStyle?.fontSize ?? styles.subtitle.fontSize),
    margin: isMobile ? "4px 0 0" : styles.subtitle.margin,
    lineHeight: isMobile ? 1.5 : styles.subtitle.lineHeight,
    color: isMobile ? "#9ca3af" : (subtitleStyle?.color ?? styles.subtitle.color),
  };

  const tabsStyle = {
    ...styles.tabs,
    marginTop: isMobile ? 10 : styles.tabs.marginTop,
    flexWrap: "nowrap",
    overflowX: isMobile ? "auto" : "visible",
    overflowY: "hidden",
    gap: isMobile ? 6 : styles.tabs.gap,
    WebkitOverflowScrolling: "touch",
    scrollbarWidth: "none",
    msOverflowStyle: "none",
    paddingBottom: isMobile ? 2 : 0,
  };

  return (
    <div style={pageHeaderStyle} className={className || ""}>
      <div style={innerStyle}>
        {isMobile ? (
          /* ── 모바일 전용 심플 레이아웃 ── */
          <div style={{ textAlign: "center" }}>
            <h1 style={mergedTitleStyle}>{title}</h1>
            {subtitle && <p style={mergedSubtitleStyle}>{subtitle}</p>}
          </div>
        ) : (
          /* ── PC 레이아웃 ── */
          <div style={styles.topRow}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                {icon && icon}
                <h1 style={mergedTitleStyle}>{title}</h1>
              </div>
              {subtitle && <p style={mergedSubtitleStyle}>{subtitle}</p>}
            </div>
            <div style={styles.breadcrumb}>
              <Home size={12} style={{ color: "#b0b5bd" }} />
              {breadcrumbItems.map((item, i) => (
                <span key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  {i > 0 && <span style={styles.breadcrumbSep}>{">"}</span>}
                  <span style={i === breadcrumbItems.length - 1 ? styles.breadcrumbCurrent : undefined}>
                    {item}
                  </span>
                </span>
              ))}
            </div>
          </div>
        )}

        {children && (
          <div style={{
            ...styles.searchArea,
            width: "100%",
            padding: isMobile ? "16px 0 0" : styles.searchArea.padding,
          }}>
            {children}
          </div>
        )}

        {filteredCategories.length > 0 && (
          <div style={tabsStyle}>
            {filteredCategories.map((cat, i) => {
              const targetPath = resolveTargetPath(cat.path);
              const isActive = activePath === targetPath;
              const isHovered = hoveredIdx === i;

              let btnStyle = isMobile ? {
                flex: "0 0 auto",
                minWidth: 0,
                width: "auto",
                height: 32,
                padding: "0 14px",
                fontSize: 13,
                fontWeight: 600,
                fontFamily: styles.tabBase.fontFamily,
                whiteSpace: "nowrap",
                borderRadius: 8,
                border: "none",
                background: isActive ? "#111827" : "rgb(235,235,235)",
                color: isActive ? "#fff" : "#888",
                cursor: "pointer",
                transition: "all 0.15s",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 5,
              } : { ...styles.tabBase, ...(tabInactiveBg ? { background: tabInactiveBg } : {}) };

              if (!isMobile && isActive) {
                const isFirst = i === 0;
                const isLast = i === filteredCategories.length - 1;
                btnStyle = {
                  ...btnStyle,
                  ...styles.tabActive,
                  position: "relative",
                  zIndex: 1,
                  marginLeft: isFirst ? 0 : -8,
                  marginRight: isLast ? 0 : -8,
                };
              } else if (!isMobile && isHovered) {
                btnStyle = { ...btnStyle, ...styles.tabHover };
              }

              return (
                <button
                  key={cat.path}
                  style={btnStyle}
                  onClick={() => onTabClick ? onTabClick(targetPath) : navigate(targetPath)}
                  onMouseEnter={() => setHoveredIdx(i)}
                  onMouseLeave={() => setHoveredIdx(null)}
                  aria-current={isActive ? "page" : undefined}
                >
                  {cat.icon && <span style={{ display: "inline-flex", alignItems: "center", marginRight: 6 }}>{cat.icon}</span>}
                  {cat.label}
                  {tabCounts && cat.countKey != null && (
                    <span style={{
                      display: "inline-flex", alignItems: "center", justifyContent: "center",
                      minWidth: 22, height: isMobile ? 20 : 22, borderRadius: 11, padding: "0 6px",
                      fontSize: isMobile ? 11 : 12, fontWeight: 700, lineHeight: 1,
                      background: isActive ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.07)",
                      color: isActive ? "#fff" : "#6b7280",
                    }}>
                      {tabCounts[cat.countKey] ?? 0}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
