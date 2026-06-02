import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import PageHeader from "../components/PageHeader";
import PageLoading from "../components/PageLoading";
import EventSelectPage from "../components/EventSelectPage";
import {
  SERVICE_CATEGORIES,
  SUBTITLE_MAP,
} from "../constants/programConstants";
import { eventApi } from "../../../app/http/eventApi";
import { programApi } from "../../../app/http/programApi";
import { petApi } from "../../../app/http/petApi";
import { tokenStore } from "../../../app/http/tokenStore";
import { axiosInstance } from "../../../app/http/axiosInstance";
import { authApi } from "../auth/api/authApi";
import { resolveImageUrl, toPublicAssetUrl } from "../../../shared/utils/publicAssetUrl";
import {
  loadImageCache as loadProgramImageCache,
  getProgramImageMap,
} from "../../admin/shared/programImageStore";
import {
  Trophy,
  Users,
  Clock,
  Crown,
  ChevronRight,
  Heart,
  CheckCircle2,
  Timer,
  Sparkles,
  Check,
  X,
  AlertCircle,
  Vote,
  TrendingUp,
  CircleDot,
  Info,
  Search,
} from "lucide-react";

const styles = `
  @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.min.css');

  .ct-root {
    box-sizing: border-box;
    font-family: 'Pretendard Variable', 'Pretendard', -apple-system, sans-serif;
    background: #f8f9fc;
    min-height: 100vh;
  }
  .ct-root *, .ct-root *::before, .ct-root *::after { box-sizing: border-box; font-family: inherit; }
  .ct-container { max-width: 1400px; margin: 0 auto; padding: 32px 25px 80px; }

  /* live badge */
  .ct-live-badge {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 5px 14px; background: #fff0f0; border: 1px solid #fecaca;
    border-radius: 100px; font-size: 11px; font-weight: 700; color: #ef4444;
    letter-spacing: 0.5px; margin-bottom: 20px;
  }
  .ct-live-dot {
    width: 7px; height: 7px; border-radius: 50%; background: #ef4444;
    animation: ct-pulse 1.4s ease-in-out infinite;
  }
  @keyframes ct-pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.4; transform: scale(0.7); }
  }

  /* stat cards */
  .ct-stat-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 20px; }
  .ct-stat-card {
    background: #fff; border: 1px solid #e9ecef; border-radius: 13px; padding: 20px 22px;
    display: flex; align-items: center; gap: 14px;
  }
  .ct-stat-icon { width: 44px; height: 44px; border-radius: 11px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .ct-stat-label { font-size: 12px; color: #6b7280; font-weight: 500; margin-bottom: 2px; }
  .ct-stat-value { font-size: 22px; font-weight: 800; color: #111827; letter-spacing: -0.2px; }

  /* current contest highlight */
  .ct-highlight {
    background: linear-gradient(135deg, #4a8c2a 0%, #6fa834 50%, #90C450 100%);
    border-radius: 16px; padding: 28px 28px 24px; color: #fff; margin-bottom: 24px;
    position: relative; overflow: hidden;
  }
  .ct-highlight::before {
    content: ''; position: absolute; top: -60px; right: -40px;
    width: 200px; height: 200px; background: rgba(255,255,255,0.06); border-radius: 50%;
  }
  .ct-highlight::after {
    content: ''; position: absolute; bottom: -80px; left: 30%;
    width: 250px; height: 250px; background: rgba(255,255,255,0.04); border-radius: 50%;
  }
  .ct-highlight-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; position: relative; z-index: 1; }
  .ct-highlight-badge {
    display: inline-flex; align-items: center; gap: 5px;
    padding: 4px 12px; background: rgba(255,255,255,0.18); backdrop-filter: blur(4px);
    border-radius: 100px; font-size: 11px; font-weight: 700; letter-spacing: 0.3px;
  }
  .ct-highlight-badge-dot { width: 6px; height: 6px; border-radius: 50%; background: #a8d96a; animation: ct-pulse 1.4s ease-in-out infinite; }
  .ct-highlight-name { font-size: 26px; font-weight: 900; margin-bottom: 14px; position: relative; z-index: 1; letter-spacing: -0.5px; display: flex; align-items: center; gap: 10px; }
  .ct-highlight-info { display: flex; gap: 20px; margin-bottom: 18px; position: relative; z-index: 1; }
  .ct-highlight-item { display: flex; align-items: center; gap: 6px; font-size: 13px; opacity: 0.85; font-weight: 500; }
  .ct-highlight-progress-wrap { position: relative; z-index: 1; }
  .ct-highlight-progress-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
  .ct-highlight-progress-text { font-size: 13px; font-weight: 600; }
  .ct-progress-bar { height: 6px; background: rgba(255,255,255,0.18); border-radius: 100px; overflow: hidden; }
  .ct-progress-fill { height: 100%; background: #a8d96a; border-radius: 100px; transition: width 0.8s cubic-bezier(0.4,0,0.2,1); }

  /* main layout */
  .ct-main-grid { display: block; }

  /* card base */
  .ct-card {
    background: #fff; border: 1px solid #e9ecef; border-radius: 13px;
    padding: 24px 28px; margin-bottom: 16px;
  }
  .ct-card-header {
    display: flex; align-items: center; justify-content: space-between;
    margin-bottom: 16px; padding-bottom: 14px; border-bottom: 1px solid #f1f3f6;
  }
  .ct-card-title { font-size: 15px; font-weight: 700; color: #1a1d24; display: flex; align-items: center; gap: 8px; margin: 0; }
  .ct-card-title-icon { width: 26px; height: 26px; border-radius: 7px; display: flex; align-items: center; justify-content: center; }
  .ct-card-tag { font-size: 11px; font-weight: 600; color: #868e9c; background: #f3f4f7; padding: 4px 10px; border-radius: 100px; }

  /* Contest list */
  .ct-contest-list { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 20px; }
  .ct-contest-item {
    position: relative; overflow: hidden; padding: 0;
    border-radius: 16px;
    background: #fff;
    border: 1.5px solid #e9ecef;
    box-shadow: 0 2px 12px rgba(15,23,42,0.06);
    transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
    cursor: pointer; display: flex; flex-direction: column;
  }
  .ct-contest-item::before {
    content: ""; position: absolute; top: 0; left: 0; right: 0; height: 3px;
    background: linear-gradient(90deg, #6fa834, #90C450);
    opacity: 0; transition: opacity 0.2s;
  }
  .ct-contest-item:hover { transform: translateY(-3px); box-shadow: 0 10px 32px rgba(15,23,42,0.1); border-color: #6fa834; }
  .ct-contest-item:hover::before { opacity: 1; }
  .ct-contest-item.active { border-color: #6fa834; box-shadow: 0 0 0 3px rgba(111,168,52,0.12), 0 8px 28px rgba(15,23,42,0.08); }
  .ct-contest-item.active::before { opacity: 1; }

  .ct-contest-thumb { width:100%; aspect-ratio:16/9; position:relative; overflow:hidden; background:linear-gradient(135deg,#f0f9e4 0%,#ddf0b8 100%); }
  .ct-contest-thumb img { width:100%; height:100%; object-fit:cover; display:block; transition:transform 0.3s; }
  .ct-contest-item:not(.ended-card):hover .ct-contest-thumb img { transform:scale(1.04); }
  .ct-contest-thumb-ph { position:absolute; inset:0; display:flex; align-items:center; justify-content:center; }
  .ct-contest-top { padding: 14px 18px 0; display: flex; flex-direction: column; gap: 10px; flex: 1; }
  .ct-contest-head-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; }
  .ct-contest-icon {
    width: 40px; height: 40px; border-radius: 11px;
    background: linear-gradient(135deg, #f0f9e4, #ddf0b8);
    border: 1px solid #c5e6a0;
    display: flex; align-items: center; justify-content: center; flex-shrink: 0;
  }
  .ct-contest-badge {
    display: inline-flex; align-items: center; gap: 4px;
    padding: 4px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; flex-shrink: 0;
  }
  .ct-contest-badge.live { background: #ddf0b8; color: #5a9a30; border: 1px solid #c5e6a0; }
  .ct-contest-badge.upcoming { background: #E6F7F2; color: #90C450; border: 1px solid #CCF0E4; }
  .ct-contest-badge.ended { background: #fff1f2; color: #e11d48; border: 1px solid #fecdd3; }

  .ct-contest-info { flex: 1; min-width: 0; width: 100%; }
  .ct-contest-name { font-size: 14px; font-weight: 800; color: #111827; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; line-height: 1.4; letter-spacing: -0.2px; }
  .ct-contest-cat { font-size: 10px; color: #6fa834; margin-top: 3px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; }
  .ct-contest-desc { font-size: 12px; color: #6b7280; margin-top: 6px; line-height: 1.55; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
  .ct-contest-meta-row { width: 100%; }
  .ct-contest-sub { font-size: 11px; color: #9ca3af; display: flex; align-items: center; gap: 10px; }

  .ct-contest-divider { width: 100%; height: 1px; background: #f8f9fc; margin-top: 14px; }
  .ct-contest-bottom { padding: 12px 18px 0; }
  .ct-contest-capacity { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
  .ct-contest-capacity-text { font-size: 13px; font-weight: 700; color: #374151; }
  .ct-contest-state-pill { display: none; }
  .ct-contest-progress { width: 100%; height: 4px; border-radius: 999px; background: #f8f9fc; overflow: hidden; margin-bottom: 0; }
  .ct-contest-progress-fill { height: 100%; border-radius: 999px; background: linear-gradient(90deg, #6fa834, #90C450); transition: width 0.5s ease; }

  .ct-contest-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; padding: 12px 18px 18px; }
  .ct-list-btn {
    height: 36px; border-radius: 9px; font-size: 12px; font-weight: 700; cursor: pointer;
    display: flex; align-items: center; justify-content: center; gap: 5px;
    transition: all 0.15s ease; letter-spacing: 0.1px;
  }
  .ct-list-btn.primary {
    border: none;
    background: linear-gradient(135deg, #6fa834, #90C450);
    color: #fff; box-shadow: 0 3px 10px rgba(111,168,52,0.35);
  }
  .ct-list-btn.primary:hover { transform: translateY(-1px); box-shadow: 0 5px 16px rgba(111,168,52,0.45); }
  .ct-list-btn.primary:disabled { opacity: 0.45; cursor: not-allowed; transform: none; box-shadow: none; background: #e5e7eb; color: #9ca3af; }
  .ct-list-btn.outline { border: 1.5px solid #e5e7eb; background: #fff; color: #4b5563; }
  .ct-list-btn.outline:hover { border-color: #d1d5db; background: #f9fafb; color: #111827; }
  .ct-contest-item.ended-card { opacity:0.42 !important; filter:grayscale(0.7) !important; pointer-events:none !important; cursor:default !important; }
  .ct-contest-item.ended-card:hover { transform:none !important; box-shadow:none !important; }
  .ct-contest-item.ended-card::before { display:none !important; }
  @media (max-width: 1080px) { .ct-contest-list { grid-template-columns: repeat(2, 1fr); } }
  @media (max-width: 680px) { .ct-contest-list { grid-template-columns: 1fr; } }
  }

  /* candidate voting cards */
  .ct-vote-area { margin-bottom: 0; }
  .ct-candidates-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; }
  .ct-candidate-card {
    background: #fff; border: 1.5px solid #eceef3; border-radius: 16px;
    padding: 0; overflow: hidden; transition: all 0.22s; cursor: pointer;
    position: relative;
  }
  .ct-candidate-card:hover { border-color: #b8de8a; transform: translateY(-3px); box-shadow: 0 8px 24px rgba(0,0,0,0.07); }
  .ct-candidate-card.voted { border-color: #6fa834; box-shadow: 0 0 0 3px rgba(111,168,52,0.1); }
  .ct-candidate-card.voted .ct-candidate-voted-check { display: flex; }

  /* Image area */
  .ct-candidate-img-wrap {
    width: 100%; aspect-ratio: 4/3; position: relative; overflow: hidden;
    background: #f1f3f6;
  }
  .ct-candidate-img-wrap img {
    width: 100%; height: 100%; object-fit: cover;
    transition: transform 0.3s;
  }
  .ct-candidate-card:hover .ct-candidate-img-wrap img { transform: scale(1.05); }
  .ct-candidate-img-overlay {
    position: absolute; inset: 0;
    background: linear-gradient(180deg, transparent 50%, rgba(0,0,0,0.35) 100%);
    pointer-events: none;
  }
  .ct-candidate-rank-badge {
    position: absolute; top: 10px; left: 10px;
    width: 30px; height: 30px; border-radius: 9px;
    display: flex; align-items: center; justify-content: center;
    font-size: 13px; font-weight: 800; color: #fff;
    backdrop-filter: blur(8px); z-index: 2;
  }
  .ct-candidate-rank-badge.r1 { background: linear-gradient(135deg, #6fa834, #90C450); }
  .ct-candidate-rank-badge.r2 { background: linear-gradient(135deg, #94a3b8, #64748b); }
  .ct-candidate-rank-badge.r3 { background: linear-gradient(135deg, #5a9a30, #b45309); }
  .ct-candidate-rank-badge.r-default { background: rgba(0,0,0,0.4); backdrop-filter: blur(8px); }

  .ct-candidate-voted-check {
    display: none; position: absolute; top: 10px; right: 10px;
    width: 30px; height: 30px; border-radius: 50%;
    background: #5a9a30; align-items: center; justify-content: center;
    z-index: 2; animation: ct-check-pop 0.3s cubic-bezier(0.34,1.56,0.64,1);
  }
  @keyframes ct-check-pop {
    from { transform: scale(0); } to { transform: scale(1); }
  }

  .ct-candidate-img-votes {
    position: absolute; bottom: 10px; left: 12px; z-index: 2;
    display: flex; align-items: center; gap: 5px;
    padding: 4px 10px; border-radius: 100px;
    background: rgba(0,0,0,0.5); backdrop-filter: blur(6px);
    font-size: 12px; font-weight: 700; color: #fff;
  }

  /* Body area */
  .ct-candidate-body { padding: 14px 16px 16px; }
  .ct-candidate-name-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px; }
  .ct-candidate-name { font-size: 16px; font-weight: 800; color: #1a1d24; }
  .ct-candidate-pct { font-size: 14px; font-weight: 800; color: #4a8c2a; }
  .ct-candidate-breed { font-size: 13px; color: #868e9c; font-weight: 500; margin-bottom: 12px; }

  /* Vote bar inside card */
  .ct-candidate-bar-track { height: 6px; background: #f1f3f6; border-radius: 100px; overflow: hidden; margin-bottom: 14px; }
  .ct-candidate-bar-fill { height: 100%; border-radius: 100px; transition: width 0.6s cubic-bezier(0.4,0,0.2,1); }

  /* Vote button */
  .ct-vote-btn {
    display: flex; align-items: center; justify-content: center; gap: 7px;
    width: 100%; padding: 11px 0; border-radius: 10px; border: none;
    font-family: inherit; font-size: 14px; font-weight: 700;
    cursor: pointer; transition: all 0.2s;
    background: linear-gradient(135deg, #5a9a30 0%, #7ab33e 100%);
    color: #fff; box-shadow: 0 2px 10px rgba(90,154,48,0.25);
  }
  .ct-vote-btn:hover { box-shadow: 0 4px 20px rgba(90,154,48,0.35); transform: translateY(-1px); }
  .ct-vote-btn:active { transform: translateY(0); }
  .ct-vote-btn.voted {
    background: linear-gradient(135deg, #ecf8dc 0%, #edf7e0 100%);
    color: #5a9a30; box-shadow: none; cursor: default;
    border: 1.5px solid #c5e6a0;
  }
  .ct-vote-btn.voted:hover { transform: none; box-shadow: none; }
  .ct-vote-btn.disabled {
    background: #f8f9fc; color: #b0b5c0;
    box-shadow: none; cursor: not-allowed; border: 1px solid #eceef3;
  }
  .ct-vote-btn.disabled:hover { transform: none; }
  .ct-vote-btn.ended-btn {
    background: #f9fafb; color: #9ca3af; box-shadow: none;
    cursor: default; border: 1px solid #eceef3;
  }

  /* my vote confirmation toast */
  .ct-my-vote {
    display: flex; align-items: center; gap: 12px;
    background: linear-gradient(135deg, #f0f9e4 0%, #ecf8dc 100%);
    border: 1.5px solid #c5e6a0; border-radius: 12px;
    padding: 14px 18px; margin-bottom: 16px;
    animation: ct-slide-down 0.35s ease-out;
  }
  .ct-my-vote-icon {
    width: 38px; height: 38px; border-radius: 10px;
    background: linear-gradient(135deg, #5a9a30, #7ab33e);
    display: flex; align-items: center; justify-content: center; flex-shrink: 0;
  }
  .ct-my-vote-text { font-size: 14px; color: #2d5a12; font-weight: 600; line-height: 1.5; }
  .ct-my-vote-name { font-weight: 800; color: #4a8c2a; }
  @keyframes ct-slide-down {
    from { opacity: 0; transform: translateY(-10px); }
    to { opacity: 1; transform: translateY(0); }
  }

  /* modal overlay */
  .ct-modal-overlay {
    position: fixed; inset: 0; z-index: 9999;
    background: rgba(0,0,0,0.45); backdrop-filter: blur(4px);
    display: flex; align-items: center; justify-content: center;
    animation: ct-modal-bg-in 0.2s ease-out;
    padding: 20px;
  }
  @keyframes ct-modal-bg-in {
    from { opacity: 0; } to { opacity: 1; }
  }
  .ct-modal {
    background: #fff; border-radius: 20px; width: 100%; max-width: 400px;
    overflow: hidden; box-shadow: 0 20px 60px rgba(0,0,0,0.2);
    animation: ct-modal-in 0.3s cubic-bezier(0.34,1.56,0.64,1);
  }
  @keyframes ct-modal-in {
    from { opacity: 0; transform: scale(0.9) translateY(20px); }
    to { opacity: 1; transform: scale(1) translateY(0); }
  }
  .ct-modal-img { width: 100%; height: 200px; object-fit: cover; }
  .ct-modal-body { padding: 24px 24px 20px; text-align: center; }
  .ct-modal-title { font-size: 20px; font-weight: 800; color: #1a1d24; margin-bottom: 4px; }
  .ct-modal-breed { font-size: 14px; color: #868e9c; font-weight: 500; margin-bottom: 16px; }
  .ct-modal-warning {
    display: flex; align-items: center; gap: 8px; justify-content: center;
    padding: 10px 16px; background: #f0f9e4; border: 1px solid #ddf0b8;
    border-radius: 10px; margin-bottom: 20px;
    font-size: 13px; color: #2d5a12; font-weight: 600;
  }
  .ct-modal-question { font-size: 16px; font-weight: 700; color: #374151; margin-bottom: 20px; }
  .ct-modal-btns { display: flex; gap: 10px; }
  .ct-modal-btn {
    flex: 1; padding: 13px 0; border-radius: 12px; border: none;
    font-family: inherit; font-size: 15px; font-weight: 700; cursor: pointer;
    transition: all 0.15s; display: flex; align-items: center; justify-content: center; gap: 6px;
  }
  .ct-modal-btn.cancel { background: #f8f9fc; color: #6b7280; }
  .ct-modal-btn.cancel:hover { background: #e5e7eb; }
  .ct-modal-btn.confirm {
    background: linear-gradient(135deg, #5a9a30 0%, #7ab33e 100%);
    color: #fff; box-shadow: 0 2px 12px rgba(90,154,48,0.3);
  }
  .ct-modal-btn.confirm:hover { box-shadow: 0 4px 20px rgba(90,154,48,0.4); transform: translateY(-1px); }
  .ct-modal-close {
    position: absolute; top: 12px; right: 12px;
    width: 32px; height: 32px; border-radius: 50%;
    background: rgba(0,0,0,0.4); backdrop-filter: blur(4px);
    border: none; cursor: pointer; display: flex; align-items: center; justify-content: center;
    color: #fff; transition: background 0.15s; z-index: 2;
  }
  .ct-modal-close:hover { background: rgba(0,0,0,0.6); }
  .ct-modal-img-wrap { position: relative; }

  /* ranking sidebar */
  .ct-ranking-list { display: flex; flex-direction: column; gap: 6px; }
  .ct-ranking-item {
    display: flex; align-items: center; gap: 10px;
    padding: 12px 14px; border-radius: 10px; background: #fafbfc;
    transition: background 0.15s;
  }
  .ct-ranking-item:hover { background: #edf7e0; }
  .ct-ranking-item.top { background: #f4fbe8; }
  .ct-ranking-rank {
    width: 26px; height: 26px; border-radius: 8px;
    display: flex; align-items: center; justify-content: center;
    font-size: 12px; font-weight: 800; flex-shrink: 0;
  }
  .ct-ranking-rank.gold { background: #ddf0b8; color: #5a9a30; }
  .ct-ranking-rank.silver { background: #f1f5f9; color: #64748b; }
  .ct-ranking-rank.bronze { background: #fff7ed; color: #c2410c; }
  .ct-ranking-rank.default { background: #f8f9fc; color: #9ca3af; }
  .ct-ranking-avatar {
    width: 36px; height: 36px; border-radius: 50%; flex-shrink: 0;
    overflow: hidden; border: 2px solid #eceef3;
  }
  .ct-ranking-avatar img { width: 100%; height: 100%; object-fit: cover; }
  .ct-ranking-info { flex: 1; min-width: 0; }
  .ct-ranking-name { font-size: 13px; font-weight: 700; color: #1a1d24; }
  .ct-ranking-breed { font-size: 11px; color: #a0a7b5; }
  .ct-ranking-bar-wrap { margin-top: 5px; }
  .ct-ranking-bar { height: 4px; background: #f1f3f6; border-radius: 100px; overflow: hidden; }
  .ct-ranking-bar-fill { height: 100%; border-radius: 100px; transition: width 0.6s cubic-bezier(0.4,0,0.2,1); }
  .ct-ranking-score-col { text-align: right; }
  .ct-ranking-score { font-size: 14px; font-weight: 800; color: #4a8c2a; }
  .ct-ranking-score-label { font-size: 10px; color: #a0a7b5; font-weight: 500; }

  /* upcoming / ended state */
  .ct-state-overlay {
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    padding: 48px 20px; text-align: center;
  }
  .ct-state-icon {
    width: 60px; height: 60px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center; margin-bottom: 16px;
  }
  .ct-state-title { font-size: 17px; font-weight: 700; color: #374151; margin-bottom: 6px; }
  .ct-state-desc { font-size: 13px; color: #9ca3af; line-height: 1.6; }

  /* card entrance */
  .ct-fade-in { animation: ct-fade-in 0.35s ease-out both; }
  @keyframes ct-fade-in {
    from { opacity: 0; transform: translateY(12px); }
    to { opacity: 1; transform: translateY(0); }
  }

  /* responsive */
  @media (max-width: 1100px) { .ct-main-grid { grid-template-columns: 1fr; } }
  @media (max-width: 700px) {
    .ct-container { padding: 20px 16px 60px; }
    .ct-stat-grid { grid-template-columns: 1fr 1fr; }
    .ct-candidates-grid { grid-template-columns: 1fr; }
    .ct-highlight-name { font-size: 20px; }
    .ct-highlight-info { flex-wrap: wrap; gap: 10px; }
    .ct-modal { max-width: 100%; }
  }

  .ct-pet-modal-overlay {
    position: fixed; inset: 0; z-index: 9999;
    background: rgba(0,0,0,0.45); display: flex;
    align-items: center; justify-content: center; padding: 20px;
  }
  .ct-pet-modal {
    width: 100%; max-width: 440px; background: #fff;
    border-radius: 18px; box-shadow: 0 20px 60px rgba(0,0,0,0.18); padding: 26px;
  }
  .ct-pet-title { font-size: 17px; font-weight: 800; color: #111827; margin-bottom: 4px; }
  .ct-pet-sub { font-size: 13px; color: #9ca3af; margin-bottom: 16px; }
  .ct-pet-select {
    width: 100%; height: 44px; border-radius: 10px; border: 1.5px solid #e5e7eb;
    padding: 0 12px; font-size: 14px; color: #111827; margin-bottom: 16px;
    background: #f9fafb; appearance: none; cursor: pointer;
  }
  .ct-pet-select:focus { outline: none; border-color: #6fa834; box-shadow: 0 0 0 3px rgba(111,168,52,0.12); }
  .ct-pet-upload-area {
    width: 100%; border-radius: 12px; border: 2px dashed #e5e7eb; background: #f9fafb;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    gap: 8px; cursor: pointer; transition: border-color 0.2s, background 0.2s;
    padding: 28px 20px; margin-bottom: 16px; position: relative;
  }
  .ct-pet-upload-area:hover { border-color: #6fa834; background: #f0f9e4; }
  .ct-pet-upload-area.has-image { padding: 0; overflow: hidden; aspect-ratio: 1/1; border-style: solid; border-color: #e5e7eb; }
  .ct-pet-upload-icon { width: 48px; height: 48px; border-radius: 12px; background: #ecf8dc; display: flex; align-items: center; justify-content: center; border: 1px solid #c5e6a0; }
  .ct-pet-upload-text { font-size: 14px; font-weight: 700; color: #374151; }
  .ct-pet-upload-hint { font-size: 12px; color: #9ca3af; }
  .ct-pet-upload-input { display: none; }
  .ct-pet-upload-preview-img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .ct-pet-upload-change { position: absolute; bottom: 8px; right: 8px; background: rgba(0,0,0,0.55); color: #fff; border: none; border-radius: 7px; font-size: 11px; font-weight: 700; padding: 5px 10px; cursor: pointer; }
  .ct-pet-btns { display: flex; gap: 8px; }
  .ct-pet-btn { flex: 1; height: 42px; border-radius: 10px; font-size: 13.5px; font-weight: 700; cursor: pointer; transition: all 0.15s; }
  .ct-pet-btn.cancel { background: #f8f9fc; color: #6b7280; border: 1px solid #e5e7eb; }
  .ct-pet-btn.cancel:hover { background: #e5e7eb; }
  .ct-pet-btn.confirm { background: linear-gradient(135deg, #6fa834, #90C450); color: #fff; border: none; box-shadow: 0 4px 12px rgba(111,168,52,0.3); }
  .ct-pet-btn.confirm:hover { transform: translateY(-1px); box-shadow: 0 6px 18px rgba(111,168,52,0.4); }
  /* 크롭 모달 */
  .ct-crop-overlay { position: fixed; inset: 0; z-index: 10000; background: rgba(0,0,0,0.75); display: flex; align-items: center; justify-content: center; padding: 20px; }
  .ct-crop-modal { background: #fff; border-radius: 18px; box-shadow: 0 24px 80px rgba(0,0,0,0.3); width: 420px; max-width: calc(100vw - 40px); overflow: hidden; }
  .ct-crop-header { padding: 18px 22px 14px; border-bottom: 1px solid #f3f4f6; }
  .ct-crop-title { font-size: 16px; font-weight: 800; color: #111827; }
  .ct-crop-hint { font-size: 12px; color: #9ca3af; margin-top: 2px; }
  .ct-crop-canvas-wrap { position: relative; background: #1a1a1a; overflow: hidden; touch-action: none; line-height: 0; }
  .ct-crop-footer { display: flex; gap: 10px; padding: 14px 22px 18px; }
  .ct-crop-btn { flex: 1; height: 42px; border-radius: 10px; font-size: 13px; font-weight: 700; cursor: pointer; border: none; transition: all 0.15s; }
  .ct-crop-btn.cancel { background: #f8f9fc; color: #6b7280; }
  .ct-crop-btn.confirm { background: linear-gradient(135deg, #6fa834, #90C450); color: #fff; box-shadow: 0 4px 12px rgba(111,168,52,0.3); }
`;

const CARD_BG = ["#ddf0b8", "#E6F7F2", "#fdf2f8", "#ecfdf5"];
const CANDIDATE_COLORS = [
  "#6fa834",
  "#90C450",
  "#b8de8a",
  "#5a9a30",
  "#4a8c2a",
];
const ALLOWED_IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "image/webp",
]);
const MAX_UPLOAD_IMAGE_BYTES = 2 * 1024 * 1024;

function parseDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatDateRange(startAt, endAt) {
  const pick = (v) => {
    const m = String(v ?? "").match(/^(\d{4})-(\d{2})-(\d{2})/);
    return m ? `${m[1]}.${m[2]}.${m[3]}` : "";
  };
  const a = pick(startAt);
  const b = pick(endAt);
  if (a && b) return `${a} ~ ${b}`;
  return a || b || "일정 미정";
}

function formatTimeRange(startAt, endAt) {
  const pick = (v) => {
    const m = String(v ?? "").match(/(\d{2}):(\d{2})/);
    return m ? `${m[1]}:${m[2]}` : "";
  };
  const a = pick(startAt);
  const b = pick(endAt);
  if (a && b) return `${a} ~ ${b}`;
  return a || b || "시간 미정";
}

function toSafeNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function getContestStatus(item) {
  if (item?.ongoing) return "live";
  if (item?.ended) return "ended";
  if (item?.upcoming) return "upcoming";
  const now = Date.now();
  const s = parseDate(item?.startAt)?.getTime();
  const e = parseDate(item?.endAt)?.getTime();
  if (s && now < s) return "upcoming";
  if (e && now > e) return "ended";
  return "live";
}

function getContestProgress(item) {
  const status = getContestStatus(item);
  if (status === "ended") return 100;
  if (status === "upcoming") return 0;

  const start = parseDate(item?.startAt)?.getTime();
  const end = parseDate(item?.endAt)?.getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
    return item?.totalVotes > 0 ? 100 : 50;
  }

  const elapsedRatio = ((Date.now() - start) / (end - start)) * 100;
  return Math.max(0, Math.min(100, Math.round(elapsedRatio)));
}

function statusLabel(status) {
  if (status === "live") return "투표 진행 중";
  if (status === "ended") return "투표 종료";
  return "투표 예정";
}

function extractTotalElements(response) {
  const data = response?.data?.data ?? response?.data ?? {};
  return toSafeNumber(data?.totalElements);
}

function extractVoteTotal(response) {
  const data = response?.data?.data ?? response?.data ?? {};
  return toSafeNumber(data?.totalVotes ?? data?.total);
}

async function loadContestMetrics(programId) {
  if (!programId) {
    return { participants: 0, totalVotes: 0 };
  }

  const [candidateResult, voteResult] = await Promise.allSettled([
    programApi.getCandidates(programId, { page: 0, size: 1 }),
    programApi.getContestVoteResult(programId),
  ]);

  return {
    participants:
      candidateResult.status === "fulfilled"
        ? extractTotalElements(candidateResult.value)
        : 0,
    totalVotes:
      voteResult.status === "fulfilled" ? extractVoteTotal(voteResult.value) : 0,
  };
}

async function enrichContestCards(contests) {
  if (!Array.isArray(contests) || contests.length === 0) return [];

  const metricsList = await Promise.all(
    contests.map(async (contest) => ({
      id: contest.id,
      ...(await loadContestMetrics(contest.id)),
    })),
  );

  const metricsMap = new Map(
    metricsList.map((item) => [Number(item.id), item]),
  );

  return contests.map((contest) => {
    const metrics = metricsMap.get(Number(contest.id));
    const next = {
      ...contest,
      participants: metrics?.participants ?? 0,
      totalVotes: metrics?.totalVotes ?? 0,
    };

    return {
      ...next,
      progress: getContestProgress(next),
    };
  });
}

function VoteConfirmModal({ candidate, onConfirm, onCancel }) {
  if (!candidate) return null;
  return (
    <div className="ct-modal-overlay" onClick={onCancel}>
      <div className="ct-modal" onClick={(e) => e.stopPropagation()}>
        <div className="ct-modal-img-wrap">
          <img
            className="ct-modal-img"
            src={resolveImageUrl(candidate.image)}
            alt={candidate.name}
          />
          <button className="ct-modal-close" onClick={onCancel}>
            <X size={16} />
          </button>
        </div>
        <div className="ct-modal-body">
          <div className="ct-modal-title">{candidate.name}</div>
          <div className="ct-modal-breed">{candidate.breed}</div>
          <div className="ct-modal-warning">
            <AlertCircle size={16} />
            투표 후 변경할 수 없습니다
          </div>
          <div className="ct-modal-question">
            <strong>{candidate.name}</strong> 에게 투표하시겠습니까?
          </div>
          <div className="ct-modal-btns">
            <button className="ct-modal-btn cancel" onClick={onCancel}>
              <X size={16} /> 취소
            </button>
            <button className="ct-modal-btn confirm" onClick={onConfirm}>
              <Heart size={16} /> 투표하기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CandidateCard({
  candidate,
  rank,
  contestStatus,
  isVoted,
  isMyVote,
  onVoteClick,
  totalVotes,
}) {
  const pct =
    totalVotes > 0 ? Math.round((candidate.votes / totalVotes) * 100) : 0;
  const barPct = totalVotes > 0 ? (candidate.votes / totalVotes) * 100 : 0;
  const rankClass =
    rank === 1 ? "r1" : rank === 2 ? "r2" : rank === 3 ? "r3" : "r-default";
  const canVote = contestStatus === "live" && !isVoted;

  return (
    <div
      className={"ct-candidate-card ct-fade-in" + (isMyVote ? " voted" : "")}
      style={{ animationDelay: `${(rank - 1) * 0.07}s` }}
    >
      <div className="ct-candidate-img-wrap">
        <img src={resolveImageUrl(candidate.image)} alt={candidate.name} loading="lazy" />
        <div className="ct-candidate-img-overlay" />
        <div className={"ct-candidate-rank-badge " + rankClass}>{rank}</div>
        {isMyVote ? (
          <div className="ct-candidate-voted-check">
            <Check size={16} color="#fff" />
          </div>
        ) : null}
        <div className="ct-candidate-img-votes">
          <Heart size={11} fill="#fff" /> {candidate.votes.toLocaleString()}표
        </div>
      </div>
      <div className="ct-candidate-body">
        <div className="ct-candidate-name-row">
          <span className="ct-candidate-name">{candidate.name}</span>
          {totalVotes > 0 ? (
            <span className="ct-candidate-pct">{pct}%</span>
          ) : null}
        </div>
        <div className="ct-candidate-breed">{candidate.breed}</div>
        {totalVotes > 0 ? (
          <div className="ct-candidate-bar-track">
            <div
              className="ct-candidate-bar-fill"
              style={{ width: `${barPct}%`, background: candidate.color }}
            />
          </div>
        ) : null}
        {contestStatus === "live" ? (
          <button
            className={
              "ct-vote-btn" +
              (isMyVote ? " voted" : "") +
              (!canVote && !isMyVote ? " disabled" : "")
            }
            onClick={(e) => {
              e.stopPropagation();
              if (canVote) onVoteClick(candidate);
            }}
            disabled={isMyVote || (!canVote && !isMyVote)}
          >
            {isMyVote ? (
              <>
                <CheckCircle2 size={16} /> 투표 완료
              </>
            ) : isVoted ? (
              <>
                <Heart size={16} /> 이미 투표함
              </>
            ) : (
              <>
                <Heart size={16} /> 투표하기
              </>
            )}
          </button>
        ) : null}
      </div>
    </div>
  );
}

function RankingItem({ candidate, rank, maxVotes }) {
  const barPct = maxVotes > 0 ? (candidate.votes / maxVotes) * 100 : 0;
  const rankClass =
    rank === 1
      ? "gold"
      : rank === 2
        ? "silver"
        : rank === 3
          ? "bronze"
          : "default";
  return (
    <div className={"ct-ranking-item" + (rank <= 3 ? " top" : "")}>
      <div className={"ct-ranking-rank " + rankClass}>{rank}</div>
      <div className="ct-ranking-avatar">
        <img src={resolveImageUrl(candidate.image)} alt={candidate.name} />
      </div>
      <div className="ct-ranking-info">
        <div className="ct-ranking-name">{candidate.name}</div>
        <div className="ct-ranking-breed">{candidate.breed}</div>
        <div className="ct-ranking-bar-wrap">
          <div className="ct-ranking-bar">
            <div
              className="ct-ranking-bar-fill"
              style={{ width: `${barPct}%`, background: candidate.color }}
            />
          </div>
        </div>
      </div>
      <div className="ct-ranking-score-col">
        <div className="ct-ranking-score">
          {candidate.votes.toLocaleString()}
        </div>
        <div className="ct-ranking-score-label">표</div>
      </div>
    </div>
  );
}

function CropModal({ src, onDone, onCancel }) {
  const canvasRef = useRef(null);
  const imgRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragStart, setDragStart] = useState(null);

  // 모달 열리는 동안 배경 스크롤 막기
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);
  const SIZE = 420; // 캔버스 크기 = 모달 너비와 동일
  const CROP = 320; // 크롭 박스 크기

  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      const initScale = Math.max(CROP / img.width, CROP / img.height) * 1.05;
      setScale(initScale);
      setOffset({ x: 0, y: 0 });
    };
    img.src = src;
  }, [src]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;
    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    canvas.width = SIZE * dpr;
    canvas.height = SIZE * dpr;
    canvas.style.width = SIZE + "px";
    canvas.style.height = SIZE + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, SIZE, SIZE);

    const iw = img.width * scale;
    const ih = img.height * scale;
    const ix = SIZE / 2 - iw / 2 + offset.x;
    const iy = SIZE / 2 - ih / 2 + offset.y;
    const cx = (SIZE - CROP) / 2;
    const cy = (SIZE - CROP) / 2;

    // 1) 이미지 전체
    ctx.drawImage(img, ix, iy, iw, ih);

    // 2) 크롭 박스 바깥 어두운 오버레이 (4개 사각형)
    ctx.fillStyle = "rgba(0,0,0,0.52)";
    ctx.fillRect(0, 0, SIZE, cy); // 위
    ctx.fillRect(0, cy + CROP, SIZE, SIZE - cy - CROP); // 아래
    ctx.fillRect(0, cy, cx, CROP); // 왼쪽
    ctx.fillRect(cx + CROP, cy, SIZE - cx - CROP, CROP); // 오른쪽

    // 3) 골드 테두리
    ctx.strokeStyle = "#6fa834";
    ctx.lineWidth = 2;
    ctx.strokeRect(cx, cy, CROP, CROP);

    // 4) 격자선
    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    ctx.lineWidth = 0.8;
    for (let i = 1; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(cx + (CROP / 3) * i, cy);
      ctx.lineTo(cx + (CROP / 3) * i, cy + CROP);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx, cy + (CROP / 3) * i);
      ctx.lineTo(cx + CROP, cy + (CROP / 3) * i);
      ctx.stroke();
    }

    // 5) 모서리 핸들
    const hs = 14;
    ctx.strokeStyle = "#6fa834";
    ctx.lineWidth = 3;
    [
      [cx, cy],
      [cx + CROP, cy],
      [cx, cy + CROP],
      [cx + CROP, cy + CROP],
    ].forEach(([hx, hy]) => {
      const sx = hx === cx ? 1 : -1;
      const sy = hy === cy ? 1 : -1;
      ctx.beginPath();
      ctx.moveTo(hx, hy + sy * hs);
      ctx.lineTo(hx, hy);
      ctx.lineTo(hx + sx * hs, hy);
      ctx.stroke();
    });
  }, [scale, offset, src]);

  const onMouseDown = (e) => {
    setDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  };
  const onMouseMove = (e) => {
    if (!dragging || !dragStart) return;
    setOffset({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };
  const onMouseUp = () => {
    setDragging(false);
    setDragStart(null);
  };
  const onWheel = (e) => {
    e.preventDefault();
    setScale((s) => Math.min(5, Math.max(0.3, s - e.deltaY * 0.001)));
  };

  const onTouchStart = (e) => {
    const t = e.touches[0];
    setDragging(true);
    setDragStart({ x: t.clientX - offset.x, y: t.clientY - offset.y });
  };
  const onTouchMove = (e) => {
    if (!dragging || !dragStart) return;
    const t = e.touches[0];
    setOffset({ x: t.clientX - dragStart.x, y: t.clientY - dragStart.y });
  };

  const handleCrop = () => {
    const img = imgRef.current;
    if (!img) return;
    const out = document.createElement("canvas");
    out.width = CROP;
    out.height = CROP;
    const ctx = out.getContext("2d");
    const iw = img.width * scale;
    const ih = img.height * scale;
    const ix = SIZE / 2 - iw / 2 + offset.x;
    const iy = SIZE / 2 - ih / 2 + offset.y;
    const cx = (SIZE - CROP) / 2;
    const cy = (SIZE - CROP) / 2;
    // 크롭 박스 내 이미지만 정확히 잘라내기
    ctx.drawImage(img, ix - cx, iy - cy, iw, ih);
    out.toBlob(
      (blob) => {
        const file = new File([blob], "crop.jpg", { type: "image/jpeg" });
        const dataUrl = out.toDataURL("image/jpeg", 0.92);
        onDone(dataUrl, file);
      },
      "image/jpeg",
      0.92,
    );
  };

  return (
    <div className="ct-crop-overlay" onClick={onCancel}>
      <div className="ct-crop-modal" onClick={(e) => e.stopPropagation()}>
        <div className="ct-crop-header">
          <div className="ct-crop-title">사진 영역 선택</div>
          <div className="ct-crop-hint">
            드래그로 이동 · 스크롤로 확대/축소 · 정사각형으로 잘립니다
          </div>
        </div>
        <div
          className="ct-crop-canvas-wrap"
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
          onWheel={onWheel}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onMouseUp}
          style={{ cursor: dragging ? "grabbing" : "grab" }}
        >
          <canvas ref={canvasRef} style={{ display: "block" }} />
        </div>
        <div className="ct-crop-footer">
          <button className="ct-crop-btn cancel" onClick={onCancel}>
            취소
          </button>
          <button className="ct-crop-btn confirm" onClick={handleCrop}>
            이 영역으로 자르기
          </button>
        </div>
      </div>
    </div>
  );
}

function ContestContent({ eventId }) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [contests, setContests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [selectedContestId, setSelectedContestId] = useState(null);
  const [myApplyByProgram, setMyApplyByProgram] = useState({});
  const [applySubmittingId, setApplySubmittingId] = useState(null);
  const [petModalOpen, setPetModalOpen] = useState(false);
  const [petModalContestId, setPetModalContestId] = useState(null);
  const [petOptions, setPetOptions] = useState([]);
  const [selectedPetId, setSelectedPetId] = useState(null);
  const [applyImageUrl, setApplyImageUrl] = useState("");
  const [applyImageFile, setApplyImageFile] = useState(null);
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [cropSrc, setCropSrc] = useState(null);
  const [petLoading, setPetLoading] = useState(false);
  const applyTargetId = Number(searchParams.get("apply") || 0);

  useEffect(() => {
    if (!eventId) return;
    let mounted = true;
    const loadContests = async () => {
      setLoading(true);
      setErrorMsg("");
      try {
        const [list] = await Promise.all([
          programApi.getAllProgramsByEvent({
            eventId: Number(eventId),
            category: "CONTEST",
            sort: "startAt,asc",
          }),
          loadProgramImageCache(),
        ]);
        const imgMap = getProgramImageMap();
        if (!mounted) return;
        const baseCards = (Array.isArray(list) ? list : []).map((item, idx) => {
          const pid = String(item?.programId ?? "");
          const status = getContestStatus(item);
          return {
            id: Number(item?.programId),
            name: item?.programTitle ?? "콘테스트",
            description: item?.description ?? "콘테스트 프로그램",
            location: item?.boothId ? `부스 ${item.boothId}` : "장소 미정",
            participants: 0,
            totalVotes: 0,
            time: formatTimeRange(item?.startAt, item?.endAt),
            status,
            statusLabel: statusLabel(status),
            bg: CARD_BG[idx % CARD_BG.length],
            progress: 0,
            startAt: item?.startAt ?? null,
            endAt: item?.endAt ?? null,
            thumbnail: imgMap[pid] || item?.imageUrl || null,
          };
        });
        const mapped = await enrichContestCards(baseCards);
        if (!mounted) return;
        // ended는 맨 뒤로 정렬
        const sorted = [...mapped].sort((a, b) => {
          const order = { live: 0, upcoming: 1, ended: 2 };
          return (order[a.status] ?? 1) - (order[b.status] ?? 1);
        });
        setContests(sorted);
        setSelectedContestId(sorted[0]?.id ?? null);
      } catch (e) {
        if (!mounted) return;
        setErrorMsg(
          e?.response?.data?.message ||
            e?.message ||
            "콘테스트 데이터를 불러오지 못했습니다.",
        );
        setContests([]);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    loadContests();
    return () => {
      mounted = false;
    };
  }, [eventId]);

  useEffect(() => {
    let mounted = true;
    const loadMyApplies = async () => {
      if (!tokenStore.getAccess()) {
        if (mounted) setMyApplyByProgram({});
        return;
      }
      try {
        const res = await programApi.getMyProgramApplies({
          page: 0,
          size: 200,
          sort: "createdAt,desc",
        });
        const content = Array.isArray(res?.data?.data?.content)
          ? res.data.data.content
          : [];
        const activeStatuses = new Set([
          "APPLIED",
          "WAITING",
          "APPROVED",
          "CHECKED_IN",
        ]);
        const next = {};
        for (const row of content) {
          const pid = Number(row?.programId);
          if (!pid || next[pid]) continue;
          if (activeStatuses.has(String(row?.status || "").toUpperCase())) {
            next[pid] = String(row?.status || "").toUpperCase();
          }
        }
        if (mounted) setMyApplyByProgram(next);
      } catch {
        if (mounted) setMyApplyByProgram({});
      }
    };
    loadMyApplies();
    return () => {
      mounted = false;
    };
  }, [eventId]);

  const handleContestApply = async (contestId) => {
    if (!contestId || applySubmittingId) return;
    if (!tokenStore.getAccess()) {
      try {
        const refreshed = await authApi.refresh();
        if (refreshed?.accessToken) {
          tokenStore.setAccess(refreshed.accessToken);
        }
      } catch {
        navigate("/auth/login", {
          state: { from: `/program/contest/${eventId}` },
        });
        return;
      }
    }

    setPetLoading(true);
    try {
      const petRes = await petApi.getMyPets();
      const pets = Array.isArray(petRes?.pets)
        ? petRes.pets
        : Array.isArray(petRes)
          ? petRes
          : [];

      if (!pets.length) {
        window.alert(
          "등록된 반려동물이 없습니다. 반려동물 등록 후 신청해주세요.",
        );
        navigate("/auth/mypage");
        return;
      }

      setPetOptions(pets);
      setSelectedPetId(pets[0]?.petId ?? null);
      setApplyImageUrl("");
      setPetModalContestId(contestId);
      setPetModalOpen(true);
    } catch (e) {
      if (e?.response?.status === 401) {
        navigate("/auth/login", {
          state: { from: `/program/contest/${eventId}` },
        });
      } else {
        const msg =
          e?.response?.data?.message || e?.message || "알 수 없는 오류";
        window.alert(
          `반려동물 정보 오류 (${e?.response?.status ?? "네트워크"}): ${msg}`,
        );
      }
    } finally {
      setPetLoading(false);
    }
  };

  useEffect(() => {
    if (!applyTargetId || loading || petModalOpen || applySubmittingId) return;

    const target = contests.find((contest) => contest.id === applyTargetId);
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete("apply");

    if (!target || target.status === "ended" || myApplyByProgram[applyTargetId]) {
      setSearchParams(nextParams, { replace: true });
      return;
    }

    setSelectedContestId(applyTargetId);
    handleContestApply(applyTargetId).finally(() => {
      setSearchParams(nextParams, { replace: true });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    applyTargetId,
    contests,
    loading,
    petModalOpen,
    applySubmittingId,
    myApplyByProgram,
    searchParams,
    setSearchParams,
  ]);

  const handleCropDone = (croppedDataUrl, croppedFile) => {
    setApplyImageUrl(croppedDataUrl);
    setApplyImageFile(croppedFile);
    setCropModalOpen(false);
    setCropSrc(null);
  };

  const submitContestApplyWithPet = async () => {
    if (!petModalContestId || !selectedPetId || applySubmittingId) return;

    setApplySubmittingId(petModalContestId);
    try {
      // TODO(cloud-native-step-01): fold this two-step handoff into a
      // backend-owned file reference flow.
      let uploadedImageUrl = null;
      if (applyImageFile) {
        try {
          const form = new FormData();
          form.append("file", applyImageFile);
          // 유저용 갤러리 임시 업로드 엔드포인트 사용
          const upRes = await axiosInstance.post(
            "/api/galleries/image/upload",
            form,
            {
              headers: { "Content-Type": "multipart/form-data" },
            },
          );
          const rawPath =
            upRes?.data?.data?.publicPath ?? upRes?.data?.publicPath ?? null;
          if (rawPath) {
            uploadedImageUrl = toPublicAssetUrl(rawPath) || rawPath;
          }
        } catch (uploadErr) {
          void uploadErr;
        }
      }

      await programApi.createProgramApply({
        programId: petModalContestId,
        petId: Number(selectedPetId),
        imageUrl: uploadedImageUrl,
      });
      setMyApplyByProgram((prev) => ({
        ...prev,
        [petModalContestId]: "APPLIED",
      }));
      setPetModalOpen(false);
      setApplyImageUrl("");
      setApplyImageFile(null);
      window.alert(
        "참가 신청이 완료됐습니다! 관리자 승인 후 투표 후보로 등록됩니다 🎉",
      );
    } catch (e) {
      if (e?.response?.status === 409) {
        setMyApplyByProgram((prev) => ({
          ...prev,
          [petModalContestId]: "APPLIED",
        }));
        setPetModalOpen(false);
        setApplyImageUrl("");
        setApplyImageFile(null);
      } else if (e?.response?.status === 401) {
        navigate("/auth/login", {
          state: { from: `/program/contest/${eventId}` },
        });
      } else {
        window.alert(
          e?.response?.data?.message ||
            "신청에 실패했습니다. 다시 시도해주세요.",
        );
      }
    } finally {
      setApplySubmittingId(null);
    }
  };

  const handleApplyImageChange = (e) => {
    const file = e?.target?.files?.[0];
    if (!file) return;
    const fileType = String(file.type || "").toLowerCase();
    if (!ALLOWED_IMAGE_MIME_TYPES.has(fileType)) {
      window.alert("jpg, jpeg, png, gif, webp 파일만 업로드할 수 있습니다.");
      e.target.value = "";
      return;
    }
    if (file.size > MAX_UPLOAD_IMAGE_BYTES) {
      window.alert("이미지 용량은 2MB 이하만 가능합니다.");
      e.target.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = (evt) => {
      setCropSrc(String(evt?.target?.result || ""));
      setCropModalOpen(true); // 크롭 모달 열기
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  if (loading)
    return <PageLoading />;
  if (!loading && errorMsg)
    return <div className="ct-card-tag">{errorMsg}</div>;
  if (!loading && contests.length === 0)
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "64px 24px",
        }}
      >
        <Trophy
          size={52}
          strokeWidth={1.2}
          style={{ marginBottom: 16, color: "#d1d5db" }}
        />
        <div
          style={{
            fontSize: 16,
            fontWeight: 700,
            color: "#374151",
            marginBottom: 6,
          }}
        >
          등록된 콘테스트가 없습니다
        </div>
        <div
          style={{
            fontSize: 13,
            color: "#9ca3af",
            textAlign: "center",
            lineHeight: 1.6,
            marginBottom: 20,
          }}
        >
          이 행사에 콘테스트 프로그램이 없어요.
        </div>
        <button
          onClick={() => navigate("/program/contest")}
          style={{
            padding: "10px 24px",
            background: "#90C450",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          ← 다른 행사 선택
        </button>
      </div>
    );

  const liveCount = contests.filter((c) => c.status === "live").length;
  const upcomingCount = contests.filter((c) => c.status === "upcoming").length;
  const endedCount = contests.filter((c) => c.status === "ended").length;

  return (
    <>
      <div className="ct-live-badge">
        <span className="ct-live-dot" /> LIVE
      </div>

      <div className="ct-stat-grid">
        {[
          {
            label: "전체 콘테스트",
            value: `${contests.length}개`,
            icon: <Trophy size={20} color="#5a9a30" />,
            bg: "#edf7e0",
          },
          {
            label: "진행 중",
            value: `${liveCount}개`,
            icon: <AlertCircle size={20} color="#3a4520" />,
            bg: "#ecfdf5",
          },
          {
            label: "예정",
            value: `${upcomingCount}개`,
            icon: <Clock size={20} color="#90C450" />,
            bg: "#eff4ff",
          },
          {
            label: "종료",
            value: `${endedCount}개`,
            icon: <CheckCircle2 size={20} color="#ef4444" />,
            bg: "#fff0f0",
          },
        ].map((s) => (
          <div key={s.label} className="ct-stat-card">
            <div className="ct-stat-icon" style={{ background: s.bg }}>
              {s.icon}
            </div>
            <div>
              <div className="ct-stat-label">{s.label}</div>
              <div className="ct-stat-value">{s.value}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="ct-main-grid">
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="ct-card">
            <div className="ct-card-header">
              <div className="ct-card-title">
                <div
                  className="ct-card-title-icon"
                  style={{ background: "#f0f9e4" }}
                >
                  <Trophy size={14} color="#6fa834" />
                </div>
                콘테스트 목록
              </div>
              <span className="ct-card-tag">총 {contests.length}개</span>
            </div>
            <div className="ct-contest-list">
              {contests.map((c) => (
                <div
                  key={c.id}
                  className={
                    "ct-contest-item" +
                    (selectedContestId === c.id ? " active" : "") +
                    (c.status === "ended" ? " ended-card" : "")
                  }
                  onClick={() => setSelectedContestId(c.id)}
                >
                  {/* 썸네일 */}
                  <div className="ct-contest-thumb">
                    {c.thumbnail ? (
                      <img
                        src={resolveImageUrl(c.thumbnail)}
                        alt={c.name}
                        loading="lazy"
                        onError={(e) => {
                          e.target.style.display = "none";
                          e.target.nextSibling.style.display = "flex";
                        }}
                      />
                    ) : null}
                    <div
                      className="ct-contest-thumb-ph"
                      style={{ display: c.thumbnail ? "none" : "flex" }}
                    >
                      <Trophy size={28} strokeWidth={1.2} color="#fcd34d" />
                    </div>
                  </div>
                  <div className="ct-contest-top">
                    <div className="ct-contest-head-row">
                      <div
                        className="ct-contest-icon"
                        style={{ background: c.bg }}
                      >
                        <Trophy size={20} color="#6b7280" />
                      </div>
                      <ChevronRight size={16} style={{ color: "#d1d5db" }} />
                    </div>
                    <div className="ct-contest-info">
                      <div className="ct-contest-name">{c.name}</div>
                      <div className="ct-contest-cat">콘테스트</div>
                      <div className="ct-contest-desc">{c.description}</div>
                    </div>
                    <div className="ct-contest-meta-row">
                      <div className="ct-contest-sub">
                        <span
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 3,
                          }}
                        >
                          <Clock size={11} /> {c.time}
                        </span>
                        <span
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 3,
                          }}
                        >
                          <Info size={11} /> {c.location}
                        </span>
                      </div>
                    </div>
                    <span className={"ct-contest-badge " + c.status}>
                      {c.status === "live" ? <CircleDot size={10} /> : null}
                      {c.statusLabel}
                    </span>
                  </div>
                  <div className="ct-contest-divider" />
                  <div className="ct-contest-bottom">
                    <div className="ct-contest-capacity">
                      <div
                        className="ct-contest-capacity-text"
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          color:
                            c.status === "live"
                              ? "#5a9a30"
                              : c.status === "upcoming"
                                ? "#90C450"
                                : "#9ca3af",
                          display: "flex",
                          alignItems: "center",
                          gap: 5,
                        }}
                      >
                        {c.status === "live" && (
                          <span
                            style={{
                              width: 7,
                              height: 7,
                              borderRadius: "50%",
                              background: "#6fa834",
                              display: "inline-block",
                              animation: "ct-pulse 1.5s infinite",
                            }}
                          />
                        )}
                        {c.status === "ended"
                          ? "종료됨"
                          : c.status === "live"
                            ? "투표 진행 중"
                            : "투표 예정"}
                      </div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          flexWrap: "wrap",
                          justifyContent: "flex-end",
                          fontSize: 11,
                          color: "#9ca3af",
                        }}
                      >
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          <Users size={11} /> 후보 {toSafeNumber(c.participants)}팀
                        </span>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          <Heart size={11} /> 총{" "}
                          {toSafeNumber(c.totalVotes).toLocaleString()}표
                        </span>
                      </div>
                    </div>
                    <div className="ct-contest-progress">
                      <div
                        className="ct-contest-progress-fill"
                        style={{ width: `${c.progress ?? 0}%` }}
                      />
                    </div>
                  </div>
                  <div className="ct-contest-actions">
                    <button
                      type="button"
                      className="ct-list-btn primary"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleContestApply(c.id);
                      }}
                      disabled={
                        Boolean(myApplyByProgram[c.id]) ||
                        applySubmittingId === c.id ||
                        petLoading ||
                        c.status === "ended"
                      }
                    >
                      {c.status === "ended"
                        ? "마감"
                        : myApplyByProgram[c.id]
                          ? "✓ 신청완료"
                          : applySubmittingId === c.id
                            ? "신청 중..."
                            : petLoading
                              ? "준비 중..."
                              : "참가신청"}
                    </button>
                    <button
                      type="button"
                      className="ct-list-btn outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(
                          `/program/contest/${eventId}/detail/${c.id}#candidates`,
                        );
                      }}
                    >
                      후보보기
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {petModalOpen ? (
        <div
          className="ct-pet-modal-overlay"
          onClick={() => setPetModalOpen(false)}
        >
          <div className="ct-pet-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ct-pet-title">🐾 콘테스트 참가신청</div>
            <div className="ct-pet-sub">
              반려동물과 후보 사진을 등록해주세요.
            </div>
            <select
              className="ct-pet-select"
              value={selectedPetId ?? ""}
              onChange={(e) => setSelectedPetId(Number(e.target.value))}
            >
              {petOptions.map((pet) => (
                <option key={pet.petId} value={pet.petId}>
                  {pet.petName || `Pet #${pet.petId}`}
                </option>
              ))}
            </select>
            <label
              className={
                "ct-pet-upload-area" + (applyImageUrl ? " has-image" : "")
              }
            >
              <input
                type="file"
                accept="image/*"
                className="ct-pet-upload-input"
                onChange={handleApplyImageChange}
              />
              {applyImageUrl ? (
                <>
                  <img
                    src={applyImageUrl}
                    alt="preview"
                    className="ct-pet-upload-preview-img"
                  />
                  <span className="ct-pet-upload-change">✎ 변경</span>
                </>
              ) : (
                <>
                  <div className="ct-pet-upload-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <rect width="24" height="24" rx="6" fill="#ddf0b8" />
                      <path
                        d="M12 7v10M7 12h10"
                        stroke="#6fa834"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                      />
                    </svg>
                  </div>
                  <div className="ct-pet-upload-text">
                    클릭하거나 이미지를 드래그하세요
                  </div>
                  <div className="ct-pet-upload-hint">
                    JPG, PNG, GIF, WEBP · 최대 2MB
                  </div>
                </>
              )}
            </label>
            <div className="ct-pet-btns">
              <button
                type="button"
                className="ct-pet-btn cancel"
                onClick={() => {
                  setPetModalOpen(false);
                  setApplyImageUrl("");
                  setApplyImageFile(null);
                }}
              >
                취소
              </button>
              <button
                type="button"
                className="ct-pet-btn confirm"
                onClick={submitContestApplyWithPet}
              >
                신청하기
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {cropModalOpen && cropSrc ? (
        <CropModal
          src={cropSrc}
          onDone={handleCropDone}
          onCancel={() => {
            setCropModalOpen(false);
            setCropSrc(null);
          }}
        />
      ) : null}
    </>
  );
}

export default function Contest() {
  const navigate = useNavigate();
  const { eventId } = useParams();
  const currentPath = "/program/contest";

  // ── 전체 콘테스트 목록 (행사 선택 없이 바로 표시) ──
  const [allContests, setAllContests] = useState([]);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (eventId) return; // eventId 있으면 ContestContent가 처리
    let mounted = true;
    (async () => {
      setListLoading(true);
      setListError("");
      try {
        const evRes = await eventApi.getEvents({
          page: 0,
          size: 200,
          sort: "startAt,desc",
        });
        const events = Array.isArray(evRes?.data?.data?.content)
          ? evRes.data.data.content
          : [];

        await loadProgramImageCache();
        const imgMap = getProgramImageMap();

        const results = await Promise.allSettled(
          events.map((evt) =>
            programApi
              .getAllProgramsByEvent({
                eventId: evt.eventId,
                category: "CONTEST",
                sort: "startAt,asc",
              })
              .then((list) => ({
                eventId: evt.eventId,
                eventName: evt.eventName ?? "행사",
                contests: Array.isArray(list) ? list : [],
              })),
          ),
        );

        if (!mounted) return;
        const all = [];
        results.forEach((res) => {
          if (res.status !== "fulfilled") return;
          const { eventId: evId, eventName, contests: cList } = res.value;
          cList.forEach((item) => {
            const pid = String(item?.programId ?? "");
            const status = getContestStatus(item);
            all.push({
              id: item?.programId,
              name: item?.programTitle ?? "콘테스트",
              description: item?.description ?? "",
              time: formatTimeRange(item?.startAt, item?.endAt),
              thumbnail: imgMap[pid] || item?.imageUrl || null,
              status,
              statusLabel: statusLabel(status),
              participants: 0,
              totalVotes: 0,
              startAt: item?.startAt ?? null,
              endAt: item?.endAt ?? null,
              eventId: evId,
              eventName,
            });
          });
        });
        const enriched = await enrichContestCards(all);
        if (!mounted) return;
        // live → upcoming → ended 순
        const order = { live: 0, upcoming: 1, ended: 2 };
        enriched.sort((a, b) => (order[a.status] ?? 1) - (order[b.status] ?? 1));
        setAllContests(enriched);
      } catch (e) {
        if (!mounted) return;
        setListError(
          e?.response?.data?.message ||
            e?.message ||
            "데이터를 불러오지 못했습니다.",
        );
      } finally {
        if (mounted) setListLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [eventId]);

  // ── eventId 있을 때 → ContestContent (투표/신청 화면) ──
  if (eventId) {
    return (
      <div className="ct-root">
        <style>{styles}</style>
        <PageHeader
          title="콘테스트 및 투표"
          subtitle={SUBTITLE_MAP[currentPath]}
          categories={SERVICE_CATEGORIES}
          currentPath={currentPath}
          onNavigate={(path) => navigate(path)}
        />
        <main className="ct-container">
          <ContestContent eventId={eventId} />
        </main>
      </div>
    );
  }

  // ── 전체 콘테스트 카드 목록 ──
  const STATUS_BADGE = {
    live: { bg: "#ddf0b8", color: "#5a9a30", dot: "#6fa834" },
    upcoming: { bg: "#E6F7F2", color: "#90C450", dot: "#3DBFA0" },
    ended: { bg: "#f3f4f6", color: "#9ca3af", dot: "#d1d5db" },
  };

  const FILTERS = [
    { key: "ALL", label: "전체" },
    { key: "live", label: "진행 중" },
    { key: "upcoming", label: "예정" },
    { key: "ended", label: "종료" },
  ];

  const filtered = allContests.filter((c) => {
    if (filter !== "ALL" && c.status !== filter) return false;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      return (
        c.name.toLowerCase().includes(q) ||
        c.eventName.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const listStyles = `
    .cl-wrap { max-width:1400px; margin:0 auto; padding:32px 25px 64px; }
    .cl-toolbar { display:flex; align-items:center; gap:10px; flex-wrap:wrap; margin-bottom:20px; }
    .cl-search { display:flex; align-items:center; gap:8px; background:#fff; border:1px solid #e5e7eb; border-radius:10px; padding:8px 14px; flex:1; min-width:180px; max-width:320px; }
    .cl-search input { border:none; outline:none; font-size:13px; color:#374151; background:transparent; width:100%; font-family:inherit; }
    .cl-filter-row { display:flex; gap:8px; align-items:center; flex-wrap:wrap; }
    .cl-fbtn { padding:8px 16px; border:1px solid #e2e5ea; border-radius:100px; background:#fff; font-size:12px; font-weight:600; color:#6b7280; cursor:pointer; transition:all 0.15s; font-family:inherit; }
    .cl-fbtn.active { background:#5a9a30; border-color:#5a9a30; color:#fff; }
    .cl-stats { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; margin-bottom:20px; }
    .cl-stat { background:#fff; border:1px solid #e9ecef; border-radius:12px; padding:16px 18px; display:flex; align-items:center; gap:12px; }
    .cl-stat-ico { width:38px; height:38px; border-radius:10px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
    .cl-stat-lb { font-size:11px; color:#6b7280; }
    .cl-stat-v { font-size:20px; font-weight:800; color:#111827; }
    .cl-grid { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:16px; }
    .cl-card { background:#fff; border:1.5px solid #e9ecef; border-radius:16px; overflow:hidden; display:flex; flex-direction:column; transition:border-color 0.2s,transform 0.2s,box-shadow 0.2s; cursor:pointer; }
    .cl-card:not(.cl-card-ended):hover { border-color:#b8de8a; transform:translateY(-3px); box-shadow:0 8px 28px rgba(90,154,48,0.1); }
    .cl-card::before { content:""; position:absolute; top:0; left:0; right:0; height:3px; background:linear-gradient(90deg,#5a9a30,#7ab33e); opacity:0; transition:opacity 0.2s; border-radius:16px 16px 0 0; }
    .cl-card { position:relative; }
    .cl-card:not(.cl-card-ended):hover::before { opacity:1; }
    .cl-card-ended { cursor:default; pointer-events:none; }
    .cl-card-ended:hover { border-color:#d1d5db !important; transform:translateY(-2px) !important; box-shadow:0 4px 16px rgba(0,0,0,0.04) !important; }
    .cl-card-ended .cl-thumb img { filter:grayscale(0.6) brightness(0.8); }
    .cl-card-ended .cl-name { color:#9ca3af; }
    .cl-card-ended .cl-desc { color:#b0b5c0; }
    .cl-ended-overlay { position:absolute; inset:0; z-index:3; background:rgba(0,0,0,0.18); display:flex; align-items:center; justify-content:center; pointer-events:none; }
    .cl-ended-label { display:flex; align-items:center; gap:6px; padding:8px 16px; border-radius:100px; background:rgba(0,0,0,0.55); backdrop-filter:blur(6px); font-size:13px; font-weight:700; color:#fff; }
    .cl-thumb { width:100%; aspect-ratio:16/10; position:relative; overflow:hidden; background:linear-gradient(135deg,#f0f9e4 0%,#f8fafc 100%); }
    .cl-thumb img { width:100%; height:100%; object-fit:cover; display:block; transition:transform 0.3s; }
    .cl-card:hover .cl-thumb img { transform:scale(1.04); }
    .cl-thumb-ph { position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:8px; }
    .cl-thumb-ph-text { font-size:12px; font-weight:600; color:#b0bcce; }
    .cl-sbadge { position:absolute; top:12px; left:12px; z-index:2; padding:4px 10px; border-radius:100px; font-size:11px; font-weight:700; display:flex; align-items:center; gap:5px; }
    .cl-sbadge-dot { width:6px; height:6px; border-radius:50%; }
    .cl-evbadge { position:absolute; top:12px; right:12px; z-index:2; padding:4px 10px; border-radius:100px; background:rgba(0,0,0,0.45); backdrop-filter:blur(6px); font-size:10px; font-weight:600; color:#fff; max-width:120px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .cl-body { padding:16px 18px 18px; display:flex; flex-direction:column; gap:10px; flex:1; }
    .cl-name { font-size:16px; font-weight:800; color:#111827; line-height:1.35; }
    .cl-desc { font-size:12.5px; color:#6b7280; line-height:1.45; overflow:hidden; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; }
    .cl-meta { font-size:12px; color:#9ca3af; display:flex; align-items:center; gap:6px; }
    .cl-foot { display:flex; align-items:center; justify-content:space-between; padding-top:10px; border-top:1px solid #f1f3f5; }
    .cl-vote-btn { padding:7px 14px; background:linear-gradient(135deg,#5a9a30,#7ab33e); color:#fff; border:none; border-radius:8px; font-size:12px; font-weight:700; cursor:pointer; display:flex; align-items:center; gap:5px; font-family:inherit; transition:opacity 0.15s; }
    .cl-vote-btn:hover { opacity:0.88; }
    .cl-empty { display:flex; flex-direction:column; align-items:center; justify-content:center; padding:80px 24px; }
    @media (max-width:1100px) { .cl-grid { grid-template-columns:repeat(2,minmax(0,1fr)); } }
    @media (max-width:700px) {
      .cl-wrap { padding:20px 16px 48px; }
      .cl-stats { grid-template-columns:repeat(2,1fr); }
      .cl-grid { grid-template-columns:1fr; }
      .cl-toolbar { flex-direction:column; align-items:stretch; gap:10px; }
      .cl-search { max-width:100%; min-width:0; border-radius:999px; height:44px; padding:0 16px; gap:10px; }
      .cl-filter-row { flex-wrap:nowrap; overflow-x:auto; scrollbar-width:none; padding-bottom:2px; }
      .cl-filter-row::-webkit-scrollbar { display:none; }
      .cl-fbtn { flex-shrink:0; font-size:13px; padding:8px 14px; }
    }
  `;

  return (
    <div className="ct-root">
      <style>{styles}</style>
      <style>{listStyles}</style>
      <PageHeader
        title="콘테스트 및 투표"
        subtitle={SUBTITLE_MAP[currentPath] ?? "등록된 콘테스트에 참여해보세요"}
        categories={SERVICE_CATEGORIES}
        currentPath={currentPath}
        onNavigate={(path) => navigate(path)}
      />

      <main className="cl-wrap">
        {/* 통계 */}
        <div className="cl-stats">
          {[
            {
              label: "전체 콘테스트",
              value: allContests.length,
              ico: <Trophy size={18} color="#5a9a30" />,
              bg: "#f3e8ff",
            },
            {
              label: "진행 중",
              value: allContests.filter((c) => c.status === "live").length,
              ico: <CircleDot size={18} color="#5a9a30" />,
              bg: "#ddf0b8",
            },
            {
              label: "예정",
              value: allContests.filter((c) => c.status === "upcoming").length,
              ico: <Clock size={18} color="#90C450" />,
              bg: "#E6F7F2",
            },
            {
              label: "종료",
              value: allContests.filter((c) => c.status === "ended").length,
              ico: <CheckCircle2 size={18} color="#9ca3af" />,
              bg: "#f3f4f6",
            },
          ].map((s) => (
            <div key={s.label} className="cl-stat">
              <div className="cl-stat-ico" style={{ background: s.bg }}>
                {s.ico}
              </div>
              <div>
                <div className="cl-stat-lb">{s.label}</div>
                <div className="cl-stat-v">{s.value}개</div>
              </div>
            </div>
          ))}
        </div>

        {/* 검색 + 필터 */}
        <div className="cl-toolbar">
          <div className="cl-search">
            <Search size={14} color="#9ca3af" />
            <input
              placeholder="콘테스트명, 행사명 검색"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="cl-filter-row">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                className={`cl-fbtn${filter === f.key ? " active" : ""}`}
                onClick={() => setFilter(f.key)}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {listLoading && (
          <PageLoading />
        )}
        {!listLoading && listError && (
          <div className="cl-empty">
            <div style={{ fontSize: 14, color: "#ef4444" }}>{listError}</div>
          </div>
        )}
        {!listLoading && !listError && filtered.length === 0 && (
          <div className="cl-empty">
            <Trophy
              size={48}
              strokeWidth={1.2}
              style={{ color: "#d1d5db", marginBottom: 16 }}
            />
            <div
              style={{
                fontSize: 15,
                fontWeight: 700,
                color: "#374151",
                marginBottom: 6,
              }}
            >
              콘테스트가 없습니다
            </div>
            <div style={{ fontSize: 13, color: "#9ca3af" }}>
              {search
                ? "검색 조건에 맞는 콘테스트가 없어요."
                : "등록된 콘테스트가 없어요."}
            </div>
          </div>
        )}
        {!listLoading && !listError && filtered.length > 0 && (
          <div className="cl-grid">
            {filtered.map((c) => {
              const sc = STATUS_BADGE[c.status] ?? STATUS_BADGE.upcoming;
              const isEnded = c.status === "ended";
              return (
                <div
                  key={c.id}
                  className={`cl-card${isEnded ? " cl-card-ended" : ""}`}
                  onClick={() =>
                    !isEnded && navigate(`/program/contest/${c.eventId}`)
                  }
                >
                  <div className="cl-thumb">
                    {c.thumbnail ? (
                      <img
                        src={resolveImageUrl(c.thumbnail)}
                        alt={c.name}
                        loading="lazy"
                        onError={(e) => {
                          e.target.style.display = "none";
                          e.target.nextSibling.style.display = "flex";
                        }}
                      />
                    ) : null}
                    <div
                      className="cl-thumb-ph"
                      style={{ display: c.thumbnail ? "none" : "flex" }}
                    >
                      <Trophy size={28} strokeWidth={1.2} color="#c5cdd8" />
                      <span className="cl-thumb-ph-text">이미지 없음</span>
                    </div>
                    <div
                      className="cl-sbadge"
                      style={{ background: sc.bg, color: sc.color }}
                    >
                      <span
                        className="cl-sbadge-dot"
                        style={{ background: sc.dot }}
                      />
                      {c.statusLabel}
                    </div>
                    <div className="cl-evbadge" title={c.eventName}>
                      {c.eventName}
                    </div>
                    {isEnded && (
                      <div className="cl-ended-overlay">
                        <div className="cl-ended-label">⏰ 종료된 콘테스트</div>
                      </div>
                    )}
                  </div>
                  <div className="cl-body">
                    <div className="cl-name">{c.name}</div>
                    {c.description ? (
                      <div className="cl-desc">{c.description}</div>
                    ) : null}
                    <div className="cl-meta">
                      <Clock size={12} />
                      {c.time}
                    </div>
                    <div
                      className="cl-meta"
                      style={{ justifyContent: "space-between", gap: 12 }}
                    >
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        <Users size={12} />
                        후보 {toSafeNumber(c.participants)}팀
                      </span>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        <Heart size={12} />
                        총 {toSafeNumber(c.totalVotes).toLocaleString()}표
                      </span>
                    </div>
                    <div className="cl-foot">
                      <span style={{ fontSize: 11, color: "#9ca3af" }}>
                        {c.eventName}
                      </span>
                      {!isEnded ? (
                        <button
                          className="cl-vote-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/program/contest/${c.eventId}`);
                          }}
                        >
                          <Heart size={12} /> 참여하기
                        </button>
                      ) : (
                        <span
                          style={{
                            fontSize: 12,
                            color: "#9ca3af",
                            fontWeight: 600,
                          }}
                        >
                          종료됨
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
