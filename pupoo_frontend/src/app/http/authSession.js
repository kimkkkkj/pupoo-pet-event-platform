import axios from "axios";
import { tokenStore } from "./tokenStore";
import {
  buildRequestUrl,
  getConfiguredBaseUrl,
} from "../../shared/config/requestUrl";

const REFRESH_PATH = "/api/auth/refresh";
const apiBaseUrl = getConfiguredBaseUrl(import.meta.env.VITE_API_BASE_URL);

let refreshPromise = null;

function normalizeSessionKind(kindOrPath = "user") {
  if (kindOrPath === "admin") return "admin";
  if (String(kindOrPath).startsWith("/api/admin")) return "admin";
  return "user";
}

function getStoredToken(kind) {
  return kind === "admin"
    ? tokenStore.getAdminAccessToken()
    : tokenStore.getAccessToken();
}

function hasSessionHint(kind) {
  return kind === "admin"
    ? tokenStore.hasAdminSessionHint()
    : tokenStore.hasSessionHint();
}

function setStoredToken(kind, accessToken) {
  if (kind === "admin") {
    tokenStore.setAdminAccess(accessToken);
    return;
  }
  tokenStore.setAccess(accessToken);
}

function clearStoredSession(kind) {
  if (kind === "admin") {
    tokenStore.clearAdmin();
    return;
  }
  tokenStore.clearUser();
}

function extractAccessToken(payload) {
  return payload?.data?.accessToken ?? payload?.accessToken ?? null;
}

async function requestTokenRefresh() {
  const response = await axios.post(
    buildRequestUrl(apiBaseUrl, REFRESH_PATH),
    null,
    { withCredentials: true },
  );

  const accessToken = extractAccessToken(response?.data);
  if (!accessToken) {
    throw new Error("refresh response missing accessToken");
  }

  return accessToken;
}

export function getSessionAccessToken(kindOrPath = "user") {
  return getStoredToken(normalizeSessionKind(kindOrPath));
}

export function hasRecoverableSession(kindOrPath = "user") {
  return hasSessionHint(normalizeSessionKind(kindOrPath));
}

export function clearSessionState(kindOrPath = "user") {
  clearStoredSession(normalizeSessionKind(kindOrPath));
}

export async function recoverSessionAccessToken(
  kindOrPath = "user",
  { force = false } = {},
) {
  const kind = normalizeSessionKind(kindOrPath);
  const existing = getStoredToken(kind);
  if (!force && existing) {
    return existing;
  }

  if (!hasSessionHint(kind)) {
    return null;
  }

  if (!refreshPromise) {
    refreshPromise = requestTokenRefresh().finally(() => {
      refreshPromise = null;
    });
  }

  const accessToken = await refreshPromise;
  setStoredToken(kind, accessToken);
  return accessToken;
}
