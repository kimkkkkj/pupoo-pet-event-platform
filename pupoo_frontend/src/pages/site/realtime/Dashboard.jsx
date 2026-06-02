﻿import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import PageHeader from "../components/PageHeader";
import PageLoading from "../components/PageLoading";
import RealtimeEventSelector from "./RealtimeEventSelector";
import {
  TrendingUp,
  Radio,
  Activity,
  BarChart2,
  RefreshCw,
  MapPin,
  CalendarDays,
  ArrowLeft,
} from "lucide-react";
import {
  useRefresh,
  useStaggerIn,
  useAutoRefresh,
  SHARED_ANIM_STYLES,
} from "./useRealtimeAnimations";
import { axiosInstance } from "../../../app/http/axiosInstance";
import { eventApi } from "../../../app/http/eventApi";
import { programApi } from "../../../app/http/programApi";
import { aiApi } from "../../../app/http/aiApi";
import { adminRealtimeApi } from "../../../app/http/adminRealtimeApi";
import {
  formatKoreanTime,
  normalizePrediction,
} from "./aiCongestionViewModel";

function useCountUp(target, duration = 800) {
  const [value, setValue] = useState(0);
  const prevTarget = useRef(0);
  const rafRef = useRef(null);

  useEffect(() => {
    const from = prevTarget.current;
    const to = typeof target === "number" && Number.isFinite(target) ? target : 0;
    prevTarget.current = to;
    if (from === to) { setValue(to); return; }

    const start = performance.now();
    const step = (now) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(from + (to - from) * eased));
      if (progress < 1) rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [target, duration]);

  return value;
}

const styles = `
  @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.min.css');

  .rt-root {
    box-sizing: border-box;
    font-family: 'Pretendard Variable', 'Pretendard', -apple-system, sans-serif;
    background: #F8F9FC;
    min-height: 100vh;
    flex: 1;
  }
  .rt-root *, .rt-root *::before, .rt-root *::after { box-sizing: border-box; font-family: inherit; }
  .rt-container { max-width: 1400px; margin: 0 auto; padding: 20px 0 64px; }
  .rt-top-actions {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
    margin-bottom: 20px;
  }
  .rt-back-btn {
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
  .rt-top-actions .rt-back-btn { margin-bottom: 0; }
  .rt-event-mode-nav {
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
  .rt-mode-btn {
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
  .rt-mode-btn:last-child { border-right: none; }
  .rt-mode-btn.active {
    background: #111827;
    color: #fff;
    border-right-color: #111827;
    box-shadow: none;
  }
  .rt-mode-btn:hover {
    background: #f8fafc;
    color: #64748b;
  }
  .rt-mode-btn.active:hover {
    background: #0f172a;
    color: #fff;
  }
  .rt-back-btn:hover {
    background: #1f2937;
    border-color: #1f2937;
  }
  .rt-back-btn:active {
    transform: scale(0.97);
  }
  .rt-container.selector-mode { padding-top: 32px; }
  .rt-page-shell { max-width: 1400px; margin: 0 auto; }

  .rt-status-chip {
    display: inline-flex; align-items: center; gap: 8px;
    font-size: 14px; font-weight: 700;
    color: #ef4444;
  }
  .rt-status-chip.planned { color: #90C450; }
  .rt-status-chip.ended { color: #9ca3af; }
  .rt-status-chip.cancelled { color: #b91c1c; }
  .rt-status-dot {
    width: 10px; height: 10px; border-radius: 50%; background: currentColor;
    box-shadow: 0 0 8px currentColor;
    animation: rt-pulse 1.6s ease-in-out infinite;
  }
  .rt-status-chip.ended .rt-status-dot,
  .rt-status-chip.cancelled .rt-status-dot { animation: none; box-shadow: none; }
  @keyframes rt-pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.5; transform: scale(0.75); }
  }

  .rt-live-header {
    display: flex; align-items: flex-start; justify-content: space-between;
    margin-bottom: 16px; gap: 16px;
  }
  .rt-live-header-left {
    display: flex;
    flex-direction: column;
    gap: 8px;
    min-width: 0;
  }
  .rt-live-meta {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
    font-size: 15px;
    color: #6b7280;
  }
  .rt-event-name {
    font-size: 30px;
    font-weight: 900;
    color: #111827;
    line-height: 1.05;
    letter-spacing: -0.03em;
  }
  .rt-event-meta {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
    font-size: 15px;
    color: #6b7280;
    margin-top: 4px;
  }
  .rt-event-meta-item {
    display: inline-flex;
    align-items: center;
    gap: 5px;
  }
  .rt-live-header-right {
    display: flex; align-items: center; gap: 12px;
    flex-shrink: 0;
  }
  .rt-timestamp {
    font-size: 14px; color: #9ca3af; font-weight: 500;
    font-variant-numeric: tabular-nums;
  }
  .rt-refresh-btn {
    width: 34px; height: 34px; border-radius: 8px;
    border: 1px solid #e2e8f0; background: #fff;
    display: flex; align-items: center; justify-content: center;
    cursor: pointer; color: #6b7280;
    transition: all 0.15s;
  }
  .rt-refresh-btn:hover { border-color: #90C450; color: #90C450; background: #f5f8ff; }
  .rt-refresh-btn:active { transform: scale(0.93); }

  .rt-hero {
    border: 1px solid #e2e8f0;
    border-radius: 16px;
    padding: 32px 36px;
    margin-bottom: 16px;
    background: linear-gradient(135deg, #fff 0%, #fafbff 100%);
    color: #111827;
    position: relative;
    overflow: hidden;
    box-shadow: 0 2px 12px rgba(0,0,0,0.04);
  }
  .rt-hero::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: linear-gradient(90deg, #90C450, #7c3aed, #90C450);
    background-size: 200% 100%;
    animation: rt-hero-bar 3s ease infinite;
  }
  @keyframes rt-hero-bar {
    0%, 100% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
  }
  .rt-hero-top {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 24px;
  }
  .rt-hero-main {
    min-width: 0;
    flex: 1 1 auto;
  }
  .rt-hero-title-row {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .rt-hero-title {
    margin: 0;
    font-size: 26px;
    line-height: 1.2;
    letter-spacing: -0.02em;
    font-weight: 800;
    color: #111827;
  }
  .rt-hero-meta {
    margin-top: 10px;
    display: flex;
    flex-wrap: wrap;
    gap: 14px;
    font-size: 14px;
    color: #9ca3af;
  }
  .rt-hero-meta-item {
    display: inline-flex;
    align-items: center;
    gap: 5px;
  }
  .rt-hero-divider {
    margin: 16px 0;
    border: none;
    border-top: 1px solid #f0f0f0;
  }
  .rt-hero-visitor {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 15px;
    color: #6b7280;
    font-weight: 500;
  }
  .rt-hero-footer {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 10px;
    margin-top: 20px;
    padding-top: 14px;
    border-top: 1px solid #f0f0f0;
  }
  .rt-hero-visitor-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #22c55e;
    box-shadow: 0 0 6px #22c55e;
    animation: rt-pulse 1.6s ease-in-out infinite;
    flex-shrink: 0;
  }
  .rt-hero-visitor strong {
    font-weight: 800;
    color: #111827;
    font-size: 16px;
  }
  .rt-hero-visitor-sep {
    color: #d1d5db;
    font-size: 12px;
  }
  .rt-hero-kpi-grid {
    margin-top: 0;
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 10px;
    width: min(640px, 100%);
    margin-left: auto;
    flex-shrink: 0;
  }
  .rt-hero-kpi {
    border: 1px solid #ebebeb;
    border-radius: 14px;
    background: #fff;
    padding: 20px 22px;
  }
  .rt-hero-kpi-label {
    font-size: 13px;
    color: #9ca3af;
    font-weight: 600;
    margin-bottom: 10px;
  }
  .rt-hero-kpi-row {
    display: flex;
    align-items: baseline;
    gap: 4px;
  }
  .rt-hero-kpi-value {
    font-size: 36px;
    line-height: 1;
    font-weight: 800;
    color: #111827;
    letter-spacing: -0.02em;
  }
  .rt-hero-kpi-unit {
    font-size: 16px;
    color: #9ca3af;
    font-weight: 700;
  }
  .rt-hero-kpi-bar {
    margin-top: 12px;
    height: 8px;
    border-radius: 99px;
    background: #f0f0f0;
    overflow: hidden;
  }
  .rt-hero-kpi-bar-fill {
    height: 100%;
    border-radius: 99px;
    transition: width 0.6s ease;
  }
  .rt-hero-kpi-sub {
    margin-top: 10px;
    font-size: 12px;
    color: #6b7280;
    line-height: 1.5;
    font-weight: 500;
    word-break: keep-all;
  }

  .rt-user-stat-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
    margin-bottom: 8px;
  }
  .rt-user-stat {
    border: 1px solid #e6ebf2;
    border-radius: 12px;
    background: #fff;
    padding: 14px 14px 13px;
  }
  .rt-user-stat-label {
    font-size: 14px;
    color: #6b7280;
    font-weight: 600;
    margin-bottom: 7px;
  }
  .rt-user-stat-value {
    font-size: 28px;
    line-height: 1;
    font-weight: 900;
    color: #111827;
    letter-spacing: -0.02em;
  }
  .rt-user-stat-unit {
    margin-left: 3px;
    font-size: 16px;
    color: #4b5563;
    font-weight: 700;
  }
  .rt-user-stat-sub {
    margin-top: 6px;
    font-size: 14px;
    color: #6b7280;
    line-height: 1.3;
  }
  .rt-user-stat-badge {
    margin-top: 8px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 999px;
    padding: 3px 10px;
    font-size: 13px;
    font-weight: 800;
    border: 1px solid #e5e7eb;
  }
  .rt-section-lead {
    font-size: 14px;
    color: #6b7280;
    margin-bottom: 12px;
    line-height: 1.4;
  }
  .rt-visitor-note {
    margin-top: 8px;
    font-size: 14px;
    color: #4b5563;
    line-height: 1.45;
    font-weight: 600;
  }
  .rt-pet-hints {
    margin-top: 10px;
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .rt-chart-guide {
    margin-top: 8px;
    color: #6b7280;
    font-size: 14px;
    font-weight: 500;
    line-height: 1.45;
  }

  .rt-prediction-section {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .rt-prediction-meta-strip {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    font-size: 12px;
    color: #9ca3af;
    font-weight: 500;
  }
  .rt-prediction-meta-strip--header {
    justify-content: flex-end;
  }
  .rt-prediction-meta-pill {
    display: inline-flex;
    align-items: center;
  }
  .rt-prediction-meta-pill + .rt-prediction-meta-pill::before {
    content: "·";
    margin-right: 6px;
  }
  .rt-prediction-kpi-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 10px;
  }
  .rt-prediction-kpi {
    border: 1px solid #ebebeb;
    border-radius: 16px;
    background: #fff;
    padding: 22px 24px;
    position: relative;
    overflow: hidden;
    transition: box-shadow 0.2s, transform 0.2s;
  }
  .rt-prediction-kpi:hover {
    box-shadow: 0 4px 20px rgba(0,0,0,0.06);
    transform: translateY(-1px);
  }
  .rt-prediction-kpi-accent {
    display: none;
  }
  .rt-prediction-kpi-label {
    font-size: 13px;
    color: #9ca3af;
    font-weight: 600;
    margin-bottom: 10px;
  }
  .rt-prediction-kpi-value {
    font-size: 36px;
    line-height: 1;
    color: #111827;
    font-weight: 800;
    letter-spacing: -0.02em;
  }
  .rt-prediction-kpi-unit {
    margin-left: 3px;
    font-size: 16px;
    color: #9ca3af;
    font-weight: 700;
  }
  .rt-prediction-kpi-bar {
    margin-top: 14px;
    height: 10px;
    border-radius: 99px;
    background: #f0f0f0;
    overflow: hidden;
    position: relative;
  }
  .rt-prediction-kpi-bar-fill {
    height: 100%;
    border-radius: 99px;
    transition: width 0.6s ease;
    background-image: linear-gradient(90deg, currentColor, currentColor);
  }
  .rt-prediction-kpi-desc {
    margin-top: 10px;
    font-size: 12px;
    color: #6b7280;
    line-height: 1.5;
    font-weight: 500;
    word-break: keep-all;
  }
  .rt-prediction-bottom {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 12px;
    align-items: stretch;
  }
  .rt-prediction-chart-card {
    grid-column: span 2;
    border: 1px solid #e8ecf2;
    border-radius: 16px;
    background: #fff;
    padding: 22px;
    box-shadow: 0 1px 4px rgba(0,0,0,0.03);
  }
  .rt-prediction-chart-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 8px;
    margin-bottom: 10px;
  }
  .rt-prediction-chart-title {
    font-size: 15px;
    font-weight: 800;
    color: #111827;
  }
  .rt-prediction-chart-sub {
    font-size: 13px;
    color: #6b7280;
    font-weight: 600;
  }
  .rt-prediction-chart {
    min-width: 0;
  }
  .rt-prediction-near-card {
    grid-column: span 1;
    border: 1px solid #e8ecf2;
    border-radius: 16px;
    background: #fff;
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    height: 472px;
    max-height: 472px;
    min-height: 0;
    overflow: hidden;
    box-shadow: 0 1px 4px rgba(0,0,0,0.03);
  }
  .rt-prediction-near-title {
    font-size: 15px;
    color: #111827;
    font-weight: 800;
  }
  .rt-prediction-near-sub {
    font-size: 12px;
    color: #9ca3af;
    font-weight: 500;
    line-height: 1.35;
  }
  .rt-prediction-empty {
    min-height: 74px;
    border: 1px dashed #dbe2ea;
    border-radius: 9px;
    background: #fafcff;
    color: #6b7280;
    font-size: 14px;
    line-height: 1.4;
    padding: 10px;
    display: flex;
    align-items: center;
  }
  .rt-prediction-chip-list {
    margin-top: 0;
    gap: 6px;
  }
  .rt-chip-list {
    margin-top: 12px;
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }
  .rt-chip {
    border-radius: 999px;
    border: 1px solid #dbe2ea;
    background: #fff;
    color: #374151;
    padding: 4px 10px;
    font-size: 13px;
    font-weight: 700;
  }
  .rt-near-timeline {
    display: flex;
    flex-direction: column;
    gap: 8px;
    flex: 1;
    min-height: 0;
    padding-right: 4px;
    overflow-y: auto;
    scrollbar-gutter: stable;
  }
  .rt-near-timeline .rt-timeline-item {
    min-height: 64px;
    padding: 12px 16px;
  }
  .rt-near-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 14px;
    border-bottom: 1px solid #f5f5f5;
    transition: background 0.15s;
  }
  .rt-near-item:last-child {
    border-bottom: none;
  }
  .rt-near-item:hover {
    background: #f8faff;
  }
  .rt-near-time {
    font-size: 13px;
    font-weight: 700;
    color: #374151;
    min-width: 52px;
    font-variant-numeric: tabular-nums;
  }
  .rt-near-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
  }
  .rt-near-status {
    font-size: 13px;
    font-weight: 700;
    min-width: 52px;
  }
  .rt-near-detail {
    font-size: 13px;
    font-weight: 500;
    color: #9ca3af;
    min-width: 64px;
    white-space: nowrap;
  }
  .rt-near-bar-wrap {
    flex: 1;
    display: flex;
    align-items: center;
  }
  .rt-near-bar-track {
    flex: 1;
    height: 6px;
    background: #f0f0f0;
    border-radius: 99px;
    overflow: hidden;
  }
  .rt-near-bar-fill {
    height: 100%;
    border-radius: 99px;
    transition: width 0.4s ease;
  }
  .rt-near-label {
    font-size: 12px;
    font-weight: 600;
    padding: 2px 8px;
    border-radius: 6px;
    min-width: 48px;
    text-align: center;
  }
  .rt-heat-legend {
    margin-top: 16px;
    padding-top: 14px;
    border-top: 1px solid #f0f0f0;
    display: flex;
    gap: 16px;
    align-items: center;
    flex-wrap: wrap;
  }
  .rt-heat-legend-item {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 5px 12px;
    border-radius: 8px;
    background: #f8fafc;
    border: 1px solid #e8ecf2;
  }
  .rt-heat-legend-text {
    font-size: 13px;
    color: #374151;
    font-weight: 600;
  }
  .rt-heat-legend-swatch {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    border: none;
  }
  .rt-heat-legend-swatch.actual {
    background: #90C450;
    box-shadow: 0 0 4px rgba(37,99,235,0.4);
  }
  .rt-heat-legend-swatch.predicted {
    background: #8b5cf6;
    box-shadow: 0 0 4px rgba(139,92,246,0.4);
  }

  .rt-program-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
  }
  .rt-program-grid-top3 {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 12px;
  }
  .rt-program-card {
    border: 1px solid #e8ecf2;
    border-radius: 16px;
    background: #fff;
    padding: 22px 24px;
    transition: box-shadow 0.2s, transform 0.2s;
    position: relative;
    overflow: hidden;
  }
  .rt-program-accent {
    display: none;
  }
  .rt-program-card:hover {
    box-shadow: 0 4px 20px rgba(0,0,0,0.06);
    transform: translateY(-1px);
  }
  .rt-program-card-head {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 8px;
    margin-bottom: 16px;
  }
  .rt-program-name {
    margin: 0;
    font-size: 16px;
    line-height: 1.3;
    color: #111827;
    font-weight: 800;
  }
  .rt-program-time {
    font-size: 12px;
    color: #9ca3af;
    font-weight: 600;
    white-space: nowrap;
    background: #f5f5f5;
    padding: 3px 8px;
    border-radius: 6px;
  }
  .rt-program-stats {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0;
    margin-bottom: 16px;
    text-align: center;
  }
  .rt-program-stat-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    padding: 10px 0;
  }
  .rt-program-stat-item:not(:last-child) {
    border-right: 1px solid #f0f0f0;
  }
  .rt-program-stat-value {
    font-size: 26px;
    font-weight: 900;
    color: #111827;
    letter-spacing: -0.02em;
    line-height: 1;
  }
  .rt-program-stat-label {
    font-size: 14px;
    color: #9ca3af;
    font-weight: 500;
    padding-top: 2px;
  }
  .rt-program-bar {
    height: 6px;
    border-radius: 99px;
    background: #f0f0f0;
    overflow: hidden;
  }
  .rt-program-bar-fill {
    height: 100%;
    border-radius: 99px;
    transition: width 0.6s ease;
  }
  .rt-program-guide {
    margin-top: 12px;
    font-size: 13px;
    color: #6b7280;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .rt-program-guide::before {
    content: "\\2713";
    font-size: 11px;
    color: #22c55e;
    font-weight: 900;
  }

  .rt-stat-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 20px; }
  .rt-stat-card {
    background: #fff; border: 1px solid #ebebeb; border-radius: 14px;
    padding: 22px 22px 20px; position: relative; overflow: hidden;
    transition: box-shadow 0.2s;
  }
  .rt-stat-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.05); }
  .rt-stat-icon {
    width: 40px; height: 40px; border-radius: 10px;
    display: flex; align-items: center; justify-content: center; margin-bottom: 14px;
  }
  .rt-stat-label { font-size: 14.5px; color: #6b7280; font-weight: 500; margin-bottom: 6px; }
  .rt-stat-value { font-size: 28px; font-weight: 800; color: #111827; line-height: 1; }
  .rt-stat-suffix { font-size: 20px; margin-left: 2px; }
  .rt-stat-sub { font-size: 14px; color: #9ca3af; margin-top: 6px; display: flex; align-items: center; gap: 4px; }
  .rt-stat-up { color: #90C450; }
  .rt-stat-down { color: #ef4444; }
  .rt-stat-bg {
    position: absolute; right: -10px; bottom: -10px;
    width: 70px; height: 70px; border-radius: 50%; opacity: 0.06;
  }

  .rt-card {
    background: #fff; border: 1px solid #ebebeb; border-radius: 14px;
    padding: 28px 32px 28px 36px; margin-bottom: 14px;
    position: relative; overflow: hidden;
  }
  .rt-card-accent {
    display: none;
  }
  .rt-card-header {
    display: flex; align-items: center; justify-content: space-between;
    margin-bottom: 18px; padding-bottom: 16px; border-bottom: 1px solid #f0f0f0;
  }
  .rt-card-title {
    font-size: 17px; font-weight: 700; color: #111827;
    display: flex; align-items: center; gap: 8px; margin: 0;
  }
  .rt-card-title-icon {
    width: 24px; height: 24px; border-radius: 6px;
    background: transparent; display: flex; align-items: center; justify-content: center;
  }
  .rt-card-tag { font-size: 13px; font-weight: 500; color: #9ca3af; background: #f9fafb; padding: 3px 10px; border-radius: 100px; }
  .rt-card-controls {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }
  .rt-date-input {
    height: 30px;
    border: none;
    border-radius: 0;
    padding: 0 18px;
    font-size: 12px;
    font-weight: 600;
    color: #818181;
    background: transparent;
    outline: none;
    cursor: pointer;
    font-family: inherit;
  }
  .rt-date-input::-webkit-calendar-picker-indicator {
    cursor: pointer;
    opacity: 0.5;
  }
  .rt-date-input:hover {
    background: #f8fafc;
  }

  /* ── 종료 이벤트: 카드 & 프로그램 카드 회색 처리 ── */
  .rt-ended .rt-card {
    background: #e5e7eb;
    border-color: #d1d5db;
  }
  .rt-ended .rt-card .rt-card-header {
    border-bottom-color: #d1d5db;
  }
  .rt-ended .rt-card .rt-card-tag {
    background: #d1d5db;
    color: #6b7280;
  }
  .rt-ended .rt-hero {
    background: linear-gradient(135deg, #e5e7eb 0%, #dfe1e5 100%);
    border-color: #d1d5db;
  }
  .rt-ended .rt-hero::before {
    background: #9ca3af;
    animation: none;
  }
  .rt-ended .rt-hero-kpi {
    background: #eef0f2;
    border-color: #d1d5db;
  }
  .rt-ended .rt-hero-visitor-dot {
    background: #9ca3af;
    box-shadow: none;
    animation: none;
  }
  .rt-ended .rt-prediction-kpi {
    background: #eef0f2;
    border-color: #d1d5db;
  }
  .rt-ended .rt-prediction-chart-card {
    background: #eef0f2;
    border-color: #d1d5db;
  }
  .rt-ended .rt-prediction-near-card {
    background: #eef0f2;
    border-color: #d1d5db;
  }
  .rt-ended .rt-timeline-item {
    background: #eef0f2;
    border-color: #d1d5db;
  }
  .rt-program-card--ended {
    background: #eaecef !important;
    border-color: #d1d5db !important;
  }
  .rt-program-card--ended .rt-program-guide::before {
    color: #9ca3af !important;
  }
  .rt-ended .rt-hourly-line-actual {
    stroke: #9ca3af;
    filter: none;
  }
  .rt-ended .rt-hourly-line-predicted {
    stroke: #b0b5bc;
  }
  .rt-ended .rt-hourly-now-line {
    stroke: #9ca3af;
  }
  .rt-ended .rt-heat-legend-swatch.actual {
    background: #9ca3af;
    box-shadow: none;
  }
  .rt-ended .rt-heat-legend-swatch.predicted {
    background: #b0b5bc;
    box-shadow: none;
  }
  .rt-ended .rt-prediction-kpi-value {
    color: #9ca3af;
  }
  .rt-ended .rt-hero-kpi-value {
    color: #9ca3af;
  }
  .rt-ended .rt-hero-kpi-unit {
    color: #b0b5bc;
  }

  .rt-two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }

  .rt-progress-wrap { margin-bottom: 14px; }
  .rt-progress-wrap:last-child { margin-bottom: 0; }
  .rt-progress-label { display: flex; justify-content: space-between; font-size: 15px; margin-bottom: 7px; gap: 12px; }
  .rt-progress-label-name { font-weight: 600; color: #374151; }
  .rt-progress-label-val { color: #6b7280; text-align: right; }
  .rt-progress-track { height: 8px; background: #f1f3f5; border-radius: 100px; overflow: hidden; }
  .rt-progress-fill { height: 100%; border-radius: 100px; }

  .rt-opinion-list { display: flex; flex-direction: column; gap: 8px; }
  .rt-opinion-item { display: flex; align-items: center; gap: 12px; padding: 13px 16px; border-radius: 10px; border: 1px solid #eceef3; }
  .rt-opinion-bar-wrap { flex: 1; }
  .rt-opinion-label { font-size: 15px; font-weight: 600; color: #374151; margin-bottom: 5px; }
  .rt-opinion-track { height: 6px; background: #f1f3f6; border-radius: 100px; overflow: hidden; }
  .rt-opinion-fill { height: 100%; border-radius: 100px; }
  .rt-opinion-val { font-size: 16px; font-weight: 800; color: #1a1d24; min-width: 36px; text-align: right; }

  .rt-timeline { display: flex; flex-direction: column; gap: 8px; }
  .rt-timeline-item {
    display: flex; align-items: center; gap: 14px;
    padding: 14px 18px;
    background: #f9fafb;
    border-radius: 12px;
    border: 1px solid #f0f0f0;
  }
  .rt-timeline-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
  .rt-timeline-time { font-size: 13px; color: #9ca3af; font-weight: 600; min-width: 48px; flex-shrink: 0; }
  .rt-timeline-text { font-size: 14px; color: #374151; line-height: 1.45; font-weight: 500; }

  .rt-hourly-chart {
    display: flex;
    flex-direction: column;
    gap: 0;
  }
  .rt-hourly-canvas {
    position: relative;
    height: 280px;
    background: linear-gradient(180deg, #fafbff 0%, #f4f7fb 100%);
    border: 1px solid #e8ecf2;
    border-radius: 14px;
    overflow: hidden;
    padding: 20px 20px 30px 48px;
  }
  .rt-hourly-canvas svg {
    width: 100%;
    height: 100%;
    display: block;
    overflow: visible;
  }
  .rt-hourly-grid-line {
    stroke: #e2e8f0;
    stroke-width: 1;
    opacity: 0.5;
  }
  .rt-hourly-grid-line.dashed {
    stroke-dasharray: 4 4;
    opacity: 0.3;
  }
  .rt-hourly-area-actual {
    fill: url(#areaGradActual);
  }
  .rt-hourly-area-predicted {
    fill: url(#areaGradPredicted);
  }
  .rt-hourly-line-actual {
    stroke: #90C450;
    stroke-width: 2.5;
    fill: none;
    stroke-linecap: round;
    stroke-linejoin: round;
    filter: drop-shadow(0 1px 3px rgba(37,99,235,0.3));
  }
  .rt-hourly-line-predicted {
    stroke: #8b5cf6;
    stroke-width: 2.5;
    fill: none;
    stroke-linecap: round;
    stroke-linejoin: round;
    stroke-dasharray: 6 4;
  }
  .rt-hourly-now-line {
    stroke: #ef4444;
    stroke-width: 1.5;
    stroke-dasharray: 4 3;
    opacity: 0.6;
  }
  .rt-hourly-now-badge {
    position: absolute;
    top: 8px;
    transform: translateX(-50%);
    background: #ef4444;
    color: #fff;
    font-size: 10px;
    font-weight: 600;
    padding: 2px 8px;
    border-radius: 4px;
    white-space: nowrap;
    z-index: 2;
  }
  .rt-hourly-y-label {
    position: absolute;
    left: 8px;
    transform: translateY(-50%);
    font-size: 11px;
    color: #94a3b8;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
  }
  .rt-hourly-x-labels {
    display: flex;
    justify-content: space-between;
    padding: 8px 20px 0 48px;
  }
  .rt-hourly-x-label {
    font-size: 11px;
    color: #94a3b8;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
  }
  .rt-hourly-tooltip {
    position: absolute;
    pointer-events: none;
    z-index: 5;
    background: #1e293b;
    color: #fff;
    font-size: 12px;
    font-weight: 700;
    padding: 5px 10px;
    border-radius: 6px;
    white-space: nowrap;
    transform: translate(-50%, -100%);
    margin-top: -8px;
  }
  .rt-calendar-control {
    display: inline-flex;
    align-items: center;
    gap: 0;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    overflow: hidden;
    background: #fff;
  }
  .rt-calendar-control-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 10px;
    height: 30px;
    background: #f8fafc;
    border-right: 1px solid #e2e8f0;
    color: #6b7280;
  }

  .rt-empty {
    text-align: center;
    padding: 40px 20px;
    color: #9ca3af;
    font-size: 15px;
  }
  .rt-empty-strong {
    display: block;
    font-size: 16px;
    font-weight: 700;
    color: #374151;
    margin-bottom: 4px;
  }
  .rt-error {
    color: #b91c1c;
    background: #fef2f2;
    border: 1px solid #fecaca;
    border-radius: 10px;
    padding: 14px 16px;
    margin-bottom: 16px;
    font-size: 15px;
    font-weight: 600;
  }

  @media (max-width: 900px) {
    .rt-live-header {
      flex-direction: column;
      align-items: flex-start;
    }
    .rt-hero-top {
      flex-direction: column;
      align-items: flex-start;
    }
    .rt-hero-kpi-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
      width: 100%;
      margin-left: 0;
      margin-top: 14px;
    }
    .rt-user-stat-grid {
      grid-template-columns: 1fr 1fr;
    }
    .rt-prediction-kpi-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
    .rt-prediction-bottom {
      grid-template-columns: 1fr;
    }
    .rt-prediction-near-card {
      height: auto;
      max-height: none;
    }
    .rt-near-timeline {
      max-height: 360px;
    }
    .rt-program-grid {
      grid-template-columns: 1fr;
    }
    .rt-stat-grid { grid-template-columns: repeat(2, 1fr); }
    .rt-two-col { grid-template-columns: 1fr; }
  }
  @media (max-width: 640px) {
    .rt-container { padding: 20px 16px 48px; }
    .rt-container.selector-mode { padding-top: 16px; }
    .rt-top-actions { align-items: stretch; }
    .rt-event-mode-nav { width: 100%; margin-left: 0; overflow-x: auto; }
    .rt-mode-btn { flex: 0 0 auto; min-width: 112px; }
    .rt-hero-kpi-grid {
      grid-template-columns: 1fr;
      width: 100%;
      margin-left: 0;
      margin-top: 14px;
    }
    .rt-hero-kpi-value {
      font-size: 30px;
    }
    .rt-user-stat-grid {
      grid-template-columns: 1fr;
    }
    .rt-program-metric-grid {
      grid-template-columns: 1fr;
    }
    .rt-hero-title { font-size: 22px; }
    .rt-hourly-canvas { height: 220px; padding: 16px 12px 24px 36px; }
    .rt-hourly-y-label { left: 4px; font-size: 10px; }
    .rt-hourly-x-labels { padding: 6px 12px 0 36px; }
    .rt-stat-grid { grid-template-columns: repeat(2, 1fr); }
    .rt-card { padding: 22px 18px; }
    .rt-event-name { font-size: 24px; }
    .rt-prediction-kpi-grid {
      grid-template-columns: 1fr;
    }
    .rt-prediction-kpi-value {
      font-size: 30px;
    }
    .rt-calendar-control { width: 100%; }
    .rt-date-input { flex: 1; min-width: 0; }
  }
`;

export const SERVICE_CATEGORIES = [
  { label: "전체 행사", path: "/realtime/dashboard", countKey: "all" },
  { label: "진행중 행사", path: "/realtime/dashboard?status=live", countKey: "live" },
  { label: "예정 행사", path: "/realtime/dashboard?status=upcoming", countKey: "upcoming" },
  { label: "종료 행사", path: "/realtime/dashboard?status=ended", countKey: "ended" },
];

export const SUBTITLE_MAP = {
  "/realtime/dashboard": "행사 전체 현황을 실시간으로 모니터링합니다",
  "/realtime/waitingstatus": "대기열 현황을 실시간으로 확인합니다",
  "/realtime/checkinstatus": "참가자 체크인 현황을 실시간으로 확인합니다",
  "/realtime/votestatus": "진행 중인 투표의 실시간 결과를 확인합니다",
};
const EVENT_REALTIME_BUTTONS = [
  { key: "dashboard", label: "통합현황", path: "/realtime/dashboard", tone: "dashboard" },
  { key: "waiting", label: "대기현황", path: "/realtime/waitingstatus", tone: "waiting" },
  { key: "checkin", label: "체크인 현황", path: "/realtime/checkinstatus", tone: "checkin" },
  { key: "vote", label: "투표현황", path: "/realtime/votestatus", tone: "vote" },
];

const FALLBACK_HOURS = Array.from({ length: 12 }, (_, index) => 10 + index);
const FULL_DAY_HOURS = Array.from({ length: 24 }, (_, index) => index);
const AI_REFRESH_INTERVAL_MS = 5 * 60 * 1000;

const STATUS_BADGE = {
  ONGOING: { className: "", label: "LIVE", showDot: true },
  PLANNED: { className: "planned", label: "예정", showDot: false },
  ENDED: { className: "ended", label: "종료", showDot: false },
  CANCELLED: { className: "cancelled", label: "취소", showDot: false },
};

const unwrapData = (response, fallback) => response?.data?.data ?? response?.data ?? fallback;

const toArray = (payload) =>
  Array.isArray(payload?.content)
    ? payload.content
    : Array.isArray(payload)
      ? payload
      : [];

const toValidDate = (value) => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const toHour = (value) => {
  const date = toValidDate(value);
  return date ? date.getHours() : null;
};

const normalizeHour = (value) => ((Number(value) % 24) + 24) % 24;

const toDateKey = (value) => {
  const date = toValidDate(value);
  if (!date) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const alignUpToFiveMinutes = (value) => {
  const date = toValidDate(value);
  if (!date) return null;
  const aligned = new Date(date);
  aligned.setSeconds(0, 0);
  const remainder = aligned.getMinutes() % 5;
  if (remainder !== 0) {
    aligned.setMinutes(aligned.getMinutes() + (5 - remainder));
  }
  return aligned;
};

const getMinPredictionStart = (offsetMinutes = 5) => {
  const base = new Date();
  base.setMinutes(base.getMinutes() + offsetMinutes);
  return alignUpToFiveMinutes(base);
};

const formatDateOptionLabel = (dateKey) => {
  if (!dateKey) return "";
  const date = toValidDate(`${dateKey}T00:00:00`);
  if (!date) return dateKey;
  return date.toLocaleDateString("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  });
};

const buildDateKeysFromRange = (startAt, endAt, maxDays = 60) => {
  const startDate = toValidDate(startAt);
  const endDate = toValidDate(endAt);
  if (!startDate || !endDate || endDate < startDate) return [];

  const cursor = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  const limit = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
  const keys = [];

  while (cursor <= limit && keys.length < maxDays) {
    keys.push(toDateKey(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  return keys;
};

const isDateKeyInRange = (dateKey, startAt, endAt) => {
  if (!dateKey) return false;
  const clipped = clipRangeByDate(startAt, endAt, dateKey);
  return Boolean(clipped.startAt && clipped.endAt);
};

const buildOperationRangeByDate = (startAt, endAt, dateKey) => {
  if (!dateKey) {
    return {
      startAt: toValidDate(startAt),
      endAt: toValidDate(endAt),
    };
  }

  const clipped = clipRangeByDate(startAt, endAt, dateKey);
  if (!clipped.startAt || !clipped.endAt) return { startAt: null, endAt: null };

  const eventStart = toValidDate(startAt);
  const eventEnd = toValidDate(endAt);
  const baseDate = toValidDate(`${dateKey}T00:00:00`);
  if (!eventStart || !eventEnd || !baseDate) {
    return clipped;
  }

  const rangeStart = new Date(baseDate);
  rangeStart.setHours(eventStart.getHours(), 0, 0, 0);

  const rangeEnd = new Date(baseDate);
  rangeEnd.setHours(eventEnd.getHours(), 59, 59, 999);

  if (rangeEnd < rangeStart) {
    return clipped;
  }

  return {
    startAt: rangeStart,
    endAt: rangeEnd,
  };
};

const clipRangeByDate = (startAt, endAt, dateKey) => {
  const startDate = toValidDate(startAt);
  const endDate = toValidDate(endAt);
  const baseDate = toValidDate(`${dateKey}T00:00:00`);
  if (!startDate || !endDate || !baseDate || endDate < startDate) {
    return { startAt: null, endAt: null };
  }

  const dayStart = new Date(baseDate);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(baseDate);
  dayEnd.setHours(23, 59, 59, 999);

  if (endDate < dayStart || startDate > dayEnd) {
    return { startAt: null, endAt: null };
  }

  const clippedStart = startDate > dayStart ? startDate : dayStart;
  const clippedEnd = endDate < dayEnd ? endDate : dayEnd;
  return { startAt: clippedStart, endAt: clippedEnd };
};

const buildHourRange = (startAt, endAt) => {
  const startDate = toValidDate(startAt);
  const endDate = toValidDate(endAt);
  if (!startDate || !endDate || endDate < startDate) return [];

  const sameDay = startDate.toDateString() === endDate.toDateString();
  const startHour = startDate.getHours();
  const endHour = sameDay ? endDate.getHours() : 23;
  if (endHour < startHour) {
    const forward = Array.from({ length: 24 - startHour }, (_, index) =>
      normalizeHour(startHour + index),
    );
    const wrapped = Array.from({ length: endHour + 1 }, (_, index) =>
      normalizeHour(index),
    );
    return uniqueNormalizedHours([...forward, ...wrapped]);
  }

  return Array.from({ length: endHour - startHour + 1 }, (_, index) =>
    normalizeHour(startHour + index),
  );
};

const uniqueNormalizedHours = (hours) =>
  Array.from(new Set(hours.map((hour) => normalizeHour(hour)).filter(Number.isFinite))).sort(
    (a, b) => a - b,
  );

const buildAroundHourAxis = (centerHour, radius = 6) =>
  uniqueNormalizedHours(
    Array.from({ length: radius * 2 + 1 }, (_, index) =>
      normalizeHour(centerHour - radius + index),
    ),
  );

const ensureDenseHourAxis = (baseHours, { isToday = false, minPoints = 8 } = {}) => {
  const normalized = uniqueNormalizedHours(Array.isArray(baseHours) ? baseHours : []);
  if (normalized.length >= minPoints) return normalized;
  if (isToday) return buildAroundHourAxis(new Date().getHours(), 6);
  return [...FULL_DAY_HOURS];
};

const buildHourAxis = ({ hourlyRows, timeline, startAt, endAt, preferRange = false }) => {
  if (preferRange) {
    const range = buildHourRange(startAt, endAt);
    if (range.length > 0) return range;
  }

  const rowHours = uniqueNormalizedHours(
    toArray(hourlyRows)
      .map((row) => Number(row?.hour ?? row?.h))
      .filter(Number.isFinite),
  );
  if (rowHours.length > 0) return rowHours;

  const timelineHours = uniqueNormalizedHours(
    Array.isArray(timeline)
      ? timeline.map((point) => toHour(point?.time)).filter(Number.isFinite)
      : [],
  );
  if (timelineHours.length > 0) return timelineHours;

  const range = buildHourRange(startAt, endAt);
  if (range.length > 0) return range;

  return [...FALLBACK_HOURS];
};

const resolveAiDateKey = (eventDetail, preferredDateKey) => {
  const dateOptions = buildDateKeysFromRange(eventDetail?.startAt, eventDetail?.endAt);
  if (dateOptions.length === 0) {
    return "";
  }
  if (preferredDateKey && dateOptions.includes(preferredDateKey)) {
    return preferredDateKey;
  }

  const status = String(eventDetail?.status ?? "").toUpperCase();
  const todayKey = toDateKey(new Date());
  if (status === "ONGOING" && dateOptions.includes(todayKey)) {
    return todayKey;
  }
  if (status === "ENDED") {
    return dateOptions[dateOptions.length - 1];
  }
  return dateOptions[0];
};

const resolveAiRangeParams = (eventDetail, preferredDateKey) => {
  const selectedDateKey = resolveAiDateKey(eventDetail, preferredDateKey);
  if (selectedDateKey) {
    const operationRange = buildOperationRangeByDate(
      eventDetail?.startAt,
      eventDetail?.endAt,
      selectedDateKey,
    );
    if (operationRange.startAt && operationRange.endAt) {
      let from = operationRange.startAt;
      let to = operationRange.endAt;

      const status = String(eventDetail?.status ?? "").toUpperCase();
      const todayKey = toDateKey(new Date());
      if (status === "ONGOING" && selectedDateKey === todayKey) {
        const minPredictionStart = getMinPredictionStart(5);
        if (minPredictionStart && minPredictionStart > from) {
          from = minPredictionStart;
        }
      }
      if (from > to) {
        from = to;
      }

      return {
        from,
        to,
      };
    }
  }

  const fallbackStart = toValidDate(eventDetail?.startAt);
  const fallbackEnd = toValidDate(eventDetail?.endAt);
  if (fallbackStart && fallbackEnd && fallbackEnd >= fallbackStart) {
    return { from: fallbackStart, to: fallbackEnd };
  }
  return {};
};

const formatDateRange = (startAt, endAt) => {
  const start = startAt ? new Date(startAt) : null;
  const end = endAt ? new Date(endAt) : null;
  const validStart = start && !Number.isNaN(start.getTime()) ? start : null;
  const validEnd = end && !Number.isNaN(end.getTime()) ? end : null;

  if (!validStart && !validEnd) return "일정 정보 없음";
  if (validStart && validEnd) {
    return `${validStart.getFullYear()}.${String(validStart.getMonth() + 1).padStart(2, "0")}.${String(validStart.getDate()).padStart(2, "0")} ~ ${validEnd.getFullYear()}.${String(validEnd.getMonth() + 1).padStart(2, "0")}.${String(validEnd.getDate()).padStart(2, "0")}`;
  }
  const target = validStart || validEnd;
  return `${target.getFullYear()}.${String(target.getMonth() + 1).padStart(2, "0")}.${String(target.getDate()).padStart(2, "0")}`;
};

const formatTime = (value) => {
  if (!value) return "--:--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--:--";
  return date.toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
};

const formatTimestamp = (value) => {
  const date = toValidDate(value);
  if (!date) return "--:--:--";
  return date.toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
};

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const congestionLevelToPercent = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return 0;
  return clamp(Math.round(numeric * 20), 0, 100);
};

const getHeatColor = (pct) => {
  if (pct === 0) return "#f1f3f5";
  if (pct < 30) return "#CCF0E4";
  if (pct < 60) return "#5CCDB2";
  if (pct < 85) return "#3DBFA0";
  return "#028A6C";
};

const getHeatTextColor = (pct) => {
  if (pct === 0) return "#9ca3af";
  if (pct < 60) return "#d97706";
  return "#f59e0b";
};

const getActivityColor = (pct) => {
  if (pct >= 80) return "#ef4444";
  if (pct >= 50) return "#f59e0b";
  if (pct > 0) return "#90C450";
  return "#9ca3af";
};

const safeNumber = (value, fallback = 0) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
};

const toCongestionLevelOrNull = (value) => {
  if (value === null || value === undefined || value === "") return null;
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
  if (numeric < 1 || numeric > 5) return null;
  return numeric;
};

const safePercent = (value) => clamp(Math.round(Number(value) || 0), 0, 100);

const resolveCongestionMeta = (value) => {
  const pct = safePercent(value);
  if (pct >= 80) {
    return {
      label: "매우 혼잡",
      color: "#b91c1c",
      bg: "#fef2f2",
      border: "#fecaca",
      sentence: "사람이 매우 몰린 상태입니다.",
    };
  }
  if (pct >= 60) {
    return {
      label: "혼잡",
      color: "#b45309",
      bg: "#fff7ed",
      border: "#fdba74",
      sentence: "대기 시간이 길어질 수 있습니다.",
    };
  }
  if (pct >= 30) {
    return {
      label: "보통",
      color: "#028A6C",
      bg: "#E6F7F2",
      border: "#CCF0E4",
      sentence: "약간의 대기가 발생할 수 있습니다.",
    };
  }
  return {
    label: "여유",
    color: "#047857",
    bg: "#ecfdf5",
    border: "#a7f3d0",
    sentence: "비교적 빠르게 이용할 수 있습니다.",
  };
};

const estimateWaitMinutes = (value) => {
  const pct = safePercent(value);
  if (pct < 25) return 0;
  if (pct < 40) return Math.max(1, Math.round((pct - 25) * 0.2 + 1));
  if (pct < 55) return Math.round(4 + (pct - 40) * 0.33);
  if (pct < 70) return Math.round(9 + (pct - 55) * 0.47);
  if (pct < 85) return Math.round(16 + (pct - 70) * 0.67);
  return Math.min(60, Math.round(26 + (pct - 85) * 0.95));
};

const deriveCongestionPercentFromWait = (waitCount, waitMin) => {
  const teams = Math.max(0, safeNumber(waitCount));
  const minutes = Math.max(0, safeNumber(waitMin));
  const minuteScore = clamp(Math.round(minutes * 4), 0, 100);
  const countScore = clamp(Math.round(teams * 5), 0, 100);
  const score = Math.round(minuteScore * 0.7 + countScore * 0.3);
  return safePercent(score);
};

const deriveExpectedWaitMinutesFromQueue = (rows) => {
  const normalized = toArray(rows)
    .map((row) => ({
      waitMin: Math.max(0, safeNumber(row?.waitMin)),
      waitCount: Math.max(0, safeNumber(row?.waitCount)),
    }))
    .filter((row) => Number.isFinite(row.waitMin));

  if (normalized.length === 0) return null;

  const waitingRows = normalized.filter(
    (row) => row.waitCount > 0 || row.waitMin > 0,
  );
  if (waitingRows.length === 0) return 0;

  const totalTeams = waitingRows.reduce((sum, row) => sum + row.waitCount, 0);
  if (totalTeams > 0) {
    const weightedMinutes =
      waitingRows.reduce((sum, row) => sum + row.waitMin * row.waitCount, 0) /
      totalTeams;
    return Math.max(0, Math.round(weightedMinutes));
  }

  const avgMinutes =
    waitingRows.reduce((sum, row) => sum + row.waitMin, 0) / waitingRows.length;
  return Math.max(0, Math.round(avgMinutes));
};

const getProgramGuideText = (congestionPercent) => {
  const pct = safePercent(congestionPercent);
  if (pct <= 30) return "지금 참여하기 좋아요";
  if (pct <= 60) return "무난하게 이용 가능해요";
  if (pct <= 80) return "조금 혼잡해요";
  return "대기가 길 수 있어요";
};

const getCongestionSummaryText = (congestionPercent) => {
  const pct = safePercent(congestionPercent);
  if (pct <= 30) return "현재 여유로운 수준이에요";
  if (pct <= 60) return "현재 보통 수준이에요";
  if (pct <= 80) return "현재 혼잡한 편이에요";
  return "현재 매우 혼잡해요";
};

const getWaitSummaryText = (waitMinutes) => {
  const minutes = Math.max(0, safeNumber(waitMinutes));
  if (minutes <= 0) return "지금 바로 참여할 수 있어요";
  if (minutes <= 15) return "조금만 기다리면 참여할 수 있어요";
  if (minutes <= 30) return "여유를 두고 이동하면 좋아요";
  return "대기가 길 수 있어 잠시 후 방문을 추천해요";
};

const getVisitorMoodText = (visitors, isPlannedEvent) => {
  if (isPlannedEvent) return "오픈 전 준비가 진행 중이에요";
  const count = Math.max(0, safeNumber(visitors));
  if (count >= 800) return "현장 분위기가 한창이에요";
  if (count >= 400) return "많은 반려가족이 함께하고 있어요";
  if (count >= 150) return "차분하게 둘러보기 좋은 분위기예요";
  return "지금은 비교적 여유롭게 이동할 수 있어요";
};

const formatProgramTimeRange = (startAt, endAt) => {
  const start = formatTime(startAt);
  const end = formatTime(endAt);
  if (start === "--:--" && end === "--:--") return "운영 시간 정보 없음";
  if (start !== "--:--" && end !== "--:--") return `${start} ~ ${end}`;
  return start !== "--:--" ? `${start} 시작` : `${end} 종료`;
};

async function fetchAdminData(url, params, fallback) {
  try {
    const response = await axiosInstance.get(url, {
      params,
    });
    return {
      data: unwrapData(response, fallback),
      hasError: false,
    };
  } catch {
    return {
      data: fallback,
      hasError: true,
    };
  }
}

function HourlyTrendChart({ points, activeDateKey, isTodayForecast, isEnded = false }) {
  const containerRef = useRef(null);
  const [tooltip, setTooltip] = useState(null);
  const now = new Date();
  const currentHour = now.getHours();
  const todayKey = toDateKey(now);
  const isTodayDate = Boolean(isTodayForecast || activeDateKey === todayKey);
  const safePoints = Array.isArray(points) ? points : [];

  if (safePoints.length === 0) {
    return (
      <div className="rt-prediction-empty">
        시간대 혼잡도 데이터가 준비되면 그래프로 보여드릴게요.
      </div>
    );
  }

  const PAD_TOP = 10;
  const PAD_BOTTOM = 5;
  const VIEW_W = 1000;
  const VIEW_H = 300;
  const PLOT_TOP = PAD_TOP;
  const PLOT_BOTTOM = VIEW_H - PAD_BOTTOM;
  const PLOT_H = PLOT_BOTTOM - PLOT_TOP;

  const toX = (index) => safePoints.length <= 1 ? VIEW_W / 2 : (index / (safePoints.length - 1)) * VIEW_W;
  const toY = (value) => PLOT_TOP + ((100 - clamp(Number(value) || 0, 0, 100)) / 100) * PLOT_H;

  const chartPoints = safePoints.map((point, index) => {
    const x = toX(index);
    const hour = Number(point?.h);
    const parseVal = (raw) => {
      if (raw == null || raw === "") return null;
      const n = Number(raw);
      return Number.isFinite(n) ? clamp(Math.round(n), 0, 100) : null;
    };
    const actual = parseVal(point?.actual);
    const predicted = parseVal(point?.predicted);
    const fallbackValue = parseVal(point?.v);
    const value = fallbackValue ?? actual ?? predicted ?? 0;
    const isCurrent = isTodayDate && Number.isFinite(hour) && hour === currentHour;
    return { ...point, x, hour, value, actual, predicted, isCurrent };
  });

  const actualSeries = chartPoints
    .filter((p) => {
      if (!Number.isFinite(p.actual)) return false;
      if (!isTodayDate) return true;
      return Number.isFinite(p.hour) ? p.hour <= currentHour : false;
    })
    .map((p) => ({ ...p, y: toY(p.actual) }));

  let predictedSeries = chartPoints
    .filter((p) => {
      if (isTodayDate && Number.isFinite(p.hour) && p.hour < currentHour) return false;
      if (Number.isFinite(p.predicted)) return true;
      return Boolean(isTodayDate && p.isCurrent && Number.isFinite(p.actual));
    })
    .map((p) => ({ ...p, y: toY(Number.isFinite(p.predicted) ? p.predicted : p.actual) }));

  const lastActual = actualSeries.length > 0 ? actualSeries[actualSeries.length - 1] : null;
  if (isTodayDate && lastActual && predictedSeries.length > 0 && predictedSeries[0].x > lastActual.x) {
    predictedSeries = [{ ...lastActual }, ...predictedSeries];
  }

  const buildSmooth = (series) => {
    if (series.length === 0) return "";
    if (series.length === 1) return `M ${series[0].x} ${series[0].y}`;
    if (series.length === 2) return `M ${series[0].x} ${series[0].y} L ${series[1].x} ${series[1].y}`;
    let path = `M ${series[0].x} ${series[0].y}`;
    for (let i = 0; i < series.length - 1; i++) {
      const p0 = i > 0 ? series[i - 1] : series[i];
      const p1 = series[i];
      const p2 = series[i + 1];
      const p3 = i + 2 < series.length ? series[i + 2] : p2;
      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;
      path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
    }
    return path;
  };

  const buildArea = (series) => {
    if (series.length < 2) return "";
    const linePath = series.map((p) => `${p.x} ${p.y}`).join(" L ");
    return `M ${series[0].x} ${PLOT_BOTTOM} L ${linePath} L ${series[series.length - 1].x} ${PLOT_BOTTOM} Z`;
  };

  const yTicks = [0, 25, 50, 75, 100];
  const currentPoint = chartPoints.find((p) => p.isCurrent) || null;
  const nowX = (() => {
    if (!isTodayDate || chartPoints.length === 0) return null;
    if (currentPoint) return currentPoint.x;
    const sorted = chartPoints.filter((p) => Number.isFinite(p.hour)).sort((a, b) => a.hour - b.hour);
    if (sorted.length === 0) return null;
    const next = sorted.find((p) => p.hour >= currentHour);
    const prev = [...sorted].reverse().find((p) => p.hour <= currentHour);
    if (prev && next) {
      if (prev.hour === next.hour) return prev.x;
      return prev.x + (next.x - prev.x) * ((currentHour - prev.hour) / (next.hour - prev.hour));
    }
    return (prev || next)?.x ?? null;
  })();

  const nowLeftStyle = nowX != null ? { left: `calc(48px + (100% - 68px) * ${nowX / VIEW_W})` } : {};

  const handleDotHover = (point, e) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setTooltip({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      label: `${String(point.hour).padStart(2, "0")}:00`,
      value: point.actual ?? point.predicted ?? point.value,
    });
  };

  return (
    <div className="rt-hourly-chart">
      <div className="rt-hourly-canvas" ref={containerRef} onMouseLeave={() => setTooltip(null)}>
        {yTicks.map((tick) => (
          <span key={`yl-${tick}`} className="rt-hourly-y-label" style={{ top: `${20 + ((100 - tick) / 100) * (280 - 50)}px` }}>
            {tick}
          </span>
        ))}
        {nowX != null ? <span className="rt-hourly-now-badge" style={nowLeftStyle}>NOW</span> : null}
        <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} preserveAspectRatio="none">
          <defs>
            <linearGradient id="areaGradActual" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={isEnded ? "#9ca3af" : "#90C450"} stopOpacity="0.25" />
              <stop offset="100%" stopColor={isEnded ? "#9ca3af" : "#90C450"} stopOpacity="0.02" />
            </linearGradient>
            <linearGradient id="areaGradPredicted" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={isEnded ? "#b0b5bc" : "#8b5cf6"} stopOpacity="0.18" />
              <stop offset="100%" stopColor={isEnded ? "#b0b5bc" : "#8b5cf6"} stopOpacity="0.02" />
            </linearGradient>
          </defs>
          {yTicks.map((tick) => (
            <line key={`g-${tick}`} className={`rt-hourly-grid-line${tick === 0 || tick === 100 ? "" : " dashed"}`}
              x1="0" y1={toY(tick)} x2={VIEW_W} y2={toY(tick)} />
          ))}
          {buildArea(actualSeries) ? <path className="rt-hourly-area-actual" d={buildArea(actualSeries)} /> : null}
          {buildArea(predictedSeries) ? <path className="rt-hourly-area-predicted" d={buildArea(predictedSeries)} /> : null}
          {nowX != null ? <line className="rt-hourly-now-line" x1={nowX} y1={PLOT_TOP} x2={nowX} y2={PLOT_BOTTOM} /> : null}
          {buildSmooth(actualSeries) ? <path className="rt-hourly-line-actual" d={buildSmooth(actualSeries)} /> : null}
          {buildSmooth(predictedSeries) ? <path className="rt-hourly-line-predicted" d={buildSmooth(predictedSeries)} /> : null}
        </svg>
        {actualSeries.map((p, i) => (
          <div key={`ad-${i}`} onMouseEnter={(e) => handleDotHover(p, e)} onMouseLeave={() => setTooltip(null)}
            style={{
              position: "absolute",
              left: `calc(48px + (100% - 68px) * ${p.x / VIEW_W})`,
              top: `calc(20px + (100% - 50px) * ${p.y / VIEW_H})`,
              width: 10, height: 10, borderRadius: "50%",
              background: isEnded ? "#9ca3af" : "#90C450", border: "2px solid #fff",
              boxShadow: isEnded ? "0 1px 4px rgba(156,163,175,0.3)" : "0 1px 4px rgba(37,99,235,0.3)",
              transform: "translate(-50%, -50%)",
              cursor: "pointer", zIndex: 3,
              transition: "transform 0.15s",
            }}
          />
        ))}
        {predictedSeries.filter((p) => !actualSeries.some((a) => Math.abs(a.x - p.x) < 1)).map((p, i) => (
          <div key={`pd-${i}`} onMouseEnter={(e) => handleDotHover(p, e)} onMouseLeave={() => setTooltip(null)}
            style={{
              position: "absolute",
              left: `calc(48px + (100% - 68px) * ${p.x / VIEW_W})`,
              top: `calc(20px + (100% - 50px) * ${p.y / VIEW_H})`,
              width: 10, height: 10, borderRadius: "50%",
              background: isEnded ? "#b0b5bc" : "#8b5cf6", border: "2px solid #fff",
              boxShadow: isEnded ? "0 1px 4px rgba(176,181,188,0.3)" : "0 1px 4px rgba(139,92,246,0.3)",
              transform: "translate(-50%, -50%)",
              cursor: "pointer", zIndex: 3,
            }}
          />
        ))}
        {tooltip ? (
          <div className="rt-hourly-tooltip" style={{ left: tooltip.x, top: tooltip.y }}>
            {tooltip.label} · {tooltip.value}%
          </div>
        ) : null}
      </div>
      <div className="rt-hourly-x-labels">
        {chartPoints.filter((_, i) => {
          if (chartPoints.length <= 12) return true;
          return i === 0 || i === chartPoints.length - 1 || i % Math.ceil(chartPoints.length / 10) === 0;
        }).map((p, i) => (
          <span key={`xl-${i}`} className="rt-hourly-x-label">
            {Number.isFinite(p.hour) ? `${String(p.hour).padStart(2, "0")}:00` : "--:--"}
          </span>
        ))}
      </div>
    </div>
  );
}

function ProgramCrowdCard({ item, isEnded = false }) {
  const pct = item.congestionPercent;
  const accentColor = isEnded
    ? "#9ca3af"
    : pct >= 80 ? "#ef4444" : pct >= 60 ? "#f59e0b" : pct >= 30 ? "#3DBFA0" : "#22c55e";
  const endedText = isEnded ? { color: "#9ca3af" } : undefined;
  return (
    <div className={`rt-program-card${isEnded ? " rt-program-card--ended" : ""}`}>
      <div className="rt-program-card-head">
        <h4 className="rt-program-name" style={endedText}>{item.name}</h4>
        <div className="rt-program-time">{item.timeLabel}</div>
      </div>
      <div className="rt-program-stats">
        <div className="rt-program-stat-item">
          <span className="rt-program-stat-value" style={endedText}>{item.waitCount}</span>
          <span className="rt-program-stat-label">팀 대기</span>
        </div>
        <div className="rt-program-stat-item">
          <span className="rt-program-stat-value" style={endedText}>{item.waitMin}</span>
          <span className="rt-program-stat-label">분 예상</span>
        </div>
        <div className="rt-program-stat-item">
          <span className="rt-program-stat-value" style={{ color: accentColor }}>{pct}</span>
          <span className="rt-program-stat-label">혼잡도%</span>
        </div>
      </div>
      <div className="rt-program-bar">
        <div className="rt-program-bar-fill" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${accentColor}cc, ${accentColor})` }} />
      </div>
      <div className="rt-program-guide" style={endedText}>{item.guideText}</div>
    </div>
  );
}

function DashboardContent({ eventId }) {
  const numericEventId = Number(eventId);
  const { tick } = useAutoRefresh(15000);
  const [eventDetail, setEventDetail] = useState(null);
  const [performance, setPerformance] = useState({ approved: 0, checkin: 0 });
  const [hourlyRows, setHourlyRows] = useState([]);
  const [congestionRows, setCongestionRows] = useState([]);
  const [programRows, setProgramRows] = useState([]);
  const [eventPrediction, setEventPrediction] = useState(null);
  const [aiErrorMsg, setAiErrorMsg] = useState("");
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [lastLoadedAt, setLastLoadedAt] = useState(new Date());
  const aiPredictionRef = useRef(null);
  const aiLoadedAtRef = useRef(0);
  const aiRangeKeyRef = useRef("");
  const loadRequestIdRef = useRef(0);
  const lastAutoRefreshTickRef = useRef(tick);
  const inFlightRef = useRef(false);
  const [selectedForecastDate, setSelectedForecastDate] = useState("");

  const loadData = useCallback(async (options = {}) => {
    const { preserveLoading = false } = options;

    if (inFlightRef.current) return;
    inFlightRef.current = true;
    const requestId = loadRequestIdRef.current + 1;
    loadRequestIdRef.current = requestId;

    if (!numericEventId || Number.isNaN(numericEventId)) {
      setErrorMsg("잘못된 행사 경로입니다.");
      setEventPrediction(null);
      setProgramRows([]);
      aiPredictionRef.current = null;
      aiLoadedAtRef.current = 0;
      aiRangeKeyRef.current = "";
      setLoading(false);
      inFlightRef.current = false;
      return;
    }

    if (!preserveLoading) setLoading(true);

    try {
      const response = await adminRealtimeApi.getDashboardSnapshot(numericEventId);

      if (requestId !== loadRequestIdRef.current) return;

      const snapshot = unwrapData(response, null);
      if (!snapshot || typeof snapshot !== "object") {
        throw new Error("Dashboard snapshot is empty.");
      }

      const eventSummary = snapshot?.eventSummary || {};
      const summaryCards = snapshot?.dashboardSummaryCards || {};
      const performanceSummary = snapshot?.performance || {};
      const congestionSummary = snapshot?.congestionSummary || {};
      const predictionSummary = congestionSummary?.prediction || null;

      const mappedPrograms = toArray(snapshot?.programCongestionSummaries).map((program) => {
        const embeddedWaitCount = Math.max(0, safeNumber(program?.experienceWait?.waitCount));
        const embeddedWaitMin = Math.max(0, safeNumber(program?.experienceWait?.waitMin));
        const rawWaitCount = Math.max(0, safeNumber(program?.waitCount));
        const rawWaitMin = Math.max(0, safeNumber(program?.waitMin));

        const hasEmbeddedWait = embeddedWaitCount > 0 || embeddedWaitMin > 0;
        const hasRawWait = rawWaitCount > 0 || rawWaitMin > 0;

        return {
          ...program,
          experienceWait: hasEmbeddedWait
            ? program?.experienceWait
            : hasRawWait
              ? {
                waitCount: program?.waitCount ?? null,
                waitMin: program?.waitMin ?? null,
                updatedAt: null,
              }
              : null,
        };
      });

      const mappedBooths = toArray(snapshot?.boothCongestionSummaries).map((booth) => ({
        ...booth,
        measuredAt: booth?.measuredAt ?? booth?.updatedAt ?? null,
      }));

      const predictedPercent = Number(congestionSummary?.predictedCongestionPercent);
      const predictionPayload = predictionSummary || Number.isFinite(predictedPercent)
        ? {
          predictedAvgScore:
            predictionSummary?.predictedAvgScore ??
            (Number.isFinite(predictedPercent) ? predictedPercent : null),
          predictedPeakScore:
            predictionSummary?.predictedPeakScore ??
            (Number.isFinite(predictedPercent) ? predictedPercent : null),
          predictedLevel:
            predictionSummary?.predictedLevel ??
            congestionSummary?.predictedCongestionLevel ??
            null,
          predictedWaitMinutes: predictionSummary?.predictedWaitMinutes ?? null,
          confidence: predictionSummary?.confidence ?? 0,
          fallbackUsed: Boolean(predictionSummary?.fallbackUsed),
          timeline: toArray(predictionSummary?.timeline).map((point) => ({
            time: point?.time ?? null,
            score: point?.score ?? null,
            predictedLevel: point?.predictedLevel ?? null,
          })),
          baseTime:
            congestionSummary?.latestPredictedAt ??
            snapshot?.metadata?.serverTime ??
            null,
          targetType: "EVENT",
          eventId: numericEventId,
        }
        : null;
      const normalizedPrediction = normalizePrediction(predictionPayload);

      const detailStatus = String(eventSummary?.status ?? "").toUpperCase();
      const approvedCount = Number(
        summaryCards?.approvedApplicants ?? performanceSummary?.approvedRegistrationCount ?? 0,
      ) || 0;
      const rawCheckinCount = Number(performanceSummary?.checkinCount ?? 0) || 0;

      setEventDetail({
        eventId: eventSummary?.eventId ?? numericEventId,
        eventName: eventSummary?.eventName || "행사 정보 없음",
        status: eventSummary?.status || "",
        startAt: eventSummary?.startAt || null,
        endAt: eventSummary?.endAt || null,
        location: eventSummary?.location || "",
      });
      setPerformance({
        approved: approvedCount,
        checkin: detailStatus === "PLANNED" ? 0 : rawCheckinCount,
      });
      setHourlyRows(toArray(snapshot?.trendSummary?.hourlyRows));
      setCongestionRows(mappedBooths);
      setProgramRows(mappedPrograms);
      aiPredictionRef.current = normalizedPrediction;
      aiLoadedAtRef.current = Date.now();
      aiRangeKeyRef.current = "";
      setEventPrediction(normalizedPrediction);
      setAiErrorMsg("");
      setErrorMsg("");
      setLastLoadedAt(snapshot?.metadata?.serverTime || new Date());
    } catch (error) {
      if (requestId !== loadRequestIdRef.current) return;
      console.error("[Realtime Dashboard] load failed:", error);
      setErrorMsg("통합현황 데이터를 불러오지 못했습니다.");
    } finally {
      inFlightRef.current = false;
      if (requestId === loadRequestIdRef.current && !preserveLoading) setLoading(false);
    }
  }, [numericEventId]);

  const { spinning, refresh } = useRefresh(() => {
    loadData({ preserveLoading: true });
  }, 800);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!loading) {
      if (lastAutoRefreshTickRef.current === tick) return;
      lastAutoRefreshTickRef.current = tick;
      if (document.visibilityState === "hidden") return;
      loadData({ preserveLoading: true });
    }
  }, [tick, loadData, loading]);

  const measuredCongestions = useMemo(
    () =>
      congestionRows
        .map((row) => {
          const congestionLevel = toCongestionLevelOrNull(row?.congestionLevel);
          return {
            ...row,
            congestionLevel,
            congestionPercent:
              congestionLevel === null ? null : congestionLevelToPercent(congestionLevel),
          };
        })
        .filter((row) => row.congestionLevel !== null),
    [congestionRows],
  );

  const averageCongestion = useMemo(() => {
    if (measuredCongestions.length === 0) return 0;
    const sum = measuredCongestions.reduce((acc, row) => acc + row.congestionPercent, 0);
    return clamp(Math.round(sum / measuredCongestions.length), 0, 100);
  }, [measuredCongestions]);

  const hourlyAverageCongestion = useMemo(() => {
    const samples = toArray(hourlyRows)
      .map((row) =>
        congestionLevelToPercent(
          row?.avgCongestionLevel ?? row?.avgCongestion ?? row?.avg_level,
        ),
      )
      .filter((value) => Number.isFinite(value) && value > 0);

    if (samples.length === 0) return 0;
    const sum = samples.reduce((acc, value) => acc + value, 0);
    return clamp(Math.round(sum / samples.length), 0, 100);
  }, [hourlyRows]);

  const eventStatus = String(eventDetail?.status ?? "").toUpperCase();
  const isPlannedEvent =
    eventStatus === "PLANNED" ||
    eventStatus === "PENDING" ||
    eventStatus === "UPCOMING";
  const isEndedEvent = eventStatus === "ENDED";
  const isOngoingEvent = eventStatus === "ONGOING";

  const resolvedCurrentCongestion = useMemo(() => {
    const aiAverage = Number(eventPrediction?.avgScore);
    if (isPlannedEvent) {
      return safePercent(aiAverage || 0);
    }
    if (measuredCongestions.length > 0) {
      return safePercent(averageCongestion);
    }
    if (Number.isFinite(aiAverage) && aiAverage > 0) {
      return safePercent(aiAverage);
    }
    if (hourlyAverageCongestion > 0) {
      return hourlyAverageCongestion;
    }
    return safePercent(aiAverage || 0);
  }, [
    averageCongestion,
    eventPrediction?.avgScore,
    hourlyAverageCongestion,
    isPlannedEvent,
    measuredCongestions.length,
  ]);

  const forecastDateOptions = useMemo(() => {
    const rangeDates = buildDateKeysFromRange(eventDetail?.startAt, eventDetail?.endAt);
    if (rangeDates.length > 0) return rangeDates;

    const timelineDates = Array.isArray(eventPrediction?.timeline)
      ? Array.from(
          new Set(
            eventPrediction.timeline
              .map((point) => toDateKey(point?.time))
              .filter(Boolean),
          ),
        ).sort((left, right) => left.localeCompare(right))
      : [];
    return timelineDates;
  }, [eventDetail?.endAt, eventDetail?.startAt, eventPrediction?.timeline]);

  const activeForecastDateKey = useMemo(() => {
    if (selectedForecastDate && forecastDateOptions.includes(selectedForecastDate)) {
      return selectedForecastDate;
    }
    if (isOngoingEvent) {
      const todayKey = toDateKey(new Date());
      if (forecastDateOptions.includes(todayKey)) return todayKey;
    }
    if (eventStatus === "ENDED" && forecastDateOptions.length > 0) {
      return forecastDateOptions[forecastDateOptions.length - 1];
    }
    return forecastDateOptions[0] ?? "";
  }, [eventStatus, forecastDateOptions, isOngoingEvent, selectedForecastDate]);

  useEffect(() => {
    if (!selectedForecastDate) return;
    if (forecastDateOptions.includes(selectedForecastDate)) return;
    setSelectedForecastDate("");
  }, [forecastDateOptions, selectedForecastDate]);

  const isTodayForecast = useMemo(
    () => Boolean(activeForecastDateKey) && activeForecastDateKey === toDateKey(new Date()),
    [activeForecastDateKey],
  );
  const isPastForecast = useMemo(() => {
    if (!activeForecastDateKey) return false;
    return activeForecastDateKey < toDateKey(new Date());
  }, [activeForecastDateKey]);
  const isFutureForecast = useMemo(() => {
    if (!activeForecastDateKey) return false;
    return activeForecastDateKey > toDateKey(new Date());
  }, [activeForecastDateKey]);

  const chartTimeline = useMemo(() => {
    const baseTimeline = Array.isArray(eventPrediction?.timeline)
      ? eventPrediction.timeline
      : [];
    if (baseTimeline.length === 0) return [];

    let timeline = baseTimeline;
    if (activeForecastDateKey) {
      timeline = baseTimeline.filter(
        (point) => toDateKey(point?.time) === activeForecastDateKey,
      );
    }

    if (isOngoingEvent && isTodayForecast) {
      const minPredictionStart = getMinPredictionStart(5);
      if (minPredictionStart) {
        timeline = timeline.filter((point) => {
          const pointTime = toValidDate(point?.time);
          return pointTime ? pointTime >= minPredictionStart : false;
        });
      }
    }

    return timeline;
  }, [activeForecastDateKey, eventPrediction?.timeline, isOngoingEvent, isTodayForecast]);

  const hours = useMemo(() => {
    const predictionMap = new Map();
    if (Array.isArray(chartTimeline)) {
      chartTimeline.forEach((point) => {
        const hour = toHour(point?.time);
        if (!Number.isFinite(hour)) return;
        const normalizedHour = normalizeHour(hour);
        const score = clamp(Math.round(Number(point?.score) || 0), 0, 100);
        const previous = predictionMap.get(normalizedHour);
        if (previous == null || score > previous) {
          predictionMap.set(normalizedHour, score);
        }
      });
    }

    const actualMap = new Map();
    const measuredHourBuckets = new Map();
    const pushMeasuredActual = (hour, value) => {
      if (value == null || value === "") return;
      const normalizedHour = normalizeHour(hour);
      const numericValue = Number(value);
      if (!Number.isFinite(normalizedHour) || !Number.isFinite(numericValue)) return;

      const bucket = measuredHourBuckets.get(normalizedHour) || { sum: 0, count: 0 };
      bucket.sum += numericValue;
      bucket.count += 1;
      measuredHourBuckets.set(normalizedHour, bucket);
    };

    if (isPastForecast && Array.isArray(chartTimeline) && chartTimeline.length > 0) {
      chartTimeline.forEach((point) => {
        const hour = toHour(point?.time);
        if (!Number.isFinite(hour)) return;
        pushMeasuredActual(hour, point?.score);
      });
    }

    const measuredRowsForDate = measuredCongestions.filter((row) => {
      if (!activeForecastDateKey) return true;
      return toDateKey(row?.measuredAt) === activeForecastDateKey;
    });

    if (isTodayForecast || isPastForecast) {
      measuredRowsForDate.forEach((row) => {
        const hour = toHour(row?.measuredAt);
        if (!Number.isFinite(hour)) return;
        pushMeasuredActual(hour, row?.congestionPercent);
      });
    }

    measuredHourBuckets.forEach((bucket, hour) => {
      if (!bucket || bucket.count <= 0) return;
      actualMap.set(hour, clamp(Math.round(bucket.sum / bucket.count), 0, 100));
    });

    const nowHour = normalizeHour(new Date().getHours());
    if (isTodayForecast) {
      actualMap.set(nowHour, safePercent(resolvedCurrentCongestion));
    }

    if (isTodayForecast || (isPastForecast && actualMap.size === 0)) {
      toArray(hourlyRows)
        .map((row) => [
          normalizeHour(Number(row?.hour ?? row?.h)),
          congestionLevelToPercent(row?.avgCongestionLevel ?? row?.avgCongestion ?? row?.avg_level),
        ])
        .filter(([hour]) => Number.isFinite(hour))
        .forEach(([hour, value]) => {
          if (!actualMap.has(hour)) {
            actualMap.set(hour, clamp(Math.round(Number(value) || 0), 0, 100));
          }
        });
    }

    let axisStart = eventDetail?.startAt ?? null;
    let axisEnd = eventDetail?.endAt ?? null;
    if (activeForecastDateKey) {
      const operationRange = buildOperationRangeByDate(
        eventDetail?.startAt,
        eventDetail?.endAt,
        activeForecastDateKey,
      );
      if (operationRange.startAt && operationRange.endAt) {
        axisStart = operationRange.startAt;
        axisEnd = operationRange.endAt;
      }
    }

    const axisHourlyRows = isTodayForecast ? hourlyRows : [];
    const hourAxis = buildHourAxis({
      hourlyRows: axisHourlyRows,
      timeline: chartTimeline,
      startAt: axisStart,
      endAt: axisEnd,
      preferRange: Boolean(axisStart && axisEnd),
    });
    const displayHourAxis = uniqueNormalizedHours(hourAxis);

    const baseRows = displayHourAxis.map((hour) => {
      const normalizedHour = normalizeHour(hour);
      const actualValue = actualMap.get(normalizedHour);
      const predictedValue = predictionMap.get(normalizedHour);
      const actual = Number.isFinite(actualValue)
        ? clamp(Math.round(actualValue), 0, 100)
        : null;
      const predictedCandidate = Number.isFinite(predictedValue)
        ? clamp(Math.round(predictedValue), 0, 100)
        : null;
      const predicted = isPastForecast ? null : predictedCandidate;
      const value = isTodayForecast
        ? normalizedHour <= nowHour
          ? actual ?? predicted ?? 0
          : predicted ?? actual ?? 0
        : isPastForecast
          ? actual ?? 0
          : predicted ?? actual ?? 0;
      return {
        h: String(normalizedHour).padStart(2, "0"),
        v: value,
        pct: value,
        actual,
        predicted,
      };
    });

    if (isPastForecast) {
      const hasActualAt = (row) => Number.isFinite(row.actual);
      let startIndex = 0;
      let endIndex = baseRows.length - 1;
      while (startIndex <= endIndex && !hasActualAt(baseRows[startIndex])) {
        startIndex += 1;
      }
      while (endIndex >= startIndex && !hasActualAt(baseRows[endIndex])) {
        endIndex -= 1;
      }
      if (startIndex <= endIndex) {
        return baseRows.slice(startIndex, endIndex + 1);
      }
      return baseRows;
    }

    if (!isTodayForecast) {
      return baseRows;
    }

    const latestActualRow = [...baseRows]
      .filter((row) => Number.isFinite(row.actual) && Number(row.h) <= nowHour)
      .sort((left, right) => Number(left.h) - Number(right.h))
      .pop();

    if (!latestActualRow || !Number.isFinite(latestActualRow.actual)) {
      return baseRows;
    }

    const latestActualHour = Number(latestActualRow.h);
    const anchorPredictionRow =
      baseRows.find(
        (row) =>
          Number(row.h) === latestActualHour && Number.isFinite(row.predicted),
      ) ||
      baseRows
        .filter((row) => Number(row.h) > latestActualHour && Number.isFinite(row.predicted))
        .sort((left, right) => Number(left.h) - Number(right.h))[0] ||
      null;

    const predictionOffset =
      anchorPredictionRow && Number.isFinite(anchorPredictionRow.predicted)
        ? latestActualRow.actual - anchorPredictionRow.predicted
        : 0;

    return baseRows.map((row) => {
      const rowHour = Number(row.h);
      const calibratedPredicted = Number.isFinite(row.predicted)
        ? clamp(
            Math.round(
              rowHour >= latestActualHour ? row.predicted + predictionOffset : row.predicted,
            ),
            0,
            100,
          )
        : null;
      const bridgedPredicted =
        rowHour === latestActualHour && Number.isFinite(latestActualRow.actual)
          ? latestActualRow.actual
          : calibratedPredicted;
      const value = rowHour <= nowHour
        ? row.actual ?? bridgedPredicted ?? 0
        : bridgedPredicted ?? row.actual ?? 0;
      return {
        ...row,
        v: value,
        pct: value,
        predicted: bridgedPredicted,
      };
    });
  }, [
    activeForecastDateKey,
    chartTimeline,
    eventDetail?.endAt,
    eventDetail?.startAt,
    hourlyRows,
    isPastForecast,
    isTodayForecast,
    measuredCongestions,
    resolvedCurrentCongestion,
  ]);

  const handleForecastDateChange = useCallback(
    (event) => {
      const nextDate = event.target.value;
      if (!nextDate) {
        setSelectedForecastDate("");
        return;
      }
      if (
        forecastDateOptions.length === 0 ||
        forecastDateOptions.includes(nextDate)
      ) {
        setSelectedForecastDate(nextDate);
      }
    },
    [forecastDateOptions],
  );

  const programCongestionMap = useMemo(() => {
    const map = new Map();
    measuredCongestions.forEach((row) => {
      const programId = Number(row?.programId);
      if (!Number.isFinite(programId)) return;
      const candidatePercent = safePercent(row?.congestionPercent);
      const candidateMeasured = toValidDate(row?.measuredAt)?.getTime() ?? 0;
      const previous = map.get(programId);
      if (
        !previous ||
        candidateMeasured > previous.measuredAt ||
        candidatePercent > previous.congestionPercent
      ) {
        map.set(programId, {
          congestionPercent: candidatePercent,
          measuredAt: candidateMeasured,
        });
      }
    });
    return map;
  }, [measuredCongestions]);

  const allProgramRows = useMemo(() => {
    const now = Date.now();
    return toArray(programRows)
      .map((program) => {
        const programId = Number(program?.programId);
        if (!Number.isFinite(programId)) return null;

        const startDate = toValidDate(program?.startAt);
        const endDate = toValidDate(program?.endAt);
        const isOperatingNow =
          startDate && endDate
            ? startDate.getTime() <= now && now <= endDate.getTime()
            : true;

        const waitCount = Math.max(
          0,
          safeNumber(program?.experienceWait?.waitCount ?? program?.waitCount),
        );
        const waitMin = Math.max(
          0,
          safeNumber(program?.experienceWait?.waitMin ?? program?.waitMin),
        );
        const hasWaitInfo = waitCount > 0 || waitMin > 0;
        const mappedCongestionRaw =
          program?.currentCongestionPercent ?? programCongestionMap.get(programId)?.congestionPercent;
        const mappedCongestion =
          mappedCongestionRaw === null || mappedCongestionRaw === undefined
            ? null
            : safePercent(mappedCongestionRaw);
        const congestionPercent = safePercent(
          mappedCongestion ?? deriveCongestionPercentFromWait(waitCount, waitMin),
        );
        const tone = resolveCongestionMeta(congestionPercent);

        return {
          key: `program-${programId}`,
          programId,
          name: program?.programTitle || `프로그램 ${programId}`,
          timeLabel: formatProgramTimeRange(program?.startAt, program?.endAt),
          waitCount,
          waitMin,
          congestionPercent,
          guideText: getProgramGuideText(congestionPercent),
          tone,
          hasWaitInfo,
          hasRealtimeSignal:
            hasWaitInfo ||
            (mappedCongestionRaw !== null &&
              mappedCongestionRaw !== undefined &&
              safePercent(mappedCongestionRaw) > 0),
          isOperatingNow,
        };
      })
      .filter(Boolean);
  }, [programCongestionMap, programRows]);

  const programNameMap = useMemo(
    () =>
      new Map(
        allProgramRows.map((program) => [program.programId, program.name]),
      ),
    [allProgramRows],
  );

  const strictlyOperatingProgramRows = useMemo(
    () => allProgramRows.filter((program) => program.isOperatingNow),
    [allProgramRows],
  );

  const realtimeSignalProgramRows = useMemo(
    () => allProgramRows.filter((program) => program.hasRealtimeSignal),
    [allProgramRows],
  );

  const usingRealtimeProgramFallback =
    !isEndedEvent &&
    !isPlannedEvent &&
    strictlyOperatingProgramRows.length === 0 &&
    realtimeSignalProgramRows.length > 0;

  const operatingProgramRows = useMemo(
    () =>
      isEndedEvent
        ? allProgramRows
        : usingRealtimeProgramFallback
          ? realtimeSignalProgramRows
          : strictlyOperatingProgramRows,
    [
      allProgramRows,
      isEndedEvent,
      realtimeSignalProgramRows,
      strictlyOperatingProgramRows,
      usingRealtimeProgramFallback,
    ],
  );

  const queueProgramRows = useMemo(
    () => operatingProgramRows.filter((program) => program.hasWaitInfo),
    [operatingProgramRows],
  );

  const popularTopPrograms = useMemo(
    () =>
      [...queueProgramRows]
        .sort(
          (left, right) =>
            right.congestionPercent - left.congestionPercent ||
            right.waitMin - left.waitMin ||
            right.waitCount - left.waitCount ||
            String(left.name).localeCompare(String(right.name), "ko-KR"),
        )
        .slice(0, 3),
    [queueProgramRows],
  );

  const popularTopProgramIds = useMemo(
    () => new Set(popularTopPrograms.map((program) => program.programId)),
    [popularTopPrograms],
  );

  const readyPrograms = useMemo(() => {
    const candidates = queueProgramRows
      .filter((program) => !popularTopProgramIds.has(program.programId))
      .sort(
        (left, right) =>
          left.waitMin - right.waitMin ||
          left.waitCount - right.waitCount ||
          left.congestionPercent - right.congestionPercent ||
          String(left.name).localeCompare(String(right.name), "ko-KR"),
      );

    const immediateCandidates = candidates.filter(
      (program) => program.waitMin <= 5 && program.waitCount <= 2,
    );

    return immediateCandidates.slice(0, 8);
  }, [popularTopProgramIds, queueProgramRows]);

  const currentVisitors = isPlannedEvent ? 0 : performance.checkin;

  const currentCongestion = resolvedCurrentCongestion;

  const currentTone = useMemo(
    () => resolveCongestionMeta(currentCongestion),
    [currentCongestion],
  );

  const expectedWaitMinutes = useMemo(() => {
    const queueBasedWait = deriveExpectedWaitMinutesFromQueue(queueProgramRows);
    const currentBasedWait = estimateWaitMinutes(currentCongestion);
    if (isTodayForecast && !isPlannedEvent) {
      if (queueBasedWait != null) {
        return queueBasedWait;
      }
      return currentBasedWait;
    }
    const predictedWait = Number(eventPrediction?.waitMinutes);
    if (Number.isFinite(predictedWait) && predictedWait >= 0) {
      return Math.round(predictedWait);
    }
    if (queueBasedWait != null) {
      return queueBasedWait;
    }
    return currentBasedWait;
  }, [
    currentCongestion,
    eventPrediction?.waitMinutes,
    isPlannedEvent,
    isTodayForecast,
    queueProgramRows,
  ]);

  const waitKpiLabel = isTodayForecast && !isPlannedEvent
    ? "현재 예상 대기시간"
    : "예상 대기시간";

  const congestionSummaryText = useMemo(
    () => getCongestionSummaryText(currentCongestion),
    [currentCongestion],
  );
  const waitSummaryText = useMemo(
    () => getWaitSummaryText(expectedWaitMinutes),
    [expectedWaitMinutes],
  );
  const visitorMoodText = useMemo(
    () => getVisitorMoodText(currentVisitors, isPlannedEvent),
    [currentVisitors, isPlannedEvent],
  );

  const heroStats = useMemo(
    () => {
      const grayBar = "#9ca3af";
      return [
        {
          label: "현재 혼잡도",
          value: currentCongestion,
          unit: "%",
          sub: congestionSummaryText,
          barValue: currentCongestion,
          barColor: isEndedEvent ? grayBar : currentTone.color,
        },
        {
          label: waitKpiLabel,
          value: expectedWaitMinutes,
          unit: "분",
          sub: waitSummaryText,
          barValue: Math.min(expectedWaitMinutes * 2, 100),
          barColor: isEndedEvent ? grayBar : (expectedWaitMinutes <= 5 ? "#22c55e" : expectedWaitMinutes <= 15 ? "#f59e0b" : "#ef4444"),
        },
        {
          label: "혼잡 상태",
          value: currentTone.label,
          unit: "",
          sub: currentTone.sentence,
          barValue: currentCongestion,
          barColor: isEndedEvent ? grayBar : currentTone.color,
        },
      ];
    },
    [congestionSummaryText, currentCongestion, currentTone, expectedWaitMinutes, isEndedEvent, waitKpiLabel, waitSummaryText],
  );

  const calibratedTimeline = useMemo(() => {
    const source = Array.isArray(chartTimeline) ? chartTimeline : [];
    if (source.length === 0) return [];

    const withTone = (point, score) => {
      const normalizedScore = safePercent(score);
      const meta = resolveCongestionMeta(normalizedScore);
      return {
        ...point,
        score: normalizedScore,
        label: meta.label,
        tone: {
          color: meta.color,
          bg: meta.bg,
          border: meta.border,
        },
      };
    };

    if (!isTodayForecast) {
      return source.map((point) => withTone(point, point?.score));
    }

    const nowHour = normalizeHour(new Date().getHours());
    const latestActualRow = [...hours]
      .filter((row) => Number.isFinite(row?.actual) && Number(row?.h) <= nowHour)
      .sort((left, right) => Number(left.h) - Number(right.h))
      .pop();

    if (!latestActualRow || !Number.isFinite(latestActualRow.actual)) {
      return source.map((point) => withTone(point, point?.score));
    }

    const latestActualHour = Number(latestActualRow.h);
    const anchorCandidate =
      source
        .map((point) => ({
          point,
          hour: toHour(point?.time),
          score: safePercent(point?.score),
        }))
        .filter((candidate) => Number.isFinite(candidate.hour))
        .filter((candidate) => candidate.hour >= latestActualHour)
        .sort((left, right) => left.hour - right.hour)[0] ||
      source
        .map((point) => ({
          point,
          hour: toHour(point?.time),
          score: safePercent(point?.score),
        }))
        .filter((candidate) => Number.isFinite(candidate.hour) && Number.isFinite(candidate.score))
        .sort((left, right) => left.hour - right.hour)[0] ||
      null;

    const predictionOffset =
      anchorCandidate && Number.isFinite(anchorCandidate.score)
        ? latestActualRow.actual - anchorCandidate.score
        : 0;

    return source.map((point) => {
      const pointHour = toHour(point?.time);
      const baseScore = safePercent(point?.score);
      if (!Number.isFinite(pointHour) || pointHour < latestActualHour) {
        return withTone(point, baseScore);
      }
      return withTone(point, clamp(Math.round(baseScore + predictionOffset), 0, 100));
    });
  }, [chartTimeline, hours, isTodayForecast]);

  const aiTimelinePreview = useMemo(
    () => calibratedTimeline.slice(0, 8),
    [calibratedTimeline],
  );

  const nextPeakPoint = useMemo(() => {
    if (aiTimelinePreview.length === 0) return null;
    return [...aiTimelinePreview].sort(
      (left, right) => (Number(right?.score) || 0) - (Number(left?.score) || 0),
    )[0];
  }, [aiTimelinePreview]);

  const aiCurrentScore = useMemo(() => {
    if (isTodayForecast && !isPlannedEvent) {
      return safePercent(currentCongestion);
    }

    const timelineScores = calibratedTimeline
      .map((point) => safePercent(point?.score))
      .filter(Number.isFinite);
    if (timelineScores.length > 0) {
      const sum = timelineScores.reduce((acc, score) => acc + score, 0);
      return safePercent(Math.round(sum / timelineScores.length));
    }

    return safePercent(eventPrediction?.avgScore ?? currentCongestion);
  }, [
    calibratedTimeline,
    currentCongestion,
    eventPrediction?.avgScore,
    isPlannedEvent,
    isTodayForecast,
  ]);
  const aiCurrentTone = resolveCongestionMeta(aiCurrentScore);
  const aiSoonScore = safePercent(
    nextPeakPoint?.score ?? (isTodayForecast ? aiCurrentScore : eventPrediction?.peakScore) ?? aiCurrentScore,
  );
  const aiSoonTone = resolveCongestionMeta(aiSoonScore);
  const aiSoonWait = estimateWaitMinutes(aiSoonScore);

  const chartGuideText = useMemo(() => {
    if (eventPrediction && aiSoonScore >= aiCurrentScore + 10) {
      return "지금보다 1시간 뒤 더 붐빌 수 있어요. 인기 프로그램은 조금 일찍 이동하는 것을 추천해요.";
    }
    if (eventPrediction && aiSoonScore <= aiCurrentScore - 10) {
      return "조금 뒤에는 더 여유로워질 가능성이 있어요. 천천히 둘러보며 이동해도 좋아요.";
    }
    const afternoonBusy = hours.some((item) => {
      const hour = Number(item?.h);
      return Number.isFinite(hour) && hour >= 14 && hour <= 18 && safePercent(item?.v) >= 60;
    });
    if (afternoonBusy) {
      return "오후 시간대 방문객이 늘어나는 경향이 있어요. 원하는 프로그램을 먼저 확인해 보세요.";
    }
    return "혼잡도가 낮은 시간대를 골라 이동하면 더 편하게 즐길 수 있어요.";
  }, [aiCurrentScore, aiSoonScore, eventPrediction, hours]);

  const activities = useMemo(() => {
    const liveItems = [...measuredCongestions]
      .sort((left, right) => {
        const leftTime = left.measuredAt ? new Date(left.measuredAt).getTime() : 0;
        const rightTime = right.measuredAt ? new Date(right.measuredAt).getTime() : 0;
        return rightTime - leftTime;
      })
      .slice(0, 12)
      .map((row) => {
        const programId = Number(row?.programId);
        const programName = Number.isFinite(programId) ? programNameMap.get(programId) : null;
        return {
          time: formatTime(row.measuredAt),
          text: `${programName || row.placeName || "현장 프로그램"} 혼잡도가 ${safePercent(row.congestionPercent)}%로 갱신되었습니다.`,
          color: getActivityColor(safePercent(row.congestionPercent)),
        };
      });

    if (liveItems.length > 0) return liveItems;

    return congestionRows.slice(0, 12).map((row) => ({
      time: "--:--",
      text: `${row.placeName || "현장 프로그램"}의 실시간 혼잡 데이터를 수집 중입니다.`,
      color: "#9ca3af",
    }));
  }, [congestionRows, measuredCongestions, programNameMap]);

  const timelineVisible = useStaggerIn(activities.length, 100);

  const animVisitors = useCountUp(currentVisitors, 1000);
  const animCongestion = useCountUp(typeof heroStats[0]?.value === "number" ? heroStats[0].value : 0, 800);
  const animWait = useCountUp(typeof heroStats[1]?.value === "number" ? heroStats[1].value : 0, 800);

  const badge = STATUS_BADGE[String(eventDetail?.status).toUpperCase()] || STATUS_BADGE.PLANNED;
  const eventName = eventDetail?.eventName || "행사 정보 없음";
  const soonPeakTimeLabel = nextPeakPoint?.time
    ? `${formatKoreanTime(nextPeakPoint.time)} 무렵`
    : "가까운 시간대";
  const hasAnyPrograms = allProgramRows.length > 0;
  const hasOperatingPrograms = operatingProgramRows.length > 0;
  const hasQueuePrograms = queueProgramRows.length > 0;

  if (loading && !eventDetail) {
    return <PageLoading message="통합현황을 불러오는 중입니다" />;
  }

  return (
    <>
      <div className={`rt-page-shell${isEndedEvent ? " rt-ended" : ""}`}>
        {errorMsg ? <div className="rt-error">{errorMsg}</div> : null}

        <section className="rt-hero">
        <div className="rt-hero-top">
          <div className="rt-hero-main">
            <div className="rt-hero-title-row">
              <h1 className="rt-hero-title">{eventName}</h1>
              <div className={`rt-status-chip ${badge.className}`}>
                <div className="rt-status-dot" />
                {badge.label}
              </div>
            </div>
            <div className="rt-hero-meta">
              <span className="rt-hero-meta-item">
                <CalendarDays size={13} />
                {formatDateRange(eventDetail?.startAt, eventDetail?.endAt)}
              </span>
              <span className="rt-hero-meta-item">
                <MapPin size={13} />
                {eventDetail?.location || "장소 정보 없음"}
              </span>
            </div>
            <hr className="rt-hero-divider" />
            <div className="rt-hero-visitor">
              <span className="rt-hero-visitor-dot" />
              현재 방문객 <strong>{animVisitors.toLocaleString()}</strong>명
              <span className="rt-hero-visitor-sep">·</span>
              {visitorMoodText}
            </div>
          </div>
          <div className="rt-hero-kpi-grid">
            {heroStats.map((item, idx) => {
              const animVal = idx === 0 ? animCongestion : idx === 1 ? animWait : null;
              return (
                <div key={item.label} className="rt-hero-kpi">
                  <div className="rt-hero-kpi-label">{item.label}</div>
                  <div className="rt-hero-kpi-row">
                    <span className="rt-hero-kpi-value">{animVal != null ? animVal : item.value}</span>
                    {item.unit ? <span className="rt-hero-kpi-unit">{item.unit}</span> : null}
                  </div>
                  <div className="rt-hero-kpi-bar">
                    <div className="rt-hero-kpi-bar-fill" style={{ width: `${item.barValue}%`, background: item.barColor }} />
                  </div>
                  <div className="rt-hero-kpi-sub">{item.sub}</div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="rt-hero-footer">
          <span className="rt-timestamp">
            마지막 갱신: {formatTimestamp(lastLoadedAt)}
          </span>
          <button className="rt-refresh-btn" onClick={refresh} title="새로고침">
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

      <div className="rt-card">
        <div className="rt-card-accent" style={{ background: "#dc2626" }} />
        <div className="rt-card-header">
          <div className="rt-card-title">
            <div className="rt-card-title-icon">
              <TrendingUp size={14} color="#dc2626" />
            </div>
            {isEndedEvent
              ? "종료 시점 인기 프로그램 TOP3"
              : "인기 프로그램 TOP3"}
          </div>
          <span className="rt-card-tag">
            {isEndedEvent
              ? "종료 시점 기준"
              : usingRealtimeProgramFallback
                ? "실시간 집계 기준"
                : "지금 사람들이 몰리는 프로그램"}
          </span>
        </div>

        {usingRealtimeProgramFallback ? (
          <div className="rt-section-lead">
            현재 시각과 프로그램 일정이 정확히 맞지 않아도, 실시간 대기와 혼잡 집계가 잡힌 프로그램부터 우선 보여주고 있습니다.
          </div>
        ) : null}

        {!hasAnyPrograms || !hasOperatingPrograms ? (
          <div className="rt-empty">
            <span className="rt-empty-strong">운영 중인 프로그램이 없습니다</span>
            운영 시간이 시작되면 인기 프로그램 정보가 표시됩니다.
          </div>
        ) : !hasQueuePrograms ? (
          <div className="rt-empty">
            <span className="rt-empty-strong">
              {isEndedEvent ? "종료 시점 대기 정보가 없습니다" : "아직 집계된 대기 정보가 없습니다"}
            </span>
            {isEndedEvent
              ? "행사 종료 이후에는 신규 대기 집계가 갱신되지 않습니다."
              : "대기 정보가 수집되면 인기 프로그램을 보여드릴게요."}
          </div>
        ) : (
          <div className="rt-program-grid rt-program-grid-top3">
            {popularTopPrograms.map((item) => (
              <ProgramCrowdCard key={`top3-${item.key}`} item={item} isEnded={isEndedEvent} />
            ))}
          </div>
        )}
      </div>

      <div className="rt-card">
        <div className="rt-card-accent" style={{ background: "#90C450" }} />
        <div className="rt-card-header">
          <div className="rt-card-title">
            <div className="rt-card-title-icon">
              <Radio size={14} color="#90C450" />
            </div>
            {isEndedEvent ? "종료 시점 바로 참여 프로그램" : "바로 참여 프로그램"}
          </div>
          <span className="rt-card-tag">
            {isEndedEvent
              ? "종료 시점 기준"
              : usingRealtimeProgramFallback
                ? "실시간 집계 기준"
                : "대기 짧은 순"}
          </span>
        </div>

        {!hasAnyPrograms || !hasOperatingPrograms ? (
          <div className="rt-empty">
            <span className="rt-empty-strong">운영 중인 프로그램이 없습니다</span>
            운영 시간이 시작되면 참여 가능한 프로그램이 표시됩니다.
          </div>
        ) : !hasQueuePrograms ? (
          <div className="rt-empty">
            <span className="rt-empty-strong">
              {isEndedEvent ? "종료 시점 대기 정보가 없습니다" : "아직 집계된 대기 정보가 없습니다"}
            </span>
            {isEndedEvent
              ? "행사 종료 이후에는 신규 대기 집계가 갱신되지 않습니다."
              : "잠시 후 다시 확인해 주세요."}
          </div>
        ) : readyPrograms.length === 0 ? (
          <div className="rt-empty">
            <span className="rt-empty-strong">바로 참여 가능한 프로그램이 없습니다</span>
            현재는 인기 프로그램 쪽으로 방문이 몰리고 있어요.
          </div>
        ) : (
          <div className="rt-program-grid rt-program-grid-top3">
            {readyPrograms.map((item) => (
              <ProgramCrowdCard
                key={`ready-${item.key}`}
                item={item}
                isEnded={isEndedEvent}
              />
            ))}
          </div>
        )}
      </div>

      <div className="rt-card">
        <div className="rt-card-accent" style={{ background: "#90C450" }} />
        <div className="rt-card-header">
          <div className="rt-card-title">
            <div className="rt-card-title-icon">
              <BarChart2 size={14} color="#90C450" />
            </div>
            지금 행사장은 얼마나 붐빌까요?
          </div>
          <div className="rt-card-controls">
            <div className="rt-prediction-meta-strip rt-prediction-meta-strip--header">
              <span className="rt-prediction-meta-pill">
                예측 기준: {formatKoreanTime(eventPrediction?.baseTime) || "-"}
              </span>
              <span className="rt-prediction-meta-pill">
                신뢰도:{" "}
                {eventPrediction
                  ? `${Math.round(safeNumber(eventPrediction.confidence, 0) * 100)}%`
                  : "집계 중"}
              </span>
              <span className="rt-prediction-meta-pill">
                {eventPrediction
                  ? eventPrediction.fallbackUsed
                    ? "보정 예측 적용"
                    : "AI 예측 반영"
                  : "AI 예측 준비 중"}
              </span>
            </div>
            <span className="rt-card-tag">시간대별 혼잡도</span>
            {forecastDateOptions.length > 0 ? (
              <div className="rt-calendar-control">
                <div className="rt-calendar-control-icon">
                  <CalendarDays size={14} />
                </div>
                <input
                  className="rt-date-input"
                  type="date"
                  value={activeForecastDateKey || forecastDateOptions[0]}
                  min={forecastDateOptions[0]}
                  max={forecastDateOptions[forecastDateOptions.length - 1]}
                  onChange={handleForecastDateChange}
                />
              </div>
            ) : null}
          </div>
        </div>

        <div className="rt-prediction-section">
          <div className="rt-prediction-kpi-grid">
            <div className="rt-prediction-kpi" style={{ background: isEndedEvent ? undefined : `${aiCurrentTone.color}08` }}>
              <div className="rt-prediction-kpi-label">
                {isFutureForecast ? "예상 혼잡도" : "현재 혼잡도"}
              </div>
              <div className="rt-prediction-kpi-value" style={isEndedEvent ? { color: "#9ca3af" } : undefined}>
                {aiCurrentScore}
                <span className="rt-prediction-kpi-unit">%</span>
              </div>
              <div className="rt-prediction-kpi-bar">
                <div className="rt-prediction-kpi-bar-fill" style={{ width: `${aiCurrentScore}%`, background: isEndedEvent ? "#9ca3af" : aiCurrentTone.color }} />
              </div>
              <div className="rt-prediction-kpi-desc">{aiCurrentTone.sentence}</div>
            </div>

            <div className="rt-prediction-kpi" style={{ background: isEndedEvent ? undefined : `${aiCurrentTone.color}08` }}>
              <div className="rt-prediction-kpi-label">{waitKpiLabel}</div>
              <div className="rt-prediction-kpi-value" style={isEndedEvent ? { color: "#9ca3af" } : undefined}>
                {expectedWaitMinutes}
                <span className="rt-prediction-kpi-unit">분</span>
              </div>
              <div className="rt-prediction-kpi-bar">
                <div className="rt-prediction-kpi-bar-fill" style={{ width: `${Math.min(expectedWaitMinutes * 2, 100)}%`, background: isEndedEvent ? "#9ca3af" : aiCurrentTone.color }} />
              </div>
              <div className="rt-prediction-kpi-desc">{waitSummaryText}</div>
            </div>

            <div className="rt-prediction-kpi" style={{ background: isEndedEvent ? undefined : `${aiSoonTone.color}08` }}>
              <div className="rt-prediction-kpi-label">곧 예상되는 변화</div>
              <div className="rt-prediction-kpi-value" style={isEndedEvent ? { color: "#9ca3af" } : undefined}>
                {aiSoonScore}
                <span className="rt-prediction-kpi-unit">%</span>
              </div>
              <div className="rt-prediction-kpi-bar">
                <div className="rt-prediction-kpi-bar-fill" style={{ width: `${aiSoonScore}%`, background: isEndedEvent ? "#9ca3af" : aiSoonTone.color }} />
              </div>
              <div className="rt-prediction-kpi-desc">
                {eventPrediction
                  ? `${soonPeakTimeLabel}에는 약 ${aiSoonWait}분 대기 예상`
                  : "예측 데이터가 준비되면 안내해 드릴게요."}
              </div>
            </div>
          </div>

          <div className="rt-prediction-bottom">
            <div className="rt-prediction-chart-card">
              <div className="rt-prediction-chart-head">
                <span className="rt-prediction-chart-title">시간대별 혼잡도</span>
                <span className="rt-prediction-chart-sub">
                  {selectedForecastDate || "오늘"} · {isTodayForecast ? "실시간 + AI 예측" : isPastForecast ? "실제 혼잡도" : "AI 예측"}
                </span>
              </div>
              <div className="rt-prediction-chart">
                <HourlyTrendChart
                  points={hours}
                  activeDateKey={activeForecastDateKey}
                  isTodayForecast={isTodayForecast}
                  isEnded={isEndedEvent}
                />
                <div className="rt-heat-legend">
                  <span className="rt-heat-legend-item">
                    <span className="rt-heat-legend-swatch actual" style={isEndedEvent ? { background: "#9ca3af", boxShadow: "none" } : undefined} />
                    <span className="rt-heat-legend-text">Actual (실제 혼잡도)</span>
                  </span>
                  {!isPastForecast ? (
                    <span className="rt-heat-legend-item">
                      <span className="rt-heat-legend-swatch predicted" style={isEndedEvent ? { background: "#b0b5bc", boxShadow: "none" } : undefined} />
                      <span className="rt-heat-legend-text">Predicted (AI 예측)</span>
                    </span>
                  ) : null}
                </div>
                <div className="rt-chart-guide">{chartGuideText}</div>
              </div>
            </div>

            <div className="rt-prediction-near-card">
              <div className="rt-prediction-near-title" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                  <Activity size={14} color="#6366f1" />
                  현장 참고 알림
                </span>
                <span className="rt-card-tag">15초마다 갱신</span>
              </div>

              <div className="rt-timeline rt-near-timeline">
                {activities.length === 0 ? (
                  <div className="rt-empty">
                    <span className="rt-empty-strong">실시간 참고 정보가 아직 없습니다</span>
                    곧 최신 혼잡 반영 내역이 표시됩니다.
                  </div>
                ) : (
                  activities.map((activity, index) => (
                    <div
                      key={`${activity.time}-${index}`}
                      className={`rt-timeline-item anim-slide-right ${timelineVisible.includes(index) ? "visible" : ""}`}
                    >
                      <div
                        className="rt-timeline-dot"
                        style={{ background: activity.color }}
                      />
                      <div className="rt-timeline-time">{activity.time}</div>
                      <div className="rt-timeline-text">{activity.text}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {aiErrorMsg ? (
          <div style={{ marginTop: 12, fontSize: 12, color: "#b91c1c" }}>{aiErrorMsg}</div>
        ) : null}
      </div>
    </div>
    </>
  );
}

export default function Dashboard() {
  const { eventId } = useParams();
  const navigate = useNavigate();

  const handleSelectEvent = (id) => {
    navigate(`/realtime/dashboard/${id}`);
  };

  return (
    <div className="rt-root">
      <style>{styles}</style>
      <style>{SHARED_ANIM_STYLES}</style>
      <PageHeader
        title={eventId ? "통합현황" : "실시간현황"}
        subtitle={eventId ? "행사의 실시간 운영 데이터를 확인합니다" : "행사별 실시간 데이터를 한눈에 확인하세요"}
        icon={<Activity size={42} color="#90C450" strokeWidth={1.6} />}
        titleStyle={{ fontSize: 46, lineHeight: "66px", letterSpacing: "-1px" }}
        subtitleStyle={{ fontSize: 20 }}
      />
      <main className={`rt-container${eventId ? "" : " selector-mode"}`}>
        {eventId ? (
          <>
            <div className="rt-top-actions">
              <div className="rt-event-mode-nav">
                {EVENT_REALTIME_BUTTONS.map((button) => (
                  <button
                    key={button.key}
                    type="button"
                    className={`rt-mode-btn ${button.tone}${button.key === "dashboard" ? " active" : ""}`}
                    onClick={() => navigate(`${button.path}/${eventId}`)}
                  >
                    {button.label}
                  </button>
                ))}
              </div>
            </div>
            <DashboardContent eventId={eventId} />
            <div style={{ display: "flex", justifyContent: "center", marginTop: 32 }}>
              <button className="rt-back-btn" onClick={() => navigate("/realtime/dashboard")}>
                <ArrowLeft size={15} />
                목록으로
              </button>
            </div>
          </>
        ) : (
          <RealtimeEventSelector
            onSelectEvent={handleSelectEvent}
            pageTitle="통합 현황"
            metricType="dashboard"
          />
        )}
      </main>
    </div>
  );
}
