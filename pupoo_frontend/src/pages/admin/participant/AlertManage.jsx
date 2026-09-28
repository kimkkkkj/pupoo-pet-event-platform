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
import { Toast, Overlay, ConfirmModal, Checkbox, Field, StatCard, EmptyState, FormSheet, Button, SelectMenu } from "../shared/adminUi";

/** 발송 대상(recipientScope) 옵션 — 백엔드 Enum 매핑 */
const RECIPIENT_SCOPE_OPTIONS = [
  { value: "ALL_MEMBERS", label: "전체 회원" },
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

function StatusDot({ status, label }) {
  const map = {
    sent: { bg: ds.greenSoft, color: ds.green, dot: ds.green },
    draft: { bg: ds.amberSoft, color: ds.amber, dot: ds.amber },
  };
  const s = map[status] || map.draft;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        fontSize: 12,
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

  const labelStyle = { display: "block", marginBottom: 8, fontSize: 13, fontWeight: 600, color: ds.ink2 };
  const selectedScopes = toRecipientScopeArray(form.recipientScopes);
  const toggleScope = (value) => {
    let next = selectedScopes.includes(value)
      ? selectedScopes.filter((scope) => scope !== value)
      : [...selectedScopes, value];
    // 전체 회원은 나머지 대상을 모두 포함하므로 함께 고르지 않는다.
    if (!selectedScopes.includes(value)) {
      next = value === "ALL_MEMBERS" ? ["ALL_MEMBERS"] : next.filter((scope) => scope !== "ALL_MEMBERS");
    }
    set("recipientScopes", next);
    set("target", resolveRecipientTargetLabel(next));
  };

  return (
    <FormSheet
      title={
        isEdit
          ? "알림 수정"
          : panelMode === "important"
            ? "새 중요 알림"
            : panelMode === "system"
              ? "새 시스템 알림"
              : "새 알림 작성"
      }
      description={isEdit ? "알림을 수정합니다" : "회원에게 보낼 알림을 작성합니다"}
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>취소</Button>
          <Button variant="primary" icon={Send} onClick={handleSave}>
            {isEdit ? "수정 완료" : "저장하기"}
          </Button>
        </>
      }
    >
      {err && (
        <div
          role="alert"
          style={{
            background: ds.redSoft,
            borderRadius: 8,
            padding: "10px 14px",
            fontSize: 13,
            color: ds.red,
            marginBottom: 18,
            fontWeight: 500,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <AlertTriangle size={14} /> {err}
        </div>
      )}

      {/* 알림 종류 */}
      {!isEdit && filter === "all" && (
        <div className="adm-full" style={{ marginBottom: 22 }}>
          <span style={labelStyle}>
            알림 종류<span style={{ color: ds.red, marginLeft: 3 }}>*</span>
          </span>
          <SelectMenu
            ariaLabel="알림 종류"
            options={ALERT_KIND_CHOICES.map((c) => ({ value: c.id, label: c.label, desc: c.desc }))}
            value={createFilter}
            onChange={setCreateFilter}
          />
        </div>
      )}

      <Field label={panelMode === "event" ? "대상 행사" : "알림 구분"} required full>
        <SelectMenu
          ariaLabel={panelMode === "event" ? "대상 행사" : "알림 구분"}
          placeholder={panelMode === "event" ? "행사를 선택하세요" : "알림 구분을 선택하세요"}
          emptyText="해당 분류의 행사가 없어요"
          options={
            panelMode === "event"
              ? filteredEvents.map((ev) => ({
                  value: ev.eventId,
                  label: ev.eventName ?? ev.eventTitle ?? `행사 ${ev.eventId}`,
                  desc: eventOptionDesc(ev),
                }))
              : specialOptions.map((o) => ({ value: o.value, label: o.label }))
          }
          value={panelMode === "event" ? form.eventId : form.specialTargetKey}
          onChange={(v) => (panelMode === "event" ? set("eventId", v) : set("specialTargetKey", v))}
        />
      </Field>

      {/* 발송 대상 (여러 개 선택) */}
      {panelMode === "event" && (
        <div className="adm-full" style={{ marginBottom: 22 }}>
          <span style={{ ...labelStyle, display: "flex", justifyContent: "space-between" }}>
            <span>
              발송 대상<span style={{ color: ds.red, marginLeft: 3 }}>*</span>
            </span>
            <span style={{ fontWeight: 400, color: ds.ink4 }}>여러 개를 함께 고를 수 있어요 · 전체 회원은 단독 선택</span>
          </span>
          <div role="group" aria-label="발송 대상" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
            {RECIPIENT_SCOPE_OPTIONS.map((option) => {
              const on = selectedScopes.includes(option.value);
              return (
                <button
                  key={option.value}
                  type="button"
                  role="checkbox"
                  aria-checked={on}
                  onClick={() => toggleScope(option.value)}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 12,
                    padding: "14px 16px",
                    borderRadius: 10,
                    border: `1.5px solid ${on ? ds.brand : ds.line}`,
                    background: ds.bg,
                    cursor: "pointer",
                    textAlign: "left",
                    fontFamily: ds.ff,
                    transition: "border-color .15s",
                  }}
                >
                  <span
                    aria-hidden="true"
                    style={{
                      width: 18,
                      height: 18,
                      marginTop: 1,
                      borderRadius: 5,
                      border: `2px solid ${on ? ds.brand : ds.ink4}`,
                      background: on ? ds.brand : "transparent",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    {on ? <Check size={12} color="#fff" strokeWidth={3} /> : null}
                  </span>
                  <span style={{ minWidth: 0 }}>
                    <span style={{ display: "block", fontSize: 14.5, fontWeight: 600, color: ds.ink }}>{option.label}</span>
                    <span style={{ display: "block", marginTop: 3, fontSize: 12.5, color: ds.ink4, lineHeight: 1.5 }}>
                      {RECIPIENT_DESC[option.value]}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <Field label="제목" required full>
        <input
          style={inputStyle}
          value={form.title}
          maxLength={100}
          onChange={(e) => set("title", e.target.value)}
          placeholder="예: 내일 입장 시간이 30분 앞당겨져요"
        />
      </Field>

      <Field label="내용" required full>
        <textarea
          rows={8}
          style={{ ...inputStyle, resize: "vertical", minHeight: 180 }}
          value={form.content}
          onChange={(e) => set("content", e.target.value)}
          placeholder="알림으로 보낼 내용을 입력하세요"
        />
        <div style={{ marginTop: 6, fontSize: 12, color: ds.ink4, textAlign: "right" }}>
          {(form.content || "").length.toLocaleString()}자
        </div>
      </Field>
    </FormSheet>
  );
}

const EVENT_STATUS_TEXT = { active: "진행 중", pending: "예정", ended: "종료" };
const shortDate = (iso) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
};
const eventOptionDesc = (ev) => {
  const period = ev.date || (ev.startAt ? `${shortDate(ev.startAt)} ~ ${shortDate(ev.endAt)}` : "");
  return [EVENT_STATUS_TEXT[ev.status], period, ev.location].filter(Boolean).join(" · ");
};

const ALERT_KIND_CHOICES = [
  { id: "active", label: "진행 중 행사", desc: "지금 열리고 있는 행사의 참가자에게" },
  { id: "pending", label: "예정 행사", desc: "곧 열릴 행사의 관심·신청 회원에게" },
  { id: "ended", label: "종료 행사", desc: "끝난 행사 참가자에게 후속 안내" },
  { id: "important", label: "중요 알림", desc: "모든 회원에게 보내는 중요 공지" },
  { id: "system", label: "시스템 알림", desc: "점검·장애 등 서비스 안내" },
];
const RECIPIENT_DESC = {
  ALL_MEMBERS: "가입한 모든 회원 (앱 알림)",
  INTEREST_SUBSCRIBERS: "행사를 관심 등록한 회원",
  EVENT_REGISTRANTS: "행사에 참가 신청한 회원",
  EVENT_PAYERS: "참가비 결제까지 마친 회원",
};

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
                background: active ? ds.brand : "transparent",
                color: active ? "#fff" : ds.ink3,
                fontSize: 13.5,
                fontWeight: 600,
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
                  background: "transparent",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 12,
                  fontWeight: 700,
                  color: active ? ds.brandText : ds.ink4,
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
            <span style={{ fontSize: 14, fontWeight: 700, color: ds.ink }}>
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
                  fontSize: 12.5,
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
                  height: 32,
                  boxSizing: "border-box",
                  padding: "0 12px 0 30px",
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
                height: 32,
                padding: "0 14px",
                borderRadius: 7,
                border: "none",
                background: ds.brand,
                color: "#fff",
                fontSize: 12.5,
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: ds.ff,
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
                        fontSize: 12.5,
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
                        fontSize: 12,
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
                          fontSize: 12.5,
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
                        fontSize: 12.5,
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
                        fontSize: 12.5,
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
                    fontSize: 12.5,
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
                      fontSize: 12,
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
                        fontSize: 12,
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
                      border: `1px solid ${ds.line}`,
                      background: "transparent",
                      fontSize: 12,
                      fontWeight: 600,
                      color: ds.brandText,
                      cursor: "pointer",
                      fontFamily: ds.ff,
                      lineHeight: 1.2,
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = ds.cardHover)
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = "transparent")
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
                      fontSize: 12,
                      fontWeight: 600,
                      color: ds.red,
                      cursor: "pointer",
                      fontFamily: ds.ff,
                      lineHeight: 1.2,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = ds.red;
                      e.currentTarget.style.color = "#fff";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "transparent";
                      e.currentTarget.style.color = ds.red;
                    }}
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
          <EmptyState icon={Bell} title="알림 내역이 없습니다" description="오른쪽 위 '알림 작성'으로 새 알림을 보내 보세요." />
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
