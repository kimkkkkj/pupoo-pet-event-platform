import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { mypageApi } from "./api/mypageApi";
import { authApi } from "./api/authApi";
import { userApi } from "../../../features/user/api/userApi";
import { resolveErrorMessage, toFieldMessageMap } from "../../../features/shared/forms/formError";
import { formatPhoneForDisplay, getSmsRequestErrorMessage, normalizeDigits, toKoreanPhoneE164 } from "../../../features/auth/utils/smsAuth";
import {
  Mail, Smartphone, KeyRound, ShieldCheck, AlertCircle, ArrowLeft, Check,
} from "lucide-react";

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

const css = `
  .pe-outer { background: #f8f9fc; min-height: 100vh; }
  .pe-inner {
    max-width: 1400px; margin: 0 auto; background: #fff;
    min-height: 100vh; padding: 0 40px;
    box-shadow: 0 0 40px rgba(0,0,0,.04);
  }
  .pe-wrap {
    max-width: 1100px; margin: 0 auto;
    padding: 150px 0 120px;
    font-family: 'Pretendard','Apple SD Gothic Neo','Noto Sans KR',sans-serif;
    color: #333; font-size: 16px;
  }
  .pe-back-btn {
    display: inline-flex; align-items: center; gap: 8px;
    background: #f8f9fc; border: 1px solid #e5e7eb; border-radius: 10px;
    cursor: pointer;
    font-size: 15px; font-weight: 700; color: #374151;
    padding: 10px 20px; margin-bottom: 28px;
    font-family: inherit; transition: all 0.15s;
  }
  .pe-back-btn:hover { background: #e5e7eb; color: #111; }
  .pe-title {
    font-size: 38px; font-weight: 800; color: #111;
    text-align: center; margin-bottom: 8px; letter-spacing: -0.5px;
  }
  .pe-desc {
    font-size: 16px; color: #999; text-align: center;
    margin-bottom: 56px; line-height: 1.6;
  }
  .pe-card {
    background: #fff; border: 1px solid #e8e8e8;
    border-radius: 16px; padding: 52px 56px; margin-bottom: 32px;
  }
  .pe-section-label {
    font-size: 22px; font-weight: 800; color: #111;
    margin-bottom: 36px; padding-bottom: 18px;
    border-bottom: 2px solid #111;
    display: flex; align-items: center; gap: 10px;
  }
  .pe-field {
    display: flex; align-items: flex-start;
    padding: 24px 0; border-bottom: 1px solid #f0f0f0;
  }
  .pe-field:last-child { border-bottom: none; }
  .pe-field-label {
    display: flex; align-items: center; gap: 4px;
    min-width: 180px; width: 180px;
    font-size: 15px; font-weight: 700; color: #333;
    padding-top: 16px; flex-shrink: 0;
  }
  .pe-field-label .req { color: #90C450; font-size: 14px; }
  .pe-field-body { flex: 1; min-width: 0; }
  .pe-fi {
    width: 100%; height: 54px;
    border: 1px solid #ddd; border-radius: 10px;
    padding: 0 18px; font-size: 16px; color: #222;
    outline: none; background: #fff;
    transition: border-color 0.2s; font-family: inherit;
    box-sizing: border-box;
  }
  .pe-fi:focus { border-color: #90C450; }
  .pe-fi::placeholder { color: #ccc; font-size: 15px; }
  .pe-fi:disabled { background: #f8f9fc; color: #aaa; }
  .pe-input-row { display: flex; gap: 10px; }
  .pe-btn-check {
    height: 54px; padding: 0 24px; background: #fff; color: #555;
    border: 1px solid #ddd; border-radius: 10px;
    font-size: 15px; font-weight: 600; cursor: pointer;
    white-space: nowrap; font-family: inherit;
    transition: all 0.15s; flex-shrink: 0;
  }
  .pe-btn-check:hover { background: #f8f8f8; border-color: #ccc; }
  .pe-btn-check:disabled { background: #f8f9fc; color: #aaa; cursor: not-allowed; }
  .pe-field-helper { margin-top: 10px; font-size: 13px; color: #aaa; line-height: 1.5; }
  .pe-field-msg {
    margin-top: 8px; font-size: 13px; line-height: 1.5;
  }
  .pe-field-msg.success { color: #166534; }
  .pe-field-msg.error { color: #b91c1c; }

  .pe-toggle-row {
    display: flex; align-items: center; gap: 16px;
    padding: 14px 0;
  }
  .pe-toggle-row + .pe-toggle-row { border-top: 1px solid #f0f0f0; }
  .pe-toggle-label { font-size: 16px; font-weight: 500; color: #333; flex: 1; cursor: pointer; }
  .pe-toggle {
    position: relative; width: 44px; height: 24px;
    background: #ddd; border-radius: 12px;
    cursor: pointer; transition: background 0.2s; flex-shrink: 0;
  }
  .pe-toggle.on { background: #90C450; }
  .pe-toggle::after {
    content: ''; position: absolute; top: 2px; left: 2px;
    width: 20px; height: 20px; border-radius: 50%;
    background: #fff; box-shadow: 0 1px 3px rgba(0,0,0,.15);
    transition: transform 0.2s;
  }
  .pe-toggle.on::after { transform: translateX(20px); }

  .pe-verify-card {
    background: #fafbfc; border: 1px solid #eee;
    border-radius: 14px; padding: 28px; margin-top: 12px;
  }
  .pe-verify-title {
    font-size: 15px; font-weight: 700; color: #333;
    margin-bottom: 16px; display: flex; align-items: center; gap: 8px;
  }
  .pe-verify-row { display: flex; gap: 10px; margin-bottom: 10px; }
  .pe-verify-row:last-child { margin-bottom: 0; }
  .pe-dev-token { margin-top: 10px; font-size: 12px; color: #888; }

  .pe-error-banner {
    display: flex; align-items: flex-start; gap: 8px;
    margin-bottom: 20px; font-size: 14px;
    line-height: 1.6; background: #fef2f2;
    border: 1px solid #fecaca; border-radius: 10px;
    padding: 16px 20px; color: #991b1b;
  }

  .pe-notice {
    display: flex; align-items: flex-start; gap: 12px;
    background: #f8f8fc; border: 1px solid #e8e6f0;
    border-radius: 14px; padding: 20px 28px;
    margin-bottom: 32px; font-size: 14px; color: #555; line-height: 1.7;
  }

  .pe-btn-row { display: flex; gap: 14px; margin-top: 40px; justify-content: center; }
  .pe-btn-primary {
    flex: 1; max-width: 320px; height: 60px;
    background: #90C450; color: #fff; border: none; border-radius: 12px;
    font-size: 18px; font-weight: 700; cursor: pointer;
    transition: background 0.15s; font-family: inherit;
    display: flex; align-items: center; justify-content: center; gap: 8px;
  }
  .pe-btn-primary:hover { background: #2d3519; }
  .pe-btn-primary:disabled { background: #ddd; color: #aaa; cursor: not-allowed; }
  .pe-btn-outline {
    flex: 0 0 auto; min-width: 180px; height: 60px;
    background: #fff; color: #555; border: 1px solid #ddd;
    border-radius: 12px; font-size: 18px; font-weight: 600;
    cursor: pointer; transition: all 0.15s; font-family: inherit;
    display: flex; align-items: center; justify-content: center; gap: 8px;
  }
  .pe-btn-outline:hover { background: #f8f8f8; border-color: #ccc; }
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

  return (
    <>
      <style>{css}</style>
      <div className="pe-outer">
        <div className="pe-inner">
          <div className="pe-wrap">
            <button
              type="button"
              className="pe-back-btn"
              onClick={() => navigate("/mypage")}
            >
              <ArrowLeft size={20} /> 뒤로가기
            </button>
            <h1 className="pe-title">프로필 수정</h1>
            <p className="pe-desc">회원 정보를 확인하고 수정할 수 있습니다</p>

            {globalError && (
              <div className="pe-error-banner">
                <AlertCircle size={18} style={{ flexShrink: 0, marginTop: 1 }} />
                <span>{globalError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              {/* ── 기본 정보 ── */}
              <div className="pe-card">
                <div className="pe-section-label">
                  <KeyRound size={22} /> 기본 정보
                </div>

                <div className="pe-field">
                  <div className="pe-field-label">닉네임 <span className="req">*</span></div>
                  <div className="pe-field-body">
                    <div className="pe-input-row">
                      <input
                        className="pe-fi"
                        name="nickname"
                        value={form.nickname}
                        onChange={handleChange}
                        onBlur={checkNickname}
                        maxLength={30}
                        placeholder="닉네임을 입력하세요"
                        disabled={loading || saving}
                      />
                      <button type="button" className="pe-btn-check" onClick={checkNickname} disabled={loading || saving}>
                        중복확인
                      </button>
                    </div>
                    {nicknameCheckMsg && (
                      <div className={`pe-field-msg ${nicknameChecked ? "success" : "error"}`}>{nicknameCheckMsg}</div>
                    )}
                    {fieldErrors.nickname && (
                      <div className="pe-field-msg error">{fieldErrors.nickname}</div>
                    )}
                  </div>
                </div>

                <div className="pe-field">
                  <div className="pe-field-label">이메일</div>
                  <div className="pe-field-body">
                    <input className="pe-fi" value={form.email} disabled />
                  </div>
                </div>

                <div className="pe-field">
                  <div className="pe-field-label">휴대전화</div>
                  <div className="pe-field-body">
                    <input className="pe-fi" value={form.phone} disabled />
                  </div>
                </div>

                <div className="pe-field">
                  <div className="pe-field-label">가입일</div>
                  <div className="pe-field-body">
                    <input className="pe-fi" value={formatDateTimeDisplay(form.createdAt)} disabled />
                  </div>
                </div>

                <div className="pe-field">
                  <div className="pe-field-label">최근 로그인</div>
                  <div className="pe-field-body">
                    <input className="pe-fi" value={formatDateTimeDisplay(form.lastLoginAt)} disabled />
                  </div>
                </div>

                <div className="pe-field">
                  <div className="pe-field-label">최근 변경</div>
                  <div className="pe-field-body">
                    <input className="pe-fi" value={formatDateTimeDisplay(form.lastModifiedAt)} disabled />
                  </div>
                </div>
              </div>

              {/* ── 공개 설정 ── */}
              <div className="pe-card">
                <div className="pe-section-label">
                  <ShieldCheck size={22} /> 공개 설정
                </div>

                <div className="pe-toggle-row">
                  <span className="pe-toggle-label" onClick={() => toggleField("showAge")}>나이 공개</span>
                  <div className={`pe-toggle${form.showAge ? " on" : ""}`} onClick={() => toggleField("showAge")} />
                </div>
                <div className="pe-toggle-row">
                  <span className="pe-toggle-label" onClick={() => toggleField("showGender")}>성별 공개</span>
                  <div className={`pe-toggle${form.showGender ? " on" : ""}`} onClick={() => toggleField("showGender")} />
                </div>
                <div className="pe-toggle-row">
                  <span className="pe-toggle-label" onClick={() => toggleField("showPet")}>반려동물 공개</span>
                  <div className={`pe-toggle${form.showPet ? " on" : ""}`} onClick={() => toggleField("showPet")} />
                </div>
              </div>

              {/* ── 인증 변경 ── */}
              <div className="pe-card">
                <div className="pe-section-label">
                  <Mail size={22} /> 이메일 · 휴대전화 변경
                </div>

                <div className="pe-notice">
                  <AlertCircle size={18} style={{ flexShrink: 0, marginTop: 2, color: "#90C450" }} />
                  <span>이메일과 휴대전화는 인증 절차를 통해 변경할 수 있습니다.</span>
                </div>

                {/* 이메일 변경 */}
                <div className="pe-verify-card">
                  <div className="pe-verify-title">
                    <Mail size={16} /> 이메일 변경
                  </div>
                  <div className="pe-verify-row">
                    <input
                      className="pe-fi"
                      name="nextEmail"
                      value={form.nextEmail}
                      onChange={handleChange}
                      placeholder="새 이메일 주소"
                      disabled={emailChanging || emailConfirming}
                    />
                    <button type="button" className="pe-btn-check" onClick={requestEmailChange} disabled={emailChanging || emailConfirming}>
                      인증요청
                    </button>
                  </div>
                  <div className="pe-verify-row">
                    <input
                      className="pe-fi"
                      value={emailVerifyInput}
                      onChange={(e) => setEmailVerifyInput(e.target.value)}
                      placeholder="인증 토큰 입력"
                      disabled={emailChanging || emailConfirming}
                    />
                    <button type="button" className="pe-btn-check" onClick={confirmEmailChange} disabled={emailChanging || emailConfirming}>
                      변경확인
                    </button>
                  </div>
                  {emailRequestMessage && <div className="pe-field-msg success">{emailRequestMessage}</div>}
                </div>

                {/* 휴대전화 변경 */}
                <div className="pe-verify-card" style={{ marginTop: 16 }}>
                  <div className="pe-verify-title">
                    <Smartphone size={16} /> 휴대전화 변경
                  </div>
                  <div className="pe-verify-row">
                    <input
                      className="pe-fi"
                      name="nextPhone"
                      value={form.nextPhone}
                      onChange={(e) => setForm((prev) => ({ ...prev, nextPhone: normalizeDigits(e.target.value) }))}
                      placeholder="새 휴대전화번호"
                      disabled={phoneChanging || phoneConfirming}
                    />
                    <button type="button" className="pe-btn-check" onClick={requestPhoneChange} disabled={phoneChanging || phoneConfirming}>
                      인증요청
                    </button>
                  </div>
                  <div className="pe-verify-row">
                    <input
                      className="pe-fi"
                      value={phoneCodeInput}
                      onChange={(e) => setPhoneCodeInput(e.target.value.replace(/[^0-9]/g, ""))}
                      placeholder="인증번호 입력"
                      disabled={phoneChanging || phoneConfirming}
                    />
                    <button type="button" className="pe-btn-check" onClick={confirmPhoneChange} disabled={phoneChanging || phoneConfirming}>
                      변경확인
                    </button>
                  </div>
                  {phoneVerifyCode && <div className="pe-dev-token">devCode: {phoneVerifyCode}</div>}
                  {!!form.nextPhone && <div className="pe-field-helper">전송 번호: {formatPhoneForDisplay(form.nextPhone)}</div>}
                </div>
              </div>

              {/* ── 버튼 ── */}
              <div className="pe-btn-row">
                <button type="submit" className="pe-btn-primary" disabled={loading || saving}>
                  <Check size={20} /> 저장
                </button>
                <button type="button" className="pe-btn-outline" onClick={() => navigate("/mypage")}>
                  <ArrowLeft size={20} /> 돌아가기
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
