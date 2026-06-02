import { apiClient } from "../../shared/api/apiClient";

export const storageApi = {
  uploadFile({ file, targetType = "POST", contentId, signal, onUploadProgress }) {
    const formData = new FormData();
    formData.append("file", file);

    return apiClient.post("/api/files", formData, {
      params: { targetType, contentId },
      signal,
      config: {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress,
      },
      fallbackMessage: "파일 업로드에 실패했습니다.",
    });
  },

  getFile(fileId, options) {
    return apiClient.get(`/api/files/${fileId}`, {
      ...options,
      fallbackMessage: "파일 정보를 불러오지 못했습니다.",
    });
  },

  deleteFile(fileId, options) {
    return apiClient.delete(`/api/files/${fileId}`, {
      ...options,
      fallbackMessage: "파일 삭제에 실패했습니다.",
    });
  },
};
