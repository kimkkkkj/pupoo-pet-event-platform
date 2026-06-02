const ABSOLUTE_URL_RE = /^https?:\/\//i;
const SPECIAL_URL_RE = /^(data|blob):/i;

function normalizeLeadingSlash(value = "") {
  const normalized = String(value || "").trim();
  if (!normalized) return "";
  return normalized.startsWith("/") ? normalized : `/${normalized}`;
}

function normalizeBasePath(value = "") {
  const normalized = String(value || "").trim();
  if (!normalized) return "";

  const path = ABSOLUTE_URL_RE.test(normalized)
    ? new URL(normalized).pathname
    : normalized;

  const trimmed = path.replace(/^\/+|\/+$/g, "");
  return trimmed ? `/${trimmed}` : "";
}

export function getConfiguredBaseUrl(rawValue = "") {
  return String(rawValue || "")
    .trim()
    .replace(/\/+$/, "");
}

export function getConfiguredAssetBaseUrl(rawAssetBaseUrl = "", rawFallbackBaseUrl = "") {
  return getConfiguredBaseUrl(rawAssetBaseUrl || rawFallbackBaseUrl);
}

export function buildRequestUrl(rawBaseUrl = "", rawUrl = "") {
  if (!rawUrl) return rawUrl;

  const url = String(rawUrl).trim();
  if (!url || ABSOLUTE_URL_RE.test(url)) return url;

  const baseUrl = getConfiguredBaseUrl(rawBaseUrl);
  const normalizedUrl = normalizeLeadingSlash(url);
  if (!baseUrl) return normalizedUrl;

  const basePath = normalizeBasePath(baseUrl);
  const suffix =
    basePath && (normalizedUrl === basePath || normalizedUrl.startsWith(`${basePath}/`))
      ? normalizedUrl.slice(basePath.length) || "/"
      : normalizedUrl;

  return `${baseUrl}${suffix}`;
}

export function buildAssetUrl(rawBaseUrl = "", rawUrl = "") {
  if (!rawUrl) return "";

  const url = String(rawUrl).trim();
  if (!url || ABSOLUTE_URL_RE.test(url) || SPECIAL_URL_RE.test(url)) {
    return url;
  }

  const normalizedUrl = normalizeLeadingSlash(url);
  const baseUrl = getConfiguredBaseUrl(rawBaseUrl);

  if (!baseUrl) {
    return normalizedUrl;
  }

  return `${baseUrl}${normalizedUrl}`;
}
