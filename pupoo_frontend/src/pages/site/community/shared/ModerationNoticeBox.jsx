import { AlertTriangle, ShieldAlert } from "lucide-react";

function normalizeDecision(moderation) {
  const rawDecision = String(moderation?.decision || "").trim().toUpperCase();
  if (rawDecision === "WARN" || rawDecision === "REVIEW") {
    return rawDecision;
  }

  if (moderation?.reviewRequired === true) {
    return "REVIEW";
  }

  return "";
}

function getDecisionConfig(decision) {
  if (decision === "WARN") {
    return {
      Icon: AlertTriangle,
      background: "#FFFBEB",
      border: "1px solid #FDE68A",
      color: "#92400E",
      defaultMessage: "운영 정책 주의 안내가 있어 내용을 다시 확인해 주세요.",
    };
  }

  if (decision === "REVIEW") {
    return {
      Icon: ShieldAlert,
      background: "#EFF6FF",
      border: "1px solid #BFDBFE",
      color: "#1D4ED8",
      defaultMessage: "게시글은 등록되었고 운영팀 검토 후 처리될 예정입니다.",
    };
  }

  return null;
}

export function normalizeModerationPayload(payload) {
  const moderation =
    payload?.moderation && typeof payload.moderation === "object"
      ? payload.moderation
      : payload && typeof payload === "object"
        ? payload
        : null;

  if (!moderation) {
    return null;
  }

  const decision = normalizeDecision(moderation);
  if (!decision) {
    return null;
  }

  const message = String(
    moderation.message || moderation.reason || "",
  ).trim();

  return {
    ...moderation,
    decision,
    message,
    reason: String(moderation.reason || "").trim(),
    reviewRequired: moderation.reviewRequired === true || decision === "REVIEW",
  };
}

export default function ModerationNoticeBox({ moderation }) {
  const normalized = normalizeModerationPayload(moderation);
  const config = getDecisionConfig(normalized?.decision);
  if (!normalized || !config) return null;

  const { Icon, background, border, color, defaultMessage } = config;
  const message = normalized.message || normalized.reason || defaultMessage;

  return (
    <div
      style={{
        marginBottom: 18,
        background,
        border,
        borderRadius: 10,
        padding: "12px 14px",
        fontSize: 13,
        color,
        fontWeight: 700,
        display: "flex",
        alignItems: "center",
        gap: 8,
      }}
    >
      <Icon size={14} style={{ flexShrink: 0 }} />
      {message}
    </div>
  );
}
