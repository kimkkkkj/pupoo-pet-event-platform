import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, List, Mail, Phone, Mic2 } from "lucide-react";
import PageHeader from "../components/PageHeader";
import { programApi } from "../../../app/http/programApi";
import { resolveImageUrl } from "../../../shared/utils/publicAssetUrl";

const AVATAR_COLORS = ["#90C450", "#059669", "#d97706", "#dc2626", "#7c3aed"];

function avatarColor(id) {
  return AVATAR_COLORS[Math.abs(Number(id) || 0) % AVATAR_COLORS.length];
}

const css = `
.sp-root {
  min-height: 100vh;
  font-family: 'Pretendard Variable', 'Pretendard', -apple-system, sans-serif;
  background: #f8f9fc;
  flex: 1;
}
.sp-root *, .sp-root *::before, .sp-root *::after { box-sizing: border-box; font-family: inherit; }
.sp-container { max-width: 1400px; margin: 0 auto; padding: 20px 0 64px; }

/* ── 상품형 ── */
.sp-product {
  display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.2fr); gap: 48px;
  margin: 0 0 24px; align-items: center;
  background: #fff; border: 1px solid #e2e8f0; border-radius: 20px;
  padding: 48px; box-shadow: 0 2px 12px rgba(0,0,0,0.04);
}
.sp-photo {
  width: 100%; aspect-ratio: 1/1; max-width: 420px;
  border-radius: 50%; overflow: hidden;
  background: linear-gradient(145deg, #CCF0E4, #E6F7F2);
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 12px 48px rgba(0,0,0,0.1);
  margin: 0 auto;
}
.sp-photo img { width: 100%; height: 100%; object-fit: cover; display: block; }
.sp-photo-fallback {
  width: 100%; height: 100%;
  display: flex; align-items: center; justify-content: center;
  color: #fff; font-size: 120px; font-weight: 900;
}

.sp-info { display: flex; flex-direction: column; }
.sp-badge {
  display: inline-flex; align-items: center; width: fit-content;
  font-size: 13px; font-weight: 800; padding: 4px 10px; border-radius: 6px;
  background: #eff4ff; color: #90C450; border: 1px solid #90C450;
  margin-bottom: 14px;
}
.sp-name {
  margin: 0; font-size: 36px; line-height: 1.2; letter-spacing: -0.03em;
  font-weight: 900; color: #111;
}
.sp-bio {
  margin-top: 12px; font-size: 16px; line-height: 1.7; color: #888;
}
.sp-divider { margin: 24px 0; border: none; border-top: 1px solid #eee; }
.sp-meta { display: flex; flex-wrap: wrap; gap: 10px; }
.sp-chip {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 10px 18px; border-radius: 12px;
  border: 1px solid #eef0f4; background: #f8f9fc;
  color: #333; font-size: 15px; font-weight: 600;
  transition: all 0.15s;
}
.sp-chip:hover { border-color: #d1d5db; background: #f0f1f4; }
.sp-chip svg { color: #9ca3af; }

.sp-section {
  margin-top: 28px;
}
.sp-section-label {
  font-size: 17px; font-weight: 700; color: #111; margin-bottom: 16px;
  display: flex; align-items: center; gap: 8px;
}
.sp-section-label::after {
  content: ""; flex: 1; height: 1px; background: #eee;
}
.sp-section-text {
  font-size: 18px; line-height: 1.85; color: #333;
  white-space: pre-wrap; word-break: keep-all;
  padding: 20px 24px; background: #f9fafb; border-radius: 14px;
  border: 1px solid #eef0f4;
}

/* ── 하단 버튼 ── */
.sp-bottom-btns {
  display: flex; align-items: center; justify-content: center; gap: 12px;
  padding-top: 32px; border-top: 1px solid #e5e7eb;
}
.sp-btn {
  display: inline-flex; align-items: center; gap: 8px;
  border: 1px solid #d1d5db; background: #fff;
  padding: 12px 28px; border-radius: 8px;
  font-size: 15px; font-weight: 700; color: #374151;
  cursor: pointer; transition: all 0.15s; font-family: inherit;
}
.sp-btn:hover { background: #f8f9fc; border-color: #9ca3af; }
.sp-btn-dark { background: #111827; color: #fff; border-color: #111827; }
.sp-btn-dark:hover { opacity: 0.85; background: #111827; border-color: #111827; }

/* ── 로딩/에러 ── */
.sp-center {
  min-height: 60vh; display: flex; align-items: center; justify-content: center;
  color: #9ca3af; font-family: inherit; background: #f8f9fc;
}

@media (max-width: 900px) {
  .sp-product { grid-template-columns: 1fr; gap: 32px; padding: 32px 28px; }
  .sp-photo { max-width: 300px; }
  .sp-name { font-size: 28px; }
}
@media (max-width: 640px) {
  .sp-container { padding: 20px 16px 48px; }
  .sp-product { padding: 24px 20px; }
  .sp-photo { max-width: 240px; }
  .sp-name { font-size: 24px; }
}
`;

export default function SpeakerDetail() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const speakerId = searchParams.get("speakerId");
  const programId = searchParams.get("programId");

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [speaker, setSpeaker] = useState(null);

  useEffect(() => {
    if (!speakerId) {
      setErrorMsg("speakerId is required.");
      setLoading(false);
      return;
    }

    let mounted = true;

    (async () => {
      setLoading(true);
      setErrorMsg("");
      try {
        let res;
        if (programId) {
          try {
            res = await programApi.getProgramSpeaker(programId, speakerId);
          } catch {
            res = await programApi.getSpeakerDetail(speakerId);
          }
        } else {
          res = await programApi.getSpeakerDetail(speakerId);
        }
        if (!mounted) return;
        setSpeaker(res?.data?.data ?? null);
      } catch (e) {
        if (!mounted) return;
        const code = e?.response?.status;
        const msg = e?.response?.data?.message || e?.message || "연사 정보를 불러오지 못했습니다.";
        setErrorMsg(code ? `[${code}] ${msg}` : msg);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => { mounted = false; };
  }, [speakerId, programId]);

  const speakerImageUrl = useMemo(
    () => resolveImageUrl(speaker?.speakerImageUrl),
    [speaker?.speakerImageUrl],
  );
  const initial = String(speaker?.speakerName || "연").trim().charAt(0) || "연";

  if (loading) {
    return (
      <div className="sp-root">
        <style>{css}</style>
        <div className="sp-center">연사 정보를 불러오는 중입니다.</div>
      </div>
    );
  }

  if (errorMsg || !speaker) {
    return (
      <div className="sp-root">
        <style>{css}</style>
        <div className="sp-center">
          <div style={{ textAlign: "center" }}>
            <div style={{ color: "#dc2626", marginBottom: 14, fontSize: 14 }}>{errorMsg || "연사 정보를 찾을 수 없습니다."}</div>
            <button className="sp-btn" onClick={() => navigate(-1)}>
              <ArrowLeft size={15} /> 뒤로가기
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="sp-root">
      <style>{css}</style>
      <PageHeader
        title="연사 상세"
        subtitle="연사의 프로필과 소개를 확인합니다"
        icon={<Mic2 size={42} color="#90C450" strokeWidth={1.6} />}
        titleStyle={{ fontSize: 46, lineHeight: "66px", letterSpacing: "-1px" }}
        subtitleStyle={{ fontSize: 20 }}
      />

      <main className="sp-container">
        <div className="sp-product">
          <div className="sp-photo">
            {speakerImageUrl ? (
              <img src={speakerImageUrl} alt={speaker.speakerName || "연사 사진"} />
            ) : (
              <div className="sp-photo-fallback" style={{ background: avatarColor(speaker.speakerId) }}>
                {initial}
              </div>
            )}
          </div>

          <div className="sp-info">
            <div className="sp-badge">연사</div>
            <h1 className="sp-name">{speaker.speakerName || "이름 없음"}</h1>
            {speaker.speakerBio && (
              <div className="sp-bio">{speaker.speakerBio}</div>
            )}

            {(speaker.speakerEmail || speaker.speakerPhone) && (
              <>
                <hr className="sp-divider" />
                <div className="sp-meta">
                  {speaker.speakerEmail && (
                    <span className="sp-chip"><Mail size={16} />{speaker.speakerEmail}</span>
                  )}
                  {speaker.speakerPhone && (
                    <span className="sp-chip"><Phone size={16} />{speaker.speakerPhone}</span>
                  )}
                </div>
              </>
            )}

            {speaker.speakerBio && (
              <div className="sp-section">
                <div className="sp-section-label">연사 소개</div>
                <div className="sp-section-text">{speaker.speakerBio}</div>
              </div>
            )}
          </div>
        </div>

        <div className="sp-bottom-btns">
          <button type="button" className="sp-btn sp-btn-dark" onClick={() => navigate(-1)}>
            <ArrowLeft size={18} />
            뒤로가기
          </button>
        </div>
      </main>
    </div>
  );
}
