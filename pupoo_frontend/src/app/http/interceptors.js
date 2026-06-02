import {
  clearSessionState,
  getSessionAccessToken,
  hasRecoverableSession,
  recoverSessionAccessToken,
} from "./authSession";

function normalizeUrlPath(url) {
  return String(url || "")
    .replace(/^https?:\/\/[^/]+/i, "")
    .split("?")[0];
}

function matchesPrefix(path, prefixes = []) {
  return prefixes.some((prefix) => path.startsWith(prefix));
}

function shouldSkipAutoAuth(config, options = {}) {
  const path = normalizeUrlPath(config?.url);
  const method = String(config?.method || "get").toUpperCase();
  const { publicPathPrefixes = [], publicGetPathPrefixes = [] } = options;

  if (matchesPrefix(path, publicPathPrefixes)) {
    return true;
  }

  return method === "GET" && matchesPrefix(path, publicGetPathPrefixes);
}

function hasAuthHeader(config) {
  return Boolean(
    config?.headers?.Authorization || config?.headers?.authorization,
  );
}

function hasRefreshableSession(path) {
  return hasRecoverableSession(path);
}

function clearSession(path) {
  clearSessionState(path);
}

export function attachInterceptors(instance, options = {}) {
  instance.interceptors.request.use(async (config) => {
    if (config.data && config.data instanceof FormData) {
      delete config.headers["Content-Type"];
    }

    if (shouldSkipAutoAuth(config, options)) {
      return config;
    }

    if (hasAuthHeader(config)) {
      return config;
    }

    const path = normalizeUrlPath(config?.url);
    let access = getSessionAccessToken(path);

    if (!access && hasRefreshableSession(path)) {
      try {
        access = await recoverSessionAccessToken(path);
      } catch {
        clearSession(path);
      }
    }

    if (access) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${access}`;
    }

    return config;
  });

  instance.interceptors.response.use(
    (res) => res,
    async (err) => {
      const status = err?.response?.status;
      const original = err?.config;
      if (!original) return Promise.reject(err);

      const path = normalizeUrlPath(original?.url);
      const isPublicAuthRequest = shouldSkipAutoAuth(original, options);
      const canRefreshSession = hasRefreshableSession(path);

      if (status !== 401 || isPublicAuthRequest) {
        return Promise.reject(err);
      }

      if (!hasAuthHeader(original) && !canRefreshSession) {
        return Promise.reject(err);
      }

      if (original._retry) {
        clearSession(path);
        return Promise.reject(err);
      }

      original._retry = true;

      try {
        const accessToken = await recoverSessionAccessToken(path, {
          force: true,
        });

        if (!accessToken) {
          clearSession(path);
          return Promise.reject(err);
        }

        original.headers = original.headers || {};
        original.headers.Authorization = `Bearer ${accessToken}`;

        return instance(original);
      } catch (refreshErr) {
        clearSession(path);
        return Promise.reject(refreshErr);
      }
    },
  );
}
