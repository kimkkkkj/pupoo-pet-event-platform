import { useEffect, useMemo, useRef, useState } from "react";
import { Home, Minus, RotateCcw, Send, Sparkles, X } from "lucide-react";
import Lottie from "lottie-react";
import dogLottie from "../../../../public/dog-lottie.json";
import ds from "../shared/designTokens";
import { useChatBot } from "./useChatBot";

const chatStyles = `
@keyframes chatSlideUp {
  from { opacity: 0; transform: translateY(18px) scale(0.98); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}
@keyframes msgPop {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes dotWave {
  0%, 60%, 100% { transform: translateY(0); opacity: 0.25; }
  30% { transform: translateY(-5px); opacity: 1; }
}
.cb-msg { animation: msgPop .24s ease-out; }
.cb-panel::-webkit-scrollbar { width: 6px; }
.cb-panel::-webkit-scrollbar-thumb { background: #e5e7eb; border-radius: 999px; }
`;

const SUMMARY_LABELS = {
  congestion: "행사 현황",
  applicants: "참가자 현황",
  refund: "환불 현황",
  capabilities: "지원 기능",
};

const CONFIRM_LABELS = {
  notice_create: "공지 저장",
  notice_update: "공지 수정",
  notice_hide: "공지 숨김",
  notification_draft_create: "알림 초안 저장",
  notification_draft_update: "알림 초안 수정",
  notification_draft_delete: "알림 초안 삭제",
  notification_draft_send: "알림 초안 발송",
  notification_event_send: "행사 알림 발송",
  notification_broadcast_send: "전체 알림 발송",
};

const FIELD_LABELS = {
  title: "제목",
  content: "내용",
  eventId: "행사 번호",
  targetType: "대상 종류",
  targetId: "대상 ID",
  targetScope: "알림 대상",
  noticeId: "공지",
  notificationId: "알림 초안",
};

const FIELD_GUIDES = {
  title: "제목을 먼저 적어 주세요.",
  content: "내용을 먼저 채워 주세요.",
  eventId: "행사 알림이라면 행사 번호가 필요해요.",
  targetType: "대상을 다시 확인해 주세요.",
  targetId: "대상을 다시 선택해 주세요.",
  targetScope: "전체 알림인지 행사 알림인지 먼저 골라 주세요.",
  noticeId: "처리할 공지를 먼저 선택해 주세요.",
  notificationId: "처리할 알림 초안을 먼저 선택해 주세요.",
};

function fmt(date) {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function Avatar({ small = false }) {
  const size = small ? 28 : 42;
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: "linear-gradient(135deg, #FF6B6B 0%, #FF8E53 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0 8px 20px rgba(255,107,107,0.24)",
        fontSize: small ? 15 : 22,
        flexShrink: 0,
      }}
    >
      🐶
    </div>
  );
}

function DogAvatar({ small = false }) {
  const size = small ? 34 : 72;
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: small ? 12 : 18,
        background:
          "linear-gradient(180deg, rgba(255,255,255,0.96) 0%, rgba(255,244,238,0.98) 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: small
          ? "0 6px 14px rgba(0,0,0,0.14)"
          : "0 12px 28px rgba(255,107,107,0.22)",
        overflow: "hidden",
        flexShrink: 0,
      }}
    >
      <Lottie
        animationData={dogLottie}
        loop
        autoplay
        style={{
          width: small ? 34 : 84,
          height: small ? 34 : 84,
          transform: small ? "scale(1.1)" : "scale(1.18)",
        }}
      />
    </div>
  );
}

function buildActionPayloadSummary(confirmation) {
  const payload = confirmation?.payload || {};
  const items = [];
  if (payload.noticeId) items.push(`공지 ${payload.noticeId}`);
  if (payload.notificationId) items.push(`알림 초안 ${payload.notificationId}`);
  if (payload.eventId) items.push(`행사 ${payload.eventId}`);
  if (payload.title) items.push(`제목 ${payload.title}`);
  if (payload.status) items.push(`상태 ${payload.status}`);
  return items;
}

function pickQuickActions(quickActionMap, ids) {
  return ids.map((id) => quickActionMap[id]).filter(Boolean);
}

function buildValidationActions(executionInfo, quickActionMap) {
  const actionKey = executionInfo?.actionKey || "";
  const missingFields = executionInfo?.missingFields || [];

  if (
    actionKey.startsWith("notification") ||
    missingFields.includes("targetScope") ||
    missingFields.includes("eventId")
  ) {
    return pickQuickActions(quickActionMap, [
      "start_broadcast_notification",
      "start_event_notification",
      "prefill_notification",
      "navigate_notification",
    ]);
  }

  if (actionKey.startsWith("notice") || missingFields.includes("noticeId")) {
    return pickQuickActions(quickActionMap, [
      "prefill_notice",
      "navigate_notice",
    ]);
  }

  return pickQuickActions(quickActionMap, [
    "summary_congestion",
    "prefill_notice",
  ]);
}

function buildHintActions(messageType, message, quickActionMap) {
  const text = String(message?.text || "");
  if (messageType === "ambiguous" && text.includes("공지")) {
    return pickQuickActions(quickActionMap, [
      "prefill_notice",
      "navigate_notice",
    ]);
  }
  if (messageType === "ambiguous" && text.includes("알림")) {
    return pickQuickActions(quickActionMap, [
      "start_broadcast_notification",
      "start_event_notification",
      "prefill_notification",
      "navigate_notification",
    ]);
  }
  if (messageType === "low_confidence") {
    return pickQuickActions(quickActionMap, [
      "summary_congestion",
      "summary_applicants",
      "navigate_notice",
    ]);
  }
  return [];
}

function ActionButtonList({ actions, onSelectAction, mobile = false }) {
  if (!actions?.length) return null;
  return (
    <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 8 }}>
      {actions.map((action) => (
        <button
          key={action.id}
          type="button"
          onClick={() => onSelectAction(action)}
          style={{
            border: "1px solid #FED7AA",
            background: "#fff",
            color: "#9A3412",
            borderRadius: 999,
            padding: mobile ? "7px 10px" : "8px 12px",
            fontSize: 11.5,
            fontWeight: 700,
            fontFamily: ds.ff,
            cursor: "pointer",
          }}
        >
          {action.label}
        </button>
      ))}
    </div>
  );
}

function SummaryCard({ summary, mobile = false }) {
  if (!summary?.items?.length && !summary?.sections?.length) return null;

  return (
    <div
      style={{
        marginTop: 8,
        width: "100%",
        padding: mobile ? "10px 12px" : "12px 14px",
        borderRadius: 14,
        background: "#fff",
        border: "1px solid #E5E7EB",
        display: "grid",
        gap: 10,
      }}
    >
      <div style={{ display: "grid", gap: 4 }}>
        <div style={{ fontSize: 11.5, color: "#6B7280", fontWeight: 700 }}>
          {SUMMARY_LABELS[summary.summaryType] || "요약"}
        </div>
        <div style={{ fontSize: 12.5, color: "#374151", lineHeight: 1.55 }}>
          지금 확인하실 수 있는 핵심 수치를 정리했어요.
        </div>
      </div>
      {summary?.items?.length ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: mobile ? "1fr" : "repeat(2, minmax(0, 1fr))",
            gap: 8,
          }}
        >
          {summary.items.map((item) => (
            <div
              key={`${summary.summaryType}-${item.label}`}
              style={{
                background: "#F9FAFB",
                border: "1px solid #E5E7EB",
                borderRadius: 12,
                padding: "10px 12px",
              }}
            >
              <div style={{ fontSize: 11, color: "#9CA3AF", marginBottom: 4 }}>
                {item.label}
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#1F2937" }}>
                {item.value}
                {item.meta != null ? ` / ${item.meta}` : ""}
              </div>
            </div>
          ))}
        </div>
      ) : null}
      {summary?.sections?.length
        ? summary.sections.map((section) => (
            <div
              key={section.key}
              style={{
                background: "#F9FAFB",
                border: "1px solid #E5E7EB",
                borderRadius: 12,
                padding: 12,
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: "#374151",
                  marginBottom: 8,
                }}
              >
                {section.title}
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: mobile
                    ? "1fr"
                    : "repeat(2, minmax(0, 1fr))",
                  gap: 8,
                }}
              >
                {section.items.map((item) => (
                  <div
                    key={`${section.key}-${item.label}`}
                    style={{
                      background: "#fff",
                      border: "1px solid #E5E7EB",
                      borderRadius: 10,
                      padding: "10px 12px",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 11,
                        color: "#9CA3AF",
                        marginBottom: 4,
                      }}
                    >
                      {item.label}
                    </div>
                    <div
                      style={{
                        fontSize: 13.5,
                        fontWeight: 700,
                        color: "#1F2937",
                      }}
                    >
                      {item.value}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        : null}
    </div>
  );
}

function UnsupportedCard({ executionInfo, mobile = false }) {
  return (
    <div
      style={{
        marginTop: 8,
        width: "100%",
        padding: mobile ? "10px 12px" : "12px 14px",
        borderRadius: 12,
        background: "#FEF2F2",
        border: "1px solid #FECACA",
      }}
    >
      <div
        style={{
          fontSize: 11.5,
          color: "#B91C1C",
          fontWeight: 700,
          marginBottom: 6,
        }}
      >
        지금은 사용할 수 없는 기능이에요
      </div>
      <div style={{ fontSize: 12.5, color: "#7F1D1D", lineHeight: 1.55 }}>
        {executionInfo?.reason || "이 기능은 현재 지원되지 않아요."}
      </div>
    </div>
  );
}

function ValidationCard({
  message,
  executionInfo,
  quickActionMap,
  onSelectAction,
  mobile = false,
}) {
  const missingFields = executionInfo?.missingFields || [];
  const suggestedActions = buildValidationActions(
    executionInfo,
    quickActionMap,
  );

  return (
    <div
      style={{
        marginTop: 8,
        width: "100%",
        padding: mobile ? "10px 12px" : "12px 14px",
        borderRadius: 12,
        background: "#FFF7ED",
        border: "1px solid #FED7AA",
      }}
    >
      <div
        style={{
          fontSize: 11.5,
          color: "#9A3412",
          fontWeight: 700,
          marginBottom: 6,
        }}
      >
        추가 정보가 필요해요
      </div>
      <div style={{ fontSize: 12.5, color: "#9A3412", lineHeight: 1.55 }}>
        {executionInfo?.reason || message.text}
      </div>
      {missingFields.length ? (
        <div style={{ marginTop: 8, display: "grid", gap: 4 }}>
          <div style={{ fontSize: 11.5, color: "#C2410C" }}>
            필요한 값:{" "}
            {missingFields
              .map((field) => FIELD_LABELS[field] || field)
              .join(", ")}
          </div>
          {missingFields.map((field) => (
            <div
              key={field}
              style={{ fontSize: 11.5, color: "#9A3412", lineHeight: 1.5 }}
            >
              {FIELD_LABELS[field] || field}:{" "}
              {FIELD_GUIDES[field] || "필요한 값을 먼저 채워 주세요."}
            </div>
          ))}
        </div>
      ) : null}
      <ActionButtonList
        actions={suggestedActions}
        onSelectAction={onSelectAction}
        mobile={mobile}
      />
    </div>
  );
}

function HintCard({ message, quickActionMap, onSelectAction, mobile = false }) {
  const title =
    message.messageType === "ambiguous"
      ? "원하시는 작업을 골라 주세요"
      : "조금만 더 구체적으로 알려 주세요";
  const description =
    message.messageType === "ambiguous"
      ? "누리가 방향은 읽었어요. 아래 버튼 중에서 가장 가까운 작업을 골라 주세요."
      : "대상이나 작업 종류를 조금만 더 알려 주시면 더 정확하게 도와드릴게요.";
  const suggestedActions = buildHintActions(
    message.messageType,
    message,
    quickActionMap,
  );

  return (
    <div
      style={{
        marginTop: 8,
        width: "100%",
        padding: mobile ? "10px 12px" : "12px 14px",
        borderRadius: 12,
        background: "#EFF6FF",
        border: "1px solid #BFDBFE",
      }}
    >
      <div
        style={{
          fontSize: 11.5,
          color: "#1D4ED8",
          fontWeight: 700,
          marginBottom: 6,
        }}
      >
        {title}
      </div>
      <div style={{ fontSize: 12.5, color: "#1E3A8A", lineHeight: 1.55 }}>
        {description}
      </div>
      <ActionButtonList
        actions={suggestedActions}
        onSelectAction={onSelectAction}
        mobile={mobile}
      />
    </div>
  );
}

function ConfirmCard({
  confirmation,
  onConfirm,
  isConfirming = false,
  mobile = false,
}) {
  if (!confirmation) return null;
  const label = CONFIRM_LABELS[confirmation.actionKey] || "실행";
  const summaryItems = buildActionPayloadSummary(confirmation);

  return (
    <div
      style={{
        marginTop: 8,
        width: "100%",
        padding: mobile ? "10px 12px" : "12px 14px",
        borderRadius: 12,
        background: "#FFF7ED",
        border: "1px solid #FED7AA",
      }}
    >
      <div
        style={{
          fontSize: 11.5,
          color: "#9A3412",
          fontWeight: 700,
          marginBottom: 8,
        }}
      >
        실행 전에 한 번 더 확인해 주세요
      </div>
      <div style={{ display: "grid", gap: 5, marginBottom: 10 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#7C2D12" }}>
          {label}
        </div>
        {summaryItems.map((item) => (
          <div
            key={item}
            style={{ fontSize: 11.5, color: "#9A3412", lineHeight: 1.5 }}
          >
            {item}
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={onConfirm}
        disabled={isConfirming}
        style={{
          width: "100%",
          border: "none",
          borderRadius: 10,
          background: "linear-gradient(135deg, #FF6B6B 0%, #FF8E53 100%)",
          color: "#fff",
          padding: "10px 12px",
          fontSize: 12.5,
          fontWeight: 700,
          cursor: isConfirming ? "default" : "pointer",
          opacity: isConfirming ? 0.6 : 1,
          fontFamily: ds.ff,
        }}
      >
        {isConfirming ? "처리 중..." : `${label} 진행`}
      </button>
    </div>
  );
}

function Bubble({
  msg,
  isLast,
  onConfirm,
  onSelectAction,
  quickActionMap,
  isConfirming = false,
  mobile = false,
}) {
  const isBot = msg.role === "bot";

  return (
    <div
      className="cb-msg"
      style={{
        display: "flex",
        flexDirection: isBot ? "row" : "row-reverse",
        alignItems: "flex-end",
        gap: 8,
        marginBottom: 8,
      }}
    >
      {isBot ? <Avatar small /> : null}
      <div
        style={{
          maxWidth: mobile ? "86%" : "78%",
          display: "flex",
          flexDirection: "column",
          alignItems: isBot ? "flex-start" : "flex-end",
          gap: 2,
        }}
      >
        <div
          style={{
            padding: mobile ? "10px 12px" : "11px 14px",
            borderRadius: isBot ? "6px 16px 16px 16px" : "16px 6px 16px 16px",
            background: isBot
              ? "#fff"
              : "linear-gradient(135deg, #FF6B6B 0%, #FF8E53 100%)",
            color: isBot ? "#374151" : "#fff",
            fontSize: mobile ? 12.5 : 13.5,
            lineHeight: 1.65,
            wordBreak: "keep-all",
            boxShadow: isBot
              ? "0 1px 4px rgba(0,0,0,0.05), 0 0 0 1px rgba(0,0,0,0.03)"
              : "0 3px 12px rgba(255,107,107,0.22)",
          }}
        >
          {msg.text}
        </div>
        <span
          style={{
            fontSize: 10,
            color: "#B0B0B0",
            padding: "0 4px",
            opacity: isLast ? 1 : 0,
          }}
        >
          {fmt(msg.ts)}
        </span>
        {isBot && msg.summary ? (
          <SummaryCard summary={msg.summary} mobile={mobile} />
        ) : null}
        {isBot && msg.messageType === "validation" ? (
          <ValidationCard
            message={msg}
            executionInfo={msg.executionInfo}
            quickActionMap={quickActionMap}
            onSelectAction={onSelectAction}
            mobile={mobile}
          />
        ) : null}
        {isBot &&
        (msg.messageType === "ambiguous" ||
          msg.messageType === "low_confidence") ? (
          <HintCard
            message={msg}
            quickActionMap={quickActionMap}
            onSelectAction={onSelectAction}
            mobile={mobile}
          />
        ) : null}
        {isBot && msg.messageType === "unsupported" ? (
          <UnsupportedCard executionInfo={msg.executionInfo} mobile={mobile} />
        ) : null}
        {isBot && msg.confirmation ? (
          <ConfirmCard
            confirmation={msg.confirmation}
            onConfirm={onConfirm}
            isConfirming={isConfirming}
            mobile={mobile}
          />
        ) : null}
      </div>
    </div>
  );
}

function Typing({ mobile = false }) {
  return (
    <div
      className="cb-msg"
      style={{
        display: "flex",
        alignItems: "flex-end",
        gap: 8,
        marginBottom: 8,
      }}
    >
      <Avatar small />
      <div
        style={{
          padding: mobile ? "10px 14px" : "11px 18px",
          borderRadius: "6px 16px 16px 16px",
          background: "#fff",
          boxShadow: "0 1px 4px rgba(0,0,0,0.05), 0 0 0 1px rgba(0,0,0,0.03)",
          display: "flex",
          gap: 5,
          alignItems: "center",
        }}
      >
        {[0, 1, 2].map((index) => (
          <div
            key={index}
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: "linear-gradient(135deg, #FF6B6B, #FF8E53)",
              animation: `dotWave 1.4s ease infinite`,
              animationDelay: `${index * 0.18}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

function QuickActionsSection({ actions, onSelectAction, mobile = false }) {
  return (
    <div style={{ width: "100%", display: "grid", gap: 8 }}>
      <div style={{ display: "grid", gap: 4 }}>
        <div
          style={{
            fontSize: mobile ? 15 : 16,
            fontWeight: 700,
            color: "#1F2937",
            textAlign: "left",
          }}
        >
          누리가 바로 도와드릴 수 있어요
        </div>
        <div
          style={{
            fontSize: mobile ? 11.5 : 12,
            color: "#6B7280",
            lineHeight: 1.5,
            textAlign: "left",
          }}
        >
          조회, 화면 이동, 초안 작성까지 자주 쓰는 기능을 바로 시작할 수 있어요.
        </div>
      </div>
      <div style={{ display: "grid", gap: 8 }}>
        {actions.map((action) => (
          <button
            key={action.id}
            type="button"
            onClick={() => onSelectAction(action)}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              gap: 4,
              padding: mobile ? "11px 12px" : "12px 14px",
              borderRadius: 14,
              border: "1px solid #F3D0C7",
              background: "#FFF8F5",
              cursor: "pointer",
              textAlign: "left",
              fontFamily: ds.ff,
            }}
          >
            <div
              style={{
                fontSize: mobile ? 12.5 : 13,
                fontWeight: 700,
                color: "#9A3412",
              }}
            >
              {action.label}
            </div>
            <div
              style={{
                fontSize: mobile ? 10.5 : 11.5,
                color: "#7C2D12",
                lineHeight: 1.5,
              }}
            >
              {action.description}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function ShortcutStrip({ actions, onSelectAction, mobile = false }) {
  return (
    <div
      style={{
        display: "flex",
        gap: 6,
        padding: mobile ? "8px 10px 4px" : "8px 14px 4px",
        background: "#FAFAFA",
        borderTop: "1px solid #F3F4F6",
        overflowX: "auto",
      }}
    >
      {actions.map((action) => (
        <button
          key={action.id}
          type="button"
          onClick={() => onSelectAction(action)}
          style={{
            padding: mobile ? "6px 10px" : "7px 12px",
            borderRadius: 999,
            border: "1px solid #E5E7EB",
            background: "#fff",
            color: "#6B7280",
            fontSize: mobile ? 11 : 11.5,
            cursor: "pointer",
            fontFamily: ds.ff,
            whiteSpace: "nowrap",
            flexShrink: 0,
          }}
        >
          {action.label}
        </button>
      ))}
    </div>
  );
}

function InputBar({
  inputRef,
  input,
  setInput,
  onSend,
  isTyping,
  handleKey,
  mobile = false,
}) {
  const active = input.trim() && !isTyping;
  return (
    <div
      style={{
        padding: mobile
          ? "8px 10px calc(env(safe-area-inset-bottom, 0px) + 10px)"
          : "10px 12px 12px",
        background: "#fff",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          gap: 8,
          background: "#F8FAFC",
          border: "1px solid #E5E7EB",
          borderRadius: 16,
          padding: mobile ? "5px 5px 5px 12px" : "6px 6px 6px 16px",
        }}
      >
        <textarea
          ref={inputRef}
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={handleKey}
          placeholder="누리에게 필요한 작업을 말씀해 주세요"
          rows={1}
          style={{
            flex: 1,
            border: "none",
            outline: "none",
            background: "transparent",
            resize: "none",
            fontFamily: ds.ff,
            fontSize: mobile ? 13 : 13.5,
            color: "#1F2937",
            lineHeight: 1.5,
            maxHeight: 96,
            overflowY: "auto",
            padding: "4px 0",
          }}
          onInput={(event) => {
            event.target.style.height = "auto";
            event.target.style.height = `${Math.min(event.target.scrollHeight, 96)}px`;
          }}
        />
        <button
          type="button"
          onClick={onSend}
          disabled={!active}
          style={{
            width: mobile ? 36 : 38,
            height: mobile ? 36 : 38,
            borderRadius: 12,
            border: "none",
            background: active
              ? "linear-gradient(135deg, #FF6B6B 0%, #FF8E53 100%)"
              : "#E5E7EB",
            cursor: active ? "pointer" : "default",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            boxShadow: active ? "0 6px 16px rgba(255,107,107,0.26)" : "none",
          }}
        >
          <Send size={15} color={active ? "#fff" : "#9CA3AF"} />
        </button>
      </div>
    </div>
  );
}

function Welcome({ actions, onSelectAction, mobile = false }) {
  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: mobile ? "22px 14px 14px" : "28px 20px 20px",
        overflow: "auto",
        background: "#fff",
      }}
    >
      <Avatar />
      <div
        style={{
          fontSize: mobile ? 18 : 20,
          fontWeight: 700,
          color: "#1F2937",
          marginTop: 14,
          letterSpacing: -0.4,
        }}
      >
        안녕하세요, 멍비서 누리예요 🐾
      </div>
      <div
        style={{
          fontSize: mobile ? 12.5 : 13,
          color: "#6B7280",
          marginTop: 6,
          textAlign: "center",
          lineHeight: 1.6,
        }}
      >
        자주 쓰는 기능을 먼저 보여드릴게요. 필요한 작업을 바로 눌러도 되고,
        자연어로 말씀해 주셔도 돼요.
      </div>
      <div style={{ width: "100%", marginTop: 18 }}>
        <QuickActionsSection
          actions={actions}
          onSelectAction={onSelectAction}
          mobile={mobile}
        />
      </div>
      <div
        style={{
          marginTop: "auto",
          paddingTop: 16,
          fontSize: 11,
          color: "#D1D5DB",
        }}
      >
        Powered by Amazon Nova
      </div>
    </div>
  );
}

export default function AdminChatBot() {
  const {
    isOpen,
    toggle,
    close,
    messages,
    input,
    setInput,
    isTyping,
    isConfirming,
    quickActions,
    triggerQuickAction,
    sendMessage,
    resetConversation,
    confirmExecute,
  } = useChatBot();

  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const [isHomeView, setIsHomeView] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const syncViewport = () => setIsMobile(window.innerWidth < 768);
    syncViewport();
    window.addEventListener("resize", syncViewport);
    return () => window.removeEventListener("resize", syncViewport);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 120);
    }
  }, [isOpen]);

  const quickActionMap = useMemo(
    () => Object.fromEntries(quickActions.map((action) => [action.id, action])),
    [quickActions],
  );

  const welcomeActions = useMemo(
    () => quickActions.slice(0, 7),
    [quickActions],
  );
  const shortcutActions = useMemo(
    () =>
      quickActions
        .filter((action) => ["summary", "navigate"].includes(action.category))
        .slice(0, 5),
    [quickActions],
  );

  const handleKey = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      setIsHomeView(false);
      sendMessage();
    }
  };

  const handleSend = () => {
    setIsHomeView(false);
    sendMessage();
  };

  const handleQuickAction = (action) => {
    setIsHomeView(false);
    triggerQuickAction(action);
  };

  const handleGoHome = () => {
    setIsHomeView(true);
  };

  const handleResetConversation = () => {
    resetConversation();
    setIsHomeView(true);
  };

  const mobilePanelBottom = 80;
  const mobileButtonBottom = 16;
  const panelShift = "var(--admin-board-panel-offset, 0px)";
  const rightChatOpen = isMobile
    ? `calc(10px + ${panelShift})`
    : `calc(28px + ${panelShift})`;
  const rightFabClosed = isMobile
    ? `calc(10px + ${panelShift})`
    : `calc(14px + ${panelShift})`;

  return (
    <>
      <style>{chatStyles}</style>

      {isOpen ? (
        <div
          style={{
            position: "fixed",
            bottom: isMobile ? mobilePanelBottom : 96,
            right: rightChatOpen,
            width: isMobile ? "min(calc(100vw - 16px), 336px)" : 390,
            maxWidth: isMobile ? "calc(100vw - 16px)" : 390,
            height: isMobile ? "min(calc(100dvh - 160px), 520px)" : 580,
            borderRadius: isMobile ? 20 : 24,
            background: "#fff",
            boxShadow:
              "0 25px 60px rgba(0,0,0,0.16), 0 8px 22px rgba(0,0,0,0.08)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            zIndex: 9999,
            animation: "chatSlideUp .28s ease-out",
            fontFamily: ds.ff,
          }}
        >
          <div
            style={{
              padding: isMobile ? "14px 14px 12px" : "16px 16px 14px",
              background: "linear-gradient(135deg, #FF6B6B 0%, #FF8E53 100%)",
              color: "#fff",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <Avatar small />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: isMobile ? 14 : 15, fontWeight: 700 }}>
                  멍비서 누리
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    marginTop: 4,
                  }}
                >
                  <Sparkles size={12} />
                  <span
                    style={{ fontSize: 11.5, color: "rgba(255,255,255,0.92)" }}
                  >
                    운영 오케스트레이터
                  </span>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <button
                  type="button"
                  onClick={handleGoHome}
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 10,
                    border: "none",
                    background: isHomeView
                      ? "rgba(255,255,255,0.28)"
                      : "rgba(255,255,255,0.18)",
                    color: "#fff",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: 0,
                    lineHeight: 0,
                  }}
                  title="홈"
                  aria-label="홈"
                >
                  <Home size={14} />
                </button>
                <button
                  type="button"
                  onClick={handleResetConversation}
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 10,
                    border: "none",
                    background: "rgba(255,255,255,0.18)",
                    color: "#fff",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: 0,
                    lineHeight: 0,
                  }}
                  title="새로고침"
                  aria-label="새로고침"
                >
                  <RotateCcw size={14} />
                </button>
                <button
                  type="button"
                  onClick={close}
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 10,
                    border: "none",
                    background: "rgba(255,255,255,0.18)",
                    color: "#fff",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: 0,
                    lineHeight: 0,
                  }}
                  title="최소화"
                  aria-label="최소화"
                >
                  <Minus size={15} />
                </button>
              </div>
            </div>
          </div>

          {isHomeView ? (
            <Welcome
              actions={welcomeActions}
              onSelectAction={handleQuickAction}
              mobile={isMobile}
            />
          ) : (
            <>
              <div
                className="cb-panel"
                style={{
                  flex: 1,
                  overflowY: "auto",
                  padding: isMobile ? "14px 12px 8px" : "16px 14px 8px",
                  background: "#F9FAFB",
                }}
              >
                {messages.map((msg, index) => (
                  <Bubble
                    key={msg.id}
                    msg={msg}
                    isLast={
                      index === messages.length - 1 ||
                      messages[index + 1]?.role !== msg.role
                    }
                    onConfirm={confirmExecute}
                    onSelectAction={handleQuickAction}
                    quickActionMap={quickActionMap}
                    isConfirming={isConfirming}
                    mobile={isMobile}
                  />
                ))}
                {isTyping ? <Typing mobile={isMobile} /> : null}
                <div ref={bottomRef} />
              </div>
              <ShortcutStrip
                actions={shortcutActions}
                onSelectAction={handleQuickAction}
                mobile={isMobile}
              />
            </>
          )}

          <InputBar
            inputRef={inputRef}
            input={input}
            setInput={setInput}
            onSend={handleSend}
            isTyping={isTyping}
            handleKey={handleKey}
            mobile={isMobile}
          />
        </div>
      ) : null}

      {isOpen ? (
        <button
          type="button"
          onClick={toggle}
          style={{
            position: "fixed",
            bottom: isMobile ? mobileButtonBottom : 28,
            right: rightChatOpen,
            width: isMobile ? 50 : 56,
            height: isMobile ? 50 : 56,
            borderRadius: "50%",
            border: "none",
            background: "#fff",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10000,
            boxShadow: "0 10px 24px rgba(0,0,0,0.16)",
          }}
        >
          <X size={22} color="#9CA3AF" />
        </button>
      ) : (
        <button
          type="button"
          onClick={toggle}
          style={{
            position: "fixed",
            bottom: isMobile ? mobileButtonBottom : 20,
            right: rightFabClosed,
            width: isMobile ? 56 : 64,
            height: isMobile ? 56 : 64,
            borderRadius: "50%",
            border: "none",
            background: "linear-gradient(135deg, #FF6B6B 0%, #FF8E53 100%)",
            color: "#fff",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10000,
            boxShadow: "0 16px 32px rgba(255,107,107,0.28)",
            fontSize: isMobile ? 22 : 24,
          }}
        >
          <div
            style={{
              width: isMobile ? 52 : 60,
              height: isMobile ? 52 : 60,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
              borderRadius: "50%",
            }}
          >
            <Lottie
              animationData={dogLottie}
              loop
              autoplay
              style={{
                width: isMobile ? 58 : 68,
                height: isMobile ? 58 : 68,
                transform: "scale(1.12)",
              }}
            />
          </div>
        </button>
      )}
    </>
  );
}
