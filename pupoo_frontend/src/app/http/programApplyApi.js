import { api } from "../../app/http/request"; // 너희 axios instance 경로에 맞춰

export const programApplyApi = {
  getCandidates: (programId, page = 0, size = 20) =>
    api.get(`/program-applies/programs/${programId}/candidates`, { params: { page, size } }),
};