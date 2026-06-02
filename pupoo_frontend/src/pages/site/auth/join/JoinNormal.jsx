import { useMemo, useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { authApi } from "../api/authApi";
import { tokenStore } from "../../../../app/http/tokenStore";
import { useAuth } from "../AuthProvider";
import { petApi } from "../../../../features/pet/api/petApi";
import { userApi } from "../../../../features/user/api/userApi";
import { getSmsRequestErrorMessage, normalizeDigits, toKoreanPhoneE164 } from "../../../../features/auth/utils/smsAuth";
import {
  ClipboardCheck, PenLine, Smartphone, Mail,
  Check, ChevronDown, Info, Clock, ShieldCheck,
  AlertCircle, KeyRound, PawPrint, Plus, Minus,
  ArrowLeft, Loader2, CheckCircle2, Send,
} from "lucide-react";

/* ── Custom Dropdown ── */
function CustomSelect({ value, onChange, options, disabled, placeholder, style }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const selected = options.find(o => o.value === value);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div className="cselect-wrap" ref={ref} style={style}>
      <button
        type="button"
        className={`cselect-trigger${open ? " open" : ""}`}
        onClick={() => !disabled && setOpen(v => !v)}
        disabled={disabled}
      >
        <span className="cselect-value">{selected ? selected.label : (placeholder || "선택")}</span>
        <ChevronDown size={14} className="cselect-arrow" style={open ? { transform: "rotate(180deg)" } : undefined} />
      </button>
      {open && (
        <div className="cselect-menu">
          {options.map(o => (
            <button
              key={o.value}
              type="button"
              className={`cselect-option${o.value === value ? " active" : ""}`}
              onClick={() => { onChange(o.value); setOpen(false); }}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Hint banner (for helper messages) ── */
function HintBanner({ icon: Icon, children, variant = "default" }) {
  const bg = variant === "success" ? "#f0fdf4" : variant === "warn" ? "#fefce8" : "#f8f8fc";
  const border = variant === "success" ? "#bbf7d0" : variant === "warn" ? "#fef08a" : "#e8e6f0";
  const color = variant === "success" ? "#15803d" : variant === "warn" ? "#a16207" : "#555";
  const iconColor = variant === "success" ? "#22c55e" : variant === "warn" ? "#eab308" : "#90C450";
  return (
    <div className="hint-banner" style={{ background: bg, borderColor: border, color }}>
      {Icon && <Icon size={16} style={{ color: iconColor, flexShrink: 0, marginTop: 1 }} />}
      <span>{children}</span>
    </div>
  );
}

const PET_TYPE_OPTIONS = [
  { value: "DOG", label: "강아지 (DOG)" },
  { value: "CAT", label: "고양이 (CAT)" },
  { value: "OTHER", label: "기타동물 (OTHER)" },
];

const PET_WEIGHT_OPTIONS = [
  { value: "XS", label: "XS (5kg 미만)" },
  { value: "S", label: "S (5kg ~ 9.9kg)" },
  { value: "M", label: "M (10kg ~ 19.9kg)" },
  { value: "L", label: "L (20kg ~ 34.9kg)" },
  { value: "XL", label: "XL (35kg 이상)" },
];

const DEFAULT_PET = { name: "", type: "DOG", age: "", weight: "M" };

const styles = `
  /* ── Outer ── */
  .signup-outer { background: #f8f9fc; min-height: 100vh; }
  .signup-inner {
    max-width: 1400px; margin: 0 auto; background: #fff;
    min-height: 100vh; padding: 90px 40px;
    box-shadow: 0 0 40px rgba(0,0,0,.04);
  }
  .signup-wrap {
    max-width: 1100px; margin: 0 auto;
    padding: 80px 0 120px;
    font-family: 'Pretendard','Apple SD Gothic Neo','Noto Sans KR',sans-serif;
    color: #333; font-size: 16px;
  }

  /* ── Title ── */
  .signup-title {
    font-size: 38px; font-weight: 800; color: #111;
    text-align: center; margin-bottom: 8px; letter-spacing: -0.5px;
    display: flex; align-items: center; justify-content: center; gap: 12px;
  }
  .signup-desc {
    font-size: 16px; color: #999; text-align: center;
    margin-bottom: 56px; line-height: 1.6;
  }

  /* ── Step ── */
  .step-bar { display: flex; align-items: center; justify-content: center; margin-bottom: 64px; }
  .step-item { display: flex; flex-direction: column; align-items: center; gap: 12px; min-width: 100px; }
  .step-num {
    width: 54px; height: 54px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    background: #f0f0f0; color: #bbb; transition: all 0.3s;
    border: 2px solid transparent;
  }
  .step-num.active { background: #90C450; color: #fff; border-color: #90C450; }
  .step-num.done   { background: #90C450; color: #fff; border-color: #90C450; }
  .step-txt { font-size: 14px; color: #bbb; font-weight: 500; transition: color 0.3s; }
  .step-txt.active { color: #333; font-weight: 700; }
  .step-txt.done   { color: #90C450; font-weight: 600; }
  .step-line {
    width: 80px; height: 2px; background: #e8e8e8;
    margin: 0 6px 34px; transition: background 0.3s;
  }
  .step-line.done { background: #90C450; }

  /* ── Card ── */
  .card-panel {
    background: #fff; border: 1px solid #e8e8e8;
    border-radius: 16px; padding: 52px 56px; margin-bottom: 32px;
  }

  /* ── Section ── */
  .section-divider { border: none; border-top: 1px solid #eee; margin: 40px 0; }
  .section-label {
    font-size: 22px; font-weight: 800; color: #111;
    margin-bottom: 36px; padding-bottom: 18px;
    border-bottom: 2px solid #111;
    display: flex; align-items: center; gap: 10px;
  }

  /* ── Field ── */
  .field {
    display: flex; flex-direction: column; gap: 10px;
    padding: 20px 0; border-bottom: 1px solid #f0f0f0;
  }
  .field:last-child { border-bottom: none; }
  .field-label {
    display: flex; align-items: center; gap: 4px;
    font-size: 15px; font-weight: 700; color: #333;
    flex-shrink: 0;
  }
  .field-label .req { color: #90C450; font-size: 14px; }
  .field-body { width: 100%; min-width: 0; }
  .field-helper { margin-top: 10px; font-size: 13px; color: #aaa; line-height: 1.5; }

  /* ── Hint banner ── */
  .hint-banner {
    display: flex; align-items: center; justify-content: center; gap: 8px;
    padding: 12px 20px; border-radius: 8px;
    border: 1px solid #e8e6f0; font-size: 13px; text-align: center;
    line-height: 1.5; margin-top: 10px;
  }

  /* ── Input ── */
  .fi {
    width: 100%; height: 54px;
    border: 1px solid #ddd; border-radius: 10px;
    padding: 0 18px; font-size: 16px; color: #222;
    outline: none; background: #fff;
    transition: border-color 0.2s; font-family: inherit;
    box-sizing: border-box;
  }
  .fi:focus { border-color: #90C450; }
  .fi::placeholder { color: #ccc; font-size: 15px; }
  .fi:disabled { background: #f8f9fc; color: #aaa; }

  /* ── Custom Select ── */
  .cselect-wrap { position: relative; display: inline-block; }
  .cselect-trigger {
    display: flex; align-items: center; justify-content: space-between;
    gap: 10px; height: 54px; min-width: 140px; padding: 0 16px;
    border: 1px solid #e5e7eb; border-radius: 999px;
    background: #fff; cursor: pointer; font-family: inherit;
    font-size: 15px; font-weight: 500; color: #333;
    outline: none; transition: all 0.15s;
    box-shadow: 0 1px 3px rgba(0,0,0,.04); box-sizing: border-box;
  }
  .cselect-trigger:hover { border-color: #d1d5db; }
  .cselect-trigger.open { border-color: #90C450; box-shadow: 0 0 0 3px rgba(68,78,40,.08); }
  .cselect-trigger:disabled { background: #f8f9fc; color: #aaa; cursor: not-allowed; }
  .cselect-value { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .cselect-arrow { flex-shrink: 0; transition: transform 0.15s ease; color: #9ca3af; }
  .cselect-menu {
    position: absolute; top: calc(100% + 6px); left: 0;
    min-width: 100%; background: #fff; border-radius: 14px;
    padding: 6px 0; box-shadow: 0 4px 24px rgba(0,0,0,.10);
    z-index: 50; max-height: 280px; overflow-y: auto;
    animation: cselect-in .12s ease;
  }
  @keyframes cselect-in { from { opacity:0; transform:translateY(-4px); } to { opacity:1; transform:translateY(0); } }
  .cselect-option {
    display: block; width: 100%; padding: 12px 20px;
    border: none; background: none; color: #6b7280;
    font-size: 14px; font-weight: 500; cursor: pointer;
    text-align: left; font-family: inherit; transition: background 0.1s;
  }
  .cselect-option:hover { background: #f9fafb; }
  .cselect-option.active { color: #111; font-weight: 700; }

  /* ── Radio ── */
  .radio-row { display: flex; gap: 36px; align-items: center; justify-content: center; padding-top: 6px; }
  .radio-item { display: flex; align-items: center; gap: 12px; cursor: pointer; font-size: 16px; color: #333; font-weight: 500; }
  .radio-item input[type="radio"] {
    appearance: none; -webkit-appearance: none;
    width: 24px; height: 24px; border: 2px solid #d1d5db;
    border-radius: 50%; cursor: pointer; transition: all 0.15s;
    flex-shrink: 0; background: #fff;
  }
  .radio-item input[type="radio"]:checked {
    border-color: #90C450; background: #90C450;
    box-shadow: inset 0 0 0 4.5px #fff;
  }

  /* ── Address ── */
  .addr-stack { display: flex; flex-direction: column; gap: 8px; }
  .addr-top { display: flex; gap: 8px; }
  .btn-addr {
    height: 54px; padding: 0 26px; background: #555; color: #fff;
    border: none; border-radius: 10px; font-size: 15px; font-weight: 600;
    cursor: pointer; white-space: nowrap; font-family: inherit;
    transition: background 0.15s; flex-shrink: 0;
  }
  .btn-addr:hover { background: #333; }
  .btn-addr:disabled { background: #ccc; cursor: not-allowed; }

  /* ── Pet ── */
  .pet-card {
    background: #fafbfc; border: 1px solid #eee;
    border-radius: 14px; padding: 28px; margin-bottom: 16px;
  }
  .pet-card-head {
    display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px;
  }
  .pet-card-title {
    font-size: 16px; font-weight: 700; color: #333;
    display: flex; align-items: center; gap: 8px;
  }
  .pet-card-btns { display: flex; gap: 6px; }
  .pet-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
  .pet-grid .fi { height: 48px; font-size: 15px; }
  .pet-grid .cselect-trigger { height: 48px; font-size: 14px; min-width: 100px; }
  .btn-pet-circle {
    width: 32px; height: 32px; border: none; border-radius: 50%;
    cursor: pointer; display: flex; align-items: center; justify-content: center;
    transition: background 0.15s; color: #fff;
  }
  .btn-pet-add { background: #90C450; }
  .btn-pet-add:hover { background: #2d3519; }
  .btn-pet-del { background: #ccc; }
  .btn-pet-del:hover { background: #aaa; }
  .btn-pet-del:disabled { opacity: 0.3; cursor: not-allowed; }

  /* ── Verify ── */
  .verify-section { text-align: center; padding: 48px 0 20px; }
  .verify-icon-wrap {
    width: 72px; height: 72px; border-radius: 50%;
    background: #eef3ed; display: flex; align-items: center;
    justify-content: center; margin: 0 auto 24px;
  }
  .verify-title { font-size: 26px; font-weight: 800; color: #111; margin-bottom: 12px; }
  .verify-desc { font-size: 16px; color: #888; margin-bottom: 40px; line-height: 1.7; }
  .verify-input-row { display: flex; gap: 10px; justify-content: center; margin-bottom: 24px; }
  .verify-input-row .fi {
    max-width: 300px; text-align: center; font-size: 26px;
    letter-spacing: 12px; font-weight: 700; height: 62px;
  }

  /* ── OTP 6-digit boxes ── */
  .otp-digit-row {
    display: flex; gap: 10px; justify-content: center;
    margin: 32px auto 28px; max-width: 420px;
  }
  .otp-digit-box {
    width: 58px; height: 64px; border: 1.5px solid #ddd;
    border-radius: 12px; background: #f8f9fc;
    text-align: center; font-size: 28px; font-weight: 700;
    color: #90C450; caret-color: #90C450;
    outline: none; transition: border-color .15s, box-shadow .15s;
  }
  .otp-digit-box:focus {
    border-color: #90C450; box-shadow: 0 0 0 3px rgba(68,78,40,.12);
    background: #fff;
  }
  .otp-digit-box::placeholder { color: #ccc; font-weight: 400; }

  /* ── Countdown ── */
  .countdown-bar {
    display: flex; align-items: center; justify-content: center;
    gap: 8px; padding: 14px 24px; border-radius: 10px;
    background: #f8f8fc; border: 1px solid #e8e6f0;
    font-size: 15px; font-weight: 600; color: #555;
    margin-bottom: 24px;
  }
  .countdown-bar .count-num {
    font-size: 22px; font-weight: 800; color: #90C450;
    font-variant-numeric: tabular-nums;
  }

  /* ── Summary ── */
  .info-summary {
    display: flex; flex-wrap: wrap; gap: 14px 32px;
    justify-content: center;
    background: #fafbfc; border: 1px solid #eee;
    border-radius: 12px; padding: 20px 28px;
    margin-bottom: 28px; font-size: 14px;
  }
  .info-summary-item {
    display: inline-flex; align-items: center; gap: 8px; color: #444;
  }
  .info-summary-item b {
    color: #888; font-weight: 500; font-size: 13px;
  }
  .info-summary-item .info-val {
    background: #eef3ed; color: #1a2d16; font-weight: 600;
    padding: 4px 14px; border-radius: 20px; font-size: 14px;
    letter-spacing: 0.3px;
  }

  /* ── Buttons ── */
  .btn-row { display: flex; gap: 14px; margin-top: 40px; justify-content: center; }
  .btn-primary {
    flex: 1; padding: 20px 24px;
    background: #90C450; color: #fff; border: none; border-radius: 12px;
    font-size: 18px; font-weight: 700; cursor: pointer;
    transition: background 0.15s; font-family: inherit;
    display: flex; align-items: center; justify-content: center; gap: 8px;
    box-sizing: border-box;
  }
  .btn-primary:hover { background: #2d3519; }
  .btn-primary:disabled { background: #ddd; color: #aaa; cursor: not-allowed; }
  .btn-outline {
    flex: 1; padding: 20px 24px;
    background: #fff; color: #555; border: 1px solid #ddd;
    border-radius: 12px; font-size: 18px; font-weight: 600;
    cursor: pointer; transition: all 0.15s; font-family: inherit;
    display: flex; align-items: center; justify-content: center; gap: 8px;
    box-sizing: border-box;
  }
  .btn-outline:hover { background: #f8f8f8; border-color: #ccc; }
  .btn-text-link {
    background: none; border: none; color: #888; font-size: 14px;
    cursor: pointer; text-decoration: underline; padding: 0; font-family: inherit;
  }
  .btn-text-link:hover { color: #555; }

  .error-text {
    display: flex; align-items: flex-start; gap: 8px;
    margin-bottom: 20px; font-size: 14px;
    line-height: 1.6; background: #fef2f2;
    border: 1px solid #fecaca; border-radius: 10px;
    padding: 16px 20px; color: #991b1b;
  }
  .inline-error {
    display: flex; align-items: center; justify-content: center; gap: 6px;
    margin-top: 16px; font-size: 14px; font-weight: 500;
    color: #dc2626; animation: shake .35s ease-in-out;
  }
  @keyframes shake {
    0%,100% { transform: translateX(0); }
    20% { transform: translateX(-6px); }
    40% { transform: translateX(6px); }
    60% { transform: translateX(-4px); }
    80% { transform: translateX(4px); }
  }

  /* ── Notice box ── */
  .notice-box {
    display: flex; flex-direction: column; align-items: center; gap: 14px;
    background: #f8f8fc; border: 1px solid #e8e6f0;
    border-radius: 14px; padding: 24px 28px;
    margin-bottom: 40px; font-size: 15px; color: #555; line-height: 1.9;
    text-align: center;
  }
  .notice-box b { color: #333; font-weight: 600; }

  /* ── Terms ── */
  .terms-all {
    display: flex; align-items: center; gap: 16px;
    padding: 24px 28px; background: #fff; border: 1px solid #ddd;
    border-radius: 14px; margin-bottom: 32px; cursor: pointer;
    transition: border-color 0.15s;
  }
  .terms-all:hover { border-color: #bbb; }
  .terms-all label { font-size: 17px; font-weight: 700; color: #111; cursor: pointer; }
  .terms-item { padding: 18px 0; border-bottom: 1px solid #f0f0f0; }
  .terms-item:last-child { border-bottom: none; }
  .terms-item-head { display: flex; align-items: center; gap: 12px; cursor: pointer; }
  .terms-item-head label { font-size: 16px; font-weight: 500; color: #333; cursor: pointer; flex: 1; }
  .terms-item-head .terms-tag { font-size: 14px; font-weight: 600; color: #90C450; }
  .terms-item-head .terms-tag-opt { font-size: 14px; font-weight: 500; color: #999; }
  .btn-terms-view {
    padding: 8px 18px; font-size: 13px; font-weight: 600;
    color: #90C450; background: #fff; border: 1px solid #b8ccb3;
    border-radius: 6px; cursor: pointer; white-space: nowrap;
    font-family: inherit; transition: all 0.15s; flex-shrink: 0;
  }
  .btn-terms-view:hover { background: #eef3ed; }
  .terms-box {
    background: #fafbfc; border: 1px solid #eee; border-radius: 10px;
    padding: 24px; max-height: 200px; overflow-y: auto;
    font-size: 13px; color: #555; line-height: 1.9; margin-top: 14px;
  }
  .terms-box h4 { font-size: 13px; font-weight: 700; color: #333; margin: 16px 0 6px 0; }
  .terms-box h4:first-child { margin-top: 0; }
  .terms-checkbox {
    appearance: none; -webkit-appearance: none;
    width: 24px; height: 24px; border: 2px solid #d1d5db;
    border-radius: 50%; cursor: pointer; flex-shrink: 0;
    transition: all 0.15s; background: #fff;
  }
  .terms-checkbox:checked {
    border-color: #90C450; background: #90C450;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 12 10 16 18 8'/%3E%3C/svg%3E");
    background-size: 16px; background-position: center; background-repeat: no-repeat;
  }
  .terms-helper { margin-top: 20px; padding: 0 4px; font-size: 12.5px; color: #aaa; line-height: 1.8; }
  .terms-helper li { list-style: none; padding-left: 12px; position: relative; }
  .terms-helper li::before { content: '·'; position: absolute; left: 0; color: #ccc; }

  /* ── Responsive ── */
  @media (max-width: 900px) {
    .signup-inner { padding: 0 16px; }
    .signup-wrap { padding: 60px 0 80px; max-width: 100%; }
    .signup-title { font-size: 28px; }
    .card-panel { padding: 32px 24px; border-radius: 12px; }
    .step-line { width: 36px; }
    .step-num { width: 42px; height: 42px; }
    .step-txt { font-size: 12px; }
    .field-label { font-size: 14px; }
    .fi { height: 48px; font-size: 15px; }
    .cselect-trigger { height: 48px; font-size: 14px; }
    .btn-primary { padding: 18px 20px !important; font-size: 16px; max-width: none; }
    .btn-outline { padding: 18px 20px !important; font-size: 15px; min-width: 110px; }
    .pet-grid { grid-template-columns: 1fr; }
    .verify-section { padding: 32px 0 10px; }
    .section-label { font-size: 18px; }
    .terms-all label { font-size: 15px; }
    .terms-item-head label { font-size: 14px; }
  }
  @media (max-width: 640px) {
    .signup-inner { padding: 0 10px; }
    .signup-wrap { padding: calc(var(--pupoo-site-header-offset, 72px) + 20px) 0 48px; }
    .signup-title { font-size: 22px; gap: 8px; }
    .signup-desc { font-size: 14px; margin-bottom: 32px; }
    .card-panel { padding: 20px 14px; border-radius: 12px; margin-bottom: 20px; }
    .step-bar { margin-bottom: 36px; gap: 0; }
    .step-item { min-width: 60px; gap: 8px; }
    .step-num { width: 36px; height: 36px; }
    .step-txt { font-size: 11px; }
    .step-line { width: 20px; margin-bottom: 26px; }
    .section-label { font-size: 16px; margin-bottom: 20px; padding-bottom: 12px; }
    .field { padding: 16px 0; }
    .field-label { font-size: 13px; }
    .fi { height: 46px; font-size: 14px; padding: 0 14px; }
    .cselect-trigger { height: 46px; font-size: 13px; min-width: 90px; }
    .btn-row { flex-direction: column; gap: 10px; margin-top: 24px; }
    .btn-primary { padding: 20px 20px !important; font-size: 15px; }
    .btn-outline { padding: 20px 20px !important; font-size: 14px; }
    .hint-banner { font-size: 12px; padding: 8px 12px; }
    .notice-box { padding: 16px 18px; font-size: 13px; line-height: 1.75; }
    .terms-all { padding: 16px 18px; }
    .terms-all label { font-size: 14px; }
    .terms-item-head label { font-size: 13px; }
    .btn-terms-view { padding: 6px 12px; font-size: 12px; }
    .pet-card { padding: 16px 14px; }
    .verify-section { padding: 20px 0 8px; }
    .verify-title { font-size: 20px; }
    .verify-desc { font-size: 14px; margin-bottom: 24px; }
    .otp-digit-row { gap: 6px; margin: 20px auto 20px; max-width: 100%; }
    .otp-digit-box { width: calc((100% - 30px) / 6); height: 56px; font-size: 22px; border-radius: 10px; }
    .countdown-bar { font-size: 13px; padding: 12px 16px; }
    .info-summary { padding: 14px 16px; font-size: 13px; gap: 10px 20px; }
    .section-divider { margin: 24px 0; }
  }
`;

// ── Utilities ──
function getApiData(res) {
  if (res && typeof res === "object" && ("signupKey" in res || "accessToken" in res)) return res;
  if (res && typeof res === "object" && "data" in res) return res.data;
  return null;
}
const digitsOnly = normalizeDigits;

function parsePetsForCreate(pets) {
  const rows = Array.isArray(pets) ? pets : [];
  const payloads = [];
  for (const pet of rows) {
    const petName = String(pet?.name || "").trim();
    const rawAge = String(pet?.age ?? "").trim();
    if (!petName && !rawAge) continue;
    if (!petName) throw new Error("반려동물 이름을 입력해 주세요.");
    if (!rawAge) throw new Error("반려동물 나이를 입력해 주세요.");
    const petAge = Number(rawAge);
    if (!Number.isInteger(petAge) || petAge < 0 || petAge > 100) throw new Error("반려동물 나이는 0~100 사이 정수로 입력해 주세요.");
    const type = String(pet?.type || "DOG").toUpperCase();
    const petBreed = ["DOG", "CAT", "OTHER"].includes(type) ? type : "DOG";
    const selectedWeight = String(pet?.weight || "M").toUpperCase();
    const petWeight = ["XS", "S", "M", "L", "XL"].includes(selectedWeight) ? selectedWeight : "M";
    payloads.push({ petName, petBreed, petAge, petWeight: petBreed === "DOG" ? petWeight : "M" });
  }
  return payloads;
}

export default function JoinNormal() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const [memberType, setMemberType] = useState("individual");
  const [form, setForm] = useState({
    id: "", password: "", passwordConfirm: "", nickname: "", name: "",
    email: "", tel1: "02", tel2: "", tel3: "",
    mobile1: "010", mobile2: "", mobile3: "",
    postcode: "", address: "", addressDetail: "", employeeId: "",
  });
  const [pets, setPets] = useState([{ ...DEFAULT_PET }]);
  const [error, setError] = useState("");
  const [step, setStep] = useState("AGREE");
  const [signupKey, setSignupKey] = useState(null);

  const [agreeAll, setAgreeAll] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [agreeMarketing, setAgreeMarketing] = useState(false);
  const [showTerms, setShowTerms] = useState({ terms: false, privacy: false, marketing: false });

  const handleAgreeAll = (checked) => { setAgreeAll(checked); setAgreeTerms(checked); setAgreePrivacy(checked); setAgreeMarketing(checked); };
  useEffect(() => { setAgreeAll(agreeTerms && agreePrivacy && agreeMarketing); }, [agreeTerms, agreePrivacy, agreeMarketing]);

  const [otpCode, setOtpCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailRequested, setEmailRequested] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [emailCode, setEmailCode] = useState("");
  const [emailRequestMessage, setEmailRequestMessage] = useState("");
  const [otpCooldown, setOtpCooldown] = useState(0);
  const [nicknameChecked, setNicknameChecked] = useState(false);
  const [nicknameCheckMsg, setNicknameCheckMsg] = useState("");

  useEffect(() => {
    if (otpCooldown <= 0) return;
    const t = setInterval(() => setOtpCooldown((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [otpCooldown]);

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
    if (name === "nickname") {
      setNicknameChecked(false);
      setNicknameCheckMsg("");
    }
  };
  const handleNumberOnlyChange = (e) => { const { name, value } = e.target; setForm((p) => ({ ...p, [name]: value.replace(/[^0-9]/g, "") })); };

  const openPostcode = () => {
    new window.daum.Postcode({
      oncomplete: (data) => {
        let full = data.address, extra = "";
        if (data.addressType === "R") {
          if (data.bname) extra += data.bname;
          if (data.buildingName) extra += extra ? `, ${data.buildingName}` : data.buildingName;
          full += extra ? ` (${extra})` : "";
        }
        setForm((p) => ({ ...p, postcode: data.zonecode, address: full }));
      },
    }).open();
  };

  const handlePetChange = (index, field, value) => {
    setPets((prev) => {
      const updated = [...prev]; const next = { ...updated[index], [field]: value };
      if (field === "type") { next.type = String(value || "DOG").toUpperCase(); if (next.type !== "DOG") next.weight = "M"; }
      updated[index] = next; return updated;
    });
  };
  const addPet = () => setPets((p) => [...p, { ...DEFAULT_PET }]);
  const removePet = (i) => { if (pets.length > 1) setPets((p) => p.filter((_, j) => j !== i)); };

  const phoneMobileDigits = useMemo(() => {
    const m2 = digitsOnly(form.mobile2), m3 = digitsOnly(form.mobile3);
    if (!m2 || !m3) return "";
    return `${digitsOnly(form.mobile1)}${m2}${m3}`;
  }, [form.mobile1, form.mobile2, form.mobile3]);
  const phoneMobileE164 = useMemo(() => toKoreanPhoneE164(phoneMobileDigits), [phoneMobileDigits]);

  const socialStateFromRoute = location.state?.signupType === "SOCIAL" ? location.state : null;
  const socialStateFromStorage = (() => {
    const uid = sessionStorage.getItem("kakao_provider_uid");
    if (!uid) return null;
    return { signupType: "SOCIAL", socialProvider: "KAKAO", socialProviderUid: uid, email: sessionStorage.getItem("kakao_email") ?? "", nickname: sessionStorage.getItem("kakao_nickname") ?? "", phone: "" };
  })();
  const socialState = socialStateFromRoute ?? socialStateFromStorage;
  const isSocial = socialState?.signupType === "SOCIAL";

  useEffect(() => {
    if (!isSocial) return;
    setForm((p) => ({ ...p, email: socialState.email ?? p.email, nickname: socialState.nickname ?? p.nickname }));
  }, [isSocial, socialState]);

  const checkNickname = async () => {
    const value = (form.nickname || "").trim();
    if (!value) {
      setNicknameChecked(false);
      setNicknameCheckMsg("닉네임을 입력해 주세요.");
      return false;
    }

    try {
      const available = await userApi.checkNickname(value);
      const ok = Boolean(available);
      setNicknameChecked(ok);
      setNicknameCheckMsg(
        ok ? "사용 가능한 닉네임입니다." : "이미 사용 중인 닉네임입니다.",
      );
      return ok;
    } catch (error) {
      const message =
        error?.response?.data?.message ??
        error?.message ??
        "닉네임 중복 확인에 실패했습니다.";
      setNicknameChecked(false);
      setNicknameCheckMsg(message);
      return false;
    }
  };

  // Filter out Network Error and technical messages from user-facing errors
  const setUserError = (msg) => {
    const s = String(msg || "");
    if (/network\s*error/i.test(s) || /signupKey/i.test(s) || /accessToken/i.test(s)) return;
    if (/request failed with status code 400/i.test(s)) return setError("인증번호가 올바르지 않습니다. 다시 확인해주세요.");
    if (/request failed with status code/i.test(s)) return setError("요청 처리 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.");
    setError(s);
  };

  const signupStart = async () => {
    if (loading) return;
    if (otpCooldown > 0) throw new Error(`인증번호 재요청까지 ${otpCooldown}초 남았습니다.`);
    if (!phoneMobileDigits) throw new Error("휴대전화 번호를 완성해주세요.");
    if (!(form.nickname || "").trim()) throw new Error("닉네임을 입력하세요.");
    if (!nicknameChecked) {
      const ok = await checkNickname();
      if (!ok) throw new Error("사용 가능한 닉네임을 입력해 주세요.");
    }
    if (!isSocial) {
      if (!form.email.trim()) throw new Error("이메일을 입력하세요.");
      if (!form.password) throw new Error("비밀번호를 입력하세요.");
      if (form.password !== form.passwordConfirm) throw new Error("비밀번호가 일치하지 않습니다.");
    } else {
      if (!form.email.trim()) throw new Error("이메일을 입력하세요.");
      if (!socialState?.socialProviderUid) throw new Error("소셜 인증 정보가 없습니다. 다시 시도해주세요.");
    }
    setLoading(true); setError("");
    try {
      const payload = isSocial
        ? { signupType: "SOCIAL", socialProvider: socialState.socialProvider ?? "KAKAO", socialProviderUid: socialState.socialProviderUid, email: form.email.trim(), nickname: form.nickname.trim() || form.email.split("@")[0], phone: phoneMobileE164 }
        : { signupType: "EMAIL", email: form.email.trim(), password: form.password, nickname: form.nickname.trim() || form.email.split("@")[0], phone: phoneMobileE164 };
      const res = await authApi.signupStart(payload);
      const data = getApiData(res); const key = data?.signupKey;
      if (!key) throw new Error("가입 세션 생성에 실패했습니다. 다시 시도해주세요.");
      setSignupKey(key); setStep("OTP");
      if (data?.otpCooldownSeconds) setOtpCooldown(Number(data.otpCooldownSeconds) || 0);
      if (data?.devOtp) setOtpCode(String(data.devOtp));
    } catch (e) {
      if (e?.response?.status === 429) {
        const retryAfter = Number(e?.response?.headers?.["retry-after"]);
        const cool = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : 60;
        setOtpCooldown(cool);
        throw new Error(`잠시 후 다시 시도해주세요. (${cool}초)`);
      }
      throw e;
    } finally { setLoading(false); }
  };

  const verifyOtp = async () => {
    if (loading) return;
    if (!signupKey) throw new Error("가입 세션이 만료되었습니다. 처음부터 다시 시도해주세요.");
    if (!otpCode.trim()) throw new Error("인증번호를 입력하세요.");
    setLoading(true); setError("");
    try {
      await authApi.signupVerifyOtp({ signupKey, phone: phoneMobileE164, otpCode: otpCode.trim() });
      setStep("COMPLETE");
    } finally { setLoading(false); }
  };

  const requestEmailVerification = async () => {
    if (loading || !signupKey) return;
    setError(""); setEmailRequestMessage(""); setLoading(true);
    try {
      await authApi.signupEmailRequest({ signupKey });
      setEmailCode("");
      setEmailRequested(true);
      setEmailRequestMessage("이메일을 확인해 주세요. 받은 인증 코드를 입력하면 가입을 완료할 수 있습니다.");
    } catch (err) { setUserError(err?.response?.data?.message ?? err?.message ?? "이메일 인증 요청에 실패했습니다."); }
    finally { setLoading(false); }
  };

  const confirmEmailVerification = async () => {
    if (loading || !signupKey) return;
    if (!emailCode.trim()) return setError("인증 코드를 입력하세요.");
    setError(""); setEmailRequestMessage(""); setLoading(true);
    try {
      await authApi.signupEmailConfirm({ signupKey, code: emailCode.trim() });
      setEmailVerified(true);
      setEmailRequestMessage("이메일 인증이 완료되었습니다.");
    } catch (err) { setUserError(err?.response?.data?.message ?? err?.message ?? "인증 확인에 실패했습니다."); }
    finally { setLoading(false); }
  };

  const completeSignup = async () => {
    if (loading || !signupKey) return;
    if (!emailVerified) throw new Error("이메일 인증을 완료해주세요.");
    const petPayloads = parsePetsForCreate(pets);
    setLoading(true); setError("");
    try {
      const res = await authApi.signupComplete({ signupKey });
      const data = getApiData(res); const accessToken = data?.accessToken;
      if (!accessToken) throw new Error("가입 완료에 실패했습니다. 다시 시도해주세요.");
      tokenStore.setAccess(accessToken); login();
      if (petPayloads.length > 0) {
        try { await Promise.all(petPayloads.map((pet) => petApi.createPet(pet))); }
        catch (e) { console.error("[JoinNormal] pet create failed:", e); }
      }
      navigate("/");
    } finally { setLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); setError("");
    try {
      if (step === "AGREE") { if (!agreeTerms || !agreePrivacy) throw new Error("필수 약관에 동의해 주세요."); setStep("FORM"); return; }
      if (step === "FORM") { await signupStart(); return; }
      if (step === "OTP") { await verifyOtp(); return; }
      if (step === "COMPLETE") { await completeSignup(); return; }
    } catch (err) {
      if (step === "FORM") {
        setUserError(getSmsRequestErrorMessage(err));
        return;
      }
      setUserError(err?.response?.data?.message ?? err?.message);
    }
  };

  const stepIndex = step === "AGREE" ? 0 : step === "FORM" ? 1 : step === "OTP" ? 2 : 3;
  const stepLabels = ["약관 동의", "정보 입력", "휴대폰 인증", "이메일 인증"];
  const StepIcons = [ClipboardCheck, PenLine, Smartphone, Mail];

  return (
    <>
      <style>{styles}</style>
      <div className="signup-outer">
      <div className="signup-inner">
      <form className="signup-wrap" onSubmit={handleSubmit}>

        <h1 className="signup-title">
          회원가입
        </h1>
        <p className="signup-desc">
          {step === "AGREE" ? "서비스 이용을 위해 약관을 확인해 주세요." : step === "FORM" ? <>간단한 정보만 입력하면<br />pupoo의 모든 서비스를 이용할 수 있어요.</> : step === "OTP" ? "휴대폰으로 전송된 인증번호를 확인해 주세요." : "마지막으로 이메일 인증을 완료해 주세요."}
        </p>

        {/* Step */}
        <div className="step-bar">
          {stepLabels.map((label, i) => {
            const Icon = StepIcons[i];
            return (
              <div key={i} style={{ display: "flex", alignItems: "center" }}>
                {i > 0 && <div className={`step-line${i <= stepIndex ? " done" : ""}`} />}
                <div className="step-item">
                  <div className={`step-num${i === stepIndex ? " active" : ""}${i < stepIndex ? " done" : ""}`}>
                    {i < stepIndex ? <Check size={20} /> : <Icon size={20} />}
                  </div>
                  <span className={`step-txt${i === stepIndex ? " active" : ""}${i < stepIndex ? " done" : ""}`}>{label}</span>
                </div>
              </div>
            );
          })}
        </div>



        {/* Error — show only in AGREE / FORM steps at top */}
        {error && (step === "AGREE" || step === "FORM") && (
          <div className="error-text">
            <AlertCircle size={16} style={{ color: "#dc2626", flexShrink: 0, marginTop: 2 }} />
            <span>{error}</span>
          </div>
        )}

        {/* ═══ AGREE ═══ */}
        {step === "AGREE" && (
          <>
            <div className="card-panel">
              <div className="section-label"><ClipboardCheck size={22} style={{ color: "#90C450" }} /> 약관 동의</div>

              <div className="terms-all" onClick={() => handleAgreeAll(!agreeAll)}>
                <input type="checkbox" className="terms-checkbox" checked={agreeAll} onChange={(e) => handleAgreeAll(e.target.checked)} />
                <label>전체 약관 동의</label>
              </div>

              <div className="terms-item">
                <div className="terms-item-head">
                  <input type="checkbox" className="terms-checkbox" checked={agreeTerms} onChange={(e) => setAgreeTerms(e.target.checked)} />
                  <label onClick={() => setAgreeTerms(!agreeTerms)}><span className="terms-tag">(필수)</span> 이용 약관</label>
                  <button type="button" className="btn-terms-view" onClick={() => setShowTerms(p => ({ ...p, terms: !p.terms }))}>{showTerms.terms ? "닫기" : "내용보기"}</button>
                </div>
                {showTerms.terms && (
                  <div className="terms-box">
                    <h4>제1조 목적</h4><p>본 이용약관은 "푸푸컴퍼니"(이하 "사이트")의 서비스의 이용조건과 운영에 관한 제반 사항 규정을 목적으로 합니다.</p>
                    <h4>제2조 용어의 정의</h4><p>본 약관에서 사용되는 주요한 용어의 정의는 다음과 같습니다.</p><p>① 회원 : 사이트의 약관에 동의하고 개인정보를 제공하여 회원등록을 한 자로서 사이트와의 이용계약을 체결하고 사이트를 이용하는 이용자를 말합니다.</p><p>② 이용계약 : 사이트 이용과 관련하여 사이트와 회원간에 체결하는 계약을 말합니다.</p><p>③ 해지 : 회원이 이용계약을 해약하는 것을 말합니다.</p>
                    <h4>제3조 약관의 게시 및 변경</h4><p>① 본 약관은 회원가입 화면 및 사이트 내 공지사항 등을 통해 게시됩니다.</p><p>② 사이트는 관련 법률에 위배되지 않는 범위에서 본 약관을 변경할 수 있으며, 변경된 약관은 공지사항을 통해 고지합니다.</p>
                    <h4>제4조 서비스의 제공</h4><p>사이트는 다음과 같은 서비스를 제공합니다.</p><p>① 애견 행사 정보 제공 및 참여 신청</p><p>② 커뮤니티(자유게시판, 리뷰, Q&A 등) 서비스</p><p>③ 반려동물 관련 콘텐츠 서비스</p><p>④ 기타 사이트가 정하는 서비스</p>
                    <h4>제5조 이용계약의 성립</h4><p>이용계약은 이용자가 약관의 내용에 동의한 후 회원가입 신청을 하고, 사이트가 이를 승낙함으로써 성립됩니다.</p>
                    <h4>제6조 회원 탈퇴 및 자격 상실</h4><p>① 회원은 언제든지 탈퇴를 요청할 수 있으며, 사이트는 즉시 회원탈퇴를 처리합니다.</p><p>② 회원이 서비스 이용 시 관계법령, 본 약관의 규정을 위반하거나 공서양속에 반하는 행위를 하는 경우 자격이 상실될 수 있습니다.</p>
                  </div>
                )}
              </div>

              <div className="terms-item">
                <div className="terms-item-head">
                  <input type="checkbox" className="terms-checkbox" checked={agreePrivacy} onChange={(e) => setAgreePrivacy(e.target.checked)} />
                  <label onClick={() => setAgreePrivacy(!agreePrivacy)}><span className="terms-tag">(필수)</span> 개인정보 수집 이용 동의</label>
                  <button type="button" className="btn-terms-view" onClick={() => setShowTerms(p => ({ ...p, privacy: !p.privacy }))}>{showTerms.privacy ? "닫기" : "내용보기"}</button>
                </div>
                {showTerms.privacy && (
                  <div className="terms-box">
                    <h4>1. 수집하는 개인정보의 항목</h4><p>회사는 회원가입, 서비스 이용 등을 위해 아래와 같은 개인정보를 수집합니다.</p><p>- 필수항목 : 이메일, 비밀번호, 휴대폰번호</p><p>- 선택항목 : 주소, 일반전화, 반려동물 정보(이름, 종류, 나이, 체중)</p><p>- 자동수집항목 : IP주소, 쿠키, 접속일시, 서비스 이용기록</p>
                    <h4>2. 개인정보의 수집 및 이용목적</h4><p>- 회원가입 의사 확인, 회원제 서비스 제공, 회원 식별</p><p>- 행사 참여 신청 및 관리</p><p>- 커뮤니티 서비스 제공</p><p>- 고객 상담 및 불만 처리</p>
                    <h4>3. 개인정보의 보유 및 이용기간</h4><p>회원 탈퇴 시 즉시 파기합니다. 단, 관계법령에 의해 보존할 필요가 있는 경우 해당 법령에서 정한 기간 동안 보관합니다.</p>
                  </div>
                )}
              </div>

              <div className="terms-item">
                <div className="terms-item-head">
                  <input type="checkbox" className="terms-checkbox" checked={agreeMarketing} onChange={(e) => setAgreeMarketing(e.target.checked)} />
                  <label onClick={() => setAgreeMarketing(!agreeMarketing)}><span className="terms-tag-opt">(선택)</span> 마케팅 정보 수신 동의</label>
                  <button type="button" className="btn-terms-view" onClick={() => setShowTerms(p => ({ ...p, marketing: !p.marketing }))}>{showTerms.marketing ? "닫기" : "내용보기"}</button>
                </div>
                {showTerms.marketing && (
                  <div className="terms-box">
                    <p>서비스와 관련한 신상품 소식, 이벤트 안내, 고객 혜택 등 다양한 정보를 SMS, 이메일 등을 통해 제공합니다.</p>
                    <p>마케팅 정보 수신에 동의하지 않으셔도 회원가입 및 서비스 이용이 가능합니다.</p>
                  </div>
                )}
              </div>

              <ul className="terms-helper">
                <li>필수항목에 동의하지 않을 경우 서비스 가입이 불가합니다.</li>
                <li>선택항목에 동의하지 않아도 서비스 가입이 가능하나, 관련 서비스는 제공받으실 수 없습니다.</li>
              </ul>
            </div>

            <div className="btn-row">
              <button type="button" className="btn-outline" onClick={() => window.history.back()} disabled={loading}>
                <ArrowLeft size={18} /> 취소
              </button>
              <button type="submit" className="btn-primary">
                동의하고 계속하기
              </button>
            </div>
          </>
        )}

        {/* ═══ FORM ═══ */}
        {step === "FORM" && (
          <>
            <div className="notice-box">
              <Info size={22} style={{ color: "#90C450" }} />
              <div>
                본 서비스는 별도의 아이디 없이 <b>이메일</b>로 로그인합니다.<br />
                가입 시 입력한 <b>휴대폰 번호</b>로 OTP 인증번호가 발송되며,<br />
                이후 <b>이메일 인증</b>까지 완료하면 가입이 완료됩니다.
              </div>
            </div>

            <div className="card-panel">
              <div className="section-label"><PenLine size={20} style={{ color: "#90C450" }} /> 가입 정보 입력</div>

              <div className="field">
                <label className="field-label">회원구분</label>
                <div className="field-body">
                  <div className="radio-row">
                    <label className="radio-item">
                      <input type="radio" name="memberType" value="individual" checked={memberType === "individual"} onChange={() => setMemberType("individual")} disabled={loading} />
                      개인회원
                    </label>
                    <label className="radio-item">
                      <input type="radio" name="memberType" value="business" checked={memberType === "business"} onChange={() => setMemberType("business")} disabled={loading} />
                      사업자회원
                    </label>
                  </div>
                </div>
              </div>

              {!isSocial && (
                <>
                  <div className="field">
                    <label className="field-label">비밀번호 <span className="req">*</span></label>
                    <div className="field-body">
                      <input className="fi" type="password" name="password" value={form.password} onChange={handleFormChange} placeholder="영문/숫자/특수문자 조합 8~16자" disabled={loading} />
                    </div>
                  </div>
                  <div className="field">
                    <label className="field-label">비밀번호 확인 <span className="req">*</span></label>
                    <div className="field-body">
                      <input className="fi" type="password" name="passwordConfirm" value={form.passwordConfirm} onChange={handleFormChange} placeholder="비밀번호 확인 입력" disabled={loading} />
                      {form.passwordConfirm && form.password !== form.passwordConfirm && (
                        <HintBanner icon={AlertCircle} variant="warn">비밀번호가 일치하지 않습니다</HintBanner>
                      )}
                      {form.passwordConfirm && form.password === form.passwordConfirm && (
                        <HintBanner icon={CheckCircle2} variant="success">비밀번호가 일치합니다</HintBanner>
                      )}
                    </div>
                  </div>
                </>
              )}

              <div className="field">
                <label className="field-label">이메일 <span className="req">*</span></label>
                <div className="field-body">
                  <input className="fi" type="email" name="email" value={form.email} onChange={handleFormChange} placeholder="이메일 주소 입력" disabled={loading} />
                  <HintBanner icon={KeyRound}>이메일이 로그인 아이디로 사용됩니다</HintBanner>
                </div>
              </div>

              <div className="field">
                <label className="field-label">닉네임 <span className="req">*</span></label>
                <div className="field-body">
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <input
                      className="fi"
                      type="text"
                      name="nickname"
                      value={form.nickname}
                      onChange={handleFormChange}
                      placeholder="사용할 닉네임 입력"
                      disabled={loading}
                      style={{ flex: 1 }}
                    />
                    <button
                      type="button"
                      className="btn-addr"
                      onClick={checkNickname}
                      disabled={loading}
                      style={{ padding: "0 20px" }}
                    >
                      중복확인
                    </button>
                  </div>
                  {nicknameCheckMsg ? (
                    <HintBanner
                      icon={nicknameChecked ? CheckCircle2 : AlertCircle}
                      variant={nicknameChecked ? "success" : "warn"}
                    >
                      {nicknameCheckMsg}
                    </HintBanner>
                  ) : (
                    <HintBanner icon={Info}>커뮤니티와 참가자 화면에 표시될 닉네임입니다.</HintBanner>
                  )}
                </div>
              </div>

              <div className="field">
                <label className="field-label">휴대폰 <span className="req">*</span></label>
                <div className="field-body">
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <CustomSelect value={form.mobile1} onChange={(v) => setForm(p => ({ ...p, mobile1: v }))} options={[{ value: "010", label: "010" },{ value: "011", label: "011" },{ value: "016", label: "016" },{ value: "017", label: "017" },{ value: "018", label: "018" },{ value: "019", label: "019" }]} disabled={loading} style={{ flex: "0 0 auto" }} />
                    <span style={{ color: "#ddd", fontSize: 18 }}>-</span>
                    <input className="fi" type="text" name="mobile2" value={form.mobile2} onChange={handleNumberOnlyChange} maxLength={4} placeholder="0000" disabled={loading} style={{ flex: 1 }} />
                    <span style={{ color: "#ddd", fontSize: 18 }}>-</span>
                    <input className="fi" type="text" name="mobile3" value={form.mobile3} onChange={handleNumberOnlyChange} maxLength={4} placeholder="0000" disabled={loading} style={{ flex: 1 }} />
                  </div>
                  <HintBanner icon={Smartphone}>다음 단계에서 이 번호로 OTP 인증번호가 발송됩니다</HintBanner>
                </div>
              </div>

              <div className="field">
                <label className="field-label">연락처</label>
                <div className="field-body">
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <CustomSelect value={form.tel1} onChange={(v) => setForm(p => ({ ...p, tel1: v }))} options={["02","031","032","033","041","042","043","051","052","053","054","055","061","062","063","064"].map(v => ({ value: v, label: v }))} disabled={loading} style={{ flex: "0 0 auto" }} />
                    <span style={{ color: "#ddd", fontSize: 18 }}>-</span>
                    <input className="fi" type="text" name="tel2" value={form.tel2} onChange={handleNumberOnlyChange} maxLength={4} placeholder="0000" disabled={loading} style={{ flex: 1 }} />
                    <span style={{ color: "#ddd", fontSize: 18 }}>-</span>
                    <input className="fi" type="text" name="tel3" value={form.tel3} onChange={handleNumberOnlyChange} maxLength={4} placeholder="0000" disabled={loading} style={{ flex: 1 }} />
                  </div>
                </div>
              </div>

              <div className="field">
                <label className="field-label">주소</label>
                <div className="field-body">
                  <div className="addr-stack">
                    <div className="addr-top">
                      <input className="fi" type="text" name="postcode" value={form.postcode} placeholder="우편번호" disabled readOnly style={{ flex: 1 }} />
                      <button type="button" className="btn-addr" onClick={openPostcode} disabled={loading}>우편번호 검색</button>
                    </div>
                    <input className="fi" type="text" name="address" value={form.address} placeholder="기본주소 (우편번호 검색 시 자동 입력)" disabled readOnly />
                    <input className="fi" type="text" name="addressDetail" value={form.addressDetail} onChange={handleFormChange} placeholder="상세주소를 입력하세요 (동/호수 등)" disabled={loading} />
                  </div>
                </div>
              </div>
            </div>

            <div className="card-panel">
              <div className="section-label"><PawPrint size={20} style={{ color: "#90C450" }} /> 반려동물 정보</div>

              {pets.map((pet, index) => (
                <div className="pet-card" key={index}>
                  <div className="pet-card-head">
                    <span className="pet-card-title"><PawPrint size={16} style={{ color: "#90C450" }} /> 반려동물 {index + 1}</span>
                    <div className="pet-card-btns">
                      <button type="button" className="btn-pet-circle btn-pet-del" onClick={() => removePet(index)} disabled={loading || pets.length === 1}><Minus size={14} /></button>
                      <button type="button" className="btn-pet-circle btn-pet-add" onClick={addPet} disabled={loading}><Plus size={14} /></button>
                    </div>
                  </div>
                  <div className="pet-grid">
                    <input className="fi" type="text" value={pet.name} onChange={(e) => handlePetChange(index, "name", e.target.value)} placeholder="이름" disabled={loading} />
                    <CustomSelect value={pet.type} onChange={(v) => handlePetChange(index, "type", v)} options={PET_TYPE_OPTIONS} disabled={loading} style={{ width: "100%" }} />
                    <input className="fi" type="number" min="0" max="100" value={pet.age} onChange={(e) => handlePetChange(index, "age", e.target.value)} placeholder="나이 (살)" disabled={loading} />
                    {pet.type === "DOG" ? (
                      <CustomSelect value={pet.weight} onChange={(v) => handlePetChange(index, "weight", v)} options={PET_WEIGHT_OPTIONS} disabled={loading} style={{ width: "100%" }} />
                    ) : (
                      <div className="fi" style={{ display: "flex", alignItems: "center", color: "#aaa", fontSize: 14, cursor: "default" }}>사이즈: 기본값 (M)</div>
                    )}
                  </div>
                </div>
              ))}
              <div className="field-helper" style={{ marginTop: 4 }}>가입 후 마이페이지에서도 등록/수정할 수 있습니다</div>
            </div>

            <div className="btn-row">
              <button type="button" className="btn-outline" onClick={() => setStep("AGREE")} disabled={loading}><ArrowLeft size={18} /> 이전</button>
              <button type="submit" className="btn-primary" disabled={loading || otpCooldown > 0}>
                {loading ? <><Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} /> 처리 중...</> : "가입신청"}
              </button>
            </div>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </>
        )}

        {/* ═══ OTP ═══ */}
        {step === "OTP" && (
          <div className="card-panel">
            <div className="verify-section">
              <div style={{ fontSize: 28, fontWeight: 800, color: "#111", lineHeight: 1.4, marginBottom: 8 }}>
                문자로 받은<br />인증번호 6자리를 입력해주세요
              </div>
              <div style={{ fontSize: 14, color: "#888", marginBottom: 8 }}>
                <b style={{ color: "#90C450" }}>{form.mobile1}-{form.mobile2}-****</b> 로 발송되었습니다
              </div>
              {otpCooldown > 0 && (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 5, fontSize: 14, color: "#90C450", fontWeight: 600, marginBottom: 4 }}>
                  <Clock size={14} />
                  <span>남은 시간 {String(Math.floor(otpCooldown / 60)).padStart(2, "0")}:{String(otpCooldown % 60).padStart(2, "0")}</span>
                </div>
              )}

              <div className="otp-digit-row">
                {[0, 1, 2, 3, 4, 5].map(i => (
                  <input
                    key={i}
                    id={`otp-${i}`}
                    className="otp-digit-box"
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={otpCode[i] || ""}
                    autoFocus={i === 0}
                    disabled={loading}
                    onChange={(e) => {
                      const v = e.target.value.replace(/[^0-9]/g, "");
                      if (!v && !e.target.value) return;
                      const arr = (otpCode || "").split("");
                      arr[i] = v.slice(-1);
                      const next = arr.join("").slice(0, 6);
                      setOtpCode(next);
                      if (v && i < 5) document.getElementById(`otp-${i + 1}`)?.focus();
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Backspace" && !otpCode[i] && i > 0) {
                        document.getElementById(`otp-${i - 1}`)?.focus();
                      }
                    }}
                    onPaste={(e) => {
                      e.preventDefault();
                      const paste = e.clipboardData.getData("text").replace(/[^0-9]/g, "").slice(0, 6);
                      setOtpCode(paste);
                      const focusIdx = Math.min(paste.length, 5);
                      document.getElementById(`otp-${focusIdx}`)?.focus();
                    }}
                  />
                ))}
              </div>

              <div className="btn-row" style={{ justifyContent: "center", maxWidth: 360, margin: "0 auto" }}>
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? <><Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} /> 확인 중...</> : <><ShieldCheck size={18} /> 인증 확인</>}
                </button>
              </div>
              {error && (
                <div className="inline-error">
                  <AlertCircle size={15} />
                  <span>{error}</span>
                </div>
              )}
              <div style={{ marginTop: 20, textAlign: "center" }}>
                <button type="button" className="btn-text-link" disabled={loading} onClick={() => { setStep("FORM"); setSignupKey(null); setOtpCode(""); setEmailRequested(false); setEmailVerified(false); setEmailCode(""); setEmailRequestMessage(""); }}>
                  이전 단계로 돌아가기
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ═══ COMPLETE ═══ */}
        {step === "COMPLETE" && (
          <div className="card-panel">
            <div className="verify-section">

              {!emailRequested && (
                <>
                  <div className="verify-icon-wrap"><Mail size={32} style={{ color: "#90C450" }} /></div>
                  <div style={{ fontSize: 28, fontWeight: 800, color: "#111", lineHeight: 1.4, marginBottom: 8 }}>
                    이메일 인증을 진행해주세요
                  </div>
                  <div style={{ fontSize: 14, color: "#888", marginBottom: 4 }}>
                    <b style={{ color: "#90C450" }}>{form.email}</b> 로 인증 메일을 보내드립니다
                  </div>
                  <div className="btn-row" style={{ justifyContent: "center", maxWidth: 360, margin: "32px auto 0" }}>
                    <button type="button" className="btn-primary" onClick={requestEmailVerification} disabled={loading}>
                      {loading ? <><Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} /> 발송 중...</> : <><Send size={18} /> 인증 메일 발송</>}
                    </button>
                  </div>
                </>
              )}

              {emailRequested && !emailVerified && (
                <>
                  <div style={{ fontSize: 28, fontWeight: 800, color: "#111", lineHeight: 1.4, marginBottom: 8 }}>
                    메일로 받은<br />인증 코드를 입력해주세요
                  </div>
                  <div style={{ fontSize: 14, color: "#888", marginBottom: 4 }}>
                    <b style={{ color: "#90C450" }}>{form.email}</b> 로 발송되었습니다
                  </div>
                  {emailRequestMessage && (
                    <HintBanner icon={Mail}>{emailRequestMessage}</HintBanner>
                  )}
                  <div className="verify-input-row" style={{ marginTop: 32 }}>
                    <input className="fi" type="text" value={emailCode} onChange={(e) => setEmailCode(e.target.value)} placeholder="인증 코드 입력" autoFocus disabled={loading} style={{ maxWidth: 280, textAlign: "center", fontSize: 18 }} />
                  </div>
                  <div className="btn-row" style={{ justifyContent: "center", maxWidth: 360, margin: "0 auto" }}>
                    <button type="button" className="btn-primary" onClick={confirmEmailVerification} disabled={loading}>
                      {loading ? <><Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} /> 확인 중...</> : <><ShieldCheck size={18} /> 인증 확인</>}
                    </button>
                  </div>
                  {error && (
                    <div className="inline-error">
                      <AlertCircle size={15} />
                      <span>{error}</span>
                    </div>
                  )}
                </>
              )}

              {emailVerified && (
                <>
                  <div className="verify-icon-wrap" style={{ background: "#f0fdf4" }}><CheckCircle2 size={32} style={{ color: "#22c55e" }} /></div>
                  <div style={{ fontSize: 28, fontWeight: 800, color: "#111", lineHeight: 1.4, marginBottom: 8 }}>
                    이메일 인증이 완료되었습니다
                  </div>
                  <div style={{ fontSize: 14, color: "#888", marginBottom: 4 }}>아래 버튼을 눌러 가입을 완료하세요</div>
                  <div className="btn-row" style={{ justifyContent: "center", maxWidth: 360, margin: "32px auto 0" }}>
                    <button type="submit" className="btn-primary" disabled={loading}>
                      {loading ? <><Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} /> 처리 중...</> : <><CheckCircle2 size={18} /> 가입 완료</>}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

      </form>
      </div>
      </div>
    </>
  );
}
