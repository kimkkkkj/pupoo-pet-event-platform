const VALID_ADMIN_STATUSES = new Set(["active", "ended", "pending"]);

export const readAdminStatus = (status) => {
  const normalized = String(status ?? "").trim().toLowerCase();
  return VALID_ADMIN_STATUSES.has(normalized) ? normalized : null;
};

export const resolveAdminStatus = (item, fallbackStatus) =>
  readAdminStatus(item?.status) || fallbackStatus;

const extractDateToken = (value) => {
  const token = String(value ?? "").trim();
  if (!token) return "";
  return token;
};

const parseAdminEventDate = (value, endOfDay = false) => {
  const normalized = extractDateToken(value).replace(/\./g, "-");
  if (!normalized) return null;

  const iso = normalized.includes("T")
    ? normalized
    : `${normalized}${endOfDay ? "T23:59:59+09:00" : "T00:00:00+09:00"}`;
  const parsed = new Date(iso);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const resolveEventEndDate = (item) =>
  parseAdminEventDate(
    item?.endAt || item?.endDate || item?.date?.split("~")?.[1] || item?.date,
    true,
  );

const parseAdminId = (value) => {
  if (value == null) return 0;
  const numeric = Number(value);
  if (Number.isFinite(numeric)) return numeric;
  return Number(String(value).replace(/\D/g, "")) || 0;
};

export const compareAdminEventsByOperationalPriority = (a, b) => {
  const statusA = readAdminStatus(a?.status) || "pending";
  const statusB = readAdminStatus(b?.status) || "pending";
  const groupA = statusA === "ended" ? 1 : 0;
  const groupB = statusB === "ended" ? 1 : 0;

  if (groupA !== groupB) return groupA - groupB;

  const endA = resolveEventEndDate(a);
  const endB = resolveEventEndDate(b);

  if (groupA === 0) {
    if (endA && endB && endA.getTime() !== endB.getTime()) {
      return endA.getTime() - endB.getTime();
    }
    if (endA || endB) {
      return endA ? -1 : 1;
    }
  } else {
    if (endA && endB && endA.getTime() !== endB.getTime()) {
      return endB.getTime() - endA.getTime();
    }
    if (endA || endB) {
      return endA ? -1 : 1;
    }
  }

  return (
    parseAdminId(b?.eventId ?? b?.id ?? b?.programId ?? b?.boothId) -
    parseAdminId(a?.eventId ?? a?.id ?? a?.programId ?? a?.boothId)
  );
};

export const sortAdminEventsByOperationalPriority = (items = []) =>
  [...(Array.isArray(items) ? items : [])].sort(
    compareAdminEventsByOperationalPriority,
  );

export const countAdminStatuses = (items = []) =>
  (Array.isArray(items) ? items : []).reduce(
    (counts, item) => {
      const status = readAdminStatus(item?.status);
      counts.all += 1;
      if (status) counts[status] += 1;
      return counts;
    },
    { all: 0, active: 0, ended: 0, pending: 0 },
  );
