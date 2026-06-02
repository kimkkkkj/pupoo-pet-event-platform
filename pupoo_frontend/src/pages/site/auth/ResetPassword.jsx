import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { authApi, normalizeApiError } from "./api/authApi";

const PASSWORD_RESET_CONTEXT_KEY = "password_reset_context";

// 기능: 최종 비밀번호 변경 실패 사유를 재설정 단계 메시지로 정리한다.
function resolveResetConfirmMessage(error) {
  const normalized = normalizeApiError(error, "비밀번호 변경에 실패했습니다. 인증 상태를 다시 확인해주세요.");

  if (normalized.status === 400) {
    return "새 비밀번호 입력값을 다시 확인해주세요.";
  }

  if (normalized.status === 401) {
    return "인증이 만료되었습니다. 비밀번호 찾기부터 다시 진행해주세요.";
  }

  if (normalized.status === 409) {
    return "이미 사용된 인증번호이거나 재시도가 필요한 상태입니다.";
  }

  return normalized.message;
}

export default function ResetPassword() {
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [resetContext, setResetContext] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    // 기능: reset 화면은 verify 단계에서 저장한 컨텍스트가 있을 때만 열리게 한다.
    // 설명: sessionStorage에 이메일, 전화번호, 인증번호가 모두 있어야 최종 비밀번호 변경 요청을 보낼 수 있다.
    const raw = sessionStorage.getItem(PASSWORD_RESET_CONTEXT_KEY);
    if (!raw) {
      setErrorMessage("인증번호 확인이 먼저 필요합니다.");
      setLoading(false);
      return;
    }

    try {
      const parsed = JSON.parse(raw);
      if (!parsed?.email || !parsed?.phone || !parsed?.verificationCode) {
        throw new Error("INVALID_CONTEXT");
      }

      // 기능: verify 성공으로 만든 컨텍스트만 복원하고, 값이 불완전하면 즉시 폐기한다.
      setResetContext(parsed);
      setErrorMessage("");
    } catch {
      sessionStorage.removeItem(PASSWORD_RESET_CONTEXT_KEY);
      setErrorMessage("인증번호 확인이 먼저 필요합니다.");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!password) {
      setErrorMessage("새 비밀번호를 입력해주세요.");
      return;
    }

    if (password !== passwordConfirm) {
      setErrorMessage("비밀번호가 일치하지 않습니다.");
      return;
    }

    if (!resetContext) {
      setErrorMessage("인증 상태가 없습니다. 비밀번호 찾기부터 다시 진행해주세요.");
      return;
    }

    setSubmitting(true);
    setErrorMessage("");

    try {
      // 기능: 최종 비밀번호 변경 API는 verify 단계에서 저장한 컨텍스트와 새 비밀번호를 함께 보낸다.
      // 설명: 코드 검증이 끝난 사용자만 변경할 수 있도록 resetContext가 요청 조건이 된다.
      // 흐름: 입력 검증 -> confirm API 호출 -> 성공 시 컨텍스트 삭제 -> 로그인 화면 이동.
      await authApi.passwordResetConfirm({
        email: resetContext.email,
        phone: resetContext.phone,
        verificationCode: resetContext.verificationCode,
        newPassword: password,
      });

      sessionStorage.removeItem(PASSWORD_RESET_CONTEXT_KEY);
      setSuccessMessage("비밀번호가 변경되었습니다. 다시 로그인해주세요.");
      setTimeout(() => navigate("/auth/login"), 1200);
    } catch (error) {
      setErrorMessage(resolveResetConfirmMessage(error));
      setSuccessMessage("");
    } finally {
      setSubmitting(false);
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
        <h1 style={{ margin: 0, fontSize: 24, color: "#1F2937" }}>비밀번호 재설정</h1>
        <p style={{ marginTop: 10, marginBottom: 20, color: "#6B7280", fontSize: 14 }}>
          인증이 확인된 계정에 대해서만 새 비밀번호를 설정할 수 있습니다.
        </p>

        {loading ? (
          <p style={{ margin: "12px 0 0", color: "#90C450", fontSize: 13 }}>
            인증 상태를 확인하는 중입니다.
          </p>
        ) : null}

        {/* 기능: 유효한 재설정 컨텍스트가 있을 때만 새 비밀번호 입력 폼을 노출한다. */}
        {!loading && resetContext ? (
          <form onSubmit={handleSubmit} style={{ display: "grid", gap: 10 }}>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="새 비밀번호"
              style={{
                height: 44,
                border: "1px solid #D1D5DB",
                borderRadius: 8,
                padding: "0 12px",
                fontSize: 14,
              }}
            />
            <input
              type="password"
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              placeholder="새 비밀번호 확인"
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
              disabled={submitting}
              style={{
                height: 46,
                border: "none",
                borderRadius: 8,
                background: submitting ? "#6B7A3D" : "#90C450",
                color: "#fff",
                fontSize: 15,
                fontWeight: 600,
                cursor: submitting ? "default" : "pointer",
                marginTop: 4,
              }}
            >
              {submitting ? "변경 중..." : "비밀번호 변경"}
            </button>
          </form>
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
            onClick={() => navigate("/auth/find-password")}
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
            다시 요청하기
          </button>
        </div>
      </div>
    </div>
  );
}
