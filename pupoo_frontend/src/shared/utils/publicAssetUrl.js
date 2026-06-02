import { buildAssetUrl, getConfiguredAssetBaseUrl } from "../config/requestUrl";

const ABSOLUTE_URL_RE = /^https?:\/\//i;
const SPECIAL_URL_RE = /^(data|blob):/i;
const LEGACY_UPLOAD_PREFIXES = [
  "experience",
  "gallery",
  "gallery_thumb",
  "home",
  "program",
  "program_apply",
  "speaker",
];

export const DEFAULT_IMAGE_FALLBACK_URL = "/logo_gray.png";

const CDN_BASE_URL = getConfiguredAssetBaseUrl(
  import.meta.env.VITE_CDN_BASE_URL,
  import.meta.env.VITE_ASSET_BASE_URL,
);

function shouldUseCdnBase(raw) {
  return (
    raw.startsWith("/uploads/") ||
    raw.startsWith("/static/") ||
    raw.startsWith("uploads/") ||
    raw.startsWith("static/")
  );
}

function normalizeLegacyUploadPath(rawUrl) {
  const raw = String(rawUrl || "").trim();
  if (!raw) return "";

  if (ABSOLUTE_URL_RE.test(raw) || SPECIAL_URL_RE.test(raw)) {
    return raw;
  }

  const normalized = raw.startsWith("/") ? raw : `/${raw}`;
  if (
    normalized.startsWith("/uploads/") ||
    normalized.startsWith("/static/")
  ) {
    return normalized;
  }

  const matchedPrefix = LEGACY_UPLOAD_PREFIXES.find((prefix) =>
    normalized.startsWith(`/${prefix}/`),
  );

  if (!matchedPrefix) {
    return normalized;
  }

  return `/uploads${normalized}`;
}

export function toPublicAssetUrl(rawUrl) {
  if (!rawUrl) return "";
  const raw = normalizeLegacyUploadPath(rawUrl);
  if (!raw) return "";

  if (ABSOLUTE_URL_RE.test(raw)) {
    return raw;
  }

  if (SPECIAL_URL_RE.test(raw)) {
    return raw;
  }

  if (!shouldUseCdnBase(raw)) {
    return raw;
  }

  return buildAssetUrl(CDN_BASE_URL, raw);
}

export function resolveImageUrl(
  rawUrl,
  fallbackUrl = DEFAULT_IMAGE_FALLBACK_URL,
) {
  const raw = normalizeLegacyUploadPath(rawUrl);

  if (ABSOLUTE_URL_RE.test(raw) || SPECIAL_URL_RE.test(raw)) {
    return raw;
  }

  if (shouldUseCdnBase(raw)) {
    return buildAssetUrl(CDN_BASE_URL, raw);
  }

  return toPublicAssetUrl(rawUrl) || toPublicAssetUrl(fallbackUrl) || fallbackUrl;
}

export function createImageFallbackHandler(
  fallbackUrl = DEFAULT_IMAGE_FALLBACK_URL,
) {
  const resolvedFallback = resolveImageUrl(fallbackUrl, DEFAULT_IMAGE_FALLBACK_URL);

  return (event) => {
    const target = event?.currentTarget || event?.target;
    if (!target) return;
    if (target.dataset.fallbackApplied === "true") return;
    target.dataset.fallbackApplied = "true";
    target.src = resolvedFallback;
  };
}
