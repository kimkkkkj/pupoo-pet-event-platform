function toDateCandidate(...values) {
  for (const value of values) {
    if (!value) continue;
    const date = new Date(String(value));
    if (!Number.isNaN(date.getTime())) {
      return date;
    }
  }
  return null;
}

export function extractEventYear(raw) {
  const date = toDateCandidate(
    raw?.startAt,
    raw?.startDateTime,
    raw?.startDate,
    raw?.endAt,
    raw?.endDateTime,
    raw?.endDate,
  );
  return date ? String(date.getFullYear()) : "";
}

export function normalizeEventTitle(title, raw = {}) {
  const safeTitle = String(title || "").trim();
  if (!safeTitle) return "행사";

  const year = extractEventYear(raw);
  if (!year) return safeTitle;

  if (/(19|20)\d{2}(?=년|\b)/.test(safeTitle)) {
    return safeTitle.replace(/(19|20)\d{2}(?=년|\b)/, year);
  }

  return safeTitle;
}

