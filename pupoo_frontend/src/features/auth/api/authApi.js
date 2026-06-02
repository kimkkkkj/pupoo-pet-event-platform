import { apiClient, getApiErrorMessage, normalizeApiError } from "../../shared/api/apiClient";
import { unwrapApiResponse } from "../../shared/api/unwrapApiResponse";

export { getApiErrorMessage, normalizeApiError, unwrapApiResponse };

// 기능: 인증 화면들이 같은 API 이름과 에러 규칙을 공유하도록 auth 관련 호출을 한곳에 모은다.
// 설명: 각 메서드는 axios 직접 호출을 숨기고, 화면에서는 어떤 인증 단계인지 바로 읽히도록 의도를 드러낸다.
export const authApi = {
  // 기능: 회원가입 세션을 시작하고 휴대폰 OTP 발송을 요청한다.
  // 설명: 기본 정보 입력 단계에서 백엔드 signup/start 엔드포인트를 호출한다.
  // 흐름: 화면 입력값 정리 -> 공통 request 계층 호출 -> signupKey와 쿨다운 정보 수신.
  signupStart(payload, options) {
    return apiClient.post("/api/auth/signup/start", payload, {
      ...options,
      fallbackMessage: "회원가입 시작에 실패했습니다.",
    });
  },

  // 기능: 회원가입 휴대폰 OTP를 검증한다.
  // 설명: 휴대폰 인증 완료 여부는 이 응답 성공을 기준으로 판단한다.
  // 흐름: signupKey와 OTP 전달 -> 검증 성공 응답 수신 -> 다음 단계 진행.
  signupVerifyOtp(payload, options) {
    return apiClient.post("/api/auth/signup/verify-otp", payload, {
      ...options,
      fallbackMessage: "휴대폰 인증 확인에 실패했습니다.",
    });
  },

  // 기능: 회원가입 이메일 인증 메일 발송을 요청한다.
  // 설명: OTP 검증이 끝난 뒤 이메일 인증 코드를 발송한다.
  // 흐름: signupKey 전달 -> 인증 메일 발송 요청 -> dev 환경에서는 보조 코드가 함께 내려올 수 있다.
  signupEmailRequest(payload, options) {
    return apiClient.post("/api/auth/signup/email/request", payload, {
      ...options,
      fallbackMessage: "이메일 인증 요청에 실패했습니다.",
    });
  },

  // 기능: 회원가입 이메일 인증 코드를 확인한다.
  // 설명: 프론트는 성공 응답을 받은 뒤에만 이메일 인증 완료 상태로 전환한다.
  // 흐름: signupKey와 코드 전달 -> 검증 성공 응답 수신 -> 이메일 인증 완료 상태 반영.
  signupEmailConfirm(payload, options) {
    return apiClient.post("/api/auth/signup/email/confirm", payload, {
      ...options,
      fallbackMessage: "이메일 인증 확인에 실패했습니다.",
    });
  },

  // 기능: 회원가입을 최종 완료한다.
  // 설명: 휴대폰 인증과 필요한 이메일 인증이 끝난 뒤 최종 가입을 요청한다.
  // 흐름: signupKey 전달 -> 백엔드 가입 완료 -> access token 수신.
  signupComplete(payload, options) {
    return apiClient.post("/api/auth/signup/complete", payload, {
      ...options,
      fallbackMessage: "회원가입 완료에 실패했습니다.",
    });
  },

  // 기능: 일반 로그인을 처리한다.
  // 설명: 로그인 응답은 기존 토큰 저장 흐름과 그대로 연결된다.
  // 흐름: 자격 증명 전달 -> 로그인 응답 수신 -> 호출부에서 토큰 저장.
  login(payload, options) {
    return apiClient.post("/api/auth/login", payload, {
      ...options,
      fallbackMessage: "로그인에 실패했습니다.",
    });
  },

  // 기능: 비밀번호 재설정용 인증 코드를 요청한다.
  // 설명: 현재 백엔드는 링크형이 아니라 코드형 재설정 흐름을 제공한다.
  // 흐름: 이메일/휴대폰 전달 -> 코드 발급 응답 수신 -> 다음 검증 단계로 이동.
  passwordResetRequest(payload, options) {
    return apiClient.post("/api/auth/password-reset/request", payload, {
      ...options,
      fallbackMessage: "비밀번호 재설정 인증번호 요청에 실패했습니다.",
    });
  },

  // 기능: 비밀번호 재설정 인증 코드를 검증한다.
  // 설명: 새 비밀번호 입력 단계로 넘어가는 기준은 이 응답 성공이다.
  // 흐름: 이메일/휴대폰/인증코드 전달 -> 검증 성공 응답 수신 -> 재설정 컨텍스트 저장.
  passwordResetVerifyCode(payload, options) {
    return apiClient.post("/api/auth/password-reset/verify-code", payload, {
      ...options,
      fallbackMessage: "비밀번호 재설정 인증 확인에 실패했습니다.",
    });
  },

  // 기능: 새 비밀번호로 재설정을 완료한다.
  // 설명: 검증된 코드와 새 비밀번호를 함께 전달해 재설정을 확정한다.
  // 흐름: 재설정 컨텍스트 전달 -> 비밀번호 변경 응답 수신 -> 완료 화면 처리.
  passwordResetConfirm(payload, options) {
    return apiClient.post("/api/auth/password-reset/confirm", payload, {
      ...options,
      fallbackMessage: "비밀번호 재설정에 실패했습니다.",
    });
  },

  // 기능: refresh cookie 기반으로 access token을 복구한다.
  // 설명: withCredentials 흐름은 axios instance와 interceptor 규칙을 그대로 따른다.
  // 흐름: refresh 요청 -> access token 수신 -> 호출부에서 메모리 토큰 복구.
  refresh(options) {
    return apiClient.post("/api/auth/refresh", null, {
      ...options,
      fallbackMessage: "세션 갱신에 실패했습니다.",
    });
  },

  // 기능: 로그아웃을 요청한다.
  // 설명: 서버 세션 정리와 클라이언트 토큰 정리를 기존 규약에 맞춰 수행한다.
  // 흐름: 로그아웃 요청 -> 응답 수신 -> 호출부에서 로컬 토큰 정리.
  logout(options) {
    return apiClient.post("/api/auth/logout", null, {
      ...options,
      fallbackMessage: "로그아웃에 실패했습니다.",
    });
  },

  // 기능: 카카오 인가 코드를 교환한다.
  // 설명: 소셜 로그인 사전 교환 흐름을 공통 request 계층으로 처리한다.
  // 흐름: code와 redirectUri 전달 -> 백엔드 교환 응답 수신.
  kakaoExchange(payload, options) {
    return apiClient.post("/api/auth/oauth/kakao/exchange", payload, {
      ...options,
      fallbackMessage: "카카오 코드 교환에 실패했습니다.",
    });
  },

  // 기능: 카카오 로그인을 처리한다.
  // 설명: refresh cookie가 필요한 흐름이므로 withCredentials=true를 명시적으로 유지한다.
  // 흐름: 카카오 인가 정보 전달 -> 로그인 응답 수신 -> 호출부에서 신규/기존 회원 분기.
  kakaoLogin(payload, options = {}) {
    return apiClient.post("/api/auth/oauth/kakao/login", payload, {
      ...options,
      config: {
        withCredentials: true,
        ...(options?.config || {}),
      },
      fallbackMessage: "카카오 로그인 처리에 실패했습니다.",
    });
  },

  // 기능: 구글 로그인을 처리한다.
  // 설명: 인가 코드를 백엔드로 전달하고 신규/기존 회원 여부를 응답받는다.
  // 흐름: 구글 인가 code와 redirectUri 전달 -> 로그인 응답 수신 -> 호출부에서 신규/기존 회원 분기.
  googleLogin(payload, options = {}) {
    return apiClient.post("/api/auth/oauth/google/login", payload, {
      ...options,
      config: {
        withCredentials: true,
        ...(options?.config || {}),
      },
      fallbackMessage: "구글 로그인 처리에 실패했습니다.",
    });
  },

  // 기능: 마이페이지 이메일 변경 인증을 요청한다.
  // 설명: 새 이메일로 인증 토큰을 보내고, 최종 변경은 confirm 성공 시점에만 확정한다.
  // 흐름: 새 이메일 전달 -> 인증 발송 응답 수신 -> 확인 단계 대기.
  naverExchange(payload, options) {
    return apiClient.post("/api/auth/oauth/naver/exchange", payload, {
      ...options,
      fallbackMessage: "네이버 코드 교환에 실패했습니다.",
    });
  },

  naverLogin(payload, options = {}) {
    return apiClient.post("/api/auth/oauth/naver/login", payload, {
      ...options,
      config: {
        withCredentials: true,
        ...(options?.config || {}),
      },
      fallbackMessage: "네이버 로그인 처리에 실패했습니다.",
    });
  },

  requestEmailChange(payload, options) {
    return apiClient.post("/api/users/me/email-change/request", payload, {
      ...options,
      fallbackMessage: "이메일 변경 인증 요청에 실패했습니다.",
    });
  },

  // 기능: 마이페이지 이메일 변경을 확정한다.
  // 설명: 토큰 검증 성공 응답을 받은 뒤에만 사용자 정보 갱신을 진행한다.
  // 흐름: 토큰 전달 -> 이메일 변경 성공 응답 수신 -> 사용자 정보 재조회.
  confirmEmailChange(payload, options) {
    return apiClient.post("/api/users/me/email-change/confirm", payload, {
      ...options,
      fallbackMessage: "이메일 변경 인증 확인에 실패했습니다.",
    });
  },

  // 기능: 마이페이지 휴대폰 변경 OTP를 요청한다.
  // 설명: 새 휴대폰 번호 검증용 OTP 발송 요청을 처리한다.
  // 흐름: 새 휴대폰 번호 전달 -> 인증번호 발송 응답 수신.
  requestPhoneChange(payload, options) {
    return apiClient.post("/api/users/me/phone-change/request", payload, {
      ...options,
      fallbackMessage: "휴대폰 변경 인증 요청에 실패했습니다.",
    });
  },

  // 기능: 마이페이지 휴대폰 변경을 확정한다.
  // 설명: 휴대폰 변경 완료 여부는 백엔드 confirm 성공 응답으로만 판단한다.
  // 흐름: 휴대폰 번호와 OTP 전달 -> 변경 성공 응답 수신 -> 사용자 정보 재조회.
  confirmPhoneChange(payload, options) {
    return apiClient.post("/api/users/me/phone-change/confirm", payload, {
      ...options,
      fallbackMessage: "휴대폰 변경 인증 확인에 실패했습니다.",
    });
  },
};
