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

const GoogleMark = () => (
  <svg width="28" height="28" viewBox="0 0 48 48">
    <path
      fill="#FFC107"
      d="M43.611 20.083H42V20H24v8h11.303C33.677 32.91 29.243 36 24 36c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.061 0 5.854 1.154 7.97 3.042l5.657-5.657C34.046 6.053 29.27 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
    />
    <path
      fill="#FF3D00"
      d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.061 0 5.854 1.154 7.97 3.042l5.657-5.657C34.046 6.053 29.27 4 24 4c-7.732 0-14.41 4.386-17.694 10.691z"
    />
    <path
      fill="#4CAF50"
      d="M24 44c5.184 0 9.88-1.977 13.409-5.193l-6.191-5.238C29.211 35.091 26.715 36 24 36c-5.217 0-9.645-3.063-11.273-7.484l-6.525 5.03C9.435 39.556 16.216 44 24 44z"
    />
    <path
      fill="#1976D2"
      d="M43.611 20.083H42V20H24v8h11.303c-1.056 2.89-3.207 5.259-6.085 6.57l6.191 5.238C36.973 37.342 44 31.245 44 24c0-1.341-.138-2.65-.389-3.917z"
    />
  </svg>
);

export default function GoogleJoin() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const didInitRef = useRef(false);

  const googleSession = useMemo(
    () =>
      getSocialJoinState("google") || {
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

  const [providerUid] = useState(googleSession.providerUid);
  const [email, setEmail] = useState(googleSession.email);
  const [nickname, setNickname] = useState(googleSession.nickname);
  const [phone, setPhone] = useState(googleSession.phone || "");
  const [step, setStep] = useState(googleSession.step || STEP.INIT);
  const [signupKey, setSignupKey] = useState(googleSession.signupKey || "");
  const [otpCode, setOtpCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [tempPassword] = useState(() => {
    const key = "google_temp_password";
    const existing = googleSession.tempPassword || sessionStorage.getItem(key);
    if (existing) return existing;

    const rand = `${crypto.randomUUID()}-${Math.random().toString(36).slice(2)}`;
    const password = rand.replace(/-/g, "").slice(0, 16) + "aA1!";
    sessionStorage.setItem(key, password);
    return password;
  });

  const hasGoogleEmail = !!(googleSession.email || "").trim();
  const emailTrim = (email || "").trim();
  const nickTrim = (nickname || "").trim() || "google_user";
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

    setStep(googleSession.signupKey ? STEP.OTP : STEP.FORM);
  }, [googleSession.signupKey, navigate, providerUid]);

  useEffect(() => {
    if (!providerUid) return;
    setSocialJoinState("google", {
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
        socialProvider: "GOOGLE",
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
      setSocialJoinState("google", {
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

      clearSocialJoinState("google");
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
    .gj-root { min-height: 100vh; background: #f8f9fc; font-family: 'JeonjuCraftGothic', 'Pretendard', -apple-system, sans-serif; padding: 0 20px; display: flex; align-items: center; justify-content: center; margin-top: 92px; }
    .gj-root *, .gj-root *::before, .gj-root *::after { box-sizing: border-box; font-family: inherit; }
    .gj-card { width: 100%; max-width: 520px; margin: 0 auto; background: #fff; border-radius: 28px; padding: 56px 48px 48px; box-shadow: 0 8px 40px rgba(0,0,0,0.08); }
    .gj-logo { display: flex; align-items: center; justify-content: center; margin-bottom: 12px; }
    .gj-google-icon { width: 56px; height: 56px; border-radius: 16px; background: #fff; border: 1.5px solid #e0e0e0; display: flex; align-items: center; justify-content: center; }
    .gj-title { text-align: center; font-size: 28px; font-weight: 800; color: #191919; margin: 0 0 10px; letter-spacing: -0.5px; }
    .gj-subtitle { text-align: center; font-size: 16px; color: #999; font-weight: 400; margin: 0 0 36px; }
    .gj-step-bar { display: flex; align-items: center; justify-content: center; gap: 10px; margin-bottom: 36px; }
    .gj-step-dot { width: 12px; height: 12px; border-radius: 50%; background: #e5e5e5; transition: all 0.2s; }
    .gj-step-dot.active { width: 36px; border-radius: 6px; background: #4285F4; }
    .gj-step-dot.done { background: #4285F4; }
    .gj-field { margin-bottom: 20px; }
    .gj-label { display: block; font-size: 15px; font-weight: 700; color: #333; margin-bottom: 10px; }
    .gj-input { width: 100%; height: 56px; padding: 0 20px; border-radius: 14px; border: 1.5px solid #e5e5e5; background: #f8f9fc; font-size: 16px; font-weight: 500; color: #191919; outline: none; transition: border-color 0.15s, box-shadow 0.15s; }
    .gj-input:focus { border-color: #4285F4; background: #fff; box-shadow: 0 0 0 3px rgba(66,133,244,0.12); }
    .gj-input:disabled { background: #f0f0f0; color: #999; }
    .gj-input::placeholder { color: #bbb; }
    .gj-hint { margin-top: 8px; font-size: 13px; color: #999; line-height: 1.5; }
    .gj-hint.error { color: #e54545; }
    .gj-error { background: #fff5f5; border: 1px solid #fecaca; border-radius: 14px; padding: 14px 18px; margin-bottom: 20px; font-size: 14px; color: #dc2626; font-weight: 500; line-height: 1.5; }
    .gj-btn-primary { width: 100%; height: 58px; border-radius: 14px; border: none; font-size: 17px; font-weight: 800; cursor: pointer; transition: all 0.15s; margin-top: 12px; font-family: inherit; letter-spacing: -0.3px; }
    .gj-btn-primary.google { background: #4285F4; color: #fff; }
    .gj-btn-primary.google:hover:not(:disabled) { background: #3367d6; transform: translateY(-1px); box-shadow: 0 4px 16px rgba(66,133,244,0.3); }
    .gj-btn-primary.confirm { background: #191919; color: #fff; }
    .gj-btn-primary.confirm:hover:not(:disabled) { background: #333; transform: translateY(-1px); box-shadow: 0 4px 16px rgba(0,0,0,0.15); }
    .gj-btn-primary:disabled { background: #f0f0f0; color: #bbb; cursor: not-allowed; }
    .gj-btn-secondary { width: 100%; height: 54px; margin-top: 12px; border-radius: 14px; border: 1.5px solid #e5e5e5; background: #fff; font-size: 15px; font-weight: 600; color: #666; cursor: pointer; transition: all 0.15s; font-family: inherit; }
    .gj-btn-secondary:hover:not(:disabled) { background: #f8f9fc; border-color: #ccc; }
    .gj-btn-secondary:disabled { color: #bbb; cursor: not-allowed; }
    .gj-otp-info { display: flex; align-items: center; gap: 14px; padding: 18px 20px; background: #f0f6ff; border-radius: 16px; margin-bottom: 24px; border: 1px solid #c7dcff; }
    .gj-otp-info-icon { width: 44px; height: 44px; border-radius: 50%; background: #4285F4; display: flex; align-items: center; justify-content: center; flex-shrink: 0; color: #fff; font-weight: 800; }
    .gj-otp-info-text { font-size: 15px; color: #666; line-height: 1.6; }
    .gj-otp-info-text strong { color: #191919; font-weight: 700; }
    .gj-loading-init { text-align: center; padding: 80px 20px; color: #999; font-size: 17px; }
    @media (max-width: 640px) { .gj-root { padding: calc(var(--pupoo-site-header-offset, 72px) + 20px) 16px 40px; align-items: flex-start; margin-top: 24px; } }
    @media (max-width: 480px) { .gj-card { padding: 32px 20px 28px; border-radius: 20px; max-width: 100%; } .gj-title { font-size: 22px; } .gj-subtitle { font-size: 14px; margin-bottom: 24px; } .gj-input { height: 50px; font-size: 15px; padding: 0 16px; } .gj-btn-primary { height: 52px; font-size: 16px; } .gj-btn-secondary { height: 48px; font-size: 14px; } }
  `;

  if (step === STEP.INIT) {
    return (
      <>
        <style>{styles}</style>
        <div className="gj-root">
          <div className="gj-card">
            <div className="gj-loading-init">구글 인증 정보를 확인하고 있습니다.</div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{styles}</style>
      <div className="gj-root">
        <div className="gj-card">
          <div className="gj-logo">
            <div className="gj-google-icon">
              <GoogleMark />
            </div>
          </div>

          <h1 className="gj-title">구글 회원가입</h1>
          <p className="gj-subtitle">
            {step === STEP.FORM
              ? "추가 정보를 입력하면 가입이 완료됩니다."
              : "인증번호를 입력해 주세요."}
          </p>

          <div className="gj-step-bar">
            <div
              className={`gj-step-dot ${step === STEP.FORM ? "active" : "done"}`}
            />
            <div className={`gj-step-dot ${step === STEP.OTP ? "active" : ""}`} />
          </div>

          {error && <div className="gj-error">{error}</div>}

          {step === STEP.FORM && (
            <>
              <div className="gj-field">
                <label className="gj-label">
                  이메일
                  {hasGoogleEmail && (
                    <span style={{ color: "#999", fontWeight: 400 }}>
                      {" "}
                      (구글 연동)
                    </span>
                  )}
                </label>
                <input
                  className="gj-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="example@gmail.com"
                  disabled={loading || hasGoogleEmail}
                  type="email"
                />
                {!emailTrim && (
                  <div className="gj-hint error">이메일은 필수입니다.</div>
                )}
              </div>

              <div className="gj-field">
                <label className="gj-label">
                  닉네임
                  <span style={{ color: "#bbb", fontWeight: 400 }}>
                    {" "}
                    (선택)
                  </span>
                </label>
                <input
                  className="gj-input"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="사용할 닉네임"
                  disabled={loading}
                />
              </div>

              <div className="gj-field">
                <label className="gj-label">휴대폰 번호</label>
                <input
                  className="gj-input"
                  value={phone}
                  onChange={(e) => setPhone(normalizeDigits(e.target.value))}
                  placeholder="01012345678"
                  disabled={loading}
                  inputMode="tel"
                />
                <div className="gj-hint">
                  본인 인증을 위한 인증번호가 발송됩니다.
                </div>
              </div>

              <button
                className="gj-btn-primary google"
                onClick={sendOtp}
                disabled={!canSendOtp}
              >
                {loading ? "발송 중..." : "인증번호 받기"}
              </button>
              <button
                className="gj-btn-secondary"
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
              <div className="gj-otp-info">
                <div className="gj-otp-info-icon">G</div>
                <div className="gj-otp-info-text">
                  <strong>{phone || "휴대폰 번호"}</strong>
                  로 받은 인증번호를 입력해 주세요.
                </div>
              </div>

              <div className="gj-field">
                <label className="gj-label">인증번호</label>
                <input
                  className="gj-input"
                  value={otpCode}
                  onChange={(e) =>
                    setOtpCode(normalizeDigits(e.target.value).slice(0, 6))
                  }
                  placeholder="6자리 인증번호"
                  disabled={loading}
                  inputMode="numeric"
                />
                <div className="gj-hint">
                  문자를 받지 못했다면 잠시 뒤 다시 시도해 주세요.
                </div>
              </div>

              <button
                className="gj-btn-primary confirm"
                onClick={verifyOtpAndComplete}
                disabled={!canVerify}
              >
                {loading ? "가입 처리 중..." : "회원가입 완료"}
              </button>
              <button
                className="gj-btn-secondary"
                type="button"
                onClick={sendOtp}
                disabled={loading}
              >
                인증번호 다시 받기
              </button>
            </>
          )}
        </div>
      </div>
    </>
  );
}
