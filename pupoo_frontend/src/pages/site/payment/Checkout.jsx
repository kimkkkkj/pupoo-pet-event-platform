import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { axiosInstance } from "../../../app/http/axiosInstance";
import { tokenStore } from "../../../app/http/tokenStore";
import { eventApi } from "../../../app/http/eventApi";
import { toPublicAssetUrl } from "../../../shared/utils/publicAssetUrl";
import PageHeader from "../components/PageHeader";
import { CalendarDays, Check, ChevronLeft, Info, Lock, MapPin } from "lucide-react";


// 카카오페이 말풍선 마크
function KakaoPayMark({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 4C7.03 4 3 7.13 3 11c0 2.45 1.62 4.6 4.06 5.85l-1.03 3.76c-.09.32.27.57.54.38l4.37-2.93c.35.03.7.04 1.06.04 4.97 0 9-3.13 9-7s-4.03-7-9-7z" fill="#191919" />
    </svg>
  );
}

const DOG_FALLBACK =
  "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=600&h=400&fit=crop";

function normalizeAmount(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function fmtDate(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

export default function Checkout() {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  // 결제 수단은 카카오페이 하나 (포트폴리오라 다른 PG는 연결하지 않음)
  const method = "KAKAOPAY";
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [eventDetail, setEventDetail] = useState(null);

  const state = location.state || {};
  const eventId = useMemo(() => {
    const raw = searchParams.get("eventId") ?? state.eventId;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  }, [searchParams, state.eventId]);

  const amount = useMemo(() => {
    const raw = searchParams.get("amount") ?? state.amount;
    return normalizeAmount(raw);
  }, [searchParams, state.amount]);

  const title = useMemo(() => {
    return searchParams.get("title") ?? state.title ?? "결제";
  }, [searchParams, state.title]);

  const returnUrl = useMemo(() => {
    return searchParams.get("returnUrl") ?? state.returnUrl ?? "/";
  }, [searchParams, state.returnUrl]);

  useEffect(() => {
    if (!eventId) return;
    let cancelled = false;
    eventApi.getEventDetail(eventId).then((res) => {
      if (!cancelled) setEventDetail(res.data.data ?? res.data);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [eventId]);

  const eventImage = eventDetail?.imageUrl
    ? toPublicAssetUrl(eventDetail.imageUrl)
    : DOG_FALLBACK;

  const handlePay = async () => {
    if (!tokenStore.getAccess()) {
      window.alert("로그인이 필요합니다.");
      navigate("/auth/login", { state: { from: location } });
      return;
    }
    if (!eventId || amount <= 0) {
      setError("결제 정보를 확인할 수 없습니다.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await axiosInstance.post(`/api/events/${eventId}/payments`, {
        amount,
        paymentMethod: method,
      });
      const ready = res.data.data;
      const redirectUrl = ready?.redirectPcUrl || ready?.redirectMobileUrl;
      if (redirectUrl) {
        window.location.href = redirectUrl;
      } else {
        setError("결제 준비에 실패했습니다. 잠시 후 다시 시도해 주세요.");
      }
    } catch (e) {
      const apiMessage =
        e?.response?.data?.error?.message ||
        e?.response?.data?.message ||
        "";
      if (e?.response?.status === 409) {
        setError("이미 진행 중인 결제가 있습니다. 결제 내역에서 확인해 주세요.");
      } else if (e?.response?.status === 404) {
        setError("행사 신청 상태를 찾을 수 없습니다. 행사 신청 후 다시 결제해 주세요.");
      } else if (apiMessage) {
        setError(`결제 준비 실패: ${apiMessage}`);
      } else {
        setError("결제 준비에 실패했습니다. 잠시 후 다시 시도해 주세요.");
      }
    } finally {
      setLoading(false);
    }
  };

  const periodText = eventDetail?.startAt
    ? `${fmtDate(eventDetail.startAt)}${eventDetail.endAt ? ` ~ ${fmtDate(eventDetail.endAt)}` : ""}`
    : "";
  const eventName = eventDetail?.eventName || title;

  return (
    <div style={{ fontFamily: "'Noto Sans KR', sans-serif", background: "#f8f9fc", minHeight: "100vh" }}>
      <style>{`
        .ck * { box-sizing: border-box; }
        .ck { max-width: 1100px; margin: 0 auto; padding: 36px 24px 88px; }
        .ck-card {
          display: grid; grid-template-columns: minmax(0, 46%) minmax(0, 1fr);
          background: #fff; border-radius: 24px; overflow: hidden;
          box-shadow: 0 0 0 1px rgba(0,0,0,.05), 0 20px 50px rgba(15, 23, 42, .06);
        }

        /* 왼쪽: 포스터 전체가 보이도록 contain, 뒤에는 같은 포스터를 흐리게 */
        .ck-poster { position: relative; min-height: 620px; overflow: hidden; background: #111827; isolation: isolate; }
        .ck-poster-bg {
          position: absolute; inset: -30px; background-size: cover; background-position: center;
          filter: blur(28px) brightness(.55); transform: scale(1.1); z-index: -1;
        }
        .ck-poster img {
          position: absolute; inset: 28px 28px 150px; width: calc(100% - 56px); height: calc(100% - 178px);
          object-fit: contain; filter: drop-shadow(0 16px 36px rgba(0,0,0,.45));
        }
        .ck-poster-info {
          position: absolute; left: 0; right: 0; bottom: 0; padding: 22px 28px 26px; color: #fff;
          background: linear-gradient(to top, rgba(0,0,0,.72), rgba(0,0,0,0));
        }
        .ck-poster-name { margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.3px; line-height: 1.35; }
        .ck-poster-meta { display: flex; flex-wrap: wrap; gap: 6px 16px; margin-top: 10px; font-size: 13.5px; color: rgba(255,255,255,.82); }
        .ck-poster-meta span { display: inline-flex; align-items: center; gap: 6px; }

        /* 오른쪽: 결제 */
        .ck-pay { padding: 40px 44px; display: flex; flex-direction: column; }
        .ck-sec-title { display: flex; align-items: center; gap: 8px; margin: 0 0 14px; font-size: 16px; font-weight: 800; color: #111827; }
        .ck-sec-title::before { content: ""; width: 4px; height: 16px; border-radius: 2px; background: #90C450; }

        .ck-order { margin: 0 0 30px; padding: 4px 0; border-top: 1px solid #f1f3f5; }
        .ck-order div { display: grid; grid-template-columns: 84px minmax(0, 1fr); gap: 12px; padding: 12px 0; border-bottom: 1px solid #f1f3f5; }
        .ck-order dt { font-size: 14px; color: #9ca3af; font-weight: 600; }
        .ck-order dd { margin: 0; font-size: 15px; color: #111827; font-weight: 600; word-break: keep-all; }

        .ck-method {
          display: flex; align-items: center; gap: 14px; padding: 18px 20px; border-radius: 16px;
          border: 2px solid #FEE500; background: #fffdeb;
        }
        .ck-kakao-mark {
          width: 48px; height: 48px; border-radius: 14px; background: #FEE500; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
        }
        .ck-method-name { font-size: 17px; font-weight: 800; color: #191919; }
        .ck-method-sub { margin-top: 2px; font-size: 13px; color: #6b7280; }
        .ck-method-check {
          margin-left: auto; width: 26px; height: 26px; border-radius: 50%; background: #191919; color: #FEE500;
          display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        }
        .ck-note {
          display: flex; gap: 10px; margin-top: 12px; padding: 12px 14px; border-radius: 12px;
          background: #f8f9fc; border: 1px solid #eef0f4; font-size: 13.5px; line-height: 1.6; color: #4b5563;
        }
        .ck-note svg { flex-shrink: 0; margin-top: 2px; color: #6b7280; }
        .ck-note b { color: #111827; }

        .ck-total {
          display: flex; justify-content: space-between; align-items: baseline;
          margin: 30px 0 16px; padding-top: 22px; border-top: 2px solid #111827;
        }
        .ck-total-label { font-size: 16px; font-weight: 700; color: #374151; }
        .ck-total-amount { font-size: 34px; font-weight: 900; color: #111827; letter-spacing: -0.5px; }
        .ck-total-amount small { font-size: 18px; font-weight: 700; margin-left: 2px; }

        .ck-error {
          margin-bottom: 14px; padding: 12px 14px; border-radius: 12px; line-height: 1.6;
          background: #fef2f2; border: 1px solid #fecaca; color: #b91c1c; font-size: 13.5px; font-weight: 600;
        }
        .ck-error a { display: block; margin-top: 4px; color: #5E8F2A; font-weight: 700; }

        .ck-cta {
          width: 100%; height: 62px; border: none; border-radius: 16px; background: #FEE500; color: #191919;
          font-size: 18px; font-weight: 800; font-family: inherit; cursor: pointer;
          display: flex; align-items: center; justify-content: center; gap: 10px;
          box-shadow: 0 10px 24px rgba(234, 208, 0, .35); transition: filter .15s, transform .15s;
        }
        .ck-cta:hover:not(:disabled) { filter: brightness(.96); transform: translateY(-1px); }
        .ck-cta:disabled { opacity: .6; cursor: not-allowed; }
        .ck-foot { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-top: 14px; font-size: 12.5px; color: #9ca3af; }
        .ck-foot span { display: inline-flex; align-items: center; gap: 5px; }
        .ck-back { border: none; background: none; padding: 0; font-family: inherit; font-size: 13px; font-weight: 700; color: #6b7280; cursor: pointer; display: inline-flex; align-items: center; gap: 4px; }
        .ck-back:hover { color: #111827; }

        @media (max-width: 860px) {
          .ck { padding: 20px 16px 64px; }
          .ck-card { grid-template-columns: 1fr; border-radius: 20px; }
          .ck-poster { min-height: 440px; }
          .ck-poster img { inset: 20px 20px 120px; width: calc(100% - 40px); height: calc(100% - 140px); }
          .ck-pay { padding: 28px 22px; }
          .ck-total-amount { font-size: 28px; }
        }
      `}</style>

      <PageHeader
        title="결제하기"
        subtitle="행사 참가비를 결제해 주세요."
        breadcrumbTitle="결제하기"
      />

      <div className="ck">
        <div className="ck-card">
          {/* ─── 왼쪽: 행사 포스터 ─── */}
          <div className="ck-poster">
            <div className="ck-poster-bg" style={{ backgroundImage: `url("${eventImage}")` }} />
            <img
              src={eventImage}
              alt={`${eventName} 포스터`}
              onError={(e) => { e.target.onerror = null; e.target.src = DOG_FALLBACK; }}
            />
            <div className="ck-poster-info">
              <h2 className="ck-poster-name">{eventName}</h2>
              {(periodText || eventDetail?.location) && (
                <div className="ck-poster-meta">
                  {periodText && <span><CalendarDays size={14} />{periodText}</span>}
                  {eventDetail?.location && <span><MapPin size={14} />{eventDetail.location}</span>}
                </div>
              )}
            </div>
          </div>

          {/* ─── 오른쪽: 주문 정보 + 결제 ─── */}
          <div className="ck-pay">
            <h3 className="ck-sec-title">주문 정보</h3>
            <dl className="ck-order">
              <div><dt>행사명</dt><dd>{eventName}</dd></div>
              {periodText && <div><dt>기간</dt><dd>{periodText}</dd></div>}
              {eventDetail?.location && <div><dt>장소</dt><dd>{eventDetail.location}</dd></div>}
              <div><dt>참가비</dt><dd>{amount.toLocaleString()}원</dd></div>
            </dl>

            <h3 className="ck-sec-title">결제 수단</h3>
            <div className="ck-method">
              <span className="ck-kakao-mark"><KakaoPayMark size={26} /></span>
              <div>
                <div className="ck-method-name">카카오페이</div>
                <div className="ck-method-sub">카카오톡으로 간편하게 결제해요</div>
              </div>
              <span className="ck-method-check" aria-label="선택됨"><Check size={15} strokeWidth={3.2} /></span>
            </div>
            <div className="ck-note">
              <Info size={16} />
              <span>
                푸푸는 <b>카카오페이 결제만</b> 지원해요.
              </span>
            </div>

            <div className="ck-total">
              <span className="ck-total-label">총 결제금액</span>
              <span className="ck-total-amount">{amount.toLocaleString()}<small>원</small></span>
            </div>

            {error && (
              <div className="ck-error">
                {error}
                {error.includes("결제 내역") && <a href="/registration/paymenthistory">결제 내역 확인 &rarr;</a>}
              </div>
            )}

            <button type="button" className="ck-cta" onClick={handlePay} disabled={loading}>
              {loading ? "결제 준비 중…" : (
                <>
                  <KakaoPayMark size={22} />
                  {amount.toLocaleString()}원 카카오페이로 결제하기
                </>
              )}
            </button>

            <div className="ck-foot">
              <button type="button" className="ck-back" onClick={() => navigate(returnUrl)}>
                <ChevronLeft size={15} />이전으로
              </button>
              <span><Lock size={12} />카카오페이 결제창에서 안전하게 진행돼요</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
