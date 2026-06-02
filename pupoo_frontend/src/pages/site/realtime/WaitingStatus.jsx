import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CalendarDays,
  MapPin,
  RefreshCw,
  Timer,
} from "lucide-react";
import PageHeader from "../components/PageHeader";
import PageLoading from "../components/PageLoading";
import RealtimeEventSelector from "./RealtimeEventSelector";
import {
  SHARED_ANIM_STYLES,
  useAutoRefresh,
  useCountUp,
  useRefresh,
  useStaggerIn,
} from "./useRealtimeAnimations";
import { formatKoreanTime } from "./aiCongestionViewModel";
import { boothApi } from "../../../app/http/boothApi";
import { eventApi } from "../../../app/http/eventApi";
import { programApi } from "../../../app/http/programApi";
import { adminRealtimeApi } from "../../../app/http/adminRealtimeApi";

const styles = `
  @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.min.css');
  .wt-root {
    box-sizing: border-box;
    font-family: 'Pretendard Variable', 'Pretendard', -apple-system, sans-serif;
    background: #f0f4fa;
    min-height: 100vh;
    flex: 1;
  }
  .wt-root *, .wt-root *::before, .wt-root *::after { box-sizing: border-box; font-family: inherit; }
  .wt-container { max-width: 1400px; margin: 0 auto; padding: 20px 0 64px; }
  .wt-container.selector-mode { padding-top: 32px; }
  .wt-top-actions {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
    margin-bottom: 20px;
  }

  .wt-back-btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 12px 22px;
    border-radius: 12px;
    border: 1.5px solid #111827;
    background: #111827;
    color: #fff;
    font-size: 16px;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.15s;
    margin-bottom: 20px;
    font-family: inherit;
    letter-spacing: -0.01em;
  }
  .wt-top-actions .wt-back-btn { margin-bottom: 0; }
  .wt-event-mode-nav {
    display: flex;
    align-items: center;
    gap: 0;
    flex-wrap: nowrap;
    margin-left: 0;
    border: 1px solid #d9e1ec;
    border-radius: 14px;
    overflow: hidden;
    background: #fff;
  }
  .wt-mode-btn {
    height: 44px;
    border: none;
    border-right: 1px solid #e6ebf3;
    background: #fff;
    color: #8b95a7;
    padding: 0 22px;
    font-size: 14px;
    font-weight: 800;
    cursor: pointer;
    transition: all 0.15s;
    font-family: inherit;
    white-space: nowrap;
  }
  .wt-mode-btn:last-child { border-right: none; }
  .wt-mode-btn.active {
    background: #111827;
    color: #fff;
    border-right-color: #111827;
    box-shadow: none;
  }
  .wt-mode-btn:hover {
    background: #f8fafc;
    color: #64748b;
  }
  .wt-mode-btn.active:hover {
    background: #0f172a;
    color: #fff;
  }
  .wt-back-btn:hover {
    background: #1f2937;
    border-color: #1f2937;
  }
  .wt-back-btn:active {
    transform: scale(0.97);
  }

  .wt-status-chip {
    display: inline-flex; align-items: center; gap: 8px;
    font-size: 14px; font-weight: 700;
    color: #ef4444;
  }
  .wt-status-chip.planned { color: #90C450; }
  .wt-status-chip.ended { color: #9ca3af; }
  .wt-status-chip.cancelled { color: #b91c1c; }
  .wt-status-dot {
    width: 10px; height: 10px; border-radius: 50%; background: currentColor;
    box-shadow: 0 0 8px currentColor;
    animation: wt-pulse 1.6s ease-in-out infinite;
  }
  .wt-status-chip.ended .wt-status-dot,
  .wt-status-chip.cancelled .wt-status-dot { animation: none; box-shadow: none; }
  @keyframes wt-pulse { 0%,100% { opacity: 1; transform: scale(1);} 50% { opacity: 0.5; transform: scale(0.75);} }

  .wt-hero {
    border: 1px solid #e2e8f0;
    border-radius: 20px;
    padding: 40px 44px;
    margin-bottom: 20px;
    background: linear-gradient(135deg, #fff 0%, #fafbff 100%);
    color: #111827;
    position: relative;
    overflow: hidden;
    box-shadow: 0 2px 12px rgba(0,0,0,0.04);
  }
  .wt-hero::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: linear-gradient(90deg, #6366f1, #a78bfa, #6366f1);
    background-size: 200% 100%;
    animation: wt-hero-bar 3s ease infinite;
  }
  @keyframes wt-hero-bar {
    0%, 100% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
  }
  .wt-hero-top {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 24px;
  }
  .wt-hero-main {
    min-width: 0;
    flex: 1 1 auto;
  }
  .wt-hero-title-row {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .wt-hero-title {
    margin: 0;
    font-size: 32px;
    line-height: 1.15;
    letter-spacing: -0.03em;
    font-weight: 900;
    color: #111827;
  }
  .wt-hero-meta {
    margin-top: 12px;
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
    font-size: 15px;
    color: #9ca3af;
  }
  .wt-hero-meta-item {
    display: inline-flex;
    align-items: center;
    gap: 5px;
  }
  .wt-hero-divider {
    margin: 16px 0;
    border: none;
    border-top: 1px solid #f0f0f0;
  }
  .wt-hero-visitor {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .wt-hero-visitor-item {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .wt-hero-visitor-item + .wt-hero-visitor-item {
    padding-top: 10px;
    border-top: 1px dashed #e5e7eb;
  }
  .wt-hero-visitor-name {
    font-size: 15px;
    color: #111827;
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .wt-hero-visitor-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: #6366f1;
    box-shadow: 0 0 6px rgba(99,102,241,0.4);
    animation: wt-pulse 1.6s ease-in-out infinite;
    flex-shrink: 0;
  }
  .wt-hero-footer {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 10px;
    margin-top: 20px;
    padding-top: 14px;
    border-top: 1px solid #f0f0f0;
  }
  .wt-hero-kpi-grid {
    margin-top: 0;
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 10px;
    width: min(760px, 100%);
    margin-left: auto;
    flex-shrink: 0;
  }
  .wt-hero-kpi {
    border: 1px solid #ebebeb;
    border-radius: 16px;
    background: #fff;
    padding: 24px 26px;
  }
  .wt-hero-kpi-label {
    font-size: 14px;
    color: #6b7280;
    font-weight: 700;
    margin-bottom: 12px;
  }
  .wt-hero-kpi-row {
    display: flex;
    align-items: baseline;
    gap: 4px;
  }
  .wt-hero-kpi-split {
    display: flex;
    flex-direction: column;
    gap: 8px;
    min-height: 40px;
  }
  .wt-hero-kpi-split-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }
  .wt-hero-kpi-split-row + .wt-hero-kpi-split-row {
    padding-top: 8px;
    border-top: 1px dashed #e5e7eb;
  }
  .wt-hero-kpi-split-label {
    font-size: 13px;
    color: #6b7280;
    font-weight: 700;
  }
  .wt-hero-kpi-split-value {
    font-size: 18px;
    color: #111827;
    font-weight: 800;
    letter-spacing: -0.01em;
  }
  .wt-hero-kpi-value {
    font-size: 38px;
    line-height: 1;
    font-weight: 900;
    color: #111827;
    letter-spacing: -0.02em;
  }
  .wt-hero-kpi-unit {
    font-size: 18px;
    color: #9ca3af;
    font-weight: 700;
  }
  .wt-hero-kpi-bar {
    margin-top: 14px;
    height: 10px;
    border-radius: 99px;
    background: #f0f0f0;
    overflow: hidden;
  }
  .wt-hero-kpi-bar-fill {
    height: 100%;
    border-radius: 99px;
    transition: width 0.6s ease;
  }
  .wt-hero-kpi-sub {
    margin-top: 12px;
    font-size: 13px;
    color: #6b7280;
    line-height: 1.5;
    font-weight: 600;
    word-break: keep-all;
  }
  .wt-timestamp {
    font-size: 14px; color: #9ca3af; font-weight: 500;
    font-variant-numeric: tabular-nums;
  }
  .wt-refresh-btn {
    width: 34px; height: 34px; border-radius: 8px;
    border: 1px solid #e2e8f0; background: #fff;
    display: flex; align-items: center; justify-content: center;
    cursor: pointer; color: #6b7280;
    transition: all 0.15s;
  }
  .wt-refresh-btn:hover { border-color: #90C450; color: #90C450; background: #f5f8ff; }
  .wt-refresh-btn:active { transform: scale(0.93); }

  .wt-card {
    background: #fff; border: 1px solid #e2e8f0; border-radius: 16px;
    padding: 28px 32px; margin-bottom: 16px;
    position: relative; overflow: hidden;
    box-shadow: 0 1px 4px rgba(0,0,0,0.03);
  }
  .wt-card-accent { display: none; }
  .wt-card-congestion { display: flex; flex-direction: column; }
  .wt-card-header {
    display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px;
    margin-bottom: 20px; padding-bottom: 16px; border-bottom: 1px solid #f0f0f0;
  }
  .wt-card-header-congestion { justify-content: flex-start; }
  .wt-card-header-congestion .wt-card-actions {
    justify-content: space-between; margin-left: 0; width: 100%;
  }
  .wt-congestion-scroll {
    overflow: hidden;
  }
  .wt-list-wrap {
    transition: max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    overflow: hidden;
    position: relative;
  }
  .wt-list-wrap.collapsed::after {
    content: "";
    position: absolute;
    bottom: 0; left: 0; right: 0;
    height: 60px;
    background: linear-gradient(to bottom, transparent, #fff);
    pointer-events: none;
  }
  .wt-show-more-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    width: 100%;
    margin-top: 16px;
    padding: 12px 0;
    border: 1px solid #e2e5ea;
    border-radius: 12px;
    background: #fff;
    color: #6b7280;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s;
    font-family: inherit;
  }
  .wt-show-more-btn:hover { background: #f9fafb; color: #374151; border-color: #d1d5db; }
  .wt-show-more-btn:active { transform: scale(0.98); }
  .wt-card-title {
    font-size: 18px; font-weight: 800; color: #111827;
    display: flex; align-items: center; gap: 10px; margin: 0;
  }
  .wt-card-title-icon {
    width: 24px; height: 24px; border-radius: 6px;
    background: transparent; display: flex; align-items: center; justify-content: center;
  }
  .wt-card-tag { font-size: 13px; font-weight: 500; color: #9ca3af; background: #f9fafb; padding: 3px 10px; border-radius: 100px; }
  .wt-card-actions {
    display: inline-flex; align-items: center; gap: 6px; flex-wrap: wrap; justify-content: flex-end;
  }
  .wt-toggle-group {
    display: inline-flex; align-items: center; gap: 0;
  }
  .wt-toggle-btn {
    border: 1px solid #e2e5ea;
    background: #fff;
    color: #9ca3af;
    font-size: 14px;
    font-weight: 600;
    border-radius: 0;
    padding: 9px 18px;
    cursor: pointer;
    transition: all 0.15s ease;
    font-family: inherit;
    white-space: nowrap;
    margin-left: -1px;
  }
  .wt-toggle-btn:first-child { border-radius: 10px 0 0 10px; margin-left: 0; }
  .wt-toggle-btn:last-child { border-radius: 0 10px 10px 0; }
  .wt-toggle-btn.active {
    color: #fff;
    background: #111827;
    border-color: #111827;
    z-index: 1;
    position: relative;
  }
  .wt-toggle-btn:hover:not(.active) { background: #f9fafb; color: #374151; }
  .wt-sort-group {
    display: inline-flex; align-items: center; gap: 0;
    margin-left: auto;
  }
  .wt-sort-btn {
    border: 1px solid #e2e5ea;
    background: #fff;
    color: #9ca3af;
    font-size: 14px;
    font-weight: 600;
    border-radius: 0;
    padding: 9px 18px;
    cursor: pointer;
    transition: all 0.15s ease;
    white-space: nowrap;
    font-family: inherit;
    margin-left: -1px;
  }
  .wt-sort-btn:first-child { border-radius: 10px 0 0 10px; margin-left: 0; }
  .wt-sort-btn:last-child { border-radius: 0 10px 10px 0; }
  .wt-sort-btn.active {
    color: #fff;
    background: #111827;
    border-color: #111827;
    z-index: 1;
    position: relative;
  }
  .wt-sort-btn:hover:not(.active) { background: #f9fafb; color: #374151; }
  .wt-empty-state {
    min-height: 120px; border: none; border-radius: 12px; background: #f9fafb;
    color: #c5c9cf; font-size: 13px; line-height: 1.5; text-align: center; padding: 24px;
    display: flex; align-items: center; justify-content: center;
  }

  /* ── 프로그램 카드 ── */
  .wt-program-list { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 20px; }
  .wt-program-card {
    display: flex;
    flex-direction: column;
    padding: 24px;
    border-radius: 14px;
    background: #fff;
    border: 1px solid #eef0f4;
    transition: all 0.2s ease;
  }
  .wt-program-card:hover {
    border-color: #d1d5db;
    box-shadow: 0 4px 16px rgba(0,0,0,0.06);
    transform: translateY(-2px);
  }
  .wt-program-accent { display: none; }

  .wt-program-card-top {
    display: flex; align-items: center; justify-content: space-between;
    margin-bottom: 16px;
  }
  .wt-program-card-main { display: flex; flex-direction: column; gap: 0; min-width: 0; margin-bottom: 16px; }
  .wt-program-title { margin: 0 0 4px; font-size: 16px; line-height: 1.35; color: #111827; font-weight: 800; }
  .wt-program-time { font-size: 13px; color: #b0b5bc; font-weight: 500; }
  .wt-program-wait-count { margin-top: 6px; font-size: 14px; color: #6b7280; font-weight: 600; }
  .wt-program-right { display: none; }
  .wt-program-wait-min { font-size: 23px; line-height: 1; letter-spacing: -0.03em; font-weight: 800; }
  .wt-program-status { display: none; }

  .wt-program-bar-area {
    display: flex; align-items: center; gap: 12px;
  }
  .wt-program-bar-track {
    flex: 1; height: 6px; border-radius: 99px; background: #f0f0f0; overflow: hidden;
  }
  .wt-program-bar-fill {
    height: 100%; border-radius: 99px; transition: width 0.5s ease;
  }
  .wt-program-bar-label {
    font-size: 13px; font-weight: 700; min-width: 32px; text-align: right; color: #9ca3af;
  }

  .wt-program-card-footer {
    display: flex; align-items: baseline; justify-content: space-between;
    margin-top: 16px;
  }
  .wt-program-footer-sub { font-size: 13px; color: #b0b5bc; font-weight: 500; }

  .wt-badge {
    display: inline-flex; align-items: center; gap: 6px;
    border-radius: 99px; padding: 5px 12px;
    font-size: 13px; font-weight: 700; white-space: nowrap;
    border: none;
    background: #f3f4f6; color: #6b7280;
  }
  .wt-badge-dot {
    width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0;
  }
  .wt-badge-lg { width: fit-content; padding: 5px 12px; font-size: 13px; }
  .wt-badge-relaxed { color: #059669; background: #ecfdf5; }
  .wt-badge-relaxed .wt-badge-dot { background: #059669; }
  .wt-badge-normal { color: #b45309; background: #fef9c3; }
  .wt-badge-normal .wt-badge-dot { background: #d97706; }
  .wt-badge-busy { color: #c2410c; background: #fff7ed; }
  .wt-badge-busy .wt-badge-dot { background: #ea580c; }
  .wt-badge-critical { color: #dc2626; background: #fef2f2; }
  .wt-badge-critical .wt-badge-dot { background: #dc2626; }
  .wt-badge-pending { color: #9ca3af; background: #f3f4f6; }
  .wt-badge-pending .wt-badge-dot { background: #d1d5db; }

  .wt-chart-lead { margin: -2px 0 10px; font-size: 12px; color: #9ca3af; line-height: 1.4; }
  .wt-chart-bars { display: flex; align-items: stretch; gap: 8px; }
  .wt-chart-col { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 6px; }
  .wt-chart-bar-wrap { height: 176px; display: flex; align-items: flex-end; }
  .wt-chart-bar {
    width: 100%; min-height: 6px; border-radius: 8px 8px 4px 4px; background: #CCF0E4;
    position: relative; cursor: default; transition: filter 0.15s;
  }
  .wt-chart-bar.top { background: #90C450; }
  .wt-chart-bar:hover { filter: brightness(0.92); }
  .wt-chart-bar:hover .wt-chart-tooltip { display: flex; }
  .wt-chart-tooltip {
    display: none; position: absolute; left: 50%; bottom: calc(100% + 8px); transform: translateX(-50%);
    z-index: 3; border-radius: 10px; background: #111827; color: #fff; min-width: 140px; max-width: 220px;
    padding: 10px 12px; font-size: 12px; line-height: 1.35; box-shadow: 0 8px 24px rgba(0,0,0,0.18);
    flex-direction: column; gap: 4px;
  }
  .wt-chart-tooltip strong { font-size: 12px; font-weight: 800; }
  .wt-chart-label { text-align: center; font-size: 11px; color: #9ca3af; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

  .wt-booth-priority-note {
    margin: 0 0 16px;
    padding: 16px 20px;
    border-radius: 14px;
    border: 1px solid #e2e8f0;
    background: linear-gradient(135deg, #f8fafc 0%, #E6F7F2 100%);
    color: #374151;
    font-size: 14px;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 10px;
    line-height: 1.4;
  }
  .wt-booth-priority-note::before {
    content: "ℹ";
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border-radius: 8px;
    background: #90C450;
    color: #fff;
    font-size: 14px;
    font-weight: 800;
    flex-shrink: 0;
  }

  /* ── 구역: 카드형 ── */
  .wt-zone-list { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 20px; }
  .wt-zone-item {
    display: flex; flex-direction: column;
    border: 1px solid #eef0f4; border-radius: 14px; background: #fff;
    padding: 24px; transition: all 0.2s ease;
  }
  .wt-zone-item:hover { border-color: #d1d5db; box-shadow: 0 4px 16px rgba(0,0,0,0.05); transform: translateY(-2px); }
  .wt-zone-head { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; margin-bottom: 4px; }
  .wt-zone-head-name { font-size: 16px; font-weight: 800; color: #111827; }
  .wt-zone-head-count { font-size: 23px; font-weight: 800; color: #111827; letter-spacing: -0.02em; }
  .wt-zone-head-unit { font-size: 14px; font-weight: 600; color: #9ca3af; margin-left: 2px; }
  .wt-zone-meta { font-size: 13px; color: #b0b5bc; line-height: 1.3; margin-bottom: 16px; }
  .wt-zone-track { width: 100%; height: 6px; border-radius: 99px; background: #f0f0f0; overflow: hidden; margin-top: auto; }
  .wt-zone-fill { height: 100%; border-radius: inherit; background: #6b7280; transition: width 0.5s ease; }
  .wt-zone-footer { display: flex; align-items: baseline; justify-content: space-between; margin-top: 16px; }
  .wt-zone-footer-label { font-size: 13px; color: #b0b5bc; font-weight: 500; }
  .wt-zone-footer-value { font-size: 15px; color: #111827; font-weight: 800; }

  /* ── 부스: 카드형 ── */
  .wt-booth-list { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 20px; }
  .wt-booth-item {
    display: flex; flex-direction: column;
    border: 1px solid #eef0f4; border-radius: 14px; background: #fff;
    padding: 24px; transition: all 0.2s ease;
  }
  .wt-booth-item:hover { border-color: #d1d5db; box-shadow: 0 4px 16px rgba(0,0,0,0.05); transform: translateY(-2px); }
  .wt-booth-title { margin: 0 0 4px; font-size: 16px; line-height: 1.35; color: #111827; font-weight: 800; }
  .wt-booth-meta { font-size: 13px; color: #b0b5bc; margin-bottom: 16px; }
  .wt-booth-right { display: none; }
  .wt-booth-bar-area { display: flex; align-items: center; gap: 12px; }
  .wt-booth-bar-track { flex: 1; height: 6px; border-radius: 99px; background: #f0f0f0; overflow: hidden; }
  .wt-booth-bar-fill { height: 100%; border-radius: 99px; transition: width 0.5s ease; }
  .wt-booth-card-footer {
    display: flex; align-items: baseline; justify-content: space-between;
    margin-top: 16px;
  }
  .wt-booth-wait { font-size: 23px; color: #111827; font-weight: 800; letter-spacing: -0.02em; }
  .wt-booth-updated { font-size: 13px; color: #b0b5bc; }

  @media (max-width: 1200px) {
    .wt-program-list { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .wt-booth-list { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .wt-zone-list { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  }
  @media (max-width: 900px) {
    .wt-hero-top {
      flex-direction: column;
      align-items: flex-start;
    }
    .wt-hero-kpi-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
      width: 100%;
      margin-left: 0;
      margin-top: 14px;
    }
  }
  @media (max-width: 640px) {
    .wt-container { padding: 20px 16px 48px; }
    .wt-container.selector-mode { padding-top: 16px; }
    .wt-top-actions { align-items: stretch; }
    .wt-event-mode-nav { width: 100%; margin-left: 0; overflow-x: auto; }
    .wt-mode-btn { flex: 0 0 auto; min-width: 112px; }
    .wt-hero-title { font-size: 22px; }
    .wt-hero-kpi-grid {
      grid-template-columns: 1fr;
      width: 100%;
      margin-left: 0;
      margin-top: 14px;
    }
    .wt-hero-kpi-value { font-size: 26px; }
    .wt-hero-kpi-split-value { font-size: 16px; }
    .wt-hero-visitor-name { font-size: 13px; }
    .wt-card { padding: 22px 18px; }
    .wt-program-list { grid-template-columns: 1fr; }
    .wt-booth-list { grid-template-columns: 1fr; }
    .wt-zone-list { grid-template-columns: 1fr; }
    .wt-program-wait-min { font-size: 18px; }
    .wt-congestion-scroll { max-height: clamp(260px, 50vh, 420px); }
    .wt-sort-group { margin-left: 0; }
  }
`;

export const SERVICE_CATEGORIES = [
  { label: "전체 행사", path: "/realtime/waitingstatus", countKey: "all" },
  { label: "진행중 행사", path: "/realtime/waitingstatus?status=live", countKey: "live" },
  { label: "예정 행사", path: "/realtime/waitingstatus?status=upcoming", countKey: "upcoming" },
  { label: "종료 행사", path: "/realtime/waitingstatus?status=ended", countKey: "ended" },
];
const EVENT_REALTIME_BUTTONS = [
  { key: "dashboard", label: "통합현황", path: "/realtime/dashboard" },
  { key: "waiting", label: "대기현황", path: "/realtime/waitingstatus" },
  { key: "checkin", label: "체크인 현황", path: "/realtime/checkinstatus" },
  { key: "vote", label: "투표현황", path: "/realtime/votestatus" },
];

const ZONE_NAME_MAP = {
  ZONE_A: "A 구역",
  ZONE_B: "B 구역",
  ZONE_C: "C 구역",
  OTHER: "기타",
};

const unwrapData = (response, fallback) =>
  response?.data?.data ?? response?.data ?? fallback;

const toArray = (payload) =>
  Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.content)
      ? payload.content
      : [];

function toNumberOrNull(value) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return Math.max(0, Math.round(parsed));
}

function safeNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatZoneName(value) {
  return ZONE_NAME_MAP[String(value ?? "").toUpperCase()] ?? "미분류";
}

function formatTimeValue(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function formatTimeRange(startAt, endAt) {
  const start = formatTimeValue(startAt);
  const end = formatTimeValue(endAt);
  if (start && end) return `${start} ~ ${end}`;
  return start || end || "운영 시간 정보 없음";
}

function toDateOrNull(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function isProgramOperatingNow(startAt, endAt, now = new Date()) {
  const start = toDateOrNull(startAt);
  const end = toDateOrNull(endAt);
  if (!start || !end) return true;
  return start <= now && now < end;
}

function getCongestionStatus(waitCount, waitMin) {
  const count = toNumberOrNull(waitCount);
  const minutes = toNumberOrNull(waitMin);

  if (count === null || minutes === null) {
    return { label: "집계 중", tone: "pending" };
  }
  if (count === 0 && minutes === 0) {
    return { label: "여유", tone: "relaxed" };
  }
  if (minutes < 10) {
    return { label: "보통", tone: "normal" };
  }
  if (minutes < 20) {
    return { label: "혼잡", tone: "busy" };
  }
  return { label: "매우 혼잡", tone: "critical" };
}

function getStatusText(waitCount, waitMin) {
  const count = toNumberOrNull(waitCount);
  const minutes = toNumberOrNull(waitMin);

  if (count === null || minutes === null) return "집계 중";
  if (count === 0 && minutes === 0) return "즉시 참여 가능";
  if (minutes === 0) return "대기 거의 없음";
  if (count > 0 || minutes > 0) return "대기 발생";
  return "집계 중";
}

function getWaitCountDisplay(waitCount, waitMin) {
  const count = toNumberOrNull(waitCount);
  const minutes = toNumberOrNull(waitMin);
  if (count === null || minutes === null) return "집계 중";
  if (count === 0 && minutes === 0) return "즉시 참여 가능";
  return `대기 ${count}팀`;
}

function getWaitMinuteDisplay(waitMin, waitCount) {
  const minutes = toNumberOrNull(waitMin);
  const count = toNumberOrNull(waitCount);
  if (minutes === null || count === null) return "집계 중";
  if (minutes === 0) return "대기 없음";
  return `약 ${minutes}분`;
}

function getWaitTimeWithTeamDisplay(waitMin, waitCount) {
  const minutes = toNumberOrNull(waitMin);
  const count = toNumberOrNull(waitCount);
  if (minutes === null || count === null) return "집계 중";
  return `${getWaitMinuteDisplay(waitMin, waitCount)}(${count}팀)`;
}

function getCongestionScore(waitCount, waitMin) {
  const count = toNumberOrNull(waitCount);
  const minutes = toNumberOrNull(waitMin);
  if (count === null || minutes === null) return null;

  const minuteScore = Math.min(100, Math.max(0, minutes * 4));
  const countScore = Math.min(100, Math.max(0, count * 5));
  return Math.round(minuteScore * 0.7 + countScore * 0.3);
}

function getCongestionGuideText(tone) {
  if (tone === "relaxed") return "지금 참여하기 좋아요";
  if (tone === "normal") return "무난하게 이용 가능해요";
  if (tone === "busy") return "조금 기다려야 해요";
  if (tone === "critical") return "혼잡하니 잠시 후 방문 추천";
  return "대기 정보를 집계하고 있어요";
}

function getToneColor(tone) {
  if (tone === "relaxed") return "#059669";
  if (tone === "normal") return "#d97706";
  if (tone === "busy") return "#ea580c";
  if (tone === "critical") return "#dc2626";
  return "#d1d5db";
}

function getWaitBarPercent(waitMin, maxWaitMin) {
  const minutes = toNumberOrNull(waitMin);
  if (minutes === null || minutes === 0) return 0;
  const max = Math.max(maxWaitMin, 1);
  return Math.max(6, Math.min(100, Math.round((minutes / max) * 100)));
}

async function getAllBoothsByEvent(eventId) {
  const all = [];
  let page = 0;
  let isLast = false;

  while (!isLast && page < 100) {
    const response = await boothApi.getEventBooths({
      eventId,
      page,
      size: 200,
      sort: "boothId,asc",
    });
    const payload = unwrapData(response, {});
    all.push(...toArray(payload));
    isLast = Boolean(payload?.last);
    page += 1;
  }

  return all;
}

async function settleWithConcurrency(items, worker, concurrency = 8) {
  const list = Array.isArray(items) ? items : [];
  if (list.length === 0) return [];

  const size = Math.max(1, Math.min(concurrency, list.length));
  const results = new Array(list.length);
  let cursor = 0;

  const runner = async () => {
    while (true) {
      const current = cursor;
      cursor += 1;
      if (current >= list.length) break;
      try {
        const value = await worker(list[current], current);
        results[current] = { status: "fulfilled", value };
      } catch (reason) {
        results[current] = { status: "rejected", reason };
      }
    }
  };

  await Promise.all(Array.from({ length: size }, () => runner()));
  return results;
}

function mapBoothWait(detail) {
  if (!detail) return null;

  const waitCount = toNumberOrNull(detail.wait?.waitCount);
  const waitMin = toNumberOrNull(detail.wait?.waitMin);
  const congestion = getCongestionStatus(waitCount, waitMin);
  const congestionScore = getCongestionScore(waitCount, waitMin);

  return {
    id: `booth-${detail.boothId}`,
    boothId: detail.boothId,
    boothTitle: detail.placeName || `부스 ${detail.boothId}`,
    zone: String(detail.zone ?? "").toUpperCase(),
    zoneLabel: formatZoneName(detail.zone),
    subText: detail.company || "현장 부스",
    waitCount,
    waitMin,
    congestionLabel: congestion.label,
    congestionTone: congestion.tone,
    congestionScore,
    statusText: getStatusText(waitCount, waitMin),
    updatedAt: detail.wait?.updatedAt || detail.updatedAt || detail.createdAt || null,
  };
}

function mapProgramWait(detail) {
  if (!detail) return null;

  const waitCount = toNumberOrNull(detail.experienceWait?.waitCount);
  const waitMin = toNumberOrNull(detail.experienceWait?.waitMin);
  const congestion = getCongestionStatus(waitCount, waitMin);

  return {
    id: `program-${detail.programId}`,
    programId: detail.programId,
    programTitle: detail.programTitle || `프로그램 ${detail.programId}`,
    startAt: detail.startAt || null,
    endAt: detail.endAt || null,
    timeText: formatTimeRange(detail.startAt, detail.endAt),
    waitCount,
    waitMin,
    congestionLabel: congestion.label,
    congestionTone: congestion.tone,
    statusText: getStatusText(waitCount, waitMin),
    updatedAt:
      detail.experienceWait?.updatedAt || detail.updatedAt || detail.startAt || null,
  };
}

function compareProgramRows(a, b) {
  const aWaitMin = a.waitMin ?? -1;
  const bWaitMin = b.waitMin ?? -1;
  const aWaitCount = a.waitCount ?? -1;
  const bWaitCount = b.waitCount ?? -1;

  return (
    bWaitMin - aWaitMin ||
    bWaitCount - aWaitCount ||
    String(a.programTitle ?? "").localeCompare(String(b.programTitle ?? ""), "ko-KR")
  );
}

function compareBoothRows(a, b) {
  const aWaitMin = a.waitMin ?? -1;
  const bWaitMin = b.waitMin ?? -1;
  const aWaitCount = a.waitCount ?? -1;
  const bWaitCount = b.waitCount ?? -1;

  return (
    bWaitMin - aWaitMin ||
    bWaitCount - aWaitCount ||
    String(a.boothTitle ?? "").localeCompare(String(b.boothTitle ?? ""), "ko-KR")
  );
}

function WaitingContent({ eventId }) {
  const numericEventId = Number(eventId);
  const { tick } = useAutoRefresh(15000);

  const [eventDetail, setEventDetail] = useState(null);
  const [programWaitingRows, setProgramWaitingRows] = useState([]);
  const [boothWaitingRows, setBoothWaitingRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [flashKey, setFlashKey] = useState(0);
  const [lastLoadedAt, setLastLoadedAt] = useState(new Date());
  const [congestionView, setCongestionView] = useState("program");
  const [congestionSortOrder, setCongestionSortOrder] = useState("busy");
  const [showAll, setShowAll] = useState(false);
  const inFlightRef = useRef(false);
  const listRef = useRef(null);
  const INITIAL_COUNT = 6;
  const COLLAPSED_HEIGHT = 580;

  const loadData = useCallback(
    async (options = {}) => {
      const { preserveLoading = false } = options;

      if (!numericEventId || Number.isNaN(numericEventId)) {
        setErrorMsg("잘못된 행사 경로입니다.");
        setProgramWaitingRows([]);
        setBoothWaitingRows([]);
        setLoading(false);
        return;
      }

      if (inFlightRef.current) return;
      inFlightRef.current = true;
      if (!preserveLoading) setLoading(true);

      try {
        const response = await adminRealtimeApi.getWaitingStatusSnapshot(numericEventId);
        const snapshot = unwrapData(response, null);
        if (!snapshot || typeof snapshot !== "object") {
          throw new Error("Waiting snapshot is empty.");
        }

        const nextBoothRows = toArray(snapshot?.boothWaitSummaries)
          .map((row) => {
            const waitCount = toNumberOrNull(row?.waitCount);
            const waitMin = toNumberOrNull(row?.waitMin);
            const fallbackCongestion = getCongestionStatus(waitCount, waitMin);
            return {
              id: row?.id || `booth-${row?.boothId ?? ""}`,
              boothId: Number(row?.boothId),
              boothTitle: row?.boothTitle || row?.placeName || `부스 ${row?.boothId ?? "-"}`,
              zone: String(row?.zone ?? "").toUpperCase(),
              zoneLabel: row?.zoneLabel || formatZoneName(row?.zone),
              subText: row?.subText || "",
              waitCount,
              waitMin,
              congestionLabel: row?.congestionLabel || fallbackCongestion.label,
              congestionTone: row?.congestionTone || fallbackCongestion.tone,
              congestionScore:
                toNumberOrNull(row?.congestionScore) ?? getCongestionScore(waitCount, waitMin),
              statusText: getStatusText(waitCount, waitMin),
              updatedAt: row?.updatedAt || null,
            };
          })
          .sort(compareBoothRows);

        const nextProgramRows = toArray(snapshot?.programWaitSummaries)
          .map((row) => {
            const waitCount = toNumberOrNull(row?.waitCount);
            const waitMin = toNumberOrNull(row?.waitMin);
            const fallbackCongestion = getCongestionStatus(waitCount, waitMin);
            return {
              id: row?.id || `program-${row?.programId ?? ""}`,
              programId: Number(row?.programId),
              programTitle: row?.programTitle || `프로그램 ${row?.programId ?? "-"}`,
              startAt: row?.startAt || null,
              endAt: row?.endAt || null,
              timeText: row?.timeText || formatTimeRange(row?.startAt, row?.endAt),
              waitCount,
              waitMin,
              congestionLabel: row?.congestionLabel || fallbackCongestion.label,
              congestionTone: row?.congestionTone || fallbackCongestion.tone,
              statusText: getStatusText(waitCount, waitMin),
              updatedAt: row?.updatedAt || null,
            };
          })
          .sort(compareProgramRows);

        const eventSummary = snapshot?.eventSummary || {};
        setEventDetail({
          eventId: eventSummary?.eventId ?? numericEventId,
          eventName: eventSummary?.eventName || `행사 ${numericEventId}`,
          status: eventSummary?.status || "",
          startAt: eventSummary?.startAt || null,
          endAt: eventSummary?.endAt || null,
          location: eventSummary?.location || "",
        });
        setProgramWaitingRows(nextProgramRows);
        setBoothWaitingRows(nextBoothRows);
        setErrorMsg("");
        setLastLoadedAt(
          snapshot?.metadata?.serverTime ||
          snapshot?.waitingSummary?.latestUpdatedAt ||
          new Date(),
        );
        return;

      } catch (error) {
        console.error("[WaitingStatus] load failed:", error);
        setErrorMsg("대기 현황 데이터를 불러오지 못했습니다.");
      } finally {
        inFlightRef.current = false;
        if (!preserveLoading) setLoading(false);
      }
    },
    [numericEventId],
  );

  const { spinning, refresh } = useRefresh(() => {
    loadData({ preserveLoading: true });
  }, 800);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!loading) {
      if (document.visibilityState === "hidden") return;
      loadData({ preserveLoading: true });
    }
  }, [tick, loadData, loading]);

  useEffect(() => {
    setFlashKey((value) => value + 1);
  }, [lastLoadedAt]);

  const sortedProgramRows = useMemo(
    () => [...programWaitingRows].sort(compareProgramRows),
    [programWaitingRows],
  );
  const sortedBoothRows = useMemo(
    () => [...boothWaitingRows].sort(compareBoothRows),
    [boothWaitingRows],
  );
  const orderedProgramRows = useMemo(
    () =>
      congestionSortOrder === "relaxed"
        ? [...sortedProgramRows].reverse()
        : sortedProgramRows,
    [congestionSortOrder, sortedProgramRows],
  );
  const orderedBoothRows = useMemo(
    () =>
      congestionSortOrder === "relaxed"
        ? [...sortedBoothRows].reverse()
        : sortedBoothRows,
    [congestionSortOrder, sortedBoothRows],
  );
  useEffect(() => {
    if (
      congestionView === "program" &&
      sortedProgramRows.length === 0 &&
      sortedBoothRows.length > 0
    ) {
      setCongestionView("booth");
      return;
    }
    if (
      congestionView === "booth" &&
      sortedBoothRows.length === 0 &&
      sortedProgramRows.length > 0
    ) {
      setCongestionView("program");
    }
  }, [congestionView, sortedBoothRows.length, sortedProgramRows.length]);
  const summary = useMemo(() => {
    const operatingProgramCount = sortedProgramRows.length;
    const waitingProgramRows = sortedProgramRows.filter(
      (row) => toNumberOrNull(row.waitMin) !== null && safeNumber(row.waitMin) > 0,
    );
    const waitingProgramCount = waitingProgramRows.length;
    const immediateProgramRows = sortedProgramRows.filter(
      (row) => toNumberOrNull(row.waitMin) === 0,
    );
    const immediateProgramCount = immediateProgramRows.length;
    const busiestProgram = waitingProgramRows[0] ?? sortedProgramRows[0] ?? null;
    const measuredProgramRows = sortedProgramRows.filter(
      (row) => toNumberOrNull(row.waitMin) !== null,
    );
    const averageProgramWaitMin = measuredProgramRows.length
      ? Math.round(
          measuredProgramRows.reduce(
            (total, row) => total + safeNumber(row.waitMin),
            0,
          ) / measuredProgramRows.length,
        )
      : 0;

    const operatingBoothCount = sortedBoothRows.length;
    const waitingBoothRows = sortedBoothRows.filter(
      (row) => toNumberOrNull(row.waitMin) !== null && safeNumber(row.waitMin) > 0,
    );
    const waitingBoothCount = waitingBoothRows.length;
    const busiestBooth = waitingBoothRows[0] ?? sortedBoothRows[0] ?? null;
    const immediateBoothRows = sortedBoothRows.filter(
      (row) => toNumberOrNull(row.waitMin) === 0,
    );
    const immediateBoothCount = immediateBoothRows.length;
    const measuredBoothRows = sortedBoothRows.filter(
      (row) => toNumberOrNull(row.waitMin) !== null,
    );
    const averageBoothWaitMin = measuredBoothRows.length
      ? Math.round(
          measuredBoothRows.reduce(
            (total, row) => total + safeNumber(row.waitMin),
            0,
          ) / measuredBoothRows.length,
        )
      : 0;

    const maxWaitMinCandidates = [
      ...waitingProgramRows.map((row) => safeNumber(row.waitMin)),
      ...waitingBoothRows.map((row) => safeNumber(row.waitMin)),
    ];
    const maxWaitMin = maxWaitMinCandidates.length
      ? Math.max(...maxWaitMinCandidates)
      : 0;

    return {
      operatingProgramCount,
      operatingBoothCount,
      waitingProgramRows,
      waitingProgramCount,
      waitingBoothRows,
      waitingBoothCount,
      immediateProgramRows,
      immediateProgramCount,
      immediateBoothRows,
      immediateBoothCount,
      averageProgramWaitMin,
      averageBoothWaitMin,
      maxWaitMin,
      busiestProgram,
      busiestBooth,
    };
  }, [sortedBoothRows, sortedProgramRows]);

  const zoneDistribution = useMemo(() => {
    const map = new Map();

    sortedBoothRows.forEach((row) => {
      const key = row.zoneLabel || "미분류";
      const current = map.get(key) || {
        zoneLabel: key,
        boothCount: 0,
        waitTeamTotal: 0,
        waitMinTotal: 0,
        measuredCount: 0,
        congestionScoreTotal: 0,
        congestionScoreCount: 0,
      };
      current.boothCount += 1;
      if (row.waitCount !== null) current.waitTeamTotal += safeNumber(row.waitCount);
      if (row.waitMin !== null) {
        current.waitMinTotal += safeNumber(row.waitMin);
        current.measuredCount += 1;
      }
      if (row.congestionScore !== null && row.congestionScore !== undefined) {
        current.congestionScoreTotal += safeNumber(row.congestionScore);
        current.congestionScoreCount += 1;
      }
      map.set(key, current);
    });

    return [...map.values()]
      .map((item) => ({
        ...item,
        averageWaitMin: item.measuredCount
          ? Math.round(item.waitMinTotal / item.measuredCount)
          : 0,
        averageCongestionScore: item.congestionScoreCount
          ? Math.round(item.congestionScoreTotal / item.congestionScoreCount)
          : 0,
      }))
      .sort(
        (a, b) =>
          b.averageCongestionScore - a.averageCongestionScore ||
          b.waitTeamTotal - a.waitTeamTotal ||
          b.averageWaitMin - a.averageWaitMin ||
          a.zoneLabel.localeCompare(b.zoneLabel, "ko-KR"),
      );
  }, [sortedBoothRows]);

  const programVisible = useStaggerIn(orderedProgramRows.length, 60);
  const boothVisible = useStaggerIn(orderedBoothRows.length, 40);
  const visibleBoothRows = useMemo(() => orderedBoothRows.slice(0, 12), [orderedBoothRows]);

  const lastLoadedLabel = (() => {
    const date = toDateOrNull(lastLoadedAt);
    if (!date) return "--:--:--";
    return date.toLocaleTimeString("ko-KR", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  })();

  const eventName =
    eventDetail?.eventName || eventDetail?.title || `행사 ${numericEventId}`;

  const heroProgram = summary.busiestProgram;
  const heroBooth = summary.busiestBooth;
  const heroProgramWaitText = heroProgram
    ? getWaitTimeWithTeamDisplay(heroProgram.waitMin, heroProgram.waitCount)
    : "집계 중";
  const heroBoothWaitText = heroBooth
    ? getWaitTimeWithTeamDisplay(heroBooth.waitMin, heroBooth.waitCount)
    : "집계 중";

  const isProgramEmpty = !loading && sortedProgramRows.length === 0;
  const isBoothEmpty = !loading && sortedBoothRows.length === 0;
  const isZoneEmpty = !loading && zoneDistribution.length === 0;
  const shouldPromoteBooth = isProgramEmpty && !loading;
  const isProgramCongestionView = congestionView === "program";
  const isBoothCongestionView = congestionView === "booth";
  const isZoneCongestionView = congestionView === "zone";
  const isCongestionLoading =
    loading &&
    (isProgramCongestionView
      ? orderedProgramRows.length === 0
      : isBoothCongestionView
        ? orderedBoothRows.length === 0
        : zoneDistribution.length === 0);
  const isCongestionEmpty = !loading && (
    isProgramCongestionView
      ? isProgramEmpty
      : isBoothCongestionView
        ? isBoothEmpty
        : isZoneEmpty
  );

  const animOperatingProgram = useCountUp(summary.operatingProgramCount, 900, 0);
  const animOperatingBooth = useCountUp(summary.operatingBoothCount, 900, 80);
  const animImmediateProgram = useCountUp(summary.immediateProgramCount, 900, 160);
  const animImmediateBooth = useCountUp(summary.immediateBoothCount, 900, 240);
  const animAverageProgramWait = useCountUp(summary.averageProgramWaitMin, 900, 320);
  const animAverageBoothWait = useCountUp(summary.averageBoothWaitMin, 900, 400);

  if (loading && !eventDetail) {
    return <PageLoading message="대기현황을 불러오는 중입니다" />;
  }

  const eventDateRange = (() => {
    const start = eventDetail?.startAt ? new Date(eventDetail.startAt) : null;
    const end = eventDetail?.endAt ? new Date(eventDetail.endAt) : null;
    if (!start || !end) return "일정 정보 없음";
    const fmt = (d) => d.toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" });
    return `${fmt(start)} ~ ${fmt(end)}`;
  })();

  const heroKpis = [
    {
      label: "운영프로그램",
      value: animOperatingProgram,
      unit: "개",
      barValue:
        summary.operatingProgramCount > 0
          ? Math.round(
              (summary.waitingProgramCount / summary.operatingProgramCount) * 100,
            )
          : 0,
      barColor: "#6366f1",
      sub: `대기 중 ${summary.waitingProgramCount}개`,
    },
    {
      label: "운영부스",
      value: animOperatingBooth,
      unit: "개",
      barValue:
        summary.operatingBoothCount > 0
          ? Math.round((summary.waitingBoothCount / summary.operatingBoothCount) * 100)
          : 0,
      barColor: "#0ea5e9",
      sub: `대기 중 ${summary.waitingBoothCount}개`,
    },
    {
      label: "즉시 참여 가능",
      splitRows: [
        { label: "프로그램", value: `${animImmediateProgram}개` },
        { label: "부스", value: `${animImmediateBooth}개` },
      ],
      showProgress: false,
      barValue:
        summary.operatingProgramCount + summary.operatingBoothCount > 0
          ? Math.round(
              ((summary.immediateProgramCount + summary.immediateBoothCount) /
                (summary.operatingProgramCount + summary.operatingBoothCount)) *
                100,
            )
          : 0,
      barColor: "#059669",
      sub: "바로 참여 가능한 항목",
    },
    {
      label: "평균 대기 시간",
      splitRows: [
        { label: "프로그램", value: `${animAverageProgramWait}분` },
        { label: "부스", value: `${animAverageBoothWait}분` },
      ],
      showProgress: false,
      barValue: Math.min(
        100,
        Math.max(summary.averageProgramWaitMin, summary.averageBoothWaitMin) * 4,
      ),
      barColor:
        Math.max(summary.averageProgramWaitMin, summary.averageBoothWaitMin) >= 20
          ? "#dc2626"
          : Math.max(summary.averageProgramWaitMin, summary.averageBoothWaitMin) >= 10
            ? "#d97706"
            : "#059669",
      sub: "항목별 평균 대기 기준",
    },
  ];

  return (
    <>
      <section className="wt-hero">
        <div className="wt-hero-top">
          <div className="wt-hero-main">
            <div className="wt-hero-title-row">
              <h1 className="wt-hero-title">{eventName}</h1>
              <div className="wt-status-chip">
                <div className="wt-status-dot" />
                LIVE
              </div>
            </div>
            <div className="wt-hero-meta">
              <span className="wt-hero-meta-item">
                <CalendarDays size={13} />
                {eventDateRange}
              </span>
              <span className="wt-hero-meta-item">
                <MapPin size={13} />
                {eventDetail?.location || "장소 정보 없음"}
              </span>
            </div>
            <hr className="wt-hero-divider" />
            <div className="wt-hero-visitor">
              <div className="wt-hero-visitor-item">
                <span className="wt-hero-visitor-dot" />
                <div className="wt-hero-visitor-name">
                  {`가장 인기있는 프로그램 : ${heroProgram?.programTitle ?? "집계 중"}, 대기시간: ${heroProgramWaitText}`}
                </div>
              </div>
              <div className="wt-hero-visitor-item">
                <span className="wt-hero-visitor-dot" />
                <div className="wt-hero-visitor-name">
                  {`가장 인기있는 부스 : ${heroBooth?.boothTitle ?? "집계 중"}, 대기시간: ${heroBoothWaitText}`}
                </div>
              </div>
            </div>
          </div>
          <div className="wt-hero-kpi-grid">
            {heroKpis.map((item) => (
              <div key={item.label} className="wt-hero-kpi">
                <div className="wt-hero-kpi-label">{item.label}</div>
                {item.splitRows ? (
                  <div className="wt-hero-kpi-split">
                    {item.splitRows.map((row) => (
                      <div key={`${item.label}-${row.label}`} className="wt-hero-kpi-split-row">
                        <span className="wt-hero-kpi-split-label">{row.label} :</span>
                        <span className="wt-hero-kpi-split-value">{row.value}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="wt-hero-kpi-row">
                    <span className="wt-hero-kpi-value">{item.value}</span>
                    {item.unit ? <span className="wt-hero-kpi-unit">{item.unit}</span> : null}
                  </div>
                )}
                {item.showProgress === false ? null : (
                  <>
                    <div className="wt-hero-kpi-bar">
                      <div className="wt-hero-kpi-bar-fill" style={{ width: `${item.barValue}%`, background: item.barColor }} />
                    </div>
                    <div className="wt-hero-kpi-sub">{item.sub}</div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
        <div className="wt-hero-footer">
          <span key={flashKey} className="wt-timestamp anim-flash">
            마지막 갱신: {lastLoadedLabel}
          </span>
          <button className="wt-refresh-btn" onClick={refresh} title="새로고침">
            <RefreshCw
              size={14}
              style={{
                animation: spinning
                  ? "anim-spin 0.8s cubic-bezier(0.4,0,0.2,1)"
                  : "none",
              }}
            />
          </button>
        </div>
      </section>

      {shouldPromoteBooth ? (
        <div className="wt-booth-priority-note">
          현재 운영 중인 프로그램이 없어 부스 대기 정보를 먼저 안내합니다.
        </div>
      ) : null}

      <div className="wt-card wt-card-congestion">
        <div className="wt-card-accent" style={{ background: "#90C450" }} />
        <div className="wt-card-header wt-card-header-congestion">
          <div className="wt-card-actions">
            <div className="wt-toggle-group">
              <button
                type="button"
                className={`wt-toggle-btn ${isProgramCongestionView ? "active" : ""}`}
                onClick={() => { setCongestionView("program"); setShowAll(false); }}
              >
                프로그램
              </button>
              <button
                type="button"
                className={`wt-toggle-btn ${isBoothCongestionView ? "active" : ""}`}
                onClick={() => { setCongestionView("booth"); setShowAll(false); }}
              >
                부스
              </button>
              <button
                type="button"
                className={`wt-toggle-btn ${isZoneCongestionView ? "active" : ""}`}
                onClick={() => { setCongestionView("zone"); setShowAll(false); }}
              >
                구역
              </button>
            </div>
            {!isZoneCongestionView ? (
              <div className="wt-sort-group" role="group" aria-label="혼잡도 정렬">
                <button
                  type="button"
                  className={`wt-sort-btn ${congestionSortOrder === "busy" ? "active" : ""}`}
                  onClick={() => setCongestionSortOrder("busy")}
                >
                  인기순
                </button>
                <button
                  type="button"
                  className={`wt-sort-btn ${congestionSortOrder === "relaxed" ? "active" : ""}`}
                  onClick={() => setCongestionSortOrder("relaxed")}
                >
                  여유순
                </button>
              </div>
            ) : null}
          </div>
        </div>

        <div className="wt-congestion-scroll">
        {isBoothCongestionView ? (
          isCongestionLoading ? (
            <div className="wt-empty-state">부스 혼잡도 데이터를 불러오는 중입니다.</div>
          ) : isCongestionEmpty ? (
            <div className="wt-empty-state">현재 집계된 부스 혼잡도 정보가 없습니다.</div>
          ) : (
            <>
            <div
              className={`wt-list-wrap${!showAll && visibleBoothRows.length > INITIAL_COUNT ? " collapsed" : ""}`}
              style={{ maxHeight: showAll ? `${visibleBoothRows.length * 300}px` : `${COLLAPSED_HEIGHT}px` }}
              ref={listRef}
            >
            <div className="wt-booth-list">
              {visibleBoothRows.map((row, index) => {
                const boothColor = getToneColor(row.congestionTone);
                const boothBarPct = getWaitBarPercent(row.waitMin, summary.maxWaitMin);
                return (
                  <div
                    key={row.id}
                    className={`wt-booth-item anim-slide-right ${boothVisible.includes(index) ? "visible" : ""}`}
                    style={{ "--booth-tone-color": boothColor }}
                  >
                    <div className="wt-program-card-top">
                      <span className={`wt-badge wt-badge-${row.congestionTone}`}>
                        <span className="wt-badge-dot" style={{ background: boothColor }} />
                        {row.congestionLabel}
                      </span>
                    </div>
                    <h4 className="wt-booth-title">{row.boothTitle}</h4>
                    <div className="wt-booth-meta">
                      {row.zoneLabel} · {row.subText}
                    </div>
                    <div className="wt-booth-bar-area">
                      <div className="wt-booth-bar-track">
                        <div className="wt-booth-bar-fill" style={{ width: `${boothBarPct}%`, background: boothColor }} />
                      </div>
                    </div>
                    <div className="wt-booth-card-footer">
                      <div className="wt-booth-wait" style={{ color: boothColor }}>
                        {getWaitMinuteDisplay(row.waitMin, row.waitCount)}
                      </div>
                      <div className="wt-booth-updated">
                        {row.waitCount !== null ? `${row.waitCount}팀 대기` : "집계 중"}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            </div>
            {visibleBoothRows.length > INITIAL_COUNT && (
              <button type="button" className="wt-show-more-btn" onClick={() => setShowAll((v) => !v)}>
                {showAll ? "접기 ▲" : `더보기 (${visibleBoothRows.length - INITIAL_COUNT}개) ▼`}
              </button>
            )}
            </>
          )
        ) : isZoneCongestionView ? (
          isCongestionLoading ? (
            <div className="wt-empty-state">구역별 대기 데이터를 불러오는 중입니다.</div>
          ) : isCongestionEmpty ? (
            <div className="wt-empty-state">현재 집계된 구역별 대기 정보가 없습니다.</div>
          ) : (
            <>
            <div
              className={`wt-list-wrap${!showAll && zoneDistribution.length > INITIAL_COUNT ? " collapsed" : ""}`}
              style={{ maxHeight: showAll ? `${zoneDistribution.length * 300}px` : `${COLLAPSED_HEIGHT}px` }}
            >
            <div className="wt-zone-list">
              {zoneDistribution.map((item) => {
                const zonePct = Math.max(
                  0,
                  Math.min(100, safeNumber(item.averageCongestionScore)),
                );
                return (
                  <div key={item.zoneLabel} className="wt-zone-item">
                    <div className="wt-zone-head">
                      <span className="wt-zone-head-name">{item.zoneLabel}</span>
                      <span><span className="wt-zone-head-count">{item.waitTeamTotal}</span><span className="wt-zone-head-unit">팀</span></span>
                    </div>
                    <div className="wt-zone-meta">
                      부스 {item.boothCount}개 · 평균 대기 {item.averageWaitMin}분
                    </div>
                    <div className="wt-zone-track">
                      <div className="wt-zone-fill" style={{ width: `${zonePct}%` }} />
                    </div>
                    <div className="wt-zone-footer">
                      <span className="wt-zone-footer-label">혼잡도</span>
                      <span className="wt-zone-footer-value" style={{ color: "#ea580c" }}>{zonePct}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
            </div>
            {zoneDistribution.length > INITIAL_COUNT && (
              <button type="button" className="wt-show-more-btn" onClick={() => setShowAll((v) => !v)}>
                {showAll ? "접기 ▲" : `더보기 (${zoneDistribution.length - INITIAL_COUNT}개) ▼`}
              </button>
            )}
            </>
          )
        ) : loading && orderedProgramRows.length === 0 ? (
          <div className="wt-empty-state">프로그램 대기 현황을 불러오는 중입니다.</div>
        ) : isProgramEmpty ? (
          <div className="wt-empty-state">현재 집계된 프로그램 대기 정보가 없습니다.</div>
        ) : (
          <>
          <div
            className={`wt-list-wrap${!showAll && orderedProgramRows.length > INITIAL_COUNT ? " collapsed" : ""}`}
            style={{ maxHeight: showAll ? `${orderedProgramRows.length * 300}px` : `${COLLAPSED_HEIGHT}px` }}
          >
          <div className="wt-program-list">
            {orderedProgramRows.map((row, index) => {
              const barColor = getToneColor(row.congestionTone);
              const barPct = getWaitBarPercent(row.waitMin, summary.maxWaitMin);
              return (
                <div
                  key={row.id}
                  className={`wt-program-card anim-slide-right ${programVisible.includes(index) ? "visible" : ""}`}
                >
                  <div className="wt-program-card-top">
                    <span className={`wt-badge wt-badge-${row.congestionTone}`}>
                      <span className="wt-badge-dot" style={{ background: barColor }} />
                      {row.congestionLabel}
                    </span>
                  </div>
                  <div className="wt-program-card-main">
                    <h4 className="wt-program-title">{row.programTitle}</h4>
                    <div className="wt-program-time">{row.timeText}</div>
                  </div>
                  <div className="wt-program-bar-area">
                    <div className="wt-program-bar-track">
                      <div className="wt-program-bar-fill" style={{ width: `${barPct}%`, background: barColor }} />
                    </div>
                    <span className="wt-program-bar-label">{barPct}%</span>
                  </div>
                  <div className="wt-program-card-footer">
                    <div className="wt-program-wait-min" style={{ color: barColor }}>
                      {getWaitMinuteDisplay(row.waitMin, row.waitCount)}
                    </div>
                    <span className="wt-program-footer-sub">
                      {row.waitCount !== null ? `${row.waitCount}팀 대기` : "집계 중"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
          </div>
          {orderedProgramRows.length > INITIAL_COUNT && (
            <button type="button" className="wt-show-more-btn" onClick={() => setShowAll((v) => !v)}>
              {showAll ? "접기 ▲" : `더보기 (${orderedProgramRows.length - INITIAL_COUNT}개) ▼`}
            </button>
          )}
          </>
        )}
        </div>
      </div>

    </>
  );
}

export default function WaitingStatus() {
  const { eventId } = useParams();
  const navigate = useNavigate();

  const handleSelectEvent = (id) => {
    navigate(`/realtime/waitingstatus/${id}`);
  };

  return (
    <div className="wt-root">
      <style>{styles}</style>
      <style>{SHARED_ANIM_STYLES}</style>
      <PageHeader
        title={eventId ? "대기현황" : "실시간현황"}
        subtitle={eventId ? "프로그램 대기 상태를 실시간으로 확인합니다" : "행사별 대기 상태를 실시간으로 확인하세요"}
        icon={<Timer size={42} color="#90C450" strokeWidth={1.6} />}
        titleStyle={{ fontSize: 46, lineHeight: "66px", letterSpacing: "-1px" }}
        subtitleStyle={{ fontSize: 20 }}
      />
      <main className={`wt-container${eventId ? "" : " selector-mode"}`}>
        {eventId ? (
          <>
            <div className="wt-top-actions">
              <div className="wt-event-mode-nav">
                {EVENT_REALTIME_BUTTONS.map((button) => (
                  <button
                    key={button.key}
                    type="button"
                    className={`wt-mode-btn${button.key === "waiting" ? " active" : ""}`}
                    onClick={() => navigate(`${button.path}/${eventId}`)}
                  >
                    {button.label}
                  </button>
                ))}
              </div>
            </div>
            <WaitingContent eventId={eventId} />
            <div style={{ display: "flex", justifyContent: "center", marginTop: 32 }}>
              <button className="wt-back-btn" onClick={() => navigate("/realtime/waitingstatus")}>
                <ArrowLeft size={15} />
                목록으로
              </button>
            </div>
          </>
        ) : (
          <RealtimeEventSelector
            onSelectEvent={handleSelectEvent}
            pageTitle="대기 현황"
            metricType="waiting"
          />
        )}
      </main>
    </div>
  );
}
