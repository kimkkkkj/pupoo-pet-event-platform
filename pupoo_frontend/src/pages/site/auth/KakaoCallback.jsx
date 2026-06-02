import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { authApi } from "./api/authApi";
import { tokenStore } from "../../../app/http/tokenStore";
import { useAuth } from "./AuthProvider";
import {
  clearAllSocialJoinState,
  setSocialJoinState,
} from "./socialJoinStorage";

const KAKAO_CODE_GUARD_KEY = "kakao_oauth_code_guard";

const isDuplicateCode = (code) => {
  try {
    const raw = sessionStorage.getItem(KAKAO_CODE_GUARD_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    const lastCode = parsed?.code;
    const ts = Number(parsed?.ts || 0);
    return lastCode === code && Date.now() - ts < 60_000;
  } catch {
    return false;
  }
};

const markCodeGuard = (code) => {
  sessionStorage.setItem(
    KAKAO_CODE_GUARD_KEY,
    JSON.stringify({ code, ts: Date.now() }),
  );
};

const clearCodeGuard = (code) => {
  try {
    const raw = sessionStorage.getItem(KAKAO_CODE_GUARD_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (parsed?.code === code) {
      sessionStorage.removeItem(KAKAO_CODE_GUARD_KEY);
    }
  } catch {
    sessionStorage.removeItem(KAKAO_CODE_GUARD_KEY);
  }
};

const clearPendingSocialJoin = () => {
  clearAllSocialJoinState();
};

export default function KakaoCallback() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const redirectUri = `${window.location.origin}/auth/kakao/callback`;

  const resolvePostLoginRedirect = () => {
    const target = sessionStorage.getItem("post_login_redirect") || "/";
    return target.startsWith("/auth/") ? "/" : target;
  };

  useEffect(() => {
    const run = async () => {
      const params = new URLSearchParams(location.search);
      const code = params.get("code");
      const error = params.get("error");

      if (error) {
        navigate("/auth/login", {
          replace: true,
          state: { error: "카카오 인증을 취소했거나 실패했습니다." },
        });
        return;
      }

      if (!code) {
        navigate("/auth/login", {
          replace: true,
          state: { error: "카카오 인증 코드가 없습니다." },
        });
        return;
      }

      if (isDuplicateCode(code)) {
        return;
      }
      markCodeGuard(code);

      clearPendingSocialJoin();

      try {
        const data = await authApi.kakaoLogin({ code, redirectUri });

        if (!data || typeof data.newUser !== "boolean") {
          navigate("/auth/login", {
            replace: true,
            state: { error: "카카오 로그인 응답이 올바르지 않습니다." },
          });
          return;
        }

        if (!data.newUser) {
          const accessToken = data.accessToken;
          if (!accessToken) {
            navigate("/auth/login", {
              replace: true,
              state: { error: "로그인 토큰을 받지 못했습니다." },
            });
            return;
          }

          tokenStore.setAccess(accessToken);
          login();
          clearPendingSocialJoin();

          const redirectTo = resolvePostLoginRedirect();
          sessionStorage.removeItem("post_login_redirect");
          navigate(redirectTo, { replace: true });
          return;
        }

        const uid = data.socialProviderUid ?? "";
        if (!uid) {
          navigate("/auth/login", {
            replace: true,
            state: { error: "카카오 계정 정보를 확인하지 못했습니다." },
          });
          return;
        }

        setSocialJoinState("kakao", {
          providerUid: uid,
          email: data.email ?? "",
          nickname: data.nickname ?? "",
          signupKey: "",
          phone: "",
          step: "FORM",
        });

        tokenStore.clear();
        navigate("/auth/join/kakao", { replace: true });
      } catch (e) {
        clearCodeGuard(code);
        navigate("/auth/login", {
          replace: true,
          state: {
            error:
              e?.response?.data?.message ??
              e?.message ??
              "카카오 로그인 처리에 실패했습니다.",
          },
        });
      }
    };

    run();
  }, [location.search, navigate, login]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background:
          "linear-gradient(135deg, #fffef5 0%, #fef9e7 50%, #fdf3d0 100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 99999,
        fontFamily:
          "'Pretendard Variable', 'Pretendard', -apple-system, sans-serif",
      }}
    >
      <div
        style={{
          width: 80,
          height: 80,
          borderRadius: 24,
          background: "#fff",
          boxShadow: "0 8px 32px rgba(0,0,0,0.08)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 24,
          position: "relative",
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            border: "3px solid #f0e6c0",
            borderTopColor: "#FEE500",
            borderRadius: "50%",
            animation: "kcb-spin .8s cubic-bezier(.4,0,.2,1) infinite",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: -4,
            borderRadius: 28,
            border: "2px solid transparent",
            borderTopColor: "rgba(254,229,0,0.25)",
            animation: "kcb-spin 2s linear infinite",
          }}
        />
      </div>
      <div
        style={{
          fontSize: 18,
          fontWeight: 700,
          color: "#1a1a1a",
          marginBottom: 6,
        }}
      >
        카카오 로그인 중
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <span style={{ fontSize: 14, color: "#9ca3af" }}>
          계정 정보를 확인하고 있습니다.
        </span>
        <span style={{ display: "inline-flex", gap: 3, marginLeft: 2 }}>
          <span
            style={{
              width: 4,
              height: 4,
              borderRadius: "50%",
              background: "#e6cf00",
              animation: "kcb-dot 1.2s ease-in-out infinite",
            }}
          />
          <span
            style={{
              width: 4,
              height: 4,
              borderRadius: "50%",
              background: "#e6cf00",
              animation: "kcb-dot 1.2s ease-in-out 0.2s infinite",
            }}
          />
          <span
            style={{
              width: 4,
              height: 4,
              borderRadius: "50%",
              background: "#e6cf00",
              animation: "kcb-dot 1.2s ease-in-out 0.4s infinite",
            }}
          />
        </span>
      </div>
      <style>{`
        @keyframes kcb-spin { to { transform: rotate(360deg); } }
        @keyframes kcb-dot { 0%,80%,100% { opacity:.3; transform:scale(.8); } 40% { opacity:1; transform:scale(1.2); } }
      `}</style>
    </div>
  );
}
