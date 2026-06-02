import { userApi } from "../../user/api/userApi";
import { petApi } from "../../pet/api/petApi";
import { apiClient } from "../../shared/api/apiClient";

export const mypageApi = {
  getMe: userApi.getMe,
  updateMe: userApi.updateMe,
  getMyPets: petApi.getMyPets,
  createPet: petApi.createPet,
  updatePet: petApi.updatePet,
  deletePet: petApi.deletePet,

  issueMyQr(eventId, options) {
    return apiClient.get("/api/qr/me", {
      ...options,
      params: { eventId },
      fallbackMessage: "Failed to issue QR code.",
    });
  },

  getMyBoothVisitsGroupedByEvent(options) {
    return apiClient.get("/api/me/booth-visits", {
      ...options,
      fallbackMessage: "Failed to load QR scan history.",
    });
  },

  getMyEventRegistrations({ page = 0, size = 20 } = {}, options) {
    return apiClient.get("/api/users/me/event-registrations", {
      ...options,
      params: { page, size },
      fallbackMessage: "Failed to load my event registrations.",
    });
  },

  getMyRefunds({ page = 0, size = 50, sort = "requestedAt,desc" } = {}, options) {
    return apiClient.get("/api/refunds/my", {
      ...options,
      params: { page, size, sort },
      fallbackMessage: "Failed to load my refunds.",
    });
  },

  getMyProgramApplies({ page = 0, size = 20 } = {}, options) {
    return apiClient.get("/api/program-applies/my", {
      ...options,
      params: { page, size },
      fallbackMessage: "Failed to load my program applications.",
    });
  },

  deleteMe(options) {
    return apiClient.delete("/api/users/me", {
      ...options,
      fallbackMessage: "Failed to delete account.",
    });
  },
};
