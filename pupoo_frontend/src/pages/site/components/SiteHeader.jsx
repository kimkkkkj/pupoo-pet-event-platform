import { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { Bell, LogIn, UserPlus, Search, LogOut, UserCircle, CalendarHeart, MessageCircleHeart, TicketCheck, Activity, X, MapPin, Calendar, SearchX, Menu, ChevronDown, ChevronRight } from "lucide-react";
import {
  notificationApi,
  NOTIFICATION_UNREAD_COUNT_EVENT,
  emitNotificationUnreadCount,
} from "../../../app/http/notificationApi";
import { eventApi } from "../../../app/http/eventApi";
import { toPublicAssetUrl } from "../../../shared/utils/publicAssetUrl";

const FONT = "'JeonjuCraftGothic', Pretendard, 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif";

/* 사이트 헤더의 최상위 메가 메뉴 데이터 */
const megaMenuData = {
  events: {
    columns: [
      {
        title: "행사",
        items: [
          { label: "현재 진행 행사", href: "/event/current" },
          { label: "예정 행사", href: "/event/upcoming" },
          { label: "종료 행사", href: "/event/closed" },
          { label: "행사 일정 안내", href: "/event/eventschedule" },
        ],
      },
      {
        title: "프로그램",
        items: [
          { label: "현재 진행 프로그램", href: "/program/current" },
          { label: "예정 프로그램", href: "/program/upcoming" },
          { label: "종료 프로그램", href: "/program/closed" },
        ],
      },
    ],
    promo: {
      image: "/promo_event.jpg",
      title: "행사 안내",
      desc: "Pupoo의 주요 행사와 프로그램을 한눈에 확인하세요.",
      icon: "event",
    },
  },
  community: {
    columns: [
      {
        title: "소통 공간",
        items: [
          { label: "공지사항", href: "/community/notice" },
          { label: "자유 게시판", href: "/community/freeboard" },
          { label: "정보 게시판", href: "/community/info" },
          { label: "행사 후기", href: "/community/review" },
          { label: "질문과 답변", href: "/community/qna" },
          { label: "자주 묻는 질문", href: "/community/faq" },
        ],
      },
      {
        title: "미디어",
        items: [{ label: "행사 갤러리", href: "/gallery/eventgallery" }],
      },
    ],
    promo: {
      image: "/promo_community.jpg",
      title: "커뮤니티",
      desc: "참여 후기와 유용한 정보를 커뮤니티에서 확인하세요.",
      icon: "community",
    },
  },
  registration: {
    columns: [
      {
        title: "참가 신청",
        items: [
          { label: "행사 참가 신청", href: "/registration/apply" },
          { label: "신청 내역 조회", href: "/registration/applyhistory" },
          { label: "결제 내역", href: "/registration/paymenthistory" },
          { label: "QR 체크인", href: "/registration/qrcheckin" },
        ],
      },
      {
        title: "참여 안내",
        items: [{ label: "현장 이용 안내", href: "/guide/operation" }],
      },
    ],
    promo: {
      image: "/promo_registration.jpg",
      title: "참가 신청",
      desc: "참가 신청부터 현장 이용까지 빠르게 확인하세요.",
      icon: "registration",
    },
  },
  realtime: {
    columns: [
      {
        title: "실시간 현황",
        items: [
          { label: "통합 현황", href: "/realtime/dashboard" },
          { label: "대기 현황", href: "/realtime/waitingstatus" },
          { label: "체크인 현황", href: "/realtime/checkinstatus" },
          { label: "투표 현황", href: "/realtime/votestatus" },
        ],
      },
    ],
    promo: {
      image: "/promo_realtime.jpg",
      title: "실시간 현황",
      desc: "행사장의 주요 지표를 실시간으로 확인할 수 있습니다.",
      icon: "realtime",
    },
  },
};

const navItems = [
  { label: "행사", menuKey: "events" },
  { label: "커뮤니티", menuKey: "community" },
  { label: "참가신청", menuKey: "registration" },
  { label: "실시간현황", href: "/realtime/dashboard" },
];

/* 메가 메뉴 컬럼에서 공통으로 사용하는 링크 렌더러 */
const MegaLink = ({ item, onNavigate }) => {
  const [hovered, setHovered] = useState(false);
  return (
    <a
      href={item.href}
      onClick={(e) => {
        e.preventDefault();
        onNavigate(item.href);
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "block",
        padding: "5px 0",
        fontSize: 15,
        fontFamily: FONT,
        fontWeight: 500,
        color: hovered ? "#000" : "#333",
        textDecoration: hovered ? "underline" : "none",
        textUnderlineOffset: "4px",
        transition: "color 0.15s",
        lineHeight: 1.55,
      }}
    >
      {item.label}
    </a>
  );
};

/* 메뉴 섹션별 프로모 카드 아이콘 메타데이터 */
const PROMO_ICONS = {
  event: { Icon: CalendarHeart, bg: "#eff4ff", color: "#90C450" },
  community: { Icon: MessageCircleHeart, bg: "#fef3f2", color: "#e04545" },
  registration: { Icon: TicketCheck, bg: "#ecfdf5", color: "#059669" },
  realtime: { Icon: Activity, bg: "#fef9ee", color: "#ea580c" },
};

const PromoCard = ({ promo }) => {
  const iconCfg = PROMO_ICONS[promo.icon] || PROMO_ICONS.event;
  const { Icon, bg, color } = iconCfg;

  return (
    <div
      style={{
        width: 280,
        flexShrink: 0,
        backgroundColor: "#f7f8fa",
        borderRadius: 18,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          width: "100%",
          aspectRatio: "5 / 3",
          backgroundColor: "#e8edf3",
          overflow: "hidden",
        }}
      >
        <img
          src={promo.image}
          alt=""
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: "block",
          }}
          onError={(e) => {
            e.target.style.display = "none";
            e.target.parentElement.style.background =
              "linear-gradient(135deg, #dce3ed 0%, #c5d0e0 100%)";
          }}
        />
      </div>
      <div style={{ padding: "16px 18px 20px" }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            marginBottom: 10,
          }}
        >
          <span
            style={{
              fontSize: 14,
              fontFamily: FONT,
              fontWeight: 700,
              color: "rgb(127, 127, 127)",
            }}
          >
            {promo.title}
          </span>
        </div>
        <p
          style={{
            margin: 0,
            fontSize: 15,
            fontFamily: FONT,
            fontWeight: 500,
            color: "rgb(127, 127, 127)",
            lineHeight: 1.5,
          }}
        >
          {promo.desc}
        </p>
      </div>
    </div>
  );
};

/* 헤더 아래에 고정으로 펼쳐지는 메가 메뉴 카드다. */
const DropdownCard = ({ menuData, onNavigate, topOffset = 92 }) => {
  if (!menuData) return null;
  const { columns, promo } = menuData;

  return (
    <div
      style={{
        position: "fixed",
        top: topOffset,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 1001,
        backgroundColor: "#fff",
        borderRadius: "0 0 20px 20px",
        padding: "28px 36px 26px",
        display: "flex",
        gap: 0,
        animation: "megaSlideDown 0.18s ease",
      }}
    >
      {/* 메뉴 컬럼 목록 */}
      <div style={{ display: "flex", gap: 48 }}>
        {columns.map((col, i) => (
          <div key={i} style={{ minWidth: 130 }}>
            <div
              style={{
                fontSize: 14,
                fontFamily: FONT,
                fontWeight: 400,
                color: "#999",
                marginBottom: 14,
                lineHeight: 1,
              }}
            >
              {col.title}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              {col.items.map((item, j) => (
                <MegaLink key={j} item={item} onNavigate={onNavigate} />
              ))}
            </div>
          </div>
        ))}
      </div>

    </div>
  );
};

/* 헤더 아래에서 열리는 검색 패널이다. */
const POPULAR_TAGS = [
  { label: "#행사안내", to: "/event/current" },
  { label: "#참가신청", to: "/registration/apply" },
  { label: "#프로그램", to: "/program/current" },
  { label: "#체크인", to: "/registration/qrcheckin" },
  { label: "#갤러리", to: "/gallery/eventgallery" },
];

const SearchPanel = ({
  onClose,
  onSearch,
  onNavigate,
  topOffset = 92,
  compact = false,
  mobile = false,
}) => {
  const inputRef = useRef(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef(null);

  useEffect(() => {
    setQuery("");
    setTimeout(() => inputRef.current?.focus(), 80);
  }, []);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  /* 입력이 멈춘 뒤에만 검색 요청을 보내도록 디바운스를 건다. */
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      setSearched(false);
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await eventApi.getEvents({ keyword: trimmed, size: 5 });
        const data = res.data?.data?.content || res.data?.content || [];
        setResults(data);
      } catch {
        setResults([]);
      } finally {
        setSearched(true);
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (query.trim()) onSearch(query.trim());
  };
                          <span style={{ color: "#cbd5e1" }}>?</span>
  const formatDate = (start, end) => {
    if (!start) return "";
    const fmt = (d) => {
      const dt = new Date(d);
      return `${dt.getFullYear()}.${String(dt.getMonth() + 1).padStart(2, "0")}.${String(dt.getDate()).padStart(2, "0")}`;
    };
    return end ? `${fmt(start)} ~ ${fmt(end)}` : fmt(start);
  };

  const statusLabel = (s) => {
    const m = { PLANNED: "예정", ONGOING: "진행중", ENDED: "종료" };
    return m[s] || s;
  };
  const statusColor = (s) => {
    const m = { PLANNED: "#F59E0B", ONGOING: "#22C55E", ENDED: "#9496A6" };
    return m[s] || "#9496A6";
  };

  const panelPadding = mobile ? "16px 12px 14px" : compact ? "24px 16px 22px" : "48px 36px 40px";
  const panelGap = mobile ? 14 : compact ? 18 : 24;
  const panelRadius = mobile ? "0 0 16px 16px" : compact ? "0 0 18px 18px" : "0 0 20px 20px";
  const formMaxWidth = compact ? "100%" : 720;
  const searchHeight = mobile ? 46 : compact ? 54 : 64;
  const searchGap = mobile ? 10 : compact ? 12 : 16;
  const searchPadding = mobile ? "0 14px" : compact ? "0 18px" : "0 30px";
  const inputFontSize = mobile ? 15 : compact ? 16 : 20;
  const resultMaxWidth = compact ? "100%" : 720;

  return (
    <div
      style={{
        position: "fixed",
        top: topOffset,
        left: 0,
        right: 0,
        zIndex: 1001,
        backgroundColor: "#fff",
        borderRadius: panelRadius,
        padding: panelPadding,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: panelGap,
        animation: "searchSlideDown 0.18s ease",
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <form onSubmit={handleSubmit} style={{ width: "100%", maxWidth: formMaxWidth }}>
        <div style={{
          display: "flex", alignItems: "center", gap: searchGap,
          background: "#222", borderRadius: 999,
          padding: searchPadding, height: searchHeight,
        }}>
          <Search size={mobile ? 16 : compact ? 18 : 22} color="#999" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="어떤 행사를 찾고 계세요?"
            style={{
              flex: 1, border: "none", background: "none", outline: "none",
              color: "#fff", fontSize: inputFontSize, fontWeight: 500,
              fontFamily: FONT,
            }}
          />
          {query && (
            <button
              type="button"
              onClick={() => { setQuery(""); inputRef.current?.focus(); }}
              style={{ border: "none", background: "none", cursor: "pointer", display: "flex", padding: 0 }}
            >
              <X size={16} color="#999" />
            </button>
          )}
        </div>
      </form>

      {/* 검색 결과가 있으면 결과를, 없으면 인기 태그를 보여준다. */}
      {searched && query.trim() ? (
        <div style={{ width: "100%", maxWidth: resultMaxWidth }}>
          {loading ? (
            <div style={{ textAlign: "center", padding: "20px 0", color: "#999", fontSize: 14, fontFamily: FONT }}>
              검색 중...
            </div>
          ) : results.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#aaa", marginBottom: 8, fontFamily: FONT }}>
                검색 결과 {results.length}건
              </div>
                {results.map((evt) => (
                  <button
                  type="button"
                  onClick={() => { onClose(); onNavigate(`/event/eventschedule?eventId=${evt.eventId}`); }}
                  style={{
                    display: "flex", alignItems: "center", gap: compact ? 12 : 16,
                    padding: compact ? "12px 14px" : "14px 16px", borderRadius: 14,
                    border: "none", background: "#fff", cursor: "pointer",
                    textAlign: "left", fontFamily: FONT, width: "100%",
                    transition: "background 0.15s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#f7f8fa")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "#fff")}
                >
                  {/* 썸네일 */}
                  <div style={{
                    width: compact ? 48 : 56, height: compact ? 48 : 56, borderRadius: 12, flexShrink: 0, overflow: "hidden",
                    background: "#f0f0f0",
                  }}>
                    {evt.imageUrl ? (
                      <img
                        src={toPublicAssetUrl(evt.imageUrl)}
                        alt=""
                        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                      />
                    ) : (
                      <div style={{
                        width: "100%", height: "100%", display: "flex",
                        alignItems: "center", justifyContent: "center",
                      }}>
                        <CalendarHeart size={22} color="#ccc" />
                      </div>
                    )}
                  </div>
                  {/* 행사 정보 */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: mobile ? 14 : 15, fontWeight: 700, color: "#222",
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>
                      {evt.eventName}
                    </div>
                    <div style={{
                      display: "flex", alignItems: "center", gap: compact ? 8 : 12,
                      marginTop: 4, fontSize: compact ? 12 : 13, color: "#999",
                      flexWrap: compact ? "wrap" : "nowrap",
                    }}>
                      {evt.location && (
                        <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
                          <MapPin size={12} /> {evt.location}
                        </span>
                      )}
                      {evt.startAt && (
                        <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
                          <Calendar size={12} /> {formatDate(evt.startAt, evt.endAt)}
                        </span>
                      )}
                    </div>
                  </div>
                  {/* 상태 배지 */}
                  {evt.status && (
                    <div style={{
                      fontSize: 12, fontWeight: 700, color: statusColor(evt.status),
                      background: `${statusColor(evt.status)}18`,
                      padding: mobile ? "3px 8px" : "4px 10px", borderRadius: 20, flexShrink: 0,
                    }}>
                      {statusLabel(evt.status)}
                    </div>
                  )}
                </button>
              ))}
            </div>
          ) : (
            /* 검색 결과가 없을 때의 빈 상태 화면 */
            <div style={{
              textAlign: "center", padding: "32px 0",
              display: "flex", flexDirection: "column", alignItems: "center", gap: 12,
            }}>
              <div style={{
                width: mobile ? 46 : 52, height: mobile ? 46 : 52, borderRadius: "50%", background: "#f5f5f5",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <SearchX size={mobile ? 20 : 24} color="#ccc" />
              </div>
              <div style={{ fontSize: mobile ? 14 : 15, fontWeight: 700, color: "#444", fontFamily: FONT }}>
                '{query.trim()}'에 대한 검색 결과가 없어요
              </div>
              <div style={{ fontSize: mobile ? 12 : 13, color: "#aaa", fontFamily: FONT, lineHeight: 1.5 }}>
                다른 키워드로 검색하거나, 아래 태그를 눌러보세요
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center", marginTop: 8 }}>
                {POPULAR_TAGS.map((tag) => (
                  <button
                    key={tag.label}
                    type="button"
                    onClick={() => { onClose(); onNavigate(tag.to); }}
                    style={{
                      padding: mobile ? "6px 13px" : "7px 16px", borderRadius: 999,
                      border: "1px solid #e5e7eb", background: "#fff",
                      fontSize: mobile ? 13 : 14, fontWeight: 600, color: "rgb(161,161,161)",
                      fontFamily: FONT, cursor: "pointer", transition: "all 0.15s",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "#f3f4f6"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "#fff"; }}
                  >
                    {tag.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* 기본 인기 태그 영역 */
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
          {POPULAR_TAGS.map((tag) => (
            <button
              key={tag.label}
              type="button"
              onClick={() => { onClose(); onNavigate(tag.to); }}
              style={{
                padding: mobile ? "6px 13px" : "7px 16px", borderRadius: 999,
                border: "1px solid #e5e7eb", background: "#fff",
                fontSize: mobile ? 13 : 14, fontWeight: 600, color: "rgb(161,161,161)",
                letterSpacing: "0px",
                fontFamily: FONT, cursor: "pointer",
                transition: "all 0.15s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "#f3f4f6"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "#fff"; }}
            >
              {tag.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

/* 사이트 공통 상단 헤더 본체다. */
function fmtDate(str) {
  if (!str) return "";
  const d = new Date(str), now = new Date();
  const diff = Math.floor((now - d) / 1000);
  if (diff < 60) return "방금";
  if (diff < 3600) return Math.floor(diff / 60) + "분 전";
  if (diff < 86400) return Math.floor(diff / 3600) + "시간 전";
  if (diff < 604800) return Math.floor(diff / 86400) + "일 전";
  return d.toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
}

function resolveNotificationTargetPath(targetType, targetId) {
  if (targetType === "EVENT") return "/event/current";
  if (targetType === "NOTICE" && targetId != null) {
    return `/community/notice/${targetId}`;
  }
  return null;
}

function getNotificationTargetPath(notification) {
  if (!notification) return null;
  // 일부 시스템 알림은 인박스 안에서만 확인해야 하므로 외부 이동을 막는다.
  if (notification.canNavigate === false) return null;
  return notification.targetPath || resolveNotificationTargetPath(notification.targetType, notification.targetId);
}

export default function PupooHeader() {
  const navigate = useNavigate();
  const { isAuthed, logout } = useAuth();
  const [activeMenu, setActiveMenu] = useState(null);
  const [scrolled, setScrolled] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifList, setNotifList] = useState([]);
  const [notifLoading, setNotifLoading] = useState(false);
  const [deletingInboxIds, setDeletingInboxIds] = useState([]);
  const [movingInboxIds, setMovingInboxIds] = useState([]);
  const notifRef = useRef(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [expandedMenuKey, setExpandedMenuKey] = useState(null);
  const [viewportWidth, setViewportWidth] = useState(() =>
    typeof window === "undefined" ? 1440 : window.innerWidth,
  );
  const [unreadCount, setUnreadCount] = useState(0);
  const unreadCountRef = useRef(0);
  const headerRef = useRef(null);
  const location = useLocation();
  const isHome = location.pathname === "/";
  const isMobile = viewportWidth < 768;
  const isTablet = viewportWidth >= 768 && viewportWidth < 1024;
  const isCompact = viewportWidth < 1024;
  const headerHeight = isMobile ? 72 : isTablet ? 72 : 92;
  const compactTopOffset = headerHeight;

  useEffect(() => {
    if (!isAuthed || !notifOpen) return undefined;

    let disposed = false;

    const loadNotifications = async () => {
      setNotifLoading(true);
      try {
        const data = await notificationApi.getInbox(0, 5);
        if (disposed) return;
        setNotifList(Array.isArray(data?.items) ? data.items : []);
      } catch {
        if (disposed) return;
        setNotifList([]);
      } finally {
        if (!disposed) setNotifLoading(false);
      }
    };

    loadNotifications();
    return () => {
      disposed = true;
    };
  }, [isAuthed, notifOpen]);

  const handleNotificationClick = async (notification) => {
    const targetPath = getNotificationTargetPath(notification);
    if (!targetPath || notification?.inboxId == null) return;
    try {
      const res = await notificationApi.click(notification.inboxId);
      setNotifList((prev) => prev.filter((item) => item.inboxId !== notification.inboxId));
      setUnreadCount((prev) => {
        const next = Math.max(0, (Number(prev) || 0) - 1);
        emitNotificationUnreadCount(next);
        return next;
      });
      const nextTargetPath =
        resolveNotificationTargetPath(res?.targetType, res?.targetId) || targetPath;
      if (nextTargetPath) navigate(nextTargetPath);
    } catch {
      // 헤더 알림 패널 안에서는 이동 실패를 조용히 무시한다.
    } finally {
      setNotifOpen(false);
    }
  };

  const handleNotificationDelete = async (notification) => {
    const inboxId = notification?.inboxId;
    if (inboxId == null || deletingInboxIds.includes(inboxId)) return;

    setDeletingInboxIds((prev) => [...prev, inboxId]);
    try {
      await notificationApi.delete(inboxId);
      setNotifList((prev) => prev.filter((item) => item.inboxId !== inboxId));
      setUnreadCount((prev) => {
        const next = Math.max(0, (Number(prev) || 0) - 1);
        emitNotificationUnreadCount(next);
        return next;
      });
    } catch {
      // 헤더 알림 패널 안에서는 삭제 실패를 조용히 무시한다.
    } finally {
      setDeletingInboxIds((prev) => prev.filter((id) => id !== inboxId));
    }
  };

  const handleNotificationMove = async (notification) => {
    const inboxId = notification?.inboxId;
    if (inboxId == null || movingInboxIds.includes(inboxId)) return;

    setMovingInboxIds((prev) => [...prev, inboxId]);
    try {
      await handleNotificationClick(notification);
    } finally {
      setMovingInboxIds((prev) => prev.filter((id) => id !== inboxId));
    }
  };

  // 헤더 인박스는 백엔드가 이동 가능하다고 내려준 알림에만 이동 버튼을 노출한다.

  /* 현재 스크롤 위치에 맞춰 헤더 스타일을 동기화한다. */
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const syncViewport = () => setViewportWidth(window.innerWidth);
    syncViewport();
    window.addEventListener("resize", syncViewport);
    return () => window.removeEventListener("resize", syncViewport);
  }, []);

  /* 폴링 콜백이 최신 값을 읽도록 읽지 않은 알림 수를 ref에도 동기화한다. */
  useEffect(() => {
    unreadCountRef.current = unreadCount;
  }, [unreadCount]);

  useEffect(() => {
    if (!isAuthed) {
      unreadCountRef.current = 0;
      setUnreadCount(0);
      return;
    }
    let disposed = false;
    const syncUnreadCount = async ({ forceEmit = false } = {}) => {
      try {
        const nextCount = Math.max(0, Number(await notificationApi.getUnreadCount()) || 0);
        if (disposed) return;
        const prevCount = unreadCountRef.current;
        unreadCountRef.current = nextCount;
        setUnreadCount(nextCount);
        if (forceEmit || prevCount !== nextCount) emitNotificationUnreadCount(nextCount);
      } catch {
        if (disposed) return;
        unreadCountRef.current = 0;
        setUnreadCount(0);
      }
    };
    syncUnreadCount({ forceEmit: true });
    const intervalId = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      syncUnreadCount();
    }, 5000);
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") syncUnreadCount();
    };
    const handleWindowFocus = () => syncUnreadCount();
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleWindowFocus);
    return () => {
      disposed = true;
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleWindowFocus);
    };
  }, [isAuthed]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const handleUnreadCountChange = (event) => {
      const nextCount = Number(event?.detail?.count);
      if (Number.isFinite(nextCount)) setUnreadCount(Math.max(0, nextCount));
    };
    window.addEventListener(NOTIFICATION_UNREAD_COUNT_EVENT, handleUnreadCountChange);
    return () => window.removeEventListener(NOTIFICATION_UNREAD_COUNT_EVENT, handleUnreadCountChange);
  }, []);

  /* 헤더 바깥을 클릭하면 열려 있는 플로팅 패널을 닫는다. */
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (headerRef.current && !headerRef.current.contains(e.target)) setActiveMenu(null);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  /* 라우트가 바뀌면 일시적인 헤더 패널 상태를 항상 초기화한다. */
  useEffect(() => {
    setActiveMenu(null);
    setSearchOpen(false);
    setMobileMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!isCompact) setMobileMenuOpen(false);
  }, [isCompact]);

  useEffect(() => {
    if (typeof document === "undefined") return undefined;
    const root = document.documentElement;
    root.style.setProperty("--pupoo-site-header-height", `${headerHeight}px`);
    root.style.setProperty("--pupoo-site-header-offset", `${compactTopOffset}px`);
    root.style.setProperty("--pupoo-site-quicknav-height", "0px");
    return () => {
      root.style.removeProperty("--pupoo-site-header-height");
      root.style.removeProperty("--pupoo-site-header-offset");
      root.style.removeProperty("--pupoo-site-quicknav-height");
    };
  }, [headerHeight, compactTopOffset]);

  const handleNavClick = (menuKey) => {
    setActiveMenu((prev) => (prev === menuKey ? null : menuKey));
    setSearchOpen(false);
    setMobileMenuOpen(false);
  };

  const handleMegaNavigate = (href) => {
    setActiveMenu(null);
    setSearchOpen(false);
    setMobileMenuOpen(false);
    navigate(href);
  };

  const useSolidMobileHeader = isMobile;
  const isWhiteMode = useSolidMobileHeader || !isHome || scrolled || activeMenu !== null || mobileMenuOpen;
  const isLight = !useSolidMobileHeader && isHome && !scrolled && !activeMenu;
  const textColor = isWhiteMode ? "#222" : "#fff";
  const iconColor = isWhiteMode ? "#222" : "#fff";
  const mobileActionIconStyle = {
    width: 36,
    height: 36,
    borderRadius: 8,
    border: "none",
    background: "none",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    color: textColor,
    textDecoration: "none",
    fontFamily: FONT,
    flexShrink: 0,
  };

  return (
    <>
      <style>{`
        @keyframes megaSlideDown {
          from { opacity: 0; transform: translateX(-50%) translateY(-6px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        @keyframes searchFadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes searchSlideDown {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .kakao-nav-btn {
          position: relative;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          height: auto;
          padding: 10px 20px;
          background: none;
          border: 1px solid transparent;
          border-radius: 999px;
          font-size: 17px;
          font-family: ${FONT};
          font-weight: 700;
          white-space: nowrap;
          letter-spacing: -0.02em;
          cursor: pointer;
          transition: all 0.2s ease;
          outline: none;
          line-height: 1;
          margin: 0;
        }
        .kakao-nav-btn.light {
          color: rgba(255,255,255,0.85);
        }
        .kakao-nav-btn.light:hover,
        .kakao-nav-btn.light.active {
          color: #fff;
          border-color: #fff;
        }
        .kakao-nav-btn.dark {
          color: #555;
        }
        .kakao-nav-btn.dark:hover {
          color: #333;
          background: #f0f0f0;
          border-color: #f0f0f0;
        }
        .kakao-nav-btn.dark.active {
          color: #fff;
          background: #222;
          border-color: #222;
        }
        .kakao-icon-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 40px;
          border-radius: 12px;
          background: none;
          border: none;
          cursor: pointer;
          transition: background-color 0.2s ease, transform 0.2s ease;
          text-decoration: none;
          position: relative;
          flex-shrink: 0;
        }
        .kakao-icon-btn:hover {
          background-color: rgba(0,0,0,0.06);
        }
        .kakao-icon-btn:active {
          background-color: rgba(0,0,0,0.10);
        }
        .kakao-icon-btn.light:hover {
          background-color: rgba(255,255,255,0.15);
        }
        /* 아이콘 버튼 아래에 뜨는 커스텀 툴팁 */
        .kakao-icon-btn .ktt {
          position: absolute;
          bottom: -36px;
          left: 50%;
          transform: translateX(-50%) translateY(4px);
          padding: 5px 12px;
          border-radius: 8px;
          background: #222;
          color: #fff;
          font-family: 'JeonjuCraftGothic', Pretendard, sans-serif;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: -0.02em;
          white-space: nowrap;
          pointer-events: none;
          opacity: 0;
          transition: opacity 0.2s ease, transform 0.2s ease;
          z-index: 9999;
        }
        .kakao-icon-btn.light .ktt {
          background: rgba(255,255,255,0.92);
          color: #222;
          box-shadow: 0 2px 12px rgba(0,0,0,0.12);
        }
        .kakao-icon-btn .ktt::before {
          content: '';
          position: absolute;
          top: -5px;
          left: 50%;
          transform: translateX(-50%);
          border-left: 5px solid transparent;
          border-right: 5px solid transparent;
          border-bottom: 5px solid #222;
        }
        .kakao-icon-btn.light .ktt::before {
          border-bottom-color: rgba(255,255,255,0.92);
        }
        .kakao-icon-btn:hover .ktt {
          opacity: 1;
          transform: translateX(-50%) translateY(0);
        }
        /* 카카오 상담 유도 버튼 */
        .kakao-cta {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 18px;
          border-radius: 999px;
          background: #90C450;
          color: #fff;
          font-family: 'JeonjuCraftGothic', Pretendard, sans-serif;
          font-size: 13px;
          font-weight: 700;
          letter-spacing: -0.02em;
          text-decoration: none;
          white-space: nowrap;
          transition: background 0.2s, transform 0.15s, box-shadow 0.2s;
          box-shadow: 0 2px 12px rgba(37,99,235,0.3);
          flex-shrink: 0;
          margin-right: 8px;
        }
        .kakao-cta:hover {
          background: #7ab33e;
          transform: scale(1.04);
          box-shadow: 0 4px 20px rgba(37,99,235,0.4);
        }
        .kakao-cta:active {
          transform: scale(0.97);
        }
        .kakao-cta.light {
          background: #fff;
          color: #90C450;
          box-shadow: 0 2px 12px rgba(0,0,0,0.1);
        }
        .kakao-cta.light:hover {
          background: #f0f4ff;
          box-shadow: 0 4px 20px rgba(0,0,0,0.15);
        }
        .pupoo-mobile-only {
          display: none;
        }
        .pupoo-desktop-only {
          display: flex;
        }
        @media (max-width: 1023px) {
          .pupoo-mobile-only {
            display: flex;
          }
          .pupoo-desktop-only {
            display: none !important;
          }
          .kakao-icon-btn .ktt {
            display: none;
          }
          .kakao-icon-btn {
            width: 38px;
            height: 38px;
            border-radius: 10px;
          }
        }
        @media (max-width: 767px) {
          .kakao-icon-btn {
            width: 34px;
            height: 34px;
            border-radius: 9px;
          }
        }

        /* 알림 패널 */
        .notif-badge {
          position: absolute;
          top: 4px;
          right: 4px;
          min-width: 16px;
          height: 16px;
          padding: 0 4px;
          border-radius: 999px;
          background: #ef4444;
          color: #fff;
          font-size: 10px;
          font-weight: 700;
          line-height: 16px;
          text-align: center;
          pointer-events: none;
        }
        .notif-panel {
          position: absolute;
          top: calc(100% + 8px);
          right: 0;
          width: 320px;
          max-height: 400px;
          overflow-y: auto;
          background: #fff;
          border-radius: 16px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06);
          border: 1px solid rgba(0,0,0,0.06);
          z-index: 9999;
          animation: notifSlideDown 0.2s ease;
        }
        @keyframes notifSlideDown {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .notif-panel-head {
          padding: 16px 20px 12px;
          font-family: ${FONT};
          font-size: 15px;
          font-weight: 700;
          color: #222;
          border-bottom: 1px solid #f0f0f0;
          letter-spacing: -0.02em;
        }
        .notif-empty {
          padding: 32px 20px;
          text-align: center;
          font-family: ${FONT};
          font-size: 13px;
          color: #999;
        }
        .notif-item {
          display: flex;
          flex-direction: column;
          gap: 8px;
          width: 100%;
          padding: 14px 20px;
          background: #fff;
          border: none;
          border-bottom: 1px solid #f5f5f5;
          text-align: left;
          transition: background 0.15s;
          font-family: ${FONT};
        }
        .notif-item:hover {
          background: #fafafa;
        }
        .notif-item:last-of-type {
          border-bottom: none;
        }
        .notif-item-top {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 10px;
        }
        .notif-item-main {
          min-width: 0;
          flex: 1;
        }
        .notif-item-title {
          font-size: 13px;
          font-weight: 600;
          color: #333;
          line-height: 1.4;
        }
        .notif-item-content {
          font-size: 12px;
          color: #777;
          line-height: 1.4;
        }
        .notif-item-date {
          font-size: 11px;
          color: #aaa;
          margin-top: 2px;
        }
        .notif-item-actions {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          flex-shrink: 0;
        }
        .notif-action-btn {
          border: none;
          border-radius: 8px;
          padding: 6px 10px;
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
          transition: background 0.15s ease, color 0.15s ease;
        }
        .notif-action-btn.move {
          background: #f0f9e4;
          color: #7ab33e;
        }
        .notif-action-btn.move:hover:not(:disabled) {
          background: #e3f3cf;
        }
        .notif-action-btn.delete {
          background: #f8f9fc;
          color: #9ca3af;
        }
        .notif-action-btn.delete:hover:not(:disabled) {
          background: #fee2e2;
          color: #dc2626;
        }
        .notif-action-btn:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }
        .notif-footer {
          padding: 10px 20px;
          text-align: center;
          font-size: 11px;
          color: #bbb;
          border-top: 1px solid #f0f0f0;
        }

        /* 모바일 알림 패널 */
        @media (max-width: 1023px) {
          .notif-panel {
            position: fixed;
            top: 56px;
            left: 12px;
            right: 12px;
            width: auto;
            max-height: calc(100vh - 80px);
            border-radius: 14px;
          }
        }
      `}</style>

      <div ref={headerRef} style={{ position: "relative", zIndex: 3000 }}>
        {/* 헤더 바 */}
        <header
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: headerHeight,
            display: "flex",
            alignItems: "center",
            zIndex: 1002,
            backgroundColor: isWhiteMode ? "#fff" : "transparent",
            borderBottom: isWhiteMode ? "1px solid #edf1f5" : "none",
            transition: "background-color 0.3s ease",
          }}
        >
          <div
            style={{
              maxWidth: 1712,
              width: "100%",
              margin: "0 auto",
              padding: isMobile ? "0 12px" : isTablet ? "0 20px" : "0 40px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              height: "100%",
            }}
          >
            {/* 왼쪽 로고 영역 */}
            <Link
              to="/"
              style={{
                display: "flex",
                alignItems: "center",
                textDecoration: "none",
                flexShrink: 0,
                marginRight: isCompact ? 0 : 40,
              }}
            >
              <img
                src={isLight ? "/logo_white7.png" : "/logo_olive7.png"}
                alt="Pupoo"
                style={{
                  height: isMobile ? 26 : isTablet ? 28 : 34,
                  width: "auto",
                  display: "block",
                }}
              />
            </Link>

            {/* 중앙 네비게이션 버튼 */}
            <nav
              className="pupoo-desktop-only"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flex: 1,
                height: "100%",
                columnGap: 52,
              }}
            >
              {navItems.map((item) => (
                <button
                  key={item.menuKey || item.href}
                  className={`kakao-nav-btn ${isLight ? "light" : "dark"} ${activeMenu === item.menuKey ? "active" : ""}`}
                  onClick={() => item.href ? handleMegaNavigate(item.href) : handleNavClick(item.menuKey)}
                  type="button"
                >
                  {item.label}
                </button>
              ))}
            </nav>

            {/* 오른쪽 아이콘 묶음 */}
            <div
              className="pupoo-desktop-only"
              style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}
            >
              {!isAuthed ? (
                <>
                  <Link
                    to="/auth/login"
                    className={`kakao-icon-btn ${isLight ? "light" : ""}`}
                  >
                    <LogIn size={20} color={iconColor} strokeWidth={1.8} />
                    <span className="ktt">로그인</span>
                  </Link>
                  <Link
                    to="/auth/join/joinselect"
                    className={`kakao-icon-btn ${isLight ? "light" : ""}`}
                  >
                    <UserPlus size={20} color={iconColor} strokeWidth={1.8} />
                    <span className="ktt">회원가입</span>
                  </Link>
                </>
              ) : (
                <>
                  {/* 알림 벨 (데스크탑) */}
                  <div ref={notifRef} style={{ position: "relative" }}>
                    <button
                      className={`kakao-icon-btn ${isLight ? "light" : ""}`}
                      onClick={() => setNotifOpen((v) => !v)}
                      type="button"
                      aria-label="알림"
                      style={{ position: "relative" }}
                    >
                      <Bell size={20} color={iconColor} strokeWidth={1.8} />
                      <span className="ktt">알림</span>
                      {unreadCount > 0 && (
                        <span className="notif-badge">{unreadCount > 99 ? "99+" : unreadCount}</span>
                      )}
                    </button>
                    {notifOpen && (
                      <div className="notif-panel">
                        <div className="notif-panel-head">알림</div>
                        {notifLoading ? (
                          <div className="notif-empty">불러오는 중…</div>
                        ) : notifList.length === 0 ? (
                          <div className="notif-empty">새 알림이 없습니다.</div>
                        ) : (
                          notifList.map((n) => (
                            <div key={n.inboxId} className="notif-item">
                              <div className="notif-item-top">
                                <div className="notif-item-main">
                                  <div className="notif-item-title">{n.title}</div>
                                  <div className="notif-item-content">{n.content}</div>
                                  <div className="notif-item-date">{fmtDate(n.receivedAt)}</div>
                                </div>
                                <div className="notif-item-actions">
                                  {getNotificationTargetPath(n) ? (
                                    <button
                                      type="button"
                                      className="notif-action-btn move"
                                      onClick={() => handleNotificationMove(n)}
                                      disabled={movingInboxIds.includes(n.inboxId) || deletingInboxIds.includes(n.inboxId)}
                                    >
                                      {movingInboxIds.includes(n.inboxId) ? "이동 중" : "이동"}
                                    </button>
                                  ) : null}
                                  <button
                                    type="button"
                                    className="notif-action-btn delete"
                                    onClick={() => handleNotificationDelete(n)}
                                    disabled={movingInboxIds.includes(n.inboxId) || deletingInboxIds.includes(n.inboxId)}
                                  >
                                    {deletingInboxIds.includes(n.inboxId) ? "삭제 중" : "삭제"}
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                        <div className="notif-footer">최근 5개만 표시됩니다</div>
                      </div>
                    )}
                  </div>

                  <Link
                    to="/mypage"
                    className={`kakao-icon-btn ${isLight ? "light" : ""}`}
                  >
                    <UserCircle size={20} color={iconColor} strokeWidth={1.8} />
                    <span className="ktt">마이페이지</span>
                  </Link>
                  <button
                    className={`kakao-icon-btn ${isLight ? "light" : ""}`}
                    onClick={() => {
                      logout();
                      navigate("/", { replace: true });
                    }}
                    type="button"
                  >
                    <LogOut size={20} color={iconColor} strokeWidth={1.8} />
                    <span className="ktt">로그아웃</span>
                  </button>
                </>
              )}
            </div>

            <div
              className="pupoo-mobile-only"
              style={{
                alignItems: "center",
                gap: 6,
                flexShrink: 0,
              }}
            >
              {/* 모바일 알림 버튼 */}
              {isAuthed && (
                <button
                  type="button"
                  style={{ ...mobileActionIconStyle, cursor: "pointer", position: "relative" }}
                  aria-label="알림"
                  onClick={() => { setNotifOpen(v => !v); setActiveMenu(null); setMobileMenuOpen(false); }}
                >
                  <Bell size={20} color={iconColor} strokeWidth={1.8} />
                  {unreadCount > 0 && <span className="notif-badge">{unreadCount > 99 ? "99+" : unreadCount}</span>}
                </button>
              )}
              {isAuthed ? (
                <Link
                  to="/mypage"
                  style={mobileActionIconStyle}
                  aria-label="마이페이지"
                  title="마이페이지"
                  onClick={() => {
                    setActiveMenu(null);
                    setSearchOpen(false);
                    setMobileMenuOpen(false);
                  }}
                >
                  <UserCircle size={20} color={iconColor} strokeWidth={1.8} />
                </Link>
              ) : (
                <Link
                  to="/auth/login"
                  style={mobileActionIconStyle}
                  aria-label="로그인"
                  title="로그인"
                  onClick={() => {
                    setActiveMenu(null);
                    setSearchOpen(false);
                    setMobileMenuOpen(false);
                  }}
                >
                  <LogIn size={20} color={iconColor} strokeWidth={1.9} />
                </Link>
              )}
              <button
                type="button"
                style={{ ...mobileActionIconStyle, cursor: "pointer" }}
                aria-label="전체 메뉴"
                title="전체 메뉴"
                onClick={() => {
                  setMobileMenuOpen((v) => !v);
                  setActiveMenu(null);
                  setSearchOpen(false);
                }}
              >
                {mobileMenuOpen
                  ? <X size={20} color={iconColor} strokeWidth={1.8} />
                  : <Menu size={20} color={iconColor} strokeWidth={1.8} />
                }
              </button>
            </div>
          </div>
        </header>

        {/* 모바일 알림 패널 */}
        {notifOpen && isMobile && (
          <div style={{ position: "fixed", inset: 0, zIndex: 9997 }} onClick={() => setNotifOpen(false)} />
        )}
        {notifOpen && isMobile && (
          <div className="notif-panel" style={{ zIndex: 9998 }}>
            <div className="notif-panel-head">알림</div>
            {notifLoading ? (
              <div className="notif-empty">불러오는 중...</div>
            ) : notifList.length === 0 ? (
              <div className="notif-empty">새 알림이 없어요</div>
            ) : (
              notifList.map((n) => (
                <div key={n.inboxId} className="notif-item">
                  <div className="notif-item-top">
                    <div className="notif-item-main">
                      <span className="notif-item-title">{n.title}</span>
                      {n.content && <span className="notif-item-content">{n.content}</span>}
                      <span className="notif-item-date">{fmtDate(n.receivedAt)}</span>
                    </div>
                    <div className="notif-item-actions">
                      {getNotificationTargetPath(n) ? (
                        <button
                          type="button"
                          className="notif-action-btn move"
                          onClick={() => handleNotificationMove(n)}
                          disabled={movingInboxIds.includes(n.inboxId) || deletingInboxIds.includes(n.inboxId)}
                        >
                          {movingInboxIds.includes(n.inboxId) ? "이동 중" : "이동"}
                        </button>
                      ) : null}
                      <button
                        type="button"
                        className="notif-action-btn delete"
                        onClick={() => handleNotificationDelete(n)}
                        disabled={movingInboxIds.includes(n.inboxId) || deletingInboxIds.includes(n.inboxId)}
                      >
                        {deletingInboxIds.includes(n.inboxId) ? "삭제 중" : "삭제"}
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
            <div className="notif-footer">최근 5개만 표시됩니다</div>
          </div>
        )}

        {/* 메가 메뉴 드롭다운 카드 */}

        {!isCompact && activeMenu && megaMenuData[activeMenu] && (
          <DropdownCard
            menuData={megaMenuData[activeMenu]}
            onNavigate={handleMegaNavigate}
            topOffset={headerHeight}
          />
        )}
        {isCompact && mobileMenuOpen && (
          <div
            style={{
              position: "fixed",
              top: headerHeight,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 1001,
              background: "#fff",
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              animation: "searchSlideDown 0.18s ease",
              paddingBottom: "env(safe-area-inset-bottom, 0px)",
            }}
          >
            {/* 대분류 아코디언 */}
            <div style={{ flex: 1 }}>
              {navItems.map((item) => {
                if (item.href) {
                  return (
                    <div key={item.href} style={{ borderBottom: "1px solid #f2f2f2" }}>
                      <button
                        type="button"
                        onClick={() => handleMegaNavigate(item.href)}
                        style={{
                          width: "100%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "22px 24px",
                          background: "none",
                          border: "none",
                          fontSize: 20,
                          fontWeight: 500,
                          color: "#111",
                          fontFamily: FONT,
                          cursor: "pointer",
                          textAlign: "left",
                        }}
                      >
                        {item.label}
                        <ChevronRight size={18} color="#bbb" strokeWidth={1.5} />
                      </button>
                    </div>
                  );
                }

                const isExpanded = expandedMenuKey === item.menuKey;
                const menu = megaMenuData[item.menuKey];
                return (
                  <div key={item.menuKey} style={{ borderBottom: "1px solid #f2f2f2" }}>
                    <button
                      type="button"
                      onClick={() => setExpandedMenuKey(isExpanded ? null : item.menuKey)}
                      style={{
                        width: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "22px 24px",
                        background: "none",
                        border: "none",
                        fontSize: 20,
                        fontWeight: 500,
                        color: "#111",
                        fontFamily: FONT,
                        cursor: "pointer",
                        textAlign: "left",
                      }}
                    >
                      {item.label}
                      <ChevronDown
                        size={18}
                        color="#bbb"
                        strokeWidth={1.5}
                        style={{
                          transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
                          transition: "transform 0.2s ease",
                          flexShrink: 0,
                        }}
                      />
                    </button>
                    {isExpanded && (
                      <div style={{ padding: "0 24px 16px" }}>
                        {menu.columns.map((col, ci) => (
                          <div key={ci} style={{ marginBottom: 12 }}>
                            {col.title && (
                              <div style={{
                                fontSize: 11, fontWeight: 600, color: "#bbb",
                                fontFamily: FONT, marginBottom: 6, letterSpacing: "0.06em",
                                textTransform: "uppercase",
                              }}>
                                {col.title}
                              </div>
                            )}
                            <div style={{ display: "flex", flexDirection: "column" }}>
                              {col.items.map((menuItem) => (
                                <button
                                  key={menuItem.href}
                                  type="button"
                                  onClick={() => handleMegaNavigate(menuItem.href)}
                                  style={{
                                    border: "none", background: "none",
                                    padding: "9px 0", textAlign: "left",
                                    fontSize: 15, fontWeight: 400,
                                    color: "#444", fontFamily: FONT, cursor: "pointer",
                                  }}
                                >
                                  {menuItem.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* 하단 로그인/마이페이지 */}
            <div style={{ borderTop: "1px solid #f0f0f0", padding: "8px 0" }}>
              {!isAuthed ? (
                <>
                  <Link
                    to="/auth/login"
                    onClick={() => setMobileMenuOpen(false)}
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "18px 24px", textDecoration: "none",
                      color: "#111", fontSize: 16, fontWeight: 500, fontFamily: FONT,
                    }}
                  >
                    로그인
                    <ChevronRight size={16} color="#ccc" strokeWidth={1.5} />
                  </Link>
                  <Link
                    to="/auth/join/joinselect"
                    onClick={() => setMobileMenuOpen(false)}
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "18px 24px", textDecoration: "none",
                      color: "#90C450", fontSize: 16, fontWeight: 500, fontFamily: FONT,
                    }}
                  >
                    회원가입
                    <ChevronRight size={16} color="#90C450" strokeWidth={1.5} />
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    to="/mypage"
                    onClick={() => setMobileMenuOpen(false)}
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "18px 24px", textDecoration: "none",
                      color: "#111", fontSize: 16, fontWeight: 500, fontFamily: FONT,
                    }}
                  >
                    마이페이지
                    <ChevronRight size={16} color="#ccc" strokeWidth={1.5} />
                  </Link>
                  <button
                    type="button"
                    onClick={() => { logout(); setMobileMenuOpen(false); navigate("/", { replace: true }); }}
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      width: "100%", padding: "18px 24px",
                      border: "none", background: "none", textAlign: "left",
                      color: "#888", fontSize: 16, fontWeight: 500, fontFamily: FONT, cursor: "pointer",
                    }}
                  >
                    로그아웃
                    <ChevronRight size={16} color="#ccc" strokeWidth={1.5} />
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* 검색 패널 */}
        {searchOpen && (
          <SearchPanel
            onClose={() => setSearchOpen(false)}
            onSearch={(keyword) => {
              setSearchOpen(false);
              navigate(`/event/current?search=${encodeURIComponent(keyword)}`);
            }}
            onNavigate={(path) => { setSearchOpen(false); navigate(path); }}
            topOffset={compactTopOffset}
            compact={isCompact}
            mobile={isMobile}
          />
        )}

        {/* 헤더 패널이 열렸을 때 아래를 덮는 배경막 */}
        {(activeMenu || searchOpen || mobileMenuOpen) && (
          <div
            onClick={() => {
              setActiveMenu(null);
              setSearchOpen(false);
              setMobileMenuOpen(false);
            }}
            style={{
              position: "fixed",
              top: compactTopOffset,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0,0,0,0.35)",
              zIndex: 1000,
            }}
          />
        )}
      </div>
    </>
  );
}


