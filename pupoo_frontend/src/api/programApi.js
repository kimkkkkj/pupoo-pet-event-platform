// src/api/programApi.js
// ── pupoo 실제 백엔드 기반 프로그램 API ──
import { axiosInstance } from "../app/http/axiosInstance";
import { tokenStore } from "../app/http/tokenStore";

/* ── 관리자 토큰 관리 ── */

function adminAuthHeaders() {
  const token = tokenStore.getAdminAccessToken();
  if (!token) return {};
  const headers = { Authorization: `Bearer ${token}` };
  return headers;
}

/* ── 공통 유틸 ── */
export function unwrap(res) {
  return res?.data?.data ?? res?.data ?? null;
}

/* ══════════════════════════════════════════════
   1. 사용자용 API — 홈페이지 (Experience / Contest / Session)
   
   실제 백엔드 엔드포인트:
     GET  /api/events/{eventId}/programs?category=EXPERIENCE
     GET  /api/programs/{programId}
     GET  /api/programs/{programId}/speakers
     POST /api/program-applies              body: { programId }
     PATCH /api/program-applies/{id}/cancel
     GET  /api/program-applies/my
   ══════════════════════════════════════════════ */

/** 프로그램 공통 조회 API */
export const programApi = {
  /** 행사별 프로그램 목록 (category 필터 가능) */
  list: (eventId, category = null, page = 0, size = 20) =>
    axiosInstance.get(`/api/events/${eventId}/programs`, {
      params: {
        ...(category ? { category } : {}),
        page,
        size,
      },
    }),

  /** 프로그램 상세 */
  get: (programId) => axiosInstance.get(`/api/programs/${programId}`),

  /** 프로그램의 연사 목록 */
  speakers: (programId) =>
    axiosInstance.get(`/api/programs/${programId}/speakers`),
};

/** 체험존 (Experience) — 사용자 */
export const experienceApi = {
  list: (eventId, page = 0, size = 20) =>
    programApi.list(eventId, "EXPERIENCE", page, size),

  get: (programId) => programApi.get(programId),
};

/** 콘테스트 (Contest) — 사용자 */
export const contestApi = {
  list: (eventId, page = 0, size = 20) =>
    programApi.list(eventId, "CONTEST", page, size),

  get: (programId) => programApi.get(programId),

  // TODO: 콘테스트 투표 API (백엔드 미구현)
  // vote: (programId, programApplyId) => ...
  // myVote: (programId) => ...
};

/** 세션·강연 (Session) — 사용자 */
export const sessionApi = {
  list: (eventId, page = 0, size = 20) =>
    programApi.list(eventId, "SESSION", page, size),

  get: (programId) => programApi.get(programId),

  speakers: (programId) => programApi.speakers(programId),
};

/** 프로그램 참가 신청 API (인증 필요 — interceptor가 토큰 자동 부여) */
export const programApplyApi = {
  /** 참가 신청 */
  apply: (programId) =>
    axiosInstance.post("/api/program-applies", { programId }),

  /** 참가 취소 */
  cancel: (programApplyId) =>
    axiosInstance.patch(`/api/program-applies/${programApplyId}/cancel`),

  /** 내 참가 목록 */
  my: (page = 0, size = 20) =>
    axiosInstance.get("/api/program-applies/my", {
      params: { page, size },
    }),

  /** 참가 상세 */
  get: (programApplyId) =>
    axiosInstance.get(`/api/program-applies/${programApplyId}`),
};

/* ══════════════════════════════════════════════
   2. 관리자용 API — 대시보드 (zoneManage / contestManage / sessionManage)
   
   ⚠️ 백엔드 관리자 프로그램 CRUD는 아직 미구현 (ProgramAdminService @Deprecated)
   아래는 구현 예정 엔드포인트 기준으로 작성.
   백엔드 구현 완료 후 바로 연결 가능.
   
   예정 엔드포인트:
     GET    /api/admin/programs?category=EXPERIENCE&page=0&size=20
     GET    /api/admin/programs/{programId}
     POST   /api/admin/programs
     PATCH  /api/admin/programs/{programId}
     DELETE /api/admin/programs/{programId}
   ══════════════════════════════════════════════ */

/** 관리자 프로그램 공통 */
const adminProgramBase = {
  list: (eventId, category, page = 0, size = 20) =>
    axiosInstance.get(`/api/admin/dashboard/events/${eventId}/programs`, {
      params: { category, page, size },
      headers: adminAuthHeaders(),
    }),

  get: (programId) =>
    axiosInstance.get(`/api/programs/${programId}`, {
      headers: adminAuthHeaders(),
    }),

  create: (data) =>
    axiosInstance.post("/api/admin/dashboard/programs", data, {
      headers: adminAuthHeaders(),
    }),

  update: (programId, data) =>
    axiosInstance.patch(`/api/admin/dashboard/programs/${programId}`, data, {
      headers: adminAuthHeaders(),
    }),

  delete: (programId) =>
    axiosInstance.delete(`/api/admin/dashboard/programs/${programId}`, {
      headers: adminAuthHeaders(),
    }),
};

/** 체험존 관리 (Admin) */
export const adminExperienceApi = {
  list: (eventId = 1, page = 0, size = 20) =>
    adminProgramBase.list(eventId, "EXPERIENCE", page, size),

  get: (programId) => adminProgramBase.get(programId),

  create: (data) =>
    adminProgramBase.create({
      eventId: data.eventId || 1,
      category: "EXPERIENCE",
      programTitle: data.name || data.programTitle,
      description: data.description || "",
      startAt: data.startAt || null,
      endAt: data.endAt || null,
      boothId: data.boothId || null,
    }),

  update: (programId, data) =>
    adminProgramBase.update(programId, {
      programTitle: data.name || data.programTitle,
      description: data.description || "",
      startAt: data.startAt || null,
      endAt: data.endAt || null,
      boothId: data.boothId || null,
    }),

  delete: (programId) => adminProgramBase.delete(programId),
};

/** 콘테스트 관리 (Admin) */
export const adminContestApi = {
  list: (eventId = 1, page = 0, size = 20) =>
    adminProgramBase.list(eventId, "CONTEST", page, size),

  get: (programId) => adminProgramBase.get(programId),

  create: (data) =>
    adminProgramBase.create({
      eventId: data.eventId || 1,
      category: "CONTEST",
      programTitle: data.name || data.programTitle,
      description: data.description || "",
      startAt: data.startAt || null,
      endAt: data.endAt || null,
      boothId: data.boothId || null,
    }),

  update: (programId, data) =>
    adminProgramBase.update(programId, {
      programTitle: data.name || data.programTitle,
      description: data.description || "",
      startAt: data.startAt || null,
      endAt: data.endAt || null,
      boothId: data.boothId || null,
    }),

  delete: (programId) => adminProgramBase.delete(programId),
};

/** 세션/강연 관리 (Admin) */
export const adminSessionApi = {
  list: (eventId = 1, page = 0, size = 20) =>
    adminProgramBase.list(eventId, "SESSION", page, size),

  get: (programId) => adminProgramBase.get(programId),

  create: (data) =>
    adminProgramBase.create({
      eventId: data.eventId || 1,
      category: "SESSION",
      programTitle: data.name || data.programTitle,
      description: data.description || "",
      startAt: data.startAt || null,
      endAt: data.endAt || null,
      boothId: data.boothId || null,
    }),

  update: (programId, data) =>
    adminProgramBase.update(programId, {
      programTitle: data.name || data.programTitle,
      description: data.description || "",
      startAt: data.startAt || null,
      endAt: data.endAt || null,
      boothId: data.boothId || null,
    }),

  delete: (programId) => adminProgramBase.delete(programId),
};

/* ══════════════════════════════════════════════
   3. API 응답 → 프론트 데이터 매핑 함수
   
   실제 ProgramResponse 필드:
   { programId, eventId, category, programTitle, description,
     boothId, startAt, endAt, ongoing, upcoming, ended,
     experienceWait: { waitCount, waitMin, updatedAt } }
   ══════════════════════════════════════════════ */

function fmtDate(dt) {
  if (!dt) return "-";
  const d = new Date(dt);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

function fmtTime(dt) {
  if (!dt) return "";
  const d = new Date(dt);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function calcDuration(startAt, endAt) {
  if (!startAt || !endAt) return 60;
  return Math.round((new Date(endAt) - new Date(startAt)) / 60000);
}

function mapApiStatus(item) {
  if (item.ongoing) return "active";
  if (item.ended) return "ended";
  return "pending"; // upcoming
}

/* ── 관리자 대시보드용 매핑 ── */

/** 체험존 관리 테이블 → zoneManage 행 */
export function mapZoneFromApi(item) {
  return {
    id: `ZN-${String(item.programId).padStart(3, "0")}`,
    programId: item.programId,
    name: item.programTitle ?? "",
    type: "체험", // event_program에 type 컬럼 없음 → 기본값
    capacity: 0, // 현재 ProgramResponse에 없음
    operator: "", // 현재 ProgramResponse에 없음
    date: fmtDate(item.startAt ?? item.createdAt),
    status: mapApiStatus(item),
    description: item.description ?? "",
    _visible: true,
    _raw: item,
  };
}

/** 콘테스트 관리 테이블 → contestManage 행 */
export function mapContestFromApi(item) {
  return {
    id: `CT-${String(item.programId).padStart(3, "0")}`,
    programId: item.programId,
    name: item.programTitle ?? "",
    category: "재주", // 현재 ProgramResponse에 없음
    teams: 0, // 현재 ProgramResponse에 없음
    votes: 0, // 현재 ProgramResponse에 없음
    prize: "", // 현재 ProgramResponse에 없음
    date: fmtDate(item.startAt ?? item.createdAt),
    status: mapApiStatus(item),
    description: item.description ?? "",
    _visible: true,
    _raw: item,
  };
}

/** 세션 관리 테이블 → sessionManage 행 */
export function mapSessionFromApi(item) {
  return {
    id: `SS-${String(item.programId).padStart(3, "0")}`,
    programId: item.programId,
    name: item.programTitle ?? "",
    speaker: "", // ProgramResponse에 없음 — 별도 speakers API 호출 필요
    date: fmtDate(item.startAt),
    time: fmtTime(item.startAt),
    duration: calcDuration(item.startAt, item.endAt),
    location: "", // boothId만 있고 placeName 없음
    enrolled: 0, // ProgramResponse에 없음
    capacity: 50, // ProgramResponse에 없음
    status: mapApiStatus(item),
    description: item.description ?? "",
    _visible: true,
    _raw: item,
  };
}

/* ── 홈페이지용 매핑 ── */

/** 체험존 홈페이지 카드 → Experience.jsx */
export function mapExperienceForHomepage(item) {
  const colors = [
    "#1a4fd6",
    "#d97706",
    "#ec4899",
    "#8b5cf6",
    "#3a4520",
    "#f59e0b",
  ];
  const bgs = [
    "#eff4ff",
    "#fef3c7",
    "#fce7f3",
    "#f5f3ff",
    "#ecfdf5",
    "#fff7ed",
  ];
  const idx = (item.programId ?? 0) % colors.length;

  let status = "soon";
  if (item.ongoing) status = "open";
  else if (item.ended) status = "full";

  return {
    id: item.programId,
    name: item.programTitle ?? "",
    category: "체험",
    desc: item.description ?? "",
    time: `${fmtTime(item.startAt)}~${fmtTime(item.endAt)}`,
    zone: "", // boothId → 별도 조회 필요
    current: item.experienceWait?.waitCount ?? 0,
    max: 20, // 현재 ProgramResponse에 capacity 없음
    status,
    featured: false,
    bg: bgs[idx],
    color: colors[idx],
  };
}

/** 콘테스트 홈페이지 → Contest.jsx */
export function mapContestForHomepage(item) {
  let status = "upcoming";
  if (item.ongoing) status = "live";
  else if (item.ended) status = "ended";

  const statusLabels = {
    live: "투표 진행 중",
    upcoming: "투표 예정",
    ended: "투표 종료",
  };

  return {
    id: item.programId,
    name: item.programTitle ?? "",
    participants: 0,
    totalVotes: 0,
    time: `${fmtTime(item.startAt)} ~ ${fmtTime(item.endAt)}`,
    status,
    statusLabel: statusLabels[status],
    bg:
      status === "live"
        ? "#fef3c7"
        : status === "ended"
          ? "#fdf2f8"
          : "#eef2ff",
    progress: status === "live" ? 62 : status === "ended" ? 100 : 0,
    candidates: [], // 투표 API 미구현 → 빈 배열
  };
}

/** 세션 홈페이지 → Session.jsx */
export function mapSessionForHomepage(item, speakersMap = {}) {
  const colors = ["#3a4520", "#1a4fd6", "#f59e0b", "#8b5cf6", "#ec4899"];
  const idx = (item.programId ?? 0) % colors.length;

  let status = "upcoming";
  if (item.ongoing) status = "live";
  else if (item.ended) status = "done";

  // speakersMap: { programId: [{ speakerName, speakerBio }] }
  const speakers = speakersMap[item.programId] || [];
  const mainSpeaker = speakers[0] || {};

  return {
    name: item.programTitle ?? "",
    desc: item.description ?? "",
    speaker: mainSpeaker.speakerName ?? "",
    role: mainSpeaker.speakerBio ?? "",
    time: fmtTime(item.startAt),
    endTime: fmtTime(item.endAt),
    zone: "",
    people: 0,
    max: 80,
    rating: null,
    tags: [],
    status,
    color: colors[idx],
  };
}
