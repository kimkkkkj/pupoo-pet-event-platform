// src/app/http/userApi.js
import { axiosInstance } from "./axiosInstance";

function unwrap(res) {
  const body = res?.data;
  return body?.data ?? body;
}

export const userApi = {
  /** GET /api/users/me — 로그인 사용자 정보 (userId 등) */
  getMe() {
    return axiosInstance.get("/api/users/me").then((res) => unwrap(res));
  },
};