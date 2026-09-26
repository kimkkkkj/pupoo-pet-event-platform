import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ClipboardList, QrCode, Inbox, CalendarDays, MapPin, Clock, Search, CreditCard, RotateCcw } from "lucide-react";
import PageHeader from "../components/PageHeader";
import PageLoading from "../components/PageLoading";
import { axiosInstance } from "../../../app/http/axiosInstance";
import { eventApi } from "../../../app/http/eventApi";
import { tokenStore } from "../../../app/http/tokenStore";
import { resolveImageUrl } from "../../../shared/utils/publicAssetUrl";

const SERVICE_CATEGORIES = [
  { label: "행사 참가 신청", path: "/registration/apply" },
  { label: "신청 내역 조회", path: "/registration/applyhistory" },
  { label: "결제 내역", path: "/registration/paymenthistory" },
  { label: "QR 체크인", path: "/registration/qrcheckin" },
];

const SUBTITLE_MAP = {
  "/registration/apply": "행사에 참가 신청하세요",
  "/registration/applyhistory": "나의 행사 참가 신청 이력을 확인하세요",
  "/registration/paymenthistory": "결제 완료된 내역을 확인하세요",
  "/registration/qrcheckin": "내 QR 코드를 확인하세요",
};

// 참가 신청 화면과 같은 말: 신청만 한 상태 = 결제 대기, 승인 = 참가 확정
const STATUS_META = {
  APPLIED: { label: "결제 대기", tone: "pending" },
  APPROVED: { label: "참가 확정", tone: "done" },
  CANCELLED: { label: "신청 취소", tone: "off" },
  REJECTED: { label: "승인 거절", tone: "off" },
};

const FILTERS = [
  { key: "all", label: "전체" },
  { key: "APPROVED", label: "참가 확정" },
  { key: "APPLIED", label: "결제 대기" },
  { key: "ENDED", label: "취소 · 거절" },
];

const matchesFilter = (record, key) => {
  if (key === "all") return true;
  if (key === "ENDED") return record.status === "CANCELLED" || record.status === "REJECTED";
  return record.status === key;
};

const styles = `
  .ah-root { box-sizing: border-box; font-family: 'Pretendard Variable', 'Pretendard', -apple-system, sans-serif; background: #f8f9fc; min-height: 100vh; color: #111827; }
  .ah-root *, .ah-root *::before, .ah-root *::after { box-sizing: border-box; font-family: inherit; }
  .ah-wrap { width: min(1400px, calc(100% - 48px)); margin: 0 auto; padding: 8px 0 96px; }

  /* 요약: 큼직한 숫자 카드 */
  .ah-summary { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; margin: 28px 0 24px; }
  .ah-stat {
    display: flex; flex-direction: column; gap: 6px; padding: 20px 22px; border-radius: 18px; border: none; text-align: left;
    background: #fff; box-shadow: 0 0 0 1px rgba(15, 23, 42, .06); cursor: pointer; transition: box-shadow .15s, transform .15s;
  }
  .ah-stat:hover { transform: translateY(-1px); box-shadow: 0 0 0 1px rgba(15, 23, 42, .1), 0 8px 20px rgba(15, 23, 42, .06); }
  .ah-stat.active { box-shadow: 0 0 0 2px #111827; }
  .ah-stat-label { font-size: 14px; font-weight: 700; color: #6b7280; display: inline-flex; align-items: center; gap: 7px; }
  .ah-stat-label i { width: 8px; height: 8px; border-radius: 50%; background: #d1d5db; }
  .ah-stat-val { font-size: 34px; font-weight: 900; letter-spacing: -0.5px; line-height: 1.1; color: #111827; }
  .ah-stat-val small { font-size: 16px; font-weight: 700; color: #9ca3af; margin-left: 3px; }
  .ah-stat.done .ah-stat-label i { background: #22c55e; }
  .ah-stat.pending .ah-stat-label i { background: #dc2626; }
  .ah-stat.pending .ah-stat-val { color: #dc2626; }

  /* 툴바 */
  .ah-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; }
  .ah-search { position: relative; width: 380px; max-width: 100%; }
  .ah-search svg { position: absolute; left: 16px; top: 50%; transform: translateY(-50%); color: #9ca3af; pointer-events: none; }
  .ah-search input {
    width: 100%; height: 50px; padding: 0 16px 0 44px; border-radius: 14px; border: 1.5px solid #e5e7eb; background: #fff;
    font-size: 15px; color: #111827; outline: none; transition: border-color .15s, box-shadow .15s;
  }
  .ah-search input:focus { border-color: #90C450; box-shadow: 0 0 0 4px rgba(144, 196, 80, .16); }
  .ah-search input::placeholder { color: #9ca3af; }
  .ah-filters { display: flex; gap: 6px; flex-wrap: wrap; }
  .ah-filter {
    height: 42px; padding: 0 16px; border-radius: 999px; border: 1.5px solid #e5e7eb; background: #fff;
    font-size: 14.5px; font-weight: 700; color: #4b5563; cursor: pointer; display: inline-flex; align-items: center; gap: 6px;
  }
  .ah-filter:hover { border-color: #cbd5e1; color: #111827; }
  .ah-filter.active { background: #111827; border-color: #111827; color: #fff; }
  .ah-filter em { font-style: normal; font-size: 12.5px; font-weight: 800; opacity: .7; }

  /* 카드 */
  .ah-list { display: flex; flex-direction: column; gap: 14px; }
  .ah-card {
    display: grid; grid-template-columns: 120px minmax(0, 1fr) auto; align-items: stretch;
    background: #fff; border-radius: 20px; overflow: hidden; box-shadow: 0 0 0 1px rgba(15, 23, 42, .06), 0 6px 18px rgba(15, 23, 42, .04);
  }
  .ah-card.pending { box-shadow: 0 0 0 1.5px #fecaca, 0 6px 18px rgba(220, 38, 38, .06); }
  .ah-thumb { position: relative; background: #eef1f4; overflow: hidden; min-height: 150px; }
  .ah-thumb img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
  .ah-card.off .ah-thumb img { filter: grayscale(1); opacity: .7; }
  .ah-body { padding: 22px 26px; display: flex; flex-direction: column; justify-content: center; gap: 10px; min-width: 0; }
  .ah-head { display: flex; align-items: center; gap: 10px; min-width: 0; }
  .ah-chip { flex-shrink: 0; display: inline-flex; align-items: center; gap: 6px; height: 28px; padding: 0 12px; border-radius: 999px; font-size: 13px; font-weight: 800; }
  .ah-chip.done { background: #ecfdf3; color: #15803d; }
  .ah-chip.pending { background: #dc2626; color: #fff; }
  .ah-chip.pending::before { content: ""; width: 6px; height: 6px; border-radius: 50%; background: #fff; animation: ah-pulse 1.4s ease-in-out infinite; }
  .ah-chip.off { background: #f3f4f6; color: #6b7280; }
  @keyframes ah-pulse { 0%,100% { opacity: 1; } 50% { opacity: .35; } }
  .ah-title { font-size: 21px; font-weight: 900; letter-spacing: -0.3px; color: #0f172a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .ah-card.off .ah-title { color: #6b7280; }
  .ah-meta { display: flex; flex-wrap: wrap; gap: 6px 18px; }
  .ah-meta span { display: inline-flex; align-items: center; gap: 7px; font-size: 15px; font-weight: 500; color: #4b5563; }
  .ah-meta svg { color: #9ca3af; flex-shrink: 0; }
  .ah-meta .applied { font-size: 13.5px; color: #9ca3af; }

  .ah-action { display: flex; align-items: center; padding: 22px 26px 22px 0; }
  .ah-btn {
    height: 50px; padding: 0 22px; border-radius: 14px; border: none; cursor: pointer; white-space: nowrap;
    display: inline-flex; align-items: center; justify-content: center; gap: 8px; font-size: 15.5px; font-weight: 800;
    transition: background .15s, transform .15s;
  }
  .ah-btn:hover { transform: translateY(-1px); }
  .ah-btn.qr { background: #6FA436; color: #fff; box-shadow: 0 8px 18px rgba(111, 164, 54, .26); }
  .ah-btn.qr:hover { background: #5E8F2A; }
  .ah-btn.pay { background: #111827; color: #fff; box-shadow: 0 8px 18px rgba(17, 24, 39, .18); }
  .ah-btn.pay:hover { background: #000; }
  .ah-btn.ghost { background: #fff; color: #4b5563; border: 1.5px solid #e5e7eb; }
  .ah-btn.ghost:hover { border-color: #cbd5e1; color: #111827; }

  /* 빈 상태·오류: 결제 내역 화면과 같은 모양 */
  .ah-empty { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 80px 20px; color: #d1d5db; }
  .ah-empty span { font-size: 15px; color: #9ca3af; font-weight: 500; }
  .ah-empty button { margin-top: 6px; }

  @media (max-width: 860px) {
    .ah-summary { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .ah-toolbar { flex-direction: column; align-items: stretch; }
    .ah-search { width: 100%; }
    .ah-card { grid-template-columns: 96px minmax(0, 1fr); }
    .ah-action { grid-column: 1 / -1; padding: 0 18px 18px; }
    .ah-btn { width: 100%; }
  }
  @media (max-width: 600px) {
    .ah-wrap { width: calc(100% - 28px); padding-bottom: 56px; }
    .ah-stat { padding: 16px; }
    .ah-stat-val { font-size: 28px; }
    .ah-body { padding: 16px; }
    .ah-head { flex-direction: column; align-items: flex-start; gap: 6px; }
    .ah-title { font-size: 18px; white-space: normal; }
    .ah-meta span { font-size: 14px; }
    .ah-thumb { min-height: 130px; }
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

function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`;
}

export default function ApplyHistory() {
  const navigate = useNavigate();
  const currentPath = "/registration/applyhistory";
  const [records, setRecords] = useState([]);
  const [filter, setFilter] = useState("all");
  const [searchKeyword, setSearchKeyword] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    const fetchHistory = async () => {
      if (!tokenStore.getAccess()) {
        setRecords([]);
        setLoading(false);
        setError("로그인이 필요합니다.");
        return;
      }

      setLoading(true);
      setError("");

      try {
        const res = await axiosInstance.get("/api/users/me/event-registrations", {
          params: { page: 0, size: 200, sort: "appliedAt,desc" },
        });

        const rawItems = res?.data?.data?.content ?? [];
        const eventIds = [...new Set(rawItems.map((item) => item.eventId).filter(Boolean))];

        const eventResults = await Promise.all(
          eventIds.map(async (eventId) => {
            try {
              const detail = await eventApi.getEventDetail(eventId);
              return [eventId, detail?.data?.data ?? null];
            } catch {
              return [eventId, null];
            }
          }),
        );

        const eventMap = new Map(eventResults);

        const mapped = rawItems.map((item) => {
          const detail = eventMap.get(item.eventId) || {};
          return {
            id: item.applyId,
            eventId: item.eventId,
            eventName: detail.eventName || `행사 #${item.eventId}`,
            status: item.status,
            appliedAt: item.appliedAt,
            startAt: detail.startAt,
            endAt: detail.endAt,
            location: detail.location || "장소 미정",
            imageUrl: detail.imageUrl ? resolveImageUrl(detail.imageUrl) : "",
            baseFee: Number(detail.baseFee ?? 0),
          };
        });

        if (!mounted) return;
        setRecords(mapped);
      } catch (e) {
        if (!mounted) return;
        setError(
          e?.response?.data?.error?.message ||
          e?.response?.data?.message ||
          "신청 내역을 불러오지 못했습니다."
        );
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchHistory();
    return () => { mounted = false; };
  }, []);

  const filtered = useMemo(() => {
    const keyword = searchKeyword.trim().toLowerCase();
    return records.filter((r) =>
      matchesFilter(r, filter) &&
      (!keyword || r.eventName.toLowerCase().includes(keyword) || r.location.toLowerCase().includes(keyword)),
    );
  }, [filter, records, searchKeyword]);

  const counts = useMemo(() => {
    const c = (key) => records.filter((r) => matchesFilter(r, key)).length;
    return { all: records.length, APPROVED: c("APPROVED"), APPLIED: c("APPLIED"), ENDED: c("ENDED") };
  }, [records]);

  const goCheckout = (record) => {
    const params = new URLSearchParams({
      eventId: String(record.eventId),
      amount: String(Number.isFinite(record.baseFee) ? record.baseFee : 0),
      title: record.eventName,
      returnUrl: currentPath,
    });
    navigate(`/payment/checkout?${params.toString()}`);
  };

  const summary = [
    { key: "all", label: "전체 신청", tone: "" },
    { key: "APPROVED", label: "참가 확정", tone: "done" },
    { key: "APPLIED", label: "결제 대기", tone: "pending" },
    { key: "ENDED", label: "취소 · 거절", tone: "" },
  ];

  return (
    <div className="ah-root">
      <style>{styles}</style>

      <PageHeader
        title="신청 내역 조회"
        icon={<ClipboardList size={40} strokeWidth={1.8} style={{ color: "#90C450" }} />}
        subtitle={SUBTITLE_MAP[currentPath]}
        categories={SERVICE_CATEGORIES}
        bgColor="#f8f9fc"
      />

      <div className="ah-wrap">
        {/* 요약: 누르면 해당 상태만 보기 */}
        <div className="ah-summary">
          {summary.map((s) => (
            <button
              key={s.key}
              type="button"
              className={`ah-stat ${s.tone}${filter === s.key ? " active" : ""}`}
              onClick={() => setFilter(s.key)}
            >
              <span className="ah-stat-label"><i />{s.label}</span>
              <span className="ah-stat-val">{counts[s.key]}<small>건</small></span>
            </button>
          ))}
        </div>

        {/* 검색 + 필터 */}
        <div className="ah-toolbar">
          <div className="ah-search">
            <Search size={17} />
            <input type="text" value={searchKeyword} onChange={(e) => setSearchKeyword(e.target.value)} placeholder="행사명 또는 장소로 검색" />
          </div>
          <div className="ah-filters">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                className={`ah-filter${filter === f.key ? " active" : ""}`}
                onClick={() => setFilter(f.key)}
                type="button"
              >{f.label}<em>{counts[f.key]}</em></button>
            ))}
          </div>
        </div>

        {/* 리스트 */}
        {loading ? (
          <PageLoading />
        ) : (error || filtered.length === 0) ? (
          <div className="ah-empty">
            <Inbox size={48} strokeWidth={1.2} />
            <span>{error || (records.length ? "조건에 맞는 신청 내역이 없습니다." : "아직 신청한 행사가 없어요.")}</span>
            {!error && !records.length && (
              <button type="button" className="ah-btn qr" onClick={() => navigate("/registration/apply")}>행사 둘러보기</button>
            )}
          </div>
        ) : (
          <div className="ah-list">
            {filtered.map((record) => {
              const meta = STATUS_META[record.status] || { label: record.status, tone: "off" };
              const period = record.startAt ? `${formatDate(record.startAt)} ~ ${formatDate(record.endAt)}` : "일정 미정";
              return (
                <div key={record.id} className={`ah-card ${meta.tone}`}>
                  <div className="ah-thumb">
                    {record.imageUrl ? <img src={record.imageUrl} alt="" loading="lazy" /> : null}
                  </div>

                  <div className="ah-body">
                    <div className="ah-head">
                      <span className={`ah-chip ${meta.tone}`}>{meta.label}</span>
                      <span className="ah-title">{record.eventName}</span>
                    </div>
                    <div className="ah-meta">
                      <span><CalendarDays size={16} />{period}</span>
                      <span><MapPin size={16} />{record.location}</span>
                      <span className="applied"><Clock size={14} />신청 {formatDateTime(record.appliedAt)}</span>
                    </div>
                  </div>

                  {/* 상태별 다음 행동 */}
                  <div className="ah-action">
                    {record.status === "APPROVED" ? (
                      <button className="ah-btn qr" type="button" onClick={() => navigate(`/registration/qrcheckin?eventId=${record.eventId}`)}>
                        <QrCode size={18} />QR 체크인
                      </button>
                    ) : record.status === "APPLIED" ? (
                      <button className="ah-btn pay" type="button" onClick={() => goCheckout(record)}>
                        <CreditCard size={18} />결제하기
                      </button>
                    ) : (
                      <button className="ah-btn ghost" type="button" onClick={() => navigate("/registration/apply")}>
                        <RotateCcw size={16} />다시 신청
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
