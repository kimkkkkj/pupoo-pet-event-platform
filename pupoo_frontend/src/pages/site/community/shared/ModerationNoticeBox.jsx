import { AlertTriangle, ShieldAlert, ShieldX } from "lucide-react";

function normalizeDecision(moderation) {
  const rawDecision = String(moderation?.decision || "").trim().toUpperCase();
  if (rawDecision === "BLOCK" || rawDecision === "WARN" || rawDecision === "REVIEW") {
    return rawDecision;
  }

  if (moderation?.reviewRequired === true) {
    return "REVIEW";
  }

  return "";
}

function getDecisionConfig(decision) {
  if (decision === "BLOCK") {
    return {
      Icon: ShieldX,
      background: "#FEF2F2",
      border: "1px solid #FECACA",
      iconBg: "#FEE2E2",
      color: "#B91C1C",
      title: "게시 정책에 따라 등록이 제한되었어요",
      defaultMessage: "내용이 운영 정책에 맞지 않아 등록할 수 없어요.",
      helper:
        "욕설·비방, 광고·홍보, 개인정보(연락처 등)가 포함되면 등록이 제한돼요. 내용을 수정한 뒤 다시 등록해 주세요.",
    };
  }

  if (decision === "WARN") {
    return {
      Icon: AlertTriangle,
      background: "#FFFBEB",
      border: "1px solid #FDE68A",
      iconBg: "#FEF3C7",
      color: "#92400E",
      title: "내용을 한 번 더 확인해 주세요",
      defaultMessage: "운영 정책 주의 안내가 있어 내용을 다시 확인해 주세요.",
      helper: "",
    };
  }

  if (decision === "REVIEW") {
    return {
      Icon: ShieldAlert,
      background: "#EFF6FF",
      border: "1px solid #BFDBFE",
      iconBg: "#DBEAFE",
      color: "#1D4ED8",
      title: "운영팀 검토 후 처리될 예정이에요",
      defaultMessage: "게시글은 등록되었고 운영팀 검토 후 처리될 예정입니다.",
      helper: "",
    };
  }

  return null;
}

// 백엔드 차단 메시지 패턴(ModerationBlockMessageResolver)에서 검열 차단을 식별한다.
const BLOCK_MESSAGE_PATTERN = /정책에 위반|차단 사유|AI 검사|시스템 문제/;

export function buildModerationBlockFromError(error) {
  const message = String(
    error?.response?.data?.error?.message ??
      error?.response?.data?.message ??
      error?.message ??
      "",
  ).trim();

  if (!message || !BLOCK_MESSAGE_PATTERN.test(message)) {
    return null;
  }

  // "(차단 사유: ...)" 안의 실제 사유만 뽑아 깔끔하게 보여준다.
  const reasonMatch = message.match(/\(차단 사유:\s*([^)]+)\)/);
  const reason = reasonMatch ? reasonMatch[1].trim() : "";

  return {
    decision: "BLOCK",
    reason,
    message: reason,
  };
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

  const { Icon, background, border, iconBg, color, title, defaultMessage, helper } =
    config;
  const message = normalized.message || normalized.reason || defaultMessage;

  return (
    <div
      role="alert"
      style={{
        marginBottom: 18,
        background,
        border,
        borderRadius: 14,
        padding: "14px 16px",
        display: "flex",
        alignItems: "flex-start",
        gap: 12,
      }}
    >
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 10,
          background: iconBg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <Icon size={18} color={color} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 800, color, lineHeight: 1.45 }}>
          {title}
        </div>
        {message ? (
          <div
            style={{
              fontSize: 13,
              color: "#374151",
              marginTop: 5,
              lineHeight: 1.6,
              wordBreak: "keep-all",
            }}
          >
            {message}
          </div>
        ) : null}
        {helper ? (
          <div
            style={{
              fontSize: 12,
              color: "#6B7280",
              marginTop: 8,
              lineHeight: 1.6,
              wordBreak: "keep-all",
            }}
          >
            {helper}
          </div>
        ) : null}
      </div>
    </div>
  );
}
