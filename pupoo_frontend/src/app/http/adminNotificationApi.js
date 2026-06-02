import { axiosInstance } from "./axiosInstance";

function unwrap(res) {
  const body = res?.data;
  return body?.data ?? body;
}

export const adminNotificationApi = {
  list() {
    return axiosInstance
      .get("/api/admin/notifications")
      .then((res) => unwrap(res));
  },

  createDraft(payload) {
    return axiosInstance
      .post("/api/admin/notifications", {
        title: payload.title,
        content: payload.content,
        alertMode: payload.alertMode,
        eventId: payload.eventId,
        eventName: payload.eventName,
        eventStatus: payload.eventStatus,
        alertTargetLabel: payload.alertTargetLabel,
        specialTargetKey: payload.specialTargetKey,
        recipientScope: payload.recipientScope ?? null,
        recipientScopes: payload.recipientScopes ?? [],
      })
      .then((res) => unwrap(res));
  },

  updateDraft(id, payload) {
    return axiosInstance
      .put(`/api/admin/notifications/${id}`, {
        title: payload.title,
        content: payload.content,
        alertMode: payload.alertMode,
        eventId: payload.eventId,
        eventName: payload.eventName,
        eventStatus: payload.eventStatus,
        alertTargetLabel: payload.alertTargetLabel,
        specialTargetKey: payload.specialTargetKey,
        recipientScope: payload.recipientScope ?? null,
        recipientScopes: payload.recipientScopes ?? [],
      })
      .then((res) => unwrap(res));
  },

  delete(id) {
    return axiosInstance
      .delete(`/api/admin/notifications/${id}`)
      .then((res) => unwrap(res));
  },

  send(id) {
    return axiosInstance
      .post(`/api/admin/notifications/${id}/send`)
      .then((res) => unwrap(res));
  },

  publishEvent(payload) {
    const body = {
      type: payload.type,
      title: payload.title,
      content: payload.content,
      targetType: payload.targetType,
      targetId: payload.targetId,
      eventId: payload.eventId,
      channels: payload.channels ?? ["APP"],
      recipientScope: payload.recipientScope ?? "INTEREST_SUBSCRIBERS",
      recipientScopes: payload.recipientScopes,
    };
    return axiosInstance
      .post("/api/admin/notifications/event", body)
      .then((res) => unwrap(res));
  },

  publishBroadcast(payload) {
    const body = {
      type: payload.type,
      title: payload.title,
      content: payload.content,
      targetType: payload.targetType ?? "NOTICE",
      targetId: payload.targetId ?? 0,
      channels: payload.channels ?? ["APP"],
    };
    return axiosInstance
      .post("/api/admin/notifications/broadcast", body)
      .then((res) => unwrap(res));
  },
};
