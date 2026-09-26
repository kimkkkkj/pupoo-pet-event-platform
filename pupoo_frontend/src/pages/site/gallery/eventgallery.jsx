import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  AlertTriangle,
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Eye,
  GripVertical,
  Heart,
  ImageOff,
  Loader2,
  Plus,
  Search,
  ListFilter,
  SlidersHorizontal,
  Upload,
  X,
  Images,
} from "lucide-react";
import PageHeader from "../components/PageHeader";
import PageLoading from "../components/PageLoading";
import EmptyState from "../components/EmptyState";
import CommunityPagination from "../community/shared/CommunityPagination";
import { eventApi } from "../../../app/http/eventApi";
import { galleryApi } from "../../../app/http/galleryApi";
import { reportApi } from "../../../app/http/reportApi";
import { useAuth } from "../auth/AuthProvider";
import { userApi } from "../../../app/http/userApi";
import { normalizeEventTitle } from "../../../shared/utils/eventDisplay";
import { toPublicAssetUrl } from "../../../shared/utils/publicAssetUrl";
import ReportModal from "../components/ReportModal";

const PAGE_SIZE = 8;
const SERVICE_CATEGORIES = [{ label: "행사 갤러리", path: "/gallery/eventgallery" }];
const SORT_OPTIONS = [
  { value: "latest", label: "최신순" },
  { value: "likes", label: "좋아요순" },
];

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`;
}

function toTimestamp(value) {
  const ts = Date.parse(String(value || ""));
  return Number.isFinite(ts) ? ts : 0;
}

function normalizeGallery(row) {
  return {
    galleryId: row?.galleryId,
    eventId: row?.eventId,
    userId: row?.userId,
    title: row?.title || "제목 없음",
    description: row?.description || "",
    createdAt: row?.createdAt || null,
    likeCount: Number(row?.likeCount || 0),
    viewCount: Number(row?.viewCount || 0),
    imageUrls: Array.isArray(row?.imageUrls)
      ? row.imageUrls.map((url) => toPublicAssetUrl(url))
      : [],
  };
}

function backdropStyle() {
  return {
    position: "fixed",
    inset: 0,
    zIndex: 5000,
    background: "rgba(0,0,0,0.75)",
    backdropFilter: "blur(6px)",
  };
}

function overlayStyle() {
  return {
    position: "fixed",
    inset: 0,
    zIndex: 5001,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  };
}

function modalShellStyle(width) {
  return {
    width,
    maxHeight: "90vh",
    overflow: "auto",
    background: "#fff",
    borderRadius: 22,
    border: "1px solid #dbe2ea",
    boxShadow: "0 28px 70px rgba(15,23,42,0.18)",
  };
}

function buttonStyle(kind = "neutral") {
  if (kind === "primary") {
    return {
      height: 44,
      padding: "0 18px",
      borderRadius: 10,
      border: "none",
      background: "#7ab33e",
      fontSize: 14,
      fontWeight: 800,
      color: "#fff",
      cursor: "pointer",
    };
  }
  return {
    height: 44,
    padding: "0 18px",
    borderRadius: 10,
    border: "1px solid #cbd5e1",
    background: "#fff",
    fontSize: 14,
    fontWeight: 700,
    color: "#475569",
    cursor: "pointer",
  };
}

function GalleryWriteModal({
  open,
  events,
  form,
  onChange,
  onFilesChange,
  onClose,
  onSubmit,
  loading,
  error,
}) {
  const fileInputRef = useRef(null);
  const prevUrlsRef = useRef([]);
  const [dragOver, setDragOver] = useState(false);
  const [dragIndex, setDragIndex] = useState(null);
  const [dropIndex, setDropIndex] = useState(null);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  const previewUrls = useMemo(() => {
    prevUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    prevUrlsRef.current = (form.files || []).map((f) => URL.createObjectURL(f));
    return prevUrlsRef.current;
  }, [form.files]);

  useEffect(() => {
    return () => {
      prevUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      prevUrlsRef.current = [];
    };
  }, []);

  const handleFileAdd = useCallback(
    (newFiles) => {
      const files = Array.isArray(newFiles) ? newFiles : [];
      if (!files.length) return;
      const imageFiles = files.filter((f) => f?.type?.startsWith("image/"));
      onFilesChange([...(form.files || []), ...imageFiles]);
    },
    [form.files, onFilesChange],
  );

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      setDragOver(false);
      const files = Array.from(e.dataTransfer?.files || []);
      handleFileAdd(files);
    },
    [handleFileAdd],
  );

  const handleReorder = useCallback(
    (fromIndex, toIndex) => {
      if (fromIndex === toIndex || toIndex < 0) return;
      const list = [...(form.files || [])];
      const [removed] = list.splice(fromIndex, 1);
      list.splice(toIndex, 0, removed);
      onFilesChange(list);
      setDragIndex(null);
      setDropIndex(null);
    },
    [form.files, onFilesChange],
  );

  const handleRemoveFile = useCallback(
    (index) => {
      const list = [...(form.files || [])];
      list.splice(index, 1);
      onFilesChange(list);
    },
    [form.files, onFilesChange],
  );

  if (!open) return null;

  const files = form.files || [];

  return (
    <>
      <div style={backdropStyle()} onClick={onClose} />
      <div style={overlayStyle()}>
        <div onClick={(event) => event.stopPropagation()} style={modalShellStyle("min(760px, 100%)")}>
          <div style={{ padding: "24px 28px 18px", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 22, fontWeight: 900, color: "#0f172a" }}>갤러리 글쓰기</div>
              <div style={{ marginTop: 6, fontSize: 13, color: "#64748b" }}>행사 현장 사진과 설명을 함께 등록할 수 있습니다.</div>
            </div>
            <button type="button" onClick={onClose} style={{ width: 38, height: 38, borderRadius: 10, border: "1px solid #dbe2ea", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
              <X size={16} color="#64748b" />
            </button>
          </div>

          <div style={{ padding: 28, display: "grid", gap: 18 }}>
            {error ? <div style={{ padding: "12px 14px", borderRadius: 10, background: "#fef2f2", border: "1px solid #fecaca", color: "#b91c1c", fontSize: 13, fontWeight: 700 }}>{error}</div> : null}

            <label style={{ display: "grid", gap: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#334155" }}>행사 선택</span>
              <select value={form.eventId} onChange={(event) => onChange("eventId", event.target.value)} style={{ height: 46, borderRadius: 10, border: "1px solid #cbd5e1", padding: "0 14px", fontSize: 14 }}>
                <option value="">행사를 선택해 주세요</option>
                {events.map((item) => <option key={item.eventId} value={item.eventId}>{item.eventName}</option>)}
              </select>
            </label>

            <label style={{ display: "grid", gap: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#334155" }}>제목</span>
              <input value={form.title} onChange={(event) => onChange("title", event.target.value)} placeholder="사진 제목을 입력해 주세요" style={{ height: 46, borderRadius: 10, border: "1px solid #cbd5e1", padding: "0 14px", fontSize: 14 }} />
            </label>

            <label style={{ display: "grid", gap: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#334155" }}>설명</span>
              <textarea value={form.description} onChange={(event) => onChange("description", event.target.value)} rows={5} placeholder="현장 분위기와 설명을 입력해 주세요" style={{ borderRadius: 12, border: "1px solid #cbd5e1", padding: 14, fontSize: 14, lineHeight: 1.7, resize: "vertical" }} />
            </label>

            <div style={{ display: "grid", gap: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#334155" }}>이미지 업로드</span>
              <div
                role="button"
                tabIndex={0}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setDragOver(true); }}
                onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setDragOver(false); }}
                onDrop={handleDrop}
                style={{
                  minHeight: 100,
                  borderRadius: 14,
                  border: `2px dashed ${dragOver ? "#7ab33e" : "#5CCDB2"}`,
                  background: dragOver ? "#E6F7F2" : "#f8fafc",
                  padding: 20,
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 10,
                  transition: "background 0.15s, border-color 0.15s",
                }}
              >
                <Upload size={24} color="#7ab33e" />
                <span style={{ fontSize: 14, fontWeight: 700, color: "#7ab33e" }}>
                  {dragOver ? "여기에 놓으세요" : "클릭하여 파일 선택 또는 이미지를 여기에 드래그"}
                </span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  style={{ display: "none" }}
                  onChange={(e) => {
                    handleFileAdd(Array.from(e.target.files || []));
                    e.target.value = "";
                  }}
                />
              </div>
            </div>

            {files.length > 0 ? (
              <div style={{ display: "grid", gap: 12 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#334155" }}>미리보기 (첫 번째 사진이 대표 이미지)</span>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
                  {files.map((file, index) => (
                    <div
                      key={`${file.name}-${file.lastModified}-${index}`}
                      draggable
                      onDragStart={() => setDragIndex(index)}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setDropIndex(index);
                      }}
                      onDragLeave={() => setDropIndex(null)}
                      onDragEnd={() => { setDragIndex(null); setDropIndex(null); }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (dragIndex != null && dragIndex !== index) handleReorder(dragIndex, index);
                        setDragIndex(null);
                        setDropIndex(null);
                      }}
                      style={{
                        width: 100,
                        flexShrink: 0,
                        borderRadius: 12,
                        overflow: "hidden",
                        border: dragIndex === index ? "2px solid #7ab33e" : dropIndex === index ? "2px solid #5CCDB2" : "1px solid #e2e8f0",
                        background: "#fff",
                        boxShadow: "0 2px 8px rgba(15,23,42,0.06)",
                        position: "relative",
                        cursor: "grab",
                        opacity: dragIndex === index ? 0.85 : 1,
                      }}
                    >
                      <div style={{ aspectRatio: "1", position: "relative", background: "#f1f5f9" }}>
                        <img src={previewUrls[index]} alt={file.name} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                        {index === 0 ? (
                          <span style={{ position: "absolute", top: 6, left: 6, padding: "4px 8px", borderRadius: 6, background: "#7ab33e", color: "#fff", fontSize: 11, fontWeight: 800 }}>
                            대표
                          </span>
                        ) : null}
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleRemoveFile(index); }}
                          style={{ position: "absolute", top: 6, right: 6, width: 24, height: 24, borderRadius: 6, border: "none", background: "rgba(15,23,42,0.6)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
                          aria-label="삭제"
                        >
                          <X size={12} />
                        </button>
                        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "6px 8px", background: "linear-gradient(transparent, rgba(15,23,42,0.7))", display: "flex", alignItems: "center", gap: 4 }}>
                          <GripVertical size={12} color="#fff" />
                          <span style={{ fontSize: 10, color: "#fff", fontWeight: 600 }}>드래그하여 순서 변경</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <div style={{ padding: "0 28px 28px", display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <button type="button" onClick={onClose} style={buttonStyle()}>취소</button>
            <button type="button" onClick={onSubmit} disabled={loading} style={{ ...buttonStyle("primary"), opacity: loading ? 0.6 : 1 }}>{loading ? "등록 중..." : "등록하기"}</button>
          </div>
        </div>
      </div>
    </>
  );
}
function GalleryEditModal({ open, item, onClose, onSubmit, loading, error }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (open && item) {
      setTitle(item.title || "");
      setDescription(item.description || "");
    }
  }, [open, item]);

  if (!open || !item) return null;

  return (
    <>
      <div style={backdropStyle()} onClick={onClose} />
      <div style={overlayStyle()} onClick={onClose}>
        <div onClick={(e) => e.stopPropagation()} style={modalShellStyle("min(520px, 100%)")}>
          <div style={{ padding: "28px 28px 0" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: "#111827" }}>갤러리 수정</div>
              <button type="button" onClick={onClose} style={{ width: 34, height: 34, borderRadius: 999, border: "none", background: "#f3f4f6", color: "#6b7280", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                <X size={16} />
              </button>
            </div>
          </div>
          <div style={{ padding: "0 28px 28px", display: "grid", gap: 16 }}>
            {error && (
              <div style={{ padding: "10px 14px", borderRadius: 10, background: "#FEF2F2", border: "1px solid #FECACA", fontSize: 13, color: "#B91C1C", fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
                <AlertTriangle size={14} />
                {error}
              </div>
            )}
            <label style={{ display: "grid", gap: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#334155" }}>제목</span>
              <input value={title} onChange={(e) => setTitle(e.target.value)} disabled={loading} style={{ height: 44, borderRadius: 10, border: "1px solid #cbd5e1", padding: "0 14px", fontSize: 14, color: "#0f172a", background: loading ? "#f1f5f9" : "#fff" }} />
            </label>
            <label style={{ display: "grid", gap: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#334155" }}>설명</span>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} disabled={loading} rows={4} style={{ borderRadius: 10, border: "1px solid #cbd5e1", padding: "12px 14px", fontSize: 14, color: "#0f172a", resize: "vertical", fontFamily: "inherit", background: loading ? "#f1f5f9" : "#fff" }} />
            </label>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button type="button" onClick={onClose} disabled={loading} style={buttonStyle()}>취소</button>
              <button type="button" onClick={() => onSubmit({ title: title.trim(), description: description.trim() })} disabled={loading || !title.trim()} style={{ ...buttonStyle("primary"), opacity: loading || !title.trim() ? 0.6 : 1, cursor: loading || !title.trim() ? "not-allowed" : "pointer" }}>{loading ? "수정 중..." : "수정하기"}</button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function GalleryViewer({ item, eventName, onClose, onToggleLike, onReport, onEdit, liked, canEdit, isMobile }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
  }, [item?.galleryId]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (!item) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [item]);

  useEffect(() => {
    if (!item) return;
    const handleKey = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && item.imageUrls.length > 1) setIndex((p) => (p - 1 + item.imageUrls.length) % item.imageUrls.length);
      if (e.key === "ArrowRight" && item.imageUrls.length > 1) setIndex((p) => (p + 1) % item.imageUrls.length);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [item, onClose]);

  if (!item) return null;

  const total = item.imageUrls.length;
  const currentImage = item.imageUrls[index] || "";
  const go = (step) => setIndex((p) => (p + step + total) % total);

  return (
    <>
      <div style={backdropStyle()} onClick={onClose} />
      <div style={{ ...overlayStyle(), alignItems: isMobile ? "flex-end" : "center", padding: isMobile ? 0 : 24 }} onClick={onClose}>
        <div className={`gv${isMobile ? " mobile" : ""}`} onClick={(e) => e.stopPropagation()} role="dialog" aria-label={item.title}>
          {/* 사진: 잘리지 않게 전체 표시, 뒤에는 같은 사진을 흐리게 */}
          <div className="gv-media">
            {currentImage ? (
              <>
                <div className="gv-media-bg" style={{ backgroundImage: `url("${currentImage}")` }} />
                <img src={currentImage} alt={item.title} className="gv-media-img" />
              </>
            ) : (
              <div className="gv-media-empty"><ImageOff size={44} /><span>이미지가 없습니다.</span></div>
            )}
            {total > 1 && (
              <>
                <button type="button" className="gv-nav left" onClick={() => go(-1)} aria-label="이전 사진"><ChevronLeft size={20} /></button>
                <button type="button" className="gv-nav right" onClick={() => go(1)} aria-label="다음 사진"><ChevronRight size={20} /></button>
                <div className="gv-count">{index + 1} / {total}</div>
              </>
            )}
          </div>

          {/* 후기 */}
          <div className="gv-panel">
            <div className="gv-top">
              <span className="gv-event">{eventName}</span>
              <button type="button" className="gv-close" onClick={onClose} aria-label="닫기"><X size={18} /></button>
            </div>

            <h2 className="gv-title">{item.title}</h2>
            <div className="gv-meta">
              <span><Calendar size={14} />{formatDate(item.createdAt)}</span>
              <span><Eye size={14} />조회 {item.viewCount.toLocaleString()}</span>
              <span><Heart size={14} />좋아요 {item.likeCount.toLocaleString()}</span>
            </div>

            <div className="gv-body">
              {item.description ? <p className="gv-desc">{item.description}</p> : <p className="gv-desc muted">작성된 후기가 없습니다.</p>}

              {total > 1 && (
                <div className="gv-thumbs">
                  {item.imageUrls.map((url, i) => (
                    <button key={`${url}-${i}`} type="button" className={`gv-thumb${i === index ? " active" : ""}`} onClick={() => setIndex(i)} aria-label={`${i + 1}번째 사진`}>
                      <img src={url} alt="" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="gv-actions">
              <button type="button" className={`gv-like${liked ? " on" : ""}`} onClick={onToggleLike}>
                <Heart size={18} fill={liked ? "currentColor" : "none"} />
                {liked ? "좋아요 취소" : "좋아요"} <b>{item.likeCount}</b>
              </button>
              <div className="gv-sub-actions">
                {canEdit && <button type="button" className="gv-text-btn" onClick={onEdit}>수정</button>}
                <button type="button" className="gv-text-btn" onClick={onReport}><AlertTriangle size={14} />신고</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

const galleryStyles = `
  .eg-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 22px; flex-wrap: wrap; }
  .eg-total { font-size: 18px; font-weight: 900; color: #111827; }
  .eg-total em { font-style: normal; margin-left: 6px; font-size: 15px; font-weight: 700; color: #9ca3af; }
  .eg-controls { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
  .eg-bar { display: flex; align-items: center; height: 50px; background: #fff; border: 1.5px solid #e5e7eb; border-radius: 14px; }
  .eg-bar:focus-within { border-color: #90C450; box-shadow: 0 0 0 4px rgba(144,196,80,.14); }
  .eg-divider { width: 1px; height: 22px; background: #e5e7eb; flex-shrink: 0; }
  .board-search-input::placeholder { color: #9ca3af; font-size: 14px; font-weight: 500; }

  .eg-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 22px; }
  .eg-card { background: #fff; border-radius: 20px; overflow: hidden; cursor: pointer; box-shadow: 0 0 0 1px rgba(15,23,42,.06), 0 6px 18px rgba(15,23,42,.04); transition: transform .2s, box-shadow .2s; display: flex; flex-direction: column; }
  .eg-card:hover { transform: translateY(-3px); box-shadow: 0 0 0 1px rgba(15,23,42,.08), 0 16px 32px rgba(15,23,42,.1); }
  .eg-thumb { position: relative; aspect-ratio: 4 / 3; background: #eef1f4; overflow: hidden; }
  .eg-thumb img { width: 100%; height: 100%; object-fit: cover; display: block; transition: transform .4s ease; }
  .eg-card:hover .eg-thumb img { transform: scale(1.05); }
  .eg-thumb-empty { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; color: #cbd5e1; }
  .eg-multi { position: absolute; top: 12px; right: 12px; display: inline-flex; align-items: center; gap: 4px; height: 26px; padding: 0 9px; border-radius: 999px; background: rgba(17,24,39,.62); color: #fff; font-size: 12px; font-weight: 800; backdrop-filter: blur(4px); }
  .eg-body { padding: 16px 18px 18px; display: flex; flex-direction: column; gap: 8px; flex: 1; }
  .eg-event { align-self: flex-start; max-width: 100%; height: 24px; padding: 0 10px; border-radius: 999px; background: #f4f8ee; color: #4d7a1f; font-size: 12px; font-weight: 800; display: inline-flex; align-items: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .eg-title { margin: 0; font-size: 17px; font-weight: 900; line-height: 1.4; color: #111827; letter-spacing: -0.2px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
  .eg-desc { margin: 0; font-size: 14px; line-height: 1.6; color: #6b7280; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
  .eg-foot { margin-top: auto; padding-top: 10px; display: flex; align-items: center; justify-content: space-between; border-top: 1px solid #f1f3f5; }
  .eg-foot-meta { display: flex; gap: 12px; font-size: 13px; color: #9ca3af; }
  .eg-foot-meta span { display: inline-flex; align-items: center; gap: 4px; }
  .eg-like { border: none; background: none; padding: 4px 6px; border-radius: 8px; display: inline-flex; align-items: center; gap: 5px; font-size: 13px; font-weight: 800; color: #6b7280; cursor: pointer; }
  .eg-like:hover { background: #fff1f2; color: #e11d48; }
  .eg-like.on { color: #e11d48; }

  /* 후기 팝업 */
  .gv { width: min(1080px, 100%); height: min(640px, 88vh); display: grid; grid-template-columns: minmax(0, 1.35fr) minmax(0, 1fr); background: #fff; border-radius: 24px; overflow: hidden; box-shadow: 0 30px 80px rgba(15,23,42,.3); }
  .gv-media { position: relative; background: #0f172a; overflow: hidden; isolation: isolate; display: flex; align-items: center; justify-content: center; }
  .gv-media-bg { position: absolute; inset: -30px; background-size: cover; background-position: center; filter: blur(26px) brightness(.5); z-index: -1; }
  .gv-media-img { max-width: 100%; max-height: 100%; object-fit: contain; display: block; }
  .gv-media-empty { display: flex; flex-direction: column; align-items: center; gap: 10px; color: #94a3b8; font-size: 14px; }
  .gv-nav { position: absolute; top: 50%; transform: translateY(-50%); width: 42px; height: 42px; border-radius: 50%; border: none; background: rgba(255,255,255,.88); color: #111827; display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 4px 12px rgba(0,0,0,.2); }
  .gv-nav:hover { background: #fff; }
  .gv-nav.left { left: 16px; }
  .gv-nav.right { right: 16px; }
  .gv-count { position: absolute; bottom: 16px; left: 50%; transform: translateX(-50%); padding: 5px 12px; border-radius: 999px; background: rgba(0,0,0,.5); color: #fff; font-size: 12.5px; font-weight: 700; }

  .gv-panel { display: flex; flex-direction: column; min-width: 0; min-height: 0; padding: 22px 26px 22px; }
  .gv-top { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
  .gv-event { height: 28px; padding: 0 12px; border-radius: 999px; background: #f4f8ee; color: #4d7a1f; font-size: 13px; font-weight: 800; display: inline-flex; align-items: center; max-width: 80%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .gv-close { width: 38px; height: 38px; border-radius: 50%; border: none; background: #f3f4f6; color: #4b5563; display: flex; align-items: center; justify-content: center; cursor: pointer; flex-shrink: 0; }
  .gv-close:hover { background: #e5e7eb; color: #111827; }
  .gv-title { margin: 16px 0 10px; font-size: 24px; font-weight: 900; line-height: 1.35; letter-spacing: -0.4px; color: #0f172a; word-break: keep-all; }
  .gv-meta { display: flex; flex-wrap: wrap; gap: 6px 14px; padding-bottom: 16px; border-bottom: 1px solid #f1f3f5; font-size: 13.5px; color: #9ca3af; }
  .gv-meta span { display: inline-flex; align-items: center; gap: 5px; }
  .gv-body { flex: 1; min-height: 0; overflow-y: auto; padding: 16px 0; }
  .gv-desc { margin: 0; font-size: 15.5px; line-height: 1.85; color: #374151; white-space: pre-wrap; word-break: keep-all; }
  .gv-desc.muted { color: #9ca3af; }
  .gv-thumbs { display: flex; gap: 8px; margin-top: 18px; overflow-x: auto; }
  .gv-thumb { width: 64px; height: 64px; border-radius: 12px; overflow: hidden; padding: 0; border: 2px solid transparent; background: none; cursor: pointer; opacity: .55; flex-shrink: 0; transition: opacity .15s; }
  .gv-thumb.active { border-color: #6FA436; opacity: 1; }
  .gv-thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .gv-actions { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding-top: 16px; border-top: 1px solid #f1f3f5; }
  .gv-like { height: 48px; padding: 0 20px; border-radius: 14px; border: 1.5px solid #fecdd3; background: #fff; color: #e11d48; display: inline-flex; align-items: center; gap: 8px; font-size: 15px; font-weight: 800; cursor: pointer; }
  .gv-like b { font-weight: 900; }
  .gv-like:hover { background: #fff1f2; }
  .gv-like.on { background: #e11d48; border-color: #e11d48; color: #fff; }
  .gv-sub-actions { display: flex; gap: 4px; }
  .gv-text-btn { border: none; background: none; padding: 8px 10px; border-radius: 10px; display: inline-flex; align-items: center; gap: 5px; font-size: 13.5px; font-weight: 700; color: #6b7280; cursor: pointer; }
  .gv-text-btn:hover { background: #f3f4f6; color: #111827; }

  .gv.mobile { grid-template-columns: 1fr; grid-template-rows: 300px minmax(0, 1fr); height: calc(100vh - 48px); border-radius: 22px 22px 0 0; }
  .gv.mobile .gv-panel { padding: 18px 20px 20px; }
  .gv.mobile .gv-title { font-size: 20px; }

  @media (max-width: 1100px) { .eg-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
  @media (max-width: 860px) { .eg-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; } }
  @media (max-width: 767px) {
    .eg-toolbar { flex-direction: column; align-items: stretch; }
    .eg-controls { flex-direction: column; align-items: stretch; }
    .eg-bar { flex-wrap: wrap; height: auto; }
  }
  @media (max-width: 520px) {
    .eg-grid { grid-template-columns: 1fr; }
  }
`;

export default function EventGallery() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedEventId = searchParams.get("eventId") || "";
  const requestedGalleryId = searchParams.get("galleryId") || "";
  const { isAuthed } = useAuth();

  const [events, setEvents] = useState([]);
  const [galleries, setGalleries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sortOption, setSortOption] = useState("latest");
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const [eventDdOpen, setEventDdOpen] = useState(false);
  const eventDdRef = useRef(null);
  const sortDdRef = useRef(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [meUserId, setMeUserId] = useState(null);
  const [likedMap, setLikedMap] = useState({});
  const [viewer, setViewer] = useState(null);
  const [writeOpen, setWriteOpen] = useState(false);
  const [writeLoading, setWriteLoading] = useState(false);
  const [writeError, setWriteError] = useState("");
  const [writeForm, setWriteForm] = useState({ eventId: "", title: "", description: "", files: [] });
  const [reportTarget, setReportTarget] = useState(null);
  const [reportNotice, setReportNotice] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState("");
  const userClosedViewerRef = useRef(false);

  const [viewportWidth, setViewportWidth] = useState(() =>
    typeof window === "undefined" ? 1440 : window.innerWidth,
  );
  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const syncViewport = () => setViewportWidth(window.innerWidth);
    syncViewport();
    window.addEventListener("resize", syncViewport);
    return () => window.removeEventListener("resize", syncViewport);
  }, []);
  const isMobile = viewportWidth < 768;


  const eventNameMap = useMemo(() => Object.fromEntries(events.map((event) => [String(event.eventId), event.eventName])), [events]);

  const loadEvents = useCallback(async () => {
    try {
      const res = await eventApi.getEvents({ page: 0, size: 100, sort: "startAt,desc" });
      const rows = Array.isArray(res?.data?.data?.content) ? res.data.data.content : [];
      setEvents(rows.map((row) => ({ eventId: row?.eventId, eventName: normalizeEventTitle(row?.eventName ?? row?.title, row) })));
    } catch (err) {
      console.error("[EventGallery] event load failed:", err);
      setEvents([]);
    }
  }, []);

  const loadGalleries = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const keyword = search.trim();
      const sort = sortOption === "likes" ? "likes" : "latest";
      const res = selectedEventId
        ? await galleryApi.getListByEvent(Number(selectedEventId), {
            page: page - 1,
            size: PAGE_SIZE,
            sort,
            keyword: keyword || undefined,
          })
        : await galleryApi.getList({
            page: page - 1,
            size: PAGE_SIZE,
            sort,
            keyword: keyword || undefined,
          });
      const data = res?.data?.data ?? res?.data;
      const rows = Array.isArray(data?.content) ? data.content : Array.isArray(data) ? data : [];
      setGalleries(rows.map(normalizeGallery));
      setTotalPages(Math.max(1, Number(data?.totalPages ?? 1) || 1));
      setTotalCount(Number(data?.totalElements ?? rows.length) || 0);
    } catch (err) {
      console.error("[EventGallery] gallery load failed:", err);
      setGalleries([]);
      setTotalPages(1);
      setTotalCount(0);
      setError(err?.response?.data?.message || "네트워크 연결을 확인하고 다시 시도해 주세요.");
    } finally {
      setLoading(false);
    }
  }, [selectedEventId, page, search, sortOption]);

  useEffect(() => { loadEvents(); }, [loadEvents]);
  useEffect(() => { loadGalleries(); }, [loadGalleries]);
  useEffect(() => { setPage(1); }, [search, selectedEventId, sortOption]);
  useEffect(() => {
    if (!isAuthed) {
      setMeUserId(null);
      return;
    }
    userApi.getMe().then((data) => setMeUserId(data?.userId ?? null)).catch(() => setMeUserId(null));
  }, [isAuthed]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const currentPage = Math.min(page, totalPages);
  const pagedGalleries = galleries;
  const currentSortLabel =
    SORT_OPTIONS.find((item) => item.value === sortOption)?.label ||
    "최신순";
  const currentEventLabel = selectedEventId ? (events.find((e) => String(e.eventId) === selectedEventId)?.eventName || "전체 행사") : "전체 행사";

  useEffect(() => {
    const h = (e) => {
      if (eventDdRef.current && !eventDdRef.current.contains(e.target)) setEventDdOpen(false);
      if (sortDdRef.current && !sortDdRef.current.contains(e.target)) setSortMenuOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const ensureAuthed = useCallback(() => {
    if (!isAuthed) {
      navigate("/auth/login", { state: { from: "/gallery/eventgallery" } });
      return false;
    }
    return true;
  }, [isAuthed, navigate]);

  const openViewer = useCallback(async (gallery, { syncUrl = true } = {}) => {
    if (!gallery?.galleryId) return;
    if (syncUrl) {
      const next = new URLSearchParams(searchParams);
      next.set("galleryId", String(gallery.galleryId));
      setSearchParams(next);
    }
    setViewer(gallery);
    try {
      const res = await galleryApi.getOne(gallery.galleryId);
      const detail = normalizeGallery(res?.data?.data ?? res?.data ?? gallery);
      setViewer(detail);
      setGalleries((prev) => prev.map((item) => item.galleryId === detail.galleryId ? detail : item));
    } catch (err) {
      console.error("[EventGallery] detail load failed:", err);
    }
  }, [searchParams, setSearchParams]);

  const closeViewer = useCallback(() => {
    userClosedViewerRef.current = true;
    setViewer(null);
    if (!requestedGalleryId) return;
    const next = new URLSearchParams(searchParams);
    next.delete("galleryId");
    setSearchParams(next);
  }, [requestedGalleryId, searchParams, setSearchParams]);

  useEffect(() => {
    const numericGalleryId = Number(requestedGalleryId);
    if (!Number.isFinite(numericGalleryId) || numericGalleryId <= 0) return;
    if (viewer?.galleryId === numericGalleryId) return;
    if (userClosedViewerRef.current) {
      userClosedViewerRef.current = false;
      return;
    }

    let cancelled = false;

    const openRequestedGallery = async () => {
      const cached = galleries.find((item) => item.galleryId === numericGalleryId);
      if (cached) {
        await openViewer(cached, { syncUrl: false });
        return;
      }

      try {
        const res = await galleryApi.getOne(numericGalleryId);
        const detail = normalizeGallery(res?.data?.data ?? res?.data ?? {});
        if (cancelled || !detail?.galleryId) return;
        setViewer(detail);
        setGalleries((prev) => (
          prev.some((item) => item.galleryId === detail.galleryId)
            ? prev.map((item) => item.galleryId === detail.galleryId ? detail : item)
            : [detail, ...prev]
        ));
      } catch (err) {
        console.error("[EventGallery] query open failed:", err);
      }
    };

    openRequestedGallery();

    return () => {
      cancelled = true;
    };
  }, [galleries, openViewer, requestedGalleryId, viewer?.galleryId]);

  const toggleLike = useCallback(async (gallery) => {
    if (!ensureAuthed()) return;
    const liked = !!likedMap[gallery.galleryId];
    try {
      if (liked) await galleryApi.unlike(gallery.galleryId, meUserId);
      else await galleryApi.like(gallery.galleryId, meUserId);
      const nextCount = Math.max(0, gallery.likeCount + (liked ? -1 : 1));
      setLikedMap((prev) => ({ ...prev, [gallery.galleryId]: !liked }));
      setGalleries((prev) => prev.map((item) => item.galleryId === gallery.galleryId ? { ...item, likeCount: nextCount } : item));
      setViewer((prev) => prev?.galleryId === gallery.galleryId ? { ...prev, likeCount: nextCount } : prev);
    } catch (err) {
      console.error("[EventGallery] like toggle failed:", err);
    }
  }, [ensureAuthed, likedMap, meUserId]);

  const handleCreate = useCallback(async () => {
    if (!ensureAuthed()) return;
    if (!writeForm.eventId) return setWriteError("행사를 선택해 주세요.");
    if (!writeForm.title.trim()) return setWriteError("제목을 입력해 주세요.");
    if (!writeForm.files.length) return setWriteError("이미지를 한 장 이상 선택해 주세요.");

    setWriteLoading(true);
    setWriteError("");
    try {
      const uploaded = [];
      for (const file of writeForm.files) {
        const res = await galleryApi.uploadImage(file);
        const publicPath = res?.data?.data?.publicPath ?? res?.data?.publicPath;
        if (publicPath) uploaded.push(publicPath);
      }
      await galleryApi.createByUser({ eventId: Number(writeForm.eventId), title: writeForm.title.trim(), description: writeForm.description.trim(), imageUrls: uploaded });
      setWriteOpen(false);
      setWriteForm({ eventId: selectedEventId || "", title: "", description: "", files: [] });
      await loadGalleries();
    } catch (err) {
      console.error("[EventGallery] create failed:", err);
      setWriteError(err?.response?.data?.message || "갤러리 등록에 실패했습니다.");
    } finally {
      setWriteLoading(false);
    }
  }, [ensureAuthed, loadGalleries, selectedEventId, writeForm]);

  const openEditModal = useCallback((gallery) => {
    if (!gallery?.galleryId) return;
    setEditTarget(gallery);
    setEditError("");
    setEditOpen(true);
  }, []);

  const handleEdit = useCallback(async (payload) => {
    if (!editTarget?.galleryId) return;
    setEditLoading(true);
    setEditError("");
    try {
      await galleryApi.updateOne(editTarget.galleryId, payload);
      setEditOpen(false);
      setEditTarget(null);
      await loadGalleries();
      if (viewer?.galleryId === editTarget.galleryId) {
        setViewer((prev) => prev ? { ...prev, title: payload.title, description: payload.description } : prev);
      }
    } catch (err) {
      console.error("[EventGallery] edit failed:", err);
      setEditError(err?.response?.data?.message || "갤러리 수정에 실패했습니다.");
    } finally {
      setEditLoading(false);
    }
  }, [editTarget, loadGalleries, viewer]);

  const openGalleryReport = useCallback(
    (gallery) => {
      if (!gallery?.galleryId || !ensureAuthed()) return;
      setReportNotice("");
      setReportTarget({
        galleryId: gallery.galleryId,
        title: "갤러리 신고",
        successMessage: "갤러리 신고가 접수되었습니다.",
      });
    },
    [ensureAuthed],
  );

  const submitGalleryReport = useCallback(
    async (payload) => {
      if (!reportTarget?.galleryId) return;
      await reportApi.reportGallery(reportTarget.galleryId, payload);
    },
    [reportTarget],
  );

  return (
    <div style={{ minHeight: "100vh", background: "#f8f9fc", fontFamily: "'Noto Sans KR', sans-serif" }}>
      <style>{galleryStyles}</style>
      <PageHeader title="행사 갤러리" subtitle={"행사에 다녀온 보호자들이 남긴 사진 후기를 모아봤어요"} icon={<Images size={42} color="#90C450" strokeWidth={1.6} />} titleStyle={{ fontSize: 46, lineHeight: "66px", letterSpacing: "-1px" }} subtitleStyle={{ fontSize: 20 }} categories={SERVICE_CATEGORIES} currentPath="/gallery/eventgallery" onNavigate={(path) => navigate(path)} />
      <main
        style={{
          width: isMobile ? "calc(100% - 20px)" : "min(1400px, calc(100% - 40px))",
          margin: "0 auto",
          padding: isMobile ? "20px 0 40px" : "36px 0 64px",
        }}
      >
        <section>
          <div className="eg-toolbar">
            <span className="eg-total">사진 후기{!loading && !error && <em>{totalCount}개</em>}</span>
            <div className="eg-controls">
            <div className={isMobile ? "" : "eg-bar"} style={isMobile ? { display: "flex", flexWrap: "wrap", rowGap: 8 } : undefined}>
              {/* event dropdown */}
              <div style={{ position: "relative", flex: isMobile ? "1 1 100%" : "0 0 auto" }} ref={eventDdRef}>
                <button
                  type="button"
                  onClick={() => setEventDdOpen((v) => !v)}
                  style={{ height: 48, padding: "0 36px 0 14px", border: isMobile ? "1px solid #e2e5ea" : "none", background: isMobile ? "#fff" : "transparent", borderRadius: isMobile ? 12 : 0, color: "#374151", fontSize: 14, fontWeight: 600, cursor: "pointer", textAlign: "left", outline: "none", fontFamily: "inherit", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", minWidth: isMobile ? 0 : 280, width: isMobile ? "100%" : "auto", display: "inline-flex", alignItems: "center", gap: 7 }}
                >
                  <ListFilter size={14} style={{ color: "#9ca3af" }} />
                  {currentEventLabel}
                </button>
                <ChevronDown size={15} style={{ position: "absolute", right: 12, top: "50%", transform: eventDdOpen ? "translateY(-50%) rotate(180deg)" : "translateY(-50%)", color: "#9ca3af", pointerEvents: "none", transition: "transform .15s ease" }} />
                {eventDdOpen && (
                  <div style={{ position: "absolute", top: "calc(100% + 8px)", left: 0, minWidth: 200, background: "#fff", borderRadius: 16, padding: "8px 0", boxShadow: "0 4px 24px rgba(0,0,0,.10)", zIndex: 50, maxHeight: 280, overflowY: "auto" }}>
                    <button
                      type="button"
                      onClick={() => { setSearchParams({}); setEventDdOpen(false); }}
                      style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "11px 16px", border: "none", background: "none", color: !selectedEventId ? "#111827" : "#6b7280", fontSize: 13, fontWeight: !selectedEventId ? 600 : 500, cursor: "pointer", textAlign: "left", fontFamily: "inherit" }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "#f9fafb")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                    >
                      <Search size={14} style={{ color: "#9ca3af", flexShrink: 0 }} />
                      전체 행사
                    </button>
                    {events.map((event) => (
                      <button
                        key={event.eventId}
                        type="button"
                        onClick={() => { setSearchParams({ eventId: String(event.eventId) }); setEventDdOpen(false); }}
                        style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "11px 16px", border: "none", background: "none", color: selectedEventId === String(event.eventId) ? "#111827" : "#6b7280", fontSize: 13, fontWeight: selectedEventId === String(event.eventId) ? 600 : 500, cursor: "pointer", textAlign: "left", fontFamily: "inherit" }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "#f9fafb")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                      >
                        <Search size={14} style={{ color: "#9ca3af", flexShrink: 0 }} />
                        {event.eventName}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {!isMobile && <div className="eg-divider" />}

              {/* search input */}
              <div style={{ position: "relative", flex: isMobile ? "1 1 100%" : "1 1 auto", minWidth: isMobile ? 0 : 280, width: isMobile ? "100%" : "auto" }}>
                <Search size={16} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#9ca3af", pointerEvents: "none" }} />
                <input className="board-search-input" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="갤러리 제목 또는 행사명으로 검색" style={{ width: "100%", height: 48, border: isMobile ? "1px solid #e2e5ea" : "none", background: isMobile ? "#fff" : "transparent", padding: "0 14px 0 40px", borderRadius: isMobile ? 12 : 0, fontSize: 14, fontWeight: 500, color: "#111827", outline: "none" }} />
              </div>

              {!isMobile && <div className="eg-divider" />}

              {/* sort button */}
              <div style={{ position: "relative", flex: isMobile ? "1 1 100%" : "0 0 auto" }} ref={sortDdRef}>
                <button type="button" onClick={() => setSortMenuOpen((prev) => !prev)} style={{ height: 48, padding: "0 36px 0 14px", border: isMobile ? "1px solid #e2e5ea" : "none", background: isMobile ? "#fff" : "transparent", borderRadius: isMobile ? 12 : "0 999px 999px 0", color: "#374151", fontSize: 14, fontWeight: 600, cursor: "pointer", textAlign: "left", outline: "none", fontFamily: "inherit", whiteSpace: "nowrap", minWidth: isMobile ? 0 : 110, width: isMobile ? "100%" : "auto", display: "inline-flex", alignItems: "center", gap: 7 }}><SlidersHorizontal size={14} style={{ color: "#9ca3af" }} />{currentSortLabel}</button>
                <ChevronDown size={15} style={{ position: "absolute", right: 12, top: "50%", transform: sortMenuOpen ? "translateY(-50%) rotate(180deg)" : "translateY(-50%)", color: "#9ca3af", pointerEvents: "none", transition: "transform .15s ease" }} />
                {sortMenuOpen && (
                  <div style={{ position: "absolute", top: "calc(100% + 8px)", left: 0, minWidth: 200, background: "#fff", borderRadius: 16, padding: "8px 0", boxShadow: "0 4px 24px rgba(0,0,0,.10)", zIndex: 50, maxHeight: 280, overflowY: "auto" }}>
                    {SORT_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => { setSortOption(option.value); setSortMenuOpen(false); }}
                        style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "11px 16px", border: "none", background: "none", color: sortOption === option.value ? "#111827" : "#6b7280", fontSize: 13, fontWeight: sortOption === option.value ? 600 : 500, cursor: "pointer", textAlign: "left", fontFamily: "inherit" }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "#f9fafb")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                      >
                        <SlidersHorizontal size={14} style={{ color: "#9ca3af", flexShrink: 0 }} />
                        {option.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {isAuthed ? <button type="button" onClick={() => { setWriteError(""); setWriteForm({ eventId: selectedEventId || "", title: "", description: "", files: [] }); setWriteOpen(true); }} style={{ height: 50, padding: "0 20px", borderRadius: 14, border: "none", background: "#6FA436", color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, fontSize: 15, fontWeight: 800, cursor: "pointer", flexShrink: 0, width: isMobile ? "100%" : "auto", boxShadow: "0 8px 18px rgba(111,164,54,.24)" }}><Plus size={17} /> 사진 올리기</button> : null}
            </div>
          </div>
          {reportNotice ? (
            <div style={{ padding: "16px 0 0" }}>
              <div style={{ padding: "12px 14px", borderRadius: 12, background: "#ecfdf5", border: "1px solid #bbf7d0", color: "#166534", fontSize: 13, fontWeight: 800 }}>
                {reportNotice}
              </div>
            </div>
          ) : null}
          <div>
            {loading ? <PageLoading message="갤러리를 불러오는 중입니다" /> : error ? <EmptyState type="error" message="갤러리를 불러오지 못했습니다" description="네트워크 연결을 확인하고 다시 시도해 주세요." /> : pagedGalleries.length === 0 ? <EmptyState message="조건에 맞는 갤러리가 없습니다" description="행사나 검색어를 바꿔 다시 확인해 주세요" /> : <><div className="eg-grid">{pagedGalleries.map((gallery) => {
  const cover = gallery.imageUrls[0] || "";
  const liked = !!likedMap[gallery.galleryId];
  const evName = eventNameMap[String(gallery.eventId)] || `행사 ${gallery.eventId}`;
  return (
    <article key={gallery.galleryId} className="eg-card" onClick={() => openViewer(gallery)}>
      <div className="eg-thumb">
        {cover ? <img src={cover} alt={gallery.title} loading="lazy" /> : <div className="eg-thumb-empty"><ImageOff size={36} /></div>}
        {gallery.imageUrls.length > 1 && <span className="eg-multi"><Images size={13} />{gallery.imageUrls.length}</span>}
      </div>
      <div className="eg-body">
        <span className="eg-event">{evName}</span>
        <h3 className="eg-title">{gallery.title}</h3>
        {gallery.description && <p className="eg-desc">{gallery.description}</p>}
        <div className="eg-foot">
          <div className="eg-foot-meta">
            <span><Calendar size={13} />{formatDate(gallery.createdAt)}</span>
            <span><Eye size={13} />{gallery.viewCount}</span>
          </div>
          <button type="button" className={`eg-like${liked ? " on" : ""}`} onClick={(e) => { e.stopPropagation(); toggleLike(gallery); }} aria-label="좋아요"><Heart size={15} fill={liked ? "currentColor" : "none"} />{gallery.likeCount}</button>
        </div>
      </div>
    </article>
  );
})}</div><CommunityPagination currentPage={currentPage} totalPages={totalPages} onChange={setPage} /></>}
          </div>
        </section>
      </main>
      <GalleryWriteModal open={writeOpen} events={events} form={writeForm} onChange={(field, value) => setWriteForm((prev) => ({ ...prev, [field]: value }))} onFilesChange={(files) => setWriteForm((prev) => ({ ...prev, files }))} onClose={() => setWriteOpen(false)} onSubmit={handleCreate} loading={writeLoading} error={writeError} />
      <GalleryViewer item={viewer} eventName={eventNameMap[String(viewer?.eventId)] || `행사 ${viewer?.eventId || ""}`} onClose={closeViewer} onToggleLike={() => viewer && toggleLike(viewer)} onReport={() => viewer && openGalleryReport(viewer)} onEdit={() => viewer && openEditModal(viewer)} liked={!!likedMap[viewer?.galleryId]} canEdit={meUserId != null && viewer?.userId === meUserId} isMobile={isMobile} />
      <GalleryEditModal open={editOpen} item={editTarget} onClose={() => { setEditOpen(false); setEditTarget(null); }} onSubmit={handleEdit} loading={editLoading} error={editError} />
      <ReportModal open={Boolean(reportTarget)} title={reportTarget?.title || "신고하기"} onClose={() => setReportTarget(null)} onSubmit={submitGalleryReport} onSuccess={() => setReportNotice(reportTarget?.successMessage || "신고가 접수되었습니다.")} />
    </div>
  );
}




