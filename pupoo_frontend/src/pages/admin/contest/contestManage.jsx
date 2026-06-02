import { useState, useEffect, useRef, useCallback } from "react";
import {
  Plus,
  X,
  Pencil,
  Trash2,
  ChevronLeft,
  Trophy,
  Users,
  Check,
  CalendarDays,
  MapPin,
  ImagePlus,
  BarChart3,
  Heart,
  Award,
  Crown,
  Dog,
  Camera,
  Star,
  Medal,
  AlertCircle,
  Info,
} from "lucide-react";
import ds, { statusMap } from "../shared/designTokens";
import {
  resolveImageUrl,
  toPublicAssetUrl,
} from "../../../shared/utils/publicAssetUrl";
import { axiosInstance } from "../../../app/http/axiosInstance";
import { getToken } from "../../../api/noticeApi";
import {
  injectEventImages,
  loadImageCache as loadEventImageCache,
} from "../shared/eventImageStore";
import {
  getProgramImageMap,
  loadImageCache as loadProgramImageCache,
  removeProgramImage,
  setProgramImage,
} from "../shared/programImageStore";
import {
  resolveAdminStatus,
  sortAdminEventsByOperationalPriority,
} from "../shared/adminStatus";

/* ═══ Styles ═══ */
const styles = `
.card-manage-btn:active,.card-manage-btn:focus,.card-manage-btn:focus-visible{outline:none!important;box-shadow:none!important;-webkit-tap-highlight-color:transparent;}
.ev-card-ended { opacity:0.42 !important; filter:grayscale(0.6) !important; pointer-events:none !important; }
.ev-card-ended img { filter:blur(2px) !important; }
.ev-card-ended .card-manage-btn { background:rgba(255,255,255,0.12) !important; color:rgba(255,255,255,0.35) !important; cursor:not-allowed !important; }
@keyframes toastIn{from{opacity:0;transform:translateY(-12px)}to{opacity:1;transform:translateY(0)}}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes slideUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
@keyframes pulseGlow{0%,100%{opacity:.6}50%{opacity:1}}
@keyframes cardIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
.add-p-card{border:1.5px dashed #3D4A5C;border-radius:16px;display:flex;flex-direction:column;align-items:center;justify-content:center;cursor:pointer;min-height:260px;background:#1C2333;transition:border-color .18s;}
.add-p-card:hover{border-color:#EF4444 !important;}
.add-p-card:hover .add-p-icon{background:#EF4444 !important;}
.add-p-card:hover .add-p-label{color:#EF4444 !important;}
`;

const RED = {
  primary: "#EF4444",
  dark: "#DC2626",
  darker: "#B91C1C",
  soft: "#FEE2E2",
  softer: "#FFF5F5",
  border: "#FECACA",
  text: "#991B1B",
  textDark: "#7F1D1D",
};

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
  background: ds.bg,
};
const inputFocus = (e) => {
  e.target.style.borderColor = RED.primary;
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

function Toast({ msg, type = "success", onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2200);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <div
      style={{
        position: "fixed",
        top: 24,
        right: 24,
        zIndex: 9999,
        background: type === "success" ? "#3a4520" : "#EF4444",
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
        background: checked ? RED.primary : ds.bg,
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

function Overlay({ children, onClose }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.4)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9998,
        animation: "fadeIn .2s ease",
        padding: 20,
      }}
    >
      {children}
    </div>
  );
}

function ConfirmModal({ title, msg, onConfirm, onCancel }) {
  return (
    <Overlay onClose={onCancel}>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: ds.card,
          borderRadius: 16,
          padding: 28,
          width: 380,
          maxWidth: "100%",
          boxShadow: "0 20px 60px rgba(0,0,0,0.18)",
          animation: "slideUp .25s ease",
        }}
      >
        <div
          style={{
            fontSize: 17,
            fontWeight: 800,
            color: ds.ink,
            marginBottom: 8,
          }}
        >
          {title}
        </div>
        <div
          style={{
            fontSize: 13.5,
            color: ds.ink3,
            lineHeight: 1.6,
            marginBottom: 22,
            whiteSpace: "pre-line",
          }}
        >
          {msg}
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1,
              padding: "11px 0",
              borderRadius: 10,
              border: `1.5px solid ${ds.line}`,
              background: ds.bg,
              color: ds.ink3,
              fontSize: 13.5,
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: ds.ff,
            }}
          >
            취소
          </button>
          <button
            onClick={onConfirm}
            style={{
              flex: 1,
              padding: "11px 0",
              borderRadius: 10,
              border: "none",
              background: "#EF4444",
              color: "#fff",
              fontSize: 13.5,
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: ds.ff,
            }}
          >
            삭제
          </button>
        </div>
      </div>
    </Overlay>
  );
}

function Field({ label, children, required }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div
        style={{
          fontSize: 12.5,
          fontWeight: 700,
          color: ds.ink3,
          marginBottom: 6,
        }}
      >
        {label}
        {required && <span style={{ color: "#EF4444", marginLeft: 3 }}>*</span>}
      </div>
      {children}
    </div>
  );
}

const contestBadge = (status) =>
  ({
    pending: { l: "투표 예정", c: "#FFFFFF", bg: "#6B7280", dot: false },
    active: { l: "투표 진행 중", c: "#FFFFFF", bg: "#EF4444", dot: true },
    ended: { l: "투표 종료", c: "#FFFFFF", bg: "#374151", dot: false },
  })[status] || { l: "투표 예정", c: "#FFFFFF", bg: "#6B7280", dot: false };

const ICON_POOL = [
  { icon: Trophy, bg: ds.amberSoft, color: "#D97706" },
  { icon: Camera, bg: "#FFF1F2", color: RED.primary },
  { icon: Dog, bg: RED.soft, color: RED.dark },
  { icon: Star, bg: RED.soft, color: RED.primary },
  { icon: Award, bg: ds.amberSoft, color: "#D97706" },
  { icon: Crown, bg: ds.greenSoft, color: "#059669" },
  { icon: Medal, bg: ds.amberSoft, color: "#EA580C" },
];

const RANK_COLORS = ["#F59E0B", "#94A3B8", "#CD7F32"];
const CARD_COLORS = [
  RED.primary,
  RED.dark,
  "#F87171",
  RED.darker,
  "#991B1B",
  ds.line,
];

const readApiList = (payload) => {
  if (Array.isArray(payload?.content)) return payload.content;
  if (Array.isArray(payload)) return payload;
  return [];
};

const readVoteItems = (payload) => {
  if (Array.isArray(payload?.results)) return payload.results;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload)) return payload;
  return [];
};

const normalizeProgramCategory = (program) => {
  const raw = String(
    program?.category ?? program?.programCategory ?? program?.programType ?? "",
  ).trim();
  const upper = raw.toUpperCase();

  if (upper === "CONTEST" || raw === "대회") return "CONTEST";
  if (upper === "SESSION" || raw === "교육" || raw === "강연") return "SESSION";
  if (upper === "EXPERIENCE" || raw === "체험") return "EXPERIENCE";

  return upper;
};

const isContestProgram = (program) => {
  const category = normalizeProgramCategory(program);
  return category === "CONTEST" || category === "";
};

/* ═══ 다크 이미지 업로드 영역 ═══ */
function DarkImageUpload({
  preview,
  onFile,
  label = "클릭하거나 이미지를 드래그하세요",
  hint = "JPG, PNG, WEBP · 최대 10MB",
  aspectRatio = null,
}) {
  const fileRef = useRef(null);
  const handleFile = (file) => {
    if (
      !file ||
      !file.type.startsWith("image/") ||
      file.size > 10 * 1024 * 1024
    )
      return;
    const r = new FileReader();
    r.onload = (e) => onFile(e.target.result, file);
    r.readAsDataURL(file);
  };
  return (
    <div
      onClick={() => fileRef.current?.click()}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        handleFile(e.dataTransfer.files[0]);
      }}
      style={{
        width: "100%",
        ...(aspectRatio ? { aspectRatio } : { height: 160 }),
        borderRadius: 12,
        border: "1.5px dashed #4B5563",
        background: preview
          ? `url(${preview}) center/cover no-repeat`
          : "#1F2937",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        position: "relative",
        overflow: "hidden",
        transition: "border-color .2s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = RED.primary;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "#4B5563";
      }}
    >
      {!preview && (
        <>
          {/* 아이콘 배경 */}
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: "rgba(239,68,68,0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 12,
            }}
          >
            <ImagePlus size={22} color={RED.primary} />
          </div>
          <div
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: "#E5E7EB",
              marginBottom: 4,
            }}
          >
            {label}
          </div>
          <div style={{ fontSize: 12, color: "#6B7280" }}>{hint}</div>
        </>
      )}
      {preview && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(0,0,0,0.45)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            opacity: 0,
            transition: "opacity .2s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = 1)}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = 0)}
        >
          <Camera size={22} color="#fff" />
          <span
            style={{
              color: "#fff",
              fontSize: 12,
              fontWeight: 700,
              marginTop: 6,
            }}
          >
            이미지 변경
          </span>
        </div>
      )}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => handleFile(e.target.files[0])}
      />
    </div>
  );
}

/* ═══ 콘테스트 폼 모달 ═══ */
function ContestFormModal({ item, onSave, onClose, isEdit }) {
  const [form, setForm] = useState(
    item
      ? {
          ...item,
          startAt: item.startAt?.split("T")[0] || "",
          endAt: item.endAt?.split("T")[0] || "",
        }
      : { name: "", description: "", startAt: "", endAt: "" },
  );
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));
  const [err, setErr] = useState("");
  const [visible, setVisible] = useState(false);
  const [preview, setPreview] = useState(item?.imageUrl || null);

  const handleSave = () => {
    if (!form.name) {
      setErr("콘테스트명은 필수입니다.");
      return;
    }
    onSave({ ...form, imageUrl: preview });
  };
  const autoStatus =
    form.startAt || form.endAt
      ? contestBadge(calcStatus(form.startAt, form.endAt))
      : null;
  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  return (
    <Overlay onClose={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: ds.card,
          borderRadius: 18,
          width: 440,
          maxWidth: "100%",
          overflow: "hidden",
          boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
          transform: visible
            ? "scale(1) translateY(0)"
            : "scale(0.95) translateY(10px)",
          opacity: visible ? 1 : 0,
          transition: "all .25s cubic-bezier(.34,1.56,.64,1)",
        }}
      >
        {/* 헤더 */}
        <div
          style={{
            background: RED.primary,
            padding: "22px 26px 18px",
            color: "#fff",
            position: "relative",
          }}
        >
          <button
            onClick={onClose}
            style={{
              position: "absolute",
              top: 14,
              right: 14,
              background: "rgba(255,255,255,.15)",
              border: "none",
              borderRadius: "50%",
              width: 30,
              height: 30,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: "#fff",
            }}
          >
            <X size={15} />
          </button>
          <div style={{ fontSize: 17, fontWeight: 800 }}>
            {isEdit ? "콘테스트 수정" : "새 콘테스트"}
          </div>
          <div style={{ fontSize: 12, opacity: 0.75, marginTop: 2 }}>
            {isEdit ? "정보를 수정합니다" : "새로운 콘테스트를 등록합니다"}
          </div>
          {autoStatus && (
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                marginTop: 10,
                padding: "3px 12px",
                borderRadius: 100,
                background: "rgba(255,255,255,.18)",
                fontSize: 11,
                fontWeight: 700,
              }}
            >
              {autoStatus.l}
            </div>
          )}
        </div>
        {/* 바디 */}
        <div
          style={{
            padding: "22px 26px 20px",
            maxHeight: "60vh",
            overflowY: "auto",
          }}
        >
          <Field label="프로그램 이미지">
            <DarkImageUpload
              preview={preview}
              onFile={(dataUrl) => setPreview(dataUrl)}
            />
          </Field>
          <Field label="콘테스트명" required>
            <input
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              style={inputStyle}
              onFocus={inputFocus}
              onBlur={inputBlur}
              placeholder="예: 베스트 드레서 콘테스트"
            />
          </Field>
          <div style={{ display: "flex", gap: 10 }}>
            <Field label="시작일">
              <input
                type="date"
                value={form.startAt}
                onChange={(e) => set("startAt", e.target.value)}
                style={inputStyle}
                onFocus={inputFocus}
                onBlur={inputBlur}
              />
            </Field>
            <Field label="종료일">
              <input
                type="date"
                value={form.endAt}
                onChange={(e) => set("endAt", e.target.value)}
                style={inputStyle}
                onFocus={inputFocus}
                onBlur={inputBlur}
              />
            </Field>
          </div>
          <Field label="설명">
            <textarea
              value={form.description || ""}
              onChange={(e) => set("description", e.target.value)}
              rows={3}
              style={{ ...inputStyle, resize: "vertical" }}
              onFocus={inputFocus}
              onBlur={inputBlur}
              placeholder="콘테스트 설명"
            />
          </Field>
          {err && (
            <div
              style={{
                fontSize: 12,
                color: "#EF4444",
                fontWeight: 600,
                marginBottom: 12,
              }}
            >
              {err}
            </div>
          )}
        </div>
        {/* 푸터 */}
        <div style={{ padding: "14px 26px 20px", display: "flex", gap: 10 }}>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: "11px 0",
              borderRadius: 10,
              border: `1.5px solid ${ds.line}`,
              background: ds.bg,
              color: ds.ink3,
              fontSize: 13.5,
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: ds.ff,
            }}
          >
            취소
          </button>
          <button
            onClick={handleSave}
            style={{
              flex: 1,
              padding: "11px 0",
              borderRadius: 10,
              border: "none",
              background: RED.primary,
              color: "#fff",
              fontSize: 13.5,
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: ds.ff,
            }}
          >
            저장
          </button>
        </div>
      </div>
    </Overlay>
  );
}

/* ═══ 참가자 폼 모달 ═══ */
function ParticipantFormModal({ item, onSave, onClose, isEdit }) {
  const [form, setForm] = useState(
    item || { petName: "", breedDetail: "", imageUrl: "" },
  );
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));
  const [err, setErr] = useState("");
  const [preview, setPreview] = useState(item?.imageUrl || null);
  const [visible, setVisible] = useState(false);

  const handleSave = () => {
    if (!form.petName) {
      setErr("반려동물 이름은 필수입니다.");
      return;
    }
    onSave({ ...form, imageUrl: preview });
  };
  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  return (
    <Overlay onClose={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: ds.card,
          borderRadius: 18,
          width: 420,
          maxWidth: "100%",
          overflow: "hidden",
          boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
          transform: visible
            ? "scale(1) translateY(0)"
            : "scale(0.95) translateY(10px)",
          opacity: visible ? 1 : 0,
          transition: "all .25s cubic-bezier(.34,1.56,.64,1)",
        }}
      >
        {/* 헤더 */}
        <div
          style={{
            background: RED.primary,
            padding: "22px 26px 18px",
            color: "#fff",
            position: "relative",
          }}
        >
          <button
            onClick={onClose}
            style={{
              position: "absolute",
              top: 14,
              right: 14,
              background: "rgba(255,255,255,.15)",
              border: "none",
              borderRadius: "50%",
              width: 30,
              height: 30,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: "#fff",
            }}
          >
            <X size={15} />
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Dog size={18} />
            <span style={{ fontSize: 17, fontWeight: 800 }}>
              {isEdit ? "참가자 수정" : "참가자 등록"}
            </span>
          </div>
          <div style={{ fontSize: 12, opacity: 0.75, marginTop: 2 }}>
            콘테스트에 참가할 반려동물 정보
          </div>
        </div>
        {/* 바디 */}
        <div style={{ padding: "22px 26px 10px" }}>
          {/* ─── 다크 이미지 업로드 ─── */}
          <Field label="반려동물 사진">
            <DarkImageUpload
              preview={preview}
              onFile={(dataUrl) => {
                setPreview(dataUrl);
                set("imageUrl", dataUrl);
              }}
              label="클릭하거나 이미지를 드래그하세요"
              hint="JPG, PNG, WEBP · 최대 10MB"
              aspectRatio="4/3"
            />
          </Field>
          <Field label="반려동물 이름" required>
            <input
              value={form.petName}
              onChange={(e) => set("petName", e.target.value)}
              style={inputStyle}
              onFocus={inputFocus}
              onBlur={inputBlur}
              placeholder="예: 별이"
            />
          </Field>
          <Field label="상세 견종">
            <input
              value={form.breedDetail || ""}
              onChange={(e) => set("breedDetail", e.target.value)}
              style={inputStyle}
              onFocus={inputFocus}
              onBlur={inputBlur}
              placeholder="예: 포메라니안"
            />
          </Field>
          {err && (
            <div
              style={{
                fontSize: 12,
                color: "#EF4444",
                fontWeight: 600,
                marginBottom: 12,
              }}
            >
              {err}
            </div>
          )}
        </div>
        {/* 푸터 */}
        <div style={{ padding: "8px 26px 20px", display: "flex", gap: 10 }}>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: "11px 0",
              borderRadius: 10,
              border: `1.5px solid ${ds.line}`,
              background: ds.bg,
              color: ds.ink3,
              fontSize: 13.5,
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: ds.ff,
            }}
          >
            취소
          </button>
          <button
            onClick={handleSave}
            style={{
              flex: 1,
              padding: "11px 0",
              borderRadius: 10,
              border: "none",
              background: RED.primary,
              color: "#fff",
              fontSize: 13.5,
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: ds.ff,
            }}
          >
            {isEdit ? "수정" : "등록"}
          </button>
        </div>
      </div>
    </Overlay>
  );
}

/* ═══ ContestCard — 선택 시 흰 배경 + 레드 테두리, 핑크 배경 없음 ═══ */
function ContestCard({
  item,
  idx,
  isSelected,
  onClick,
  participantCount,
  onEdit,
  onDelete,
  compact = false,
}) {
  const badge = contestBadge(item.status);
  const icon = ICON_POOL[idx % ICON_POOL.length];
  const isEnded = item.status === "ended";
  return (
    <div
      onClick={onClick}
      style={{
        border: isSelected ? `2px solid #4F7FEF` : `1.5px solid #2E3A4E`,
        borderRadius: 12,
        background: isSelected ? "#1A2540" : ds.card,
        boxShadow: isSelected ? `0 0 0 3px #4F7FEF22` : "none",
        cursor: "pointer",
        transition: "all .18s",
        overflow: "hidden",
        opacity: isEnded ? 0.45 : 1,
      }}
    >
      {/* 상단 행 */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 12,
          padding: "12px 14px 10px",
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            background: icon.bg,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            filter: isEnded ? "blur(1px) grayscale(0.5)" : "none",
          }}
        >
          <icon.icon size={19} color={icon.color} strokeWidth={2} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: ds.ink,
              whiteSpace: compact ? "normal" : "nowrap",
              overflow: "hidden",
              textOverflow: compact ? "clip" : "ellipsis",
              wordBreak: "keep-all",
              overflowWrap: "break-word",
            }}
          >
            {item.name}
          </div>
          <div
            style={{
              fontSize: 11.5,
              color: "#A0A7B5",
              marginTop: 2,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
              <Users size={10} /> {participantCount}팀
            </span>
            {item.startAt && (
              <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
                <CalendarDays size={10} /> {item.startAt.split("T")[0]}
              </span>
            )}
          </div>
        </div>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            padding: "4px 12px",
            borderRadius: 100,
            fontSize: 11.5,
            fontWeight: 700,
            background: badge.bg,
            color: badge.c,
            flexShrink: 0,
            letterSpacing: 0.2,
            boxShadow: "0 2px 6px rgba(0,0,0,0.18)",
          }}
        >
          {badge.dot && (
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "#fff",
                animation: "pulseGlow 2s infinite",
                flexShrink: 0,
              }}
            />
          )}
          {badge.l}
        </span>
      </div>

      {/* 하단 수정/삭제 — 선택된 카드에만, 얇은 구분선 */}
      {isSelected && (
        <div
          style={{
            display: "flex",
            justifyContent: compact ? "stretch" : "flex-end",
            gap: 6,
            padding: "7px 14px 10px",
            borderTop: `1px solid #2E3A4E`,
            flexWrap: compact ? "wrap" : "nowrap",
          }}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit(item);
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              padding: "5px 14px",
              borderRadius: 7,
              background: "#232F45",
              border: "1px solid #3D4A5C",
              color: "#A8B4CC",
              fontSize: 11.5,
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: ds.ff,
              flex: compact ? "1 1 0" : "0 0 auto",
              justifyContent: "center",
            }}
          >
            <Pencil size={11} color="#A8B4CC" /> 수정
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(item);
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              padding: "5px 14px",
              borderRadius: 7,
              background: RED.soft,
              border: `1px solid ${RED.border}`,
              color: RED.primary,
              fontSize: 11.5,
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: ds.ff,
              flex: compact ? "1 1 0" : "0 0 auto",
              justifyContent: "center",
            }}
          >
            <Trash2 size={11} /> 삭제
          </button>
        </div>
      )}
    </div>
  );
}

/* ═══ 참가자 카드 ═══ */
function ParticipantCard({
  p,
  rank,
  totalVotes,
  onDelete,
  onApprove,
  onReject,
}) {
  const pct = totalVotes > 0 ? Math.round((p.votes / totalVotes) * 100) : 0;
  const barPct = totalVotes > 0 ? (p.votes / totalVotes) * 100 : 0;
  const rankColor = RANK_COLORS[rank - 1] || "#94A3B8";
  const rankEmoji = ["🥇", "🥈", "🥉"][rank - 1] ?? null;

  const statusStyle =
    p.status === "APPROVED"
      ? {
          bg: "#0D2B1F",
          border: "#065F46",
          color: "#34D399",
          label: "승인됨 ✅",
        }
      : p.status === "REJECTED"
        ? {
            bg: "#2B0D0D",
            border: "#7F1D1D",
            color: "#F87171",
            label: "반려됨 ✕",
          }
        : {
            bg: "#2B2200",
            border: "#92400E",
            color: "#FCD34D",
            label: "검토 중 🔍",
          };

  return (
    <div
      style={{
        background: "#151E2D",
        border:
          p.status === "APPROVED"
            ? "1.5px solid #065F46"
            : p.status === "REJECTED"
              ? "1.5px solid #7F1D1D"
              : "1.5px solid #2E3A4E",
        borderRadius: 16,
        overflow: "hidden",
        animation: `cardIn .35s ease ${(rank - 1) * 0.07}s both`,
        transition: "transform .18s, box-shadow .18s",
      }}
    >
      {/* 이미지 영역 */}
      <div
        style={{
          width: "100%",
          aspectRatio: "1/1",
          position: "relative",
          background: "#0D1520",
        }}
      >
        {p.imageUrl ? (
          <img
            src={resolveImageUrl(p.imageUrl)}
            alt={p.petName}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
            onError={(e) => {
              e.target.style.display = "none";
            }}
          />
        ) : (
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 48,
            }}
          >
            🐾
          </div>
        )}
        {/* 그라디언트 오버레이 */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(180deg,rgba(0,0,0,0.1) 0%,rgba(0,0,0,0.6) 100%)",
            pointerEvents: "none",
          }}
        />

        {/* 순위 뱃지 */}
        {rankEmoji ? (
          <div
            style={{
              position: "absolute",
              top: 10,
              left: 10,
              fontSize: 20,
              zIndex: 2,
              filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.5))",
            }}
          >
            {rankEmoji}
          </div>
        ) : (
          <div
            style={{
              position: "absolute",
              top: 10,
              left: 10,
              zIndex: 2,
              background: "rgba(0,0,0,0.55)",
              borderRadius: 8,
              padding: "2px 8px",
              fontSize: 12,
              fontWeight: 800,
              color: "#CBD5E1",
            }}
          >
            #{rank}
          </div>
        )}

        {/* 상태 뱃지 */}
        <div
          style={{
            position: "absolute",
            top: 10,
            right: 10,
            zIndex: 2,
            background: statusStyle.bg,
            border: `1px solid ${statusStyle.border}`,
            borderRadius: 8,
            padding: "3px 9px",
            fontSize: 11,
            fontWeight: 700,
            color: statusStyle.color,
          }}
        >
          {statusStyle.label}
        </div>

        {/* 수정/삭제 버튼 */}
        <div
          style={{
            position: "absolute",
            bottom: 10,
            right: 10,
            display: "flex",
            gap: 5,
            zIndex: 2,
          }}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(p);
            }}
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              background: "rgba(239,68,68,0.25)",
              backdropFilter: "blur(6px)",
              border: "1px solid rgba(239,68,68,0.4)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Trash2 size={12} color="#F87171" />
          </button>
        </div>

        {/* 득표수 */}
        {totalVotes > 0 && (
          <div
            style={{
              position: "absolute",
              bottom: 10,
              left: 10,
              zIndex: 2,
              display: "flex",
              alignItems: "center",
              gap: 4,
              background: "rgba(0,0,0,0.55)",
              backdropFilter: "blur(6px)",
              borderRadius: 8,
              padding: "3px 9px",
              fontSize: 12,
              fontWeight: 700,
              color: "#fff",
            }}
          >
            <Heart size={10} fill="#fff" /> {p.votes.toLocaleString()}표
          </div>
        )}
      </div>

      {/* 정보 영역 */}
      <div style={{ padding: "14px 14px 12px" }}>
        <div
          style={{
            fontSize: 15,
            fontWeight: 800,
            color: "#F1F5F9",
            marginBottom: 2,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {p.petName}
        </div>
        <div
          style={{
            fontSize: 12,
            color: "#64748B",
            marginBottom: totalVotes > 0 ? 10 : 12,
          }}
        >
          {p.breedDetail || "견종 미등록"}
        </div>

        {/* 득표율 바 */}
        {totalVotes > 0 && (
          <div style={{ marginBottom: 10 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 11,
                color: "#64748B",
                marginBottom: 4,
              }}
            >
              <span>득표율</span>
              <span style={{ fontWeight: 700, color: rankColor }}>{pct}%</span>
            </div>
            <div
              style={{
                height: 5,
                background: "#1E293B",
                borderRadius: 99,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${barPct}%`,
                  borderRadius: 99,
                  background: `linear-gradient(90deg, ${rankColor}, ${rankColor}99)`,
                  transition: "width .6s ease",
                }}
              />
            </div>
          </div>
        )}

        {/* 승인/반려 버튼 */}
        {(p.status === "APPLIED" || p.status === "WAITING") && (
          <div style={{ display: "flex", gap: 6 }}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onApprove && onApprove(p);
              }}
              style={{
                flex: 1,
                padding: "7px 0",
                borderRadius: 8,
                border: "none",
                background: "#065F46",
                color: "#34D399",
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              ✅ 승인
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onReject && onReject(p);
              }}
              style={{
                flex: 1,
                padding: "7px 0",
                borderRadius: 8,
                border: "1px solid #7F1D1D",
                background: "#2B0D0D",
                color: "#F87171",
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              ✕ 반려
            </button>
          </div>
        )}

        {rank === 1 && totalVotes > 0 && (
          <div
            style={{
              marginTop: 8,
              textAlign: "center",
              fontSize: 12,
              fontWeight: 700,
              color: "#F59E0B",
            }}
          >
            👑 1위
          </div>
        )}
      </div>
    </div>
  );
}
export default function ContestManage({
  subTab = "all",
  onDetailEnter,
  onDetailLeave,
}) {
  const [viewportWidth, setViewportWidth] = useState(() =>
    typeof window === "undefined" ? 1440 : window.innerWidth,
  );
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [items, setItems] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [loadingItems, setLoadingItems] = useState(false);
  const [modal, setModal] = useState(null);
  const [toast, setToast] = useState(null);
  const [selectedContest, setSelectedContest] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteParticipant, setDeleteParticipant] = useState(null);
  const [internalTab, setInternalTab] = useState("all");
  const imageMapRef = useRef({});
  const selectedContestRef = useRef(null);
  const [participantsMap, setParticipantsMap] = useState({});
  const [selected, setSelected] = useState(new Set());
  const isMobile = viewportWidth < 768;
  const isTablet = viewportWidth >= 768 && viewportWidth < 1024;

  const showToast = (msg, type = "success") => setToast({ msg, type });

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const syncViewport = () => setViewportWidth(window.innerWidth);
    syncViewport();
    window.addEventListener("resize", syncViewport);
    return () => window.removeEventListener("resize", syncViewport);
  }, []);

  /* ── 탭 콜백 ── */
  const enterDetail = useCallback(
    (ev) => {
      setSelectedEvent(ev);
      onDetailEnter?.();
    },
    [onDetailEnter],
  );

  const leaveDetail = useCallback(() => {
    setSelectedEvent(null);
    setSelectedContest(null);
    setItems([]);
    onDetailLeave?.();
  }, [onDetailLeave]);

  /* ── 체크박스 ── */
  const getRowId = (r) => r.programId || r.id;
  const isAllSelected =
    items.length > 0 && items.every((r) => selected.has(getRowId(r)));
  const hasSelected = selected.size > 0;
  const toggleAll = () =>
    isAllSelected
      ? setSelected(new Set())
      : setSelected(new Set(items.map(getRowId)));
  const toggleOne = (id) =>
    setSelected((p) => {
      const n = new Set(p);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  const getParticipants = useCallback(
    (id) => participantsMap[id] ?? [],
    [participantsMap],
  );

  const loadContestParticipants = useCallback(
    async (contest, { silent = false } = {}) => {
      if (!contest?.programId) return [];
      try {
        const [applyRes, voteRes] = await Promise.all([
          axiosInstance.get(
            `/api/admin/dashboard/programs/${contest.programId}/applies`,
            { params: { page: 0, size: 100 }, headers: authHeaders() },
          ),
          axiosInstance.get(`/api/programs/${contest.programId}/votes/result`),
        ]);
        const applyData = applyRes.data?.data ?? applyRes.data;
        const voteData = voteRes.data?.data ?? voteRes.data;
        const voteMap = new Map(
          readVoteItems(voteData).map((item) => [
            Number(item?.programApplyId),
            Number(item?.voteCount ?? 0),
          ]),
        );
        const mapped = readApiList(applyData).map((apply) => ({
          id: apply.programApplyId,
          programApplyId: apply.programApplyId,
          petName: apply.petName || `신청 #${apply.programApplyId}`,
          breedDetail: apply.ownerNickname || "",
          imageUrl: apply.imageUrl || null,
          votes: voteMap.get(Number(apply.programApplyId)) ?? 0,
          status: apply.status,
          userId: apply.userId,
        }));
        setParticipantsMap((prev) => ({
          ...prev,
          [contest.programId]: mapped,
        }));
        return mapped;
      } catch (e) {
        if (!silent) {
          showToast(
            e.response?.data?.message || "참가 신청 조회에 실패했습니다.",
            "error",
          );
        }
        setParticipantsMap((prev) => ({ ...prev, [contest.programId]: [] }));
        return [];
      }
    },
    [],
  );

  const selectContest = useCallback(
    async (contest) => {
      if (!contest?.programId) return;
      setSelectedContest(contest);
      selectedContestRef.current = contest;
      setParticipantsMap((prev) => ({ ...prev, [contest.programId]: [] }));
      await loadContestParticipants(contest);
    },
    [loadContestParticipants],
  );

  const handleApproveParticipant = async (participant) => {
    const cid = selectedContest?.programId;
    if (!cid) return;
    const applyId = participant.programApplyId || participant.id;
    if (!applyId) {
      showToast("요청 ID를 확인할 수 없습니다.", "error");
      return;
    }
    try {
      await axiosInstance.patch(
        `/api/admin/dashboard/program-applies/${applyId}/status`,
        { status: "APPROVED" },
        { headers: authHeaders() },
      );
      showToast(`${participant.petName} 승인 완료`);
      setParticipantsMap((prev) => ({
        ...prev,
        [cid]: (prev[cid] || []).map((p) =>
          (p.programApplyId || p.id) === applyId
            ? { ...p, status: "APPROVED" }
            : p,
        ),
      }));
    } catch (e) {
      showToast(e.response?.data?.message || "승인에 실패했습니다.", "error");
    }
  };

  const handleRejectParticipant = async (participant) => {
    const cid = selectedContest?.programId;
    if (!cid) return;
    const applyId = participant.programApplyId || participant.id;
    if (!applyId) {
      showToast("요청 ID를 확인할 수 없습니다.", "error");
      return;
    }
    try {
      await axiosInstance.patch(
        `/api/admin/dashboard/program-applies/${applyId}/status`,
        { status: "REJECTED" },
        { headers: authHeaders() },
      );
      showToast(`${participant.petName} 반려 처리 완료`);
      setParticipantsMap((prev) => ({
        ...prev,
        [cid]: (prev[cid] || []).map((p) =>
          (p.programApplyId || p.id) === applyId
            ? { ...p, status: "REJECTED" }
            : p,
        ),
      }));
    } catch (e) {
      showToast(e.response?.data?.message || "승인에 실패했습니다.", "error");
    }
  };

  const loadEvents = async () => {
    try {
      await Promise.all([loadEventImageCache(), loadProgramImageCache()]);
      imageMapRef.current = getProgramImageMap();
      const res = await axiosInstance.get("/api/admin/dashboard/events", {
        headers: authHeaders(),
        params: { sort: "eventId,desc", size: 500 },
      });
      const list = res.data?.data || res.data || [];
      const mapped = injectEventImages(list).map((e) => ({
        ...e,
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
        `/api/admin/dashboard/events/${eventId}/programs`,
        {
          params: { category: "CONTEST", page: 0, size: 200 },
          headers: authHeaders(),
        },
      );
      const data = res.data?.data ?? res.data;
      const raw = Array.isArray(data?.content)
        ? data.content
        : Array.isArray(data)
          ? data
          : [];
      const list = raw
        .filter((p) => isContestProgram(p))
        .map((p) => ({
          ...p,
          status: resolveAdminStatus(p, calcStatus(p.startAt, p.endAt)),
          imageUrl: imageMapRef.current[p.programId] || p.imageUrl || null,
        }));
      /* 최신 등록순 */
      list.sort(
        (a, b) => (Number(b.programId) || 0) - (Number(a.programId) || 0),
      );
      setItems(list);
      setSelected(new Set());
      if (list.length > 0) selectContest(list[0]);
      else setSelectedContest(null);
    } catch {
      setItems([]);
    } finally {
      setLoadingItems(false);
    }
  };
  useEffect(() => {
    loadEvents();
  }, []);

  // ── 자동 폴링: 5초마다 콘테스트 목록 + 선택된 콘테스트 참가자 갱신 ──
  useEffect(() => {
    const poll = setInterval(async () => {
      const ev = selectedEvent;
      if (!ev) return;
      const eventId = ev.eventId || ev.id;

      try {
        const res = await axiosInstance.get(
          `/api/admin/dashboard/events/${eventId}/programs`,
          {
            params: { category: "CONTEST", page: 0, size: 100 },
            headers: authHeaders(),
          },
        );
        const data = res.data?.data ?? res.data;
        const filtered = readApiList(data)
          .filter((p) => isContestProgram(p))
          .map((p) => ({
            ...p,
            programId: p.programId || p.id,
            id: p.programId || p.id,
            name: p.programTitle || p.name,
            status: resolveAdminStatus(p, calcStatus(p.startAt, p.endAt)),
            imageUrl:
              imageMapRef.current[p.programId || p.id] || p.imageUrl || null,
          }));

        setItems(filtered);

        const selectedId = selectedContestRef.current?.programId;
        if (!selectedId) return;

        const refreshedContest = filtered.find(
          (item) => Number(item.programId) === Number(selectedId),
        );

        if (!refreshedContest) {
          selectedContestRef.current = null;
          setSelectedContest(null);
          setParticipantsMap((prev) => {
            const next = { ...prev };
            delete next[selectedId];
            return next;
          });
          return;
        }

        selectedContestRef.current = refreshedContest;
        setSelectedContest(refreshedContest);
        await loadContestParticipants(refreshedContest, { silent: true });
      } catch {
        // silent polling
      }
    }, 5000);

    return () => clearInterval(poll);
  }, [loadContestParticipants, selectedEvent]);

  /* ── CRUD ── */
  const saveContest = async (form) => {
    const isEdit = !!modal?.item;
    const eventId = selectedEvent?.eventId || selectedEvent?.id;
    if (!isEdit && !eventId) {
      showToast("행사가 선택되지 않았습니다.", "error");
      return;
    }
    try {
      if (isEdit) {
        // ✅ PATCH /api/admin/dashboard/programs/{id}  필드명: programTitle
        await axiosInstance.patch(
          `/api/admin/dashboard/programs/${modal.item.programId}`,
          {
            programTitle: form.name,
            description: form.description || "",
            startAt: form.startAt ? `${form.startAt}T00:00:00` : null,
            endAt: form.endAt ? `${form.endAt}T23:59:59` : null,
            category: "CONTEST",
            imageUrl: form.imageUrl || null,
          },
          { headers: authHeaders() },
        );
        if (form.imageUrl) {
          imageMapRef.current[modal.item.programId] = form.imageUrl;
          setProgramImage(modal.item.programId, form.imageUrl);
        } else {
          delete imageMapRef.current[modal.item.programId];
          removeProgramImage(modal.item.programId);
        }
      } else {
        // ✅ POST /api/admin/dashboard/programs  eventId는 body에, 필드명: programTitle
        const res = await axiosInstance.post(
          `/api/admin/dashboard/programs`,
          {
            eventId: eventId,
            programTitle: form.name,
            description: form.description || "",
            startAt: form.startAt ? `${form.startAt}T00:00:00` : null,
            endAt: form.endAt ? `${form.endAt}T23:59:59` : null,
            category: "CONTEST",
            imageUrl: form.imageUrl || null,
          },
          { headers: authHeaders() },
        );
        const newId = res.data?.data?.programId;
        if (form.imageUrl && newId) {
          imageMapRef.current[newId] = form.imageUrl;
          setProgramImage(newId, form.imageUrl);
        }
      }
      showToast(
        isEdit ? "콘테스트가 수정되었습니다" : "콘테스트가 등록되었습니다",
      );
      setModal(null);
      await loadItems(selectedEvent?.eventId || selectedEvent?.id);
    } catch (e) {
      const errMsg =
        e.response?.data?.message ||
        e.response?.data?.error ||
        JSON.stringify(e.response?.data) ||
        "저장 실패";
      console.error(
        "[saveContest] error detail:",
        JSON.stringify(e.response?.data),
      );
      showToast(errMsg, "error");
    }
  };
  const handleVoteStart = async (now = true) => {
    if (!selectedContest) return;
    const id = selectedContest.programId;
    const today = new Date().toISOString().slice(0, 10);
    try {
      const nowStr = new Date().toISOString().slice(0, 19);
      let newStartAt, newEndAt;
      if (now) {
        newStartAt = nowStr;
        newEndAt = selectedContest.endAt || `${today}T23:59:59`;
      } else {
        newStartAt = selectedContest.startAt || `${today}T00:00:00`;
        newEndAt = nowStr;
      }
      await axiosInstance.patch(
        `/api/admin/dashboard/programs/${id}`,
        {
          programTitle: selectedContest.name,
          description: selectedContest.description || "",
          startAt: newStartAt,
          endAt: newEndAt,
          category: "CONTEST",
        },
        { headers: authHeaders() },
      );
      showToast(
        now ? "🗳️ 투표가 시작되었습니다!" : "⏹️ 투표가 종료되었습니다.",
      );
      // 목록 새로고침 후 같은 콘테스트 다시 선택
      const eventId = selectedEvent?.eventId || selectedEvent?.id;
      const res2 = await axiosInstance.get(
        `/api/admin/dashboard/events/${eventId}/programs`,
        { params: { category: "CONTEST" }, headers: authHeaders() },
      );
      const data2 = res2.data?.data ?? res2.data;
      const list2 = readApiList(data2).map((p) => ({
        ...p,
        status: resolveAdminStatus(p, calcStatus(p.startAt, p.endAt)),
        imageUrl: imageMapRef.current[p.programId] || p.imageUrl || null,
      }));
      setItems(list2);
      const refreshed = list2.find((p) => p.programId === id);
      if (refreshed) {
        setSelectedContest(refreshed);
        selectContest(refreshed);
      }
    } catch (e) {
      showToast(e.response?.data?.message || "처리 실패", "error");
    }
  };

  const handleDeleteContest = async () => {
    if (!deleteTarget) return;
    try {
      await axiosInstance.delete(
        `/api/admin/dashboard/programs/${deleteTarget.programId}`,
        { headers: authHeaders() },
      );
      delete imageMapRef.current[deleteTarget.programId];
      removeProgramImage(deleteTarget.programId);
      showToast("삭제되었습니다");
      setDeleteTarget(null);
      if (selectedContest?.programId === deleteTarget.programId)
        setSelectedContest(null);
      await loadItems(selectedEvent.eventId || selectedEvent.id);
    } catch (e) {
      showToast(e.response?.data?.message || "삭제 실패", "error");
    }
  };
  const handleBulkDelete = async () => {
    if (!selectedEvent || selected.size === 0) {
      setModal(null);
      return;
    }
    try {
      const ids = [...selected];
      await Promise.all(
        ids.map((id) =>
          axiosInstance.delete(`/api/admin/dashboard/programs/${id}`, {
            headers: authHeaders(),
          }),
        ),
      );
      ids.forEach((id) => {
        delete imageMapRef.current[id];
        removeProgramImage(id);
      });
      showToast(`${selected.size}건이 삭제되었습니다`);
      setSelected(new Set());
      setModal(null);
      await loadItems(selectedEvent.eventId || selectedEvent.id);
    } catch (e) {
      showToast(e.response?.data?.message || "삭제 실패", "error");
    }
  };
  const handleDeleteAll = async () => {
    if (!selectedEvent || items.length === 0) {
      setModal(null);
      return;
    }
    try {
      const ids = items.map((it) => it.programId);
      await Promise.all(
        items.map((it) =>
          axiosInstance.delete(
            `/api/admin/dashboard/programs/${it.programId}`,
            { headers: authHeaders() },
          ),
        ),
      );
      ids.forEach((id) => {
        delete imageMapRef.current[id];
        removeProgramImage(id);
      });
      showToast("전체 삭제되었습니다");
      setModal(null);
      setSelectedContest(null);
      await loadItems(selectedEvent.eventId || selectedEvent.id);
    } catch (e) {
      showToast(e.response?.data?.message || "삭제 실패", "error");
    }
  };
  const handleDeleteParticipant = async () => {
    if (!deleteParticipant) return;
    const cid = selectedContest.programId;
    const applyId = deleteParticipant.programApplyId || deleteParticipant.id;
    try {
      await axiosInstance.delete(
        `/api/admin/dashboard/program-applies/${applyId}`,
        { headers: authHeaders() },
      );
      setParticipantsMap((prev) => ({
        ...prev,
        [cid]: (prev[cid] || []).filter((p) => p.id !== deleteParticipant.id),
      }));
      showToast("참가자가 삭제되었습니다");
    } catch (e) {
      showToast(e.response?.data?.message || "삭제 실패", "error");
    } finally {
      setDeleteParticipant(null);
    }
  };

  /* ── 통계 ── */
  const participants = selectedContest
    ? getParticipants(selectedContest.programId)
    : [];
  const sortedP = [...participants].sort((a, b) => b.votes - a.votes);
  const totalVotes = participants.reduce((a, b) => a + b.votes, 0);
  const liveCount = items.filter((i) => i.status === "active").length;
  const allP = items.reduce(
    (s, it) => s + getParticipants(it.programId).length,
    0,
  );

  /* ═══ 행사 선택 화면 ═══ */
  if (!selectedEvent) {
    const filteredEvents = events.filter(
      subTab === "all"
        ? () => true
        : subTab === "active"
          ? (e) => e.status === "active"
          : subTab === "ended"
            ? (e) => e.status === "ended"
            : (e) => e.status === "pending",
    );
    return (
      <div style={{ fontFamily: ds.ff }}>
        <style>{styles}</style>
        {toast && (
          <Toast
            msg={toast.msg}
            type={toast.type}
            onDone={() => setToast(null)}
          />
        )}
        {loadingEvents ? (
          <div style={{ textAlign: "center", padding: 60, color: ds.ink4 }}>
            로딩 중...
          </div>
        ) : events.length === 0 ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "80px 0",
            }}
          >
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: "50%",
                background: ds.lineSoft,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 14,
              }}
            >
              <Trophy size={28} color={ds.ink4} />
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: ds.ink3 }}>
              등록된 행사가 없습니다
            </div>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "80px 0",
            }}
          >
            <CalendarDays size={36} color={ds.ink4} strokeWidth={1.5} />
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
              gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(300px, 1fr))",
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
                  onClick={() => {
                    if (isEnded) return;
                    enterDetail(ev);
                    loadItems(ev.eventId || ev.id);
                  }}
                  className={isEnded ? "ev-card-ended" : ""}
                  style={{
                    borderRadius: 18,
                    overflow: "hidden",
                    cursor: isEnded ? "default" : "pointer",
                    position: "relative",
                    height: 320,
                    display: "flex",
                    flexDirection: "column",
                    background: hasImg ? "#000" : RED.primary,
                    boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
                    transition: "transform 0.22s ease, box-shadow 0.22s ease",
                  }}
                  onMouseEnter={(e) => {
                    if (isEnded) return;
                    e.currentTarget.style.transform = "translateY(-4px)";
                    e.currentTarget.style.boxShadow =
                      "0 12px 36px rgba(0,0,0,0.16)";
                  }}
                  onMouseLeave={(e) => {
                    if (isEnded) return;
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow =
                      "0 4px 24px rgba(0,0,0,0.08)";
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
                          background: isEnded
                            ? "rgba(0,0,0,0.55)"
                            : "linear-gradient(to bottom,rgba(0,0,0,0.05) 0%,rgba(0,0,0,0.6) 100%)",
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
                      <Trophy size={90} color="#fff" strokeWidth={1} />
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
                        background: st.bg,
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
                        style={{ fontSize: 11, fontWeight: 700, color: st.c }}
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
                      {hasImg && (
                        <div
                          style={{
                            width: 30,
                            height: 30,
                            borderRadius: 8,
                            overflow: "hidden",
                            border: "2px solid rgba(255,255,255,0.4)",
                            flexShrink: 0,
                          }}
                        >
                          <img
                            src={resolveImageUrl(ev.imageUrl)}
                            alt=""
                            style={{
                              width: "100%",
                              height: "100%",
                              objectFit: "cover",
                            }}
                          />
                        </div>
                      )}
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
                      disabled={isEnded}
                      className="card-manage-btn"
                      style={{
                        width: "100%",
                        padding: "9px 0",
                        borderRadius: 10,
                        border: "none",
                        background: ds.brand,
                        color: "#fff",
                        fontSize: 12.5,
                        fontWeight: 700,
                        cursor: isEnded ? "not-allowed" : "pointer",
                        fontFamily: ds.ff,
                        transition: "all .15s",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 6,
                        outline: "none",
                        WebkitTapHighlightColor: "transparent",
                      }}
                      onMouseEnter={(e) => {
                        if (!isEnded)
                          e.currentTarget.style.background = ds.brandDark;
                      }}
                      onMouseLeave={(e) => {
                        if (!isEnded)
                          e.currentTarget.style.background = ds.brand;
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!isEnded) {
                          enterDetail(ev);
                          loadItems(ev.eventId || ev.id);
                        }
                      }}
                    >
                      <Trophy size={13} />{" "}
                      {isEnded ? "기간 만료" : "콘테스트 관리하기"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  /* ═══ 콘테스트 대시보드 ═══ */
  return (
    <div style={{ fontFamily: ds.ff }}>
      <style>{styles}</style>
      {toast && (
        <Toast
          msg={toast.msg}
          type={toast.type}
          onDone={() => setToast(null)}
        />
      )}

      {modal && modal.type !== "bulkDelete" && modal.type !== "deleteAll" && (
        <ContestFormModal
          item={modal.item}
          onSave={saveContest}
          onClose={() => setModal(null)}
          isEdit={!!modal.item}
        />
      )}
      {modal?.type === "bulkDelete" && (
        <ConfirmModal
          title="선택 삭제"
          msg={`선택한 ${selected.size}건을 삭제하시겠습니까?\n삭제된 데이터는 복구할 수 없습니다.`}
          onConfirm={handleBulkDelete}
          onCancel={() => setModal(null)}
        />
      )}
      {modal?.type === "deleteAll" && (
        <ConfirmModal
          title="전체 삭제"
          msg={`현재 목록의 ${items.length}건을 전체 삭제하시겠습니까?\n삭제된 데이터는 복구할 수 없습니다.`}
          onConfirm={handleDeleteAll}
          onCancel={() => setModal(null)}
        />
      )}
      {deleteTarget && (
        <ConfirmModal
          title="콘테스트 삭제"
          msg={`"${deleteTarget.name}" 삭제하시겠습니까?`}
          onConfirm={handleDeleteContest}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
      {deleteParticipant && (
        <ConfirmModal
          title="참가자 삭제"
          msg={`"${deleteParticipant.petName}" 삭제하시겠습니까?`}
          onConfirm={handleDeleteParticipant}
          onCancel={() => setDeleteParticipant(null)}
        />
      )}

      {/* 헤더 */}
      <div
        style={{
          display: "flex",
          alignItems: isMobile ? "stretch" : "center",
          justifyContent: "space-between",
          marginBottom: 20,
          flexDirection: isMobile ? "column" : "row",
          gap: isMobile ? 12 : 16,
        }}
      >
        <div style={{ display: "flex", alignItems: isMobile ? "flex-start" : "center", gap: 12, flexDirection: isMobile ? "column" : "row" }}>
          <button
            onClick={leaveDetail}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "9px 18px",
              borderRadius: 10,
              border: "none",
              background: ds.brand,
              color: "#fff",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: ds.ff,
              boxShadow: "0 2px 8px rgba(67,97,238,.25)",
            }}
          >
            <ChevronLeft size={15} /> 행사 목록
          </button>
          <div>
            <div style={{ fontSize: 17, fontWeight: 800, color: ds.ink }}>
              {selectedEvent.name}
            </div>
            <div style={{ fontSize: 12, color: ds.ink4 }}>
              콘테스트 {items.length}개 · 참가자 {allP}팀
            </div>
          </div>
        </div>
        <button
          onClick={() => setModal({ item: null })}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "10px 20px",
            borderRadius: 10,
            border: "none",
            background: RED.primary,
            color: "#fff",
            fontSize: 13,
            fontWeight: 700,
            cursor: "pointer",
            fontFamily: ds.ff,
            boxShadow: `0 2px 10px ${RED.primary}40`,
            width: isMobile ? "100%" : "auto",
            justifyContent: "center",
          }}
        >
          <Plus size={15} /> 콘테스트 추가
        </button>
      </div>

      {/* 통계 */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "repeat(2, minmax(0, 1fr))" : "repeat(4,1fr)",
          gap: 12,
          marginBottom: 20,
        }}
      >
        {[
          {
            label: "전체 콘테스트",
            value: `${items.length}개`,
            icon: <Trophy size={18} color="#F59E0B" />,
            bg: ds.amberSoft,
          },
          {
            label: "투표 진행 중",
            value: `${liveCount}개`,
            icon: <Heart size={18} color={RED.primary} />,
            bg: RED.soft,
          },
          {
            label: "총 참가팀",
            value: `${allP}팀`,
            icon: <Users size={18} color="#3a4520" />,
            bg: ds.greenSoft,
          },
          {
            label: "총 투표수",
            value: `${totalVotes}표`,
            icon: <BarChart3 size={18} color="#D97706" />,
            bg: ds.amberSoft,
          },
        ].map((s) => (
          <div
            key={s.label}
            style={{
              background: ds.card,
              border: "1px solid #ECEEF3",
              borderRadius: 14,
              padding: "18px 20px",
              display: "flex",
              alignItems: "center",
              gap: 14,
            }}
          >
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 11,
                background: s.bg,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              {s.icon}
            </div>
            <div>
              <div style={{ fontSize: 12, color: "#868E9C", fontWeight: 500 }}>
                {s.label}
              </div>
              <div style={{ fontSize: 20, fontWeight: 800, color: ds.ink }}>
                {s.value}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 2열 레이아웃 */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : selectedContest ? "380px 1fr" : "1fr",
          gap: 16,
        }}
      >
        {/* ── 좌: 콘테스트 목록 ── */}
        <div
          style={{
            background: ds.card,
            border: "1px solid #ECEEF3",
            borderRadius: 14,
            padding: "20px 22px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 14,
              paddingBottom: 12,
              borderBottom: "1px solid #F1F3F6",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: 15,
                fontWeight: 700,
                color: ds.ink,
              }}
            >
              <div
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 7,
                  background: ds.amberSoft,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Trophy size={13} color="#F59E0B" />
              </div>
              콘테스트 목록
            </div>
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: "#868E9C",
                background: ds.lineSoft,
                padding: "4px 10px",
                borderRadius: 100,
              }}
            >
              총 {items.length}개
            </span>
          </div>

          {/* 툴바 */}
          {items.length > 0 && (
            <div
              style={{
                display: "flex",
                alignItems: isMobile ? "stretch" : "center",
                justifyContent: "space-between",
                marginBottom: 10,
                flexDirection: isMobile ? "column" : "row",
                gap: isMobile ? 10 : 12,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", width: isMobile ? "100%" : "auto" }}>
                <Checkbox
                  checked={isAllSelected && items.length > 0}
                  onChange={toggleAll}
                />
                <span style={{ fontSize: 12, color: ds.ink4 }}>전체 선택</span>
                {hasSelected && (
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: ds.brand,
                      background: `${ds.brand}0C`,
                      padding: "3px 8px",
                      borderRadius: 5,
                    }}
                  >
                    {selected.size}건
                  </span>
                )}
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", width: isMobile ? "100%" : "auto" }}>
                {hasSelected && (
                  <button
                    onClick={() => setModal({ type: "bulkDelete" })}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      padding: "5px 10px",
                      borderRadius: 6,
                      border: "1px solid #FECACA",
                      background: RED.soft,
                      fontSize: 11,
                      fontWeight: 600,
                      color: RED.primary,
                      cursor: "pointer",
                      fontFamily: ds.ff,
                      flex: isMobile ? "1 1 0" : "0 0 auto",
                      justifyContent: "center",
                    }}
                  >
                    <Trash2 size={11} /> 선택 삭제
                  </button>
                )}
                <button
                  onClick={() => setModal({ type: "deleteAll" })}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    padding: "5px 10px",
                    borderRadius: 6,
                    border: `1px solid ${ds.line}`,
                    background: ds.card,
                    fontSize: 11,
                    fontWeight: 600,
                    color: ds.ink3,
                    cursor: "pointer",
                    fontFamily: ds.ff,
                    flex: isMobile ? "1 1 0" : "0 0 auto",
                    justifyContent: "center",
                  }}
                >
                  <Trash2 size={11} /> 전체 삭제
                </button>
              </div>
            </div>
          )}

          {loadingItems ? (
            <div style={{ textAlign: "center", padding: 30, color: ds.ink4 }}>
              로딩 중...
            </div>
          ) : items.length === 0 ? (
            /* ★ 빈 상태: 완전 가운데 정렬 */
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "50px 0",
                minHeight: 160,
              }}
            >
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: "50%",
                  background: ds.lineSoft,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 12,
                }}
              >
                <Trophy size={22} color={ds.ink4} />
              </div>
              <div style={{ fontSize: 14, fontWeight: 600, color: ds.ink4 }}>
                등록된 콘테스트가 없습니다
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: ds.ink4,
                  marginTop: 4,
                  opacity: 0.7,
                }}
              >
                우측 상단 버튼으로 추가해보세요
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {items.map((it, idx) => (
                <div
                  key={it.programId}
                  style={{ display: "flex", alignItems: "flex-start", gap: 8 }}
                >
                  <div style={{ paddingTop: 13 }}>
                    <Checkbox
                      checked={selected.has(it.programId || it.id)}
                      onChange={() => toggleOne(it.programId || it.id)}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <ContestCard
                      item={it}
                      idx={idx}
                      isSelected={selectedContest?.programId === it.programId}
                      onClick={() => selectContest(it)}
                      participantCount={getParticipants(it.programId).length}
                      onEdit={(item) => setModal({ item })}
                      onDelete={(item) => setDeleteTarget(item)}
                      compact={isMobile}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── 우: 참가자 그리드 ── */}
        {selectedContest && (
          <div
            style={{
              background: ds.card,
              border: "1px solid #ECEEF3",
              borderRadius: 14,
              padding: "20px 24px",
            }}
          >
            {/* 배너 — 이미지 있으면 배경 이미지, 없으면 레드 */}
            <div
              style={{
                borderRadius: 14,
                padding: "22px 24px 18px",
                color: "#fff",
                marginBottom: 18,
                position: "relative",
                overflow: "hidden",
                background: toPublicAssetUrl(selectedContest.imageUrl)
                  ? `url(${toPublicAssetUrl(selectedContest.imageUrl)}) center/cover no-repeat`
                  : selectedContest.status === "active"
                    ? "linear-gradient(135deg, #052e16 0%, #14532d 60%, #166534 100%)"
                    : selectedContest.status === "ended"
                      ? "linear-gradient(135deg, #111827 0%, #1f2937 100%)"
                      : "linear-gradient(135deg, #0f172a 0%, #1e2d45 60%, #162032 100%)",
                border: toPublicAssetUrl(selectedContest.imageUrl)
                  ? "none"
                  : "1px solid rgba(255,255,255,0.08)",
                minHeight: 110,
              }}
            >
              {/* 이미지 위에 어두운 오버레이 */}
              {toPublicAssetUrl(selectedContest.imageUrl) && (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background:
                      "linear-gradient(135deg,rgba(0,0,0,0.55) 0%,rgba(0,0,0,0.25) 100%)",
                    borderRadius: 14,
                  }}
                />
              )}
              {/* 이미지 없을 때 장식 원 */}
              {!toPublicAssetUrl(selectedContest.imageUrl) && (
                <div
                  style={{
                    position: "absolute",
                    top: -50,
                    right: -30,
                    width: 160,
                    height: 160,
                    background: "rgba(255,255,255,0.06)",
                    borderRadius: "50%",
                  }}
                />
              )}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 6,
                  position: "relative",
                  zIndex: 1,
                }}
              >
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                    padding: "4px 12px",
                    background: "rgba(255,255,255,0.18)",
                    borderRadius: 100,
                    fontSize: 11,
                    fontWeight: 700,
                    backdropFilter: "blur(4px)",
                  }}
                >
                  {contestBadge(selectedContest.status).dot && (
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background: "#FBBF24",
                        animation: "pulseGlow 2s infinite",
                      }}
                    />
                  )}
                  {contestBadge(selectedContest.status).l}
                </div>
                <span
                  style={{
                    fontSize: 12,
                    opacity: 0.85,
                    position: "relative",
                    zIndex: 1,
                  }}
                >
                  {totalVotes}표 참여
                </span>
              </div>
              <div
                style={{
                  fontSize: 22,
                  fontWeight: 900,
                  position: "relative",
                  zIndex: 1,
                  display: "flex",
                  alignItems: isMobile ? "flex-start" : "center",
                  gap: 8,
                  textShadow: "0 1px 6px rgba(0,0,0,0.3)",
                  lineHeight: 1.3,
                }}
              >
                <Trophy size={20} /> {selectedContest.name}
              </div>
              <div
                style={{
                  display: "flex",
                  gap: 18,
                  marginTop: 10,
                  position: "relative",
                  zIndex: 1,
                  flexWrap: "wrap",
                }}
              >
                <span
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    fontSize: 13,
                    opacity: 0.9,
                  }}
                >
                  <Users size={13} /> {participants.length}팀
                </span>
                {selectedContest.startAt && (
                  <span
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 5,
                      fontSize: 13,
                      opacity: 0.9,
                    }}
                  >
                    <CalendarDays size={13} />{" "}
                    {selectedContest.startAt.split("T")[0]}
                  </span>
                )}
              </div>
            </div>

            {/* 참가자 헤더 */}
            <div
              style={{
                display: "flex",
                alignItems: isMobile ? "stretch" : "center",
                justifyContent: "space-between",
                marginBottom: 16,
                flexDirection: isMobile ? "column" : "row",
                gap: isMobile ? 12 : 16,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", minWidth: 0 }}>
                <div
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: 7,
                    background: RED.soft,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Dog size={13} color={RED.dark} />
                </div>
                <span style={{ fontSize: 15, fontWeight: 700, color: ds.ink }}>
                  참가자 관리
                </span>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: "#868E9C",
                    background: ds.lineSoft,
                    padding: "3px 10px",
                    borderRadius: 100,
                  }}
                >
                  {participants.length}팀
                </span>
                <button
                  onClick={() => {
                    if (!selectedContest) return;
                    setParticipantsMap((prev) => {
                      const n = { ...prev };
                      delete n[selectedContest.programId];
                      return n;
                    });
                    setTimeout(() => selectContest(selectedContest), 0);
                  }}
                  title="새로고침"
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid #2E3A4E",
                    borderRadius: 7,
                    cursor: "pointer",
                    color: "#6B7A99",
                    fontSize: 13,
                    padding: "3px 8px",
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  🔄
                </button>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", width: isMobile ? "100%" : "auto" }}>
                <button
                  onClick={() => handleVoteStart(true)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "8px 16px",
                    borderRadius: 9,
                    border: "none",
                    background: "linear-gradient(135deg,#3a4520,#059669)",
                    color: "#fff",
                    fontSize: 12.5,
                    fontWeight: 700,
                    cursor: "pointer",
                    boxShadow: "0 2px 8px rgba(16,185,129,.3)",
                    flex: isMobile ? "1 1 0" : "0 0 auto",
                    justifyContent: "center",
                  }}
                >
                  ▶ 투표 시작
                </button>
                <button
                  onClick={() => handleVoteStart(false)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "8px 16px",
                    borderRadius: 9,
                    border: "none",
                    background: "linear-gradient(135deg,#6366f1,#4f46e5)",
                    color: "#fff",
                    fontSize: 12.5,
                    fontWeight: 700,
                    cursor: "pointer",
                    boxShadow: "0 2px 8px rgba(99,102,241,.3)",
                    flex: isMobile ? "1 1 0" : "0 0 auto",
                    justifyContent: "center",
                  }}
                >
                  ⏹ 투표 종료
                </button>
              </div>
            </div>

            {/* 카드 그리드 */}
            {participants.length === 0 ? (
              /* ★ 빈 상태 가운데 정렬 */
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "60px 20px",
                  minHeight: 200,
                }}
              >
                <div
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: "50%",
                    background: RED.soft,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 14,
                  }}
                >
                  <Dog size={28} color={RED.primary} />
                </div>
                <div
                  style={{
                    fontSize: 15,
                    fontWeight: 700,
                    color: ds.ink3,
                    marginBottom: 6,
                  }}
                >
                  아직 참가자가 없습니다
                </div>
                <div style={{ fontSize: 13, color: ds.ink4, marginBottom: 18 }}>
                  참가 신청이 들어오면 이곳에 표시됩니다
                </div>
              </div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(200px, 1fr))",
                  gap: 14,
                }}
              >
                {sortedP.map((p, i) => (
                  <ParticipantCard
                    key={p.id}
                    p={p}
                    rank={i + 1}
                    totalVotes={totalVotes}
                    onDelete={(item) => setDeleteParticipant(item)}
                    onApprove={(item) => handleApproveParticipant(item)}
                    onReject={(item) => handleRejectParticipant(item)}
                  />
                ))}
              </div>
            )}

            {/* 투표 안내 — 한 줄, 눈에 띄는 배경 */}
            {participants.length > 0 && (
              <div
                style={{
                  marginTop: 14,
                  padding: "11px 16px",
                  borderRadius: 10,
                  background: "#1E3A5F",
                  border: "1px solid #2E5FA3",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <Info size={13} color="#7EB3FF" style={{ flexShrink: 0 }} />
                <span
                  style={{ fontSize: 12, color: "#A8CCFF", fontWeight: 500 }}
                >
                  1회 투표 · 변경 불가 · 실시간 반영 · 홈페이지에서 투표
                </span>
              </div>
            )}
          </div>
        )}

        {!selectedContest && items.length > 0 && (
          <div
            style={{
              background: ds.card,
              border: "1px solid #ECEEF3",
              borderRadius: 14,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 60,
            }}
          >
            <div style={{ textAlign: "center" }}>
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: "50%",
                  background: RED.soft,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 12px",
                }}
              >
                <ChevronLeft size={22} color={RED.primary} />
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: ds.ink3 }}>
                콘테스트를 선택하세요
              </div>
              <div style={{ fontSize: 13, color: ds.ink4, marginTop: 4 }}>
                좌측에서 선택하면 참가자를 관리할 수 있습니다
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
