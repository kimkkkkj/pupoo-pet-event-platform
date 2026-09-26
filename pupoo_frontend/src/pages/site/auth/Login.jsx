import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { authApi } from "./api/authApi";
import { tokenStore } from "../../../app/http/tokenStore";
import { useAuth } from "./AuthProvider";
import { NaverBrandMark } from "../../../shared/ui/NaverBrandMark";
import { clearAllSocialJoinState } from "./socialJoinStorage";
import { resolveGoogleRedirectUri } from "./googleRedirectUri";
import { Bell, CalendarCheck, Eye, EyeOff, Lock, Mail, PawPrint } from "lucide-react";
import AuthSplitLayout from "./AuthSplitLayout";

// 아이디 저장: 체크하고 로그인하면 이메일을 이 브라우저에 기억한다
const SAVED_EMAIL_KEY = "pupoo_saved_email";
const readSavedEmail = () => {
  try {
    return localStorage.getItem(SAVED_EMAIL_KEY) || "";
  } catch {
    return "";
  }
};
const writeSavedEmail = (email) => {
  try {
    if (email) localStorage.setItem(SAVED_EMAIL_KEY, email);
    else localStorage.removeItem(SAVED_EMAIL_KEY);
  } catch {
    // 저장소를 쓸 수 없는 환경(사생활 보호 모드 등)에서는 조용히 넘어간다
  }
};

// 소셜 로그인 버튼에서 공통으로 쓰는 스타일 컴포넌트다.
const SocialButton = ({ onClick, style, children, compact = false }) => {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: compact ? 8 : 10,
        width: "100%",
        height: compact ? 50 : 52,
        padding: compact ? "0 16px" : "0 20px",
        borderRadius: 14,
        border: "none",
        cursor: "pointer",
        fontSize: compact ? 14 : 16,
        fontFamily: "'Noto Sans KR', sans-serif",
        fontWeight: 600,
        transition: "filter 0.15s, box-shadow 0.15s",
        filter: hovered ? "brightness(0.93)" : "brightness(1)",
        ...style,
      }}
    >
      {children}
    </button>
  );
};

// 소셜 로그인 아이콘을 인라인 SVG로 정의한다.
const KakaoIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24">
    <path
      fill="#3C1E1E"
      d="M12 3C6.48 3 2 6.48 2 10.5c0 2.73 1.82 5.14 4.52 6.49-.2.74-.73 2.68-.84 3.11-.13.52.19.51.4.37.16-.11 2.67-1.8 3.75-2.54.39.06.79.09 1.17.09 5.52 0 10-3.48 10-7.5S17.52 3 12 3z"
    />
  </svg>
);

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 48 48">
    <path
      fill="#FFC107"
      d="M43.611 20.083H42V20H24v8h11.303C33.677 32.91 29.243 36 24 36c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.061 0 5.854 1.154 7.97 3.042l5.657-5.657C34.046 6.053 29.27 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
    />
    <path
      fill="#FF3D00"
      d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.061 0 5.854 1.154 7.97 3.042l5.657-5.657C34.046 6.053 29.27 4 24 4c-7.732 0-14.41 4.386-17.694 10.691z"
    />
    <path
      fill="#4CAF50"
      d="M24 44c5.184 0 9.88-1.977 13.409-5.193l-6.191-5.238C29.211 35.091 26.715 36 24 36c-5.217 0-9.645-3.063-11.273-7.484l-6.525 5.03C9.435 39.556 16.216 44 24 44z"
    />
    <path
      fill="#1976D2"
      d="M43.611 20.083H42V20H24v8h11.303c-1.056 2.89-3.207 5.259-6.085 6.57l.003-.002 6.191 5.238C36.973 37.342 44 31.245 44 24c0-1.341-.138-2.65-.389-3.917z"
    />
  </svg>
);

const clearPendingSocialJoin = () => {
  clearAllSocialJoinState();
  [
    "kakao_provider_uid",
    "kakao_email",
    "kakao_nickname",
    "google_provider_uid",
    "google_email",
    "google_nickname",
    "naver_provider_uid",
    "naver_email",
    "naver_nickname",
  ].forEach((key) => sessionStorage.removeItem(key));
};

// 로그인 화면 전체를 렌더링한다.
const LoginPage = ({ leftBgImage = null }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const kakaoRedirectUri = `${window.location.origin}/auth/kakao/callback`;
  const KAKAO_REST_KEY = import.meta.env.VITE_KAKAO_REST_KEY;
  const naverRedirectUri = `${window.location.origin}/naver/callback`;
  const NAVER_CLIENT_ID = import.meta.env.VITE_NAVER_CLIENT_ID;
  const resolvePostLoginRedirect = () => {
    const target =
      location.state?.from ||
      sessionStorage.getItem("post_login_redirect") ||
      "/";
    return target.startsWith("/auth/") ? "/" : target;
  };

  const handleKakaoLogin = () => {
    if (!KAKAO_REST_KEY) {
      setToast("카카오 로그인 설정이 준비되지 않았습니다.");
      return;
    }

    tokenStore.clear();
    sessionStorage.removeItem("kakao_auth_code");
    sessionStorage.removeItem("kakao_oauth_code_guard");
    sessionStorage.removeItem("kakao_provider_uid");
    sessionStorage.removeItem("kakao_email");
    sessionStorage.removeItem("kakao_nickname");

    // 로그인 성공 후에는 보호 라우트 진입 경로, 직전 경로, 홈 순서로 돌아간다.
    const redirectTo = resolvePostLoginRedirect();
    sessionStorage.setItem("post_login_redirect", redirectTo);

    const params = new URLSearchParams({
      response_type: "code",
      client_id: KAKAO_REST_KEY,
      redirect_uri: kakaoRedirectUri,
      through_account: "true",
      prompt: "login",
    });
    window.location.href = `https://kauth.kakao.com/oauth/authorize?${params.toString()}`;
  };

  const handleNaverLogin = () => {
    if (!NAVER_CLIENT_ID) {
      setToast("네이버 로그인 설정이 준비되지 않았습니다.");
      return;
    }

    tokenStore.clear();
    sessionStorage.removeItem("naver_oauth_state");
    sessionStorage.removeItem("naver_oauth_code_guard");
    sessionStorage.removeItem("naver_provider_uid");
    sessionStorage.removeItem("naver_email");
    sessionStorage.removeItem("naver_nickname");

    const redirectTo = resolvePostLoginRedirect();
    sessionStorage.setItem("post_login_redirect", redirectTo);

    const state = `${crypto.randomUUID()}${Date.now()}`;
    sessionStorage.setItem("naver_oauth_state", state);

    const params = new URLSearchParams({
      response_type: "code",
      client_id: NAVER_CLIENT_ID,
      redirect_uri: naverRedirectUri,
      state,
    });
    window.location.href = `https://nid.naver.com/oauth2.0/authorize?${params.toString()}`;
  };

  useEffect(() => {
    document.body.classList.add("light-header");

    return () => {
      document.body.classList.remove("light-header");
    };
  }, []);

  const [userId, setUserId] = useState(readSavedEmail);
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(() => Boolean(readSavedEmail()));
  const [showPassword, setShowPassword] = useState(false);
  const [viewportWidth, setViewportWidth] = useState(() =>
    typeof window === "undefined" ? 1440 : window.innerWidth,
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState(null);
  const externalError = location.state?.error || "";

  useEffect(() => {
    if (externalError) {
      setError(externalError);
    }
  }, [externalError]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2300);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const syncViewport = () => setViewportWidth(window.innerWidth);
    syncViewport();
    window.addEventListener("resize", syncViewport);
    return () => window.removeEventListener("resize", syncViewport);
  }, []);

  const isMobile = viewportWidth < 768;

  const handleGoogleLogin = () => {
    const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    const googleRedirectUri = resolveGoogleRedirectUri();
    if (!GOOGLE_CLIENT_ID) {
      setToast("구글 로그인 설정이 준비되지 않았습니다.");
      return;
    }
    tokenStore.clear();
    sessionStorage.removeItem("google_oauth_code_guard");
    sessionStorage.removeItem("google_provider_uid");
    sessionStorage.removeItem("google_email");
    sessionStorage.removeItem("google_nickname");
    const redirectTo = resolvePostLoginRedirect();
    sessionStorage.setItem("post_login_redirect", redirectTo);
    const params = new URLSearchParams({
      response_type: "code", client_id: GOOGLE_CLIENT_ID,
      redirect_uri: googleRedirectUri,
      scope: "openid email profile", prompt: "select_account",
    });
    window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  };

  const handleSocialClick = (name) => {
    setToast(`${name} 로그인은 곧 지원될 예정이에요`);
  };

  const handleLogin = async () => {
    if (loading) return;

    setError("");

    const email = (userId || "").trim();
    if (!email.trim()) return setError("이메일을 입력하세요.");
    if (!password) return setError("비밀번호를 입력하세요.");

    setLoading(true);
    try {
      const res = await authApi.login({ email, password });
      const accessToken = res?.accessToken;

      if (!accessToken) {
          throw new Error("로그인 응답에 accessToken이 없습니다.");
      }

      tokenStore.setAccess(accessToken);
      writeSavedEmail(rememberMe ? email : "");
      clearPendingSocialJoin();
      login();
      const redirectTo = resolvePostLoginRedirect();
      sessionStorage.removeItem("post_login_redirect");
      navigate(redirectTo, { replace: true });
    } catch (e) {
        setError(
          e?.response?.data?.message ??
            "로그인에 실패했습니다. 아이디와 비밀번호를 다시 확인해 주세요.",
        );
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleLogin();
    }
  };

  return (
    <>
      <AuthSplitLayout
        visual={{
          image: leftBgImage,
          eyebrow: "PUPOO MEMBERS",
          title: <>지금 로그인하고<br />푸푸와 함께 반려생활을<br />더 편하게 시작하세요</>,
          desc: "행사 신청부터 참여 기록, 알림까지 한 번에 관리할 수 있어요",
          chips: [
            { icon: CalendarCheck, label: "행사 신청" },
            { icon: PawPrint, label: "참여 기록" },
            { icon: Bell, label: "실시간 알림" },
          ],
        }}
        title="로그인"
        sub="푸푸 계정으로 로그인해 주세요"
      >
        <label className="as-label" htmlFor="login-email">이메일</label>
        <div className="as-field">
          <Mail size={18} className="as-field-icon" />
          <input
            id="login-email"
            type="email"
            autoComplete="username"
            placeholder="example@pupoo.com"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>

        <label className="as-label" htmlFor="login-password">비밀번호</label>
        <div className="as-field">
          <Lock size={18} className="as-field-icon" />
          <input
            id="login-password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            placeholder="비밀번호를 입력하세요"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button
            type="button"
            className="as-eye"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "비밀번호 숨기기" : "비밀번호 보기"}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>

        <div className="lg-row">
          <label className="lg-check">
            <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} />
            아이디 저장
          </label>
          <a
            href="/auth/find-password"
            className="as-link"
            onClick={(e) => {
              e.preventDefault();
              navigate("/auth/find-password");
            }}
          >
            비밀번호 찾기
          </a>
        </div>

        {error ? <div className="as-error" role="alert">{error}</div> : null}

        <button type="button" className="as-submit login-btn" onClick={handleLogin} disabled={loading}>
          {loading ? "로그인 중…" : "로그인"}
        </button>

        <div className="as-divider">간편 로그인</div>

        <div className="lg-social">
          <SocialButton onClick={handleKakaoLogin} style={{ background: "#FEE500", color: "#3C1E1E" }}>
            <KakaoIcon />
            <span>카카오로 로그인</span>
          </SocialButton>
          <SocialButton
            onClick={handleGoogleLogin}
            style={{ background: "#FFFFFF", color: "#3C4043", border: "1.5px solid #DADCE0" }}
          >
            <GoogleIcon />
            <span>Google로 로그인</span>
          </SocialButton>
          <SocialButton onClick={handleNaverLogin} style={{ background: "#03C75A", color: "#FFFFFF" }}>
            <NaverBrandMark size={20} rounded={4} background="#FFFFFF" color="#03C75A" />
            <span>네이버로 로그인</span>
          </SocialButton>
        </div>

        <div className="as-foot">
          아직 회원이 아니신가요?
          <a
            href="/auth/join/joinselect"
            onClick={(e) => {
              e.preventDefault();
              navigate("/auth/join/joinselect");
            }}
          >
            회원가입
          </a>
        </div>
      </AuthSplitLayout>

      {toast && (
        <div style={{
          position: "fixed", bottom: isMobile ? "calc(env(safe-area-inset-bottom, 0px) + 16px)" : 40, left: "50%", transform: "translateX(-50%)",
          background: "#fff", color: "#333", fontSize: isMobile ? 13 : 14, fontWeight: 600,
          padding: isMobile ? "12px 20px" : "14px 32px", borderRadius: 14, border: "1px solid #e8e8e8",
          boxShadow: "0 8px 32px rgba(0,0,0,.12)", zIndex: 9999,
          animation: "login-toast-in .3s ease, login-toast-out .3s ease 2s forwards",
          width: isMobile ? "min(calc(100vw - 24px), 320px)" : "auto",
          textAlign: "center",
        }}>{toast}</div>
      )}

      <style>{`
        @keyframes login-toast-in { from { opacity:0; transform:translateX(-50%) translateY(16px); } to { opacity:1; transform:translateX(-50%) translateY(0); } }
        @keyframes login-toast-out { from { opacity:1; } to { opacity:0; transform:translateX(-50%) translateY(16px); } }

        .lg-row { display: flex; align-items: center; justify-content: space-between; margin: 2px 0 20px; }
        .lg-check { display: inline-flex; align-items: center; gap: 8px; font-size: 14px; color: #4b5563; cursor: pointer; user-select: none; }
        .lg-check input { width: 18px; height: 18px; accent-color: #6FA436; cursor: pointer; }

        .lg-social { display: flex; flex-direction: column; gap: 8px; }

      `}</style>
    </>
  );
};

export default LoginPage;
