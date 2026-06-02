const ACCESS_KEY = "pupoo_access_token";
const REFRESH_KEY = "pupoo_refresh_token";
const SESSION_HINT_KEY = "pupoo_session_hint";
const ADMIN_ACCESS_KEY = "pupoo_admin_token";
const ADMIN_SESSION_HINT_KEY = "pupoo_admin_session_hint";
const SESSION_PLACEHOLDER = "__PUPPOO_SESSION__";

export const AUTH_CHANGE_EVENT = "pupoo-auth-changed";

let accessToken = null;
let adminAccessToken = null;

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function readStorage(key) {
  if (!canUseStorage()) return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key, value) {
  if (!canUseStorage()) return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // ignore storage failures
  }
}

function removeStorage(key) {
  if (!canUseStorage()) return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    // ignore storage failures
  }
}

function emitAuthChange() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(AUTH_CHANGE_EVENT));
}

function hasHint(key) {
  return readStorage(key) === "1";
}

function setHint(key) {
  writeStorage(key, "1");
}

function clearHint(key) {
  removeStorage(key);
}

function getDisplayToken(token, hasSession) {
  if (token) return token;
  return hasSession ? SESSION_PLACEHOLDER : null;
}

function hydrateFromLegacyStorage() {
  const legacyAccess = readStorage(ACCESS_KEY);
  const legacyRefresh = readStorage(REFRESH_KEY);
  const legacyAdminAccess = readStorage(ADMIN_ACCESS_KEY);

  if (legacyAccess) {
    accessToken = legacyAccess;
    setHint(SESSION_HINT_KEY);
  } else if (legacyRefresh || hasHint(SESSION_HINT_KEY)) {
    setHint(SESSION_HINT_KEY);
  }

  if (legacyAdminAccess) {
    adminAccessToken = legacyAdminAccess;
    setHint(ADMIN_SESSION_HINT_KEY);
  }

  removeStorage(ACCESS_KEY);
  removeStorage(REFRESH_KEY);
  removeStorage(ADMIN_ACCESS_KEY);
}

hydrateFromLegacyStorage();

export const tokenStore = {
  getAccess() {
    return getDisplayToken(accessToken, this.hasSessionHint());
  },
  getAccessToken() {
    return accessToken;
  },
  getRefresh() {
    return null;
  },
  getAdminAccess() {
    return getDisplayToken(adminAccessToken, this.hasAdminSessionHint());
  },
  getAdminAccessToken() {
    return adminAccessToken;
  },
  hasSessionHint() {
    return hasHint(SESSION_HINT_KEY);
  },
  hasAdminSessionHint() {
    return hasHint(ADMIN_SESSION_HINT_KEY);
  },
  setAccess(nextAccessToken) {
    accessToken = nextAccessToken || null;
    if (nextAccessToken) {
      setHint(SESSION_HINT_KEY);
    }
    emitAuthChange();
  },
  setRefresh(refreshToken) {
    if (refreshToken) {
      setHint(SESSION_HINT_KEY);
      emitAuthChange();
    }
  },
  setAdminAccess(nextAccessToken) {
    adminAccessToken = nextAccessToken || null;
    if (nextAccessToken) {
      setHint(ADMIN_SESSION_HINT_KEY);
    }
    emitAuthChange();
  },
  setTokens({ accessToken: nextAccessToken, refreshToken } = {}) {
    if (nextAccessToken) {
      accessToken = nextAccessToken;
      setHint(SESSION_HINT_KEY);
    }
    if (refreshToken) {
      setHint(SESSION_HINT_KEY);
    }
    emitAuthChange();
  },
  clearUser() {
    accessToken = null;
    clearHint(SESSION_HINT_KEY);
    removeStorage(ACCESS_KEY);
    removeStorage(REFRESH_KEY);
    emitAuthChange();
  },
  clearAdmin() {
    adminAccessToken = null;
    clearHint(ADMIN_SESSION_HINT_KEY);
    removeStorage(ADMIN_ACCESS_KEY);
    emitAuthChange();
  },
  clearAll() {
    accessToken = null;
    adminAccessToken = null;
    clearHint(SESSION_HINT_KEY);
    clearHint(ADMIN_SESSION_HINT_KEY);
    removeStorage(ACCESS_KEY);
    removeStorage(REFRESH_KEY);
    removeStorage(ADMIN_ACCESS_KEY);
    emitAuthChange();
  },
  clear() {
    this.clearUser();
  },
};
