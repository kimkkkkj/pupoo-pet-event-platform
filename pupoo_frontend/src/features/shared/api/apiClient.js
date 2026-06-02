import { axiosInstance } from "../../../app/http/axiosInstance";
import { unwrapApiResponse } from "./unwrapApiResponse";

export function toFieldErrorMap(fieldErrors = []) {
  const entries = Array.isArray(fieldErrors) ? fieldErrors : [];
  return entries.reduce((acc, item) => {
    const field = item?.field || item?.name;
    const reason = item?.reason || item?.message || "입력값을 확인해 주세요.";
    if (!field) return acc;
    if (!acc[field]) acc[field] = [];
    acc[field].push(reason);
    return acc;
  }, {});
}

export function normalizeApiError(error, fallbackMessage = "요청 처리에 실패했습니다.") {
  const body = error?.response?.data;
  const core = body?.error || body;
  const fieldErrors = core?.fieldErrors || body?.fieldErrors || [];

  return {
    status: error?.response?.status || core?.status || 0,
    code: core?.code || body?.code || "UNKNOWN_ERROR",
    message: core?.message || body?.message || error?.message || fallbackMessage,
    fieldErrors,
    fieldErrorMap: toFieldErrorMap(fieldErrors),
    raw: error,
  };
}

export function getApiErrorMessage(error, fallbackMessage = "요청 처리에 실패했습니다.") {
  return normalizeApiError(error, fallbackMessage).message;
}

function toApiClientError(error, fallbackMessage) {
  return normalizeApiError(error, fallbackMessage);
}

async function request(method, url, options = {}) {
  const {
    data,
    params,
    headers,
    signal,
    config,
    fallbackMessage,
    raw = false,
  } = options;

  try {
    const res = await axiosInstance.request({
      method,
      url,
      data,
      params,
      headers,
      signal,
      ...(config || {}),
    });

    if (raw) return res;
    return unwrapApiResponse(res, fallbackMessage);
  } catch (error) {
    if (error?.response) {
      throw toApiClientError(error, fallbackMessage);
    }
    throw normalizeApiError(error, fallbackMessage);
  }
}

export const apiClient = {
  request,
  get: (url, options) => request("GET", url, options),
  post: (url, data, options = {}) => request("POST", url, { ...options, data }),
  put: (url, data, options = {}) => request("PUT", url, { ...options, data }),
  patch: (url, data, options = {}) => request("PATCH", url, { ...options, data }),
  delete: (url, options) => request("DELETE", url, options),
};
