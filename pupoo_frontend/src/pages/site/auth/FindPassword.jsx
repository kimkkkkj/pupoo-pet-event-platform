import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { authApi } from "./api/authApi";

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
      await authApi.passwordResetRequest({
        email: email.trim(),
        phone: phone.trim(),
      });

      setVerificationCode("");
      setCodeRequested(true);
      setSuccessMessage("이메일을 확인해 주세요. 받은 인증번호를 입력하면 비밀번호를 재설정할 수 있습니다.");
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

  const handleVerifyCode = async () => {
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
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #f4f5ee 0%, #eaecdf 100%)",
        padding: "24px 16px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 460,
          background: "#fff",
          borderRadius: 16,
          padding: 28,
          boxShadow: "0 14px 36px rgba(0,0,0,0.08)",
        }}
      >
        <h1 style={{ margin: 0, fontSize: 24, color: "#1F2937" }}>비밀번호 찾기</h1>
        <p style={{ marginTop: 10, marginBottom: 20, color: "#6B7280", fontSize: 14 }}>
          가입한 이메일과 휴대전화 번호로 인증번호를 확인한 뒤 비밀번호를 재설정합니다.
        </p>

        <form onSubmit={handleRequestCode} style={{ display: "grid", gap: 10 }}>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="이메일"
            style={{
              height: 44,
              border: "1px solid #D1D5DB",
              borderRadius: 8,
              padding: "0 12px",
              fontSize: 14,
            }}
          />
          <input
            type="text"
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, ""))}
            placeholder="휴대전화(숫자만)"
            maxLength={11}
            style={{
              height: 44,
              border: "1px solid #D1D5DB",
              borderRadius: 8,
              padding: "0 12px",
              fontSize: 14,
            }}
          />

          <button
            type="submit"
            disabled={requestingCode}
            style={{
              height: 46,
              border: "none",
              borderRadius: 8,
              background: requestingCode ? "#6B7A3D" : "#90C450",
              color: "#fff",
              fontSize: 15,
              fontWeight: 600,
              cursor: requestingCode ? "default" : "pointer",
              marginTop: 4,
            }}
          >
            {requestingCode ? "발급 중..." : "인증번호 요청"}
          </button>
        </form>

        {codeRequested ? (
          <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
            <input
              type="text"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value.replace(/[^0-9]/g, "").slice(0, 6))}
              placeholder="인증번호 6자리"
              maxLength={6}
              style={{
                height: 44,
                border: "1px solid #D1D5DB",
                borderRadius: 8,
                padding: "0 12px",
                fontSize: 14,
              }}
            />
            <button
              type="button"
              onClick={handleVerifyCode}
              disabled={verifyingCode}
              style={{
                height: 46,
                border: "none",
                borderRadius: 8,
                background: verifyingCode ? "#6B7A3D" : "#111827",
                color: "#fff",
                fontSize: 15,
                fontWeight: 600,
                cursor: verifyingCode ? "default" : "pointer",
              }}
            >
              {verifyingCode ? "확인 중..." : "인증번호 확인"}
            </button>
          </div>
        ) : null}

        {successMessage ? (
          <p style={{ marginTop: 12, color: "#90C450", fontSize: 13 }}>
            {successMessage}
          </p>
        ) : null}

        {errorMessage ? (
          <p style={{ marginTop: 12, color: "#DC2626", fontSize: 13 }}>
            {errorMessage}
          </p>
        ) : null}

        <div style={{ marginTop: 18, display: "flex", gap: 8 }}>
          <button
            type="button"
            onClick={() => navigate("/auth/login")}
            style={{
              flex: 1,
              height: 40,
              borderRadius: 8,
              border: "1px solid #D1D5DB",
              background: "#fff",
              color: "#374151",
              cursor: "pointer",
            }}
          >
            로그인으로
          </button>
          <button
            type="button"
            onClick={() => navigate("/auth/join/joinselect")}
            style={{
              flex: 1,
              height: 40,
              borderRadius: 8,
              border: "none",
              background: "#111827",
              color: "#fff",
              cursor: "pointer",
            }}
          >
            회원가입하기
          </button>
        </div>
      </div>
    </div>
  );
}
