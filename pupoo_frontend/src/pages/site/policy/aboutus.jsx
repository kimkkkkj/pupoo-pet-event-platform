import { useEffect, useRef, useState } from "react";

const FONT = "'JeonjuCraftGothic', Pretendard, 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif";

/* ── scroll reveal hook ── */
function useReveal(threshold = 0.15) {
  const ref = useRef(null);
  const [ratio, setRatio] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        setRatio(e.intersectionRatio);
        if (e.isIntersecting) setVisible(true);
      },
      { threshold: [0, 0.1, 0.2, 0.3, 0.5, 0.7, 1] },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);

  return { ref, ratio, visible };
}

/* ── parallax scroll hook ── */
function useParallax(speed = 0.3) {
  const ref = useRef(null);
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      if (!ref.current) return;
      const rect = ref.current.getBoundingClientRect();
      const center = rect.top + rect.height / 2 - window.innerHeight / 2;
      setOffset(center * speed);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [speed]);

  return { ref, offset };
}

/* ── Reveal wrapper ── */
function Reveal({ children, delay = 0, y = 60, style = {} }) {
  const { ref, visible } = useReveal();
  return (
    <div
      ref={ref}
      style={{
        ...style,
        opacity: visible ? 1 : 0,
        transform: visible ? "translate3d(0,0,0)" : `translate3d(0,${y}px,0)`,
        transition: `opacity 0.8s cubic-bezier(0.25,1,0.5,1) ${delay}s, transform 1s cubic-bezier(0.25,1,0.5,1) ${delay}s`,
      }}
    >
      {children}
    </div>
  );
}

/* ── Scale-in image ── */
function ScaleImage({ src, alt, style = {} }) {
  const { ref, visible } = useReveal(0.1);
  return (
    <div
      ref={ref}
      style={{
        overflow: "hidden",
        borderRadius: 24,
        ...style,
      }}
    >
      <img
        src={src}
        alt={alt || ""}
        style={{
          width: "100%",
          display: "block",
          transform: visible ? "scale(1)" : "scale(1.08)",
          opacity: visible ? 1 : 0,
          transition: "transform 1.4s cubic-bezier(0.25,1,0.5,1), opacity 0.8s ease",
        }}
      />
    </div>
  );
}

/* ── Counter animation ── */
function Counter({ end, suffix = "", duration = 2000 }) {
  const { ref, visible } = useReveal();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!visible) return;
    let start = 0;
    const startTime = Date.now();
    const tick = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * end));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [visible, end, duration]);

  return (
    <span ref={ref}>
      {count.toLocaleString()}{suffix}
    </span>
  );
}

const css = `
.au-root {
  background: #000;
  color: #fff;
  font-family: ${FONT};
  overflow-x: hidden;
}

/* ── 히어로 ── */
.au-hero {
  position: relative;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  overflow: hidden;
}
.au-hero-bg {
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse 80% 60% at 50% 40%, #1a1a3e 0%, #000 100%);
}
.au-hero-glow {
  position: absolute;
  width: 600px;
  height: 600px;
  border-radius: 50%;
  filter: blur(120px);
  opacity: 0.3;
  animation: au-glow-pulse 6s ease-in-out infinite alternate;
}
@keyframes au-glow-pulse {
  0% { transform: scale(1); opacity: 0.2; }
  100% { transform: scale(1.3); opacity: 0.4; }
}
.au-hero-content {
  position: relative;
  z-index: 1;
  padding: 40px;
}
.au-hero-kicker {
  font-size: 15px;
  font-weight: 500;
  color: rgba(255,255,255,0.5);
  letter-spacing: 0.15em;
  text-transform: uppercase;
  margin-bottom: 24px;
}
.au-hero-title {
  font-size: clamp(48px, 8vw, 96px);
  font-weight: 900;
  letter-spacing: -0.04em;
  line-height: 1.05;
  margin: 0 0 28px;
  background: linear-gradient(180deg, #fff 30%, rgba(255,255,255,0.6) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
.au-hero-sub {
  font-size: clamp(18px, 2.5vw, 24px);
  font-weight: 400;
  color: rgba(255,255,255,0.5);
  line-height: 1.6;
  max-width: 600px;
  margin: 0 auto;
}
.au-scroll-hint {
  position: absolute;
  bottom: 40px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  color: rgba(255,255,255,0.7);
  font-size: 11px;
  letter-spacing: 0.1em;
}
.au-scroll-mouse {
  width: 22px;
  height: 36px;
  border-radius: 11px;
  border: 2px solid rgba(255,255,255,0.7);
  position: relative;
}
.au-scroll-mouse::after {
  content: '';
  position: absolute;
  top: 6px;
  left: 50%;
  transform: translateX(-50%);
  width: 3px;
  height: 8px;
  border-radius: 2px;
  background: rgba(255,255,255,0.8);
  animation: au-scroll-wheel 2s ease-in-out infinite;
}
@keyframes au-scroll-wheel {
  0% { opacity: 1; transform: translateX(-50%) translateY(0); }
  100% { opacity: 0; transform: translateX(-50%) translateY(12px); }
}
.au-scroll-line {
  width: 1px;
  height: 40px;
  background: linear-gradient(180deg, rgba(255,255,255,0.7), transparent);
  animation: au-scroll-anim 2s ease-in-out infinite;
}
@keyframes au-scroll-anim {
  0% { transform: scaleY(0); transform-origin: top; }
  50% { transform: scaleY(1); transform-origin: top; }
  50.01% { transform-origin: bottom; }
  100% { transform: scaleY(0); transform-origin: bottom; }
}

/* ── 미션 섹션 (어두운 배경, 큰 텍스트) ── */
.au-mission {
  padding: 160px 40px;
  text-align: center;
  background: #000;
  max-width: 1400px;
  margin: 0 auto;
}
.au-mission-text {
  font-size: clamp(28px, 4.5vw, 54px);
  font-weight: 800;
  letter-spacing: -0.03em;
  line-height: 1.35;
  max-width: 900px;
  margin: 0 auto;
  color: rgba(255,255,255,0.9);
}
.au-mission-text em {
  font-style: normal;
  background: linear-gradient(90deg, #2F55FF, #00B894);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

/* ── 풀폭 이미지 섹션 ── */
.au-fullimg {
  position: relative;
  max-width: 1400px;
  margin: 0 auto;
  overflow: hidden;
}
.au-fullimg img {
  width: 100%;
  display: block;
}

/* ── 숫자 섹션 ── */
.au-stats {
  padding: 140px 40px;
  background: #0a0a0a;
}
.au-stats-inner {
  max-width: 1400px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 60px;
  text-align: center;
}
.au-stat-num {
  font-size: clamp(42px, 6vw, 72px);
  font-weight: 900;
  letter-spacing: -0.03em;
  background: linear-gradient(135deg, #2F55FF, #00B894);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: 12px;
}
.au-stat-label {
  font-size: 16px;
  font-weight: 500;
  color: rgba(255,255,255,0.5);
}

/* ── 텍스트 + 이미지 가로 섹션 ── */
.au-split {
  display: grid;
  grid-template-columns: 1fr 1fr;
  min-height: 100vh;
  align-items: center;
  max-width: 1400px;
  margin: 0 auto;
}
.au-split-text {
  padding: 80px 60px 80px 80px;
}
.au-split-img {
  height: 100%;
  overflow: hidden;
  position: relative;
}
.au-split-img img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.au-split-kicker {
  font-size: 13px;
  font-weight: 700;
  color: rgba(255,255,255,0.35);
  letter-spacing: 0.15em;
  text-transform: uppercase;
  margin-bottom: 20px;
}
.au-split-title {
  font-size: clamp(32px, 3.5vw, 48px);
  font-weight: 900;
  letter-spacing: -0.03em;
  line-height: 1.2;
  margin: 0 0 24px;
}
.au-split-desc {
  font-size: 18px;
  font-weight: 400;
  color: rgba(255,255,255,0.55);
  line-height: 1.85;
  max-width: 480px;
}

/* ── 가치 카드 섹션 ── */
.au-values {
  padding: 160px 40px;
  background: #fff;
  color: #111;
}
.au-values-header {
  text-align: center;
  margin-bottom: 80px;
}
.au-values-kicker {
  font-size: 13px;
  font-weight: 700;
  color: #aaa;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  margin-bottom: 16px;
}
.au-values-title {
  font-size: clamp(32px, 4vw, 52px);
  font-weight: 900;
  letter-spacing: -0.03em;
  margin: 0;
}
.au-values-grid {
  max-width: 1400px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
}
.au-value-card {
  background: #f8f8f8;
  border-radius: 24px;
  padding: 48px 36px;
  text-align: center;
  transition: transform 0.4s ease, box-shadow 0.4s ease;
}
.au-value-card:hover {
  transform: translateY(-8px);
  box-shadow: 0 20px 60px rgba(0,0,0,0.08);
}
.au-value-emoji {
  font-size: 44px;
  margin-bottom: 24px;
  display: block;
}
.au-value-name {
  font-size: 22px;
  font-weight: 800;
  margin-bottom: 12px;
  letter-spacing: -0.02em;
}
.au-value-desc {
  font-size: 15px;
  font-weight: 400;
  color: #888;
  line-height: 1.75;
}

/* ── CTA 섹션 ── */
.au-cta {
  padding: 160px 40px;
  text-align: center;
  background: #000;
  position: relative;
  overflow: hidden;
}
.au-cta-bg {
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse 60% 50% at 50% 50%, rgba(47,85,255,0.15) 0%, transparent 70%);
}
.au-cta-title {
  position: relative;
  font-size: clamp(36px, 5vw, 64px);
  font-weight: 900;
  letter-spacing: -0.03em;
  line-height: 1.2;
  margin: 0 0 28px;
}
.au-cta-desc {
  position: relative;
  font-size: 18px;
  color: rgba(255,255,255,0.5);
  margin: 0 0 40px;
  line-height: 1.6;
}
.au-cta-btn {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 18px 40px;
  border-radius: 999px;
  border: none;
  background: #fff;
  color: #000;
  font-size: 17px;
  font-weight: 800;
  font-family: ${FONT};
  cursor: pointer;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}
.au-cta-btn:hover {
  transform: scale(1.05);
  box-shadow: 0 12px 40px rgba(255,255,255,0.15);
}

.au-mob-br { display: none; }
@media (max-width: 768px) {
  .au-mob-br { display: inline; }
  .au-timeline-grid { grid-template-columns: 1fr !important; gap: 16px !important; }
  .au-stats-inner { grid-template-columns: 1fr; gap: 40px; }
  .au-split { grid-template-columns: 1fr; }
  .au-split-text { padding: 60px 24px; text-align: center; }
  .au-split-desc { margin: 0 auto; }
  .au-split-img { height: auto; min-height: 0; }
  .au-split-img > div { padding: 28px 16px !important; }
  .au-split-img > div > div { gap: 16px !important; }
  .au-split-img .au-mock-card { padding: 22px 18px !important; border-radius: 14px !important; }
  .au-split-img .au-mock-title { font-size: 15px !important; margin-bottom: 16px !important; }
  .au-split-img .au-mock-num { font-size: 28px !important; }
  .au-split-img .au-mock-label { font-size: 12px !important; }
  .au-split-img .au-mock-flow { overflow-x: auto; flex-wrap: nowrap !important; gap: 6px !important; padding-bottom: 4px; }
  .au-split-img .au-mock-pill { padding: 8px 14px !important; font-size: 13px !important; }
  .au-split-img .au-mock-bar-wrap { height: 80px !important; gap: 6px !important; }
  .au-split-img .au-mock-bar-label { font-size: 11px !important; }
  .au-split-img .au-mock-noti { padding: 12px 14px !important; border-radius: 10px !important; gap: 10px !important; }
  .au-split-img .au-mock-noti-emoji { font-size: 20px !important; }
  .au-split-img .au-mock-noti-text { font-size: 13px !important; }
  .au-split-img .au-mock-noti-time { font-size: 11px !important; }
  .au-split-img .au-mock-live-label { font-size: 14px !important; }
  .au-split-img .au-mock-live-update { font-size: 12px !important; }
  .au-split-img .au-mock-row-label { font-size: 13px !important; }
  .au-split-img .au-mock-row-value { font-size: 13px !important; }
  .au-values-grid { grid-template-columns: 1fr; }
  .au-mission { padding: 100px 24px; }
  .au-values { padding: 100px 24px; }
  .au-cta { padding: 100px 24px; }
  .au-feature-section { padding: 0 16px !important; }
  .au-feature-grid { grid-template-columns: 1fr 1fr !important; gap: 12px !important; padding: 40px 24px !important; }
  .au-feature-item { padding: 28px 20px !important; }
}
@media (max-width: 480px) {
  .au-hero-content { padding: 24px 20px !important; }
  .au-hero-title { letter-spacing: -0.02em !important; line-height: 1.2 !important; }
  .au-mission { padding: 60px 20px; }
  .au-feature-grid { grid-template-columns: 1fr !important; }
  .au-stats { padding: 80px 20px; }
  .au-values { padding: 60px 20px; }
  .au-cta { padding: 60px 20px; }
  .au-split-text { padding: 40px 20px; }
  .au-cta-btn { padding: 14px 28px; font-size: 15px; }
}
`;

export default function AboutUs() {
  return (
    <div className="au-root">
      <style>{css}</style>

      {/* ══════ HERO ══════ */}
      <section className="au-hero">
        <div className="au-hero-bg" />
        <div className="au-hero-glow" style={{ top: "10%", left: "20%", background: "#2F55FF" }} />
        <div className="au-hero-glow" style={{ bottom: "10%", right: "20%", background: "#00B894" }} />
        <div className="au-hero-content">
          <Reveal>
            <div className="au-hero-kicker">About Pupoo</div>
          </Reveal>
          <Reveal delay={0.15}>
            <h1 className="au-hero-title">
              모든 행사를<br />하나로 잇다.
            </h1>
          </Reveal>
          <Reveal delay={0.3}>
            <p className="au-hero-sub">
              기획부터 현장까지,<br />단절 없는 행사 경험을 만들어갑니다.
            </p>
          </Reveal>
        </div>
        <div className="au-scroll-hint">
          <div className="au-scroll-mouse" />
          <span>SCROLL</span>
          <div className="au-scroll-line" />
        </div>
      </section>

      {/* ══════ MISSION ══════ */}
      <section className="au-mission">
        <Reveal>
          <p className="au-mission-text">
            우리는 <em>행사의 모든 순간</em>이<br />
            자연스럽게 연결되는<br />세상을 만듭니다.
          </p>
        </Reveal>
      </section>

      {/* ══════ FEATURE VISUAL ══════ */}
      <section className="au-feature-section" style={{ background: "#000", padding: "0 40px" }}>
        <Reveal>
          <div className="au-feature-grid" style={{
            maxWidth: 1400, margin: "0 auto", borderRadius: 32, overflow: "hidden",
            background: "linear-gradient(135deg, #0d1b3e 0%, #1a1a2e 40%, #0f3460 100%)",
            padding: "80px 60px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20,
          }}>
            {[
              { icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4", label: "참가 신청", sub: "원클릭 행사 등록" },
              { icon: "M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z", label: "간편 결제", sub: "안전한 통합 결제" },
              { icon: "M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z", label: "QR 체크인", sub: "빠른 현장 입장" },
              { icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z", label: "실시간 현황", sub: "라이브 대시보드" },
              { icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z", label: "커뮤니티", sub: "참가자 소통 공간" },
              { icon: "M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z", label: "갤러리", sub: "행사 사진 아카이브" },
            ].map((item, i) => (
              <div key={i} className="au-feature-item" style={{
                background: "rgba(255,255,255,0.05)", borderRadius: 20, padding: "44px 32px",
                border: "1px solid rgba(255,255,255,0.08)", transition: "background 0.3s, transform 0.3s",
                textAlign: "center",
              }}
                onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.1)"; e.currentTarget.style.transform = "translateY(-4px)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; e.currentTarget.style.transform = "translateY(0)"; }}
              >
                <div style={{
                  width: 64, height: 64, borderRadius: 18, margin: "0 auto 24px",
                  background: "rgba(47,85,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="url(#au-grad)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <defs><linearGradient id="au-grad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#2F55FF" /><stop offset="100%" stopColor="#00B894" /></linearGradient></defs>
                    <path d={item.icon} />
                  </svg>
                </div>
                <div style={{ fontSize: 20, fontWeight: 800, color: "#fff", marginBottom: 10, letterSpacing: "-0.01em" }}>{item.label}</div>
                <div style={{ fontSize: 15, color: "rgba(255,255,255,0.5)", fontWeight: 400, lineHeight: 1.5 }}>{item.sub}</div>
              </div>
            ))}
          </div>
        </Reveal>
      </section>

      {/* ══════ STATS ══════ */}
      <section className="au-stats">
        <div className="au-stats-inner">
          <Reveal delay={0}>
            <div className="au-stat-num"><Counter end={500} suffix="+" /></div>
            <div className="au-stat-label">누적 행사 운영</div>
          </Reveal>
          <Reveal delay={0.1}>
            <div className="au-stat-num"><Counter end={50000} suffix="+" /></div>
            <div className="au-stat-label">참가자 수</div>
          </Reveal>
          <Reveal delay={0.2}>
            <div className="au-stat-num"><Counter end={99} suffix="%" /></div>
            <div className="au-stat-label">고객 만족도</div>
          </Reveal>
        </div>
      </section>

      {/* ══════ SPLIT 1 — 통합 플랫폼 ══════ */}
      <section className="au-split" style={{ background: "#111" }}>
        <div className="au-split-text">
          <Reveal>
            <div className="au-split-kicker">Integrated Platform</div>
            <h2 className="au-split-title">하나의 플랫폼,<br />끊김 없는 경험.</h2>
            <p className="au-split-desc">
              행사 기획, 참가 신청, 결제,<br className="au-mob-br" />QR 체크인, 실시간 현황, 커뮤니티까지.<br className="au-mob-br" />
              분산되어 있던 모든 프로세스를<br className="au-mob-br" />하나로 통합했습니다.<br className="au-mob-br" />
              더 이상 여러 도구를 오갈 필요가 없습니다.
            </p>
          </Reveal>
        </div>
        <div className="au-split-img" style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 48 }}>
          <Reveal>
            <div style={{ display: "flex", flexDirection: "column", gap: 24, width: "100%" }}>
              {/* 대시보드 목업 */}
              <div className="au-mock-card" style={{ background: "rgba(255,255,255,0.06)", borderRadius: 20, padding: "28px 32px", border: "1px solid rgba(255,255,255,0.08)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
                  <div className="au-mock-title" style={{ fontSize: 20, fontWeight: 700, color: "rgba(255,255,255,0.6)" }}>행사 현황</div>
                  <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#3a4520", boxShadow: "0 0 12px #3a4520" }} />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20 }}>
                  {[{ n: "128", l: "신청" }, { n: "96", l: "승인" }, { n: "84", l: "체크인" }].map((d, i) => (
                    <div key={i} style={{ textAlign: "center" }}>
                      <div className="au-mock-num" style={{ fontSize: 42, fontWeight: 900, background: "linear-gradient(135deg, #2F55FF, #00B894)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{d.n}</div>
                      <div className="au-mock-label" style={{ fontSize: 16, color: "rgba(255,255,255,0.35)", marginTop: 6 }}>{d.l}</div>
                    </div>
                  ))}
                </div>
              </div>
              {/* 프로세스 플로우 */}
              <div className="au-mock-flow" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
                {["기획", "신청", "결제", "체크인", "후기"].map((step, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                    <div className="au-mock-pill" style={{
                      padding: "10px 20px", borderRadius: 999, fontSize: 16, fontWeight: 700,
                      background: i === 0 ? "rgba(47,85,255,0.25)" : "rgba(255,255,255,0.06)",
                      color: i === 0 ? "#5b8aff" : "rgba(255,255,255,0.4)",
                      border: `1px solid ${i === 0 ? "rgba(47,85,255,0.3)" : "rgba(255,255,255,0.08)"}`,
                    }}>{step}</div>
                    {i < 4 && <span style={{ color: "rgba(255,255,255,0.15)", fontSize: 14 }}>→</span>}
                  </div>
                ))}
              </div>
              {/* 바 차트 */}
              <div className="au-mock-card" style={{ background: "rgba(255,255,255,0.06)", borderRadius: 20, padding: "28px 32px", border: "1px solid rgba(255,255,255,0.08)" }}>
                <div className="au-mock-title" style={{ fontSize: 20, fontWeight: 700, color: "rgba(255,255,255,0.6)", marginBottom: 24 }}>주간 참가율</div>
                <div className="au-mock-bar-wrap" style={{ display: "flex", alignItems: "flex-end", gap: 10, height: 120 }}>
                  {[45, 62, 78, 55, 90, 72, 85].map((h, i) => (
                    <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                      <div style={{
                        width: "100%", height: h * 1.2, borderRadius: 8,
                        background: i === 4 ? "linear-gradient(180deg, #2F55FF, #00B894)" : "rgba(255,255,255,0.08)",
                        transition: "height 0.6s ease",
                      }} />
                      <span className="au-mock-bar-label" style={{ fontSize: 13, color: "rgba(255,255,255,0.25)" }}>{["월","화","수","목","금","토","일"][i]}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ══════ SPLIT 2 — 실시간 (reversed) ══════ */}
      <section className="au-split" style={{ background: "#0a0a0a" }}>
        <div className="au-split-img" style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 48 }}>
          <Reveal>
            <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 24 }}>
              {/* 라이브 상태 카드 */}
              <div className="au-mock-card" style={{ background: "rgba(255,255,255,0.06)", borderRadius: 20, padding: "28px 32px", border: "1px solid rgba(255,255,255,0.08)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
                  <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#ef4444", animation: "au-glow-pulse 1.5s ease-in-out infinite" }} />
                  <span className="au-mock-live-label" style={{ fontSize: 20, fontWeight: 700, color: "#ef4444" }}>LIVE</span>
                  <span className="au-mock-live-update" style={{ fontSize: 16, color: "rgba(255,255,255,0.35)", marginLeft: "auto" }}>업데이트 2초 전</span>
                </div>
                {[
                  { label: "체크인", value: "847 / 1,200", pct: 70, color: "#2F55FF" },
                  { label: "대기열", value: "23명 대기중", pct: 19, color: "#f59e0b" },
                  { label: "만족도", value: "4.8 / 5.0", pct: 96, color: "#3a4520" },
                ].map((row, i) => (
                  <div key={i} style={{ marginBottom: i < 2 ? 20 : 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                      <span className="au-mock-row-label" style={{ fontSize: 17, color: "rgba(255,255,255,0.5)" }}>{row.label}</span>
                      <span className="au-mock-row-value" style={{ fontSize: 17, fontWeight: 700, color: "rgba(255,255,255,0.8)" }}>{row.value}</span>
                    </div>
                    <div style={{ height: 10, borderRadius: 5, background: "rgba(255,255,255,0.06)" }}>
                      <div style={{ height: "100%", borderRadius: 5, width: `${row.pct}%`, background: row.color, transition: "width 1s ease" }} />
                    </div>
                  </div>
                ))}
              </div>
              {/* 실시간 알림 */}
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {[
                  { emoji: "✅", text: "김민수님\n체크인 완료", time: "방금 전" },
                  { emoji: "🎟️", text: "신규 참가\n신청 3건", time: "1분 전" },
                  { emoji: "📊", text: "투표 결과\n업데이트", time: "3분 전" },
                ].map((noti, i) => (
                  <div key={i} className="au-mock-noti" style={{
                    display: "flex", alignItems: "center", gap: 16,
                    background: "rgba(255,255,255,0.04)", borderRadius: 14, padding: "16px 20px",
                    border: "1px solid rgba(255,255,255,0.06)",
                  }}>
                    <span className="au-mock-noti-emoji" style={{ fontSize: 26 }}>{noti.emoji}</span>
                    <span className="au-mock-noti-text" style={{ fontSize: 17, color: "rgba(255,255,255,0.6)", flex: 1 }}>{noti.text}</span>
                    <span className="au-mock-noti-time" style={{ fontSize: 14, color: "rgba(255,255,255,0.25)" }}>{noti.time}</span>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
        <div className="au-split-text">
          <Reveal>
            <div className="au-split-kicker">Real-time Dashboard</div>
            <h2 className="au-split-title">현장의 모든 것을<br />실시간으로.</h2>
            <p className="au-split-desc">
              체크인 현황, 대기 상태, 투표 결과까지 실시간으로 확인하세요.
              데이터 기반의 의사결정으로 행사 운영의 질을 높입니다.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ══════ VALUES ══════ */}
      <section className="au-values">
        <div className="au-values-header">
          <Reveal>
            <div className="au-values-kicker">Our Values</div>
            <h2 className="au-values-title">우리가 믿는 가치</h2>
          </Reveal>
        </div>
        <div className="au-values-grid">
          {[
            {
              icon: "M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1",
              color: "#2F55FF", bg: "#eff2ff",
              name: "연결", desc: "기획자, 참가자, 현장 스태프 모두가 하나의 흐름 안에서 소통합니다. 정보의 단절 없이 모든 과정이 자연스럽게 이어집니다.",
            },
            {
              icon: "M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z",
              color: "#f59e0b", bg: "#fffbeb",
              name: "단순함", desc: "복잡한 행사 운영을 직관적인 인터페이스로 단순화합니다. 누구나 쉽게 사용할 수 있는 경험을 추구합니다.",
            },
            {
              icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z",
              color: "#3a4520", bg: "#ecfdf5",
              name: "신뢰", desc: "안정적인 시스템과 투명한 데이터로 신뢰를 쌓습니다. 결제, 개인정보, 운영 데이터 모두 안전하게 보호됩니다.",
            },
          ].map((v, i) => (
            <Reveal key={i} delay={i * 0.1}>
              <div className="au-value-card">
                <div style={{
                  width: 56, height: 56, borderRadius: 16, background: v.bg,
                  display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 24, margin: "0 auto 24px",
                }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={v.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d={v.icon} />
                  </svg>
                </div>
                <div className="au-value-name">{v.name}</div>
                <div className="au-value-desc">{v.desc}</div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ══════ 타임라인 섹션 ══════ */}
      <section style={{ background: "#000", padding: "120px 40px" }}>
        <div style={{ maxWidth: 1400, margin: "0 auto" }}>
          <Reveal>
            <div style={{ textAlign: "center", marginBottom: 80 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.35)", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 16 }}>How It Works</div>
              <h2 style={{ fontSize: "clamp(32px, 4vw, 48px)", fontWeight: 900, letterSpacing: "-0.03em", margin: 0, color: "#fff" }}>처음부터<br className="au-mob-br" /> 끝까지</h2>
            </div>
          </Reveal>
          <div className="au-timeline-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 24 }}>
            {[
              { step: "01", icon: "📋", title: "행사 기획", desc: "행사 정보를 등록하고\n프로그램을 구성합니다." },
              { step: "02", icon: "🎫", title: "참가 신청", desc: "참가자가 온라인으로 간편하게 신청합니다." },
              { step: "03", icon: "📱", title: "현장 운영", desc: "QR 체크인과 실시간 현황을 관리합니다." },
              { step: "04", icon: "💬", title: "소통 & 후기", desc: "커뮤니티에서 후기를 공유하고 소통합니다." },
            ].map((item, i) => (
              <Reveal key={i} delay={i * 0.1}>
                <div style={{
                  background: "rgba(255,255,255,0.04)", borderRadius: 24, padding: "40px 28px",
                  border: "1px solid rgba(255,255,255,0.06)", textAlign: "center",
                  transition: "background 0.3s, transform 0.3s", cursor: "default",
                }}
                  onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.08)"; e.currentTarget.style.transform = "translateY(-6px)"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.transform = "translateY(0)"; }}
                >
                  <div style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.2)", letterSpacing: "0.1em", marginBottom: 16 }}>{item.step}</div>
                  <div style={{ fontSize: 48, marginBottom: 20 }}>{item.icon}</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: "#fff", marginBottom: 10 }}>{item.title}</div>
                  <div style={{ fontSize: 14, color: "rgba(255,255,255,0.4)", lineHeight: 1.65, whiteSpace: "pre-line" }}>{item.desc}</div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ══════ CTA ══════ */}
      <section className="au-cta">
        <div className="au-cta-bg" />
        <Reveal>
          <h2 className="au-cta-title">
            함께 만들어갈<br />다음 행사가<br className="au-mob-br" /> 기대됩니다.
          </h2>
          <p className="au-cta-desc">
            Pupoo와 함께 더 나은<br className="au-mob-br" /> 행사 경험을 시작하세요.
          </p>
          <a href="/registration/apply" style={{ textDecoration: "none" }}>
            <button className="au-cta-btn" type="button">
              시작하기
              <span style={{ fontSize: 20 }}>→</span>
            </button>
          </a>
        </Reveal>
      </section>
    </div>
  );
}
