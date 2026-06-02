export function mapApiError(err) {
  const status = err?.response?.status;
  const data = err?.response?.data;

  // Spring ApiResponse.fail or ErrorResponse 형태를 최대한 흡수
  const message =
    data?.message ||
    data?.errorMessage ||
    data?.error ||
    err?.message ||
    "Unknown error";

  return {
    status,
    message,
    code: data?.code || data?.errorCode,
    fieldErrors: data?.fieldErrors || data?.errors,
    raw: data,
  };
}
