import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { tokenStore } from "../../../../app/http/tokenStore";
import { NaverBrandMark } from "../../../../shared/ui/NaverBrandMark";
import { resolveGoogleRedirectUri } from "../googleRedirectUri";
import { Mail, PartyPopper, PawPrint, Trophy } from "lucide-react";
import AuthSplitLayout, { AUTH_IMAGES } from "../AuthSplitLayout";

const KakaoIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 3C6.477 3 2 6.477 2 10.8c0 2.748 1.67 5.16 4.2 6.624L5.1 21l4.62-2.4A11.4 11.4 0 0 0 12 18.6c5.523 0 10-3.477 10-7.8S17.523 3 12 3z" />
  </svg>
);

const GoogleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 48 48">
    <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303C33.677 32.91 29.243 36 24 36c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.061 0 5.854 1.154 7.97 3.042l5.657-5.657C34.046 6.053 29.27 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" />
    <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.061 0 5.854 1.154 7.97 3.042l5.657-5.657C34.046 6.053 29.27 4 24 4c-7.732 0-14.41 4.386-17.694 10.691z" />
    <path fill="#4CAF50" d="M24 44c5.184 0 9.88-1.977 13.409-5.193l-6.191-5.238C29.211 35.091 26.715 36 24 36c-5.217 0-9.645-3.063-11.273-7.484l-6.525 5.03C9.435 39.556 16.216 44 24 44z" />
    <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-1.056 2.89-3.207 5.259-6.085 6.57l.003-.002 6.191 5.238C36.973 37.342 44 31.245 44 24c0-1.341-.138-2.65-.389-3.917z" />
  </svg>
);

const socialProviders = [
  {
    id: "kakao",
    label: "카카오",
    bg: "#FEE500",
    color: "#191919",
    hoverBg: "#e6cf00",
    border: "none",
    icon: KakaoIcon,
  },
  {
    id: "google",
    label: "구글",
    bg: "#FFFFFF",
    color: "#202124",
    hoverBg: "#F3F4F6",
    border: "1.5px solid #DADCE0",
    icon: GoogleIcon,
  },
  {
    id: "naver",
    label: "네이버",
    bg: "#03C75A",
    color: "#FFFFFF",
    hoverBg: "#02B450",
    border: "none",
    icon: () => (
      <NaverBrandMark
        size={20}
        rounded={4}
        background="#FFFFFF"
        color="#03C75A"
      />
    ),
  },
];

const css = `
  .js-btn {
    width: 100%; height: 52px; border-radius: 14px; border: none;
    font-size: 16px; font-weight: 600; font-family: inherit; cursor: pointer;
    display: flex; align-items: center; justify-content: center; gap: 10px;
    transition: background .15s, box-shadow .15s, transform .12s;
  }
  .js-btn:active { transform: translateY(1px); }
  .js-btn-normal {
    height: 58px; background: #6FA436; color: #fff; font-size: 17px; font-weight: 800;
    box-shadow: 0 10px 24px rgba(111, 164, 54, 0.28);
  }
  .js-btn-normal:hover { background: #5E8F2A; box-shadow: 0 12px 28px rgba(94, 143, 42, 0.34); }
  .js-normal-note { margin: 10px 0 0; text-align: center; font-size: 13px; color: #9ca3af; }
  .js-social-row { display: flex; flex-direction: column; gap: 8px; }
  .js-toast {
    position: fixed; bottom: 40px; left: 50%; transform: translateX(-50%);
    background: #fff; color: #333; font-size: 14px; font-weight: 600;
    padding: 14px 32px; border-radius: 14px; border: 1px solid #e8e8e8;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
    animation: js-toast-in .3s ease, js-toast-out .3s ease 2s forwards;
    z-index: 9999;
  }
  @keyframes js-toast-in {
    from { opacity: 0; transform: translateX(-50%) translateY(16px); }
    to { opacity: 1; transform: translateX(-50%) translateY(0); }
  }
  @keyframes js-toast-out {
    from { opacity: 1; }
    to { opacity: 0; transform: translateX(-50%) translateY(16px); }
  }
  @media (max-width: 767px) {
    .js-btn { height: 50px; font-size: 15px; }
    .js-btn-normal { height: 54px; font-size: 16px; }
  }
`;

export default function JoinSelect() {
  const navigate = useNavigate();
  const [hovered, setHovered] = useState(null);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(null), 2300);
    return () => clearTimeout(timer);
  }, [toast]);

  const KAKAO_REST_KEY = import.meta.env.VITE_KAKAO_REST_KEY;
  const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const NAVER_CLIENT_ID = import.meta.env.VITE_NAVER_CLIENT_ID;
  const kakaoRedirectUri = `${window.location.origin}/auth/kakao/callback`;
  const googleRedirectUri = resolveGoogleRedirectUri();
  const naverRedirectUri = `${window.location.origin}/naver/callback`;

  const handleKakaoContinue = () => {
    tokenStore.clear();
    sessionStorage.removeItem("kakao_auth_code");
    sessionStorage.removeItem("kakao_oauth_code_guard");
    sessionStorage.removeItem("kakao_provider_uid");
    sessionStorage.removeItem("kakao_email");
    sessionStorage.removeItem("kakao_nickname");

    if (!KAKAO_REST_KEY) {
      setToast("카카오 로그인 설정을 먼저 확인해 주세요.");
      return;
    }

    const params = new URLSearchParams({
      response_type: "code",
      client_id: KAKAO_REST_KEY,
      redirect_uri: kakaoRedirectUri,
      through_account: "true",
      prompt: "login",
    });
    const authorizeUrl = `https://kauth.kakao.com/oauth/authorize?${params.toString()}`;
    window.location.href = `https://accounts.kakao.com/login/?login_type=normal&continue=${encodeURIComponent(authorizeUrl)}`;
  };

  const handleGoogleContinue = () => {
    tokenStore.clear();
    sessionStorage.removeItem("google_oauth_code_guard");
    sessionStorage.removeItem("google_provider_uid");
    sessionStorage.removeItem("google_email");
    sessionStorage.removeItem("google_nickname");

    if (!GOOGLE_CLIENT_ID) {
      setToast("구글 로그인 설정을 먼저 확인해 주세요.");
      return;
    }

    const params = new URLSearchParams({
      response_type: "code",
      client_id: GOOGLE_CLIENT_ID,
      redirect_uri: googleRedirectUri,
      scope: "openid email profile",
      prompt: "select_account",
    });
    window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  };

  const handleNaverContinue = () => {
    tokenStore.clear();
    sessionStorage.removeItem("naver_oauth_state");
    sessionStorage.removeItem("naver_provider_uid");
    sessionStorage.removeItem("naver_email");
    sessionStorage.removeItem("naver_nickname");

    if (!NAVER_CLIENT_ID) {
      setToast("네이버 로그인 설정을 먼저 확인해 주세요.");
      return;
    }

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

  const handleSocialClick = (providerId) => {
    if (providerId === "kakao") return handleKakaoContinue();
    if (providerId === "google") return handleGoogleContinue();
    if (providerId === "naver") return handleNaverContinue();
    return null;
  };

  return (
    <>
      <style>{css}</style>
      <AuthSplitLayout
        visual={{
          ...AUTH_IMAGES.join,
          eyebrow: "JOIN PUPOO",
          title: <>반려동물과 함께하는<br />특별한 경험,<br />지금 시작하세요</>,
          desc: "가입하고 전국의 반려동물 행사를 한곳에서 만나보세요",
          chips: [
            { icon: PartyPopper, label: "행사 참가 신청" },
            { icon: Trophy, label: "콘테스트 투표" },
            { icon: PawPrint, label: "반려동물 프로필" },
          ],
        }}
        title="회원가입"
        sub="편한 방법을 골라 바로 시작할 수 있어요"
      >
        <button type="button" className="js-btn js-btn-normal" onClick={() => navigate("/auth/join/joinnormal")}>
          <Mail size={20} />
          이메일로 가입하기
        </button>
        <p className="js-normal-note">이메일과 비밀번호로 푸푸 계정을 만들어요</p>

        <div className="as-divider">SNS 계정으로 가입</div>

        <div className="js-social-row">
          {socialProviders.map((provider) => {
            const Icon = provider.icon;
            return (
              <button
                key={provider.id}
                type="button"
                className="js-btn"
                onClick={() => handleSocialClick(provider.id)}
                onMouseEnter={() => setHovered(provider.id)}
                onMouseLeave={() => setHovered(null)}
                style={{
                  background: hovered === provider.id ? provider.hoverBg : provider.bg,
                  color: provider.color,
                  border: provider.border,
                }}
              >
                <Icon />
                {provider.label}로 계속하기
              </button>
            );
          })}
        </div>

        <div className="as-foot">
          이미 계정이 있으신가요?
          <a
            href="/auth/login"
            onClick={(e) => {
              e.preventDefault();
              navigate("/auth/login");
            }}
          >
            로그인
          </a>
        </div>
      </AuthSplitLayout>

      {toast && <div className="js-toast">{toast}</div>}
    </>
  );
}
