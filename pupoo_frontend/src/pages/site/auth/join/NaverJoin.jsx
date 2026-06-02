import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { authApi } from "../api/authApi";
import { tokenStore } from "../../../../app/http/tokenStore";
import { useAuth } from "../AuthProvider";
import { NaverBrandMark } from "../../../../shared/ui/NaverBrandMark";
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

export default function NaverJoin() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const didInitRef = useRef(false);

  const naverSession = useMemo(
    () =>
      getSocialJoinState("naver") || {
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

  const [providerUid] = useState(naverSession.providerUid);
  const [email, setEmail] = useState(naverSession.email);
  const [nickname, setNickname] = useState(naverSession.nickname);
  const [phone, setPhone] = useState(naverSession.phone || "");
  const [step, setStep] = useState(naverSession.step || STEP.INIT);
  const [signupKey, setSignupKey] = useState(naverSession.signupKey || "");
  const [otpCode, setOtpCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [tempPassword] = useState(() => {
    const key = "naver_temp_password";
    const existing = naverSession.tempPassword || sessionStorage.getItem(key);
    if (existing) return existing;

    const rand = `${crypto.randomUUID()}-${Math.random().toString(36).slice(2)}`;
    const password = rand.replace(/-/g, "").slice(0, 16) + "aA1!";
    sessionStorage.setItem(key, password);
    return password;
  });

  const hasNaverEmail = !!(naverSession.email || "").trim();
  const emailTrim = (email || "").trim();
  const nickTrim = (nickname || "").trim() || "naver_user";
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

    setStep(naverSession.signupKey ? STEP.OTP : STEP.FORM);
  }, [navigate, naverSession.signupKey, providerUid]);

  useEffect(() => {
    if (!providerUid) return;
    setSocialJoinState("naver", {
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
        socialProvider: "NAVER",
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
      setSocialJoinState("naver", {
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

      clearSocialJoinState("naver");
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
    .nj-root { min-height: 100vh; background: #f6f6f6; font-family: 'JeonjuCraftGothic', 'Pretendard', -apple-system, sans-serif; padding: 0 20px; display: flex; align-items: center; justify-content: center; margin-top: 92px; }
    .nj-root *, .nj-root *::before, .nj-root *::after { box-sizing: border-box; font-family: inherit; }
    .nj-card { width: 100%; max-width: 520px; margin: 0 auto; background: #fff; border-radius: 28px; padding: 56px 48px 48px; box-shadow: 0 8px 40px rgba(0,0,0,0.08); }
    .nj-logo { display: flex; align-items: center; justify-content: center; gap: 10px; margin-bottom: 12px; }
    .nj-title { text-align: center; font-size: 28px; font-weight: 800; color: #191919; margin: 0 0 10px; letter-spacing: -0.5px; }
    .nj-subtitle { text-align: center; font-size: 16px; color: #999; font-weight: 400; margin: 0 0 36px; }
    .nj-step-bar { display: flex; align-items: center; justify-content: center; gap: 10px; margin-bottom: 36px; }
    .nj-step-dot { width: 12px; height: 12px; border-radius: 50%; background: #e5e5e5; transition: all 0.2s; }
    .nj-step-dot.active { width: 36px; border-radius: 6px; background: #03C75A; }
    .nj-step-dot.done { background: #03C75A; }
    .nj-field { margin-bottom: 20px; }
    .nj-label { display: block; font-size: 15px; font-weight: 700; color: #333; margin-bottom: 10px; }
    .nj-input { width: 100%; height: 56px; padding: 0 20px; border-radius: 14px; border: 1.5px solid #e5e5e5; background: #fafafa; font-size: 16px; font-weight: 500; color: #191919; outline: none; transition: border-color 0.15s, box-shadow 0.15s; }
    .nj-input:focus { border-color: #03C75A; background: #fff; box-shadow: 0 0 0 3px rgba(3,199,90,0.15); }
    .nj-input:disabled { background: #f0f0f0; color: #999; }
    .nj-hint { margin-top: 8px; font-size: 13px; color: #999; line-height: 1.5; }
    .nj-hint.error { color: #e54545; }
    .nj-error { background: #fff5f5; border: 1px solid #fecaca; border-radius: 14px; padding: 14px 18px; margin-bottom: 20px; font-size: 14px; color: #dc2626; font-weight: 500; line-height: 1.5; }
    .nj-btn-primary { width: 100%; height: 58px; border-radius: 14px; border: none; font-size: 17px; font-weight: 800; cursor: pointer; transition: all 0.15s; margin-top: 12px; font-family: inherit; letter-spacing: -0.3px; }
    .nj-btn-primary.naver { background: #03C75A; color: #fff; }
    .nj-btn-primary.naver:hover:not(:disabled) { background: #02b350; transform: translateY(-1px); box-shadow: 0 4px 16px rgba(3,199,90,0.25); }
    .nj-btn-primary.confirm { background: #191919; color: #fff; }
    .nj-btn-primary.confirm:hover:not(:disabled) { background: #333; transform: translateY(-1px); box-shadow: 0 4px 16px rgba(0,0,0,0.15); }
    .nj-btn-primary:disabled { background: #f0f0f0; color: #bbb; cursor: not-allowed; }
    .nj-btn-secondary { width: 100%; height: 54px; margin-top: 12px; border-radius: 14px; border: 1.5px solid #e5e5e5; background: #fff; font-size: 15px; font-weight: 600; color: #666; cursor: pointer; transition: all 0.15s; font-family: inherit; }
    .nj-btn-secondary:hover:not(:disabled) { background: #f8f9fc; border-color: #ccc; }
    .nj-btn-secondary:disabled { color: #bbb; cursor: not-allowed; }
    .nj-otp-info { display: flex; align-items: center; gap: 14px; padding: 18px 20px; background: #effcf4; border-radius: 16px; margin-bottom: 24px; border: 1px solid #c8f0d7; }
    .nj-otp-info-icon { width: 44px; height: 44px; border-radius: 50%; background: #03C75A; display: flex; align-items: center; justify-content: center; color: #fff; flex-shrink: 0; font-weight: 800; }
    .nj-otp-info-text { font-size: 15px; color: #666; line-height: 1.6; }
    .nj-otp-info-text strong { color: #191919; font-weight: 700; }
    .nj-loading-init { text-align: center; padding: 80px 20px; color: #999; font-size: 17px; }
    @media (max-width: 640px) { .nj-root { padding: calc(var(--pupoo-site-header-offset, 72px) + 20px) 16px 40px; align-items: flex-start; margin-top: 24px; } }
    @media (max-width: 480px) { .nj-card { padding: 32px 20px 28px; border-radius: 20px; max-width: 100%; } .nj-title { font-size: 22px; } .nj-subtitle { font-size: 14px; margin-bottom: 24px; } .nj-input { height: 50px; font-size: 15px; padding: 0 16px; } .nj-btn-primary { height: 52px; font-size: 16px; } .nj-btn-secondary { height: 48px; font-size: 14px; } .nj-otp-info { padding: 14px 16px; gap: 12px; } .nj-otp-info-text { font-size: 14px; } }
  `;

  if (step === STEP.INIT) {
    return (
      <>
        <style>{styles}</style>
        <div className="nj-root">
          <div className="nj-card">
            <div className="nj-loading-init">네이버 인증 정보를 확인하고 있습니다.</div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{styles}</style>
      <div className="nj-root">
        <div className="nj-card">
          <div className="nj-logo">
            <NaverBrandMark size={56} rounded={16} />
          </div>

          <h1 className="nj-title">네이버 회원가입</h1>
          <p className="nj-subtitle">
            {step === STEP.FORM
              ? "추가 정보를 입력하면 가입이 완료됩니다."
              : "인증번호를 입력해 주세요."}
          </p>

          <div className="nj-step-bar">
            <div
              className={`nj-step-dot ${step === STEP.FORM ? "active" : "done"}`}
            />
            <div className={`nj-step-dot ${step === STEP.OTP ? "active" : ""}`} />
          </div>

          {error && <div className="nj-error">{error}</div>}

          {step === STEP.FORM && (
            <>
              <div className="nj-field">
                <label className="nj-label">
                  이메일
                  {hasNaverEmail && (
                    <span style={{ color: "#999", fontWeight: 400 }}>
                      {" "}
                      (네이버 연동)
                    </span>
                  )}
                </label>
                <input
                  className="nj-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="example@email.com"
                  disabled={loading || hasNaverEmail}
                  type="email"
                />
                {!emailTrim && (
                  <div className="nj-hint error">
                    이메일은 필수입니다. 네이버에서 이메일을 받지 못한 경우 직접 입력해
                    주세요.
                  </div>
                )}
              </div>

              <div className="nj-field">
                <label className="nj-label">
                  닉네임
                  <span style={{ color: "#bbb", fontWeight: 400 }}>
                    {" "}
                    (선택)
                  </span>
                </label>
                <input
                  className="nj-input"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="사용할 닉네임"
                  disabled={loading}
                />
              </div>

              <div className="nj-field">
                <label className="nj-label">휴대폰 번호</label>
                <input
                  className="nj-input"
                  value={phone}
                  onChange={(e) => setPhone(normalizeDigits(e.target.value))}
                  placeholder="01012345678"
                  disabled={loading}
                  inputMode="tel"
                />
                <div className="nj-hint">
                  본인 인증을 위한 인증번호가 발송됩니다.
                </div>
              </div>

              <button
                className="nj-btn-primary naver"
                onClick={sendOtp}
                disabled={!canSendOtp}
              >
                {loading ? "발송 중..." : "인증번호 받기"}
              </button>
              <button
                className="nj-btn-secondary"
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
              <div className="nj-otp-info">
                <div className="nj-otp-info-icon">N</div>
                <div className="nj-otp-info-text">
                  <strong>{phone || "휴대폰 번호"}</strong>
                  로 받은 인증번호를 입력해 주세요.
                </div>
              </div>

              <div className="nj-field">
                <label className="nj-label">인증번호</label>
                <input
                  className="nj-input"
                  value={otpCode}
                  onChange={(e) =>
                    setOtpCode(normalizeDigits(e.target.value).slice(0, 6))
                  }
                  placeholder="6자리 인증번호"
                  disabled={loading}
                  inputMode="numeric"
                />
                <div className="nj-hint">
                  문자를 받지 못했다면 잠시 뒤 다시 시도해 주세요.
                </div>
              </div>

              <button
                className="nj-btn-primary confirm"
                onClick={verifyOtpAndComplete}
                disabled={!canVerify}
              >
                {loading ? "가입 처리 중..." : "회원가입 완료"}
              </button>
              <button
                className="nj-btn-secondary"
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
