import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Trophy,
  Users,
  Clock3,
  ArrowLeft,
  Heart,
  List,
} from "lucide-react";
import PageHeader from "../components/PageHeader";
import { programApi } from "../../../app/http/programApi";
import { petApi } from "../../../app/http/petApi";
import { tokenStore } from "../../../app/http/tokenStore";
import { axiosInstance } from "../../../app/http/axiosInstance";
import { authApi } from "../auth/api/authApi";
import {
  createImageFallbackHandler,
  resolveImageUrl,
  toPublicAssetUrl,
} from "../../../shared/utils/publicAssetUrl";

const styles = `
  @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.min.css');

  .cd-root { box-sizing: border-box; font-family: 'Pretendard Variable', 'Pretendard', -apple-system, sans-serif; background: #f8f9fc; min-height: 100vh; flex: 1; }
  .cd-root *, .cd-root *::before, .cd-root *::after { box-sizing: border-box; font-family: inherit; }
  .cd-container { max-width: 1400px; margin: 0 auto; padding: 20px 0 64px; }

  .cd-bottom-btns {
    display: flex; align-items: center; justify-content: center; gap: 12px;
    padding-top: 32px; margin-top: 32px; border-top: 1px solid #e5e7eb;
  }
  .cd-btn {
    display: inline-flex; align-items: center; gap: 8px;
    border: 1px solid #d1d5db; background: #fff;
    padding: 12px 28px; border-radius: 8px;
    font-size: 15px; font-weight: 700; color: #374151;
    cursor: pointer; transition: all 0.15s; font-family: inherit;
  }
  .cd-btn:hover { background: #f8f9fc; border-color: #9ca3af; }
  .cd-btn-dark {
    background: #111827; color: #fff; border-color: #111827;
  }
  .cd-btn-dark:hover { opacity: 0.85; background: #111827; border-color: #111827; }

  /* ── 히어로 ── */
  .cd-hero {
    border: 1px solid #e2e8f0; border-radius: 20px;
    padding: 40px 44px; margin-bottom: 20px;
    background: linear-gradient(135deg, #fff 0%, #fafbff 100%);
    position: relative; overflow: hidden;
    box-shadow: 0 2px 12px rgba(0,0,0,0.04);
  }
  .cd-hero::before {
    content: ""; position: absolute; top: 0; left: 0; right: 0; height: 4px;
    background: linear-gradient(90deg, #90C450, #6B7A3D, #90C450);
    background-size: 200% 100%;
    animation: cd-hero-bar 3s ease infinite;
  }
  @keyframes cd-hero-bar {
    0%, 100% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
  }
  .cd-hero-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 24px; }
  .cd-hero-main { min-width: 0; flex: 1 1 auto; }
  .cd-title { margin: 0; font-size: 32px; line-height: 1.15; letter-spacing: -0.03em; font-weight: 900; color: #111827; }
  .cd-sub { margin-top: 12px; display: flex; flex-wrap: wrap; gap: 16px; font-size: 15px; color: #9ca3af; }
  .cd-sub span { display: inline-flex; align-items: center; gap: 5px; white-space: nowrap; }
  .cd-hero-divider { margin: 16px 0; border: none; border-top: 1px solid #f0f0f0; }
  .cd-hero-summary { display: flex; align-items: center; gap: 10px; font-size: 15px; color: #9ca3af; font-weight: 500; }
  .cd-hero-summary strong { font-weight: 800; color: #111827; font-size: 16px; }
  .cd-hero-dot {
    width: 10px; height: 10px; border-radius: 50%;
    background: #90C450; box-shadow: 0 0 6px rgba(68,78,40,0.4);
    animation: cd-pulse 1.6s ease-in-out infinite; flex-shrink: 0;
  }
  @keyframes cd-pulse { 0%,100% { opacity: 1; transform: scale(1); } 50% { opacity: .5; transform: scale(.75); } }

  .cd-hero-kpi-grid {
    display: grid; grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 10px; width: min(540px, 100%); margin-left: auto; flex-shrink: 0;
  }
  .cd-hero-kpi {
    border: 1px solid #ebebeb; border-radius: 16px;
    background: #fff; padding: 24px 26px;
  }
  .cd-hero-kpi-label { font-size: 14px; color: #6b7280; font-weight: 700; margin-bottom: 12px; }
  .cd-hero-kpi-value { font-size: 38px; line-height: 1; font-weight: 900; color: #111827; letter-spacing: -0.02em; }
  .cd-hero-kpi-unit { font-size: 18px; color: #9ca3af; font-weight: 700; margin-left: 4px; }

  .cd-hero-footer {
    display: flex; align-items: center; justify-content: flex-end;
    margin-top: 20px; padding-top: 14px; border-top: 1px solid #f0f0f0;
  }
  .cd-top-btn {
    height: 48px; padding: 0 24px; border-radius: 12px; font-size: 15px; font-weight: 700; cursor: pointer;
    display: inline-flex; align-items: center; gap: 8px; font-family: inherit; transition: all 0.15s;
  }
  .cd-top-btn.primary {
    border: none; background: #111827; color: #fff;
    box-shadow: 0 2px 12px rgba(0,0,0,0.12);
  }
  .cd-top-btn.primary:hover { background: #1f2937; }
  .cd-top-btn.primary:disabled { background: #e5e7eb; color: #9ca3af; box-shadow: none; cursor: not-allowed; }
  .cd-top-btn.outline {
    border: 1px solid #e2e5ea; background: #fff; color: #374151;
  }
  .cd-top-btn.outline:hover { background: #f9fafb; border-color: #d1d5db; }

  /* ── 카드 ── */
  .cd-grid { display: grid; grid-template-columns: 1.2fr 1fr; gap: 16px; }
  .cd-card {
    background: #fff; border: 1px solid #e2e8f0; border-radius: 16px;
    padding: 28px 32px;
    box-shadow: 0 1px 4px rgba(0,0,0,0.03);
  }
  .cd-card-head {
    display: flex; align-items: center; justify-content: space-between;
    margin-bottom: 20px; padding-bottom: 16px; border-bottom: 1px solid #f0f0f0;
  }
  .cd-card-title { margin: 0; font-size: 18px; font-weight: 800; color: #111827; display: flex; align-items: center; gap: 8px; }
  .cd-tag { font-size: 13px; font-weight: 600; color: #9ca3af; }

  /* ── 참가견 카드 ── */
  .cd-candidate-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
  .cd-candidate-card {
    border: 1px solid #eef0f4; border-radius: 14px; overflow: hidden; background: #fff;
    transition: all 0.2s ease;
  }
  .cd-candidate-card:hover { border-color: #d1d5db; box-shadow: 0 4px 16px rgba(0,0,0,0.06); transform: translateY(-2px); }
  .cd-candidate-thumb { width: 100%; aspect-ratio: 1 / 1; background: #f8f9fb; display: flex; align-items: center; justify-content: center; overflow: hidden; }
  .cd-candidate-thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .cd-candidate-body { padding: 16px 18px 18px; }
  .cd-candidate-name { font-size: 16px; font-weight: 800; color: #111827; }
  .cd-candidate-owner { margin-top: 4px; font-size: 13px; color: #9ca3af; }
  .cd-candidate-votes { margin-top: 10px; font-size: 14px; font-weight: 800; color: #90C450; }
  .cd-candidate-actions { margin-top: 14px; }
  .cd-vote-btn {
    width: 100%; height: 44px; border-radius: 12px; border: none;
    background: #111827; color: #fff; font-size: 14px; font-weight: 700; cursor: pointer;
    transition: all 0.15s; font-family: inherit;
  }
  .cd-vote-btn:hover:not(:disabled) { background: #1f2937; }
  .cd-vote-btn:disabled { background: #f8f9fc; color: #9ca3af; cursor: not-allowed; }
  .cd-vote-btn.done { background: #f0f2e8; color: #90C450; border: 1px solid #c5cca8; }

  /* ── 투표 순위 ── */
  .cd-list { display: flex; flex-direction: column; gap: 12px; }
  .cd-item {
    border: 1px solid #eef0f4; border-radius: 14px; padding: 20px 22px; background: #fff;
    transition: all 0.15s;
  }
  .cd-item:hover { border-color: #e2e5ea; background: #f9fafb; }
  .cd-item-top { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; margin-bottom: 12px; }
  .cd-rank { font-size: 13px; font-weight: 700; color: #9ca3af; margin-right: 6px; }
  .cd-rank.top { color: #90C450; }
  .cd-name { font-size: 17px; font-weight: 800; color: #111827; }
  .cd-votes { font-size: 20px; font-weight: 900; color: #ff4d8d; letter-spacing: -0.02em; }
  .cd-progress { height: 22px; border-radius: 99px; background: #f5e6ea; overflow: visible; position: relative; }
  .cd-progress-fill {
    height: 100%; border-radius: 99px;
    background: linear-gradient(90deg, #ffb6c1 0%, #ff7eb3 40%, #ff4d8d 100%);
    transition: width 0.6s cubic-bezier(.4,0,.2,1);
    position: relative;
    box-shadow: 0 2px 8px rgba(255,77,141,0.3);
  }
  .cd-progress-fill::after {
    content: ''; position: absolute; inset: 3px 4px 3px auto;
    width: 6px; border-radius: 99px;
    background: rgba(255,255,255,.4);
  }
  .cd-heart-icon {
    position: absolute; right: -13px; top: 50%; transform: translateY(-50%);
    width: 26px; height: 26px; z-index: 2;
    filter: drop-shadow(0 2px 4px rgba(255,77,141,0.4));
    animation: cd-heart-beat 1.2s ease-in-out infinite;
  }
  @keyframes cd-heart-beat {
    0%, 100% { transform: translateY(-50%) scale(1); }
    50% { transform: translateY(-50%) scale(1.15); }
  }
  .cd-meta { margin-top: 10px; font-size: 14px; color: #9ca3af; }

  .cd-empty { color: #c5c9cf; font-size: 14px; padding: 44px 0; text-align: center; font-weight: 500; }

  @media (max-width: 980px) {
    .cd-grid { grid-template-columns: 1fr; }
    .cd-hero-top { flex-direction: column; align-items: flex-start; }
    .cd-hero-kpi-grid { width: 100%; margin-left: 0; margin-top: 14px; }
    .cd-hero { padding: 28px 24px; }
    .cd-hero-title { font-size: 26px; }
    .cd-card { padding: 24px 22px; }
  }
  @media (max-width: 680px) {
    .cd-candidate-grid { grid-template-columns: 1fr; }
    .cd-container { padding: 20px 16px 48px; }
    .cd-hero { padding: 22px 18px; }
    .cd-title { font-size: 22px; }
    .cd-hero-kpi-grid { grid-template-columns: 1fr; }
    .cd-hero-kpi-value { font-size: 26px; }
  }

  /* ── Pet Apply Modal ── */
  .cd-modal-overlay {
    position: fixed; inset: 0; z-index: 9999;
    background: rgba(0,0,0,.45); display: flex;
    align-items: center; justify-content: center; padding: 20px;
  }
  .cd-modal {
    width: 100%; max-width: 440px; background: #fff;
    border-radius: 18px; box-shadow: 0 20px 60px rgba(0,0,0,.18); padding: 26px;
  }
  .cd-modal-title { font-size: 17px; font-weight: 800; color: #111827; margin-bottom: 4px; }
  .cd-modal-sub { font-size: 13px; color: #9ca3af; margin-bottom: 16px; }
  .cd-modal-select {
    width: 100%; height: 44px; border-radius: 10px; border: 1.5px solid #e5e7eb;
    padding: 0 12px; font-size: 14px; color: #111827; margin-bottom: 16px;
    background: #f9fafb; appearance: none; cursor: pointer; font-family: inherit;
  }
  .cd-modal-select:focus { outline: none; border-color: #90C450; box-shadow: 0 0 0 3px rgba(68,78,40,.12); }
  .cd-upload-area {
    width: 100%; border-radius: 12px; border: 2px dashed #e5e7eb; background: #f9fafb;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    gap: 8px; cursor: pointer; transition: border-color .2s, background .2s;
    padding: 28px 20px; margin-bottom: 16px; position: relative;
  }
  .cd-upload-area:hover { border-color: #90C450; background: #f4f5ee; }
  .cd-upload-area.has-image { padding: 0; overflow: hidden; aspect-ratio: 1/1; border-style: solid; border-color: #e5e7eb; }
  .cd-upload-icon { width: 48px; height: 48px; border-radius: 12px; background: #f0f2e8; display: flex; align-items: center; justify-content: center; border: 1px solid #c5cca8; }
  .cd-upload-text { font-size: 14px; font-weight: 700; color: #374151; }
  .cd-upload-hint { font-size: 12px; color: #9ca3af; }
  .cd-upload-input { display: none; }
  .cd-upload-preview { width: 100%; height: 100%; object-fit: cover; display: block; }
  .cd-upload-change { position: absolute; bottom: 8px; right: 8px; background: rgba(0,0,0,.55); color: #fff; border: none; border-radius: 7px; font-size: 11px; font-weight: 700; padding: 5px 10px; cursor: pointer; }
  .cd-modal-btns { display: flex; gap: 8px; }
  .cd-modal-btn { flex: 1; height: 42px; border-radius: 10px; font-size: 13.5px; font-weight: 700; cursor: pointer; transition: all .15s; font-family: inherit; }
  .cd-modal-btn.cancel { background: #f8f9fc; color: #6b7280; border: 1px solid #e5e7eb; }
  .cd-modal-btn.cancel:hover { background: #e5e7eb; }
  .cd-modal-btn.confirm { background: linear-gradient(135deg, #90C450, #6B7A3D); color: #fff; border: none; box-shadow: 0 4px 12px rgba(68,78,40,.3); }
  .cd-modal-btn.confirm:hover { transform: translateY(-1px); box-shadow: 0 6px 18px rgba(68,78,40,.4); }
  .cd-modal-btn:disabled { opacity: .5; cursor: not-allowed; transform: none !important; }
`;

function formatTimeRange(startAt, endAt) {
  const pick = (value) => {
    const match = String(value ?? "").match(/(\d{2}):(\d{2})/);
    return match ? `${match[1]}:${match[2]}` : "";
  };

  const start = pick(startAt);
  const end = pick(endAt);
  return start && end ? `${start} ~ ${end}` : start || end || "시간 미정";
}

function contestPhase(program) {
  const now = Date.now();
  const startAt = new Date(program?.startAt ?? "").getTime();
  const endAt = new Date(program?.endAt ?? "").getTime();

  if (Number.isFinite(startAt) && now < startAt) return "upcoming";
  if (Number.isFinite(endAt) && now > endAt) return "ended";
  return "live";
}

export default function ContestDetailPage() {
  const navigate = useNavigate();
  const { eventId, programId } = useParams();

  const [program, setProgram] = useState(null);
  const [rows, setRows] = useState([]);
  const [totalVotes, setTotalVotes] = useState(0);
  const [myProgramApplyId, setMyProgramApplyId] = useState(null);
  const [voteSubmittingId, setVoteSubmittingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  const load = async ({ silent = false } = {}) => {
    if (!programId) return;
    if (!silent) setLoading(true);
    setErrorMsg("");

    try {
      const [programRes, candRes, voteRes] = await Promise.all([
        programApi.getProgramDetail(programId),
        programApi.getCandidates(programId, { page: 0, size: 200 }),
        programApi.getContestVoteResult(programId),
      ]);

      const programData = programRes?.data?.data ?? null;
      const candidates = candRes?.data?.data?.content ?? [];
      const voteData = voteRes?.data?.data ?? {};
      const voteRows = Array.isArray(voteData?.results) ? voteData.results : [];
      const voteMap = new Map(
        voteRows.map((row) => [Number(row?.programApplyId), Number(row?.voteCount ?? 0)]),
      );

      const mapped = candidates
        .map((candidate) => ({
          id: Number(candidate?.programApplyId),
          name:
            candidate?.petName ||
            (candidate?.ticketNo
              ? `참가견 ${candidate.ticketNo}`
              : `참가견 #${candidate?.programApplyId}`),
          ownerNickname:
            candidate?.ownerNickname ||
            (candidate?.userId ? `보호자 #${candidate.userId}` : "보호자 정보 없음"),
          imageUrl: candidate?.imageUrl || null,
          votes: voteMap.get(Number(candidate?.programApplyId)) ?? 0,
        }))
        .sort((a, b) => b.votes - a.votes);

      setProgram(programData);
      setRows(mapped);
      setTotalVotes(Number(voteData?.totalVotes ?? 0));
      setMyProgramApplyId(
        voteData?.myProgramApplyId == null ? null : Number(voteData.myProgramApplyId),
      );
    } catch (error) {
      setErrorMsg(
        error?.response?.data?.message ||
          error?.response?.data?.error?.message ||
          "콘테스트 상세 정보를 불러오지 못했습니다.",
      );
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [programId]);

  const maxVotes = useMemo(
    () => rows.reduce((max, row) => (row.votes > max ? row.votes : max), 0),
    [rows],
  );

  const handleVote = async (candidateId) => {
    if (!candidateId || voteSubmittingId) return;
    if (contestPhase(program) !== "live") return;
    if (myProgramApplyId) return;

    if (!tokenStore.getAccess()) {
      try {
        const refreshed = await authApi.refresh();
        if (refreshed?.accessToken) {
          tokenStore.setAccess(refreshed.accessToken);
        } else {
          navigate("/auth/login", {
            state: { from: `/program/contest/${eventId}/detail/${programId}` },
          });
          return;
        }
      } catch {
        navigate("/auth/login", {
          state: { from: `/program/contest/${eventId}/detail/${programId}` },
        });
        return;
      }
    }

    setVoteSubmittingId(candidateId);
    try {
      await programApi.voteContest(Number(programId), Number(candidateId));
      await load({ silent: true });
    } catch (error) {
      if (error?.response?.status === 401) {
        navigate("/auth/login", {
          state: { from: `/program/contest/${eventId}/detail/${programId}` },
        });
      } else if (error?.response?.status === 409) {
        await load({ silent: true });
      } else {
        window.alert(
          error?.response?.data?.error?.message ||
            error?.response?.data?.message ||
            "투표 처리 중 문제가 발생했습니다.",
        );
      }
    } finally {
      setVoteSubmittingId(null);
    }
  };

  /* ── 참가신청 (펫 모달) ── */
  const [petModalOpen, setPetModalOpen] = useState(false);
  const [petOptions, setPetOptions] = useState([]);
  const [selectedPetId, setSelectedPetId] = useState(null);
  const [applyImageUrl, setApplyImageUrl] = useState("");
  const [applyImageFile, setApplyImageFile] = useState(null);
  const [applySubmitting, setApplySubmitting] = useState(false);
  const [myApplyStatus, setMyApplyStatus] = useState(null);
  const fileInputRef = useRef(null);

  const handleApply = async () => {
    if (!eventId || !programId) return;
    if (myApplyStatus) {
      window.alert("이미 참가 신청한 콘테스트입니다.");
      return;
    }

    if (!tokenStore.getAccess()) {
      try {
        const refreshed = await authApi.refresh();
        if (refreshed?.accessToken) tokenStore.setAccess(refreshed.accessToken);
        else throw new Error();
      } catch {
        navigate("/auth/login", { state: { from: `/program/contest/${eventId}/detail/${programId}` } });
        return;
      }
    }

    try {
      const petRes = await petApi.getMyPets();
      const pets = Array.isArray(petRes?.pets) ? petRes.pets : Array.isArray(petRes) ? petRes : [];
      if (!pets.length) {
        window.alert("등록된 반려동물이 없습니다. 반려동물 등록 후 신청해주세요.");
        navigate("/auth/mypage");
        return;
      }
      setPetOptions(pets);
      setSelectedPetId(pets[0]?.petId ?? null);
      setApplyImageUrl("");
      setApplyImageFile(null);
      setPetModalOpen(true);
    } catch (e) {
      if (e?.response?.status === 401) {
        navigate("/auth/login", { state: { from: `/program/contest/${eventId}/detail/${programId}` } });
      } else {
        window.alert(e?.response?.data?.message || e?.message || "반려동물 정보를 불러올 수 없습니다.");
      }
    }
  };

  const handleApplyImageChange = (e) => {
    const file = e?.target?.files?.[0];
    if (!file) return;
    const allowed = new Set(["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"]);
    if (!allowed.has(file.type?.toLowerCase())) {
      window.alert("jpg, png, gif, webp 파일만 업로드할 수 있습니다.");
      e.target.value = "";
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      window.alert("이미지 용량은 2MB 이하만 가능합니다.");
      e.target.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = (evt) => {
      setApplyImageUrl(String(evt?.target?.result || ""));
      setApplyImageFile(file);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const submitApply = async () => {
    if (!programId || !selectedPetId || applySubmitting) return;
    setApplySubmitting(true);
    try {
      let uploadedImageUrl = null;
      if (applyImageFile) {
        try {
          const form = new FormData();
          form.append("file", applyImageFile);
          const upRes = await axiosInstance.post("/api/galleries/image/upload", form, { headers: { "Content-Type": "multipart/form-data" } });
          const rawPath = upRes?.data?.data?.publicPath ?? upRes?.data?.publicPath ?? null;
          if (rawPath) uploadedImageUrl = toPublicAssetUrl(rawPath) || rawPath;
        } catch {}
      }
      await programApi.createProgramApply({ programId: Number(programId), petId: Number(selectedPetId), imageUrl: uploadedImageUrl });
      setMyApplyStatus("APPLIED");
      setPetModalOpen(false);
      setApplyImageUrl("");
      setApplyImageFile(null);
      window.alert("참가 신청이 완료됐습니다! 관리자 승인 후 투표 후보로 등록됩니다.");
      await load({ silent: true });
    } catch (e) {
      if (e?.response?.status === 409) {
        setMyApplyStatus("APPLIED");
        setPetModalOpen(false);
      } else if (e?.response?.status === 401) {
        navigate("/auth/login", { state: { from: `/program/contest/${eventId}/detail/${programId}` } });
      } else {
        window.alert(e?.response?.data?.message || "신청에 실패했습니다. 다시 시도해주세요.");
      }
    } finally {
      setApplySubmitting(false);
    }
  };

  return (
    <div className="cd-root">
      <style>{styles}</style>
      <PageHeader
        title="콘테스트 상세"
        subtitle="진행 중인 콘테스트의 투표 현황을 확인합니다"
        icon={<Trophy size={42} color="#90C450" strokeWidth={1.6} />}
        titleStyle={{ fontSize: 46, lineHeight: "66px", letterSpacing: "-1px" }}
        subtitleStyle={{ fontSize: 20 }}
      />

      <main className="cd-container">

        <section className="cd-hero">
          <div className="cd-hero-top">
            <div className="cd-hero-main">
              <h1 className="cd-title">{program?.programTitle || `콘테스트 #${programId}`}</h1>
              <p className="cd-sub">
                <span><Clock3 size={14} /> {formatTimeRange(program?.startAt, program?.endAt)}</span>
                <span><Users size={14} /> 참가견 {rows.length}마리</span>
              </p>
              <hr className="cd-hero-divider" />
              <div className="cd-hero-summary">
                <span className="cd-hero-dot" />
                총 투표 <strong>{totalVotes.toLocaleString()}</strong>표
              </div>
            </div>
            <div className="cd-hero-kpi-grid">
              <div className="cd-hero-kpi">
                <div className="cd-hero-kpi-label">참가견</div>
                <div><span className="cd-hero-kpi-value">{rows.length}</span><span className="cd-hero-kpi-unit">마리</span></div>
              </div>
              <div className="cd-hero-kpi">
                <div className="cd-hero-kpi-label">총 투표</div>
                <div><span className="cd-hero-kpi-value">{totalVotes.toLocaleString()}</span><span className="cd-hero-kpi-unit">표</span></div>
              </div>
              <div className="cd-hero-kpi">
                <div className="cd-hero-kpi-label">1위 득표</div>
                <div><span className="cd-hero-kpi-value">{rows[0]?.votes?.toLocaleString() ?? 0}</span><span className="cd-hero-kpi-unit">표</span></div>
              </div>
            </div>
          </div>
          <div className="cd-hero-footer">
            <button
              type="button"
              className="cd-top-btn primary"
              onClick={handleApply}
              disabled={contestPhase(program) === "ended" || !!myApplyStatus}
            >
              <Heart size={15} />
              {myApplyStatus ? "신청완료" : contestPhase(program) === "ended" ? "참가 마감" : "참가하기"}
            </button>
          </div>
        </section>

        {loading ? <div className="cd-empty">투표 결과를 불러오는 중입니다.</div> : null}
        {errorMsg ? <div className="cd-empty">{errorMsg}</div> : null}

        {!loading && !errorMsg ? (
          <section className="cd-grid">
            <article className="cd-card">
              <div className="cd-card-head">
                <h3 className="cd-card-title">
                  <Users size={16} /> 참가견 목록
                </h3>
                <span className="cd-tag">{rows.length}마리</span>
              </div>

              <div className="cd-candidate-grid">
                {rows.length === 0 ? (
                  <div className="cd-empty">참가견 정보가 없습니다.</div>
                ) : null}

                {rows.map((row) => (
                  <div key={row.id} className="cd-candidate-card">
                    <div className="cd-candidate-thumb">
                      <img
                        src={resolveImageUrl(row.imageUrl)}
                        alt={row.name}
                        onError={createImageFallbackHandler()}
                      />
                    </div>

                    <div className="cd-candidate-body">
                      <div className="cd-candidate-name">{row.name}</div>
                      <div className="cd-candidate-owner">보호자 {row.ownerNickname}</div>
                      <div className="cd-candidate-votes">
                        득표수 {row.votes.toLocaleString()}표
                      </div>

                      <div className="cd-candidate-actions">
                        <button
                          type="button"
                          className={`cd-vote-btn${myProgramApplyId === row.id ? " done" : ""}`}
                          onClick={() => handleVote(row.id)}
                          disabled={
                            voteSubmittingId === row.id ||
                            myProgramApplyId != null ||
                            contestPhase(program) !== "live"
                          }
                        >
                          {myProgramApplyId === row.id
                            ? "내 투표"
                            : voteSubmittingId === row.id
                              ? "투표 중..."
                              : contestPhase(program) !== "live"
                                ? "투표 마감"
                                : "투표하기"}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </article>

            <article className="cd-card">
              <div className="cd-card-head">
                <h3 className="cd-card-title">
                  <Trophy size={16} /> 실시간 투표 결과
                </h3>
                <span className="cd-tag">총 {totalVotes.toLocaleString()}표</span>
              </div>

              <div className="cd-list">
                {rows.length === 0 ? (
                  <div className="cd-empty">집계된 결과가 없습니다.</div>
                ) : null}

                {rows.map((row, index) => (
                  <div key={`rank-${row.id}`} className="cd-item">
                    <div className="cd-item-top">
                      <div className="cd-name">
                        <span className={`cd-rank${index === 0 ? " top" : ""}`}>{index + 1}위</span>
                        {row.name}
                      </div>
                      <div className="cd-votes">
                        {totalVotes > 0 ? Math.round((row.votes / totalVotes) * 100) : 0}%
                      </div>
                    </div>

                    <div className="cd-progress">
                      <div
                        className="cd-progress-fill"
                        style={{
                          width: `${maxVotes > 0 ? (row.votes / maxVotes) * 100 : 0}%`,
                        }}
                      >
                        {row.votes > 0 && (
                          <svg className="cd-heart-icon" viewBox="0 0 24 24" fill="#ff4d8d" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                          </svg>
                        )}
                      </div>
                    </div>
                    <div className="cd-meta">{row.votes.toLocaleString()}표</div>
                  </div>
                ))}
              </div>
            </article>
          </section>
        ) : null}

        <div className="cd-bottom-btns">
          <button type="button" className="cd-btn" onClick={() => navigate("/program/current")}>
            <List size={18} />
            목록
          </button>
          <button type="button" className="cd-btn cd-btn-dark" onClick={() => navigate(-1)}>
            <ArrowLeft size={18} />
            뒤로가기
          </button>
        </div>
      </main>

      {/* ── Pet Apply Modal ── */}
      {petModalOpen && (
        <div className="cd-modal-overlay" onClick={() => { setPetModalOpen(false); setApplyImageUrl(""); setApplyImageFile(null); }}>
          <div className="cd-modal" onClick={(e) => e.stopPropagation()}>
            <div className="cd-modal-title">참가 신청</div>
            <div className="cd-modal-sub">참가할 반려동물과 사진을 선택해 주세요</div>
            <select className="cd-modal-select" value={selectedPetId ?? ""} onChange={(e) => setSelectedPetId(Number(e.target.value))}>
              {petOptions.map((pet) => (
                <option key={pet.petId} value={pet.petId}>{pet.petName || `Pet #${pet.petId}`}</option>
              ))}
            </select>
            <label className={`cd-upload-area${applyImageUrl ? " has-image" : ""}`}>
              <input type="file" accept="image/*" className="cd-upload-input" ref={fileInputRef} onChange={handleApplyImageChange} />
              {applyImageUrl ? (
                <>
                  <img src={applyImageUrl} alt="preview" className="cd-upload-preview" />
                  <span className="cd-upload-change">변경</span>
                </>
              ) : (
                <>
                  <div className="cd-upload-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <rect width="24" height="24" rx="6" fill="#e8eadc" />
                      <path d="M12 7v10M7 12h10" stroke="#90C450" strokeWidth="2.2" strokeLinecap="round" />
                    </svg>
                  </div>
                  <div className="cd-upload-text">클릭하거나 이미지를 드래그하세요</div>
                  <div className="cd-upload-hint">JPG, PNG, GIF, WEBP · 최대 2MB</div>
                </>
              )}
            </label>
            <div className="cd-modal-btns">
              <button type="button" className="cd-modal-btn cancel" onClick={() => { setPetModalOpen(false); setApplyImageUrl(""); setApplyImageFile(null); }}>취소</button>
              <button type="button" className="cd-modal-btn confirm" onClick={submitApply} disabled={!selectedPetId || applySubmitting}>
                {applySubmitting ? "신청 중..." : "신청하기"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
