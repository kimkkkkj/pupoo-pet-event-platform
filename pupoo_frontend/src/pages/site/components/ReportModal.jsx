import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Loader2, X } from "lucide-react";
import { reportApi } from "../../../app/http/reportApi";

const backdropStyle = {
  position: "fixed",
  inset: 0,
  zIndex: 6000,
  background: "rgba(15,23,42,0.52)",
  backdropFilter: "blur(4px)",
};

const overlayStyle = {
  position: "fixed",
  inset: 0,
  zIndex: 6001,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 20,
};

function resetForm(setReasonCode, setReasonDetail, setError) {
  setReasonCode("");
  setReasonDetail("");
  setError("");
}

export default function ReportModal({
  open,
  title = "신고하기",
  subtitle = "운영 정책에 따라 검토 후 처리됩니다.",
  onClose,
  onSubmit,
  onSuccess,
}) {
  const [reasons, setReasons] = useState([]);
  const [loadingReasons, setLoadingReasons] = useState(false);
  const [reasonCode, setReasonCode] = useState("");
  const [reasonDetail, setReasonDetail] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open || reasons.length > 0) return;

    let mounted = true;
    setLoadingReasons(true);
    reportApi
      .listReasons()
      .then((items) => {
        if (mounted) {
          setReasons(Array.isArray(items) ? items : []);
        }
      })
      .catch((err) => {
        console.error("[ReportModal] reason load failed:", err);
        if (mounted) {
          setError("신고 사유를 불러오지 못했습니다.");
        }
      })
      .finally(() => {
        if (mounted) {
          setLoadingReasons(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [open, reasons.length]);

  useEffect(() => {
    if (!open) {
      resetForm(setReasonCode, setReasonDetail, setError);
    }
  }, [open]);

  const otherSelected = reasonCode === "OTHER";
  const disabled = loadingReasons || submitting;
  const canSubmit = useMemo(() => {
    if (!reasonCode) return false;
    if (otherSelected && !String(reasonDetail || "").trim()) return false;
    return true;
  }, [otherSelected, reasonCode, reasonDetail]);

  const handleClose = () => {
    if (disabled) return;
    resetForm(setReasonCode, setReasonDetail, setError);
    onClose?.();
  };

  const handleSubmit = async () => {
    if (!canSubmit || disabled) return;

    setSubmitting(true);
    setError("");
    try {
      await onSubmit?.({
        reasonCode,
        reasonDetail: otherSelected ? reasonDetail : "",
      });
      onSuccess?.();
      handleClose();
    } catch (err) {
      console.error("[ReportModal] submit failed:", err);
      setError(err?.response?.data?.message || "신고 접수에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <>
      <div style={backdropStyle} onClick={handleClose} />
      <div style={overlayStyle}>
        <div
          onClick={(event) => event.stopPropagation()}
          style={{
            width: "min(520px, 100%)",
            background: "#fff",
            borderRadius: 22,
            border: "1px solid #dbe2ea",
            boxShadow: "0 28px 70px rgba(15,23,42,0.2)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "22px 24px 18px",
              borderBottom: "1px solid #e2e8f0",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: 12,
            }}
          >
            <div style={{ display: "grid", gap: 8 }}>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  color: "#b91c1c",
                  fontSize: 12,
                  fontWeight: 800,
                }}
              >
                <AlertTriangle size={14} />
                REPORT
              </div>
              <div style={{ fontSize: 22, fontWeight: 900, color: "#0f172a" }}>
                {title}
              </div>
              <div style={{ fontSize: 13, color: "#64748b", lineHeight: 1.7 }}>
                {subtitle}
              </div>
            </div>
            <button
              type="button"
              onClick={handleClose}
              disabled={disabled}
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                border: "1px solid #dbe2ea",
                background: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: disabled ? "not-allowed" : "pointer",
                opacity: disabled ? 0.6 : 1,
              }}
            >
              <X size={16} color="#64748b" />
            </button>
          </div>

          <div style={{ padding: 24, display: "grid", gap: 16 }}>
            {error ? (
              <div
                style={{
                  padding: "12px 14px",
                  borderRadius: 10,
                  background: "#fef2f2",
                  border: "1px solid #fecaca",
                  color: "#b91c1c",
                  fontSize: 13,
                  fontWeight: 700,
                }}
              >
                {error}
              </div>
            ) : null}

            <label style={{ display: "grid", gap: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#334155" }}>
                신고 사유
              </span>
              <select
                value={reasonCode}
                onChange={(event) => setReasonCode(event.target.value)}
                disabled={disabled}
                style={{
                  height: 46,
                  borderRadius: 10,
                  border: "1px solid #cbd5e1",
                  padding: "0 14px",
                  fontSize: 14,
                  color: "#0f172a",
                  background: "#fff",
                }}
              >
                <option value="">사유를 선택해 주세요</option>
                {reasons.map((item) => (
                  <option key={item.code} value={item.code}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>

            {otherSelected ? (
              <label style={{ display: "grid", gap: 8 }}>
                <span
                  style={{ fontSize: 13, fontWeight: 700, color: "#334155" }}
                >
                  상세 사유
                </span>
                <textarea
                  value={reasonDetail}
                  onChange={(event) => setReasonDetail(event.target.value)}
                  disabled={disabled}
                  rows={5}
                  placeholder="운영자가 확인할 수 있도록 구체적으로 입력해 주세요."
                  style={{
                    borderRadius: 12,
                    border: "1px solid #cbd5e1",
                    padding: 14,
                    fontSize: 14,
                    lineHeight: 1.7,
                    resize: "vertical",
                    fontFamily: "'Noto Sans KR', sans-serif",
                  }}
                />
              </label>
            ) : null}

            {loadingReasons ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  color: "#64748b",
                  fontSize: 13,
                }}
              >
                <Loader2 size={16} className="animate-spin" />
                신고 사유를 불러오는 중입니다.
              </div>
            ) : null}
          </div>

          <div
            style={{
              padding: "0 24px 24px",
              display: "flex",
              justifyContent: "flex-end",
              gap: 10,
            }}
          >
            <button
              type="button"
              onClick={handleClose}
              disabled={disabled}
              style={{
                height: 44,
                padding: "0 18px",
                borderRadius: 10,
                border: "1px solid #cbd5e1",
                background: "#fff",
                fontSize: 14,
                fontWeight: 700,
                color: "#475569",
                cursor: disabled ? "not-allowed" : "pointer",
                opacity: disabled ? 0.6 : 1,
              }}
            >
              취소
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canSubmit || disabled}
              style={{
                height: 44,
                padding: "0 18px",
                borderRadius: 10,
                border: "none",
                background: "#b91c1c",
                fontSize: 14,
                fontWeight: 800,
                color: "#fff",
                cursor: !canSubmit || disabled ? "not-allowed" : "pointer",
                opacity: !canSubmit || disabled ? 0.6 : 1,
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              {submitting ? <Loader2 size={16} className="animate-spin" /> : null}
              {submitting ? "접수 중..." : "신고 접수"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
