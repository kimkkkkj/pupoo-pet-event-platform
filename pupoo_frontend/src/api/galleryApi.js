// src/app/http/galleryApi.js
import { axiosInstance } from "./axiosInstance";
import { tokenStore } from "../app/http/tokenStore";

/* ── 토큰 (noticeApi와 동일 키) ── */

function authHeaders() {
  const token = tokenStore.getAdminAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/* ── 공개 API (인증 불필요) ── */
export const galleryApi = {
  // GET /api/galleries — 목록 조회
  getList: ({ page = 0, size = 10 } = {}) =>
    axiosInstance.get("/api/galleries", { params: { page, size } }),

  // GET /api/events/{eventId}/galleries — 행사별 갤러리 목록
  getListByEvent: (eventId, { page = 0, size = 10 } = {}) =>
    axiosInstance.get(`/api/events/${eventId}/galleries`, {
      params: { page, size },
    }),

  // GET /api/galleries/{galleryId} — 단건 조회
  getOne: (galleryId) => axiosInstance.get(`/api/galleries/${galleryId}`),

  // POST /api/galleries/{galleryId}/like
  like: (galleryId) =>
    axiosInstance.post(`/api/galleries/${galleryId}/like`, null),

  // DELETE /api/galleries/{galleryId}/like
  unlike: (galleryId) =>
    axiosInstance.delete(`/api/galleries/${galleryId}/like`),
};

/* ── 관리자 API (JWT 필요 — noticeApi와 동일 패턴) ── */
export const adminGalleryApi = {
  // GET /api/admin/galleries — 관리자 목록
  list: (uiPage = 1, size = 10) =>
    axiosInstance.get("/api/admin/galleries", {
      params: { page: uiPage - 1, size },
      headers: authHeaders(),
    }),

  // GET /api/admin/galleries/{id}
  get: (id) =>
    axiosInstance.get(`/api/admin/galleries/${id}`, {
      headers: authHeaders(),
    }),

  // POST /api/admin/galleries — 등록
  create: (data) =>
    axiosInstance.post(
      "/api/admin/galleries",
      {
        title: data.title,
        content: data.content || "",
        eventId: data.eventId || null,
        status: data.status || "PUBLIC",
      },
      { headers: authHeaders() },
    ),

  // PATCH /api/admin/galleries/{id} — 수정
  update: (id, data) =>
    axiosInstance.patch(
      `/api/admin/galleries/${id}`,
      {
        title: data.title,
        content: data.content || "",
        eventId: data.eventId || null,
        status: data.status || "PUBLIC",
      },
      { headers: authHeaders() },
    ),

  // DELETE /api/admin/galleries/{id} — 삭제
  delete: (id) =>
    axiosInstance.delete(`/api/admin/galleries/${id}`, {
      headers: authHeaders(),
    }),
};

export function unwrap(res) {
  return res?.data?.data ?? res?.data ?? null;
}
