import { useState, useEffect, useRef, useCallback } from "react";

/**
 * useCountUp — 숫자가 0에서 목표값까지 올라가는 카운터
 * @param {number} target - 목표 숫자
 * @param {number} duration - 애니메이션 시간 (ms), 기본 1200
 * @param {number} delay - 시작 전 딜레이 (ms), 기본 0
 */
export function useCountUp(target, duration = 1200, delay = 0) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    let start = null;
    let raf;
    const timeout = setTimeout(() => {
      const step = (ts) => {
        if (!start) start = ts;
        const progress = Math.min((ts - start) / duration, 1);
        // easeOutExpo
        const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
        setValue(Math.round(eased * target));
        if (progress < 1) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    }, delay);

    return () => {
      clearTimeout(timeout);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [target, duration, delay]);

  return value;
}

/**
 * useRefresh — 새로고침 버튼 회전 + 데이터 갱신 시뮬레이션
 * @param {Function} onRefresh - 새로고침 시 실행할 콜백 (optional)
 * @param {number} spinDuration - 회전 지속 시간 (ms), 기본 800
 */
export function useRefresh(onRefresh, spinDuration = 800) {
  const [spinning, setSpinning] = useState(false);

  const refresh = useCallback(() => {
    if (spinning) return;
    setSpinning(true);
    if (onRefresh) onRefresh();
    setTimeout(() => setSpinning(false), spinDuration);
  }, [spinning, onRefresh, spinDuration]);

  return { spinning, refresh };
}

/**
 * useStaggerIn — 자식 요소들이 순차적으로 페이드인
 * @param {number} count - 아이템 수
 * @param {number} staggerDelay - 각 아이템 간 딜레이 (ms), 기본 80
 */
export function useStaggerIn(count, staggerDelay = 80) {
  const [visible, setVisible] = useState([]);

  useEffect(() => {
    const timeouts = [];
    for (let i = 0; i < count; i++) {
      timeouts.push(
        setTimeout(
          () => {
            setVisible((prev) => [...prev, i]);
          },
          i * staggerDelay + 100,
        ),
      );
    }
    return () => timeouts.forEach(clearTimeout);
  }, [count, staggerDelay]);

  return visible;
}

/**
 * useProgressAnimate — 프로그레스 바가 0에서 목표까지 채워지는 애니메이션
 * @param {number} targetPct - 목표 퍼센트 (0~100)
 * @param {number} delay - 시작 딜레이 (ms), 기본 300
 */
export function useProgressAnimate(targetPct, delay = 300) {
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setWidth(targetPct), delay);
    return () => clearTimeout(t);
  }, [targetPct, delay]);

  return width;
}

/**
 * useAutoRefresh — 주기적으로 tick을 증가시켜 데이터 갱신 시뮬레이션
 * @param {number} interval - 갱신 간격 (ms), 기본 5000
 */
export function useAutoRefresh(interval = 5000) {
  const [tick, setTick] = useState(0);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => {
      setTick((v) => v + 1);
      setLastUpdated(new Date());
    }, interval);
    return () => clearInterval(t);
  }, [interval]);

  const timeStr = lastUpdated.toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  return { tick, lastUpdated: timeStr };
}

/**
 * useBarAnimate — 바 차트의 각 바가 순차적으로 올라오는 애니메이션
 * @param {number[]} values - 각 바의 목표 높이 (0~100 pct)
 * @param {number} staggerDelay - 각 바 간 딜레이 (ms), 기본 60
 */
export function useBarAnimate(values, staggerDelay = 60) {
  const [heights, setHeights] = useState(values.map(() => 0));

  useEffect(() => {
    const timeouts = values.map((v, i) =>
      setTimeout(
        () => {
          setHeights((prev) => {
            const next = [...prev];
            next[i] = v;
            return next;
          });
        },
        i * staggerDelay + 200,
      ),
    );
    return () => timeouts.forEach(clearTimeout);
  }, [values.join(","), staggerDelay]);

  return heights;
}

/**
 * Shared CSS animations to inject into pages
 */
export const SHARED_ANIM_STYLES = `
  /* Refresh spin */
  @keyframes anim-spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  .anim-spin { animation: anim-spin 0.8s cubic-bezier(0.4,0,0.2,1); }

  /* Stagger fade-in from below */
  .anim-stagger-item {
    opacity: 0;
    transform: translateY(16px);
    transition: opacity 0.45s cubic-bezier(0.16,1,0.3,1), transform 0.45s cubic-bezier(0.16,1,0.3,1);
  }
  .anim-stagger-item.visible {
    opacity: 1;
    transform: translateY(0);
  }

  /* Scale pop-in for stat cards */
  .anim-pop {
    opacity: 0;
    transform: scale(0.92);
    transition: opacity 0.4s cubic-bezier(0.16,1,0.3,1), transform 0.5s cubic-bezier(0.34,1.56,0.64,1);
  }
  .anim-pop.visible {
    opacity: 1;
    transform: scale(1);
  }

  /* Shimmer effect for live data */
  @keyframes anim-shimmer {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }
  .anim-shimmer {
    background: linear-gradient(90deg, transparent 25%, rgba(26,79,214,0.06) 50%, transparent 75%);
    background-size: 200% 100%;
    animation: anim-shimmer 2.5s infinite;
  }

  /* Pulse glow for live elements */
  @keyframes anim-glow {
    0%, 100% { box-shadow: 0 0 0 0 rgba(239,68,68,0.15); }
    50% { box-shadow: 0 0 0 8px rgba(239,68,68,0); }
  }
  .anim-glow { animation: anim-glow 2s ease-in-out infinite; }

  /* Bar grow */
  .anim-bar-grow {
    transition: height 0.6s cubic-bezier(0.16,1,0.3,1), width 0.6s cubic-bezier(0.16,1,0.3,1);
  }

  /* Progress fill */
  .anim-progress-fill {
    transition: width 0.8s cubic-bezier(0.16,1,0.3,1);
  }

  /* Refresh button */
  .anim-refresh-btn {
    transition: all 0.15s;
  }
  .anim-refresh-btn:hover {
    border-color: #90C450;
    color: #90C450;
    background: #f5f8ff;
  }
  .anim-refresh-btn:active {
    transform: scale(0.95);
  }

  /* Timestamp update flash */
  @keyframes anim-flash {
    0% { color: #90C450; }
    100% { color: #9ca3af; }
  }
  .anim-flash { animation: anim-flash 1s ease; }

  /* Slide in from right (for timeline items) */
  .anim-slide-right {
    opacity: 0;
    transform: translateX(20px);
    transition: opacity 0.35s ease, transform 0.35s cubic-bezier(0.16,1,0.3,1);
  }
  .anim-slide-right.visible {
    opacity: 1;
    transform: translateX(0);
  }
`;
