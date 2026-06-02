import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { authApi } from "./api/authApi";
import { tokenStore } from "../../../app/http/tokenStore";
import { useAuth } from "./AuthProvider";
import {
  clearAllSocialJoinState,
  setSocialJoinState,
} from "./socialJoinStorage";
import { resolveGoogleRedirectUri } from "./googleRedirectUri";

const GOOGLE_CODE_GUARD_KEY = "google_oauth_code_guard";

const isDuplicateCode = (code) => {
  try {
    const raw = sessionStorage.getItem(GOOGLE_CODE_GUARD_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    return parsed?.code === code && Date.now() - Number(parsed?.ts || 0) < 60_000;
  } catch {
    return false;
  }
};

const markCodeGuard = (code) => {
  sessionStorage.setItem(
    GOOGLE_CODE_GUARD_KEY,
    JSON.stringify({ code, ts: Date.now() }),
  );
};

const clearCodeGuard = (code) => {
  try {
    const raw = sessionStorage.getItem(GOOGLE_CODE_GUARD_KEY);
    if (!raw) return;
    if (JSON.parse(raw)?.code === code) {
      sessionStorage.removeItem(GOOGLE_CODE_GUARD_KEY);
    }
  } catch {
    sessionStorage.removeItem(GOOGLE_CODE_GUARD_KEY);
  }
};

const clearPendingSocialJoin = () => {
  clearAllSocialJoinState();
};

export default function GoogleCallback() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const redirectUri = resolveGoogleRedirectUri();

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
          state: { error: "구글 인증을 취소했거나 실패했습니다." },
        });
        return;
      }

      if (!code) {
        navigate("/auth/login", {
          replace: true,
          state: { error: "구글 인증 코드가 없습니다." },
        });
        return;
      }

      if (isDuplicateCode(code)) return;
      markCodeGuard(code);

      clearPendingSocialJoin();

      try {
        const data = await authApi.googleLogin({ code, redirectUri });

        if (!data || typeof data.newUser !== "boolean") {
          navigate("/auth/login", {
            replace: true,
            state: { error: "구글 로그인 응답이 올바르지 않습니다." },
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
            state: { error: "구글 계정 정보를 확인하지 못했습니다." },
          });
          return;
        }

        setSocialJoinState("google", {
          providerUid: uid,
          email: data.email ?? "",
          nickname: data.nickname ?? "",
          signupKey: "",
          phone: "",
          step: "FORM",
        });

        tokenStore.clear();
        navigate("/auth/join/google", { replace: true });
      } catch (e) {
        clearCodeGuard(code);
        navigate("/auth/login", {
          replace: true,
          state: {
            error:
              e?.response?.data?.message ??
              e?.message ??
              "구글 로그인 처리에 실패했습니다.",
          },
        });
      }
    };

    run();
  }, [location.search, login, navigate, redirectUri]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background:
          "linear-gradient(135deg, #f8faf5 0%, #f0f4e8 50%, #e8edd9 100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 99999,
        fontFamily: "'Pretendard Variable', 'Pretendard', -apple-system, sans-serif",
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
            border: "3px solid #e5e7eb",
            borderTopColor: "#90C450",
            borderRadius: "50%",
            animation: "gcb-spin .8s cubic-bezier(.4,0,.2,1) infinite",
          }}
        />
      </div>
      <div style={{ fontSize: 18, fontWeight: 700, color: "#1a1a1a", marginBottom: 6 }}>
        구글 로그인 처리 중
      </div>
      <div style={{ fontSize: 14, color: "#9ca3af" }}>
        계정을 확인하고 있습니다.
      </div>
      <style>{`
        @keyframes gcb-spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
