import { axiosInstance } from "./axiosInstance";

export const eventApi = {
  // GET /api/events
  getEvents: (params) => axiosInstance.get("/api/events", { params }),

  // GET /api/events/{eventId}
  getEventDetail: (eventId) => axiosInstance.get(`/api/events/${eventId}`),

  // GET /api/events/closed/analytics
  getClosedAnalytics: () => axiosInstance.get("/api/events/closed/analytics"),

  // POST /api/admin/events/poster/generate
  generateAdminPoster: (body, config = {}) =>
    axiosInstance.post("/api/admin/events/poster/generate", body, {
      timeout: 180000,
      ...config,
    }),

  // POST /api/admin/events/poster/upload
  uploadAdminPoster: (formData, config = {}) =>
    axiosInstance.post("/api/admin/events/poster/upload", formData, config),
};
