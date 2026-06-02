// src/api/qnaApi.js
import { axiosInstance } from "../app/http/axiosInstance";
import { tokenStore } from "../app/http/tokenStore";

/* ── 관리자 토큰 관리 (adminQnaApi 전용) ── */

function adminAuthHeaders() {
  const token = tokenStore.getAdminAccessToken();
  if (!token) return {};
  const headers = { Authorization: `Bearer ${token}` };
  return headers;
}

/* ── 공통 유틸 ── */
export function unwrap(res) {
  return res?.data?.data ?? res?.data ?? null;
}

/* ── 사용자용 (QnA.jsx) ── */
// ✅ headers를 수동으로 넣지 않음 → interceptors.js가
//    tokenStore의 사용자 토큰을 자동으로 Authorization에 붙여줌
export const qnaApi = {
  list: (uiPage = 1, size = 10, opts = {}) =>
    axiosInstance.get("/api/qnas", {
      params: {
        page: uiPage - 1,
        size,
        ...(opts?.statusFilter ? { statusFilter: opts.statusFilter } : {}),
        ...(opts?.keyword ? { keyword: opts.keyword } : {}),
        ...(opts?.sortKey ? { sortKey: opts.sortKey } : {}),
      },
    }),

  get: (qnaId) => axiosInstance.get(`/api/qnas/${qnaId}`),

  create: (data) =>
    axiosInstance.post("/api/qnas", {
      title: data.title,
      content: data.content,
    }, { timeout: 120000 }),

  update: (qnaId, data) =>
    axiosInstance.patch(`/api/qnas/${qnaId}`, {
      title: data.title,
      content: data.content,
    }, { timeout: 120000 }),

  delete: (qnaId) => axiosInstance.delete(`/api/qnas/${qnaId}`),

  /** 질문 마감(본인) — POST /api/qnas/{qnaId}/close */
  close: (qnaId) => axiosInstance.post(`/api/qnas/${qnaId}/close`),
};

/* ── 관리자용 (BoardManage) ── */
// ✅ 관리자 전용 토큰(pupoo_admin_token)을 명시적으로 사용
export const adminQnaApi = {
  list: (uiPage = 1, size = 20, opts = {}) =>
    axiosInstance.get("/api/qnas", {
      params: {
        page: uiPage - 1,
        size,
        ...(opts?.keyword ? { keyword: opts.keyword } : {}),
      },
      headers: adminAuthHeaders(),
    }),

  get: (qnaId) =>
    axiosInstance.get(`/api/qnas/${qnaId}`, { headers: adminAuthHeaders() }),

  create: (data) =>
    axiosInstance.post(
      "/api/qnas",
      { title: data.title, content: data.content },
      { headers: adminAuthHeaders() },
    ),

  update: (qnaId, data) =>
    axiosInstance.patch(
      `/api/qnas/${qnaId}`,
      { title: data.title, content: data.content },
      { headers: adminAuthHeaders() },
    ),

  delete: (qnaId) =>
    axiosInstance.delete(`/api/qnas/${qnaId}`, {
      headers: adminAuthHeaders(),
    }),

  /** 운영자 답변 등록/수정 */
  answer: (qnaId, answerContent) =>
    axiosInstance.put(
      `/api/admin/qnas/${qnaId}/answer`,
      { answerContent },
      { headers: adminAuthHeaders() },
    ),

  /** 운영자 답변 삭제 */
  clearAnswer: (qnaId) =>
    axiosInstance.delete(`/api/admin/qnas/${qnaId}/answer`, {
      headers: adminAuthHeaders(),
    }),
};
