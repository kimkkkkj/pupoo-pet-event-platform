import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { recoverSessionAccessToken } from "../../../app/http/authSession";
import { axiosInstance } from "../../../app/http/axiosInstance";
import { tokenStore } from "../../../app/http/tokenStore";

export default function PaymentApprove() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const paymentId = searchParams.get("paymentId");
  const pgToken = searchParams.get("pg_token");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const didRunRef = useRef(false);
  const returnToApproveUrl = `/payment/approve?paymentId=${paymentId ?? ""}&pg_token=${pgToken ?? ""}`;

  const goToLogin = useCallback(() => {
    navigate("/auth/login", {
      state: { from: returnToApproveUrl },
      replace: true,
    });
  }, [navigate, returnToApproveUrl]);

  const recoverAccessToken = useCallback(async () => {
    const access = tokenStore.getAccessToken();
    if (access) return access;

    if (!tokenStore.hasSessionHint()) return null;

    try {
      return await recoverSessionAccessToken("user", { force: true });
    } catch {
      return null;
    }
  }, []);

  const approveOnce = useCallback(async () => {
    if (!paymentId || !pgToken) {
      setError("결제 승인 정보가 없습니다.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    const access = await recoverAccessToken();
    if (!access) {
      goToLogin();
      return;
    }

    try {
      await axiosInstance.post(`/api/payments/${paymentId}/approve`, null, {
        params: { pg_token: pgToken },
      });
      navigate("/registration/paymenthistory", { replace: true });
    } catch (e) {
      const status = Number(e?.response?.status);
      if (status === 401 || status === 403) {
        goToLogin();
        return;
      }

      const msg =
        e?.response?.data?.error?.message ||
        e?.response?.data?.message ||
        "결제 승인에 실패했습니다.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [goToLogin, navigate, paymentId, pgToken, recoverAccessToken]);

  useEffect(() => {
    if (didRunRef.current) return;
    didRunRef.current = true;
    approveOnce();
  }, [approveOnce]);

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "32px 20px" }}>
      <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 12 }}>
        결제 승인 처리
      </div>

      {loading && (
        <div style={{ color: "#374151" }}>
          결제 승인 처리 중입니다.
        </div>
      )}

      {!loading && error && (
        <>
          <div style={{ color: "#b91c1c", marginBottom: 12 }}>{error}</div>

          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={approveOnce}
              style={{
                height: 46,
                padding: "0 18px",
                borderRadius: 10,
                border: "none",
                background: "#90C450",
                color: "#fff",
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              다시 시도
            </button>

            <button
              onClick={() => navigate("/registration/paymenthistory")}
              style={{
                height: 46,
                padding: "0 18px",
                borderRadius: 10,
                border: "1px solid #e5e7eb",
                background: "#fff",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              결제 내역으로 이동
            </button>
          </div>
        </>
      )}

      {!loading && !error && (!paymentId || !pgToken) && (
        <>
          <div style={{ color: "#b91c1c", marginBottom: 12 }}>
            결제 승인 정보가 없습니다.
          </div>
          <button
            onClick={() => navigate("/registration/paymenthistory")}
            style={{
              height: 46,
              padding: "0 18px",
              borderRadius: 10,
              border: "1px solid #e5e7eb",
              background: "#fff",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            결제 내역으로 이동
          </button>
        </>
      )}
    </div>
  );
}
