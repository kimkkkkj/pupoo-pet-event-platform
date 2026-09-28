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
import { Toast, Overlay, ConfirmModal, Checkbox, StatCard, EmptyState } from "../shared/adminUi";
import EventPicker from "../shared/EventPicker";

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

/* ── 상태 매핑 ── */
const REG_STATUS = {
  APPLIED: { l: "대기", c: ds.amber, bg: ds.amberSoft },
  APPROVED: { l: "승인", c: ds.green, bg: ds.greenSoft },
  CANCELLED: { l: "취소", c: ds.red, bg: ds.redSoft },
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
            style={{ fontSize: 16, fontWeight: 700, color: ds.ink, margin: 0 }}
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
                fontWeight: 700,
                color: ds.brand,
                flexShrink: 0,
              }}
            >
              {(item.nickname || "?")[0]}
            </div>
            <div style={{ flex: 1, width: isCompact ? "100%" : "auto" }}>
              <div style={{ fontSize: 17, fontWeight: 700, color: ds.ink }}>
                {item.nickname}
              </div>
              <div style={{ fontSize: 12, color: ds.ink4, marginTop: 2 }}>
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
                  color: ds.green,
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
        <EventPicker
          events={events}
          loading={loadingEvents}
          showFilter
          onSelect={selectEvent}
          actionLabel="참가자 관리"
          icon={Users}
          isMobile={isMobile}
        />
      )}

      {/* ═══════ VIEW 2: 참가자 테이블 ═══════ */}
      {selectedEvent && (
        <>
          {/* 헤더 */}
          <div style={{ marginBottom: 16 }}>
            <button
              type="button"
              onClick={goBack}
              className="adm-back-btn" style={{ marginBottom: 12 }}
            >
              <ChevronLeft size={16} strokeWidth={2.5} /> 행사 목록으로
            </button>
            <div style={{ display: "flex", alignItems: isCompact ? "flex-start" : "center", gap: 12, flexWrap: "wrap" }}>
              <h3
                style={{
                  fontSize: 17,
                  fontWeight: 700,
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
              color={ds.green}
            />
            <StatCard
              icon={Clock}
              label="대기 중"
              value={applied}
              color={ds.amber}
            />
            <StatCard
              icon={Clipboard}
              label="취소/거절"
              value={total - approved - applied}
              color={ds.red}
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
                <span style={{ fontSize: 14, fontWeight: 700, color: ds.ink }}>
                  참가자 목록
                </span>
                <span
                  style={{
                    fontSize: 12.5,
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
                      border: `1px solid ${ds.red}`,
                      background: ds.red,
                      fontSize: 12,
                      fontWeight: 600,
                      color: "#fff",
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
                  <EmptyState icon={Users} title="참가자 목록이 없습니다" description="검색 조건에 맞는 참가 신청자가 없습니다." />
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
                              fontWeight: 700,
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
                                fontSize: 12.5,
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
                            <span style={{ fontSize: 12, color: ds.ink4, fontWeight: 700 }}>연락처</span>
                            <span style={{ fontSize: 12.5, color: ds.ink3, whiteSpace: "normal", wordBreak: "keep-all", overflowWrap: "break-word" }}>
                              {r.phone || "-"}
                            </span>
                          </div>
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8 }}>
                            <div style={{ display: "grid", gap: 4, minWidth: 0 }}>
                              <span style={{ fontSize: 12, color: ds.ink4, fontWeight: 700 }}>가입유형</span>
                              <div><Pill color={sg.c} bg={sg.bg}>{sg.l}</Pill></div>
                            </div>
                            <div style={{ display: "grid", gap: 4, minWidth: 0 }}>
                              <span style={{ fontSize: 12, color: ds.ink4, fontWeight: 700 }}>신청일</span>
                              <span style={{ fontSize: 12.5, color: ds.ink3 }}>{fmtDateShort(r.appliedAt)}</span>
                            </div>
                          </div>
                          <div style={{ display: "grid", gap: 4 }}>
                            <span style={{ fontSize: 12, color: ds.ink4, fontWeight: 700 }}>상태</span>
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
                                color: ds.green,
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
                              border: `1px solid ${ds.line}`,
                              background: "transparent",
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
                        fontSize: 12.5,
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
                      style={{ padding: 0, textAlign: "center" }}
                    >
                      <EmptyState icon={Users} title="참가자가 없습니다" description="아직 이 행사에 신청한 회원이 없습니다." />
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
                                fontWeight: 700,
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
                              <div style={{ fontSize: 12, color: ds.ink4 }}>
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
                                fontSize: 12,
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
                                  fontSize: 12,
                                  fontWeight: 600,
                                  color: ds.green,
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
                                border: `1px solid ${ds.line}`,
                                background: "transparent",
                                fontSize: 12,
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
            fontWeight: 700,
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
                      fontSize: 12.5,
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
            fontWeight: 700,
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
                      fontSize: 12.5,
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
