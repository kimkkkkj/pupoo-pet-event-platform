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

/* ═══════ 공통 UI ═══════ */
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

function Overlay({ children, onClose, wide }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 5000,
        background: "rgba(0,0,0,0.35)",
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
          width: wide ? 860 : 540,
          maxWidth: "95vw",
          maxHeight: "90vh",
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

function ConfirmModal({ title, msg, onConfirm, onCancel, loading }) {
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
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button
            onClick={onCancel}
            disabled={loading}
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
            disabled={loading}
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
              opacity: loading ? 0.5 : 1,
            }}
          >
            {loading ? "삭제 중..." : "삭제"}
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
      <span style={{ fontSize: 11, color: ds.ink4, fontWeight: 600 }}>
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

/* ═══════ 상세 모달 (사진 왼쪽 / 설명 오른쪽) ═══════ */
function DetailModal({ item, onClose, onEdit, onDelete, eventMap }) {
  const imgCount = getImageCount(item);
  const resolvedUrls = resolveImageUrls(item);
  const [imgIdx, setImgIdx] = useState(0);
  const currentImg = resolvedUrls[imgIdx] || null;
  const [imgErr, setImgErr] = useState(false);
  const desc = cleanDesc(item);
  const sketch = isSketch(item);

  return (
    <Overlay onClose={onClose} wide>
      <div style={{ display: "flex", minHeight: 420 }}>
        {/* 왼쪽: 이미지 */}
        <div
          style={{
            flex: "0 0 55%",
            position: "relative",
            background: ds.lineSoft,
            borderRadius: "16px 0 0 16px",
            overflow: "hidden",
          }}
        >
          {currentImg && !imgErr ? (
            <img
              src={currentImg}
              alt=""
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                display: "block",
              }}
              onError={() => setImgErr(true)}
            />
          ) : (
            <div
              style={{
                width: "100%",
                height: "100%",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
              }}
            >
              <ImageOff size={40} color={ds.ink4} />
              <span style={{ fontSize: 13, color: ds.ink4, fontWeight: 600 }}>
                이미지 없음
              </span>
            </div>
          )}
          {imgCount > 1 && (
            <>
              {/* 인디케이터 점 */}
              <div
                style={{
                  position: "absolute",
                  bottom: 16,
                  left: "50%",
                  transform: "translateX(-50%)",
                  display: "flex",
                  gap: 6,
                }}
              >
                {resolvedUrls.map((_, i) => (
                  <button
                    key={i}
                    onClick={(e) => {
                      e.stopPropagation();
                      setImgIdx(i);
                      setImgErr(false);
                    }}
                    style={{
                      width: i === imgIdx ? 20 : 8,
                      height: 8,
                      borderRadius: 4,
                      border: "none",
                      background:
                        i === imgIdx ? "#fff" : "rgba(255,255,255,0.5)",
                      cursor: "pointer",
                      transition: "all .15s",
                      padding: 0,
                    }}
                  />
                ))}
              </div>
              {/* 카운터 */}
              <span
                style={{
                  position: "absolute",
                  top: 14,
                  right: 14,
                  background: "rgba(0,0,0,0.55)",
                  color: "#fff",
                  fontSize: 12,
                  fontWeight: 700,
                  padding: "4px 12px",
                  borderRadius: 20,
                }}
              >
                {imgIdx + 1} / {imgCount}
              </span>
              {/* 좌우 화살표 */}
              {imgIdx > 0 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setImgIdx(imgIdx - 1);
                    setImgErr(false);
                  }}
                  style={{
                    position: "absolute",
                    left: 10,
                    top: "50%",
                    transform: "translateY(-50%)",
                    width: 34,
                    height: 34,
                    borderRadius: "50%",
                    border: "none",
                    background: "rgba(0,0,0,0.35)",
                    color: "#fff",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <ChevronLeft size={18} />
                </button>
              )}
              {imgIdx < imgCount - 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setImgIdx(imgIdx + 1);
                    setImgErr(false);
                  }}
                  style={{
                    position: "absolute",
                    right: 10,
                    top: "50%",
                    transform: "translateY(-50%)",
                    width: 34,
                    height: 34,
                    borderRadius: "50%",
                    border: "none",
                    background: "rgba(0,0,0,0.35)",
                    color: "#fff",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <ChevronRight size={18} />
                </button>
              )}
            </>
          )}
        </div>

        {/* 오른쪽: 정보 */}
        <div
          style={{
            flex: 1,
            padding: "24px 28px",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* 닫기 */}
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              marginBottom: 8,
            }}
          >
            <button
              onClick={onClose}
              style={{
                width: 28,
                height: 28,
                borderRadius: 7,
                border: `1px solid ${ds.line}`,
                background: ds.card,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <X size={13} color={ds.ink4} />
            </button>
          </div>

          {/* 유저/운영팀 정보 */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 16,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  background: sketch ? `${ds.brand}12` : ds.violetSoft,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 14,
                  fontWeight: 800,
                  color: sketch ? ds.brand : "#8B5CF6",
                }}
              >
                {sketch ? "운" : (item.title || "?")[0]}
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: ds.ink }}>
                  {sketch ? "운영팀" : item.title}
                </div>
                {item.eventId && eventMap[item.eventId] && (
                  <div style={{ fontSize: 11.5, color: ds.ink4 }}>
                    {eventMap[item.eventId]}
                  </div>
                )}
              </div>
            </div>
            <span style={{ fontSize: 12, color: ds.ink4 }}>
              {fmtDate(item.createdAt)}
            </span>
          </div>

          {/* 제목 (현장 스케치) */}
          {sketch && (
            <h4
              style={{
                fontSize: 16,
                fontWeight: 800,
                color: ds.ink,
                margin: "0 0 8px",
              }}
            >
              {item.title}
            </h4>
          )}

          {/* 설명 */}
          <p
            style={{
              fontSize: 13.5,
              color: ds.ink,
              lineHeight: 1.7,
              margin: "0 0 12px",
              flex: 1,
            }}
          >
            {desc || "설명이 없습니다."}
          </p>

          {/* 태그 */}
          {getTags(item).length > 0 && (
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 6,
                marginBottom: 14,
              }}
            >
              {getTags(item).map((t, i) => (
                <span
                  key={i}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    padding: "4px 12px",
                    background: ds.lineSoft,
                    borderRadius: 20,
                    fontSize: 12.5,
                    fontWeight: 600,
                    color: ds.ink3,
                    border: `1px solid ${ds.line}`,
                  }}
                >
                  #{t}
                </span>
              ))}
            </div>
          )}

          {/* 상태 */}
          <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
            <Pill
              color={
                item.status === "PUBLIC"
                  ? "#3a4520"
                  : item.status === "BLINDED"
                    ? "#F59E0B"
                    : ds.ink4
              }
              bg={
                item.status === "PUBLIC"
                  ? "#3a452010"
                  : item.status === "BLINDED"
                    ? "#F59E0B10"
                    : "#94A3B810"
              }
            >
              {item.status || "PUBLIC"}
            </Pill>
            <Pill
              color={sketch ? ds.brand : "#8B5CF6"}
              bg={sketch ? `${ds.brand}10` : "#8B5CF610"}
            >
              {sketch ? "현장 스케치" : "참가자"}
            </Pill>
          </div>

          {/* 좋아요 / 조회수 */}
          <div
            style={{
              display: "flex",
              gap: 16,
              padding: "12px 0",
              borderTop: `1px solid ${ds.line}`,
            }}
          >
            <span
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                fontSize: 13,
                color: ds.ink3,
              }}
            >
              <Heart size={14} color="#EF4444" /> {item.likeCount ?? 0}
            </span>
            <span
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                fontSize: 13,
                color: ds.ink3,
              }}
            >
              <Eye size={14} color={ds.ink4} /> {item.viewCount ?? 0}
            </span>
          </div>

          {/* 버튼 */}
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: 8,
              paddingTop: 12,
              borderTop: `1px solid ${ds.line}`,
            }}
          >
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

  return (
    <>
      {/* 배경 */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 4999,
          background: visible ? "rgba(15,16,23,0.45)" : "rgba(15,16,23,0)",
          transition: "background .3s ease",
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
            width: 560,
            maxWidth: "95vw",
            maxHeight: "90vh",
            background: ds.card,
            borderRadius: 20,
            boxShadow:
              "0 32px 80px rgba(0,0,0,0.18), 0 8px 24px rgba(0,0,0,0.1)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            transform: visible
              ? "translateY(0) scale(1)"
              : "translateY(24px) scale(0.97)",
            opacity: visible ? 1 : 0,
            transition: "all .35s cubic-bezier(.16,1,.3,1)",
          }}
        >
          {/* 헤더 */}
          <div
            style={{
              padding: "22px 28px",
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
                  fontSize: 18,
                  fontWeight: 800,
                  color: ds.ink,
                  margin: 0,
                  letterSpacing: -0.3,
                }}
              >
                {isEdit ? `${label} 수정` : `${label} 등록`}
              </h3>
              <p style={{ fontSize: 12, color: ds.ink4, margin: "4px 0 0" }}>
                {isEdit ? "정보를 수정합니다" : `새 ${label}를 등록합니다`}
              </p>
            </div>
            <button
              onClick={onClose}
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                border: `1px solid ${ds.line}`,
                background: ds.card,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "background .15s",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = ds.bg)
              }
              onMouseLeave={(e) => (e.currentTarget.style.background = ds.card)}
            >
              <X size={15} color={ds.ink4} />
            </button>
          </div>

          {/* 본문 */}
          <div style={{ flex: 1, overflow: "auto", padding: "24px 28px" }}>
            {err && (
              <div
                style={{
                  background: ds.redSoft,
                  border: `1px solid ${ds.red}33`,
                  borderRadius: 10,
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

            {/* ── 이미지 업로드 (EventManage 스타일) ── */}
            {!isEdit && (
              <Field label="이미지">
                {imageUrls.length === 0 ? (
                  <div
                    onClick={() => !uploading && fileRef.current?.click()}
                    onDrop={handleDrop}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragOver(true);
                    }}
                    onDragLeave={() => setDragOver(false)}
                    style={{
                      border: `2px dashed ${dragOver ? ds.brand : ds.line}`,
                      borderRadius: 14,
                      padding: "32px 20px",
                      textAlign: "center",
                      cursor: uploading ? "wait" : "pointer",
                      background: dragOver ? `${ds.brand}08` : ds.bg,
                      transition: "all .2s ease",
                      opacity: uploading ? 0.6 : 1,
                    }}
                    onMouseEnter={(e) => {
                      if (!dragOver && !uploading) {
                        e.currentTarget.style.borderColor = ds.line;
                        e.currentTarget.style.background = ds.bg;
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!dragOver) {
                        e.currentTarget.style.borderColor = ds.line;
                        e.currentTarget.style.background = ds.bg;
                      }
                    }}
                  >
                    <div
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 12,
                        background: `${ds.brand}10`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        margin: "0 auto 12px",
                      }}
                    >
                      {uploading ? (
                        <Spinner size={22} />
                      ) : (
                        <ImagePlus size={22} color={ds.brand} />
                      )}
                    </div>
                    <div
                      style={{
                        fontSize: 13.5,
                        fontWeight: 600,
                        color: ds.ink3,
                        marginBottom: 4,
                      }}
                    >
                      {uploading
                        ? "업로드 중..."
                        : "클릭하거나 이미지를 드래그하세요"}
                    </div>
                    <div style={{ fontSize: 11.5, color: ds.ink4 }}>
                      JPG, PNG, GIF, WEBP · 최대 10MB · 최대 10장
                    </div>
                  </div>
                ) : (
                  <div
                    style={{
                      position: "relative",
                      borderRadius: 14,
                      overflow: "hidden",
                    }}
                  >
                    <img
                      src={resolveImgUrl(imageUrls[0])}
                      alt="미리보기"
                      style={{
                        width: "100%",
                        maxHeight: 200,
                        objectFit: "cover",
                        borderRadius: 14,
                        display: "block",
                      }}
                      onError={(e) => {
                        e.target.style.display = "none";
                      }}
                    />
                    <div
                      style={{
                        position: "absolute",
                        top: 8,
                        right: 8,
                        display: "flex",
                        gap: 6,
                      }}
                    >
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          fileRef.current?.click();
                        }}
                        style={{
                          width: 30,
                          height: 30,
                          borderRadius: 8,
                          border: "none",
                          background: "rgba(0,0,0,0.55)",
                          color: "#fff",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          backdropFilter: "blur(4px)",
                        }}
                        title="이미지 추가"
                      >
                        <Plus size={13} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setImageUrls([]);
                        }}
                        style={{
                          width: 30,
                          height: 30,
                          borderRadius: 8,
                          border: "none",
                          background: "rgba(239,68,68,0.8)",
                          color: "#fff",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          backdropFilter: "blur(4px)",
                        }}
                        title="전체 삭제"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                    {imageUrls.length > 1 && (
                      <div
                        style={{
                          position: "absolute",
                          bottom: 8,
                          left: 8,
                          background: "rgba(0,0,0,0.55)",
                          color: "#fff",
                          fontSize: 11,
                          fontWeight: 700,
                          padding: "3px 8px",
                          borderRadius: 6,
                          backdropFilter: "blur(4px)",
                        }}
                      >
                        +{imageUrls.length - 1}장 더
                      </div>
                    )}
                  </div>
                )}
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

                {/* 업로드된 이미지 썸네일 리스트 */}
                {imageUrls.length > 1 && (
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 6,
                      marginTop: 10,
                    }}
                  >
                    {imageUrls.map((url, i) => (
                      <div
                        key={i}
                        style={{
                          position: "relative",
                          width: 56,
                          height: 56,
                          borderRadius: 8,
                          overflow: "hidden",
                          border:
                            i === 0
                              ? `2px solid ${ds.brand}`
                              : `1px solid ${ds.line}`,
                        }}
                      >
                        <img
                          src={resolveImgUrl(url)}
                          alt=""
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                          }}
                          onError={(e) => {
                            e.target.style.display = "none";
                          }}
                        />
                        {i === 0 && (
                          <span
                            style={{
                              position: "absolute",
                              bottom: 0,
                              left: 0,
                              right: 0,
                              background: ds.brand,
                              color: "#fff",
                              fontSize: 8,
                              fontWeight: 700,
                              textAlign: "center",
                              padding: "1px 0",
                            }}
                          >
                            대표
                          </span>
                        )}
                        <button
                          onClick={() => removeUrl(i)}
                          style={{
                            position: "absolute",
                            top: 2,
                            right: 2,
                            width: 16,
                            height: 16,
                            borderRadius: "50%",
                            border: "none",
                            background: "rgba(0,0,0,0.5)",
                            color: "#fff",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            padding: 0,
                          }}
                        >
                          <X size={8} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </Field>
            )}

            {/* ── 2열: 제목 / 행사 ── */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: isEdit ? "1fr" : "1fr 1fr",
                gap: 14,
              }}
            >
              <Field label="제목" required>
                <input
                  style={inputStyle}
                  value={form.title}
                  onChange={(e) => set("title", e.target.value)}
                  onFocus={inputFocus}
                  onBlur={inputBlur}
                  placeholder="갤러리 제목"
                  autoFocus
                />
              </Field>
              {!isEdit && (
                <Field label="행사 선택" required>
                  <div style={{ position: "relative" }}>
                    <select
                      value={form.eventId}
                      onChange={(e) => set("eventId", e.target.value)}
                      style={{
                        ...inputStyle,
                        appearance: "none",
                        paddingRight: 32,
                        cursor: "pointer",
                      }}
                    >
                      <option value="">행사를 선택하세요</option>
                      {(events || []).map((ev) => (
                        <option key={ev.eventId} value={ev.eventId}>
                          {ev.eventName || ev.title || `행사 #${ev.eventId}`}
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
            </div>

            {/* ── 설명 ── */}
            <Field label="설명">
              <textarea
                rows={3}
                style={{ ...inputStyle, resize: "vertical" }}
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                onFocus={inputFocus}
                onBlur={inputBlur}
                placeholder="갤러리 설명을 입력하세요"
              />
            </Field>

            {/* ── 태그 입력 ── */}
            <Field label="태그">
              <div
                style={{
                  display: "flex",
                  gap: 6,
                  marginBottom: tags.length > 0 ? 10 : 0,
                }}
              >
                <div style={{ position: "relative", flex: 1 }}>
                  <Hash
                    size={14}
                    color={ds.ink4}
                    style={{
                      position: "absolute",
                      left: 12,
                      top: "50%",
                      transform: "translateY(-50%)",
                    }}
                  />
                  <input
                    style={{ ...inputStyle, paddingLeft: 32 }}
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onFocus={inputFocus}
                    onBlur={inputBlur}
                    placeholder="태그 입력 후 Enter (예: 봄페스티벌)"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addTag();
                      }
                    }}
                  />
                </div>
                <button
                  onClick={addTag}
                  style={{
                    padding: "0 16px",
                    borderRadius: 9,
                    border: "none",
                    background: ds.brand,
                    color: "#fff",
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: "pointer",
                    fontFamily: ds.ff,
                    whiteSpace: "nowrap",
                    transition: "opacity .15s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.85")}
                  onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
                >
                  추가
                </button>
              </div>
              {tags.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {tags.map((t, i) => (
                    <span
                      key={i}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                        padding: "5px 10px",
                        background: ds.lineSoft,
                        borderRadius: 20,
                        fontSize: 12.5,
                        fontWeight: 600,
                        color: ds.ink3,
                        border: `1px solid ${ds.line}`,
                      }}
                    >
                      #{t}
                      <button
                        onClick={() => removeTag(i)}
                        style={{
                          width: 16,
                          height: 16,
                          borderRadius: "50%",
                          border: "none",
                          background: ds.ink4,
                          color: "#fff",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          padding: 0,
                          marginLeft: 2,
                          flexShrink: 0,
                        }}
                      >
                        <X size={9} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <div style={{ fontSize: 11, color: ds.ink4, marginTop: 6 }}>
                최대 5개, Enter 또는 추가 버튼으로 등록
              </div>
            </Field>
          </div>

          {/* 하단 버튼 */}
          <div
            style={{
              padding: "16px 28px",
              borderTop: `1px solid ${ds.line}`,
              display: "flex",
              gap: 10,
              flexShrink: 0,
            }}
          >
            <button
              onClick={onClose}
              disabled={saving || uploading}
              style={{
                flex: 1,
                padding: "12px 0",
                borderRadius: 10,
                border: `1px solid ${ds.line}`,
                background: ds.card,
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: ds.ff,
                color: ds.ink3,
                transition: "background .15s",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = ds.bg)
              }
              onMouseLeave={(e) => (e.currentTarget.style.background = ds.card)}
            >
              취소
            </button>
            <button
              onClick={handleSave}
              disabled={saving || uploading}
              style={{
                flex: 1,
                padding: "12px 0",
                borderRadius: 10,
                border: "none",
                background: ds.brand,
                color: "#fff",
                fontSize: 14,
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: ds.ff,
                opacity: saving || uploading ? 0.5 : 1,
                transition: "background .15s, transform .1s",
              }}
              onMouseDown={(e) =>
                (e.currentTarget.style.transform = "scale(0.98)")
              }
              onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
              onMouseLeave={(e) =>
                (e.currentTarget.style.transform = "scale(1)")
              }
            >
              {uploading
                ? "업로드 중..."
                : saving
                  ? "저장 중..."
                  : isEdit
                    ? "수정 완료"
                    : "등록하기"}
            </button>
          </div>
        </div>
      </div>
    </>
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
          paddingBottom: "100%",
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
            onError={() => setImgErr(true)}
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
            <ImageOff size={28} color={ds.ink4} />
            <span style={{ fontSize: 10, color: ds.ink4, fontWeight: 600 }}>
              이미지 없음
            </span>
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
              fontSize: 11,
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
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                background: ds.violetSoft,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 11,
                fontWeight: 800,
                color: "#8B5CF6",
                flexShrink: 0,
              }}
            >
              {(item.title || "?")[0]}
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <span
                style={{
                  fontSize: 12.5,
                  fontWeight: 700,
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
                    fontSize: 10.5,
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
              fontSize: 10.5,
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
                    fontSize: 11,
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
              <span style={{ fontSize: 11, color: ds.ink4 }}>
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
            onError={() => setImgErr(true)}
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
            <ImageOff size={28} color={ds.ink4} />
            <span style={{ fontSize: 10, color: ds.ink4, fontWeight: 600 }}>
              이미지 없음
            </span>
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
              fontSize: 11,
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
            fontWeight: 800,
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
          <span style={{ fontSize: 11, color: ds.ink4 }}>
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
                  fontWeight: 800,
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
                    border: `1px solid ${ds.red}33`,
                    background: ds.redSoft,
                    fontSize: 12,
                    fontWeight: 600,
                    color: ds.red,
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
              gridTemplateColumns: isMobile ? "repeat(2, minmax(0, 1fr))" : "repeat(4, 1fr)",
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
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "60px 20px",
            }}
          >
            <Camera
              size={36}
              color={ds.ink4}
              style={{ marginBottom: 12, display: "block" }}
            />
            <div
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: ds.ink3,
                marginBottom: 4,
              }}
            >
              {"등록된 갤러리가 없습니다"}
            </div>
            <div style={{ fontSize: 12.5, color: ds.ink4 }}>
              {"참가자들의 갤러리가 여기에 표시됩니다"}
            </div>
          </div>
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
                  fontWeight: 800,
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
