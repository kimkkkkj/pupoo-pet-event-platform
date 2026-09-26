import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUp, ChevronRight, RotateCcw, Sparkles, X } from "lucide-react";
import Lottie from "lottie-react";
import dogLottie from "../../../../public/dog-lottie.json";
import { useSiteChatBot } from "./useSiteChatBot";

// 처음 방문한 사람에게 한 번만 보여주는 안내 말풍선
const INTRO_SEEN_KEY = "pupoo_ai_intro_seen";
const readIntroSeen = () => { try { return localStorage.getItem(INTRO_SEEN_KEY) === "1"; } catch { return true; } };
const writeIntroSeen = () => { try { localStorage.setItem(INTRO_SEEN_KEY, "1"); } catch { /* 저장소를 못 쓰면 무시 */ } };

const styles = `
  .ai { --ink: #1c1917; --sub: #57534e; --mute: #a8a29e; --line: #e7e5e0; --soft: #f5f5f3; --green: #6FA436; --green-dark: #5E8F2A; --green-soft: #f1f6ea;
        font-family: 'Pretendard Variable', 'Pretendard', 'Noto Sans KR', sans-serif; }
  .ai * { box-sizing: border-box; }

  /* ── 여는 버튼 ── */
  .ai-fab { position: fixed; right: 24px; bottom: 24px; z-index: 10000; display: flex; align-items: center; gap: 12px; height: 64px; padding: 0 22px 0 8px;
            border: none; border-radius: 999px; background: var(--ink); color: #fff; cursor: pointer; font-family: inherit;
            box-shadow: 0 14px 34px rgba(28, 25, 23, .28); transition: transform .18s, box-shadow .18s; }
  .ai-fab:hover { transform: translateY(-2px); box-shadow: 0 18px 40px rgba(28, 25, 23, .34); }
  .ai-fab-face { position: relative; width: 48px; height: 48px; border-radius: 50%; background: var(--green); overflow: hidden; flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
  .ai-fab-face > div { width: 60px; height: 60px; transform: scale(1.1); }
  .ai-fab-text { display: flex; flex-direction: column; align-items: flex-start; line-height: 1.2; }
  .ai-fab-title { display: inline-flex; align-items: center; gap: 6px; font-size: 16px; font-weight: 800; }
  .ai-fab-sub { margin-top: 3px; font-size: 13px; font-weight: 500; color: rgba(255,255,255,.72); }
  .ai-badge { display: inline-flex; align-items: center; gap: 3px; height: 20px; padding: 0 7px; border-radius: 6px; background: var(--green); color: #fff; font-size: 11.5px; font-weight: 900; letter-spacing: .04em; }
  .ai-fab-dot { position: absolute; right: 2px; bottom: 2px; width: 12px; height: 12px; border-radius: 50%; background: #4ade80; border: 2px solid var(--green); }

  .ai-intro { position: fixed; right: 24px; bottom: 100px; z-index: 10000; width: 280px; padding: 16px 40px 16px 18px; border-radius: 16px; background: #fff; color: var(--ink);
              box-shadow: 0 14px 36px rgba(28, 25, 23, .18); animation: ai-pop .3s ease-out; }
  .ai-intro::after { content: ""; position: absolute; right: 40px; bottom: -8px; width: 16px; height: 16px; background: #fff; transform: rotate(45deg); }
  .ai-intro b { display: block; margin-bottom: 4px; font-size: 15.5px; }
  .ai-intro span { font-size: 14px; line-height: 1.55; color: var(--sub); }
  .ai-intro-close { position: absolute; top: 8px; right: 8px; width: 28px; height: 28px; border: none; border-radius: 8px; background: none; color: var(--mute); cursor: pointer; display: flex; align-items: center; justify-content: center; }
  .ai-intro-close:hover { background: var(--soft); color: var(--ink); }

  /* ── 채팅창 ── */
  .ai-panel { position: fixed; right: 24px; bottom: 24px; z-index: 10001; width: 400px; height: min(640px, calc(100dvh - 120px)); display: flex; flex-direction: column;
              border-radius: 24px; background: #fff; overflow: hidden; box-shadow: 0 24px 64px rgba(28, 25, 23, .26), 0 0 0 1px rgba(28, 25, 23, .06); animation: ai-pop .25s ease-out; }
  @keyframes ai-pop { from { opacity: 0; transform: translateY(14px) scale(.98); } to { opacity: 1; transform: none; } }

  .ai-head { display: flex; align-items: center; gap: 12px; padding: 16px 16px 14px 18px; border-bottom: 1px solid var(--line); }
  .ai-head-face { position: relative; width: 44px; height: 44px; border-radius: 50%; background: var(--green); overflow: hidden; flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
  .ai-head-face > div { width: 54px; height: 54px; transform: scale(1.1); }
  .ai-head-title { display: flex; align-items: center; gap: 7px; font-size: 17px; font-weight: 800; color: var(--ink); }
  .ai-head-sub { margin-top: 3px; display: flex; align-items: center; gap: 6px; font-size: 13px; color: var(--sub); }
  .ai-head-sub i { width: 7px; height: 7px; border-radius: 50%; background: #22c55e; }
  .ai-icon-btn { width: 36px; height: 36px; border: none; border-radius: 10px; background: none; color: var(--sub); cursor: pointer; display: flex; align-items: center; justify-content: center; }
  .ai-icon-btn:hover { background: var(--soft); color: var(--ink); }

  .ai-body { flex: 1; overflow-y: auto; padding: 18px 16px 10px; background: #fafaf8; }
  .ai-body::-webkit-scrollbar { width: 5px; }
  .ai-body::-webkit-scrollbar-thumb { background: #dcd9d3; border-radius: 3px; }

  /* 첫 화면 */
  .ai-hello { padding: 6px 4px 4px; }
  .ai-hello h3 { margin: 0 0 6px; font-size: 22px; font-weight: 800; letter-spacing: -0.03em; color: var(--ink); line-height: 1.35; word-break: keep-all; }
  .ai-hello p { margin: 0; font-size: 14.5px; line-height: 1.6; color: var(--sub); word-break: keep-all; }
  .ai-sec { margin: 22px 4px 10px; font-size: 13px; font-weight: 800; color: var(--mute); }
  .ai-questions { display: flex; flex-direction: column; gap: 8px; }
  .ai-question { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 14px 14px 14px 16px; border-radius: 14px; border: 1px solid var(--line); background: #fff;
                 font-family: inherit; font-size: 15px; font-weight: 600; color: var(--ink); text-align: left; cursor: pointer; transition: border-color .15s, background .15s; }
  .ai-question:hover { border-color: var(--green); background: var(--green-soft); }
  .ai-question svg { color: var(--mute); flex-shrink: 0; }
  .ai-links { display: flex; flex-wrap: wrap; gap: 6px; }
  .ai-link { height: 34px; padding: 0 12px; border-radius: 999px; border: 1px solid var(--line); background: #fff; font-family: inherit; font-size: 13.5px; font-weight: 600; color: var(--sub); cursor: pointer; }
  .ai-link:hover { border-color: var(--ink); color: var(--ink); }

  /* 대화 */
  .ai-msg { display: flex; gap: 8px; margin-bottom: 14px; animation: ai-in .22s ease-out; }
  @keyframes ai-in { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
  .ai-msg.me { justify-content: flex-end; }
  .ai-msg-face { width: 30px; height: 30px; border-radius: 50%; background: var(--green); color: #fff; flex-shrink: 0; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 900; }
  .ai-msg-col { max-width: 82%; display: flex; flex-direction: column; gap: 6px; }
  .ai-msg.me .ai-msg-col { align-items: flex-end; }
  .ai-name { font-size: 12.5px; font-weight: 700; color: var(--sub); }
  .ai-bubble { padding: 12px 14px; border-radius: 4px 16px 16px 16px; background: #fff; border: 1px solid var(--line); font-size: 14.5px; line-height: 1.65; color: var(--ink); white-space: pre-line; word-break: keep-all; }
  .ai-msg.me .ai-bubble { border-radius: 16px 4px 16px 16px; background: var(--ink); border-color: var(--ink); color: #fff; }
  .ai-time { font-size: 11.5px; color: var(--mute); }
  .ai-actions { display: flex; flex-wrap: wrap; gap: 6px; }
  .ai-action { display: inline-flex; align-items: center; gap: 3px; height: 34px; padding: 0 12px; border-radius: 999px; border: 1px solid var(--green); background: #fff; font-family: inherit; font-size: 13.5px; font-weight: 700; color: var(--green-dark); cursor: pointer; }
  .ai-action:hover { background: var(--green-soft); }
  .ai-summary { width: 100%; padding: 12px; border-radius: 14px; background: #fff; border: 1px solid var(--line); display: grid; gap: 8px; }
  .ai-summary-title { font-size: 13px; font-weight: 800; color: var(--green-dark); }
  .ai-summary-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px; }
  .ai-summary-item { padding: 10px; border-radius: 10px; background: var(--soft); }
  .ai-summary-item small { display: block; font-size: 12px; color: var(--sub); margin-bottom: 3px; }
  .ai-summary-item b { font-size: 14px; color: var(--ink); line-height: 1.45; word-break: keep-all; }
  .ai-summary-sec { font-size: 13px; font-weight: 800; color: var(--ink); margin-top: 4px; }
  .ai-typing { display: inline-flex; gap: 4px; padding: 14px 16px; border-radius: 4px 16px 16px 16px; background: #fff; border: 1px solid var(--line); }
  .ai-typing span { width: 7px; height: 7px; border-radius: 50%; background: var(--green); animation: ai-dot 1.3s ease-in-out infinite; }
  .ai-typing span:nth-child(2) { animation-delay: .15s; } .ai-typing span:nth-child(3) { animation-delay: .3s; }
  @keyframes ai-dot { 0%, 60%, 100% { opacity: .3; transform: translateY(0); } 30% { opacity: 1; transform: translateY(-4px); } }

  /* 입력 */
  .ai-foot { padding: 10px 14px 12px; border-top: 1px solid var(--line); background: #fff; }
  .ai-input { display: flex; align-items: flex-end; gap: 8px; padding: 6px 6px 6px 16px; border-radius: 16px; border: 1.5px solid var(--line); background: #fff; transition: border-color .15s, box-shadow .15s; }
  .ai-input:focus-within { border-color: var(--green); box-shadow: 0 0 0 4px rgba(111, 164, 54, .12); }
  .ai-input textarea { flex: 1; min-width: 0; max-height: 110px; padding: 9px 0; border: none; outline: none; resize: none; background: transparent; font-family: inherit; font-size: 15px; line-height: 1.5; color: var(--ink); }
  .ai-input textarea::placeholder { color: var(--mute); }
  .ai-send { width: 40px; height: 40px; border: none; border-radius: 12px; background: var(--green); color: #fff; cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .ai-send:disabled { background: #e7e5e0; color: #a8a29e; cursor: default; }
  .ai-note { margin: 8px 2px 0; font-size: 12px; color: var(--mute); text-align: center; }

  @media (max-width: 767px) {
    .ai-fab { right: 12px; bottom: 14px; height: 56px; padding: 0 16px 0 6px; gap: 10px; }
    .ai-fab-face { width: 44px; height: 44px; }
    .ai-fab-title { font-size: 15px; }
    .ai-fab-sub { display: none; }
    .ai-intro { right: 12px; bottom: 82px; width: calc(100vw - 24px); max-width: 300px; }
    .ai-panel { right: 0; bottom: 0; width: 100vw; height: calc(100dvh - 56px); border-radius: 22px 22px 0 0; }
    .ai-foot { padding-bottom: calc(env(safe-area-inset-bottom, 0px) + 12px); }
  }
`;

function fmt(date) {
  const d = date instanceof Date ? date : new Date(date);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function DogFace({ className }) {
  return (
    <span className={className} aria-hidden="true">
      <div><Lottie animationData={dogLottie} loop autoplay style={{ width: "100%", height: "100%" }} /></div>
    </span>
  );
}

function Summary({ summary }) {
  if (!summary?.items?.length && !summary?.sections?.length) return null;
  return (
    <div className="ai-summary">
      <div className="ai-summary-title">{summary.title || "한눈에 보기"}</div>
      {summary.items?.length ? (
        <div className="ai-summary-grid">
          {summary.items.map((item) => (
            <div key={`${summary.summaryType}-${item.label}`} className="ai-summary-item">
              <small>{item.label}</small>
              <b>{item.value}{item.meta ? ` · ${item.meta}` : ""}</b>
            </div>
          ))}
        </div>
      ) : null}
      {summary.sections?.map((section) => (
        <div key={section.key}>
          <div className="ai-summary-sec">{section.title}</div>
          <div className="ai-summary-grid" style={{ marginTop: 6 }}>
            {section.items.map((item) => (
              <div key={`${section.key}-${item.label}`} className="ai-summary-item">
                <small>{item.label}</small>
                <b>{item.value}</b>
                {item.meta ? <small style={{ marginTop: 3 }}>{item.meta}</small> : null}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function Message({ msg, showTime, onSelectAction }) {
  const isBot = msg.role === "bot";
  return (
    <div className={`ai-msg${isBot ? "" : " me"}`}>
      {isBot ? <span className="ai-msg-face">AI</span> : null}
      <div className="ai-msg-col">
        {isBot ? <span className="ai-name">AI 도우미 푸리</span> : null}
        <div className="ai-bubble">{msg.text}</div>
        {isBot ? <Summary summary={msg.summary} /> : null}
        {isBot && msg.actions?.length ? (
          <div className="ai-actions">
            {msg.actions.map((action, i) => (
              <button key={`${action.type}-${action.payload?.label || i}`} type="button" className="ai-action" onClick={() => onSelectAction(action)}>
                {action.payload?.label || "바로가기"}<ChevronRight size={14} />
              </button>
            ))}
          </div>
        ) : null}
        {showTime ? <span className="ai-time">{fmt(msg.ts)}</span> : null}
      </div>
    </div>
  );
}

export default function SiteChatBot() {
  const {
    isOpen, toggle, close, messages, input, setInput, isTyping,
    quickActions, triggerQuickAction, handleMessageAction, sendMessage, resetConversation,
  } = useSiteChatBot();

  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const [isHomeView, setIsHomeView] = useState(true);
  const [showIntro, setShowIntro] = useState(false);

  // 처음 방문이면 2초 뒤 안내 말풍선
  useEffect(() => {
    if (readIntroSeen()) return undefined;
    const t = setTimeout(() => setShowIntro(true), 2000);
    return () => clearTimeout(t);
  }, []);
  const dismissIntro = () => { setShowIntro(false); writeIntroSeen(); };

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, isTyping, isHomeView]);
  useEffect(() => {
    if (!isOpen) return undefined;
    dismissIntro();
    const t = setTimeout(() => inputRef.current?.focus(), 150);
    return () => clearTimeout(t);
  }, [isOpen]);

  // 첫 화면: 질문 예시(정보 요청)와 바로가기(화면 이동)를 나눠 보여준다
  const questions = useMemo(() => quickActions.filter((a) => a.category !== "navigate").slice(0, 5), [quickActions]);
  const shortcuts = useMemo(() => quickActions.filter((a) => a.category === "navigate").slice(0, 6), [quickActions]);

  const send = () => { if (!input.trim() || isTyping) return; setIsHomeView(false); sendMessage(); };
  const onKey = (e) => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); send(); } };
  const pick = (action) => { setIsHomeView(false); triggerQuickAction(action); };
  const reset = () => { resetConversation(); setIsHomeView(true); };

  const botCount = messages.filter((m) => m.role !== "bot").length;

  return (
    <div className="ai">
      <style>{styles}</style>

      {isOpen ? (
        <section className="ai-panel" role="dialog" aria-label="AI 도우미 채팅">
          <header className="ai-head">
            <DogFace className="ai-head-face" />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="ai-head-title">AI 도우미 푸리 <span className="ai-badge"><Sparkles size={11} />AI</span></div>
              <div className="ai-head-sub"><i />행사·결제·입장 방법을 도와드려요</div>
            </div>
            {!isHomeView || botCount ? (
              <button type="button" className="ai-icon-btn" onClick={reset} title="새 대화" aria-label="새 대화 시작"><RotateCcw size={17} /></button>
            ) : null}
            <button type="button" className="ai-icon-btn" onClick={close} title="닫기" aria-label="채팅 닫기"><X size={20} /></button>
          </header>

          <div className="ai-body">
            {isHomeView ? (
              <>
                <div className="ai-hello">
                  <h3>안녕하세요!<br />푸푸 AI 도우미 푸리예요</h3>
                  <p>행사 일정, 참가 신청, 결제·환불, 입장 QR까지 궁금한 걸 편하게 물어보세요. 아래 질문을 눌러도 돼요.</p>
                </div>
                {questions.length ? (
                  <>
                    <div className="ai-sec">이런 걸 물어보세요</div>
                    <div className="ai-questions">
                      {questions.map((q) => (
                        <button key={q.id} type="button" className="ai-question" onClick={() => pick(q)}>
                          {q.prompt || q.label}<ChevronRight size={17} />
                        </button>
                      ))}
                    </div>
                  </>
                ) : null}
                {shortcuts.length ? (
                  <>
                    <div className="ai-sec">바로가기</div>
                    <div className="ai-links">
                      {shortcuts.map((s) => <button key={s.id} type="button" className="ai-link" onClick={() => pick(s)}>{s.label}</button>)}
                    </div>
                  </>
                ) : null}
              </>
            ) : (
              <>
                {messages.map((msg, i) => (
                  <Message
                    key={msg.id}
                    msg={msg}
                    showTime={i === messages.length - 1 || messages[i + 1]?.role !== msg.role}
                    onSelectAction={handleMessageAction}
                  />
                ))}
                {isTyping ? (
                  <div className="ai-msg">
                    <span className="ai-msg-face">AI</span>
                    <div className="ai-typing" aria-label="답변 작성 중"><span /><span /><span /></div>
                  </div>
                ) : null}
              </>
            )}
            <div ref={bottomRef} />
          </div>

          <footer className="ai-foot">
            <div className="ai-input">
              <textarea
                ref={inputRef}
                rows={1}
                value={input}
                placeholder="예) 이번 주말에 열리는 행사 알려줘"
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKey}
                onInput={(e) => { e.target.style.height = "auto"; e.target.style.height = `${Math.min(e.target.scrollHeight, 110)}px`; }}
              />
              <button type="button" className="ai-send" onClick={send} disabled={!input.trim() || isTyping} aria-label="보내기"><ArrowUp size={19} strokeWidth={2.6} /></button>
            </div>
            <p className="ai-note">AI 답변은 정확하지 않을 수 있어요. 결제·환불은 신청 내역에서 꼭 확인해 주세요.</p>
          </footer>
        </section>
      ) : (
        <>
          {showIntro ? (
            <div className="ai-intro" role="status">
              <b>궁금한 게 있으신가요?</b>
              <span>AI 도우미 푸리에게 행사·결제·입장 방법을 편하게 물어보세요.</span>
              <button type="button" className="ai-intro-close" onClick={dismissIntro} aria-label="안내 닫기"><X size={16} /></button>
            </div>
          ) : null}
          <button type="button" className="ai-fab" onClick={toggle} aria-label="AI 도우미 채팅 열기">
            <span style={{ position: "relative" }}>
              <DogFace className="ai-fab-face" />
              <span className="ai-fab-dot" />
            </span>
            <span className="ai-fab-text">
              <span className="ai-fab-title">AI 도우미 <span className="ai-badge"><Sparkles size={11} />AI</span></span>
              <span className="ai-fab-sub">무엇이든 물어보세요</span>
            </span>
          </button>
        </>
      )}
    </div>
  );
}
