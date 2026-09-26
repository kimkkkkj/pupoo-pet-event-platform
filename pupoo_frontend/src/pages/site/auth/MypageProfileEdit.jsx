import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { mypageApi } from "./api/mypageApi";
import { authApi } from "./api/authApi";
import { userApi } from "../../../features/user/api/userApi";
import { resolveErrorMessage, toFieldMessageMap } from "../../../features/shared/forms/formError";
import { formatPhoneForDisplay, getSmsRequestErrorMessage, normalizeDigits, toKoreanPhoneE164 } from "../../../features/auth/utils/smsAuth";
import { AlertCircle, ArrowLeft, Check } from "lucide-react";

function formatDateTimeDisplay(value) {
  if (!value) return "";
  const date = new Date(value);
  if (!Number.isNaN(date.getTime())) {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    const hh = String(date.getHours()).padStart(2, "0");
    const min = String(date.getMinutes()).padStart(2, "0");
    const ss = String(date.getSeconds()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`;
  }
  const normalized = String(value).trim().replace("T", " ").replace(/\.\d+$/, "");
  const m = normalized.match(/^(\d{4}-\d{2}-\d{2})(?:\s+(\d{2}:\d{2}:\d{2}))?/);
  if (!m) return String(value);
  return `${m[1]} ${m[2] || "00:00:00"}`;
}

// +821012345678 / 01012345678 → 010-1234-5678
function toLocalPhone(value) {
  let d = String(value || "").replace(/[^0-9]/g, "");
  if (d.startsWith("82")) d = `0${d.slice(2)}`;
  if (d.length === 11) return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
  return value || "";
}

// 화면 표시용: 2026.03.09 16:42
function toShortDateTime(value) {
  const full = formatDateTimeDisplay(value);
  return full ? full.slice(0, 16).replace(/-/g, ".") : "";
}

const css = `
  .pf { --ink: #1c1917; --sub: #57534e; --mute: #a8a29e; --line: #e7e5e0; --soft: #f5f5f3; --accent: #5E8F2A;
        background: #f7f7f5; min-height: 100vh; color: var(--ink); font-family: 'Pretendard Variable', 'Pretendard', 'Noto Sans KR', sans-serif; }
  .pf * { box-sizing: border-box; }
  .pf-wrap { width: min(720px, calc(100% - 32px)); margin: 0 auto; padding: calc(var(--pupoo-site-header-offset, 92px) + 32px) 0 96px; }
  .pf-back { display: inline-flex; align-items: center; gap: 6px; height: 40px; padding: 0 14px; border-radius: 10px; border: 1px solid var(--line); background: #fff; font-family: inherit; font-size: 14.5px; font-weight: 700; color: var(--ink); cursor: pointer; }
  .pf-back:hover { border-color: var(--ink); }
  .pf-title { margin: 22px 0 6px; font-size: 32px; font-weight: 800; letter-spacing: -0.03em; }
  .pf-desc { margin: 0 0 24px; font-size: 16px; color: var(--sub); }
  .pf-error { display: flex; gap: 8px; align-items: flex-start; margin-bottom: 18px; padding: 13px 16px; border-radius: 12px; border: 1px solid #efd9c7; background: #fdf6f0; color: #8a4a1c; font-size: 14.5px; font-weight: 600; }
  .pf-panel { background: #fff; border: 1px solid var(--line); border-radius: 18px; padding: 26px 28px; margin-bottom: 16px; }
  .pf-sec { margin: 0 0 4px; font-size: 20px; font-weight: 800; letter-spacing: -0.02em; }
  .pf-sec-note { margin: 0 0 18px; font-size: 14.5px; color: var(--sub); }
  .pf-label { display: block; margin-bottom: 10px; font-size: 15px; font-weight: 800; }
  .pf-row { display: flex; gap: 8px; }
  .pf-input { flex: 1; min-width: 0; height: 54px; padding: 0 16px; border-radius: 12px; border: 1.5px solid var(--line); background: #fff; font-family: inherit; font-size: 16px; color: var(--ink); outline: none; transition: border-color .15s, box-shadow .15s; }
  .pf-input:focus { border-color: var(--accent); box-shadow: 0 0 0 4px rgba(94, 143, 42, .12); }
  .pf-input::placeholder { color: var(--mute); }
  .pf-input:disabled { background: var(--soft); color: var(--sub); }
  .pf-btn { height: 54px; padding: 0 18px; border-radius: 12px; border: 1px solid var(--line); background: #fff; font-family: inherit; font-size: 15px; font-weight: 700; color: var(--ink); cursor: pointer; white-space: nowrap; }
  .pf-btn:hover { border-color: var(--ink); }
  .pf-btn:disabled { opacity: .5; cursor: default; }
  .pf-btn.dark { background: var(--ink); border-color: var(--ink); color: #fff; }
  .pf-msg { margin-top: 8px; font-size: 14px; font-weight: 600; }
  .pf-msg.ok { color: #3f7d3a; }
  .pf-msg.bad { color: #b91c1c; }
  .pf-msg.info { color: var(--sub); font-weight: 500; }

  .pf-info { margin: 0; border-top: 1px solid var(--line); }
  .pf-info-row { display: grid; grid-template-columns: 110px minmax(0, 1fr) auto; gap: 14px; align-items: center; padding: 16px 2px; border-bottom: 1px solid var(--line); }
  .pf-info dt { font-size: 15px; font-weight: 600; color: var(--sub); }
  .pf-info dd { margin: 0; font-size: 16px; font-weight: 600; word-break: break-all; }
  .pf-change { border: none; background: none; padding: 6px 10px; border-radius: 8px; font-family: inherit; font-size: 14.5px; font-weight: 700; color: var(--accent); cursor: pointer; }
  .pf-change:hover { background: #f1f6ea; }
  .pf-change-box { grid-column: 1 / -1; display: flex; flex-direction: column; gap: 8px; margin-top: 4px; padding: 16px; border-radius: 12px; background: var(--soft); }
  .pf-change-box .pf-input, .pf-change-box .pf-btn { height: 50px; }

  .pf-toggle-row { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 16px 2px; border-bottom: 1px solid var(--line); cursor: pointer; }
  .pf-toggle-row:first-of-type { border-top: 1px solid var(--line); }
  .pf-toggle-name { font-size: 16px; font-weight: 700; }
  .pf-toggle-desc { margin-top: 3px; font-size: 14px; color: var(--sub); }
  .pf-switch { position: relative; width: 50px; height: 30px; border-radius: 15px; background: #d6d3d1; flex-shrink: 0; transition: background .2s; }
  .pf-switch::after { content: ""; position: absolute; top: 3px; left: 3px; width: 24px; height: 24px; border-radius: 50%; background: #fff; box-shadow: 0 1px 3px rgba(0,0,0,.2); transition: transform .2s; }
  .pf-switch.on { background: var(--accent); }
  .pf-switch.on::after { transform: translateX(20px); }

  .pf-actions { display: flex; gap: 10px; margin-top: 22px; }
  .pf-actions .pf-btn { flex: 1; height: 56px; font-size: 16.5px; font-weight: 800; border-radius: 14px; display: inline-flex; align-items: center; justify-content: center; gap: 8px; }
  @media (max-width: 560px) {
    .pf-title { font-size: 26px; }
    .pf-panel { padding: 22px 18px; }
    .pf-info-row { grid-template-columns: 84px minmax(0, 1fr) auto; }
    .pf-row { flex-direction: column; }
    .pf-row .pf-btn { width: 100%; }
  }
`;

export default function MypageProfileEdit() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [globalError, setGlobalError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [nicknameCheckMsg, setNicknameCheckMsg] = useState("");
  const [nicknameChecked, setNicknameChecked] = useState(false);

  const [emailVerifyInput, setEmailVerifyInput] = useState("");
  const [emailRequestMessage, setEmailRequestMessage] = useState("");
  const [emailChanging, setEmailChanging] = useState(false);
  const [emailConfirming, setEmailConfirming] = useState(false);

  const [phoneVerifyCode, setPhoneVerifyCode] = useState("");
  const [phoneCodeInput, setPhoneCodeInput] = useState("");
  const [phoneChanging, setPhoneChanging] = useState(false);
  const [phoneConfirming, setPhoneConfirming] = useState(false);
  // 이메일·휴대폰 변경은 "변경"을 눌렀을 때만 인증 입력을 펼친다
  const [openChange, setOpenChange] = useState(null);

  const [form, setForm] = useState({
    email: "", phone: "", nickname: "",
    createdAt: "", lastLoginAt: "", lastModifiedAt: "",
    showAge: false, showGender: false, showPet: false,
    nextEmail: "", nextPhone: "",
  });
  const [initialNickname, setInitialNickname] = useState("");

  const nicknameChanged = useMemo(
    () => (form.nickname || "").trim() !== (initialNickname || "").trim(),
    [form.nickname, initialNickname],
  );

  const refreshMe = async () => {
    const me = await mypageApi.getMe();
    setForm((prev) => ({
      ...prev,
      email: me?.email || "", phone: me?.phone || "",
      nickname: me?.nickname || "", createdAt: me?.createdAt || "",
      lastLoginAt: me?.lastLoginAt || "", lastModifiedAt: me?.lastModifiedAt || "",
      showAge: Boolean(me?.showAge), showGender: Boolean(me?.showGender), showPet: Boolean(me?.showPet),
    }));
    setInitialNickname(me?.nickname || "");
    setNicknameChecked(false);
    setNicknameCheckMsg("");
  };

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      try {
        setLoading(true);
        setGlobalError("");
        const me = await mypageApi.getMe();
        if (!mounted) return;
        setForm({
          email: me?.email || "", phone: me?.phone || "",
          nickname: me?.nickname || "", createdAt: me?.createdAt || "",
          lastLoginAt: me?.lastLoginAt || "", lastModifiedAt: me?.lastModifiedAt || "",
          showAge: Boolean(me?.showAge), showGender: Boolean(me?.showGender), showPet: Boolean(me?.showPet),
          nextEmail: "", nextPhone: "",
        });
        setInitialNickname(me?.nickname || "");
      } catch (error) {
        if (!mounted) return;
        setGlobalError(resolveErrorMessage(error, "내 정보를 불러오지 못했습니다."));
      } finally {
        if (mounted) setLoading(false);
      }
    };
    run();
    return () => { mounted = false; };
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
    if (name === "nickname") { setNicknameChecked(false); setNicknameCheckMsg(""); }
  };

  const toggleField = (name) => {
    setForm((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  const checkNickname = async () => {
    const value = (form.nickname || "").trim();
    if (!value) { setNicknameChecked(false); setNicknameCheckMsg("닉네임을 입력해 주세요."); return false; }
    if (value === (initialNickname || "").trim()) { setNicknameChecked(true); setNicknameCheckMsg("현재 닉네임과 동일합니다."); return true; }
    try {
      const available = await userApi.checkNickname(value);
      const ok = Boolean(available);
      setNicknameChecked(ok);
      setNicknameCheckMsg(ok ? "사용 가능한 닉네임입니다." : "이미 사용 중인 닉네임입니다.");
      return ok;
    } catch (error) {
      setNicknameChecked(false);
      setNicknameCheckMsg(resolveErrorMessage(error, "닉네임 중복 확인에 실패했습니다."));
      return false;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true); setGlobalError(""); setFieldErrors({});
      if (nicknameChanged && !nicknameChecked) {
        const ok = await checkNickname();
        if (!ok) throw new Error("닉네임 중복 확인이 필요합니다.");
      }
      await mypageApi.updateMe({
        nickname: (form.nickname || "").trim(),
        showAge: Boolean(form.showAge), showGender: Boolean(form.showGender), showPet: Boolean(form.showPet),
      });
      navigate("/mypage");
    } catch (error) {
      setFieldErrors(toFieldMessageMap(error));
      setGlobalError(resolveErrorMessage(error, "프로필 수정에 실패했습니다."));
    } finally { setSaving(false); }
  };

  const requestEmailChange = async () => {
    try {
      setEmailChanging(true); setGlobalError(""); setEmailRequestMessage("");
      await authApi.requestEmailChange({ newEmail: (form.nextEmail || "").trim() });
      setEmailVerifyInput("");
      setEmailRequestMessage("이메일을 확인해 주세요. 메일의 인증 링크를 클릭한 뒤 변경 내용을 다시 확인해 주세요.");
    } catch (error) { setGlobalError(resolveErrorMessage(error, "이메일 인증 요청에 실패했습니다.")); }
    finally { setEmailChanging(false); }
  };

  const confirmEmailChange = async () => {
    try {
      setEmailConfirming(true); setGlobalError("");
      await authApi.confirmEmailChange({ token: emailVerifyInput.trim() });
      setEmailVerifyInput("");
      setEmailRequestMessage("");
      setForm((prev) => ({ ...prev, nextEmail: "" }));
      await refreshMe();
    } catch (error) { setGlobalError(resolveErrorMessage(error, "이메일 변경 확인에 실패했습니다.")); }
    finally { setEmailConfirming(false); }
  };

  const requestPhoneChange = async () => {
    try {
      setPhoneChanging(true); setGlobalError("");
      const res = await authApi.requestPhoneChange({ phone: toKoreanPhoneE164(normalizeDigits(form.nextPhone)) });
      setPhoneVerifyCode(String(res?.devCode || ""));
    } catch (error) { setGlobalError(resolveErrorMessage(error, "휴대전화 인증 요청에 실패했습니다.")); }
    finally { setPhoneChanging(false); }
  };

  const confirmPhoneChange = async () => {
    try {
      setPhoneConfirming(true); setGlobalError("");
      await authApi.confirmPhoneChange({ phone: toKoreanPhoneE164(normalizeDigits(form.nextPhone)), code: (phoneCodeInput || phoneVerifyCode || "").trim() });
      setPhoneVerifyCode(""); setPhoneCodeInput("");
      setForm((prev) => ({ ...prev, nextPhone: "" }));
      await refreshMe();
    } catch (error) { setGlobalError(resolveErrorMessage(error, "휴대전화 변경 확인에 실패했습니다.")); }
    finally { setPhoneConfirming(false); }
  };

  const busy = loading || saving;
  const toggles = [
    { key: "showAge", name: "나이 공개", desc: "커뮤니티 프로필에 나이대를 보여줘요" },
    { key: "showGender", name: "성별 공개", desc: "커뮤니티 프로필에 성별을 보여줘요" },
    { key: "showPet", name: "반려동물 공개", desc: "후기·갤러리에 내 반려동물 정보를 함께 보여줘요" },
  ];

  return (
    <div className="pf">
      <style>{css}</style>
      <main className="pf-wrap">
        <button type="button" className="pf-back" onClick={() => navigate("/mypage")}>
          <ArrowLeft size={16} />마이페이지
        </button>
        <h1 className="pf-title">회원정보 수정</h1>
        <p className="pf-desc">닉네임과 공개 범위를 바꾸고, 이메일·휴대폰은 인증 후 변경할 수 있어요.</p>

        {globalError ? <div className="pf-error"><AlertCircle size={18} style={{ flexShrink: 0, marginTop: 1 }} /><span>{globalError}</span></div> : null}

        <form onSubmit={handleSubmit}>
          {/* 프로필 */}
          <section className="pf-panel">
            <h2 className="pf-sec">프로필</h2>
            <p className="pf-sec-note">커뮤니티와 참가자 목록에 보이는 이름이에요.</p>
            <label className="pf-label" htmlFor="pf-nickname">닉네임</label>
            <div className="pf-row">
              <input id="pf-nickname" className="pf-input" name="nickname" value={form.nickname} onChange={handleChange}
                onBlur={() => { if (nicknameChanged) checkNickname(); }} maxLength={30} placeholder="닉네임을 입력하세요" disabled={busy} />
              <button type="button" className="pf-btn" onClick={checkNickname} disabled={busy || !nicknameChanged}>중복 확인</button>
            </div>
            {nicknameCheckMsg ? <div className={`pf-msg ${nicknameChecked ? "ok" : "bad"}`}>{nicknameCheckMsg}</div> : null}
            {fieldErrors.nickname ? <div className="pf-msg bad">{fieldErrors.nickname}</div> : null}
          </section>

          {/* 계정 정보 */}
          <section className="pf-panel">
            <h2 className="pf-sec">계정 정보</h2>
            <p className="pf-sec-note">이메일과 휴대폰은 본인 인증을 거쳐 바꿀 수 있어요.</p>
            <dl className="pf-info">
              <div className="pf-info-row">
                <dt>이메일</dt>
                <dd>{form.email || "-"}</dd>
                <button type="button" className="pf-change" onClick={() => setOpenChange(openChange === "email" ? null : "email")}>{openChange === "email" ? "닫기" : "변경"}</button>
                {openChange === "email" ? (
                  <div className="pf-change-box">
                    <div className="pf-row">
                      <input className="pf-input" name="nextEmail" type="email" value={form.nextEmail} onChange={handleChange} placeholder="새 이메일 주소" disabled={emailChanging || emailConfirming} />
                      <button type="button" className="pf-btn" onClick={requestEmailChange} disabled={emailChanging || emailConfirming || !form.nextEmail.trim()}>{emailChanging ? "보내는 중…" : "인증 메일 받기"}</button>
                    </div>
                    <div className="pf-row">
                      <input className="pf-input" value={emailVerifyInput} onChange={(e) => setEmailVerifyInput(e.target.value)} placeholder="메일로 받은 인증 코드" disabled={emailChanging || emailConfirming} />
                      <button type="button" className="pf-btn dark" onClick={confirmEmailChange} disabled={emailChanging || emailConfirming || !emailVerifyInput.trim()}>{emailConfirming ? "확인 중…" : "변경 완료"}</button>
                    </div>
                    {emailRequestMessage ? <div className="pf-msg ok">{emailRequestMessage}</div> : null}
                  </div>
                ) : null}
              </div>

              <div className="pf-info-row">
                <dt>휴대폰</dt>
                <dd>{form.phone ? toLocalPhone(form.phone) : "-"}</dd>
                <button type="button" className="pf-change" onClick={() => setOpenChange(openChange === "phone" ? null : "phone")}>{openChange === "phone" ? "닫기" : "변경"}</button>
                {openChange === "phone" ? (
                  <div className="pf-change-box">
                    <div className="pf-row">
                      <input className="pf-input" name="nextPhone" inputMode="numeric" value={form.nextPhone}
                        onChange={(e) => setForm((prev) => ({ ...prev, nextPhone: normalizeDigits(e.target.value) }))}
                        placeholder="새 휴대폰 번호 (숫자만)" disabled={phoneChanging || phoneConfirming} />
                      <button type="button" className="pf-btn" onClick={requestPhoneChange} disabled={phoneChanging || phoneConfirming || !form.nextPhone}>{phoneChanging ? "보내는 중…" : "인증번호 받기"}</button>
                    </div>
                    <div className="pf-row">
                      <input className="pf-input" inputMode="numeric" value={phoneCodeInput} onChange={(e) => setPhoneCodeInput(e.target.value.replace(/[^0-9]/g, ""))} placeholder="문자로 받은 인증번호" disabled={phoneChanging || phoneConfirming} />
                      <button type="button" className="pf-btn dark" onClick={confirmPhoneChange} disabled={phoneChanging || phoneConfirming || !(phoneCodeInput || phoneVerifyCode)}>{phoneConfirming ? "확인 중…" : "변경 완료"}</button>
                    </div>
                    {form.nextPhone ? <div className="pf-msg info">{toLocalPhone(form.nextPhone)}로 인증번호를 보내요.</div> : null}
                    {phoneVerifyCode ? <div className="pf-msg info">개발 환경 인증번호: <b>{phoneVerifyCode}</b></div> : null}
                  </div>
                ) : null}
              </div>

              <div className="pf-info-row">
                <dt>가입일</dt>
                <dd>{toShortDateTime(form.createdAt) || "-"}</dd>
                <span />
              </div>
              {form.lastLoginAt ? (
                <div className="pf-info-row">
                  <dt>최근 로그인</dt>
                  <dd>{toShortDateTime(form.lastLoginAt)}</dd>
                  <span />
                </div>
              ) : null}
            </dl>
          </section>

          {/* 공개 설정 */}
          <section className="pf-panel">
            <h2 className="pf-sec">공개 설정</h2>
            <p className="pf-sec-note">다른 회원에게 보여줄 정보를 골라요.</p>
            {toggles.map((tg) => (
              <div key={tg.key} className="pf-toggle-row" role="switch" aria-checked={Boolean(form[tg.key])} tabIndex={0}
                onClick={() => toggleField(tg.key)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleField(tg.key); } }}>
                <div>
                  <div className="pf-toggle-name">{tg.name}</div>
                  <div className="pf-toggle-desc">{tg.desc}</div>
                </div>
                <span className={`pf-switch${form[tg.key] ? " on" : ""}`} />
              </div>
            ))}
          </section>

          <div className="pf-actions">
            <button type="button" className="pf-btn" onClick={() => navigate("/mypage")}>취소</button>
            <button type="submit" className="pf-btn dark" disabled={busy}><Check size={19} />{saving ? "저장 중…" : "저장"}</button>
          </div>
        </form>
      </main>
    </div>
  );
}
