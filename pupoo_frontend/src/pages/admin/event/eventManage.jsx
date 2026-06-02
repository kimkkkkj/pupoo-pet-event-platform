import { useState, useEffect, useRef } from "react";
import {
  MapPin,
  MoreHorizontal,
  Plus,
  X,
  Pencil,
  Trash2,
  Eye,
  ChevronDown,
  CalendarDays,
  Users,
  TrendingUp,
  Clock,
  AlertTriangle,
  Calendar,
  Check,
  ArrowRight,
  Upload,
  ImagePlus,
  Sparkles,
  Wand2,
} from "lucide-react";
import ds, { cardStyle, statusMap } from "../shared/designTokens";
import { Pill, DataTable, Td } from "../shared/Components";
import DATA from "../shared/data";
import { sortAdminEventsByOperationalPriority } from "../shared/adminStatus";
import {
  setEventImage,
  removeEventImage,
  loadImageCache,
} from "../shared/eventImageStore";
import { axiosInstance } from "../../../app/http/axiosInstance";
import { eventApi } from "../../../app/http/eventApi";
import { getToken } from "../../../api/noticeApi";
import {
  resolveImageUrl,
  toPublicAssetUrl,
} from "../../../shared/utils/publicAssetUrl";

/* ═══════════════════════════════════════════
   전역 스타일
   ═══════════════════════════════════════════ */
const styles = `
@keyframes toastIn{from{opacity:0;transform:translateY(-12px)}to{opacity:1;transform:translateY(0)}}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes slideUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
@keyframes slideIn{from{transform:translateX(100%)}to{transform:translateX(0)}}
@keyframes rowFadeOut{from{opacity:1;transform:translateX(0)}to{opacity:0;transform:translateX(-30px)}}
@keyframes aiShimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
@keyframes aiPulse{0%,100%{opacity:.6}50%{opacity:1}}
@keyframes aiSpin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
.row-removing{animation:rowFadeOut .3s ease forwards}
.em-date-input::-webkit-calendar-picker-indicator{opacity:0;position:absolute;inset:0;width:100%;cursor:pointer}
`;

/* ═══════════════════════════════════════════
   체크박스
   ═══════════════════════════════════════════ */
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

/* ═══════════════════════════════════════════
   미니 프로그레스 바
   ═══════════════════════════════════════════ */
function MiniProgress({ value, max }) {
  const pct = max > 0 ? Math.min(Math.round((value / max) * 100), 100) : 0;
  const color = pct >= 90 ? "#EF4444" : pct >= 70 ? "#F59E0B" : "#3a4520";
  const r = 16,
    stroke = 3.5,
    circ = 2 * Math.PI * r;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <svg width={40} height={40} style={{ transform: "rotate(-90deg)" }}>
        <circle
          cx={20}
          cy={20}
          r={r}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={stroke}
        />
        <circle
          cx={20}
          cy={20}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeDasharray={circ}
          strokeDashoffset={circ - (circ * pct) / 100}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset .5s ease" }}
        />
      </svg>
      <div>
        <div
          style={{
            fontSize: 13,
            fontWeight: 800,
            color: ds.ink,
            lineHeight: 1,
          }}
        >
          {pct}%
        </div>
        <div style={{ fontSize: 10, color: ds.ink4, marginTop: 2 }}>
          {value}/{max}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   토스트
   ═══════════════════════════════════════════ */
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
      {type === "success" ? "✓" : type === "error" ? "✕" : "!"} {msg}
    </div>
  );
}

/* ═══════════════════════════════════════════
   모달 오버레이
   ═══════════════════════════════════════════ */
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
          width: 500,
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

/* ═══════════════════════════════════════════
   확인 모달
   ═══════════════════════════════════════════ */
function ConfirmModal({ title, msg, onConfirm, onCancel, danger }) {
  return (
    <Overlay onClose={onCancel}>
      <div style={{ padding: "28px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 14,
          }}
        >
          {danger && (
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
          )}
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
            {danger ? "삭제" : "확인"}
          </button>
        </div>
      </div>
    </Overlay>
  );
}

/* ═══════════════════════════════════════════
   입력 필드
   ═══════════════════════════════════════════ */
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
          letterSpacing: 0.2,
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
  boxSizing: "border-box",
  transition: "border-color .15s, box-shadow .15s",
  background: ds.bg,
};
const inputFocus = (e) => {
  e.target.style.borderColor = ds.brand;
  e.target.style.boxShadow = `0 0 0 3px ${ds.brand}15`;
};
const inputBlur = (e) => {
  e.target.style.borderColor = ds.line;
  e.target.style.boxShadow = "none";
};

/* ═══════════════════════════════════════════
   등록폼 날짜 (시작~종료 드롭다운)
   ═══════════════════════════════════════════ */
const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);
const daysIn = (y, m) => new Date(y, m, 0).getDate();

function DatePick({ label, year, month, day, onChange }) {
  const days = daysIn(year, month);
  const selBase = {
    ...inputStyle,
    appearance: "none",
    paddingRight: 26,
    cursor: "pointer",
    padding: "9px 26px 9px 10px",
    fontSize: 13,
    textAlign: "center",
    borderRadius: 8,
  };
  const Wrap = ({ children, flex }) => (
    <div style={{ position: "relative", flex: flex || 1 }}>
      {children}
      <ChevronDown
        size={12}
        color={ds.ink4}
        style={{
          position: "absolute",
          right: 8,
          top: "50%",
          transform: "translateY(-50%)",
          pointerEvents: "none",
        }}
      />
    </div>
  );
  return (
    <div>
      <div
        style={{
          fontSize: 11,
          color: ds.ink4,
          fontWeight: 600,
          marginBottom: 6,
          display: "flex",
          alignItems: "center",
          gap: 4,
        }}
      >
        <Calendar size={11} /> {label}
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        <Wrap flex={1.3}>
          <select
            value={year}
            onChange={(e) => {
              const ny = +e.target.value;
              onChange(ny, month, Math.min(day, daysIn(ny, month)));
            }}
            style={selBase}
          >
            {[2025, 2026, 2027].map((y) => (
              <option key={y} value={y}>
                {y}년
              </option>
            ))}
          </select>
        </Wrap>
        <Wrap>
          <select
            value={month}
            onChange={(e) => {
              const nm = +e.target.value;
              onChange(year, nm, Math.min(day, daysIn(year, nm)));
            }}
            style={selBase}
          >
            {MONTHS.map((m) => (
              <option key={m} value={m}>
                {m}월
              </option>
            ))}
          </select>
        </Wrap>
        <Wrap>
          <select
            value={day}
            onChange={(e) => onChange(year, month, +e.target.value)}
            style={selBase}
          >
            {Array.from({ length: days }, (_, i) => i + 1).map((d) => (
              <option key={d} value={d}>
                {d}일
              </option>
            ))}
          </select>
        </Wrap>
      </div>
    </div>
  );
}

function DateRangeInput({ startDate, endDate, onStartChange, onEndChange }) {
  const now = new Date();
  const defY = now.getFullYear(),
    defM = now.getMonth() + 1,
    defD = now.getDate();
  const parse = (str, fb) => {
    if (!str) return fb;
    const p = str.replace(/[-.\/]/g, ".").split(".");
    return {
      y: parseInt(p[0]) || defY,
      m: parseInt(p[1]) || defM,
      d: parseInt(p[2]) || defD,
    };
  };
  const fmt = (y, m, d) =>
    `${y}.${String(m).padStart(2, "0")}.${String(d).padStart(2, "0")}`;
  const s = parse(startDate, { y: defY, m: defM, d: defD });
  const e = parse(endDate, { y: defY, m: defM, d: defD });
  return (
    <div style={{ background: ds.bg, borderRadius: 10, padding: 14 }}>
      <DatePick
        label="시작일"
        year={s.y}
        month={s.m}
        day={s.d}
        onChange={(y, m, d) => onStartChange(fmt(y, m, d))}
      />
      <div
        style={{
          textAlign: "center",
          fontSize: 13,
          color: ds.ink4,
          fontWeight: 700,
          padding: "8px 0",
          letterSpacing: 4,
        }}
      >
        ~
      </div>
      <DatePick
        label="종료일"
        year={e.y}
        month={e.m}
        day={e.d}
        onChange={(y, m, d) => onEndChange(fmt(y, m, d))}
      />
    </div>
  );
}

/* ═══════════════════════════════════════════
   인라인 날짜 필터 (시작 날짜 → 끝나는 날짜)
   ═══════════════════════════════════════════ */
function fmtDisplay(v) {
  if (!v) return null;
  const m = v.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? `${m[2]}월 ${m[3]}일` : null;
}

function DateFilterInline({ startDate, endDate, onStartChange, onEndChange }) {
  const hasFilter = !!(startDate || endDate);
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        border: `1px solid ${ds.line}`,
        borderRadius: 8,
        background: ds.card,
        overflow: "hidden",
        height: 32,
      }}
    >
      {/* 시작 날짜 */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "0 10px",
          position: "relative",
          height: "100%",
        }}
      >
        <span
          style={{
            fontSize: 11.5,
            color: startDate ? ds.ink : ds.ink4,
            fontWeight: startDate ? 600 : 500,
            whiteSpace: "nowrap",
          }}
        >
          {fmtDisplay(startDate) || "시작 날짜"}
        </span>
        <Calendar size={13} color={startDate ? ds.brand : ds.ink4} />
        <input
          type="date"
          className="em-date-input"
          value={startDate}
          onChange={(e) => {
            onStartChange(e.target.value);
            if (e.target.value > endDate && endDate)
              onEndChange(e.target.value);
          }}
          style={{
            position: "absolute",
            inset: 0,
            opacity: 0,
            cursor: "pointer",
            width: "100%",
          }}
        />
      </div>
      {/* 화살표 */}
      <div
        style={{
          width: 28,
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderLeft: `1px solid ${ds.line}`,
          borderRight: `1px solid ${ds.line}`,
          background: ds.bg,
          flexShrink: 0,
        }}
      >
        <ArrowRight size={12} color={ds.ink4} strokeWidth={2} />
      </div>
      {/* 끝 날짜 */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "0 10px",
          position: "relative",
          height: "100%",
        }}
      >
        <span
          style={{
            fontSize: 11.5,
            color: endDate ? ds.ink : ds.ink4,
            fontWeight: endDate ? 600 : 500,
            whiteSpace: "nowrap",
          }}
        >
          {fmtDisplay(endDate) || "끝나는 날짜"}
        </span>
        <Calendar size={13} color={endDate ? ds.brand : ds.ink4} />
        <input
          type="date"
          className="em-date-input"
          value={endDate}
          onChange={(e) => {
            onEndChange(e.target.value);
            if (e.target.value < startDate && startDate)
              onStartChange(e.target.value);
          }}
          style={{
            position: "absolute",
            inset: 0,
            opacity: 0,
            cursor: "pointer",
            width: "100%",
          }}
        />
      </div>
      {/* 초기화 버튼 */}
      {hasFilter && (
        <div
          onClick={() => {
            onStartChange("");
            onEndChange("");
          }}
          style={{
            width: 28,
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderLeft: `1px solid ${ds.line}`,
            cursor: "pointer",
            flexShrink: 0,
            transition: "background .1s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = ds.bg)}
          onMouseLeave={(e) =>
            (e.currentTarget.style.background = "transparent")
          }
          title="날짜 필터 초기화"
        >
          <X size={12} color={ds.ink4} strokeWidth={2} />
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════
   등록/수정 중앙 모달 (이미지 드래그&드롭 포함)
   ═══════════════════════════════════════════ */
function EventFormModal({ item, onSave, onClose, isEdit }) {
  const todayStr = (() => {
    const d = new Date();
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
  })();
  const parseExisting = (dateStr) => {
    if (!dateStr) return { start: todayStr, end: todayStr };
    if (dateStr.includes("~")) {
      const [s, e] = dateStr.split("~").map((x) => x.trim());
      return { start: s, end: e };
    }
    return { start: dateStr, end: dateStr };
  };
  const existing = item
    ? parseExisting(item.date)
    : { start: todayStr, end: todayStr };

  const [form, setForm] = useState(
    item
      ? { ...item, dateStart: existing.start, dateEnd: existing.end }
      : {
          name: "",
          dateStart: todayStr,
          dateEnd: todayStr,
          location: "",
          status: "pending",
          participants: 0,
          capacity: 500,
          description: "",
        },
  );
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));
  const [err, setErr] = useState("");
  const [visible, setVisible] = useState(false);

  /* 이미지 업로드 상태 */
  const initialImageUrl = item?.imageUrl || null;
  const [imagePreview, setImagePreview] = useState(
    initialImageUrl ? toPublicAssetUrl(initialImageUrl) : null,
  );
  const [imageValue, setImageValue] = useState(initialImageUrl);
  const [imageFile, setImageFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [isGeneratingPoster, setIsGeneratingPoster] = useState(false);
  const [posterPrompt, setPosterPrompt] = useState("");
  const fileInputRef = useRef(null);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 20);
    return () => clearTimeout(t);
  }, []);

  /* 이미지 처리 */
  const handleImageFile = (file) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setErr("이미지 파일만 업로드 가능합니다. (JPG, PNG, GIF, WEBP)");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setErr("파일 크기는 10MB 이하만 가능합니다.");
      return;
    }
    setImageFile(file);
    setImageValue(null);
    const reader = new FileReader();
    reader.onload = (e) => setImagePreview(e.target.result);
    reader.readAsDataURL(file);
    setErr("");
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    handleImageFile(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => setDragOver(false);

  const removeImage = () => {
    setImagePreview(null);
    setImageValue(null);
    setImageFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleGeneratePoster = async () => {
    if (!form.name?.trim() || !form.location?.trim()) {
      setErr("행사명과 장소를 입력한 뒤 AI 포스터를 생성하세요.");
      return;
    }

    setIsGeneratingPoster(true);
    try {
      const res = await eventApi.generateAdminPoster(
        {
          eventName: form.name.trim(),
          description: form.description?.trim() || "",
          startAt: toISO(form.dateStart, false, form.startAt),
          endAt: toISO(form.dateEnd, true, form.endAt),
          location: form.location.trim(),
          extraPrompt: posterPrompt.trim(),
        },
        {
          headers: authHeaders(),
        },
      );
      const poster = res.data?.data || res.data;
      if (!poster?.imageUrl) {
        throw new Error("AI poster response is empty.");
      }
      setImageFile(null);
      setImageValue(poster.imageUrl);
      setImagePreview(toPublicAssetUrl(poster.imageUrl));
      if (fileInputRef.current) fileInputRef.current.value = "";
      setErr("");
    } catch (error) {
      console.error("[EventManage] AI 포스터 생성 실패:", error);
      const message =
        error?.response?.data?.error?.message ||
        error?.response?.data?.message ||
        "AI 포스터 생성에 실패했습니다.";
      setErr(message);
    } finally {
      setIsGeneratingPoster(false);
    }
  };

  const handleSave = () => {
    if (!form.name || !form.location) {
      setErr("행사명, 장소는 필수입니다.");
      return;
    }
    const dateStr =
      form.dateStart === form.dateEnd
        ? form.dateStart
        : `${form.dateStart} ~ ${form.dateEnd}`;
    const { dateStart, dateEnd, ...rest } = form;
    onSave({
      ...rest,
      date: dateStr,
      dateStart,
      dateEnd,
      imageFile,
      imageUrl: imageFile ? null : imageValue,
    });
  };

  return (
    <>
      {/* 배경 오버레이 */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 4999,
          background: visible ? "rgba(10,10,18,0.6)" : "rgba(10,10,18,0)",
          backdropFilter: visible ? "blur(4px)" : "none",
          transition: "all .35s ease",
        }}
      />

      {/* 중앙 모달 */}
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
            width: 960,
            maxWidth: "96vw",
            maxHeight: "min(680px, 85vh)",
            background: ds.card,
            borderRadius: 24,
            boxShadow:
              "0 40px 100px rgba(0,0,0,0.3), 0 12px 36px rgba(0,0,0,0.15)",
            display: "flex",
            flexDirection: "row",
            overflow: "hidden",
            transform: visible
              ? "translateY(0) scale(1)"
              : "translateY(20px) scale(0.98)",
            opacity: visible ? 1 : 0,
            transition: "all .4s cubic-bezier(.16,1,.3,1)",
          }}
        >
          {/* ═══ 왼쪽 패널: 행사 정보 입력 ═══ */}
          <div style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            minWidth: 0,
          }}>
            {/* 헤더 */}
            <div
              style={{
                padding: "24px 32px",
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
                    fontSize: 20,
                    fontWeight: 800,
                    color: ds.ink,
                    margin: 0,
                    letterSpacing: -0.4,
                  }}
                >
                  {isEdit ? "행사 수정" : "새 행사 등록"}
                </h3>
                <p style={{ fontSize: 13, color: ds.ink4, margin: "5px 0 0" }}>
                  {isEdit ? "행사 정보를 수정합니다" : "행사 정보를 입력하고 AI 포스터를 만들어보세요"}
                </p>
              </div>
              <button
                onClick={onClose}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  border: `1px solid ${ds.line}`,
                  background: ds.card,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "background .15s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = ds.bg)}
                onMouseLeave={(e) => (e.currentTarget.style.background = ds.card)}
              >
                <X size={16} color={ds.ink4} />
              </button>
            </div>

            {/* 본문 (스크롤 영역) */}
            <div style={{ flex: 1, overflow: "auto", padding: "22px 32px" }}>
              {err && (
                <div
                  style={{
                    background: ds.redSoft,
                    border: `1px solid ${ds.red}33`,
                    borderRadius: 12,
                    padding: "12px 16px",
                    fontSize: 13,
                    color: ds.red,
                    marginBottom: 22,
                    fontWeight: 600,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <AlertTriangle size={15} /> {err}
                </div>
              )}

              {/* ── 행사명 ── */}
              <Field label="행사명" required>
                <input
                  style={{ ...inputStyle, padding: "12px 16px", fontSize: 14 }}
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                  onFocus={inputFocus}
                  onBlur={inputBlur}
                  placeholder="예: 반려견 페스티벌"
                  autoFocus
                />
              </Field>

              {/* ── 장소 ── */}
              <Field label="장소" required>
                <input
                  style={{ ...inputStyle, padding: "12px 16px", fontSize: 14 }}
                  value={form.location}
                  onChange={(e) => set("location", e.target.value)}
                  onFocus={inputFocus}
                  onBlur={inputBlur}
                  placeholder="올림픽 공원"
                />
              </Field>

              {/* ── 행사 일정 ── */}
              <Field label="행사 일정" required>
                <DateRangeInput
                  startDate={form.dateStart}
                  endDate={form.dateEnd}
                  onStartChange={(v) => set("dateStart", v)}
                  onEndChange={(v) => set("dateEnd", v)}
                />
              </Field>

              {/* ── 2열: 정원 / 상태 ── */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 16,
                }}
              >
                <Field label="참가 정원">
                  <input
                    type="number"
                    style={{ ...inputStyle, padding: "12px 16px", fontSize: 14 }}
                    value={form.capacity || ""}
                    onChange={(e) => set("capacity", +e.target.value)}
                    onFocus={inputFocus}
                    onBlur={inputBlur}
                    placeholder="500"
                  />
                </Field>
                <Field label="상태">
                  {(() => {
                    const auto = calcAutoStatus(
                      `${form.dateStart} ~ ${form.dateEnd}`,
                    );
                    const map = {
                      pending: { l: "대기", c: ds.amber },
                      active:  { l: "진행중", c: ds.green },
                      ended:   { l: "종료", c: ds.ink4 },
                    };
                    const s = map[auto] || map.pending;
                    return (
                      <div
                        style={{
                          padding: "12px 16px",
                          borderRadius: 9,
                          background: ds.bg,
                          border: `1.5px solid ${ds.line}`,
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          cursor: "default",
                          boxSizing: "border-box",
                        }}
                      >
                        <div style={{
                          width: 8, height: 8, borderRadius: "50%",
                          background: s.c, boxShadow: `0 0 6px ${s.c}60`, flexShrink: 0,
                        }} />
                        <span style={{ fontSize: 14, fontWeight: 700, color: s.c }}>{s.l}</span>
                        <span style={{ fontSize: 11, color: ds.ink4, marginLeft: "auto", fontWeight: 500 }}>
                          일정 기준 자동
                        </span>
                      </div>
                    );
                  })()}
                </Field>
              </div>

              {/* ── 설명 ── */}
              <Field label="설명">
                <textarea
                  rows={3}
                  style={{ ...inputStyle, resize: "vertical", padding: "12px 16px", fontSize: 14 }}
                  value={form.description || ""}
                  onChange={(e) => set("description", e.target.value)}
                  onFocus={inputFocus}
                  onBlur={inputBlur}
                  placeholder="행사에 대한 간단한 설명을 입력하세요"
                />
              </Field>
            </div>

            {/* 하단 버튼 */}
            <div
              style={{
                padding: "18px 32px",
                borderTop: `1px solid ${ds.line}`,
                display: "flex",
                gap: 12,
                flexShrink: 0,
              }}
            >
              <button
                onClick={onClose}
                style={{
                  padding: "13px 24px",
                  borderRadius: 12,
                  border: `1px solid ${ds.line}`,
                  background: ds.card,
                  fontSize: 14.5,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: ds.ff,
                  color: ds.ink3,
                  transition: "background .15s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = ds.bg)}
                onMouseLeave={(e) => (e.currentTarget.style.background = ds.card)}
              >
                취소
              </button>
              <button
                onClick={handleSave}
                disabled={isGeneratingPoster}
                style={{
                  flex: 1,
                  padding: "13px 0",
                  borderRadius: 12,
                  border: "none",
                  background: isGeneratingPoster
                    ? ds.ink4
                    : `linear-gradient(135deg, ${ds.brand} 0%, ${ds.brandDark} 100%)`,
                  color: "#fff",
                  fontSize: 14.5,
                  fontWeight: 700,
                  cursor: isGeneratingPoster ? "not-allowed" : "pointer",
                  fontFamily: ds.ff,
                  boxShadow: isGeneratingPoster ? "none" : `0 4px 14px ${ds.brand}40`,
                  transition: "all .15s ease",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                }}
                onMouseDown={(e) => {
                  if (!isGeneratingPoster) e.currentTarget.style.transform = "scale(0.98)";
                }}
                onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
                onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
              >
                <Check size={16} />
                {isEdit ? "수정 완료" : "행사 등록하기"}
              </button>
            </div>
          </div>

          {/* ═══ 오른쪽 패널: AI 포스터 ═══ */}
          <div
            style={{
              width: 380,
              flexShrink: 0,
              background: "linear-gradient(160deg, #2a1520 0%, #1e1018 40%, #1a0c14 100%)",
              display: "flex",
              flexDirection: "column",
              position: "relative",
              overflow: "hidden",
              borderLeft: `1px solid ${ds.line}`,
            }}
          >
            {/* 배경 글로우 */}
            <div style={{
              position: "absolute", top: -60, right: -60, width: 200, height: 200, borderRadius: "50%",
              background: "radial-gradient(circle, rgba(232,80,91,0.15) 0%, transparent 70%)", pointerEvents: "none",
            }} />
            <div style={{
              position: "absolute", bottom: -40, left: -40, width: 160, height: 160, borderRadius: "50%",
              background: "radial-gradient(circle, rgba(232,80,91,0.08) 0%, transparent 70%)", pointerEvents: "none",
            }} />

            {/* 헤더 */}
            <div style={{ padding: "22px 24px 0", flexShrink: 0, position: "relative" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 12,
                  background: `linear-gradient(135deg, ${ds.brand} 0%, ${ds.brandDark} 100%)`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  boxShadow: `0 6px 20px ${ds.brand}50`,
                }}>
                  <ImagePlus size={20} color="#fff" />
                </div>
                <div>
                  <div style={{
                    fontSize: 16, fontWeight: 800, color: "#fff", letterSpacing: -0.3,
                  }}>
                    행사 포스터
                  </div>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", marginTop: 3 }}>
                    직접 올리거나, AI로 만들 수 있어요
                  </div>
                </div>
              </div>
            </div>

            {/* 이미지 프리뷰 / 업로드 / 로딩 영역 */}
            <div style={{ flex: 1, padding: "16px 24px", overflow: "auto", display: "flex", flexDirection: "column" }}>
              {isGeneratingPoster ? (
                /* ── 로딩 UI ── */
                <div style={{
                  flex: 1, minHeight: 160, borderRadius: 16, display: "flex", flexDirection: "column",
                  alignItems: "center", justifyContent: "center",
                  background: "rgba(232,80,91,0.06)", border: `1px solid ${ds.brand}20`,
                  position: "relative", overflow: "hidden",
                }}>
                  {/* 시머 효과 */}
                  <div style={{
                    position: "absolute", inset: 0,
                    background: `linear-gradient(90deg, transparent 0%, ${ds.brand}08 50%, transparent 100%)`,
                    backgroundSize: "200% 100%",
                    animation: "aiShimmer 2s ease infinite",
                  }} />
                  <div style={{
                    width: 56, height: 56, borderRadius: "50%",
                    border: `3px solid ${ds.brand}20`, borderTopColor: ds.brand,
                    animation: "aiSpin 1s linear infinite", marginBottom: 20,
                  }} />
                  <div style={{ fontSize: 15, fontWeight: 700, color: "#fff", marginBottom: 6 }}>
                    AI가 포스터를 만들고 있어요
                  </div>
                  <div style={{ fontSize: 12.5, color: "rgba(255,255,255,0.4)", textAlign: "center", lineHeight: 1.5 }}>
                    행사 정보를 분석하고 디자인하는 중...<br />최대 3분 정도 걸릴 수 있어요
                  </div>
                </div>
              ) : !imagePreview ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  style={{
                    flex: 1, minHeight: 160,
                    border: `2px dashed ${dragOver ? ds.brand : `${ds.brand}40`}`,
                    borderRadius: 16, display: "flex", flexDirection: "column",
                    alignItems: "center", justifyContent: "center", cursor: "pointer",
                    background: dragOver ? `${ds.brand}12` : "rgba(255,255,255,0.02)",
                    transition: "all .25s ease",
                  }}
                  onMouseEnter={(e) => {
                    if (!dragOver) { e.currentTarget.style.borderColor = `${ds.brand}66`; e.currentTarget.style.background = `${ds.brand}08`; }
                  }}
                  onMouseLeave={(e) => {
                    if (!dragOver) { e.currentTarget.style.borderColor = `${ds.brand}40`; e.currentTarget.style.background = "rgba(255,255,255,0.02)"; }
                  }}
                >
                  <div style={{
                    width: 56, height: 56, borderRadius: 16, background: `${ds.brand}18`,
                    display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16,
                  }}>
                    <ImagePlus size={26} color={ds.brand} />
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "rgba(255,255,255,0.7)", marginBottom: 6 }}>
                    직접 이미지 올리기
                  </div>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.3)" }}>
                    클릭 또는 드래그 · JPG, PNG, GIF, WEBP · 최대 10MB
                  </div>
                </div>
              ) : (
                <div style={{
                  flex: 1, position: "relative", borderRadius: 16, overflow: "hidden",
                  border: `1px solid ${ds.brand}25`, minHeight: 160,
                }}>
                  <img src={imagePreview} alt="미리보기" style={{
                    width: "100%", height: "100%", minHeight: 160, maxHeight: 240,
                    objectFit: "cover", display: "block",
                  }} />
                  <div style={{ position: "absolute", top: 10, right: 10, display: "flex", gap: 6 }}>
                    <button
                      onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                      style={{
                        width: 34, height: 34, borderRadius: 10, border: "none",
                        background: "rgba(0,0,0,0.6)", color: "#fff", cursor: "pointer",
                        display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(8px)",
                      }}
                      title="이미지 변경"
                    ><Pencil size={14} /></button>
                    <button
                      onClick={(e) => { e.stopPropagation(); removeImage(); }}
                      style={{
                        width: 34, height: 34, borderRadius: 10, border: "none",
                        background: "rgba(239,68,68,0.75)", color: "#fff", cursor: "pointer",
                        display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(8px)",
                      }}
                      title="이미지 삭제"
                    ><Trash2 size={14} /></button>
                  </div>
                </div>
              )}
              <input
                ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }}
                onChange={(e) => handleImageFile(e.target.files?.[0])}
              />
            </div>

            {/* AI 프롬프트 영역 — 하단 고정 */}
            <div style={{
              padding: "0 24px 22px", flexShrink: 0, position: "relative",
              display: "flex", flexDirection: "column", gap: 12,
            }}>
              {/* 구분선 */}
              <div style={{
                display: "flex", alignItems: "center", gap: 12,
              }}>
                <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.1)" }} />
                <div style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "4px 12px", borderRadius: 20,
                  background: `${ds.brand}15`, border: `1px solid ${ds.brand}20`,
                }}>
                  <Wand2 size={12} color={ds.brand} />
                  <span style={{ fontSize: 11, fontWeight: 700, color: ds.brand }}>
                    AI로 만들기
                  </span>
                  <span style={{
                    fontSize: 9, fontWeight: 700, color: ds.brand,
                    background: `${ds.brand}20`, padding: "1px 6px", borderRadius: 10,
                    letterSpacing: 0.3,
                  }}>BETA</span>
                </div>
                <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.1)" }} />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <span style={{ fontSize: 12.5, color: "rgba(255,255,255,0.4)" }}>
                  어떤 분위기로 만들까요?
                </span>
              </div>
              <textarea
                value={posterPrompt}
                maxLength={1000}
                disabled={isGeneratingPoster}
                onChange={(e) => setPosterPrompt(e.target.value)}
                onFocus={(e) => {
                  e.target.style.borderColor = ds.brand;
                  e.target.style.boxShadow = `0 0 0 3px ${ds.brand}25`;
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = `${ds.brand}40`;
                  e.target.style.boxShadow = "none";
                }}
                rows={3}
                placeholder={"원하는 분위기를 자유롭게 적어주세요\n예) 봄 벚꽃이 흩날리는 따뜻한 분위기, 미니멀한 레이아웃, 파스텔톤 색감..."}
                style={{
                  width: "100%", padding: "16px 18px", borderRadius: 14,
                  border: `1.5px solid ${ds.brand}40`, fontSize: 14.5, fontFamily: ds.ff,
                  color: "#fff", outline: "none", boxSizing: "border-box",
                  transition: "border-color .15s, box-shadow .15s",
                  background: `${ds.brand}0a`, resize: "none", lineHeight: 1.6,
                  opacity: isGeneratingPoster ? 0.5 : 1,
                }}
              />
              <button
                type="button"
                onClick={handleGeneratePoster}
                disabled={isGeneratingPoster}
                style={{
                  width: "100%", display: "flex", alignItems: "center", justifyContent: "center",
                  gap: 10, padding: "15px 0", borderRadius: 14, border: "none",
                  background: isGeneratingPoster
                    ? `linear-gradient(135deg, ${ds.brandDark} 0%, #b8353f 100%)`
                    : `linear-gradient(135deg, ${ds.brand} 0%, ${ds.brandDark} 100%)`,
                  color: "#fff", fontSize: 15.5, fontWeight: 800, fontFamily: ds.ff,
                  cursor: isGeneratingPoster ? "not-allowed" : "pointer",
                  boxShadow: `0 4px 20px ${ds.brand}50`, transition: "all .2s ease", letterSpacing: -0.2,
                  opacity: isGeneratingPoster ? 0.6 : 1,
                }}
                onMouseEnter={(e) => {
                  if (!isGeneratingPoster) {
                    e.currentTarget.style.boxShadow = `0 6px 28px ${ds.brand}66`;
                    e.currentTarget.style.transform = "translateY(-1px)";
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = `0 4px 20px ${ds.brand}50`;
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                {isGeneratingPoster ? (
                  <>
                    <div style={{
                      width: 18, height: 18, border: "2.5px solid rgba(255,255,255,0.3)",
                      borderTopColor: "#fff", borderRadius: "50%", animation: "aiSpin .8s linear infinite",
                    }} />
                    만드는 중...
                  </>
                ) : (
                  <>
                    <Wand2 size={19} />
                    포스터 만들기
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/* ═══════════════════════════════════════════
   상세 모달
   ═══════════════════════════════════════════ */
function DetailModal({ item, onClose, onEdit, onDelete }) {
  const st = statusMap[item.status];
  const pct =
    item.capacity > 0
      ? Math.round((item.participants / item.capacity) * 100)
      : 0;
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
            style={{ fontSize: 16, fontWeight: 800, color: ds.ink, margin: 0 }}
          >
            행사 상세
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

        {/* ── 행사 포스터 이미지 ── */}
        {item.imageUrl && (
          <div
            style={{
              marginBottom: 18,
              borderRadius: 12,
              overflow: "hidden",
              background: ds.lineSoft,
            }}
          >
            <img
              src={resolveImageUrl(item.imageUrl)}
              alt={item.name}
              style={{
                width: "100%",
                maxHeight: 220,
                objectFit: "cover",
                display: "block",
              }}
            />
          </div>
        )}

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
                fontSize: 11,
                fontWeight: 700,
                color: ds.ink4,
                fontFamily: "monospace",
              }}
            >
              {item.id}
            </span>
            <Pill color={st.c} bg={st.bg}>
              {st.l}
            </Pill>
          </div>
          <h4
            style={{
              fontSize: 17,
              fontWeight: 800,
              color: ds.ink,
              margin: "0 0 14px",
            }}
          >
            {item.name}
          </h4>
          {[
            { l: "일정", v: item.date },
            { l: "장소", v: item.location },
            {
              l: "참가자 수",
              v: `${item.participants} / ${item.capacity || 500}명 (${pct}%)`,
            },
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
              <span style={{ fontSize: 13, color: ds.ink3, fontWeight: 500 }}>
                {r.l}
              </span>
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

/* ═══════════════════════════════════════════
   더보기 드롭다운
   ═══════════════════════════════════════════ */
function ActionMenu({ onEdit, onDelete, onDetail }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const close = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);
  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setOpen(!open);
        }}
        style={{
          background: open ? ds.lineSoft : "none",
          border: "none",
          cursor: "pointer",
          padding: 5,
          borderRadius: 6,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "background .1s",
        }}
        onMouseEnter={(e) => {
          if (!open) e.currentTarget.style.background = ds.lineSoft;
        }}
        onMouseLeave={(e) => {
          if (!open) e.currentTarget.style.background = "none";
        }}
      >
        <MoreHorizontal size={15} color={ds.ink4} />
      </button>
      {open && (
        <div
          style={{
            position: "absolute",
            right: 0,
            top: "100%",
            marginTop: 4,
            zIndex: 100,
            background: ds.card,
            borderRadius: 10,
            border: `1px solid ${ds.line}`,
            boxShadow: "0 8px 24px rgba(0,0,0,0.1)",
            minWidth: 130,
            overflow: "hidden",
            animation: "fadeIn .1s ease",
          }}
        >
          {[
            { label: "상세보기", icon: Eye, color: ds.ink3, fn: onDetail },
            { label: "수정하기", icon: Pencil, color: ds.brand, fn: onEdit },
            { label: "삭제", icon: Trash2, color: "#EF4444", fn: onDelete },
          ].map((a) => (
            <button
              key={a.label}
              onClick={(e) => {
                e.stopPropagation();
                setOpen(false);
                a.fn();
              }}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "9px 14px",
                border: "none",
                background: "none",
                fontSize: 12.5,
                fontWeight: 600,
                color: a.color,
                cursor: "pointer",
                fontFamily: ds.ff,
                transition: "background .1s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = ds.bg)}
              onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
            >
              <a.icon size={13} /> {a.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════
   요약 통계 카드
   ═══════════════════════════════════════════ */
function StatCard({ icon: Icon, label, value, color, mobile = false }) {
  return (
    <div
      style={{
        background: ds.card,
        borderRadius: 14,
        padding: mobile ? "16px 14px" : "18px 18px",
        border: `1px solid ${ds.line}`,
        position: "relative",
        overflow: "hidden",
        minWidth: 0,
      }}
    >
      <div
        style={{
          position: "absolute",
          top: -8,
          right: -8,
          width: 60,
          height: 60,
          borderRadius: "50%",
          background: `${color}08`,
        }}
      />
      <div style={{ position: "relative", zIndex: 1 }}>
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 8,
            marginBottom: 10,
            minWidth: 0,
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 9,
              background: `${color}12`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon size={15} color={color} strokeWidth={2.2} />
          </div>
          <span
            style={{
              fontSize: mobile ? 11 : 11.5,
              fontWeight: 600,
              color: ds.ink4,
              minWidth: 0,
              whiteSpace: "normal",
              wordBreak: "keep-all",
              overflowWrap: "break-word",
              lineHeight: 1.35,
            }}
          >
            {label}
          </span>
        </div>
        <div
          style={{
            fontSize: mobile ? 18 : 22,
            fontWeight: 800,
            color: ds.ink,
            letterSpacing: -0.5,
            minWidth: 0,
            whiteSpace: "normal",
            wordBreak: "keep-all",
            overflowWrap: "break-word",
            lineHeight: 1.15,
          }}
        >
          {value}
        </div>
      </div>
    </div>
  );
}
/* ═══════════════════════════════════════════
   메인 컴포넌트
   ═══════════════════════════════════════════ */
/* ── 프론트 status ↔ 백엔드 EventStatus 매핑 ── */
const STATUS_TO_BACKEND = {
  pending: "PLANNED",
  active: "ONGOING",
  ended: "ENDED",
};
const BACKEND_TO_FRONT = {
  PLANNED: "pending",
  ONGOING: "active",
  ENDED: "ended",
  CANCELLED: "ended",
};
const authHeaders = () => {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

/* 프론트 날짜("2026.01.10") → ISO LocalDateTime
   - referenceIso가 있으면 기존 시/분/초를 유지해 날짜만 변경
   - referenceIso가 없으면 기본 운영시간(09:00:00~18:00:00) 사용 */
const toISO = (dotDate, isEnd, referenceIso = null) => {
  if (!dotDate) return referenceIso || null;
  const d = dotDate.replace(/\./g, "-").split("T")[0];

  const ref = referenceIso ? new Date(referenceIso) : null;
  const hasRef = ref && !Number.isNaN(ref.getTime());
  const hh = hasRef ? String(ref.getHours()).padStart(2, "0") : isEnd ? "18" : "09";
  const mm = hasRef ? String(ref.getMinutes()).padStart(2, "0") : "00";
  const ss = hasRef ? String(ref.getSeconds()).padStart(2, "0") : "00";

  return `${d}T${hh}:${mm}:${ss}`;
};

/**
 * 한국시간(KST) 기준으로 날짜에서 자동 상태 판정
 * - endAt < now   → "ended"  (종료)
 * - startAt > now → "pending" (대기)
 * - 그 외         → "active" (진행중)
 */
const calcAutoStatus = (dateStr) => {
  if (!dateStr) return "pending";
  // "2026.01.10 ~ 2026.01.12" 또는 "2026-01-10T00:00:00"
  let startStr, endStr;
  if (dateStr.includes("~")) {
    [startStr, endStr] = dateStr.split("~").map((s) => s.trim());
  } else {
    startStr = dateStr;
    endStr = dateStr;
  }
  // "2026.01.10" → Date
  const parse = (s) => {
    if (!s) return null;
    const clean = s.replace(/\./g, "-").split("T")[0];
    return new Date(clean + "T00:00:00+09:00"); // KST 기준
  };
  const start = parse(startStr);
  const end = parse(endStr);
  if (!start || !end) return "pending";
  // end는 해당 날짜 끝까지 (23:59:59 KST)
  const endOfDay = new Date(end.getTime() + 24 * 60 * 60 * 1000 - 1);
  const now = new Date();
  if (now > endOfDay) return "ended";
  if (now < start) return "pending";
  return "active";
};

export default function EventManage({ subTab = "all" }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewportWidth, setViewportWidth] = useState(() =>
    typeof window === "undefined" ? 1440 : window.innerWidth,
  );
  const [modal, setModal] = useState(null);
  const [panel, setPanel] = useState(null);
  const [toast, setToast] = useState(null);
  const [removing, setRemoving] = useState(null);
  const [selected, setSelected] = useState(new Set());
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const syncViewport = () => setViewportWidth(window.innerWidth);
    syncViewport();
    window.addEventListener("resize", syncViewport);
    return () => window.removeEventListener("resize", syncViewport);
  }, []);

  /* ── API에서 행사 목록 로드 ── */
  const loadEvents = async () => {
    try {
      await loadImageCache();
      const res = await axiosInstance.get("/api/admin/dashboard/events", {
        headers: authHeaders(),
      });
      const list = res.data?.data || res.data || [];
      const mapped = list.map((e) => {
        const eid = e.eventId || e.id;
        const imgUrl = e.imageUrl || null;
        if (imgUrl) setEventImage(eid, imgUrl);
        else removeEventImage(eid);
        /* startAt/endAt → 표시용 date 문자열 생성 */
        const fmtD = (iso) => {
          if (!iso) return "";
          const d = new Date(iso);
          if (isNaN(d)) return iso;
          return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
        };
        const dateStr =
          e.date ||
          (e.startAt
            ? e.endAt
              ? `${fmtD(e.startAt)} ~ ${fmtD(e.endAt)}`
              : fmtD(e.startAt)
            : "");
        return {
          ...e,
          name: e.name || e.eventName || "행사",
          date: dateStr,
          capacity: e.capacity || 500,
          _visible: true,
          status: calcAutoStatus(dateStr),
          imageUrl: imgUrl,
        };
      });
      setItems(sortAdminEventsByOperationalPriority(mapped));
    } catch (err) {
      console.error("[EventManage] 행사 목록 로드 실패:", err);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, []);

  const normalizeDate = (str) => {
    if (!str) return null;
    return str.replace(/\./g, "-").split("~")[0].trim();
  };

  const filterFn =
    {
      all: () => true,
      active: (e) => e.status === "active",
      ended: (e) => e.status === "ended",
      new: (e) => e.status === "pending",
    }[subTab] || (() => true);

  const rows = items
    .filter((e) => e._visible)
    .filter(filterFn)
    .filter((e) => {
      if (!dateFrom && !dateTo) return true;
      const d = normalizeDate(e.date);
      if (!d) return true;
      if (dateFrom && d < dateFrom) return false;
      if (dateTo && d > dateTo) return false;
      return true;
    });

  const showToast = (msg, type = "success") => setToast({ msg, type });

  const vis = items.filter((e) => e._visible);
  const totalEvents = vis.length;
  const activeEvents = vis.filter((e) => e.status === "active").length;
  const totalParticipants = vis.reduce((a, b) => a + b.participants, 0);
  const pendingEvents = vis.filter((e) => e.status === "pending").length;
  const isMobile = viewportWidth < 768;

  const isAllSelected =
    rows.length > 0 && rows.every((r) => selected.has(r.id));
  const hasSelected = selected.size > 0;
  const toggleAll = () => {
    if (isAllSelected) setSelected(new Set());
    else setSelected(new Set(rows.map((r) => r.id)));
  };
  const toggleOne = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const uploadEventPoster = async (imageFile) => {
    if (!imageFile) return null;
    const formData = new FormData();
    formData.append("file", imageFile);
    const res = await eventApi.uploadAdminPoster(formData, {
      headers: authHeaders(),
    });
    return res.data?.data?.imageUrl || res.data?.imageUrl || null;
  };

  const handleCreate = async (form) => {
    try {
      const autoStatus = calcAutoStatus(`${form.dateStart} ~ ${form.dateEnd}`);
      const imageUrl = form.imageFile
        ? await uploadEventPoster(form.imageFile)
        : form.imageUrl || null;
      const body = {
        eventName: form.name,
        description: form.description || "",
        startAt: toISO(
          form.dateStart || form.date?.split("~")[0]?.trim(),
          false,
          form.startAt,
        ),
        endAt: toISO(
          form.dateEnd || form.date?.split("~")[1]?.trim(),
          true,
          form.endAt,
        ),
        location: form.location,
        imageUrl,
        status: STATUS_TO_BACKEND[autoStatus] || "PLANNED",
      };
      const res = await axiosInstance.post(
        "/api/admin/dashboard/events",
        body,
        {
          headers: authHeaders(),
        },
      );
      const created = res.data?.data || res.data;
      const newId = created?.eventId || created?.id;
      if (newId) {
        if (imageUrl) setEventImage(newId, imageUrl);
        else removeEventImage(newId);
      }
      await loadEvents();
      setPanel(null);
      showToast("새 행사가 등록되었습니다.");
    } catch (err) {
      console.error("[EventManage] 등록 실패:", err);
      showToast("행사 등록에 실패했습니다.", "error");
    }
  };
  const handleUpdate = async (form) => {
    try {
      const eventId = form.eventId || form.id?.replace("EV-", "");
      const autoStatus = calcAutoStatus(`${form.dateStart} ~ ${form.dateEnd}`);
      const imageUrl = form.imageFile
        ? await uploadEventPoster(form.imageFile)
        : form.imageUrl || null;
      const body = {
        eventName: form.name,
        description: form.description || "",
        startAt: toISO(
          form.dateStart || form.date?.split("~")[0]?.trim(),
          false,
          form.startAt,
        ),
        endAt: toISO(
          form.dateEnd || form.date?.split("~")[1]?.trim(),
          true,
          form.endAt,
        ),
        location: form.location,
        imageUrl,
        status: STATUS_TO_BACKEND[autoStatus] || "PLANNED",
      };
      await axiosInstance.patch(
        `/api/admin/dashboard/events/${eventId}`,
        body,
        {
          headers: authHeaders(),
        },
      );
      if (imageUrl) setEventImage(eventId, imageUrl);
      else removeEventImage(eventId);
      await loadEvents();
      setPanel(null);
      showToast("행사 정보가 수정되었습니다.");
    } catch (err) {
      console.error("[EventManage] 수정 실패:", err);
      showToast("행사 수정에 실패했습니다.", "error");
    }
  };
  const handleDelete = async () => {
    const item = modal.item;
    const eventId = item.eventId || item.id?.replace("EV-", "");
    setModal(null);
    setRemoving(item.id);
    try {
      await axiosInstance.delete(`/api/admin/dashboard/events/${eventId}`, {
        headers: authHeaders(),
      });
      setTimeout(async () => {
        await loadEvents();
        setRemoving(null);
        setSelected((prev) => {
          const n = new Set(prev);
          n.delete(item.id);
          return n;
        });
        showToast("행사가 삭제되었습니다.");
      }, 300);
    } catch (err) {
      console.error("[EventManage] 삭제 실패:", err);
      setRemoving(null);
      showToast("행사 삭제에 실패했습니다.", "error");
    }
  };
  const handleBulkDelete = async () => {
    const ids = [...selected];
    setModal(null);
    try {
      const eventIds = ids.map((frontId) => {
        const item = items.find((e) => e.id === frontId);
        return item?.eventId || Number(frontId.replace("EV-", ""));
      });
      await axiosInstance.post(
        "/api/admin/dashboard/events/bulk-delete",
        { eventIds },
        { headers: authHeaders() },
      );
      await loadEvents();
      setSelected(new Set());
      showToast(`${ids.length}건의 행사가 삭제되었습니다.`);
    } catch (err) {
      console.error("[EventManage] 일괄 삭제 실패:", err);
      showToast("일괄 삭제에 실패했습니다.", "error");
    }
  };
  const handleDeleteAll = async () => {
    setModal(null);
    try {
      const eventIds = rows.map(
        (r) => r.eventId || Number(r.id.replace("EV-", "")),
      );
      await axiosInstance.post(
        "/api/admin/dashboard/events/bulk-delete",
        { eventIds },
        { headers: authHeaders() },
      );
      await loadEvents();
      setSelected(new Set());
      showToast(`${eventIds.length}건의 행사가 삭제되었습니다.`);
    } catch (err) {
      console.error("[EventManage] 전체 삭제 실패:", err);
      showToast("전체 삭제에 실패했습니다.", "error");
    }
  };

  const cols = [
    { label: "", w: 44 },
    { label: "행사명", w: "30%" },
    { label: "일정", w: 160 },
    { label: "장소", w: 120 },
    { label: "참가율", align: "center", w: 120 },
    { label: "상태", w: 72 },
    { label: "", w: 150 },
  ];

  return (
    <div>
      <style>{styles}</style>

      {/* ── 로딩 표시 ── */}
      {loading && (
        <div style={{ textAlign: "center", padding: "60px 20px" }}>
          <div
            style={{
              width: 32,
              height: 32,
              border: `3px solid ${ds.line}`,
              borderTopColor: ds.brand,
              borderRadius: "50%",
              animation: "spin 0.8s linear infinite",
              margin: "0 auto 12px",
            }}
          />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          <div style={{ fontSize: 13, color: ds.ink4 }}>
            행사 데이터를 불러오는 중...
          </div>
        </div>
      )}

      {!loading && (
        <>
          {/* ── 상단 통계 ── */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "repeat(2, minmax(0, 1fr))" : "repeat(4, 1fr)",
              gap: 12,
              marginBottom: 16,
            }}
          >
            <StatCard
              icon={CalendarDays}
              label="전체 행사"
              value={totalEvents}
              color={ds.brand}
              mobile={isMobile}
            />
            <StatCard
              icon={TrendingUp}
              label="진행 중"
              value={activeEvents}
              color="#3a4520"
              mobile={isMobile}
            />
            <StatCard
              icon={Users}
              label="총 참가자"
              value={totalParticipants.toLocaleString()}
              color="#8B5CF6"
              mobile={isMobile}
            />
            <StatCard
              icon={Clock}
              label="대기 중"
              value={pendingEvents}
              color="#F59E0B"
              mobile={isMobile}
            />
          </div>

          {/* ── 테이블 카드 (헤더에 필터·버튼 통합) ── */}
          <div
            style={{
              background: ds.card,
              borderRadius: 14,
              border: `1px solid ${ds.line}`,
              overflow: "hidden",
            }}
          >
            {/* 테이블 헤더 바 */}
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
              {/* 좌: 제목 + 건수 + 날짜필터 */}
              <div style={{ display: "flex", alignItems: isMobile ? "stretch" : "center", flexDirection: isMobile ? "column" : "row", gap: 10, flexWrap: "wrap", minWidth: 0, width: isMobile ? "100%" : "auto" }}>
                <span style={{ fontSize: 14, fontWeight: 800, color: ds.ink }}>
                  행사 목록
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
                  {rows.length}
                </span>
                {!isMobile && (
                  <div
                    style={{
                      width: 1,
                      height: 16,
                      background: ds.line,
                      margin: "0 2px",
                    }}
                  />
                )}
                <DateFilterInline
                  startDate={dateFrom}
                  endDate={dateTo}
                  onStartChange={setDateFrom}
                  onEndChange={setDateTo}
                />
              </div>

              {/* 우: 삭제 + 등록 */}
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
                      border: `1px solid ${ds.red}33`,
                      background: ds.redSoft,
                      fontSize: 12,
                      fontWeight: 600,
                      color: ds.red,
                      cursor: "pointer",
                      fontFamily: ds.ff,
                      animation: "fadeIn .15s ease",
                      flex: isMobile ? "1 1 calc(50% - 3px)" : "0 0 auto",
                      justifyContent: "center",
                      minHeight: 40,
                    }}
                  >
                    <Trash2 size={12} /> 선택 삭제 ({selected.size})
                  </button>
                )}
                {hasSelected && rows.length > 0 && (
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
                      transition: "all .1s",
                      flex: isMobile ? "1 1 calc(50% - 3px)" : "0 0 auto",
                      justifyContent: "center",
                      minHeight: 40,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = `${ds.red}33`;
                      e.currentTarget.style.color = ds.red;
                      e.currentTarget.style.background = ds.redSoft;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = ds.line;
                      e.currentTarget.style.color = ds.ink4;
                      e.currentTarget.style.background = ds.card;
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
                    transition: "transform .1s",
                    width: isMobile ? "100%" : "auto",
                    justifyContent: "center",
                    minHeight: 44,
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.transform = "translateY(-1px)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.transform = "translateY(0)")
                  }
                >
                  <Plus size={13} strokeWidth={2.5} /> 행사 등록
                </button>
              </div>
            </div>

            {/* 테이블 헤드 */}
            {isMobile ? (
              <div style={{ display: "flex", flexDirection: "column", padding: 12, gap: 12 }}>
                {rows.map((r) => {
                  const st = statusMap[r.status];
                  const isRemoving = removing === r.id;
                  const isChecked = selected.has(r.id);
                  const capacity = Number(r.capacity || 500);
                  const participants = Number(r.participants || 0);
                  const participationPct = capacity > 0 ? Math.min(Math.round((participants / capacity) * 100), 999) : 0;
                  return (
                    <div
                      key={r.id}
                      className={isRemoving ? "row-removing" : ""}
                      onClick={() => setModal({ type: "detail", item: r })}
                      style={{
                        padding: "14px",
                        border: `1px solid ${isChecked ? `${ds.brand}55` : ds.line}`,
                        borderRadius: 14,
                        background: isChecked ? `${ds.brand}06` : ds.bg,
                        cursor: "pointer",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
                        <div style={{ minWidth: 0, flex: 1, display: "grid", gap: 10 }}>
                          <div style={{ display: "flex", gap: 10, minWidth: 0 }}>
                            {r.imageUrl && (
                              <img
                                src={resolveImageUrl(r.imageUrl)}
                                alt=""
                                style={{
                                  width: 48,
                                  height: 48,
                                  borderRadius: 10,
                                  objectFit: "cover",
                                  flexShrink: 0,
                                  border: `1px solid ${ds.line}`,
                                }}
                              />
                            )}
                            <div style={{ minWidth: 0, flex: 1 }}>
                              <div style={{ minWidth: 0, flex: 1 }}>
                                <div style={{ fontSize: 15, fontWeight: 800, color: ds.ink, whiteSpace: "normal", wordBreak: "keep-all", overflowWrap: "break-word" }}>
                                  {r.name}
                                </div>
                                <div style={{ fontSize: 11, color: ds.ink4, fontFamily: "monospace", marginTop: 3 }}>
                                  {r.id}
                                </div>
                              </div>
                            </div>
                          </div>
                          <div style={{ display: "grid", gap: 6, fontSize: 12.5, color: ds.ink3 }}>
                            <div style={{ whiteSpace: "normal", wordBreak: "keep-all", overflowWrap: "break-word" }}>{r.date}</div>
                            <div style={{ display: "inline-flex", alignItems: "center", gap: 4, whiteSpace: "normal", wordBreak: "keep-all", overflowWrap: "break-word" }}>
                              <MapPin size={12} color={ds.ink4} /> {r.location}
                            </div>
                          </div>
                          <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 8 }}>
                            <div style={{ padding: "10px 12px", borderRadius: 10, background: ds.card, border: `1px solid ${ds.lineSoft}` }}>
                              <div style={{ fontSize: 10.5, color: ds.ink4, marginBottom: 3 }}>참가자</div>
                              <div style={{ fontSize: 15, fontWeight: 800, color: ds.ink }}>{participants.toLocaleString()}</div>
                            </div>
                            <div style={{ display: "none", padding: "10px 12px", borderRadius: 10, background: ds.card, border: `1px solid ${ds.lineSoft}` }}>
                              <div style={{ fontSize: 10.5, color: ds.ink4, marginBottom: 3 }}>수용률</div>
                              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                
                              </div>
                            </div>
                          </div>
                        </div>
                        <div style={{ width: 96, flexShrink: 0, display: "grid", justifyItems: "end", gap: 8 }}>
                          <Checkbox checked={isChecked} onChange={() => toggleOne(r.id)} />
                          <Pill color={st.c} bg={st.bg}>{st.l}</Pill>
                          <div
                            style={{
                              width: "100%",
                              padding: "8px 10px",
                              borderRadius: 12,
                              background: ds.card,
                              border: `1px solid ${ds.lineSoft}`,
                              display: "grid",
                              gap: 6,
                              justifyItems: "center",
                            }}
                          >
                            <MiniProgress value={participants} max={capacity} />
                            <div style={{ fontSize: 16, fontWeight: 800, color: ds.ink, lineHeight: 1 }}>
                              {participationPct}%
                            </div>
                            <div style={{ fontSize: 10.5, color: ds.ink4, lineHeight: 1.2, textAlign: "center", wordBreak: "keep-all" }}>
                              {participants}/{capacity}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8, marginTop: 12 }}>
                        {[
                          { label: "상세", fn: () => setModal({ type: "detail", item: r }), color: ds.ink3, border: ds.line, bg: ds.card },
                          { label: "수정", fn: () => setPanel({ type: "edit", item: r }), color: ds.brand, border: `${ds.brand}25`, bg: `${ds.brand}06` },
                          { label: "삭제", fn: () => setModal({ type: "delete", item: r }), color: "#EF4444", border: "#FECACA60", bg: "transparent" },
                        ].map((action) => (
                          <button
                            key={action.label}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              action.fn();
                            }}
                            style={{
                              minWidth: 0,
                              padding: "9px 10px",
                              borderRadius: 10,
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
                })}
              </div>
            ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${ds.line}` }}>
                  <th style={{ width: 44, padding: "10px 14px" }}>
                    <Checkbox checked={isAllSelected} onChange={toggleAll} />
                  </th>
                  {cols.slice(1).map((c, i) => (
                    <th
                      key={i}
                      style={{
                        padding: "10px 14px",
                        fontSize: 11.5,
                        fontWeight: 700,
                        color: ds.ink4,
                        textAlign: c.align || "left",
                        textTransform: "uppercase",
                        letterSpacing: 0.3,
                        ...(c.w ? { width: c.w } : {}),
                      }}
                    >
                      {c.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const st = statusMap[r.status];
                  const isRemoving = removing === r.id;
                  const isChecked = selected.has(r.id);
                  return (
                    <tr
                      key={r.id}
                      className={isRemoving ? "row-removing" : ""}
                      onClick={() => setModal({ type: "detail", item: r })}
                      style={{
                        borderBottom: `1px solid ${ds.lineSoft}`,
                        cursor: "pointer",
                        transition: "background .1s",
                        background: isChecked ? `${ds.brand}06` : "transparent",
                        borderLeft: `3px solid ${st.c}`,
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
                          onChange={() => toggleOne(r.id)}
                        />
                      </td>
                      <td style={{ padding: "11px 14px" }}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                          }}
                        >
                          {r.imageUrl && (
                            <img
                              src={resolveImageUrl(r.imageUrl)}
                              alt=""
                              style={{
                                width: 36,
                                height: 36,
                                borderRadius: 8,
                                objectFit: "cover",
                                flexShrink: 0,
                                border: `1px solid ${ds.line}`,
                              }}
                            />
                          )}
                          <div>
                            <div
                              style={{
                                fontSize: 13,
                                fontWeight: 700,
                                color: ds.ink,
                              }}
                            >
                              {r.name}
                            </div>
                            <div
                              style={{
                                fontSize: 11,
                                color: ds.ink4,
                                fontFamily: "monospace",
                                marginTop: 1,
                              }}
                            >
                              {r.id}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td
                        style={{
                          padding: "11px 14px",
                          fontSize: 13,
                          color: ds.ink3,
                        }}
                      >
                        {r.date}
                      </td>
                      <td style={{ padding: "11px 14px" }}>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                            fontSize: 13,
                            color: ds.ink3,
                          }}
                        >
                          <MapPin size={12} color={ds.ink4} />
                          {r.location}
                        </span>
                      </td>
                      <td style={{ padding: "11px 14px" }}>
                        <MiniProgress
                          value={r.participants}
                          max={r.capacity || 500}
                        />
                      </td>
                      <td style={{ padding: "11px 14px" }}>
                        <Pill color={st.c} bg={st.bg}>
                          {st.l}
                        </Pill>
                      </td>
                      <td style={{ padding: "11px 10px" }}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          {[
                            {
                              icon: Eye,
                              tip: "상세",
                              color: ds.ink3,
                              bg: ds.lineSoft,
                              fn: () => setModal({ type: "detail", item: r }),
                            },
                            {
                              icon: Pencil,
                              tip: "수정",
                              color: ds.brand,
                              bg: `${ds.brand}0A`,
                              fn: () => setPanel({ type: "edit", item: r }),
                            },
                            {
                              icon: Trash2,
                              tip: "삭제",
                              color: "#EF4444",
                              bg: ds.redSoft,
                              fn: () => setModal({ type: "delete", item: r }),
                            },
                          ].map((a) => (
                            <button
                              key={a.tip}
                              title={a.tip}
                              onClick={(e) => {
                                e.stopPropagation();
                                a.fn();
                              }}
                              style={{
                                width: 30,
                                height: 30,
                                borderRadius: 8,
                                border: "none",
                                background: "transparent",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                cursor: "pointer",
                                transition: "all .12s",
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = a.bg;
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background =
                                  "transparent";
                              }}
                            >
                              <a.icon
                                size={14}
                                color={a.color}
                                strokeWidth={2}
                              />
                            </button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            )}

            {/* 빈 상태 */}
            {rows.length === 0 && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "60px 20px",
                  textAlign: "center",
                }}
              >
                <CalendarDays
                  size={36}
                  color={ds.ink4}
                  style={{ marginBottom: 12 }}
                />
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: ds.ink3,
                    marginBottom: 4,
                  }}
                >
                  등록된 행사가 없습니다
                </div>
                <div style={{ fontSize: 12.5, color: ds.ink4 }}>
                  새 행사를 등록해보세요
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* 등록/수정 모달 */}
      {panel?.type === "create" && (
        <EventFormModal onSave={handleCreate} onClose={() => setPanel(null)} />
      )}
      {panel?.type === "edit" && (
        <EventFormModal
          item={panel.item}
          isEdit
          onSave={handleUpdate}
          onClose={() => setPanel(null)}
        />
      )}

      {/* 모달 */}
      {modal?.type === "detail" && (
        <DetailModal
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
          title="행사 삭제"
          msg={`"${modal.item.name}" 행사를 삭제하시겠습니까?\n삭제된 데이터는 복구할 수 없습니다.`}
          danger
          onConfirm={handleDelete}
          onCancel={() => setModal(null)}
        />
      )}
      {modal?.type === "bulkDelete" && (
        <ConfirmModal
          title="선택 행사 삭제"
          msg={`선택한 ${selected.size}건의 행사를 삭제하시겠습니까?\n삭제된 데이터는 복구할 수 없습니다.`}
          danger
          onConfirm={handleBulkDelete}
          onCancel={() => setModal(null)}
        />
      )}
      {modal?.type === "deleteAll" && (
        <ConfirmModal
          title="전체 행사 삭제"
          msg={`현재 필터의 ${rows.length}건 행사를 모두 삭제하시겠습니까?\n삭제된 데이터는 복구할 수 없습니다.`}
          danger
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
