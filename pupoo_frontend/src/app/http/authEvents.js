const CHANNEL = "pupoo_auth_events";
const LOGOUT_EVENT = "auth:logout";

export function emitAuthLogout(reason = "manual") {
  try {
    window.localStorage.setItem(CHANNEL, String(Date.now()));
  } catch {
    // Ignore storage failures; local event still fires.
  }
  window.dispatchEvent(new CustomEvent(LOGOUT_EVENT, { detail: { reason } }));
}

export function onAuthLogout(listener) {
  const localHandler = (e) => {
    listener(e?.detail?.reason || "manual");
  };

  const storageHandler = (e) => {
    if (e.key === CHANNEL) {
      listener("cross_tab");
    }
  };

  window.addEventListener(LOGOUT_EVENT, localHandler);
  window.addEventListener("storage", storageHandler);

  return () => {
    window.removeEventListener(LOGOUT_EVENT, localHandler);
    window.removeEventListener("storage", storageHandler);
  };
}

export function broadcastLogout() {
  emitAuthLogout("manual");
}

export function onLogout(listener) {
  return onAuthLogout(listener);
}
