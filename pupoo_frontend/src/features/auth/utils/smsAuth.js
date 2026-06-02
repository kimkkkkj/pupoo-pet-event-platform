export function normalizeDigits(value = "") {
  return String(value || "").replace(/\D/g, "");
}

export function toKoreanPhoneE164(value = "") {
  const digits = normalizeDigits(value);
  if (!digits) return "";
  if (digits.startsWith("82")) return `+${digits}`;
  if (digits.startsWith("0")) return `+82${digits.slice(1)}`;
  return `+${digits}`;
}

export function formatPhoneForDisplay(value = "") {
  const digits = normalizeDigits(value);
  if (!digits) return "";
  if (digits.length === 11) return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  if (digits.length === 10 && digits.startsWith("02")) return `${digits.slice(0, 2)}-${digits.slice(2, 6)}-${digits.slice(6)}`;
  if (digits.length === 10) return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  return digits;
}

function getErrorCode(error) {
  return String(error?.code || error?.response?.data?.code || error?.response?.data?.error?.code || "").toUpperCase();
}

export function getSmsRequestErrorMessage(error, fallbackMessage = "문자 발송에 실패했습니다. 잠시 후 다시 시도해 주세요.") {
  const code = getErrorCode(error);
  const message = String(
    error?.message ||
      error?.response?.data?.message ||
      error?.response?.data?.error?.message ||
      ""
  ).trim();

  if (code === "SMS_DISABLED" || code === "SMS_SEND_FAILED") {
    return "문자 발송에 실패했습니다. 잠시 후 다시 시도해 주세요.";
  }
  if (message) {
    return message;
  }
  return fallbackMessage;
}
