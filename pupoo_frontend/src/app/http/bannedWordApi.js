/**
 * 관리자 금지어 API
 * - GET /api/admin/boards/{boardId}/banned-words
 * - POST /api/admin/boards/{boardId}/banned-words
 * - PATCH /api/admin/banned-words/{bannedWordId}
 * - DELETE /api/admin/banned-words/{bannedWordId}
 *
 * 관리자 정책 API
 * - GET /api/admin/moderation/policies/active
 * - GET /api/admin/moderation/policies/uploads?page=&size=
 * - POST /api/admin/moderation/policies/upload
 *
 * AI 모더레이션 BLOCK 로그
 * - GET /api/admin/moderation/logs?boardId=&page=&size=
 */
import { axiosInstance } from "./axiosInstance";

function unwrap(res) {
  const body = res?.data;
  return body?.data ?? body;
}

export const bannedWordApi = {
  /**
   * @param {string} [q] 금지어 부분 검색 (서버 LIKE)
   */
  list(boardId, page = 0, size = 20, q) {
    const params = { page, size };
    if (q != null && String(q).trim() !== "") {
      params.q = String(q).trim();
    }
    return axiosInstance
      .get(`/api/admin/boards/${boardId}/banned-words`, {
        params,
      })
      .then((res) => unwrap(res));
  },

  create(boardId, body) {
    return axiosInstance
      .post(`/api/admin/boards/${boardId}/banned-words`, body)
      .then((res) => unwrap(res));
  },

  update(bannedWordId, body) {
    return axiosInstance
      .patch(`/api/admin/banned-words/${bannedWordId}`, body)
      .then((res) => unwrap(res));
  },

  delete(bannedWordId) {
    return axiosInstance
      .delete(`/api/admin/banned-words/${bannedWordId}`)
      .then((res) => unwrap(res));
  },
};

export const moderationLogsApi = {
  /**
   * @param {number} page
   * @param {number} size
   * @param {number} [boardId] - 없으면 전체 게시판 로그
   */
  list(page = 0, size = 10, boardId) {
    const params = { page, size };
    if (boardId != null && boardId !== "") {
      params.boardId = boardId;
    }
    return axiosInstance
      .get("/api/admin/moderation/logs", { params })
      .then((res) => unwrap(res));
  },
};

export const policyApi = {
  getActive() {
    return axiosInstance
      .get("/api/admin/moderation/policies/active")
      .then((res) => unwrap(res));
  },

  /**
   * 정책 업로드 이력 (PageResponse: content, page, size, totalElements, …)
   */
  listUploads(page = 0, size = 20) {
    return axiosInstance
      .get("/api/admin/moderation/policies/uploads", { params: { page, size } })
      .then((res) => unwrap(res));
  },

  upload(file) {
    const form = new FormData();
    form.append("file", file);
    return axiosInstance
      .post("/api/admin/moderation/policies/upload", form, {
        headers: { "Content-Type": "multipart/form-data" },
        // 백엔드 ai.moderation.timeout-seconds(기본 300) + 여유
        timeout: 360_000,
      })
      .then((res) => unwrap(res));
  },
};

/** 백엔드 BannedWordCategory enum 값 (라벨 매핑용) */
export const BANNED_WORD_CATEGORIES = [
  { value: "LEGAL_RESTRICTION", label: "법적/불법 정보" },
  { value: "ABUSE_INSULT", label: "욕설 및 비하" },
  { value: "HATE_SPEECH", label: "혐오 및 차별" },
  { value: "ADULT_CONTENT", label: "음란 및 선정성" },
  { value: "SPAM_ADVERTISING", label: "광고 및 도배" },
  { value: "PET_SENSITIVE", label: "애견 플랫폼 특화(민감어)" },
  { value: "COMMERCIAL_SALE", label: "영리 목적 분양/교배" },
  { value: "SYSTEM_ABUSE", label: "시스템 어뷰징/티켓" },
  { value: "OTHER", label: "기타" },
];
