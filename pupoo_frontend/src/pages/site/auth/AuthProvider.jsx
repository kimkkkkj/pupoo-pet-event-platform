import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  AUTH_CHANGE_EVENT,
  tokenStore,
} from "../../../app/http/tokenStore";
import { recoverSessionAccessToken } from "../../../app/http/authSession";
import { authApi } from "./api/authApi";

const AuthContext = createContext(null);

const isUnauthorizedError = (error) => {
  const status = Number(error?.status || error?.response?.status);
  return status === 401 || status === 403;
};

export function AuthProvider({ children }) {
  const [isAuthed, setIsAuthed] = useState(false);
  const [isBootstrapped, setIsBootstrapped] = useState(false);
  const bootstrappingRef = useRef(false);

  useEffect(() => {
    // 기능: 첫 진입 시 access token 또는 refresh 기반 세션 복구를 한 번만 시도한다.
    // 설명: 새로고침 직후에도 로그인 상태를 유지해야 하므로, 메모리에 토큰이 없으면 session hint를 보고 refresh 호출 여부를 결정한다.
    // 흐름: 로컬 access 확인 -> 없으면 session hint 확인 -> refresh 성공 시 복구, 실패 시 로그아웃 상태 확정.
    const bootstrap = async () => {
      if (bootstrappingRef.current) return;
      bootstrappingRef.current = true;

      try {
        const access = tokenStore.getAccessToken();
        if (access) {
          setIsAuthed(true);
          return;
        }

        if (!tokenStore.hasSessionHint()) {
          setIsAuthed(false);
          return;
        }

        const accessToken = await recoverSessionAccessToken("user", {
          force: true,
        });
        if (accessToken) {
          setIsAuthed(true);
        } else {
          tokenStore.clear();
          setIsAuthed(false);
        }
      } catch (error) {
        if (isUnauthorizedError(error)) {
          tokenStore.clear();
        }
        setIsAuthed(false);
      } finally {
        setIsBootstrapped(true);
      }
    };

    bootstrap();
  }, []);

  useEffect(() => {
    // 기능: 다른 탭 로그인 이후 현재 탭으로 돌아왔을 때 인증 표시를 다시 맞춘다.
    // 설명: focus/visibility 이벤트는 화면이 다시 활성화되는 시점에 메모리 상태를 최신 토큰 기준으로 덮어쓴다.
    // 흐름: 창 활성화 감지 -> tokenStore 재확인 -> 인증 상태 재반영.
    const onFocus = () => {
      if (tokenStore.getAccessToken() || tokenStore.hasSessionHint()) {
        setIsAuthed(true);
      }
    };
    const onVisibility = () => {
      if (
        document.visibilityState === "visible" &&
        (tokenStore.getAccessToken() || tokenStore.hasSessionHint())
      ) {
        setIsAuthed(true);
      }
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  useEffect(() => {
    // 기능: tokenStore 변경 이벤트를 받아 라우트 보호 상태를 즉시 동기화한다.
    // 설명: 로그인, 로그아웃, refresh 재발급이 어디서 발생하든 같은 인증 플래그를 공유한다.
    // 흐름: AUTH_CHANGE_EVENT 수신 -> access token 존재 여부 확인 -> isAuthed 갱신.
    const syncAuthState = () => {
      setIsAuthed(
        Boolean(tokenStore.getAccessToken() || tokenStore.hasSessionHint()),
      );
    };

    window.addEventListener(AUTH_CHANGE_EVENT, syncAuthState);
    return () => {
      window.removeEventListener(AUTH_CHANGE_EVENT, syncAuthState);
    };
  }, []);

  // 기능: 로그인 성공 직후 라우터 가드가 바로 열리도록 인증 상태만 즉시 올린다.
  const login = () => setIsAuthed(true);

  // 기능: 서버 응답과 무관하게 현재 브라우저의 인증 흔적을 즉시 제거한다.
  const logoutLocal = () => {
    tokenStore.clear();
    setIsAuthed(false);
  };

  // 기능: 서버 로그아웃 요청 이후 브라우저 토큰과 인증 상태를 함께 정리한다.
  // 설명: 서버 요청이 실패해도 로컬 세션은 남기지 않도록 finally에서 항상 초기화한다.
  // 흐름: logout API 호출 -> tokenStore 비우기 -> 비인증 상태로 전환.
  const logout = async () => {
    try {
      await authApi.logout();
    } finally {
      tokenStore.clear();
      setIsAuthed(false);
    }
  };

  const value = useMemo(
    () => ({ isAuthed, isBootstrapped, login, logout, logoutLocal }),
    [isAuthed, isBootstrapped],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
