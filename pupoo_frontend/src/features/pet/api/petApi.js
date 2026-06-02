import { apiClient } from "../../shared/api/apiClient";

export const PET_BREEDS = ["DOG", "CAT", "OTHER"];

export const petApi = {
  async getMyPets(options) {
    const data = await apiClient.get("/api/pets/me", {
      ...options,
      fallbackMessage: "반려동물 목록을 불러오지 못했습니다.",
    });
    return data?.pets || [];
  },

  createPet(payload, options) {
    return apiClient.post("/api/pets", payload, {
      ...options,
      fallbackMessage: "반려동물 추가에 실패했습니다.",
    });
  },

  updatePet(petId, payload, options) {
    return apiClient.patch(`/api/pets/${petId}`, payload, {
      ...options,
      fallbackMessage: "반려동물 수정에 실패했습니다.",
    });
  },

  deletePet(petId, options) {
    return apiClient.delete(`/api/pets/${petId}`, {
      ...options,
      fallbackMessage: "반려동물 삭제에 실패했습니다.",
    });
  },
};
