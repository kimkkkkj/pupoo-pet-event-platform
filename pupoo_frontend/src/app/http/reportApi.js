import { axiosInstance } from "./axiosInstance";

function unwrap(res) {
  const body = res?.data;
  return body?.data ?? body;
}

function normalizePayload(payload = {}) {
  return {
    reasonCode: payload.reasonCode,
    reasonDetail:
      payload.reasonCode === "OTHER"
        ? String(payload.reasonDetail || "").trim()
        : "",
  };
}

export const reportApi = {
  listReasons() {
    return axiosInstance.get("/api/report-reasons").then((res) => unwrap(res));
  },

  reportPost(postId, payload) {
    if (postId == null) throw new Error("reportApi.reportPost: postId is required");
    return axiosInstance
      .post(`/api/posts/${postId}/report`, normalizePayload(payload))
      .then((res) => unwrap(res));
  },

  reportReview(reviewId, payload) {
    if (reviewId == null) {
      throw new Error("reportApi.reportReview: reviewId is required");
    }
    return axiosInstance
      .post(`/api/reviews/${reviewId}/report`, normalizePayload(payload))
      .then((res) => unwrap(res));
  },

  reportReply(targetType, replyId, payload) {
    if (!targetType || replyId == null) {
      throw new Error("reportApi.reportReply: targetType and replyId are required");
    }
    return axiosInstance
      .post(
        `/api/replies/${String(targetType).toUpperCase()}/${replyId}/report`,
        normalizePayload(payload),
      )
      .then((res) => unwrap(res));
  },

  reportGallery(galleryId, payload) {
    if (galleryId == null) {
      throw new Error("reportApi.reportGallery: galleryId is required");
    }
    return axiosInstance
      .post(`/api/galleries/${galleryId}/report`, normalizePayload(payload))
      .then((res) => unwrap(res));
  },
};
