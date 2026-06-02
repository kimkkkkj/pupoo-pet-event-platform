import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { authApi } from "./api/authApi";
import { tokenStore } from "../../../app/http/tokenStore";
import { useAuth } from "./AuthProvider";
import { NaverBrandMark } from "../../../shared/ui/NaverBrandMark";
import {
  clearAllSocialJoinState,
  setSocialJoinState,
} from "./socialJoinStorage";

const NAVER_CODE_GUARD_KEY = "naver_oauth_code_guard";
const NAVER_STATE_KEY = "naver_oauth_state";

const isDuplicateCode = (code) => {
  try {
    const raw = sessionStorage.getItem(NAVER_CODE_GUARD_KEY);
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
    NAVER_CODE_GUARD_KEY,
    JSON.stringify({ code, ts: Date.now() }),
  );
};

const clearCodeGuard = (code) => {
  try {
    const raw = sessionStorage.getItem(NAVER_CODE_GUARD_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (parsed?.code === code) {
      sessionStorage.removeItem(NAVER_CODE_GUARD_KEY);
    }
  } catch {
    sessionStorage.removeItem(NAVER_CODE_GUARD_KEY);
  }
};

const clearPendingSocialJoin = () => {
  clearAllSocialJoinState();
};

export default function NaverCallback() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const redirectUri = `${window.location.origin}${location.pathname}`;

  const resolvePostLoginRedirect = () => {
    const target = sessionStorage.getItem("post_login_redirect") || "/";
    return target.startsWith("/auth/") ? "/" : target;
  };

  useEffect(() => {
    const run = async () => {
      const params = new URLSearchParams(location.search);
      const code = params.get("code");
      const state = params.get("state");
      const error = params.get("error");
      const storedState = sessionStorage.getItem(NAVER_STATE_KEY);

      if (error) {
        navigate("/auth/login", {
          replace: true,
          state: { error: "네이버 인증을 취소했거나 실패했습니다." },
        });
        return;
      }

      if (!code) {
        navigate("/auth/login", {
          replace: true,
          state: { error: "네이버 인증 코드가 없습니다." },
        });
        return;
      }

      if (!state || !storedState || state !== storedState) {
        navigate("/auth/login", {
          replace: true,
          state: { error: "네이버 인증 상태값이 올바르지 않습니다." },
        });
        return;
      }

      if (isDuplicateCode(code)) return;
      markCodeGuard(code);

      clearPendingSocialJoin();

      try {
        const data = await authApi.naverLogin({ code, state, redirectUri });
        sessionStorage.removeItem(NAVER_STATE_KEY);

        if (!data || typeof data.newUser !== "boolean") {
          navigate("/auth/login", {
            replace: true,
            state: { error: "네이버 로그인 응답이 올바르지 않습니다." },
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
            state: { error: "네이버 계정 정보를 확인하지 못했습니다." },
          });
          return;
        }

        setSocialJoinState("naver", {
          providerUid: uid,
          email: data.email ?? "",
          nickname: data.nickname ?? "",
          signupKey: "",
          phone: "",
          step: "FORM",
        });

        tokenStore.clear();
        navigate("/auth/join/naver", { replace: true });
      } catch (e) {
        clearCodeGuard(code);
        sessionStorage.removeItem(NAVER_STATE_KEY);
        navigate("/auth/login", {
          replace: true,
          state: {
            error:
              e?.response?.data?.message ??
              e?.message ??
              "네이버 로그인 처리에 실패했습니다.",
          },
        });
      }
    };

    run();
  }, [location.pathname, location.search, login, navigate, redirectUri]);

  return (
    <div
      style={{
        minHeight: "50vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 14,
        padding: 24,
      }}
    >
      <NaverBrandMark size={56} rounded={16} />
      <div style={{ fontSize: 16, fontWeight: 700, color: "#191919" }}>
        네이버 로그인 처리 중
      </div>
    </div>
  );
}
