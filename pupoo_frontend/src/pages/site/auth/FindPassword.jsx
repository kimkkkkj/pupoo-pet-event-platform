import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { KeyRound, Mail, MailCheck, ShieldCheck, Smartphone } from "lucide-react";
import { authApi } from "./api/authApi";
import AuthSplitLayout, { AUTH_IMAGES } from "./AuthSplitLayout";

const PASSWORD_RESET_CONTEXT_KEY = "password_reset_context";

export default function FindPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [codeRequested, setCodeRequested] = useState(false);
  const [requestingCode, setRequestingCode] = useState(false);
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const handleRequestCode = async (e) => {
    e.preventDefault();

    if (!email.trim()) {
      setErrorMessage("이메일을 입력해 주세요.");
      return;
    }

    if (!phone.trim()) {
      setErrorMessage("휴대전화 번호를 입력해 주세요.");
      return;
    }

    setRequestingCode(true);
    setErrorMessage("");
    setSuccessMessage("");
    setCodeRequested(false);
    sessionStorage.removeItem(PASSWORD_RESET_CONTEXT_KEY);

    try {
      const res = await authApi.passwordResetRequest({
        email: email.trim(),
        phone: phone.trim(),
      });

      // 로컬(메일 발송 없음)에서는 서버가 내려준 인증번호를 채워 넣는다
      const devCode = res?.verificationCode ?? res?.data?.verificationCode;
      setVerificationCode(devCode ? String(devCode) : "");
      setCodeRequested(true);
      setSuccessMessage(
        devCode
          ? "개발 환경이라 메일 대신 인증번호를 자동으로 입력했어요."
          : "이메일로 인증번호를 보냈어요. 받은 6자리를 입력해 주세요.",
      );
    } catch (error) {
      const message =
        error?.message ||
        "인증번호 발급에 실패했습니다. 잠시 후 다시 시도해 주세요.";
      setErrorMessage(message);
      setVerificationCode("");
      setCodeRequested(false);
    } finally {
      setRequestingCode(false);
    }
  };

  const handleVerifyCode = async (e) => {
    e?.preventDefault();
    if (!codeRequested) {
      setErrorMessage("먼저 인증번호를 요청해 주세요.");
      return;
    }

    if (!verificationCode.trim()) {
      setErrorMessage("인증번호를 입력해 주세요.");
      return;
    }

    setVerifyingCode(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      await authApi.passwordResetVerifyCode({
        email: email.trim(),
        phone: phone.trim(),
        verificationCode: verificationCode.trim(),
      });

      sessionStorage.setItem(
        PASSWORD_RESET_CONTEXT_KEY,
        JSON.stringify({
          email: email.trim(),
          phone: phone.trim(),
          verificationCode: verificationCode.trim(),
        })
      );

      navigate("/auth/reset-password");
    } catch (error) {
      const message =
        error?.message ||
        "인증번호 확인에 실패했습니다. 다시 시도해 주세요.";
      setErrorMessage(message);
    } finally {
      setVerifyingCode(false);
    }
  };

  return (
    <AuthSplitLayout
      visual={{
        ...AUTH_IMAGES.findPassword,
        eyebrow: "ACCOUNT HELP",
        title: <>비밀번호를 잊으셨나요?<br />금방 다시 찾아드릴게요</>,
        desc: "가입한 이메일과 휴대폰 번호만 있으면 새 비밀번호를 설정할 수 있어요",
        chips: [
          { icon: Mail, label: "정보 입력" },
          { icon: ShieldCheck, label: "인증번호 확인" },
          { icon: KeyRound, label: "새 비밀번호" },
        ],
      }}
      title="비밀번호 찾기"
      sub={codeRequested ? "이메일로 받은 인증번호를 입력해 주세요" : "가입할 때 입력한 정보를 알려주세요"}
    >
      <form onSubmit={codeRequested ? handleVerifyCode : handleRequestCode}>
        <label className="as-label" htmlFor="fp-email">이메일</label>
        <div className={`as-field${codeRequested ? " is-done" : ""}`}>
          <Mail size={18} className="as-field-icon" />
          <input
            id="fp-email"
            type="email"
            autoComplete="username"
            placeholder="example@pupoo.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={codeRequested}
          />
        </div>

        <label className="as-label" htmlFor="fp-phone">휴대폰 번호</label>
        <div className={`as-field${codeRequested ? " is-done" : ""}`}>
          <Smartphone size={18} className="as-field-icon" />
          <input
            id="fp-phone"
            type="tel"
            inputMode="numeric"
            placeholder="숫자만 입력 (01012345678)"
            maxLength={11}
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, ""))}
            disabled={codeRequested}
          />
        </div>

        {codeRequested ? (
          <>
            <label className="as-label" htmlFor="fp-code">인증번호</label>
            <div className="as-field">
              <MailCheck size={18} className="as-field-icon" />
              <input
                id="fp-code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="6자리 숫자"
                maxLength={6}
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/[^0-9]/g, "").slice(0, 6))}
                autoFocus
              />
            </div>
          </>
        ) : null}

        {successMessage ? <div className="as-success">{successMessage}</div> : null}
        {errorMessage ? <div className="as-error" role="alert">{errorMessage}</div> : null}

        {codeRequested ? (
          <>
            <button type="submit" className="as-submit" disabled={verifyingCode}>
              {verifyingCode ? "확인 중…" : "인증하고 다음으로"}
            </button>
            <div className="fp-resend">
              <button
                type="button"
                className="as-link"
                onClick={() => {
                  setCodeRequested(false);
                  setVerificationCode("");
                  setSuccessMessage("");
                  setErrorMessage("");
                }}
              >
                정보 다시 입력
              </button>
              <span aria-hidden="true">·</span>
              <button type="button" className="as-link" onClick={handleRequestCode} disabled={requestingCode}>
                {requestingCode ? "보내는 중…" : "인증번호 다시 받기"}
              </button>
            </div>
          </>
        ) : (
          <button type="submit" className="as-submit" disabled={requestingCode}>
            {requestingCode ? "보내는 중…" : "인증번호 받기"}
          </button>
        )}
      </form>

      <div className="as-foot">
        비밀번호가 기억나셨나요?
        <a
          href="/auth/login"
          onClick={(e) => {
            e.preventDefault();
            navigate("/auth/login");
          }}
        >
          로그인
        </a>
      </div>

      <style>{`
        .fp-resend { display: flex; align-items: center; justify-content: center; gap: 10px; margin-top: 14px; color: #d1d5db; }
      `}</style>
    </AuthSplitLayout>
  );
}
