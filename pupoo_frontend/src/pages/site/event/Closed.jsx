import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Archive,
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  ImageOff,
  MapPin,
  MessageSquareText,
  Search,
  Star,
  Users,
  ArchiveX,
} from "lucide-react";
import PageHeader from "../components/PageHeader";
import PageLoading from "../components/PageLoading";
import EmptyState from "../components/EmptyState";
import { eventApi } from "../../../app/http/eventApi";
import { programApi } from "../../../app/http/programApi";
import { resolveImageUrl } from "../../../shared/utils/publicAssetUrl";
import { extractEventYear, normalizeEventTitle } from "../../../shared/utils/eventDisplay";

const SERVICE_CATEGORIES = [
  { label: "현재 진행 행사", path: "/event/current" },
  { label: "예정 행사", path: "/event/upcoming" },
  { label: "종료 행사", path: "/event/closed" },
  { label: "행사 사전 등록", path: "/event/preregister" },
  { label: "행사 일정 안내", path: "/event/eventschedule" },
];

const METRIC_COLORS = {
  participants: "#90C450",
  rate: "#3a4520",
  rating: "#f59e0b",
};

function fmtDate(value) {
  if (!value) return "일정 미정";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "일정 미정";
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`;
}

function fmtRange(startAt, endAt) {
  const start = fmtDate(startAt);
  const end = fmtDate(endAt);
  return start === end ? start : `${start} ~ ${end}`;
}

function fmtTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function fmtProgramSchedule(startAt, endAt) {
  const dateLabel = fmtDate(startAt);
  const startTime = fmtTime(startAt);
  const endTime = fmtTime(endAt);
  if (!startTime) return dateLabel;
  return `${dateLabel} ${startTime}${endTime ? ` - ${endTime}` : ""}`;
}

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function getProgramCategoryMeta(category) {
  const normalized = String(category || "").toUpperCase();
  if (normalized.includes("SESSION")) {
    return { label: "세션/강연", bg: "#f4f8ee", color: "#90C450" };
  }
  if (normalized.includes("EXPERIENCE")) {
    return { label: "체험존", bg: "#ecfdf5", color: "#059669" };
  }
  if (normalized.includes("CONTEST")) {
    return { label: "콘테스트", bg: "#fff7ed", color: "#ea580c" };
  }
  return { label: "프로그램", bg: "#f1f5f9", color: "#475569" };
}

function mapEvent(raw) {
  const participants = Number(raw?.participantCount ?? 0);
  const capacity = Number(raw?.capacity ?? 0);
  const participationRate = capacity > 0
    ? Math.round((participants / capacity) * 100)
    : Number(raw?.participationRate ?? 0);
  const rating = Number(raw?.averageRating ?? 0);

  return {
    id: Number(raw?.eventId),
    title: normalizeEventTitle(raw?.eventName || raw?.title, raw),
    description: raw?.description || "",
    startAt: raw?.startAt || null,
    endAt: raw?.endAt || null,
    dateLabel: fmtRange(raw?.startAt, raw?.endAt),
    year: extractEventYear(raw),
    month: raw?.startAt ? String(new Date(raw.startAt).getMonth() + 1) : null,
    location: raw?.location || "장소 미정",
    image: resolveImageUrl(raw?.imageUrl),
    participants,
    capacity,
    participationRate,
    rating,
    ratingText: rating.toFixed(1),
    reviewCount: Number(raw?.reviewCount ?? 0),
  };
}

function downloadResultImage(event) {
  if (!event) return;

  const W = 1200;
  const H = 720;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  /* ── helpers ── */
  const roundRect = (x, y, w, h, r) => {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  };
  const drawDonut = (cx, cy, r, strokeW, percent, trackColor, fillColor) => {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.strokeStyle = trackColor;
    ctx.lineWidth = strokeW;
    ctx.lineCap = "round";
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * percent) / 100);
    ctx.strokeStyle = fillColor;
    ctx.lineWidth = strokeW;
    ctx.lineCap = "round";
    ctx.stroke();
  };
  const drawStar = (cx, cy, size, fillRatio, emptyColor, fillColor) => {
    const pts = [];
    for (let i = 0; i < 10; i++) {
      const angle = (Math.PI / 2) * -1 + (Math.PI / 5) * i;
      const r = i % 2 === 0 ? size : size * 0.4;
      pts.push([cx + Math.cos(angle) * r, cy + Math.sin(angle) * r]);
    }
    const starPath = () => { ctx.beginPath(); pts.forEach(([x, y], i) => i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)); ctx.closePath(); };
    starPath(); ctx.fillStyle = emptyColor; ctx.fill();
    if (fillRatio > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(cx - size, cy - size, size * 2 * fillRatio, size * 2);
      ctx.clip();
      starPath(); ctx.fillStyle = fillColor; ctx.fill();
      ctx.restore();
    }
  };

  /* ── background ── */
  ctx.fillStyle = "#f8fafc";
  ctx.fillRect(0, 0, W, H);

  /* ── header bar ── */
  const hdrH = 130;
  const grad = ctx.createLinearGradient(0, 0, W, 0);
  grad.addColorStop(0, "#0f172a");
  grad.addColorStop(1, "#1e40af");
  ctx.fillStyle = grad;
  roundRect(0, 0, W, hdrH, 0);
  ctx.fill();

  ctx.fillStyle = "rgba(255,255,255,0.08)";
  ctx.fillRect(0, hdrH - 1, W, 1);

  ctx.fillStyle = "#94a3b8";
  ctx.font = "600 14px sans-serif";
  ctx.fillText("종료 행사 결과 리포트", 48, 42);

  ctx.fillStyle = "#ffffff";
  ctx.font = "800 32px sans-serif";
  ctx.fillText(event.title, 48, 82, W - 96);

  ctx.fillStyle = "rgba(255,255,255,0.6)";
  ctx.font = "500 15px sans-serif";
  ctx.fillText(`${event.dateLabel}  ·  ${event.location}`, 48, 112, W - 96);

  /* ── 4 metric cards ── */
  const metrics = [
    { label: "참가자", value: `${event.participants.toLocaleString()}명`, sub: "", color: "#90C450", bg: "#f4f8ee" },
    { label: "출석률(총참가자/사전등록자)", value: `${event.participationRate}%`, sub: "", color: "#3a4520", bg: "#ecfdf5" },
    { label: "별점", value: `${event.ratingText}`, sub: "/ 5.0", color: "#f59e0b", bg: "#fffbeb" },
    { label: "후기", value: `${event.reviewCount.toLocaleString()}건`, sub: "", color: "#6B7A3D", bg: "#f0f2e8" },
  ];
  const cardY = hdrH + 28;
  const cardW = (W - 48 * 2 - 16 * 3) / 4;
  const cardH = 100;

  metrics.forEach((m, i) => {
    const x = 48 + i * (cardW + 16);
    ctx.fillStyle = "#ffffff";
    roundRect(x, cardY, cardW, cardH, 16);
    ctx.fill();
    ctx.strokeStyle = "#e2e8f0";
    ctx.lineWidth = 1;
    roundRect(x, cardY, cardW, cardH, 16);
    ctx.stroke();

    /* color dot */
    ctx.beginPath();
    ctx.arc(x + 20, cardY + 28, 5, 0, Math.PI * 2);
    ctx.fillStyle = m.color;
    ctx.fill();

    ctx.fillStyle = "#64748b";
    ctx.font = "700 13px sans-serif";
    ctx.fillText(m.label, x + 32, cardY + 33);

    ctx.fillStyle = m.color;
    ctx.font = "900 30px sans-serif";
    ctx.fillText(m.value, x + 20, cardY + 76);

    if (m.sub) {
      const vw = ctx.measureText(m.value).width;
      ctx.fillStyle = "#94a3b8";
      ctx.font = "600 15px sans-serif";
      ctx.fillText(m.sub, x + 24 + vw, cardY + 76);
    }
  });

  /* ── bottom section: 3 visual charts ── */
  const btmY = cardY + cardH + 24;
  const btmH = H - btmY - 28;
  const colW = (W - 48 * 2 - 16 * 2) / 3;

  /* --- 참가자 달성률 donut --- */
  const d1x = 48;
  ctx.fillStyle = "#ffffff";
  roundRect(d1x, btmY, colW, btmH, 16);
  ctx.fill();
  ctx.strokeStyle = "#e2e8f0"; ctx.lineWidth = 1;
  roundRect(d1x, btmY, colW, btmH, 16); ctx.stroke();

  ctx.fillStyle = "#334155"; ctx.font = "800 14px sans-serif";
  ctx.fillText("참가자 달성률", d1x + 20, btmY + 30);

  const pct1 = 100;
  const donutCx1 = d1x + colW / 2;
  const donutCy1 = btmY + btmH / 2 + 8;
  const donutR1 = Math.min(colW, btmH) * 0.28;
  drawDonut(donutCx1, donutCy1, donutR1, 14, pct1, "#eef4e0", "#90C450");

  ctx.fillStyle = "#90C450"; ctx.font = "900 32px sans-serif"; ctx.textAlign = "center";
  ctx.fillText(`${Math.round(pct1)}%`, donutCx1, donutCy1 + 12);
  ctx.textAlign = "left";

  ctx.fillStyle = "#64748b"; ctx.font = "600 13px sans-serif"; ctx.textAlign = "center";
  ctx.fillText(`${event.participants.toLocaleString()}명`, donutCx1, btmY + btmH - 20);
  ctx.textAlign = "left";

  /* --- 별점 stars --- */
  const d2x = 48 + colW + 16;
  ctx.fillStyle = "#ffffff";
  roundRect(d2x, btmY, colW, btmH, 16); ctx.fill();
  ctx.strokeStyle = "#e2e8f0"; ctx.lineWidth = 1;
  roundRect(d2x, btmY, colW, btmH, 16); ctx.stroke();

  ctx.fillStyle = "#334155"; ctx.font = "800 14px sans-serif";
  ctx.fillText("별점", d2x + 20, btmY + 30);

  const starCy = btmY + btmH / 2;
  const starSize = 20;
  const starGap = 48;
  const starsStartX = d2x + colW / 2 - (4 * starGap) / 2;
  for (let i = 0; i < 5; i++) {
    const fill = Math.min(1, Math.max(0, event.rating - i));
    drawStar(starsStartX + i * starGap, starCy - 8, starSize, fill, "#e5e7eb", "#f59e0b");
  }

  ctx.fillStyle = "#f59e0b"; ctx.font = "900 32px sans-serif"; ctx.textAlign = "center";
  ctx.fillText(event.ratingText, d2x + colW / 2, starCy + 48);
  ctx.fillStyle = "#94a3b8"; ctx.font = "600 16px sans-serif";
  ctx.fillText("/ 5.0", d2x + colW / 2 + ctx.measureText(event.ratingText).width / 2 + 38, starCy + 48);
  ctx.textAlign = "left";

  /* --- 출석률 gauge --- */
  const d3x = 48 + (colW + 16) * 2;
  ctx.fillStyle = "#ffffff";
  roundRect(d3x, btmY, colW, btmH, 16); ctx.fill();
  ctx.strokeStyle = "#e2e8f0"; ctx.lineWidth = 1;
  roundRect(d3x, btmY, colW, btmH, 16); ctx.stroke();

  ctx.fillStyle = "#334155"; ctx.font = "800 14px sans-serif";
  ctx.fillText("출석률(총참가자/사전등록자)", d3x + 20, btmY + 30);

  const gaugeCx = d3x + colW / 2;
  const gaugeCy = btmY + btmH / 2 + 20;
  const gaugeR = Math.min(colW, btmH) * 0.3;
  const gaugeAngle = (clamp(event.participationRate) / 100) * Math.PI;

  ctx.beginPath();
  ctx.arc(gaugeCx, gaugeCy, gaugeR, Math.PI, 0);
  ctx.strokeStyle = "#f1f5f9"; ctx.lineWidth = 14; ctx.lineCap = "round"; ctx.stroke();

  ctx.beginPath();
  ctx.arc(gaugeCx, gaugeCy, gaugeR, Math.PI, Math.PI + gaugeAngle);
  ctx.strokeStyle = "#3a4520"; ctx.lineWidth = 14; ctx.lineCap = "round"; ctx.stroke();

  ctx.fillStyle = "#3a4520"; ctx.font = "900 32px sans-serif"; ctx.textAlign = "center";
  ctx.fillText(`${event.participationRate}%`, gaugeCx, gaugeCy + 4);

  ctx.fillStyle = "#94a3b8"; ctx.font = "600 12px sans-serif";
  ctx.textAlign = "left"; ctx.fillText("0%", gaugeCx - gaugeR - 4, gaugeCy + 22);
  ctx.textAlign = "right"; ctx.fillText("100%", gaugeCx + gaugeR + 4, gaugeCy + 22);
  ctx.textAlign = "left";

  /* ── watermark ── */
  ctx.fillStyle = "#cbd5e1";
  ctx.font = "600 11px sans-serif";
  ctx.textAlign = "right";
  ctx.fillText("POPUPS", W - 28, H - 14);
  ctx.textAlign = "left";

  /* ── download ── */
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${String(event.title).replace(/[\\/:*?"<>|]+/g, " ").trim()}-result.png`;
    link.click();
    URL.revokeObjectURL(url);
  }, "image/png");
}

/* ── Donut Ring (참가자수 / 출석률) ── */
function DonutStatCard({ icon, label, value, max, suffix = "", maxSuffix, color, bg, compact = false }) {
  const [animated, setAnimated] = useState(0);

  useEffect(() => {
    setAnimated(0);
    const start = performance.now();
    const duration = 1000;
    const tick = (now) => {
      const t = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - t, 3);
      setAnimated(ease * value);
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [value]);

  const animPercent = max > 0 ? Math.min(100, (animated / max) * 100) : 0;
  const r = compact ? 42 : 66;
  const stroke = compact ? 10 : 14;
  const circumference = 2 * Math.PI * r;
  const dashOffset = circumference - (circumference * animPercent) / 100;

  const display = Math.round(animated).toLocaleString();

  return (
    <div style={{ padding: compact ? "14px 14px 12px" : "22px 22px 18px", borderRadius: 18, border: "1px solid #e2e8f0", background: "#fff", display: "flex", flexDirection: "column", alignItems: "center" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: compact ? 10 : 16, alignSelf: "flex-start", minWidth: 0 }}>
        <div style={{ width: compact ? 28 : 34, height: compact ? 28 : 34, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", background: bg, flexShrink: 0 }}>
          {icon}
        </div>
        <div style={{ fontSize: compact ? 12 : 14, color: "#64748b", fontWeight: 700, lineHeight: 1.3, wordBreak: "keep-all" }}>{label}</div>
      </div>
      <div style={{ position: "relative", width: r * 2 + stroke, height: r * 2 + stroke, marginBottom: compact ? 8 : 12 }}>
        <svg width={r * 2 + stroke} height={r * 2 + stroke} style={{ transform: "rotate(-90deg)" }}>
          <circle cx={r + stroke / 2} cy={r + stroke / 2} r={r} fill="none" stroke="#f1f5f9" strokeWidth={stroke} />
          <circle cx={r + stroke / 2} cy={r + stroke / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
            strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={dashOffset}
            style={{ transition: "stroke-dashoffset 0.05s linear" }}
          />
        </svg>
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontSize: compact ? 14 : 18, fontWeight: 900, color }}>{display}{suffix}</span>
          {maxSuffix && <span style={{ fontSize: compact ? 10 : 11, color: "#94a3b8", fontWeight: 600, marginTop: 2 }}>{maxSuffix}</span>}
        </div>
      </div>
    </div>
  );
}

/* ── Star Rating (별점) ── */
function StarRatingCard({ label, value, color, bg, compact = false }) {
  const [animated, setAnimated] = useState(0);

  useEffect(() => {
    setAnimated(0);
    const start = performance.now();
    const duration = 1000;
    const tick = (now) => {
      const t = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - t, 3);
      setAnimated(ease * value);
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [value]);

  const starSize = compact ? 18 : 28;
  const stars = [];
  for (let i = 0; i < 5; i++) {
    const fill = Math.min(1, Math.max(0, animated - i));
    stars.push(
      <div key={i} style={{ position: "relative", width: starSize, height: starSize }}>
        <Star size={starSize} color="#e2e8f0" fill="#e2e8f0" strokeWidth={0} />
        <div style={{ position: "absolute", inset: 0, overflow: "hidden", width: `${fill * 100}%` }}>
          <Star size={starSize} color={color} fill={color} strokeWidth={0} />
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: compact ? "14px 14px 12px" : "22px 22px 18px", borderRadius: 18, border: "1px solid #e2e8f0", background: "#fff" }}>
      <div style={{ display: "flex", alignItems: "center", gap: compact ? 6 : 8, marginBottom: compact ? 10 : 16 }}>
        <div style={{ width: compact ? 28 : 34, height: compact ? 28 : 34, borderRadius: compact ? 8 : 10, display: "flex", alignItems: "center", justifyContent: "center", background: bg, flexShrink: 0 }}>
          <Star size={compact ? 13 : 16} color={color} />
        </div>
        <div style={{ fontSize: compact ? 12 : 14, color: "#64748b", fontWeight: 700 }}>{label}</div>
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 6 }}>
        <div style={{ display: "flex", gap: compact ? 2 : 4 }}>
          {stars}
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 3 }}>
          <span style={{ fontSize: compact ? 20 : 28, fontWeight: 900, color }}>{animated.toFixed(1)}</span>
          <span style={{ fontSize: compact ? 11 : 14, color: "#94a3b8", fontWeight: 600 }}>/ 5.0</span>
        </div>
      </div>
    </div>
  );
}

/* ── Bar Card (후기수) ── */
function BarStatCard({ icon, label, value, suffix = "", color, bg, compact = false }) {
  const [animated, setAnimated] = useState(0);

  useEffect(() => {
    setAnimated(0);
    const start = performance.now();
    const duration = 800;
    const tick = (now) => {
      const t = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - t, 3);
      setAnimated(ease * value);
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [value]);

  const [barWidth, setBarWidth] = useState(0);
  useEffect(() => {
    setBarWidth(0);
    const timer = setTimeout(() => setBarWidth(100), 50);
    return () => clearTimeout(timer);
  }, [value]);

  return (
    <div style={{ padding: compact ? "14px 14px 12px" : "22px 22px 18px", borderRadius: 18, border: "1px solid #e2e8f0", background: "#fff" }}>
      <div style={{ display: "flex", alignItems: "center", gap: compact ? 6 : 8, marginBottom: compact ? 10 : 16 }}>
        <div style={{ width: compact ? 28 : 34, height: compact ? 28 : 34, borderRadius: compact ? 8 : 10, display: "flex", alignItems: "center", justifyContent: "center", background: bg, flexShrink: 0 }}>
          {icon}
        </div>
        <div style={{ fontSize: compact ? 12 : 14, color: "#64748b", fontWeight: 700 }}>{label}</div>
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ width: "55%", height: compact ? 5 : 6, borderRadius: 3, background: "#f1f5f9", overflow: "hidden" }}>
          <div style={{
            height: "100%", borderRadius: 3, background: color,
            width: `${barWidth}%`,
            transition: "width 0.8s cubic-bezier(0.4, 0, 0.2, 1)",
          }} />
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
          <span style={{ fontSize: compact ? 20 : 28, fontWeight: 900, color }}>{Math.round(animated).toLocaleString()}</span>
          <span style={{ fontSize: compact ? 11 : 14, color: "#94a3b8", fontWeight: 600 }}>{suffix}</span>
        </div>
      </div>
    </div>
  );
}

const MONTH_LABELS = ["전체","1월","2월","3월","4월","5월","6월","7월","8월","9월","10월","11월","12월"];

function MonthDropdown({ month, setMonth }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  const label = month === "all" ? "" : MONTH_LABELS[Number(month)];
  const hasValue = month !== "all";

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          width: "100%", height: 52, padding: "0 16px",
          borderRadius: 14,
          border: open ? "2px solid #90C450" : "1.5px solid #e2e8f0",
          background: "#fff", cursor: "pointer",
          display: "flex", alignItems: "center", gap: 10,
          transition: "border-color 0.25s, box-shadow 0.25s",
          boxShadow: open ? "0 0 0 3px rgba(37,99,235,0.1)" : "none",
          position: "relative",
        }}
      >
        <Calendar size={16} color={open ? "#90C450" : "#94a3b8"} style={{ transition: "color 0.25s" }} />
        {!open && !hasValue && (
          <span style={{
            position: "absolute", left: 42, top: "50%",
            transform: "translateY(-50%)",
            fontSize: 15,
            color: "#94a3b8",
            fontWeight: 600, pointerEvents: "none",
          }}>월 선택</span>
        )}
        <span style={{
          flex: 1, textAlign: "left",
          fontSize: 15, fontWeight: 800, color: "#0f172a",
          opacity: hasValue ? 1 : 0, transition: "opacity 0.2s",
        }}>{label}</span>
        <ChevronDown size={16} color={open ? "#90C450" : "#94a3b8"}
          style={{ transition: "transform 0.25s, color 0.25s", transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
        />
      </button>
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0,
          background: "#fff", borderRadius: 14, border: "1.5px solid #e2e8f0",
          boxShadow: "0 12px 32px rgba(15,23,42,0.12)",
          zIndex: 50, padding: "6px",
          maxHeight: 260, overflowY: "auto",
        }}>
          {MONTH_LABELS.map((ml, idx) => {
            const val = idx === 0 ? "all" : String(idx);
            return (
              <button key={val} type="button"
                onClick={() => { setMonth(val); setOpen(false); }}
                style={{
                  width: "100%", padding: "10px 14px",
                  borderRadius: 10, border: "none",
                  background: month === val ? "#f4f8ee" : "transparent",
                  color: month === val ? "#90C450" : "#334155",
                  fontSize: 16, fontWeight: month === val ? 800 : 600,
                  cursor: "pointer", textAlign: "left",
                  transition: "background 0.15s",
                }}
              >{ml}</button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function Closed() {
  const navigate = useNavigate();
  const topSectionRef = useRef(null);
  const [events, setEvents] = useState([]);
  const [query, setQuery] = useState("");
  const [year, setYear] = useState("all");
  const [month, setMonth] = useState("all");
  const [selectedId, setSelectedId] = useState(null);
  const [programMap, setProgramMap] = useState({});
  const [programLoadingId, setProgramLoadingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [programFilter, setProgramFilter] = useState("전체");
  const [visibleCount, setVisibleCount] = useState(5);
  const [programVisibleCount, setProgramVisibleCount] = useState(3);
  const [searchFocused, setSearchFocused] = useState(false);
  const [yearOpen, setYearOpen] = useState(false);
  const yearDropRef = useRef(null);
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

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await eventApi.getClosedAnalytics();
        const rows = Array.isArray(res?.data?.data) ? res.data.data.map(mapEvent) : [];
        if (!mounted) return;
        setEvents(rows);
        setSelectedId(rows[0]?.id ?? null);
      } catch (err) {
        if (mounted) {
          setError(err?.response?.data?.message || "네트워크 연결을 확인하고 다시 시도해 주세요.");
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (yearDropRef.current && !yearDropRef.current.contains(e.target)) {
        setYearOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const years = useMemo(
    () => ["all", ...Array.from(new Set(events.map((event) => event.year).filter(Boolean))).sort((a, b) => Number(b) - Number(a))],
    [events],
  );

  const filtered = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return events.filter((event) => {
      const matchesKeyword =
        !keyword ||
        event.title.toLowerCase().includes(keyword) ||
        event.location.toLowerCase().includes(keyword);
      const matchesYear = year === "all" || event.year === year;
      const matchesMonth = month === "all" || event.month === month;
      return matchesKeyword && matchesYear && matchesMonth;
    });
  }, [events, query, year, month]);

  const isMobile = viewportWidth < 768;
  const isTablet = viewportWidth >= 768 && viewportWidth < 1024;
  const featuredEventCount = isMobile ? 4 : isTablet ? 6 : 8;
  const listLoadStep = isMobile ? 4 : 5;
  const programLoadStep = isMobile ? 3 : 6;

  useEffect(() => {
    setVisibleCount(listLoadStep);
    if (!filtered.length) {
      setSelectedId(null);
      return;
    }
    if (!filtered.some((event) => event.id === selectedId)) {
      setSelectedId(filtered[0].id);
    }
  }, [filtered, listLoadStep, selectedId]);

  const selected = filtered.find((event) => event.id === selectedId) ?? filtered[0] ?? null;
  const totalParticipants = filtered.reduce((sum, event) => sum + event.participants, 0);
  const avgRate = filtered.length ? filtered.reduce((sum, event) => sum + event.participationRate, 0) / filtered.length : 0;
  const avgRating = filtered.length ? filtered.reduce((sum, event) => sum + event.rating, 0) / filtered.length : 0;
  const avgReviewCount = filtered.length ? filtered.reduce((sum, event) => sum + event.reviewCount, 0) / filtered.length : 0;

  useEffect(() => {
    if (!selected?.id || programMap[selected.id]) return;

    let mounted = true;
    const loadPrograms = async () => {
      setProgramLoadingId(selected.id);
      try {
        const rows = await programApi.getAllProgramsByEvent({
          eventId: selected.id,
          sort: "startAt,asc",
          pageSize: 100,
        });
        if (!mounted) return;
        setProgramMap((prev) => ({
          ...prev,
          [selected.id]: Array.isArray(rows) ? rows : [],
        }));
      } catch (err) {
        if (!mounted) return;
        console.error("[Closed] program load failed:", err);
        setProgramMap((prev) => ({
          ...prev,
          [selected.id]: [],
        }));
      } finally {
        if (mounted) {
          setProgramLoadingId((prev) => (prev === selected.id ? null : prev));
        }
      }
    };

    loadPrograms();
    return () => {
      mounted = false;
    };
  }, [programMap, selected?.id]);

  const selectedPrograms = useMemo(() => {
    return Array.isArray(programMap[selected?.id]) ? programMap[selected.id] : [];
  }, [programMap, selected]);

  const selectedProgramSummary = useMemo(() => {
    return selectedPrograms.reduce((acc, program) => {
      const meta = getProgramCategoryMeta(program?.category);
      acc.total += 1;
      acc[meta.label] = (acc[meta.label] || 0) + 1;
      return acc;
    }, { total: 0 });
  }, [selectedPrograms]);

  const filteredPrograms = useMemo(() => {
    if (programFilter === "전체") return selectedPrograms;
    return selectedPrograms.filter((p) => getProgramCategoryMeta(p?.category).label === programFilter);
  }, [selectedPrograms, programFilter]);

  const visiblePrograms = isMobile
    ? filteredPrograms.slice(0, programVisibleCount)
    : filteredPrograms;

  useEffect(() => {
    setProgramVisibleCount(programLoadStep);
  }, [selected?.id, programFilter, programLoadStep]);

  const handleDownload = useCallback(() => {
    if (!selected || downloading) return;
    setDownloading(true);
    setTimeout(() => {
      downloadResultImage(selected);
      setTimeout(() => setDownloading(false), 600);
    }, 400);
  }, [selected, downloading]);

  const handleSelectEvent = useCallback((eventId) => {
    setSelectedId(eventId);
    setProgramFilter("전체");
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", fontFamily: "'Noto Sans KR', sans-serif" }}>
      <style>{`
        .closed-prog-scroll { scrollbar-width: thin; scrollbar-color: transparent transparent; }
        .closed-prog-scroll:hover { scrollbar-color: rgba(0,0,0,0.15) transparent; }
        .closed-prog-scroll::-webkit-scrollbar { width: 6px; }
        .closed-prog-scroll::-webkit-scrollbar-track { background: transparent; }
        .closed-prog-scroll::-webkit-scrollbar-thumb { background: transparent; border-radius: 999px; transition: background 0.3s; }
        .closed-prog-scroll:hover::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.15); }
        .closed-prog-scroll::-webkit-scrollbar-thumb:hover { background: rgba(0,0,0,0.25); }
        @keyframes closed-scroll-bounce {
          0%, 100% { transform: translateY(0); opacity: 0.4; }
          50% { transform: translateY(5px); opacity: 1; }
        }
        .closed-scroll-hint { animation: closed-scroll-bounce 1.8s ease-in-out infinite; }
      `}</style>
      <PageHeader
        title="종료 행사"
        subtitle="종료된 행사 결과를 행사별 그래프로 확인하세요"
        icon={<ArchiveX size={42} color="#90C450" strokeWidth={1.6} />}
        titleStyle={{
          fontSize: isMobile ? 30 : isTablet ? 38 : 46,
          lineHeight: isMobile ? "1.25" : isTablet ? "52px" : "66px",
          letterSpacing: isMobile ? "-0.04em" : "-1px",
        }}
        subtitleStyle={{ fontSize: isMobile ? 14 : isTablet ? 17 : 20 }}
        categories={SERVICE_CATEGORIES}
        currentPath="/event/closed"
        onNavigate={(path) => navigate(path)}
      />

      <main
        style={{
          width: isMobile ? "calc(100% - 24px)" : "min(1400px, calc(100% - 40px))",
          margin: "0 auto",
          padding: isMobile ? "18px 0 48px" : isTablet ? "24px 0 60px" : "32px 0 72px",
        }}
      >
        {loading ? <PageLoading /> : null}
        {!loading && error ? <EmptyState type="error" message="종료 행사를 불러오지 못했습니다" description="네트워크 연결을 확인하고 다시 시도해 주세요." /> : null}
        {!loading && !error ? (
          <>
            <div
              style={{
                display: "flex",
                gap: 12,
                alignItems: isMobile ? "stretch" : "center",
                justifyContent: "flex-end",
                flexDirection: isMobile ? "column" : "row",
                marginBottom: 18,
              }}
            >
              {/* 연도 선택 드롭다운 */}
              <div
                ref={yearDropRef}
                style={{ position: "relative", minWidth: isMobile ? 0 : 180, width: isMobile ? "100%" : undefined }}
              >
                <button
                  type="button"
                  onClick={() => setYearOpen((v) => !v)}
                  style={{
                    width: "100%", height: 52, padding: "0 16px",
                    borderRadius: 14,
                    border: yearOpen ? "2px solid #90C450" : "1.5px solid #e2e8f0",
                    background: "#fff", cursor: "pointer",
                    display: "flex", alignItems: "center", gap: 10,
                    transition: "border-color 0.25s, box-shadow 0.25s",
                    boxShadow: yearOpen ? "0 0 0 3px rgba(37,99,235,0.1)" : "none",
                    position: "relative",
                  }}
                >
                  <Calendar size={16} color={yearOpen ? "#90C450" : "#94a3b8"} style={{ transition: "color 0.25s" }} />
                  {!yearOpen && year === "all" && (
                    <span style={{
                      position: "absolute", left: 42, top: "50%",
                      transform: "translateY(-50%)",
                      fontSize: 15,
                      color: "#94a3b8",
                      fontWeight: 600,
                      pointerEvents: "none",
                    }}>연도 선택</span>
                  )}
                  <span style={{
                    flex: 1, textAlign: "left",
                    fontSize: 15, fontWeight: 800, color: "#0f172a",
                    opacity: year !== "all" ? 1 : 0,
                    transition: "opacity 0.2s",
                  }}>
                    {year === "all" ? "" : `${year}년`}
                  </span>
                  <ChevronDown
                    size={16} color={yearOpen ? "#90C450" : "#94a3b8"}
                    style={{
                      transition: "transform 0.25s, color 0.25s",
                      transform: yearOpen ? "rotate(180deg)" : "rotate(0deg)",
                    }}
                  />
                </button>
                {yearOpen && (
                  <div style={{
                    position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0,
                    background: "#fff", borderRadius: 14,
                    border: "1.5px solid #e2e8f0",
                    boxShadow: "0 12px 32px rgba(15,23,42,0.12)",
                    zIndex: 50, padding: "6px",
                    maxHeight: 260, overflowY: "auto",
                  }}>
                    {years.map((value) => (
                      <button
                        key={value} type="button"
                        onClick={() => { setYear(value); setMonth("all"); setYearOpen(false); }}
                        style={{
                          width: "100%", padding: "10px 14px",
                          borderRadius: 10, border: "none",
                          background: year === value ? "#f4f8ee" : "transparent",
                          color: year === value ? "#90C450" : "#334155",
                          fontSize: 16, fontWeight: year === value ? 800 : 600,
                          cursor: "pointer", textAlign: "left",
                          transition: "background 0.15s",
                        }}
                      >
                        {value === "all" ? "전체 연도" : `${value}년`}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* 월 선택 드롭다운 - 연도 선택 시에만 */}
              {year !== "all" && (
                <div style={{ position: "relative", minWidth: isMobile ? 0 : 140, width: isMobile ? "100%" : undefined }}>
                  <MonthDropdown month={month} setMonth={setMonth} />
                </div>
              )}

              {/* 검색창 */}
              <div style={{ position: "relative", width: isMobile ? "100%" : 280 }}>
                <Search
                  size={16}
                  color={searchFocused ? "#90C450" : "#94a3b8"}
                  style={{
                    position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)",
                    transition: "color 0.25s", zIndex: 1,
                  }}
                />
                {!searchFocused && !query && (
                  <span style={{
                    position: "absolute", left: 38,
                    top: "50%",
                    transform: "translateY(-50%)",
                    fontSize: 15,
                    color: "#94a3b8",
                    fontWeight: 600,
                    pointerEvents: "none", zIndex: 1,
                  }}>행사 검색</span>
                )}
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  onFocus={() => setSearchFocused(true)}
                  onBlur={() => setSearchFocused(false)}
                  style={{
                    width: "100%", height: 44,
                    borderRadius: 12,
                    border: searchFocused ? "2px solid #90C450" : "1.5px solid #e2e8f0",
                    padding: "0 14px 0 38px",
                    fontSize: 15, fontWeight: 700, color: "#0f172a",
                    background: "#fff", outline: "none",
                    transition: "border-color 0.25s, box-shadow 0.25s",
                    boxShadow: searchFocused ? "0 0 0 3px rgba(37,99,235,0.1)" : "none",
                    fontFamily: "inherit",
                  }}
                />
              </div>
            </div>

            {/* ── 종료 행사 선택 카드 ── */}
            {filtered.length > 0 && (
              <section style={{ marginBottom: 28, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 20, overflow: "hidden" }}>
                <div
                  style={{
                    padding: isMobile ? "16px" : "18px 24px",
                    borderBottom: "1px solid #f1f5f9",
                    display: "flex",
                    alignItems: isMobile ? "flex-start" : "center",
                    justifyContent: "space-between",
                    flexDirection: isMobile ? "column" : "row",
                    gap: isMobile ? 10 : 12,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Archive size={16} color="#94a3b8" />
                    <span style={{ fontSize: 15, fontWeight: 700, color: "#555" }}>종료 행사</span>
                    <span style={{ fontSize: 14, fontWeight: 600, color: "#bbb" }}>{filtered.length}</span>
                  </div>
                  {selected && (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 999, background: "#90C450", color: "#fff", fontSize: 13, fontWeight: 700, maxWidth: "100%" }}>
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#fff", opacity: 0.6 }} />
                      {selected.title}
                    </span>
                  )}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : isTablet ? "repeat(2, minmax(0, 1fr))" : "repeat(4, 1fr)", gap: 0 }}>
                  {filtered.slice(0, featuredEventCount).map((event, idx) => {
                    const active = event.id === selected?.id;
                    return (
                      <button
                        key={event.id}
                        type="button"
                        onClick={() => handleSelectEvent(event.id)}
                        style={{
                          position: "relative",
                          border: "none",
                          borderRight: !isMobile && ((isTablet && idx % 2 !== 1) || (!isTablet && idx % 4 !== 3)) ? "1px solid #f1f5f9" : "none",
                          borderBottom: "1px solid #f1f5f9",
                          borderLeft: active ? "3px solid #90C450" : "3px solid transparent",
                          background: active ? "#f4f8ee" : "#fff",
                          padding: isMobile ? "16px" : "20px 20px",
                          cursor: "pointer",
                          textAlign: "left",
                          transition: "all 0.15s",
                        }}
                        onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = "#fafafa"; }}
                        onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = "#fff"; }}
                      >
                        <div style={{
                          fontSize: 15, fontWeight: 700, color: active ? "#90C450" : "#555",
                          lineHeight: 1.45,
                          display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
                          marginBottom: 12,
                        }}>
                          {event.title}
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 13, color: "#999" }}>
                            <Calendar size={11} /> {event.dateLabel}
                          </span>
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 13, color: "#999", minWidth: 0, whiteSpace: isMobile ? "normal" : "nowrap", overflow: "hidden", textOverflow: isMobile ? "clip" : "ellipsis" }}>
                            <MapPin size={11} /> {event.location}
                          </span>
                        </div>
                        <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 6 }}>
                          <Star size={12} fill={event.rating > 0 ? "#f59e0b" : "#e5e7eb"} color={event.rating > 0 ? "#f59e0b" : "#e5e7eb"} />
                          <span style={{ fontSize: 13, fontWeight: 700, color: "#aaa" }}>{event.ratingText}</span>
                          <span style={{ fontSize: 12, color: "#ddd" }}>·</span>
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 13, color: "#aaa", fontWeight: 600 }}><Users size={11} />{event.participants.toLocaleString()}명</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
                {filtered.length > featuredEventCount && (
                  <div style={{ textAlign: "center", padding: "14px 0", borderTop: "1px solid #f1f5f9" }}>
                    <span style={{ fontSize: 13, color: "#94a3b8" }}>아래 목록에서 더 많은 행사를 확인하세요</span>
                  </div>
                )}
              </section>
            )}

            {selected ? (
              <>
                <section
                  ref={topSectionRef}
                  style={{
                    display: "grid",
                    gridTemplateColumns: isMobile ? "1fr" : "minmax(320px, 0.82fr) minmax(0, 1.18fr)",
                    gap: 18,
                    marginBottom: 18,
                  }}
                >
                  <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 24, overflow: "hidden", boxShadow: "0 18px 36px rgba(15,23,42,0.05)", minHeight: isMobile ? 220 : 420 }}>
                    {selected.image ? (
                      <img src={resolveImageUrl(selected.image)} alt={selected.title} style={{ width: "100%", height: "100%", minHeight: isMobile ? 220 : 420, maxHeight: isMobile ? 300 : "none", objectFit: "cover", display: "block" }} />
                    ) : (
                      <div style={{ minHeight: isMobile ? 220 : 420, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, color: "#94a3b8", background: "linear-gradient(180deg, #f8fafc 0%, #f4f8ee 100%)" }}>
                        <ImageOff size={36} />
                        <span style={{ fontSize: 15, fontWeight: 700 }}>행사 이미지가 없습니다.</span>
                      </div>
                    )}
                  </div>

                  <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 24, overflow: "hidden", boxShadow: "0 18px 36px rgba(15,23,42,0.05)" }}>
                    <div style={{ padding: isMobile ? "18px 16px" : "26px 28px", borderBottom: "1px solid #eef2f7", background: "linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: isMobile ? "stretch" : "flex-start", flexDirection: isMobile ? "column" : "row", gap: 12 }}>
                        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 12px", borderRadius: 999, background: "#f4f8ee", color: "#6B7A3D", fontSize: 15, fontWeight: 500 }}>
                          <Archive size={12} /> 선택된 종료 행사
                        </div>
                        <button
                          type="button"
                          onClick={handleDownload}
                          disabled={downloading}
                          style={{
                            height: 38, padding: "0 16px", borderRadius: 12,
                            border: "none",
                            background: downloading ? "#94a3b8" : "linear-gradient(135deg, #0f172a, #334155)",
                            color: "#fff",
                            display: "inline-flex", alignItems: "center", gap: 8,
                            fontSize: 15, fontWeight: 700, cursor: downloading ? "default" : "pointer",
                            width: isMobile ? "100%" : "auto",
                            justifyContent: "center",
                            transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                            transform: downloading ? "scale(0.95)" : "scale(1)",
                            opacity: downloading ? 0.8 : 1,
                            boxShadow: downloading ? "none" : "0 4px 12px rgba(15,23,42,0.15)",
                          }}
                        >
                          <Download
                            size={14}
                            style={{
                              transition: "transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                              transform: downloading ? "translateY(3px)" : "translateY(0)",
                            }}
                          />
                          {downloading ? "다운로드 중..." : "결과 이미지"}
                        </button>
                      </div>
                      <h2 style={{ margin: "14px 0 10px", fontSize: isMobile ? 24 : 36, lineHeight: 1.2, fontWeight: 900, color: "#0f172a" }}>{selected.title}</h2>
                      <div style={{ display: "flex", gap: isMobile ? 10 : 16, flexWrap: "wrap", color: "#64748b", fontSize: isMobile ? 13 : 15 }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><Calendar size={14} /> {selected.dateLabel}</span>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><MapPin size={14} /> {selected.location}</span>
                      </div>
                    </div>
                    <div style={{ padding: isMobile ? 16 : 28 }}>
                      <p style={{ margin: 0, fontSize: isMobile ? 14 : 16, lineHeight: 1.8, color: "#475569" }}>
                        {selected.description || "등록된 행사 설명이 없습니다."}
                      </p>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: isMobile ? 10 : 14, marginTop: 22 }}>
                        <DonutStatCard
                          icon={<Users size={isMobile ? 13 : 16} color="#90C450" />}
                          label="참가자수"
                          value={selected.participants}
                          max={Math.max(selected.participants || 0, 1)}
                          suffix="명"
                          color="#90C450"
                          bg="#f4f8ee"
                          compact={isMobile}
                        />
                        <DonutStatCard
                          icon={<Calendar size={isMobile ? 13 : 16} color="#3a4520" />}
                          label={isMobile ? "출석률" : "출석률(총참가자/사전등록자)"}
                          value={selected.participationRate}
                          max={100}
                          suffix="%"
                          color="#3a4520"
                          bg="#ecfdf5"
                          compact={isMobile}
                        />
                        <StarRatingCard
                          label="별점"
                          value={selected.rating}
                          color="#f59e0b"
                          bg="#fffbeb"
                          compact={isMobile}
                        />
                        <BarStatCard
                          icon={<MessageSquareText size={isMobile ? 13 : 16} color="#6B7A3D" />}
                          label="후기 수"
                          value={selected.reviewCount}
                          suffix="건"
                          color="#6B7A3D"
                          bg="#f0f2e8"
                          compact={isMobile}
                        />
                      </div>
                      <div style={{ marginTop: 24, paddingTop: 22, borderTop: "1px solid #eef2f7" }}>
                        <div>
                          <div style={{ fontSize: 20, fontWeight: 900, color: "#0f172a" }}>이 행사에 포함된 프로그램</div>
                          <div style={{ marginTop: 6, fontSize: 15, color: "#64748b" }}>행사와 함께 운영된 프로그램을 카테고리별로 확인할 수 있습니다.</div>
                          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14 }}>
                            <button
                              type="button"
                              onClick={() => setProgramFilter("전체")}
                              style={{
                                padding: isMobile ? "7px 14px" : "10px 26px", borderRadius: 999, border: "none", cursor: "pointer",
                                background: programFilter === "전체" ? "#1e293b" : "rgb(241,241,241)",
                                color: programFilter === "전체" ? "#fff" : "rgb(51,65,85)",
                                fontSize: isMobile ? 13 : 15, fontWeight: programFilter === "전체" ? 700 : 500, transition: "all 0.2s",
                              }}
                            >
                              전체 {selectedProgramSummary.total || 0}개
                            </button>
                            {Object.entries(selectedProgramSummary)
                              .filter(([key]) => key !== "total")
                              .map(([key, value]) => (
                                <button
                                  type="button"
                                  key={key}
                                  onClick={() => setProgramFilter(key)}
                                  style={{
                                    padding: isMobile ? "7px 14px" : "10px 26px", borderRadius: 999, border: "none", cursor: "pointer",
                                    background: programFilter === key ? "#1e293b" : "rgb(241,241,241)",
                                    color: programFilter === key ? "#fff" : "rgb(51,65,85)",
                                    fontSize: isMobile ? 13 : 15, fontWeight: programFilter === key ? 700 : 500, transition: "all 0.2s",
                                  }}
                                >
                                  {key} {value}개
                                </button>
                              ))}
                          </div>
                        </div>

                        {programLoadingId === selected.id ? (
                          <div style={{ padding: "28px 0 10px", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
                            <style>{`@keyframes cdot{0%,80%,100%{transform:scale(0)}40%{transform:scale(1)}}`}</style>
                            <div style={{ display: "inline-flex", gap: 6 }}>
                              <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#bcc3ce", animation: "cdot 1.4s ease-in-out -0.32s infinite both" }} />
                              <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#bcc3ce", animation: "cdot 1.4s ease-in-out -0.16s infinite both" }} />
                              <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#bcc3ce", animation: "cdot 1.4s ease-in-out 0s infinite both" }} />
                            </div>
                            <span style={{ fontSize: 14, fontWeight: 500, color: "#adb5bd" }}>프로그램 목록을 불러오는 중입니다</span>
                          </div>
                        ) : filteredPrograms.length === 0 ? (
                          <div style={{ padding: "28px 0 10px", fontSize: 15, color: "#94a3b8" }}>연결된 프로그램이 없습니다.</div>
                        ) : (
                          <div style={{ marginTop: 18 }}>
                            <div className="closed-prog-scroll" style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(2, minmax(0, 1fr))", gap: 12, maxHeight: isMobile ? "none" : 440, overflowY: isMobile ? "visible" : "auto", paddingRight: isMobile ? 0 : 4 }}>
                              {visiblePrograms.map((program, index) => {
                                const categoryMeta = getProgramCategoryMeta(program?.category);
                                return (
                                  <div
                                    key={program?.programId || `${selected.id}-${index}`}
                                    style={{
                                      border: "1px solid #eee",
                                      borderRadius: 14,
                                      padding: "20px 20px",
                                      background: "#fff",
                                      display: "flex",
                                      flexDirection: "column",
                                      gap: 14,
                                      transition: "background 0.15s",
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = "#fafafa"}
                                    onMouseLeave={(e) => e.currentTarget.style.background = "#fff"}
                                  >
                                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                        <div style={{ width: 8, height: 8, borderRadius: "50%", background: categoryMeta.color, flexShrink: 0 }} />
                                        <span style={{ fontSize: 13, fontWeight: 700, color: categoryMeta.color, letterSpacing: "0.02em" }}>
                                          {categoryMeta.label}
                                        </span>
                                      </div>
                                      <span style={{ fontSize: 13, fontWeight: 600, color: "#ccc" }}>
                                        {String(index + 1).padStart(2, "0")}
                                      </span>
                                    </div>
                                    <div style={{ fontSize: 17, fontWeight: 700, color: "#111", lineHeight: 1.5 }}>
                                      {program?.programTitle || "프로그램"}
                                    </div>
                                    <div style={{ display: "flex", gap: 14, fontSize: 14, color: "#999", flexDirection: isMobile ? "column" : "row" }}>
                                      <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                                        <Calendar size={12} />
                                        {fmtProgramSchedule(program?.startAt, program?.endAt)}
                                      </span>
                                      <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                                        <MapPin size={12} />
                                        {program?.location || program?.boothName || "프로그램 공간"}
                                      </span>
                                    </div>
                                    <div
                                      style={{
                                        fontSize: 14.5,
                                        lineHeight: 1.7,
                                        color: "#888",
                                        display: "-webkit-box",
                                        WebkitLineClamp: 2,
                                        WebkitBoxOrient: "vertical",
                                        overflow: "hidden",
                                      }}
                                    >
                                      {program?.description || "상세 설명이 없습니다."}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                            {isMobile && filteredPrograms.length > visiblePrograms.length && (
                              <div style={{ paddingTop: 14 }}>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setProgramVisibleCount((prev) =>
                                      Math.min(prev + programLoadStep, filteredPrograms.length),
                                    )
                                  }
                                  style={{
                                    width: "100%",
                                    minHeight: 42,
                                    borderRadius: 12,
                                    border: "1px solid #dbe3ee",
                                    background: "#f8fafc",
                                    color: "#475569",
                                    fontSize: 13,
                                    fontWeight: 700,
                                    cursor: "pointer",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    gap: 8,
                                  }}
                                >
                                  <ChevronDown size={14} />
                                  프로그램 더보기 ({filteredPrograms.length - visiblePrograms.length}개 남음)
                                </button>
                              </div>
                            )}
                            {!isMobile && filteredPrograms.length > 4 && (
                              <div style={{ textAlign: "center", padding: "24px 0 12px" }}>
                                <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 14, color: "#94a3b8", fontWeight: 500, letterSpacing: "0.5px" }}>
                                  <ChevronDown size={14} /> 스크롤하여 더보기 ({filteredPrograms.length - 4}개 더)
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </section>



              </>
            ) : null}

            <section style={{ borderRadius: 24, border: "1px solid #e2e8f0", background: "#fff", overflow: "hidden", boxShadow: "0 18px 36px rgba(15,23,42,0.05)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: isMobile ? "flex-start" : "center", flexDirection: isMobile ? "column" : "row", gap: isMobile ? 8 : 12, padding: isMobile ? "16px" : "20px 24px", borderBottom: "1px solid #e2e8f0" }}>
                <div style={{ fontSize: 16, fontWeight: 900, color: "#0f172a" }}>종료 행사 목록</div>
                <div style={{ fontSize: 12, color: "#94a3b8" }}>{filtered.length}개 행사</div>
              </div>
              {filtered.length === 0 ? (
                <EmptyState message={query ? `"${query}" 검색 결과가 없습니다` : "조건에 맞는 종료 행사가 없습니다"} description={query ? "다른 검색어로 다시 시도해 보세요" : "연도 또는 월 필터를 변경해 보세요"} />
              ) : (
                <>
                  <div style={{ display: "grid", gap: 0 }}>
                    {filtered.slice(0, visibleCount).map((event) => {
                      const active = event.id === selected?.id;
                      return (
                        <div key={event.id} style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "minmax(0, 1fr) 170px 110px 140px 110px", alignItems: "center", gap: isMobile ? 12 : 16, padding: isMobile ? "16px" : "16px 24px", borderTop: "1px solid #f1f5f9", background: active ? "#f4f8ee" : "#f9fafb" }}>
                          <button type="button" onClick={() => handleSelectEvent(event.id)} style={{ border: "none", background: "none", padding: 0, textAlign: "left", cursor: "pointer", display: "grid", gap: 6 }}>
                            <div style={{ fontSize: 15, fontWeight: 600, color: "rgb(121,121,121)" }}>{event.title}</div>
                            <div style={{ fontSize: 12, color: "rgb(121,121,121)" }}>{event.dateLabel} · {event.location}</div>
                          </button>
                          <div style={{ display: "grid", gap: 4 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                              <Users size={11} color="#90C450" />
                              <span style={{ fontSize: 13, fontWeight: 800, color: "rgb(121,121,121)" }}>{event.participants.toLocaleString()}명</span>
                            </div>
                            <div style={{ width: "100%", height: 4, borderRadius: 2, background: "#e5e7eb", overflow: "hidden" }}>
                              <div style={{ height: "100%", borderRadius: 2, background: "#90C450", width: `${clamp((event.participants / Math.max(event.capacity || 0, event.participants || 0, 1)) * 100)}%`, transition: "width 0.3s" }} />
                            </div>
                          </div>
                          {(() => {
                            const r = event.participationRate;
                            const rateColor = r >= 70 ? "#3a4520" : r >= 40 ? "#f59e0b" : "#ef4444";
                            const ratePercent = clamp(r);
                            const miniR = 10;
                            const miniC = 2 * Math.PI * miniR;
                            const miniOff = miniC - (ratePercent / 100) * miniC;
                            return (
                              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                <svg width={26} height={26} style={{ transform: "rotate(-90deg)" }}>
                                  <circle cx={13} cy={13} r={miniR} fill="none" stroke="#e5e7eb" strokeWidth={3} />
                                  <circle cx={13} cy={13} r={miniR} fill="none" stroke={rateColor} strokeWidth={3} strokeLinecap="round" strokeDasharray={miniC} strokeDashoffset={miniOff} />
                                </svg>
                                <span style={{ fontSize: 13, fontWeight: 800, color: "rgb(121,121,121)" }}>{r}%</span>
                              </div>
                            );
                          })()}
                          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            {[0, 1, 2, 3, 4].map((i) => {
                              const fill = Math.min(1, Math.max(0, event.rating - i));
                              return (
                                <div key={i} style={{ position: "relative", width: 14, height: 14 }}>
                                  <svg width={14} height={14} viewBox="0 0 24 24">
                                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="#e5e7eb" />
                                  </svg>
                                  <div style={{ position: "absolute", inset: 0, overflow: "hidden", width: `${fill * 100}%` }}>
                                    <svg width={14} height={14} viewBox="0 0 24 24" style={{ minWidth: 14 }}>
                                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="#f59e0b" />
                                    </svg>
                                  </div>
                                </div>
                              );
                            })}
                            <span style={{ fontSize: 12, color: "rgb(121,121,121)", fontWeight: 700, marginLeft: 2 }}>{event.ratingText}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleSelectEvent(event.id)}
                            style={{
                              justifySelf: isMobile ? "stretch" : "end", height: 40, padding: isMobile ? "0 16px" : "5px 25px", borderRadius: 999,
                              border: "none",
                              background: active ? "#1e293b" : "rgb(235,235,235)",
                              color: active ? "#fff" : "rgb(89,89,89)",
                              fontSize: 12, fontWeight: 800, cursor: "pointer",
                              display: "inline-flex", alignItems: "center", gap: 5,
                              transition: "all 0.2s",
                            }}
                            onMouseEnter={(e) => { if (!active) { e.currentTarget.style.background = "#d4d4d4"; } }}
                            onMouseLeave={(e) => { if (!active) { e.currentTarget.style.background = "rgb(235,235,235)"; } }}
                          >
                            {active ? <ChevronRight size={12} /> : null}
                            {active ? "선택됨" : "결과 보기"}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                  {visibleCount < filtered.length && (
                    <div style={{ padding: isMobile ? "16px" : "16px 24px", borderTop: "1px solid #f1f5f9" }}>
                      <button
                        type="button"
                        onClick={() => setVisibleCount((v) => v + listLoadStep)}
                        style={{
                          width: "100%", height: 44, borderRadius: 12,
                          border: "1.5px solid #e2e8f0", background: "#f8fafc",
                          color: "#475569", fontSize: 16, fontWeight: 700,
                          cursor: "pointer", display: "flex", alignItems: "center",
                          justifyContent: "center", gap: 8,
                          transition: "all 0.2s",
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = "#f4f8ee"; e.currentTarget.style.borderColor = "#90C450"; e.currentTarget.style.color = "#90C450"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = "#f8fafc"; e.currentTarget.style.borderColor = "#e2e8f0"; e.currentTarget.style.color = "#475569"; }}
                      >
                        <ChevronDown size={16} />
                        더보기 ({Math.min(5, filtered.length - visibleCount)}개)
                      </button>
                    </div>
                  )}
                </>
              )}
            </section>
          </>
        ) : null}
      </main>
    </div>
  );
}
