import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, ChevronRight, ImageOff, List } from "lucide-react";

/*
 * 프로그램 상세 · 콘테스트 상세가 함께 쓰는 레이아웃.
 * 행사 상세 팝업(EventDetailModal)·종료 행사 페이지와 같은 톤앤매너를 따른다.
 *  - 좌: 대표 이미지(3:4 고정, 잘리지 않게 contain + 흐린 배경, 데스크톱에서 스크롤 고정)
 *  - 우: 상태 칩 → 제목 → 정보표(라벨 | 값) → 소개 → 주요 버튼
 *  - 아래: 초록 세로선 제목의 섹션들
 */

const KO_WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

export function formatDateWithWeekday(value) {
  if (!value) return "일정 미정";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "일정 미정";
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")} (${KO_WEEKDAYS[d.getDay()]})`;
}

export function formatTimeRange(startAt, endAt) {
  const pick = (v) => {
    const m = String(v ?? "").match(/(\d{2}):(\d{2})/);
    return m ? `${m[1]}:${m[2]}` : "";
  };
  const a = pick(startAt), b = pick(endAt);
  return a && b ? `${a} – ${b}` : a || b || "시간 미정";
}

// 시작·종료 시각으로 진행 상태를 판단한다.
export function getProgramStatus(startAt, endAt, rawStatus) {
  const raw = String(rawStatus ?? "").toUpperCase();
  if (raw.includes("END") || raw.includes("DONE") || raw.includes("CLOSED")) return { tone: "ended", label: "종료" };
  const now = Date.now();
  const s = new Date(startAt ?? "").getTime();
  const e = new Date(endAt ?? "").getTime();
  if (Number.isFinite(s) && now < s) return { tone: "upcoming", label: "예정" };
  if (Number.isFinite(e) && now > e) return { tone: "ended", label: "종료" };
  return { tone: "ongoing", label: "진행 중" };
}

export const programDetailStyles = `
  .pdl-root { min-height: 100vh; background: #f8f9fc; flex: 1; font-family: 'Pretendard Variable', 'Pretendard', -apple-system, sans-serif; }
  .pdl-root *, .pdl-root *::before, .pdl-root *::after { box-sizing: border-box; font-family: inherit; }
  .pdl-container { width: min(1400px, calc(100% - 40px)); margin: 0 auto; padding: 24px 0 64px; }

  /* ── 상단: 이미지 + 정보 ── */
  .pdl-hero { display: grid; grid-template-columns: minmax(300px, 420px) minmax(0, 1fr); gap: 20px; align-items: start; margin-bottom: 20px; }
  .pdl-media {
    position: sticky; top: 96px; width: 100%; aspect-ratio: 3 / 4;
    border-radius: 24px; overflow: hidden; isolation: isolate;
    background: #eef0f3; border: 1px solid #e2e8f0; box-shadow: 0 18px 36px rgba(15,23,42,0.06);
  }
  .pdl-media-bg { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; filter: blur(28px) brightness(0.92); transform: scale(1.2); }
  .pdl-media-img { position: relative; z-index: 1; width: 100%; height: 100%; object-fit: contain; display: block; }
  .pdl-media-empty { height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; color: #94a3b8; font-size: 14px; font-weight: 700; }

  .pdl-panel { background: #fff; border: 1px solid #e2e8f0; border-radius: 24px; padding: 30px 32px; box-shadow: 0 18px 36px rgba(15,23,42,0.05); }
  .pdl-chips { display: flex; align-items: center; flex-wrap: wrap; gap: 6px; margin-bottom: 10px; }
  .pdl-status { display: inline-flex; align-items: center; gap: 6px; height: 26px; padding: 0 11px; border-radius: 999px; font-size: 12.5px; font-weight: 800; }
  .pdl-status--ongoing { background: #ecfdf3; color: #15803d; }
  .pdl-status--upcoming { background: #eef4ff; color: #1d4ed8; }
  .pdl-status--ended { background: #f3f4f6; color: #6b7280; }
  .pdl-status-dot { width: 6px; height: 6px; border-radius: 50%; background: #22c55e; animation: pdl-pulse 1.4s ease-in-out infinite; }
  @keyframes pdl-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.35; } }
  .pdl-chip { display: inline-flex; align-items: center; height: 26px; padding: 0 11px; border-radius: 999px; font-size: 12.5px; font-weight: 700; color: #475569; background: #fff; border: 1px solid #e5e7eb; }
  .pdl-chip-link { cursor: pointer; gap: 2px; font-family: inherit; }
  .pdl-chip-link:hover { border-color: #cbd5e1; color: #111827; }
  .pdl-title { margin: 0 0 20px; font-size: 32px; line-height: 1.25; font-weight: 900; color: #0f172a; letter-spacing: -0.6px; word-break: keep-all; }

  .pdl-facts { margin: 0 0 26px; padding: 4px 18px; background: #fafbfc; border: 1px solid #eef0f3; border-radius: 16px; }
  .pdl-fact { display: grid; grid-template-columns: 84px minmax(0, 1fr); align-items: center; gap: 12px; padding: 13px 0; border-bottom: 1px solid #eef0f3; }
  .pdl-fact:last-child { border-bottom: none; }
  .pdl-fact dt { display: flex; align-items: center; gap: 7px; font-size: 13.5px; font-weight: 600; color: #6b7280; }
  .pdl-fact dt svg { color: #9ca3af; flex-shrink: 0; }
  .pdl-fact dd { margin: 0; display: flex; align-items: center; flex-wrap: wrap; gap: 6px 10px; font-size: 16px; font-weight: 700; color: #111827; min-width: 0; }
  .pdl-fact-sub { font-size: 12px; font-weight: 700; color: #6B7A3D; background: #f4f8ee; padding: 2px 8px; border-radius: 999px; }
  .pdl-fact-action { margin-left: auto; display: inline-flex; align-items: center; gap: 2px; border: none; background: transparent; padding: 0; cursor: pointer; font-size: 13px; font-weight: 700; color: #6b7280; }
  .pdl-fact-action:hover { color: #111827; }

  .pdl-section-title { display: flex; align-items: center; gap: 8px; margin: 0 0 12px; font-size: 17px; font-weight: 800; color: #111827; letter-spacing: -0.2px; }
  .pdl-section-title::before { content: ""; width: 3px; height: 16px; border-radius: 2px; background: #90C450; }
  .pdl-section-meta { margin-left: auto; font-size: 13px; font-weight: 600; color: #9ca3af; }
  .pdl-desc { margin: 0; font-size: 15.5px; line-height: 1.8; color: #374151; white-space: pre-wrap; word-break: keep-all; }

  .pdl-actions { display: flex; justify-content: center; gap: 10px; margin-top: 26px; padding-top: 22px; border-top: 1px solid #f1f3f5; }
  .pdl-actions .pdl-btn-primary { min-width: 260px; }
  .pdl-btn-primary {
    height: 52px; padding: 0 30px; border-radius: 14px; border: none; background: #6FA436; color: #fff;
    font-size: 16px; font-weight: 800; letter-spacing: -0.2px; cursor: pointer;
    display: inline-flex; align-items: center; justify-content: center; gap: 8px;
    box-shadow: 0 4px 14px rgba(111,164,54,0.32); transition: background 0.15s, transform 0.15s, box-shadow 0.15s;
  }
  .pdl-btn-primary:hover:not(:disabled) { background: #5E8F2A; transform: translateY(-1px); box-shadow: 0 6px 18px rgba(94,143,42,0.38); }
  .pdl-btn-primary:disabled { background: #e5e7eb; color: #9ca3af; box-shadow: none; cursor: not-allowed; }

  /* ── 하단 섹션 카드 ── */
  .pdl-section { background: #fff; border: 1px solid #e2e8f0; border-radius: 20px; padding: 26px 28px; box-shadow: 0 1px 4px rgba(0,0,0,0.03); }
  .pdl-section-head { display: flex; align-items: center; margin-bottom: 18px; padding-bottom: 14px; border-bottom: 1px solid #f1f3f5; }
  .pdl-section-head .pdl-section-title { margin: 0; flex: 1; }
  .pdl-grid-2 { display: grid; grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr); gap: 16px; align-items: start; }
  .pdl-empty { color: #9ca3af; font-size: 14px; padding: 36px 0; text-align: center; font-weight: 500; }

  .pdl-topnav {
    display: inline-flex; align-items: center; gap: 6px; margin: 0 0 14px; padding: 8px 14px 8px 10px;
    border: 1px solid #e5e7eb; border-radius: 999px; background: #fff; cursor: pointer;
    font-size: 14px; font-weight: 700; color: #374151; transition: all 0.15s;
  }
  .pdl-topnav:hover { border-color: #90C450; color: #111827; background: #f7fbf2; }
  .pdl-topnav svg { color: #6b7280; }
  .pdl-bottom { display: flex; justify-content: center; margin-top: 32px; }
  .pdl-btn {
    display: inline-flex; align-items: center; gap: 10px; height: 54px; padding: 0 26px; border-radius: 14px;
    border: 1px solid #d6e6c2; background: #fff; font-size: 16px; font-weight: 800; color: #3f6a19;
    cursor: pointer; transition: all 0.15s; box-shadow: 0 2px 8px rgba(15,23,42,0.04);
  }
  .pdl-btn:hover { background: #f4f8ee; border-color: #90C450; }
  .pdl-btn svg:last-child { transition: transform 0.15s; }
  .pdl-btn:hover svg:last-child { transform: translateX(3px); }

  @media (max-width: 1024px) {
    .pdl-hero { grid-template-columns: 1fr; }
    .pdl-media { position: relative; top: auto; max-width: 420px; margin: 0 auto; }
    .pdl-grid-2 { grid-template-columns: 1fr; }
  }
  @media (max-width: 640px) {
    .pdl-container { width: calc(100% - 24px); padding-top: 16px; }
    .pdl-panel, .pdl-section { padding: 20px 18px; border-radius: 18px; }
    .pdl-title { font-size: 24px; }
    .pdl-fact { grid-template-columns: 70px minmax(0, 1fr); }
    .pdl-fact dd { font-size: 14.5px; }
    .pdl-actions .pdl-btn-primary { width: 100%; }
  }
`;

export function ProgramHero({ image, imageAlt, status, chips = [], title, facts = [], description, descriptionTitle = "소개", extra, actions }) {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(image) && !failed;
  return (
    <section className="pdl-hero">
      <div className="pdl-media">
        {showImage ? (
          <>
            <img className="pdl-media-bg" src={image} alt="" aria-hidden="true" />
            <img className="pdl-media-img" src={image} alt={imageAlt || title} onError={() => setFailed(true)} />
          </>
        ) : (
          <div className="pdl-media-empty"><ImageOff size={36} />이미지가 없습니다</div>
        )}
      </div>

      <div className="pdl-panel">
        <div className="pdl-chips">
          {status && (
            <span className={`pdl-status pdl-status--${status.tone}`}>
              {status.tone === "ongoing" && <span className="pdl-status-dot" />}
              {status.label}
            </span>
          )}
          {chips.map((chip) =>
            chip.onClick ? (
              <button key={chip.key} type="button" className="pdl-chip pdl-chip-link" onClick={chip.onClick}>
                {chip.label} <ChevronRight size={13} />
              </button>
            ) : (
              <span key={chip.key} className="pdl-chip">{chip.label}</span>
            ),
          )}
        </div>
        <h1 className="pdl-title">{title}</h1>

        {facts.length > 0 && (
          <dl className="pdl-facts">
            {facts.map((f) => (
              <div key={f.key} className="pdl-fact">
                <dt>{f.icon}{f.label}</dt>
                <dd>
                  {f.value}
                  {f.sub && <span className="pdl-fact-sub">{f.sub}</span>}
                  {f.action && (
                    <button type="button" className="pdl-fact-action" onClick={f.action.onClick}>
                      {f.action.label} <ChevronRight size={13} />
                    </button>
                  )}
                </dd>
              </div>
            ))}
          </dl>
        )}

        {description && (
          <>
            <h2 className="pdl-section-title">{descriptionTitle}</h2>
            <p className="pdl-desc">{description}</p>
          </>
        )}

        {extra}

        {actions && <div className="pdl-actions">{actions}</div>}
      </div>
    </section>
  );
}

export function DetailSection({ title, meta, children, style }) {
  return (
    <article className="pdl-section" style={style}>
      <div className="pdl-section-head">
        <h2 className="pdl-section-title">{title}{meta != null && <span className="pdl-section-meta">{meta}</span>}</h2>
      </div>
      {children}
    </article>
  );
}

// 돌아갈 목록: 메뉴에 있는 현재 진행 / 예정 / 종료 프로그램 중, 소속 행사의 상태에 맞는 페이지
// (행사 ID를 붙이면 그 행사가 선택된 상태로 열린다)
export function getProgramListTarget(eventStatus, eventId, eventName) {
  const s = String(eventStatus ?? "").toUpperCase();
  const meta = s.includes("END") || s.includes("CLOSED")
    ? { path: "closed", label: "종료 프로그램" }
    : s.includes("PLAN") || s.includes("UPCOMING")
      ? { path: "upcoming", label: "예정 프로그램" }
      : { path: "current", label: "현재 진행 프로그램" };
  return {
    path: eventId ? `/program/${meta.path}/${eventId}` : `/program/${meta.path}`,
    label: eventName ? `${meta.label} · ${eventName}` : meta.label,
  };
}

// 돌아갈 곳: 목록 카드에서 들어왔으면 보던 목록 그대로(브라우저 뒤로와 같음),
// 주소로 바로 들어왔거나 다른 곳에서 왔으면 소속 행사의 프로그램 목록(fallback).
export function useDetailBackTarget(fallback) {
  const location = useLocation();
  const navigate = useNavigate();
  const from = location.state?.from;
  if (from) {
    return {
      label: location.state?.fromLabel || "목록",
      go: () => ((window.history.state?.idx ?? 0) > 0 ? navigate(-1) : navigate(from)),
    };
  }
  return { label: fallback.label, go: () => navigate(fallback.path) };
}

// 상단: 어디로 돌아가는지 이름으로 보여주는 링크
export function DetailTopNav({ label, onClick }) {
  return (
    <button type="button" className="pdl-topnav" onClick={onClick}>
      <ArrowLeft size={16} />
      <span>{label}</span>
    </button>
  );
}

// 하단: 목적지를 글자로 적은 버튼 하나
export function DetailBottomNav({ label, onClick }) {
  return (
    <div className="pdl-bottom">
      <button type="button" className="pdl-btn" onClick={onClick}>
        <List size={17} />
        {label} 목록으로
        <ChevronRight size={17} />
      </button>
    </div>
  );
}
