import { useState, useEffect, useRef } from "react";
import { Plus, X, Pencil, Trash2, ChevronDown, ChevronLeft, Mic, Users, Clock, AlertTriangle, Check, CalendarDays, MapPin, ArrowRight, ImagePlus, Camera } from "lucide-react";
import ds, { statusMap } from "../shared/designTokens";
import { Pill } from "../shared/Components";
import {
  resolveAdminStatus,
  sortAdminEventsByOperationalPriority,
} from "../shared/adminStatus";
import { axiosInstance } from "../../../app/http/axiosInstance";
import { getToken } from "../../../api/noticeApi";
import { eventApi } from "../../../app/http/eventApi";
import { injectEventImages, loadImageCache } from "../shared/eventImageStore";
import {
  resolveImageUrl,
  toPublicAssetUrl,
} from "../../../shared/utils/publicAssetUrl";
import { Toast, Overlay, ConfirmModal, Checkbox, Field, StatCard, EmptyState, FormSheet, Button, IconButton, StatusBadge, DocCover, DocProp, DocDateRange } from "../shared/adminUi";
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
  background: ds.bg,
};
const inputFocus = (e) => {
  e.target.style.borderColor = ds.brand;
};
const inputBlur = (e) => {
  e.target.style.borderColor = ds.line;
};
const calcStatus = (s, e) => {
  if (!s && !e) return "pending";
  const n = new Date();
  const start = s
    ? new Date(s.includes("T") ? s : s + "T00:00:00+09:00")
    : null;
  const end = e ? new Date(e.includes("T") ? e : e + "T23:59:59+09:00") : null;
  if (end && n > end) return "ended";
  if (start && n < start) return "pending";
  return "active";
};

const SESSION_COLS = [
  { label: "상태", w: "9%" },
  { label: "세션/강연명", w: "26%" },
  { label: "일정", w: "17%" },
  { label: "연사" },
  { label: "참가자", w: 90, align: "right" },
  { label: "", w: 96 },
];
const ELLIPSIS = { whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" };
const fmtDay = (iso) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const days = ["일", "월", "화", "수", "목", "금", "토"];
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")} (${days[d.getDay()]})`;
};
const fmtTime = (iso) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

/** 연사 사진(없거나 깨지면 이름 첫 글자) */
function SpeakerAvatar({ speaker, size = 32 }) {
  const [broken, setBroken] = useState(false);
  const url = speaker?.speakerImageUrl ? resolveImageUrl(speaker.speakerImageUrl) : null;
  const box = { width: size, height: size, borderRadius: "50%", flexShrink: 0, overflow: "hidden" };
  if (url && !broken) {
    return <img src={url} alt="" data-no-fallback="1" onError={() => setBroken(true)} style={{ ...box, objectFit: "cover", border: `1px solid ${ds.line}` }} />;
  }
  return (
    <span style={{ ...box, display: "inline-flex", alignItems: "center", justifyContent: "center", background: "#2A3038", color: ds.ink2, fontSize: 13, fontWeight: 600 }}>
      {(speaker?.speakerName || "?").slice(0, 1)}
    </span>
  );
}

/* ═══ 등록/수정 (문서형) ═══ */
function SessionFormModal({ item, onSave, onClose, isEdit, eventName }) {
  const [form, setForm] = useState(
    item
      ? {
          ...item,
          startAt: item.startAt?.split("T")[0] || "",
          endAt: item.endAt?.split("T")[0] || "",
          _startTime: item.startAt?.split("T")[1] || "",
          _endTime: item.endAt?.split("T")[1] || "",
        }
      : { name: "", description: "", startAt: "", endAt: "" },
  );
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));
  const [err, setErr] = useState("");
  const [imagePreview, setImagePreview] = useState(item?.imageUrl || null);

  // 목록 API에는 일정이 없어 수정할 때 상세 API에서 날짜·시각을 채운다(저장 시 원래 시각을 유지).
  useEffect(() => {
    const pid = item?.programId;
    if (!isEdit || !pid || item?.startAt) return undefined;
    let alive = true;
    axiosInstance
      .get(`/api/programs/${pid}`)
      .then((res) => {
        const d = res.data?.data;
        if (!alive || !d) return;
        setForm((p) => ({
          ...p,
          startAt: p.startAt || d.startAt?.split("T")[0] || "",
          endAt: p.endAt || d.endAt?.split("T")[0] || "",
          _startTime: d.startAt?.split("T")[1] || "",
          _endTime: d.endAt?.split("T")[1] || "",
        }));
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [isEdit, item]);

  // 연사: 세션 하나에 한 명을 연결한다(백엔드가 세션당 연사 한 명만 유지).
  const [speaker, setSpeaker] = useState({ speakerId: null, name: "", bio: "", imageUrl: null, file: null, preview: null });
  const setSp = (k, v) => setSpeaker((p) => ({ ...p, [k]: v }));
  const [speakerLoading, setSpeakerLoading] = useState(Boolean(isEdit));
  const photoRef = useRef(null);

  useEffect(() => {
    const pid = item?.programId || item?.id;
    if (!isEdit || !pid) return undefined;
    let alive = true;
    axiosInstance
      .get(`/api/programs/${pid}/speakers`, { headers: authHeaders() })
      .then((res) => {
        const sp = (res.data?.data || [])[0];
        if (alive && sp) {
          setSpeaker({
            speakerId: sp.speakerId,
            name: sp.speakerName || "",
            bio: sp.speakerBio || "",
            imageUrl: sp.speakerImageUrl || null,
            file: null,
            preview: sp.speakerImageUrl ? resolveImageUrl(sp.speakerImageUrl) : null,
          });
        }
      })
      .catch(() => {})
      .finally(() => alive && setSpeakerLoading(false));
    return () => {
      alive = false;
    };
  }, [isEdit, item]);

  const pickPhoto = (file) => {
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > 10 * 1024 * 1024) {
      setErr("연사 사진은 10MB 이하 이미지만 올릴 수 있어요.");
      return;
    }
    const r = new FileReader();
    r.onload = (e) => setSpeaker((p) => ({ ...p, file, preview: e.target.result, removed: false }));
    r.readAsDataURL(file);
  };

  const handleSave = () => {
    if (!form.name?.trim()) {
      setErr("세션/강연 이름을 입력해 주세요.");
      return;
    }
    if (!form.startAt || !form.endAt) {
      setErr("일정의 시작일과 종료일을 모두 선택해 주세요.");
      return;
    }
    if (form.endAt < form.startAt) {
      setErr("종료일은 시작일과 같거나 뒤여야 해요.");
      return;
    }
    if (!speaker.name.trim() && (speaker.file || speaker.bio.trim())) {
      setErr("연사 사진이나 소개를 넣으려면 연사 이름도 입력해 주세요.");
      return;
    }
    onSave({ ...form, imageUrl: imagePreview, speaker });
  };
  const hasDates = Boolean(form.startAt || form.endAt);

  return (
    <FormSheet
      title={`${eventName ? `${eventName} · ` : ""}${isEdit ? "세션 수정" : "새 세션/강연"}`}
      onClose={onClose}
      width={880}
      bare
      footer={
        <>
          <Button onClick={onClose}>취소</Button>
          <Button variant="primary" icon={Check} onClick={handleSave}>
            {isEdit ? "수정 완료" : "세션 등록"}
          </Button>
        </>
      }
    >
      <DocCover
        preview={imagePreview}
        onFile={(file, url) => { setImagePreview(url); setErr(""); }}
        onRemove={() => setImagePreview(null)}
        onError={setErr}
        emptyTitle="세션 대표 이미지를 추가하세요"
      />
      {err && (
        <div role="alert" style={{ marginTop: 16, background: ds.redSoft, borderRadius: 8, padding: "10px 14px", fontSize: 13, color: ds.red, display: "flex", alignItems: "center", gap: 8 }}>
          <AlertTriangle size={14} /> {err}
        </div>
      )}
      <input
        className="adm-doc-title"
        value={form.name}
        maxLength={100}
        onChange={(e) => set("name", e.target.value)}
        placeholder="세션/강연 이름"
        aria-label="세션/강연명"
        autoFocus
      />
      <div className="adm-doc-props">
        <DocProp icon={CalendarDays} label="일정" required>
          <DocDateRange start={form.startAt} end={form.endAt} onStart={(v) => { set("startAt", v); setErr(""); }} onEnd={(v) => { set("endAt", v); setErr(""); }} />
        </DocProp>
        <DocProp icon={Clock} label="상태">
          <div style={{ display: "flex", alignItems: "center", gap: 8, minHeight: 36 }}>
            {hasDates ? <StatusBadge status={calcStatus(form.startAt, form.endAt)} /> : null}
            <span style={{ fontSize: 13, color: ds.ink4 }}>일정에 따라 자동으로 정해져요</span>
          </div>
        </DocProp>
      </div>

      {/* 연사 */}
      <div style={{ marginTop: 22 }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 10 }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 600, color: ds.ink }}>
            <Mic size={15} color={ds.ink3} /> 연사
          </span>
          <span style={{ fontSize: 12.5, color: ds.ink4 }}>세션마다 연사 한 명을 연결할 수 있어요</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16, padding: 16, borderRadius: 12, background: ds.card, border: `1px solid ${ds.line}` }}>
          <button
            type="button"
            onClick={() => photoRef.current?.click()}
            aria-label={speaker.preview ? "연사 사진 변경" : "연사 사진 올리기"}
            style={{
              position: "relative",
              width: 76,
              height: 76,
              flexShrink: 0,
              borderRadius: "50%",
              overflow: "hidden",
              border: speaker.preview ? `1px solid ${ds.line}` : "1px dashed #3A424C",
              background: ds.bg,
              cursor: "pointer",
              padding: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {speaker.preview ? (
              <img src={speaker.preview} alt="연사 사진" data-no-fallback="1" onError={() => setSpeaker((p) => ({ ...p, preview: null }))} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
            ) : (
              <span style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, color: ds.ink4, fontSize: 11.5 }}>
                <Camera size={18} />
                사진
              </span>
            )}
          </button>
          <input
            ref={photoRef}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={(e) => {
              pickPhoto(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
          <div style={{ flex: 1, minWidth: 0, display: "grid", gap: 4 }}>
            <input
              className="adm-doc-inline"
              value={speaker.name}
              onChange={(e) => setSp("name", e.target.value)}
              placeholder={speakerLoading ? "연사 정보를 불러오는 중..." : "연사 이름"}
              aria-label="연사 이름"
              maxLength={50}
              style={{ fontWeight: 600 }}
            />
            <input
              className="adm-doc-inline"
              value={speaker.bio}
              onChange={(e) => setSp("bio", e.target.value)}
              placeholder="한 줄 소개 (선택) · 예: 반려동물 행동 교정 전문가"
              aria-label="연사 소개"
              maxLength={200}
            />
          </div>
          {speaker.preview ? (
            <IconButton icon={Trash2} label="연사 사진 빼기" danger onClick={() => setSpeaker((p) => ({ ...p, file: null, preview: null, removed: true }))} />
          ) : null}
        </div>
      </div>

      <textarea
        className="adm-doc-body"
        value={form.description || ""}
        onChange={(e) => set("description", e.target.value)}
        placeholder="강연 주제, 진행 방식, 대상 등을 적어 주세요"
        aria-label="설명"
        rows={8}
      />
    </FormSheet>
  );
}

/* ═══ 메인 ═══ */
export default function SessionManage({ subTab = "all" }) {
  const [viewportWidth, setViewportWidth] = useState(() =>
    typeof window === "undefined" ? 1440 : window.innerWidth,
  );
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [items, setItems] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [loadingItems, setLoadingItems] = useState(false);
  const [modal, setModal] = useState(null);
  const [panel, setPanel] = useState(null);
  const [toast, setToast] = useState(null);
  const [removing, setRemoving] = useState(null);
  const [selected, setSelected] = useState(new Set());
  const isMobile = viewportWidth < 768;
  // eventFilter는 Dashboard subTab으로 대체
  const imageMapRef = useRef({});
  const showToast = (msg, type = "success") => setToast({ msg, type });

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const syncViewport = () => setViewportWidth(window.innerWidth);
    syncViewport();
    window.addEventListener("resize", syncViewport);
    return () => window.removeEventListener("resize", syncViewport);
  }, []);

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
        imageUrl: e.imageUrl ? toPublicAssetUrl(e.imageUrl) : null,
        status: resolveAdminStatus(
          e,
          calcStatus(
            e.startAt || e.date?.split("~")[0]?.trim()?.replace(/\./g, "-"),
            e.endAt || e.date?.split("~")[1]?.trim()?.replace(/\./g, "-"),
          ),
        ),
      }));
      setEvents(sortAdminEventsByOperationalPriority(mapped));
    } catch {
      setEvents([]);
    } finally {
      setLoadingEvents(false);
    }
  };
  const loadItems = async (eventId) => {
    setLoadingItems(true);
    try {
      const res = await axiosInstance.get(
        `/api/admin/dashboard/events/${eventId}/programs?category=SESSION`,
        { headers: authHeaders() },
      );
      // 목록 API에는 일정·연사가 없어 세션마다 상세·연사 API로 채운다.
      const list = res.data?.data || res.data || [];
      const raw = await Promise.all(
        list.map(async (p) => {
          const pid = p.programId || p.id;
          const [detailRes, speakerRes] = await Promise.all([
            axiosInstance.get(`/api/programs/${pid}`).catch(() => null),
            axiosInstance.get(`/api/programs/${pid}/speakers`).catch(() => null),
          ]);
          const d = detailRes?.data?.data || {};
          const startAt = d.startAt || p.startAt || null;
          const endAt = d.endAt || p.endAt || null;
          return {
            ...p,
            startAt,
            endAt,
            speaker: (speakerRes?.data?.data || [])[0] || null,
            status: resolveAdminStatus(p, calcStatus(startAt, endAt)),
            imageUrl: imageMapRef.current[pid] || p.imageUrl || null,
          };
        }),
      );
      /* 최신 등록순 */
      raw.sort(
        (a, b) =>
          (Number(b.programId || b.id) || 0) -
          (Number(a.programId || a.id) || 0),
      );
      setItems(raw);
    } catch {
      setItems([]);
    } finally {
      setLoadingItems(false);
    }
  };
  useEffect(() => {
    loadEvents();
  }, []);

  const selectEvent = (ev) => {
    setSelectedEvent(ev);
    setSelected(new Set());
    loadItems(ev.eventId || ev.id);
  };
  const goBack = () => {
    setSelectedEvent(null);
    setItems([]);
    setSelected(new Set());
    setPanel(null);
  };
  const evId = () => selectedEvent?.eventId || selectedEvent?.id;

  // 세션에 연결할 연사를 저장한다. 사진은 먼저 업로드해 주소를 받고, 기존 연사는 수정·새 연사는 등록한다.
  const saveSessionSpeaker = async (programId, sp) => {
    if (!programId || !sp || !sp.name?.trim()) return;
    let imageUrl = sp.removed ? null : sp.imageUrl || null;
    if (sp.file) {
      const fd = new FormData();
      fd.append("file", sp.file);
      const up = await eventApi.uploadAdminPoster(fd, { headers: authHeaders() });
      imageUrl = up.data?.data?.imageUrl || up.data?.imageUrl || imageUrl;
    }
    const body = {
      programId,
      speakerName: sp.name.trim(),
      speakerBio: sp.bio?.trim() || "",
      speakerImageUrl: imageUrl,
    };
    if (sp.speakerId) {
      await axiosInstance.patch(`/api/admin/speakers/${sp.speakerId}`, body, { headers: authHeaders() });
    } else {
      await axiosInstance.post("/api/admin/speakers", body, { headers: authHeaders() });
    }
  };
  const speakerErrorMessage = (e) => {
    const msg = e?.response?.data?.error?.message || e?.response?.data?.message || "";
    return msg.includes("SCHEDULE_CONFLICT")
      ? "세션은 저장됐지만, 연사가 같은 시간에 다른 세션이 있어 연결하지 못했어요."
      : "세션은 저장됐지만 연사 정보를 저장하지 못했어요.";
  };

  const handleCreate = async (form) => {
    try {
      const body = {
        eventId: Number(evId()),
        category: "SESSION",
        programTitle: form.name,
        description: form.description || "",
        startAt: form.startAt
          ? `${form.startAt}T00:00:00`
          : new Date().toISOString().slice(0, 19),
        endAt: form.endAt
          ? `${form.endAt}T23:59:59`
          : new Date().toISOString().slice(0, 19),
        imageUrl: null,
      };
      const res = await axiosInstance.post(
        "/api/admin/dashboard/programs",
        body,
        { headers: authHeaders() },
      );
      const created = res.data?.data || res.data;
      if (form.imageUrl && created?.programId)
        imageMapRef.current[created.programId] = form.imageUrl;
      let speakerError = "";
      try {
        await saveSessionSpeaker(created?.programId, form.speaker);
      } catch (e) {
        speakerError = speakerErrorMessage(e);
      }
      await loadItems(evId());
      setPanel(null);
      if (speakerError) showToast(speakerError, "error");
      else showToast("세션이 등록되었습니다.");
    } catch {
      showToast("등록 실패", "error");
    }
  };
  const handleUpdate = async (form) => {
    const pid = form.programId || form.id;
    try {
      const body = {
        category: "SESSION",
        programTitle: form.name,
        description: form.description || "",
        startAt: form.startAt ? `${form.startAt}T${form._startTime || "00:00:00"}` : null,
        endAt: form.endAt ? `${form.endAt}T${form._endTime || "23:59:59"}` : null,
        imageUrl: null,
      };
      await axiosInstance.patch(`/api/admin/dashboard/programs/${pid}`, body, {
        headers: authHeaders(),
      });
      if (form.imageUrl) imageMapRef.current[pid] = form.imageUrl;
      else delete imageMapRef.current[pid];
      let speakerError = "";
      try {
        await saveSessionSpeaker(Number(pid), form.speaker);
      } catch (e) {
        speakerError = speakerErrorMessage(e);
      }
      await loadItems(evId());
      setPanel(null);
      if (speakerError) showToast(speakerError, "error");
      else showToast("세션이 수정되었습니다.");
    } catch {
      showToast("수정 실패", "error");
    }
  };
  const handleDelete = async () => {
    const item = modal.item;
    const pid = item.programId || item.id;
    setModal(null);
    setRemoving(item.id);
    try {
      await axiosInstance.delete(`/api/admin/dashboard/programs/${pid}`, {
        headers: authHeaders(),
      });
      setTimeout(async () => {
        await loadItems(evId());
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
      const programIds = ids.map((fid) => {
        const it = items.find((e) => e.id === fid);
        return it?.programId || Number(String(fid).replace("PG-", ""));
      });
      await axiosInstance.post(
        "/api/admin/dashboard/programs/bulk-delete",
        { programIds },
        { headers: authHeaders() },
      );
      await loadItems(evId());
      setSelected(new Set());
      showToast(`${ids.length}건 삭제`);
    } catch {
      showToast("일괄 삭제 실패", "error");
    }
  };

const handleDeleteAll = async () => {
    setModal(null);
    try {
      const programIds = rows.map(
        (r) => r.programId || Number(String(r.id).replace("SS-", "")),
      );
      await axiosInstance.post(
        "/api/admin/dashboard/programs/bulk-delete",
        { programIds },
        { headers: authHeaders() },
      );
      await loadItems(evId());
      setSelected(new Set());
      showToast(`${rows.length}건이 전체 삭제되었습니다.`);
    } catch (err) {
      showToast("전체 삭제 실패", "error");
    }
  };

  const filterFn =
    {
      all: () => true,
      active: (e) => e.status === "active",
      ended: (e) => e.status === "ended",
      pending: (e) => e.status === "pending",
    }[subTab] || (() => true);
  const rows = items.filter(filterFn);
  const isAllSelected =
    rows.length > 0 && rows.every((r) => selected.has(r.id));
  const hasSelected = selected.size > 0;
  const toggleAll = () => {
    if (isAllSelected) setSelected(new Set());
    else setSelected(new Set(rows.map((r) => r.id)));
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
          actionLabel="세션/강연 관리"
          icon={Mic}
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
              icon={Mic}
              label="전체 세션"
              value={items.length}
              color={ds.brand}
            />
            <StatCard
              icon={Clock}
              label="진행 중"
              value={items.filter((e) => e.status === "active").length}
              color={ds.green}
            />
            <StatCard
              icon={Users}
              label="총 참가자"
              value={items.reduce((a, b) => a + (b.enrolled || 0), 0)}
              color={ds.violet}
            />
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
                  세션/강연 목록
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
                      background: ds.card,
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
                  <Plus size={13} strokeWidth={2.5} /> 세션 등록
                </button>
              </div>
            </div>
            {isMobile ? (
              <div style={{ display: "flex", flexDirection: "column" }}>
                {loadingItems ? (
                  <div style={{ padding: "40px 14px", textAlign: "center", fontSize: 13, color: ds.ink4 }}>
                    로딩 중입니다.
                  </div>
                ) : rows.length === 0 ? (
                  <EmptyState icon={Mic} title="등록된 세션/강연이 없습니다" description="오른쪽 위 버튼으로 세션을 등록해 보세요." />
                ) : (
                  rows.map((r) => {
                    const st = statusMap[r.status] || statusMap.pending;
                    const isChecked = selected.has(r.id);
                    const isEnded = r.status === "ended";
                    return (
                      <div
                        key={r.id}
                        className={removing === r.id ? "row-removing" : ""}
                        onClick={() => setModal({ type: "detail", item: r })}
                        style={{
                          padding: "14px",
                          borderBottom: `1px solid ${ds.lineSoft}`,
                          background: isChecked ? `${ds.brand}06` : "transparent",
                          cursor: "pointer",
                          opacity: isEnded ? 0.45 : 1,
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ display: "flex", gap: 10, minWidth: 0 }}>
                              {r.imageUrl && (
                                <img
                                  src={resolveImageUrl(r.imageUrl)}
                                  alt=""
                                  style={{
                                    width: 40,
                                    height: 40,
                                    borderRadius: 10,
                                    objectFit: "cover",
                                    flexShrink: 0,
                                    border: `1px solid ${ds.line}`,
                                    filter: isEnded ? "blur(1.5px) grayscale(0.6)" : "none",
                                  }}
                                />
                              )}
                              <div style={{ minWidth: 0 }}>
                                <div style={{ fontSize: 14, fontWeight: 700, color: ds.ink, whiteSpace: "normal", wordBreak: "keep-all", overflowWrap: "break-word" }}>
                                  {r.name}
                                </div>
                                <div style={{ fontSize: 12, color: ds.ink4, fontFamily: "monospace", marginTop: 2 }}>
                                  {r.id}
                                </div>
                              </div>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
                              <Pill color={st.c} bg={st.bg}>
                                {st.l}
                              </Pill>
                            </div>
                            <div style={{ marginTop: 10, fontSize: 12.5, color: ds.ink3 }}>
                              참가 인원 {r.enrolled || 0}명
                            </div>
                          </div>
                          <Checkbox checked={isChecked} onChange={() => toggleOne(r.id)} />
                        </div>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
                          {[
                            { label: "상세", fn: () => setModal({ type: "detail", item: r }), color: ds.ink3, border: ds.line, bg: ds.card },
                            { label: "수정", fn: () => setPanel({ type: "edit", item: r }), color: ds.ink3, border: ds.line, bg: ds.card },
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
            <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${ds.line}` }}>
                  <th style={{ width: 52, padding: "12px 16px" }}>
                    <Checkbox checked={isAllSelected} onChange={toggleAll} />
                  </th>
                  {SESSION_COLS.map((c, i) => (
                    <th
                      key={i}
                      style={{
                        padding: "12px 16px",
                        fontSize: 13,
                        fontWeight: 600,
                        color: ds.ink3,
                        textAlign: c.align || "left",
                        whiteSpace: "nowrap",
                        ...(c.w ? { width: c.w } : {}),
                      }}
                    >
                      {c.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loadingItems ? (
                  <tr>
                    <td colSpan={SESSION_COLS.length + 1} style={{ padding: "60px 0", textAlign: "center", fontSize: 13.5, color: ds.ink3 }}>
                      세션 정보를 불러오는 중...
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={SESSION_COLS.length + 1} style={{ padding: 0 }}>
                      <EmptyState icon={Mic} title="등록된 세션/강연이 없습니다" description="오른쪽 위 버튼으로 세션을 등록해 보세요." />
                    </td>
                  </tr>
                ) : (
                  rows.map((r) => {
                    const isChecked = selected.has(r.id);
                    return (
                      <tr
                        key={r.id}
                        className={removing === r.id ? "row-removing" : ""}
                        onClick={() => setModal({ type: "detail", item: r })}
                        style={{ borderTop: `1px solid ${ds.line}`, cursor: "pointer", background: isChecked ? ds.cardHover : "transparent" }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = ds.cardHover)}
                        onMouseLeave={(e) => (e.currentTarget.style.background = isChecked ? ds.cardHover : "transparent")}
                      >
                        <td style={{ padding: "14px 16px" }} onClick={(e) => e.stopPropagation()}>
                          <Checkbox checked={isChecked} onChange={() => toggleOne(r.id)} />
                        </td>
                        <td style={{ padding: "14px 16px" }}>
                          <StatusBadge status={r.status} />
                        </td>
                        <td style={{ padding: "14px 16px" }}>
                          <div title={r.name} style={{ fontSize: 14, fontWeight: 600, color: ds.ink, ...ELLIPSIS }}>{r.name}</div>
                          <div style={{ marginTop: 2, fontSize: 12, color: ds.ink4 }}>{r.id}</div>
                        </td>
                        <td style={{ padding: "14px 16px", fontSize: 13.5, color: ds.ink2 }}>
                          {r.startAt ? (
                            <>
                              <div style={{ whiteSpace: "nowrap" }}>{fmtDay(r.startAt)}</div>
                              <div style={{ marginTop: 2, fontSize: 12.5, color: ds.ink4, whiteSpace: "nowrap" }}>
                                {fmtTime(r.startAt)} – {fmtTime(r.endAt)}
                              </div>
                            </>
                          ) : (
                            <span style={{ color: ds.ink4 }}>미정</span>
                          )}
                        </td>
                        <td style={{ padding: "14px 16px" }}>
                          {r.speaker ? (
                            <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                              <SpeakerAvatar speaker={r.speaker} />
                              <div style={{ minWidth: 0 }}>
                                <div style={{ fontSize: 14, color: ds.ink, ...ELLIPSIS }}>{r.speaker.speakerName}</div>
                                {r.speaker.speakerBio ? (
                                  <div title={r.speaker.speakerBio} style={{ marginTop: 2, fontSize: 12.5, color: ds.ink4, ...ELLIPSIS }}>{r.speaker.speakerBio}</div>
                                ) : null}
                              </div>
                            </div>
                          ) : (
                            <span style={{ fontSize: 13.5, color: ds.ink4 }}>연사 미정</span>
                          )}
                        </td>
                        <td style={{ padding: "14px 16px", fontSize: 14, color: ds.ink, textAlign: "right", whiteSpace: "nowrap" }}>
                          {Number(r.enrolled || 0).toLocaleString()}명
                        </td>
                        <td style={{ padding: "14px 12px" }} onClick={(e) => e.stopPropagation()}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 2 }}>
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
        <SessionFormModal
          onSave={handleCreate}
          onClose={() => setPanel(null)}
          eventName={selectedEvent?.name || selectedEvent?.eventName}
        />
      )}
      {panel?.type === "edit" && (
        <SessionFormModal
          item={panel.item}
          isEdit
          onSave={handleUpdate}
          onClose={() => setPanel(null)}
          eventName={selectedEvent?.name || selectedEvent?.eventName}
        />
      )}
      {modal?.type === "delete" && (
        <ConfirmModal
          title="세션 삭제"
          msg={`"${modal.item.name}" 세션을 삭제하시겠습니까?\n삭제된 데이터는 복구할 수 없습니다.`}
          onConfirm={handleDelete}
          onCancel={() => setModal(null)}
        />
      )}
      {modal?.type === "bulkDelete" && (
        <ConfirmModal
          title="선택 삭제"
          msg={`선택한 ${selected.size}건을 삭제하시겠습니까?
삭제된 데이터는 복구할 수 없습니다.`}
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
