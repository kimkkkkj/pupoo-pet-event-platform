import { useState, useEffect, useRef } from "react";
import {
  Plus,
  X,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronLeft,
  Clipboard,
  BookOpen,
  Users,
  Clock,
  AlertTriangle,
  Check,
  ImagePlus,
  CalendarDays,
  MapPin,
  ArrowRight,
} from "lucide-react";
import ds, { statusMap } from "../shared/designTokens";
import { Pill } from "../shared/Components";
import DATA from "../shared/data";
import {
  resolveAdminStatus,
  sortAdminEventsByOperationalPriority,
} from "../shared/adminStatus";
import { injectEventImages, loadImageCache } from "../shared/eventImageStore";
import {
  setProgramImage,
  removeProgramImage,
  getProgramImage,
  loadImageCache as loadProgramImageCache,
} from "../shared/programImageStore";
import { axiosInstance } from "../../../app/http/axiosInstance";
import { getToken } from "../../../api/noticeApi";
import {
  resolveImageUrl,
  toPublicAssetUrl,
} from "../../../shared/utils/publicAssetUrl";

const normalizeAdminProgramCategory = (program) => {
  const raw = String(
    program?.category ?? program?.programCategory ?? program?.programType ?? "",
  ).trim();
  const upper = raw.toUpperCase();

  if (upper === "CONTEST" || raw === "대회") return "CONTEST";
  if (upper === "SESSION" || raw === "교육" || raw === "강연") return "SESSION";
  if (upper === "EXPERIENCE" || raw === "체험") return "EXPERIENCE";

  return upper;
};

/* ═══════════════════════════════════════════
   전역 스타일
   ═══════════════════════════════════════════ */
const styles = `
.card-manage-btn:active,.card-manage-btn:focus,.card-manage-btn:focus-visible{outline:none!important;box-shadow:none!important;-webkit-tap-highlight-color:transparent;}
.ev-card-ended { opacity:0.42 !important; filter:grayscale(0.6) !important; pointer-events:none !important; }
.ev-card-ended img { filter:blur(2px) !important; }
.ev-card-ended .card-manage-btn { background:rgba(255,255,255,0.12) !important; color:rgba(255,255,255,0.35) !important; cursor:not-allowed !important; pointer-events:none !important; }
@keyframes toastIn{from{opacity:0;transform:translateY(-12px)}to{opacity:1;transform:translateY(0)}}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes slideUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
@keyframes rowFadeOut{from{opacity:1;transform:translateX(0)}to{opacity:0;transform:translateX(-30px)}}
@keyframes spin{to{transform:rotate(360deg)}}
.row-removing{animation:rowFadeOut .3s ease forwards}
`;

/* ═══════════════════════════════════════════
   공통 컴포넌트
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

function ConfirmModal({ title, msg, onConfirm, onCancel }) {
  return (
    <Overlay onClose={onCancel}>
      <div style={{ padding: "28px" }}>
        <h3
          style={{
            fontSize: 16,
            fontWeight: 800,
            color: ds.ink,
            margin: "0 0 10px",
          }}
        >
          {title}
        </h3>
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
              background: "#EF4444",
              color: "#fff",
              fontSize: 13,
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

function StatCard({ icon: Icon, label, value, color }) {
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
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   유틸
   ═══════════════════════════════════════════ */
const authHeaders = () => {
  const t = getToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
};
const CATEGORY_TO_BACKEND = {
  교육: "SESSION",
  체험: "EXPERIENCE",
  대회: "CONTEST",
  문화: "SESSION",
  상담: "SESSION",
};
const calcStatus = (startAt, endAt) => {
  if (!startAt && !endAt) return "pending";
  const norm = (v) => v ? v.replace(/\./g, "-").trim() : v;
  const now = new Date();
  const s = startAt ? new Date(norm(startAt).includes("T") ? norm(startAt) : norm(startAt) + "T00:00:00+09:00") : null;
  const e = endAt ? new Date(norm(endAt).includes("T") ? norm(endAt) : norm(endAt) + "T23:59:59+09:00") : null;
  if (e && !isNaN(e) && now > e) return "ended";
  if (s && !isNaN(s) && now < s) return "pending";
  return "active";
};

/* ═══════════════════════════════════════════
   프로그램 등록/수정 모달
   ═══════════════════════════════════════════ */
function ProgramFormModal({ item, onSave, onClose, isEdit, eventName }) {
  const [form, setForm] = useState(
    item
      ? {
          ...item,
          startAt: item.startAt?.split("T")[0] || "",
          endAt: item.endAt?.split("T")[0] || "",
        }
      : {
          name: "",
          category: "교육",
          sessions: 1,
          enrolled: 0,
          description: "",
          startAt: "",
          endAt: "",
        },
  );
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));
  const [err, setErr] = useState("");
  const [visible, setVisible] = useState(false);
  const [imagePreview, setImagePreview] = useState(item?.imageUrl || null);
  const [imageFile, setImageFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 20);
    return () => clearTimeout(t);
  }, []);

  const handleImageFile = (file) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setErr("이미지 파일만 업로드 가능합니다.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setErr("10MB 이하만 가능합니다.");
      return;
    }
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setImagePreview(e.target.result);
    reader.readAsDataURL(file);
    setErr("");
  };
  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleImageFile(e.dataTransfer.files?.[0]);
  };
  const removeImage = () => {
    setImagePreview(null);
    setImageFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };
  const handleSave = () => {
    if (!form.name) {
      setErr("프로그램명은 필수입니다.");
      return;
    }
    onSave({ ...form, imageFile, imageUrl: imagePreview });
  };

  return (
    <>
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
            width: 580,
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
              flexShrink: 0,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div>
                <h3
                  style={{
                    fontSize: 18,
                    fontWeight: 800,
                    color: ds.ink,
                    margin: 0,
                  }}
                >
                  {isEdit ? "프로그램 수정" : "새 프로그램 등록"}
                </h3>
                <p style={{ fontSize: 12, color: ds.ink4, margin: "4px 0 0" }}>
                  <span style={{ color: ds.brand, fontWeight: 700 }}>
                    {eventName}
                  </span>{" "}
                  행사에 프로그램을 {isEdit ? "수정" : "등록"}합니다
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
                }}
              >
                <X size={15} color={ds.ink4} />
              </button>
            </div>
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

            {/* 이미지 */}
            <Field label="프로그램 이미지">
              {!imagePreview ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDrop={handleDrop}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOver(true);
                  }}
                  onDragLeave={() => setDragOver(false)}
                  style={{
                    border: `2px dashed ${dragOver ? ds.brand : ds.line}`,
                    borderRadius: 14,
                    padding: "28px 20px",
                    textAlign: "center",
                    cursor: "pointer",
                    background: dragOver ? `${ds.brand}08` : ds.bg,
                    transition: "all .2s ease",
                  }}
                  onMouseEnter={(e) => {
                    if (!dragOver) {
                      e.currentTarget.style.borderColor = ds.line;
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!dragOver) {
                      e.currentTarget.style.borderColor = ds.line;
                    }
                  }}
                >
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 11,
                      background: `${ds.brand}10`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      margin: "0 auto 10px",
                    }}
                  >
                    <ImagePlus size={20} color={ds.brand} />
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: ds.ink3,
                      marginBottom: 3,
                    }}
                  >
                    클릭하거나 이미지를 드래그하세요
                  </div>
                  <div style={{ fontSize: 11, color: ds.ink4 }}>
                    JPG, PNG, WEBP · 최대 10MB
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
                    src={imagePreview}
                    alt="미리보기"
                    style={{
                      width: "100%",
                      maxHeight: 180,
                      objectFit: "cover",
                      display: "block",
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
                        fileInputRef.current?.click();
                      }}
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 7,
                        border: "none",
                        background: "rgba(0,0,0,0.55)",
                        color: "#fff",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Pencil size={12} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeImage();
                      }}
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 7,
                        border: "none",
                        background: "rgba(239,68,68,0.8)",
                        color: "#fff",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={(e) => handleImageFile(e.target.files?.[0])}
              />
            </Field>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 14,
              }}
            >
              <Field label="프로그램명" required>
                <input
                  style={inputStyle}
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                  onFocus={inputFocus}
                  onBlur={inputBlur}
                  placeholder="예: 기본 훈련 코스"
                  autoFocus
                />
              </Field>
              <Field label="카테고리" required>
                <div style={{ position: "relative" }}>
                  <select
                    value={form.category}
                    onChange={(e) => set("category", e.target.value)}
                    style={{
                      ...inputStyle,
                      appearance: "none",
                      paddingRight: 32,
                      cursor: "pointer",
                    }}
                  >
                    {["교육", "체험", "문화", "상담", "대회"].map((c) => (
                      <option key={c} value={c}>
                        {c}
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
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 14,
              }}
            >
              <Field label="시작일">
                <input
                  type="date"
                  style={inputStyle}
                  value={form.startAt || ""}
                  onChange={(e) => set("startAt", e.target.value)}
                  onFocus={inputFocus}
                  onBlur={inputBlur}
                />
              </Field>
              <Field label="종료일">
                <input
                  type="date"
                  style={inputStyle}
                  value={form.endAt || ""}
                  onChange={(e) => set("endAt", e.target.value)}
                  onFocus={inputFocus}
                  onBlur={inputBlur}
                />
              </Field>
            </div>

            {(form.startAt || form.endAt) &&
              (() => {
                const auto = calcStatus(form.startAt, form.endAt);
                const map = {
                  pending: {
                    l: "대기",
                    c: ds.amber,
                    bg: ds.amberSoft,
                    icon: "⏳",
                  },
                  active: {
                    l: "운영 중",
                    c: ds.green,
                    bg: ds.greenSoft,
                    icon: "●",
                  },
                  ended: { l: "종료", c: ds.ink4, bg: ds.lineSoft, icon: "■" },
                };
                const s = map[auto];
                return (
                  <div
                    style={{
                      marginBottom: 20,
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "8px 14px",
                      background: s.bg,
                      borderRadius: 9,
                    }}
                  >
                    <span style={{ fontSize: 14 }}>{s.icon}</span>
                    <span
                      style={{ fontSize: 12.5, fontWeight: 700, color: s.c }}
                    >
                      상태: {s.l} (일정 기준 자동)
                    </span>
                  </div>
                );
              })()}

            <Field label="설명">
              <textarea
                rows={3}
                style={{ ...inputStyle, resize: "vertical" }}
                value={form.description || ""}
                onChange={(e) => set("description", e.target.value)}
                onFocus={inputFocus}
                onBlur={inputBlur}
                placeholder="프로그램에 대한 설명"
              />
            </Field>
          </div>

          {/* 하단 */}
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
              }}
            >
              취소
            </button>
            <button
              onClick={handleSave}
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
              }}
            >
              {isEdit ? "수정 완료" : "등록하기"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

/* ═══════════════════════════════════════════
   프로그램 상세 모달
   ═══════════════════════════════════════════ */
function ProgramDetailModal({ item, onClose, onEdit, onDelete }) {
  const st = statusMap[item.status] || statusMap.pending;
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
            프로그램 상세
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
            { l: "카테고리", v: item.category },
            { l: "등록 인원", v: `${item.enrolled || 0}명` },
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
   메인 컴포넌트
   ═══════════════════════════════════════════ */
export default function ProgramManage({ subTab = "all" }) {
  /* ── 상태 ── */
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [programs, setPrograms] = useState([]);
  const [viewportWidth, setViewportWidth] = useState(() =>
    typeof window === "undefined" ? 1440 : window.innerWidth,
  );
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [loadingPrograms, setLoadingPrograms] = useState(false);
  const [modal, setModal] = useState(null);
  const [panel, setPanel] = useState(null);
  const [toast, setToast] = useState(null);
  const [removing, setRemoving] = useState(null);
  const [selected, setSelected] = useState(new Set());
  const imageMapRef = useRef({});
  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const syncViewport = () => setViewportWidth(window.innerWidth);
    syncViewport();
    window.addEventListener("resize", syncViewport);
    return () => window.removeEventListener("resize", syncViewport);
  }, []);
  // eventFilter는 Dashboard subTab으로 대체

  const showToast = (msg, type = "success") => setToast({ msg, type });

  /* ── 행사 목록 로드 ── */
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
    } catch (err) {
      console.error("[ProgramManage] 행사 로드 실패:", err);
      setEvents([]);
    } finally {
      setLoadingEvents(false);
    }
  };

  /* ── 선택된 행사의 프로그램 로드 ── */
  const loadPrograms = async (eventId) => {
    setLoadingPrograms(true);
    try {
      await loadProgramImageCache();
      const res = await axiosInstance.get(
        `/api/admin/dashboard/events/${eventId}/programs`,
        { headers: authHeaders() },
      );
      const list = (res.data?.data || res.data || []).filter((p) => {
        return normalizeAdminProgramCategory(p) !== "SESSION";
      });
      const mapped = list.map((p) => ({
        ...p,
        _visible: true,
        status: resolveAdminStatus(p, calcStatus(p.startAt, p.endAt)),
        imageUrl:
          getProgramImage(p.programId || p.id) ||
          imageMapRef.current[p.programId || p.id] ||
          p.imageUrl ||
          null,
      }));
      /* 최신 등록순 (programId 내림차순) */
      const parsePgId = (v) => Number(String(v ?? "").replace(/\D/g, "")) || 0;
      mapped.sort(
        (a, b) =>
          parsePgId(b.programId || b.id) - parsePgId(a.programId || a.id),
      );
      setPrograms(mapped);
    } catch (err) {
      console.error("[ProgramManage] 프로그램 로드 실패:", err);
      setPrograms([]);
    } finally {
      setLoadingPrograms(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, []);

  /* ── 행사 선택 ── */
  const selectEvent = (ev) => {
    setSelectedEvent(ev);
    setSelected(new Set());
    loadPrograms(ev.eventId || ev.id?.replace("EV-", ""));
  };

  const goBack = () => {
    setSelectedEvent(null);
    setPrograms([]);
    setSelected(new Set());
    setPanel(null);
  };

  /* ── 프로그램 CRUD ── */
  const handleCreate = async (form) => {
    const eventId =
      selectedEvent.eventId || selectedEvent.id?.replace("EV-", "");
    try {
      const body = {
        eventId: Number(eventId),
        category: CATEGORY_TO_BACKEND[form.category] || "SESSION",
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
      if (form.imageUrl) {
        const created = res.data?.data || res.data;
        const newId = created?.programId || created?.id;
        if (newId) {
          imageMapRef.current[newId] = form.imageUrl;
          setProgramImage(newId, form.imageUrl);
        }
      }
      await loadPrograms(eventId);
      setPanel(null);
      showToast("새 프로그램이 등록되었습니다.");
    } catch (err) {
      console.error("등록 실패:", err);
      showToast("프로그램 등록에 실패했습니다.", "error");
    }
  };

  const handleUpdate = async (form) => {
    const eventId =
      selectedEvent.eventId || selectedEvent.id?.replace("EV-", "");
    const programId = form.programId || form.id?.replace("PG-", "");
    try {
      const body = {
        category: CATEGORY_TO_BACKEND[form.category] || "SESSION",
        programTitle: form.name,
        description: form.description || "",
        startAt: form.startAt ? `${form.startAt}T00:00:00` : null,
        endAt: form.endAt ? `${form.endAt}T23:59:59` : null,
        imageUrl: null,
      };
      await axiosInstance.patch(
        `/api/admin/dashboard/programs/${programId}`,
        body,
        { headers: authHeaders() },
      );
      if (form.imageUrl) {
        imageMapRef.current[programId] = form.imageUrl;
        setProgramImage(programId, form.imageUrl);
      } else {
        delete imageMapRef.current[programId];
        removeProgramImage(programId);
      }
      await loadPrograms(eventId);
      setPanel(null);
      showToast("프로그램이 수정되었습니다.");
    } catch (err) {
      console.error("수정 실패:", err);
      showToast("프로그램 수정에 실패했습니다.", "error");
    }
  };

  const handleDelete = async () => {
    const item = modal.item;
    const eventId =
      selectedEvent.eventId || selectedEvent.id?.replace("EV-", "");
    const programId = item.programId || item.id?.replace("PG-", "");
    setModal(null);
    setRemoving(item.id);
    try {
      await axiosInstance.delete(`/api/admin/dashboard/programs/${programId}`, {
        headers: authHeaders(),
      });
      setTimeout(async () => {
        await loadPrograms(eventId);
        setRemoving(null);
        showToast("프로그램이 삭제되었습니다.");
      }, 300);
    } catch (err) {
      console.error("삭제 실패:", err);
      setRemoving(null);
      showToast("삭제에 실패했습니다.", "error");
    }
  };

  const handleBulkDelete = async () => {
    const eventId =
      selectedEvent.eventId || selectedEvent.id?.replace("EV-", "");
    const ids = [...selected];
    setModal(null);
    try {
      const programIds = ids.map((fid) => {
        const it = programs.find((e) => e.id === fid);
        return it?.programId || Number(fid.replace("PG-", ""));
      });
      await axiosInstance.post(
        "/api/admin/dashboard/programs/bulk-delete",
        { programIds },
        { headers: authHeaders() },
      );
      await loadPrograms(eventId);
      setSelected(new Set());
      showToast(`${ids.length}건 삭제되었습니다.`);
    } catch (err) {
      showToast("일괄 삭제 실패", "error");
    }
  };

  const handleDeleteAll = async () => {
    const eventId =
      selectedEvent.eventId || selectedEvent.id?.replace("EV-", "");
    setModal(null);
    try {
      const programIds = rows.map(
        (r) => r.programId || Number(String(r.id).replace("PG-", "")),
      );
      await axiosInstance.post(
        "/api/admin/dashboard/programs/bulk-delete",
        { programIds },
        { headers: authHeaders() },
      );
      await loadPrograms(eventId);
      setSelected(new Set());
      showToast(`${rows.length}건이 전체 삭제되었습니다.`);
    } catch (err) {
      showToast("전체 삭제 실패", "error");
    }
  };

  /* ── 필터/통계 ── */
  const filterFn =
    {
      all: () => true,
      active: (e) => e.status === "active",
      ended: (e) => e.status === "ended",
      pending: (e) => e.status === "pending",
    }[subTab] || (() => true);
  const rows = programs.filter((e) => e._visible).filter(filterFn);
  const vis = programs.filter((e) => e._visible);
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
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

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
            <div style={{ textAlign: "center", padding: "80px 0" }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  border: `3px solid ${ds.brand}20`,
                  borderTopColor: ds.brand,
                  borderRadius: "50%",
                  animation: "spin 1s linear infinite",
                  margin: "0 auto 14px",
                }}
              />
              <div style={{ fontSize: 13, color: ds.ink4, fontWeight: 600 }}>
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
                subTab === "all"
                  ? () => true
                  : subTab === "active"
                    ? (e) => e.status === "active"
                    : subTab === "ended"
                      ? (e) => e.status === "ended"
                      : (e) => e.status === "pending",
              );
              return (
                <>
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
                          "repeat(auto-fill, minmax(280px, 1fr))",
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
                              if (isEnded) return;
                              e.currentTarget.style.transform =
                                "translateY(-4px)";
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
                                      : "linear-gradient(to bottom, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.6) 100%)",
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
                                <Clipboard
                                  size={90}
                                  color="#fff"
                                  strokeWidth={1}
                                />
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
                                  style={{
                                    fontSize: 11,
                                    fontWeight: 700,
                                    color: st.c,
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
                                  if (!isEnded)
                                    e.currentTarget.style.background =
                                      ds.brandDark;
                                }}
                                onMouseLeave={(e) => {
                                  if (!isEnded)
                                    e.currentTarget.style.background = ds.brand;
                                }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (!isEnded) selectEvent(ev);
                                }}
                              >
                                <Clipboard size={13} />{" "}
                                {isEnded ? "기간 만료" : "프로그램 관리하기"}
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

      {/* ═══════ VIEW 2: 프로그램 관리 ═══════ */}
      {selectedEvent && (
        <>
          {/* 상단: 뒤로가기 + 행사 정보 */}
          <div style={{ marginBottom: 16 }}>
            <button
              onClick={goBack}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 7,
                padding: "8px 16px 8px 12px",
                borderRadius: 10,
                border: "none",
                background: `${ds.brand}0F`,
                fontSize: 13.5,
                fontWeight: 700,
                color: ds.brand,
                cursor: "pointer",
                fontFamily: ds.ff,
                marginBottom: 14,
                transition: "all .2s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = `${ds.brand}1A`;
                e.currentTarget.style.transform = "translateX(-2px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = `${ds.brand}0F`;
                e.currentTarget.style.transform = "translateX(0)";
              }}
            >
              <ChevronLeft size={16} strokeWidth={2.5} /> 행사 목록으로
            </button>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
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

          {/* 통계 */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : "repeat(4, 1fr)",
              gap: 12,
              marginBottom: 16,
            }}
          >
            <StatCard
              icon={Clipboard}
              label="전체 프로그램"
              value={vis.length}
              color={ds.brand}
            />
            <StatCard
              icon={BookOpen}
              label="운영 중"
              value={vis.filter((e) => e.status === "active").length}
              color="#3a4520"
            />
            <StatCard
              icon={Users}
              label="총 등록 인원"
              value={vis.reduce((a, b) => a + (b.enrolled || 0), 0)}
              color="#8B5CF6"
            />
            <StatCard
              icon={Clock}
              label="대기 중"
              value={vis.filter((e) => e.status === "pending").length}
              color="#F59E0B"
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
                <span style={{ fontSize: 14, fontWeight: 800, color: ds.ink }}>
                  프로그램 목록
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
                  <Plus size={13} strokeWidth={2.5} /> 프로그램 등록
                </button>
              </div>
            </div>

            {isMobile ? (
              <div style={{ display: "flex", flexDirection: "column" }}>
                {loadingPrograms ? (
                  <div style={{ padding: "40px 14px", textAlign: "center", fontSize: 13, color: ds.ink4 }}>
                    프로그램 로딩 중입니다.
                  </div>
                ) : rows.length === 0 ? (
                  <div style={{ padding: "40px 14px", textAlign: "center", fontSize: 13, color: ds.ink4 }}>
                    등록된 프로그램이 없습니다.
                  </div>
                ) : (
                  rows.map((r) => {
                    const st = statusMap[r.status] || statusMap.pending;
                    const isRemoving = removing === r.id;
                    const isChecked = selected.has(r.id);
                    return (
                      <div
                        key={r.id}
                        className={isRemoving ? "row-removing" : ""}
                        onClick={() => setModal({ type: "detail", item: r })}
                        style={{
                          padding: "14px",
                          borderBottom: `1px solid ${ds.lineSoft}`,
                          background: isChecked ? `${ds.brand}06` : "transparent",
                          cursor: "pointer",
                          opacity: r.status === "ended" ? 0.45 : 1,
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
                                  }}
                                />
                              )}
                              <div style={{ minWidth: 0 }}>
                                <div style={{ fontSize: 14, fontWeight: 800, color: ds.ink, whiteSpace: "normal", wordBreak: "keep-all", overflowWrap: "break-word" }}>
                                  {r.name}
                                </div>
                                <div style={{ fontSize: 11, color: ds.ink4, fontFamily: "monospace", marginTop: 2 }}>
                                  {r.id}
                                </div>
                              </div>
                            </div>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
                              <Pill color="#8B5CF6" bg="#8B5CF610">{r.category}</Pill>
                              <Pill color={st.c} bg={st.bg}>{st.l}</Pill>
                            </div>
                            <div style={{ marginTop: 10, fontSize: 12.5, color: ds.ink3 }}>
                              등록 인원 {r.enrolled || 0}명
                            </div>
                          </div>
                          <Checkbox checked={isChecked} onChange={() => toggleOne(r.id)} />
                        </div>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
                          {[
                            { label: "상세", fn: () => setModal({ type: "detail", item: r }), color: ds.ink3, border: ds.line, bg: ds.card },
                            { label: "수정", fn: () => setPanel({ type: "edit", item: r }), color: ds.ink3, border: ds.line, bg: ds.card },
                            { label: "삭제", fn: () => setModal({ type: "delete", item: r }), color: ds.red, border: "#FECACA60", bg: "#FEF2F208" },
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
                    { label: "프로그램명", w: "35%" },
                    { label: "카테고리", w: 100 },
                    { label: "등록 인원", w: 90, align: "right" },
                    { label: "상태", w: 72 },
                    { label: "", w: 130 },
                  ].map((c, i) => (
                    <th
                      key={i}
                      style={{
                        padding: "10px 14px",
                        fontSize: 11.5,
                        fontWeight: 700,
                        color: ds.ink4,
                        textAlign: c.align || "left",
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
                {loadingPrograms ? (
                  <tr>
                    <td
                      colSpan={6}
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
                          프로그램 로딩 중...
                        </span>
                      </div>
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      style={{ padding: "60px 0", textAlign: "center" }}
                    >
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                        }}
                      >
                        <Clipboard
                          size={36}
                          color={ds.ink4}
                          strokeWidth={1.5}
                        />
                        <div
                          style={{
                            fontSize: 14,
                            fontWeight: 700,
                            color: ds.ink4,
                            marginTop: 12,
                          }}
                        >
                          등록된 프로그램이 없습니다
                        </div>
                        <div
                          style={{
                            fontSize: 12.5,
                            color: ds.ink4,
                            marginTop: 4,
                          }}
                        >
                          이 행사에 프로그램을 등록해보세요
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  rows.map((r) => {
                    const st = statusMap[r.status] || statusMap.pending;
                    const isRemoving = removing === r.id;
                    const isChecked = selected.has(r.id);
                    const isEnded = r.status === "ended";
                    return (
                      <tr
                        key={r.id}
                        className={isRemoving ? "row-removing" : ""}
                        onClick={() => setModal({ type: "detail", item: r })}
                        style={{
                          borderBottom: `1px solid ${ds.lineSoft}`,
                          cursor: "pointer",
                          transition: "background .1s",
                          opacity: isEnded ? 0.45 : 1,
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
                                  filter: isEnded
                                    ? "blur(1.5px) grayscale(0.6)"
                                    : "none",
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
                        <td style={{ padding: "11px 14px" }}>
                          <Pill color="#8B5CF6" bg="#8B5CF610">
                            {r.category}
                          </Pill>
                        </td>
                        <td
                          style={{
                            padding: "11px 14px",
                            fontSize: 13,
                            fontWeight: 700,
                            color: ds.ink,
                            textAlign: "right",
                          }}
                        >
                          {r.enrolled || 0}명
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
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setPanel({ type: "edit", item: r });
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
                              수정
                            </button>
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
            )}
          </div>
        </>
      )}

      {/* ═══════ 모달들 ═══════ */}
      {panel?.type === "create" && (
        <ProgramFormModal
          onSave={handleCreate}
          onClose={() => setPanel(null)}
          eventName={selectedEvent?.name || selectedEvent?.eventName}
        />
      )}
      {panel?.type === "edit" && (
        <ProgramFormModal
          item={panel.item}
          isEdit
          onSave={handleUpdate}
          onClose={() => setPanel(null)}
          eventName={selectedEvent?.name || selectedEvent?.eventName}
        />
      )}
      {modal?.type === "detail" && (
        <ProgramDetailModal
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
          title="프로그램 삭제"
          msg={`"${modal.item.name}" 프로그램을 삭제하시겠습니까?\n삭제된 데이터는 복구할 수 없습니다.`}
          onConfirm={handleDelete}
          onCancel={() => setModal(null)}
        />
      )}
      {modal?.type === "bulkDelete" && (
        <ConfirmModal
          title="선택 프로그램 삭제"
          msg={`선택한 ${selected.size}건의 프로그램을 삭제하시겠습니까?\n삭제된 데이터는 복구할 수 없습니다.`}
          onConfirm={handleBulkDelete}
          onCancel={() => setModal(null)}
        />
      )}
      {modal?.type === "deleteAll" && (
        <ConfirmModal
          title="전체 프로그램 삭제"
          msg={`현재 목록의 ${rows.length}건을 전체 삭제하시겠습니까?\n삭제된 데이터는 복구할 수 없습니다.`}
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
