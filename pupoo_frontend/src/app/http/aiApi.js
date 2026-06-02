import { axiosInstance } from "./axiosInstance";

function ensureId(name, value) {
  if (value == null || Number.isNaN(Number(value))) {
    throw new Error(`${name} is required`);
  }
}

function pad2(value) {
  return String(value).padStart(2, "0");
}

function toLocalDateTime(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  // Send local datetime (without timezone suffix) to match Spring LocalDateTime parsing.
  const year = date.getFullYear();
  const month = pad2(date.getMonth() + 1);
  const day = pad2(date.getDate());
  const hour = pad2(date.getHours());
  const minute = pad2(date.getMinutes());
  const second = pad2(date.getSeconds());

  return `${year}-${month}-${day}T${hour}:${minute}:${second}`;
}

function buildRangeParams(options = {}) {
  const from = toLocalDateTime(options.from);
  const to = toLocalDateTime(options.to);
  const params = {};
  if (from) params.from = from;
  if (to) params.to = to;
  return Object.keys(params).length > 0 ? params : undefined;
}

export const aiApi = {
  // GET /api/ai/events/{eventId}/congestion/predict
  predictEventCongestion: (eventId, options = {}) => {
    ensureId("predictEventCongestion: eventId", eventId);
    return axiosInstance.get(`/api/ai/events/${eventId}/congestion/predict`, {
      params: buildRangeParams(options),
    });
  },

  // GET /api/ai/events/{eventId}/programs/congestion
  predictProgramsCongestionByEvent: (eventId) => {
    ensureId("predictProgramsCongestionByEvent: eventId", eventId);
    return axiosInstance.get(`/api/ai/events/${eventId}/programs/congestion`);
  },

  // GET /api/ai/programs/{programId}/congestion/predict
  predictProgramCongestion: (programId) => {
    ensureId("predictProgramCongestion: programId", programId);
    return axiosInstance.get(`/api/ai/programs/${programId}/congestion/predict`);
  },

  // GET /api/ai/programs/{programId}/recommendations
  getProgramRecommendations: (programId) => {
    ensureId("getProgramRecommendations: programId", programId);
    return axiosInstance.get(`/api/ai/programs/${programId}/recommendations`);
  },
};
