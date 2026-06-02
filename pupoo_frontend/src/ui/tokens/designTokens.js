/* ═══════════════════════════════════════════════
   디자인 토큰 — 다크 그레이 + 다홍 주조색
   ═══════════════════════════════════════════════ */
const ds = {
  bg: "#2A2B3A",
  card: "#32334A",
  sidebar: "#1E1F2E",
  sideHover: "rgba(255,255,255,0.07)",
  sideActive: "rgba(255,255,255,0.12)",

  brand: "#E8505B",
  brandSoft: "rgba(232,80,91,0.14)",
  brandDark: "#D43F4A",
  green: "#22C55E",
  greenSoft: "rgba(34,197,94,0.14)",
  red: "#EF4444",
  redSoft: "rgba(239,68,68,0.14)",
  amber: "#F59E0B",
  amberSoft: "rgba(245,158,11,0.14)",
  violet: "#8B5CF6",
  violetSoft: "rgba(139,92,246,0.14)",
  sky: "#0EA5E9",
  skySoft: "rgba(14,165,233,0.14)",

  ink: "#EDEEF2",
  ink2: "#C0C1CC",
  ink3: "#9496A6",
  ink4: "#6B6D80",
  inkW: "#FFFFFF",
  inkWD: "rgba(255,255,255,0.70)",
  inkWG: "rgba(255,255,255,0.40)",

  line: "rgba(255,255,255,0.10)",
  lineSoft: "rgba(255,255,255,0.05)",
  lineD: "rgba(255,255,255,0.08)",

  sh: "0 1px 3px rgba(0,0,0,0.15)",
  sh2: "0 4px 20px rgba(0,0,0,0.25)",
  sh3: "0 16px 48px rgba(0,0,0,0.35)",

  r: 14,
  rs: 8,
  rx: 18,
  ff: "'A2z', 'Pretendard Variable', -apple-system, 'Noto Sans KR', sans-serif",
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
  active: { l: "진행중", c: "#22C55E", bg: ds.greenSoft },
  pending: { l: "대기", c: "#F59E0B", bg: ds.amberSoft },
  ended: { l: "종료", c: ds.ink4, bg: ds.lineSoft },
  archived: { l: "보관", c: ds.ink4, bg: ds.lineSoft },
  approved: { l: "승인", c: "#22C55E", bg: ds.greenSoft },
  cancelled: { l: "취소", c: ds.red, bg: ds.redSoft },
  paid: { l: "결제완료", c: "#22C55E", bg: ds.greenSoft },
  unpaid: { l: "미결제", c: "#F59E0B", bg: ds.amberSoft },
  refunded: { l: "환불", c: ds.red, bg: ds.redSoft },
  sent: { l: "발송완료", c: "#22C55E", bg: ds.greenSoft },
  draft: { l: "임시저장", c: "#F59E0B", bg: ds.amberSoft },
};

/* 혼잡도 계산 */
export const cong = (p) =>
  p >= 80
    ? { c: ds.red, bg: ds.redSoft, t: "혼잡" }
    : p >= 50
      ? { c: ds.amber, bg: ds.amberSoft, t: "보통" }
      : { c: ds.green, bg: ds.greenSoft, t: "여유" };
