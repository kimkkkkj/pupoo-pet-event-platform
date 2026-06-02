import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { axiosInstance } from "../../../../app/http/axiosInstance";
import {
  createImageFallbackHandler,
  resolveImageUrl,
} from "../../../../shared/utils/publicAssetUrl";

const BREED_KO = { DOG: "강아지", CAT: "고양이", OTHER: "기타" };
const WEIGHT_KO = { SMALL: "소형", MEDIUM: "중형", LARGE: "대형" };

export default function ContestApply() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const programId = searchParams.get("programId");

  const [step, setStep] = useState("LOADING");
  const [pets, setPets] = useState([]);
  const [selectedPetId, setSelectedPetId] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [myApply, setMyApply] = useState(null);
  const [programInfo, setProgramInfo] = useState(null);
  const [saving, setSaving] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [toast, setToast] = useState(null);

  const fileRef = useRef(null);
  const did401 = useRef(false);

  const showToast = (msg, type = "error") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const handle401 = () => {
    if (did401.current) return;
    did401.current = true;
    navigate("/auth/login", {
      state: { from: location.pathname + location.search },
    });
  };

  const unwrap = (res) => res?.data?.data ?? res?.data;
  const toList = (d) => {
    if (Array.isArray(d)) return d;
    if (Array.isArray(d?.content)) return d.content;
    return [];
  };

  useEffect(() => {
    if (!programId) {
      setStep("ERROR");
      return;
    }
    (async () => {
      try {
        const pRes = await axiosInstance.get("/api/programs/" + programId);
        setProgramInfo(unwrap(pRes));

        const aRes = await axiosInstance.get("/api/program-applies/my", {
          params: { size: 200 },
        });
        const list = toList(unwrap(aRes));
        const mine = list.find(
          (a) =>
            String(a.programId) === String(programId) &&
            a.status !== "CANCELLED",
        );
        if (mine) {
          setMyApply(mine);
          setStep("VIEW");
          return;
        }

        const petRes = await axiosInstance.get("/api/pets/me");
        setPets(toList(unwrap(petRes)));
        setStep("APPLY");
      } catch (e) {
        if (e?.response?.status === 401) {
          handle401();
          return;
        }
        showToast("정보를 불러오지 못했습니다.", "error");
        setStep("ERROR");
      }
    })();
  }, [programId]);

  const handleFile = (file) => {
    if (!file || !file.type.startsWith("image/")) {
      showToast("이미지 파일만 선택 가능합니다.", "error");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      showToast("10MB 이하만 업로드 가능합니다.", "error");
      return;
    }
    setImageFile(file);
    const r = new FileReader();
    r.onload = (e) => setImagePreview(e.target.result);
    r.readAsDataURL(file);
  };

  const onSubmit = async () => {
    if (!selectedPetId) {
      showToast("반려동물을 선택해주세요.", "error");
      return;
    }
    setSaving(true);
    try {
      let imageUrl = null;
      if (imageFile) {
        try {
          const form = new FormData();
          form.append("file", imageFile);
          const upRes = await axiosInstance.post("/api/files", form, {
            params: { targetType: "GALLERY", contentId: Number(programId) },
            headers: { "Content-Type": "multipart/form-data" },
          });
          imageUrl = unwrap(upRes)?.publicPath ?? null;
        } catch (upErr) {
          console.warn("이미지 업로드 실패, 신청 계속 진행", upErr);
        }
      }

      const res = await axiosInstance.post("/api/program-applies", {
        programId: Number(programId),
        petId: Number(selectedPetId),
        imageUrl,
      });
      setMyApply(unwrap(res));
      setStep("VIEW");
      showToast(
        "참가 신청 완료! 관리자 승인 후 투표 후보로 등록됩니다 🎉",
        "success",
      );
    } catch (e) {
      if (e?.response?.status === 401) {
        handle401();
        return;
      }
      showToast(e?.response?.data?.message || "신청에 실패했습니다.", "error");
    } finally {
      setSaving(false);
    }
  };

  const onCancel = async () => {
    const applyId = myApply?.programApplyId ?? myApply?.id;
    if (!applyId) return;
    setCancelling(true);
    try {
      await axiosInstance.patch("/api/program-applies/" + applyId + "/cancel");
      setMyApply(null);
      setPets([]);
      setStep("LOADING");
      // 다시 로드
      const petRes = await axiosInstance.get("/api/pets/me");
      setPets(toList(unwrap(petRes)));
      setStep("APPLY");
      showToast("신청이 취소됐습니다.", "success");
    } catch (e) {
      if (e?.response?.status === 401) {
        handle401();
        return;
      }
      showToast(e?.response?.data?.message || "취소에 실패했습니다.", "error");
    } finally {
      setCancelling(false);
    }
  };

  const STATUS_MAP = {
    APPLIED: {
      label: "검토 중 🔍",
      color: "#D97706",
      bg: "#FFFBEB",
      border: "#FDE68A",
    },
    APPROVED: {
      label: "승인됨 ✅",
      color: "#059669",
      bg: "#ECFDF5",
      border: "#A7F3D0",
    },
    REJECTED: {
      label: "반려됨 ✕",
      color: "#DC2626",
      bg: "#FEF2F2",
      border: "#FECACA",
    },
    WAITING: {
      label: "대기 중",
      color: "#6B7280",
      bg: "#F9FAFB",
      border: "#E5E7EB",
    },
  };
  const si = STATUS_MAP[myApply?.status] ?? STATUS_MAP.APPLIED;
  const contestName = programInfo?.programTitle ?? "콘테스트";

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#F8F9FC",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      <div
        style={{
          background: "linear-gradient(135deg,#6d28d9,#a855f7)",
          padding: "36px 24px 28px",
          color: "#fff",
        }}
      >
        <div style={{ maxWidth: 680, margin: "0 auto" }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "7px 14px",
              borderRadius: 10,
              background: "rgba(255,255,255,0.15)",
              border: "1px solid rgba(255,255,255,0.25)",
              color: "#fff",
              fontWeight: 600,
              fontSize: 13,
              cursor: "pointer",
              marginBottom: 18,
            }}
          >
            ← 뒤로
          </button>
          <div style={{ fontSize: 13, opacity: 0.75, marginBottom: 6 }}>
            🏆 콘테스트 참가 신청
          </div>
          <div style={{ fontSize: 26, fontWeight: 900 }}>{contestName}</div>
        </div>
      </div>

      <div
        style={{ maxWidth: 680, margin: "0 auto", padding: "28px 20px 80px" }}
      >
        {step === "LOADING" && (
          <div
            style={{ textAlign: "center", padding: "80px 0", color: "#9CA3AF" }}
          >
            <div style={{ fontSize: 40, marginBottom: 12 }}>⏳</div>
            <div style={{ fontWeight: 600 }}>불러오는 중...</div>
          </div>
        )}

        {step === "ERROR" && (
          <div style={{ textAlign: "center", padding: "80px 0" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
            <div
              style={{ color: "#DC2626", fontWeight: 700, marginBottom: 16 }}
            >
              페이지를 불러오지 못했습니다.
            </div>
            <button
              onClick={() => navigate(-1)}
              style={{
                padding: "10px 24px",
                borderRadius: 10,
                border: "1px solid #E5E7EB",
                cursor: "pointer",
                background: "#fff",
              }}
            >
              돌아가기
            </button>
          </div>
        )}

        {step === "VIEW" && myApply && (
          <div
            style={{
              background: "#fff",
              borderRadius: 20,
              border: "1px solid #E5E7EB",
              overflow: "hidden",
              boxShadow: "0 4px 20px rgba(0,0,0,0.06)",
            }}
          >
            <div style={{ padding: "24px 24px 0" }}>
              <div
                style={{
                  fontSize: 17,
                  fontWeight: 800,
                  color: "#111827",
                  marginBottom: 20,
                }}
              >
                📋 신청 현황
              </div>
            </div>
            <div
              style={{
                margin: "0 24px 20px",
                padding: "16px 18px",
                borderRadius: 14,
                background: si.bg,
                border: "1.5px solid " + si.border,
              }}
            >
              <div
                style={{
                  fontWeight: 800,
                  color: si.color,
                  fontSize: 16,
                  marginBottom: 4,
                }}
              >
                {si.label}
              </div>
              <div style={{ fontSize: 12, color: "#6B7280" }}>
                {myApply.status === "APPLIED" &&
                  "관리자 검토 후 승인되면 투표 후보로 등록됩니다."}
                {myApply.status === "APPROVED" &&
                  "홈페이지 콘테스트 투표에 후보로 등록됐어요! 🎉"}
                {myApply.status === "REJECTED" &&
                  "신청이 반려됐습니다. 문의는 Q&A를 이용해주세요."}
              </div>
            </div>
            <div
              style={{
                padding: "0 24px 24px",
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              {myApply.imageUrl && (
                <div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "#9CA3AF",
                      fontWeight: 600,
                      marginBottom: 8,
                    }}
                  >
                    등록 사진
                  </div>
                  <img
                    src={resolveImageUrl(myApply.imageUrl)}
                    alt="신청 사진"
                    onError={createImageFallbackHandler()}
                    style={{
                      width: 120,
                      height: 120,
                      objectFit: "cover",
                      borderRadius: 14,
                      border: "1.5px solid #E5E7EB",
                    }}
                    onError={(e) => {
                      e.target.style.display = "none";
                    }}
                  />
                </div>
              )}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 10,
                }}
              >
                <div
                  style={{
                    background: "#F9FAFB",
                    borderRadius: 10,
                    padding: "12px 14px",
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      color: "#9CA3AF",
                      fontWeight: 600,
                      marginBottom: 3,
                    }}
                  >
                    신청일
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>
                    {myApply.createdAt
                      ? new Date(myApply.createdAt).toLocaleDateString("ko-KR")
                      : "-"}
                  </div>
                </div>
                <div
                  style={{
                    background: "#F9FAFB",
                    borderRadius: 10,
                    padding: "12px 14px",
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      color: "#9CA3AF",
                      fontWeight: 600,
                      marginBottom: 3,
                    }}
                  >
                    신청 번호
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>
                    #{myApply.programApplyId ?? "-"}
                  </div>
                </div>
              </div>
              {myApply.status !== "REJECTED" && (
                <button
                  onClick={onCancel}
                  disabled={cancelling}
                  style={{
                    marginTop: 6,
                    padding: "13px 0",
                    borderRadius: 12,
                    border: "1.5px solid #FECACA",
                    background: "#FEF2F2",
                    color: "#DC2626",
                    fontWeight: 700,
                    fontSize: 14,
                    cursor: cancelling ? "not-allowed" : "pointer",
                  }}
                >
                  {cancelling ? "취소 중..." : "신청 취소"}
                </button>
              )}
            </div>
          </div>
        )}

        {step === "APPLY" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div
              style={{
                background: "#fff",
                borderRadius: 18,
                border: "1px solid #E5E7EB",
                padding: "22px",
                boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
              }}
            >
              <div
                style={{
                  fontSize: 15,
                  fontWeight: 800,
                  color: "#111827",
                  marginBottom: 4,
                }}
              >
                1. 반려동물 선택 <span style={{ color: "#EF4444" }}>*</span>
              </div>
              <div style={{ fontSize: 12, color: "#9CA3AF", marginBottom: 16 }}>
                마이페이지에 등록된 반려동물이 표시됩니다.
              </div>
              {pets.length === 0 ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: "28px 0",
                    background: "#F9FAFB",
                    borderRadius: 14,
                  }}
                >
                  <div style={{ fontSize: 36, marginBottom: 8 }}>🐾</div>
                  <div
                    style={{ fontSize: 13, color: "#6B7280", marginBottom: 14 }}
                  >
                    등록된 반려동물이 없습니다.
                  </div>
                  <button
                    onClick={() => navigate("/mypage/pets/new")}
                    style={{
                      padding: "9px 20px",
                      borderRadius: 10,
                      border: "none",
                      background: "#6d28d9",
                      color: "#fff",
                      fontWeight: 700,
                      fontSize: 13,
                      cursor: "pointer",
                    }}
                  >
                    반려동물 등록하기 →
                  </button>
                </div>
              ) : (
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 10 }}
                >
                  {pets.map((pet) => {
                    const pid = pet.petId ?? pet.id;
                    const isSelected = String(selectedPetId) === String(pid);
                    return (
                      <div
                        key={pid}
                        onClick={() => setSelectedPetId(pid)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 14,
                          padding: "14px 16px",
                          borderRadius: 14,
                          cursor: "pointer",
                          border: isSelected
                            ? "2.5px solid #6d28d9"
                            : "1.5px solid #E5E7EB",
                          background: isSelected ? "#FAF5FF" : "#fff",
                          transition: "all 0.18s",
                        }}
                      >
                        <div
                          style={{
                            width: 52,
                            height: 52,
                            borderRadius: 14,
                            background: isSelected ? "#EDE9FE" : "#F3F4F6",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 26,
                            flexShrink: 0,
                          }}
                        >
                          {pet.petBreed === "CAT" ? "🐱" : "🐶"}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div
                            style={{
                              fontWeight: 800,
                              fontSize: 15,
                              color: "#111827",
                            }}
                          >
                            {pet.petName}
                          </div>
                          <div
                            style={{
                              fontSize: 12,
                              color: "#9CA3AF",
                              marginTop: 2,
                            }}
                          >
                            {BREED_KO[pet.petBreed] ?? pet.petBreed}
                            {pet.petAge ? " · " + pet.petAge + "살" : ""}
                            {pet.petWeight
                              ? " · " +
                                (WEIGHT_KO[pet.petWeight] ?? pet.petWeight)
                              : ""}
                          </div>
                        </div>
                        {isSelected && (
                          <div
                            style={{
                              width: 24,
                              height: 24,
                              borderRadius: "50%",
                              background: "#6d28d9",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              color: "#fff",
                              fontSize: 13,
                              fontWeight: 800,
                              flexShrink: 0,
                            }}
                          >
                            ✓
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div
              style={{
                background: "#fff",
                borderRadius: 18,
                border: "1px solid #E5E7EB",
                padding: "22px",
                boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
              }}
            >
              <div
                style={{
                  fontSize: 15,
                  fontWeight: 800,
                  color: "#111827",
                  marginBottom: 4,
                }}
              >
                2. 대표 사진 업로드
              </div>
              <div style={{ fontSize: 12, color: "#9CA3AF", marginBottom: 16 }}>
                콘테스트에 표시될 사진 (선택, 최대 10MB)
              </div>
              <div
                onClick={() => fileRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  handleFile(e.dataTransfer.files[0]);
                }}
                style={{
                  border: "1.5px dashed #D1D5DB",
                  borderRadius: 14,
                  minHeight: 180,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  background: imagePreview
                    ? "url(" + imagePreview + ") center/cover no-repeat"
                    : "#F9FAFB",
                  overflow: "hidden",
                  position: "relative",
                }}
              >
                {!imagePreview ? (
                  <>
                    <div style={{ fontSize: 38, marginBottom: 10 }}>📷</div>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: "#374151",
                      }}
                    >
                      클릭하거나 드래그해서 업로드
                    </div>
                    <div
                      style={{ fontSize: 12, color: "#9CA3AF", marginTop: 4 }}
                    >
                      JPG · PNG · WEBP
                    </div>
                  </>
                ) : (
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      background: "rgba(0,0,0,0.35)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#fff",
                      fontSize: 14,
                      fontWeight: 700,
                    }}
                  >
                    📷 사진 변경
                  </div>
                )}
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => handleFile(e.target.files[0])}
              />
              {imagePreview && (
                <button
                  onClick={() => {
                    setImageFile(null);
                    setImagePreview(null);
                  }}
                  style={{
                    marginTop: 8,
                    fontSize: 12,
                    color: "#DC2626",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    fontWeight: 600,
                  }}
                >
                  × 사진 제거
                </button>
              )}
            </div>

            <div
              style={{
                background: "#E6F7F2",
                border: "1px solid #CCF0E4",
                borderRadius: 14,
                padding: "14px 16px",
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  color: "#7ab33e",
                  fontWeight: 700,
                  marginBottom: 6,
                }}
              >
                ℹ️ 참가 신청 안내
              </div>
              <ul
                style={{
                  margin: 0,
                  paddingLeft: 16,
                  fontSize: 12,
                  color: "#3DBFA0",
                  lineHeight: 2,
                }}
              >
                <li>신청 후 관리자 승인을 거쳐 투표 후보로 등록됩니다.</li>
                <li>1인 1콘테스트 1신청만 가능합니다.</li>
                <li>승인된 강아지만 홈페이지 투표에 표시됩니다.</li>
              </ul>
            </div>

            <button
              onClick={onSubmit}
              disabled={saving || !selectedPetId || pets.length === 0}
              style={{
                width: "100%",
                padding: "16px 0",
                borderRadius: 14,
                border: "none",
                background: selectedPetId
                  ? "linear-gradient(135deg,#6d28d9,#a855f7)"
                  : "#E5E7EB",
                color: selectedPetId ? "#fff" : "#9CA3AF",
                fontWeight: 800,
                fontSize: 16,
                cursor: selectedPetId && !saving ? "pointer" : "not-allowed",
                transition: "all 0.2s",
              }}
            >
              {saving ? "신청 중..." : "🐾 참가 신청하기"}
            </button>
          </div>
        )}
      </div>

      {toast && (
        <div
          style={{
            position: "fixed",
            top: 24,
            left: "50%",
            transform: "translateX(-50%)",
            padding: "13px 24px",
            borderRadius: 12,
            zIndex: 9999,
            background: toast.type === "success" ? "#111827" : "#B91C1C",
            color: "#fff",
            fontWeight: 700,
            fontSize: 14,
            boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
            whiteSpace: "nowrap",
          }}
        >
          {toast.msg}
        </div>
      )}
    </div>
  );
}
