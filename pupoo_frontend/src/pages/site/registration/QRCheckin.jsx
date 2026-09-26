import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import PageHeader from "../components/PageHeader";
import PageLoading from "../components/PageLoading";
import { Calendar, ChevronDown, Download, Hash, Info, MapPin, Maximize2, QrCode, RefreshCw, Ticket } from "lucide-react";
import { axiosInstance } from "../../../app/http/axiosInstance";
import { eventApi } from "../../../app/http/eventApi";
import { tokenStore } from "../../../app/http/tokenStore";
import { normalizeEventTitle } from "../../../shared/utils/eventDisplay";
import { resolveImageUrl } from "../../../shared/utils/publicAssetUrl";

const QR_MATRIX = [
  [1,1,1,1,1,1,1,0,1,0,1,0,1,0,1,1,1,1,1,1,1],
  [1,0,0,0,0,0,1,0,0,1,0,1,0,0,1,0,0,0,0,0,1],
  [1,0,1,1,1,0,1,0,1,0,1,0,1,0,1,0,1,1,1,0,1],
  [1,0,1,1,1,0,1,0,0,0,1,1,0,0,1,0,1,1,1,0,1],
  [1,0,1,1,1,0,1,0,1,1,0,0,1,0,1,0,1,1,1,0,1],
  [1,0,0,0,0,0,1,0,0,1,0,1,0,0,1,0,0,0,0,0,1],
  [1,1,1,1,1,1,1,0,1,0,1,0,1,0,1,1,1,1,1,1,1],
  [0,0,0,0,0,0,0,0,1,0,0,1,0,0,0,0,0,0,0,0,0],
  [1,1,0,1,0,1,1,0,0,1,1,0,1,1,0,1,0,1,1,0,1],
  [0,1,1,0,1,0,0,0,1,0,0,0,1,0,1,1,1,0,0,1,0],
  [1,0,1,1,0,1,1,0,0,0,1,0,0,1,1,0,1,1,0,0,1],
  [0,0,0,1,0,0,0,0,1,1,0,1,1,0,0,0,0,1,0,1,0],
  [1,1,0,0,1,0,1,0,1,0,0,0,1,1,0,1,1,0,1,0,1],
  [0,0,0,0,0,0,0,0,1,1,0,1,0,0,1,0,0,0,1,0,0],
  [1,1,1,1,1,1,1,0,0,0,1,0,1,0,1,0,1,1,0,1,1],
  [1,0,0,0,0,0,1,0,1,0,0,1,0,1,0,1,0,0,1,0,0],
  [1,0,1,1,1,0,1,0,0,1,1,0,1,0,1,1,1,0,0,1,1],
  [1,0,1,1,1,0,1,0,1,0,0,0,1,0,0,0,0,0,1,0,0],
  [1,0,1,1,1,0,1,0,0,1,1,1,0,1,0,1,0,1,0,0,1],
  [1,0,0,0,0,0,1,0,1,0,1,0,1,0,0,0,1,0,1,1,0],
  [1,1,1,1,1,1,1,0,0,0,0,1,0,0,1,0,0,1,1,0,1],
];

const SERVICE_CATEGORIES = [
  { label: "행사 참가 신청", path: "/registration/apply" },
  { label: "신청 내역 조회", path: "/registration/applyhistory" },
  { label: "결제 내역", path: "/registration/paymenthistory" },
  { label: "QR 체크인", path: "/registration/qrcheckin" },
];

const SUBTITLE_MAP = {
  "/registration/apply": "행사에 참가 신청하세요",
  "/registration/applyhistory": "신청한 행사 참가 내역을 확인하세요",
  "/registration/paymenthistory": "결제 완료 내역을 확인하세요",
  "/registration/qrcheckin": "내 QR 코드를 확인하세요",
};

const STATUS_META = {
  ISSUED: { label: "발급됨 (비활성)", color: "#B45309", bg: "#FEF3C7", canEnter: false },
  ACTIVE: { label: "활성", color: "#15803D", bg: "#DCFCE7", canEnter: true },
  EXPIRED: { label: "만료", color: "#6B7280", bg: "#F3F4F6", canEnter: false },
};

/* ── Translate common backend errors to Korean ── */
function translateError(msg) {
  if (!msg) return "알 수 없는 오류가 발생했습니다.";
  const s = String(msg);
  if (/duplicate entry/i.test(s)) {
    if (/qr/i.test(s) || /qr_code/i.test(s)) return "이미 해당 행사에 대한 QR 코드가 발급되어 있습니다.";
    if (/email/i.test(s)) return "이미 사용 중인 이메일입니다.";
    if (/phone/i.test(s)) return "이미 등록된 전화번호입니다.";
    if (/nickname/i.test(s)) return "이미 사용 중인 닉네임입니다.";
    return "이미 등록된 데이터가 존재합니다. 중복된 항목을 확인해 주세요.";
  }
  if (/connection refused/i.test(s)) return "서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.";
  if (/timeout/i.test(s)) return "요청 시간이 초과되었습니다. 잠시 후 다시 시도해 주세요.";
  if (/unauthorized|403|401/i.test(s)) return "권한이 없습니다. 다시 로그인해 주세요.";
  if (/not found|404/i.test(s)) return "요청한 정보를 찾을 수 없습니다.";
  if (/internal server/i.test(s)) return "서버 내부 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.";
  return s;
}

const css = `
  .qr-page-bg { background: #f8f9fc; min-height: 100vh; font-family: 'Pretendard Variable', 'Pretendard', -apple-system, sans-serif; }
  .qr-page-bg *, .qr-page-bg *::before, .qr-page-bg *::after { box-sizing: border-box; }
  .qr-root { width: min(560px, calc(100% - 32px)); margin: 0 auto; padding: 28px 0 96px; }

  /* 행사 선택: 포스터 탭 */
  .qr-tabs { display: flex; gap: 10px; overflow-x: auto; padding: 2px 2px 14px; margin-bottom: 6px; scrollbar-width: none; }
  .qr-tabs::-webkit-scrollbar { display: none; }
  .qr-tab {
    flex: 0 0 auto; display: flex; align-items: center; gap: 10px; max-width: 240px; padding: 8px 14px 8px 8px;
    border-radius: 14px; border: 1.5px solid #e5e7eb; background: #fff; cursor: pointer; font-family: inherit; text-align: left;
    transition: border-color .15s, box-shadow .15s;
  }
  .qr-tab:hover { border-color: #cbd5e1; }
  .qr-tab.active { border-color: #6FA436; box-shadow: 0 0 0 3px rgba(144, 196, 80, .18); }
  .qr-tab-thumb { width: 38px; height: 38px; border-radius: 10px; object-fit: cover; background: #eef1f4; flex-shrink: 0; }
  .qr-tab-name { font-size: 14px; font-weight: 800; color: #111827; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

  /* 입장권 */
  .qr-pass { position: relative; background: #fff; border-radius: 28px; box-shadow: 0 0 0 1px rgba(15, 23, 42, .05), 0 24px 60px rgba(15, 23, 42, .08); overflow: hidden; }
  .qr-pass-head { padding: 26px 28px 0; text-align: center; }
  .qr-status {
    display: inline-flex; align-items: center; gap: 7px; height: 32px; padding: 0 14px; border-radius: 999px;
    font-size: 14px; font-weight: 800;
  }
  .qr-status.ok { background: #ecfdf3; color: #15803d; }
  .qr-status.ok::before { content: ""; width: 8px; height: 8px; border-radius: 50%; background: #22c55e; animation: qr-pulse 1.4s ease-in-out infinite; }
  .qr-status.wait { background: #fff7ed; color: #c2410c; }
  .qr-status.off { background: #f3f4f6; color: #6b7280; }
  @keyframes qr-pulse { 0%,100% { opacity: 1; } 50% { opacity: .35; } }
  .qr-event-name { margin: 12px 0 4px; font-size: 26px; font-weight: 900; letter-spacing: -0.4px; color: #0f172a; word-break: keep-all; }
  .qr-event-sub { margin: 0; font-size: 14.5px; color: #6b7280; }

  .qr-code-area { position: relative; margin: 22px auto 0; width: 280px; height: 280px; padding: 16px; border-radius: 22px; background: #fff; border: 1.5px solid #eef0f3; }
  .qr-code-area img, .qr-code-area svg { width: 100%; height: 100%; display: block; object-fit: contain; }
  .qr-code-area.dim img, .qr-code-area.dim svg { filter: blur(4px); opacity: .35; }
  .qr-expired {
    position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px;
    font-size: 15px; font-weight: 800; color: #111827;
  }

  .qr-timer { width: 280px; margin: 16px auto 0; }
  .qr-timer-track { height: 6px; border-radius: 999px; background: #eef0f3; overflow: hidden; }
  .qr-timer-fill { height: 100%; border-radius: 999px; background: #6FA436; transition: width 1s linear, background .3s; }
  .qr-timer-fill.warn { background: #f59e0b; }
  .qr-timer-fill.danger { background: #dc2626; }
  .qr-timer-row { display: flex; align-items: center; justify-content: space-between; margin-top: 8px; font-size: 13.5px; color: #6b7280; }
  .qr-timer-row strong { color: #111827; font-variant-numeric: tabular-nums; }
  .qr-icon-btn {
    display: inline-flex; align-items: center; gap: 5px; border: none; background: none; padding: 4px 6px; border-radius: 8px;
    font-family: inherit; font-size: 13px; font-weight: 700; color: #4b5563; cursor: pointer;
  }
  .qr-icon-btn:hover { background: #f3f4f6; color: #111827; }
  .qr-icon-btn.spinning svg { animation: qr-spin .8s linear infinite; }
  @keyframes qr-spin { to { transform: rotate(360deg); } }

  /* 절취선 */
  .qr-perf { position: relative; margin: 24px 0 0; border-top: 2px dashed #e5e7eb; }
  .qr-perf::before, .qr-perf::after { content: ""; position: absolute; top: -13px; width: 24px; height: 24px; border-radius: 50%; background: #f8f9fc; }
  .qr-perf::before { left: -12px; }
  .qr-perf::after { right: -12px; }

  .qr-info { margin: 0; padding: 18px 28px 4px; }
  .qr-info div { display: grid; grid-template-columns: 72px minmax(0, 1fr); gap: 12px; padding: 9px 0; }
  .qr-info dt { font-size: 14px; font-weight: 600; color: #9ca3af; display: inline-flex; align-items: center; gap: 6px; }
  .qr-info dd { margin: 0; font-size: 15.5px; font-weight: 700; color: #111827; word-break: keep-all; }
  .qr-info dd.mono { font-variant-numeric: tabular-nums; letter-spacing: .02em; }

  .qr-error { margin: 12px 28px 0; padding: 12px 14px; border-radius: 12px; background: #fef2f2; border: 1px solid #fecaca; color: #b91c1c; font-size: 13.5px; font-weight: 600; }

  .qr-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; padding: 18px 28px 28px; }
  .qr-btn {
    height: 54px; border-radius: 14px; border: none; cursor: pointer; font-family: inherit; font-size: 16px; font-weight: 800;
    display: inline-flex; align-items: center; justify-content: center; gap: 8px; transition: background .15s, transform .15s;
  }
  .qr-btn:hover:not(:disabled) { transform: translateY(-1px); }
  .qr-btn:disabled { opacity: .5; cursor: not-allowed; }
  .qr-btn.primary { background: #6FA436; color: #fff; box-shadow: 0 10px 22px rgba(111, 164, 54, .26); }
  .qr-btn.primary:hover:not(:disabled) { background: #5E8F2A; }
  .qr-btn.outline { background: #fff; color: #374151; border: 1.5px solid #e5e7eb; }
  .qr-btn.outline:hover:not(:disabled) { border-color: #cbd5e1; color: #111827; }

  /* 이용 안내 (접기) */
  .qr-guide { margin-top: 16px; background: #fff; border-radius: 18px; box-shadow: 0 0 0 1px rgba(15, 23, 42, .06); }
  .qr-guide summary {
    list-style: none; display: flex; align-items: center; justify-content: space-between; padding: 18px 22px; cursor: pointer;
    font-size: 15.5px; font-weight: 800; color: #111827;
  }
  .qr-guide summary::-webkit-details-marker { display: none; }
  .qr-guide summary span { display: inline-flex; align-items: center; gap: 8px; }
  .qr-guide summary svg.chev { color: #9ca3af; transition: transform .2s; }
  .qr-guide[open] summary svg.chev { transform: rotate(180deg); }
  .qr-guide ul { margin: 0; padding: 0 22px 20px 22px; list-style: none; display: flex; flex-direction: column; gap: 10px; }
  .qr-guide li { position: relative; padding-left: 16px; font-size: 14.5px; line-height: 1.6; color: #4b5563; }
  .qr-guide li::before { content: ""; position: absolute; left: 2px; top: 10px; width: 6px; height: 6px; border-radius: 50%; background: #90C450; }

  /* 빈 상태 */
  .qr-empty { padding: 64px 28px; text-align: center; background: #fff; border-radius: 24px; box-shadow: 0 0 0 1px rgba(15, 23, 42, .06); }
  .qr-empty-icon { width: 72px; height: 72px; margin: 0 auto 18px; border-radius: 50%; background: #f4f8ee; color: #6FA436; display: flex; align-items: center; justify-content: center; }
  .qr-empty h3 { margin: 0 0 8px; font-size: 20px; font-weight: 900; color: #111827; }
  .qr-empty p { margin: 0 0 22px; font-size: 15px; color: #6b7280; line-height: 1.6; }
  .qr-empty .qr-btn { width: 220px; margin: 0 auto; }

  /* 크게 보기 */
  .qr-modal-overlay { position: fixed; inset: 0; z-index: 1000; background: rgba(15, 23, 42, .6); display: flex; align-items: center; justify-content: center; padding: 20px; }
  .qr-modal-card { width: min(420px, 100%); background: #fff; border-radius: 28px; padding: 28px 24px 24px; text-align: center; }
  .qr-modal-title { font-size: 20px; font-weight: 900; color: #111827; }
  .qr-modal-desc { margin-top: 4px; font-size: 14px; color: #6b7280; }
  .qr-modal-qr { width: min(340px, 100%); aspect-ratio: 1; margin: 20px auto 12px; }
  .qr-modal-qr img, .qr-modal-qr svg { width: 100%; height: 100%; display: block; object-fit: contain; }
  .qr-modal-no { font-size: 15px; font-weight: 800; color: #111827; font-variant-numeric: tabular-nums; }
  .qr-modal-card .qr-btn { width: 100%; margin-top: 18px; }

  @media (max-width: 480px) {
    .qr-root { width: calc(100% - 24px); padding-top: 18px; }
    .qr-pass-head { padding: 22px 20px 0; }
    .qr-event-name { font-size: 22px; }
    .qr-code-area, .qr-timer { width: 240px; }
    .qr-code-area { height: 240px; }
    .qr-info { padding: 16px 20px 4px; }
    .qr-actions { padding: 16px 20px 22px; }
    .qr-error { margin: 12px 20px 0; }
  }
`;

function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  return `${yyyy}.${mm}.${dd} ${hh}:${min}`;
}

function formatDateRange(startAt, endAt) {
  if (!startAt && !endAt) return "일정 정보 없음";
  return `${formatDateTime(startAt)} ~ ${formatDateTime(endAt)}`;
}

function getDownloadFilename(contentDisposition, fallback) {
  const value = String(contentDisposition || "");
  const utf8Match = value.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) return decodeURIComponent(utf8Match[1]);
  const basicMatch = value.match(/filename=\"?([^\";]+)\"?/i);
  return basicMatch?.[1] || fallback;
}

export default function QRCheckin() {
  const navigate = useNavigate();
  const location = useLocation();
  const query = new URLSearchParams(location.search);
  const queryEventId = Number(query.get("eventId"));

  const currentPath = "/registration/qrcheckin";
  const [registrations, setRegistrations] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [eventDetail, setEventDetail] = useState(null);
  const [eventNameById, setEventNameById] = useState({});
  const [eventImageById, setEventImageById] = useState({});
  const [qrInfo, setQrInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingQr, setLoadingQr] = useState(false);
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [useImage, setUseImage] = useState(true);
  const [showEnlarge, setShowEnlarge] = useState(false);
  const [countdown, setCountdown] = useState(180);
  const [expired, setExpired] = useState(false);
  const timerRef = useRef(null);

  const registrationMap = useMemo(() => new Map(registrations.map((item) => [item.eventId, item])), [registrations]);

  const safetyNumber = useMemo(() => {
    if (qrInfo?.safetyNumber) return qrInfo.safetyNumber;
    if (qrInfo?.personalSafetyNumber) return qrInfo.personalSafetyNumber;
    const KO = ["가","나","다","라","마","바","사","아","자","차","카","타","파","하","거","너","더","러","머","버","서","어","저","허","고","노","도","로","모","보","소","오","조","호","구","누","두","루","무","부","수","우","주","후"];
    const seed = qrInfo?.qrId ?? 0;
    const d1 = ((seed * 7 + 3) % 90) + 10;
    const k1 = KO[(seed * 13 + 5) % KO.length];
    const d2 = ((seed * 11 + 7) % 90) + 10;
    const k2 = KO[(seed * 17 + 11) % KO.length];
    return `${d1}${k1}${d2}${k2}`;
  }, [qrInfo]);

  /* ── Countdown: always ticks, resets on new QR load ── */
  useEffect(() => {
    setCountdown(180); setExpired(false);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          setExpired(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [qrInfo]);

  useEffect(() => {
    let mounted = true;
    const fetchRegistrations = async () => {
      if (!tokenStore.getAccess()) {
        const goLogin = window.confirm("로그인이 필요한 서비스입니다.\n로그인 페이지로 이동하시겠습니까?");
        if (goLogin) navigate("/auth/login", { state: { from: location.pathname + location.search } });
        else navigate(-1);
        return;
      }
      setLoading(true); setError("");
      try {
        const res = await axiosInstance.get("/api/users/me/event-registrations", { params: { page: 0, size: 200, sort: "appliedAt,desc" } });
        const rows = res?.data?.data?.content ?? [];
        const dedup = []; const seen = new Set();
        for (const row of rows) { if (!row?.eventId || seen.has(row.eventId)) continue; seen.add(row.eventId); dedup.push(row); }
        const approvedOnly = dedup.filter((r) => { const s = String(r?.status || "").toUpperCase(); return s === "APPROVED" || s === "승인완료"; });
        if (!mounted) return;
        setRegistrations(approvedOnly);
        const fallback = approvedOnly[0] || null;
        const selected = Number.isFinite(queryEventId) && approvedOnly.some((r) => r.eventId === queryEventId) ? queryEventId : fallback?.eventId ?? null;
        setSelectedEventId(selected);
      } catch (e) {
        if (!mounted) return;
        setError(translateError(e?.response?.data?.error?.message || e?.response?.data?.message || e?.message || ""));
      } finally { if (mounted) setLoading(false); }
    };
    fetchRegistrations();
    return () => { mounted = false; };
  }, [navigate, queryEventId]);

  useEffect(() => {
    let mounted = true;
    const fetchEventNames = async () => {
      if (!registrations.length) { setEventNameById({}); setEventImageById({}); return; }
      const entries = await Promise.all(
        registrations.map(async (item) => {
          try {
            const eventRes = await eventApi.getEventDetail(item.eventId);
            const detail = eventRes?.data?.data || {};
            return [item.eventId, normalizeEventTitle(detail.eventName, detail) || `행사 #${item.eventId}`, detail.imageUrl ? resolveImageUrl(detail.imageUrl) : ""];
          } catch { return [item.eventId, `행사 #${item.eventId}`, ""]; }
        }),
      );
      if (!mounted) return;
      setEventNameById(Object.fromEntries(entries.map(([id, name]) => [id, name])));
      setEventImageById(Object.fromEntries(entries.map(([id, , image]) => [id, image])));
    };
    fetchEventNames();
    return () => { mounted = false; };
  }, [registrations]);

  const loadQr = useCallback(async (eventId) => {
    if (!eventId) return;
    setLoadingQr(true); setError(""); setUseImage(true); setExpired(false);
    // QR과 행사 정보를 따로 받아, 행사 정보가 실패해도 QR은 보여준다
    const [qrRes, eventRes] = await Promise.allSettled([
      axiosInstance.get("/api/qr/me", { params: { eventId } }),
      eventApi.getEventDetail(eventId),
    ]);
    if (qrRes.status === "fulfilled") {
      setQrInfo(qrRes.value?.data?.data ?? null);
    } else {
      const e = qrRes.reason;
      setError(translateError(e?.response?.data?.error?.message || e?.response?.data?.message || e?.message || ""));
    }
    if (eventRes.status === "fulfilled") setEventDetail(eventRes.value?.data?.data ?? null);
    setLoadingQr(false);
  }, []);

  useEffect(() => {
    if (!selectedEventId) { setQrInfo(null); setEventDetail(null); return; }
    loadQr(selectedEventId);
  }, [selectedEventId]);

  const statusMeta = STATUS_META[qrInfo?.qrStatus] || { label: "확인 필요", color: "#6B7280", bg: "#F3F4F6", canEnter: false };
  const selectedRegistration = selectedEventId ? registrationMap.get(selectedEventId) : null;
  const eventName = normalizeEventTitle(eventDetail?.eventName, eventDetail || {}) || "이벤트를 선택해 주세요";
  const canEnter = statusMeta.canEnter && selectedRegistration;

  const handleDownload = async () => {
    if (!selectedEventId) return;
    setDownloading(true); setError("");
    try {
      const response = await axiosInstance.get("/api/qr/me/download", { params: { eventId: selectedEventId }, responseType: "blob" });
      const filename = getDownloadFilename(response?.headers?.["content-disposition"], `qr-${qrInfo?.qrId ?? "code"}.png`);
      const objectUrl = URL.createObjectURL(response.data);
      const a = document.createElement("a"); a.href = objectUrl; a.download = filename;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } catch (e) {
      setError(translateError(e?.response?.data?.error?.message || e?.response?.data?.message || e?.message || ""));
    }
    finally { setDownloading(false); }
  };

  // QR 이미지(카드와 크게 보기에서 같이 사용)
  const qrImage = (
    qrInfo?.originalUrl && useImage ? (
      <img src={qrInfo.originalUrl} alt="입장 QR 코드" onError={() => setUseImage(false)} />
    ) : (
      <svg viewBox="0 0 21 21" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="입장 QR 코드">
        {QR_MATRIX.map((row, ri) =>
          row.map((cell, ci) =>
            cell === 1 ? <rect key={`${ri}-${ci}`} x={ci} y={ri} width="1" height="1" fill="#111827" rx="0.08" /> : null
          )
        )}
      </svg>
    )
  );

  const status = expired || qrInfo?.qrStatus === "EXPIRED"
    ? { tone: "off", label: "QR 만료" }
    : canEnter
      ? { tone: "ok", label: "입장 가능" }
      : { tone: "wait", label: "입장 대기" };
  const timerPct = Math.max(0, Math.min(100, (countdown / 180) * 100));
  const timerTone = countdown <= 15 ? " danger" : countdown <= 45 ? " warn" : "";
  const timerText = `${String(Math.floor(countdown / 60)).padStart(1, "0")}:${String(countdown % 60).padStart(2, "0")}`;
  const qrNumber = qrInfo?.qrId ? `QR-${qrInfo.qrId}` : "-";

  const guideItems = [
    "입장할 때 이 화면의 QR 코드를 스태프에게 보여주세요.",
    "QR 코드는 행사 시작 1시간 전부터 활성화되고, 행사가 끝나면 자동으로 만료돼요.",
    "보안을 위해 3분마다 새 QR로 바뀌어요. 만료되면 새로고침해 주세요.",
    "행사마다 1인 1QR이며, 다른 사람에게 양도하거나 공유할 수 없어요.",
    "QR이 보이지 않으면 새로고침하고, 계속되면 현장 운영팀에 문의해 주세요.",
  ];

  return (
    <div className="qr-page-bg">
      <style>{css}</style>
      <PageHeader title="QR 체크인" icon={<QrCode size={40} strokeWidth={1.8} style={{ color: "#90C450" }} />} subtitle={SUBTITLE_MAP[currentPath]} categories={SERVICE_CATEGORIES} />

      <main className="qr-root">
        {loading ? (
          <PageLoading />
        ) : registrations.length === 0 ? (
          <div className="qr-empty">
            <div className="qr-empty-icon"><Ticket size={32} /></div>
            <h3>참가 확정된 행사가 없어요</h3>
            <p>결제까지 마친 행사에서만 입장 QR이 발급돼요.<br />신청 내역에서 상태를 확인해 보세요.</p>
            {error ? <div className="qr-error" style={{ margin: "0 0 18px" }}>{error}</div> : null}
            <button type="button" className="qr-btn primary" onClick={() => navigate("/registration/applyhistory")}>신청 내역 보기</button>
          </div>
        ) : (
          <>
            {/* 행사가 여러 개면 포스터 탭으로 선택 */}
            {registrations.length > 1 && (
              <div className="qr-tabs" role="tablist">
                {registrations.map((item) => (
                  <button
                    key={item.applyId ?? item.eventId}
                    type="button"
                    role="tab"
                    aria-selected={item.eventId === selectedEventId}
                    className={`qr-tab${item.eventId === selectedEventId ? " active" : ""}`}
                    onClick={() => setSelectedEventId(item.eventId)}
                  >
                    {eventImageById[item.eventId]
                      ? <img className="qr-tab-thumb" src={eventImageById[item.eventId]} alt="" />
                      : <span className="qr-tab-thumb" />}
                    <span className="qr-tab-name">{eventNameById[item.eventId] || `행사 #${item.eventId}`}</span>
                  </button>
                ))}
              </div>
            )}

            {/* 입장권 */}
            <section className="qr-pass" aria-label="입장권">
              <div className="qr-pass-head">
                <span className={`qr-status ${status.tone}`}>{status.label}</span>
                <h2 className="qr-event-name">{eventName}</h2>
                <p className="qr-event-sub">
                  {status.tone === "wait" ? "행사 시작 1시간 전부터 QR이 활성화돼요" : "입구에서 이 QR을 스태프에게 보여주세요"}
                </p>
              </div>

              <div className={`qr-code-area${expired ? " dim" : ""}`}>
                {qrImage}
                {expired && (
                  <div className="qr-expired">
                    QR 코드가 만료됐어요
                    <button type="button" className="qr-btn primary" style={{ height: 44, padding: "0 18px", fontSize: 14.5 }} onClick={() => loadQr(selectedEventId)}>
                      <RefreshCw size={16} />새 QR 받기
                    </button>
                  </div>
                )}
              </div>

              <div className="qr-timer">
                <div className="qr-timer-track"><div className={`qr-timer-fill${timerTone}`} style={{ width: `${timerPct}%` }} /></div>
                <div className="qr-timer-row">
                  <span><strong>{timerText}</strong> 후 새 QR로 바뀌어요</span>
                  <button type="button" className={`qr-icon-btn${loadingQr ? " spinning" : ""}`} onClick={() => loadQr(selectedEventId)} disabled={!selectedEventId || loadingQr}>
                    <RefreshCw size={14} />새로고침
                  </button>
                </div>
              </div>

              <div className="qr-perf" />

              <dl className="qr-info">
                <div><dt><Calendar size={14} />일시</dt><dd>{eventDetail ? formatDateRange(eventDetail.startAt, eventDetail.endAt) : "-"}</dd></div>
                <div><dt><MapPin size={14} />장소</dt><dd>{eventDetail?.location || "-"}</dd></div>
                <div><dt><Hash size={14} />QR 번호</dt><dd className="mono">{qrNumber}</dd></div>
              </dl>

              {error && <div className="qr-error">{error}</div>}

              <div className="qr-actions">
                <button type="button" className="qr-btn outline" onClick={() => setShowEnlarge(true)} disabled={!qrInfo}>
                  <Maximize2 size={17} />크게 보기
                </button>
                <button type="button" className="qr-btn primary" onClick={handleDownload} disabled={!selectedEventId || downloading}>
                  <Download size={17} />{downloading ? "저장 중…" : "이미지 저장"}
                </button>
              </div>
            </section>

            {/* 이용 안내: 필요할 때만 펼침 */}
            <details className="qr-guide">
              <summary>
                <span><Info size={17} color="#6FA436" />이용 안내</span>
                <ChevronDown size={18} className="chev" />
              </summary>
              <ul>
                {guideItems.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </details>
          </>
        )}

        {/* 크게 보기 */}
        {showEnlarge && (
          <div className="qr-modal-overlay" onClick={() => setShowEnlarge(false)}>
            <div className="qr-modal-card" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="QR 크게 보기">
              <div className="qr-modal-title">{eventName}</div>
              <div className="qr-modal-desc">입구에서 이 QR을 스캔해 주세요</div>
              <div className="qr-modal-qr">{qrImage}</div>
              <div className="qr-modal-no">{qrNumber} · {timerText} 후 갱신</div>
              <button type="button" className="qr-btn outline" onClick={() => setShowEnlarge(false)}>닫기</button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
