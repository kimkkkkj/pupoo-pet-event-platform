import { useCallback, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { buildRequestUrl } from "../../../shared/config/requestUrl";
import { tokenStore } from "../../../app/http/tokenStore";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

// 사용자가 입력하기 전 첫 화면에서 바로 누를 수 있는 빠른 액션 목록이다.
const QUICK_ACTIONS = [
  {
    id: "event_info",
    label: "진행 중 행사",
    description: "지금 참여할 수 있는 행사와 핵심 프로그램을 안내해 드려요.",
    kind: "request",
    prompt: "진행 중인 행사 알려줘",
    category: "info",
  },
  {
    id: "program_recommend",
    label: "지금 추천 코스",
    description: "바로 참여하기 좋은 프로그램과 이동 순서를 추천해 드려요.",
    kind: "request",
    prompt: "지금 참여하기 좋은 프로그램 추천해줘",
    category: "info",
  },
  {
    id: "checkin_help",
    label: "체크인 방법",
    description: "QR 체크인과 입장 절차를 안내해 드려요.",
    kind: "request",
    prompt: "체크인 어떻게 해?",
    category: "info",
  },
  {
    id: "login_help",
    label: "로그인 / 회원가입",
    description: "로그인이나 회원가입 방법을 알려드려요.",
    kind: "request",
    prompt: "로그인 어떻게 해?",
    category: "info",
  },
  {
    id: "mypage_help",
    label: "마이페이지 도움",
    description: "내 QR, 신청 내역, 반려동물 정보 확인 방법을 안내해 드려요.",
    kind: "request",
    prompt: "마이페이지에서 뭘 할 수 있어?",
    category: "info",
  },
  {
    id: "payment_help",
    label: "결제 안내",
    description: "참가 신청과 결제 방법을 안내해 드려요.",
    kind: "request",
    prompt: "결제 어떻게 해?",
    category: "info",
  },
  {
    id: "refund_help",
    label: "환불 문의",
    description: "환불 절차와 방법을 안내해 드려요.",
    kind: "request",
    prompt: "환불하고 싶어",
    category: "info",
  },
  {
    id: "navigate_event",
    label: "행사 둘러보기",
    description: "현재 진행 중인 행사 목록으로 바로 이동해요.",
    kind: "navigate",
    route: "/event/current",
    category: "navigate",
  },
  {
    id: "navigate_programs",
    label: "프로그램 전체",
    description: "행사별 프로그램 페이지로 이동해요.",
    kind: "navigate",
    route: "/program/all",
    category: "navigate",
  },
  {
    id: "navigate_realtime",
    label: "실시간 현황",
    description: "실시간 현황 페이지로 이동해요.",
    kind: "navigate",
    route: "/realtime/dashboard",
    category: "navigate",
  },
  {
    id: "navigate_mypage",
    label: "마이페이지",
    description: "내 정보와 QR, 반려동물 정보를 확인하러 가요.",
    kind: "navigate",
    route: "/auth/mypage",
    category: "navigate",
  },
  {
    id: "navigate_applyhistory",
    label: "신청 내역",
    description: "행사와 프로그램 신청 내역을 확인하러 가요.",
    kind: "navigate",
    route: "/registration/applyhistory",
    category: "navigate",
  },
  {
    id: "navigate_qr",
    label: "QR 체크인",
    description: "내 QR 체크인 페이지로 바로 이동해요.",
    kind: "navigate",
    route: "/registration/qrcheckin",
    category: "navigate",
  },
  {
    id: "navigate_notice",
    label: "공지사항",
    description: "최신 행사 공지와 운영 안내를 확인해요.",
    kind: "navigate",
    route: "/community/notice",
    category: "navigate",
  },
  {
    id: "navigate_faq",
    label: "FAQ",
    description: "자주 묻는 질문 모음으로 이동해요.",
    kind: "navigate",
    route: "/community/faq",
    category: "navigate",
  },
];

function createEmptyConversationMemory() {
  return {
    lastEventId: null,
    lastEventName: "",
    lastTopic: "",
    lastNoticeId: null,
    lastFaqId: null,
    lastSummaryType: "",
  };
}

function createBotMessage(id, text, extras = {}) {
  return {
    id,
    role: "bot",
    text,
    ts: new Date(),
    messageType: "default",
    ...extras,
  };
}

function initialMessages() {
  return [
    createBotMessage(
      1,
      "안녕하세요! 푸리예요 🐾 행사 안내, 로그인, 결제, 환불 등 궁금한 건 뭐든 물어봐 주세요!",
    ),
  ];
}

function resolveActionLabel(action) {
  if (action?.payload?.label) return action.payload.label;
  if (action?.type === "NAVIGATE") return "바로가기";
  if (action?.type === "SEND_MESSAGE") return "자세히 보기";
  return "추천 액션";
}

function normalizeActions(actions) {
  return (actions || []).map((action) => ({
    ...action,
    payload: {
      ...(action?.payload || {}),
      label: resolveActionLabel(action),
    },
  }));
}

function mergeConversationMemory(prevMemory, contextHints) {
  // 서버가 내려준 문맥 힌트만 골라 다음 질문의 기본 문맥으로 이어 붙인다.
  if (!contextHints || typeof contextHints !== "object") return prevMemory;

  const nextMemory = { ...prevMemory };
  for (const [key, value] of Object.entries(contextHints)) {
    if (!(key in nextMemory)) continue;
    if (value === undefined || value === null || value === "") continue;
    nextMemory[key] = value;
  }
  return nextMemory;
}

function enrichBotMessage(id, response) {
  const actions = normalizeActions(response?.actions);
  const summaryAction = actions.find((action) => action?.type === "SHOW_SUMMARY");

  return createBotMessage(id, response?.message || "응답을 받지 못했어요.", {
    messageType: response?.messageType || "default",
    summary: summaryAction?.payload || null,
    actions: actions.filter((action) => action?.type !== "SHOW_SUMMARY"),
  });
}

function resolveCurrentPage(pathname) {
  if (pathname.startsWith("/event")) return "event";
  if (pathname.startsWith("/program")) return "program";
  if (pathname.startsWith("/realtime")) return "realtime";
  if (pathname.startsWith("/community")) return "community";
  if (pathname.startsWith("/auth")) return "auth";
  if (pathname.startsWith("/payment")) return "payment";
  if (pathname.startsWith("/guide")) return "guide";
  return "home";
}

async function requestChat({ history, userMessage, context }) {
  // 요청 페이로드 구성을 한곳에 모아 UI 핸들러가 같은 채팅 계약을 재사용하게 한다.
  const url = buildRequestUrl(API_BASE_URL, "/api/chatbot/chat");
  const token = tokenStore.getAccessToken();

  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  let response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        message: userMessage,
        history: history.map((msg) => ({
          role: msg.role === "bot" ? "assistant" : "user",
          content: msg.text,
        })),
        context,
      }),
    });
  } catch {
    throw new Error("지금은 푸리와 연결되지 않았어요. 잠시 후 다시 시도해 주세요.");
  }

  const rawText = await response.text();
  let payload;
  try {
    payload = JSON.parse(rawText);
  } catch {
    throw new Error("응답을 읽지 못했어요. 잠시 후 다시 시도해 주세요.");
  }

  if (!response.ok || payload?.success === false) {
    throw new Error(
      payload?.data?.message || payload?.message || "일시적인 오류가 있었어요. 잠시 후 다시 시도해 주세요.",
    );
  }

  return payload?.data || {
    message: "응답을 받지 못했어요.",
    messageType: "default",
    actions: [],
    contextHints: {},
  };
}

export function useSiteChatBot() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState(initialMessages);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [conversationMemory, setConversationMemory] = useState(createEmptyConversationMemory);
  const idRef = useRef(2);

  const currentContext = useMemo(
    () => ({
      currentPage: resolveCurrentPage(location.pathname),
      route: location.pathname,
      role: "user",
      ...conversationMemory,
    }),
    [conversationMemory, location.pathname],
  );

  const quickActions = useMemo(() => QUICK_ACTIONS, []);

  const toggle = useCallback(() => setIsOpen((v) => !v), []);
  const close = useCallback(() => setIsOpen(false), []);

  const sendMessage = useCallback(
    async (text) => {
      const trimmed = String(text || input).trim();
      if (!trimmed || isTyping) return;

      const userMsg = { id: idRef.current++, role: "user", text: trimmed, ts: new Date() };
      setMessages((prev) => [...prev, userMsg]);
      setInput("");
      setIsTyping(true);

      try {
        const response = await requestChat({
          history: messages,
          userMessage: trimmed,
          context: currentContext,
        });
        setConversationMemory((prev) => mergeConversationMemory(prev, response?.contextHints));
        setMessages((prev) => [
          ...prev,
          enrichBotMessage(idRef.current++, response),
        ]);
      } catch (error) {
        setMessages((prev) => [
          ...prev,
          createBotMessage(idRef.current++, error?.message || "일시적인 오류가 있었어요.", {
            messageType: "error",
          }),
        ]);
      } finally {
        setIsTyping(false);
      }
    },
    [currentContext, input, isTyping, messages],
  );

  const triggerQuickAction = useCallback(
    async (item) => {
      // 이동형 액션은 로컬 라우팅으로 처리하고, 요청형 액션은 일반 채팅 흐름을 재사용한다.
      if (!item) return;
      if (item.kind === "navigate" && item.route) {
        navigate(item.route);
        setMessages((prev) => [
          ...prev,
          createBotMessage(idRef.current++, `${item.label} 페이지로 안내할게요! 🐾`),
        ]);
        return;
      }
      if (item.kind === "request" && item.prompt) {
        await sendMessage(item.prompt);
      }
    },
    [navigate, sendMessage],
  );

  const handleMessageAction = useCallback(
    async (action) => {
      // 서버가 내려준 액션도 첫 화면 액션과 같은 이동·메시지 훅을 재사용한다.
      if (!action) return;

      if (action.type === "NAVIGATE" && action.payload?.route) {
        navigate(action.payload.route);
        setMessages((prev) => [
          ...prev,
          createBotMessage(
            idRef.current++,
            `${action.payload.label || "해당"} 화면으로 안내할게요! 🐾`,
          ),
        ]);
        return;
      }

      if (action.type === "SEND_MESSAGE" && action.payload?.prompt) {
        await sendMessage(action.payload.prompt);
      }
    },
    [navigate, sendMessage],
  );

  const resetConversation = useCallback(() => {
    // 챗봇의 열림 상태는 유지한 채 기본 환영 메시지 상태로만 되돌린다.
    setMessages(initialMessages());
    setInput("");
    setIsTyping(false);
    setConversationMemory(createEmptyConversationMemory());
  }, []);

  // 홈 버튼은 위젯을 닫지 않고 대화를 가볍게 다시 시작할 수 있게 한다.
  const clearMessages = useCallback(() => {
    setMessages([createBotMessage(idRef.current++, "대화를 새로 시작할게요! 뭐든 물어봐 주세요 🐾")]);
    setConversationMemory(createEmptyConversationMemory());
  }, []);

  return {
    isOpen,
    toggle,
    close,
    messages,
    input,
    setInput,
    isTyping,
    quickActions,
    triggerQuickAction,
    handleMessageAction,
    sendMessage,
    clearMessages,
    resetConversation,
  };
}
