import axios from "axios";
import { attachInterceptors } from "./interceptors";
import {
  buildRequestUrl,
  getConfiguredBaseUrl,
} from "../../shared/config/requestUrl";

export function createAxiosInstance() {
  const baseURL = getConfiguredBaseUrl(import.meta.env.VITE_API_BASE_URL);

  const instance = axios.create({
    // 기능: axios 기본 인스턴스에 공통 헤더, timeout, 쿠키 포함 규칙만 부여한다.
    // 설명: baseURL을 여기서 고정하지 않고 request interceptor에서 최종 URL을 조합해 /api/api 중복을 막는다.
    baseURL: undefined,
    timeout: 30000,
    headers: { "Content-Type": "application/json" },
    withCredentials: true,
  });

  instance.interceptors.request.use((config) => {
    // 기능: 환경별 base URL과 상대 경로를 요청 직전에 하나의 URL로 합친다.
    config.url = buildRequestUrl(baseURL, config.url);
    return config;
  });

  // 기능: 인증 헤더 주입, refresh 재시도, 공개 API 예외 처리를 한 곳에 묶는다.
  attachInterceptors(instance, {
    publicPathPrefixes: ["/api/auth/", "/api/storage/presign"],
    publicGetPathPrefixes: [
      "/api/ping",
      "/api/health",
      "/api/posts",
      "/api/notices",
      "/api/boards",
      "/api/faqs",
      "/api/events",
      "/api/programs",
      "/api/ai",
      "/api/program-applies/programs/",
      "/api/speakers",
      "/api/booths",
      "/api/qnas",
      "/api/galleries",
      "/api/reviews",
      "/api/replies",
      "/api/report-reasons",
      "/api/files",
      "/api/users/check-nickname",
    ],
  });

  return instance;
}

export const axiosInstance = createAxiosInstance();
