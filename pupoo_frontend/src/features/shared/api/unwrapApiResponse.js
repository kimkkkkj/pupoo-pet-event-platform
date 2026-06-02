function normalizeApiFailure(payload, fallbackMessage) {
  const error = payload?.error || payload || {};
  return {
    code: error.code || payload?.code || "API_ERROR",
    message: error.message || payload?.message || fallbackMessage,
    fieldErrors: error.fieldErrors || payload?.fieldErrors || [],
  };
}

export function unwrapApiResponse(responseOrBody, fallbackMessage = "Request failed.") {
  const body = responseOrBody?.data ?? responseOrBody;

  if (!body || typeof body !== "object") {
    throw normalizeApiFailure({}, "Invalid response format.");
  }

  if (body.success !== true) {
    throw normalizeApiFailure(body, fallbackMessage);
  }

  if (body.data === null || typeof body.data === "undefined") {
    throw normalizeApiFailure(body, "Response data is empty.");
  }

  return body.data;
}
