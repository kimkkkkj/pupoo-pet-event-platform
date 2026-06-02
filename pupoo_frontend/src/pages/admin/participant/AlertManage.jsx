import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Send,
  Users,
  X,
  Plus,
  Bell,
  Mail,
  ChevronDown,
  Pencil,
  Trash2,
  AlertTriangle,
  Check,
  Search,
} from "lucide-react";
import ds from "../shared/designTokens";
import { axiosInstance } from "../../../app/http/axiosInstance";
import { adminNotificationApi } from "../../../app/http/adminNotificationApi";
import { sortAdminEventsByOperationalPriority } from "../shared/adminStatus";

/** 발송 대상(recipientScope) 옵션 — 백엔드 Enum 매핑 */
const RECIPIENT_SCOPE_OPTIONS = [
  { value: "INTEREST_SUBSCRIBERS", label: "관심 구독자" },
  { value: "EVENT_REGISTRANTS", label: "이벤트 신청자" },
  { value: "EVENT_PAYERS", label: "결제 완료자" },
];

const EVENT_FILTER_OPTIONS = [
  { value: "all", label: "전체" },
  { value: "active", label: "진행중" },
  { value: "pending", label: "예정" },
  { value: "ended", label: "종료" },
  { value: "important", label: "중요" },
  { value: "system", label: "시스템" },
];

const SPECIAL_ALERT_OPTIONS = {
  important: [{ value: "IMPORTANT_ALL", label: "전체 중요 알림" }],
  system: [{ value: "SYSTEM_INFO", label: "시스템 관련 알림" }],
};

const EVENT_FILTER_SET = new Set(["all", "active", "pending", "ended"]);
const CREATE_FILTER_OPTIONS = EVENT_FILTER_OPTIONS.filter(
  (option) => option.value !== "all",
);

const toRecipientScopeArray = (value) => {
  const source = Array.isArray(value) ? value : value ? [value] : [];
  return [...new Set(source.filter(Boolean).map((scope) => String(scope)))];
};

const normalizeRecipientScopes = (value) => {
  const unique = toRecipientScopeArray(value);
  return unique.length > 0 ? unique : ["INTEREST_SUBSCRIBERS"];
};

const resolveRecipientTargetLabel = (scopes) =>
  normalizeRecipientScopes(scopes)
    .map(
      (scope) =>
        RECIPIENT_SCOPE_OPTIONS.find((option) => option.value === scope)?.label ??
        scope,
    )
    .join(", ");

const formatSentDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(
    date.getDate(),
  ).padStart(2, "0")}`;
};

const normalizeAlertItem = (item) => {
  const alertMode = String(item?.alertMode ?? "event").toLowerCase();
  const recipientScopes =
    alertMode === "event"
      ? normalizeRecipientScopes(item?.recipientScopes ?? item?.recipientScope)
      : [];
  return {
    ...item,
    id: item?.id ?? item?.adminNotificationId ?? null,
    status: String(item?.status ?? "draft").toLowerCase(),
    alertMode,
    notificationType: String(item?.notificationType ?? "EVENT").toUpperCase(),
    eventId: item?.eventId ?? null,
    eventName: item?.eventName ?? item?.alertTargetLabel ?? "",
    eventStatus: item?.eventStatus ?? null,
    alertTargetLabel: item?.alertTargetLabel ?? item?.eventName ?? "",
    specialTargetKey: item?.specialTargetKey ?? "",
    recipientScope: recipientScopes[0] ?? null,
    recipientScopes,
    target:
      item?.target ??
      (alertMode === "event" && recipientScopes.length > 0
        ? resolveRecipientTargetLabel(recipientScopes)
        : item?.alertTargetLabel ?? resolveSpecialTargetLabel(item?.alertMode)),
    targetCount:
      item?.targetCount == null ? null : Number(item.targetCount),
    sentDate: item?.sentDate ?? formatSentDate(item?.sentAt),
  };
};

const buildDraftPayload = (item) => ({
  title: item.title,
  content: item.content,
  alertMode: item.alertMode,
  eventId: item.eventId,
  eventName: item.eventName,
  eventStatus: item.eventStatus,
  alertTargetLabel: item.alertTargetLabel,
  specialTargetKey: item.specialTargetKey,
  recipientScope: item.recipientScope ?? null,
  recipientScopes: item.recipientScopes ?? [],
});

const resolveErrorMessage = (error, fallback) =>
  error?.response?.data?.error?.message || error?.message || fallback;

const resolveAlertMode = (item, filter = "all") => {
  const type = String(item?.notificationType ?? item?.type ?? "").toUpperCase();
  if (item?.alertMode === "important" || type === "NOTICE") return "important";
  if (item?.alertMode === "system" || type === "SYSTEM") return "system";
  if (filter === "important" || filter === "system") return filter;
  return "event";
};

const resolveSpecialTargetLabel = (mode) =>
  SPECIAL_ALERT_OPTIONS[mode]?.[0]?.label ?? "";

const resolveAlertFilterGroup = (item, eventMap) => {
  const mode = resolveAlertMode(item);
  if (mode === "important" || mode === "system") return mode;
  return resolveItemEventStatus(item, eventMap) ?? "all";
};

const normalizeEventStatus = (status) => {
  const normalized = String(status ?? "").trim().toUpperCase();
  if (normalized === "ONGOING" || normalized === "ACTIVE") return "active";
  if (normalized === "ENDED" || normalized === "CANCELLED") return "ended";
  if (normalized === "PLANNED" || normalized === "PENDING") return "pending";
  return "pending";
};

const normalizeEventRow = (event) => ({
  ...event,
  eventId: event?.eventId ?? event?.id ?? null,
  eventName: event?.eventName ?? event?.name ?? event?.eventTitle ?? "",
  status: normalizeEventStatus(event?.status),
});

const resolveLinkedEvent = (item, eventMap) => {
  if (item?.eventId == null) return null;
  return eventMap.get(String(item.eventId)) ?? null;
};

const resolveItemEventName = (item, eventMap) => {
  const alertMode = resolveAlertMode(item);
  if (alertMode === "important" || alertMode === "system") {
    return item?.alertTargetLabel || resolveSpecialTargetLabel(alertMode);
  }
  const linkedEvent = resolveLinkedEvent(item, eventMap);
  if (linkedEvent?.eventName) return linkedEvent.eventName;
  if (item?.eventName) return item.eventName;
  if (item?.eventId != null) return "연결되지 않은 행사";
  return "전체";
};

const resolveItemEventStatus = (item, eventMap) => {
  const alertMode = resolveAlertMode(item);
  if (alertMode === "important" || alertMode === "system") return null;
  const linkedEvent = resolveLinkedEvent(item, eventMap);
  if (linkedEvent?.status) return linkedEvent.status;
  if (item?.eventStatus) return normalizeEventStatus(item.eventStatus);
  return null;
};

const styles = `
@keyframes toastIn{from{opacity:0;transform:translateY(-12px)}to{opacity:1;transform:translateY(0)}}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes slideUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
@keyframes slideIn{from{transform:translateX(100%)}to{transform:translateX(0)}}
.board-row:hover .board-actions{opacity:1!important}
`;

function Toast({ msg, type = "success", onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2200);
    return () => clearTimeout(t);
  }, [onDone]);
  const bg =
    type === "success" ? "#3a4520" : type === "error" ? "#EF4444" : "#F59E0B";
  return (
    <div
      style={{
        position: "fixed",
        top: 24,
        right: 24,
        zIndex: 9999,
        background: bg,
        color: "#fff",
        padding: "12px 22px",
        borderRadius: 10,
        fontSize: 13.5,
        fontWeight: 600,
        fontFamily: ds.ff,
        boxShadow: "0 8px 30px rgba(0,0,0,0.18)",
        animation: "toastIn .25s ease",
        display: "flex",
        alignItems: "center",
        gap: 8,
      }}
    >
      {type === "success" ? "✓" : "✕"} {msg}
    </div>
  );
}
function Overlay({ children, onClose }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 5000,
        background: "rgba(0,0,0,0.32)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        animation: "fadeIn .15s ease",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: ds.card,
          borderRadius: 16,
          width: 520,
          maxHeight: "85vh",
          overflow: "auto",
          boxShadow: "0 24px 60px rgba(0,0,0,0.18)",
          animation: "slideUp .2s ease",
        }}
      >
        {children}
      </div>
    </div>
  );
}
function ConfirmModal({
  title,
  msg,
  onConfirm,
  onCancel,
  label = "삭제",
  danger = true,
}) {
  return (
    <Overlay onClose={onCancel}>
      <div style={{ padding: 28 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 14,
          }}
        >
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              background: danger ? ds.redSoft : ds.skySoft,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {danger ? (
              <AlertTriangle size={18} color="#EF4444" />
            ) : (
              <Send size={18} color={ds.brand} />
            )}
          </div>
          <h3
            style={{ fontSize: 16, fontWeight: 800, color: ds.ink, margin: 0 }}
          >
            {title}
          </h3>
        </div>
        <p
          style={{
            fontSize: 13.5,
            color: ds.ink3,
            lineHeight: 1.6,
            whiteSpace: "pre-line",
            margin: "0 0 24px",
          }}
        >
          {msg}
        </p>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button
            onClick={onCancel}
            style={{
              padding: "9px 20px",
              borderRadius: 8,
              border: `1px solid ${ds.line}`,
              background: ds.card,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: ds.ff,
              color: ds.ink3,
            }}
          >
            취소
          </button>
          <button
            onClick={onConfirm}
            style={{
              padding: "9px 20px",
              borderRadius: 8,
              border: "none",
              background: danger ? "#EF4444" : ds.brand,
              color: "#fff",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: ds.ff,
            }}
          >
            {label}
          </button>
        </div>
      </div>
    </Overlay>
  );
}

function Field({ label, children, required }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <label
        style={{
          fontSize: 12,
          fontWeight: 700,
          color: ds.ink3,
          marginBottom: 7,
          display: "block",
        }}
      >
        {label} {required && <span style={{ color: "#EF4444" }}>*</span>}
      </label>
      {children}
    </div>
  );
}
const inputStyle = {
  width: "100%",
  padding: "10px 14px",
  borderRadius: 9,
  border: `1.5px solid ${ds.line}`,
  fontSize: 13.5,
  fontFamily: ds.ff,
  color: ds.ink,
  outline: "none",
  background: ds.bg,
  boxSizing: "border-box",
  transition: "border-color .15s, box-shadow .15s",
};
const inputFocus = (e) => {
  e.target.style.borderColor = ds.brand;
  e.target.style.boxShadow = `0 0 0 3px ${ds.brand}15`;
};
const inputBlur = (e) => {
  e.target.style.borderColor = ds.line;
  e.target.style.boxShadow = "none";
};

function Checkbox({ checked, onChange, size = 18 }) {
  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        onChange?.();
      }}
      style={{
        width: size,
        height: size,
        borderRadius: 5,
        border: checked ? "none" : `1.8px solid ${ds.line}`,
        background: checked ? ds.brand : ds.bg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        transition: "all .15s",
        flexShrink: 0,
      }}
    >
      {checked && <Check size={size - 6} color="#fff" strokeWidth={3} />}
    </div>
  );
}
function StatCard({ icon: I, label, value, sub }) {
  return (
    <div
      style={{
        background: ds.card,
        borderRadius: 10,
        border: `1px solid ${ds.line}`,
        padding: 16,
        display: "flex",
        alignItems: "center",
        gap: 12,
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 9,
          background: ds.bg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <I size={16} color={ds.ink3} />
      </div>
      <div>
        <div
          style={{
            fontSize: 11,
            color: ds.ink4,
            fontWeight: 600,
            marginBottom: 2,
          }}
        >
          {label}
        </div>
        <div style={{ fontSize: 18, fontWeight: 800, color: ds.ink }}>
          {value}
        </div>
        {sub && (
          <div style={{ fontSize: 10.5, color: ds.ink4, marginTop: 1 }}>
            {sub}
          </div>
        )}
      </div>
    </div>
  );
}
function StatusDot({ status, label }) {
  const map = {
    sent: { bg: ds.greenSoft, color: "#059669", dot: "#3a4520" },
    draft: { bg: ds.amberSoft, color: "#D97706", dot: "#F59E0B" },
  };
  const s = map[status] || map.draft;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        fontSize: 11,
        fontWeight: 700,
        padding: "3px 10px",
        borderRadius: 99,
        background: s.bg,
        color: s.color,
      }}
    >
      <span
        style={{ width: 5, height: 5, borderRadius: "50%", background: s.dot }}
      />
      {label}
    </span>
  );
}
const STATUS_LABEL = { sent: "발송완료", draft: "임시저장" };

/* ── 슬라이드 패널 ── */
function SlidePanel({
  item,
  onSave,
  onClose,
  isEdit,
  events = [],
  filter = "all",
}) {
  const isMobile = typeof window !== "undefined" ? window.innerWidth < 768 : false;
  const initialCreateFilter = useMemo(() => {
    if (item) {
      const itemMode = resolveAlertMode(item, filter);
      if (itemMode === "important" || itemMode === "system") return itemMode;
      const itemStatus = normalizeEventStatus(item?.eventStatus);
      if (itemStatus !== "all" && EVENT_FILTER_SET.has(itemStatus)) {
        return itemStatus;
      }
    }
    if (filter !== "all") return filter;
    const firstEventFilter = ["active", "pending", "ended"].find((status) =>
      events.some((event) => event.status === status),
    );
    return firstEventFilter ?? "important";
  }, [events, filter, item]);
  const [createFilter, setCreateFilter] = useState(initialCreateFilter);

  useEffect(() => {
    setCreateFilter(initialCreateFilter);
  }, [initialCreateFilter]);

  const effectiveFilter = !isEdit && filter === "all" ? createFilter : filter;
  const panelMode =
    effectiveFilter === "important" || effectiveFilter === "system"
      ? effectiveFilter
      : resolveAlertMode(item, effectiveFilter);
  const eventScope =
    panelMode === "event" && EVENT_FILTER_SET.has(effectiveFilter)
      ? effectiveFilter
      : "all";
  const filteredEvents =
    panelMode === "event"
      ? events.filter(
          (event) => eventScope === "all" || event.status === eventScope,
        )
      : [];
  const specialOptions = SPECIAL_ALERT_OPTIONS[panelMode] ?? [];

  const [form, setForm] = useState(() => {
    if (item) {
      const recipientScopes = normalizeRecipientScopes(
        item.recipientScopes ?? item.recipientScope,
      );
      return {
        eventId: item.eventId ?? "",
        title: item.title ?? "",
        content: item.content ?? "",
        recipientScopes,
        target:
          resolveRecipientTargetLabel(recipientScopes) ??
          item.target ??
          resolveSpecialTargetLabel(panelMode) ??
          RECIPIENT_SCOPE_OPTIONS[0].label,
        targetCount:
          panelMode === "event" ? item.targetCount ?? 0 : item.targetCount ?? null,
        status: item.status ?? "draft",
        specialTargetKey:
          item.specialTargetKey ?? specialOptions[0]?.value ?? "",
        notificationType:
          item.notificationType ??
          (panelMode === "system"
            ? "SYSTEM"
            : panelMode === "important"
              ? "NOTICE"
              : "EVENT"),
      };
    }
    return {
      eventId: filteredEvents[0]?.eventId ?? "",
      title: "",
      content: "",
      recipientScopes: ["INTEREST_SUBSCRIBERS"],
      target:
        panelMode === "event"
          ? resolveRecipientTargetLabel(["INTEREST_SUBSCRIBERS"])
          : resolveSpecialTargetLabel(panelMode),
      targetCount: panelMode === "event" ? 0 : null,
      status: "draft",
      specialTargetKey: specialOptions[0]?.value ?? "",
      notificationType:
        panelMode === "system"
          ? "SYSTEM"
          : panelMode === "important"
            ? "NOTICE"
            : "EVENT",
    };
  });
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));
  const [err, setErr] = useState("");

  useEffect(() => {
    if (panelMode !== "event") return;
    setForm((prev) => {
      const nextEventId = filteredEvents.some(
        (event) => String(event.eventId) === String(prev.eventId),
      )
        ? prev.eventId
        : filteredEvents[0]?.eventId ?? "";
      const nextRecipientScopes = normalizeRecipientScopes(prev.recipientScopes);
      const nextTarget = resolveRecipientTargetLabel(nextRecipientScopes);
      if (
        String(nextEventId) === String(prev.eventId) &&
        nextRecipientScopes.join("|") ===
          toRecipientScopeArray(prev.recipientScopes).join("|") &&
        nextTarget === prev.target &&
        prev.notificationType === "EVENT"
      ) {
        return prev;
      }
      return {
        ...prev,
        eventId: nextEventId,
        recipientScopes: nextRecipientScopes,
        target: nextTarget,
        notificationType: "EVENT",
      };
    });
  }, [filteredEvents, panelMode]);

  useEffect(() => {
    if (panelMode === "event") return;
    const defaultSpecialTarget = specialOptions[0]?.value ?? "";
    const defaultSpecialLabel = resolveSpecialTargetLabel(panelMode);
    setForm((prev) => {
      const nextSpecialTarget = specialOptions.some(
        (option) => option.value === prev.specialTargetKey,
      )
        ? prev.specialTargetKey
        : defaultSpecialTarget;
      const nextNotificationType = panelMode === "system" ? "SYSTEM" : "NOTICE";
      if (
        nextSpecialTarget === prev.specialTargetKey &&
        nextNotificationType === prev.notificationType &&
        defaultSpecialLabel === prev.target
      ) {
        return prev;
      }
      return {
        ...prev,
        specialTargetKey: nextSpecialTarget,
        notificationType: nextNotificationType,
        target: defaultSpecialLabel,
      };
    });
  }, [panelMode, specialOptions]);

  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 20);
    return () => clearTimeout(t);
  }, []);

  const handleSave = async () => {
    if (!form.title || !form.content) {
      setErr("제목과 내용은 필수입니다.");
      return;
    }
    if (panelMode === "event" && !form.eventId) {
      setErr("대상 행사를 선택해 주세요.");
      return;
    }
    const recipientScopes =
      panelMode === "event" ? toRecipientScopeArray(form.recipientScopes) : [];
    if (panelMode === "event" && recipientScopes.length === 0) {
      setErr("발송 대상을 1개 이상 선택해 주세요.");
      return;
    }
    const normalizedRecipientScopes = normalizeRecipientScopes(recipientScopes);
    const selectedEvent =
      events.find((e) => String(e.eventId) === String(form.eventId)) || null;
    const specialTargetLabel = resolveSpecialTargetLabel(panelMode);
    try {
      await onSave({
        ...form,
        alertMode: panelMode,
        notificationType:
          panelMode === "system"
            ? "SYSTEM"
            : panelMode === "important"
              ? "NOTICE"
              : "EVENT",
        eventId:
          panelMode === "event" && form.eventId ? Number(form.eventId) : null,
        eventName:
          panelMode === "event"
            ? selectedEvent?.eventName ?? ""
            : specialTargetLabel,
        eventStatus: panelMode === "event" ? selectedEvent?.status ?? null : null,
        alertTargetLabel:
          panelMode === "event" ? selectedEvent?.eventName ?? "" : specialTargetLabel,
        specialTargetKey: panelMode === "event" ? "" : form.specialTargetKey,
        recipientScope:
          panelMode === "event" ? normalizedRecipientScopes[0] : null,
        recipientScopes:
          panelMode === "event" ? normalizedRecipientScopes : [],
        target:
          panelMode === "event"
            ? resolveRecipientTargetLabel(normalizedRecipientScopes)
            : specialTargetLabel,
        targetCount: panelMode === "event" ? form.targetCount ?? 0 : null,
      });
    } catch (error) {
      setErr(resolveErrorMessage(error, "저장에 실패했습니다."));
    }
  };

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 4999,
          background: visible ? "rgba(10,10,18,0.55)" : "rgba(10,10,18,0)",
          backdropFilter: visible ? "blur(4px)" : "none",
          transition: "all .3s ease",
        }}
      />
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 5000,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 20,
          pointerEvents: "none",
        }}
      >
      <div
        style={{
          pointerEvents: "auto",
          width: isMobile ? "100%" : 520,
          maxWidth: "96vw",
          maxHeight: "min(700px, 90vh)",
          background: ds.card,
          borderRadius: isMobile ? 16 : 20,
          boxShadow: "0 24px 80px rgba(0,0,0,0.25), 0 8px 24px rgba(0,0,0,0.12)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          transform: visible ? "translateY(0) scale(1)" : "translateY(20px) scale(0.98)",
          opacity: visible ? 1 : 0,
          transition: "all .35s cubic-bezier(.16,1,.3,1)",
        }}
      >
        <div
          style={{
            padding: "20px 24px",
            borderBottom: `1px solid ${ds.line}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0,
          }}
        >
          <div>
            <h3
              style={{
                fontSize: 16,
                fontWeight: 800,
                color: ds.ink,
                margin: 0,
              }}
            >
              {isEdit
                ? "알림 수정"
                : panelMode === "important"
                  ? "새 중요 알림 작성"
                  : panelMode === "system"
                    ? "새 시스템 알림 작성"
                    : "새 알림 작성"}
            </h3>
            <p style={{ fontSize: 11.5, color: ds.ink4, margin: "3px 0 0" }}>
              {isEdit
                ? "알림을 수정합니다"
                : panelMode === "event"
                  ? "행사 대상 알림을 작성합니다"
                  : "전역 알림을 작성합니다"}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 30,
              height: 30,
              borderRadius: 8,
              border: `1px solid ${ds.line}`,
              background: ds.card,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <X size={14} color={ds.ink4} />
          </button>
        </div>
        <div style={{ flex: 1, overflow: "auto", padding: 24 }}>
          {err && (
            <div
              style={{
                background: ds.redSoft,
                border: `1px solid ${ds.red}33`,
                borderRadius: 9,
                padding: "10px 14px",
                fontSize: 12.5,
                color: ds.red,
                marginBottom: 18,
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <AlertTriangle size={14} /> {err}
            </div>
          )}
          {!isEdit && filter === "all" && (
            <Field label="대상 분류" required>
              <div style={{ position: "relative" }}>
                <select
                  value={createFilter}
                  onChange={(e) => setCreateFilter(e.target.value)}
                  style={{
                    ...inputStyle,
                    appearance: "none",
                    paddingRight: 32,
                    cursor: "pointer",
                  }}
                >
                  {CREATE_FILTER_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={14}
                  color={ds.ink4}
                  style={{
                    position: "absolute",
                    right: 12,
                    top: "50%",
                    transform: "translateY(-50%)",
                    pointerEvents: "none",
                  }}
                />
              </div>
            </Field>
          )}
          <Field label={panelMode === "event" ? "대상 행사" : "알림 구분"} required>
            <div style={{ position: "relative" }}>
              <select
                value={panelMode === "event" ? form.eventId : form.specialTargetKey}
                onChange={(e) =>
                  panelMode === "event"
                    ? set("eventId", e.target.value)
                    : set("specialTargetKey", e.target.value)
                }
                style={{
                  ...inputStyle,
                  appearance: "none",
                  paddingRight: 32,
                  cursor: "pointer",
                }}
              >
                {panelMode === "event" ? (
                  <>
                    <option value="">
                      {filteredEvents.length > 0
                        ? "행사 선택"
                        : "해당 분류의 행사가 없습니다"}
                    </option>
                    {filteredEvents.map((ev) => (
                      <option key={ev.eventId} value={ev.eventId}>
                        {ev.eventName ?? ev.eventTitle ?? `행사 ${ev.eventId}`}
                      </option>
                    ))}
                  </>
                ) : (
                  specialOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))
                )}
              </select>
              <ChevronDown
                size={14}
                color={ds.ink4}
                style={{
                  position: "absolute",
                  right: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  pointerEvents: "none",
                }}
              />
            </div>
          </Field>
          <Field label="제목" required>
            <input
              style={inputStyle}
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              onFocus={inputFocus}
              onBlur={inputBlur}
              placeholder="알림 제목"
            />
          </Field>
          {panelMode === "event" && (
            <Field label="발송 대상">
              <div style={{ display: "grid", gap: 8 }}>
                {RECIPIENT_SCOPE_OPTIONS.map((option) => {
                  const checked = toRecipientScopeArray(
                    form.recipientScopes,
                  ).includes(option.value);
                  return (
                    <label
                      key={option.value}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        border: `1px solid ${checked ? ds.brand : ds.line}`,
                        background: checked ? `${ds.brand}08` : ds.card,
                        borderRadius: 10,
                        padding: "11px 12px",
                        cursor: "pointer",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => {
                          const current = toRecipientScopeArray(
                            form.recipientScopes,
                          );
                          const next = checked
                            ? current.filter((scope) => scope !== option.value)
                            : [...current, option.value];
                          set("recipientScopes", next);
                          set("target", resolveRecipientTargetLabel(next));
                        }}
                        style={{
                          width: 15,
                          height: 15,
                          accentColor: ds.brand,
                          cursor: "pointer",
                        }}
                      />
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: checked ? ds.brand : ds.ink,
                        }}
                      >
                        {option.label}
                      </div>
                    </label>
                  );
                })}
                <div
                  style={{
                    fontSize: 11.5,
                    color: ds.ink4,
                    lineHeight: 1.5,
                  }}
                >
                  중복 선택 가능합니다.
                </div>
              </div>
            </Field>
          )}
          <Field label="내용" required>
            <textarea
              rows={5}
              style={{ ...inputStyle, resize: "vertical" }}
              value={form.content}
              onChange={(e) => set("content", e.target.value)}
              onFocus={inputFocus}
              onBlur={inputBlur}
              placeholder="알림 내용을 작성하세요"
            />
          </Field>
        </div>
        <div
          style={{
            padding: "14px 24px",
            borderTop: `1px solid ${ds.line}`,
            display: "flex",
            gap: 10,
            flexShrink: 0,
          }}
        >
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: "11px 0",
              borderRadius: 9,
              border: `1px solid ${ds.line}`,
              background: ds.card,
              fontSize: 13.5,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: ds.ff,
              color: ds.ink3,
            }}
          >
            취소
          </button>
          <button
            onClick={handleSave}
            style={{
              flex: 1,
              padding: "11px 0",
              borderRadius: 9,
              border: "none",
              background: ds.brand,
              color: "#fff",
              fontSize: 13.5,
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: ds.ff,
            }}
          >
            {isEdit ? "수정 완료" : "저장하기"}
          </button>
        </div>
      </div>
      </div>
    </>
  );
}

/* ═══════════════════════════════════════════
   메인 컴포넌트
   ═══════════════════════════════════════════ */
export default function AlertManage() {
  const [viewportWidth, setViewportWidth] = useState(() =>
    typeof window === "undefined" ? 1440 : window.innerWidth,
  );
  const [items, setItems] = useState([]);
  const [events, setEvents] = useState([]);
  const [modal, setModal] = useState(null);
  const [panel, setPanel] = useState(null);
  const [toast, setToast] = useState(null);
  const [search, setSearch] = useState("");
  const [eventStatusFilter, setEventStatusFilter] = useState("all");
  const [selected, setSelected] = useState([]);
  const show = (msg, type = "success") => setToast({ msg, type });
  const loadItems = useCallback(async () => {
    const list = await adminNotificationApi.list();
    setItems(Array.isArray(list) ? list.map(normalizeAlertItem) : []);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const loadAlerts = async () => {
      try {
        const list = await adminNotificationApi.list();
        if (!cancelled) {
          setItems(Array.isArray(list) ? list.map(normalizeAlertItem) : []);
        }
      } catch {
        if (!cancelled) setItems([]);
      }
    };
    const loadEvents = async () => {
      try {
        const res = await axiosInstance.get("/api/admin/dashboard/events");
        if (cancelled) return;
        const data = res?.data?.data ?? res?.data;
        const list = data?.content ?? data ?? [];
        const normalized = Array.isArray(list)
          ? list.map(normalizeEventRow)
          : [];
        setEvents(sortAdminEventsByOperationalPriority(normalized));
      } catch {
        try {
          const fallbackRes = await axiosInstance.get("/api/events", {
            params: { page: 0, size: 200, sort: "startAt,asc" },
          });
          if (cancelled) return;
          const data = fallbackRes?.data?.data ?? fallbackRes?.data;
          const list = data?.content ?? data ?? [];
          const normalized = Array.isArray(list)
            ? list.map(normalizeEventRow)
            : [];
          setEvents(sortAdminEventsByOperationalPriority(normalized));
        } catch {
          if (!cancelled) setEvents([]);
        }
      }
    };
    loadAlerts();
    loadEvents();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const syncViewport = () => setViewportWidth(window.innerWidth);
    syncViewport();
    window.addEventListener("resize", syncViewport);
    return () => window.removeEventListener("resize", syncViewport);
  }, []);

  const eventMap = useMemo(
    () =>
      new Map(
        events
          .filter((event) => event?.eventId != null)
          .map((event) => [String(event.eventId), event]),
      ),
    [events],
  );

  const visible = items;
  const isMobile = viewportWidth < 768;
  const sent = visible.filter((e) => e.status === "sent").length;
  const draft = visible.filter((e) => e.status === "draft").length;
  const totalTarget = visible
    .filter((e) => e.status === "sent")
    .reduce((a, b) => a + Number(b.targetCount || 0), 0);
  const eventFilterCounts = useMemo(
    () =>
      visible.reduce(
        (counts, item) => {
          const filterGroup = resolveAlertFilterGroup(item, eventMap);
          counts.all += 1;
          if (filterGroup && counts[filterGroup] != null) counts[filterGroup] += 1;
          return counts;
        },
        { all: 0, active: 0, pending: 0, ended: 0, important: 0, system: 0 },
      ),
    [eventMap, visible],
  );
  const rows = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return visible
      .map((item) => {
        const eventName = resolveItemEventName(item, eventMap);
        const eventStatus = resolveItemEventStatus(item, eventMap);
        const filterGroup = resolveAlertFilterGroup(item, eventMap);
        return { ...item, eventName, eventStatus, filterGroup };
      })
      .filter((item) => {
        const matchesSearch =
          keyword === "" ||
          String(item.title ?? "").toLowerCase().includes(keyword) ||
          String(item.eventName ?? "").toLowerCase().includes(keyword);
        const matchesStatus =
          eventStatusFilter === "all" || item.filterGroup === eventStatusFilter;
        return matchesSearch && matchesStatus;
      });
  }, [eventMap, eventStatusFilter, search, visible]);

  useEffect(() => {
    setSelected((prev) => prev.filter((id) => rows.some((row) => row.id === id)));
  }, [rows]);

  const toggleAll = () =>
    setSelected(selected.length === rows.length ? [] : rows.map((r) => r.id));
  const toggle = (id) =>
    setSelected((p) =>
      p.includes(id) ? p.filter((x) => x !== id) : [...p, id],
    );

  const handleCreate = async (f) => {
    await adminNotificationApi.createDraft(buildDraftPayload(f));
    await loadItems();
    setPanel(null);
    show("알림이 저장되었습니다.");
  };
  const handleUpdate = async (f) => {
    await adminNotificationApi.updateDraft(f.id, buildDraftPayload(f));
    await loadItems();
    setPanel(null);
    show("알림이 수정되었습니다.");
  };
  const handleDelete = async () => {
    const id = modal?.item?.id;
    setModal(null);
    if (!id) return;
    try {
      await adminNotificationApi.delete(id);
      await loadItems();
      setSelected((prev) => prev.filter((itemId) => itemId !== id));
      show("알림이 삭제되었습니다.");
    } catch (error) {
      show(resolveErrorMessage(error, "삭제에 실패했습니다."), "error");
    }
  };
  const handleBatchDelete = async () => {
    const ids = [...selected];
    setModal(null);
    try {
      await Promise.all(ids.map((id) => adminNotificationApi.delete(id)));
      await loadItems();
      setSelected([]);
      show("선택한 알림을 삭제했습니다.");
    } catch (error) {
      show(resolveErrorMessage(error, "삭제에 실패했습니다."), "error");
    }
  };
  const handleSend = async (item) => {
    try {
      await adminNotificationApi.send(item.id);
      await loadItems();
      setModal(null);
      show("알림을 발송했습니다.");
    } catch (error) {
      show(resolveErrorMessage(error, "발송에 실패했습니다."), "error");
    }
  };

  return (
    <div>
      <style>{styles}</style>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "repeat(2, minmax(0, 1fr))" : "repeat(3, 1fr)",
          gap: 12,
          marginBottom: 16,
        }}
      >
        <StatCard icon={Send} label="발송 완료" value={`${sent}건`} />
        <StatCard icon={Mail} label="임시 저장" value={`${draft}건`} />
        <StatCard
          icon={Users}
          label="총 발송 대상"
          value={`${totalTarget.toLocaleString()}명`}
        />
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          flexWrap: "wrap",
          marginBottom: 16,
        }}
      >
        {EVENT_FILTER_OPTIONS.map((option) => {
          const active = eventStatusFilter === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => setEventStatusFilter(option.value)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                height: 34,
                padding: "0 14px",
                borderRadius: 999,
                border: active ? `1px solid ${ds.brand}` : `1px solid ${ds.line}`,
                background: active ? ds.brand : ds.card,
                color: active ? "#fff" : ds.ink3,
                fontSize: 12.5,
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: ds.ff,
                transition: "all .15s ease",
              }}
            >
              <span>{option.label}</span>
              <span
                style={{
                  minWidth: 18,
                  height: 18,
                  padding: "0 6px",
                  borderRadius: 999,
                  background: active ? "rgba(255,255,255,0.18)" : ds.bg,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 10.5,
                  fontWeight: 800,
                  color: active ? "#fff" : ds.ink4,
                }}
              >
                {eventFilterCounts[option.value] ?? 0}
              </span>
            </button>
          );
        })}
      </div>

      <div
        style={{
          background: ds.card,
          borderRadius: 12,
          border: `1px solid ${ds.line}`,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "12px 20px",
            display: "flex",
            alignItems: isMobile ? "stretch" : "center",
            justifyContent: "space-between",
            borderBottom: `1px solid ${ds.line}`,
            flexDirection: isMobile ? "column" : "row",
            gap: 12,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", width: isMobile ? "100%" : "auto" }}>
            <Checkbox
              checked={selected.length === rows.length && rows.length > 0}
              onChange={toggleAll}
            />
            <span style={{ fontSize: 14, fontWeight: 800, color: ds.ink }}>
              알림 발송 내역
            </span>
            <span style={{ fontSize: 12, fontWeight: 600, color: ds.ink4 }}>
              총 {rows.length}건
            </span>
            {selected.length > 0 && (
              <button
                onClick={() => setModal({ type: "batchDelete" })}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  padding: "5px 10px",
                  borderRadius: 6,
                  border: `1px solid ${ds.red}33`,
                  background: ds.redSoft,
                  fontSize: 11.5,
                  fontWeight: 600,
                  color: ds.red,
                  cursor: "pointer",
                  fontFamily: ds.ff,
                }}
              >
                <Trash2 size={11} /> {selected.length}건 삭제
              </button>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", width: isMobile ? "100%" : "auto" }}>
            <div style={{ position: "relative" }}>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="검색"
                style={{
                  width: isMobile ? "100%" : 160,
                  padding: "6px 12px 6px 30px",
                  borderRadius: 7,
                  border: `1px solid ${ds.line}`,
                  fontSize: 12.5,
                  fontFamily: ds.ff,
                  color: ds.ink,
                  outline: "none",
                  background: ds.bg,
                }}
                onFocus={(e) => (e.target.style.borderColor = ds.brand)}
                onBlur={(e) => (e.target.style.borderColor = ds.line)}
              />
              <Search
                size={13}
                color={ds.ink4}
                style={{
                  position: "absolute",
                  left: 10,
                  top: "50%",
                  transform: "translateY(-50%)",
                }}
              />
            </div>
            <button
              onClick={() => setPanel({ type: "create", filter: eventStatusFilter })}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                padding: "6px 14px",
                borderRadius: 7,
                border: "none",
                background: ds.brand,
                color: "#fff",
                fontSize: 12.5,
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: ds.ff,
                minHeight: 40,
                justifyContent: "center",
                flex: isMobile ? "1 1 100%" : "0 0 auto",
              }}
            >
              <Plus size={13} strokeWidth={2.5} /> 알림 작성
            </button>
          </div>
        </div>

        {/* 행 목록 */}
        <div>
          {rows.map((r) => (
            <div
              key={r.id}
              className="board-row"
              onClick={() =>
                setPanel({
                  type: "edit",
                  item: r,
                  filter: r.filterGroup || eventStatusFilter,
                })
              }
              style={isMobile ? {
                display: "grid",
                gap: 10,
                padding: "14px 16px",
                borderBottom: `1px solid ${ds.lineSoft}`,
                cursor: "pointer",
                transition: "background .1s",
                position: "relative",
                background: selected.includes(r.id)
                  ? `${ds.brand}06`
                  : "transparent",
              } : {
                display: "flex",
                alignItems: "center",
                padding: "14px 20px",
                borderBottom: `1px solid ${ds.lineSoft}`,
                cursor: "pointer",
                transition: "background .1s",
                position: "relative",
                background: selected.includes(r.id)
                  ? `${ds.brand}06`
                  : "transparent",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = selected.includes(r.id)
                  ? `${ds.brand}0A`
                  : ds.bg)
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = selected.includes(r.id)
                  ? `${ds.brand}06`
                  : "transparent")
              }
            >
              <div style={{ marginRight: isMobile ? 0 : 12, flexShrink: 0 }}>
                <Checkbox
                  checked={selected.includes(r.id)}
                  onChange={() => toggle(r.id)}
                />
              </div>
              {isMobile ? (
                <>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                    <StatusDot
                      status={r.status}
                      label={r.status === "sent" ? "발송" : "임시"}
                    />
                    <span
                      style={{
                        fontSize: 12,
                        color: ds.ink4,
                        textAlign: "right",
                      }}
                    >
                      {r.sentDate || "-"}
                    </span>
                  </div>
                  <span
                    style={{
                      fontSize: 13.5,
                      color: ds.ink,
                      fontWeight: 700,
                      minWidth: 0,
                      wordBreak: "keep-all",
                    }}
                  >
                    {r.title}
                  </span>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                    <span
                      style={{
                        fontSize: 11.5,
                        color: ds.ink4,
                        maxWidth: "100%",
                        wordBreak: "keep-all",
                      }}
                      title={r.eventName}
                    >
                      {r.eventName || "전체"}
                    </span>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        padding: "2px 10px",
                        borderRadius: 5,
                        background: ds.brandSoft,
                        color: ds.brand,
                        minWidth: 48,
                        textAlign: "center",
                      }}
                    >
                      {r.targetCount == null ? "전체" : `${r.targetCount}명`}
                    </span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: r.status === "draft" ? "repeat(3, minmax(0, 1fr))" : "repeat(2, minmax(0, 1fr))", gap: 8 }}>
                    {r.status === "draft" && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setModal({ type: "send", item: r });
                        }}
                        style={{
                          padding: "8px 10px",
                          borderRadius: 8,
                          border: `1px solid ${ds.green}25`,
                          background: ds.greenSoft,
                          fontSize: 11.5,
                          fontWeight: 700,
                          color: ds.green,
                          cursor: "pointer",
                          fontFamily: ds.ff,
                          lineHeight: 1.2,
                        }}
                      >
                        발송
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setPanel({
                          type: "edit",
                          item: r,
                          filter: r.filterGroup || eventStatusFilter,
                        });
                      }}
                      style={{
                        padding: "8px 10px",
                        borderRadius: 8,
                        border: `1px solid ${ds.brand}25`,
                        background: `${ds.brand}08`,
                        fontSize: 11.5,
                        fontWeight: 700,
                        color: ds.brand,
                        cursor: "pointer",
                        fontFamily: ds.ff,
                        lineHeight: 1.2,
                      }}
                    >
                      수정
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setModal({ type: "delete", item: r });
                      }}
                      style={{
                        padding: "8px 10px",
                        borderRadius: 8,
                        border: `1px solid ${ds.red}22`,
                        background: ds.redSoft,
                        fontSize: 11.5,
                        fontWeight: 700,
                        color: ds.red,
                        cursor: "pointer",
                        fontFamily: ds.ff,
                        lineHeight: 1.2,
                      }}
                    >
                      삭제
                    </button>
                  </div>
                </>
              ) : (
                <>
              <div style={{ width: 56, flexShrink: 0, marginRight: 10 }}>
                <StatusDot
                  status={r.status}
                  label={r.status === "sent" ? "발송" : "임시"}
                />
              </div>
              <span
                style={{
                  flex: 1,
                  fontSize: 13.5,
                  color: ds.ink,
                  fontWeight: 600,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  minWidth: 0,
                }}
              >
                {r.title}
              </span>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  flexShrink: 0,
                  width: 500,
                }}
              >
                <span
                  style={{
                    width: 160,
                    minWidth: 0,
                    fontSize: 11.5,
                    color: ds.ink4,
                    textAlign: "left",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                  title={r.eventName}
                >
                  {r.eventName || "전체"}
                </span>
                <span
                  style={{
                    width: 60,
                    display: "flex",
                    justifyContent: "center",
                  }}
                >
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      padding: "2px 10px",
                      borderRadius: 5,
                      background: ds.brandSoft,
                      color: ds.brand,
                      minWidth: 48,
                      textAlign: "center",
                    }}
                  >
                    {r.targetCount == null ? "전체" : `${r.targetCount}명`}
                  </span>
                </span>
                <span
                  style={{
                    width: 80,
                    fontSize: 12,
                    color: ds.ink4,
                    textAlign: "right",
                  }}
                >
                  {r.sentDate || "-"}
                </span>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 3,
                    minWidth: 164,
                    flexShrink: 0,
                  }}
                >
                  {r.status === "draft" && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setModal({ type: "send", item: r });
                      }}
                      style={{
                        padding: "3px 8px",
                        borderRadius: 5,
                        border: `1px solid ${ds.green}25`,
                        background: ds.greenSoft,
                        fontSize: 11,
                        fontWeight: 600,
                        color: ds.green,
                        cursor: "pointer",
                        fontFamily: ds.ff,
                        lineHeight: 1.2,
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      <Send size={10} /> 발송
                    </button>
                  )}
                  {r.status !== "draft" && (
                    <span
                      aria-hidden="true"
                      style={{
                        width: 52,
                        height: 24,
                        flexShrink: 0,
                      }}
                    />
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setPanel({
                        type: "edit",
                        item: r,
                        filter: r.filterGroup || eventStatusFilter,
                      });
                    }}
                    style={{
                      padding: "3px 8px",
                      borderRadius: 5,
                      border: `1px solid ${ds.brand}25`,
                      background: `${ds.brand}08`,
                      fontSize: 11,
                      fontWeight: 600,
                      color: ds.brand,
                      cursor: "pointer",
                      fontFamily: ds.ff,
                      lineHeight: 1.2,
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = `${ds.brand}18`)
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = `${ds.brand}08`)
                    }
                  >
                    수정
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setModal({ type: "delete", item: r });
                    }}
                    style={{
                      padding: "3px 8px",
                      borderRadius: 5,
                      border: "none",
                      background: "transparent",
                      fontSize: 11,
                      fontWeight: 600,
                      color: ds.red,
                      cursor: "pointer",
                      fontFamily: ds.ff,
                      lineHeight: 1.2,
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = ds.redSoft)
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = "transparent")
                    }
                  >
                    삭제
                  </button>
                </div>
              </div>
                </>
              )}
            </div>
          ))}
        </div>
        {rows.length === 0 && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 20px", gap: 12 }}>
            <Bell size={36} color={ds.ink4} style={{ display: "block" }} />
            <div style={{ fontSize: 14, fontWeight: 600, color: ds.ink3 }}>
              알림 내역이 없습니다
            </div>
          </div>
        )}
      </div>

      {panel?.type === "create" && (
        <SlidePanel
          events={events}
          filter={panel.filter || eventStatusFilter}
          onSave={handleCreate}
          onClose={() => setPanel(null)}
        />
      )}
      {panel?.type === "edit" && (
        <SlidePanel
          item={panel.item}
          isEdit
          events={events}
          filter={panel.filter || eventStatusFilter}
          onSave={handleUpdate}
          onClose={() => setPanel(null)}
        />
      )}
      {modal?.type === "delete" && (
        <ConfirmModal
          title="알림 삭제"
          msg={`"${modal.item.title}" 알림을 삭제하시겠습니까?\n삭제된 데이터는 복구할 수 없습니다.`}
          onConfirm={handleDelete}
          onCancel={() => setModal(null)}
        />
      )}
      {modal?.type === "batchDelete" && (
        <ConfirmModal
          title="선택 알림 삭제"
          msg={`${selected.length}개의 알림을 삭제하시겠습니까?\n삭제된 데이터는 복구할 수 없습니다.`}
          onConfirm={handleBatchDelete}
          onCancel={() => setModal(null)}
        />
      )}
      {modal?.type === "send" && (
        <ConfirmModal
          title="알림 발송"
          msg={
            resolveAlertMode(modal.item) === "event"
              ? `"${modal.item.title}" 알림을 ${modal.item.target} 대상(${modal.item.targetCount}명)에게 발송하시겠습니까?`
              : `"${modal.item.title}" 알림을 ${resolveItemEventName(modal.item, eventMap)} 대상으로 발송하시겠습니까?`
          }
          label="발송"
          danger={false}
          onConfirm={() => handleSend(modal.item)}
          onCancel={() => setModal(null)}
        />
      )}
      {toast && (
        <Toast
          msg={toast.msg}
          type={toast.type}
          onDone={() => setToast(null)}
        />
      )}
    </div>
  );
}
