import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  Calendar,
  ChevronRight,
  Clock,
  Heart,
  ImageOff,
  List,
  Mail,
  MapPin,
  Mic2,
  Phone,
  Tag,
  ArrowUpRight,
} from "lucide-react";
import PageHeader from "../components/PageHeader";
import PageLoading from "../components/PageLoading";
import EventDetailModal from "../event/EventDetailModal";
import { eventApi } from "../../../app/http/eventApi";
import { programApi } from "../../../app/http/programApi";
import { toPublicAssetUrl } from "../../../shared/utils/publicAssetUrl";
import {
  getProgramImage,
  loadImageCache as loadProgramImageCache,
} from "../../admin/shared/programImageStore";

const FONT = "'JeonjuCraftGothic', Pretendard, 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif";

const AVATAR_COLORS = ["#90C450", "#059669", "#d97706", "#dc2626", "#7c3aed"];
const CATEGORY_META = {
  SESSION: { label: "세션/강연", bg: "#eff4ff", color: "#90C450" },
  EXPERIENCE: { label: "체험", bg: "#ecfdf5", color: "#059669" },
  CONTEST: { label: "콘테스트", bg: "#fef3c7", color: "#b45309" },
  ETC: { label: "프로그램", bg: "#f3f4f6", color: "#4b5563" },
};

const avatarColor = (id) =>
  AVATAR_COLORS[Math.abs(Number(id) || 0) % AVATAR_COLORS.length];

function normalizeProgramCategory(value) {
  const raw = String(value ?? "").toUpperCase();
  if (raw.includes("SESSION") || raw.includes("LECTURE") || raw.includes("SEMINAR") || raw.includes("세션") || raw.includes("강연")) return "SESSION";
  if (raw.includes("EXPERIENCE") || raw.includes("EXHIBIT") || raw.includes("BOOTH") || raw.includes("체험")) return "EXPERIENCE";
  if (raw.includes("CONTEST") || raw.includes("VOTE") || raw.includes("COMPETITION") || raw.includes("콘테스트") || raw.includes("대회") || raw.includes("투표")) return "CONTEST";
  return "ETC";
}

function fmtDate(v) {
  if (!v) return "일정 미정";
  const d = new Date(v);
  if (isNaN(d)) return "일정 미정";
  const days = ["일", "월", "화", "수", "목", "금", "토"];
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")} (${days[d.getDay()]})`;
}
function fmtTime(v) {
  if (!v) return "";
  const d = new Date(v);
  if (isNaN(d)) return "";
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
function fmtRange(s, e) {
  const a = fmtTime(s), b = fmtTime(e);
  return a && b ? `${a} ~ ${b}` : a ? `${a} ~` : "시간 미정";
}
function RecommendCard({ rel, onClick }) {
  const relCat = normalizeProgramCategory(rel?.category ?? rel?.programCategory);
  const relMeta = CATEGORY_META[relCat] || CATEGORY_META.ETC;
  const relImg = getProgramImage(rel?.programId) || rel?.imageUrl || null;
  const title = rel.programTitle || rel.programName || "프로그램";
  const location = rel.location || rel.place || "장소 미정";
  const desc = rel.description || "";

  return (
    <div className="kd-recommend-card-wrap" onClick={onClick}>
      <div className="kd-recommend-card">
        <div className="kd-recommend-bg">
          {relImg && <img src={relImg} alt="" />}
        </div>
        <div className="kd-recommend-top">
          <div className="kd-recommend-top-header">
            <div style={{ fontSize: 14, fontWeight: 700, color: "rgba(255,255,255,0.85)" }}>{location}</div>
            <div className="kd-recommend-cat-pill">{relMeta.label}</div>
          </div>
          <div className="kd-recommend-top-title">{title}</div>
          {desc && <div className="kd-recommend-top-desc">{desc}</div>}
        </div>
        <div className="kd-recommend-thumb">
          {relImg ? (
            <img src={relImg} alt={title} />
          ) : (
            <ImageOff size={32} color="rgba(0,0,0,0.15)" />
          )}
        </div>
      </div>
    </div>
  );
}

function statusInfo(item) {
  const raw = String(item?.status ?? "").toUpperCase();
  if (raw.includes("LIVE") || raw.includes("ONGOING") || raw.includes("PROGRESS"))
    return { label: "진행 중", color: "#059669" };
  if (raw.includes("DONE") || raw.includes("END") || raw.includes("FINISH"))
    return { label: "종료", color: "#9ca3af" };
  const now = Date.now(), s = new Date(item?.startAt).getTime(), e = new Date(item?.endAt).getTime();
  if (isFinite(s) && now < s)
    return { label: "예정", color: "#d97706" };
  if (isFinite(e) && now > e)
    return { label: "종료", color: "#9ca3af" };
  return { label: "진행 중", color: "#059669" };
}

function resolveEventMovePath(eventInfo) {
  const status = String(eventInfo?.status ?? "").toUpperCase();
  if (status.includes("END") || status.includes("CLOSED")) return "/event/closed";
  if (status.includes("PLAN") || status.includes("UPCOMING")) return "/event/upcoming";
  return "/event/current";
}

const css = `
.kd-root {
  min-height: 100vh;
  font-family: 'Pretendard Variable', 'Pretendard', -apple-system, sans-serif;
  background: #fff;
  flex: 1;
}
.kd-root *, .kd-root *::before, .kd-root *::after { box-sizing: border-box; font-family: inherit; }
.kd-container { max-width: 1400px; margin: 0 auto; padding: 20px 0 64px; }

.kd-bottom-btns {
  display: flex; align-items: center; justify-content: center; gap: 12px;
  padding-top: 32px; border-top: 1px solid #e5e7eb;
  margin: 0;
}
.kd-btn {
  display: inline-flex; align-items: center; gap: 8px;
  border: 1px solid #d1d5db; background: #fff;
  padding: 12px 28px; border-radius: 8px;
  font-size: 15px; font-weight: 700; color: #374151;
  cursor: pointer; transition: all 0.15s; font-family: inherit;
}
.kd-btn:hover { background: #f8f9fc; border-color: #9ca3af; }
.kd-btn-dark {
  background: #111827; color: #fff; border-color: #111827;
}
.kd-btn-dark:hover { opacity: 0.85; background: #111827; border-color: #111827; }

/* ── 히어로 ── */
.kd-hero {
  border: 1px solid #e2e8f0; border-radius: 20px;
  padding: 40px 44px; margin-bottom: 20px;
  background: linear-gradient(135deg, #fff 0%, #fafbff 100%);
  position: relative; overflow: hidden;
  box-shadow: 0 2px 12px rgba(0,0,0,0.04);
}
.kd-hero::before {
  content: ""; position: absolute; top: 0; left: 0; right: 0; height: 4px;
  background: linear-gradient(90deg, #90C450, #b5d98a, #90C450);
  background-size: 200% 100%;
  animation: kd-bar 3s ease infinite;
}
@keyframes kd-bar { 0%,100% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } }
.kd-hero-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 24px; }
.kd-hero-main { min-width: 0; flex: 1 1 auto; }
.kd-hero-meta { display: flex; align-items: center; gap: 8px; margin-bottom: 14px; }
.kd-hero-tag {
  display: inline-flex; align-items: center; padding: 4px 12px;
  border-radius: 6px; font-size: 13px; font-weight: 700;
}
.kd-hero-title {
  margin: 0; font-size: 32px; line-height: 1.15; letter-spacing: -0.03em;
  font-weight: 900; color: #111827;
}
.kd-hero-event { margin-top: 8px; font-size: 15px; color: #9ca3af; font-weight: 500; }
.kd-hero-divider { margin: 16px 0; border: none; border-top: 1px solid #f0f0f0; }
.kd-hero-info {
  display: flex; align-items: center; gap: 20px; flex-wrap: wrap;
  font-size: 15px; color: #9ca3af;
}
.kd-hero-info-item { display: inline-flex; align-items: center; gap: 5px; }

.kd-hero-kpi-grid {
  display: grid; grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px; width: min(480px, 100%); margin-left: auto; flex-shrink: 0;
}
.kd-hero-kpi {
  border: 1px solid #ebebeb; border-radius: 16px; background: #fff; padding: 20px 22px;
}
.kd-hero-kpi-label { font-size: 13px; color: #9ca3af; font-weight: 600; margin-bottom: 8px; }
.kd-hero-kpi-value { font-size: 24px; line-height: 1; font-weight: 900; color: #111827; letter-spacing: -0.02em; }

.kd-hero-footer {
  display: flex; align-items: center; justify-content: flex-end;
  margin-top: 20px; padding-top: 14px; border-top: 1px solid #f0f0f0;
}

/* ── 카드 ── */
.kd-card {
  background: #fff; border: 1px solid #e2e8f0; border-radius: 16px;
  padding: 28px 32px; margin-bottom: 16px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.03);
}
.kd-card-header {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 20px; padding-bottom: 16px; border-bottom: 1px solid #f0f0f0;
}
.kd-card-title {
  margin: 0; font-size: 18px; font-weight: 800; color: #111827;
  display: flex; align-items: center; gap: 10px;
}
.kd-card-tag { font-size: 13px; color: #9ca3af; font-weight: 600; }

/* ── 포스터 영역 ── */
.kd-product {
  display: grid; grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr); gap: 48px;
  margin: 0 0 48px; padding: 0; align-items: center;
}
.kd-product-img {
  width: 100%; border-radius: 20px; overflow: hidden; background: #f5f5f5;
  position: sticky; top: 24px;
  box-shadow: 0 12px 48px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.04);
}
.kd-product-img img { width: 100%; display: block; }
.kd-product-img-empty {
  aspect-ratio: 4/5; display: flex; align-items: center; justify-content: center;
  color: #ccc;
}
.kd-product-info { display: flex; flex-direction: column; padding-top: 4px; }
.kd-product-cat {
  display: inline-flex; align-items: center; width: fit-content;
  font-size: 13px; font-weight: 800; letter-spacing: 0.02em; margin-bottom: 14px;
  padding: 6px 14px; border-radius: 8px;
  border: 1px solid currentColor;
}
.kd-product-title {
  margin: 0; font-size: 36px; line-height: 1.2; letter-spacing: -0.03em;
  font-weight: 900; color: #111;
}
.kd-product-event-top {
  margin-top: 8px;
  font-size: 14px;
  font-weight: 700;
  color: #02A17E;
}
.kd-product-event {
  margin-top: 10px; font-size: 16px; color: #999; font-weight: 500;
}
.kd-product-event-link {
  margin-top: 10px; border: none; background: transparent; padding: 0;
  font-size: 16px; color: #02A17E; font-weight: 700; cursor: pointer;
  text-align: left; display: inline-flex; align-items: center; gap: 6px;
}
.kd-product-event-link:hover { text-decoration: underline; }
.kd-product-status {
  margin-top: 16px;
  display: inline-flex; align-items: center; gap: 8px;
}
.kd-product-status-dot {
  width: 10px; height: 10px; border-radius: 50%;
  box-shadow: 0 0 6px currentColor;
  animation: kd-glow 1.6s ease-in-out infinite;
}
@keyframes kd-glow {
  0%, 100% { opacity: 1; box-shadow: 0 0 6px currentColor; }
  50% { opacity: 0.5; box-shadow: 0 0 14px currentColor; }
}
.kd-product-status-ended .kd-product-status-dot { animation: none; box-shadow: none; }
.kd-product-status-text { font-size: 16px; font-weight: 800; }
.kd-product-divider { margin: 28px 0; border: none; border-top: 1px solid #eee; }
.kd-product-specs {
  display: grid; grid-template-columns: 1fr 1fr; gap: 20px;
}
.kd-product-spec {
  display: flex; flex-direction: column; gap: 6px;
  padding: 18px 22px; border-radius: 14px; background: #f8f9fc;
  border: 1px solid #eef0f4;
}
.kd-product-spec-label {
  font-size: 13px; font-weight: 600; color: #aaa; text-transform: uppercase;
  letter-spacing: 0.06em;
}
.kd-product-spec-value {
  font-size: 19px; font-weight: 700; color: #111; line-height: 1.4;
}
.kd-product-spec-link {
  color: #90C450; text-decoration: none; cursor: pointer; font-weight: 700;
}
.kd-product-spec-link:hover { text-decoration: underline; }
.kd-product-spec-speaker {
  cursor: pointer; transition: all 0.15s;
  grid-column: 1 / -1;
  border: 1px solid #e0f0d0; background: #f5fae8;
}
.kd-product-spec-speaker:hover { border-color: #d4e8b8; background: #f0f8e0; box-shadow: 0 2px 12px rgba(144,196,80,0.08); }
.kd-speaker-row {
  display: flex; align-items: center; gap: 14px;
  min-height: 36px;
}
.kd-speaker-av-sm {
  width: 36px; height: 36px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 15px; font-weight: 800; color: #fff; flex-shrink: 0;
  overflow: hidden;
}
.kd-speaker-av-sm img { width: 100%; height: 100%; object-fit: cover; display: block; }
.kd-speaker-row-name { font-size: 19px; font-weight: 700; color: #111; }
.kd-speaker-row-arrow { color: #b5d98a; margin-left: auto; flex-shrink: 0; transition: all 0.15s; }
.kd-product-spec-speaker:hover .kd-speaker-row-arrow { color: #90C450; transform: translateX(3px); }
.kd-speaker-row-name { font-size: 19px; font-weight: 700; color: #111; }
.kd-speaker-row-hint { font-size: 12px; color: #b5d98a; font-weight: 600; margin-left: 4px; }
.kd-product-desc-wrap {
  margin-top: 28px;
}
.kd-product-desc-label {
  font-size: 17px; font-weight: 700; color: #111; margin-bottom: 16px;
  display: flex; align-items: center; gap: 8px;
}
.kd-product-desc-label::after {
  content: ""; flex: 1; height: 1px; background: #e5e5e5;
}
.kd-product-desc {
  font-size: 18px; line-height: 1.85; color: #333;
  white-space: pre-wrap; word-break: keep-all;
  padding: 20px 24px; background: #f9fafb; border-radius: 14px;
  border: 1px solid #eef0f4;
}
.kd-product-more {
  border: none; background: none; color: #90C450; font-size: 14px;
  font-weight: 700; cursor: pointer; padding: 12px 0 0; font-family: inherit;
}
.kd-product-more:hover { text-decoration: underline; }

/* ── 추천 프로그램 ── */
.kd-recommend {
  margin: 0 0 60px;
  padding-top: 48px; border-top: 1px solid #eee;
}
.kd-recommend-title {
  font-size: 20px; font-weight: 800; color: #111; letter-spacing: -0.01em;
  display: flex; align-items: center; justify-content: center; gap: 8px;
  margin: 0 0 32px;
}
.kd-recommend-grid {
  display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 24px;
}
.kd-recommend-card-wrap {
  cursor: pointer;
}
.kd-recommend-card-wrap:hover .kd-recommend-card {
  transform: translateY(-6px); box-shadow: 0 12px 40px rgba(0,0,0,0.12);
}
.kd-recommend-card {
  border-radius: 24px; overflow: hidden;
  display: flex; flex-direction: column;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  height: 450px; position: relative;
  background: #f5f5f5;
}
.kd-recommend-bg {
  position: absolute; inset: 0; z-index: 0; overflow: hidden;
}
.kd-recommend-bg img {
  width: 100%; height: 100%; object-fit: cover;
  filter: blur(50px) saturate(1.6) brightness(1.05);
  transform: scale(1.4);
}
.kd-recommend-top {
  position: relative; z-index: 1;
  padding: 28px 24px 0;
  display: flex; flex-direction: column; justify-content: space-between;
  min-height: 140px;
}
.kd-recommend-top-header {
  display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px;
}
.kd-recommend-cat-pill {
  font-size: 13px; font-weight: 800; color: #fff;
  background: rgba(255,255,255,0.25); backdrop-filter: blur(8px);
  padding: 6px 16px; border-radius: 99px;
  border: 1px solid rgba(255,255,255,0.2);
}
.kd-recommend-top-title {
  font-size: 20px; font-weight: 800; color: rgba(255,255,255,0.95); line-height: 1.35;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
  text-shadow: 0 1px 10px rgba(0,0,0,0.2);
  margin-bottom: 8px;
}
.kd-recommend-top-desc {
  font-size: 13px; font-weight: 500; color: rgba(255,255,255,0.55); line-height: 1.45;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
  padding-bottom: 16px;
}
.kd-recommend-thumb {
  position: relative; z-index: 1;
  width: 100%; flex: 1 1 auto; min-height: 280px;
  overflow: hidden;
}
.kd-recommend-thumb img {
  width: 100%; height: 110%; object-fit: cover; display: block;
  object-position: top center;
  mask-image: linear-gradient(to bottom, transparent 0%, black 25%);
  -webkit-mask-image: linear-gradient(to bottom, transparent 0%, black 25%);
}

/* ── 히어로 포스터 ── */
.kd-hero-poster {
  width: min(280px, 100%); flex-shrink: 0;
  border-radius: 14px; overflow: hidden;
  border: 1px solid #eef0f4; background: #f8f9fb;
  align-self: center;
}
.kd-hero-poster img {
  width: 100%; display: block;
}

/* ── 포스터 ── */
.kd-poster-img {
  width: 100%; display: block; border-radius: 14px;
  border: 1px solid #eef0f4;
}

/* ── 소개 ── */
.kd-desc-text {
  font-size: 16px; line-height: 1.8; color: #374151;
  white-space: pre-wrap; word-break: keep-all;
}

/* ── 연사 ── */
.kd-speaker {
  display: flex; align-items: center; gap: 20px;
  padding: 20px 24px; background: #fafbfc; border: 1px solid #eef0f4;
  border-radius: 14px; cursor: pointer; transition: all 0.15s;
}
.kd-speaker:hover { border-color: #d1d5db; background: #f8f9fc; }
.kd-speaker-av {
  width: 56px; height: 56px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 22px; font-weight: 900; color: #fff; flex-shrink: 0; overflow: hidden;
}
.kd-speaker-av img { width: 100%; height: 100%; object-fit: cover; display: block; }
.kd-speaker-name { font-size: 17px; font-weight: 800; color: #111827; margin-bottom: 2px; }
.kd-speaker-bio { font-size: 14px; color: #9ca3af; line-height: 1.4; }
.kd-speaker-contact { margin-top: 6px; display: flex; gap: 14px; font-size: 13px; color: #b0b5bc; }
.kd-speaker-contact-item { display: inline-flex; align-items: center; gap: 4px; }
.kd-speaker-arrow { margin-left: auto; flex-shrink: 0; color: #d1d5db; }

/* ── 소속 행사 ── */
.kd-event-banner {
  display: flex; align-items: center; gap: 16px;
  padding: 18px 22px; background: #fafbfc; border: 1px solid #eef0f4;
  border-radius: 14px; cursor: pointer; transition: all 0.15s;
}
.kd-event-banner:hover { border-color: #d1d5db; background: #f8f9fc; }
.kd-event-thumb {
  width: 48px; height: 48px; border-radius: 12px;
  object-fit: cover; flex-shrink: 0; background: #e8ecf4;
}
.kd-event-name { font-size: 16px; font-weight: 700; color: #111827; }
.kd-event-loc { font-size: 13px; color: #9ca3af; margin-top: 2px; }

/* ── 하단 ── */
.kd-bottom-nav {
  display: flex; justify-content: center; margin-top: 8px;
}

/* ── 로딩/에러 ── */
.kd-center {
  min-height: 60vh; display: flex; align-items: center; justify-content: center;
  color: #9ca3af; font-family: inherit; background: #fff;
}
@keyframes kd-dot { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-16px); } }

@media (max-width: 900px) {
  .kd-product { grid-template-columns: 1fr; gap: 32px; }
  .kd-product-img { position: static; }
  .kd-product-title { font-size: 24px; }
  .kd-product-specs { grid-template-columns: 1fr 1fr; }
  .kd-recommend-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .kd-recommend-card { height: 450px; }
}
@media (max-width: 640px) {
  .kd-container { padding: 16px 16px 48px; }
  .kd-product { gap: 20px; }
  .kd-product-title { font-size: 20px; }
  .kd-product-specs { grid-template-columns: 1fr 1fr; gap: 10px; }
  .kd-product-spec { padding: 14px 14px; }
  .kd-product-spec-value { font-size: 15px; }
  .kd-product-divider { margin: 16px 0; }
  .kd-product-desc-wrap { margin-top: 20px; }
  .kd-product-desc-label { font-size: 15px; }
  .kd-product-desc { font-size: 14px; line-height: 1.7; padding: 14px 16px; }
  .kd-recommend { padding-top: 32px; margin-bottom: 40px; }
  .kd-recommend-grid { grid-template-columns: 1fr; gap: 16px; }
  .kd-recommend-card { height: 340px; }
  .kd-bottom-btns { gap: 8px; }
  .kd-btn { padding: 10px 20px; font-size: 14px; }
}
`;

export default function SessionDetail() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const programId = searchParams.get("programId");

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [program, setProgram] = useState(null);
  const [speaker, setSpeaker] = useState(null);
  const [eventInfo, setEventInfo] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [imgFailed, setImgFailed] = useState(false);
  const [descExpanded, setDescExpanded] = useState(false);
  const [relatedPrograms, setRelatedPrograms] = useState([]);

  useEffect(() => {
    if (!programId) {
      setErrorMsg("programId is required.");
      setLoading(false);
      return;
    }
    let mounted = true;
    (async () => {
      setLoading(true);
      setErrorMsg("");
      await loadProgramImageCache();
      try {
        const progRes = await programApi.getProgramDetail(programId);
        const prog = progRes?.data?.data;
        const cat = normalizeProgramCategory(prog?.category ?? prog?.programCategory);
        const [speakerRes, eventRes] = await Promise.all([
          cat === "SESSION"
            ? programApi.getProgramSpeakers(programId).catch(() => ({ data: { data: [] } }))
            : Promise.resolve({ data: { data: [] } }),
          prog?.eventId
            ? eventApi.getEventDetail(prog.eventId).catch(() => null)
            : Promise.resolve(null),
        ]);
        if (!mounted) return;
        const spList = Array.isArray(speakerRes?.data?.data) ? speakerRes.data.data : [];
        setProgram(prog ?? null);
        setSpeaker(cat === "SESSION" ? spList[0] ?? null : null);
        setEventInfo(eventRes?.data?.data ?? null);
        if (prog?.eventId) {
          try {
            const relRes = await programApi.getAllProgramsByEvent({ eventId: prog.eventId, pageSize: 20, sort: "startAt,asc" });
            const allRel = (Array.isArray(relRes?.content) ? relRes.content : Array.isArray(relRes) ? relRes : [])
              .filter((p) => Number(p?.programId) !== Number(programId));
            // 랜덤 셔플 후 3개
            for (let i = allRel.length - 1; i > 0; i--) {
              const j = Math.floor(Math.random() * (i + 1));
              [allRel[i], allRel[j]] = [allRel[j], allRel[i]];
            }
            const relList = allRel.slice(0, 3);
            if (mounted) setRelatedPrograms(relList);
          } catch { /* ignore */ }
        }
      } catch (e) {
        if (!mounted) return;
        const code = e?.response?.status;
        const msg = e?.response?.data?.message || e?.message || "불러오기 실패";
        setErrorMsg(code ? `[${code}] ${msg}` : msg);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [programId]);

  if (loading)
    return (
      <div className="kd-root">
        <style>{css}</style>
        <PageLoading message="프로그램 정보를 불러오는 중입니다" />
      </div>
    );

  if (errorMsg || !program)
    return (
      <div className="kd-root">
        <style>{css}</style>
        <div className="kd-center">
          <div style={{ textAlign: "center" }}>
            <div style={{ color: "#dc2626", marginBottom: 14, fontSize: 14 }}>{errorMsg || "프로그램을 찾을 수 없습니다."}</div>
            <button className="kd-btn" onClick={() => navigate(-1)}>
              <ArrowLeft size={15} /> 뒤로가기
            </button>
          </div>
        </div>
      </div>
    );

  const normalizedCategory = normalizeProgramCategory(program?.category ?? program?.programCategory);
  const catMeta = CATEGORY_META[normalizedCategory] || CATEGORY_META.ETC;
  const showSpeaker = normalizedCategory === "SESSION";
  const st = statusInfo(program);
  const heroImg = getProgramImage(programId) || program?.imageUrl || null;
  const hasImg = !!heroImg && !imgFailed;
  const speakerImageUrl = toPublicAssetUrl(speaker?.speakerImageUrl);
  const title = program.programTitle || program.programName || "프로그램";
  const eventMovePath = resolveEventMovePath(eventInfo);
  const eventMoveLabel = eventInfo?.eventName
    ? `${eventInfo.eventName}로 이동하기`
    : "";

  const goSpeaker = () => {
    if (!speaker?.speakerId) return;
    navigate(`/program/speaker/detail?speakerId=${speaker.speakerId}&programId=${program.programId}`);
  };

  const openEventModal = () => {
    if (!eventInfo?.eventId) return;
    setSelectedEvent({
      id: eventInfo.eventId,
      eventId: eventInfo.eventId,
      title: eventInfo.eventName ?? "행사",
      category: eventInfo.category ?? eventInfo.eventCategory ?? "행사",
      location: eventInfo.location ?? eventInfo.place ?? "장소 미정",
      organizer: eventInfo.organizer ?? "정보 없음",
      organizerPhone: eventInfo.organizerPhone ?? null,
      organizerEmail: eventInfo.organizerEmail ?? null,
      image: eventInfo.imageUrl ?? eventInfo.posterUrl ?? null,
      date: fmtDate(eventInfo.startAt),
      participants: Number(eventInfo.totalParticipantCount ?? 0) || 0,
      capacity: Number(eventInfo.capacity ?? eventInfo.maxParticipants ?? 1) || 1,
      fallback: "행사",
      movePath: eventMovePath,
    });
  };

  return (
    <div className="kd-root">
      <style>{css}</style>
      <PageHeader
        title="프로그램 상세"
        subtitle="프로그램의 상세 정보를 확인합니다"
        icon={<Tag size={42} color="#90C450" strokeWidth={1.6} />}
        titleStyle={{ fontSize: 46, lineHeight: "66px", letterSpacing: "-1px" }}
        subtitleStyle={{ fontSize: 20 }}
      />
      <main className="kd-container">
        {/* ── 상품형: 좌 이미지 + 우 정보 ── */}
        <div className="kd-product">
          <div className="kd-product-img">
            {hasImg ? (
              <img src={heroImg} alt={title} onError={() => setImgFailed(true)} />
            ) : (
              <div className="kd-product-img-empty">
                <ImageOff size={48} />
              </div>
            )}
          </div>
          <div className="kd-product-info">
            <div className="kd-product-status" style={{ color: st.color }}>
              <span className="kd-product-status-dot" style={{ background: st.color }} />
              <span className="kd-product-status-text">{st.label}</span>
            </div>
            {eventInfo?.eventName && (
              <div className="kd-product-event-top">{eventInfo.eventName}</div>
            )}
            <h1 className="kd-product-title">{title}</h1>
            {eventInfo?.eventName && (
              <button
                type="button"
                className="kd-product-event-link"
                onClick={openEventModal}
              >
                {eventMoveLabel}
                <ArrowUpRight size={16} />
              </button>
            )}

            <hr className="kd-product-divider" />

            <div className="kd-product-specs">
              <div className="kd-product-spec">
                <div className="kd-product-spec-label">날짜</div>
                <div className="kd-product-spec-value">{fmtDate(program.startAt)}</div>
              </div>
              <div className="kd-product-spec">
                <div className="kd-product-spec-label">시간</div>
                <div className="kd-product-spec-value">{fmtRange(program.startAt, program.endAt)}</div>
              </div>
              <div className="kd-product-spec">
                <div className="kd-product-spec-label">장소</div>
                <div className="kd-product-spec-value">{program.location || program.place || program.boothName || "장소 미정"}</div>
              </div>
              <div className="kd-product-spec">
                <div className="kd-product-spec-label">분류</div>
                <div className="kd-product-spec-value">
                  <span className="kd-product-cat" style={{ background: catMeta.bg, color: catMeta.color, marginBottom: 0, fontSize: 14 }}>{catMeta.label}</span>
                </div>
              </div>
              {showSpeaker && speaker && (
                <div className="kd-product-spec kd-product-spec-speaker" onClick={goSpeaker}>
                  <div className="kd-product-spec-label">연사</div>
                  <div className="kd-speaker-row">
                    <div className="kd-speaker-av-sm" style={{ background: avatarColor(speaker.speakerId) }}>
                      {speakerImageUrl ? (
                        <img src={speakerImageUrl} alt={speaker.speakerName || ""} />
                      ) : (
                        (speaker.speakerName || "?").charAt(0)
                      )}
                    </div>
                    <span className="kd-speaker-row-name">{speaker.speakerName}</span>
                    <ChevronRight size={22} className="kd-speaker-row-arrow" />
                  </div>
                </div>
              )}
            </div>


            {!!program.description && (
              <div className="kd-product-desc-wrap">
                <div className="kd-product-desc-label">프로그램 소개</div>
                <div className="kd-product-desc">
                  {program.description}
                </div>
              </div>
            )}

          </div>
        </div>

        {/* ── 비슷한 프로그램 ── */}
        {relatedPrograms.length > 0 && (
          <div className="kd-recommend">
            <div className="kd-recommend-title"><Heart size={20} />이런 프로그램은 어때요?</div>
            <div className="kd-recommend-grid">
              {relatedPrograms.map((rel) => (
                <RecommendCard
                  key={rel.programId}
                  rel={rel}
                  onClick={() => navigate(`/program/detail?programId=${rel.programId}`)}
                />
              ))}
            </div>
          </div>
        )}

        {/* ── 하단 버튼 ── */}
        <div className="kd-bottom-btns">
          <button type="button" className="kd-btn" onClick={() => navigate("/program/current")}>
            <List size={18} />
            목록
          </button>
          <button type="button" className="kd-btn kd-btn-dark" onClick={() => navigate(-1)}>
            <ArrowLeft size={18} />
            뒤로가기
          </button>
        </div>
      </main>
      {selectedEvent && (
        <EventDetailModal
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
        />
      )}
    </div>
  );
}
