import { axiosInstance } from "./axiosInstance";
import { buildFormData } from "../../shared/utils/buildFormData";

// 기능: 호출부가 `/api`를 생략해도 공통 HTTP 계층에서 같은 경로 규칙으로 맞춘다.
// 설명: 이미 `/api`가 붙은 주소와 절대 URL은 유지하고, 나머지 상대 경로만 `/api` 기준으로 보정한다.
// 흐름: 전달된 url 검사 -> 절대 주소/기존 `/api`는 유지 -> 아니면 `/api` 접두어 추가.
function withApiPrefix(url = "") {
  if (/^https?:\/\//i.test(url)) return url;
  const u = url.startsWith("/") ? url : `/${url}`;
  if (u === "/api" || u.startsWith("/api/")) return u;
  return `/api${u}`;
}

export const apiJson = {
  get: (url, config) => axiosInstance.get(withApiPrefix(url), config),
  post: (url, data, config) => axiosInstance.post(withApiPrefix(url), data, config),
  put: (url, data, config) => axiosInstance.put(withApiPrefix(url), data, config),
  delete: (url, config) => axiosInstance.delete(withApiPrefix(url), config),
};

export const apiForm = {
  post: (url, obj, config) =>
    axiosInstance.post(withApiPrefix(url), buildFormData(obj), config),
  put: (url, obj, config) =>
    axiosInstance.put(withApiPrefix(url), buildFormData(obj), config),
};

export const apiUrlEncoded = {
  post: (url, params, config) =>
    axiosInstance.post(withApiPrefix(url), new URLSearchParams(params), {
      ...config,
      headers: { ...(config?.headers || {}), "Content-Type": "application/x-www-form-urlencoded" },
    }),
};
