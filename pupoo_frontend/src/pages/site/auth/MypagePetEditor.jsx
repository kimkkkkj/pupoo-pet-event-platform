import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { mypageApi } from "./api/mypageApi";
import { resolveErrorMessage, toFieldMessageMap } from "../../../features/shared/forms/formError";
import { ArrowLeft, Minus, Plus, Trash2 } from "lucide-react";
import PetAvatar from "../../../shared/components/pet/PetAvatar";

const BREED_OPTIONS = [
  { value: "DOG", label: "강아지" },
  { value: "CAT", label: "고양이" },
  { value: "OTHER", label: "기타" },
];

const WEIGHT_OPTIONS = [
  { value: "XS", label: "초소형", hint: "5kg 미만" },
  { value: "S", label: "소형", hint: "5~10kg" },
  { value: "M", label: "중형", hint: "10~20kg" },
  { value: "L", label: "대형", hint: "20~35kg" },
  { value: "XL", label: "초대형", hint: "35kg 이상" },
];

const styles = `
  .pe { --ink: #1c1917; --sub: #57534e; --mute: #a8a29e; --line: #e7e5e0; --soft: #f5f5f3; --accent: #5E8F2A; --accent-soft: #f1f6ea;
        background: #f7f7f5; min-height: 100vh; color: var(--ink); font-family: 'Pretendard Variable', 'Pretendard', 'Noto Sans KR', sans-serif; }
  .pe * { box-sizing: border-box; }
  .pe-wrap { width: min(640px, calc(100% - 32px)); margin: 0 auto; padding: calc(var(--pupoo-site-header-offset, 92px) + 32px) 0 96px; }
  .pe-back { display: inline-flex; align-items: center; gap: 6px; height: 40px; padding: 0 14px; margin-bottom: 18px; border-radius: 10px; border: 1px solid var(--line); background: #fff; font-family: inherit; font-size: 14.5px; font-weight: 700; color: var(--ink); cursor: pointer; }
  .pe-back:hover { border-color: var(--ink); }
  .pe-card { background: #fff; border: 1px solid var(--line); border-radius: 20px; overflow: hidden; }
  .pe-head { display: flex; align-items: center; gap: 18px; padding: 28px 30px; border-bottom: 1px solid var(--line); background: #fafaf8; }
  .pe-title { margin: 0; font-size: 26px; font-weight: 800; letter-spacing: -0.03em; }
  .pe-sub { margin: 4px 0 0; font-size: 15px; color: var(--sub); }
  .pe-body { padding: 28px 30px 30px; }
  .pe-error { margin-bottom: 18px; padding: 13px 16px; border-radius: 12px; border: 1px solid #efd9c7; background: #fdf6f0; color: #8a4a1c; font-size: 14.5px; font-weight: 600; }
  .pe-field { margin-bottom: 24px; }
  .pe-label { display: block; margin-bottom: 10px; font-size: 15px; font-weight: 800; color: var(--ink); }
  .pe-label small { margin-left: 6px; font-size: 13.5px; font-weight: 600; color: var(--mute); }
  .pe-input { width: 100%; height: 54px; padding: 0 16px; border-radius: 12px; border: 1.5px solid var(--line); background: #fff; font-family: inherit; font-size: 16px; color: var(--ink); outline: none; transition: border-color .15s, box-shadow .15s; }
  .pe-input:focus { border-color: var(--accent); box-shadow: 0 0 0 4px rgba(94, 143, 42, .12); }
  .pe-input::placeholder { color: var(--mute); }
  .pe-choices { display: grid; gap: 8px; }
  .pe-choice { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; min-height: 56px; padding: 8px 6px; border-radius: 12px; border: 1.5px solid var(--line); background: #fff; font-family: inherit; font-size: 15.5px; font-weight: 700; color: var(--sub); cursor: pointer; transition: border-color .15s, background .15s; }
  .pe-choice small { font-size: 12.5px; font-weight: 600; color: var(--mute); }
  .pe-choice:hover { border-color: #c9c5bd; }
  .pe-choice.on { border-color: var(--ink); background: var(--ink); color: #fff; }
  .pe-choice.on small { color: rgba(255,255,255,.7); }
  .pe-stepper { display: flex; align-items: center; gap: 10px; }
  .pe-step { width: 54px; height: 54px; border-radius: 12px; border: 1.5px solid var(--line); background: #fff; display: flex; align-items: center; justify-content: center; color: var(--ink); cursor: pointer; }
  .pe-step:hover { border-color: var(--ink); }
  .pe-step:disabled { opacity: .4; cursor: default; }
  .pe-age { position: relative; flex: 0 0 140px; }
  .pe-age .pe-input { text-align: center; padding-right: 40px; font-size: 20px; font-weight: 800; }
  .pe-age span { position: absolute; right: 16px; top: 50%; transform: translateY(-50%); font-size: 15px; font-weight: 700; color: var(--sub); }
  .pe-field-error { margin-top: 8px; font-size: 13.5px; font-weight: 600; color: #b91c1c; }
  .pe-actions { display: flex; flex-direction: column; gap: 10px; margin-top: 30px; }
  .pe-btn { height: 56px; border-radius: 14px; border: 1px solid var(--ink); background: var(--ink); color: #fff; font-family: inherit; font-size: 16.5px; font-weight: 800; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; gap: 8px; }
  .pe-btn:hover { background: #000; }
  .pe-btn:disabled { opacity: .5; cursor: default; }
  .pe-btn.ghost { background: #fff; color: var(--ink); border-color: var(--line); }
  .pe-btn.ghost:hover { border-color: var(--ink); }
  .pe-delete { align-self: center; margin-top: 8px; border: none; background: none; font-family: inherit; font-size: 14.5px; font-weight: 700; color: #b91c1c; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; padding: 6px 8px; border-radius: 8px; }
  .pe-delete:hover { background: #fdf2f2; }
  @media (max-width: 560px) {
    .pe-head, .pe-body { padding-left: 20px; padding-right: 20px; }
    .pe-title { font-size: 22px; }
    .pe-weights { grid-template-columns: repeat(3, 1fr) !important; }
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
  const [petImage, setPetImage] = useState("");
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
        setPetImage(target.imageUrl || "");
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

  const age = Number(form.petAge);
  const setAge = (next) => setForm((prev) => ({ ...prev, petAge: String(Math.max(0, Math.min(30, next))) }));
  const breedLabel = BREED_OPTIONS.find((b) => b.value === form.petBreed)?.label || "";
  const weightLabel = WEIGHT_OPTIONS.find((w) => w.value === form.petWeight)?.label || "";

  return (
    <div className="pe">
      <style>{styles}</style>
      <main className="pe-wrap">
        <button type="button" className="pe-back" onClick={() => navigate("/mypage")}>
          <ArrowLeft size={16} />마이페이지
        </button>

        <div className="pe-card">
          {/* 입력하는 대로 바뀌는 미리보기 */}
          <div className="pe-head">
            <PetAvatar src={petImage} name={form.petName} size={72} radius={20} background="#f1f6ea" iconColor="#5E8F2A" />
            <div style={{ minWidth: 0 }}>
              <h1 className="pe-title">{form.petName.trim() || (isEditMode ? "반려동물 수정" : "새 반려동물")}</h1>
              <p className="pe-sub">
                {[breedLabel, form.petAge !== "" ? `${form.petAge}살` : null, weightLabel].filter(Boolean).join(" · ") || "정보를 입력하면 여기에 보여드려요"}
              </p>
            </div>
          </div>

          <div className="pe-body">
            {globalError ? <div className="pe-error">{globalError}</div> : null}

            <form onSubmit={handleSubmit}>
              <div className="pe-field">
                <label htmlFor="petName" className="pe-label">이름</label>
                <input id="petName" name="petName" className="pe-input" value={form.petName} onChange={handleChange}
                  placeholder="예) 콩이" maxLength={100} disabled={disabled} autoComplete="off" />
                {fieldErrors.petName ? <div className="pe-field-error">{fieldErrors.petName}</div> : null}
              </div>

              <div className="pe-field">
                <span className="pe-label">종류</span>
                <div className="pe-choices" style={{ gridTemplateColumns: "repeat(3, 1fr)" }} role="radiogroup" aria-label="종류">
                  {BREED_OPTIONS.map((b) => (
                    <button key={b.value} type="button" role="radio" aria-checked={form.petBreed === b.value}
                      className={`pe-choice${form.petBreed === b.value ? " on" : ""}`} disabled={disabled}
                      onClick={() => setForm((prev) => ({ ...prev, petBreed: b.value }))}>
                      {b.label}
                    </button>
                  ))}
                </div>
                {fieldErrors.petBreed ? <div className="pe-field-error">{fieldErrors.petBreed}</div> : null}
              </div>

              <div className="pe-field">
                <label htmlFor="petAge" className="pe-label">나이<small>1살 미만이면 0</small></label>
                <div className="pe-stepper">
                  <button type="button" className="pe-step" aria-label="한 살 줄이기" disabled={disabled || !(age > 0)} onClick={() => setAge((Number.isFinite(age) ? age : 0) - 1)}><Minus size={18} /></button>
                  <div className="pe-age">
                    <input id="petAge" name="petAge" className="pe-input" type="number" inputMode="numeric" min={0} max={30}
                      value={form.petAge} onChange={handleChange} placeholder="0" disabled={disabled} />
                    <span>살</span>
                  </div>
                  <button type="button" className="pe-step" aria-label="한 살 늘리기" disabled={disabled || age >= 30} onClick={() => setAge((Number.isFinite(age) ? age : 0) + 1)}><Plus size={18} /></button>
                </div>
                {fieldErrors.petAge ? <div className="pe-field-error">{fieldErrors.petAge}</div> : null}
              </div>

              <div className="pe-field">
                <span className="pe-label">체형</span>
                <div className="pe-choices pe-weights" style={{ gridTemplateColumns: "repeat(5, 1fr)" }} role="radiogroup" aria-label="체형">
                  {WEIGHT_OPTIONS.map((w) => (
                    <button key={w.value} type="button" role="radio" aria-checked={form.petWeight === w.value}
                      className={`pe-choice${form.petWeight === w.value ? " on" : ""}`} disabled={disabled}
                      onClick={() => setForm((prev) => ({ ...prev, petWeight: w.value }))}>
                      {w.label}<small>{w.hint}</small>
                    </button>
                  ))}
                </div>
                {fieldErrors.petWeight ? <div className="pe-field-error">{fieldErrors.petWeight}</div> : null}
              </div>

              <div className="pe-actions">
                <button type="submit" disabled={disabled || !form.petName.trim() || form.petAge === ""} className="pe-btn">
                  {saving ? "저장 중…" : isEditMode ? "변경 내용 저장" : "등록하기"}
                </button>
                <button type="button" onClick={() => navigate("/mypage")} disabled={disabled} className="pe-btn ghost">취소</button>
                {isEditMode ? (
                  <button type="button" onClick={handleDelete} disabled={disabled} className="pe-delete">
                    <Trash2 size={15} />{deleting ? "삭제 중…" : "이 반려동물 삭제"}
                  </button>
                ) : null}
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
