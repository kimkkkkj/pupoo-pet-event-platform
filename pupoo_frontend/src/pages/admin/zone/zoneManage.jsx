import { useState, useEffect, useRef } from "react";
import { Plus, X, Pencil, Trash2, ChevronDown, ChevronLeft, Layers, Users, Clock, AlertTriangle, Check, CalendarDays, MapPin, ArrowRight, ImagePlus, Store } from "lucide-react";
import ds, { statusMap } from "../shared/designTokens";
import { Pill } from "../shared/Components";
import { injectEventImages, loadImageCache } from "../shared/eventImageStore";
import {
  setBoothImage,
  getBoothImage,
  loadBoothImageCache,
} from "../shared/boothImageStore";
import { axiosInstance } from "../../../app/http/axiosInstance";
import { getToken } from "../../../api/noticeApi";
import { sortAdminEventsByOperationalPriority } from "../shared/adminStatus";
import { resolveImageUrl } from "../../../shared/utils/publicAssetUrl";
import { Toast, Overlay, ConfirmModal, Checkbox, Field, StatCard, EmptyState, FormSheet, Button, DocCover, DocProp, IconButton } from "../shared/adminUi";
import EventPicker from "../shared/EventPicker";

const styles = `
.card-manage-btn:active,.card-manage-btn:focus,.card-manage-btn:focus-visible{outline:none!important;box-shadow:none!important;-webkit-tap-highlight-color:transparent;}
.ev-card-ended { opacity:0.42 !important; filter:grayscale(0.6) !important; pointer-events:none !important; }
.ev-card-ended img { filter:blur(2px) !important; }
.ev-card-ended .card-manage-btn { background:rgba(255,255,255,0.12) !important; color:rgba(255,255,255,0.35) !important; cursor:not-allowed !important; }
@keyframes toastIn{from{opacity:0;transform:translateY(-12px)}to{opacity:1;transform:translateY(0)}}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes slideUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
@keyframes rowFadeOut{from{opacity:1;transform:translateX(0)}to{opacity:0;transform:translateX(-30px)}}
@keyframes spin{to{transform:rotate(360deg)}}
.row-removing{animation:rowFadeOut .3s ease forwards}
`;

/* ═══ 공통 ═══ */
const authHeaders = () => {
  const t = getToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
};
const inputStyle = {
  width: "100%",
  padding: "10px 14px",
  borderRadius: 9,
  border: `1.5px solid ${ds.line}`,
  fontSize: 13.5,
  fontFamily: ds.ff,
  color: ds.ink,
  outline: "none",
  boxSizing: "border-box",
  transition: "border-color .15s",
  background: ds.bg,
};
const inputFocus = (e) => {
  e.target.style.borderColor = ds.brand;
};
const inputBlur = (e) => {
  e.target.style.borderColor = ds.line;
};

const BOOTH_TYPES = [
  { v: "BOOTH_EXPERIENCE", l: "체험" },
  { v: "BOOTH_COMPANY", l: "기업" },
  { v: "BOOTH_FOOD", l: "푸드" },
  { v: "BOOTH_SALE", l: "판매" },
  { v: "BOOTH_INFO", l: "안내" },
  { v: "BOOTH_SPONSOR", l: "스폰서" },
  { v: "ETC", l: "기타" },
];
const ZONES = [
  { v: "ZONE_A", l: "A구역" },
  { v: "ZONE_B", l: "B구역" },
  { v: "ZONE_C", l: "C구역" },
  { v: "OTHER", l: "기타" },
];
const STATUSES = [
  { v: "OPEN", l: "운영 중" },
  { v: "CLOSED", l: "종료" },
  { v: "PAUSED", l: "일시중단" },
];
// 등록 폼에는 없지만 백엔드에 있는 유형도 한글로 보여준다.
const EXTRA_TYPE_LABELS = { SESSION_ROOM: "세션룸", CONTEST_ZONE: "콘테스트존", STAGE: "무대" };
const typeLabel = (v) => BOOTH_TYPES.find((t) => t.v === v)?.l || EXTRA_TYPE_LABELS[v] || v;
const zoneLabel = (v) => ZONES.find((z) => z.v === v)?.l || v;
const statusLabel = (v) => STATUSES.find((s) => s.v === v)?.l || v;
const statusColor = (v) =>
  v === "OPEN"
    ? { c: ds.green, bg: ds.greenSoft }
    : v === "PAUSED"
      ? { c: ds.amber, bg: ds.amberSoft }
      : { c: ds.ink4, bg: ds.lineSoft };

/* ═══ 부스 등록/수정 (문서형) ═══ */
function BoothFormModal({ item, onSave, onClose, isEdit, eventName }) {
  const [form, setForm] = useState(
    item
      ? { ...item }
      : {
          placeName: "",
          type: "BOOTH_EXPERIENCE",
          description: "",
          company: "",
          zone: "ZONE_A",
          status: "OPEN",
        },
  );
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));
  const [err, setErr] = useState("");
  const [imgPreview, setImgPreview] = useState(
    item?.boothId ? getBoothImage(item.boothId) : null,
  );

  const handleSave = () => {
    if (!form.placeName?.trim()) {
      setErr("체험존 이름을 입력해 주세요.");
      return;
    }
    onSave(form, imgPreview);
  };

  return (
    <FormSheet
      title={`${eventName ? `${eventName} · ` : ""}${isEdit ? "체험존 수정" : "새 체험존"}`}
      onClose={onClose}
      width={880}
      bare
      footer={
        <>
          <Button onClick={onClose}>취소</Button>
          <Button variant="primary" icon={Check} onClick={handleSave}>
            {isEdit ? "수정 완료" : "체험존 등록"}
          </Button>
        </>
      }
    >
      <DocCover
        preview={imgPreview}
        onFile={(file, url) => { setImgPreview(url); setErr(""); }}
        onRemove={() => setImgPreview(null)}
        onError={setErr}
        emptyTitle="체험존 사진을 추가하세요"
      />
      {err && (
        <div role="alert" style={{ marginTop: 16, background: ds.redSoft, borderRadius: 8, padding: "10px 14px", fontSize: 13, color: ds.red, display: "flex", alignItems: "center", gap: 8 }}>
          <AlertTriangle size={14} /> {err}
        </div>
      )}
      <input
        className="adm-doc-title"
        value={form.placeName}
        maxLength={100}
        onChange={(e) => set("placeName", e.target.value)}
        placeholder="체험존 이름"
        aria-label="장소명"
        autoFocus
      />
      <div className="adm-doc-props">
        <DocProp icon={Store} label="업체">
          <input
            className="adm-doc-inline"
            value={form.company || ""}
            onChange={(e) => set("company", e.target.value)}
            placeholder="비어 있음 · 운영 업체명"
            aria-label="업체명"
          />
        </DocProp>
        <DocProp icon={Layers} label="유형" required>
          <select className="adm-doc-inline" value={form.type} onChange={(e) => set("type", e.target.value)} aria-label="유형">
            {BOOTH_TYPES.map((t) => (
              <option key={t.v} value={t.v}>{t.l}</option>
            ))}
          </select>
        </DocProp>
        <DocProp icon={MapPin} label="구역" required>
          <select className="adm-doc-inline" value={form.zone} onChange={(e) => set("zone", e.target.value)} aria-label="구역">
            {ZONES.map((z) => (
              <option key={z.v} value={z.v}>{z.l}</option>
            ))}
          </select>
        </DocProp>
        <DocProp icon={Clock} label="상태">
          <select className="adm-doc-inline" value={form.status} onChange={(e) => set("status", e.target.value)} aria-label="상태">
            {STATUSES.map((s) => (
              <option key={s.v} value={s.v}>{s.l}</option>
            ))}
          </select>
        </DocProp>
      </div>
      <textarea
        className="adm-doc-body"
        value={form.description || ""}
        onChange={(e) => set("description", e.target.value)}
        placeholder="체험 내용, 이용 방법, 준비물 등을 적어 주세요"
        aria-label="설명"
        rows={8}
      />
    </FormSheet>
  );
}

/* ═══ 부스 상세 모달 ═══ */
function BoothDetailModal({ item, onClose, onEdit, onDelete }) {
  const sc = statusColor(item.status);
  return (
    <Overlay onClose={onClose}>
      <div style={{ padding: "28px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 20,
          }}
        >
          <h3
            style={{ fontSize: 16, fontWeight: 700, color: ds.ink, margin: 0 }}
          >
            체험존 상세
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
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 14,
            }}
          >
            <span
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: ds.ink4,
              }}
            >
              #{item.boothId}
            </span>
            <Pill color={sc.c} bg={sc.bg}>
              {statusLabel(item.status)}
            </Pill>
          </div>
          <h4
            style={{
              fontSize: 17,
              fontWeight: 700,
              color: ds.ink,
              margin: "0 0 14px",
            }}
          >
            {item.placeName}
          </h4>
          {[
            { l: "유형", v: typeLabel(item.type) },
            { l: "구역", v: zoneLabel(item.zone) },
            { l: "업체", v: item.company || "-" },
          ].map((r) => (
            <div
              key={r.l}
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "9px 0",
                borderBottom: `1px solid ${ds.line}`,
              }}
            >
              <span style={{ fontSize: 13, color: ds.ink3 }}>{r.l}</span>
              <span style={{ fontSize: 13, color: ds.ink, fontWeight: 600 }}>
                {r.v}
              </span>
            </div>
          ))}
          {item.description && (
            <div style={{ marginTop: 14 }}>
              <span style={{ fontSize: 12, color: ds.ink4, fontWeight: 600 }}>
                설명
              </span>
              <p
                style={{
                  fontSize: 13,
                  color: ds.ink3,
                  lineHeight: 1.6,
                  marginTop: 6,
                }}
              >
                {item.description}
              </p>
            </div>
          )}
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
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
            }}
          >
            <Trash2 size={13} /> 삭제
          </button>
          <button
            onClick={() => {
              onClose();
              onEdit(item);
            }}
            style={{
              padding: "9px 16px",
              borderRadius: 8,
              border: "none",
              background: ds.brand,
              color: "#fff",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: ds.ff,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Pencil size={13} /> 수정하기
          </button>
        </div>
      </div>
    </Overlay>
  );
}

/* ═══ 메인 ═══ */
export default function ZoneManage({ subTab = "all" }) {
  const [viewportWidth, setViewportWidth] = useState(() =>
    typeof window === "undefined" ? 1440 : window.innerWidth,
  );
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [booths, setBooths] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [loadingBooths, setLoadingBooths] = useState(false);
  const [modal, setModal] = useState(null);
  const [panel, setPanel] = useState(null);
  const [toast, setToast] = useState(null);
  const [removing, setRemoving] = useState(null);
  const [selected, setSelected] = useState(new Set());
  const showToast = (msg, type = "success") => setToast({ msg, type });
  const isMobile = viewportWidth < 768;

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const syncViewport = () => setViewportWidth(window.innerWidth);
    syncViewport();
    window.addEventListener("resize", syncViewport);
    return () => window.removeEventListener("resize", syncViewport);
  }, []);
  // eventFilter는 Dashboard subTab으로 대체
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
        params: { sort: "eventId,desc", size: 500 },
      });
      const list = res.data?.data || res.data || [];
      const mapped = injectEventImages(list).map((e) => ({
        ...e,
        status: calcStatus(
          e.startAt || e.date?.split("~")[0]?.trim()?.replace(/\./g, "-"),
          e.endAt || e.date?.split("~")[1]?.trim()?.replace(/\./g, "-"),
        ),
      }));
      setEvents(sortAdminEventsByOperationalPriority(mapped));
    } catch {
      setEvents([]);
    } finally {
      setLoadingEvents(false);
    }
  };
  const loadBooths = async (eventId) => {
    setLoadingBooths(true);
    try {
      const res = await axiosInstance.get(
        `/api/admin/dashboard/events/${eventId}/booths`,
        { headers: authHeaders() },
      );
      setBooths(
        (res.data?.data || res.data || []).map((b) => ({
          ...b,
          id: b.boothId,
        })),
      );
    } catch {
      setBooths([]);
    } finally {
      setLoadingBooths(false);
    }
  };
  useEffect(() => {
    loadEvents();
  }, []);

  const selectEvent = (ev) => {
    setSelectedEvent(ev);
    setSelected(new Set());
    loadBooths(ev.eventId || ev.id);
  };
  const goBack = () => {
    setSelectedEvent(null);
    setBooths([]);
    setSelected(new Set());
    setPanel(null);
  };
  const evId = () => selectedEvent?.eventId || selectedEvent?.id;

  const handleCreate = async (form, imgPreview) => {
    try {
      const res = await axiosInstance.post(
        "/api/admin/dashboard/booths",
        { eventId: Number(evId()), ...form },
        { headers: authHeaders() },
      );
      const newBoothId = res.data?.data?.boothId ?? res.data?.boothId;
      if (newBoothId && imgPreview) setBoothImage(newBoothId, imgPreview);
      await loadBooths(evId());
      setPanel(null);
      showToast("체험존이 등록되었습니다.");
    } catch {
      showToast("등록 실패", "error");
    }
  };
  const handleUpdate = async (form, imgPreview) => {
    try {
      await axiosInstance.patch(
        `/api/admin/dashboard/booths/${form.boothId}`,
        form,
        { headers: authHeaders() },
      );
      if (form.boothId) setBoothImage(form.boothId, imgPreview ?? null);
      await loadBooths(evId());
      setPanel(null);
      showToast("체험존이 수정되었습니다.");
    } catch {
      showToast("수정 실패", "error");
    }
  };
  const handleDelete = async () => {
    const item = modal.item;
    setModal(null);
    setRemoving(item.boothId);
    try {
      await axiosInstance.delete(
        `/api/admin/dashboard/booths/${item.boothId}`,
        { headers: authHeaders() },
      );
      setTimeout(async () => {
        await loadBooths(evId());
        setRemoving(null);
        showToast("삭제되었습니다.");
      }, 300);
    } catch {
      setRemoving(null);
      showToast("삭제 실패", "error");
    }
  };
  const handleBulkDelete = async () => {
    const ids = [...selected];
    setModal(null);
    try {
      await axiosInstance.post(
        "/api/admin/dashboard/booths/bulk-delete",
        { boothIds: ids.map(Number) },
        { headers: authHeaders() },
      );
      await loadBooths(evId());
      setSelected(new Set());
      showToast(`${ids.length}건 삭제`);
    } catch {
      showToast("일괄 삭제 실패", "error");
    }
  };

  const handleDeleteAll = async () => {
    const eventId =
      selectedEvent.eventId || selectedEvent.id?.replace("EV-", "");
    setModal(null);
    try {
      const zoneIds = rows.map(
        (r) => r.zoneId || Number(String(r.id).replace("ZN-", "")),
      );
      for (const zid of zoneIds) {
        await axiosInstance.delete(`/api/admin/dashboard/zones/${zid}`, {
          headers: authHeaders(),
        });
      }
      await loadZones(eventId);
      setSelected(new Set());
      showToast(`${rows.length}건이 전체 삭제되었습니다.`);
    } catch (err) {
      showToast("전체 삭제 실패", "error");
    }
  };

  const rows = booths;
  const isAllSelected =
    rows.length > 0 && rows.every((r) => selected.has(r.boothId));
  const hasSelected = selected.size > 0;
  const toggleAll = () => {
    if (isAllSelected) setSelected(new Set());
    else setSelected(new Set(rows.map((r) => r.boothId)));
  };
  const toggleOne = (id) => {
    setSelected((p) => {
      const n = new Set(p);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  return (
    <div>
      <style>{styles}</style>
      {!selectedEvent && (
        <EventPicker
          events={events}
          loading={loadingEvents}
          filter={subTab}
          onSelect={selectEvent}
          actionLabel="체험존 관리"
          icon={Layers}
          isMobile={isMobile}
        />
      )}

      {selectedEvent && (
        <>
          <div style={{ marginBottom: 16 }}>
            <button
              type="button"
              onClick={goBack}
              className="adm-back-btn" style={{ marginBottom: 14 }}
            >
              <ChevronLeft size={16} strokeWidth={2.5} /> 행사 목록으로
            </button>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
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
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "repeat(2, minmax(0, 1fr))" : "repeat(3, 1fr)",
              gap: 12,
              marginBottom: 16,
            }}
          >
            <StatCard
              icon={Layers}
              label="전체 체험존"
              value={booths.length}
              color={ds.brand}
            />
            <StatCard
              icon={Clock}
              label="운영 중"
              value={booths.filter((b) => b.status === "OPEN").length}
              color={ds.green}
            />
            <StatCard
              icon={Users}
              label="일시중단"
              value={booths.filter((b) => b.status === "PAUSED").length}
              color={ds.amber}
            />
          </div>

          <div
            style={{
              background: ds.bg,
              borderRadius: 12,
              border: `1px solid ${ds.line}`,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: isMobile ? "14px" : "12px 18px",
                display: "flex",
                flexDirection: isMobile ? "column" : "row",
                alignItems: isMobile ? "stretch" : "center",
                justifyContent: "space-between",
                borderBottom: `1px solid ${ds.line}`,
                gap: isMobile ? 12 : 8,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", minWidth: 0 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: ds.ink }}>
                  체험존 목록
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
                  {rows.length}
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
              <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", width: isMobile ? "100%" : "auto" }}>
                {hasSelected && (
                  <button
                    onClick={() => setModal({ type: "bulkDelete" })}
                    style={{
                      display: "flex",
                      alignItems: "center",
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
                    }}
                  >
                    <Trash2 size={12} /> 선택 삭제
                  </button>
                )}
                {rows.length > 0 && (
                  <button
                    onClick={() => setModal({ type: "deleteAll" })}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      padding: "6px 12px",
                      borderRadius: 7,
                      border: `1px solid ${ds.line}`,
                      background: ds.bg,
                      fontSize: 12,
                      fontWeight: 600,
                      color: ds.ink3,
                      cursor: "pointer",
                      fontFamily: ds.ff,
                    }}
                  >
                    <Trash2 size={12} /> 전체 삭제
                  </button>
                )}
                <button
                  onClick={() => setPanel({ type: "create" })}
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
                    width: isMobile ? "100%" : "auto",
                    justifyContent: "center",
                  }}
                >
                  <Plus size={13} strokeWidth={2.5} /> 체험존 등록
                </button>
              </div>
            </div>
            {isMobile ? (
              <div style={{ display: "flex", flexDirection: "column" }}>
                {loadingBooths ? (
                  <div style={{ padding: "40px 14px", textAlign: "center", fontSize: 13, color: ds.ink4 }}>
                    로딩 중입니다.
                  </div>
                ) : rows.length === 0 ? (
                  <EmptyState icon={Layers} title="등록된 체험존이 없습니다" description="오른쪽 위 '체험존 등록'으로 추가해 보세요." />
                ) : (
                  rows.map((r) => {
                    const sc = statusColor(r.status);
                    const isChecked = selected.has(r.boothId);
                    return (
                      <div
                        key={r.boothId}
                        className={removing === r.boothId ? "row-removing" : ""}
                        onClick={() => setModal({ type: "detail", item: r })}
                        style={{
                          padding: "14px",
                          borderBottom: `1px solid ${ds.lineSoft}`,
                          background: isChecked ? `${ds.brand}06` : "transparent",
                          cursor: "pointer",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", minWidth: 0 }}>
                              <span style={{ fontSize: 14, fontWeight: 700, color: ds.ink, whiteSpace: "normal", wordBreak: "keep-all", overflowWrap: "break-word" }}>
                                {r.placeName}
                              </span>
                              <Pill color={sc.c} bg={sc.bg}>
                                {statusLabel(r.status)}
                              </Pill>
                            </div>
                            <div style={{ fontSize: 12, color: ds.ink4, fontFamily: "monospace", marginTop: 4 }}>
                              #{r.boothId}
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8, marginTop: 12 }}>
                              <div style={{ minWidth: 0 }}>
                                <div style={{ fontSize: 12, color: ds.ink4, marginBottom: 3 }}>유형</div>
                                <Pill color={ds.violet} bg="#8B5CF610">
                                  {typeLabel(r.type)}
                                </Pill>
                              </div>
                              <div style={{ minWidth: 0 }}>
                                <div style={{ fontSize: 12, color: ds.ink4, marginBottom: 3 }}>구역</div>
                                <div style={{ fontSize: 12.5, color: ds.ink3, fontWeight: 600, whiteSpace: "normal", wordBreak: "keep-all", overflowWrap: "break-word" }}>
                                  {zoneLabel(r.zone)}
                                </div>
                              </div>
                              <div style={{ minWidth: 0, gridColumn: "1 / -1" }}>
                                <div style={{ fontSize: 12, color: ds.ink4, marginBottom: 3 }}>업체</div>
                                <div style={{ fontSize: 12.5, color: ds.ink3, whiteSpace: "normal", wordBreak: "keep-all", overflowWrap: "break-word" }}>
                                  {r.company || "-"}
                                </div>
                              </div>
                            </div>
                          </div>
                          <Checkbox checked={isChecked} onChange={() => toggleOne(r.boothId)} />
                        </div>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
                          {[
                            { label: "상세", fn: () => setModal({ type: "detail", item: r }), color: ds.ink3, border: ds.line, bg: ds.bg },
                            { label: "수정", fn: () => setPanel({ type: "edit", item: r }), color: ds.ink3, border: ds.line, bg: ds.bg },
                            { label: "삭제", fn: () => setModal({ type: "delete", item: r }), color: ds.red, border: ds.line, bg: "transparent" },
                          ].map((action) => (
                            <button
                              key={action.label}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                action.fn();
                              }}
                              style={{
                                flex: "1 1 0",
                                minWidth: 0,
                                padding: "8px 10px",
                                borderRadius: 8,
                                border: `1px solid ${action.border}`,
                                background: action.bg,
                                color: action.color,
                                fontSize: 12,
                                fontWeight: 700,
                                cursor: "pointer",
                                fontFamily: ds.ff,
                              }}
                            >
                              {action.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${ds.line}` }}>
                  <th style={{ width: 44, padding: "10px 14px" }}>
                    <Checkbox checked={isAllSelected} onChange={toggleAll} />
                  </th>
                  {[
                    { label: "장소명", w: "30%" },
                    { label: "유형", w: 80 },
                    { label: "구역", w: 70 },
                    { label: "업체", w: 100 },
                    { label: "상태", w: 80 },
                    { label: "", w: 176 },
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
                {loadingBooths ? (
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
                          로딩 중...
                        </span>
                      </div>
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: 0}}>
                      <EmptyState icon={Layers} title="등록된 체험존이 없습니다" description="오른쪽 위 '체험존 등록'으로 추가해 보세요." />
                    </td>
                  </tr>
                ) : (
                  rows.map((r) => {
                    const sc = statusColor(r.status);
                    const isChecked = selected.has(r.boothId);
                    return (
                      <tr
                        key={r.boothId}
                        className={removing === r.boothId ? "row-removing" : ""}
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
                            onChange={() => toggleOne(r.boothId)}
                          />
                        </td>
                        <td style={{ padding: "11px 14px" }}>
                          <div
                            style={{
                              fontSize: 13,
                              fontWeight: 700,
                              color: ds.ink,
                            }}
                          >
                            {r.placeName}
                          </div>
                          <div
                            style={{
                              fontSize: 12,
                              color: ds.ink4,
                            }}
                          >
                            #{r.boothId}
                          </div>
                        </td>
                        <td style={{ padding: "11px 14px" }}>
                          <Pill color={ds.violet} bg="#8B5CF610">
                            {typeLabel(r.type)}
                          </Pill>
                        </td>
                        <td
                          style={{
                            padding: "11px 14px",
                            fontSize: 12.5,
                            color: ds.ink3,
                            fontWeight: 600,
                          }}
                        >
                          {zoneLabel(r.zone)}
                        </td>
                        <td
                          style={{
                            padding: "11px 14px",
                            fontSize: 12.5,
                            color: ds.ink3,
                          }}
                        >
                          {r.company || "-"}
                        </td>
                        <td style={{ padding: "11px 14px" }}>
                          <Pill color={sc.c} bg={sc.bg}>
                            {statusLabel(r.status)}
                          </Pill>
                        </td>
                        <td style={{ padding: "11px 12px" }} onClick={(e) => e.stopPropagation()}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 2 }}>
                            <Button size="sm" variant="secondary" onClick={() => setModal({ type: "detail", item: r })}>
                              상세보기
                            </Button>
                            <IconButton icon={Pencil} label="수정" onClick={() => setPanel({ type: "edit", item: r })} />
                            <IconButton icon={Trash2} label="삭제" danger onClick={() => setModal({ type: "delete", item: r })} />
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
            )}
          </div>
        </>
      )}

      {panel?.type === "create" && (
        <BoothFormModal
          onSave={handleCreate}
          onClose={() => setPanel(null)}
          eventName={selectedEvent?.name || selectedEvent?.eventName}
        />
      )}
      {panel?.type === "edit" && (
        <BoothFormModal
          item={panel.item}
          isEdit
          onSave={handleUpdate}
          onClose={() => setPanel(null)}
          eventName={selectedEvent?.name || selectedEvent?.eventName}
        />
      )}
      {modal?.type === "detail" && (
        <BoothDetailModal
          item={modal.item}
          onClose={() => setModal(null)}
          onEdit={(item) => {
            setModal(null);
            setPanel({ type: "edit", item });
          }}
          onDelete={(item) => setModal({ type: "delete", item })}
        />
      )}
      {modal?.type === "delete" && (
        <ConfirmModal
          title="체험존 삭제"
          msg={`"${modal.item.placeName}" 체험존을 삭제하시겠습니까?\n삭제된 데이터는 복구할 수 없습니다.`}
          onConfirm={handleDelete}
          onCancel={() => setModal(null)}
        />
      )}
      {modal?.type === "bulkDelete" && (
        <ConfirmModal
          title="선택 삭제"
          msg={`선택한 ${selected.size}건을 삭제하시겠습니까?`}
          onConfirm={handleBulkDelete}
          onCancel={() => setModal(null)}
        />
      )}
      {modal?.type === "deleteAll" && (
        <ConfirmModal
          title="전체 삭제"
          msg={`현재 목록의 ${rows.length}건을 전체 삭제하시겠습니까?
삭제된 데이터는 복구할 수 없습니다.`}
          onConfirm={handleDeleteAll}
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
