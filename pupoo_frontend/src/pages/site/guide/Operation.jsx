import { useEffect, useRef, useState, useCallback } from "react";
import { toPublicAssetUrl } from "../../../shared/utils/publicAssetUrl";

function useReveal(th = 0.1) {
  const ref = useRef(null);
  const [v, setV] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const o = new IntersectionObserver(([e]) => { if (e.isIntersecting) setV(true); }, { threshold: th });
    o.observe(el);
    return () => o.disconnect();
  }, [th]);
  return { ref, v };
}

function F({ children, delay = 0 }) {
  const { ref, v } = useReveal();
  return (
    <div ref={ref} style={{
      opacity: v ? 1 : 0, transform: v ? "none" : "translateY(40px)",
      transition: `opacity .9s ease ${delay}s, transform .9s ease ${delay}s`,
    }}>{children}</div>
  );
}

/* Horizontal scroll gallery: vertical scroll → horizontal translateX
   outer has tall height so page scrolls through it.
   inner is sticky (pinned to viewport). translateX moves the track. */
function HScrollGallery({ images }) {
  const outerRef = useRef(null);
  const trackRef = useRef(null);
  const rafRef = useRef(null);
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== "undefined" && window.innerWidth <= 734,
  );

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 734);
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    if (isMobile) return;
    const update = () => {
      const outer = outerRef.current;
      const track = trackRef.current;
      if (!outer || !track) return;
      const rect = outer.getBoundingClientRect();
      const scrollRange = outer.offsetHeight - window.innerHeight;
      if (scrollRange <= 0) return;
      const progress = Math.min(Math.max(-rect.top / scrollRange, 0), 1);
      const maxShift = track.scrollWidth - window.innerWidth;
      track.style.transform = `translateX(${-progress * Math.max(maxShift, 0)}px)`;
    };
    const onScroll = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(update);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    update();
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isMobile]);

  if (isMobile) {
    return (
      <div style={{ padding: "0 0 40px" }}>
        <div style={{
          display: "flex", gap: 14, overflowX: "auto",
          scrollSnapType: "x mandatory", scrollbarWidth: "none",
          padding: "0 20px 8px", WebkitOverflowScrolling: "touch",
        }}>
          {images.map((img, i) => (
            <div key={i} style={{ flex: "0 0 78vw", scrollSnapAlign: "start" }}>
              <div style={{
                width: "100%", height: 220, borderRadius: 16,
                background: img.bg || "#1a1a2e", display: "flex", alignItems: "center",
                justifyContent: "center", fontSize: 14, color: "rgba(255,255,255,0.7)",
                fontWeight: 600, overflow: "hidden", position: "relative",
              }}>
                {img.img && <img src={img.img} alt={img.label || ""} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />}
                {img.label && <span style={{ position: "relative", zIndex: 1 }}>{img.label}</span>}
              </div>
              {img.caption && (
                <div style={{ marginTop: 10, fontSize: 13, color: "#86868b", lineHeight: 1.6, paddingRight: 8 }}>
                  {img.caption}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  const totalCards = images.length;
  const outerH = `${100 + totalCards * 18}vh`;

  return (
    <div ref={outerRef} className="op-hscroll-outer" style={{ height: outerH }}>
      <div className="op-hscroll-sticky">
        <div ref={trackRef} className="op-hscroll-track">
          {images.map((img, i) => (
            <div key={i} className="op-hscroll-card">
              <div className="op-hscroll-img" style={{ background: img.bg || "#1a1a2e", position: "relative" }}>
                {img.img && <img src={img.img} alt={img.label || ""} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />}
                {img.label && <span style={{ position: "relative", zIndex: 1 }}>{img.label}</span>}
              </div>
              {img.caption && <div className="op-hscroll-caption">{img.caption}</div>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const css = `
.op{color:#1d1d1f;margin-top:80px;font-family:inherit;overflow-x:clip}

/* ── HERO (video bg) ── */
.op-hero{
  min-height:100vh;display:flex;flex-direction:column;
  align-items:center;justify-content:center;text-align:center;
  padding:120px 24px;
  position:relative;overflow:hidden;
  background:#000;
}
.op-hero-video{
  position:absolute;inset:0;width:100%;height:100%;
  object-fit:cover;z-index:0;opacity:.42;
}
.op-hero-overlay{
  position:absolute;inset:0;z-index:1;
  background:linear-gradient(180deg, rgba(0,0,0,.42) 0%, rgba(0,0,0,.62) 100%);
}
.op-hero>*:not(.op-hero-video):not(.op-hero-overlay){position:relative;z-index:2;}
.op-hero-over{
  font-size:17px;font-weight:600;color:rgba(255,255,255,.7);
  letter-spacing:-.01em;margin-bottom:16px;
}
.op-hero h1{
  font-size:clamp(60px,10vw,120px);font-weight:900;
  letter-spacing:-.04em;line-height:1.05;margin:0;
  color:#fff;
}
.op-hero p{
  font-size:clamp(17px,2vw,21px);font-weight:400;
  color:rgba(255,255,255,.6);line-height:1.5;margin:20px 0 0;
  max-width:500px;
}
.op-scroll-hint{
  margin-top:48px;display:flex;flex-direction:column;align-items:center;gap:8px;
}
.op-scroll-wheel{animation:op-wheel 1.6s ease infinite}
@keyframes op-wheel{0%{transform:translateY(0);opacity:1}60%{transform:translateY(10px);opacity:0}61%{transform:translateY(0);opacity:0}100%{transform:translateY(0);opacity:1}}

/* ── DARK SECTION ── */
.op-dark{
  background:#000;color:#f5f5f7;
}

/* ── HORIZONTAL SCROLL GALLERY ── */
.op-hscroll-outer{
  position:relative;
}
.op-hscroll-sticky{
  position:sticky;top:0;
  height:100vh;
  display:flex;align-items:center;
  overflow:hidden;
}
.op-hscroll-track{
  display:flex;gap:24px;
  padding:0 clamp(24px,5vw,80px);
  will-change:transform;
  transition:transform .15s cubic-bezier(.25,.1,.25,1);
}
.op-hscroll-card{
  flex-shrink:0;
  width:clamp(320px,42vw,620px);
}
.op-hscroll-img{
  width:100%;
  height:clamp(360px,48vw,560px);
  border-radius:20px;
  overflow:hidden;
  display:flex;align-items:center;justify-content:center;
  font-size:15px;color:#666;font-weight:500;
}
.op-hscroll-caption{
  margin-top:16px;
  font-size:clamp(13px,1.1vw,15px);
  color:#86868b;line-height:1.6;
  max-width:90%;
}

/* ── SECTION: text block on dark ── */
.op-section{
  max-width:980px;margin:0 auto;
  padding:clamp(100px,14vw,180px) clamp(24px,5vw,80px);
  text-align:center;
}
.op-section h2{
  font-size:clamp(48px,7vw,96px);font-weight:900;
  letter-spacing:-.04em;line-height:1.08;margin:0 0 24px;
  color:#f5f5f7;
}
.op-section .op-sub{
  font-size:clamp(15px,1.6vw,19px);font-weight:400;
  color:#86868b;line-height:1.7;margin:0 auto;
  max-width:600px;
}
.op-section .op-sub strong{color:#f5f5f7;font-weight:600}

/* ── STATS ROW ── */
.op-stats{
  max-width:980px;margin:0 auto;
  padding:0 clamp(24px,5vw,80px) clamp(80px,10vw,140px);
  display:flex;justify-content:center;gap:clamp(32px,6vw,80px);
  flex-wrap:wrap;
}
.op-stat{text-align:center}
.op-stat-label{
  font-size:13px;font-weight:500;color:#86868b;
  margin-bottom:8px;letter-spacing:.02em;
}
.op-stat-val{
  font-size:clamp(36px,5vw,64px);font-weight:900;
  letter-spacing:-.04em;color:#f5f5f7;line-height:1.1;
}
.op-stat-desc{
  font-size:clamp(13px,1.1vw,15px);font-weight:400;
  color:#86868b;line-height:1.5;margin-top:8px;
  max-width:200px;
}

/* ── STEPS (dark cards) ── */
.op-steps{
  max-width:1120px;margin:0 auto;
  padding:0 clamp(24px,5vw,80px) clamp(80px,10vw,140px);
  display:grid;grid-template-columns:1fr 1fr;gap:20px;
}
.op-step{
  background:#1d1d1f;border-radius:24px;
  padding:clamp(36px,4vw,52px) clamp(32px,3vw,44px);
}
.op-step-num{
  font-size:12px;font-weight:600;color:#86868b;
  letter-spacing:.08em;margin-bottom:16px;text-transform:uppercase;
}
.op-step-title{
  font-size:clamp(24px,2.8vw,36px);font-weight:800;
  letter-spacing:-.03em;color:#f5f5f7;margin-bottom:12px;
}
.op-step-desc{
  font-size:clamp(14px,1.2vw,17px);font-weight:400;
  color:#86868b;line-height:1.7;
}

/* ── RULES ── */
.op-rules{
  max-width:980px;margin:0 auto;
  padding:clamp(80px,10vw,160px) clamp(24px,5vw,80px);
}
.op-rules h2{
  font-size:clamp(40px,6vw,72px);font-weight:900;
  letter-spacing:-.04em;margin:0 0 clamp(40px,5vw,72px);
  color:#f5f5f7;text-align:center;
}
.op-rule{
  padding:clamp(20px,2.5vw,32px) 0;
  border-top:1px solid #333;
  display:flex;gap:clamp(20px,4vw,56px);align-items:baseline;
}
.op-rule:last-child{border-bottom:1px solid #333}
.op-rule-t{
  font-size:clamp(16px,1.4vw,21px);font-weight:700;
  color:#f5f5f7;min-width:clamp(120px,14vw,200px);flex-shrink:0;
}
.op-rule-d{
  font-size:clamp(14px,1.2vw,17px);font-weight:400;
  color:#86868b;line-height:1.7;
}

/* ── NOTICE ── */
.op-notice{
  max-width:980px;margin:0 auto;
  padding:0 clamp(24px,5vw,80px) clamp(100px,14vw,200px);
  text-align:center;
}
.op-notice p{
  font-size:clamp(14px,1.2vw,17px);font-weight:400;
  color:#555;line-height:1.8;max-width:500px;margin:0 auto;
}

@media(max-width:734px){
  .op-steps{grid-template-columns:1fr}
  .op-stats{gap:24px}
  .op-rule{flex-direction:column;gap:6px}
  .op-rule-t{min-width:0}
  .op-hscroll-card{width:80vw}
  .op-hero{padding:80px 20px}
  .op-hero h1{font-size:clamp(48px,12vw,80px)}
  .op-section{padding:60px 20px}
  .op-stats{padding:0 20px 64px}
  .op-steps{padding:0 16px 64px}
  .op-rules{padding:60px 20px}
  .op-rules h2{font-size:clamp(32px,8vw,56px);margin-bottom:32px}
  .op-notice{padding:0 20px 64px}
  .op-notice p{font-size:14px}
  .op-step{padding:28px 24px}
  .op-step-title{font-size:22px}
  .op-scroll-hint{margin-top:32px}
}
`;

const guideAsset = (fileName) => toPublicAssetUrl(`/uploads/guide/${fileName}`);
const GUIDE_VIDEO_SRC = guideAsset("guide.mp4");
const GUIDE_VIDEO_POSTER = guideAsset("guide-poster.jpg");

const GALLERY_1 = [
  { img: guideAsset("guide1.jpg"), caption: "QR 코드 하나로 빠르게 입장. 모바일과 출력물 모두 가능합니다." },
  { img: guideAsset("guide2.jpg"), caption: "등록증과 접종 증명서를 현장에서 빠르게 확인합니다." },
  { img: guideAsset("guide3.jpg"), caption: "다양한 부스와 프로그램에 자유롭게 참여하세요." },
  { img: guideAsset("guide4.jpg"), caption: "안전한 공간에서 반려동물과 함께 즐기세요." },
];

const GALLERY_2 = [
  { img: guideAsset("guide1-1.jpg"), caption: "목줄과 하네스 착용은 필수입니다." },
  { img: guideAsset("guide2-1.jpg"), caption: "응급 상황 대비 부스가 상시 운영됩니다." },
  { img: guideAsset("guide3-1.jpg"), caption: "배변 봉투 무료 제공. 깨끗한 현장을 함께 만들어요." },
];

const STEPS = [
  { title: "QR 코드 제시", desc: "발급된 QR을 게이트에서 보여주세요.\n모바일과 출력물 모두 가능합니다." },
  { title: "서류 확인", desc: "등록증과 접종 증명서를 확인합니다.\n미지참 시 입장이 불가합니다." },
  { title: "프로그램 참여", desc: "부스와 프로그램에 자유롭게 참여하세요.\n부스 지도는 현장에서 배부합니다." },
  { title: "매너 관람", desc: "배변 봉투를 무료 제공합니다.\n깨끗한 현장을 함께 만들어 주세요." },
];

const RULES = [
  { t: "동반 가능 동물", d: "개 · 고양이 · 소형 소동물 (케이지 지참)" },
  { t: "필수 서류", d: "예방접종 완료 증명서 · 미지참 시 입장 불가" },
  { t: "목줄 / 하네스", d: "행사장 내 항상 착용 필수" },
  { t: "금지 사항", d: "무단 접촉 · 무단 급여 · 구역 외 배변" },
  { t: "주차", d: "주차 공간 제한 · 대중교통 권장" },
  { t: "응급 처치", d: "응급 부스 상시 운영 · 안내 데스크 문의" },
];

export default function Operation() {
  const [guideReady, setGuideReady] = useState(false);

  return (
    <div className="op">
      <style>{css}</style>

      {/* ── HERO (video bg) ── */}
      <section className="op-hero">
        {!guideReady ? (
          <img className="op-hero-video" src={GUIDE_VIDEO_POSTER} alt="" aria-hidden="true" />
        ) : null}
        <video
          className="op-hero-video"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          onCanPlay={() => setGuideReady(true)}
          onPlaying={() => setGuideReady(true)}
        >
          <source src={GUIDE_VIDEO_SRC} type="video/mp4" />
        </video>
        <div className="op-hero-overlay" />
        <F>
          <div className="op-hero-over">현장 운영 안내</div>
          <h1>입장부터<br />퇴장까지</h1>
          <p>반려동물과 함께하는 행사,<br />알아야 할 모든 것을 준비했습니다.</p>
          <div className="op-scroll-hint">
            <svg width="28" height="44" viewBox="0 0 28 44" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="1" y="1" width="26" height="42" rx="13" stroke="rgba(255,255,255,.4)" strokeWidth="2"/>
              <line x1="14" y1="8" x2="14" y2="16" stroke="rgba(255,255,255,.4)" strokeWidth="2.5" strokeLinecap="round" className="op-scroll-wheel"/>
            </svg>
          </div>
        </F>
      </section>

      {/* ── DARK ZONE ── */}
      <div className="op-dark">

        {/* ── SECTION 1 ── */}
        <section className="op-section">
          <F>
            <h2>간편한 입장.<br />빠른 체크인.</h2>
            <p className="op-sub">
              QR 코드 하나로 빠르게 입장하고, 다양한 프로그램에 자유롭게 참여하세요.<br />
              <strong> 4단계 절차</strong>로 누구나 쉽고 빠르게 입장할 수 있습니다.
            </p>
          </F>
        </section>

        {/* ── HORIZONTAL SCROLL GALLERY 1 ── */}
        <HScrollGallery images={GALLERY_1} />

        {/* ── STATS ── */}
        <div className="op-stats">
          <F delay={0}>
            <div className="op-stat">
              <div className="op-stat-label">입장 소요</div>
              <div className="op-stat-val">30초</div>
              <div className="op-stat-desc">QR 스캔으로<br />빠른 게이트 통과</div>
            </div>
          </F>
          <F delay={0.1}>
            <div className="op-stat">
              <div className="op-stat-label">운영</div>
              <div className="op-stat-val">4단계</div>
              <div className="op-stat-desc">간편한 절차로<br />누구나 쉬운 입장</div>
            </div>
          </F>
          <F delay={0.2}>
            <div className="op-stat">
              <div className="op-stat-label">현장 지원</div>
              <div className="op-stat-val">상시</div>
              <div className="op-stat-desc">응급 부스 및<br />안내 데스크 운영</div>
            </div>
          </F>
        </div>

        {/* ── STEPS ── */}
        <div className="op-steps">
          {STEPS.map((s, i) => (
            <F key={i} delay={i * 0.08}>
              <div className="op-step">
                <div className="op-step-num">STEP {String(i + 1).padStart(2, "0")}</div>
                <div className="op-step-title">{s.title}</div>
                <div className="op-step-desc" style={{ whiteSpace: "pre-line" }}>{s.desc}</div>
              </div>
            </F>
          ))}
        </div>

        {/* ── SECTION 2 ── */}
        <section className="op-section">
          <F>
            <h2>확인 사항.<br />꼭 지켜주세요.</h2>
            <p className="op-sub">
              반려동물과 모든 참가자가<br /> <strong> 안전하고 즐거운 행사 </strong>를 만들기 위해
              아래 규정을 반드시 확인해 주세요.
            </p>
          </F>
        </section>

        {/* ── HORIZONTAL SCROLL GALLERY 2 ── */}
        <HScrollGallery images={GALLERY_2} />

        {/* ── RULES ── */}
        <section className="op-rules">
          {RULES.map((r, i) => (
            <F key={i} delay={i * 0.04}>
              <div className="op-rule">
                <div className="op-rule-t">{r.t}</div>
                <div className="op-rule-d">{r.d}</div>
              </div>
            </F>
          ))}
        </section>

        {/* ── NOTICE ── */}
        <section className="op-notice">
          <F>
            <p>행사장 내 안내 스태프의 지시에 따라 주시기 바랍니다.<br />반복적인 규정 위반 시 퇴장 조치될 수 있습니다.</p>
          </F>
        </section>

      </div>
    </div>
  );
}
