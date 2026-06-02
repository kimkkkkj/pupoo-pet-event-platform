// src/app/http/postApi.js
import { axiosInstance } from "./axiosInstance";

function unwrap(res) {
  const body = res?.data;
  return body?.data ?? body;
}

/**
 * 게시글 API
 * - 목록/상세: 공개 (인증 불필요)
 * - 작성/수정/삭제: 인증 필요 (Bearer 토큰)
 */
export const postApi = {
  /**
   * GET /api/posts — 게시글 목록 (페이징, 검색)
   * @param {number} boardId - 게시판 ID (필수)
   * @param {object} opts - { page (0-based), size, searchType, keyword }
   */
  list(boardId, opts = {}) {
    if (boardId == null)
      throw new Error("postApi.list: boardId is required");
    const { page = 0, size = 10, searchType, keyword, sort, sortKey } = opts;
    const params = { boardId, page, size };
    if (searchType != null && searchType !== "") params.searchType = searchType;
    if (keyword != null && keyword !== "") params.keyword = keyword;
    if (sort != null && sort !== "") params.sort = sort;
    if (sortKey != null && sortKey !== "") params.sortKey = sortKey;
    return axiosInstance.get("/api/posts", { params }).then((res) => unwrap(res));
  },

  listByBoardType(boardType, opts = {}) {
    if (!boardType)
      throw new Error("postApi.listByBoardType: boardType is required");
    const { page = 0, size = 10, searchType, keyword, sort, sortKey } = opts;
    const params = { boardType, page, size };
    if (searchType != null && searchType !== "") params.searchType = searchType;
    if (keyword != null && keyword !== "") params.keyword = keyword;
    if (sort != null && sort !== "") params.sort = sort;
    if (sortKey != null && sortKey !== "") params.sortKey = sortKey;
    return axiosInstance.get("/api/posts", { params }).then((res) => unwrap(res));
  },

  /** GET /api/posts/{postId} — 게시글 단건 조회 (조회수 증가) */
  get(postId) {
    if (postId == null) throw new Error("postApi.get: postId is required");
    return axiosInstance.get(`/api/posts/${postId}`).then((res) => unwrap(res));
  },

  /** POST /api/posts — 게시글 작성 (인증 필요) */
  create(payload) {
    if (!payload?.boardId || payload?.postTitle == null)
      throw new Error("postApi.create: boardId, postTitle, content are required");
    return axiosInstance
      .post("/api/posts", {
        boardId: payload.boardId,
        postTitle: payload.postTitle ?? "",
        content: payload.content ?? "",
      }, { timeout: 120000 })
      .then((res) => unwrap(res));
  },

  /** PUT /api/posts/{postId} — 게시글 수정 (본인만) */
  update(postId, payload) {
    if (postId == null) throw new Error("postApi.update: postId is required");
    return axiosInstance
      .put(`/api/posts/${postId}`, {
        postTitle: payload?.postTitle ?? "",
        content: payload?.content ?? "",
      }, { timeout: 120000 })
      .then((res) => unwrap(res));
  },

  /** DELETE /api/posts/{postId} — 게시글 삭제 (본인만) */
  delete(postId) {
    if (postId == null) throw new Error("postApi.delete: postId is required");
    return axiosInstance.delete(`/api/posts/${postId}`).then((res) => unwrap(res));
  },
};

export function unwrapPost(res) {
  return unwrap(res);
}
