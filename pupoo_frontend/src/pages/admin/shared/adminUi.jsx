// 관리자 페이지 공통 UI. 페이지마다 복사돼 있던 Toast·Overlay·ConfirmModal·Checkbox·Field·StatCard를 한곳에 모았다.
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, Check, ChevronLeft, Inbox, Pencil, Trash2, X, ImagePlus, Upload, ArrowRight, ChevronDown } from "lucide-react";
import ds, { statusMap } from "./designTokens";

const baseStyles = `
@keyframes adm-fade { from { opacity: 0; } to { opacity: 1; } }
@keyframes adm-rise { from { opacity: 0; transform: translateY(10px) scale(.98); } to { opacity: 1; transform: none; } }
@keyframes adm-toast { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: none; } }
.adm-btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px; border-radius: ${ds.rs}px; font-family: ${ds.ff};
           font-weight: 600; cursor: pointer; white-space: nowrap; transition: background .12s, border-color .12s, color .12s, opacity .12s; }
.adm-btn:disabled { opacity: .5; cursor: default; }
.adm-btn--primary { background: ${ds.brand}; color: #fff; border: 1px solid ${ds.brand}; }
.adm-btn--primary:not(:disabled):hover { background: ${ds.brandDark}; border-color: ${ds.brandDark}; }
.adm-btn--secondary { background: transparent; color: ${ds.ink2}; border: 1px solid ${ds.line}; }
.adm-btn--secondary:not(:disabled):hover { background: ${ds.cardHover}; color: ${ds.ink}; border-color: #3A424C; }
.adm-btn--ghost { background: transparent; color: ${ds.ink3}; border: 1px solid transparent; }
.adm-btn--ghost:not(:disabled):hover { background: ${ds.cardHover}; color: ${ds.ink}; }
.adm-btn--danger { background: ${ds.red}; color: #fff; border: 1px solid ${ds.red}; }
.adm-btn--danger:not(:disabled):hover { filter: brightness(1.08); }
.adm-btn--sm { height: 32px; padding: 0 12px; font-size: 13px; }
.adm-btn--md { height: 40px; padding: 0 16px; font-size: 14px; }
.adm-icon-btn { width: 34px; height: 34px; border-radius: ${ds.rs}px; border: none; background: transparent; color: ${ds.ink3};
                display: inline-flex; align-items: center; justify-content: center; cursor: pointer; transition: background .12s, color .12s; }
.adm-icon-btn:hover { background: ${ds.cardHover}; color: ${ds.ink}; }
.adm-icon-btn--danger:hover { background: ${ds.red}; color: #fff; }
/* 등록 페이지 입력 배치: 짧은 항목은 두 칸, 긴 항목(글 입력·파일·안내·체크 묶음)은 한 줄 전체 */
.adm-form-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); column-gap: 24px; align-items: start; }
.adm-form-grid > * { min-width: 0; }
.adm-form-grid > :has(textarea),
.adm-form-grid > :has(input[type=file]),
.adm-form-grid > :has(img),
.adm-form-grid > :not(:has(input, select, textarea)),
.adm-form-grid > .adm-full,
.adm-form-grid > [style*="grid-template-columns"] { grid-column: 1 / -1; }
/* 입력칸이 없는 항목(별점 등)도 반 칸에 두고 싶을 때 */
.adm-form-grid > .adm-half { grid-column: auto; }
@media (max-width: 900px) { .adm-form-grid { grid-template-columns: 1fr; } }
/* 비율로 크기를 잡는 이미지 업로드 상자가 넓은 페이지에서 과하게 커지지 않게 한다 */
.adm-sheet-body [style*="aspect-ratio"] { max-height: 220px; }
@keyframes adm-sheet-in { from { transform: translateX(24px); opacity: 0; } to { transform: none; opacity: 1; } }
/* 뒤로가기(목록으로) 버튼: 어두운 화면에서 잘 보이도록 흰색으로 둔다 */
.adm-back-btn { display: inline-flex; align-items: center; gap: 6px; height: 36px; padding: 0 14px 0 10px; border: none;
  border-radius: ${ds.rs}px; background: #FFFFFF; color: #181C20; font-size: 14px; font-weight: 700; font-family: ${ds.ff};
  cursor: pointer; white-space: nowrap; transition: background .15s, transform .15s; }
.adm-back-btn:hover { background: #E4E8EE; transform: translateX(-2px); }
.adm-back-btn:focus-visible { outline: 2px solid ${ds.brand}; outline-offset: 2px; }
.adm-sheet-body { color: ${ds.ink}; }
/* 입력 폼 안의 기본 체크박스·날짜 달력·드롭다운을 어두운 테마로, 화살표 모양을 하나로 맞춘다 */
.adm-sheet-body { color-scheme: dark; }
.adm-sheet-body input[type=checkbox], .adm-sheet-body input[type=radio] { accent-color: ${ds.brand}; }
.adm-sheet-body select:not([style*="appearance"]),
#admin-content-frame select:not([style*="appearance"]) { appearance: none; -webkit-appearance: none; padding-right: 38px !important;
  background-image: url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236E7781' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\") !important; background-repeat: no-repeat !important; background-position: right 14px center !important; }
#admin-content-frame select option { background: ${ds.card}; color: ${ds.ink}; }
.adm-sheet-body input:not([type=checkbox]):not([type=radio]):not([type=file]):not([type=range]):not([type=color]),
.adm-sheet-body select,
.adm-sheet-body textarea {
  background-color: ${ds.bg} !important; border: 1px solid rgba(255,255,255,0.10) !important; border-radius: ${ds.rs}px !important;
  color: ${ds.ink} !important; font-size: 14px !important; font-weight: 400 !important; font-family: ${ds.ff} !important; box-shadow: none !important; outline: none;
}
.adm-sheet-body input:not([type=checkbox]):not([type=radio]):not([type=file]):not([type=range]):not([type=color]),
.adm-sheet-body select { min-height: 40px; }
.adm-sheet-body textarea { line-height: 1.6 !important; }
.adm-sheet-body input::placeholder, .adm-sheet-body textarea::placeholder { color: ${ds.ink4} !important; }
.adm-sheet-body input:focus, .adm-sheet-body select:focus, .adm-sheet-body textarea:focus {
  border-color: ${ds.brand} !important; box-shadow: 0 0 0 3px rgba(4,89,247,0.20) !important;
}
.adm-sheet-body select option { background: ${ds.card}; color: ${ds.ink}; }
.adm-sheet-foot button { flex: 0 0 auto !important; width: auto !important; min-width: 96px; height: 40px !important; padding: 0 18px !important;
  border-radius: ${ds.rs}px !important; font-size: 14px !important; font-weight: 600 !important; display: inline-flex !important;
  align-items: center; justify-content: center; gap: 6px; }
/* ── 문서형(노션식) 등록 화면 ── */
.adm-doc-cover { position: relative; height: 200px; border-radius: 14px; overflow: hidden; background: ${ds.card};
  border: 1px dashed #3A424C; display: flex; align-items: center; justify-content: center; }
.adm-doc-cover:has(img) { height: 300px; border-style: solid; border-color: ${ds.line}; background: #0E1114; }
.adm-doc-cover-blur { position: absolute; inset: -40px; background-size: cover; background-position: center; filter: blur(28px) brightness(.45); }
.adm-doc-cover-empty { display: flex; flex-direction: column; align-items: center; gap: 6px; text-align: center; padding: 16px; }
.adm-doc-cover-actions { position: absolute; right: 12px; bottom: 12px; display: flex; gap: 6px; opacity: 0; transition: opacity .15s; }
.adm-doc-cover:hover .adm-doc-cover-actions, .adm-doc-cover:focus-within .adm-doc-cover-actions { opacity: 1; }
.adm-doc-ai { margin-top: 10px; display: flex; align-items: center; gap: 10px; padding: 8px 8px 8px 14px; border-radius: 10px;
  background: ${ds.card}; border: 1px solid ${ds.line}; }
.adm-sheet-body input.adm-doc-title:not([type=checkbox]):not([type=radio]):not([type=file]):not([type=range]):not([type=color]) {
  display: block; width: 100%; margin: 28px 0 12px; padding: 0 !important; min-height: 0; height: auto;
  background: transparent !important; border: none !important; box-shadow: none !important;
  font-size: 34px !important; font-weight: 700 !important; letter-spacing: -0.6px; line-height: 1.25; color: ${ds.ink} !important; }
.adm-sheet-body input.adm-doc-title::placeholder { color: #4A525C !important; }
.adm-doc-props { display: grid; gap: 2px; padding-bottom: 16px; border-bottom: 1px solid ${ds.line}; }
.adm-doc-prop { display: grid; grid-template-columns: 132px minmax(0, 1fr); align-items: center; min-height: 44px; }
.adm-doc-prop-label { display: flex; align-items: center; gap: 8px; font-size: 14px; color: ${ds.ink3}; }
.adm-doc-prop-value { min-width: 0; }
.adm-sheet-body input.adm-doc-inline:not([type=checkbox]):not([type=radio]):not([type=file]):not([type=range]):not([type=color]) {
  width: 100%; min-height: 36px; height: 36px; padding: 0 10px !important; border-radius: 8px !important;
  background: transparent !important; border: 1px solid transparent !important; box-shadow: none !important;
  font-size: 14.5px !important; color: ${ds.ink} !important; transition: background .12s, border-color .12s; }
.adm-sheet-body input.adm-doc-inline:not([type=checkbox]):not([type=radio]):not([type=file]):not([type=range]):not([type=color]):hover {
  background: ${ds.cardHover} !important; }
.adm-sheet-body input.adm-doc-inline:not([type=checkbox]):not([type=radio]):not([type=file]):not([type=range]):not([type=color]):focus {
  background: ${ds.card} !important; border-color: ${ds.brand} !important; }
.adm-sheet-body input.adm-doc-date:not([type=checkbox]):not([type=radio]):not([type=file]):not([type=range]):not([type=color]) { width: 150px; cursor: pointer; }
.adm-sheet-body textarea.adm-doc-body { display: block; width: 100%; margin-top: 20px; min-height: 240px; padding: 4px 0 !important; resize: vertical;
  background: transparent !important; border: none !important; box-shadow: none !important; font-size: 15px !important; line-height: 1.75 !important; }
@media (max-width: 640px) { .adm-doc-prop { grid-template-columns: 1fr; gap: 4px; padding: 6px 0; } .adm-doc-cover { height: 220px; } }
.adm-sheet-body select.adm-doc-inline { width: 100%; min-height: 36px; height: 36px; padding-left: 10px !important; border-radius: 8px !important;
  background-color: transparent !important; border: 1px solid transparent !important; font-size: 14.5px !important; cursor: pointer; }
.adm-sheet-body select.adm-doc-inline:hover { background-color: ${ds.cardHover} !important; }
.adm-sheet-body select.adm-doc-inline:focus { background-color: ${ds.card} !important; border-color: ${ds.brand} !important; }
`;

// 공통 스타일은 모듈을 처음 불러올 때 한 번만 문서에 넣는다.
if (typeof document !== "undefined" && !document.getElementById("adm-ui-styles")) {
  const el = document.createElement("style");
  el.id = "adm-ui-styles";
  el.textContent = baseStyles;
  document.head.appendChild(el);
}

/** 버튼: variant = primary | secondary | ghost | danger, size = sm | md */
export function Button({ variant = "secondary", size = "md", icon: Icon, children, className = "", style, ...rest }) {
  return (
    <button type="button" className={`adm-btn adm-btn--${variant} adm-btn--${size} ${className}`} style={style} {...rest}>
      {Icon ? <Icon size={size === "sm" ? 15 : 16} strokeWidth={2} /> : null}
      {children}
    </button>
  );
}

/** 아이콘만 있는 버튼 (보기·수정·삭제 등). 반드시 label을 넘겨 툴팁·스크린리더 이름으로 쓴다. */
export function IconButton({ icon: Icon, label, danger = false, size = 16, style, ...rest }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      className={`adm-icon-btn${danger ? " adm-icon-btn--danger" : ""}`}
      style={style}
      {...rest}
    >
      <Icon size={size} />
    </button>
  );
}

/** 섹션 카드: 제목·설명·우측 액션이 있는 기본 패널 */
export function Card({ title, description, actions, children, padding = 20, style }) {
  return (
    <section
      style={{
        background: ds.card,
        border: `1px solid ${ds.line}`,
        borderRadius: ds.r,
        minWidth: 0,
        ...style,
      }}
    >
      {title || actions ? (
        <header
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            padding: `16px ${padding}px`,
            borderBottom: `1px solid ${ds.line}`,
          }}
        >
          <div style={{ minWidth: 0 }}>
            {title ? <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: ds.ink }}>{title}</h2> : null}
            {description ? <p style={{ margin: "4px 0 0", fontSize: 13, color: ds.ink3 }}>{description}</p> : null}
          </div>
          {actions ? <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>{actions}</div> : null}
        </header>
      ) : null}
      <div style={{ padding }}>{children}</div>
    </section>
  );
}

export function Toast({ msg, type = "success", onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2400);
    return () => clearTimeout(t);
  }, [onDone]);
  const tone = type === "success" ? ds.green : type === "error" ? ds.red : ds.amber;
  const Icon = type === "success" ? Check : type === "error" ? X : AlertTriangle;
  return (
    <div
      role="status"
      style={{
        position: "fixed",
        top: 20,
        right: 24,
        zIndex: 12000,
        display: "flex",
        alignItems: "center",
        gap: 10,
        maxWidth: "min(420px, calc(100vw - 32px))",
        padding: "12px 16px 12px 12px",
        borderRadius: 12,
        background: "#2A3038",
        border: `1px solid ${ds.line}`,
        color: ds.ink,
        fontSize: 14,
        fontWeight: 500,
        fontFamily: ds.ff,
        boxShadow: ds.sh2,
        animation: "adm-toast .2s ease-out",
      }}
    >
      <span
        style={{
          width: 24,
          height: 24,
          borderRadius: "50%",
          background: tone,
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <Icon size={14} strokeWidth={3} />
      </span>
      {msg}
    </div>
  );
}

/** 모달 바탕: 배경 클릭·ESC로 닫힌다. wide면 넓은 폼/상세용 */
export function Overlay({ children, onClose, wide = false, width }) {
  useEffect(() => {
    if (!onClose) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10020,
        background: "rgba(8,10,12,0.66)",
        backdropFilter: "blur(2px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        animation: "adm-fade .15s ease",
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: ds.card,
          border: `1px solid ${ds.line}`,
          borderRadius: 16,
          width: width || (wide ? 720 : 520),
          maxWidth: "100%",
          maxHeight: "88vh",
          overflow: "auto",
          boxShadow: ds.sh3,
          color: ds.ink,
          fontFamily: ds.ff,
          animation: "adm-rise .2s ease-out",
        }}
      >
        {children}
      </div>
    </div>
  );
}

/** 모달 머리: 제목 + 설명 + 닫기 */
export function ModalHeader({ title, description, onClose }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 12,
        padding: "20px 20px 16px 24px",
        borderBottom: `1px solid ${ds.line}`,
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: ds.ink }}>{title}</h3>
        {description ? <p style={{ margin: "4px 0 0", fontSize: 13.5, color: ds.ink3 }}>{description}</p> : null}
      </div>
      {onClose ? <IconButton icon={X} label="닫기" onClick={onClose} size={18} /> : null}
    </div>
  );
}

/** 모달 바닥: 오른쪽 정렬 버튼 영역 */
export function ModalFooter({ children }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "flex-end",
        gap: 8,
        padding: "16px 24px 20px",
        borderTop: `1px solid ${ds.line}`,
      }}
    >
      {children}
    </div>
  );
}

/** 확인 모달. 기본은 삭제(빨간 버튼)이고, danger={false}면 주조색 확인 버튼이다. */
export function ConfirmModal({
  title,
  msg,
  onConfirm,
  onCancel,
  loading = false,
  danger = true,
  label,
  confirmLabel,
  confirmColor,
}) {
  const text = confirmLabel || label || (danger ? "삭제" : "확인");
  return (
    <Overlay onClose={loading ? undefined : onCancel} width={440}>
      <div style={{ padding: "24px 24px 20px" }}>
        {danger ? (
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: "50%",
              background: ds.redSoft,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 16,
            }}
          >
            <AlertTriangle size={20} color={ds.red} />
          </div>
        ) : null}
        <h3 style={{ margin: "0 0 8px", fontSize: 18, fontWeight: 700, color: ds.ink }}>{title}</h3>
        <p style={{ margin: 0, fontSize: 14, color: ds.ink3, lineHeight: 1.65, whiteSpace: "pre-line" }}>{msg}</p>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 24 }}>
          <Button variant="secondary" onClick={onCancel} disabled={loading}>
            취소
          </Button>
          <Button
            variant={danger ? "danger" : "primary"}
            onClick={onConfirm}
            disabled={loading}
            style={confirmColor ? { background: confirmColor, borderColor: confirmColor } : undefined}
          >
            {loading ? "처리 중..." : text}
          </Button>
        </div>
      </div>
    </Overlay>
  );
}

export function Checkbox({ checked, onChange, size = 18 }) {
  return (
    <div
      role="checkbox"
      aria-checked={!!checked}
      tabIndex={0}
      onClick={(e) => {
        e.stopPropagation();
        onChange?.();
      }}
      onKeyDown={(e) => {
        if (e.key === " " || e.key === "Enter") {
          e.preventDefault();
          e.stopPropagation();
          onChange?.();
        }
      }}
      style={{
        width: size,
        height: size,
        borderRadius: 5,
        border: checked ? `1.5px solid ${ds.brand}` : `1.5px solid ${ds.ink4}`,
        background: checked ? ds.brand : "transparent",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        transition: "all .12s ease",
        flexShrink: 0,
      }}
    >
      {checked && <Check size={size - 6} color="#fff" strokeWidth={3} />}
    </div>
  );
}

export function Field({ label, children, required, full = false, half = false }) {
  return (
    <div className={full ? "adm-full" : half ? "adm-half" : undefined} style={{ marginBottom: 18 }}>
      <label style={{ display: "block", marginBottom: 8, fontSize: 13, fontWeight: 600, color: ds.ink2 }}>
        {label}
        {required && <span style={{ color: ds.red, marginLeft: 3 }}>*</span>}
      </label>
      {children}
    </div>
  );
}

/** 입력칸 공통 스타일 (input·select·textarea에 style={inputStyle}) */
export const inputStyle = {
  width: "100%",
  boxSizing: "border-box",
  height: 40,
  padding: "0 12px",
  borderRadius: ds.rs,
  border: `1px solid ${ds.line}`,
  background: ds.bg,
  color: ds.ink,
  fontSize: 14,
  fontFamily: ds.ff,
  outline: "none",
};

/** 요약 수치 카드. icon·sub·hint는 선택 */
// icon·color는 예전 호출과의 호환을 위해 받기만 하고 그리지 않는다(장식 줄이기).
export function StatCard({ label, value, sub, hint, mobile = false }) {
  const note = sub ?? hint;
  return (
    <div
      style={{
        background: ds.card,
        border: `1px solid ${ds.line}`,
        borderRadius: ds.r,
        padding: mobile ? "16px" : "18px 20px",
        minWidth: 0,
      }}
    >
      <div style={{ fontSize: 13.5, fontWeight: 500, color: ds.ink3, wordBreak: "keep-all" }}>{label}</div>
      <div
        style={{
          marginTop: 10,
          fontSize: mobile ? 22 : 26,
          fontWeight: 700,
          color: ds.ink,
          letterSpacing: -0.5,
          lineHeight: 1.15,
          wordBreak: "keep-all",
        }}
      >
        {value}
      </div>
      {note != null && note !== "" ? (
        <div style={{ marginTop: 6, fontSize: 12.5, color: ds.ink4, wordBreak: "keep-all" }}>{note}</div>
      ) : null}
    </div>
  );
}

/** 상태 뱃지: statusMap 키(active·pending·ended…)나 { l, c, bg }를 받는다 */
export function StatusBadge({ status, tone }) {
  const st = tone || statusMap[status] || statusMap.pending;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        height: 24,
        padding: "0 9px",
        borderRadius: 6,
        background: st.bg,
        color: st.c,
        fontSize: 12.5,
        fontWeight: 600,
        whiteSpace: "nowrap",
      }}
    >
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: st.c }} />
      {st.l}
    </span>
  );
}

/** 상세 정보 목록: [{ label, value }] 를 라벨-값 두 칸으로 보여준다 */
export function InfoList({ items }) {
  const rows = items.filter((r) => r && r.value != null && r.value !== "");
  return (
    <dl style={{ margin: 0, display: "grid", gridTemplateColumns: "110px minmax(0, 1fr)", rowGap: 0 }}>
      {rows.map((r, i) => (
        <div key={r.label} style={{ display: "contents" }}>
          <dt
            style={{
              padding: "12px 0",
              fontSize: 13.5,
              color: ds.ink3,
              borderTop: i ? `1px solid ${ds.line}` : "none",
            }}
          >
            {r.label}
          </dt>
          <dd
            style={{
              margin: 0,
              padding: "12px 0",
              fontSize: 14,
              color: ds.ink,
              fontWeight: 500,
              lineHeight: 1.6,
              wordBreak: "keep-all",
              whiteSpace: "pre-line",
              borderTop: i ? `1px solid ${ds.line}` : "none",
            }}
          >
            {r.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * 공통 상세 팝업: 머리(종류·닫기) → 제목·뱃지 → 정보 목록 → 본문 → 하단(삭제 | 닫기·수정)
 * items: [{ label, value }], content: 본문 텍스트(선택), children: 추가 영역(선택)
 */
export function DetailDialog({ kind, title, badges, items = [], content, children, onClose, onEdit, onDelete, width = 560 }) {
  return (
    <Overlay onClose={onClose} width={width}>
      <ModalHeader title={kind} onClose={onClose} />
      <div style={{ padding: "20px 24px 8px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
          <h4 style={{ margin: 0, fontSize: 19, fontWeight: 700, color: ds.ink, wordBreak: "keep-all" }}>{title}</h4>
          {badges}
        </div>
        {items.length ? <InfoList items={items} /> : null}
        {content ? (
          <div style={{ marginTop: 12, paddingTop: 14, borderTop: `1px solid ${ds.line}` }}>
            <div style={{ fontSize: 13.5, color: ds.ink3, marginBottom: 8 }}>내용</div>
            <p style={{ margin: 0, fontSize: 14.5, color: ds.ink, lineHeight: 1.7, whiteSpace: "pre-wrap", wordBreak: "keep-all" }}>{content}</p>
          </div>
        ) : null}
        {children}
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          marginTop: 12,
          padding: "16px 24px 20px",
          borderTop: `1px solid ${ds.line}`,
        }}
      >
        {onDelete ? (
          <Button
            variant="ghost"
            icon={Trash2}
            style={{ color: ds.red }}
            onClick={() => {
              onClose?.();
              onDelete();
            }}
          >
            삭제
          </Button>
        ) : (
          <span />
        )}
        <div style={{ display: "flex", gap: 8 }}>
          <Button variant="secondary" onClick={onClose}>
            닫기
          </Button>
          {onEdit ? (
            <Button
              variant="primary"
              icon={Pencil}
              onClick={() => {
                onClose?.();
                onEdit();
              }}
            >
              수정하기
            </Button>
          ) : null}
        </div>
      </div>
    </Overlay>
  );
}

/** 작은 표시 뱃지 (고정·공개 여부 등) */
export function Tag({ children, tone = "brand" }) {
  const map = {
    brand: [ds.brandSoft, ds.brandText],
    neutral: [ds.lineSoft, ds.ink2],
    green: [ds.greenSoft, ds.green],
    amber: [ds.amberSoft, ds.amber],
    red: [ds.redSoft, ds.red],
  };
  const [bg, fg] = map[tone] || map.brand;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        height: 22,
        padding: "0 8px",
        borderRadius: 6,
        background: bg,
        color: fg,
        fontSize: 12,
        fontWeight: 600,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}

/**
 * 빈 상태 안내: 옅은 원 안의 아이콘 + 제목 + 설명 + (선택) 이동 버튼.
 * compact는 카드 안 작은 영역용(여백·아이콘 축소).
 */
export function EmptyState({ icon: Icon = Inbox, title, description, action, compact = false, style }) {
  const size = compact ? 44 : 56;
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: compact ? "32px 16px" : "56px 20px",
        ...style,
      }}
    >
      <div
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          background: ds.lineSoft,
          border: `1px solid ${ds.line}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: compact ? 12 : 16,
        }}
      >
        <Icon size={compact ? 20 : 24} color={ds.ink3} strokeWidth={1.8} />
      </div>
      <div style={{ fontSize: compact ? 14.5 : 15.5, fontWeight: 600, color: ds.ink2 }}>{title}</div>
      {description ? (
        <div style={{ marginTop: 6, fontSize: 13.5, color: ds.ink4, lineHeight: 1.6, wordBreak: "keep-all" }}>{description}</div>
      ) : null}
      {action ? (
        <Button variant="secondary" size="sm" style={{ marginTop: 16 }} onClick={action.onClick}>
          {action.label}
        </Button>
      ) : null}
    </div>
  );
}

/** 다른 관리 메뉴(와 그 안의 탭)로 이동한다. Dashboard.jsx가 이 이벤트를 받아 메뉴를 바꾼다. */
export function goToAdminPage(page, tab = null) {
  try {
    sessionStorage.setItem("pupoo_admin_dashboard_target", page);
  } catch {
    // 저장소를 못 써도 이벤트로 이동은 동작한다.
  }
  window.dispatchEvent(new CustomEvent("pupoo-admin-dashboard-target", { detail: { page, tab } }));
}

/**
 * 등록·수정 페이지. 목록이 있던 본문 자리(#admin-content-frame)를 덮어 별도 페이지처럼 보인다.
 * 위: 목록으로 돌아가기 + 제목 / 가운데: 입력 영역 / 아래: 고정된 취소·저장 버튼.
 * 안의 input·select·textarea·하단 버튼은 공통 스타일로 통일된다(.adm-sheet-*).
 */
export function FormSheet({ title, description, onClose, footer, width = 1040, backLabel = "목록으로", grid = true, bare = false, children }) {
  const [frame, setFrame] = useState(null);
  // 문서형(bare)은 읽기 좋은 폭을 그대로 쓰고, 일반 폼은 넓은 화면에 맞춰 최소 1040px로 둔다.
  const pageWidth = bare ? width : Math.max(width, 1040);

  useEffect(() => {
    setFrame(document.getElementById("admin-content-frame"));
    // 입력하는 동안 AI 비서 버튼이 저장 버튼을 가리지 않도록 숨긴다.
    document.body.dataset.adminFormOpen = "1";
    return () => {
      delete document.body.dataset.adminFormOpen;
    };
  }, []);

  useEffect(() => {
    if (!onClose) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const page = (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={typeof title === "string" ? title : undefined}
      style={{
        position: frame ? "absolute" : "fixed",
        inset: 0,
        zIndex: frame ? 30 : 10011,
        display: "flex",
        flexDirection: "column",
        background: ds.bg,
        color: ds.ink,
        fontFamily: ds.ff,
        animation: "adm-fade .15s ease",
      }}
    >
      <div className="adm-sheet-body" style={{ flex: 1, overflowY: "auto" }}>
        <div style={{ maxWidth: pageWidth, margin: "0 auto", padding: "24px 32px 40px" }}>
          <button type="button" onClick={onClose} className="adm-back-btn">
            <ChevronLeft size={18} />
            {backLabel}
          </button>
          {bare ? (
            // 문서형 화면: 제목·카드 없이 내용이 곧 페이지가 된다.
            <>
              <div style={{ marginTop: 18, marginBottom: 12, fontSize: 13, fontWeight: 600, color: ds.ink4 }}>{title}</div>
              {children}
            </>
          ) : (
            <>
              <h2 style={{ margin: "18px 0 0", fontSize: 24, fontWeight: 700, letterSpacing: -0.4, color: ds.ink }}>{title}</h2>
              {description ? <p style={{ margin: "6px 0 0", fontSize: 14.5, color: ds.ink3 }}>{description}</p> : null}
              <div
                style={{
                  marginTop: 24,
                  padding: "28px 28px 8px",
                  background: ds.card,
                  border: `1px solid ${ds.line}`,
                  borderRadius: ds.r,
                }}
              >
                <div className={grid ? "adm-form-grid" : undefined}>{children}</div>
              </div>
            </>
          )}
        </div>
      </div>
      {footer ? (
        <footer
          className="adm-sheet-foot"
          style={{
            flexShrink: 0,
            height: 64,
            boxSizing: "border-box",
            borderTop: `1px solid ${ds.lineD}`,
            background: ds.card,
          }}
        >
          <div
            style={{
              maxWidth: pageWidth,
              margin: "0 auto",
              height: "100%",
              padding: "0 32px",
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
              gap: 8,
            }}
          >
            {footer}
          </div>
        </footer>
      ) : null}
    </div>
  );

  return frame ? createPortal(page, frame) : page;
}

/** 편집 패널 안의 항목 묶음 (제목 + 설명 + 내용) */
export function FormSection({ title, description, children }) {
  return (
    <section style={{ paddingBottom: 24, marginBottom: 24, borderBottom: `1px solid ${ds.line}` }}>
      <h3 style={{ margin: "0 0 4px", fontSize: 15, fontWeight: 700, color: ds.ink }}>{title}</h3>
      {description ? <p style={{ margin: "0 0 16px", fontSize: 13, color: ds.ink4 }}>{description}</p> : <div style={{ height: 12 }} />}
      {children}
    </section>
  );
}

/** 문서형 등록 화면의 속성 한 줄 (아이콘·이름 | 값) */
export function DocProp({ icon: Icon, label, required, children }) {
  return (
    <div className="adm-doc-prop">
      <div className="adm-doc-prop-label">
        {Icon ? <Icon size={15} /> : null}
        {label}
        {required ? <span style={{ color: ds.red }}>*</span> : null}
      </div>
      <div className="adm-doc-prop-value">{children}</div>
    </div>
  );
}

/**
 * 라디오 선택 카드 (이름 + 한 줄 설명). 선택되면 파란 테두리·채운 원으로 표시한다(반투명 바탕 없음).
 * options: [{ id, label, desc }]
 */
export function ChoiceCards({ options, value, onChange, label, minWidth = 200 }) {
  return (
    <div role="radiogroup" aria-label={label} style={{ display: "grid", gridTemplateColumns: `repeat(auto-fit, minmax(${minWidth}px, 1fr))`, gap: 10 }}>
      {options.map((choice) => {
        const on = value === choice.id;
        return (
          <button
            key={choice.id}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(choice.id)}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 12,
              padding: "14px 16px",
              borderRadius: 10,
              border: `1.5px solid ${on ? ds.brand : ds.line}`,
              background: ds.bg,
              cursor: "pointer",
              textAlign: "left",
              fontFamily: ds.ff,
              transition: "border-color .15s",
            }}
          >
            <span
              aria-hidden="true"
              style={{
                width: 18,
                height: 18,
                marginTop: 1,
                borderRadius: "50%",
                border: `2px solid ${on ? ds.brand : ds.ink4}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              {on ? <span style={{ width: 8, height: 8, borderRadius: "50%", background: ds.brand }} /> : null}
            </span>
            <span style={{ minWidth: 0 }}>
              <span style={{ display: "block", fontSize: 14.5, fontWeight: 600, color: ds.ink }}>{choice.label}</span>
              {choice.desc ? (
                <span style={{ display: "block", marginTop: 3, fontSize: 12.5, color: ds.ink4, lineHeight: 1.5 }}>{choice.desc}</span>
              ) : null}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/**
 * 문서형 등록 화면의 커버 이미지 영역. 클릭·끌어다 놓기로 이미지를 고르고, 있으면 흐린 배경 위에 원본 비율로 보여준다.
 * onFile(file, dataUrl): 올바른 이미지를 골랐을 때, onError(message): 형식·용량이 맞지 않을 때
 */
export function DocCover({
  preview,
  onFile,
  onRemove,
  onError,
  emptyTitle = "이미지를 추가하세요",
  emptyHint = "클릭하거나 이미지를 끌어다 놓으세요 · JPG·PNG·WEBP, 10MB 이하",
  loading = false,
  loadingText = "이미지를 불러오는 중이에요",
  children,
}) {
  const fileRef = useRef(null);
  const [over, setOver] = useState(false);
  const [broken, setBroken] = useState(false);
  useEffect(() => setBroken(false), [preview]);
  const pick = (file) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      onError?.("이미지 파일만 올릴 수 있어요. (JPG, PNG, WEBP)");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      onError?.("10MB 이하 이미지만 올릴 수 있어요.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => onFile?.(file, e.target.result);
    reader.readAsDataURL(file);
  };
  const btn = {
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
    <>
      <div
        className="adm-doc-cover"
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          pick(e.dataTransfer.files?.[0]);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        style={{ borderColor: over ? ds.brand : undefined }}
      >
        {loading ? (
          <div className="adm-doc-cover-empty">
            <div style={{ width: 28, height: 28, borderRadius: "50%", border: `2.5px solid ${ds.line}`, borderTopColor: ds.brand, animation: "spin .9s linear infinite" }} />
            <div style={{ fontSize: 14, fontWeight: 600, color: ds.ink2 }}>{loadingText}</div>
          </div>
        ) : preview && !broken ? (
          <>
            <div aria-hidden="true" className="adm-doc-cover-blur" style={{ backgroundImage: `url("${preview}")` }} />
            <img
              src={preview}
              alt="대표 이미지"
              data-no-fallback="1"
              onError={() => setBroken(true)}
              style={{ position: "relative", height: "100%", maxWidth: "100%", objectFit: "contain", display: "block", margin: "0 auto" }}
            />
            <div className="adm-doc-cover-actions">
              <button type="button" style={btn} onClick={() => fileRef.current?.click()}>
                <Upload size={14} /> 변경
              </button>
              {onRemove ? (
                <button type="button" style={{ ...btn, background: ds.red, color: "#fff" }} onClick={onRemove} aria-label="이미지 삭제">
                  <Trash2 size={14} />
                </button>
              ) : null}
            </div>
          </>
        ) : (
          <div className="adm-doc-cover-empty">
            <ImagePlus size={24} color={over ? ds.brandText : ds.ink4} />
            <div style={{ fontSize: 14, fontWeight: 600, color: ds.ink2 }}>{broken ? "저장된 이미지를 불러올 수 없어요" : emptyTitle}</div>
            <div style={{ fontSize: 12.5, color: ds.ink4 }}>{broken ? "새 이미지를 올려 바꿀 수 있어요" : emptyHint}</div>
            <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
              <button type="button" style={btn} onClick={() => fileRef.current?.click()}>
                <Upload size={14} /> 이미지 올리기
              </button>
              {children}
            </div>
          </div>
        )}
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={(e) => {
          pick(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
    </>
  );
}

/** 문서형 등록 화면의 일정 입력 (YYYY-MM-DD 시작 → 종료 · N일간). 시작이 종료보다 늦어지면 종료를 함께 옮긴다. */
export function DocDateRange({ start, end, onStart, onEnd }) {
  const days = start && end ? Math.round((new Date(end) - new Date(start)) / 86400000) + 1 : 0;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
      <input
        type="date"
        className="adm-doc-inline adm-doc-date"
        aria-label="시작일"
        value={start || ""}
        onChange={(e) => {
          const v = e.target.value;
          onStart(v);
          if (v && end && v > end) onEnd(v);
        }}
      />
      <ArrowRight size={14} color={ds.ink4} />
      <input
        type="date"
        className="adm-doc-inline adm-doc-date"
        aria-label="종료일"
        min={start || undefined}
        value={end || ""}
        onChange={(e) => onEnd(e.target.value)}
      />
      <span style={{ fontSize: 13, color: ds.ink3 }}>
        {days > 0 ? `${days}일간` : start || end ? "" : "날짜를 고르면 기간이 표시돼요"}
      </span>
    </div>
  );
}

/**
 * 설명이 붙은 선택 상자. 누르면 아래로 목록이 펼쳐지고, 항목마다 이름과 한 줄 설명을 보여준다.
 * options: [{ value, label, desc }]
 */
export function SelectMenu({ options, value, onChange, placeholder = "선택하세요", ariaLabel, emptyText = "선택할 항목이 없어요" }) {
  const [open, setOpen] = useState(false);
  const boxRef = useRef(null);
  const selected = options.find((o) => String(o.value) === String(value));

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey, true);
    };
  }, [open]);

  return (
    <div ref={boxRef} style={{ position: "relative" }}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => setOpen((v) => !v)}
        style={{
          width: "100%",
          minHeight: 48,
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "8px 14px",
          borderRadius: ds.rs,
          border: `1px solid ${open ? ds.brand : "rgba(255,255,255,0.10)"}`,
          background: ds.bg,
          color: ds.ink,
          fontFamily: ds.ff,
          textAlign: "left",
          cursor: "pointer",
        }}
      >
        <span style={{ flex: 1, minWidth: 0 }}>
          {selected ? (
            <>
              <span style={{ display: "block", fontSize: 14.5, fontWeight: 600, color: ds.ink }}>{selected.label}</span>
              {selected.desc ? <span style={{ display: "block", marginTop: 2, fontSize: 12.5, color: ds.ink4 }}>{selected.desc}</span> : null}
            </>
          ) : (
            <span style={{ fontSize: 14, color: ds.ink4 }}>{options.length ? placeholder : emptyText}</span>
          )}
        </span>
        <ChevronDown size={16} color={ds.ink4} style={{ flexShrink: 0, transform: open ? "rotate(180deg)" : "none", transition: "transform .15s" }} />
      </button>

      {open && (
        <div
          role="listbox"
          aria-label={ariaLabel}
          style={{
            position: "absolute",
            zIndex: 40,
            top: "calc(100% + 6px)",
            left: 0,
            right: 0,
            maxHeight: 320,
            overflowY: "auto",
            padding: 6,
            borderRadius: 10,
            background: ds.card,
            border: `1px solid ${ds.line}`,
            boxShadow: ds.sh3,
          }}
        >
          {options.length === 0 ? (
            <div style={{ padding: "12px 10px", fontSize: 13.5, color: ds.ink4 }}>{emptyText}</div>
          ) : (
            options.map((o) => {
              const on = String(o.value) === String(value);
              return (
                <button
                  key={o.value}
                  type="button"
                  role="option"
                  aria-selected={on}
                  onClick={() => {
                    onChange(o.value);
                    setOpen(false);
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = ds.cardHover)}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "10px 10px",
                    border: "none",
                    borderRadius: 8,
                    background: "transparent",
                    color: ds.ink,
                    fontFamily: ds.ff,
                    textAlign: "left",
                    cursor: "pointer",
                  }}
                >
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: "block", fontSize: 14, fontWeight: on ? 700 : 500, color: on ? ds.brandText : ds.ink }}>{o.label}</span>
                    {o.desc ? <span style={{ display: "block", marginTop: 2, fontSize: 12.5, color: ds.ink4 }}>{o.desc}</span> : null}
                  </span>
                  {on ? <Check size={16} color={ds.brandText} style={{ flexShrink: 0 }} /> : null}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
