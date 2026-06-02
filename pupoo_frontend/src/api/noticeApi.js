import { axiosInstance } from "../app/http/axiosInstance";
import { tokenStore } from "../app/http/tokenStore";

/* 토큰 관리 */

export function getToken() {
  return tokenStore.getAdminAccess();
}

export function setToken(token) {
  tokenStore.setAdminAccess(token);
}

export function clearToken() {
  tokenStore.clearAdmin();
}

/** Authorization 헤더 생성 */
function authHeaders() {
  const token = tokenStore.getAdminAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/* 로그인 API */
export const authApi = {
  login: (email, password) => axiosInstance.post("/api/auth/login", { email, password }),
};

/* 공지사항 API (사용자) */
export const noticeApi = {
  /**
   * GET /api/notices - 공지 목록 조회 (페이지/검색/정렬)
   * @param {number} uiPage - 1-based 페이지
   * @param {number} size - 페이지 크기
   * @param {string} [searchType] - TITLE_CONTENT 등
   * @param {string} [keyword] - 검색어 (제목/내용, 비고정 공지에만 필터 적용)
   * @param {string} [scope] - all | ALL(전체공지) | EVENT(행사공지) (비고정 공지에만 필터 적용)
   * @param {string} [sort] - recent | views | oldest (고정/비고정 각각 적용)
   */
  list: (uiPage = 1, size = 10, searchType, keyword, scope, sort) => {
    const params = { page: uiPage - 1, size };
    if (searchType != null && searchType !== "") params.searchType = searchType;
    if (keyword != null && keyword !== "") params.keyword = keyword;
    if (scope != null && scope !== "" && scope !== "all") params.scope = scope;
    if (sort != null && sort !== "") params.sort = sort;
    return axiosInstance.get("/api/notices", { params });
  },
  get: (noticeId) => axiosInstance.get(`/api/notices/${noticeId}`),
};

/* 공지사항 API (관리자 - JWT 필요) */
export const adminNoticeApi = {
  list: (uiPage = 1, size = 10) =>
    axiosInstance.get("/api/admin/notices", {
      params: { page: uiPage - 1, size },
      headers: authHeaders(),
    }),

  get: (id) => axiosInstance.get(`/api/admin/notices/${id}`, { headers: authHeaders() }),

  create: (data) =>
    axiosInstance.post(
      "/api/admin/notices",
      {
        title: data.title,
        content: data.content || "",
        pinned: data.pinned ?? false,
        scope: data.scope || "ALL",
        eventId: data.eventId || null,
        status: data.status || "PUBLISHED",
      },
      { headers: authHeaders() },
    ),

  update: (id, data) =>
    axiosInstance.patch(
      `/api/admin/notices/${id}`,
      {
        title: data.title,
        content: data.content || "",
        pinned: data.pinned ?? false,
        status: data.status || "PUBLISHED",
      },
      { headers: authHeaders() },
    ),

  delete: (id) =>
    axiosInstance.delete(`/api/admin/notices/${id}`, {
      headers: authHeaders(),
    }),
};

export function unwrap(res) {
  return res?.data?.data ?? res?.data ?? null;
}
