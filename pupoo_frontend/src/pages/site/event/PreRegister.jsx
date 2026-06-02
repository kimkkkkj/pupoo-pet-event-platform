import PageHeader from "../components/PageHeader";
import { useState } from "react";
import {
  ClipboardList,
  User,
  Mail,
  Phone,
  Building2,
  ChevronDown,
  CheckCircle2,
  Calendar,
  MapPin,
  Clock,
  ArrowRight,
} from "lucide-react";

export const SERVICE_CATEGORIES = [
  { label: "현재 진행 행사", path: "/event/current" },
  { label: "예정 행사", path: "/event/upcoming" },
  { label: "종료 행사", path: "/event/closed" },
  { label: "행사 사전 등록", path: "/event/preregister" },
  { label: "행사 일정 안내", path: "/event/eventschedule" },
];

export const SUBTITLE_MAP = {
  "/event/current": "현재 진행 중인 행사 목록을 확인합니다",
  "/event/upcoming": "예정된 행사 일정을 확인합니다",
  "/event/closed": "종료된 행사 목록을 확인합니다",
  "/event/preregister": "행사 사전 등록을 진행합니다",
  "/event/eventschedule": "행사 일정을 안내합니다",
};

const styles = `
  @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.min.css');

  .pr-root {
    box-sizing: border-box;
    font-family: 'Pretendard Variable', 'Pretendard', -apple-system, sans-serif;
    background: #f8f9fc;
    min-height: 100vh;
  }
  .pr-root *, .pr-root *::before, .pr-root *::after { box-sizing: border-box; font-family: inherit; }

  .pr-header { background: #fff; border-bottom: 1px solid #e9ecef; padding: 0 32px; }
  .pr-header-inner {
    max-width: 1400px; margin: 0 auto;
    display: flex; align-items: center; justify-content: space-between; height: 64px;
  }
  .pr-header-title { font-size: 17px; font-weight: 800; color: #111827; }
  .pr-header-sub { font-size: 12px; color: #9ca3af; margin-top: 1px; }
  .pr-nav { display: flex; gap: 4px; }
  .pr-nav-btn {
    height: 34px; padding: 0 14px; border: none; border-radius: 8px;
    font-size: 13px; font-weight: 500; color: #6b7280; background: transparent;
    cursor: pointer; font-family: inherit; transition: all 0.15s;
  }
  .pr-nav-btn:hover { background: #f8f9fc; color: #111827; }
  .pr-nav-btn.active { background: #90C450; color: #fff; font-weight: 600; }

  .pr-container { max-width: 1400px; margin: 0 auto; padding: 32px 25px 64px; }

  /* Steps */
  .pr-steps { display: flex; align-items: center; gap: 0; margin-bottom: 32px; }
  .pr-step {
    display: flex; align-items: center; gap: 10px;
    padding: 10px 20px; border-radius: 10px;
  }
  .pr-step.active { background: #eff4ff; }
  .pr-step-num {
    width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center;
    justify-content: center; font-size: 12px; font-weight: 700; flex-shrink: 0;
  }
  .pr-step.active .pr-step-num { background: #90C450; color: #fff; }
  .pr-step.done .pr-step-num { background: #3a4520; color: #fff; }
  .pr-step.idle .pr-step-num { background: #e9ecef; color: #9ca3af; }
  .pr-step-label { font-size: 13px; font-weight: 600; }
  .pr-step.active .pr-step-label { color: #90C450; }
  .pr-step.done .pr-step-label { color: #3a4520; }
  .pr-step.idle .pr-step-label { color: #9ca3af; }
  .pr-step-arrow { color: #d1d5db; margin: 0 4px; }

  /* Layout */
  .pr-layout { display: grid; grid-template-columns: 1fr 380px; gap: 20px; align-items: start; }

  /* Form card */
  .pr-card { background: #fff; border: 1px solid #e9ecef; border-radius: 13px; padding: 28px 32px; }
  .pr-card-title { font-size: 16px; font-weight: 700; color: #111827; margin-bottom: 24px; display: flex; align-items: center; gap: 8px; }
  .pr-card-title-icon { width: 26px; height: 26px; border-radius: 7px; background: #eff4ff; display: flex; align-items: center; justify-content: center; }

  .pr-form-group { margin-bottom: 18px; }
  .pr-label {
    display: flex; align-items: center; gap: 5px;
    font-size: 13px; font-weight: 600; color: #374151; margin-bottom: 6px;
  }
  .pr-required { color: #ef4444; font-size: 11px; }
  .pr-input-wrap { position: relative; }
  .pr-input-icon { position: absolute; left: 13px; top: 50%; transform: translateY(-50%); color: #9ca3af; }
  .pr-input {
    width: 100%; height: 44px; padding: 0 14px 0 38px;
    border: 1px solid #e2e8f0; border-radius: 9px; font-size: 14px;
    color: #111827; outline: none; font-family: inherit; background: #fff;
    transition: all 0.15s;
  }
  .pr-input:focus { border-color: #90C450; box-shadow: 0 0 0 3px rgba(26,79,214,0.08); }
  .pr-select {
    width: 100%; height: 44px; padding: 0 36px 0 14px;
    border: 1px solid #e2e8f0; border-radius: 9px; font-size: 14px;
    color: #111827; outline: none; font-family: inherit; background: #fff;
    appearance: none; cursor: pointer; transition: all 0.15s;
  }
  .pr-select:focus { border-color: #90C450; box-shadow: 0 0 0 3px rgba(26,79,214,0.08); }
  .pr-select-wrap { position: relative; }
  .pr-select-icon { position: absolute; right: 13px; top: 50%; transform: translateY(-50%); color: #9ca3af; pointer-events: none; }
  .pr-row { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }

  /* Ticket choice */
  .pr-ticket-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
  .pr-ticket-opt {
    border: 2px solid #e2e8f0; border-radius: 10px; padding: 14px 12px;
    cursor: pointer; transition: all 0.15s; text-align: center;
  }
  .pr-ticket-opt:hover { border-color: #90C450; }
  .pr-ticket-opt.selected { border-color: #90C450; background: #f5f8ff; }
  .pr-ticket-name { font-size: 13px; font-weight: 700; color: #111827; margin-bottom: 2px; }
  .pr-ticket-price { font-size: 12px; color: #6b7280; }
  .pr-ticket-opt.selected .pr-ticket-name { color: #90C450; }

  /* Agree */
  .pr-agree-item { display: flex; align-items: center; gap: 10px; padding: 10px 0; border-bottom: 1px solid #f1f3f5; cursor: pointer; }
  .pr-agree-item:last-child { border-bottom: none; }
  .pr-checkbox {
    width: 18px; height: 18px; border-radius: 5px; border: 2px solid #e2e8f0;
    display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    transition: all 0.15s;
  }
  .pr-checkbox.checked { border-color: #90C450; background: #90C450; }
  .pr-agree-label { font-size: 13px; color: #374151; }
  .pr-agree-required { font-size: 11px; font-weight: 600; color: #ef4444; margin-left: 4px; }

  /* Submit */
  .pr-submit {
    width: 100%; height: 50px; border: none; border-radius: 10px;
    background: #90C450; color: #fff; font-size: 15px; font-weight: 700;
    cursor: pointer; font-family: inherit; display: flex; align-items: center;
    justify-content: center; gap: 8px; margin-top: 24px; transition: background 0.15s;
  }
  .pr-submit:hover { background: #1640b0; }

  /* Right panel */
  .pr-summary-card { background: #fff; border: 1px solid #e9ecef; border-radius: 13px; overflow: hidden; position: sticky; top: 24px; }
  .pr-summary-banner { padding: 24px; background: linear-gradient(135deg, #90C450 0%, #6366f1 100%); color: #fff; }
  .pr-summary-banner-cat { font-size: 11px; font-weight: 600; opacity: 0.8; margin-bottom: 6px; }
  .pr-summary-banner-title { font-size: 17px; font-weight: 800; line-height: 1.3; }
  .pr-summary-body { padding: 20px 24px; }
  .pr-summary-row { display: flex; align-items: flex-start; gap: 10px; padding: 10px 0; border-bottom: 1px solid #f1f3f5; }
  .pr-summary-row:last-child { border-bottom: none; }
  .pr-summary-row-icon { color: #9ca3af; margin-top: 1px; flex-shrink: 0; }
  .pr-summary-row-label { font-size: 11.5px; color: #9ca3af; margin-bottom: 2px; }
  .pr-summary-row-val { font-size: 13px; font-weight: 600; color: #111827; }
  .pr-quota-bar { margin-top: 20px; padding-top: 16px; border-top: 1px solid #f1f3f5; }
  .pr-quota-header { display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 6px; }
  .pr-quota-label { font-weight: 600; color: #374151; }
  .pr-quota-val { color: #6b7280; }
  .pr-quota-track { height: 6px; background: #f1f3f5; border-radius: 100px; overflow: hidden; }
  .pr-quota-fill { height: 100%; border-radius: 100px; background: #90C450; }

  /* Success */
  .pr-success {
    text-align: center; padding: 60px 32px;
    display: flex; flex-direction: column; align-items: center; gap: 16px;
  }
  .pr-success-icon { width: 72px; height: 72px; border-radius: 50%; background: #ecfdf5; display: flex; align-items: center; justify-content: center; }
  .pr-success-title { font-size: 22px; font-weight: 800; color: #111827; }
  .pr-success-sub { font-size: 14px; color: #6b7280; line-height: 1.6; }
  .pr-success-code { background: #f8f9fc; border-radius: 8px; padding: 14px 24px; font-size: 18px; font-weight: 800; color: #90C450; letter-spacing: 2px; }

  @media (max-width: 1000px) {
    .pr-layout { grid-template-columns: 1fr; }
    .pr-summary-card { position: static; }
  }
`;

const STEPS = ["행사 선택", "정보 입력", "등록 완료"];

const TICKETS = [
  { key: "general", name: "일반 입장", price: "무료" },
  { key: "vip", name: "VIP 패키지", price: "₩50,000" },
  { key: "family", name: "가족 패키지", price: "₩30,000" },
];

const EVENTS = [
  {
    id: 1,
    category: "컨퍼런스",
    title: "2026 클라우드 테크 서밋",
    date: "2026.03.05",
    time: "09:00 ~ 17:30",
    location: "코엑스 컨벤션홀, 서울",
    capacity: 1200,
    registered: 748,
  },
  {
    id: 2,
    category: "워크샵",
    title: "AI & 머신러닝 실전 워크샵",
    date: "2026.03.08",
    time: "14:00 ~ 18:00",
    location: "강남 D.CAMP, 서울",
    capacity: 80,
    registered: 62,
  },
  {
    id: 3,
    category: "세미나",
    title: "디지털 마케팅 전략 세미나",
    date: "2026.03.12",
    time: "10:00 ~ 13:00",
    location: "여의도 IFC, 서울",
    capacity: 300,
    registered: 189,
  },
];

export default function PreRegister() {
  const [step, setStep] = useState(0);
  const [selectedEvent, setSelectedEvent] = useState("");
  const [ticket, setTicket] = useState("general");
  const [agrees, setAgrees] = useState({});
  const [form, setForm] = useState({ name: "", email: "", phone: "", org: "" });
  const [done, setDone] = useState(false);
  const [currentPath, setCurrentPath] = useState("/event/preregister");

  const ev = EVENTS.find((e) => e.id === Number(selectedEvent));
  const pct = ev ? Math.round((ev.registered / ev.capacity) * 100) : 0;

  const toggleAgree = (k) => setAgrees((a) => ({ ...a, [k]: !a[k] }));

  const handleSubmit = () => {
    if (!form.name || !form.email || !selectedEvent) return;
    setDone(true);
  };

  const regCode =
    "REG-2026-" + String(Math.floor(Math.random() * 90000) + 10000);

  return (
    <div className="pr-root">
      <style>{styles}</style>
      <PageHeader
        title="행사 사전 등록"
        subtitle={SUBTITLE_MAP[currentPath]}
        icon={<ClipboardList size={42} color="#90C450" strokeWidth={1.6} />}
        titleStyle={{ fontSize: 46, lineHeight: "66px", letterSpacing: "-1px" }}
        subtitleStyle={{ fontSize: 20 }}
        categories={SERVICE_CATEGORIES}
        currentPath={currentPath}
        onNavigate={setCurrentPath}
      />

      <main className="pr-container">
        {/* Steps */}
        <div className="pr-steps">
          {STEPS.map((s, i) => {
            const state =
              done && i === 2
                ? "done"
                : i === (done ? 2 : step)
                  ? "active"
                  : i < step
                    ? "done"
                    : "idle";
            return (
              <div key={s} style={{ display: "flex", alignItems: "center" }}>
                <div className={`pr-step ${state}`}>
                  <div className="pr-step-num">
                    {state === "done" && i !== (done ? 2 : step) ? (
                      <CheckCircle2 size={14} />
                    ) : (
                      i + 1
                    )}
                  </div>
                  <span className="pr-step-label">{s}</span>
                </div>
                {i < STEPS.length - 1 && (
                  <ArrowRight size={16} className="pr-step-arrow" />
                )}
              </div>
            );
          })}
        </div>

        {done ? (
          <div className="pr-card">
            <div className="pr-success">
              <div className="pr-success-icon">
                <CheckCircle2 size={36} color="#3a4520" />
              </div>
              <div className="pr-success-title">사전 등록 완료!</div>
              <div className="pr-success-sub">
                {form.name}님의 사전 등록이 완료되었습니다.
                <br />
                등록 확인 이메일을 <strong>{form.email}</strong>으로
                발송했습니다.
              </div>
              <div className="pr-success-code">{regCode}</div>
              <div style={{ fontSize: 12, color: "#9ca3af" }}>
                위 코드를 행사 당일 제시해 주세요.
              </div>
            </div>
          </div>
        ) : (
          <div className="pr-layout">
            <div className="pr-card">
              <div className="pr-card-title">
                <div className="pr-card-title-icon">
                  <ClipboardList size={14} color="#90C450" />
                </div>
                사전 등록 신청
              </div>

              {/* 행사 선택 */}
              <div className="pr-form-group">
                <div className="pr-label">
                  참가 행사 선택 <span className="pr-required">필수</span>
                </div>
                <div className="pr-select-wrap">
                  <select
                    className="pr-select"
                    value={selectedEvent}
                    onChange={(e) => setSelectedEvent(e.target.value)}
                  >
                    <option value="">행사를 선택하세요</option>
                    {EVENTS.map((ev) => (
                      <option key={ev.id} value={ev.id}>
                        {ev.title} ({ev.date})
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={15} className="pr-select-icon" />
                </div>
              </div>

              {/* 티켓 선택 */}
              <div className="pr-form-group">
                <div className="pr-label">티켓 유형</div>
                <div className="pr-ticket-grid">
                  {TICKETS.map((t) => (
                    <div
                      key={t.key}
                      className={`pr-ticket-opt${ticket === t.key ? " selected" : ""}`}
                      onClick={() => setTicket(t.key)}
                    >
                      <div className="pr-ticket-name">{t.name}</div>
                      <div className="pr-ticket-price">{t.price}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pr-row">
                <div className="pr-form-group">
                  <div className="pr-label">
                    <User size={12} />
                    이름 <span className="pr-required">필수</span>
                  </div>
                  <div className="pr-input-wrap">
                    <User size={15} className="pr-input-icon" />
                    <input
                      className="pr-input"
                      placeholder="홍길동"
                      value={form.name}
                      onChange={(e) =>
                        setForm({ ...form, name: e.target.value })
                      }
                    />
                  </div>
                </div>
                <div className="pr-form-group">
                  <div className="pr-label">
                    <Phone size={12} />
                    연락처
                  </div>
                  <div className="pr-input-wrap">
                    <Phone size={15} className="pr-input-icon" />
                    <input
                      className="pr-input"
                      placeholder="010-0000-0000"
                      value={form.phone}
                      onChange={(e) =>
                        setForm({ ...form, phone: e.target.value })
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="pr-form-group">
                <div className="pr-label">
                  <Mail size={12} />
                  이메일 <span className="pr-required">필수</span>
                </div>
                <div className="pr-input-wrap">
                  <Mail size={15} className="pr-input-icon" />
                  <input
                    className="pr-input"
                    placeholder="example@email.com"
                    value={form.email}
                    onChange={(e) =>
                      setForm({ ...form, email: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="pr-form-group">
                <div className="pr-label">
                  <Building2 size={12} />
                  소속 기관 / 회사
                </div>
                <div className="pr-input-wrap">
                  <Building2 size={15} className="pr-input-icon" />
                  <input
                    className="pr-input"
                    placeholder="(주)회사명"
                    value={form.org}
                    onChange={(e) => setForm({ ...form, org: e.target.value })}
                  />
                </div>
              </div>

              {/* 동의 */}
              <div className="pr-form-group" style={{ marginTop: 24 }}>
                <div className="pr-label">약관 동의</div>
                {[
                  {
                    key: "privacy",
                    label: "개인정보 수집 및 이용 동의",
                    req: true,
                  },
                  { key: "terms", label: "행사 참가 동의", req: true },
                  {
                    key: "marketing",
                    label: "마케팅 정보 수신 동의 (선택)",
                    req: false,
                  },
                ].map((a) => (
                  <div
                    key={a.key}
                    className="pr-agree-item"
                    onClick={() => toggleAgree(a.key)}
                  >
                    <div
                      className={`pr-checkbox${agrees[a.key] ? " checked" : ""}`}
                    >
                      {agrees[a.key] && <CheckCircle2 size={12} color="#fff" />}
                    </div>
                    <span className="pr-agree-label">
                      {a.label}
                      {a.req && (
                        <span className="pr-agree-required">(필수)</span>
                      )}
                    </span>
                  </div>
                ))}
              </div>

              <button className="pr-submit" onClick={handleSubmit}>
                사전 등록 신청하기 <ArrowRight size={16} />
              </button>
            </div>

            {/* Right summary */}
            <div className="pr-summary-card">
              <div className="pr-summary-banner">
                <div className="pr-summary-banner-cat">
                  {ev?.category ?? "행사를 선택해 주세요"}
                </div>
                <div className="pr-summary-banner-title">
                  {ev?.title ?? "—"}
                </div>
              </div>
              <div className="pr-summary-body">
                {ev ? (
                  <>
                    {[
                      {
                        icon: <Calendar size={14} />,
                        label: "일자",
                        val: ev.date,
                      },
                      {
                        icon: <Clock size={14} />,
                        label: "시간",
                        val: ev.time,
                      },
                      {
                        icon: <MapPin size={14} />,
                        label: "장소",
                        val: ev.location,
                      },
                    ].map((r) => (
                      <div key={r.label} className="pr-summary-row">
                        <div className="pr-summary-row-icon">{r.icon}</div>
                        <div>
                          <div className="pr-summary-row-label">{r.label}</div>
                          <div className="pr-summary-row-val">{r.val}</div>
                        </div>
                      </div>
                    ))}
                    <div className="pr-quota-bar">
                      <div className="pr-quota-header">
                        <span className="pr-quota-label">등록 현황</span>
                        <span className="pr-quota-val">
                          {ev.registered}/{ev.capacity}명 ({pct}%)
                        </span>
                      </div>
                      <div className="pr-quota-track">
                        <div
                          className="pr-quota-fill"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </>
                ) : (
                  <div
                    style={{
                      padding: "24px 0",
                      textAlign: "center",
                      color: "#9ca3af",
                      fontSize: 13,
                    }}
                  >
                    행사를 선택하면 상세 정보가 표시됩니다
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
