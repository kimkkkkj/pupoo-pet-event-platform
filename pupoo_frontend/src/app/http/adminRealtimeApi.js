import { axiosInstance } from "./axiosInstance";

export const adminRealtimeApi = {
  getEventsSnapshot: () => axiosInstance.get("/api/realtime/events"),

  getOverviewSnapshot: (eventId) =>
    axiosInstance.get(`/api/realtime/events/${eventId}/overview`),

  getDashboardSnapshot: (eventId) =>
    axiosInstance.get(`/api/realtime/events/${eventId}/dashboard`),

  getWaitingStatusSnapshot: (eventId) =>
    axiosInstance.get(`/api/realtime/events/${eventId}/waiting-status`),

  getCheckinStatusSnapshot: (eventId) =>
    axiosInstance.get(`/api/realtime/events/${eventId}/checkin-status`),

  getVoteStatusSnapshot: (eventId) =>
    axiosInstance.get(`/api/realtime/events/${eventId}/vote-status`),
};
