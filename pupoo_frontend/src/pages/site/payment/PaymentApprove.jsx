import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AlertCircle, CheckCircle2, Loader2, QrCode, ReceiptText } from "lucide-react";
import { recoverSessionAccessToken } from "../../../app/http/authSession";
import { axiosInstance } from "../../../app/http/axiosInstance";
import { eventApi } from "../../../app/http/eventApi";
import { tokenStore } from "../../../app/http/tokenStore";
import { resolveImageUrl } from "../../../shared/utils/publicAssetUrl";
import { formatDateTime, formatWon, methodLabel, paymentResultStyles } from "./paymentResultStyles";

function formatDate(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

export default function PaymentApprove() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const paymentId = searchParams.get("paymentId");
  const pgToken = searchParams.get("pg_token");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [payment, setPayment] = useState(null);
  const [eventDetail, setEventDetail] = useState(null);

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

  // 승인 후 영수증에 보여줄 결제·행사 정보 (실패해도 완료 화면은 보여준다)
  const loadReceipt = useCallback(async () => {
    try {
      const res = await axiosInstance.get("/api/payments/my", { params: { page: 0, size: 20, sort: "requestedAt,desc" } });
      const rows = res?.data?.data?.content ?? [];
      const found = rows.find((p) => String(p?.paymentId) === String(paymentId)) || null;
      setPayment(found);
      if (found?.eventId) {
        const ev = await eventApi.getEventDetail(found.eventId);
        setEventDetail(ev?.data?.data ?? null);
      }
    } catch {
      // 영수증 정보 없이도 완료 안내는 가능
    }
  }, [paymentId]);

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
      await loadReceipt();
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
  }, [goToLogin, loadReceipt, paymentId, pgToken, recoverAccessToken]);

  useEffect(() => {
    if (didRunRef.current) return;
    didRunRef.current = true;
    approveOnce();
  }, [approveOnce]);

  const eventName = payment?.eventTitle || eventDetail?.eventName || "행사 참가비";
  const poster = eventDetail?.imageUrl ? resolveImageUrl(eventDetail.imageUrl) : "";
  const period = eventDetail?.startAt ? `${formatDate(eventDetail.startAt)} ~ ${formatDate(eventDetail.endAt)}` : "";
  const eventId = payment?.eventId || eventDetail?.eventId;

  return (
    <div className="pr">
      <style>{paymentResultStyles}</style>
      <div className="pr-wrap">
        <div className="pr-card">
          {loading ? (
            <div className="pr-head" style={{ padding: "56px 32px" }}>
              <div className="pr-icon wait"><Loader2 size={36} className="pr-spin" /></div>
              <h1 className="pr-title">결제를 확인하고 있어요</h1>
              <p className="pr-sub">잠시만 기다려 주세요. 이 화면을 닫지 마세요.</p>
            </div>
          ) : error ? (
            <>
              <div className="pr-head">
                <div className="pr-icon fail"><AlertCircle size={38} /></div>
                <h1 className="pr-title">결제를 완료하지 못했어요</h1>
                <p className="pr-sub">{error}</p>
              </div>
              <div className="pr-actions">
                <button type="button" className="pr-btn outline" onClick={() => navigate("/registration/paymenthistory")}>결제 내역</button>
                {paymentId && pgToken
                  ? <button type="button" className="pr-btn primary" onClick={approveOnce}>다시 시도</button>
                  : <button type="button" className="pr-btn primary" onClick={() => navigate("/registration/apply")}>참가 신청으로</button>}
              </div>
            </>
          ) : (
            <>
              <div className="pr-head">
                <div className="pr-icon ok"><CheckCircle2 size={40} /></div>
                <h1 className="pr-title">결제가 완료됐어요</h1>
                <p className="pr-sub">참가가 확정됐어요. 행사 당일 QR 코드로 입장해 주세요.</p>
              </div>

              <div className="pr-event">
                {poster ? <img className="pr-poster" src={poster} alt="" /> : <span className="pr-poster" />}
                <div style={{ minWidth: 0 }}>
                  <div className="pr-event-name">{eventName}</div>
                  {(period || eventDetail?.location) && (
                    <div className="pr-event-sub">{[period, eventDetail?.location].filter(Boolean).join(" · ")}</div>
                  )}
                </div>
              </div>

              <dl className="pr-receipt">
                <div className="pr-row"><dt>결제 수단</dt><dd>{methodLabel(payment?.paymentMethod || "KAKAOPAY")}</dd></div>
                <div className="pr-row"><dt>결제 일시</dt><dd className="mono">{formatDateTime(payment?.approvedAt || payment?.requestedAt || new Date())}</dd></div>
                <div className="pr-row"><dt>주문 번호</dt><dd className="mono">{payment?.orderNo || `PAY-${paymentId}`}</dd></div>
                <div className="pr-total">
                  <span>결제 금액</span>
                  <strong>{formatWon(payment?.amount)}<small>원</small></strong>
                </div>
              </dl>

              <div className="pr-actions">
                <button type="button" className="pr-btn outline" onClick={() => navigate("/registration/paymenthistory")}>
                  <ReceiptText size={18} />결제 내역
                </button>
                <button
                  type="button"
                  className="pr-btn primary"
                  onClick={() => navigate(eventId ? `/registration/qrcheckin?eventId=${eventId}` : "/registration/qrcheckin")}
                >
                  <QrCode size={18} />입장 QR 보기
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
