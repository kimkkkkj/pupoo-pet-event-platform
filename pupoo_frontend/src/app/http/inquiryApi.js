// src/app/http/inquiryApi.js
import { axiosInstance } from "./axiosInstance";

function unwrap(res) {
  const body = res?.data;
  return body?.data ?? body;
}

/**
 * 1:1 문의 API (로그인 필요)
 * - 백엔드: POST/GET/PUT/PATCH /api/inquiries, GET /api/inquiries/mine
 */
export const inquiryApi = {
  /**
   * GET /api/inquiries/mine — 내 문의 목록 (페이징, 상태 필터)
   * @param {object} opts - { page (0-based), size, status (OPEN|IN_PROGRESS|CLOSED) }
   */
  list(opts = {}) {
    const { page = 0, size = 10, status } = opts;
    const params = { page, size };
    if (status != null && status !== "") params.status = status;
    return axiosInstance.get("/api/inquiries/mine", { params }).then((res) => unwrap(res));
  },

  /** GET /api/inquiries/{inquiryId} — 내 문의 단건 조회 */
  get(inquiryId) {
    if (inquiryId == null) throw new Error("inquiryApi.get: inquiryId is required");
    return axiosInstance.get(`/api/inquiries/${inquiryId}`).then((res) => unwrap(res));
  },

  /** POST /api/inquiries — 문의 등록 */
  create(payload) {
    if (!payload?.category || payload?.inquiryTitle == null)
      throw new Error("inquiryApi.create: category, inquiryTitle are required");
    return axiosInstance
      .post("/api/inquiries", {
        category: payload.category,
        inquiryTitle: payload.inquiryTitle ?? "",
        content: payload.content ?? "",
      })
      .then((res) => unwrap(res));
  },

  /** PUT /api/inquiries/{inquiryId} — 문의 수정 (OPEN 상태만) */
  update(inquiryId, payload) {
    if (inquiryId == null) throw new Error("inquiryApi.update: inquiryId is required");
    return axiosInstance
      .put(`/api/inquiries/${inquiryId}`, {
        category: payload?.category,
        inquiryTitle: payload?.inquiryTitle ?? "",
        content: payload?.content ?? "",
      })
      .then((res) => unwrap(res));
  },

  /** PATCH /api/inquiries/{inquiryId}/close — 문의 마감 */
  close(inquiryId) {
    if (inquiryId == null) throw new Error("inquiryApi.close: inquiryId is required");
    return axiosInstance.patch(`/api/inquiries/${inquiryId}/close`).then((res) => unwrap(res));
  },
};
