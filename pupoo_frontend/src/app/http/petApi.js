import { axiosInstance } from "./axiosInstance";

function unwrap(res) {
  const body = res?.data;
  return body?.data ?? body;
}

export const petApi = {
  getMyPets() {
    return axiosInstance.get("/api/pets/me").then(unwrap);
  },
};

