import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { authApi } from "../api/authApi";
import { tokenStore } from "../../../../app/http/tokenStore";
import { useAuth } from "../AuthProvider";
import {
  clearSocialJoinState,
  getSocialJoinState,
  setSocialJoinState,
} from "../socialJoinStorage";
import {
  getSmsRequestErrorMessage,
  normalizeDigits,
  toKoreanPhoneE164,
} from "../../../../features/auth/utils/smsAuth";

const STEP = {
  INIT: "INIT",
  FORM: "FORM",
  OTP: "OTP",
};

export default function KakaoJoin() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const didInitRef = useRef(false);

  const kakaoSession = useMemo(
    () =>
      getSocialJoinState("kakao") || {
        providerUid: "",
        email: "",
        nickname: "",
        tempPassword: "",
        signupKey: "",
        phone: "",
        step: "FORM",
      },
    [],
  );

  const [providerUid] = useState(kakaoSession.providerUid);
  const [email, setEmail] = useState(kakaoSession.email);
  const [nickname, setNickname] = useState(kakaoSession.nickname);
  const [phone, setPhone] = useState(kakaoSession.phone || "");
  const [step, setStep] = useState(kakaoSession.step || STEP.INIT);
  const [signupKey, setSignupKey] = useState(kakaoSession.signupKey || "");
  const [otpCode, setOtpCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [tempPassword] = useState(() => {
    const key = "kakao_temp_password";
    const existing = kakaoSession.tempPassword || sessionStorage.getItem(key);
    if (existing) return existing;

    const rand = `${crypto.randomUUID()}-${Math.random().toString(36).slice(2)}`;
    const password = rand.replace(/-/g, "").slice(0, 16) + "aA1!";
    sessionStorage.setItem(key, password);
    return password;
  });

  const hasKakaoEmail = !!(kakaoSession.email || "").trim();
  const emailTrim = (email || "").trim();
  const nickTrim = (nickname || "").trim() || "kakao_user";
  const phoneDigits = normalizeDigits(phone);
  const phoneE164 = toKoreanPhoneE164(phoneDigits);

  const canSendOtp =
    !loading &&
    step === STEP.FORM &&
    !!providerUid &&
    !!emailTrim &&
    !!phoneE164;

  const canVerify =
    !loading &&
    step === STEP.OTP &&
    !!signupKey &&
    !!phoneE164 &&
    (otpCode || "").trim().length >= 4;

  useEffect(() => {
    if (didInitRef.current) return;
    didInitRef.current = true;

    if (!providerUid) {
      navigate("/auth/login", { replace: true });
      return;
    }

    setStep(kakaoSession.signupKey ? STEP.OTP : STEP.FORM);
  }, [kakaoSession.signupKey, navigate, providerUid]);

  useEffect(() => {
    if (!providerUid) return;
    setSocialJoinState("kakao", {
      providerUid,
      email,
      nickname,
      tempPassword,
      signupKey,
      phone,
      step,
    });
  }, [email, nickname, phone, providerUid, signupKey, step, tempPassword]);

  const sendOtp = async () => {
    if (!canSendOtp) return;

    setError("");
    setLoading(true);

    try {
      const res = await authApi.signupStart({
        signupType: "SOCIAL",
        socialProvider: "KAKAO",
        socialProviderUid: providerUid,
        email: emailTrim,
        password: tempPassword,
        nickname: nickTrim,
        phone: phoneE164,
      });

      const key = res?.signupKey;
      if (!key) {
        setError("가입 정보를 확인하지 못했어요. 다시 시도해 주세요.");
        return;
      }

      setSignupKey(key);
      setStep(STEP.OTP);
      setSocialJoinState("kakao", {
        providerUid,
        email: emailTrim,
        nickname: nickTrim,
        tempPassword,
        signupKey: key,
        phone,
        step: STEP.OTP,
      });

      if (res?.devOtp) {
        setOtpCode(String(res.devOtp));
      }
    } catch (e) {
      setError(getSmsRequestErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  const verifyOtpAndComplete = async () => {
    if (!canVerify) return;

    setError("");
    setLoading(true);

    try {
      await authApi.signupVerifyOtp({
        signupKey,
        phone: phoneE164,
        otpCode: (otpCode || "").trim(),
      });

      const res = await authApi.signupComplete({ signupKey });
      const accessToken = res?.accessToken;

      if (!accessToken) {
        setError("회원가입을 완료하지 못했습니다. 다시 시도해 주세요.");
        return;
      }

      tokenStore.setAccess(accessToken);
      login();

      clearSocialJoinState("kakao");
      sessionStorage.removeItem("post_login_redirect");

      navigate("/", { replace: true });
    } catch (e) {
      setError(
        e?.response?.data?.message ??
          e?.message ??
          "인증번호를 다시 확인해 주세요.",
      );
    } finally {
      setLoading(false);
    }
  };

  const styles = `
    .kj-root {
      min-height: 100vh;
      background: #f8f9fc;
      font-family: 'JeonjuCraftGothic', 'Pretendard', -apple-system, sans-serif;
      padding: 0 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-top: 92px;
    }
    .kj-root *, .kj-root *::before, .kj-root *::after {
      box-sizing: border-box;
      font-family: inherit;
    }
    .kj-card {
      width: 100%;
      max-width: 520px;
      margin: 0 auto;
      background: #fff;
      border-radius: 28px;
      padding: 56px 48px 48px;
      box-shadow: 0 8px 40px rgba(0,0,0,0.08);
    }
    .kj-logo {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      margin-bottom: 12px;
    }
    .kj-kakao-icon {
      width: 56px;
      height: 56px;
      border-radius: 16px;
      background: #FEE500;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .kj-kakao-icon svg {
      display: block;
      width: 28px;
      height: 28px;
    }
    .kj-title {
      text-align: center;
      font-size: 28px;
      font-weight: 800;
      color: #191919;
      margin: 0 0 10px;
      letter-spacing: -0.5px;
    }
    .kj-subtitle {
      text-align: center;
      font-size: 16px;
      color: #999;
      font-weight: 400;
      margin: 0 0 36px;
    }
    .kj-step-bar {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      margin-bottom: 36px;
    }
    .kj-step-dot {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background: #e5e5e5;
      transition: all 0.2s;
    }
    .kj-step-dot.active {
      width: 36px;
      border-radius: 6px;
      background: #FEE500;
    }
    .kj-step-dot.done {
      background: #FEE500;
    }
    .kj-field {
      margin-bottom: 20px;
    }
    .kj-label {
      display: block;
      font-size: 15px;
      font-weight: 700;
      color: #333;
      margin-bottom: 10px;
    }
    .kj-input {
      width: 100%;
      height: 56px;
      padding: 0 20px;
      border-radius: 14px;
      border: 1.5px solid #e5e5e5;
      background: #f8f9fc;
      font-size: 16px;
      font-weight: 500;
      color: #191919;
      outline: none;
      transition: border-color 0.15s, box-shadow 0.15s;
    }
    .kj-input:focus {
      border-color: #FEE500;
      background: #fff;
      box-shadow: 0 0 0 3px rgba(254,229,0,0.15);
    }
    .kj-input:disabled {
      background: #f0f0f0;
      color: #999;
    }
    .kj-input::placeholder {
      color: #bbb;
    }
    .kj-hint {
      margin-top: 8px;
      font-size: 13px;
      color: #999;
      line-height: 1.5;
    }
    .kj-hint.error {
      color: #e54545;
    }
    .kj-error {
      background: #fff5f5;
      border: 1px solid #fecaca;
      border-radius: 14px;
      padding: 14px 18px;
      margin-bottom: 20px;
      font-size: 14px;
      color: #dc2626;
      font-weight: 500;
      line-height: 1.5;
    }
    .kj-btn-primary {
      width: 100%;
      height: 58px;
      border-radius: 14px;
      border: none;
      font-size: 17px;
      font-weight: 800;
      cursor: pointer;
      transition: all 0.15s;
      margin-top: 12px;
      font-family: inherit;
      letter-spacing: -0.3px;
    }
    .kj-btn-primary.kakao {
      background: #FEE500;
      color: #191919;
    }
    .kj-btn-primary.kakao:hover:not(:disabled) {
      background: #f5dc00;
      transform: translateY(-1px);
      box-shadow: 0 4px 16px rgba(254,229,0,0.3);
    }
    .kj-btn-primary.confirm {
      background: #191919;
      color: #fff;
    }
    .kj-btn-primary.confirm:hover:not(:disabled) {
      background: #333;
      transform: translateY(-1px);
      box-shadow: 0 4px 16px rgba(0,0,0,0.15);
    }
    .kj-btn-primary:disabled {
      background: #f0f0f0;
      color: #bbb;
      cursor: not-allowed;
    }
    .kj-btn-secondary {
      width: 100%;
      height: 54px;
      margin-top: 12px;
      border-radius: 14px;
      border: 1.5px solid #e5e5e5;
      background: #fff;
      font-size: 15px;
      font-weight: 600;
      color: #666;
      cursor: pointer;
      transition: all 0.15s;
      font-family: inherit;
    }
    .kj-btn-secondary:hover:not(:disabled) {
      background: #f8f9fc;
      border-color: #ccc;
    }
    .kj-btn-secondary:disabled {
      color: #bbb;
      cursor: not-allowed;
    }
    .kj-otp-info {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 18px 20px;
      background: #fffde7;
      border-radius: 16px;
      margin-bottom: 24px;
      border: 1px solid #fff3b0;
    }
    .kj-otp-info-icon {
      width: 44px;
      height: 44px;
      border-radius: 50%;
      background: #FEE500;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .kj-otp-info-text {
      font-size: 15px;
      color: #666;
      line-height: 1.6;
    }
    .kj-otp-info-text strong {
      color: #191919;
      font-weight: 700;
    }
    .kj-loading-init {
      text-align: center;
      padding: 80px 20px;
      color: #999;
      font-size: 17px;
    }
    @media (max-width: 640px) {
      .kj-root {
        padding: calc(var(--pupoo-site-header-offset, 72px) + 20px) 16px 40px;
        align-items: flex-start;
        margin-top: 24px;
      }
    }
    @media (max-width: 480px) {
      .kj-card {
        padding: 32px 20px 28px;
        border-radius: 20px;
        max-width: 100%;
      }
      .kj-title {
        font-size: 22px;
      }
      .kj-subtitle {
        font-size: 14px;
        margin-bottom: 24px;
      }
      .kj-input {
        height: 50px;
        font-size: 15px;
        padding: 0 16px;
      }
      .kj-label {
        font-size: 14px;
      }
      .kj-btn-primary {
        height: 52px;
        font-size: 16px;
      }
      .kj-btn-secondary {
        height: 48px;
        font-size: 14px;
      }
      .kj-otp-info {
        padding: 14px 16px;
        gap: 12px;
      }
      .kj-otp-info-text {
        font-size: 14px;
      }
    }
  `;

  if (step === STEP.INIT) {
    return (
      <>
        <style>{styles}</style>
        <div className="kj-root">
          <div className="kj-card">
            <div className="kj-loading-init">카카오 인증 정보를 확인하고 있습니다.</div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{styles}</style>
      <div className="kj-root">
        <div className="kj-card">
          <div className="kj-logo">
            <div className="kj-kakao-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 3C6.477 3 2 6.477 2 10.5c0 2.592 1.678 4.878 4.22 6.258-.186.694-.674 2.517-.771 2.906-.12.483.177.476.373.346.153-.102 2.438-1.653 3.42-2.322.244.022.492.033.758.033 5.523 0 10-3.477 10-7.722C22 6.477 17.523 3 12 3z"
                  fill="#191919"
                />
              </svg>
            </div>
          </div>

          <h1 className="kj-title">카카오 회원가입</h1>
          <p className="kj-subtitle">
            {step === STEP.FORM
              ? "추가 정보를 입력하면 가입이 완료됩니다."
              : "인증번호를 입력해 주세요."}
          </p>

          <div className="kj-step-bar">
            <div
              className={`kj-step-dot ${step === STEP.FORM ? "active" : "done"}`}
            />
            <div className={`kj-step-dot ${step === STEP.OTP ? "active" : ""}`} />
          </div>

          {error && <div className="kj-error">{error}</div>}

          {step === STEP.FORM && (
            <>
              <div className="kj-field">
                <label className="kj-label">
                  이메일
                  {hasKakaoEmail && (
                    <span style={{ color: "#999", fontWeight: 400 }}>
                      {" "}
                      (카카오 연동)
                    </span>
                  )}
                </label>
                <input
                  className="kj-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="example@email.com"
                  disabled={loading || hasKakaoEmail}
                  type="email"
                />
                {!emailTrim && (
                  <div className="kj-hint error">
                    이메일은 필수입니다. 카카오에서 이메일을 받지 못한 경우 직접 입력해
                    주세요.
                  </div>
                )}
              </div>

              <div className="kj-field">
                <label className="kj-label">
                  닉네임
                  <span style={{ color: "#bbb", fontWeight: 400 }}>
                    {" "}
                    (선택)
                  </span>
                </label>
                <input
                  className="kj-input"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="사용할 닉네임"
                  disabled={loading}
                />
              </div>

              <div className="kj-field">
                <label className="kj-label">휴대폰 번호</label>
                <input
                  className="kj-input"
                  value={phone}
                  onChange={(e) => setPhone(normalizeDigits(e.target.value))}
                  placeholder="01012345678"
                  disabled={loading}
                  inputMode="tel"
                />
                <div className="kj-hint">
                  본인 인증을 위한 인증번호가 발송됩니다.
                </div>
              </div>

              <button
                className="kj-btn-primary kakao"
                onClick={sendOtp}
                disabled={!canSendOtp}
              >
                {loading ? "발송 중..." : "인증번호 받기"}
              </button>

              <button
                className="kj-btn-secondary"
                type="button"
                onClick={() => navigate("/auth/login")}
                disabled={loading}
              >
                로그인으로 돌아가기
              </button>
            </>
          )}

          {step === STEP.OTP && (
            <>
              <div className="kj-otp-info">
                <div className="kj-otp-info-icon">
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#191919"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6A19.79 19.79 0 012.12 4.18 2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" />
                  </svg>
                </div>
                <div className="kj-otp-info-text">
                  <strong>{phone || "입력한 번호"}</strong>
                  로 인증번호가 발송되었습니다.
                </div>
              </div>

              <div className="kj-field">
                <label className="kj-label">인증번호</label>
                <input
                  className="kj-input"
                  value={otpCode}
                  onChange={(e) =>
                    setOtpCode(e.target.value.replace(/[^0-9]/g, ""))
                  }
                  placeholder="6자리 숫자 입력"
                  maxLength={6}
                  inputMode="numeric"
                  disabled={loading}
                  autoFocus
                  style={{
                    letterSpacing: "8px",
                    textAlign: "center",
                    fontSize: "22px",
                    fontWeight: 700,
                  }}
                />
              </div>

              <button
                className="kj-btn-primary confirm"
                onClick={verifyOtpAndComplete}
                disabled={!canVerify}
              >
                {loading ? "처리 중..." : "가입 완료"}
              </button>

              <button
                className="kj-btn-secondary"
                type="button"
                onClick={() => {
                  setStep(STEP.FORM);
                  setSignupKey("");
                  setOtpCode("");
                  setError("");
                }}
                disabled={loading}
              >
                다시 입력하기
              </button>
            </>
          )}
        </div>
      </div>
    </>
  );
}
