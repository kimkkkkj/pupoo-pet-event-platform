/* ═══════════════════════════════════════════════
   디자인 토큰 — 차콜 배경 + 블루 주조색 (관리자)
   면은 밝기 단계로만 구분하고, 색은 의미(주요 동작·상태)에만 쓴다.
   ═══════════════════════════════════════════════ */
const ds = {
  bg: "#181C20",
  bgSoft: "#1D2227",
  card: "#1F242A",
  cardHover: "#252B32",
  sidebar: "#13161A",
  sideHover: "rgba(255,255,255,0.05)",
  sideActive: "rgba(4,89,247,0.16)",

  brand: "#0459F7",
  brandSoft: "rgba(4,89,247,0.16)",
  brandDark: "#0348C9",
  brandText: "#5B95FF",
  green: "#22C55E",
  greenSoft: "rgba(34,197,94,0.14)",
  red: "#F0524A",
  redSoft: "rgba(240,82,74,0.14)",
  amber: "#F5A524",
  amberSoft: "rgba(245,165,36,0.14)",
  violet: "#8B7CF6",
  violetSoft: "rgba(139,124,246,0.14)",
  sky: "#38BDF8",
  skySoft: "rgba(56,189,248,0.14)",

  ink: "#EEF1F4",
  ink2: "#C3C9D0",
  ink3: "#98A1AB",
  ink4: "#6E7781",
  inkW: "#FFFFFF",
  inkWD: "rgba(255,255,255,0.72)",
  inkWG: "rgba(255,255,255,0.42)",

  line: "rgba(255,255,255,0.08)",
  lineSoft: "rgba(255,255,255,0.05)",
  lineD: "rgba(255,255,255,0.06)",

  sh: "0 1px 2px rgba(0,0,0,0.20)",
  sh2: "0 8px 24px rgba(0,0,0,0.28)",
  sh3: "0 24px 64px rgba(0,0,0,0.45)",

  r: 12,
  rs: 8,
  rx: 16,
  ff: "'Pretendard Variable', 'Pretendard', -apple-system, 'Noto Sans KR', sans-serif",
};

export default ds;

/* 공통 카드 스타일 */
export const cardStyle = {
  background: ds.card,
  borderRadius: ds.r,
  padding: 22,
  border: `1px solid ${ds.line}`,
};

/* 상태 맵 */
export const statusMap = {
  active: { l: "진행중", c: ds.green, bg: ds.greenSoft },
  pending: { l: "대기", c: ds.amber, bg: ds.amberSoft },
  ended: { l: "종료", c: ds.ink3, bg: ds.lineSoft },
  archived: { l: "보관", c: ds.ink3, bg: ds.lineSoft },
  approved: { l: "승인", c: ds.green, bg: ds.greenSoft },
  cancelled: { l: "취소", c: ds.red, bg: ds.redSoft },
  paid: { l: "결제완료", c: ds.green, bg: ds.greenSoft },
  unpaid: { l: "미결제", c: ds.amber, bg: ds.amberSoft },
  refunded: { l: "환불", c: ds.red, bg: ds.redSoft },
  sent: { l: "발송완료", c: ds.green, bg: ds.greenSoft },
  draft: { l: "임시저장", c: ds.amber, bg: ds.amberSoft },
};

/* 혼잡도 계산 */
export const cong = (p) =>
  p >= 80
    ? { c: ds.red, bg: ds.redSoft, t: "혼잡" }
    : p >= 50
      ? { c: ds.amber, bg: ds.amberSoft, t: "보통" }
      : { c: ds.green, bg: ds.greenSoft, t: "여유" };
