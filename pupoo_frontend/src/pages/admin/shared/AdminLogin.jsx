import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  authApi,
  unwrap,
  setToken,
  getToken,
  clearToken,
  adminNoticeApi,
} from "../../../api/noticeApi";

/* ── 행사 관련 SVG 아이콘 (배경 패턴) ── */
const ICONS = [
  `<path d="M2 9a2 2 0 012-2h16a2 2 0 012 2v1a2 2 0 000 4v1a2 2 0 01-2 2H4a2 2 0 01-2-2v-1a2 2 0 000-4V9z" stroke="currentColor" stroke-width="1.3" fill="none"/>`,
  `<polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" stroke="currentColor" stroke-width="1.3" fill="none"/>`,
  `<path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" stroke="currentColor" stroke-width="1.3" fill="none"/><circle cx="12" cy="13" r="4" stroke="currentColor" stroke-width="1.3" fill="none"/>`,
  `<path d="M9 18V5l12-2v13" stroke="currentColor" stroke-width="1.3" fill="none"/><circle cx="6" cy="18" r="3" stroke="currentColor" stroke-width="1.3" fill="none"/><circle cx="18" cy="16" r="3" stroke="currentColor" stroke-width="1.3" fill="none"/>`,
  `<polyline points="20 12 20 22 4 22 4 12" stroke="currentColor" stroke-width="1.3" fill="none"/><rect x="2" y="7" width="20" height="5" rx="1" stroke="currentColor" stroke-width="1.3" fill="none"/><line x1="12" y1="22" x2="12" y2="7" stroke="currentColor" stroke-width="1.3"/>`,
  `<path d="M6 9H4a2 2 0 01-2-2V6a2 2 0 012-2h2M18 9h2a2 2 0 002-2V6a2 2 0 00-2-2h-2" stroke="currentColor" stroke-width="1.3" fill="none"/><path d="M6 4h12v5a6 6 0 01-12 0V4z" stroke="currentColor" stroke-width="1.3" fill="none"/><path d="M12 15v3M8 21h8" stroke="currentColor" stroke-width="1.3" fill="none"/>`,
  `<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" stroke="currentColor" stroke-width="1.3" fill="none"/><line x1="4" y1="22" x2="4" y2="15" stroke="currentColor" stroke-width="1.3"/>`,
  `<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" stroke="currentColor" stroke-width="1.3" fill="none"/><circle cx="12" cy="10" r="3" stroke="currentColor" stroke-width="1.3" fill="none"/>`,
  `<path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" stroke="currentColor" stroke-width="1.3" fill="none"/>`,
  `<path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" stroke="currentColor" stroke-width="1.3" fill="none"/><path d="M19 10v2a7 7 0 01-14 0v-2" stroke="currentColor" stroke-width="1.3" fill="none"/><line x1="12" y1="19" x2="12" y2="23" stroke="currentColor" stroke-width="1.3"/>`,
  `<path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke="currentColor" stroke-width="1.3" fill="none"/><circle cx="9" cy="7" r="4" stroke="currentColor" stroke-width="1.3" fill="none"/><path d="M23 21v-2a4 4 0 00-3-3.87" stroke="currentColor" stroke-width="1.3" fill="none"/>`,
  `<rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" stroke-width="1.3" fill="none"/><line x1="16" y1="2" x2="16" y2="6" stroke="currentColor" stroke-width="1.3"/><line x1="8" y1="2" x2="8" y2="6" stroke="currentColor" stroke-width="1.3"/><line x1="3" y1="10" x2="21" y2="10" stroke="currentColor" stroke-width="1.3"/>`,
  `<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" stroke="currentColor" stroke-width="1.3" fill="none"/><path d="M15.54 8.46a5 5 0 010 7.07" stroke="currentColor" stroke-width="1.3" fill="none"/>`,
  `<path d="M12 2C9.24 2 7 4.24 7 7h10c0-2.76-2.24-5-5-5zM5 10h14l-2 10H7L5 10z" stroke="currentColor" stroke-width="1.3" fill="none"/>`,
  `<path d="M12 2c-3.31 0-6 3.13-6 7 0 4 3 6 6 8 3-2 6-4 6-8 0-3.87-2.69-7-6-7z" stroke="currentColor" stroke-width="1.3" fill="none"/><line x1="12" y1="17" x2="12" y2="22" stroke="currentColor" stroke-width="1.3"/>`,
  `<circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="1.3" fill="none"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" stroke="currentColor" stroke-width="1.3"/>`,
];

function makeBgSvg() {
  const cols = 14, rows = 9, cellW = 100, cellH = 90;
  const w = cols * cellW, h = rows * cellH;
  let s = "";
  let i = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = c * cellW + (r % 2 ? cellW / 2 : 0) + 16;
      const y = r * cellH + 16;
      const op = (0.35 + Math.sin(i * 1.7) * 0.08).toFixed(2);
      const rot = ((i * 17) % 20 - 10);
      const icon = ICONS[i % ICONS.length];
      s += `<g transform="translate(${x},${y}) rotate(${rot},12,12)" opacity="${op}"><svg viewBox="0 0 24 24" width="26" height="26" color="white">${icon}</svg></g>`;
      i++;
    }
  }
  return `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">${s}</svg>`)}`;
}

const BG_SVG = makeBgSvg();

const BRAND = "#E8505B";
const BRAND_DARK = "#D43F4A";
const FF = "'A2z','Pretendard Variable',-apple-system,'Noto Sans KR',sans-serif";

const ADMIN_ACCOUNT = { email: "admin@pupoo.com", pw: "pupoo1234!" };

const QUICK_BUTTONS = [
  { label: "관리자 계정", disabled: false, active: true },
  { label: "테스트 계정", disabled: true, tooltip: "준비중입니다" },
];

export default function AdminLogin() {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState(ADMIN_ACCOUNT.email);
  const [password, setPassword] = useState(ADMIN_ACCOUNT.pw);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [tooltip, setTooltip] = useState(null);
  const from = location.state?.from || "/admin/dashboard";

  useEffect(() => {
    const validate = async () => {
      const token = getToken();
      if (!token) return;
      try {
        await adminNoticeApi.list(1, 1);
        navigate(from, { replace: true });
      } catch { clearToken(); }
    };
    validate();
  }, [from, navigate]);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) { setError("이메일과 비밀번호를 입력해 주세요."); return; }
    setError(""); setLoading(true);
    try {
      const res = await authApi.login(email, password);
      const data = unwrap(res);
      const token = data?.accessToken || data?.token;
      if (!token) { setError("토큰을 받지 못했습니다."); return; }
      setToken(token);
      navigate(from, { replace: true });
    } catch { setError("관리자 계정 정보가 올바르지 않습니다."); }
    finally { setLoading(false); }
  };

  const inputStyle = {
    width: "100%", boxSizing: "border-box", padding: "13px 14px",
    borderRadius: 10, border: "1.5px solid #e0e0e8", background: "#fafafa",
    color: "#1a1a2e", fontSize: 14, outline: "none",
    transition: "border-color .15s, box-shadow .15s", fontFamily: FF,
  };
  const focusIn = (e) => { e.target.style.borderColor = BRAND; e.target.style.boxShadow = `0 0 0 3px ${BRAND}18`; e.target.style.background = "#fff"; };
  const focusOut = (e) => { e.target.style.borderColor = "#e0e0e8"; e.target.style.boxShadow = "none"; e.target.style.background = "#fafafa"; };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, #2A2B3A 0%, #1E1F2E 50%, #181926 100%)", position: "relative", overflow: "hidden", fontFamily: FF }}>
      {/* 배경 아이콘 패턴 */}
      <div style={{ position: "absolute", inset: 0, backgroundImage: `url("${BG_SVG}")`, backgroundRepeat: "repeat", opacity: 0.4, pointerEvents: "none" }} />

      <div style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: 420, margin: "0 20px" }}>
        {/* 로고 */}
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <img src="/bottom_logo.png" alt="PuPoo" style={{ height: 48, objectFit: "contain", display: "block", margin: "0 auto", filter: "drop-shadow(0 2px 12px rgba(0,0,0,0.15))" }} />
          <div style={{ fontSize: 13.5, color: "rgba(255,255,255,0.78)", marginTop: 8, fontWeight: 500 }}>
            반려동물 행사 관리 플랫폼
          </div>
        </div>

        {/* 카드 */}
        <form onSubmit={onSubmit} style={{ background: "#fff", borderRadius: 16, padding: "36px 32px 28px", boxShadow: "0 20px 60px rgba(0,0,0,0.12), 0 4px 20px rgba(0,0,0,0.06)" }}>
          <h1 style={{ margin: 0, fontSize: 21, fontWeight: 800, color: "#1a1a2e", textAlign: "center" }}>관리자 로그인</h1>
          <p style={{ margin: "6px 0 22px", fontSize: 13, color: "#999", textAlign: "center", fontWeight: 500 }}>관리자 페이지에 접근하려면 로그인하세요</p>

          {/* 퀵 계정 */}
          <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
            {QUICK_BUTTONS.map((btn) => (
              <div key={btn.label} style={{ flex: 1, position: "relative" }}
                onMouseEnter={() => btn.disabled ? setTooltip(btn.label) : null}
                onMouseLeave={() => setTooltip(null)}
              >
                <button type="button" disabled={btn.disabled}
                  style={{
                    width: "100%", padding: "9px 0", borderRadius: 8, fontSize: 12.5, fontWeight: 700, fontFamily: FF, outline: "none",
                    ...(btn.active
                      ? { border: `1.5px solid ${BRAND}`, background: `${BRAND}0A`, color: BRAND, cursor: "default", opacity: 1 }
                      : { border: "1.5px solid #e8e8ee", background: "#f4f4f8", color: "#bbb", cursor: "not-allowed", opacity: 0.7 }
                    ),
                  }}
                >
                  {btn.label}
                </button>
                {btn.disabled && tooltip === btn.label && btn.tooltip && (
                  <div style={{
                    position: "absolute", bottom: "calc(100% + 8px)", left: "50%", transform: "translateX(-50%)",
                    background: "#333", color: "#fff", fontSize: 11.5, fontWeight: 600, padding: "6px 12px",
                    borderRadius: 7, whiteSpace: "nowrap", pointerEvents: "none",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.15)", animation: "tooltipIn .15s ease-out",
                  }}>
                    {btn.tooltip}
                    <div style={{
                      position: "absolute", top: "100%", left: "50%", transform: "translateX(-50%)",
                      width: 0, height: 0, borderLeft: "5px solid transparent", borderRight: "5px solid transparent", borderTop: "5px solid #333",
                    }} />
                  </div>
                )}
              </div>
            ))}
          </div>

          {error && (
            <div style={{ marginBottom: 16, borderRadius: 10, background: "#FEF2F2", border: "1px solid #FECACA", color: "#DC2626", padding: "10px 14px", fontSize: 12.5, fontWeight: 600, textAlign: "center" }}>
              {error}
            </div>
          )}

          <div style={{ marginBottom: 14 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#555", marginBottom: 6 }}>이메일</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="이메일을 입력해주세요" autoFocus style={inputStyle} onFocus={focusIn} onBlur={focusOut} />
          </div>

          <div style={{ marginBottom: 22 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#555", marginBottom: 6 }}>비밀번호</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="비밀번호를 입력해주세요" style={inputStyle} onFocus={focusIn} onBlur={focusOut} />
          </div>

          <button type="submit" disabled={loading}
            style={{ width: "100%", border: "none", borderRadius: 10, padding: "14px 0", background: BRAND, color: "#fff", fontSize: 15, fontWeight: 700, cursor: loading ? "wait" : "pointer", transition: "background .15s", fontFamily: FF, opacity: loading ? 0.7 : 1, outline: "none" }}
            onMouseEnter={(e) => { if (!loading) e.currentTarget.style.background = BRAND_DARK; }}
            onMouseLeave={(e) => { if (!loading) e.currentTarget.style.background = BRAND; }}
          >
            {loading ? "로그인 중..." : "로그인"}
          </button>
        </form>

        <div style={{ textAlign: "center", marginTop: 18, fontSize: 11.5, color: "rgba(255,255,255,0.50)", fontWeight: 500 }}>
          © 2026 PuPoo. All rights reserved.
        </div>
      </div>
      <style>{`
        @keyframes tooltipIn {
          from { opacity: 0; transform: translateX(-50%) translateY(4px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>
    </div>
  );
}
