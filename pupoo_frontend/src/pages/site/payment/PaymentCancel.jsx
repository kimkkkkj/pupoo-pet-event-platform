import { useNavigate, useSearchParams } from "react-router-dom";

export default function PaymentCancel() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const paymentId = searchParams.get("paymentId");

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "32px 20px" }}>
      <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 12 }}>
        결제가 취소되었습니다
      </div>
      <div style={{ color: "#4b5563", lineHeight: 1.6, marginBottom: 18 }}>
        카카오페이 결제가 사용자 취소로 중단되었습니다.
        {paymentId ? ` 결제 번호 ${paymentId}는 승인되지 않았습니다.` : ""}
      </div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button
          onClick={() => navigate("/registration/paymenthistory")}
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
          결제 내역으로 이동
        </button>
        <button
          onClick={() => navigate(-1)}
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
          이전 화면으로
        </button>
      </div>
    </div>
  );
}
