import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, KeyRound, Lock, Mail, ShieldCheck } from "lucide-react";
import { authApi, normalizeApiError } from "./api/authApi";
import AuthSplitLayout, { AUTH_IMAGES } from "./AuthSplitLayout";

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
  const [showPassword, setShowPassword] = useState(false);
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
    <AuthSplitLayout
      visual={{
        ...AUTH_IMAGES.resetPassword,
        eyebrow: "ACCOUNT HELP",
        title: <>인증이 확인됐어요<br />새 비밀번호를 정해 주세요</>,
        desc: "변경이 끝나면 새 비밀번호로 다시 로그인하면 돼요",
        chips: [
          { icon: Mail, label: "정보 입력" },
          { icon: ShieldCheck, label: "인증번호 확인" },
          { icon: KeyRound, label: "새 비밀번호" },
        ],
      }}
      title="비밀번호 재설정"
      sub="인증이 확인된 계정만 새 비밀번호를 설정할 수 있어요"
    >
      {loading ? <div className="as-success">인증 상태를 확인하는 중입니다.</div> : null}

      {/* 기능: 유효한 재설정 컨텍스트가 있을 때만 새 비밀번호 입력 폼을 노출한다. */}
      {!loading && resetContext ? (
        <form onSubmit={handleSubmit}>
          <label className="as-label" htmlFor="rp-password">새 비밀번호</label>
          <div className="as-field">
            <Lock size={18} className="as-field-icon" />
            <input
              id="rp-password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder="새 비밀번호"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              className="as-eye"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "비밀번호 숨기기" : "비밀번호 보기"}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          <label className="as-label" htmlFor="rp-password-confirm">새 비밀번호 확인</label>
          <div className="as-field">
            <Lock size={18} className="as-field-icon" />
            <input
              id="rp-password-confirm"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder="한 번 더 입력해 주세요"
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
            />
          </div>

          {successMessage ? <div className="as-success">{successMessage}</div> : null}
          {errorMessage ? <div className="as-error" role="alert">{errorMessage}</div> : null}

          <button type="submit" className="as-submit" disabled={submitting}>
            {submitting ? "변경 중…" : "비밀번호 변경"}
          </button>
        </form>
      ) : null}

      {!loading && !resetContext ? (
        <>
          {errorMessage ? <div className="as-error" role="alert">{errorMessage}</div> : null}
          <button type="button" className="as-submit" onClick={() => navigate("/auth/find-password")}>
            비밀번호 찾기로 이동
          </button>
        </>
      ) : null}

      <div className="as-foot">
        로그인 화면으로 돌아갈까요?
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
    </AuthSplitLayout>
  );
}
