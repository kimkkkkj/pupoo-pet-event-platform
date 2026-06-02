/**
 * ParticipantList — 참가자(회원) 목록 관리 (DB 연동)
 *
 * ★ 핵심 구조:
 *   참가자 = 회원가입한 유저가 행사에 신청한 사람
 *   users 테이블 ←→ event_apply 테이블 ←→ social_account 테이블
 *
 * ★ 연동 포인트 (회원가입 팀원 코드와 자동 연결):
 *   1. 유저가 홈에서 회원가입 → users 테이블에 INSERT (팀원 담당)
 *   2. 카카오 가입이면 social_account에도 INSERT (팀원 담당)
 *   3. 유저가 행사 신청 → event_apply에 INSERT
 *   4. 이 페이지는 event_apply + users + social_account를 조인해서 보여줌
 *   → 팀원이 회원가입 완성하면 여기서 자동으로 보임!
 *
 * VIEW 1: 행사 선택 카드
 * VIEW 2: 선택된 행사의 참가자(회원) 테이블
 *
 * API:
 *   GET    /api/admin/dashboard/events                          — 행사 목록
 *   GET    /api/admin/dashboard/events/{eventId}/registrations  — 참가자 목록
 *   PATCH  /api/admin/dashboard/registrations/{applyId}/status  — 상태 변경
 *   DELETE /api/admin/dashboard/registrations/{applyId}         — 삭제
 *   POST   /api/admin/dashboard/registrations/bulk-delete       — 일괄 삭제
 */
import { useState, useEffect } from "react";
import {
  X,
  Trash2,
  Search,
  Check,
  ChevronLeft,
  AlertTriangle,
  Users,
  Clock,
  UserCheck,
  CalendarDays,
  MapPin,
  ArrowRight,
  Clipboard,
  Mail,
  Phone,
  Shield,
} from "lucide-react";
import ds, { statusMap } from "../shared/designTokens";
import { Pill } from "../shared/Components";
import { injectEventImages, loadImageCache } from "../shared/eventImageStore";
import DATA from "../shared/data";
import { axiosInstance } from "../../../app/http/axiosInstance";
import { getToken } from "../../../api/noticeApi";
import { sortAdminEventsByOperationalPriority } from "../shared/adminStatus";
import { resolveImageUrl } from "../../../shared/utils/publicAssetUrl";

/* ── 스타일 ── */
const styles = `
.ev-card-ended { opacity:0.42 !important; filter:grayscale(0.65) !important; pointer-events:none !important; }
.ev-card-ended img { filter:blur(1px) !important; }
.card-manage-btn:active,.card-manage-btn:focus,.card-manage-btn:focus-visible{outline:none!important;box-shadow:none!important;filter:none!important;opacity:1!important;-webkit-tap-highlight-color:transparent;}
@keyframes toastIn{from{opacity:0;transform:translateY(-12px)}to{opacity:1;transform:translateY(0)}}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes slideUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
@keyframes rowFadeOut{from{opacity:1;transform:translateX(0)}to{opacity:0;transform:translateX(-30px)}}
@keyframes spin{to{transform:rotate(360deg)}}
.row-removing{animation:rowFadeOut .3s ease forwards}
`;

function getViewportFlags() {
  if (typeof window === "undefined") {
    return { isMobile: false, isTablet: false, isCompact: false };
  }

  const width = window.innerWidth;
  return {
    isMobile: width < 768,
    isTablet: width >= 768 && width < 1024,
    isCompact: width < 1024,
  };
}

/* ── 공통 UI ── */
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
        transition: "all .15s ease",
        flexShrink: 0,
      }}
    >
      {checked && <Check size={size - 6} color="#fff" strokeWidth={3} />}
    </div>
  );
}

function Toast({ msg, type = "success", onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2200);
    return () => clearTimeout(t);
  }, [onDone]);
  const bg = type === "success" ? "#3a4520" : "#EF4444";
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
  const { isMobile, isCompact } = getViewportFlags();

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
        padding: isMobile ? 12 : 20,
        animation: "fadeIn .15s ease",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: ds.card,
          borderRadius: 16,
          width: isCompact ? "min(520px, calc(100vw - 24px))" : 520,
          maxHeight: isMobile ? "90vh" : "85vh",
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

function ConfirmModal({ title, msg, onConfirm, onCancel }) {
  const { isMobile, isCompact } = getViewportFlags();

  return (
    <Overlay onClose={onCancel}>
      <div style={{ padding: isMobile ? 20 : isCompact ? 24 : 28 }}>
        <div
          style={{
            display: "flex",
            alignItems: isMobile ? "flex-start" : "center",
            flexDirection: isMobile ? "column" : "row",
            gap: 12,
            marginBottom: 14,
          }}
        >
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              background: ds.redSoft,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <AlertTriangle size={18} color="#EF4444" />
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
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 8,
            flexDirection: isMobile ? "column-reverse" : "row",
          }}
        >
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
              width: isMobile ? "100%" : "auto",
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
              background: "#EF4444",
              color: "#fff",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: ds.ff,
              width: isMobile ? "100%" : "auto",
            }}
          >
            삭제
          </button>
        </div>
      </div>
    </Overlay>
  );
}

function StatCard({ icon: Icon, label, value, color, sub }) {
  return (
    <div
      style={{
        background: ds.card,
        borderRadius: 12,
        padding: "14px 16px",
        border: `1px solid ${ds.line}`,
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
          background: `${color}10`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <Icon size={16} color={color} strokeWidth={2.2} />
      </div>
      <div>
        <div
          style={{
            fontSize: 10.5,
            color: ds.ink4,
            fontWeight: 600,
            marginBottom: 1,
          }}
        >
          {label}
        </div>
        <div
          style={{
            fontSize: 18,
            fontWeight: 800,
            color: ds.ink,
            letterSpacing: -0.5,
          }}
        >
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

/* ── 상태 매핑 ── */
const REG_STATUS = {
  APPLIED: { l: "대기", c: ds.amber, bg: ds.amberSoft },
  APPROVED: { l: "승인", c: ds.green, bg: ds.greenSoft },
  CANCELLED: { l: "취소", c: "#EF4444", bg: ds.redSoft },
  REJECTED: { l: "거절", c: ds.ink4, bg: ds.lineSoft },
};

/* ── 가입 유형 매핑 ── */
const SIGNUP_TYPE = {
  NORMAL: { l: "일반", c: ds.ink4, bg: ds.lineSoft },
  KAKAO: { l: "카카오", c: "#3C1E1E", bg: "#FEE500" },
  NAVER: { l: "네이버", c: "#fff", bg: "#03C75A" },
  APPLE: { l: "애플", c: "#fff", bg: "#000000" },
};

/* ── 유틸 ── */
const authHeaders = () => {
  const t = getToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
};

const fmtDate = (dt) => {
  if (!dt) return "—";
  const d = new Date(dt);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};
const fmtDateShort = (dt) => {
  if (!dt) return "—";
  const d = new Date(dt);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
};

/* ═══════════════════════════════════════════
   상세 모달
   ═══════════════════════════════════════════ */
function DetailModal({ item, onClose, onStatusChange, onDelete }) {
  const st = REG_STATUS[item.status] || REG_STATUS.APPLIED;
  const sg = SIGNUP_TYPE[item.signupType] || SIGNUP_TYPE.NORMAL;
  const { isMobile, isCompact } = getViewportFlags();

  return (
    <Overlay onClose={onClose}>
      <div style={{ padding: isMobile ? 20 : isCompact ? 24 : 28 }}>
        {/* 헤더 */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: isMobile ? "flex-start" : "center",
            flexDirection: isMobile ? "column" : "row",
            marginBottom: 20,
            gap: 12,
          }}
        >
          <h3
            style={{ fontSize: 16, fontWeight: 800, color: ds.ink, margin: 0 }}
          >
            참가자 상세
          </h3>
          <button
            onClick={onClose}
            style={{
              width: 28,
              height: 28,
              borderRadius: 7,
              border: "none",
              background: ds.lineSoft,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <X size={14} color={ds.ink4} />
          </button>
        </div>

        {/* 프로필 */}
        <div
          style={{
            background: ds.bg,
            borderRadius: 12,
            padding: 20,
            marginBottom: 20,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: isCompact ? "flex-start" : "center",
              flexDirection: isCompact ? "column" : "row",
              gap: 14,
              marginBottom: 16,
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 14,
                background: `${ds.brand}10`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 18,
                fontWeight: 800,
                color: ds.brand,
                flexShrink: 0,
              }}
            >
              {(item.nickname || "?")[0]}
            </div>
            <div style={{ flex: 1, width: isCompact ? "100%" : "auto" }}>
              <div style={{ fontSize: 17, fontWeight: 800, color: ds.ink }}>
                {item.nickname}
              </div>
              <div style={{ fontSize: 11, color: ds.ink4, marginTop: 2 }}>
                #{item.applyId} · User #{item.userId}
              </div>
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", width: isCompact ? "100%" : "auto" }}>
              <Pill color={st.c} bg={st.bg}>
                {st.l}
              </Pill>
              <Pill color={sg.c} bg={sg.bg}>
                {sg.l}
              </Pill>
            </div>
          </div>

          {/* 상세 정보 */}
          {[
            { icon: Mail, l: "이메일", v: item.email || "—" },
            { icon: Phone, l: "연락처", v: item.phone || "—" },
            {
              icon: CalendarDays,
              l: "회원가입일",
              v: fmtDateShort(item.userCreatedAt),
            },
            {
              icon: CalendarDays,
              l: "행사 신청일",
              v: fmtDate(item.appliedAt),
            },
            { icon: Shield, l: "계정 상태", v: item.userStatus || "—" },
          ].map((r) => (
            <div
              key={r.l}
              style={{
                display: "flex",
                alignItems: isMobile ? "flex-start" : "center",
                flexDirection: isMobile ? "column" : "row",
                gap: 10,
                padding: "9px 0",
                borderBottom: `1px solid ${ds.line}`,
              }}
            >
              <r.icon size={13} color={ds.ink4} style={{ flexShrink: 0 }} />
              <span
                style={{
                  fontSize: 13,
                  color: ds.ink3,
                  fontWeight: 500,
                  width: isMobile ? "100%" : 80,
                  flexShrink: 0,
                }}
              >
                {r.l}
              </span>
              <span style={{ fontSize: 13, color: ds.ink, fontWeight: 600, wordBreak: "break-word" }}>
                {r.v}
              </span>
            </div>
          ))}
        </div>

        {/* 상태 변경 버튼 */}
        <div style={{ marginBottom: 18 }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: ds.ink3,
              marginBottom: 8,
            }}
          >
            신청 상태 변경
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", flexDirection: isMobile ? "column" : "row" }}>
            {item.status !== "APPROVED" && (
              <button
                onClick={() => {
                  onStatusChange(item.applyId, "APPROVED");
                  onClose();
                }}
                style={{
                  padding: "7px 14px",
                  borderRadius: 7,
                  border: "1px solid #D1FAE5",
                  background: ds.greenSoft,
                  fontSize: 12,
                  fontWeight: 700,
                  color: "#059669",
                  cursor: "pointer",
                  fontFamily: ds.ff,
                  width: isMobile ? "100%" : "auto",
                }}
              >
                승인
              </button>
            )}
            {item.status === "APPLIED" && (
              <button
                onClick={() => {
                  onStatusChange(item.applyId, "REJECTED");
                  onClose();
                }}
                style={{
                  padding: "7px 14px",
                  borderRadius: 7,
                  border: `1px solid ${ds.line}`,
                  background: ds.bg,
                  fontSize: 12,
                  fontWeight: 700,
                  color: ds.ink3,
                  cursor: "pointer",
                  fontFamily: ds.ff,
                  width: isMobile ? "100%" : "auto",
                }}
              >
                거절
              </button>
            )}
            {(item.status === "APPLIED" || item.status === "APPROVED") && (
              <button
                onClick={() => {
                  onStatusChange(item.applyId, "CANCELLED");
                  onClose();
                }}
                style={{
                  padding: "7px 14px",
                  borderRadius: 7,
                  border: `1px solid ${ds.red}33`,
                  background: ds.redSoft,
                  fontSize: 12,
                  fontWeight: 700,
                  color: ds.red,
                  cursor: "pointer",
                  fontFamily: ds.ff,
                  width: isMobile ? "100%" : "auto",
                }}
              >
                취소
              </button>
            )}
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, flexDirection: isMobile ? "column" : "row" }}>
          <button
            onClick={() => {
              onClose();
              onDelete(item);
            }}
            style={{
              padding: "9px 16px",
              borderRadius: 8,
              border: `1px solid ${ds.red}33`,
              background: ds.redSoft,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: ds.ff,
              color: ds.red,
              display: "flex",
              alignItems: "center",
              gap: 6,
              justifyContent: "center",
              width: isMobile ? "100%" : "auto",
            }}
          >
            <Trash2 size={13} /> 삭제
          </button>
        </div>
      </div>
    </Overlay>
  );
}

/* ═══════════════════════════════════════════
   메인 컴포넌트
   ═══════════════════════════════════════════ */
export default function ParticipantList({ subTab = "list", initialEventId = null }) {
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [loadingParticipants, setLoadingParticipants] = useState(false);
  const [modal, setModal] = useState(null);
  const [toast, setToast] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selected, setSelected] = useState(new Set());
  const [removing, setRemoving] = useState(null);
  const [eventFilter, setEventFilter] = useState("all");
  const [viewportWidth, setViewportWidth] = useState(1280);
  const showToast = (msg, type = "success") => setToast({ msg, type });
  const isMobile = viewportWidth < 768;
  const isTablet = viewportWidth >= 768 && viewportWidth < 1024;
  const isCompact = viewportWidth < 1024;

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const syncViewport = () => setViewportWidth(window.innerWidth);
    syncViewport();
    window.addEventListener("resize", syncViewport);
    return () => window.removeEventListener("resize", syncViewport);
  }, []);

  /* ── 행사 목록 로드 ── */
  const calcStatus = (s, e) => {
    if (!s && !e) return "pending";
    const norm = (v) => (v ? v.replace(/\./g, "-").trim() : v);
    const n = new Date();
    const start = s
      ? new Date(norm(s).includes("T") ? norm(s) : norm(s) + "T00:00:00+09:00")
      : null;
    const end = e
      ? new Date(norm(e).includes("T") ? norm(e) : norm(e) + "T23:59:59+09:00")
      : null;
    if (end && !isNaN(end) && n > end) return "ended";
    if (start && !isNaN(start) && n < start) return "pending";
    return "active";
  };

  const loadEvents = async () => {
    try {
      await loadImageCache();
      const res = await axiosInstance.get("/api/admin/dashboard/events", {
        headers: authHeaders(),
      });
      const list = res.data?.data || res.data || [];
      const mapped = list.map((e) => ({
        ...e,
        status: calcStatus(
          e.startAt || e.date?.split("~")[0]?.trim(),
          e.endAt || e.date?.split("~")[1]?.trim(),
        ),
      }));
      setEvents(sortAdminEventsByOperationalPriority(injectEventImages(mapped)));
    } catch (err) {
      console.error("행사 로드 실패:", err);
      setEvents([]);
    } finally {
      setLoadingEvents(false);
    }
  };

  /* ── 참가자 목록 로드 ── */
  const loadParticipants = async (eventId) => {
    setLoadingParticipants(true);
    try {
      const res = await axiosInstance.get(
        `/api/admin/dashboard/events/${eventId}/registrations`,
        { headers: authHeaders() },
      );
      const list = res.data?.data || res.data || [];
      setParticipants(list);
    } catch (err) {
      console.error("참가자 로드 실패:", err);
      setParticipants([]);
    } finally {
      setLoadingParticipants(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, []);

  const selectEvent = (ev) => {
    setSelectedEvent(ev);
    setSelected(new Set());
    setSearch("");
    setStatusFilter("ALL");
    const eid = ev.eventId || ev.id?.replace("EV-", "");
    loadParticipants(eid);
  };

  useEffect(() => {
    if (!initialEventId || loadingEvents || selectedEvent || events.length === 0) {
      return;
    }

    const matchedEvent = events.find((event) => {
      const eventId = event.eventId || event.id?.replace("EV-", "");
      return String(eventId) === String(initialEventId);
    });

    if (matchedEvent) {
      selectEvent(matchedEvent);
    }
  }, [initialEventId, loadingEvents, selectedEvent, events]);

  const goBack = () => {
    setSelectedEvent(null);
    setParticipants([]);
    setSelected(new Set());
    setSearch("");
    setStatusFilter("ALL");
  };

  /* ── 상태 변경 ── */
  const handleStatusChange = async (applyId, newStatus) => {
    try {
      await axiosInstance.patch(
        `/api/admin/dashboard/registrations/${applyId}/status?status=${newStatus}`,
        {},
        { headers: authHeaders() },
      );
      const eid = selectedEvent.eventId || selectedEvent.id?.replace("EV-", "");
      await loadParticipants(eid);
      showToast("상태가 변경되었습니다.");
    } catch (err) {
      showToast("상태 변경에 실패했습니다.", "error");
    }
  };

  /* ── 삭제 ── */
  const handleDelete = async () => {
    const item = modal.item;
    setModal(null);
    setRemoving(item.applyId);
    try {
      await axiosInstance.delete(
        `/api/admin/dashboard/registrations/${item.applyId}`,
        { headers: authHeaders() },
      );
      const eid = selectedEvent.eventId || selectedEvent.id?.replace("EV-", "");
      setTimeout(async () => {
        await loadParticipants(eid);
        setRemoving(null);
        showToast("참가자가 삭제되었습니다.");
      }, 300);
    } catch (err) {
      setRemoving(null);
      showToast("삭제에 실패했습니다.", "error");
    }
  };

  /* ── 일괄 삭제 ── */
  const handleBulkDelete = async () => {
    const ids = [...selected];
    setModal(null);
    try {
      await axiosInstance.post(
        "/api/admin/dashboard/registrations/bulk-delete",
        { applyIds: ids },
        { headers: authHeaders() },
      );
      const eid = selectedEvent.eventId || selectedEvent.id?.replace("EV-", "");
      await loadParticipants(eid);
      setSelected(new Set());
      showToast(`${ids.length}건 삭제되었습니다.`);
    } catch (err) {
      showToast("일괄 삭제 실패", "error");
    }
  };

  /* ── 필터 ── */
  const filtered = participants.filter((p) => {
    if (statusFilter !== "ALL" && p.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        (p.nickname || "").toLowerCase().includes(q) ||
        (p.email || "").toLowerCase().includes(q) ||
        (p.phone || "").includes(q) ||
        String(p.applyId).includes(q)
      );
    }
    return true;
  });

  const total = participants.length;
  const approved = participants.filter((p) => p.status === "APPROVED").length;
  const applied = participants.filter((p) => p.status === "APPLIED").length;

  const isAllSelected =
    filtered.length > 0 && filtered.every((r) => selected.has(r.applyId));
  const hasSelected = selected.size > 0;
  const toggleAll = () => {
    if (isAllSelected) setSelected(new Set());
    else setSelected(new Set(filtered.map((r) => r.applyId)));
  };
  const toggleOne = (id) => {
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  if (subTab === "checkin") {
    return <ParticipantCheckinPanel checkins={DATA.checkins || []} />;
  }

  if (subTab === "session") {
    return (
      <ParticipantSessionPanel sessions={DATA.sessionParticipation || []} />
    );
  }

  /* ═══════════════════════════════════════════
     렌더링
     ═══════════════════════════════════════════ */
  return (
    <div>
      <style>{styles}</style>

      {/* ═══════ VIEW 1: 행사 선택 ═══════ */}
      {!selectedEvent && (
        <>
          <p style={{ fontSize: 13, color: ds.ink4, margin: "0 0 16px" }}>
            관리할 행사를 선택하세요
          </p>

          {loadingEvents ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                padding: "80px 0",
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  border: `3px solid ${ds.brand}20`,
                  borderTopColor: ds.brand,
                  borderRadius: "50%",
                  animation: "spin 1s linear infinite",
                }}
              />
              <div
                style={{
                  fontSize: 13,
                  color: ds.ink4,
                  fontWeight: 600,
                  marginTop: 14,
                }}
              >
                행사 목록 로딩 중...
              </div>
            </div>
          ) : events.length === 0 ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                padding: "80px 0",
              }}
            >
              <CalendarDays size={42} color={ds.ink4} strokeWidth={1.5} />
              <div
                style={{
                  fontSize: 15,
                  fontWeight: 700,
                  color: ds.ink4,
                  marginTop: 14,
                }}
              >
                등록된 행사가 없습니다
              </div>
              <div style={{ fontSize: 13, color: ds.ink4, marginTop: 4 }}>
                먼저 행사 관리에서 행사를 등록해주세요
              </div>
            </div>
          ) : (
            (() => {
              const filteredEvents = events.filter(
                eventFilter === "all"
                  ? () => true
                  : eventFilter === "active"
                    ? (e) => e.status === "active"
                    : eventFilter === "ended"
                      ? (e) => e.status === "ended"
                      : (e) => e.status === "pending",
              );
              const tabCounts = {
                all: events.length,
                active: events.filter((e) => e.status === "active").length,
                ended: events.filter((e) => e.status === "ended").length,
                pending: events.filter((e) => e.status === "pending").length,
              };
              return (
                <>
                  <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                    {[
                      { id: "all", label: "전체" },
                      { id: "active", label: "운영 중" },
                      { id: "ended", label: "종료" },
                      { id: "pending", label: "대기" },
                    ].map((t) => {
                      const on = eventFilter === t.id;
                      return (
                        <button
                          key={t.id}
                          onClick={() => setEventFilter(t.id)}
                          style={{
                            padding: "8px 18px",
                            border: `1px solid ${on ? ds.brand : ds.line}`,
                            cursor: "pointer",
                            borderRadius: 22,
                            fontSize: 13,
                            fontWeight: 700,
                            color: on ? "#fff" : ds.ink3,
                            background: on ? ds.brand : ds.card,
                            transition: "all .15s",
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            fontFamily: ds.ff,
                          }}
                        >
                          {t.label}
                          <span
                            style={{
                              fontSize: 10.5,
                              fontWeight: 700,
                              padding: "0 6px",
                              borderRadius: 9,
                              lineHeight: "17px",
                              background: on
                                ? "rgba(255,255,255,0.25)"
                                : ds.lineSoft,
                              color: on ? "#fff" : ds.ink4,
                            }}
                          >
                            {tabCounts[t.id]}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  {filteredEvents.length === 0 ? (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        padding: "60px 0",
                      }}
                    >
                      <CalendarDays
                        size={36}
                        color={ds.ink4}
                        strokeWidth={1.5}
                      />
                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: 600,
                          color: ds.ink4,
                          marginTop: 10,
                        }}
                      >
                        해당 상태의 행사가 없습니다
                      </div>
                    </div>
                  ) : (
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns:
                          isMobile
                            ? "repeat(auto-fill, minmax(220px, 1fr))"
                            : isTablet
                              ? "repeat(auto-fill, minmax(240px, 1fr))"
                            : "repeat(auto-fill, minmax(280px, 1fr))",
                        gap: 14,
                      }}
                    >
                      {filteredEvents.map((ev) => {
                        const st = statusMap[ev.status] || statusMap.pending;
                        const hasImg = !!ev.imageUrl;
                        const isEnded = ev.status === "ended";
                        return (
                          <div
                            key={ev.eventId || ev.id}
                            onClick={() => !isEnded && selectEvent(ev)}
                            className={isEnded ? "ev-card-ended" : ""}
                            style={{
                              borderRadius: 18,
                              overflow: "hidden",
                              cursor: isEnded ? "default" : "pointer",
                              position: "relative",
                              height: 320,
                              display: "flex",
                              flexDirection: "column",
                              background: hasImg ? "#000" : ds.brand,
                              boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
                              transition:
                                "transform 0.22s ease, box-shadow 0.22s ease",
                            }}
                            onMouseEnter={(e) => {
                              if (!isEnded) {
                                e.currentTarget.style.transform =
                                  "translateY(-4px)";
                                e.currentTarget.style.boxShadow =
                                  "0 12px 36px rgba(0,0,0,0.16)";
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (!isEnded) {
                                e.currentTarget.style.transform =
                                  "translateY(0)";
                                e.currentTarget.style.boxShadow =
                                  "0 4px 24px rgba(0,0,0,0.08)";
                              }
                            }}
                          >
                            {hasImg ? (
                              <div style={{ position: "absolute", inset: 0 }}>
                                <img
                                  src={resolveImageUrl(ev.imageUrl)}
                                  alt=""
                                  style={{
                                    width: "100%",
                                    height: "100%",
                                    objectFit: "cover",
                                  }}
                                />
                                <div
                                  style={{
                                    position: "absolute",
                                    inset: 0,
                                    background:
                                      "linear-gradient(to bottom, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.6) 100%)",
                                  }}
                                />
                              </div>
                            ) : (
                              <div
                                style={{
                                  position: "absolute",
                                  inset: 0,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  opacity: 0.12,
                                }}
                              >
                                <Users size={90} color="#fff" strokeWidth={1} />
                              </div>
                            )}
                            <div
                              style={{
                                position: "relative",
                                zIndex: 1,
                                padding: "22px 20px 0",
                                flex: 1,
                              }}
                            >
                              <div
                                style={{
                                  fontSize: 18,
                                  fontWeight: 800,
                                  color: "#fff",
                                  letterSpacing: -0.3,
                                  textShadow: "0 1px 8px rgba(0,0,0,0.3)",
                                  marginBottom: 6,
                                  fontFamily: ds.ff,
                                }}
                              >
                                {ev.name || ev.eventName}
                              </div>
                              <div
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 5,
                                  background: "rgba(0,0,0,0.35)",
                                  borderRadius: 20,
                                  padding: "3px 10px",
                                }}
                              >
                                <span
                                  style={{
                                    width: 6,
                                    height: 6,
                                    borderRadius: "50%",
                                    background: st.c,
                                  }}
                                />
                                <span
                                  style={{
                                    fontSize: 11,
                                    fontWeight: 700,
                                    color: "#fff",
                                  }}
                                >
                                  {st.l}
                                </span>
                              </div>
                            </div>
                            <div
                              style={{
                                position: "relative",
                                zIndex: 1,
                                padding: "0 20px 18px",
                              }}
                            >
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 8,
                                  marginBottom: 12,
                                }}
                              >
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  {ev.date && (
                                    <div
                                      style={{
                                        fontSize: 11.5,
                                        fontWeight: 600,
                                        color: "rgba(255,255,255,0.9)",
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 4,
                                      }}
                                    >
                                      <CalendarDays size={11} /> {ev.date}
                                    </div>
                                  )}
                                  {ev.location && (
                                    <div
                                      style={{
                                        fontSize: 10.5,
                                        color: "rgba(255,255,255,0.65)",
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 4,
                                        marginTop: 1,
                                      }}
                                    >
                                      <MapPin size={10} /> {ev.location}
                                    </div>
                                  )}
                                </div>
                              </div>
                              <button
                                style={{
                                  width: "100%",
                                  padding: "9px 0",
                                  borderRadius: 10,
                                  border: "none",
                                  background: ds.brand,
                                  color: "#fff",
                                  fontSize: 12.5,
                                  fontWeight: 700,
                                  cursor: "pointer",
                                  fontFamily: ds.ff,
                                  transition: "all .15s",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  gap: 6,
                                  outline: "none",
                                  WebkitTapHighlightColor: "transparent",
                                }}
                                className="card-manage-btn"
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.background =
                                    ds.brandDark;
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.background = ds.brand;
                                }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (!isEnded) selectEvent(ev);
                                }}
                                disabled={isEnded}
                              >
                                <Users size={13} />{" "}
                                {isEnded ? "기간 만료" : "참가자 관리하기"}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              );
            })()
          )}
        </>
      )}

      {/* ═══════ VIEW 2: 참가자 테이블 ═══════ */}
      {selectedEvent && (
        <>
          {/* 헤더 */}
          <div style={{ marginBottom: 16 }}>
            <button
              onClick={goBack}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 12px",
                borderRadius: 8,
                border: `1px solid ${ds.line}`,
                background: ds.card,
                fontSize: 12.5,
                fontWeight: 600,
                color: ds.ink3,
                cursor: "pointer",
                fontFamily: ds.ff,
                marginBottom: 12,
                transition: "all .15s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = ds.brand;
                e.currentTarget.style.color = ds.brand;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = ds.line;
                e.currentTarget.style.color = ds.ink3;
              }}
            >
              <ChevronLeft size={14} /> 행사 목록으로
            </button>
            <div style={{ display: "flex", alignItems: isCompact ? "flex-start" : "center", gap: 12, flexWrap: "wrap" }}>
              <h3
                style={{
                  fontSize: 17,
                  fontWeight: 800,
                  color: ds.ink,
                  margin: 0,
                }}
              >
                {selectedEvent.name || selectedEvent.eventName}
              </h3>
              <Pill
                color={(statusMap[selectedEvent.status] || statusMap.pending).c}
                bg={(statusMap[selectedEvent.status] || statusMap.pending).bg}
              >
                {(statusMap[selectedEvent.status] || statusMap.pending).l}
              </Pill>
            </div>
            {selectedEvent.date && (
              <p
                style={{
                  fontSize: 12.5,
                  color: ds.ink4,
                  margin: "4px 0 0",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <CalendarDays size={12} /> {selectedEvent.date}
                {selectedEvent.location && (
                  <>
                    <span style={{ margin: "0 6px" }}>·</span>
                    <MapPin size={12} /> {selectedEvent.location}
                  </>
                )}
              </p>
            )}
          </div>

          {/* 통계 카드 */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: isCompact
                ? "repeat(2, minmax(0, 1fr))"
                : "repeat(4, 1fr)",
              gap: 12,
              marginBottom: 16,
            }}
          >
            <StatCard
              icon={Users}
              label="전체 참가자"
              value={total}
              color={ds.brand}
            />
            <StatCard
              icon={UserCheck}
              label="승인 완료"
              value={approved}
              color="#3a4520"
            />
            <StatCard
              icon={Clock}
              label="대기 중"
              value={applied}
              color="#F59E0B"
            />
            <StatCard
              icon={Clipboard}
              label="취소/거절"
              value={total - approved - applied}
              color="#EF4444"
            />
          </div>

          {/* 테이블 */}
          <div
            style={{
              background: ds.card,
              borderRadius: 12,
              border: `1px solid ${ds.line}`,
              overflow: "hidden",
            }}
          >
            {/* 테이블 헤더 */}
            <div
              style={{
                padding: "12px 18px",
                display: "flex",
                alignItems: isCompact ? "stretch" : "center",
                justifyContent: "space-between",
                gap: 10,
                flexWrap: "wrap",
                borderBottom: `1px solid ${ds.line}`,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 14, fontWeight: 800, color: ds.ink }}>
                  참가자 목록
                </span>
                <span
                  style={{
                    fontSize: 11.5,
                    fontWeight: 600,
                    color: ds.ink4,
                    background: ds.lineSoft,
                    padding: "2px 8px",
                    borderRadius: 5,
                  }}
                >
                  {filtered.length}
                </span>
                {hasSelected && (
                  <span
                    style={{
                      fontSize: 12.5,
                      fontWeight: 700,
                      color: ds.brand,
                      background: `${ds.brand}0C`,
                      padding: "4px 10px",
                      borderRadius: 6,
                    }}
                  >
                    {selected.size}건 선택됨
                  </span>
                )}
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: isCompact ? "stretch" : "flex-end",
                  gap: 6,
                  flexWrap: "wrap",
                  width: isCompact ? "100%" : "auto",
                }}
              >
                {/* 상태 필터 */}
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  style={{
                    padding: "6px 10px",
                    borderRadius: 7,
                    border: `1px solid ${ds.line}`,
                    fontSize: 12,
                    fontFamily: ds.ff,
                    color: ds.ink,
                    outline: "none",
                    background: ds.card,
                    cursor: "pointer",
                    minWidth: isCompact ? "100%" : 0,
                  }}
                >
                  <option value="ALL">전체 상태</option>
                  <option value="APPLIED">대기</option>
                  <option value="APPROVED">승인</option>
                  <option value="CANCELLED">취소</option>
                  <option value="REJECTED">거절</option>
                </select>
                {/* 검색 */}
                <div style={{ position: "relative", width: isCompact ? "100%" : "auto" }}>
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="이름/이메일/연락처"
                    style={{
                      width: isCompact ? "100%" : 170,
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
                {hasSelected && (
                  <button
                    onClick={() => setModal({ type: "bulkDelete" })}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 4,
                      padding: "6px 12px",
                      borderRadius: 7,
                      border: `1px solid ${ds.red}33`,
                      background: ds.redSoft,
                      fontSize: 12,
                      fontWeight: 600,
                      color: ds.red,
                      cursor: "pointer",
                      fontFamily: ds.ff,
                      width: isCompact ? "100%" : "auto",
                    }}
                  >
                    <Trash2 size={12} /> 선택 삭제
                  </button>
                )}
              </div>
            </div>

            {/* 테이블 본체 */}
            {isMobile ? (
              <div style={{ display: "grid", gap: 12 }}>
                {loadingParticipants ? (
                  <div
                    style={{
                      background: ds.card,
                      borderRadius: 14,
                      border: `1px solid ${ds.line}`,
                      padding: "32px 16px",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 12,
                    }}
                  >
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        border: `3px solid ${ds.brand}20`,
                        borderTopColor: ds.brand,
                        borderRadius: "50%",
                        animation: "spin 1s linear infinite",
                      }}
                    />
                    <span style={{ fontSize: 13, color: ds.ink4, fontWeight: 600 }}>
                      참가자 목록을 불러오는 중...
                    </span>
                  </div>
                ) : filtered.length === 0 ? (
                  <div
                    style={{
                      background: ds.card,
                      borderRadius: 14,
                      border: `1px solid ${ds.line}`,
                      padding: "32px 16px",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                    }}
                  >
                    <Users size={36} color={ds.ink4} strokeWidth={1.5} />
                    <div style={{ fontSize: 14, fontWeight: 700, color: ds.ink4, marginTop: 12 }}>
                      참가자 목록이 없습니다
                    </div>
                    <div style={{ fontSize: 12.5, color: ds.ink4, marginTop: 4, textAlign: "center" }}>
                      검색 조건에 맞는 행사 참가 신청자가 없습니다
                    </div>
                  </div>
                ) : (
                  filtered.map((r) => {
                    const st = REG_STATUS[r.status] || REG_STATUS.APPLIED;
                    const sg = SIGNUP_TYPE[r.signupType] || SIGNUP_TYPE.NORMAL;
                    const isRemoving = removing === r.applyId;
                    const isChecked = selected.has(r.applyId);
                    return (
                      <div
                        key={r.applyId}
                        className={isRemoving ? "row-removing" : ""}
                        onClick={() => setModal({ type: "detail", item: r })}
                        style={{
                          background: isChecked ? `${ds.brand}06` : ds.card,
                          borderRadius: 14,
                          border: `1px solid ${isChecked ? `${ds.brand}22` : ds.line}`,
                          padding: "14px 14px 12px",
                          display: "grid",
                          gap: 12,
                          cursor: "pointer",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                          <Checkbox
                            checked={isChecked}
                            onChange={() => toggleOne(r.applyId)}
                          />
                          <div
                            style={{
                              width: 34,
                              height: 34,
                              borderRadius: 9,
                              background: `${ds.brand}10`,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: 13,
                              fontWeight: 800,
                              color: ds.brand,
                              flexShrink: 0,
                            }}
                          >
                            {(r.nickname || "?")[0]}
                          </div>
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div
                              style={{
                                fontSize: 13.5,
                                fontWeight: 700,
                                color: ds.ink,
                                whiteSpace: "normal",
                                wordBreak: "keep-all",
                                overflowWrap: "break-word",
                                lineHeight: 1.45,
                              }}
                            >
                              {r.nickname}
                            </div>
                            <div
                              style={{
                                fontSize: 11.5,
                                color: ds.ink4,
                                marginTop: 4,
                                whiteSpace: "normal",
                                wordBreak: "keep-all",
                                overflowWrap: "break-word",
                                lineHeight: 1.45,
                              }}
                            >
                              {r.email}
                            </div>
                          </div>
                        </div>

                        <div style={{ display: "grid", gap: 8 }}>
                          <div style={{ display: "grid", gap: 4 }}>
                            <span style={{ fontSize: 11, color: ds.ink4, fontWeight: 700 }}>연락처</span>
                            <span style={{ fontSize: 12.5, color: ds.ink3, whiteSpace: "normal", wordBreak: "keep-all", overflowWrap: "break-word" }}>
                              {r.phone || "-"}
                            </span>
                          </div>
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8 }}>
                            <div style={{ display: "grid", gap: 4, minWidth: 0 }}>
                              <span style={{ fontSize: 11, color: ds.ink4, fontWeight: 700 }}>가입유형</span>
                              <div><Pill color={sg.c} bg={sg.bg}>{sg.l}</Pill></div>
                            </div>
                            <div style={{ display: "grid", gap: 4, minWidth: 0 }}>
                              <span style={{ fontSize: 11, color: ds.ink4, fontWeight: 700 }}>신청일</span>
                              <span style={{ fontSize: 12.5, color: ds.ink3 }}>{fmtDateShort(r.appliedAt)}</span>
                            </div>
                          </div>
                          <div style={{ display: "grid", gap: 4 }}>
                            <span style={{ fontSize: 11, color: ds.ink4, fontWeight: 700 }}>상태</span>
                            <div><Pill color={st.c} bg={st.bg}>{st.l}</Pill></div>
                          </div>
                        </div>

                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setModal({ type: "detail", item: r });
                            }}
                            style={{
                              padding: "9px 12px",
                              borderRadius: 8,
                              border: `1px solid ${ds.line}`,
                              background: ds.card,
                              fontSize: 12,
                              fontWeight: 600,
                              color: ds.ink3,
                              cursor: "pointer",
                              fontFamily: ds.ff,
                              width: "100%",
                            }}
                          >
                            상세
                          </button>
                          {r.status === "APPLIED" && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStatusChange(r.applyId, "APPROVED");
                              }}
                              style={{
                                padding: "9px 12px",
                                borderRadius: 8,
                                border: "1px solid #D1FAE5",
                                background: ds.greenSoft,
                                fontSize: 12,
                                fontWeight: 600,
                                color: "#059669",
                                cursor: "pointer",
                                fontFamily: ds.ff,
                                width: "100%",
                              }}
                            >
                              승인
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setModal({ type: "delete", item: r });
                            }}
                            style={{
                              padding: "9px 12px",
                              borderRadius: 8,
                              border: "1px solid #FECACA60",
                              background: "#FEF2F208",
                              fontSize: 12,
                              fontWeight: 600,
                              color: ds.red,
                              cursor: "pointer",
                              fontFamily: ds.ff,
                              width: "100%",
                            }}
                          >
                            삭제
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            ) : (
            <div style={{ overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  minWidth: isCompact ? 720 : "100%",
                  borderCollapse: "collapse",
                }}
              >
              <thead>
                <tr style={{ borderBottom: `1px solid ${ds.line}` }}>
                  <th style={{ width: 44, padding: "10px 14px" }}>
                    <Checkbox checked={isAllSelected} onChange={toggleAll} />
                  </th>
                  {[
                    { label: "참가자(회원)", w: "25%" },
                    { label: "연락처", w: "15%" },
                    { label: "가입유형", w: 80 },
                    { label: "신청일", w: "15%" },
                    { label: "상태", w: 70 },
                    { label: "", w: 150 },
                  ].map((c, i) => (
                    <th
                      key={i}
                      style={{
                        padding: "10px 14px",
                        fontSize: 11.5,
                        fontWeight: 700,
                        color: ds.ink4,
                        textAlign: "left",
                        ...(c.w ? { width: c.w } : {}),
                      }}
                    >
                      {c.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loadingParticipants ? (
                  <tr>
                    <td
                      colSpan={7}
                      style={{ padding: "60px 0", textAlign: "center" }}
                    >
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          gap: 12,
                        }}
                      >
                        <div
                          style={{
                            width: 32,
                            height: 32,
                            border: `3px solid ${ds.brand}20`,
                            borderTopColor: ds.brand,
                            borderRadius: "50%",
                            animation: "spin 1s linear infinite",
                          }}
                        />
                        <span
                          style={{
                            fontSize: 13,
                            color: ds.ink4,
                            fontWeight: 600,
                          }}
                        >
                          참가자 로딩 중...
                        </span>
                      </div>
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      style={{ padding: "60px 0", textAlign: "center" }}
                    >
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                        }}
                      >
                        <Users size={36} color={ds.ink4} strokeWidth={1.5} />
                        <div
                          style={{
                            fontSize: 14,
                            fontWeight: 700,
                            color: ds.ink4,
                            marginTop: 12,
                          }}
                        >
                          참가자가 없습니다
                        </div>
                        <div
                          style={{
                            fontSize: 12.5,
                            color: ds.ink4,
                            marginTop: 4,
                          }}
                        >
                          아직 이 행사에 신청한 회원이 없습니다
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filtered.map((r) => {
                    const st = REG_STATUS[r.status] || REG_STATUS.APPLIED;
                    const sg = SIGNUP_TYPE[r.signupType] || SIGNUP_TYPE.NORMAL;
                    const isRemoving = removing === r.applyId;
                    const isChecked = selected.has(r.applyId);
                    return (
                      <tr
                        key={r.applyId}
                        className={isRemoving ? "row-removing" : ""}
                        onClick={() => setModal({ type: "detail", item: r })}
                        style={{
                          borderBottom: `1px solid ${ds.lineSoft}`,
                          cursor: "pointer",
                          transition: "background .1s",
                          background: isChecked
                            ? `${ds.brand}06`
                            : "transparent",
                        }}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.background = isChecked
                            ? `${ds.brand}0A`
                            : ds.bg)
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.background = isChecked
                            ? `${ds.brand}06`
                            : "transparent")
                        }
                      >
                        <td style={{ width: 44, padding: "11px 14px" }}>
                          <Checkbox
                            checked={isChecked}
                            onChange={() => toggleOne(r.applyId)}
                          />
                        </td>

                        {/* 참가자(회원) */}
                        <td style={{ padding: "11px 14px" }}>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 10,
                            }}
                          >
                            <div
                              style={{
                                width: 34,
                                height: 34,
                                borderRadius: 9,
                                background: `${ds.brand}10`,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: 13,
                                fontWeight: 800,
                                color: ds.brand,
                                flexShrink: 0,
                              }}
                            >
                              {(r.nickname || "?")[0]}
                            </div>
                            <div>
                              <div
                                style={{
                                  fontSize: 13,
                                  fontWeight: 700,
                                  color: ds.ink,
                                }}
                              >
                                {r.nickname}
                              </div>
                              <div style={{ fontSize: 11, color: ds.ink4 }}>
                                {r.email}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* 연락처 */}
                        <td
                          style={{
                            padding: "11px 14px",
                            fontSize: 12.5,
                            color: ds.ink3,
                          }}
                        >
                          {r.phone || "—"}
                        </td>

                        {/* 가입유형 */}
                        <td style={{ padding: "11px 14px" }}>
                          <Pill color={sg.c} bg={sg.bg}>
                            {sg.l}
                          </Pill>
                        </td>

                        {/* 신청일 */}
                        <td
                          style={{
                            padding: "11px 14px",
                            fontSize: 12.5,
                            color: ds.ink3,
                          }}
                        >
                          {fmtDateShort(r.appliedAt)}
                        </td>

                        {/* 상태 */}
                        <td style={{ padding: "11px 14px" }}>
                          <Pill color={st.c} bg={st.bg}>
                            {st.l}
                          </Pill>
                        </td>

                        {/* 액션 */}
                        <td style={{ padding: "11px 10px" }}>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 3,
                            }}
                          >
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setModal({ type: "detail", item: r });
                              }}
                              style={{
                                padding: "4px 9px",
                                borderRadius: 6,
                                border: `1px solid ${ds.line}`,
                                background: ds.card,
                                fontSize: 11,
                                fontWeight: 600,
                                color: ds.ink3,
                                cursor: "pointer",
                                fontFamily: ds.ff,
                              }}
                            >
                              상세
                            </button>
                            {r.status === "APPLIED" && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleStatusChange(r.applyId, "APPROVED");
                                }}
                                style={{
                                  padding: "4px 9px",
                                  borderRadius: 6,
                                  border: "1px solid #D1FAE5",
                                  background: ds.greenSoft,
                                  fontSize: 11,
                                  fontWeight: 600,
                                  color: "#059669",
                                  cursor: "pointer",
                                  fontFamily: ds.ff,
                                }}
                              >
                                승인
                              </button>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setModal({ type: "delete", item: r });
                              }}
                              style={{
                                padding: "4px 9px",
                                borderRadius: 6,
                                border: "1px solid #FECACA60",
                                background: "#FEF2F208",
                                fontSize: 11,
                                fontWeight: 600,
                                color: ds.red,
                                cursor: "pointer",
                                fontFamily: ds.ff,
                              }}
                            >
                              삭제
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              </table>
            </div>
            )}
          </div>
        </>
      )}

      {/* ═══════ 모달들 ═══════ */}
      {modal?.type === "detail" && (
        <DetailModal
          item={modal.item}
          onClose={() => setModal(null)}
          onStatusChange={handleStatusChange}
          onDelete={(item) => setModal({ type: "delete", item })}
        />
      )}
      {modal?.type === "delete" && (
        <ConfirmModal
          title="참가자 삭제"
          msg={`"${modal.item.nickname}" 참가자를 삭제하시겠습니까?\n(행사 신청 기록만 삭제되고, 회원 계정은 유지됩니다)`}
          onConfirm={handleDelete}
          onCancel={() => setModal(null)}
        />
      )}
      {modal?.type === "bulkDelete" && (
        <ConfirmModal
          title="선택 삭제"
          msg={`선택한 ${selected.size}건의 행사 신청 기록을 삭제하시겠습니까?\n(회원 계정은 유지됩니다)`}
          onConfirm={handleBulkDelete}
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

function ParticipantCheckinPanel({ checkins }) {
  return (
    <div>
      <style>{styles}</style>
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
            borderBottom: `1px solid ${ds.line}`,
            fontSize: 14,
            fontWeight: 800,
            color: ds.ink,
          }}
        >
          체크인 내역 ({checkins.length})
        </div>
        <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 720 }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${ds.line}` }}>
              {["ID", "참가자", "행사", "방식", "체크인 시간", "게이트"].map(
                (h) => (
                  <th
                    key={h}
                    style={{
                      padding: "10px 14px",
                      fontSize: 11.5,
                      fontWeight: 700,
                      color: ds.ink4,
                      textAlign: "left",
                    }}
                  >
                    {h}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {checkins.map((r, idx) => (
              <tr
                key={r.id || idx}
                style={{ borderBottom: `1px solid ${ds.lineSoft}` }}
              >
                <td
                  style={{
                    padding: "10px 14px",
                    fontSize: 12.5,
                    color: ds.ink4,
                    fontFamily: "monospace",
                  }}
                >
                  {r.participantId || "-"}
                </td>
                <td
                  style={{
                    padding: "10px 14px",
                    fontSize: 13,
                    fontWeight: 700,
                    color: ds.ink,
                  }}
                >
                  {r.name || "-"}
                </td>
                <td
                  style={{
                    padding: "10px 14px",
                    fontSize: 12.5,
                    color: ds.ink3,
                  }}
                >
                  {r.event || "-"}
                </td>
                <td
                  style={{
                    padding: "10px 14px",
                    fontSize: 12.5,
                    color: ds.ink3,
                  }}
                >
                  {r.method || "-"}
                </td>
                <td
                  style={{
                    padding: "10px 14px",
                    fontSize: 12.5,
                    color: ds.ink3,
                  }}
                >
                  {r.time || "-"}
                </td>
                <td
                  style={{
                    padding: "10px 14px",
                    fontSize: 12.5,
                    color: ds.ink3,
                  }}
                >
                  {r.gate || "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}

function ParticipantSessionPanel({ sessions }) {
  return (
    <div>
      <style>{styles}</style>
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
            borderBottom: `1px solid ${ds.line}`,
            fontSize: 14,
            fontWeight: 800,
            color: ds.ink,
          }}
        >
          체험 세션 참여 이력 ({sessions.length})
        </div>
        <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 760 }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${ds.line}` }}>
              {["참가자", "반려견", "세션", "호출", "시작", "종료", "결과"].map(
                (h) => (
                  <th
                    key={h}
                    style={{
                      padding: "10px 14px",
                      fontSize: 11.5,
                      fontWeight: 700,
                      color: ds.ink4,
                      textAlign: "left",
                    }}
                  >
                    {h}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {sessions.map((r, idx) => (
              <tr
                key={r.id || idx}
                style={{ borderBottom: `1px solid ${ds.lineSoft}` }}
              >
                <td
                  style={{
                    padding: "10px 14px",
                    fontSize: 13,
                    fontWeight: 700,
                    color: ds.ink,
                  }}
                >
                  {r.participant || "-"}
                </td>
                <td
                  style={{
                    padding: "10px 14px",
                    fontSize: 12.5,
                    color: ds.ink3,
                  }}
                >
                  {r.pet || "-"}
                </td>
                <td
                  style={{
                    padding: "10px 14px",
                    fontSize: 12.5,
                    color: ds.ink3,
                  }}
                >
                  {r.session || "-"}
                </td>
                <td
                  style={{
                    padding: "10px 14px",
                    fontSize: 12.5,
                    color: ds.ink3,
                  }}
                >
                  {r.callTime || "-"}
                </td>
                <td
                  style={{
                    padding: "10px 14px",
                    fontSize: 12.5,
                    color: ds.ink3,
                  }}
                >
                  {r.startTime || "-"}
                </td>
                <td
                  style={{
                    padding: "10px 14px",
                    fontSize: 12.5,
                    color: ds.ink3,
                  }}
                >
                  {r.endTime || "-"}
                </td>
                <td
                  style={{
                    padding: "10px 14px",
                    fontSize: 12.5,
                    color: ds.ink3,
                  }}
                >
                  {r.result || "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}
