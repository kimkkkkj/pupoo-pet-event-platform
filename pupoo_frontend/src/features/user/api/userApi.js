import { apiClient } from "../../shared/api/apiClient";

export const userApi = {
  checkNickname(nickname, options) {
    return apiClient.get("/api/users/check-nickname", {
      ...options,
      params: { nickname },
      fallbackMessage: "닉네임 중복 확인에 실패했습니다.",
    });
  },

  getMe(options) {
    return apiClient.get("/api/users/me", {
      ...options,
      fallbackMessage: "내 정보를 불러오지 못했습니다.",
    });
  },

  updateMe(payload, options) {
    return apiClient.patch("/api/users/me", payload, {
      ...options,
      fallbackMessage: "프로필 수정에 실패했습니다.",
    });
  },
};
