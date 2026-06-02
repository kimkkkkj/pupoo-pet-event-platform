import { useState } from "react";
import PageHeader from "../components/PageHeader";
import {
  CalendarDays,
  Clock,
  Star,
  Utensils,
  Baby,
  ShoppingBag,
  Mic2,
  AlertTriangle,
  Coffee,
  Sparkles,
} from "lucide-react";

const GUIDE_CATEGORIES = [
  { label: "현장 운영 안내", path: "/guide/operation" },
  { label: "타임 테이블", path: "/guide/timetable" },
];

const GUIDE_SUBTITLE_MAP = {
  "/guide/operation":
    "원활하고 즐거운 행사 참여를 위해 아래 안내 사항을 미리 확인해 주세요",
  "/guide/timetable": "프로그램은 현장 상황에 따라 일부 변경될 수 있습니다.",
};

const styles = `
  @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.min.css');
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700;800&display=swap');

  .tt-root {
    box-sizing: border-box;
    font-family: 'Pretendard Variable', 'Pretendard', -apple-system, sans-serif;
    background: #f8f9fc;;
    min-height: 100vh;
  }
  .tt-root *, .tt-root *::before, .tt-root *::after {
    box-sizing: border-box; font-family: inherit;
  }
  .tt-container {
    max-width: 920px; margin: 0 auto;
    padding: 48px 32px 80px;
  }

  /* ── 상단 바 ── */
  .tt-controls {
    display: flex; align-items: center; justify-content: space-between;
    margin-bottom: 32px; flex-wrap: wrap; gap: 16px;
  }

  /* 날짜 탭 */
  .tt-day-tabs { display: flex; gap: 8px; }
  .tt-day-btn {
    padding: 12px 28px;
    border-radius: 100px;
    font-size: 13.5px; font-weight: 700;
    font-family: inherit;
    border: 1.5px solid #d9cfc2;
    background: #fff;
    color: #8a8078;
    cursor: pointer;
    transition: all 0.2s;
    display: flex; align-items: center; gap: 8px;
  }
  .tt-day-btn:hover {
    border-color: #c97a3e; color: #c97a3e;
  }
  .tt-day-btn.active {
    background: #1a1a18;
    border-color: #1a1a18;
    color: #faf5ee;
  }

  /* 범례 */
  .tt-legend { display: flex; gap: 14px; flex-wrap: wrap; }
  .tt-legend-chip {
    display: flex; align-items: center; gap: 7px;
    font-size: 12px; font-weight: 600; color: #5c5549;
  }
  .tt-legend-bar {
    width: 14px; height: 4px; border-radius: 2px;
  }

  /* ── 타임라인 ── */
  .tt-timeline {
    position: relative;
    margin-bottom: 40px;
  }
  .tt-timeline::before {
    content: '';
    position: absolute;
    left: 44px; top: 0; bottom: 0;
    width: 1.5px;
    background: #e0d9ce;
  }

  /* 시간 블록 */
  .tt-block {
    position: relative;
    padding-left: 100px;
    margin-bottom: 8px;
  }

  .tt-time-mark {
    position: absolute; left: 0; top: 0;
    display: flex; align-items: center; gap: 0;
  }
  .tt-time-label {
    font-family: 'Playfair Display', serif;
    font-size: 18px; font-weight: 700;
    color: #1a1a18;
    width: 32px; text-align: right;
    line-height: 1;
  }
  .tt-time-dot {
    width: 12px; height: 12px;
    border-radius: 50%;
    border: 2.5px solid #e3874c;
    background: #f8f9fc;;
    margin-left: 10px;
    position: relative;
    z-index: 1;
  }

  /* 이벤트 카드 */
  .tt-events { display: flex; flex-direction: column; gap: 8px; padding-bottom: 24px; }
  .tt-event-card {
    border-radius: 14px;
    padding: 18px 22px;
    display: flex; align-items: flex-start; gap: 14px;
    transition: all 0.2s;
    border: 1px solid transparent;
  }
  .tt-event-card:hover {
    transform: translateX(4px);
    box-shadow: 0 6px 24px rgba(0,0,0,0.05);
  }
  .tt-event-card.main {
    background: #fff;
    border-color: #ebe6dd;
  }
  .tt-event-card.sub {
    background: linear-gradient(135deg, #f0f6ec 0%, #eef4ea 100%);
    border-color: #d5e4cd;
  }
  .tt-event-card.kids {
    background: linear-gradient(135deg, #fdf5ec 0%, #fdf0e4 100%);
    border-color: #ecd9c0;
  }
  .tt-event-card.food {
    background: linear-gradient(135deg, #fdf0ec 0%, #fce8e4 100%);
    border-color: #f0d0c8;
  }

  .tt-ev-icon {
    width: 36px; height: 36px;
    border-radius: 10px;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
  }
  .tt-event-card.main .tt-ev-icon { background: #1a1a18; color: #faf5ee; }
  .tt-event-card.sub  .tt-ev-icon { background: #5a8a4c; color: #fff; }
  .tt-event-card.kids .tt-ev-icon { background: #c97a3e; color: #fff; }
  .tt-event-card.food .tt-ev-icon { background: #c0504d; color: #fff; }

  .tt-ev-body { flex: 1; }
  .tt-ev-tag {
    display: inline-block;
    font-size: 10px; font-weight: 700;
    letter-spacing: 0.5px;
    text-transform: uppercase;
    margin-bottom: 5px;
  }
  .tt-event-card.main .tt-ev-tag { color: #8a8078; }
  .tt-event-card.sub  .tt-ev-tag { color: #5a8a4c; }
  .tt-event-card.kids .tt-ev-tag { color: #c97a3e; }
  .tt-event-card.food .tt-ev-tag { color: #c0504d; }

  .tt-ev-name {
    font-size: 14.5px; font-weight: 700;
    color: #1a1a18; margin-bottom: 4px;
  }
  .tt-ev-meta {
    font-size: 12.5px; color: #8a8078;
  }

  /* 휴식 구분선 */
  .tt-break-row {
    position: relative;
    padding-left: 100px;
    margin: 12px 0 20px;
  }
  .tt-break-line {
    display: flex; align-items: center; gap: 12px;
    padding: 14px 0;
  }
  .tt-break-line::before, .tt-break-line::after {
    content: '';
    flex: 1; height: 1px;
    background: repeating-linear-gradient(90deg, #d9cfc2 0, #d9cfc2 4px, transparent 4px, transparent 8px);
  }
  .tt-break-text {
    font-size: 12.5px; font-weight: 600;
    color: #b5a99a;
    display: flex; align-items: center; gap: 6px;
    white-space: nowrap;
  }

  /* 공지 */
  .tt-alert {
    background: #1a1a18;
    border-radius: 16px;
    padding: 24px 28px;
    display: flex; align-items: flex-start; gap: 16px;
    position: relative; overflow: hidden;
  }
  .tt-alert::before {
    content: '';
    position: absolute; top: 0; left: 0;
    width: 4px; height: 100%;
    background: #e3874c;
  }
  .tt-alert-icon {
    width: 40px; height: 40px;
    border-radius: 10px;
    background: rgba(227,135,76,0.15);
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0; color: #e3874c;
  }
  .tt-alert-title {
    font-size: 14px; font-weight: 700;
    color: #faf5ee; margin-bottom: 5px;
  }
  .tt-alert-text {
    font-size: 13px; color: rgba(250,245,238,0.6);
    line-height: 1.7;
  }

  @media (max-width: 640px) {
    .tt-container { padding: 32px 20px 56px; }
    .tt-controls { flex-direction: column; align-items: flex-start; }
    .tt-timeline::before { left: 20px; }
    .tt-block { padding-left: 56px; }
    .tt-break-row { padding-left: 56px; }
    .tt-time-label { font-size: 15px; width: 24px; }
    .tt-time-dot { margin-left: 6px; }
  }
`;

const DAYS = [
  { key: "day1", label: "Day 1 · 4월 12일 (토)" },
  { key: "day2", label: "Day 2 · 4월 13일 (일)" },
];

const STAGES = [
  { key: "main", label: "메인 스테이지", color: "#1a1a18" },
  { key: "sub", label: "체험 부스", color: "#5a8a4c" },
  { key: "kids", label: "키즈 존", color: "#c97a3e" },
  { key: "food", label: "푸드 코트", color: "#c0504d" },
];

const STAGE_ICON = {
  main: Mic2,
  sub: Star,
  kids: Baby,
  food: Utensils,
};

const SCHEDULE = {
  day1: [
    {
      time: "10:00",
      events: [
        {
          stage: "main",
          badge: "메인 스테이지",
          name: "개막식 & 환영 공연",
          meta: "전체 · 30분",
        },
        {
          stage: "kids",
          badge: "키즈 존",
          name: "반려동물 입문 교육",
          meta: "어린이 · 40분",
        },
      ],
    },
    {
      time: "11:00",
      events: [
        {
          stage: "main",
          badge: "메인 스테이지",
          name: "펫 패션쇼 1부",
          meta: "전체 · 50분",
        },
        {
          stage: "sub",
          badge: "체험 부스",
          name: "반려동물 헬스체크 무료 진단",
          meta: "선착순 50팀",
        },
      ],
    },
    { break: true, label: "점심 시간 (12:00 – 13:00)" },
    {
      time: "13:00",
      events: [
        {
          stage: "main",
          badge: "메인 스테이지",
          name: "어질리티 대회 예선",
          meta: "참가팀 대상 · 60분",
        },
        {
          stage: "sub",
          badge: "체험 부스",
          name: "포토 부스 & 굿즈 증정",
          meta: "상시 운영",
        },
        {
          stage: "food",
          badge: "푸드 코트",
          name: "반려동물 수제 간식 체험",
          meta: "유료 · 1팀 5,000원",
        },
      ],
    },
    {
      time: "14:30",
      events: [
        {
          stage: "main",
          badge: "메인 스테이지",
          name: "펫 패션쇼 2부 & 시상식",
          meta: "전체 · 60분",
        },
        {
          stage: "kids",
          badge: "키즈 존",
          name: "반려동물 그림 그리기 대회",
          meta: "12세 이하 · 무료",
        },
      ],
    },
    {
      time: "16:00",
      events: [
        {
          stage: "main",
          badge: "메인 스테이지",
          name: "어질리티 결승 & 시상",
          meta: "전체 · 45분",
        },
      ],
    },
    {
      time: "17:00",
      events: [
        {
          stage: "main",
          badge: "메인 스테이지",
          name: "Day 1 마무리 & 경품 추첨",
          meta: "전체 · 30분",
        },
      ],
    },
  ],
  day2: [
    {
      time: "10:00",
      events: [
        {
          stage: "main",
          badge: "메인 스테이지",
          name: "전문가 특강 - 반려동물 영양",
          meta: "전체 · 40분",
        },
        {
          stage: "kids",
          badge: "키즈 존",
          name: "반려동물 비누 만들기 워크숍",
          meta: "어린이 · 60분",
        },
      ],
    },
    {
      time: "11:00",
      events: [
        {
          stage: "sub",
          badge: "체험 부스",
          name: "유기견 입양 상담 부스",
          meta: "상시 운영",
        },
        {
          stage: "food",
          badge: "푸드 코트",
          name: "펫 카페 체험존",
          meta: "유료 · 2,000원",
        },
      ],
    },
    { break: true, label: "점심 시간 (12:00 – 13:00)" },
    {
      time: "13:00",
      events: [
        {
          stage: "main",
          badge: "메인 스테이지",
          name: "트릭 도그 쇼",
          meta: "전체 · 45분",
        },
        {
          stage: "sub",
          badge: "체험 부스",
          name: "반려동물 마사지 체험",
          meta: "선착순 30팀",
        },
      ],
    },
    {
      time: "15:00",
      events: [
        {
          stage: "main",
          badge: "메인 스테이지",
          name: "전체 기념 촬영 & 폐막식",
          meta: "전체 · 30분",
        },
      ],
    },
  ],
};

export default function Timetable({ onNavigate }) {
  const currentPath = "/guide/timetable";
  const [day, setDay] = useState("day1");
  const schedule = SCHEDULE[day];

  return (
    <div className="tt-root">
      <style>{styles}</style>
      <PageHeader
        title="타임 테이블"
        subtitle={GUIDE_SUBTITLE_MAP[currentPath]}
        categories={GUIDE_CATEGORIES}
        currentPath={currentPath}
        onNavigate={onNavigate}
      />
      <main className="tt-container">
        {/* 컨트롤 */}
        <div className="tt-controls">
          <div className="tt-day-tabs">
            {DAYS.map((d) => (
              <button
                key={d.key}
                className={`tt-day-btn${day === d.key ? " active" : ""}`}
                onClick={() => setDay(d.key)}
              >
                <CalendarDays size={14} />
                {d.label}
              </button>
            ))}
          </div>
          <div className="tt-legend">
            {STAGES.map((s) => (
              <div key={s.key} className="tt-legend-chip">
                <div
                  className="tt-legend-bar"
                  style={{ background: s.color }}
                />
                {s.label}
              </div>
            ))}
          </div>
        </div>

        {/* 타임라인 */}
        <div className="tt-timeline">
          {schedule.map((row, i) =>
            row.break ? (
              <div key={i} className="tt-break-row">
                <div className="tt-break-line">
                  <span className="tt-break-text">
                    <Coffee size={13} />
                    {row.label}
                  </span>
                </div>
              </div>
            ) : (
              <div key={i} className="tt-block">
                <div className="tt-time-mark">
                  <div className="tt-time-label">{row.time}</div>
                  <div className="tt-time-dot" />
                </div>
                <div className="tt-events">
                  {row.events.map((ev, j) => {
                    const IconComp = STAGE_ICON[ev.stage] || Star;
                    return (
                      <div key={j} className={`tt-event-card ${ev.stage}`}>
                        <div className="tt-ev-icon">
                          <IconComp size={16} />
                        </div>
                        <div className="tt-ev-body">
                          <div className="tt-ev-tag">{ev.badge}</div>
                          <div className="tt-ev-name">{ev.name}</div>
                          <div className="tt-ev-meta">{ev.meta}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ),
          )}
        </div>

        {/* 공지 */}
        <div className="tt-alert">
          <div className="tt-alert-icon">
            <AlertTriangle size={18} />
          </div>
          <div>
            <div className="tt-alert-title">안내</div>
            <div className="tt-alert-text">
              모든 프로그램 일정은 운영 상황에 따라 변경될 수 있습니다. 변경
              사항은 공식 홈페이지 및 현장 안내판을 통해 공지됩니다.
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
