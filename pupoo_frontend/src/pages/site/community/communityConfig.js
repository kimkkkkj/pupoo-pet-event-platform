export const COMMUNITY_CATEGORIES = [
  { label: "공지사항", path: "/community/notice" },
  { label: "자유게시판", path: "/community/freeboard" },
  { label: "정보게시판", path: "/community/info" },
  { label: "행사후기", path: "/community/review" },
  { label: "질문/답변", path: "/community/qna" },
  { label: "자주묻는질문", path: "/community/faq" },
];

const BADGE_BASE_STYLE = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 5,
  padding: "5px 14px",
  borderRadius: 999,
  fontSize: 13,
  fontWeight: 600,
  lineHeight: 1,
  flexShrink: 0,
  letterSpacing: -0.1,
};

export const BOARD_BADGES = {
  NOTICE: {
    text: "공지",
    icon: "Megaphone",
    color: "#b91c1c",
    background: "#fef2f2",
    border: "#fecaca",
  },
  FREEBOARD: {
    text: "자유",
    icon: "MessageCircle",
    color: "#90C450",
    background: "#E6F7F2",
    border: "#CCF0E4",
  },
  REVIEW: {
    text: "후기",
    icon: "Star",
    color: "#d97706",
    background: "#fffbeb",
    border: "#fde68a",
  },
  QNA: {
    text: "Q&A",
    icon: "HelpCircle",
    color: "#7c3aed",
    background: "#f5f3ff",
    border: "#ddd6fe",
  },
  FAQ: {
    text: "FAQ",
    icon: "BookOpen",
    color: "#9333ea",
    background: "#faf5ff",
    border: "#e9d5ff",
  },
  INFO: {
    text: "정보",
    icon: "Lightbulb",
    color: "#0891b2",
    background: "#ecfeff",
    border: "#a5f3fc",
  },
};

export const NOTICE_SCOPE_BADGES = {
  ALL: {
    label: "전체",
    compactLabel: "전체",
    icon: "Globe",
    color: "#90C450",
    background: "#E6F7F2",
    borderColor: "#CCF0E4",
  },
  GLOBAL: {
    label: "전체",
    compactLabel: "전체",
    icon: "Globe",
    color: "#90C450",
    background: "#E6F7F2",
    borderColor: "#CCF0E4",
  },
  EVENT: {
    label: "행사",
    compactLabel: "행사",
    icon: "PartyPopper",
    color: "#d97706",
    background: "#fffbeb",
    borderColor: "#fde68a",
  },
};

export function getBoardBadge(type) {
  const badge = BOARD_BADGES[type] || BOARD_BADGES.INFO;
  return {
    text: badge.text,
    label: badge.text,
    shortLabel: badge.text,
    icon: badge.icon,
    color: badge.color,
    background: badge.background,
    borderColor: badge.border,
    style: {
      ...BADGE_BASE_STYLE,
      color: badge.color,
      background: badge.background,
      border: `1px solid ${badge.border}`,
    },
  };
}

export function getNoticeScopeBadge(scope) {
  const normalized = String(scope || "").toUpperCase();
  if (normalized === "EVENT") {
    return NOTICE_SCOPE_BADGES.EVENT;
  }
  return NOTICE_SCOPE_BADGES.ALL || NOTICE_SCOPE_BADGES.GLOBAL;
}
