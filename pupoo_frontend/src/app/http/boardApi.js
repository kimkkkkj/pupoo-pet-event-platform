// src/app/http/boardApi.js
import { axiosInstance } from "./axiosInstance";

function unwrap(res) {
  const body = res?.data;
  return body?.data ?? body;
}

/**
 * 게시판 API (공개)
 * - GET /api/boards: 활성 게시판 목록
 */
export const boardApi = {
  /** GET /api/boards — 활성 게시판 목록 (activeOnly 기본 true) */
  getBoards(activeOnly = true) {
    return axiosInstance
      .get("/api/boards", { params: { activeOnly } })
      .then((res) => unwrap(res));
  },
};
