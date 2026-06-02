import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { toPublicAssetUrl } from "../../../shared/utils/publicAssetUrl";

const css = `
  .cr-root {
    position: fixed; inset: 0; z-index: 99999;
    background: #000; color: #fff; overflow: hidden;
    font-family: 'Pretendard Variable', 'Pretendard', -apple-system, sans-serif;
  }
  .cr-bg-video {
    position: fixed; inset: 0; z-index: 0;
    width: 100%; height: 100%; object-fit: cover;
    opacity: 0.3;
  }
  .cr-scroll {
    position: absolute; left: 0; right: 0; text-align: center; z-index: 1;
    animation: cr-roll 90s linear forwards;
    padding: 0 24px;
  }
  @keyframes cr-roll {
    0% { top: 100vh; }
    100% { top: -5000px; }
  }
  @media (max-width: 640px) {
    @keyframes cr-roll {
      0% { top: 100vh; }
      100% { top: -4000px; }
    }
  }

  .cr-logo {
    font-size: clamp(48px, 10vw, 80px); font-weight: 900;
    letter-spacing: -2px; margin-bottom: 8px;
  }
  .cr-team {
    font-size: 16px; color: #999; letter-spacing: 6px;
    text-transform: uppercase; margin-bottom: 60px;
  }
  .cr-tagline {
    font-size: 18px; color: #aaa; margin-bottom: 120px;
    font-style: italic; line-height: 1.8;
  }

  .cr-block { margin-bottom: 90px; }
  .cr-role-label {
    font-size: 14px; color: #888; letter-spacing: 4px;
    text-transform: uppercase; margin-bottom: 20px;
  }
  .cr-person {
    font-size: 30px; font-weight: 700; margin-bottom: 8px;
    letter-spacing: 1px;
  }
  .cr-sub {
    font-size: 16px; color: #aaa; margin-bottom: 10px;
    font-style: italic; line-height: 1.7;
  }
  .cr-detail {
    font-size: 15px; color: #999; line-height: 1.8;
    max-width: 400px; margin: 0 auto;
  }

  .cr-line {
    width: 30px; height: 1px; background: #333;
    margin: 0 auto 90px;
  }

  .cr-incident { margin-bottom: 90px; }
  .cr-incident-title {
    font-size: 18px; font-weight: 800; letter-spacing: 2px;
    margin-bottom: 24px; color: #fff;
  }
  .cr-incident-item {
    font-size: 16px; color: #aaa; margin-bottom: 12px;
    line-height: 1.7;
  }
  .cr-incident-item em {
    color: #ccc; font-style: normal; font-weight: 600;
  }

  .cr-stats { margin-bottom: 90px; }
  .cr-stat-row {
    display: flex; justify-content: center; gap: 40px;
    flex-wrap: wrap; margin-bottom: 16px;
  }
  .cr-stat-num {
    font-size: 32px; font-weight: 900; letter-spacing: -1px;
  }
  .cr-stat-label {
    font-size: 13px; color: #888; letter-spacing: 2px;
    text-transform: uppercase; margin-top: 4px;
  }

  .cr-thanks-label {
    font-size: 18px; font-weight: 800; letter-spacing: 3px;
    margin-bottom: 30px;
  }
  .cr-thanks {
    font-size: 16px; color: #aaa; margin-bottom: 14px; line-height: 1.8;
  }

  .cr-end { margin-top: 100px; margin-bottom: 300px; }
  .cr-end-text {
    font-size: 15px; color: #888; letter-spacing: 3px;
    text-transform: uppercase; margin-bottom: 20px;
  }
  .cr-end-logo { font-size: 32px; font-weight: 900; letter-spacing: 2px; }
  .cr-end-year { font-size: 14px; color: #888; margin-top: 6px; letter-spacing: 2px; }
  .cr-replay {
    position: fixed; bottom: 32px; left: 50%; transform: translateX(-50%);
    z-index: 100000; background: #fff; color: #000; border: none;
    padding: 12px 28px; border-radius: 999px; font-size: 14px; font-weight: 700;
    cursor: pointer; font-family: inherit; letter-spacing: 1px;
    opacity: 0; transition: opacity 0.5s;
    pointer-events: none;
  }
  .cr-replay.show { opacity: 1; pointer-events: auto; }
  .cr-replay:hover { background: #e5e5e5; }
  .cr-paw {
    font-size: 20px; margin-top: 20px;
    animation: cr-beat 1.5s ease-in-out infinite;
  }
  @keyframes cr-beat {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.2); }
  }

  @media (max-width: 640px) {
    .cr-scroll { padding: 0 20px; }
    .cr-logo { font-size: 40px; }
    .cr-team { font-size: 13px; letter-spacing: 4px; margin-bottom: 40px; }
    .cr-tagline { font-size: 15px; margin-bottom: 80px; }
    .cr-block { margin-bottom: 60px; }
    .cr-role-label { font-size: 12px; letter-spacing: 3px; margin-bottom: 14px; }
    .cr-person { font-size: 22px; }
    .cr-sub { font-size: 14px; }
    .cr-detail { font-size: 13px; max-width: 100%; }
    .cr-line { margin-bottom: 60px; }
    .cr-incident { margin-bottom: 60px; }
    .cr-incident-title { font-size: 15px; letter-spacing: 1px; }
    .cr-incident-item { font-size: 14px; }
    .cr-stat-row { gap: 24px; }
    .cr-stat-num { font-size: 24px; }
    .cr-stat-label { font-size: 11px; }
    .cr-thanks-label { font-size: 15px; }
    .cr-thanks { font-size: 14px; }
    .cr-end-logo { font-size: 24px; }
    .cr-replay { bottom: 20px; padding: 10px 24px; font-size: 13px; }
  }

  /* 모달 */
  .cr-modal-overlay {
    position: fixed; inset: 0; z-index: 100001;
    background: rgba(0,0,0,0.7); backdrop-filter: blur(4px);
    display: flex; align-items: center; justify-content: center;
    animation: cr-modal-in 0.2s ease;
  }
  @keyframes cr-modal-in { from { opacity: 0; } to { opacity: 1; } }
  .cr-modal {
    background: #1a1a1a; border: 1px solid #333; border-radius: 16px;
    padding: 32px 28px; text-align: center; max-width: 320px; width: 90%;
    animation: cr-modal-pop 0.25s ease;
  }
  @keyframes cr-modal-pop { from { transform: scale(0.9); opacity: 0; } to { transform: scale(1); opacity: 1; } }
  .cr-modal-emoji { font-size: 36px; margin-bottom: 14px; }
  .cr-modal-title { font-size: 16px; font-weight: 800; color: #fff; margin-bottom: 6px; }
  .cr-modal-desc { font-size: 13px; color: #777; margin-bottom: 24px; line-height: 1.6; }
  .cr-modal-btns { display: flex; gap: 8px; }
  .cr-modal-btn {
    flex: 1; height: 42px; border-radius: 10px; font-size: 13px; font-weight: 700;
    cursor: pointer; font-family: inherit; transition: all 0.15s; border: none;
  }
  .cr-modal-btn.stay { background: #333; color: #aaa; }
  .cr-modal-btn.stay:hover { background: #444; color: #fff; }
  .cr-modal-btn.leave { background: #fff; color: #000; }
  .cr-modal-btn.leave:hover { background: #e5e5e5; }
`;

const MODAL_MESSAGES = [
  { emoji: "🐶", title: "벌써 가시게요?", desc: "크레딧 다 안 봤는데..." },
  { emoji: "🥺", title: "진짜 나가요?", desc: "우리가 얼마나 고생했는데..." },
  { emoji: "😤", title: "아직이요", desc: "끝까지 봐주는 게 예의 아닌가요" },
  { emoji: "🐾", title: "발도장 안 찍고 가게?", desc: "강아지가 슬퍼합니다" },
  { emoji: "💔", title: "마음이 아프다", desc: "배재혁은 말 안 하지만 속으로 울고 있어요" },
];

export default function Credits() {
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const [modalMsg, setModalMsg] = useState(MODAL_MESSAGES[0]);
  const [ended, setEnded] = useState(false);
  const [replayKey, setReplayKey] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setEnded(true), 90000);
    return () => clearTimeout(timer);
  }, [replayKey]);

  const handleClick = () => {
    const msg = MODAL_MESSAGES[Math.floor(Math.random() * MODAL_MESSAGES.length)];
    setModalMsg(msg);
    setShowModal(true);
  };

  return (
    <div className="cr-root" onClick={handleClick}>
      <style>{css}</style>

      <video
        className="cr-bg-video"
        src={toPublicAssetUrl("/uploads/home/home-1.mp4")}
        autoPlay
        muted
        loop
        playsInline
      />

      <div className="cr-scroll" key={replayKey}>

        <div className="cr-logo"><img src="/bottom_logo.png" alt="PuPoo" style={{ height: "1em", display: "block", margin: "0 auto" }} /></div>
        <div className="cr-team">POPUPS TEAM</div>
        <div className="cr-tagline">
          4명의 개발자가 만든<br />
          반려동물과 함께하는 행사 플랫폼<br /><br />
          아무도 다치지 않았습니다<br />
          DB 빼고요
        </div>

        {/* ── CAST ── */}

        <div className="cr-block">
          <div className="cr-role-label">Frontend Developer</div>
          <div className="cr-person">남광우(팀장)</div>
          <div className="cr-sub">"돈까스 먹으러 갈 사람?"</div>
          <div className="cr-detail">
            하루 평균 3.7회 돈까스 소집<br />
            본인 曰: "대답안하면 돈까스"<br />
            리트리버 선호 / 돈까스 선호
          </div>
        </div>

        <div className="cr-block">
          <div className="cr-role-label">Designer &amp; Quality Destroyer</div>
          <div className="cr-person">김기정</div>
          <div className="cr-sub">"아... 별론데"</div>
          <div className="cr-detail">
            "아 별론데" 누적 발언 횟수: 2,847회<br />
            "아 안예쁜데" 누적 발언 횟수: 1,923회<br />
            "아 뭔가 맘에 안드는데" 누적: 3,102회<br />
            돈까스 혐오 / 도경수 선호<br />
            → 취향 확고
          </div>
        </div>

        <div className="cr-block">
          <div className="cr-role-label">Backend Developer</div>
          <div className="cr-person">정요한</div>
          <div className="cr-sub">"아 내가 할게! 아 할 수 있어!"</div>
          <div className="cr-detail">
            → 의욕 MAX<br />
            건드리면 반응 바로 와서 타격감 좋음<br />
            본인 曰: 설치류 선호
          </div>
        </div>

        <div className="cr-block">
          <div className="cr-role-label">Full-Stack Developer</div>
          <div className="cr-person">배재혁</div>
          <div className="cr-sub">...</div>
          <div className="cr-detail">
            묵묵하게 자기 일 꾸준히 처리<br />
            티 안 나게 다 해놓는 스타일<br />
            → 조용한 하드캐리형<br />
            웬만한 일에는 크게 반응 없음<br />
            그래서 가끔 장난 쳐도 괜찮을지 살짝 궁금해짐
          </div>
        </div>

        <div className="cr-line" />

        {/* ── DB 역사 ── */}
        <div className="cr-incident">
          <div className="cr-incident-title">DATABASE INCIDENT REPORT</div>
          <div className="cr-incident-item"><em>v1.0</em> — 테이블 3개로 시작. 희망에 차 있었음</div>
          <div className="cr-incident-item"><em>v1.5</em> — "이거 컬럼 하나만 추가하면 돼" (유명한 유언)</div>
          <div className="cr-incident-item"><em>v3.2</em> — 마이그레이션 실패. 새벽 3시 긴급 회의</div>
          <div className="cr-incident-item"><em>v4.5</em> — "아 그냥 다 밀고 새로 하자"</div>
          <div className="cr-incident-item"><em>v6.0</em> — 누군가 프로덕션 DB에 DROP TABLE 실행</div>
          <div className="cr-incident-item"><em>v12.0</em> — 이번엔 진짜 완벽하다고 했음 (아님)</div>
          <div className="cr-incident-item"><em>v23.0</em> — ERD 새로 그림. 셋째가 더 예뻤음</div>
          <div className="cr-incident-item"><em>v41.0</em> — 스키마 변경 PR 올리면 팀원이 울음</div>
          <div className="cr-incident-item"><em>v58.3</em> — "이번이 최종이다" (17번째 최종)</div>
          <div className="cr-incident-item"><em>v69.0</em> — 진짜최종_final_v2_이거찐찐막.sql</div>
          <div className="cr-incident-item"><em>v74.0</em> — 아무도 스키마를 건드리지 않기로 서약함</div>
          <div className="cr-incident-item"><em>v76.9</em> — 서약 3시간 만에 깨짐</div>
          <div className="cr-incident-item"><em>v77.0</em> — 현재 버전. 살아있는 게 기적을 넘어 전설</div>
          <div className="cr-incident-item" style={{ marginTop: 20, color: "#777" }}>
            이 DB는 77번의 삶과 죽음을 경험했습니다<br />
            고양이는 9번인데 우리는 77번임<br />
            더 이상 환생 여력이 없습니다
          </div>
        </div>

        <div className="cr-line" />

        {/* ── 통계 ── */}
        <div className="cr-stats">
          <div className="cr-incident-title">BY THE NUMBERS</div>
          <div className="cr-stat-row">
            <div>
              <div className="cr-stat-num">2,847</div>
              <div className="cr-stat-label">"별론데" 횟수</div>
            </div>
            <div>
              <div className="cr-stat-num">∞</div>
              <div className="cr-stat-label">돈까스 소집</div>
            </div>
          </div>
          <div className="cr-stat-row">
            <div>
              <div className="cr-stat-num">77</div>
              <div className="cr-stat-label">DB 환생 횟수</div>
            </div>
            <div>
              <div className="cr-stat-num">347</div>
              <div className="cr-stat-label">커피 소비량 (잔)</div>
            </div>
          </div>
        </div>

        <div className="cr-line" />

        {/* ── Produced / Powered ── */}
        <div className="cr-block">
          <div className="cr-role-label">Produced by</div>
          <div className="cr-person">POPUPS</div>
          <div className="cr-sub">팝업스</div>
        </div>

        <div className="cr-block">
          <div className="cr-role-label">Powered by</div>
          <div className="cr-person" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "12px" }}>
            <span>himidea</span>
            <span style={{ fontSize: "18px", color: "#555" }}>x</span>
            <img src="/IBM_logo.svg.png" alt="IBM" style={{ height: "28px" }} />
          </div>
          <div className="cr-sub">하이미디어 아카데미</div>
        </div>

        <div className="cr-line" />

        {/* ── Special Thanks ── */}
        <div className="cr-block">
          <div className="cr-thanks-label">SPECIAL THANKS</div>
          <div className="cr-thanks">카페인. 진짜 MVP. ☕</div>
          <div className="cr-thanks">새벽 4시의 커밋 — 사랑이자 저주</div>
          <div className="cr-thanks">Stack Overflow — 진정한 시니어 개발자</div>
          <div className="cr-thanks">Claude — 많이 혼냈지만 고마워요</div>
          <div className="cr-thanks">그리고 이 페이지를 발견한 당신</div>
          <div className="cr-thanks">여기까지 본 거면 우리 팬이시죠?</div>
        </div>

        <div className="cr-line" />

        <div className="cr-block">
          <div className="cr-role-label">No animals were harmed</div>
          <div className="cr-role-label">in the making of this project</div>
          <div className="cr-role-label" style={{ marginTop: 12 }}>DB는 좀 다쳤습니다</div>
        </div>

        <div className="cr-end">
          <div className="cr-end-text">A Popups Production</div>
          <div className="cr-end-logo"><img src="/bottom_logo.png" alt="PuPoo" style={{ height: "36px", display: "block", margin: "0 auto" }} /></div>
          <div className="cr-end-year">© 2026</div>
          <div className="cr-paw">🐾</div>
        </div>

      </div>

      <button
        type="button"
        className={`cr-replay${ended ? " show" : ""}`}
        onClick={(e) => { e.stopPropagation(); setEnded(false); setReplayKey(k => k + 1); }}
      >
        다시보기
      </button>

      {showModal && (
        <div className="cr-modal-overlay" onClick={(e) => e.stopPropagation()}>
          <div className="cr-modal">
            <div className="cr-modal-emoji">{modalMsg.emoji}</div>
            <div className="cr-modal-title">{modalMsg.title}</div>
            <div className="cr-modal-desc">{modalMsg.desc}</div>
            <div className="cr-modal-btns">
              <button type="button" className="cr-modal-btn stay" onClick={(e) => { e.stopPropagation(); setShowModal(false); }}>더 볼게요</button>
              <button type="button" className="cr-modal-btn leave" onClick={(e) => { e.stopPropagation(); navigate("/"); }}>나갈래요</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
