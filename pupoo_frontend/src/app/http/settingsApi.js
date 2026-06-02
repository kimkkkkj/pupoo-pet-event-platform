// src/app/http/settingsApi.js
import { axiosInstance } from "./axiosInstance";

function unwrap(res) {
  const body = res?.data;
  return body?.data ?? body;
}

/**
 * 설정 API 클라이언트 (인증 필요)
 * - 알림 설정: GET/PUT /api/notifications/settings
 */
export const settingsApi = {
  /**
   * 알림 설정 조회
   * GET /api/notifications/settings
   * @returns {Promise<{ allowMarketing: boolean, updatedAt: string }>}
   */
  getNotificationSettings() {
    return axiosInstance
      .get("/api/notifications/settings")
      .then((res) => unwrap(res));
  },

  /**
   * 알림 설정 — 마케팅 수신 동의 업데이트
   * PUT /api/notifications/settings?allowMarketing=true|false
   * @param {boolean} allowMarketing
   * @returns {Promise<{ allowMarketing: boolean, updatedAt: string }>}
   */
  updateNotificationSettings(allowMarketing) {
    return axiosInstance
      .put("/api/notifications/settings", null, { params: { allowMarketing } })
      .then((res) => unwrap(res));
  },
};
