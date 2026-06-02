// src/api/reviewApi.js
import { axiosInstance } from "../app/http/axiosInstance";
import { tokenStore } from "../app/http/tokenStore";

/* 관리자 토큰 관리 */

function adminAuthHeaders() {
  const token = tokenStore.getAdminAccessToken();
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

export function unwrap(res) {
  return res?.data?.data ?? res?.data ?? null;
}

/* 백엔드 라우트 자동 탐색 */
// 백엔드 구조에 따라 /api/admin/reviews 또는 /api/reviews 를 사용한다.
let resolvedBase = null;

async function resolveBase() {
  if (resolvedBase) return resolvedBase;

  const candidates = ["/api/admin/reviews", "/api/reviews"];

  for (const base of candidates) {
    try {
      const res = await axiosInstance.get(base, {
        params: { page: 0, size: 1 },
        headers: adminAuthHeaders(),
      });
      if (res.status === 200) {
        resolvedBase = base;
        return base;
      }
    } catch (err) {
      const status = err?.response?.status;
      if (status === 401 || status === 403) {
        resolvedBase = base;
        return base;
      }
    }
  }

  resolvedBase = "/api/admin/reviews";
  return resolvedBase;
}

/* 관리자 Review API */
export const adminReviewApi = {
  list: async (uiPage = 1, size = 20) => {
    const base = await resolveBase();
    return axiosInstance.get(base, {
      params: { page: uiPage - 1, size },
      headers: adminAuthHeaders(),
    });
  },

  get: async (reviewId) => {
    const base = await resolveBase();
    return axiosInstance.get(`${base}/${reviewId}`, {
      headers: adminAuthHeaders(),
    });
  },

  create: async (data) => {
    const base = await resolveBase();
    return axiosInstance.post(
      base,
      {
        eventId: data.eventId || null,
        content: data.content || "",
        rating: data.rating ?? 5,
        title: data.title || "",
      },
      { headers: adminAuthHeaders() },
    );
  },

  update: async (reviewId, data) => {
    const base = await resolveBase();
    return axiosInstance.patch(
      `${base}/${reviewId}`,
      {
        content: data.content || "",
        rating: data.rating ?? 5,
        title: data.title || "",
      },
      { headers: adminAuthHeaders() },
    );
  },

  delete: async (reviewId) => {
    const base = await resolveBase();
    return axiosInstance.delete(`${base}/${reviewId}`, {
      headers: adminAuthHeaders(),
    });
  },
};
