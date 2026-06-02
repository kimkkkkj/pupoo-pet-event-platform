import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { axiosInstance } from "../../../app/http/axiosInstance";
import { tokenStore } from "../../../app/http/tokenStore";
const NOTICE_DRAFT_KEY = "pupoo_admin_chatbot_notice_draft";
const NOTIFICATION_DRAFT_KEY = "pupoo_admin_chatbot_notification_draft";
const NOTICE_SYNC_EVENT = "pupoo-admin-chatbot-sync-notice";
const NOTIFICATION_SYNC_EVENT = "pupoo-admin-chatbot-sync-notification";
const DASHBOARD_TARGET_KEY = "pupoo_admin_dashboard_target";
const DASHBOARD_TARGET_EVENT = "pupoo-admin-dashboard-target";
const ADMIN_DASHBOARD_ROUTE = "/admin/dashboard";

const QUICK_ACTIONS = [
  {
    id: "summary_congestion",
    label: "행사 현황 보기",
    description: "진행 중 행사와 체크인 현황을 바로 볼 수 있어요.",
    kind: "request",
    prompt: "행사 현황 보여줘",
    actionKey: "summary_get",
    category: "summary",
  },
  {
    id: "summary_applicants",
    label: "참가자 수 보기",
    description: "신청과 승인 현황을 빠르게 확인해요.",
    kind: "request",
    prompt: "참가자 수 알려줘",
    actionKey: "applicants_get",
    category: "summary",
  },
  {
    id: "summary_refund",
    label: "환불 현황 보기",
    description: "요청, 승인, 완료 상태를 볼 수 있어요.",
    kind: "request",
    prompt: "환불 현황 알려줘",
    actionKey: "refund_get",
    category: "summary",
  },
  {
    id: "prefill_notice",
    label: "공지 작성하기",
    description: "공지 초안부터 바로 시작할 수 있어요.",
    kind: "apply",
    actionKey: "prefill_notice_form",
    category: "draft",
    feedback: "공지 초안을 바로 열어드릴게요. 제목과 내용을 채워 주세요 🐶",
    actions: [
      {
        type: "PREFILL_FORM",
        actionKey: "prefill_notice_form",
        payload: {
          actionKey: "prefill_notice_form",
          formType: "notice",
          page: "notice",
          route: "/admin/board/notice",
          formData: {
            scope: "ALL",
            title: "",
            content: "",
            pinned: false,
            status: "DRAFT",
          },
          execution: {
            supported: false,
            executeType: "SAVE_NOTICE",
            targetType: "NOTICE",
            reason: "공지 제목과 내용을 먼저 적어 주세요.",
            missingFields: ["title", "content"],
            supportedExecuteTypes: [],
          },
        },
      },
    ],
  },
  {
    id: "prefill_notification",
    label: "알림 초안 작성하기",
    description: "알림 제목과 내용을 먼저 정리할 수 있어요.",
    kind: "apply",
    actionKey: "prefill_notification_form",
    category: "draft",
    feedback: "알림 초안을 열어둘게요. 제목과 내용을 먼저 채워 주세요 멍!",
    actions: [
      {
        type: "PREFILL_FORM",
        actionKey: "prefill_notification_form",
        payload: {
          actionKey: "prefill_notification_form",
          formType: "notification",
          page: "alertManage",
          route: "/admin/participant/alert",
          formData: {
            title: "",
            content: "",
            alertMode: "BROADCAST",
            notificationType: "NOTICE",
          },
          execution: {
            supported: false,
            reason: "알림 제목과 내용을 먼저 입력해 주세요.",
            missingFields: ["title", "content"],
            supportedExecuteTypes: [],
          },
        },
      },
    ],
  },
  {
    id: "start_broadcast_notification",
    label: "전체 알림 보내기",
    description: "전체 알림 발송에 필요한 정보를 먼저 채워요.",
    kind: "apply",
    actionKey: "notification_broadcast_send",
    category: "execute",
    feedback:
      "전체 알림 발송 준비를 도와드릴게요. 제목과 내용을 먼저 적어 주세요 🐾",
    actions: [
      {
        type: "PREFILL_FORM",
        actionKey: "prefill_notification_form",
        payload: {
          actionKey: "prefill_notification_form",
          formType: "notification",
          page: "alertManage",
          route: "/admin/participant/alert",
          formData: {
            title: "",
            content: "",
            alertMode: "BROADCAST",
            notificationType: "NOTICE",
          },
          execution: {
            supported: false,
            executeType: "SEND_BROADCAST_NOTIFICATION",
            targetType: "BROADCAST_NOTIFICATION",
            reason: "전체 알림을 보내려면 제목과 내용이 필요해요.",
            missingFields: ["title", "content"],
            supportedExecuteTypes: [],
          },
        },
      },
    ],
  },
  {
    id: "start_event_notification",
    label: "행사 알림 보내기",
    description: "행사 번호를 선택한 뒤 알림을 보낼 수 있어요.",
    kind: "apply",
    actionKey: "notification_event_send",
    category: "execute",
    feedback:
      "행사 알림 발송 준비를 열어둘게요. 행사 번호를 먼저 골라 주세요 🐶",
    actions: [
      {
        type: "PREFILL_FORM",
        actionKey: "prefill_notification_form",
        payload: {
          actionKey: "prefill_notification_form",
          formType: "notification",
          page: "alertManage",
          route: "/admin/participant/alert",
          formData: {
            title: "",
            content: "",
            alertMode: "EVENT",
            notificationType: "NOTICE",
            targetType: "EVENT",
          },
          execution: {
            supported: false,
            executeType: "SEND_EVENT_NOTIFICATION",
            targetType: "EVENT_NOTIFICATION",
            reason: "행사 알림을 보내려면 행사 번호가 필요해요.",
            missingFields: ["eventId", "title", "content"],
            supportedExecuteTypes: [],
          },
        },
      },
    ],
  },
  {
    id: "navigate_notice",
    label: "공지 관리",
    description: "공지 목록과 수정 화면으로 이동해요.",
    kind: "apply",
    actionKey: "navigate_notice_manage",
    category: "navigate",
    feedback: "공지 관리 화면으로 안내할게요.",
    actions: [
      {
        type: "NAVIGATE",
        actionKey: "navigate_notice_manage",
        payload: { route: "/admin/board/notice" },
      },
    ],
  },
  {
    id: "navigate_notification",
    label: "알림 관리",
    description: "알림 초안과 발송 상태를 관리해요.",
    kind: "apply",
    actionKey: "navigate_notification_manage",
    category: "navigate",
    feedback: "알림 관리 화면으로 안내할게요.",
    actions: [
      {
        type: "NAVIGATE",
        actionKey: "navigate_notification_manage",
        payload: { route: "/admin/participant/alert" },
      },
    ],
  },
  {
    id: "navigate_refund",
    label: "환불 관리",
    description: "환불 요청과 처리 상태를 바로 볼 수 있어요.",
    kind: "apply",
    actionKey: "navigate_refund_manage",
    category: "navigate",
    feedback: "환불 관리 화면으로 이동할게요.",
    actions: [
      {
        type: "NAVIGATE",
        actionKey: "navigate_refund_manage",
        payload: { route: "/admin/refunds" },
      },
    ],
  },
];

function readJsonStorage(key) {
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeJsonStorage(key, value) {
  try {
    if (value == null) {
      sessionStorage.removeItem(key);
      return;
    }
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore storage failures
  }
}

function setDashboardTarget(page) {
  if (!page) return;
  try {
    sessionStorage.setItem(DASHBOARD_TARGET_KEY, page);
  } catch {
    // ignore storage failures
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(DASHBOARD_TARGET_EVENT, { detail: { page } }),
    );
  }
}

function createBotMessage(id, text, extras = {}) {
  return {
    id,
    role: "bot",
    text,
    ts: new Date(),
    messageType: "default",
    summary: null,
    confirmation: null,
    executionInfo: null,
    ...extras,
  };
}

function initialMessages() {
  return [
    createBotMessage(
      1,
      "안녕하세요! 멍비서 누리예요 🐶 조회, 화면 이동, 공지와 알림 초안 작성까지 바로 도와드릴게요.",
    ),
  ];
}

function resolveCurrentPage(pathname) {
  if (pathname.startsWith("/admin/board/notice")) return "notice";
  if (pathname.startsWith("/admin/event")) return "eventManage";
  if (pathname.startsWith("/admin/participant/alert")) return "alertManage";
  if (pathname.startsWith("/admin/refunds")) return "refundManage";
  if (pathname.startsWith("/admin/dashboard")) return "dashboard";
  return "";
}

function resolveErrorMessage(payload) {
  return (
    payload?.message ||
    payload?.data?.message ||
    payload?.error?.message ||
    "지금은 요청을 처리하지 못했어요. 잠시 후 다시 시도해 주세요."
  );
}

function resolveActionKey(action) {
  if (action?.payload?.actionKey) return action.payload.actionKey;
  if (action?.actionKey) return action.actionKey;
  if (action?.type === "PREFILL_FORM") {
    return action?.payload?.formType === "notice"
      ? "prefill_notice_form"
      : "prefill_notification_form";
  }
  if (action?.type === "NAVIGATE") {
    const route = action?.payload?.route || "";
    if (route.startsWith("/admin/dashboard")) return "navigate_dashboard";
    if (route.startsWith("/admin/board/notice"))
      return "navigate_notice_manage";
    if (route.startsWith("/admin/participant/alert"))
      return "navigate_notification_manage";
    if (route.startsWith("/admin/event")) return "navigate_event_manage";
    if (route.startsWith("/admin/refunds")) return "navigate_refund_manage";
  }
  if (action?.type === "SHOW_SUMMARY") {
    return action?.payload?.summaryType === "capabilities"
      ? "capabilities_get"
      : "summary_get";
  }
  return null;
}

function normalizeActions(actions) {
  return (actions || []).map((action) => ({
    ...action,
    actionKey: resolveActionKey(action),
    payload: {
      ...(action?.payload || {}),
      actionKey: action?.payload?.actionKey || resolveActionKey(action),
    },
  }));
}

async function requestChat({ history, userMessage, context, confirmation }) {
  if (!tokenStore.getAdminAccess() && !tokenStore.hasAdminSessionHint()) {
    const error = new Error(
      "Login is required. Please sign in again with an admin account.",
    );
    error.messageType = "unauthorized";
    error.status = 401;
    throw error;
  }

  try {
    const response = await axiosInstance.post("/api/admin/chatbot/chat", {
      message: userMessage,
      history: history.map((message) => ({
        role: message.role === "bot" ? "assistant" : "user",
        content: message.text,
      })),
      context,
      confirmation,
    });

    const payload = response?.data ?? {};
    if (payload?.success === false) {
      const error = new Error(resolveErrorMessage(payload));
      error.messageType = payload?.data?.messageType || "error";
      error.status = response?.status;
      throw error;
    }

    return (
      payload?.data || {
        message: "No response was returned.",
        messageType: "default",
        actions: [],
      }
    );
  } catch (error) {
    const status = Number(error?.response?.status || error?.status);
    if (!status) {
      throw new Error(
        "Nuri is temporarily unavailable. Please try again in a moment.",
      );
    }

    const payload = error?.response?.data ?? {};
    const resolvedError = new Error(resolveErrorMessage(payload));
    resolvedError.messageType = payload?.data?.messageType || "error";
    resolvedError.status = status;
    if (status === 401) {
      resolvedError.message =
        "Login is required. Please sign in again with an admin account.";
      resolvedError.messageType = "unauthorized";
    } else if (status === 403) {
      resolvedError.message = "Admin permission is required for this action.";
      resolvedError.messageType = "forbidden";
    } else if (status === 404) {
      resolvedError.message = "The requested target could not be found.";
      resolvedError.messageType = "not_found";
    }
    throw resolvedError;
  }
}

function enrichBotMessage(baseMessage, response) {
  const actions = normalizeActions(response?.actions);
  const summaryAction = actions.find(
    (action) => action?.type === "SHOW_SUMMARY",
  );
  const confirmAction = actions.find(
    (action) => action?.type === "CONFIRM_EXECUTE",
  );
  const prefillAction = actions.find(
    (action) => action?.type === "PREFILL_FORM",
  );

  return {
    ...baseMessage,
    messageType: response?.messageType || "default",
    summary: summaryAction?.payload || null,
    confirmation: confirmAction?.payload || null,
    executionInfo: prefillAction?.payload?.execution
      ? {
          ...prefillAction.payload.execution,
          actionKey: prefillAction.payload.actionKey,
        }
      : null,
  };
}

export function useChatBot() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState(initialMessages);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [noticeDraft, setNoticeDraft] = useState(() =>
    readJsonStorage(NOTICE_DRAFT_KEY),
  );
  const [notificationDraft, setNotificationDraft] = useState(() =>
    readJsonStorage(NOTIFICATION_DRAFT_KEY),
  );
  const [pendingConfirmation, setPendingConfirmation] = useState(null);
  const idRef = useRef(2);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const syncNoticeDraft = (event) => {
      const detail = event?.detail;
      setNoticeDraft(detail ?? readJsonStorage(NOTICE_DRAFT_KEY));
    };
    const syncNotificationDraft = (event) => {
      const detail = event?.detail;
      setNotificationDraft(detail ?? readJsonStorage(NOTIFICATION_DRAFT_KEY));
    };

    window.addEventListener(NOTICE_SYNC_EVENT, syncNoticeDraft);
    window.addEventListener(NOTIFICATION_SYNC_EVENT, syncNotificationDraft);
    return () => {
      window.removeEventListener(NOTICE_SYNC_EVENT, syncNoticeDraft);
      window.removeEventListener(
        NOTIFICATION_SYNC_EVENT,
        syncNotificationDraft,
      );
    };
  }, []);

  const currentContext = useMemo(
    () => ({
      currentPage: resolveCurrentPage(location.pathname),
      route: location.pathname,
      noticeDraft: noticeDraft?.formData || noticeDraft || null,
      noticeExecution: noticeDraft?.execution || null,
      notificationDraft:
        notificationDraft?.formData || notificationDraft || null,
      notificationExecution: notificationDraft?.execution || null,
    }),
    [location.pathname, noticeDraft, notificationDraft],
  );

  const quickActions = useMemo(() => QUICK_ACTIONS, []);

  const toggle = useCallback(() => setIsOpen((value) => !value), []);
  const close = useCallback(() => setIsOpen(false), []);

  const applyActions = useCallback(
    (actions) => {
      normalizeActions(actions).forEach((action) => {
        switch (action?.actionKey) {
          case "navigate_dashboard":
            setDashboardTarget("dashboard");
            navigate(ADMIN_DASHBOARD_ROUTE);
            break;
          case "navigate_notice_manage":
            setDashboardTarget("notice");
            navigate(ADMIN_DASHBOARD_ROUTE);
            break;
          case "navigate_notification_manage":
            setDashboardTarget("alertManage");
            navigate(ADMIN_DASHBOARD_ROUTE);
            break;
          case "navigate_event_manage":
            setDashboardTarget("eventManage");
            navigate(ADMIN_DASHBOARD_ROUTE);
            break;
          case "navigate_refund_manage":
            setDashboardTarget("refundManage");
            navigate(ADMIN_DASHBOARD_ROUTE);
            break;
          case "prefill_notice_form": {
            const storedPayload = {
              formData: action?.payload?.formData || {},
              execution: action?.payload?.execution
                ? {
                    ...action.payload.execution,
                    actionKey: action.payload.actionKey,
                  }
                : null,
            };
            writeJsonStorage(NOTICE_DRAFT_KEY, storedPayload);
            setNoticeDraft(storedPayload);
            setDashboardTarget(action?.payload?.page || "notice");
            navigate(ADMIN_DASHBOARD_ROUTE);
            window.dispatchEvent(
              new CustomEvent("pupoo-admin-chatbot-prefill-notice", {
                detail: storedPayload,
              }),
            );
            break;
          }
          case "prefill_notification_form": {
            const storedPayload = {
              formData: action?.payload?.formData || {},
              execution: action?.payload?.execution
                ? {
                    ...action.payload.execution,
                    actionKey: action.payload.actionKey,
                  }
                : null,
            };
            writeJsonStorage(NOTIFICATION_DRAFT_KEY, storedPayload);
            setNotificationDraft(storedPayload);
            setDashboardTarget(action?.payload?.page || "alertManage");
            navigate(ADMIN_DASHBOARD_ROUTE);
            window.dispatchEvent(
              new CustomEvent("pupoo-admin-chatbot-prefill-notification", {
                detail: storedPayload,
              }),
            );
            break;
          }
          case "notice_create":
          case "notice_update":
          case "notice_hide":
          case "notification_draft_create":
          case "notification_draft_update":
          case "notification_draft_delete":
          case "notification_draft_send":
          case "notification_event_send":
          case "notification_broadcast_send":
            setPendingConfirmation(action.payload || null);
            break;
          default:
            if (action?.type === "NAVIGATE" && action?.payload?.route)
              navigate(action.payload.route);
            break;
        }
      });
    },
    [navigate],
  );

  const sendMessage = useCallback(
    async (text) => {
      const trimmed = String(text || input).trim();
      if (!trimmed || isTyping) return;

      const userMessage = {
        id: idRef.current++,
        role: "user",
        text: trimmed,
        ts: new Date(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setInput("");
      setIsTyping(true);

      try {
        const response = await requestChat({
          history: messages,
          userMessage: trimmed,
          context: currentContext,
          confirmation: null,
        });
        setPendingConfirmation(null);
        applyActions(response.actions || []);
        setMessages((prev) => [
          ...prev,
          enrichBotMessage(
            createBotMessage(
              idRef.current++,
              response.message || "응답을 받지 못했어요.",
            ),
            response,
          ),
        ]);
      } catch (error) {
        setMessages((prev) => [
          ...prev,
          createBotMessage(
            idRef.current++,
            error?.message ||
              "일시적인 오류가 있었어요. 잠시 후 다시 시도해 주세요.",
            {
              messageType: error?.messageType || "error",
            },
          ),
        ]);
      } finally {
        setIsTyping(false);
      }
    },
    [applyActions, currentContext, input, isTyping, messages],
  );

  const triggerQuickAction = useCallback(
    async (item) => {
      if (!item) return;
      if (item.id === "summary_refund") {
        applyActions([
          {
            type: "NAVIGATE",
            actionKey: "navigate_refund_manage",
            payload: { route: "/admin/refunds" },
          },
        ]);
        setMessages((prev) => [
          ...prev,
          createBotMessage(
            idRef.current++,
            "환불 관리 화면으로 바로 안내해드릴게요.",
          ),
        ]);
        return;
      }
      if (item.kind === "request") {
        await sendMessage(item.prompt);
        return;
      }

      applyActions(item.actions || []);
      if (item.feedback) {
        setMessages((prev) => [
          ...prev,
          createBotMessage(idRef.current++, item.feedback),
        ]);
      }
    },
    [applyActions, sendMessage],
  );

  const confirmExecute = useCallback(async () => {
    if (!pendingConfirmation || isTyping || isConfirming) return;

    const userMessage = {
      id: idRef.current++,
      role: "user",
      text: "확인",
      ts: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsTyping(true);
    setIsConfirming(true);

    try {
      const response = await requestChat({
        history: messages,
        userMessage: "확인",
        context: currentContext,
        confirmation: pendingConfirmation,
      });
      setPendingConfirmation(null);
      applyActions(response.actions || []);
      setMessages((prev) => [
        ...prev,
        enrichBotMessage(
          createBotMessage(
            idRef.current++,
            response.message || "처리를 마쳤어요.",
          ),
          response,
        ),
      ]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        createBotMessage(
          idRef.current++,
          error?.message || "실행 중에 문제가 있었어요.",
          {
            messageType: error?.messageType || "error",
          },
        ),
      ]);
    } finally {
      setIsTyping(false);
      setIsConfirming(false);
    }
  }, [
    applyActions,
    currentContext,
    isConfirming,
    isTyping,
    messages,
    pendingConfirmation,
  ]);

  const clearMessages = useCallback(() => {
    setPendingConfirmation(null);
    setMessages([
      createBotMessage(
        idRef.current++,
        "대화를 다시 시작할게요. 필요한 작업을 말씀해 주세요 🐾",
      ),
    ]);
  }, []);

  const resetConversation = useCallback(() => {
    setPendingConfirmation(null);
    setMessages(initialMessages());
    setInput("");
    setIsTyping(false);
    setIsConfirming(false);
  }, []);

  return {
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
    clearMessages,
    resetConversation,
    confirmExecute,
  };
}
