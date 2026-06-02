const STORAGE_TTL_MS = 24 * 60 * 60 * 1000;

const storageKeys = (provider) => ({
  state: `pupoo_social_join_${provider}`,
  providerUid: `${provider}_provider_uid`,
  email: `${provider}_email`,
  nickname: `${provider}_nickname`,
  tempPassword: `${provider}_temp_password`,
});

function readRaw(storage, key) {
  try {
    return storage?.getItem(key) || "";
  } catch {
    return "";
  }
}

function writeRaw(storage, key, value) {
  try {
    storage?.setItem(key, value);
  } catch {
    return;
  }
}

function removeRaw(storage, key) {
  try {
    storage?.removeItem(key);
  } catch {
    return;
  }
}

function parseState(raw) {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    const updatedAt = Number(parsed?.updatedAt || 0);
    if (!updatedAt || Date.now() - updatedAt > STORAGE_TTL_MS) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function syncState(provider, state) {
  const key = storageKeys(provider).state;
  const value = JSON.stringify(state);
  writeRaw(window.sessionStorage, key, value);
  writeRaw(window.localStorage, key, value);
}

function clearLegacyKeys(provider) {
  const keys = storageKeys(provider);
  [
    keys.providerUid,
    keys.email,
    keys.nickname,
    keys.tempPassword,
  ].forEach((key) => {
    removeRaw(window.sessionStorage, key);
    removeRaw(window.localStorage, key);
  });
}

export function getSocialJoinState(provider) {
  if (typeof window === "undefined") return null;

  const keys = storageKeys(provider);
  const sessionState = parseState(readRaw(window.sessionStorage, keys.state));
  if (sessionState) return sessionState;

  const localState = parseState(readRaw(window.localStorage, keys.state));
  if (localState) {
    writeRaw(window.sessionStorage, keys.state, JSON.stringify(localState));
    return localState;
  }

  const legacyProviderUid = readRaw(window.sessionStorage, keys.providerUid);
  const legacyEmail = readRaw(window.sessionStorage, keys.email);
  const legacyNickname = readRaw(window.sessionStorage, keys.nickname);
  const legacyTempPassword = readRaw(window.sessionStorage, keys.tempPassword);

  if (!legacyProviderUid && !legacyEmail && !legacyNickname && !legacyTempPassword) {
    return null;
  }

  const migrated = {
    provider,
    providerUid: legacyProviderUid || "",
    email: legacyEmail || "",
    nickname: legacyNickname || "",
    tempPassword: legacyTempPassword || "",
    signupKey: "",
    phone: "",
    step: "FORM",
    updatedAt: Date.now(),
  };
  syncState(provider, migrated);
  return migrated;
}

export function setSocialJoinState(provider, partial) {
  if (typeof window === "undefined") return null;

  const current = getSocialJoinState(provider) || {
    provider,
    providerUid: "",
    email: "",
    nickname: "",
    tempPassword: "",
    signupKey: "",
    phone: "",
    step: "FORM",
  };

  const next = {
    ...current,
    ...partial,
    provider,
    updatedAt: Date.now(),
  };
  syncState(provider, next);
  return next;
}

export function clearSocialJoinState(provider) {
  if (typeof window === "undefined") return;
  const keys = storageKeys(provider);
  removeRaw(window.sessionStorage, keys.state);
  removeRaw(window.localStorage, keys.state);
  clearLegacyKeys(provider);
}

export function clearAllSocialJoinState() {
  ["kakao", "google", "naver"].forEach(clearSocialJoinState);
}
