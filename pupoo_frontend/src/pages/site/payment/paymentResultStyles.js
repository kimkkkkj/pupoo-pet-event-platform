// 결제 완료·환불 신청 화면 공용 스타일 (결제 화면과 같은 톤)
export const paymentResultStyles = `
  .pr { min-height: 100vh; background: #f8f9fc; font-family: 'Pretendard Variable', 'Pretendard', 'Noto Sans KR', sans-serif; color: #111827; }
  .pr *, .pr *::before, .pr *::after { box-sizing: border-box; }
  .pr-wrap { width: min(560px, calc(100% - 32px)); margin: 0 auto; padding: calc(var(--pupoo-site-header-offset, 92px) + 36px) 0 88px; }

  .pr-card { background: #fff; border-radius: 28px; overflow: hidden; box-shadow: 0 0 0 1px rgba(15, 23, 42, .05), 0 24px 60px rgba(15, 23, 42, .08); }
  .pr-head { padding: 36px 32px 24px; text-align: center; }
  .pr-icon { width: 76px; height: 76px; margin: 0 auto 18px; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
  .pr-icon.ok { background: #ecfdf3; color: #16a34a; animation: pr-pop .45s cubic-bezier(.2, 1.4, .4, 1); }
  .pr-icon.warn { background: #fff7ed; color: #ea580c; }
  .pr-icon.fail { background: #fef2f2; color: #dc2626; }
  .pr-icon.wait { background: #f4f8ee; color: #6FA436; }
  @keyframes pr-pop { from { transform: scale(.4); opacity: 0; } to { transform: scale(1); opacity: 1; } }
  .pr-spin { animation: pr-spin 1s linear infinite; }
  @keyframes pr-spin { to { transform: rotate(360deg); } }
  .pr-title { margin: 0 0 8px; font-size: 26px; font-weight: 900; letter-spacing: -0.4px; word-break: keep-all; }
  .pr-sub { margin: 0; font-size: 15px; line-height: 1.6; color: #6b7280; word-break: keep-all; }

  /* 행사 정보 줄 */
  .pr-event { display: flex; align-items: center; gap: 14px; margin: 0 24px; padding: 14px; border-radius: 18px; background: #f8f9fc; }
  .pr-poster { width: 56px; height: 72px; border-radius: 10px; object-fit: cover; background: #e5e7eb; flex-shrink: 0; }
  .pr-event-name { font-size: 16.5px; font-weight: 800; color: #111827; word-break: keep-all; }
  .pr-event-sub { margin-top: 4px; font-size: 13.5px; color: #6b7280; }

  /* 영수증 */
  .pr-receipt { position: relative; margin: 20px 0 0; padding: 20px 32px 8px; border-top: 2px dashed #e5e7eb; }
  .pr-receipt::before, .pr-receipt::after { content: ""; position: absolute; top: -13px; width: 24px; height: 24px; border-radius: 50%; background: #f8f9fc; }
  .pr-receipt::before { left: -12px; }
  .pr-receipt::after { right: -12px; }
  .pr-row { display: flex; justify-content: space-between; gap: 16px; padding: 9px 0; font-size: 15px; }
  .pr-row dt { color: #9ca3af; font-weight: 600; }
  .pr-row dd { margin: 0; color: #111827; font-weight: 700; text-align: right; word-break: break-all; }
  .pr-row dd.mono { font-variant-numeric: tabular-nums; }
  .pr-total { display: flex; justify-content: space-between; align-items: baseline; margin-top: 8px; padding: 16px 0 14px; border-top: 1px solid #f1f3f5; }
  .pr-total span { font-size: 16px; font-weight: 800; color: #374151; }
  .pr-total strong { font-size: 30px; font-weight: 900; letter-spacing: -0.5px; }
  .pr-total strong small { font-size: 17px; font-weight: 700; margin-left: 2px; }

  .pr-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; padding: 12px 24px 26px; }
  .pr-actions.single { grid-template-columns: 1fr; }
  .pr-btn {
    height: 56px; border-radius: 14px; border: none; cursor: pointer; font-family: inherit; font-size: 16px; font-weight: 800;
    display: inline-flex; align-items: center; justify-content: center; gap: 8px; transition: background .15s, transform .15s;
  }
  .pr-btn:hover:not(:disabled) { transform: translateY(-1px); }
  .pr-btn:disabled { opacity: .55; cursor: not-allowed; transform: none; }
  .pr-btn.primary { background: #6FA436; color: #fff; box-shadow: 0 10px 22px rgba(111, 164, 54, .26); }
  .pr-btn.primary:hover:not(:disabled) { background: #5E8F2A; }
  .pr-btn.danger { background: #dc2626; color: #fff; box-shadow: 0 10px 22px rgba(220, 38, 38, .22); }
  .pr-btn.danger:hover:not(:disabled) { background: #b91c1c; }
  .pr-btn.outline { background: #fff; color: #374151; border: 1.5px solid #e5e7eb; }
  .pr-btn.outline:hover:not(:disabled) { border-color: #cbd5e1; color: #111827; }
  .pr-link { display: block; margin: 18px auto 0; border: none; background: none; font-family: inherit; font-size: 14px; font-weight: 700; color: #6b7280; cursor: pointer; text-decoration: underline; text-underline-offset: 3px; }
  .pr-link:hover { color: #111827; }

  .pr-error { margin: 0 24px 4px; padding: 12px 14px; border-radius: 12px; background: #fef2f2; border: 1px solid #fecaca; color: #b91c1c; font-size: 14px; font-weight: 600; line-height: 1.6; }

  /* 환불 신청 */
  .pr-section { padding: 22px 28px 0; }
  .pr-section-title { display: flex; align-items: center; gap: 8px; margin: 0 0 12px; font-size: 16px; font-weight: 800; }
  .pr-section-title::before { content: ""; width: 4px; height: 16px; border-radius: 2px; background: #90C450; }
  .pr-policy { display: flex; gap: 12px; padding: 14px 16px; border-radius: 14px; font-size: 14px; line-height: 1.65; }
  .pr-policy svg { flex-shrink: 0; margin-top: 2px; }
  .pr-policy.auto { background: #f4f8ee; color: #3f6a17; }
  .pr-policy.manual { background: #fff7ed; color: #9a3412; }
  .pr-policy b { font-weight: 800; }
  .pr-reasons { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .pr-reason {
    display: flex; align-items: center; gap: 10px; min-height: 52px; padding: 0 16px; border-radius: 14px; border: 1.5px solid #e5e7eb;
    background: #fff; cursor: pointer; font-family: inherit; font-size: 15px; font-weight: 700; color: #374151; text-align: left;
  }
  .pr-reason:hover { border-color: #cbd5e1; }
  .pr-reason.on { border-color: #6FA436; background: #f4f8ee; color: #3f6a17; }
  .pr-radio { width: 20px; height: 20px; border-radius: 50%; border: 2px solid #d1d5db; flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
  .pr-reason.on .pr-radio { border-color: #6FA436; }
  .pr-reason.on .pr-radio::after { content: ""; width: 10px; height: 10px; border-radius: 50%; background: #6FA436; }
  .pr-textarea {
    width: 100%; min-height: 96px; margin-top: 10px; padding: 14px 16px; border-radius: 14px; border: 1.5px solid #e5e7eb; background: #fafbfa;
    font-family: inherit; font-size: 15px; line-height: 1.6; color: #111827; resize: vertical; outline: none;
  }
  .pr-textarea:focus { border-color: #90C450; background: #fff; box-shadow: 0 0 0 4px rgba(144, 196, 80, .16); }
  .pr-count { margin-top: 6px; text-align: right; font-size: 12.5px; color: #9ca3af; }
  .pr-agree { display: flex; align-items: flex-start; gap: 10px; margin: 18px 28px 0; font-size: 14px; line-height: 1.6; color: #4b5563; cursor: pointer; }
  .pr-agree input { width: 18px; height: 18px; margin-top: 2px; accent-color: #6FA436; flex-shrink: 0; }

  @media (max-width: 480px) {
    .pr-wrap { width: calc(100% - 24px); padding-top: calc(var(--pupoo-site-header-offset, 72px) + 16px); }
    .pr-head { padding: 28px 22px 20px; }
    .pr-title { font-size: 22px; }
    .pr-event { margin: 0 16px; }
    .pr-receipt { padding: 18px 22px 6px; }
    .pr-actions { padding: 10px 16px 20px; }
    .pr-section { padding: 20px 20px 0; }
    .pr-reasons { grid-template-columns: 1fr; }
    .pr-agree { margin: 16px 20px 0; }
  }
`;

export function formatWon(amount) {
  const n = Number(amount);
  return (Number.isFinite(n) ? n : 0).toLocaleString("ko-KR");
}

export function formatDateTime(value) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  const p = (x) => String(x).padStart(2, "0");
  return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function methodLabel(method) {
  switch (String(method || "").toUpperCase()) {
    case "KAKAOPAY": return "카카오페이";
    case "CARD": return "카드";
    case "BANK": return "계좌이체";
    default: return method || "-";
  }
}
