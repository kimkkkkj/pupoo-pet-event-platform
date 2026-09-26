import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AlertCircle, CheckCircle2, Clock, Info, Loader2, RotateCcw, ShieldCheck } from "lucide-react";
import { axiosInstance } from "../../../app/http/axiosInstance";
import { eventApi } from "../../../app/http/eventApi";
import { tokenStore } from "../../../app/http/tokenStore";
import { resolveImageUrl } from "../../../shared/utils/publicAssetUrl";
import { formatDateTime, formatWon, methodLabel, paymentResultStyles } from "./paymentResultStyles";

const REASONS = ["일정이 바뀌었어요", "반려동물 건강 문제", "단순 변심", "기타"];
const MAX_DETAIL = 200;

// 행사 시작 전이면 자동 환불, 시작 후면 관리자 승인 (결제 내역 화면과 같은 기준)
function isAutoRefundEligible(payment) {
  const t = Date.parse(String(payment?.eventStartAt || ""));
  if (!Number.isFinite(t)) return true;
  return Date.now() < t;
}

export default function PaymentRefund() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const paymentId = searchParams.get("paymentId");

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [payment, setPayment] = useState(null);
  const [existingRefund, setExistingRefund] = useState(null);
  const [eventDetail, setEventDetail] = useState(null);

  const [reason, setReason] = useState("");
  const [detail, setDetail] = useState("");
  const [agree, setAgree] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [done, setDone] = useState(null); // { auto: boolean }

  useEffect(() => {
    let alive = true;
    const load = async () => {
      if (!tokenStore.getAccess()) {
        navigate("/auth/login", { state: { from: `/payment/refund?paymentId=${paymentId ?? ""}` }, replace: true });
        return;
      }
      if (!paymentId) {
        setLoadError("환불할 결제 정보가 없습니다.");
        setLoading(false);
        return;
      }
      try {
        const [pRes, rRes] = await Promise.all([
          axiosInstance.get("/api/payments/my", { params: { page: 0, size: 50, sort: "requestedAt,desc" } }),
          axiosInstance.get("/api/refunds/my", { params: { page: 0, size: 200, sort: "requestedAt,desc" } }),
        ]);
        if (!alive) return;
        const found = (pRes?.data?.data?.content ?? []).find((p) => String(p?.paymentId) === String(paymentId)) || null;
        const refund = (rRes?.data?.data?.content ?? []).find((r) => String(r?.paymentId) === String(paymentId)) || null;
        if (!found) setLoadError("결제 정보를 찾을 수 없습니다.");
        setPayment(found);
        setExistingRefund(refund);
        if (found?.eventId) {
          try {
            const ev = await eventApi.getEventDetail(found.eventId);
            if (alive) setEventDetail(ev?.data?.data ?? null);
          } catch { /* 포스터 없이 진행 */ }
        }
      } catch (e) {
        if (alive) setLoadError(e?.response?.data?.error?.message || e?.response?.data?.message || "결제 정보를 불러오지 못했습니다.");
      } finally {
        if (alive) setLoading(false);
      }
    };
    load();
    return () => { alive = false; };
  }, [navigate, paymentId]);

  const auto = useMemo(() => isAutoRefundEligible(payment), [payment]);
  const canRefund = payment?.status === "APPROVED" && !existingRefund;
  const needsDetail = reason === "기타";
  const ready = canRefund && reason && (!needsDetail || detail.trim()) && agree && !submitting;

  const eventName = payment?.eventTitle || eventDetail?.eventName || "행사 참가비";
  const poster = eventDetail?.imageUrl ? resolveImageUrl(eventDetail.imageUrl) : "";

  const submit = async () => {
    if (!ready) return;
    setSubmitting(true);
    setSubmitError("");
    const text = detail.trim() ? `${reason} - ${detail.trim()}` : reason;
    try {
      await axiosInstance.post("/api/refunds", {
        paymentId: payment.paymentId,
        refundAmount: Number(payment.amount) || 0,
        reason: auto ? `[행사 시작 전 자동 환불] ${text}` : text,
      });
      setDone({ auto });
    } catch (e) {
      setSubmitError(e?.response?.data?.error?.message || e?.response?.data?.message || "환불 처리 중 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  const eventRow = (
    <div className="pr-event">
      {poster ? <img className="pr-poster" src={poster} alt="" /> : <span className="pr-poster" />}
      <div style={{ minWidth: 0 }}>
        <div className="pr-event-name">{eventName}</div>
        <div className="pr-event-sub">{methodLabel(payment?.paymentMethod)} · {formatDateTime(payment?.requestedAt)} 결제</div>
      </div>
    </div>
  );

  return (
    <div className="pr">
      <style>{paymentResultStyles}</style>
      <div className="pr-wrap">
        <div className="pr-card">
          {loading ? (
            <div className="pr-head" style={{ padding: "56px 32px" }}>
              <div className="pr-icon wait"><Loader2 size={36} className="pr-spin" /></div>
              <h1 className="pr-title">결제 정보를 불러오고 있어요</h1>
            </div>
          ) : done ? (
            /* 완료 */
            <>
              <div className="pr-head">
                <div className={`pr-icon ${done.auto ? "ok" : "wait"}`}>{done.auto ? <CheckCircle2 size={40} /> : <Clock size={38} />}</div>
                <h1 className="pr-title">{done.auto ? "환불이 완료됐어요" : "환불 신청이 접수됐어요"}</h1>
                <p className="pr-sub">
                  {done.auto
                    ? "결제하신 카카오페이로 환불돼요. 참가 신청도 함께 취소됐어요."
                    : "관리자가 확인한 뒤 처리 결과를 알려드릴게요. 진행 상태는 결제 내역에서 볼 수 있어요."}
                </p>
              </div>
              {eventRow}
              <dl className="pr-receipt">
                <div className="pr-row"><dt>환불 사유</dt><dd>{reason}</dd></div>
                <div className="pr-total">
                  <span>{done.auto ? "환불 금액" : "환불 신청 금액"}</span>
                  <strong>{formatWon(payment?.amount)}<small>원</small></strong>
                </div>
              </dl>
              <div className="pr-actions single">
                <button type="button" className="pr-btn primary" onClick={() => navigate("/registration/paymenthistory")}>결제 내역으로</button>
              </div>
            </>
          ) : loadError || !payment ? (
            /* 불러오기 실패 */
            <>
              <div className="pr-head">
                <div className="pr-icon fail"><AlertCircle size={38} /></div>
                <h1 className="pr-title">환불을 진행할 수 없어요</h1>
                <p className="pr-sub">{loadError || "결제 정보를 찾을 수 없습니다."}</p>
              </div>
              <div className="pr-actions single">
                <button type="button" className="pr-btn outline" onClick={() => navigate("/registration/paymenthistory")}>결제 내역으로</button>
              </div>
            </>
          ) : !canRefund ? (
            /* 이미 환불했거나 환불 대상이 아님 */
            <>
              <div className="pr-head">
                <div className="pr-icon warn"><Info size={38} /></div>
                <h1 className="pr-title">{existingRefund ? "이미 환불을 신청한 결제예요" : "환불할 수 없는 결제예요"}</h1>
                <p className="pr-sub">{existingRefund ? "진행 상태는 결제 내역에서 확인할 수 있어요." : "결제가 완료된 건만 환불할 수 있어요."}</p>
              </div>
              {eventRow}
              <div className="pr-actions single" style={{ paddingTop: 20 }}>
                <button type="button" className="pr-btn outline" onClick={() => navigate("/registration/paymenthistory")}>결제 내역으로</button>
              </div>
            </>
          ) : (
            /* 신청 폼 */
            <>
              <div className="pr-head" style={{ paddingBottom: 20 }}>
                <div className="pr-icon warn"><RotateCcw size={34} /></div>
                <h1 className="pr-title">환불 신청</h1>
                <p className="pr-sub">환불하면 행사 참가 신청도 함께 취소돼요.</p>
              </div>

              {eventRow}

              <div className="pr-section">
                <h2 className="pr-section-title">처리 방식</h2>
                {auto ? (
                  <div className="pr-policy auto">
                    <ShieldCheck size={18} />
                    <span>행사 시작 전이라 <b>바로 환불</b>돼요. 신청하면 결제하신 카카오페이로 전액 돌려드려요.</span>
                  </div>
                ) : (
                  <div className="pr-policy manual">
                    <Clock size={18} />
                    <span>행사가 이미 시작돼서 <b>관리자 승인</b> 후 환불돼요. 사유를 자세히 적어주시면 확인이 빨라요.</span>
                  </div>
                )}
              </div>

              <div className="pr-section">
                <h2 className="pr-section-title">환불 사유</h2>
                <div className="pr-reasons" role="radiogroup">
                  {REASONS.map((r) => (
                    <button key={r} type="button" role="radio" aria-checked={reason === r} className={`pr-reason${reason === r ? " on" : ""}`} onClick={() => setReason(r)}>
                      <span className="pr-radio" />{r}
                    </button>
                  ))}
                </div>
                <textarea
                  className="pr-textarea"
                  value={detail}
                  maxLength={MAX_DETAIL}
                  onChange={(e) => setDetail(e.target.value)}
                  placeholder={needsDetail ? "환불 사유를 적어주세요 (필수)" : "추가로 전할 내용이 있으면 적어주세요 (선택)"}
                />
                <div className="pr-count">{detail.length} / {MAX_DETAIL}</div>
              </div>

              <dl className="pr-receipt" style={{ marginTop: 14 }}>
                <div className="pr-row"><dt>결제 금액</dt><dd>{formatWon(payment.amount)}원</dd></div>
                <div className="pr-row"><dt>주문 번호</dt><dd className="mono">{payment.orderNo || `PAY-${payment.paymentId}`}</dd></div>
                <div className="pr-total">
                  <span>환불 예정 금액</span>
                  <strong>{formatWon(payment.amount)}<small>원</small></strong>
                </div>
              </dl>

              <label className="pr-agree">
                <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
                환불하면 참가 신청이 취소되고 입장 QR도 사용할 수 없게 되는 것에 동의해요.
              </label>

              {submitError ? <div className="pr-error" style={{ marginTop: 14 }}>{submitError}</div> : null}

              <div className="pr-actions" style={{ paddingTop: 18 }}>
                <button type="button" className="pr-btn outline" onClick={() => navigate(-1)}>돌아가기</button>
                <button type="button" className="pr-btn danger" onClick={submit} disabled={!ready}>
                  {submitting ? <><Loader2 size={18} className="pr-spin" />처리 중…</> : auto ? "환불하기" : "환불 신청하기"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
