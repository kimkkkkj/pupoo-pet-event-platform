import { axiosInstance } from "./axiosInstance";

function unwrap(res) {
  const body = res?.data;
  return body?.data ?? body;
}

export const interestApi = {
  listAll(type) {
    const params = {};
    if (type != null && type !== "") params.type = type;
    return axiosInstance.get("/api/interests", { params }).then((res) => unwrap(res));
  },

  getMySubscriptions(includeInactive = false) {
    return axiosInstance
      .post("/api/interests/mysubscriptions", null, { params: { includeInactive } })
      .then((res) => unwrap(res));
  },

  subscribe(payload) {
    if (payload?.interestId == null) {
      throw new Error("interestApi.subscribe: interestId is required");
    }
    return axiosInstance
      .post("/api/interests/subscribe", {
        interestId: payload.interestId,
        allowInapp: payload.allowInapp ?? true,
        allowEmail: payload.allowEmail ?? false,
        allowSms: payload.allowSms ?? false,
      })
      .then((res) => unwrap(res));
  },

  unsubscribe(interestId) {
    if (interestId == null) {
      throw new Error("interestApi.unsubscribe: interestId is required");
    }
    return axiosInstance
      .post("/api/interests/unsubscribe", { interestId })
      .then((res) => unwrap(res));
  },

  updateChannels(payload) {
    if (payload?.interestId == null) {
      throw new Error("interestApi.updateChannels: interestId is required");
    }
    return axiosInstance
      .patch("/api/interests/channels", {
        interestId: payload.interestId,
        allowInapp: payload.allowInapp ?? false,
        allowEmail: payload.allowEmail ?? false,
        allowSms: payload.allowSms ?? false,
      })
      .then((res) => unwrap(res));
  },
};
