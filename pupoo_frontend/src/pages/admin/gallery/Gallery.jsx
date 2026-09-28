import { useState, useEffect, useCallback, useRef } from "react";
import {
  Plus,
  X,
  Pencil,
  Trash2,
  Camera,
  Heart,
  Eye,
  Search,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Loader2,
  RefreshCw,
  ImageOff,
  Users,
  Film,
  ImagePlus,
  Hash,
  Check,
  Image as ImageIcon,
  Layers,
  CalendarDays,
  Upload,
} from "lucide-react";
import ds from "../shared/designTokens";
import { Pill } from "../shared/Components";
import { axiosInstance } from "../../../app/http/axiosInstance";
import { getToken } from "../../../api/noticeApi";
import { eventApi } from "../../../app/http/eventApi";
import {
  buildRequestUrl,
  getConfiguredBaseUrl,
} from "../../../shared/config/requestUrl";
import { resolveImageUrl } from "../../../shared/utils/publicAssetUrl";
import { Toast, Overlay, ConfirmModal, Checkbox, Field, EmptyState, FormSheet, Tag, IconButton, Button, InfoList, DocProp } from "../shared/adminUi";

import { isSwappingToFallback } from "../../../shared/utils/imageFallback";
/* ══════════════════════════════════════════
   인라인 API
   ══════════════════════════════════════════ */
function authHeaders() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

const api = {
  list: (uiPage = 1, size = 20) =>
    axiosInstance.get("/api/galleries", {
      params: { page: uiPage - 1, size },
      headers: authHeaders(),
    }),
  create: (data) =>
    axiosInstance.post("/api/admin/galleries", data, {
      headers: authHeaders(),
    }),
  update: (id, data) =>
    axiosInstance.patch(`/api/admin/galleries/${id}`, data, {
      headers: authHeaders(),
    }),
  delete: (id) =>
    axiosInstance.delete(`/api/admin/galleries/${id}`, {
      headers: authHeaders(),
    }),
  batchDelete: (ids) =>
    axiosInstance.delete("/api/admin/galleries/batch", {
      headers: authHeaders(),
      data: { ids },
    }),
};

function unwrap(res) {
  return res?.data?.data ?? res?.data ?? null;
}
function fmtDate(dt) {
  if (!dt) return "-";
  const d = new Date(dt);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

/* ── meta 태그 파싱 ──
   DB: "배콩아<!--meta:{"galleryType":"현장","tags":["봄페스티벌","말티즈"]}-->"
   → { text: "배콩아", type: "현장", tags: ["봄페스티벌","말티즈"] }
*/
const META_RE = /<!--meta:(.*?)-->/;
function parseMeta(desc) {
  if (!desc) return { text: "", type: null, tags: [] };
  const m = desc.match(META_RE);
  const text = desc.replace(META_RE, "").trim();
  let type = null,
    tags = [];
  if (m) {
    try {
      const o = JSON.parse(m[1]);
      type = o.galleryType;
      tags = o.tags || [];
    } catch {}
  }
  return { text, type, tags };
}
function isSketch(item) {
  return parseMeta(item.description).type === "현장";
}
function cleanDesc(item) {
  return parseMeta(item.description).text;
}
function getTags(item) {
  return parseMeta(item.description).tags;
}
function appendMeta(desc, galleryType, tags = []) {
  const meta = { galleryType };
  if (tags.length > 0) meta.tags = tags;
  return `${desc || ""}<!--meta:${JSON.stringify(meta)}-->`;
}

/* ── image URL handling ──
   TODO(cloud-native-step-01): remove legacy relative /uploads responses once
   backend rollout finishes and every gallery response exposes a stable URL. */
const API_BASE = getConfiguredBaseUrl(
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_BASE_URL) ||
    "",
);

function resolveImgUrl(url) {
  return resolveImageUrl(url);
}

/* ── 이미지 헬퍼 ── */
function getThumbUrl(item) {
  const url = item.imageUrls?.[0] || null;
  return resolveImgUrl(url);
}
function getImageCount(item) {
  return item.imageUrls?.length || 0;
}
function resolveImageUrls(item) {
  return (item.imageUrls || []).map(resolveImgUrl);
}

const styles = `
@keyframes toastIn{from{opacity:0;transform:translateY(-12px)}to{opacity:1;transform:translateY(0)}}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes slideUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
@keyframes spin{to{transform:rotate(360deg)}}
.gal-card2{transition:transform .18s,box-shadow .18s}
.gal-card2:hover{transform:translateY(-2px);box-shadow:0 8px 24px rgba(0,0,0,0.08)}
.gal-tab{position:relative;padding:10px 20px;font-size:14px;font-weight:700;border:none;background:none;cursor:pointer;color:#94A3B8;transition:color .15s;display:inline-flex;align-items:center;gap:6px;white-space:nowrap}
.gal-tab.active{color:${ds.brand}}
.gal-tab.active::after{content:'';position:absolute;bottom:-1px;left:0;right:0;height:2.5px;background:${ds.brand};border-radius:2px 2px 0 0}
`;

function Spinner({ size = 20 }) {
  return (
    <Loader2
      size={size}
      color={ds.brand}
      style={{ animation: "spin 1s linear infinite" }}
    />
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

function NoImagePlaceholder({ height = 240 }) {
  return (
    <div
      style={{
        height,
        background: ds.lineSoft,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
      }}
    >
      <ImageOff size={32} color={ds.ink4} />
      <span style={{ fontSize: 12, color: ds.ink4, fontWeight: 600 }}>
        이미지 없음
      </span>
    </div>
  );
}

function useEventMap(events) {
  const map = {};
  (events || []).forEach((ev) => {
    map[ev.eventId] = ev.eventName || ev.title || `행사 #${ev.eventId}`;
  });
  return map;
}

/* ═══════ 상세 모달 (사진 왼쪽 / 정보 오른쪽) ═══════ */
const GALLERY_STATUS = {
  PUBLIC: { label: "공개", tone: "green" },
  BLINDED: { label: "블라인드", tone: "amber" },
  PRIVATE: { label: "비공개", tone: "neutral" },
  DELETED: { label: "삭제됨", tone: "red" },
};

function ViewerArrow({ side, onClick }) {
  const Icon = side === "left" ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      aria-label={side === "left" ? "이전 사진" : "다음 사진"}
      style={{
        position: "absolute",
        [side]: 12,
        top: "50%",
        transform: "translateY(-50%)",
        width: 36,
        height: 36,
        borderRadius: "50%",
        border: "1px solid rgba(255,255,255,0.14)",
        background: "rgba(0,0,0,0.5)",
        color: "#fff",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Icon size={18} />
    </button>
  );
}

function DetailModal({ item, onClose, onEdit, onDelete, eventMap }) {
  const imgCount = getImageCount(item);
  const resolvedUrls = resolveImageUrls(item);
  const [imgIdx, setImgIdx] = useState(0);
  const [imgErr, setImgErr] = useState(false);
  const currentImg = resolvedUrls[imgIdx] || null;
  const desc = cleanDesc(item);
  const sketch = isSketch(item);
  const tags = getTags(item);
  const status = GALLERY_STATUS[item.status || "PUBLIC"] || { label: item.status, tone: "neutral" };
  const go = (i) => {
    setImgIdx(i);
    setImgErr(false);
  };

  // 좌우 방향키로 사진을 넘긴다.
  useEffect(() => {
    if (imgCount < 2) return undefined;
    const onKey = (e) => {
      if (e.key === "ArrowLeft") go(Math.max(0, imgIdx - 1));
      if (e.key === "ArrowRight") go(Math.min(imgCount - 1, imgIdx + 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [imgIdx, imgCount]);

  return (
    <Overlay onClose={onClose} width={980}>
      <div style={{ display: "flex", flexWrap: "wrap", minHeight: 520 }}>
        {/* 왼쪽: 사진 */}
        <div
          style={{
            flex: "1 1 520px",
            minWidth: 0,
            display: "flex",
            flexDirection: "column",
            background: "#0E1114",
            borderRight: `1px solid ${ds.line}`,
          }}
        >
          <div style={{ position: "relative", flex: 1, minHeight: 440 }}>
            {currentImg && !imgErr ? (
              <img
                src={currentImg}
                alt={item.title || "갤러리 사진"}
                style={{
                  position: "absolute",
                  inset: 0,
                  width: "100%",
                  height: "100%",
                  objectFit: "contain",
                  display: "block",
                }}
                onError={(e) => { if (!isSwappingToFallback(e)) setImgErr(true); }}
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
                }}
              >
                <ImageOff size={32} color={ds.ink4} />
                <span style={{ fontSize: 13, color: ds.ink4 }}>이미지를 불러올 수 없어요</span>
              </div>
            )}
            {imgCount > 1 && (
              <>
                <span
                  style={{
                    position: "absolute",
                    top: 12,
                    left: 12,
                    background: "rgba(0,0,0,0.55)",
                    color: "#fff",
                    fontSize: 12,
                    fontWeight: 600,
                    padding: "3px 10px",
                    borderRadius: 999,
                  }}
                >
                  {imgIdx + 1} / {imgCount}
                </span>
                {imgIdx > 0 && <ViewerArrow side="left" onClick={() => go(imgIdx - 1)} />}
                {imgIdx < imgCount - 1 && <ViewerArrow side="right" onClick={() => go(imgIdx + 1)} />}
              </>
            )}
          </div>
          {imgCount > 1 && (
            <div
              style={{
                display: "flex",
                gap: 8,
                padding: 12,
                overflowX: "auto",
                borderTop: `1px solid ${ds.line}`,
              }}
            >
              {resolvedUrls.map((url, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => go(i)}
                  aria-label={`${i + 1}번째 사진`}
                  style={{
                    flex: "0 0 56px",
                    height: 56,
                    padding: 0,
                    borderRadius: 8,
                    overflow: "hidden",
                    cursor: "pointer",
                    border: `2px solid ${i === imgIdx ? ds.brand : "transparent"}`,
                    opacity: i === imgIdx ? 1 : 0.55,
                    background: ds.bg,
                    transition: "opacity .15s, border-color .15s",
                  }}
                >
                  <img src={url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 오른쪽: 정보 */}
        <div style={{ flex: "1 1 340px", minWidth: 0, display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "16px 16px 0 24px",
            }}
          >
            <Tag tone={sketch ? "brand" : "neutral"}>{sketch ? "현장 스케치" : "참가자 갤러리"}</Tag>
            <Tag tone={status.tone}>{status.label}</Tag>
            <span style={{ flex: 1 }} />
            <IconButton icon={X} label="닫기" onClick={onClose} />
          </div>

          <div style={{ flex: 1, padding: "12px 24px 8px", overflowY: "auto" }}>
            <h3
              style={{
                margin: "0 0 16px",
                fontSize: 20,
                fontWeight: 700,
                color: ds.ink,
                lineHeight: 1.4,
                wordBreak: "keep-all",
              }}
            >
              {item.title || "제목 없음"}
            </h3>

            <InfoList
              items={[
                { label: "행사", value: (item.eventId && eventMap[item.eventId]) || "-" },
                { label: "작성", value: sketch ? "운영팀" : "참가자" },
                { label: "등록일", value: fmtDate(item.createdAt) },
                {
                  label: "반응",
                  value: (
                    <span style={{ display: "inline-flex", gap: 14, color: ds.ink2 }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                        <Heart size={14} color={ds.ink4} /> 좋아요 {(item.likeCount ?? 0).toLocaleString()}
                      </span>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                        <Eye size={14} color={ds.ink4} /> 조회 {(item.viewCount ?? 0).toLocaleString()}
                      </span>
                    </span>
                  ),
                },
              ]}
            />

            <div style={{ marginTop: 8, paddingTop: 14, borderTop: `1px solid ${ds.line}` }}>
              <div style={{ fontSize: 13.5, color: ds.ink3, marginBottom: 8 }}>설명</div>
              <p
                style={{
                  margin: 0,
                  fontSize: 14.5,
                  color: desc ? ds.ink : ds.ink4,
                  lineHeight: 1.7,
                  whiteSpace: "pre-wrap",
                  wordBreak: "keep-all",
                }}
              >
                {desc || "등록된 설명이 없어요."}
              </p>
            </div>

            {tags.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 16 }}>
                {tags.map((t, i) => (
                  <span
                    key={i}
                    style={{
                      height: 26,
                      display: "inline-flex",
                      alignItems: "center",
                      padding: "0 10px",
                      borderRadius: 999,
                      background: ds.lineSoft,
                      border: `1px solid ${ds.line}`,
                      fontSize: 12.5,
                      color: ds.ink2,
                    }}
                  >
                    #{t}
                  </span>
                ))}
              </div>
            )}
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
              <Button onClick={onClose}>닫기</Button>
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

/* ═══════ 등록/수정 모달 ═══════ */
function FormModal({
  item,
  onSave,
  onClose,
  isEdit,
  saving,
  events,
  galleryType,
}) {
  const existingMeta = item
    ? parseMeta(item.description)
    : { text: "", type: null, tags: [] };
  const [form, setForm] = useState(
    item
      ? {
          title: item.title || "",
          description: existingMeta.text,
          eventId: item.eventId ? String(item.eventId) : "",
        }
      : { title: "", description: "", eventId: "" },
  );
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));
  const [err, setErr] = useState("");
  const [imageUrls, setImageUrls] = useState(item?.imageUrls || []);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef(null);
  const [tags, setTags] = useState(existingMeta.tags || []);
  const [tagInput, setTagInput] = useState("");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 20);
    return () => clearTimeout(t);
  }, []);

  /* 태그 */
  const addTag = () => {
    const t = tagInput.trim().replace(/^#/, "");
    if (!t) return;
    if (tags.includes(t)) {
      setTagInput("");
      return;
    }
    if (tags.length >= 5) {
      setErr("태그는 최대 5개까지 가능합니다.");
      return;
    }
    setTags((p) => [...p, t]);
    setTagInput("");
  };
  const removeTag = (idx) => setTags((p) => p.filter((_, i) => i !== idx));

  /* 파일 업로드 */
  const addFiles = async (fileList) => {
    const files = Array.from(fileList).filter((f) =>
      f.type.startsWith("image/"),
    );
    if (files.length === 0) return;
    setUploading(true);
    try {
      const formData = new FormData();
      files.forEach((f) => formData.append("files", f));
      const token = getToken();
      const res = await fetch(buildRequestUrl(API_BASE, "/api/admin/galleries/images/upload"), {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
        credentials: "include",
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(
          errBody?.error?.message || errBody?.message || `HTTP ${res.status}`,
        );
      }
      const data = await res.json();
      const uploaded = data?.data?.urls || [];
      setImageUrls((prev) => [...prev, ...uploaded]);
    } catch (e) {
      console.error("[Gallery] image upload error:", e);
      setErr("이미지 업로드 실패: " + e.message);
    } finally {
      setUploading(false);
    }
  };
  const removeUrl = (idx) => setImageUrls((p) => p.filter((_, i) => i !== idx));

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    addFiles(e.dataTransfer.files);
  };

  const handleSave = () => {
    if (!form.title.trim()) {
      setErr("제목은 필수입니다.");
      return;
    }
    if (!isEdit && !form.eventId) {
      setErr("행사를 선택해주세요.");
      return;
    }
    const descWithMeta = appendMeta(form.description, galleryType, tags);
    if (isEdit) {
      onSave({ title: form.title, description: descWithMeta });
    } else {
      onSave({
        eventId: Number(form.eventId),
        title: form.title,
        description: descWithMeta,
        imageUrls: imageUrls.length > 0 ? imageUrls : null,
      });
    }
  };

  const label = galleryType === "현장" ? "현장 스케치" : "참가자 갤러리";
  const [coverIdx, setCoverIdx] = useState(0);
  const shownIdx = Math.min(coverIdx, Math.max(imageUrls.length - 1, 0));
  const coverUrl = imageUrls.length ? resolveImgUrl(imageUrls[shownIdx]) : null;
  const eventName =
    (events || []).find((ev) => String(ev.eventId) === String(form.eventId))?.eventName ||
    (form.eventId ? `행사 #${form.eventId}` : "");
  const busy = saving || uploading;

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

  return (
    <FormSheet
      title={isEdit ? `${label} 수정` : `새 ${label}`}
      onClose={onClose}
      width={880}
      bare
      footer={
        <>
          <Button onClick={onClose} disabled={busy}>취소</Button>
          <Button variant="primary" icon={Check} onClick={handleSave} disabled={busy}>
            {uploading ? "업로드 중..." : saving ? "저장 중..." : isEdit ? "수정 완료" : "등록하기"}
          </Button>
        </>
      }
    >
      {/* ── 커버: 사진 ── */}
      <div
        className="adm-doc-cover"
        onDrop={!isEdit ? handleDrop : undefined}
        onDragOver={!isEdit ? (e) => { e.preventDefault(); setDragOver(true); } : undefined}
        onDragLeave={!isEdit ? () => setDragOver(false) : undefined}
        style={{ borderColor: dragOver ? ds.brand : undefined }}
      >
        {uploading ? (
          <div className="adm-doc-cover-empty">
            <Spinner size={24} />
            <div style={{ fontSize: 14, fontWeight: 600, color: ds.ink2 }}>사진을 올리는 중이에요</div>
          </div>
        ) : coverUrl ? (
          <>
            <div aria-hidden="true" className="adm-doc-cover-blur" style={{ backgroundImage: `url("${coverUrl}")` }} />
            <img
              src={coverUrl}
              alt={`${shownIdx + 1}번째 사진`}
              style={{ position: "relative", height: "100%", maxWidth: "100%", objectFit: "contain", display: "block", margin: "0 auto" }}
            />
            <span
              style={{
                position: "absolute", left: 12, top: 12, padding: "3px 10px", borderRadius: 999,
                background: "#181C20", color: "#fff", fontSize: 12, fontWeight: 600,
              }}
            >
              {shownIdx + 1} / {imageUrls.length}
            </span>
            {!isEdit && (
              <div className="adm-doc-cover-actions">
                <button type="button" style={coverBtn} onClick={() => fileRef.current?.click()}>
                  <Plus size={14} /> 사진 추가
                </button>
                <button
                  type="button"
                  style={{ ...coverBtn, background: ds.red, color: "#fff" }}
                  onClick={() => { setImageUrls([]); setCoverIdx(0); }}
                >
                  <Trash2 size={14} /> 모두 삭제
                </button>
              </div>
            )}
          </>
        ) : isEdit ? (
          <div className="adm-doc-cover-empty">
            <ImageOff size={24} color={ds.ink4} />
            <div style={{ fontSize: 14, fontWeight: 600, color: ds.ink3 }}>등록된 사진이 없어요</div>
          </div>
        ) : (
          <div className="adm-doc-cover-empty">
            <ImagePlus size={24} color={dragOver ? ds.brandText : ds.ink4} />
            <div style={{ fontSize: 14, fontWeight: 600, color: ds.ink2 }}>사진을 추가하세요</div>
            <div style={{ fontSize: 12.5, color: ds.ink4 }}>여러 장을 한 번에 끌어다 놓을 수 있어요 · 최대 10장, 장당 10MB 이하</div>
            <button type="button" style={{ ...coverBtn, marginTop: 6 }} onClick={() => fileRef.current?.click()}>
              <Upload size={14} /> 사진 올리기
            </button>
          </div>
        )}
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        style={{ display: "none" }}
        onChange={(e) => {
          addFiles(e.target.files);
          e.target.value = "";
        }}
      />

      {/* 사진 목록: 누르면 커버에 크게, 첫 장이 대표 사진 */}
      {imageUrls.length > 1 && (
        <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
          {imageUrls.map((url, i) => (
            <div key={`${url}-${i}`} style={{ position: "relative" }}>
              <button
                type="button"
                onClick={() => setCoverIdx(i)}
                aria-label={`${i + 1}번째 사진 보기`}
                style={{
                  width: 64, height: 64, padding: 0, borderRadius: 10, overflow: "hidden", cursor: "pointer",
                  border: `2px solid ${i === shownIdx ? ds.brand : ds.line}`, background: ds.card, display: "block",
                }}
              >
                <img src={resolveImgUrl(url)} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
              </button>
              {i === 0 && (
                <span style={{ position: "absolute", left: 4, bottom: 4, padding: "1px 6px", borderRadius: 4, background: ds.brand, color: "#fff", fontSize: 10.5, fontWeight: 700 }}>
                  대표
                </span>
              )}
              {!isEdit && (
                <button
                  type="button"
                  onClick={() => { removeUrl(i); setCoverIdx(0); }}
                  aria-label={`${i + 1}번째 사진 삭제`}
                  style={{
                    position: "absolute", top: -6, right: -6, width: 20, height: 20, borderRadius: "50%",
                    border: `2px solid ${ds.bg}`, background: ds.red, color: "#fff", cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center", padding: 0,
                  }}
                >
                  <X size={11} />
                </button>
              )}
            </div>
          ))}
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
        value={form.title}
        maxLength={100}
        onChange={(e) => set("title", e.target.value)}
        placeholder="갤러리 제목"
        aria-label="제목"
        autoFocus
      />

      {/* ── 속성 ── */}
      <div className="adm-doc-props">
        <DocProp icon={Layers} label="종류">
          <div style={{ display: "flex", alignItems: "center", minHeight: 36, paddingLeft: 10 }}>
            <Tag tone={galleryType === "현장" ? "brand" : "neutral"}>{label}</Tag>
          </div>
        </DocProp>
        <DocProp icon={CalendarDays} label="행사" required={!isEdit}>
          {isEdit ? (
            <div style={{ minHeight: 36, display: "flex", alignItems: "center", paddingLeft: 10, fontSize: 14.5, color: ds.ink }}>
              {eventName || "-"}
            </div>
          ) : (
            <select
              className="adm-doc-inline"
              value={form.eventId}
              onChange={(e) => set("eventId", e.target.value)}
              aria-label="행사"
              style={{ color: form.eventId ? ds.ink : ds.ink4 }}
            >
              <option value="">행사를 선택하세요</option>
              {(events || []).map((ev) => (
                <option key={ev.eventId} value={ev.eventId}>
                  {ev.eventName || ev.title || `행사 #${ev.eventId}`}
                </option>
              ))}
            </select>
          )}
        </DocProp>
        <DocProp icon={Hash} label="태그">
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", minHeight: 36, paddingLeft: tags.length ? 10 : 0 }}>
            {tags.map((t, i) => (
              <span
                key={t}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 4, height: 26, padding: "0 6px 0 10px",
                  borderRadius: 999, background: "#2A3038", color: ds.ink2, fontSize: 13,
                }}
              >
                #{t}
                <button
                  type="button"
                  onClick={() => removeTag(i)}
                  aria-label={`${t} 태그 삭제`}
                  style={{ width: 18, height: 18, borderRadius: "50%", border: "none", background: "transparent", color: ds.ink3, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}
                >
                  <X size={12} />
                </button>
              </span>
            ))}
            {tags.length < 5 && (
              <input
                className="adm-doc-inline"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === ",") {
                    e.preventDefault();
                    addTag();
                  } else if (e.key === "Backspace" && !tagInput && tags.length) {
                    removeTag(tags.length - 1);
                  }
                }}
                onBlur={addTag}
                placeholder={tags.length ? "태그 추가" : "비어 있음 · 입력 후 Enter (최대 5개)"}
                aria-label="태그"
                style={{ flex: "1 1 180px", width: "auto" }}
              />
            )}
          </div>
        </DocProp>
      </div>

      {/* ── 설명 ── */}
      <textarea
        className="adm-doc-body"
        value={form.description}
        onChange={(e) => set("description", e.target.value)}
        placeholder="사진에 담긴 이야기나 현장 분위기를 적어 주세요"
        aria-label="설명"
        rows={8}
      />
      <div style={{ textAlign: "right", fontSize: 12, color: ds.ink4, marginTop: 4 }}>
        {(form.description || "").length.toLocaleString()}자
      </div>
    </FormSheet>
  );
}

/* ═══════ 참가자 갤러리 카드 (정사각형) ═══════ */
function UserGalleryCard({ item, onClick, eventMap }) {
  const thumbUrl = getThumbUrl(item);
  const imgCount = getImageCount(item);
  const [imgErr, setImgErr] = useState(false);
  const desc = cleanDesc(item);

  return (
    <div
      className="gal-card2"
      onClick={onClick}
      style={{
        background: ds.card,
        borderRadius: 14,
        border: `1px solid ${ds.line}`,
        overflow: "hidden",
        cursor: "pointer",
      }}
    >
      <div
        style={{
          position: "relative",
          paddingBottom: "66%",
          overflow: "hidden",
          background: ds.lineSoft,
        }}
      >
        {thumbUrl && !imgErr ? (
          <img
            src={thumbUrl}
            alt=""
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
            onError={(e) => { if (!isSwappingToFallback(e)) setImgErr(true); }}
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
              gap: 4,
            }}
          >
            <ImageOff size={24} color={ds.ink4} />
          </div>
        )}
        {imgCount > 1 && (
          <span
            style={{
              position: "absolute",
              top: 10,
              right: 10,
              background: "rgba(0,0,0,0.55)",
              color: "#fff",
              fontSize: 12,
              fontWeight: 700,
              padding: "3px 10px",
              borderRadius: 20,
            }}
          >
            1 / {imgCount}
          </span>
        )}
      </div>
      <div style={{ padding: "14px 16px 16px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 8,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              minWidth: 0,
              flex: 1,
            }}
          >
            <div style={{ minWidth: 0, flex: 1 }}>
              <span
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: ds.ink,
                  display: "block",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {item.title}
              </span>
              {item.eventId && eventMap[item.eventId] && (
                <div
                  style={{
                    fontSize: 12,
                    color: ds.ink4,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {eventMap[item.eventId]}
                </div>
              )}
            </div>
          </div>
          <span
            style={{
              fontSize: 12,
              color: ds.ink4,
              flexShrink: 0,
              marginLeft: 6,
            }}
          >
            {fmtDate(item.createdAt)}
          </span>
        </div>
        <p
          style={{
            fontSize: 12.5,
            color: ds.ink,
            lineHeight: 1.5,
            margin: "0 0 8px",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
            wordBreak: "break-word",
            overflowWrap: "break-word",
          }}
        >
          {desc || ""}
        </p>
        {getTags(item).length > 0 && (
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 4,
              marginBottom: 8,
            }}
          >
            {getTags(item)
              .slice(0, 3)
              .map((t, i) => (
                <span
                  key={i}
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: ds.ink3,
                    background: ds.lineSoft,
                    padding: "2px 8px",
                    borderRadius: 12,
                    border: `1px solid ${ds.line}`,
                  }}
                >
                  #{t}
                </span>
              ))}
            {getTags(item).length > 3 && (
              <span style={{ fontSize: 12, color: ds.ink4 }}>
                +{getTags(item).length - 3}
              </span>
            )}
          </div>
        )}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            paddingTop: 8,
            borderTop: `1px solid ${ds.lineSoft}`,
          }}
        >
          <span
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              fontSize: 12,
              color: ds.ink4,
            }}
          >
            <Heart size={13} /> {item.likeCount ?? 0}
          </span>
          <span
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              fontSize: 12,
              color: ds.ink4,
            }}
          >
            <Eye size={13} /> {item.viewCount ?? 0}
          </span>
        </div>
      </div>
    </div>
  );
}

/* ═══════ 현장 스케치 카드 ═══════ */
function SketchCard({ item, onClick, eventMap }) {
  const thumbUrl = getThumbUrl(item);
  const imgCount = getImageCount(item);
  const [imgErr, setImgErr] = useState(false);
  const desc = cleanDesc(item);

  return (
    <div
      className="gal-card2"
      onClick={onClick}
      style={{
        background: ds.card,
        borderRadius: 14,
        border: `1px solid ${ds.line}`,
        overflow: "hidden",
        cursor: "pointer",
      }}
    >
      <div
        style={{
          position: "relative",
          paddingBottom: "75%",
          overflow: "hidden",
          background: ds.lineSoft,
        }}
      >
        {thumbUrl && !imgErr ? (
          <img
            src={thumbUrl}
            alt=""
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
            onError={(e) => { if (!isSwappingToFallback(e)) setImgErr(true); }}
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
              gap: 4,
            }}
          >
            <ImageOff size={24} color={ds.ink4} />
          </div>
        )}
        {imgCount > 1 && (
          <span
            style={{
              position: "absolute",
              top: 10,
              right: 10,
              background: "rgba(0,0,0,0.55)",
              color: "#fff",
              fontSize: 12,
              fontWeight: 700,
              padding: "3px 10px",
              borderRadius: 20,
            }}
          >
            1 / {imgCount}
          </span>
        )}
      </div>
      <div style={{ padding: "14px 16px 16px" }}>
        <Pill color={ds.brand} bg={`${ds.brand}10`}>
          {eventMap[item.eventId] || "현장 스케치"}
        </Pill>
        <h4
          style={{
            fontSize: 14.5,
            fontWeight: 700,
            color: ds.ink,
            margin: "8px 0 4px",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            wordBreak: "break-all",
          }}
        >
          {item.title}
        </h4>
        <p
          style={{
            fontSize: 12.5,
            color: ds.ink3,
            lineHeight: 1.5,
            margin: "0 0 10px",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
            wordBreak: "break-word",
            overflowWrap: "break-word",
          }}
        >
          {desc || ""}
        </p>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            paddingTop: 8,
            borderTop: `1px solid ${ds.lineSoft}`,
          }}
        >
          <span style={{ fontSize: 12, color: ds.ink4, fontWeight: 600 }}>
            운영팀
          </span>
          <span style={{ fontSize: 12, color: ds.ink4 }}>
            {fmtDate(item.createdAt)}
          </span>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   메인 컴포넌트
   ═══════════════════════════════════════════ */
export default function Gallery() {
  const tab = "user"; // 현장스케치 탭 제거, 참가자 갤러리만
  const [viewportWidth, setViewportWidth] = useState(() =>
    typeof window === "undefined" ? 1440 : window.innerWidth,
  );
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const PAGE_SIZE = 40;

  const [events, setEvents] = useState([]);
  const [modal, setModal] = useState(null);
  const [panel, setPanel] = useState(null);
  const [toast, setToast] = useState(null);
  const [search, setSearch] = useState("");

  const [selected, setSelected] = useState(new Set());

  const eventMap = useEventMap(events);
  const showToast = (msg, type = "success") => setToast({ msg, type });

  useEffect(() => {
    eventApi
      .getEvents({ page: 0, size: 100 })
      .then((res) => {
        const d = res?.data?.data ?? res?.data ?? {};
        setEvents(d.content || (Array.isArray(d) ? d : []));
      })
      .catch((e) => console.error("[Gallery] 행사 목록 조회 실패:", e));
  }, []);

  const fetchList = useCallback(async (p = 1) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.list(p, PAGE_SIZE);
      const d = unwrap(res);
      setItems(d.content || []);
      setTotalPages(d.totalPages || 0);
      setPage(p);
    } catch (err) {
      console.error("[Gallery] fetch error:", err);
      setError(
        err?.response?.status === 401
          ? "로그인이 필요합니다."
          : "갤러리를 불러오는데 실패했습니다.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchList(1);
  }, [fetchList]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const syncViewport = () => setViewportWidth(window.innerWidth);
    syncViewport();
    window.addEventListener("resize", syncViewport);
    return () => window.removeEventListener("resize", syncViewport);
  }, []);

  /* 필터링 */
  const filtered = items
    .filter(
      (g) =>
        !search ||
        (g.title || "").includes(search) ||
        cleanDesc(g).includes(search),
    );

  /* CRUD */
  const handleCreate = async (form) => {
    setSaving(true);
    try {
      await api.create(form);
      setPanel(null);
      showToast(
        "갤러리가 등록되었습니다.",
      );
      fetchList(1);
    } catch (err) {
      console.error("[Gallery] create error:", err);
      showToast(
        err?.response?.data?.message || "등록에 실패했습니다.",
        "error",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (form) => {
    setSaving(true);
    try {
      await api.update(panel.item.galleryId, form);
      setPanel(null);
      showToast("갤러리가 수정되었습니다.");
      fetchList(page);
    } catch (err) {
      console.error("[Gallery] update error:", err);
      showToast(
        err?.response?.data?.message || "수정에 실패했습니다.",
        "error",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setSaving(true);
    try {
      await api.delete(modal.item.galleryId);
      setModal(null);
      showToast("갤러리가 삭제되었습니다.");
      fetchList(page);
    } catch (err) {
      console.error("[Gallery] delete error:", err);
      setModal(null);
      showToast("삭제에 실패했습니다.", "error");
    } finally {
      setSaving(false);
    }
  };

  /* ── 선택 삭제 ── */
  const handleBatchDelete = async () => {
    setSaving(true);
    try {
      const ids = [...selected];
      await api.batchDelete(ids);
      setModal(null);
      setSelected(new Set());
      showToast(`${ids.length}건이 삭제되었습니다.`);
      fetchList(page);
    } catch (err) {
      console.error("[Gallery] batch delete error:", err);
      setModal(null);
      showToast("일괄 삭제에 실패했습니다.", "error");
    } finally {
      setSaving(false);
    }
  };

  /* ── 선택 토글 ── */
  const isAllSelected =
    filtered.length > 0 && filtered.every((g) => selected.has(g.galleryId));
  const hasSelected = selected.size > 0;
  const toggleAll = () => {
    if (isAllSelected) setSelected(new Set());
    else setSelected(new Set(filtered.map((g) => g.galleryId)));
  };
  const toggleOne = (id) => {
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  const isMobile = viewportWidth < 768;

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
        {/* 헤더 */}
        <div style={{ borderBottom: `1px solid ${ds.line}` }}>
          <div
            style={{
              padding: "12px 20px",
              display: "flex",
              alignItems: isMobile ? "stretch" : "center",
              justifyContent: "space-between",
              flexDirection: isMobile ? "column" : "row",
              gap: 12,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", width: isMobile ? "100%" : "auto" }}>
              <Checkbox
                checked={isAllSelected && filtered.length > 0}
                onChange={toggleAll}
              />
              <h3
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: ds.ink,
                  margin: 0,
                }}
              >
                {"갤러리"}
              </h3>
              {!loading && (
                <span
                  style={{ fontSize: 12, color: ds.ink4, fontWeight: 600 }}
                >
                  총 {filtered.length}개
                </span>
              )}
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
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", width: isMobile ? "100%" : "auto" }}>
              {hasSelected && (
                <button
                  onClick={() => setModal({ type: "batchDelete" })}
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
              <div style={{ position: "relative" }}>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="검색"
                  style={{
                    width: isMobile ? "100%" : 150,
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
                onClick={() => fetchList(page)}
                title="새로고침"
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 7,
                  border: `1px solid ${ds.line}`,
                  background: ds.card,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <RefreshCw size={14} color={ds.ink3} />
              </button>
              <button
                onClick={() => setPanel({ type: "create" })}
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
                <Plus size={13} strokeWidth={2.5} /> 등록
              </button>
            </div>
          </div>
        </div>

        {loading && (
          <div
            style={{
              textAlign: "center",
              padding: "60px 20px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 12,
            }}
          >
            <Spinner size={28} />
            <span style={{ fontSize: 13, color: ds.ink4 }}>
              불러오는 중...
            </span>
          </div>
        )}

        {!loading && error && (
          <div
            style={{
              padding: "60px 20px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 8,
            }}
          >
            <div
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: ds.ink3,
                marginBottom: 8,
              }}
            >
              {error}
            </div>
            <button
              onClick={() => fetchList(page)}
              style={{
                padding: "8px 20px",
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
              다시 시도
            </button>
          </div>
        )}

        {!loading && !error && filtered.length > 0 && (
          <div
            style={{
              padding: isMobile ? 12 : 20,
              display: "grid",
              gridTemplateColumns: isMobile ? "repeat(2, minmax(0, 1fr))" : "repeat(auto-fill, minmax(220px, 1fr))",
              gap: isMobile ? 12 : 16,
            }}
          >
            {filtered.map((g) => (
              <div key={g.galleryId} style={{ position: "relative" }}>
                <div
                  style={{
                    position: "absolute",
                    top: 10,
                    left: 10,
                    zIndex: 10,
                  }}
                >
                  <Checkbox
                    checked={selected.has(g.galleryId)}
                    onChange={() => toggleOne(g.galleryId)}
                  />
                </div>
                {tab === "user" ? (
                  <UserGalleryCard
                    item={g}
                    eventMap={eventMap}
                    onClick={() => setModal({ type: "detail", item: g })}
                  />
                ) : (
                  <SketchCard
                    item={g}
                    eventMap={eventMap}
                    onClick={() => setModal({ type: "detail", item: g })}
                  />
                )}
              </div>
            ))}
          </div>
        )}

        {!loading && !error && filtered.length === 0 && (
          <EmptyState icon={ImageIcon} title="등록된 갤러리가 없습니다" description="참가자들의 갤러리가 여기에 표시됩니다." />
        )}

        {!loading && !error && totalPages > 1 && (
          <div
            style={{
              padding: "16px 20px",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: isMobile ? 8 : 4,
              borderTop: `1px solid ${ds.line}`,
              flexWrap: "wrap",
            }}
          >
            <button
              disabled={page <= 1}
              onClick={() => fetchList(page - 1)}
              style={{
                width: 32,
                height: 32,
                borderRadius: 7,
                border: `1px solid ${ds.line}`,
                background: ds.card,
                cursor: page <= 1 ? "default" : "pointer",
                opacity: page <= 1 ? 0.4 : 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <ChevronLeft size={14} color={ds.ink3} />
            </button>
            {isMobile ? (
              <div
                style={{
                  minWidth: 76,
                  height: 36,
                  borderRadius: 999,
                  background: ds.bg,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "0 14px",
                  fontSize: 12.5,
                  fontWeight: 700,
                  color: ds.ink,
                }}
              >
                {page} / {totalPages}
              </div>
            ) : (
              Array.from({ length: totalPages }, (_, i) => (
                <button
                  key={i + 1}
                  onClick={() => fetchList(i + 1)}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 7,
                    border: page === i + 1 ? "none" : `1px solid ${ds.line}`,
                    background: page === i + 1 ? ds.brand : ds.card,
                    color: page === i + 1 ? "#fff" : ds.ink4,
                    fontSize: 12.5,
                    fontWeight: 700,
                    cursor: "pointer",
                    fontFamily: ds.ff,
                  }}
                >
                  {i + 1}
                </button>
              ))
            )}
            <button
              disabled={page >= totalPages}
              onClick={() => fetchList(page + 1)}
              style={{
                width: 32,
                height: 32,
                borderRadius: 7,
                border: `1px solid ${ds.line}`,
                background: ds.card,
                cursor: page >= totalPages ? "default" : "pointer",
                opacity: page >= totalPages ? 0.4 : 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <ChevronRight size={14} color={ds.ink3} />
            </button>
          </div>
        )}
      </div>

      {/* 모달 */}
      {panel?.type === "create" && (
        <FormModal
          onSave={handleCreate}
          onClose={() => setPanel(null)}
          saving={saving}
          events={events}
          galleryType={"참가자"}
        />
      )}
      {panel?.type === "edit" && (
        <FormModal
          item={panel.item}
          isEdit
          onSave={handleUpdate}
          onClose={() => setPanel(null)}
          saving={saving}
          events={events}
          galleryType={isSketch(panel.item) ? "현장" : "참가자"}
        />
      )}
      {modal?.type === "detail" && (
        <DetailModal
          item={modal.item}
          onClose={() => setModal(null)}
          eventMap={eventMap}
          onEdit={(item) => {
            setModal(null);
            setPanel({ type: "edit", item });
          }}
          onDelete={(item) => setModal({ type: "delete", item })}
        />
      )}
      {modal?.type === "delete" && (
        <ConfirmModal
          title="갤러리 삭제"
          msg={`"${modal.item.title}" 갤러리를 삭제하시겠습니까?\n삭제된 데이터는 복구할 수 없습니다.`}
          onConfirm={handleDelete}
          onCancel={() => setModal(null)}
          loading={saving}
        />
      )}
      {modal?.type === "batchDelete" && (
        <ConfirmModal
          title="선택 삭제"
          msg={`선택한 ${selected.size}건을 삭제하시겠습니까?\n삭제된 데이터는 복구할 수 없습니다.`}
          onConfirm={handleBatchDelete}
          onCancel={() => setModal(null)}
          loading={saving}
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
