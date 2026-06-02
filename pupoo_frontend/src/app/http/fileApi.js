// src/app/http/fileApi.js
import { axiosInstance } from "./axiosInstance";
import {
  buildRequestUrl,
  getConfiguredBaseUrl,
} from "../../shared/config/requestUrl";

function unwrap(res) {
  const body = res?.data;
  return body?.data ?? body;
}

/**
 * 첨부파일 API
 * - POST: 인증 필요 (게시글 작성자만 업로드 후 본인 게시글에 연결)
 * - GET by-post, GET fileId, GET download: 공개
 * - DELETE: 인증 필요 (업로더만)
 */
export const fileApi = {
  /**
   * POST /api/files — 첨부 업로드 (multipart/form-data)
   * @param {File} file - 업로드할 파일
   * @param {string} targetType - "POST" | "NOTICE" (NOTICE는 어드민 전용)
   * @param {number} contentId - 게시글 ID(postId) 또는 공지 ID(noticeId)
   */
  upload(file, targetType, contentId) {
    if (!file || !targetType || contentId == null)
      throw new Error("fileApi.upload: file, targetType, contentId are required");
    const form = new FormData();
    form.append("file", file);
    form.append("targetType", targetType);
    form.append("contentId", String(contentId));
    return axiosInstance.post("/api/files", form).then((res) => unwrap(res));
  },

  /** GET /api/files/{fileId} — 파일 메타 조회 */
  get(fileId) {
    if (fileId == null) throw new Error("fileApi.get: fileId is required");
    return axiosInstance.get(`/api/files/${fileId}`).then((res) => unwrap(res));
  },

  /**
   * GET /api/files/by-post/{postId} — 게시글 첨부 조회 (없으면 404)
   * @returns {Promise<{ fileId, originalName, publicPath }>}
   */
  getByPostId(postId) {
    if (postId == null) throw new Error("fileApi.getByPostId: postId is required");
    return axiosInstance
      .get(`/api/files/by-post/${postId}`)
      .then((res) => unwrap(res));
  },

  /**
   * GET /api/files/{fileId}/download — 다운로드(302 리다이렉트)
   * 브라우저에서 링크로 열거나 publicPath 직접 사용 가능.
   */
  getDownloadUrl(fileId) {
    const base = getConfiguredBaseUrl(import.meta.env.VITE_API_BASE_URL);
    return buildRequestUrl(base, `/api/files/${fileId}/download`);
  },

  /** DELETE /api/files/{fileId} — 첨부 삭제 (업로더만) */
  delete(fileId) {
    if (fileId == null) throw new Error("fileApi.delete: fileId is required");
    return axiosInstance.delete(`/api/files/${fileId}`).then((res) => unwrap(res));
  },
};
