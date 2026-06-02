// src/app/http/notificationApi.js
import { axiosInstance } from "./axiosInstance";

export const NOTIFICATION_UNREAD_COUNT_EVENT =
  "pupoo:notification-unread-count";

function unwrap(res) {
  const body = res?.data;
  return body?.data ?? body;
}

export function emitNotificationUnreadCount(count) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(NOTIFICATION_UNREAD_COUNT_EVENT, {
      detail: { count: Number(count) || 0 },
    }),
  );
}

/**
 * 알림 API (인증 필요)
 * - GET /api/notifications — 내 인박스(미열람) 목록 페이징
 * - GET /api/notifications/unread-count — 읽지 않은 알림 수
 * - POST /api/notifications/{inboxId}/click — 읽음 처리(클릭), targetType/targetId 반환
 * - DELETE /api/notifications/{inboxId} — 이동 없이 인박스에서 제거
 */
export const notificationApi = {
  /**
   * 내 알림함(인박스) 목록 페이징
   * @param {number} page - 0-based
   * @param {number} size - 페이지 크기
   * @returns {Promise<{ items: Array<{ inboxId, type, title, content, receivedAt, targetType, targetId }>, page, size, totalElements, totalPages }>}
   */
  getInbox(page = 0, size = 20) {
    return axiosInstance
      .get("/api/notifications", { params: { page, size } })
      .then((res) => unwrap(res));
  },

  /**
   * 읽지 않은 알림 수 (배지용)
   * @returns {Promise<number>}
   */
  getUnreadCount() {
    return axiosInstance
      .get("/api/notifications/unread-count")
      .then((res) => unwrap(res));
  },

  /**
   * 알림 클릭(읽음 처리). 인박스에서 제거되고 이동 대상 반환
   * @param {number} inboxId
   * @returns {Promise<{ targetType: 'EVENT'|'NOTICE', targetId: number }>}
   */
  click(inboxId) {
    if (inboxId == null) throw new Error("notificationApi.click: inboxId is required");
    return axiosInstance
      .post(`/api/notifications/${inboxId}/click`)
      .then((res) => unwrap(res));
  },

  delete(inboxId) {
    if (inboxId == null) throw new Error("notificationApi.delete: inboxId is required");
    return axiosInstance
      .delete(`/api/notifications/${inboxId}`)
      .then((res) => unwrap(res));
  },
};
