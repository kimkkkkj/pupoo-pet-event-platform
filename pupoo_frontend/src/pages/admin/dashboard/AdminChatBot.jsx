import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUp, ChevronRight, Home, RotateCcw, Sparkles, X } from "lucide-react";
import Lottie from "lottie-react";
import dogLottie from "../../../assets/dog-lottie.json";
import ds from "../shared/designTokens";
import { useChatBot } from "./useChatBot";

// 사용자 사이트 챗봇(SiteChatBot)과 같은 구조로, 관리자 색(차콜 + 블루)만 다르게 입힌다.
const chatStyles = `
  .acb { --bg: #1B2025; --soft: #242A31; --line: rgba(255,255,255,.08); --ink: ${ds.ink}; --sub: ${ds.ink3}; --mute: ${ds.ink4};
         --brand: ${ds.brand}; --brand-text: ${ds.brandText}; --brand-soft: ${ds.brandSoft};
         font-family: ${ds.ff}; }
  .acb * { box-sizing: border-box; }

  .acb-fab { position: fixed; z-index: 10000; display: flex; align-items: center; gap: 10px; height: 56px; padding: 0 20px 0 6px;
             border: 1px solid var(--line); border-radius: 999px; background: #232931; color: var(--ink); cursor: pointer; font-family: inherit;
             box-shadow: 0 12px 32px rgba(0,0,0,.4); transition: transform .18s, border-color .18s; }
  .acb-fab:hover { transform: translateY(-2px); border-color: rgba(4,89,247,.6); }
  body[data-admin-form-open] .acb-fab { display: none; }
  .acb-face { position: relative; border-radius: 50%; background: var(--brand); overflow: hidden; flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
  .acb-face > div { width: 124%; height: 124%; }
  .acb-fab-text { display: flex; flex-direction: column; align-items: flex-start; line-height: 1.2; }
  .acb-fab-title { font-size: 15px; font-weight: 700; }
  .acb-fab-sub { margin-top: 2px; font-size: 12px; color: var(--sub); }
  .acb-badge { display: inline-flex; align-items: center; gap: 3px; height: 20px; padding: 0 7px; border-radius: 6px; background: var(--brand-soft); color: var(--brand-text); font-size: 11.5px; font-weight: 700; }

  .acb-panel { position: fixed; z-index: 10001; display: flex; flex-direction: column; border-radius: 20px; background: var(--bg); overflow: hidden;
               border: 1px solid var(--line); box-shadow: 0 24px 64px rgba(0,0,0,.5); animation: acb-pop .25s ease-out; }
  @keyframes acb-pop { from { opacity: 0; transform: translateY(14px) scale(.98); } to { opacity: 1; transform: none; } }

  .acb-head { display: flex; align-items: center; gap: 12px; padding: 14px 12px 14px 16px; border-bottom: 1px solid var(--line); }
  .acb-head-title { display: flex; align-items: center; gap: 7px; font-size: 16px; font-weight: 700; color: var(--ink); }
  .acb-head-sub { margin-top: 3px; font-size: 12.5px; color: var(--sub); white-space: nowrap; }
  .acb-icon { width: 34px; height: 34px; border: none; border-radius: 9px; background: none; color: var(--sub); cursor: pointer; display: flex; align-items: center; justify-content: center; }
  .acb-icon:hover, .acb-icon.on { background: var(--soft); color: var(--ink); }

  .acb-body { flex: 1; overflow-y: auto; padding: 18px 18px 10px; }
  .acb-body::-webkit-scrollbar { width: 5px; }
  .acb-body::-webkit-scrollbar-thumb { background: rgba(255,255,255,.12); border-radius: 3px; }

  .acb-hello h3 { margin: 4px 0 6px; font-size: 21px; font-weight: 700; letter-spacing: -0.03em; color: var(--ink); line-height: 1.35; word-break: keep-all; }
  .acb-hello p { margin: 0; font-size: 14px; line-height: 1.6; color: var(--sub); word-break: keep-all; }
  .acb-sec { margin: 22px 2px 10px; font-size: 13px; font-weight: 600; color: var(--mute); }
  .acb-qs { display: flex; flex-direction: column; gap: 8px; }
  .acb-q { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 13px 14px; border-radius: 12px; border: 1px solid var(--line); background: transparent;
           font-family: inherit; text-align: left; cursor: pointer; transition: border-color .15s, background .15s; }
  .acb-q:hover { border-color: rgba(4,89,247,.55); background: var(--brand-soft); }
  .acb-q b { display: block; font-size: 14px; font-weight: 600; color: var(--ink); }
  .acb-q small { display: block; margin-top: 3px; font-size: 12.5px; color: var(--sub); line-height: 1.5; }
  .acb-q svg { color: var(--mute); flex-shrink: 0; }

  .acb-msg { display: flex; margin-bottom: 16px; animation: acb-in .22s ease-out; }
  @keyframes acb-in { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
  .acb-msg.me { justify-content: flex-end; }
  .acb-col { width: 100%; display: flex; flex-direction: column; gap: 8px; }
  .acb-msg.me .acb-col { width: auto; max-width: 82%; align-items: flex-end; }
  .acb-text { padding: 2px 2px 0; font-size: 14.5px; line-height: 1.7; color: var(--ink); white-space: pre-line; word-break: keep-all; }
  .acb-msg.me .acb-text { padding: 10px 14px; border-radius: 18px; background: var(--soft); }
  .acb-time { font-size: 11.5px; color: var(--mute); }

  .acb-card { width: 100%; padding: 12px 14px; border-radius: 12px; background: var(--soft); border: 1px solid var(--line); }
  .acb-card-title { font-size: 13px; font-weight: 700; margin-bottom: 6px; }
  .acb-card-text { font-size: 13.5px; line-height: 1.6; color: var(--ink); word-break: keep-all; }
  .acb-card-note { font-size: 12.5px; line-height: 1.55; color: var(--sub); }
  .acb-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px; }
  .acb-item { padding: 10px; border-radius: 10px; background: var(--bg); }
  .acb-item small { display: block; font-size: 12px; color: var(--sub); margin-bottom: 3px; }
  .acb-item b { font-size: 14px; color: var(--ink); line-height: 1.45; word-break: keep-all; }

  .acb-chips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; }
  .acb-chip { display: inline-flex; align-items: center; gap: 3px; height: 32px; padding: 0 12px; border-radius: 999px; border: 1px solid var(--line); background: transparent;
              font-family: inherit; font-size: 13px; font-weight: 600; color: var(--ink); cursor: pointer; white-space: nowrap; flex-shrink: 0; }
  .acb-chip:hover { border-color: rgba(4,89,247,.55); color: var(--brand-text); }
  .acb-confirm { width: 100%; height: 40px; margin-top: 10px; border: none; border-radius: 10px; background: var(--brand); color: #fff; font-family: inherit; font-size: 14px; font-weight: 700; cursor: pointer; }
  .acb-confirm:disabled { opacity: .55; cursor: default; }

  .acb-typing { display: inline-flex; gap: 4px; padding: 10px 2px; }
  .acb-typing span { width: 7px; height: 7px; border-radius: 50%; background: var(--brand-text); animation: acb-dot 1.3s ease-in-out infinite; }
  .acb-typing span:nth-child(2) { animation-delay: .15s; } .acb-typing span:nth-child(3) { animation-delay: .3s; }
  @keyframes acb-dot { 0%, 60%, 100% { opacity: .3; transform: translateY(0); } 30% { opacity: 1; transform: translateY(-4px); } }

  .acb-strip { display: flex; gap: 6px; padding: 8px 14px 2px; overflow-x: auto; scrollbar-width: none; }
  .acb-foot { padding: 8px 14px 10px; }
  .acb-input { display: flex; align-items: flex-end; gap: 8px; padding: 5px 5px 5px 18px; border-radius: 24px; border: 1px solid var(--line); background: var(--soft); transition: border-color .15s; }
  .acb-input:focus-within { border-color: rgba(4,89,247,.6); }
  .acb-input textarea { flex: 1; min-width: 0; max-height: 110px; padding: 9px 0; border: none; outline: none; resize: none; background: transparent; font-family: inherit; font-size: 14.5px; line-height: 1.5; color: var(--ink); }
  .acb-input textarea::placeholder { color: var(--mute); }
  .acb-send { width: 38px; height: 38px; border: none; border-radius: 50%; background: var(--brand); color: #fff; cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .acb-send:disabled { background: rgba(255,255,255,.08); color: var(--mute); cursor: default; }
  .acb-note { margin: 6px 2px 0; font-size: 11px; color: var(--mute); text-align: center; }
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

function DogFace({ size }) {
  return (
    <span className="acb-face" style={{ width: size, height: size }} aria-hidden="true">
      <div><Lottie animationData={dogLottie} loop autoplay style={{ width: "100%", height: "100%" }} /></div>
    </span>
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

function ActionChips({ actions, onSelectAction }) {
  if (!actions?.length) return null;
  return (
    <div className="acb-chips">
      {actions.map((action) => (
        <button key={action.id} type="button" className="acb-chip" onClick={() => onSelectAction(action)}>
          {action.label}
          <ChevronRight size={14} />
        </button>
      ))}
    </div>
  );
}

function SummaryCard({ summary }) {
  if (!summary?.items?.length && !summary?.sections?.length) return null;
  return (
    <div className="acb-card">
      <div className="acb-card-title" style={{ color: ds.brandText }}>
        {SUMMARY_LABELS[summary.summaryType] || "요약"}
      </div>
      {summary?.items?.length ? (
        <div className="acb-grid">
          {summary.items.map((item) => (
            <div key={`${summary.summaryType}-${item.label}`} className="acb-item">
              <small>{item.label}</small>
              <b>
                {item.value}
                {item.meta != null ? ` / ${item.meta}` : ""}
              </b>
            </div>
          ))}
        </div>
      ) : null}
      {summary?.sections?.map((section) => (
        <div key={section.key} style={{ marginTop: 10 }}>
          <div className="acb-card-title" style={{ color: ds.ink }}>{section.title}</div>
          <div className="acb-grid">
            {section.items.map((item) => (
              <div key={`${section.key}-${item.label}`} className="acb-item">
                <small>{item.label}</small>
                <b>{item.value}</b>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function UnsupportedCard({ executionInfo }) {
  return (
    <div className="acb-card">
      <div className="acb-card-title" style={{ color: ds.red }}>지금은 사용할 수 없는 기능이에요</div>
      <div className="acb-card-note">{executionInfo?.reason || "이 기능은 현재 지원되지 않아요."}</div>
    </div>
  );
}

function ValidationCard({ message, executionInfo, quickActionMap, onSelectAction }) {
  const missingFields = executionInfo?.missingFields || [];
  const suggestedActions = buildValidationActions(executionInfo, quickActionMap);
  return (
    <div className="acb-card">
      <div className="acb-card-title" style={{ color: ds.amber }}>추가 정보가 필요해요</div>
      <div className="acb-card-text">{executionInfo?.reason || message.text}</div>
      {missingFields.length ? (
        <div style={{ marginTop: 8, display: "grid", gap: 4 }}>
          {missingFields.map((field) => (
            <div key={field} className="acb-card-note">
              <b style={{ color: ds.ink2 }}>{FIELD_LABELS[field] || field}</b> · {FIELD_GUIDES[field] || "필요한 값을 먼저 채워 주세요."}
            </div>
          ))}
        </div>
      ) : null}
      <ActionChips actions={suggestedActions} onSelectAction={onSelectAction} />
    </div>
  );
}

function HintCard({ message, quickActionMap, onSelectAction }) {
  const ambiguous = message.messageType === "ambiguous";
  const suggestedActions = buildHintActions(message.messageType, message, quickActionMap);
  return (
    <div className="acb-card">
      <div className="acb-card-title" style={{ color: ds.brandText }}>
        {ambiguous ? "원하시는 작업을 골라 주세요" : "조금만 더 구체적으로 알려 주세요"}
      </div>
      <div className="acb-card-note">
        {ambiguous
          ? "아래에서 가장 가까운 작업을 골라 주세요."
          : "대상이나 작업 종류를 알려 주시면 더 정확하게 도와드릴게요."}
      </div>
      <ActionChips actions={suggestedActions} onSelectAction={onSelectAction} />
    </div>
  );
}

function ConfirmCard({ confirmation, onConfirm, isConfirming = false }) {
  if (!confirmation) return null;
  const label = CONFIRM_LABELS[confirmation.actionKey] || "실행";
  const summaryItems = buildActionPayloadSummary(confirmation);
  return (
    <div className="acb-card">
      <div className="acb-card-title" style={{ color: ds.amber }}>실행 전에 한 번 더 확인해 주세요</div>
      <div className="acb-card-text" style={{ fontWeight: 600 }}>{label}</div>
      {summaryItems.map((item) => (
        <div key={item} className="acb-card-note">{item}</div>
      ))}
      <button type="button" className="acb-confirm" onClick={onConfirm} disabled={isConfirming}>
        {isConfirming ? "처리 중..." : `${label} 진행`}
      </button>
    </div>
  );
}

function Message({ msg, showTime, onConfirm, onSelectAction, quickActionMap, isConfirming }) {
  const isBot = msg.role === "bot";
  return (
    <div className={`acb-msg${isBot ? "" : " me"}`}>
      <div className="acb-col">
        <div className="acb-text">{msg.text}</div>
        {isBot && msg.summary ? <SummaryCard summary={msg.summary} /> : null}
        {isBot && msg.messageType === "validation" ? (
          <ValidationCard
            message={msg}
            executionInfo={msg.executionInfo}
            quickActionMap={quickActionMap}
            onSelectAction={onSelectAction}
          />
        ) : null}
        {isBot && (msg.messageType === "ambiguous" || msg.messageType === "low_confidence") ? (
          <HintCard message={msg} quickActionMap={quickActionMap} onSelectAction={onSelectAction} />
        ) : null}
        {isBot && msg.messageType === "unsupported" ? <UnsupportedCard executionInfo={msg.executionInfo} /> : null}
        {isBot && msg.confirmation ? (
          <ConfirmCard confirmation={msg.confirmation} onConfirm={onConfirm} isConfirming={isConfirming} />
        ) : null}
        {showTime ? <span className="acb-time">{fmt(msg.ts)}</span> : null}
      </div>
    </div>
  );
}

function Welcome({ actions, onSelectAction }) {
  return (
    <div className="acb-hello">
      <h3>
        안녕하세요!
        <br />
        운영 매니저 보리예요
      </h3>
      <p>운영 현황 조회, 화면 이동, 공지·알림 초안 작성을 도와드려요. 아래에서 고르거나 편하게 말씀해 주세요.</p>
      {actions.length ? (
        <>
          <div className="acb-sec">자주 쓰는 기능</div>
          <div className="acb-qs">
            {actions.map((action) => (
              <button key={action.id} type="button" className="acb-q" onClick={() => onSelectAction(action)}>
                <span>
                  <b>{action.label}</b>
                  {action.description ? <small>{action.description}</small> : null}
                </span>
                <ChevronRight size={17} />
              </button>
            ))}
          </div>
        </>
      ) : null}
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

  const welcomeActions = useMemo(() => quickActions.slice(0, 5), [quickActions]);
  const shortcutActions = useMemo(
    () =>
      quickActions
        .filter((action) => ["summary", "navigate"].includes(action.category))
        .slice(0, 5),
    [quickActions],
  );

  const handleSend = () => {
    if (!input.trim() || isTyping) return;
    setIsHomeView(false);
    sendMessage();
  };

  const handleKey = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  const handleQuickAction = (action) => {
    setIsHomeView(false);
    triggerQuickAction(action);
  };

  const handleResetConversation = () => {
    resetConversation();
    setIsHomeView(true);
  };

  // 게시판 상세 패널이 열리면 그만큼 왼쪽으로 비켜선다.
  const panelShift = "var(--admin-board-panel-offset, 0px)";
  const right = isMobile ? `calc(12px + ${panelShift})` : `calc(24px + ${panelShift})`;
  const panelStyle = isMobile
    ? { right: 0, bottom: 0, width: "100vw", height: "calc(100dvh - 56px)", borderRadius: "20px 20px 0 0" }
    : { right, bottom: 24, width: 380, height: "min(640px, calc(100dvh - 120px))" };

  return (
    <div className="acb">
      <style>{chatStyles}</style>

      {isOpen ? (
        <section className="acb-panel" style={panelStyle} role="dialog" aria-label="관리자 AI 비서 채팅">
          <header className="acb-head">
            <DogFace size={40} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="acb-head-title">
                보리
                <span className="acb-badge">
                  <Sparkles size={11} />
                  AI
                </span>
              </div>
              <div className="acb-head-sub">관리자 운영 비서</div>
            </div>
            <button
              type="button"
              className={`acb-icon${isHomeView ? " on" : ""}`}
              onClick={() => setIsHomeView(true)}
              title="처음 화면"
              aria-label="처음 화면"
            >
              <Home size={17} />
            </button>
            <button type="button" className="acb-icon" onClick={handleResetConversation} title="새 대화" aria-label="새 대화 시작">
              <RotateCcw size={17} />
            </button>
            <button type="button" className="acb-icon" onClick={close} title="닫기" aria-label="채팅 닫기">
              <X size={20} />
            </button>
          </header>

          <div className="acb-body">
            {isHomeView ? (
              <Welcome actions={welcomeActions} onSelectAction={handleQuickAction} />
            ) : (
              <>
                {messages.map((msg, index) => (
                  <Message
                    key={msg.id}
                    msg={msg}
                    showTime={index === messages.length - 1 || messages[index + 1]?.role !== msg.role}
                    onConfirm={confirmExecute}
                    onSelectAction={handleQuickAction}
                    quickActionMap={quickActionMap}
                    isConfirming={isConfirming}
                  />
                ))}
                {isTyping ? (
                  <div className="acb-msg">
                    <div className="acb-typing" aria-label="답변 작성 중"><span /><span /><span /></div>
                  </div>
                ) : null}
              </>
            )}
            <div ref={bottomRef} />
          </div>

          {!isHomeView && shortcutActions.length ? (
            <div className="acb-strip">
              {shortcutActions.map((action) => (
                <button key={action.id} type="button" className="acb-chip" onClick={() => handleQuickAction(action)}>
                  {action.label}
                </button>
              ))}
            </div>
          ) : null}

          <footer className="acb-foot" style={isMobile ? { paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 10px)" } : undefined}>
            <div className="acb-input">
              <textarea
                ref={inputRef}
                rows={1}
                value={input}
                placeholder="예) 오늘 환불 요청 현황 알려줘"
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={handleKey}
                onInput={(event) => {
                  event.target.style.height = "auto";
                  event.target.style.height = `${Math.min(event.target.scrollHeight, 110)}px`;
                }}
              />
              <button type="button" className="acb-send" onClick={handleSend} disabled={!input.trim() || isTyping} aria-label="보내기">
                <ArrowUp size={19} strokeWidth={2.6} />
              </button>
            </div>
            <p className="acb-note">보리도 가끔 실수할 수 있어요.</p>
          </footer>
        </section>
      ) : (
        <button
          type="button"
          className="acb-fab"
          onClick={toggle}
          aria-label="관리자 AI 비서 열기"
          style={{ right, bottom: isMobile ? 14 : 24, ...(isMobile ? { padding: 4, width: 56, justifyContent: "center" } : null) }}
        >
          <DogFace size={isMobile ? 46 : 44} />
          {!isMobile ? (
            <span className="acb-fab-text">
              <span className="acb-fab-title">운영 매니저 보리</span>
              <span className="acb-fab-sub">운영을 도와드려요</span>
            </span>
          ) : null}
        </button>
      )}
    </div>
  );
}
