const DEFAULT_GOOGLE_REDIRECT_URI = "https://www.pupoo.site/auth/google/callback";

export function resolveGoogleRedirectUri() {
  const configured = import.meta.env.VITE_GOOGLE_REDIRECT_URI?.trim();
  if (configured) return configured;

  if (typeof window !== "undefined") {
    const hostname = window.location.hostname;
    if (hostname === "localhost" || hostname === "127.0.0.1") {
      return `${window.location.origin}/auth/google/callback`;
    }
  }

  return DEFAULT_GOOGLE_REDIRECT_URI;
}
