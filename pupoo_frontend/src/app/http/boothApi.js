import { axiosInstance } from "./axiosInstance";

export const boothApi = {
  getEventBooths: ({ eventId, page = 0, size = 200, sort = "boothId,asc" }) => {
    if (eventId == null) throw new Error("getEventBooths: eventId is required");

    return axiosInstance.get(`/api/events/${eventId}/booths`, {
      params: { page, size, sort },
    });
  },

  getBoothDetail: (boothId) => {
    if (boothId == null) throw new Error("getBoothDetail: boothId is required");
    return axiosInstance.get(`/api/booths/${boothId}`);
  },
};

