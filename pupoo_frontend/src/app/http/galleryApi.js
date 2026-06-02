// src/app/http/galleryApi.js
import { axiosInstance } from "./axiosInstance";

export const galleryApi = {
  // =========================
  // 공개 API (사이트/목록/상세/좋아요)
  // =========================

  // GET /api/galleries — 목록 조회 (페이지네이션, PUBLIC만)
  getList: ({ page = 0, size = 10, sort, keyword } = {}) =>
    axiosInstance.get("/api/galleries", {
      params: { page, size, sort, keyword },
    }),

  // GET /api/events/{eventId}/galleries — 행사별 갤러리 목록(페이징)
  getListByEvent: (
    eventId,
    { page = 0, size = 10, sort, keyword } = {},
  ) => {
    if (eventId == null)
      throw new Error("galleryApi.getListByEvent: eventId is required");
    return axiosInstance.get(`/api/events/${eventId}/galleries`, {
      params: { page, size, sort, keyword },
    });
  },

  // GET /api/galleries/{galleryId} — 단건 조회
  getOne: (galleryId) => {
    if (galleryId == null)
      throw new Error("galleryApi.getOne: galleryId is required");
    return axiosInstance.get(`/api/galleries/${galleryId}`);
  },

  // POST /api/galleries/{galleryId}/like — 좋아요 (로그인 사용자, X-USER-ID 필요)
  like: (galleryId, userId) => {
    if (galleryId == null)
      throw new Error("galleryApi.like: galleryId is required");
    const headers = userId != null ? { "X-USER-ID": String(userId) } : {};
    return axiosInstance.post(`/api/galleries/${galleryId}/like`, null, { headers });
  },
  // DELETE /api/galleries/{galleryId}/like — 좋아요 취소
  unlike: (galleryId, userId) => {
    if (galleryId == null)
      throw new Error("galleryApi.unlike: galleryId is required");
    const headers = userId != null ? { "X-USER-ID": String(userId) } : {};
    return axiosInstance.delete(`/api/galleries/${galleryId}/like`, { headers });
  },

  // =========================
  // 사용자 API (회원 갤러리 작성/수정/삭제 — 로그인 필요)
  // =========================

  // POST /api/galleries/image/upload — 갤러리 이미지 1장 업로드 (로컬 디스크 저장), publicPath 반환
  uploadImage: (file) => {
    if (!file || !(file instanceof File))
      throw new Error("galleryApi.uploadImage: file is required");
    const formData = new FormData();
    formData.append("file", file);
    // Content-Type 제거 — FormData 면 boundary 포함 multipart/form-data 로 보내짐 (axios 기본 json 덮어씀)
    return axiosInstance.post("/api/galleries/image/upload", formData, {
      headers: { "Content-Type": undefined },
    });
  },

  // POST /api/galleries — 회원 갤러리 작성 (서버에서 user_id 설정)
  createByUser: (payload) => {
    if (!payload || payload.eventId == null)
      throw new Error("galleryApi.createByUser: payload.eventId is required");
    if (!payload?.title?.trim())
      throw new Error("galleryApi.createByUser: payload.title is required");
    return axiosInstance.post("/api/galleries", {
      eventId: payload.eventId,
      title: payload.title,
      description: payload.description ?? "",
      imageUrls: payload.imageUrls ?? [],
    });
  },

  // PATCH /api/galleries/{galleryId} — 수정 (작성자 본인 또는 관리자)
  updateOne: (galleryId, payload) => {
    if (galleryId == null)
      throw new Error("galleryApi.updateOne: galleryId is required");
    return axiosInstance.patch(`/api/galleries/${galleryId}`, {
      title: payload?.title ?? "",
      description: payload?.description ?? "",
    });
  },

  // DELETE /api/galleries/{galleryId} — 삭제/소프트삭제 (작성자 본인 또는 관리자)
  deleteOne: (galleryId) => {
    if (galleryId == null)
      throw new Error("galleryApi.deleteOne: galleryId is required");
    return axiosInstance.delete(`/api/galleries/${galleryId}`);
  },

  // =========================
  // 관리자 API (등록/수정/삭제)
  // =========================

  // POST /api/admin/galleries — 갤러리 등록
  create: (payload) => {
    if (!payload || payload.eventId == null)
      throw new Error("galleryApi.create: payload.eventId is required");
    if (!payload?.title?.trim())
      throw new Error("galleryApi.create: payload.title is required");
    return axiosInstance.post("/api/admin/galleries", payload);
  },

  // PATCH /api/admin/galleries/{galleryId} — 수정
  update: (galleryId, payload) => {
    if (galleryId == null)
      throw new Error("galleryApi.update: galleryId is required");
    return axiosInstance.patch(`/api/admin/galleries/${galleryId}`, payload);
  },

  // DELETE /api/admin/galleries/{galleryId} — 삭제 (소프트 삭제)
  delete: (galleryId) => {
    if (galleryId == null)
      throw new Error("galleryApi.delete: galleryId is required");
    return axiosInstance.delete(`/api/admin/galleries/${galleryId}`);
  },
};
