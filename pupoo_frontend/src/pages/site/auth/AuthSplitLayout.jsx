// 로그인·회원가입 공용 틀: 왼쪽 사진 + 소개 문구, 오른쪽 폼 (모바일은 사진이 위쪽 배너)
const MEDIA_BASE = (import.meta.env.VITE_MEDIA_BASE_URL || "https://pupoo-uploads-kgj.s3.ap-northeast-2.amazonaws.com").replace(/\/$/, "");
export const AUTH_BG_IMAGE = `${MEDIA_BASE}/image/portrait-dog-field.jpg`;
// 화면마다 다른 사진. 강아지가 크게 찍힌 사진은 문구를 아래(textAt: "bottom")에 두고 focus로 강아지를 가운데 맞춘다.
export const AUTH_IMAGES = {
  join: { image: `${MEDIA_BASE}/image/portrait-dog-grass.jpg`, focus: "50% 100%", zoom: "auto 120%", textAt: "bottom" },
  findPassword: { image: `${MEDIA_BASE}/image/dog-running-grass.jpg`, focus: "67% 100%", zoom: "auto 130%", textAt: "bottom" },
  resetPassword: { image: `${MEDIA_BASE}/image/${encodeURIComponent("dog-running-grass (1).jpg")}`, focus: "44% 100%", zoom: "auto 115%", textAt: "bottom" },
};

const styles = `
  .as-page {
    min-height: 100vh; width: 100%; box-sizing: border-box;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    padding: calc(var(--pupoo-site-header-offset, 92px) + 28px) 24px 36px;
    background: #f5f7f2; font-family: 'Noto Sans KR', sans-serif;
  }
  .as-card {
    width: 100%; max-width: 1120px; min-height: 700px; display: flex;
    background: #fff; border-radius: 28px; overflow: hidden;
    box-shadow: 0 30px 80px rgba(40, 60, 20, 0.12), 0 6px 20px rgba(0, 0, 0, 0.05);
  }

  .as-visual {
    position: relative; flex: 0 0 52%; display: flex; align-items: flex-start;
    background-color: #7ab33e; background-size: auto 135%; background-position: 50% 10%;
  }
  .as-visual-shade {
    position: absolute; inset: 0; pointer-events: none;
    background: linear-gradient(to bottom, rgba(15, 23, 12, 0.72) 0%, rgba(15, 23, 12, 0.38) 38%, rgba(15, 23, 12, 0) 62%);
  }
  .as-visual-body { position: relative; padding: 48px 52px; color: #fff; }
  .as-visual.text-bottom { align-items: flex-end; background-size: var(--as-zoom, cover); background-position: var(--as-focus, 50% 50%); }
  .as-visual.text-bottom .as-visual-shade {
    background: linear-gradient(to top, rgba(15, 23, 12, 0.8) 0%, rgba(15, 23, 12, 0.42) 34%, rgba(15, 23, 12, 0) 58%);
  }
  .as-visual-eyebrow {
    display: inline-block; margin-bottom: 18px; padding: 6px 12px; border-radius: 999px;
    background: rgba(255, 255, 255, 0.18); border: 1px solid rgba(255, 255, 255, 0.35);
    backdrop-filter: blur(6px); font-size: 11.5px; font-weight: 800; letter-spacing: 0.14em;
  }
  .as-visual-title {
    margin: 0 0 12px; font-size: 36px; font-weight: 800; line-height: 1.32; letter-spacing: -0.03em;
    text-shadow: 0 2px 18px rgba(0, 0, 0, 0.25); word-break: keep-all;
  }
  .as-visual-desc { margin: 0 0 22px; font-size: 15.5px; line-height: 1.6; color: rgba(255, 255, 255, 0.86); }
  .as-visual-chips { display: flex; flex-wrap: wrap; gap: 8px; }
  .as-visual-chips span {
    display: inline-flex; align-items: center; gap: 6px; height: 34px; padding: 0 14px; border-radius: 999px;
    background: rgba(255, 255, 255, 0.16); border: 1px solid rgba(255, 255, 255, 0.28);
    backdrop-filter: blur(6px); font-size: 13px; font-weight: 700;
  }

  .as-form { flex: 1; display: flex; flex-direction: column; justify-content: center; padding: 44px 68px; }
  .as-form-head { margin-bottom: 26px; }
  .as-form-title { margin: 0 0 8px; font-size: 34px; font-weight: 800; letter-spacing: -0.03em; color: #111827; }
  .as-form-sub { margin: 0; font-size: 15px; color: #6b7280; }

  .as-divider { display: flex; align-items: center; gap: 14px; margin: 24px 0 14px; font-size: 13px; color: #9ca3af; }
  .as-divider::before, .as-divider::after { content: ""; flex: 1; height: 1px; background: #eceef1; }

  .as-foot { margin-top: 22px; text-align: center; font-size: 14.5px; color: #6b7280; }
  .as-foot a { margin-left: 8px; font-weight: 800; color: #5E8F2A; text-decoration: none; }
  .as-foot a:hover { text-decoration: underline; text-underline-offset: 3px; }

  .as-contact { margin-top: 20px; font-size: 13px; color: #9ca3af; text-align: center; }
  .as-contact strong { color: #6b7280; font-weight: 700; }

  /* 공용 폼 요소 */
  .as-label { display: block; margin: 0 0 8px; font-size: 14px; font-weight: 700; color: #374151; }
  .as-field {
    position: relative; display: flex; align-items: center; height: 54px; margin-bottom: 16px;
    border: 1.5px solid #e5e7eb; border-radius: 14px; background: #fafbfa;
    transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
  }
  .as-field:focus-within { border-color: #90C450; background: #fff; box-shadow: 0 0 0 4px rgba(144, 196, 80, 0.16); }
  .as-field.is-done { background: #f3f4f6; }
  .as-field-icon { flex-shrink: 0; margin-left: 18px; color: #9ca3af; }
  .as-field:focus-within .as-field-icon { color: #6FA436; }
  .as-field input {
    flex: 1; min-width: 0; height: 100%; padding: 0 14px; border: none; outline: none; background: transparent;
    font-size: 16px; font-family: inherit; color: #111827;
  }
  .as-field input::placeholder { color: #b0b6bf; }
  .as-field input:disabled { color: #6b7280; }
  .as-eye {
    flex-shrink: 0; display: inline-flex; align-items: center; justify-content: center;
    width: 44px; height: 44px; margin-right: 6px; border: none; border-radius: 10px;
    background: transparent; color: #9ca3af; cursor: pointer;
  }
  .as-eye:hover { background: #f3f4f6; color: #374151; }
  .as-link { font-size: 14px; font-weight: 600; color: #6b7280; text-decoration: none; background: none; border: none; padding: 0; cursor: pointer; font-family: inherit; }
  .as-link:hover { color: #111827; text-decoration: underline; text-underline-offset: 3px; }

  .as-error, .as-success {
    margin: -6px 0 16px; padding: 12px 14px; border-radius: 12px; font-size: 13.5px; font-weight: 600; line-height: 1.5;
  }
  .as-error { background: #fef2f2; border: 1px solid #fecaca; color: #b91c1c; }
  .as-success { background: #f4f8ee; border: 1px solid #d7e9c0; color: #4d7a1f; }
  .as-submit {
    width: 100%; height: 56px; border: none; border-radius: 14px; background: #6FA436; color: #fff;
    font-size: 17px; font-weight: 800; font-family: inherit; letter-spacing: 0.02em; cursor: pointer;
    box-shadow: 0 10px 24px rgba(111, 164, 54, 0.28); transition: background 0.2s, transform 0.15s, box-shadow 0.2s;
  }
  .as-submit:hover { background: #5E8F2A; box-shadow: 0 12px 28px rgba(94, 143, 42, 0.34); }
  .as-submit:active { transform: translateY(1px); }
  .as-submit:disabled { opacity: 0.7; cursor: default; }
  .as-submit.ghost { background: #fff; color: #5E8F2A; border: 1.5px solid #90C450; box-shadow: none; }
  .as-submit.ghost:hover { background: #f4f8ee; }

  @media (max-width: 1023px) {
    .as-card { min-height: 640px; }
    .as-visual { flex-basis: 46%; }
    .as-visual-body { padding: 36px 32px; }
    .as-visual-title { font-size: 30px; }
    .as-visual-chips { display: none; }
    .as-form { padding: 44px 40px; }
  }
  @media (max-width: 767px) {
    .as-page { justify-content: flex-start; padding: calc(var(--pupoo-site-header-offset, 72px) + 16px) 16px 32px; }
    .as-card { flex-direction: column; min-height: 0; border-radius: 22px; }
    .as-visual { flex-basis: auto; min-height: 250px; background-size: cover; background-position: 50% 62%; }
    .as-visual.text-bottom { min-height: 300px; background-size: var(--as-zoom, cover); background-position: var(--as-focus, 50% 50%); }
    .as-visual-body { padding: 20px 22px; }
    .as-visual-eyebrow, .as-visual-desc, .as-visual-chips { display: none; }
    .as-visual-title { margin: 0; font-size: 20px; }
    .as-form { padding: 28px 22px 30px; }
    .as-form-head { margin-bottom: 24px; }
    .as-form-title { font-size: 26px; }
    .as-field { height: 52px; }
  }
`;

/**
 * visual: { eyebrow, title(node), desc, chips: [{ icon, label }], image, focus(위치), zoom(background-size), textAt }
 * title / sub: 오른쪽 폼 머리
 */
export default function AuthSplitLayout({ visual = {}, title, sub, children }) {
  return (
    <div className="as-page">
      <style>{styles}</style>
      <div className="as-card card-enter">
        <div
          className={`as-visual${visual.textAt === "bottom" ? " text-bottom" : ""}`}
          style={{
            backgroundImage: `url("${visual.image || AUTH_BG_IMAGE}")`,
            ...(visual.focus ? { "--as-focus": visual.focus } : null),
            ...(visual.zoom ? { "--as-zoom": visual.zoom } : null),
          }}
        >
          <div className="as-visual-shade" />
          <div className="as-visual-body">
            {visual.eyebrow ? <span className="as-visual-eyebrow">{visual.eyebrow}</span> : null}
            <h1 className="as-visual-title">{visual.title}</h1>
            {visual.desc ? <p className="as-visual-desc">{visual.desc}</p> : null}
            {visual.chips?.length ? (
              <div className="as-visual-chips">
                {visual.chips.map(({ icon: Icon, label }) => (
                  <span key={label}>{Icon ? <Icon size={14} /> : null}{label}</span>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        <div className="as-form">
          <div className="as-form-head">
            <h2 className="as-form-title">{title}</h2>
            {sub ? <p className="as-form-sub">{sub}</p> : null}
          </div>
          {children}
        </div>
      </div>

      <div className="as-contact">
        멤버십 문의 <strong>dogcat@imqa.io</strong> · Tel 02-123-1234
      </div>
    </div>
  );
}
