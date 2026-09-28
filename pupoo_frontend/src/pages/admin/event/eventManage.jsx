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
import { Toast, Overlay, ConfirmModal, Checkbox, Field, StatCard, ModalHeader, Button, StatusBadge, InfoList, IconButton, EmptyState, FormSheet, DocProp } from "../shared/adminUi";

import { isSwappingToFallback } from "../../../shared/utils/imageFallback";
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

/* ═══════════════════════════════════════════
   미니 프로그레스 바
   ═══════════════════════════════════════════ */
function MiniProgress({ value, max }) {
  const pct = max > 0 ? Math.min(Math.round((value / max) * 100), 100) : 0;
  return (
    <div style={{ width: 150 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
        <span style={{ fontSize: 13.5, fontWeight: 600, color: ds.ink }}>{pct}%</span>
        <span style={{ fontSize: 12, color: ds.ink4 }}>
          {value}/{max}명
        </span>
      </div>
      <div style={{ marginTop: 6, height: 6, borderRadius: 3, background: ds.lineSoft, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", borderRadius: 3, background: pct >= 90 ? ds.amber : ds.brand }} />
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   토스트
   ═══════════════════════════════════════════ */

/* ═══════════════════════════════════════════
   모달 오버레이
   ═══════════════════════════════════════════ */

/* ═══════════════════════════════════════════
   확인 모달
   ═══════════════════════════════════════════ */

/* ═══════════════════════════════════════════
   입력 필드
   ═══════════════════════════════════════════ */
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
   등록폼 날짜 (시작 → 종료 한 줄)
   ═══════════════════════════════════════════ */
// 폼 값은 "2026.09.28" 형식이고, 날짜 입력칸은 "2026-09-28" 형식을 쓴다.
const toDashed = (v) => {
  const p = String(v || "").split(/[-./]/).map((x) => x.trim());
  if (p.length < 3 || !p[0]) return "";
  return `${p[0]}-${p[1].padStart(2, "0")}-${p[2].padStart(2, "0")}`;
};
const toDotted = (v) => (v || "").replace(/-/g, ".");

function DateRangeInput({ startDate, endDate, onStartChange, onEndChange }) {
  const s = toDashed(startDate);
  const e = toDashed(endDate);
  const days = s && e ? Math.round((new Date(e) - new Date(s)) / 86400000) + 1 : 0;
  const dateStyle = {
    ...inputStyle,
    flex: "1 1 150px",
    width: "auto",
    minWidth: 0,
    height: 40,
    padding: "0 12px",
    colorScheme: "dark",
    cursor: "pointer",
  };
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
      <input
        type="date"
        aria-label="시작일"
        value={s}
        onChange={(ev) => {
          const v = ev.target.value;
          if (!v) return;
          onStartChange(toDotted(v));
          // 시작일이 종료일보다 늦어지면 종료일을 함께 옮긴다.
          if (e && v > e) onEndChange(toDotted(v));
        }}
        style={dateStyle}
      />
      <ArrowRight size={16} color={ds.ink4} style={{ flexShrink: 0 }} />
      <input
        type="date"
        aria-label="종료일"
        min={s || undefined}
        value={e}
        onChange={(ev) => ev.target.value && onEndChange(toDotted(ev.target.value))}
        style={dateStyle}
      />
      <span
        style={{
          flexShrink: 0,
          minWidth: 56,
          textAlign: "center",
          fontSize: 13,
          fontWeight: 600,
          color: days > 0 ? ds.ink2 : ds.red,
        }}
      >
        {days > 0 ? `${days}일간` : "날짜 확인"}
      </span>
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
            fontSize: 12.5,
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
            fontSize: 12.5,
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
  const [posterModalOpen, setPosterModalOpen] = useState(false);
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

  const autoStatus = calcAutoStatus(`${form.dateStart} ~ ${form.dateEnd}`);
  const startDash = toDashed(form.dateStart);
  const endDash = toDashed(form.dateEnd);
  const days = startDash && endDash ? Math.round((new Date(endDash) - new Date(startDash)) / 86400000) + 1 : 0;
  const [aiOpen, setAiOpen] = useState(false);

  const coverBtn = {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    height: 32,
    padding: "0 12px",
    borderRadius: 8,
    border: "none",
    background: "#FFFFFF",
    color: "#181C20",
    fontSize: 13,
    fontWeight: 600,
    fontFamily: ds.ff,
    cursor: "pointer",
  };
  const ghostCoverBtn = { ...coverBtn, background: ds.card, color: ds.ink2, border: `1px solid ${ds.line}` };

  return (
    <FormSheet
      title={isEdit ? "행사 수정" : "새 행사 등록"}
      onClose={onClose}
      width={880}
      bare
      footer={
        <>
          <Button onClick={onClose}>취소</Button>
          <Button variant="primary" icon={Check} onClick={handleSave} disabled={isGeneratingPoster}>
            {isEdit ? "수정 완료" : "행사 등록"}
          </Button>
        </>
      }
    >

      {/* ── 커버: 행사 포스터 ── */}
      <div
        className="adm-doc-cover"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        style={{ borderColor: dragOver ? ds.brand : undefined }}
      >
        {isGeneratingPoster ? (
          <div className="adm-doc-cover-empty">
            <div style={{ width: 28, height: 28, borderRadius: "50%", border: `2.5px solid ${ds.line}`, borderTopColor: ds.brand, animation: "aiSpin .9s linear infinite" }} />
            <div style={{ fontSize: 14, fontWeight: 600, color: ds.ink2 }}>AI가 포스터를 만들고 있어요</div>
            <div style={{ fontSize: 12.5, color: ds.ink4 }}>최대 3분 정도 걸릴 수 있어요</div>
          </div>
        ) : imagePreview ? (
          <>
            {/* 세로 포스터를 커버 폭에 맞추기 위해 흐린 배경 위에 원본 비율로 올린다 */}
            <div aria-hidden="true" className="adm-doc-cover-blur" style={{ backgroundImage: `url("${imagePreview}")` }} />
            <img
              src={imagePreview}
              alt="행사 포스터"
              data-no-fallback="1"
              onClick={() => setPosterModalOpen(true)}
              style={{ position: "relative", height: "100%", maxWidth: "100%", objectFit: "contain", display: "block", margin: "0 auto", cursor: "zoom-in" }}
            />
            <div className="adm-doc-cover-actions">
              <button type="button" style={coverBtn} onClick={() => fileInputRef.current?.click()}>
                <Upload size={14} /> 변경
              </button>
              <button type="button" style={coverBtn} onClick={() => setAiOpen(true)}>
                <Wand2 size={14} /> AI로 다시 만들기
              </button>
              <button type="button" style={{ ...coverBtn, background: ds.red, color: "#fff" }} onClick={removeImage} aria-label="포스터 삭제">
                <Trash2 size={14} />
              </button>
            </div>
          </>
        ) : (
          <div className="adm-doc-cover-empty">
            <ImagePlus size={24} color={dragOver ? ds.brandText : ds.ink4} />
            <div style={{ fontSize: 14, fontWeight: 600, color: ds.ink2 }}>행사 포스터를 추가하세요</div>
            <div style={{ fontSize: 12.5, color: ds.ink4 }}>이미지를 끌어다 놓거나 아래 버튼을 눌러 주세요 · JPG·PNG·WEBP, 10MB 이하</div>
            <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
              <button type="button" style={coverBtn} onClick={() => fileInputRef.current?.click()}>
                <Upload size={14} /> 이미지 올리기
              </button>
              <button type="button" style={ghostCoverBtn} onClick={() => setAiOpen((v) => !v)}>
                <Wand2 size={14} /> AI로 만들기
              </button>
            </div>
          </div>
        )}
      </div>
      <input
        ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }}
        onChange={(e) => handleImageFile(e.target.files?.[0])}
      />

      {/* AI 포스터 만들기 (펼침) */}
      {aiOpen && !isGeneratingPoster && (
        <div className="adm-doc-ai">
          <Wand2 size={16} color={ds.brandText} style={{ flexShrink: 0 }} />
          <input
            className="adm-doc-inline"
            value={posterPrompt}
            maxLength={1000}
            onChange={(e) => setPosterPrompt(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleGeneratePoster()}
            placeholder="원하는 분위기를 적어 주세요 (선택) · 예: 봄, 파스텔톤, 미니멀"
            style={{ flex: 1 }}
          />
          <Button size="sm" variant="primary" onClick={handleGeneratePoster}>
            포스터 만들기
          </Button>
          <IconButton icon={X} label="닫기" onClick={() => setAiOpen(false)} />
        </div>
      )}

      {err && (
        <div role="alert" style={{ marginTop: 16, background: ds.redSoft, borderRadius: 8, padding: "10px 14px", fontSize: 13, color: ds.red, display: "flex", alignItems: "center", gap: 8 }}>
          <AlertTriangle size={14} /> {err}
        </div>
      )}

      {/* ── 제목 ── */}
      <input
        className="adm-doc-title"
        value={form.name}
        maxLength={100}
        onChange={(e) => set("name", e.target.value)}
        placeholder="행사 이름"
        aria-label="행사명"
        autoFocus
      />

      {/* ── 속성 ── */}
      <div className="adm-doc-props">
        <DocProp icon={MapPin} label="장소" required>
          <input
            className="adm-doc-inline"
            value={form.location}
            onChange={(e) => set("location", e.target.value)}
            placeholder="비어 있음 · 예: 올림픽공원 평화의광장"
            aria-label="장소"
          />
        </DocProp>
        <DocProp icon={CalendarDays} label="일정" required>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <input
              type="date"
              className="adm-doc-inline adm-doc-date"
              aria-label="시작일"
              value={startDash}
              onChange={(ev) => {
                const v = ev.target.value;
                if (!v) return;
                set("dateStart", toDotted(v));
                if (endDash && v > endDash) set("dateEnd", toDotted(v));
              }}
            />
            <ArrowRight size={14} color={ds.ink4} />
            <input
              type="date"
              className="adm-doc-inline adm-doc-date"
              aria-label="종료일"
              min={startDash || undefined}
              value={endDash}
              onChange={(ev) => ev.target.value && set("dateEnd", toDotted(ev.target.value))}
            />
            <span style={{ fontSize: 13, color: days > 0 ? ds.ink3 : ds.red }}>{days > 0 ? `${days}일간` : "날짜를 확인해 주세요"}</span>
          </div>
        </DocProp>
        <DocProp icon={Users} label="정원">
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <input
              type="number"
              min={0}
              className="adm-doc-inline"
              value={form.capacity || ""}
              onChange={(e) => set("capacity", +e.target.value)}
              placeholder="500"
              aria-label="참가 정원"
              style={{ width: 120 }}
            />
            <span style={{ fontSize: 14, color: ds.ink3 }}>명</span>
          </div>
        </DocProp>
        <DocProp icon={Clock} label="상태">
          <div style={{ display: "flex", alignItems: "center", gap: 8, minHeight: 36 }}>
            <StatusBadge status={autoStatus} />
            <span style={{ fontSize: 13, color: ds.ink4 }}>일정에 따라 자동으로 바뀌어요</span>
          </div>
        </DocProp>
      </div>

      {/* ── 설명 ── */}
      <textarea
        className="adm-doc-body"
        value={form.description || ""}
        onChange={(e) => set("description", e.target.value)}
        placeholder="행사 소개, 주요 프로그램, 참가 안내 등을 자유롭게 적어 주세요"
        aria-label="설명"
        rows={10}
      />
      <div style={{ textAlign: "right", fontSize: 12, color: ds.ink4, marginTop: 4 }}>
        {(form.description || "").length.toLocaleString()}자
      </div>

      {posterModalOpen && imagePreview && (
        <div
          onClick={() => setPosterModalOpen(false)}
          style={{
            position: "fixed", inset: 0, zIndex: 100000,
            background: "rgba(0,0,0,0.82)",
            display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
          }}
        >
          <img
            src={imagePreview}
            alt="포스터 크게 보기"
            data-no-fallback="1"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "min(92vw, 560px)", maxHeight: "92vh", objectFit: "contain", borderRadius: 12 }}
          />
          <button
            type="button"
            onClick={() => setPosterModalOpen(false)}
            style={{
              position: "fixed", top: 20, right: 20, width: 40, height: 40,
              borderRadius: "50%", border: "none", background: "#FFFFFF",
              color: "#181C20", cursor: "pointer", display: "flex",
              alignItems: "center", justifyContent: "center",
            }}
            title="닫기"
            aria-label="닫기"
          ><X size={20} /></button>
        </div>
      )}
    </FormSheet>
  );
}


/* ═══════════════════════════════════════════
   상세 모달
   ═══════════════════════════════════════════ */
function DetailModal({ item, onClose, onEdit, onDelete }) {
  const [posterBroken, setPosterBroken] = useState(false);
  const capacity = item.capacity || 500;
  const pct = item.capacity > 0 ? Math.round((item.participants / item.capacity) * 100) : 0;
  const hasPoster = Boolean(item.imageUrl) && !posterBroken;

  return (
    <Overlay onClose={onClose} width={880}>
      <div style={{ display: "flex", flexWrap: "wrap", minHeight: 480 }}>
        {/* 왼쪽: 행사 포스터 */}
        <div
          style={{
            flex: "0 0 320px",
            maxWidth: "100%",
            minHeight: 420,
            position: "relative",
            background: "#0E1114",
            borderRight: `1px solid ${ds.line}`,
          }}
        >
          {hasPoster ? (
            <img
              src={resolveImageUrl(item.imageUrl)}
              alt={`${item.name} 포스터`}
              data-no-fallback="1"
              onError={() => setPosterBroken(true)}
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain", display: "block" }}
            />
          ) : (
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                padding: 24,
                textAlign: "center",
              }}
            >
              <ImagePlus size={28} color={ds.ink4} />
              <div style={{ fontSize: 14, fontWeight: 600, color: ds.ink3 }}>등록된 포스터가 없어요</div>
              <div style={{ fontSize: 12.5, color: ds.ink4, lineHeight: 1.5 }}>수정하기에서 포스터를 올리거나<br />AI로 만들 수 있어요</div>
            </div>
          )}
        </div>

        {/* 오른쪽: 행사 정보 */}
        <div style={{ flex: "1 1 360px", minWidth: 0, display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "16px 16px 0 24px" }}>
            <StatusBadge status={item.status} />
            <span style={{ fontSize: 12.5, color: ds.ink4, fontFamily: "monospace" }}>{item.id}</span>
            <span style={{ flex: 1 }} />
            <IconButton icon={X} label="닫기" onClick={onClose} />
          </div>

          <div style={{ flex: 1, padding: "10px 24px 8px", overflowY: "auto" }}>
            <h3 style={{ margin: "0 0 16px", fontSize: 21, fontWeight: 700, color: ds.ink, lineHeight: 1.35, wordBreak: "keep-all" }}>
              {item.name}
            </h3>
            <InfoList
              items={[
                { label: "일정", value: item.date },
                { label: "장소", value: item.location },
                {
                  label: "참가자",
                  value: (
                    <div>
                      <div>
                        {item.participants} / {capacity}명 <span style={{ color: ds.ink3 }}>({pct}%)</span>
                      </div>
                      <div style={{ marginTop: 8, height: 6, borderRadius: 3, background: "#2A3038", overflow: "hidden" }}>
                        <div style={{ width: `${Math.min(pct, 100)}%`, height: "100%", background: ds.brand }} />
                      </div>
                    </div>
                  ),
                },
                { label: "설명", value: item.description || "등록된 설명이 없어요." },
              ]}
            />
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 8,
              padding: "14px 20px 18px 24px",
              borderTop: `1px solid ${ds.line}`,
            }}
          >
            <Button
              variant="ghost"
              icon={Trash2}
              style={{ color: ds.red }}
              onClick={() => {
                onClose();
                onDelete(item);
              }}
            >
              삭제
            </Button>
            <div style={{ display: "flex", gap: 8 }}>
              <Button variant="secondary" onClick={onClose}>
                닫기
              </Button>
              <Button
                variant="primary"
                icon={Pencil}
                onClick={() => {
                  onClose();
                  onEdit(item);
                }}
              >
                수정하기
              </Button>
            </div>
          </div>
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
          if (!open) e.currentTarget.style.background = ds.cardHover;
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
            { label: "삭제", icon: Trash2, color: ds.red, fn: onDelete },
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

  // 칸 폭을 비율로 나눠 넓은 화면에서도 한 칸만 늘어나지 않게 한다. 긴 행사명·장소는 말줄임.
  const cols = [
    { label: "", w: 52 },
    { label: "상태", w: "8%" },
    { label: "행사명", w: "21%" },
    { label: "일정", w: "17%" },
    { label: "장소" },
    { label: "참가율", w: "17%" },
    { label: "", w: 176 },
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
              color={ds.green}
              mobile={isMobile}
            />
            <StatCard
              icon={Users}
              label="총 참가자"
              value={totalParticipants.toLocaleString()}
              color={ds.violet}
              mobile={isMobile}
            />
            <StatCard
              icon={Clock}
              label="대기 중"
              value={pendingEvents}
              color={ds.amber}
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
                <span style={{ fontSize: 14, fontWeight: 700, color: ds.ink }}>
                  행사 목록
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
                  <Button
                    size="sm"
                    variant="danger"
                    icon={Trash2}
                    style={{ flex: isMobile ? "1 1 calc(50% - 3px)" : "0 0 auto", height: 36 }}
                    onClick={() => setModal({ type: "bulkDelete" })}
                  >
                    선택 삭제 ({selected.size})
                  </Button>
                )}
                {hasSelected && rows.length > 0 && (
                  <Button
                    size="sm"
                    variant="secondary"
                    icon={Trash2}
                    style={{ flex: isMobile ? "1 1 calc(50% - 3px)" : "0 0 auto", height: 36 }}
                    onClick={() => setModal({ type: "deleteAll" })}
                  >
                    전체 삭제
                  </Button>
                )}
                <Button
                  variant="primary"
                  icon={Plus}
                  style={{ width: isMobile ? "100%" : "auto" }}
                  onClick={() => setPanel({ type: "create" })}
                >
                  행사 등록
                </Button>
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
                                data-no-fallback="1"
                                alt=""
                                onError={(e) => { e.currentTarget.style.display = "none"; }}
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
                                <div style={{ fontSize: 15, fontWeight: 700, color: ds.ink, whiteSpace: "normal", wordBreak: "keep-all", overflowWrap: "break-word" }}>
                                  {r.name}
                                </div>
                                <div style={{ fontSize: 12, color: ds.ink4, fontFamily: "monospace", marginTop: 3 }}>
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
                              <div style={{ fontSize: 12, color: ds.ink4, marginBottom: 3 }}>참가자</div>
                              <div style={{ fontSize: 15, fontWeight: 700, color: ds.ink }}>{participants.toLocaleString()}</div>
                            </div>
                            <div style={{ display: "none", padding: "10px 12px", borderRadius: 10, background: ds.card, border: `1px solid ${ds.lineSoft}` }}>
                              <div style={{ fontSize: 12, color: ds.ink4, marginBottom: 3 }}>수용률</div>
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
                            <div style={{ fontSize: 16, fontWeight: 700, color: ds.ink, lineHeight: 1 }}>
                              {participationPct}%
                            </div>
                            <div style={{ fontSize: 12, color: ds.ink4, lineHeight: 1.2, textAlign: "center", wordBreak: "keep-all" }}>
                              {participants}/{capacity}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8, marginTop: 12 }}>
                        {[
                          { label: "상세", fn: () => setModal({ type: "detail", item: r }), color: ds.ink3, border: ds.line, bg: ds.card },
                          { label: "수정", fn: () => setPanel({ type: "edit", item: r }), color: ds.brand, border: `${ds.brand}25`, bg: `${ds.brand}06` },
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
            <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${ds.line}` }}>
                  <th style={{ width: 52, padding: "12px 16px" }}>
                    <Checkbox checked={isAllSelected} onChange={toggleAll} />
                  </th>
                  {cols.slice(1).map((c, i) => (
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
                        borderTop: `1px solid ${ds.line}`,
                        cursor: "pointer",
                        transition: "background .1s",
                        background: isChecked ? ds.brandSoft : "transparent",
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.background = isChecked ? ds.brandSoft : ds.cardHover)
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.background = isChecked ? ds.brandSoft : "transparent")
                      }
                    >
                      <td style={{ width: 44, padding: "14px 16px" }}>
                        <Checkbox
                          checked={isChecked}
                          onChange={() => toggleOne(r.id)}
                        />
                      </td>
                      <td style={{ padding: "14px 16px" }}>
                        <StatusBadge status={r.status} />
                      </td>
                      <td style={{ padding: "14px 16px" }}>
                        <div title={r.name} style={{ fontSize: 14, fontWeight: 600, color: ds.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {r.name}
                        </div>
                        <div style={{ fontSize: 12, color: ds.ink4, marginTop: 2 }}>{r.id}</div>
                      </td>
                      <td style={{ padding: "14px 16px", fontSize: 13.5, color: ds.ink2, whiteSpace: "nowrap" }}>
                        {r.date}
                      </td>
                      <td style={{ padding: "14px 16px" }}>
                        <span
                          title={r.location}
                          style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 13.5, color: ds.ink2, minWidth: 0 }}
                        >
                          <MapPin size={14} color={ds.ink4} style={{ flexShrink: 0 }} />
                          <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.location}</span>
                        </span>
                      </td>
                      <td style={{ padding: "14px 16px" }}>
                        <MiniProgress
                          value={r.participants}
                          max={r.capacity || 500}
                        />
                      </td>
                      <td style={{ padding: "14px 16px" }}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                            justifyContent: "flex-end",
                          }}
                        >
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={(e) => {
                              e.stopPropagation();
                              setModal({ type: "detail", item: r });
                            }}
                          >
                            상세보기
                          </Button>
                          <IconButton
                            icon={Pencil}
                            label="수정"
                            onClick={(e) => {
                              e.stopPropagation();
                              setPanel({ type: "edit", item: r });
                            }}
                          />
                          <IconButton
                            icon={Trash2}
                            label="삭제"
                            danger
                            onClick={(e) => {
                              e.stopPropagation();
                              setModal({ type: "delete", item: r });
                            }}
                          />
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
              <EmptyState icon={CalendarDays} title="등록된 행사가 없습니다" description="오른쪽 위 '행사 등록'으로 새 행사를 만들어 보세요." />
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
