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

const BRAND = "#0459F7";
const BRAND_DARK = "#0348C9";
const FF = "'Pretendard Variable','Pretendard',-apple-system,'Noto Sans KR',sans-serif";

const ADMIN_ACCOUNT = { email: "admin@pupoo.com", pw: "admin1234" };

/* 흰색 로그인 카드 안에서 쓰는 색 */
const INK = "#181C20";
const INK2 = "#3B434C";
const INK3 = "#6B7580";
const LINE = "#DDE2E8";
const FIELD_BG = "#F5F7F9";

export default function AdminLogin() {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState(ADMIN_ACCOUNT.email);
  const [password, setPassword] = useState(ADMIN_ACCOUNT.pw);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
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
    width: "100%", boxSizing: "border-box", height: 48, padding: "0 14px",
    borderRadius: 10, border: `1px solid ${LINE}`, background: FIELD_BG,
    color: INK, fontSize: 15, outline: "none",
    transition: "border-color .15s, box-shadow .15s, background .15s", fontFamily: FF,
  };
  const focusIn = (e) => { e.target.style.borderColor = BRAND; e.target.style.background = "#fff"; e.target.style.boxShadow = `0 0 0 3px ${BRAND}26`; };
  const focusOut = (e) => { e.target.style.borderColor = LINE; e.target.style.background = FIELD_BG; e.target.style.boxShadow = "none"; };
  const labelStyle = { display: "block", fontSize: 13.5, fontWeight: 600, color: INK2, marginBottom: 6 };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#181C20", position: "relative", overflow: "hidden", fontFamily: FF }}>
      {/* 배경: 단색 위에 카드 뒤쪽만 브랜드 색을 아주 옅게 번지게 한다 */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          background: "radial-gradient(ellipse 60% 50% at 50% 42%, rgba(4,89,247,0.16) 0%, rgba(4,89,247,0.05) 45%, rgba(4,89,247,0) 75%)",
        }}
      />

      <div style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: 400, margin: "0 20px" }}>
        {/* 로고 */}
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <img src="/bottom_logo.png" alt="PuPoo" style={{ height: 44, objectFit: "contain", display: "block", margin: "0 auto" }} />
          <div style={{ fontSize: 13.5, color: "rgba(255,255,255,0.72)", marginTop: 8, fontWeight: 500 }}>
            반려동물 행사 관리 플랫폼
          </div>
        </div>

        {/* 카드 */}
        <form onSubmit={onSubmit} style={{ background: "#FFFFFF", borderRadius: 16, padding: "36px 32px 30px", boxShadow: "0 24px 64px rgba(0,0,0,0.45)" }}>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: INK, textAlign: "center", letterSpacing: -0.3 }}>관리자 로그인</h1>
          <p style={{ margin: "8px 0 24px", fontSize: 13.5, color: INK3, textAlign: "center", lineHeight: 1.5, wordBreak: "keep-all" }}>
            데모 계정이 입력되어 있어요. 바로 로그인해 보세요.
          </p>

          {error && (
            <div role="alert" style={{ marginBottom: 16, borderRadius: 10, background: "#FDECEB", color: "#D93025", padding: "10px 14px", fontSize: 13, fontWeight: 600, textAlign: "center" }}>
              {error}
            </div>
          )}

          <div style={{ marginBottom: 14 }}>
            <label htmlFor="admin-email" style={labelStyle}>이메일</label>
            <input id="admin-email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="이메일을 입력해 주세요" style={inputStyle} onFocus={focusIn} onBlur={focusOut} />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label htmlFor="admin-password" style={labelStyle}>비밀번호</label>
            <input id="admin-password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="비밀번호를 입력해 주세요" style={inputStyle} onFocus={focusIn} onBlur={focusOut} />
          </div>

          <button type="submit" disabled={loading}
            style={{ width: "100%", height: 50, border: "none", borderRadius: 10, background: BRAND, color: "#fff", fontSize: 15, fontWeight: 700, cursor: loading ? "wait" : "pointer", transition: "background .15s", fontFamily: FF, opacity: loading ? 0.7 : 1 }}
            onMouseEnter={(e) => { if (!loading) e.currentTarget.style.background = BRAND_DARK; }}
            onMouseLeave={(e) => { if (!loading) e.currentTarget.style.background = BRAND; }}
          >
            {loading ? "로그인 중..." : "로그인"}
          </button>
        </form>

        <div style={{ textAlign: "center", marginTop: 20, fontSize: 12, color: "rgba(255,255,255,0.45)", fontWeight: 500 }}>
          <a href="/" style={{ color: "rgba(255,255,255,0.75)", textDecoration: "none", fontWeight: 600, fontSize: 13 }}>← 사용자 사이트로 돌아가기</a>
          <div style={{ marginTop: 10 }}>© 2026 PuPoo. All rights reserved.</div>
        </div>
      </div>
    </div>
  );
}
