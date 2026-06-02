export function buildFormData(obj) {
  const fd = new FormData();
  if (!obj) return fd;

  Object.entries(obj).forEach(([key, value]) => {
    if (value === undefined || value === null) return;

    if (Array.isArray(value)) {
      value.forEach((v) => fd.append(key, v));
      return;
    }

    // File / Blob
    if (value instanceof Blob) {
      fd.append(key, value);
      return;
    }

    // Object -> JSON string
    if (typeof value === "object") {
      fd.append(key, JSON.stringify(value));
      return;
    }

    fd.append(key, String(value));
  });

  return fd;
}
