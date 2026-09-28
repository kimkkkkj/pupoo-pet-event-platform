import { lazy, Suspense, useState, useCallback, useEffect } from "react";
import {
  AlertTriangle,
  Home,
  CalendarDays,
  Archive,
  Megaphone,
  LogOut,
  Settings,
  LayoutGrid,
  Clipboard,
  Users,
  Trophy,
  Image,
  CreditCard,
  RotateCcw,
  Send,
  Layers,
  Mic,
  Menu,
  BarChart3,
  ExternalLink,
} from "lucide-react";
import ds from "../shared/designTokens";
import { countAdminStatuses, resolveAdminStatus } from "../shared/adminStatus";
import { axiosInstance } from "../../../app/http/axiosInstance";
import { getToken, clearToken } from "../../../api/noticeApi";
const HomeDashboard = lazy(() => import("./HomeDashboard"));
const TodayDashboard = lazy(() => import("./TodayDashboard"));
const AdminChatBot = lazy(() => import("./AdminChatBot"));

const EventManage = lazy(() => import("../event/eventManage"));
const ProgramManage = lazy(() => import("../program/programManage"));
const BoardManage = lazy(() => import("../board/boardManage"));
const Notice = lazy(() => import("../board/Notice"));
const PastEvents = lazy(() => import("../past/PastEvents"));
const ZoneManage = lazy(() => import("../zone/zoneManage"));
const ContestManage = lazy(() => import("../contest/contestManage"));
const SessionManage = lazy(() => import("../session/sessionManage"));
const Gallery = lazy(() => import("../gallery/Gallery"));
const ParticipantList = lazy(() => import("../participant/ParticipantList"));
const PaymentManage = lazy(() => import("../participant/PaymentManage"));
const AlertManage = lazy(() => import("../participant/AlertManage"));
const RefundManage = lazy(() => import("../refund/RefundManage"));
const AdminLogManage = lazy(() => import("../adminlog/AdminLogManage"));
const ReportManage = lazy(() => import("../report/ReportManage"));

const DASHBOARD_TARGET_KEY = "pupoo_admin_dashboard_target";
const DASHBOARD_TARGET_EVENT = "pupoo-admin-dashboard-target";

/* 공통 애니메이션과 스크롤바 스타일을 정의한다. */


const globalStyles = `
.adm-site-link { display: inline-flex; align-items: center; gap: 6px; height: 34px; padding: 0 12px; border-radius: ${ds.rs}px;
  border: 1px solid ${ds.line}; color: ${ds.ink2}; font-size: 13px; font-weight: 600; text-decoration: none; white-space: nowrap; transition: background .15s, color .15s, border-color .15s; }
.adm-site-link:hover { background: ${ds.lineSoft}; color: ${ds.ink}; border-color: rgba(255,255,255,.16); }
@keyframes bellRing {
  0%   { transform: rotate(0deg); }
  10%  { transform: rotate(14deg); }
  20%  { transform: rotate(-12deg); }
  30%  { transform: rotate(10deg); }
  40%  { transform: rotate(-8deg); }
  50%  { transform: rotate(6deg); }
  60%  { transform: rotate(-4deg); }
  70%  { transform: rotate(2deg); }
  80%  { transform: rotate(-1deg); }
  100% { transform: rotate(0deg); }
}

@keyframes spin { to { transform: rotate(360deg); } }

/* 얇은 커스텀 스크롤바 */
::-webkit-scrollbar {
  width: 5px;
  height: 5px;
}
::-webkit-scrollbar-track {
  background: transparent;
}
::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 10px;
}
::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.2);
}
::-webkit-scrollbar-corner {
  background: transparent;
}

/* 사이드바 전용 스크롤바 */
aside ::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.07);
}
aside ::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.18);
}

/* 파이어폭스 스크롤바 */
* {
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.1) transparent;
}
aside * {
  scrollbar-color: rgba(255, 255, 255, 0.07) transparent;
}
`;

/* 관리자 셸 레이아웃과 사이드바 메뉴 정의 */


const NAV = [
  {
    section: "대시보드",
    items: [
      { id: "dashboard", label: "홈", icon: Home },
      { id: "analytics", label: "운영 분석", icon: BarChart3 },
    ],
  },
  {
    section: "행사",
    items: [
      { id: "pastEvents", label: "지난 행사", icon: Archive },
      { id: "eventManage", label: "행사 관리", icon: CalendarDays },
      { id: "programManage", label: "전체 프로그램 관리", icon: Clipboard },
    ],
  },
  {
    section: "행사 상세",
    items: [
      { id: "zoneManage", label: "체험존 관리", icon: Layers },
      { id: "contestManage", label: "콘테스트 관리", icon: Trophy },
      { id: "sessionManage", label: "세션/강연 관리", icon: Mic },
    ],
  },
  {
    section: "커뮤니티",
    items: [
      { id: "boardManage", label: "게시판 관리", icon: LayoutGrid },
      { id: "gallery", label: "갤러리 관리", icon: Image },
      { id: "notice", label: "공지사항 관리", icon: Megaphone },
    ],
  },
  {
    section: "참가",
    items: [
      { id: "participantList", label: "참가자 목록", icon: Users },
      { id: "paymentManage", label: "결제 관리", icon: CreditCard },
      { id: "refundManage", label: "환불 관리", icon: RotateCcw },
      { id: "alertManage", label: "알림 관리", icon: Send },
    ],
  },
  {
    section: "관리자",
    items: [
      { id: "reports", label: "신고 관리", icon: AlertTriangle },
      { id: "adminLogs", label: "관리자 로그", icon: Settings },
    ],
  },
];

const DEFAULT_PAGE_TABS = {
  dashboard: [{ id: "summary", label: "요약" }],
  analytics: [{ id: "summary", label: "요약" }],
  eventManage: [
    { id: "all", label: "전체 이벤트", count: 0 },
    { id: "active", label: "진행 중", count: 0 },
    { id: "ended", label: "종료", count: 0 },
    { id: "new", label: "예정", count: 0 },
  ],
  programManage: [
    { id: "all", label: "전체", count: 0 },
    { id: "active", label: "운영 중", count: 0 },
    { id: "ended", label: "종료", count: 0 },
    { id: "pending", label: "대기", count: 0 },
  ],
  pastEvents: [{ id: "all", label: "전체 행사" }],
  zoneManage: [
    { id: "all", label: "전체", count: 0 },
    { id: "active", label: "운영 중", count: 0 },
    { id: "ended", label: "종료", count: 0 },
    { id: "pending", label: "대기", count: 0 },
  ],
  contestManage: [
    { id: "all", label: "전체", count: 0 },
    { id: "active", label: "운영 중", count: 0 },
    { id: "ended", label: "종료", count: 0 },
    { id: "pending", label: "대기", count: 0 },
  ],
  sessionManage: [
    { id: "all", label: "전체", count: 0 },
    { id: "active", label: "운영 중", count: 0 },
    { id: "ended", label: "종료", count: 0 },
    { id: "pending", label: "대기", count: 0 },
  ],
  boardManage: [
    { id: "free", label: "자유게시판" },
    { id: "info", label: "정보게시판" },
    { id: "review", label: "행사후기" },
    { id: "qna", label: "질문·답변" },
    { id: "faq", label: "자주 묻는 질문" },
    { id: "banned", label: "모더레이션 시스템" },
  ],
  gallery: [{ id: "all", label: "갤러리" }],
  notice: [{ id: "all", label: "공지사항", count: 5 }],
  participantList: [
    { id: "list", label: "참가자 목록" },
    { id: "checkin", label: "체크인 관리" },
    { id: "session", label: "체험 세션" },
  ],
  paymentManage: [
    { id: "all", label: "전체", count: 0 },
    { id: "active", label: "운영 중", count: 0 },
    { id: "ended", label: "종료", count: 0 },
    { id: "pending", label: "대기", count: 0 },
  ],
  refundManage: [{ id: "all", label: "환불 요청" }],
  alertManage: [{ id: "all", label: "알림 이력" }],
  reports: [{ id: "all", label: "신고 이력" }],
  adminLogs: [{ id: "all", label: "로그 이력" }],
};

const authHeaders = () => {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const normalizeAdminProgramCategory = (program) => {
  const raw = String(
    program?.category ?? program?.programCategory ?? program?.programType ?? "",
  ).trim();
  const upper = raw.toUpperCase();

  if (upper === "CONTEST" || raw === "대회") return "CONTEST";
  if (upper === "SESSION" || raw === "교육" || raw === "강연") return "SESSION";
  if (upper === "EXPERIENCE" || raw === "체험") return "EXPERIENCE";

  return upper;
};

const PAGE_TITLES = {
  dashboard: "홈",
  analytics: "운영 분석",
  eventManage: "행사 관리",
  programManage: "프로그램 관리",
  pastEvents: "지난 행사",
  zoneManage: "체험존 관리",
  contestManage: "콘테스트 관리",
  sessionManage: "세션/강연 관리",
  boardManage: "게시판 관리",
  gallery: "갤러리 관리",
  notice: "공지사항 관리",
  participantList: "참가자 목록",
  paymentManage: "결제 관리",
  refundManage: "환불 관리",
  alertManage: "알림 관리",
  reports: "신고 관리",
  adminLogs: "관리자 로그",
};

function TodayDate() {
  const now = new Date();
  const days = ["일", "월", "화", "수", "목", "금", "토"];
  const formatted = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, "0")}.${String(now.getDate()).padStart(2, "0")} (${days[now.getDay()]})`;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 7,
        height: 34,
        padding: "0 12px",
        borderRadius: ds.rs,
        border: "1px solid #FFFFFF",
        background: "#FFFFFF",
        color: "#181C20",
        fontSize: 13,
        fontWeight: 600,
      }}
    >
      <CalendarDays size={14} />
      {formatted}
    </div>
  );
}

const SECTION_OF = Object.fromEntries(
  NAV.flatMap((group) => group.items.map((item) => [item.id, group.section])),
);

function PageHome() {
  return <TodayDashboard />;
}

/* 관리자 대시보드 메인 컴포넌트 */


export default function Dashboard() {
  const [nav, setNav] = useState("dashboard");
  const [subTab, setSubTab] = useState(null);
  const [viewportWidth, setViewportWidth] = useState(() =>
    typeof window === "undefined" ? 1440 : window.innerWidth,
  );
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  // 로그아웃 버튼이 같은 자리를 쓰므로 벨 애니메이션 상태는 제거했다.
  const [pageTabs, setPageTabs] = useState(DEFAULT_PAGE_TABS);
  const [eventMenuBadge, setEventMenuBadge] = useState(0);

  useEffect(() => {
    const prevBg = document.body.style.backgroundColor;
    document.body.style.backgroundColor = ds.bg;
    return () => {
      document.body.style.backgroundColor = prevBg;
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const syncViewport = () => setViewportWidth(window.innerWidth);
    syncViewport();
    window.addEventListener("resize", syncViewport);
    return () => window.removeEventListener("resize", syncViewport);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const syncDashboardTarget = (nextPage, nextTab = null) => {
      if (!nextPage || !DEFAULT_PAGE_TABS[nextPage]) return;
      setNav(nextPage);
      setSubTab(nextTab);
      try {
        sessionStorage.removeItem(DASHBOARD_TARGET_KEY);
      } catch {
        // 저장소 접근에 실패해도 대시보드는 기본 상태로 계속 동작시킨다.
      }
    };

    const readStoredTarget = () => {
      try {
        return sessionStorage.getItem(DASHBOARD_TARGET_KEY);
      } catch {
        return null;
      }
    };

    syncDashboardTarget(readStoredTarget());

    const handleDashboardTarget = (event) => {
      syncDashboardTarget(event?.detail?.page || readStoredTarget(), event?.detail?.tab || null);
    };

    window.addEventListener(DASHBOARD_TARGET_EVENT, handleDashboardTarget);
    return () => window.removeEventListener(DASHBOARD_TARGET_EVENT, handleDashboardTarget);
  }, []);

  const isMobile = viewportWidth < 1024;
  const isHandset = viewportWidth < 768;
  const isTablet = viewportWidth >= 768 && viewportWidth < 1024;

  useEffect(() => {
    if (!isMobile) setMobileNavOpen(false);
  }, [isMobile]);

  useEffect(() => {
    if (typeof document === "undefined") return undefined;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = isMobile && mobileNavOpen ? "hidden" : prevOverflow;
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isMobile, mobileNavOpen]);

  const loadTabCounts = useCallback(async () => {
    try {
      const eventRes = await axiosInstance.get("/api/admin/dashboard/events", {
        headers: authHeaders(),
      });

      const readList = (payload) =>
        Array.isArray(payload?.content)
          ? payload.content
          : Array.isArray(payload)
            ? payload
            : [];

      /* 행사 관리 화면과 같은 기준으로 날짜 기반 상태를 계산한다. */
      const calcSt = (startAt, endAt) => {
        if (!startAt && !endAt) return "pending";
        const norm = (v) => (v ? String(v).replace(/\./g, "-").trim() : v);
        const now = new Date();
        const s = startAt
          ? new Date(
              norm(startAt).includes("T")
                ? norm(startAt)
                : norm(startAt) + "T00:00:00+09:00",
            )
          : null;
        const e = endAt
          ? new Date(
              norm(endAt).includes("T")
                ? norm(endAt)
                : norm(endAt) + "T23:59:59+09:00",
            )
          : null;
        if (e && !isNaN(e) && now > e) return "ended";
        if (s && !isNaN(s) && now < s) return "pending";
        return "active";
      };

      const events = readList(eventRes?.data?.data || eventRes?.data).map(
        (event) => {
          const startAt =
            event.startAt ??
            event.startDateTime ??
            event.startDate ??
            event.date?.split("~")[0]?.trim();
          const endAt =
            event.endAt ??
            event.endDateTime ??
            event.endDate ??
            event.date?.split("~")[1]?.trim();
          return {
            ...event,
            status: resolveAdminStatus(event, calcSt(startAt, endAt)),
          };
        },
      );
      const eventCounts = countAdminStatuses(events);

      const evTabRow = (label = "전체") => [
        { id: "all", label, count: eventCounts.all },
        { id: "active", label: "운영 중", count: eventCounts.active },
        { id: "ended", label: "종료", count: eventCounts.ended },
        { id: "pending", label: "대기", count: eventCounts.pending },
      ];

      setPageTabs((prev) => ({
        ...prev,
        eventManage: [
          { id: "all", label: "전체 이벤트", count: eventCounts.all },
          { id: "active", label: "진행 중", count: eventCounts.active },
          { id: "ended", label: "종료", count: eventCounts.ended },
          { id: "new", label: "예정", count: eventCounts.pending },
        ],
        programManage: [
          { id: "all", label: "전체", count: eventCounts.all },
          { id: "active", label: "운영 중", count: eventCounts.active },
          { id: "ended", label: "종료", count: eventCounts.ended },
          { id: "pending", label: "대기", count: eventCounts.pending },
        ],
        zoneManage: evTabRow("전체"),
        contestManage: evTabRow("전체"),
        sessionManage: evTabRow("전체"),
        paymentManage: evTabRow("전체"),
      }));
      setEventMenuBadge(eventCounts.all);
    } catch (err) {
      console.error("[Dashboard] tab count load failed:", err);
    }
  }, []);

  useEffect(() => {
    loadTabCounts();
    const timerId = setInterval(() => {
      loadTabCounts();
    }, 5000);

    return () => clearInterval(timerId);
  }, [loadTabCounts]);

  const tabs = pageTabs[nav] || [];
  const activeTab = subTab || tabs[0]?.id;
  const handleNav = (id) => {
    setNav(id);
    setSubTab(null);
    setMobileNavOpen(false);
  };

  const renderPage = () => {
    switch (nav) {
      case "dashboard":
        return <PageHome />;
      case "analytics":
        return <HomeDashboard />;
      case "eventManage":
        return <EventManage subTab={activeTab} />;
      case "programManage":
        return <ProgramManage subTab={activeTab} />;
      case "pastEvents":
        return <PastEvents />;
      case "zoneManage":
        return <ZoneManage subTab={activeTab} />;
      case "contestManage":
        return <ContestManage subTab={activeTab} />;
      case "sessionManage":
        return <SessionManage subTab={activeTab} />;
      case "boardManage":
        return <BoardManage subTab={activeTab} />;
      case "notice":
        return <Notice />;
      case "gallery":
        return <Gallery />;
      case "participantList":
        return <ParticipantList subTab={activeTab} />;
      case "paymentManage":
        return <PaymentManage subTab={activeTab} />;
      case "refundManage":
        return <RefundManage />;
      case "alertManage":
        return <AlertManage />;
      case "reports":
        return <ReportManage />;
      case "adminLogs":
        return <AdminLogManage />;
      default:
        return <PageHome />;
    }
  };

  const logout = () => {
    clearToken();
    window.location.href = "/admin/login";
  };
  const contentPadX = isHandset ? 14 : isTablet ? 22 : 32;

  return (
    <div
      style={{
        display: "flex",
        height: isMobile ? "100dvh" : "100vh",
        minHeight: isMobile ? "100dvh" : "100vh",
        fontFamily: ds.ff,
        background: ds.bg,
        color: ds.ink,
        overflow: "hidden",
      }}
    >
      <style>{globalStyles}</style>

      {/* 사이드바 */}
      <aside
        style={{
          width: isHandset ? "min(82vw, 280px)" : 248,
          background: ds.sidebar,
          borderRight: `1px solid ${ds.lineD}`,
          display: "flex",
          flexDirection: "column",
          flexShrink: 0,
          ...(isMobile
            ? {
                position: "fixed",
                top: 0,
                bottom: 0,
                left: 0,
                paddingBottom: "env(safe-area-inset-bottom, 0px)",
                zIndex: 1200,
                transform: mobileNavOpen ? "translateX(0)" : "translateX(-100%)",
                transition: "transform .2s ease",
                boxShadow: ds.sh3,
              }
            : {}),
        }}
      >
        {/* 로고 */}
        <div
          style={{
            height: 64,
            padding: "0 20px",
            display: "flex",
            alignItems: "center",
            gap: 10,
            borderBottom: `1px solid ${ds.lineD}`,
            flexShrink: 0,
          }}
        >
          <button
            type="button"
            onClick={() => handleNav("dashboard")}
            aria-label="관리자 홈으로"
            title="관리자 홈으로"
            style={{ display: "flex", alignItems: "center", padding: 0, border: "none", background: "none", cursor: "pointer" }}
          >
            <img src="/logo_white7.png" alt="pupoo" style={{ height: 24, objectFit: "contain" }} />
          </button>
          <span
            style={{
              fontSize: 11.5,
              fontWeight: 700,
              letterSpacing: "0.12em",
              color: "#fff",
              background: ds.brand,
              borderRadius: 6,
              padding: "4px 8px 4px 9px",
              whiteSpace: "nowrap",
            }}
          >
            관리자 전용
          </span>
        </div>

        {/* 메뉴 */}
        <nav style={{ flex: 1, padding: "8px 12px 16px", overflow: "auto" }}>
          {NAV.map((group) => (
            <div key={group.section} style={{ marginTop: 14 }}>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: ds.ink4,
                  padding: "0 10px 6px",
                }}
              >
                {group.section}
              </div>
              {group.items.map((item) => {
                const on = nav === item.id;
                const I = item.icon;
                const badgeValue = item.id === "eventManage" ? eventMenuBadge : item.badge;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleNav(item.id)}
                    aria-current={on ? "page" : undefined}
                    style={{
                      position: "relative",
                      width: "100%",
                      height: 40,
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "0 12px",
                      marginBottom: 2,
                      borderRadius: ds.rs,
                      border: "none",
                      cursor: "pointer",
                      fontFamily: ds.ff,
                      fontSize: 14,
                      fontWeight: on ? 600 : 500,
                      background: on ? ds.sideActive : "transparent",
                      color: on ? ds.inkW : ds.ink3,
                      transition: "background .12s, color .12s",
                    }}
                    onMouseEnter={(e) => {
                      if (!on) {
                        e.currentTarget.style.background = ds.sideHover;
                        e.currentTarget.style.color = ds.ink;
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!on) {
                        e.currentTarget.style.background = "transparent";
                        e.currentTarget.style.color = ds.ink3;
                      }
                    }}
                  >
                    {on && (
                      <span
                        style={{
                          position: "absolute",
                          left: -12,
                          top: 9,
                          bottom: 9,
                          width: 3,
                          borderRadius: "0 3px 3px 0",
                          background: ds.brand,
                        }}
                      />
                    )}
                    <I size={18} strokeWidth={on ? 2.2 : 1.8} color={on ? ds.brandText : "currentColor"} />
                    <span style={{ flex: 1, textAlign: "left" }}>{item.label}</span>
                    {badgeValue != null && (
                      <span
                        style={{
                          minWidth: 22,
                          fontSize: 12,
                          fontWeight: 600,
                          padding: "0 7px",
                          borderRadius: 999,
                          lineHeight: "20px",
                          background: on ? ds.brand : ds.lineSoft,
                          color: on ? "#fff" : ds.ink3,
                        }}
                      >
                        {badgeValue}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        {/* 관리자 정보 + 로그아웃 (등록 페이지 하단 버튼 줄과 같은 64px 높이) */}
        <div
          style={{
            height: 64,
            boxSizing: "border-box",
            flexShrink: 0,
            padding: "0 16px",
            borderTop: `1px solid ${ds.lineD}`,
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: "50%",
              background: ds.brand,
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 13,
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            관
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: ds.ink }}>관리자</div>
            <div style={{ fontSize: 12, color: ds.ink4 }}>Super Admin</div>
          </div>
          <button
            type="button"
            onClick={logout}
            title="로그아웃"
            aria-label="로그아웃"
            style={{
              width: 34,
              height: 34,
              borderRadius: ds.rs,
              border: "none",
              background: "transparent",
              color: ds.ink3,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = ds.sideHover;
              e.currentTarget.style.color = ds.ink;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = ds.ink3;
            }}
          >
            <LogOut size={17} />
          </button>
        </div>
      </aside>

      {isMobile && mobileNavOpen && (
        <div
          onClick={() => setMobileNavOpen(false)}
          style={{ position: "fixed", inset: 0, zIndex: 1100, background: "rgba(0,0,0,0.5)" }}
        />
      )}

      {/* 메인 영역 */}
      <main style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>
        {/* 상단 헤더 */}
        <header
          style={{
            height: 64,
            flexShrink: 0,
            padding: `0 ${contentPadX}px`,
            display: "flex",
            alignItems: "center",
            gap: 12,
            borderBottom: `1px solid ${ds.lineD}`,
          }}
        >
          {isMobile && (
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              aria-label="메뉴 열기"
              style={{
                width: 36,
                height: 36,
                borderRadius: ds.rs,
                border: `1px solid ${ds.line}`,
                background: "transparent",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                flexShrink: 0,
              }}
            >
              <Menu size={17} color={ds.ink2} />
            </button>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            {!isHandset && SECTION_OF[nav] && (
              <div style={{ fontSize: 12, color: ds.ink4, marginBottom: 2 }}>{SECTION_OF[nav]}</div>
            )}
            <h1
              style={{
                margin: 0,
                fontSize: isHandset ? 17 : 19,
                fontWeight: 700,
                color: ds.ink,
                letterSpacing: -0.3,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {PAGE_TITLES[nav] || "대시보드"}
            </h1>
          </div>
          {!isHandset && <TodayDate />}
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="adm-site-link"
            title="사용자 사이트를 새 탭에서 열기"
          >
            <ExternalLink size={14} />
            {!isHandset && "사이트 보기"}
          </a>
        </header>

        {/* 콘텐츠: 등록·수정 페이지(FormSheet)는 admin-content-frame 위에 겹쳐 그려진다 */}
        <div id="admin-content-frame" style={{ position: "relative", flex: 1, minHeight: 0, display: "flex" }}>
        <div
          style={{
            flex: 1,
            overflow: "auto",
            minWidth: 0,
            padding: `${isHandset ? 14 : 24}px ${contentPadX}px ${isHandset ? 20 : 32}px`,
          }}
        >
          {/* 하위 탭: 두 개 이상일 때만 세그먼트 형태로 노출 */}
          {tabs.length > 1 && (
            <div
              role="tablist"
              style={{
                display: "flex",
                gap: 4,
                width: "fit-content",
                maxWidth: "100%",
                padding: 4,
                marginBottom: 20,
                borderRadius: 10,
                background: ds.card,
                border: `1px solid ${ds.line}`,
                overflowX: "auto",
                scrollbarWidth: "none",
              }}
            >
              {tabs.map((t) => {
                const on = activeTab === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    role="tab"
                    aria-selected={on}
                    onClick={() => setSubTab(t.id)}
                    style={{
                      height: 34,
                      padding: "0 14px",
                      border: "none",
                      borderRadius: 7,
                      cursor: "pointer",
                      background: on ? ds.brand : "transparent",
                      color: on ? "#fff" : ds.ink3,
                      fontSize: 14,
                      fontWeight: on ? 600 : 500,
                      fontFamily: ds.ff,
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      flexShrink: 0,
                      whiteSpace: "nowrap",
                      transition: "background .12s, color .12s",
                    }}
                    onMouseEnter={(e) => {
                      if (!on) e.currentTarget.style.color = ds.ink;
                    }}
                    onMouseLeave={(e) => {
                      if (!on) e.currentTarget.style.color = ds.ink3;
                    }}
                  >
                    {t.label}
                    {t.count != null && (
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          padding: "0 6px",
                          borderRadius: 999,
                          lineHeight: "18px",
                          background: on ? "#fff" : "#2A3038",
                          color: on ? ds.brand : ds.ink3,
                        }}
                      >
                        {t.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          <Suspense fallback={null}>{renderPage()}</Suspense>
        </div>
        </div>
      </main>
      <Suspense fallback={null}>
        <AdminChatBot />
      </Suspense>
    </div>
  );
}
