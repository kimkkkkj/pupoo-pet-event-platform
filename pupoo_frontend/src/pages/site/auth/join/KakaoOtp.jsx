// file: src/pages/site/auth/join/KakaoOtp.jsx
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { authApi } from "../api/authApi";
import { tokenStore } from "../../../../app/http/tokenStore";
import { useAuth } from "../AuthProvider";

export default function KakaoOtp() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  // state 유실에 대비해 sessionStorage 값을 함께 복원한다.
  const ctx = useMemo(() => {
    const s = location.state || {};
    const fallback = JSON.parse(sessionStorage.getItem("kakao_signup_ctx") || "{}");

    return {
      signupKey: s.signupKey || fallback.signupKey || "",
      phone: s.phone || fallback.phone || "",
      devOtp: s.devOtp || fallback.devOtp || "",
    };
  }, [location.state]);

  const [otp, setOtp] = useState(ctx.devOtp || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // signupKey가 없으면 비정상 진입으로 본다.
  useEffect(() => {
    if (!ctx.signupKey) {
      setError("signupKey가 없습니다. 카카오 가입을 다시 시작해주세요.");
    }
  }, [ctx.signupKey]);

  const normalizeOtp = (v) => v.replace(/[^0-9]/g, "");

  const handleVerifyAndComplete = async () => {
    setError("");

    if (!ctx.signupKey) {
      setError("signupKey가 없습니다. 다시 시도해주세요.");
      return;
    }

    const otpNum = normalizeOtp(otp);
    if (otpNum.length < 4) {
      setError("OTP를 입력해주세요.");
      return;
    }

    try {
      setLoading(true);

      // OTP를 먼저 검증한다.
      const phoneToUse = (ctx.phone || "").replace(/[^0-9]/g, "");

      if (phoneToUse.length < 10) {
      setError("휴대폰 정보가 없습니다. OTP를 다시 발송해주세요.");
      return;
      }

      await authApi.signupVerifyOtp({
      signupKey: ctx.signupKey,
      phone: phoneToUse,
      otpCode: otpNum,
      });

      // 가입을 완료하고 토큰을 발급받는다.
      const completeRes = await authApi.signupComplete({
        signupKey: ctx.signupKey,
      });

      const accessToken = completeRes?.accessToken;
      if (!accessToken) {
        setError("회원가입이 완료되지 않았어요. 다시 시도해 주세요.");
        return;
      }

      tokenStore.setAccess(accessToken);
      login();

      // 카카오 가입 임시 데이터를 정리한다.
      sessionStorage.removeItem("kakao_signup_ctx");

      // 필요하면 provider 정보도 가입 완료 후 함께 정리할 수 있다.
      // sessionStorage.removeItem("kakao_provider_uid");
      // sessionStorage.removeItem("kakao_email");
      // sessionStorage.removeItem("kakao_nickname");

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

  return (
    <div style={{ maxWidth: 440, margin: "60px auto", padding: 20 }}>
      <h2>휴대폰 인증(카카오)</h2>

      <div style={{ marginTop: 12, fontSize: 14, color: "#555" }}>
        <div>휴대폰: {ctx.phone || "(없음)"}</div>
        {ctx.devOtp ? (
          <div style={{ marginTop: 6 }}>
            devOtp(개발용): <b>{ctx.devOtp}</b>
          </div>
        ) : null}
      </div>

      <div style={{ marginTop: 18 }}>
        <input
          value={otp}
          onChange={(e) => setOtp(e.target.value)}
          placeholder="OTP 입력"
          style={{
            width: "100%",
            height: 44,
            padding: "0 12px",
            borderRadius: 10,
            border: "1px solid #ddd",
          }}
        />
      </div>

      {error ? <p style={{ color: "red", marginTop: 10 }}>{error}</p> : null}

      <button
        onClick={handleVerifyAndComplete}
        disabled={loading || !ctx.signupKey}
        style={{
          width: "100%",
          height: 48,
          marginTop: 14,
          borderRadius: 10,
          border: "none",
          background: "#4A90E2",
          color: "white",
          fontWeight: 700,
          cursor: "pointer",
        }}
      >
        {loading ? "처리중..." : "OTP 검증 후 가입 완료"}
      </button>

      <button
        onClick={() => navigate("/auth/join/joinselect", { replace: true })}
        style={{
          width: "100%",
          height: 44,
          marginTop: 10,
          borderRadius: 10,
          border: "1px solid #ddd",
          background: "white",
          cursor: "pointer",
        }}
      >
        처음으로
      </button>
    </div>
  );
}
