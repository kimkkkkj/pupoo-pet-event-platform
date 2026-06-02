import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { mypageApi } from "./api/mypageApi";
import { resolveErrorMessage, toFieldMessageMap } from "../../../features/shared/forms/formError";
import { PawPrint, ArrowLeft, Trash2 } from "lucide-react";

const BREED_OPTIONS = [
  { value: "DOG", label: "강아지" },
  { value: "CAT", label: "고양이" },
  { value: "OTHER", label: "기타" },
];

const WEIGHT_OPTIONS = [
  { value: "XS", label: "초소형" },
  { value: "S", label: "소형" },
  { value: "M", label: "중형" },
  { value: "L", label: "대형" },
  { value: "XL", label: "초대형" },
];

const styles = `
  @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.min.css');

  .pe-root {
    box-sizing: border-box;
    font-family: "Pretendard Variable", "Pretendard", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    background: #f8f9fc;
    min-height: 100vh;
    color: #1a1a1a;
  }
  .pe-root *, .pe-root *::before, .pe-root *::after {
    box-sizing: border-box;
    font-family: inherit;
  }
  .pe-container {
    width: min(600px, calc(100% - 40px));
    margin: 0 auto;
    padding: 100px 0 64px;
  }
  .pe-back {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    border: none;
    background: none;
    color: #999;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    padding: 0;
    margin-bottom: 16px;
    transition: color 0.12s;
  }
  .pe-back:hover { color: #5b9bf7; }
  .pe-card {
    background: #fff;
    border: none;
    border-radius: 16px;
    box-shadow: 0 1px 8px rgba(0,0,0,.04);
    overflow: hidden;
  }
  .pe-header {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 24px 28px;
    border-bottom: 1px solid #f0f0f0;
  }
  .pe-header-icon {
    width: 40px;
    height: 40px;
    border-radius: 12px;
    background: #eef4ff;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .pe-header-text h2 {
    margin: 0;
    font-size: 18px;
    font-weight: 800;
    color: #1a1a1a;
  }
  .pe-header-text p {
    margin: 3px 0 0;
    font-size: 12px;
    color: #bbb;
  }
  .pe-body {
    padding: 28px;
  }
  .pe-error {
    padding: 10px 14px;
    background: #fef2f2;
    border: 1px solid #fecaca;
    border-radius: 10px;
    color: #b91c1c;
    font-size: 13px;
    font-weight: 600;
    margin-bottom: 20px;
  }
  .pe-field {
    margin-bottom: 18px;
  }
  .pe-label {
    display: block;
    margin-bottom: 6px;
    font-size: 12px;
    font-weight: 700;
    color: #64748b;
  }
  .pe-input {
    width: 100%;
    height: 44px;
    border: 1px solid #e5e7eb;
    border-radius: 10px;
    padding: 0 14px;
    font-size: 14px;
    color: #1a1a1a;
    background: #fff;
    transition: border-color 0.15s, box-shadow 0.15s;
    font-family: inherit;
  }
  .pe-input:focus {
    outline: none;
    border-color: #5b9bf7;
    box-shadow: 0 0 0 3px rgba(91,155,247,0.1);
  }
  .pe-input:disabled {
    background: #f9fafb;
    color: #aaa;
  }
  .pe-field-error {
    margin-top: 6px;
    font-size: 12px;
    color: #dc2626;
    font-weight: 500;
  }
  .pe-actions {
    display: flex;
    gap: 8px;
    padding-top: 8px;
  }
  .pe-btn {
    height: 42px;
    padding: 0 20px;
    border-radius: 10px;
    font-size: 14px;
    font-weight: 700;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    transition: background 0.15s, transform 0.1s;
    font-family: inherit;
    white-space: nowrap;
  }
  .pe-btn:active { transform: scale(0.97); }
  .pe-btn.primary {
    flex: 1;
    border: none;
    background: #5b9bf7;
    color: #fff;
  }
  .pe-btn.primary:hover { background: #4a8de6; }
  .pe-btn.primary:disabled { background: #c5d8f7; cursor: not-allowed; transform: none; }
  .pe-btn.danger {
    border: 1px solid #fecaca;
    background: #fff;
    color: #dc2626;
  }
  .pe-btn.danger:hover { background: #fef2f2; }
  .pe-btn.danger:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
  .pe-btn.ghost {
    border: 1px solid #e5e7eb;
    background: #fff;
    color: #666;
  }
  .pe-btn.ghost:hover { background: #f5f6f8; }

  @media (max-width: 640px) {
    .pe-container { padding: 80px 0 48px; }
    .pe-header { padding: 20px 20px; }
    .pe-body { padding: 20px; }
    .pe-actions { flex-wrap: wrap; }
    .pe-btn.primary { flex: 1 0 100%; }
  }
`;

export default function MypagePetEditor() {
  const navigate = useNavigate();
  const { petId } = useParams();
  const isEditMode = useMemo(() => Boolean(petId), [petId]);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [globalError, setGlobalError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [form, setForm] = useState({
    petName: "",
    petBreed: "DOG",
    petAge: "",
    petWeight: "M",
  });

  useEffect(() => {
    if (!isEditMode) return undefined;

    let mounted = true;
    const run = async () => {
      try {
        setLoading(true);
        setGlobalError("");
        const pets = await mypageApi.getMyPets();
        const target = (pets || []).find((pet) => String(pet.petId) === String(petId));
        if (!target) {
          throw new Error("반려동물 정보를 찾을 수 없습니다.");
        }
        if (!mounted) return;
        setForm({
          petName: target.petName || "",
          petBreed: String(target.petBreed || "DOG").toUpperCase(),
          petAge: String(target.petAge ?? ""),
          petWeight: String(target.petWeight || "M").toUpperCase(),
        });
      } catch (error) {
        if (!mounted) return;
        setGlobalError(resolveErrorMessage(error, "반려동물 정보를 불러오지 못했습니다."));
      } finally {
        if (mounted) setLoading(false);
      }
    };

    run();
    return () => {
      mounted = false;
    };
  }, [isEditMode, petId]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      setSaving(true);
      setGlobalError("");
      setFieldErrors({});

      const payload = {
        petName: (form.petName || "").trim(),
        petBreed: String(form.petBreed || "DOG").toUpperCase(),
        petAge: Number(form.petAge),
        petWeight: String(form.petWeight || "M").toUpperCase(),
      };

      if (isEditMode) {
        await mypageApi.updatePet(Number(petId), {
          petName: payload.petName,
          petBreed: payload.petBreed,
          petAge: payload.petAge,
          petWeight: payload.petWeight,
        });
      } else {
        await mypageApi.createPet(payload);
      }
      navigate("/mypage");
    } catch (error) {
      setFieldErrors(toFieldMessageMap(error));
      setGlobalError(resolveErrorMessage(error, "반려동물 저장에 실패했습니다."));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!isEditMode) return;
    const shouldDelete = window.confirm("반려동물을 삭제하시겠습니까?");
    if (!shouldDelete) return;

    try {
      setDeleting(true);
      setGlobalError("");
      await mypageApi.deletePet(Number(petId));
      navigate("/mypage");
    } catch (error) {
      setGlobalError(resolveErrorMessage(error, "반려동물 삭제에 실패했습니다."));
    } finally {
      setDeleting(false);
    }
  };

  const disabled = loading || saving || deleting;

  return (
    <div className="pe-root">
      <style>{styles}</style>

      <main className="pe-container">
        <button type="button" className="pe-back" onClick={() => navigate("/mypage")}>
          <ArrowLeft size={14} /> 마이페이지로 돌아가기
        </button>

        <div className="pe-card">
          <div className="pe-header">
            <div className="pe-header-icon">
              <PawPrint size={20} color="#5b9bf7" />
            </div>
            <div className="pe-header-text">
              <h2>{isEditMode ? "반려동물 수정" : "반려동물 등록"}</h2>
              <p>{isEditMode ? "반려동물 정보를 수정합니다" : "새로운 반려동물을 등록합니다"}</p>
            </div>
          </div>

          <div className="pe-body">
            {globalError ? (
              <div className="pe-error">{globalError}</div>
            ) : null}

            <form onSubmit={handleSubmit}>
              <div className="pe-field">
                <label htmlFor="petName" className="pe-label">이름</label>
                <input
                  id="petName"
                  name="petName"
                  className="pe-input"
                  value={form.petName}
                  onChange={handleChange}
                  placeholder="반려동물 이름을 입력하세요"
                  maxLength={100}
                  disabled={disabled}
                />
                {fieldErrors.petName ? (
                  <div className="pe-field-error">{fieldErrors.petName}</div>
                ) : null}
              </div>

              <div className="pe-field">
                <label htmlFor="petBreed" className="pe-label">종류</label>
                <select
                  id="petBreed"
                  name="petBreed"
                  className="pe-input"
                  value={form.petBreed}
                  onChange={handleChange}
                  disabled={disabled}
                >
                  {BREED_OPTIONS.map((breed) => (
                    <option key={breed.value} value={breed.value}>
                      {breed.label}
                    </option>
                  ))}
                </select>
                {fieldErrors.petBreed ? (
                  <div className="pe-field-error">{fieldErrors.petBreed}</div>
                ) : null}
              </div>

              <div className="pe-field">
                <label htmlFor="petAge" className="pe-label">나이</label>
                <input
                  id="petAge"
                  name="petAge"
                  className="pe-input"
                  type="number"
                  min={0}
                  max={100}
                  value={form.petAge}
                  onChange={handleChange}
                  placeholder="나이를 입력하세요"
                  disabled={disabled}
                />
                {fieldErrors.petAge ? (
                  <div className="pe-field-error">{fieldErrors.petAge}</div>
                ) : null}
              </div>

              <div className="pe-field">
                <label htmlFor="petWeight" className="pe-label">체형</label>
                <select
                  id="petWeight"
                  name="petWeight"
                  className="pe-input"
                  value={form.petWeight}
                  onChange={handleChange}
                  disabled={disabled}
                >
                  {WEIGHT_OPTIONS.map((weight) => (
                    <option key={weight.value} value={weight.value}>
                      {weight.label}
                    </option>
                  ))}
                </select>
                {fieldErrors.petWeight ? (
                  <div className="pe-field-error">{fieldErrors.petWeight}</div>
                ) : null}
              </div>

              <div className="pe-actions">
                <button type="submit" disabled={disabled} className="pe-btn primary">
                  {saving ? "저장 중..." : isEditMode ? "수정 완료" : "등록하기"}
                </button>
                {isEditMode ? (
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={disabled}
                    className="pe-btn danger"
                  >
                    <Trash2 size={14} /> 삭제
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => navigate("/mypage")}
                  disabled={disabled}
                  className="pe-btn ghost"
                >
                  취소
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
