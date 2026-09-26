import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Trophy,
  Users,
  Clock3,
  Calendar,
  PawPrint,
  Crown,
  Check,
} from "lucide-react";
import PageHeader from "../components/PageHeader";
import EventDetailModal from "../event/EventDetailModal";
import {
  DetailBottomNav,
  DetailTopNav,
  DetailSection,
  ProgramHero,
  formatDateWithWeekday,
  getProgramListTarget,
  useDetailBackTarget,
  getProgramStatus,
  programDetailStyles,
} from "./_components/ProgramDetailLayout";
import { programApi } from "../../../app/http/programApi";
import { eventApi } from "../../../app/http/eventApi";
import { petApi } from "../../../app/http/petApi";
import { tokenStore } from "../../../app/http/tokenStore";
import { axiosInstance } from "../../../app/http/axiosInstance";
import { authApi } from "../auth/api/authApi";
import { toPublicAssetUrl } from "../../../shared/utils/publicAssetUrl";
import PetAvatar from "../../../shared/components/pet/PetAvatar";

const styles = `
  @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.min.css');

  .cd-root { box-sizing: border-box; font-family: 'Pretendard Variable', 'Pretendard', -apple-system, sans-serif; background: #f8f9fc; min-height: 100vh; flex: 1; }
  .cd-root *, .cd-root *::before, .cd-root *::after { box-sizing: border-box; font-family: inherit; }
  .cd-container { max-width: 1400px; margin: 0 auto; padding: 20px 0 64px; }

  .cd-bottom-btns {
    display: flex; align-items: center; justify-content: center; gap: 12px;
    padding-top: 32px; margin-top: 32px; border-top: 1px solid #e5e7eb;
  }
  .cd-btn {
    display: inline-flex; align-items: center; gap: 8px;
    border: 1px solid #d1d5db; background: #fff;
    padding: 12px 28px; border-radius: 8px;
    font-size: 15px; font-weight: 700; color: #374151;
    cursor: pointer; transition: all 0.15s; font-family: inherit;
  }
  .cd-btn:hover { background: #f8f9fc; border-color: #9ca3af; }
  .cd-btn-dark {
    background: #111827; color: #fff; border-color: #111827;
  }
  .cd-btn-dark:hover { opacity: 0.85; background: #111827; border-color: #111827; }

  /* ── 히어로 ── */
  .cd-hero {
    border: 1px solid #e2e8f0; border-radius: 20px;
    padding: 40px 44px; margin-bottom: 20px;
    background: linear-gradient(135deg, #fff 0%, #fafbff 100%);
    position: relative; overflow: hidden;
    box-shadow: 0 2px 12px rgba(0,0,0,0.04);
  }
  .cd-hero::before {
    content: ""; position: absolute; top: 0; left: 0; right: 0; height: 4px;
    background: linear-gradient(90deg, #90C450, #6B7A3D, #90C450);
    background-size: 200% 100%;
    animation: cd-hero-bar 3s ease infinite;
  }
  @keyframes cd-hero-bar {
    0%, 100% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
  }
  .cd-hero-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 24px; }
  .cd-hero-main { min-width: 0; flex: 1 1 auto; }
  .cd-title { margin: 0; font-size: 32px; line-height: 1.15; letter-spacing: -0.03em; font-weight: 900; color: #111827; }
  .cd-sub { margin-top: 12px; display: flex; flex-wrap: wrap; gap: 16px; font-size: 15px; color: #9ca3af; }
  .cd-sub span { display: inline-flex; align-items: center; gap: 5px; white-space: nowrap; }
  .cd-hero-divider { margin: 16px 0; border: none; border-top: 1px solid #f0f0f0; }
  .cd-hero-summary { display: flex; align-items: center; gap: 10px; font-size: 15px; color: #9ca3af; font-weight: 500; }
  .cd-hero-summary strong { font-weight: 800; color: #111827; font-size: 16px; }
  .cd-hero-dot {
    width: 10px; height: 10px; border-radius: 50%;
    background: #90C450; box-shadow: 0 0 6px rgba(68,78,40,0.4);
    animation: cd-pulse 1.6s ease-in-out infinite; flex-shrink: 0;
  }
  @keyframes cd-pulse { 0%,100% { opacity: 1; transform: scale(1); } 50% { opacity: .5; transform: scale(.75); } }

  .cd-hero-kpi-grid {
    display: grid; grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 10px; width: min(540px, 100%); margin-left: auto; flex-shrink: 0;
  }
  .cd-hero-kpi {
    border: 1px solid #ebebeb; border-radius: 16px;
    background: #fff; padding: 24px 26px;
  }
  .cd-hero-kpi-label { font-size: 14px; color: #6b7280; font-weight: 700; margin-bottom: 12px; }
  .cd-hero-kpi-value { font-size: 38px; line-height: 1; font-weight: 900; color: #111827; letter-spacing: -0.02em; }
  .cd-hero-kpi-unit { font-size: 18px; color: #9ca3af; font-weight: 700; margin-left: 4px; }

  .cd-hero-footer {
    display: flex; align-items: center; justify-content: flex-end;
    margin-top: 20px; padding-top: 14px; border-top: 1px solid #f0f0f0;
  }
  .cd-top-btn {
    height: 48px; padding: 0 24px; border-radius: 12px; font-size: 15px; font-weight: 700; cursor: pointer;
    display: inline-flex; align-items: center; gap: 8px; font-family: inherit; transition: all 0.15s;
  }
  .cd-top-btn.primary {
    border: none; background: #111827; color: #fff;
    box-shadow: 0 2px 12px rgba(0,0,0,0.12);
  }
  .cd-top-btn.primary:hover { background: #1f2937; }
  .cd-top-btn.primary:disabled { background: #e5e7eb; color: #9ca3af; box-shadow: none; cursor: not-allowed; }
  .cd-top-btn.outline {
    border: 1px solid #e2e5ea; background: #fff; color: #374151;
  }
  .cd-top-btn.outline:hover { background: #f9fafb; border-color: #d1d5db; }

  /* ── 카드 ── */
  .cd-grid { display: grid; grid-template-columns: 1.2fr 1fr; gap: 16px; }
  .cd-card {
    background: #fff; border: 1px solid #e2e8f0; border-radius: 16px;
    padding: 28px 32px;
    box-shadow: 0 1px 4px rgba(0,0,0,0.03);
  }
  .cd-card-head {
    display: flex; align-items: center; justify-content: space-between;
    margin-bottom: 20px; padding-bottom: 16px; border-bottom: 1px solid #f0f0f0;
  }
  .cd-card-title { margin: 0; font-size: 18px; font-weight: 800; color: #111827; display: flex; align-items: center; gap: 8px; }
  .cd-tag { font-size: 13px; font-weight: 600; color: #9ca3af; }

  /* ── 참가 반려동물 카드 ── */
  .cd-candidate-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
  .cd-candidate-card {
    border: 1px solid #eef0f4; border-radius: 14px; overflow: hidden; background: #fff;
    transition: all 0.2s ease;
  }
  .cd-candidate-card:hover { border-color: #d1d5db; box-shadow: 0 4px 16px rgba(0,0,0,0.06); transform: translateY(-2px); }
  .cd-candidate-thumb { width: 100%; aspect-ratio: 1 / 1; background: #f8f9fb; display: flex; align-items: center; justify-content: center; overflow: hidden; }
  .cd-candidate-thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .cd-candidate-body { padding: 16px 18px 18px; }
  .cd-candidate-name { font-size: 16px; font-weight: 800; color: #111827; }
  .cd-candidate-owner { margin-top: 4px; font-size: 13px; color: #9ca3af; }
  .cd-candidate-votes { margin-top: 10px; font-size: 14px; font-weight: 800; color: #90C450; }
  .cd-candidate-actions { margin-top: 14px; }
  .cd-vote-btn {
    width: 100%; height: 44px; border-radius: 12px; border: 1px solid #cfe3b4;
    background: #fff; color: #4d7a1f; font-size: 14px; font-weight: 800; cursor: pointer;
    transition: all 0.15s; font-family: inherit;
  }
  .cd-vote-btn:hover:not(:disabled) { background: #f4f8ee; border-color: #90C450; }
  .cd-vote-btn:disabled { background: #f8f9fc; color: #9ca3af; cursor: not-allowed; }
  .cd-vote-btn.done { background: #6FA436; color: #fff; border-color: #6FA436; }

  /* ── 투표 순위 ── */
  .cd-list { display: flex; flex-direction: column; gap: 12px; }
  .cd-item {
    border: 1px solid #eef0f4; border-radius: 14px; padding: 20px 22px; background: #fff;
    transition: all 0.15s;
  }
  .cd-item:hover { border-color: #e2e5ea; background: #f9fafb; }
  .cd-item-top { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; margin-bottom: 12px; }
  .cd-rank { font-size: 13px; font-weight: 700; color: #9ca3af; margin-right: 6px; }
  .cd-rank.top { color: #90C450; }
  .cd-name { font-size: 17px; font-weight: 800; color: #111827; }
  .cd-votes { font-size: 18px; font-weight: 900; color: #5E8F2A; letter-spacing: -0.02em; }
  .cd-progress { height: 10px; border-radius: 99px; background: #eef3e6; overflow: hidden; position: relative; }
  .cd-progress-fill {
    height: 100%; border-radius: 99px;
    background: linear-gradient(90deg, #b5d98a 0%, #6FA436 100%);
    transition: width 0.6s cubic-bezier(.4,0,.2,1);
    position: relative;
  }
  .cd-progress-fill::after { display: none;
    content: ''; position: absolute; inset: 3px 4px 3px auto;
    width: 6px; border-radius: 99px;
    background: rgba(255,255,255,.4);
  }
  .cd-heart-icon {
    position: absolute; right: -13px; top: 50%; transform: translateY(-50%);
    width: 26px; height: 26px; z-index: 2;
    filter: drop-shadow(0 2px 4px rgba(255,77,141,0.4));
    animation: cd-heart-beat 1.2s ease-in-out infinite;
  }
  @keyframes cd-heart-beat {
    0%, 100% { transform: translateY(-50%) scale(1); }
    50% { transform: translateY(-50%) scale(1.15); }
  }
  .cd-meta { margin-top: 10px; font-size: 14px; color: #9ca3af; }

  .cd-empty { color: #c5c9cf; font-size: 14px; padding: 44px 0; text-align: center; font-weight: 500; }

  @media (max-width: 980px) {
    .cd-grid { grid-template-columns: 1fr; }
    .cd-hero-top { flex-direction: column; align-items: flex-start; }
    .cd-hero-kpi-grid { width: 100%; margin-left: 0; margin-top: 14px; }
    .cd-hero { padding: 28px 24px; }
    .cd-hero-title { font-size: 26px; }
    .cd-card { padding: 24px 22px; }
  }
  @media (max-width: 680px) {
    .cd-candidate-grid { grid-template-columns: 1fr; }
    .cd-container { padding: 20px 16px 48px; }
    .cd-hero { padding: 22px 18px; }
    .cd-title { font-size: 22px; }
    .cd-hero-kpi-grid { grid-template-columns: 1fr; }
    .cd-hero-kpi-value { font-size: 26px; }
  }

  /* ── 진행 단계 ── */
  .cd-steps { margin-top: 26px; }
  .cd-steps-list { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; position: relative; }
  .cd-step { position: relative; display: flex; flex-direction: column; align-items: center; text-align: center; gap: 6px; padding-top: 2px; }
  .cd-step:not(:last-child)::after { content: ""; position: absolute; top: 15px; left: calc(50% + 20px); right: calc(-50% + 20px); height: 2px; background: #e5e7eb; }
  .cd-step.done:not(:last-child)::after { background: #b5d98a; }
  .cd-step-dot { width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 800; background: #f3f4f6; color: #9ca3af; border: 2px solid #e5e7eb; position: relative; z-index: 1; }
  .cd-step.done .cd-step-dot { background: #eef6e3; color: #5E8F2A; border-color: #b5d98a; }
  .cd-step.current .cd-step-dot { background: #6FA436; color: #fff; border-color: #6FA436; box-shadow: 0 0 0 4px rgba(111,164,54,0.18); }
  .cd-step-label { font-size: 13.5px; font-weight: 800; color: #9ca3af; }
  .cd-step.done .cd-step-label, .cd-step.current .cd-step-label { color: #111827; }
  .cd-step-desc { font-size: 11.5px; font-weight: 500; color: #9ca3af; line-height: 1.35; word-break: keep-all; }

  /* ── 시상대 ── */
  .cd-podium { display: flex; align-items: flex-end; justify-content: center; gap: 12px; padding: 8px 0 4px; margin-bottom: 18px; }
  .cd-podium-item { flex: 1; max-width: 180px; display: flex; flex-direction: column; align-items: center; gap: 6px; text-align: center; }
  .cd-podium-medal { display: inline-flex; align-items: center; gap: 4px; height: 24px; padding: 0 10px; border-radius: 999px; font-size: 12.5px; font-weight: 900; color: var(--medal); background: var(--medal-bg); border: 1px solid var(--medal-ring); }
  .cd-podium-name { font-size: 15px; font-weight: 800; color: #111827; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .cd-podium-votes { font-size: 12.5px; color: #6b7280; font-weight: 600; }
  .cd-podium-votes b { font-size: 15px; font-weight: 900; color: var(--medal); }
  .cd-podium-stand { width: 100%; border-radius: 12px 12px 4px 4px; background: linear-gradient(180deg, var(--medal-bg), #fff); border: 1px solid var(--medal-ring); border-bottom: none; }
  .cd-podium-item.rank-1 .cd-podium-stand { height: 64px; }
  .cd-podium-item.rank-2 .cd-podium-stand { height: 42px; }
  .cd-podium-item.rank-3 .cd-podium-stand { height: 28px; }
  /* ── 투표 안내 (시상대 아래) ── */
  .cd-guide { margin-top: 6px; padding: 14px 16px; border-radius: 14px; background: #fafbfc; border: 1px solid #eef0f3; }
  .cd-guide-row { display: grid; grid-template-columns: 72px minmax(0, 1fr); gap: 10px; padding: 7px 0; font-size: 13.5px; }
  .cd-guide-row + .cd-guide-row { border-top: 1px solid #eef0f3; }
  .cd-guide-row dt { font-weight: 700; color: #6b7280; }
  .cd-guide-row dd { margin: 0; font-weight: 600; color: #111827; line-height: 1.5; word-break: keep-all; }
  .cd-guide-note { margin-top: 10px; font-size: 12.5px; color: #6B7A3D; background: #f4f8ee; border-radius: 10px; padding: 8px 12px; font-weight: 600; }
  .cd-rest-title { font-size: 13px; font-weight: 700; color: #9ca3af; margin: 6px 0 10px; }

  /* ── 참가 반려동물·순위 두 칸 높이 맞춤 ──
     순위 칸이 높이를 정하고, 참가 반려동물 칸은 그 높이 안에서 카드가 넘치면 스크롤한다. */
  .cd-equal { align-items: stretch; }
  .cd-equal > .pdl-section { display: flex; flex-direction: column; min-height: 0; }
  .cd-candidate-scroll { position: relative; flex: 1; min-height: 320px; }
  .cd-candidate-scroll-inner { position: absolute; inset: 0; overflow-y: auto; padding-right: 4px; }
  .cd-candidate-scroll-inner::-webkit-scrollbar { width: 5px; }
  .cd-candidate-scroll-inner::-webkit-scrollbar-thumb { background: #d9dee5; border-radius: 3px; }
  .cd-equal .cd-candidate-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
  .cd-equal .cd-candidate-thumb { aspect-ratio: 4 / 3; }
  .cd-equal .cd-candidate-body { padding: 12px 14px 14px; }
  .cd-equal .cd-candidate-name { font-size: 16px; }
  .cd-equal .cd-candidate-owner { font-size: 12.5px; }
  .cd-equal .cd-candidate-votes { margin-top: 6px; font-size: 14.5px; }
  .cd-equal .cd-candidate-actions { margin-top: 10px; }
  .cd-equal .cd-vote-btn { height: 40px; font-size: 13.5px; }
  @media (max-width: 1024px) {
    .cd-candidate-scroll { min-height: 0; }
    .cd-candidate-scroll-inner { position: static; overflow: visible; padding-right: 0; }
  }
  @media (max-width: 680px) { .cd-equal .cd-candidate-grid { grid-template-columns: 1fr; } }

  /* ── 참가 반려동물 카드 순위 배지 ── */
  .cd-candidate-thumb { position: relative; }
  .cd-rank-badge { position: absolute; top: 10px; left: 10px; z-index: 2; display: inline-flex; align-items: center; gap: 4px; height: 26px; padding: 0 10px; border-radius: 999px; font-size: 12.5px; font-weight: 900; box-shadow: 0 2px 8px rgba(15,23,42,0.15); }
  .cd-candidate-votes { font-size: 15px; }

  @media (max-width: 640px) {
    .cd-steps-list { grid-template-columns: repeat(2, minmax(0, 1fr)); row-gap: 14px; }
    .cd-step:nth-child(2)::after { display: none; }
  }

  /* ── Pet Apply Modal ── */
  .cd-modal-overlay {
    position: fixed; inset: 0; z-index: 9999;
    background: rgba(0,0,0,.45); display: flex;
    align-items: center; justify-content: center; padding: 20px;
  }
  .cd-modal {
    width: 100%; max-width: 440px; background: #fff;
    border-radius: 18px; box-shadow: 0 20px 60px rgba(0,0,0,.18); padding: 26px;
  }
  .cd-modal-title { font-size: 17px; font-weight: 800; color: #111827; margin-bottom: 4px; }
  .cd-modal-sub { font-size: 13px; color: #9ca3af; margin-bottom: 16px; }
  .cd-modal-select {
    width: 100%; height: 44px; border-radius: 10px; border: 1.5px solid #e5e7eb;
    padding: 0 12px; font-size: 14px; color: #111827; margin-bottom: 16px;
    background: #f9fafb; appearance: none; cursor: pointer; font-family: inherit;
  }
  .cd-modal-select:focus { outline: none; border-color: #90C450; box-shadow: 0 0 0 3px rgba(68,78,40,.12); }
  .cd-upload-area {
    width: 100%; border-radius: 12px; border: 2px dashed #e5e7eb; background: #f9fafb;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    gap: 8px; cursor: pointer; transition: border-color .2s, background .2s;
    padding: 28px 20px; margin-bottom: 16px; position: relative;
  }
  .cd-upload-area:hover { border-color: #90C450; background: #f4f5ee; }
  .cd-upload-area.has-image { padding: 0; overflow: hidden; aspect-ratio: 1/1; border-style: solid; border-color: #e5e7eb; }
  .cd-upload-icon { width: 48px; height: 48px; border-radius: 12px; background: #f0f2e8; display: flex; align-items: center; justify-content: center; border: 1px solid #c5cca8; }
  .cd-upload-text { font-size: 14px; font-weight: 700; color: #374151; }
  .cd-upload-hint { font-size: 12px; color: #9ca3af; }
  .cd-upload-input { display: none; }
  .cd-upload-preview { width: 100%; height: 100%; object-fit: cover; display: block; }
  .cd-upload-change { position: absolute; bottom: 8px; right: 8px; background: rgba(0,0,0,.55); color: #fff; border: none; border-radius: 7px; font-size: 11px; font-weight: 700; padding: 5px 10px; cursor: pointer; }
  .cd-modal-btns { display: flex; gap: 8px; }
  .cd-modal-btn { flex: 1; height: 42px; border-radius: 10px; font-size: 13.5px; font-weight: 700; cursor: pointer; transition: all .15s; font-family: inherit; }
  .cd-modal-btn.cancel { background: #f8f9fc; color: #6b7280; border: 1px solid #e5e7eb; }
  .cd-modal-btn.cancel:hover { background: #e5e7eb; }
  .cd-modal-btn.confirm { background: linear-gradient(135deg, #90C450, #6B7A3D); color: #fff; border: none; box-shadow: 0 4px 12px rgba(68,78,40,.3); }
  .cd-modal-btn.confirm:hover { transform: translateY(-1px); box-shadow: 0 6px 18px rgba(68,78,40,.4); }
  .cd-modal-btn:disabled { opacity: .5; cursor: not-allowed; transform: none !important; }
`;

function formatTimeRange(startAt, endAt) {
  const pick = (value) => {
    const match = String(value ?? "").match(/(\d{2}):(\d{2})/);
    return match ? `${match[1]}:${match[2]}` : "";
  };

  const start = pick(startAt);
  const end = pick(endAt);
  return start && end ? `${start} – ${end}` : start || end || "시간 미정";
}

function contestPhase(program) {
  const now = Date.now();
  const startAt = new Date(program?.startAt ?? "").getTime();
  const endAt = new Date(program?.endAt ?? "").getTime();

  if (Number.isFinite(startAt) && now < startAt) return "upcoming";
  if (Number.isFinite(endAt) && now > endAt) return "ended";
  return "live";
}

/* ── 콘테스트 느낌 요소: 진행 단계 · 시상대 · 순위 배지 ── */
const MEDAL = [
  { key: "gold", label: "1위", color: "#C99700", bg: "#FFF6D6", ring: "#F2C94C" },
  { key: "silver", label: "2위", color: "#6B7686", bg: "#F1F3F6", ring: "#C4CBD5" },
  { key: "bronze", label: "3위", color: "#A8652A", bg: "#FBEDE1", ring: "#E0A874" },
];

// 참가 신청 → 심사·승인 → 투표 → 결과 발표 중 지금 단계를 강조한다
function ContestSteps({ phase, timeLabel }) {
  const current = phase === "ended" ? 3 : phase === "live" ? 2 : 0;
  const steps = [
    { label: "참가 신청", desc: "반려동물과 사진 등록" },
    { label: "심사·승인", desc: "승인되면 후보로 등록" },
    { label: "투표", desc: timeLabel },
    { label: "결과 발표", desc: "최다 득표 순으로 공개" },
  ];
  return (
    <div className="cd-steps">
      <h2 className="pdl-section-title">진행 단계</h2>
      <ol className="cd-steps-list">
        {steps.map((s, i) => (
          <li key={s.label} className={`cd-step${i < current ? " done" : ""}${i === current ? " current" : ""}`}>
            <span className="cd-step-dot">{i < current ? <Check size={13} strokeWidth={3} /> : i + 1}</span>
            <span className="cd-step-label">{s.label}</span>
            <span className="cd-step-desc">{s.desc}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

// 1~3위 시상대 (가운데 1위, 왼쪽 2위, 오른쪽 3위)
function ContestPodium({ rows, totalVotes }) {
  const top = rows.slice(0, 3);
  if (top.length === 0) return null;
  const order = [1, 0, 2].filter((i) => top[i]);
  return (
    <div className="cd-podium">
      {order.map((i) => {
        const row = top[i];
        const m = MEDAL[i];
        const pct = totalVotes > 0 ? Math.round((row.votes / totalVotes) * 100) : 0;
        return (
          <div key={row.id} className={`cd-podium-item rank-${i + 1}`} style={{ "--medal": m.color, "--medal-bg": m.bg, "--medal-ring": m.ring }}>
            <span className="cd-podium-medal">{i === 0 ? <Crown size={15} strokeWidth={2.4} /> : null}{m.label}</span>
            <PetAvatar src={[row.imageUrl, row.petImageUrl]} name={row.name} size={i === 0 ? 76 : 60} style={{ boxShadow: `0 0 0 3px ${m.ring}` }} />
            <span className="cd-podium-name">{row.name}</span>
            <span className="cd-podium-votes"><b>{row.votes.toLocaleString()}</b>표 · {pct}%</span>
            <span className="cd-podium-stand" />
          </div>
        );
      })}
    </div>
  );
}

export default function ContestDetailPage() {
  const navigate = useNavigate();
  const { eventId, programId } = useParams();

  const [program, setProgram] = useState(null);
  const [rows, setRows] = useState([]);
  const [totalVotes, setTotalVotes] = useState(0);
  const [myProgramApplyId, setMyProgramApplyId] = useState(null);
  const [voteSubmittingId, setVoteSubmittingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  const load = async ({ silent = false } = {}) => {
    if (!programId) return;
    if (!silent) setLoading(true);
    setErrorMsg("");

    try {
      const [programRes, candRes, voteRes] = await Promise.all([
        programApi.getProgramDetail(programId),
        programApi.getCandidates(programId, { page: 0, size: 200 }),
        programApi.getContestVoteResult(programId),
      ]);

      const programData = programRes?.data?.data ?? null;
      const candidates = candRes?.data?.data?.content ?? [];
      const voteData = voteRes?.data?.data ?? {};
      const voteRows = Array.isArray(voteData?.results) ? voteData.results : [];
      const voteMap = new Map(
        voteRows.map((row) => [Number(row?.programApplyId), Number(row?.voteCount ?? 0)]),
      );

      const mapped = candidates
        .map((candidate) => ({
          id: Number(candidate?.programApplyId),
          name:
            candidate?.petName ||
            (candidate?.ticketNo
              ? `참가 반려동물 ${candidate.ticketNo}`
              : `참가 반려동물 #${candidate?.programApplyId}`),
          ownerNickname:
            candidate?.ownerNickname ||
            (candidate?.userId ? `보호자 #${candidate.userId}` : "보호자 정보 없음"),
          imageUrl: candidate?.imageUrl || null,
          petImageUrl: candidate?.petImageUrl || null,
          votes: voteMap.get(Number(candidate?.programApplyId)) ?? 0,
        }))
        .sort((a, b) => b.votes - a.votes);

      setProgram(programData);
      setRows(mapped);
      setTotalVotes(Number(voteData?.totalVotes ?? 0));
      setMyProgramApplyId(
        voteData?.myProgramApplyId == null ? null : Number(voteData.myProgramApplyId),
      );
    } catch (error) {
      setErrorMsg(
        error?.response?.data?.message ||
          error?.response?.data?.error?.message ||
          "콘테스트 상세 정보를 불러오지 못했습니다.",
      );
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [programId]);

  // 소속 행사: 제목 위 칩과 행사 상세 팝업에 쓴다
  const [eventInfo, setEventInfo] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  useEffect(() => {
    const id = program?.eventId ?? eventId;
    if (!id) return undefined;
    let alive = true;
    eventApi.getEventDetail(id).then((res) => { if (alive) setEventInfo(res?.data?.data ?? null); }).catch(() => {});
    return () => { alive = false; };
  }, [program?.eventId, eventId]);
  const openEventModal = () => {
    if (!eventInfo?.eventId) return;
    setSelectedEvent({
      id: eventInfo.eventId,
      eventId: eventInfo.eventId,
      title: eventInfo.eventName ?? "행사",
      location: eventInfo.location ?? "장소 미정",
      organizer: eventInfo.organizer ?? "정보 없음",
      image: eventInfo.imageUrl ?? null,
    });
  };

  const maxVotes = useMemo(
    () => rows.reduce((max, row) => (row.votes > max ? row.votes : max), 0),
    [rows],
  );

  const handleVote = async (candidateId) => {
    if (!candidateId || voteSubmittingId) return;
    if (contestPhase(program) !== "live") return;
    if (myProgramApplyId) return;

    if (!tokenStore.getAccess()) {
      try {
        const refreshed = await authApi.refresh();
        if (refreshed?.accessToken) {
          tokenStore.setAccess(refreshed.accessToken);
        } else {
          navigate("/auth/login", {
            state: { from: `/program/contest/${eventId}/detail/${programId}` },
          });
          return;
        }
      } catch {
        navigate("/auth/login", {
          state: { from: `/program/contest/${eventId}/detail/${programId}` },
        });
        return;
      }
    }

    setVoteSubmittingId(candidateId);
    try {
      await programApi.voteContest(Number(programId), Number(candidateId));
      await load({ silent: true });
    } catch (error) {
      if (error?.response?.status === 401) {
        navigate("/auth/login", {
          state: { from: `/program/contest/${eventId}/detail/${programId}` },
        });
      } else if (error?.response?.status === 409) {
        await load({ silent: true });
      } else {
        window.alert(
          error?.response?.data?.error?.message ||
            error?.response?.data?.message ||
            "투표 처리 중 문제가 발생했습니다.",
        );
      }
    } finally {
      setVoteSubmittingId(null);
    }
  };

  /* ── 참가신청 (펫 모달) ── */
  const [petModalOpen, setPetModalOpen] = useState(false);
  const [petOptions, setPetOptions] = useState([]);
  const [selectedPetId, setSelectedPetId] = useState(null);
  const [applyImageUrl, setApplyImageUrl] = useState("");
  const [applyImageFile, setApplyImageFile] = useState(null);
  const [applySubmitting, setApplySubmitting] = useState(false);
  const [myApplyStatus, setMyApplyStatus] = useState(null);
  const fileInputRef = useRef(null);

  const handleApply = async () => {
    if (!eventId || !programId) return;
    if (myApplyStatus) {
      window.alert("이미 참가 신청한 콘테스트입니다.");
      return;
    }

    if (!tokenStore.getAccess()) {
      try {
        const refreshed = await authApi.refresh();
        if (refreshed?.accessToken) tokenStore.setAccess(refreshed.accessToken);
        else throw new Error();
      } catch {
        navigate("/auth/login", { state: { from: `/program/contest/${eventId}/detail/${programId}` } });
        return;
      }
    }

    try {
      const petRes = await petApi.getMyPets();
      const pets = Array.isArray(petRes?.pets) ? petRes.pets : Array.isArray(petRes) ? petRes : [];
      if (!pets.length) {
        window.alert("등록된 반려동물이 없습니다. 반려동물 등록 후 신청해주세요.");
        navigate("/auth/mypage");
        return;
      }
      setPetOptions(pets);
      setSelectedPetId(pets[0]?.petId ?? null);
      setApplyImageUrl("");
      setApplyImageFile(null);
      setPetModalOpen(true);
    } catch (e) {
      if (e?.response?.status === 401) {
        navigate("/auth/login", { state: { from: `/program/contest/${eventId}/detail/${programId}` } });
      } else {
        window.alert(e?.response?.data?.message || e?.message || "반려동물 정보를 불러올 수 없습니다.");
      }
    }
  };

  const handleApplyImageChange = (e) => {
    const file = e?.target?.files?.[0];
    if (!file) return;
    const allowed = new Set(["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"]);
    if (!allowed.has(file.type?.toLowerCase())) {
      window.alert("jpg, png, gif, webp 파일만 업로드할 수 있습니다.");
      e.target.value = "";
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      window.alert("이미지 용량은 2MB 이하만 가능합니다.");
      e.target.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = (evt) => {
      setApplyImageUrl(String(evt?.target?.result || ""));
      setApplyImageFile(file);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const submitApply = async () => {
    if (!programId || !selectedPetId || applySubmitting) return;
    setApplySubmitting(true);
    try {
      let uploadedImageUrl = null;
      if (applyImageFile) {
        try {
          const form = new FormData();
          form.append("file", applyImageFile);
          const upRes = await axiosInstance.post("/api/galleries/image/upload", form, { headers: { "Content-Type": "multipart/form-data" } });
          const rawPath = upRes?.data?.data?.publicPath ?? upRes?.data?.publicPath ?? null;
          if (rawPath) uploadedImageUrl = toPublicAssetUrl(rawPath) || rawPath;
        } catch {}
      }
      await programApi.createProgramApply({ programId: Number(programId), petId: Number(selectedPetId), imageUrl: uploadedImageUrl });
      setMyApplyStatus("APPLIED");
      setPetModalOpen(false);
      setApplyImageUrl("");
      setApplyImageFile(null);
      window.alert("참가 신청이 완료됐습니다! 관리자 승인 후 투표 후보로 등록됩니다.");
      await load({ silent: true });
    } catch (e) {
      if (e?.response?.status === 409) {
        setMyApplyStatus("APPLIED");
        setPetModalOpen(false);
      } else if (e?.response?.status === 401) {
        navigate("/auth/login", { state: { from: `/program/contest/${eventId}/detail/${programId}` } });
      } else {
        window.alert(e?.response?.data?.message || "신청에 실패했습니다. 다시 시도해주세요.");
      }
    } finally {
      setApplySubmitting(false);
    }
  };

  const listTarget = getProgramListTarget(eventInfo?.status, program?.eventId ?? eventId, eventInfo?.eventName);
  const back = useDetailBackTarget(listTarget);

  return (
    <div className="pdl-root cd-root">
      <style>{programDetailStyles}</style>
      <style>{styles}</style>
      <PageHeader
        title="콘테스트 상세"
        subtitle="진행 중인 콘테스트의 투표 현황을 확인합니다"
        icon={<Trophy size={42} color="#90C450" strokeWidth={1.6} />}
        titleStyle={{ fontSize: 46, lineHeight: "66px", letterSpacing: "-1px" }}
        subtitleStyle={{ fontSize: 20 }}
      />

      <main className="pdl-container">
        <DetailTopNav label={back.label} onClick={back.go} />
        <ProgramHero
          image={program?.imageUrl ? toPublicAssetUrl(program.imageUrl) || program.imageUrl : null}
          imageAlt={program?.programTitle}
          status={program ? getProgramStatus(program.startAt, program.endAt) : null}
          chips={[
            { key: "cat", label: "콘테스트" },
            ...(eventInfo?.eventName ? [{ key: "event", label: eventInfo.eventName, onClick: openEventModal }] : []),
          ]}
          title={program?.programTitle || `콘테스트 #${programId}`}
          facts={[
            { key: "date", icon: <Calendar size={15} />, label: "일정", value: formatDateWithWeekday(program?.startAt) },
            { key: "time", icon: <Clock3 size={15} />, label: "시간", value: formatTimeRange(program?.startAt, program?.endAt) },
            { key: "pets", icon: <Users size={15} />, label: "참가", value: `${rows.length}마리` },
            {
              key: "votes",
              icon: <Trophy size={15} />,
              label: "총 투표",
              value: `${totalVotes.toLocaleString()}표`,
              sub: rows[0]?.votes > 0 ? `1위 ${rows[0].name} ${rows[0].votes.toLocaleString()}표` : null,
            },
          ]}
          description={program?.description}
          descriptionTitle="콘테스트 소개"
          extra={program ? <ContestSteps phase={contestPhase(program)} timeLabel={`${formatDateWithWeekday(program.startAt)} ${formatTimeRange(program.startAt, program.endAt)}`} /> : null}
          actions={
            <button
              type="button"
              className="pdl-btn-primary"
              onClick={handleApply}
              disabled={contestPhase(program) === "ended" || !!myApplyStatus}
            >
              <PawPrint size={18} strokeWidth={2.2} />
              {myApplyStatus ? "신청 완료" : contestPhase(program) === "ended" ? "참가 마감" : "참가 신청"}
            </button>
          }
        />

        {loading ? <div className="pdl-empty">투표 결과를 불러오는 중입니다.</div> : null}
        {errorMsg ? <div className="pdl-empty">{errorMsg}</div> : null}

        {!loading && !errorMsg ? (
          <section className="pdl-grid-2 cd-equal">
            <DetailSection title="참가 반려동물" meta={`${rows.length}마리`}>
              <div className="cd-candidate-scroll"><div className="cd-candidate-scroll-inner">
              <div className="cd-candidate-grid">
                {rows.length === 0 ? <div className="pdl-empty">참가 반려동물 정보가 없습니다.</div> : null}

                {rows.map((row, index) => (
                  <div key={row.id} className="cd-candidate-card">
                    <div className="cd-candidate-thumb">
                      {totalVotes > 0 && index < 3 && (
                        <span className="cd-rank-badge" style={{ color: MEDAL[index].color, background: MEDAL[index].bg, border: `1px solid ${MEDAL[index].ring}` }}>
                          {index === 0 && <Crown size={13} strokeWidth={2.4} />}{MEDAL[index].label}
                        </span>
                      )}
                      {/* 신청 사진 → 반려동물 프로필 → 발바닥 아이콘 순으로 표시 (정사각형 cover) */}
                      <PetAvatar
                        src={[row.imageUrl, row.petImageUrl]}
                        name={row.name}
                        size="100%"
                        radius={0}
                        iconSize={48}
                      />
                    </div>

                    <div className="cd-candidate-body">
                      <div className="cd-candidate-name">{row.name}</div>
                      <div className="cd-candidate-owner">보호자 {row.ownerNickname}</div>
                      <div className="cd-candidate-votes">
                        득표 {row.votes.toLocaleString()}표
                      </div>

                      <div className="cd-candidate-actions">
                        <button
                          type="button"
                          className={`cd-vote-btn${myProgramApplyId === row.id ? " done" : ""}`}
                          onClick={() => handleVote(row.id)}
                          disabled={
                            voteSubmittingId === row.id ||
                            myProgramApplyId != null ||
                            contestPhase(program) !== "live"
                          }
                        >
                          {myProgramApplyId === row.id
                            ? "내 투표"
                            : voteSubmittingId === row.id
                              ? "투표 중..."
                              : contestPhase(program) === "upcoming"
                                ? "투표 시작 전"
                                : contestPhase(program) === "ended"
                                  ? "투표 마감"
                                  : "투표하기"}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              </div></div>
            </DetailSection>

            <DetailSection title={contestPhase(program) === "ended" ? "최종 순위" : "실시간 순위"} meta={`총 ${totalVotes.toLocaleString()}표`}>
              <ContestPodium rows={rows} totalVotes={totalVotes} />
              {rows.length > 3 && <div className="cd-rest-title">4위부터</div>}
              <div className="cd-list">
                {rows.length === 0 ? <div className="pdl-empty">집계된 결과가 없습니다.</div> : null}

                {rows.slice(3).map((row, i) => { const index = i + 3; return (
                  <div key={`rank-${row.id}`} className="cd-item">
                    <div className="cd-item-top">
                      <div className="cd-name">
                        <span className={`cd-rank${index === 0 ? " top" : ""}`}>{index + 1}위</span>
                        {row.name}
                      </div>
                      <div className="cd-votes">
                        {totalVotes > 0 ? Math.round((row.votes / totalVotes) * 100) : 0}%
                      </div>
                    </div>
                    <div className="cd-progress">
                      <div
                        className="cd-progress-fill"
                        style={{ width: `${maxVotes > 0 ? (row.votes / maxVotes) * 100 : 0}%` }}
                      />
                    </div>
                    <div className="cd-meta">{row.votes.toLocaleString()}표</div>
                  </div>
                ); })}
              </div>

              {/* 투표 안내: 기간·방법·결과 */}
              <dl className="cd-guide">
                <div className="cd-guide-row"><dt>투표 기간</dt><dd>{program ? `${formatDateWithWeekday(program.startAt)} ${formatTimeRange(program.startAt, program.endAt)}` : "-"}</dd></div>
                <div className="cd-guide-row"><dt>투표 방법</dt><dd>참가 반려동물 카드의 ‘투표하기’ · 1인 1표</dd></div>
                <div className="cd-guide-row"><dt>결과 발표</dt><dd>투표 마감 후 최다 득표 순으로 공개</dd></div>
              </dl>
              {contestPhase(program) === "upcoming" && (
                <div className="cd-guide-note">투표가 시작되면 순위가 실시간으로 바뀌어요.</div>
              )}
              {contestPhase(program) === "live" && (
                <div className="cd-guide-note">지금 투표가 진행 중이에요. 순위는 실시간으로 반영돼요.</div>
              )}
            </DetailSection>
          </section>
        ) : null}

        <DetailBottomNav label={back.label} onClick={back.go} />
      </main>

      {selectedEvent && <EventDetailModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />}

      {/* ── Pet Apply Modal ── */}
      {petModalOpen && (
        <div className="cd-modal-overlay" onClick={() => { setPetModalOpen(false); setApplyImageUrl(""); setApplyImageFile(null); }}>
          <div className="cd-modal" onClick={(e) => e.stopPropagation()}>
            <div className="cd-modal-title">참가 신청</div>
            <div className="cd-modal-sub">참가할 반려동물과 사진을 선택해 주세요</div>
            <select className="cd-modal-select" value={selectedPetId ?? ""} onChange={(e) => setSelectedPetId(Number(e.target.value))}>
              {petOptions.map((pet) => (
                <option key={pet.petId} value={pet.petId}>{pet.petName || `Pet #${pet.petId}`}</option>
              ))}
            </select>
            <label className={`cd-upload-area${applyImageUrl ? " has-image" : ""}`}>
              <input type="file" accept="image/*" className="cd-upload-input" ref={fileInputRef} onChange={handleApplyImageChange} />
              {applyImageUrl ? (
                <>
                  <img src={applyImageUrl} alt="preview" className="cd-upload-preview" />
                  <span className="cd-upload-change">변경</span>
                </>
              ) : (
                <>
                  <div className="cd-upload-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <rect width="24" height="24" rx="6" fill="#e8eadc" />
                      <path d="M12 7v10M7 12h10" stroke="#90C450" strokeWidth="2.2" strokeLinecap="round" />
                    </svg>
                  </div>
                  <div className="cd-upload-text">클릭하거나 이미지를 드래그하세요</div>
                  <div className="cd-upload-hint">JPG, PNG, GIF, WEBP · 최대 2MB</div>
                </>
              )}
            </label>
            <div className="cd-modal-btns">
              <button type="button" className="cd-modal-btn cancel" onClick={() => { setPetModalOpen(false); setApplyImageUrl(""); setApplyImageFile(null); }}>취소</button>
              <button type="button" className="cd-modal-btn confirm" onClick={submitApply} disabled={!selectedPetId || applySubmitting}>
                {applySubmitting ? "신청 중..." : "신청하기"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
