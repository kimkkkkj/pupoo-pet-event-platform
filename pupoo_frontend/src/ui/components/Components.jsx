import { useState, useRef, useEffect } from "react";
import {
  Search,
  Filter,
  Download,
  ArrowUpRight,
  ArrowDownRight,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  CalendarDays,
} from "lucide-react";
import ds, { cardStyle } from "@/ui/tokens/designTokens";

function useResponsiveViewport() {
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

  return {
    isMobile: viewportWidth < 768,
    isTablet: viewportWidth >= 768 && viewportWidth < 1024,
    isCompact: viewportWidth < 1024,
  };
}

export function Pill({ color, bg, children }) {
  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 600,
        padding: "2px 9px",
        borderRadius: 6,
        background: bg,
        color,
        lineHeight: "18px",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}

export function Bar2({ pct, color, h = 5 }) {
  return (
    <div
      style={{
        height: h,
        borderRadius: h,
        background: ds.lineSoft,
        overflow: "hidden",
        flex: 1,
      }}
    >
      <div
        style={{
          width: `${pct}%`,
          height: "100%",
          borderRadius: h,
          background: color,
          transition: "width .6s cubic-bezier(.22,1,.36,1)",
        }}
      />
    </div>
  );
}

export function IconBox({ icon: I, color, bg, size = 34 }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 9,
        background: bg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <I size={size * 0.47} color={color} strokeWidth={2} />
    </div>
  );
}

export function ChartTip({
  active,
  payload,
  label,
  suffix = "",
  light = false,
  showName = false,
}) {
  if (!active || !payload?.length) return null;
  const background = light ? "#f8fafc" : ds.ink;
  const textColor = light ? ds.ink : "#fff";
  const labelColor = light ? ds.ink4 : "rgba(255,255,255,0.55)";

  return (
    <div
      style={{
        background,
        color: textColor,
        padding: "8px 14px",
        borderRadius: 10,
        fontSize: 12,
        fontWeight: 600,
        fontFamily: ds.ff,
        boxShadow: ds.sh2,
        border: light ? `1px solid ${ds.line}` : "none",
      }}
    >
      <div style={{ color: labelColor, fontSize: 11, marginBottom: 2 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, color: labelColor }}>
          {showName ? (
            <span
              style={{
                width: 24,
                height: 0,
                borderTopWidth: 2,
                borderTopStyle:
                  /lstm/i.test(String(p?.name || "")) ||
                  (typeof p?.strokeDasharray === "string" &&
                    p.strokeDasharray.trim().length > 0)
                    ? "dashed"
                    : "solid",
                borderTopColor: p.color || p.stroke,
                flexShrink: 0,
              }}
            />
          ) : (
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: 2,
                background: p.color || p.stroke,
                flexShrink: 0,
              }}
            />
          )}
          {showName && p.name ? <span>{p.name}</span> : null}
          <span>
            {p.value?.toLocaleString()}
            {suffix}
          </span>
        </div>
      ))}
    </div>
  );
}

export function KpiCard({ d }) {
  const delta = d.previous === 0 ? 100 : ((d.current - d.previous) / d.previous) * 100;
  const up = delta > 0;
  const deltaColor = delta === 0 ? ds.ink4 : up ? ds.green : ds.red;

  return (
    <div
      style={{
        ...cardStyle,
        display: "flex",
        flexDirection: "column",
        gap: 14,
        cursor: "default",
        transition: "border-color .15s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = `${d.color}44`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = ds.line;
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <span style={{ fontSize: 12.5, fontWeight: 600, color: ds.ink3 }}>{d.label}</span>
        <IconBox icon={d.icon} color={d.color} bg={d.bg} size={32} />
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
        <span
          style={{
            fontSize: 30,
            fontWeight: 800,
            letterSpacing: -1.5,
            color: ds.ink,
            lineHeight: 1,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {d.current.toLocaleString()}
        </span>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 3,
            fontSize: 12,
            fontWeight: 700,
            color: deltaColor,
          }}
        >
          {delta === 0 ? null : up ? (
            <ArrowUpRight size={13} strokeWidth={2.5} />
          ) : (
            <ArrowDownRight size={13} strokeWidth={2.5} />
          )}
          {delta === 0 ? "0%" : `${up ? "+" : ""}${delta.toFixed(1)}%`}
        </span>
      </div>
    </div>
  );
}

export function DataTable({ title, count, columns, rows, renderRow, onExport }) {
  const { isMobile, isTablet, isCompact } = useResponsiveViewport();
  const tableMinWidth = columns.length >= 7 ? 920 : columns.length >= 5 ? 760 : 620;

  return (
    <div style={{ ...cardStyle, padding: 0, overflow: "hidden" }}>
      <div
        style={{
          padding: isMobile ? "14px 16px" : isTablet ? "15px 18px" : "16px 22px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: isCompact ? "wrap" : "nowrap",
          gap: isCompact ? 12 : 16,
          borderBottom: `1px solid ${ds.line}`,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: ds.ink, margin: 0 }}>{title}</h3>
          <Pill color={ds.brand} bg={ds.brandSoft}>
            {count}
          </Pill>
        </div>
        <div
          style={{
            display: "flex",
            gap: 8,
            flexWrap: isCompact ? "wrap" : "nowrap",
            width: isCompact ? "100%" : "auto",
            justifyContent: isCompact ? "flex-start" : "flex-end",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: isCompact ? "9px 12px" : "6px 12px",
              minHeight: isCompact ? 40 : "auto",
              borderRadius: ds.rs,
              border: `1px solid ${ds.line}`,
              background: ds.bg,
              width: isMobile ? "100%" : "auto",
              flex: isMobile ? "1 1 100%" : "0 1 auto",
            }}
          >
            <Search size={13} color={ds.ink4} />
            <input
              placeholder="검색어"
              style={{
                border: "none",
                background: "none",
                outline: "none",
                fontSize: 12.5,
                color: ds.ink,
                fontFamily: ds.ff,
                width: isMobile ? "100%" : 140,
                minWidth: 0,
              }}
            />
          </div>
          <button
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 4,
              padding: isCompact ? "9px 12px" : "6px 12px",
              minHeight: isCompact ? 40 : "auto",
              borderRadius: ds.rs,
              border: `1px solid ${ds.line}`,
              background: ds.card,
              cursor: "pointer",
              fontSize: 12,
              color: ds.ink3,
              fontFamily: ds.ff,
              fontWeight: 500,
              whiteSpace: "nowrap",
            }}
          >
            <Filter size={12} /> 필터
          </button>
        </div>
      </div>
      <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
        <table
          style={{
            width: isCompact ? "max-content" : "100%",
            minWidth: isCompact ? tableMinWidth : "100%",
            borderCollapse: "collapse",
          }}
        >
          <thead>
            <tr>
              {columns.map((h, i) => (
                <th
                  key={i}
                  style={{
                    padding: "10px 14px",
                    fontSize: 10.5,
                    fontWeight: 700,
                    color: ds.ink4,
                    textAlign: h.align || "left",
                    background: ds.bg,
                    borderBottom: `1px solid ${ds.line}`,
                    letterSpacing: 0.5,
                    textTransform: "uppercase",
                    whiteSpace: "nowrap",
                  }}
                >
                  {h.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>{rows.map(renderRow)}</tbody>
        </table>
      </div>
      <div
        style={{
          padding: isMobile ? "12px 16px" : isTablet ? "13px 18px" : "14px 22px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: isCompact ? "wrap" : "nowrap",
          gap: isCompact ? 10 : 12,
          borderTop: `1px solid ${ds.line}`,
        }}
      >
        <span style={{ fontSize: 12, color: ds.ink4 }}>총 {count}개 항목</span>
        {onExport && (
          <button
            onClick={onExport}
            style={{
              padding: isCompact ? "9px 14px" : "6px 14px",
              minHeight: isCompact ? 40 : "auto",
              borderRadius: ds.rs,
              border: `1px solid ${ds.line}`,
              background: ds.card,
              fontSize: 12,
              color: ds.ink3,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: ds.ff,
              display: "flex",
              alignItems: "center",
              gap: 4,
              whiteSpace: "nowrap",
            }}
          >
            <Download size={13} /> 내보내기
          </button>
        )}
      </div>
    </div>
  );
}

export function TRow({ children }) {
  return (
    <tr
      style={{ borderBottom: `1px solid ${ds.lineSoft}`, transition: "background .08s" }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = ds.bg;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "transparent";
      }}
    >
      {children}
    </tr>
  );
}

export function Td({ children, align, mono, bold }) {
  return (
    <td
      style={{
        padding: "12px 14px",
        fontSize: 13,
        color: bold ? ds.ink : ds.ink3,
        fontWeight: bold ? 700 : 400,
        textAlign: align || "left",
        fontFamily: mono ? "monospace" : ds.ff,
        fontVariantNumeric: "tabular-nums",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </td>
  );
}

export function EmptyPage({ title, icon: Icon, description }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 400 }}>
      <div style={{ textAlign: "center" }}>
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 14,
            background: ds.brandSoft,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 16px",
          }}
        >
          <Icon size={26} color={ds.brand} />
        </div>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: ds.ink, margin: "0 0 6px" }}>
          {title}
        </h3>
        <p style={{ fontSize: 13, color: ds.ink4, margin: 0 }}>{description}</p>
      </div>
    </div>
  );
}

export function ActionBtn({ icon: I, label, color = ds.brand, bg = ds.brandSoft, onClick }) {
  const { isCompact } = useResponsiveViewport();

  return (
    <button
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 5,
        padding: isCompact ? "9px 14px" : "7px 14px",
        minHeight: isCompact ? 40 : "auto",
        borderRadius: ds.rs,
        border: "none",
        background: bg,
        color,
        fontSize: 12,
        fontWeight: 600,
        cursor: "pointer",
        fontFamily: ds.ff,
        transition: "opacity .1s",
        whiteSpace: "nowrap",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.opacity = 0.8;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.opacity = 1;
      }}
    >
      <I size={13} /> {label}
    </button>
  );
}

export function MiniStat({ label, value, sub, color }) {
  return (
    <div style={cardStyle}>
      <div style={{ fontSize: 11.5, fontWeight: 600, color: ds.ink3, marginBottom: 8 }}>
        {label}
      </div>
      <div
        style={{
          fontSize: 26,
          fontWeight: 800,
          color: color || ds.ink,
          letterSpacing: -1,
          lineHeight: 1,
        }}
      >
        {value}
      </div>
      {sub && <div style={{ fontSize: 11, color: ds.ink4, marginTop: 6 }}>{sub}</div>}
    </div>
  );
}

const DAYS = ["일", "월", "화", "수", "목", "금", "토"];
const PRESETS = [
  { label: "오늘", get: () => { const t = new Date(2026, 1, 24); return [t, t]; } },
  { label: "7일", get: () => [new Date(2026, 1, 17), new Date(2026, 1, 24)] },
  { label: "30일", get: () => [new Date(2026, 0, 25), new Date(2026, 1, 24)] },
  { label: "이번 달", get: () => [new Date(2026, 1, 1), new Date(2026, 1, 24)] },
];

function dIM(y, m) {
  return new Date(y, m + 1, 0).getDate();
}

function fD(y, m) {
  return new Date(y, m, 1).getDay();
}

function fmt(d) {
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

function same(a, b) {
  return (
    a &&
    b &&
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function btw(d, s, e) {
  return s && e && d >= s && d <= e;
}

export function DatePicker({ start, end, onApply }) {
  const [open, setOpen] = useState(false);
  const [vY, setVY] = useState(start.getFullYear());
  const [vM, setVM] = useState(start.getMonth());
  const [sel, setSel] = useState([start, end]);
  const ref = useRef(null);

  useEffect(() => {
    const h = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const toggle = () => {
    if (!open) {
      setSel([start, end]);
      setVY(start.getFullYear());
      setVM(start.getMonth());
    }
    setOpen(!open);
  };

  const click = (d) => {
    if (!sel[0] || sel[1]) setSel([d, null]);
    else if (d < sel[0]) setSel([d, sel[0]]);
    else setSel([sel[0], d]);
  };

  const apply = () => {
    if (sel[0] && sel[1]) {
      onApply(sel[0], sel[1]);
      setOpen(false);
    }
  };

  const prev = () => {
    if (vM === 0) {
      setVM(11);
      setVY(vY - 1);
    } else {
      setVM(vM - 1);
    }
  };

  const next = () => {
    if (vM === 11) {
      setVM(0);
      setVY(vY + 1);
    } else {
      setVM(vM + 1);
    }
  };

  const cells = [];
  for (let i = 0; i < fD(vY, vM); i += 1) cells.push(null);
  for (let i = 1; i <= dIM(vY, vM); i += 1) cells.push(new Date(vY, vM, i));
  const today = new Date(2026, 1, 24);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={toggle}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          fontSize: 12.5,
          color: open ? ds.brand : ds.ink3,
          background: ds.bg,
          padding: "6px 14px",
          borderRadius: ds.rs,
          border: `1px solid ${open ? ds.brand : ds.line}`,
          cursor: "pointer",
          fontFamily: ds.ff,
          fontWeight: 500,
          transition: "all .15s",
        }}
      >
        <CalendarDays size={13} color={open ? ds.brand : ds.ink4} />
        <span style={{ fontVariantNumeric: "tabular-nums" }}>
          {fmt(start)} ~ {fmt(end)}
        </span>
        <ChevronDown
          size={12}
          color={ds.ink4}
          style={{ transition: "transform .2s", transform: open ? "rotate(180deg)" : "none" }}
        />
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            right: 0,
            zIndex: 200,
            background: ds.card,
            borderRadius: ds.r,
            border: `1px solid ${ds.line}`,
            boxShadow: ds.sh3,
            overflow: "hidden",
            width: 300,
            padding: 18,
          }}
        >
          <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
            {PRESETS.map((preset) => {
              const [ps, pe] = preset.get();
              const on = same(ps, sel[0]) && same(pe, sel[1]);
              return (
                <button
                  key={preset.label}
                  onClick={() => {
                    setSel(preset.get());
                    setVY(ps.getFullYear());
                    setVM(ps.getMonth());
                  }}
                  style={{
                    flex: 1,
                    padding: "5px 0",
                    border: "none",
                    borderRadius: 6,
                    cursor: "pointer",
                    fontSize: 11.5,
                    fontWeight: on ? 700 : 500,
                    fontFamily: ds.ff,
                    background: on ? ds.brand : ds.bg,
                    color: on ? "#fff" : ds.ink3,
                    transition: "all .1s",
                  }}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 10,
            }}
          >
            <button
              onClick={prev}
              style={{
                width: 26,
                height: 26,
                borderRadius: 6,
                border: `1px solid ${ds.line}`,
                background: ds.card,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <ChevronLeft size={13} color={ds.ink3} />
            </button>
            <span style={{ fontSize: 13, fontWeight: 700, color: ds.ink }}>
              {vY}년 {vM + 1}월
            </span>
            <button
              onClick={next}
              style={{
                width: 26,
                height: 26,
                borderRadius: 6,
                border: `1px solid ${ds.line}`,
                background: ds.card,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <ChevronRight size={13} color={ds.ink3} />
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", marginBottom: 2 }}>
            {DAYS.map((d) => (
              <div
                key={d}
                style={{
                  textAlign: "center",
                  fontSize: 10,
                  fontWeight: 700,
                  color: d === "일" ? ds.red : d === "토" ? ds.brand : ds.ink4,
                  padding: "3px 0",
                }}
              >
                {d}
              </div>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)" }}>
            {cells.map((d, i) => {
              if (!d) return <div key={`empty-${i}`} style={{ height: 32 }} />;
              const isS = same(d, sel[0]);
              const isE = same(d, sel[1]);
              const isSel = isS || isE;
              const isIn = sel[0] && sel[1] && btw(d, sel[0], sel[1]) && !isSel;
              const isT = same(d, today);

              return (
                <div
                  key={i}
                  onClick={() => click(d)}
                  style={{
                    position: "relative",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    height: 32,
                    cursor: "pointer",
                    fontSize: 12,
                    fontWeight: isSel ? 700 : 500,
                    color: isSel
                      ? "#fff"
                      : isT
                        ? ds.brand
                        : d.getDay() === 0
                          ? ds.red
                          : d.getDay() === 6
                            ? ds.brand
                            : ds.ink2,
                    background: isSel ? ds.brand : isIn ? ds.brandSoft : "transparent",
                    borderRadius: isS && !isE ? "7px 0 0 7px" : isE && !isS ? "0 7px 7px 0" : isSel ? 7 : 0,
                    transition: "background .06s",
                  }}
                  onMouseEnter={(e) => {
                    if (!isSel && !isIn) e.currentTarget.style.background = ds.lineSoft;
                  }}
                  onMouseLeave={(e) => {
                    if (!isSel && !isIn) e.currentTarget.style.background = "transparent";
                  }}
                >
                  {d.getDate()}
                  {isT && !isSel && (
                    <span
                      style={{
                        position: "absolute",
                        bottom: 2,
                        width: 3,
                        height: 3,
                        borderRadius: 2,
                        background: ds.brand,
                      }}
                    />
                  )}
                </div>
              );
            })}
          </div>

          <div
            style={{
              marginTop: 12,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span style={{ fontSize: 11.5, color: ds.ink3, fontVariantNumeric: "tabular-nums" }}>
              {sel[0] ? fmt(sel[0]) : "--"} ~ {sel[1] ? fmt(sel[1]) : "--"}
            </span>
            <div style={{ display: "flex", gap: 5 }}>
              <button
                onClick={() => setOpen(false)}
                style={{
                  padding: "5px 12px",
                  borderRadius: 6,
                  border: `1px solid ${ds.line}`,
                  background: ds.card,
                  cursor: "pointer",
                  fontSize: 11,
                  color: ds.ink3,
                  fontWeight: 600,
                  fontFamily: ds.ff,
                }}
              >
                취소
              </button>
              <button
                onClick={apply}
                style={{
                  padding: "5px 12px",
                  borderRadius: 6,
                  border: "none",
                  background: sel[0] && sel[1] ? ds.brand : ds.ink4,
                  cursor: sel[0] && sel[1] ? "pointer" : "not-allowed",
                  fontSize: 11,
                  color: "#fff",
                  fontWeight: 600,
                  fontFamily: ds.ff,
                }}
              >
                적용
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
