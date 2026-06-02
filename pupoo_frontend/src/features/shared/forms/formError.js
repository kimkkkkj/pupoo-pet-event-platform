import { normalizeApiError } from "../api/apiClient";

export function toFieldMessageMap(error) {
  const normalized = normalizeApiError(error);
  const fieldMap = normalized.fieldErrorMap || {};

  return Object.entries(fieldMap).reduce((acc, [field, messages]) => {
    const first = Array.isArray(messages) ? messages[0] : messages;
    if (!first) return acc;
    acc[field] = String(first);
    return acc;
  }, {});
}

export function resolveErrorMessage(error, fallbackMessage) {
  const normalized = normalizeApiError(error, fallbackMessage);
  return normalized.message || fallbackMessage;
}

