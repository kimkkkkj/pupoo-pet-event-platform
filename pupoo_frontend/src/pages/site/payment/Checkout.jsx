import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { axiosInstance } from "../../../app/http/axiosInstance";
import { tokenStore } from "../../../app/http/tokenStore";
import { eventApi } from "../../../app/http/eventApi";
import { toPublicAssetUrl } from "../../../shared/utils/publicAssetUrl";
import PageHeader from "../components/PageHeader";
import {
  CreditCard,
  Landmark,
  Lock,
  MapPin,
  CalendarDays,
  Check,
  ShieldCheck,
} from "lucide-react";


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
  const [method, setMethod] = useState("KAKAOPAY");
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
    if (method !== "KAKAOPAY") {
      setError("현재는 카카오페이만 지원합니다.");
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

  return (
    <div style={{ fontFamily: "'Noto Sans KR', sans-serif" }}>
      <style>{`
        .ck *{box-sizing:border-box}
        .ck-method{transition:all .15s ease}
        .ck-method:hover:not(:disabled){border-color:#ccc}
        .ck-method.active{border-color:#FEE500!important;background:#fffef5}
        .ck-pay{transition:opacity .15s,transform .08s}
        .ck-pay:active:not(:disabled){transform:scale(.99)}
        @media(max-width:800px){
          .ck-card{flex-direction:column!important}
          .ck-left{min-height:240px!important}
        }
      `}</style>

      <PageHeader
        title="결제하기"
        subtitle="행사 참가비를 결제해 주세요."
        breadcrumbTitle="결제하기"
      />

      {/* Center card */}
      <div style={{
        maxWidth: 1100, margin: "0 auto",
        padding: "40px 24px 80px",
      }}>
        {/* Single card — left image, right payment */}
        <div
          className="ck-card"
          style={{
            display: "flex",
            background: "#fff",
            borderRadius: 20,
            overflow: "hidden",
            boxShadow: "0 0 0 1px rgba(0,0,0,.06), 0 6px 30px rgba(0,0,0,.05)",
          }}
        >
          {/* ─── LEFT: full-height image + overlay info ─── */}
          <div
            className="ck-left"
            style={{
              flex: "0 0 52%",
              position: "relative",
              minHeight: 580,
              background: "#e5e7eb",
              overflow: "hidden",
            }}
          >
            <img
              src={eventImage}
              alt={title}
              onError={(e) => { e.target.onerror = null; e.target.src = DOG_FALLBACK; }}
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
            />
            {/* gradient overlay at bottom */}
            <div
              style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                padding: "80px 28px 28px",
                background: "linear-gradient(transparent, rgba(0,0,0,.65))",
                color: "#fff",
              }}
            >
              <h2 style={{ fontSize: 24, fontWeight: 800, margin: 0, lineHeight: 1.4, letterSpacing: -0.3 }}>
                {title}
              </h2>
              {eventDetail?.description && (
                <p style={{
                  fontSize: 13, margin: "8px 0 0", lineHeight: 1.6,
                  color: "rgba(255,255,255,.78)",
                  display: "-webkit-box", WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical", overflow: "hidden",
                }}>
                  {eventDetail.description}
                </p>
              )}
              {(eventDetail?.startAt || eventDetail?.location) && (
                <div style={{ marginTop: 14, display: "flex", flexWrap: "wrap", gap: "6px 16px", fontSize: 12, color: "rgba(255,255,255,.6)" }}>
                  {eventDetail.startAt && (
                    <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <CalendarDays size={12} />
                      {fmtDate(eventDetail.startAt)}{eventDetail.endAt ? ` ~ ${fmtDate(eventDetail.endAt)}` : ""}
                    </span>
                  )}
                  {eventDetail.location && (
                    <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <MapPin size={12} />
                      {eventDetail.location}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ─── RIGHT: Payment ─── */}
          <div style={{ flex: 1, padding: "44px 44px 40px", display: "flex", flexDirection: "column" }}>
            {/* Payment method label */}
            <div style={{ fontSize: 12, fontWeight: 700, color: "#aaa", letterSpacing: 1, textTransform: "uppercase", marginBottom: 22 }}>
              Payment Method
            </div>

            {/* Kakao Pay */}
            <button
              type="button"
              className={`ck-method${method === "KAKAOPAY" ? " active" : ""}`}
              onClick={() => setMethod("KAKAOPAY")}
              style={{
                display: "flex", alignItems: "center", gap: 14,
                width: "100%", padding: "15px 18px",
                borderRadius: 12,
                border: method === "KAKAOPAY" ? "1.5px solid #FEE500" : "1.5px solid #eee",
                background: method === "KAKAOPAY" ? "#fffef5" : "#fff",
                cursor: "pointer", marginBottom: 10,
              }}
            >
              <div style={{
                width: 40, height: 40, borderRadius: 10,
                background: "#FEE500",
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <path d="M12 4C7.03 4 3 7.13 3 11c0 2.45 1.62 4.6 4.06 5.85l-1.03 3.76c-.09.32.27.57.54.38l4.37-2.93c.35.03.7.04 1.06.04 4.97 0 9-3.13 9-7s-4.03-7-9-7z" fill="#3C1E1E"/>
                </svg>
              </div>
              <div style={{ flex: 1, textAlign: "left" }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#222" }}>카카오페이</div>
                <div style={{ fontSize: 11.5, color: "#aaa", marginTop: 1 }}>간편결제</div>
              </div>
              <div style={{
                width: 20, height: 20, borderRadius: "50%",
                background: method === "KAKAOPAY" ? "#FEE500" : "transparent",
                border: method === "KAKAOPAY" ? "none" : "1.5px solid #d4d4d4",
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              }}>
                {method === "KAKAOPAY" && <Check size={12} strokeWidth={3} style={{ color: "#3C1E1E" }} />}
              </div>
            </button>

            {/* Card — disabled */}
            <button
              type="button" disabled
              className="ck-method"
              style={{
                display: "flex", alignItems: "center", gap: 14,
                width: "100%", padding: "15px 18px",
                borderRadius: 12, border: "1.5px solid #f5f5f5",
                background: "#fafafa", cursor: "not-allowed", marginBottom: 10,
              }}
            >
              <div style={{
                width: 40, height: 40, borderRadius: 10, background: "#f0f0f0",
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              }}>
                <CreditCard size={20} style={{ color: "#ccc" }} />
              </div>
              <div style={{ flex: 1, textAlign: "left" }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#c4c4c4" }}>신용/체크카드</div>
                <div style={{ fontSize: 11.5, color: "#ddd", marginTop: 1 }}>준비중</div>
              </div>
              <Lock size={14} style={{ color: "#ddd", flexShrink: 0 }} />
            </button>

            {/* Bank — disabled */}
            <button
              type="button" disabled
              className="ck-method"
              style={{
                display: "flex", alignItems: "center", gap: 14,
                width: "100%", padding: "15px 18px",
                borderRadius: 12, border: "1.5px solid #f5f5f5",
                background: "#fafafa", cursor: "not-allowed", marginBottom: 0,
              }}
            >
              <div style={{
                width: 40, height: 40, borderRadius: 10, background: "#f0f0f0",
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              }}>
                <Landmark size={20} style={{ color: "#ccc" }} />
              </div>
              <div style={{ flex: 1, textAlign: "left" }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#c4c4c4" }}>계좌이체</div>
                <div style={{ fontSize: 11.5, color: "#ddd", marginTop: 1 }}>준비중</div>
              </div>
              <Lock size={14} style={{ color: "#ddd", flexShrink: 0 }} />
            </button>

            {/* Spacer pushes total + button to bottom */}
            <div style={{ flex: 1, minHeight: 32 }} />

            {/* Divider */}
            <div style={{ borderTop: "1px solid #f0f0f0", margin: "0 0 20px" }} />

            {/* Total */}
            <div style={{
              display: "flex", justifyContent: "space-between", alignItems: "baseline",
              marginBottom: 20,
            }}>
              <span style={{ fontSize: 16, fontWeight: 600, color: "#888" }}>총 결제금액</span>
              <span style={{ fontSize: 32, fontWeight: 900, color: "#111", letterSpacing: -0.5 }}>
                {amount.toLocaleString()}
                <span style={{ fontSize: 17, fontWeight: 600, marginLeft: 2 }}>원</span>
              </span>
            </div>

            {/* Error */}
            {error && (
              <div style={{
                background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10,
                padding: "10px 14px", fontSize: 13, color: "#b91c1c", fontWeight: 500,
                marginBottom: 14, lineHeight: 1.6,
              }}>
                {error}
                {error.includes("결제 내역") && (
                  <a href="/registration/paymenthistory"
                    style={{ display: "block", color: "#7ab33e", fontWeight: 600, fontSize: 13, marginTop: 4 }}>
                    결제 내역 확인 &rarr;
                  </a>
                )}
              </div>
            )}

            {/* CTA */}
            <button
              type="button"
              className="ck-pay"
              onClick={handlePay}
              disabled={loading}
              style={{
                width: "100%", height: 60, borderRadius: 16,
                border: "none",
                background: method === "KAKAOPAY" ? "#FEE500" : "#111",
                color: method === "KAKAOPAY" ? "#3C1E1E" : "#fff",
                fontSize: 17, fontWeight: 800,
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.6 : 1,
                fontFamily: "inherit",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                transition: "all 0.15s",
                boxShadow: method === "KAKAOPAY"
                  ? "0 4px 16px rgba(254,229,0,0.3)"
                  : "0 4px 16px rgba(0,0,0,0.12)",
              }}
              onMouseEnter={(e) => { if (!loading) e.currentTarget.style.transform = "translateY(-1px)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; }}
            >
              {loading ? "결제 준비 중..." : method === "KAKAOPAY" ? (
                <>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M12 4C7.03 4 3 7.13 3 11c0 2.45 1.62 4.6 4.06 5.85l-1.03 3.76c-.09.32.27.57.54.38l4.37-2.93c.35.03.7.04 1.06.04 4.97 0 9-3.13 9-7s-4.03-7-9-7z" fill="#3C1E1E"/>
                  </svg>
                  카카오페이로 결제하기
                </>
              ) : (
                <>
                  <ShieldCheck size={19} />
                  결제하기
                </>
              )}
            </button>

            <p style={{ textAlign: "center", margin: "14px 0 0", fontSize: 12, color: "#bbb", display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
              <Lock size={11} /> 안전한 결제 환경이 보장됩니다
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
