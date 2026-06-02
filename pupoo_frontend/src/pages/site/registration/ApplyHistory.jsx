import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ClipboardList, QrCode, Inbox, CalendarDays, MapPin, Clock, Search } from "lucide-react";
import PageHeader from "../components/PageHeader";
import PageLoading from "../components/PageLoading";
import { axiosInstance } from "../../../app/http/axiosInstance";
import { eventApi } from "../../../app/http/eventApi";
import { tokenStore } from "../../../app/http/tokenStore";

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

const STATUS_META = {
  APPLIED: { label: "신청 완료", bg: "#f0fdf4", color: "#90C450", border: "#bbf7d0" },
  APPROVED: { label: "승인 완료", bg: "#E6F7F2", color: "#90C450", border: "#CCF0E4" },
  CANCELLED: { label: "신청 취소", bg: "#fef2f2", color: "#ef4444", border: "#fecaca" },
  REJECTED: { label: "승인 거절", bg: "#f9fafb", color: "#6b7280", border: "#e5e7eb" },
};

const FILTERS = [
  { key: "all", label: "전체" },
  { key: "APPLIED", label: "신청" },
  { key: "APPROVED", label: "승인" },
  { key: "CANCELLED", label: "취소" },
  { key: "REJECTED", label: "거절" },
];

const styles = `
  .ah-root {
    box-sizing: border-box;
    font-family: 'Pretendard Variable', 'Pretendard', -apple-system, sans-serif;
    background: #fff;
    min-height: 100vh;
    color: #111;
  }
  .ah-root *, .ah-root *::before, .ah-root *::after { box-sizing: border-box; font-family: inherit; }
  .ah-wrap {
    width: min(1400px, calc(100% - 48px));
    margin: 0 auto;
    padding: 0 0 80px;
  }

  /* ── 상단 요약 (카카오 st) ── */
  .ah-summary {
    display: flex;
    gap: 0;
    margin: 32px 0;
    background: #fff;
    border: 1px solid #e5e7eb;
    border-radius: 14px;
    overflow: hidden;
  }
  .ah-summary-card {
    flex: 1;
    padding: 24px 20px;
    display: flex;
    align-items: center;
    gap: 16px;
    border-right: 1px solid #e5e7eb;
  }
  .ah-summary-card:last-child { border-right: none; }
  .ah-summary-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    flex-shrink: 0;
    background: #d1d5db;
  }
  .ah-summary-dot.dot-blue { background: #90C450; }
  .ah-summary-dot.dot-red { background: #ef4444; }
  .ah-summary-text {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .ah-summary-label {
    font-size: 13px;
    font-weight: 500;
    color: #888;
  }
  .ah-summary-val {
    font-size: 24px;
    font-weight: 800;
    color: #222;
    letter-spacing: -0.02em;
    line-height: 1.2;
  }

  /* ── 툴바: 좌 검색 + 우 필터 ── */
  .ah-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 18px;
    gap: 14px;
    flex-wrap: wrap;
  }
  .ah-toolbar-left {
    display: flex;
    align-items: center;
    gap: 0;
    background: #fff;
    border: 1px solid #e2e5ea;
    border-radius: 12px;
    height: 48px;
    width: 420px;
    transition: border-color 0.15s, box-shadow 0.15s;
  }
  .ah-toolbar-left:focus-within {
    border-color: #111827;
    box-shadow: 0 0 0 2px rgba(17,24,39,0.08);
  }
  .ah-search-wrap {
    position: relative;
    display: flex;
    align-items: center;
    flex: 1;
    height: 100%;
  }
  .ah-search-icon {
    position: absolute;
    left: 14px;
    top: 50%;
    transform: translateY(-50%);
    color: #9ca3af;
    pointer-events: none;
  }
  .ah-search-input {
    height: 100%;
    width: 100%;
    padding: 0 16px 0 40px;
    border-radius: 12px;
    border: none;
    background: transparent;
    color: #111827;
    font-size: 14px;
    font-weight: 500;
    outline: none;
    font-family: inherit;
  }
  .ah-search-input::placeholder { color: #9ca3af; font-size: 13px; font-weight: 500; }
  .ah-filters {
    display: flex;
    align-items: center;
    gap: 0;
    border: 1px solid #e5e7eb;
    border-radius: 12px;
    overflow: hidden;
  }
  .ah-filter {
    height: 44px; padding: 0 20px; border: none;
    background: transparent; color: #6b7280; font-size: 14px; font-weight: 600;
    cursor: pointer; transition: all 0.15s; font-family: inherit;
    white-space: nowrap; display: inline-flex; align-items: center; gap: 6px;
  }
  .ah-filter + .ah-filter { border-left: 1px solid #e5e7eb; }
  .ah-filter:hover { color: #111827; background: #f9fafb; }
  .ah-filter.active {
    background: #1f2937;
    color: #fff;
  }

  /* ── 카드 리스트 ── */
  .ah-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .ah-card {
    display: flex;
    align-items: center;
    gap: 24px;
    padding: 28px 32px;
    border: 1px solid #f0f0f0;
    border-radius: 16px;
    background: #fff;
    transition: all 0.15s;
    cursor: pointer;
  }
  .ah-card:hover {
    background: #f9fafb;
  }
  .ah-card-status {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    width: 80px;
    flex-shrink: 0;
    gap: 4px;
  }
  .ah-status-dot {
    width: 12px;
    height: 12px;
    border-radius: 50%;
  }
  .ah-status-label {
    font-size: 14px;
    font-weight: 700;
  }
  .ah-card-body {
    flex: 1;
    min-width: 0;
  }
  .ah-card-title {
    font-size: 19px;
    font-weight: 800;
    color: #111;
    margin-bottom: 12px;
    line-height: 1.3;
  }
  .ah-card-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
  }
  .ah-meta-item {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 15px;
    color: #6b7280;
    font-weight: 500;
  }
  .ah-meta-item svg {
    color: #9ca3af;
    flex-shrink: 0;
  }
  .ah-card-actions {
    display: flex;
    flex-shrink: 0;
  }
  .ah-qr-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    padding: 14px 28px;
    border-radius: 14px;
    border: none;
    background: linear-gradient(135deg, #90C450 0%, #3DBFA0 100%);
    color: #fff;
    font-size: 15px;
    font-weight: 700;
    cursor: pointer;
    font-family: inherit;
    transition: all 0.2s;
    white-space: nowrap;
    box-shadow: 0 4px 14px rgba(59, 109, 245, 0.25);
  }
  .ah-qr-btn:hover {
    transform: translateY(-1px);
    box-shadow: 0 6px 20px rgba(59, 109, 245, 0.35);
  }
  .ah-qr-btn:active {
    transform: translateY(0);
  }
  .ah-qr-btn svg {
    flex-shrink: 0;
  }

  /* ── 빈 상태 ── */
  .ah-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 80px 20px;
    gap: 12px;
    color: #d1d5db;
  }
  .ah-empty span {
    font-size: 15px;
    color: #9ca3af;
    font-weight: 500;
  }

  @media (max-width: 768px) {
    .ah-summary { flex-direction: column; }
    .ah-summary-card { border-right: none; border-bottom: 1px solid #e5e7eb; }
    .ah-summary-card:last-child { border-bottom: none; }
    .ah-card {
      flex-direction: column;
      align-items: flex-start;
      gap: 14px;
    }
    .ah-card-status {
      flex-direction: row;
      width: auto;
      gap: 8px;
    }
    .ah-card-actions {
      width: 100%;
    }
    .ah-qr-btn { width: 100%; justify-content: center; }
    .ah-toolbar { flex-direction: column; align-items: stretch; gap: 10px; }
    .ah-toolbar-left { width: 100%; }
    .ah-filters { width: 100%; }
    .ah-filter { flex: 1; justify-content: center; padding: 0 10px; height: 40px; font-size: 12px; }
  }
  @media (max-width: 600px) {
    .ah-wrap { width: calc(100% - 20px); padding: 0 0 48px; }
    .ah-summary { margin: 20px 0; }
    .ah-summary-card { padding: 14px 16px; }
    .ah-summary-val { font-size: 20px; }
    .ah-card { padding: 16px 14px; gap: 10px; }
    .ah-card-title { font-size: 15px; margin-bottom: 6px; }
    .ah-meta-item { font-size: 13px; }
    .ah-filters { overflow-x: auto; scrollbar-width: none; }
    .ah-filters::-webkit-scrollbar { display: none; }
    .ah-qr-btn { padding: 12px 18px; font-size: 14px; }
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
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
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
    if (filter === "all") return records;
    return records.filter((r) => r.status === filter);
  }, [filter, records]);

  const counts = useMemo(() => {
    const c = (s) => records.filter((r) => r.status === s).length;
    return { total: records.length, approved: c("APPLIED") + c("APPROVED"), cancelled: c("CANCELLED") + c("REJECTED") };
  }, [records]);

  return (
    <div className="ah-root">
      <style>{styles}</style>

      <PageHeader
        title="신청 내역 조회"
        icon={<ClipboardList size={40} strokeWidth={1.8} style={{ color: "#90C450" }} />}
        subtitle={SUBTITLE_MAP[currentPath]}
        categories={SERVICE_CATEGORIES}
        bgColor="#fff"
      />

      <div className="ah-wrap">
        {/* 요약 */}
        <div className="ah-summary">
          <div className="ah-summary-card">
            <div className="ah-summary-dot" />
            <div className="ah-summary-text">
              <div className="ah-summary-label">전체 신청</div>
              <div className="ah-summary-val">{counts.total}</div>
            </div>
          </div>
          <div className="ah-summary-card">
            <div className="ah-summary-dot dot-blue" />
            <div className="ah-summary-text">
              <div className="ah-summary-label">승인 / 신청</div>
              <div className="ah-summary-val">{counts.approved}</div>
            </div>
          </div>
          <div className="ah-summary-card">
            <div className="ah-summary-dot dot-red" />
            <div className="ah-summary-text">
              <div className="ah-summary-label">취소 / 거절</div>
              <div className="ah-summary-val">{counts.cancelled}</div>
            </div>
          </div>
        </div>

        {/* 검색 + 필터 */}
        <div className="ah-toolbar">
          <div className="ah-toolbar-left">
            <div className="ah-search-wrap">
              <Search size={15} className="ah-search-icon" />
              <input className="ah-search-input" type="text" value={searchKeyword ?? ""} onChange={(e) => setSearchKeyword(e.target.value)} placeholder="행사명으로 검색하세요" />
            </div>
          </div>
          <div className="ah-filters">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                className={`ah-filter${filter === f.key ? " active" : ""}`}
                onClick={() => setFilter(f.key)}
                type="button"
              >{f.label}</button>
            ))}
          </div>
        </div>

        {/* 리스트 */}
        {loading ? (
          <PageLoading />
        ) : (error || filtered.length === 0) ? (
          <div className="ah-empty">
            <Inbox size={48} strokeWidth={1.2} />
            <span>{error || "신청 내역이 없습니다."}</span>
          </div>
        ) : (
          <div className="ah-list">
            {filtered.map((record) => {
              const meta = STATUS_META[record.status] || { label: record.status, bg: "#f9fafb", color: "#6b7280", border: "#e5e7eb" };
              return (
                <div
                  key={record.id}
                  className="ah-card"
                  onClick={() => navigate(`/program/current`)}
                >
                  {/* 상태 */}
                  <div className="ah-card-status">
                    <div className="ah-status-dot" style={{ background: meta.color }} />
                    <span className="ah-status-label" style={{ color: meta.color }}>{meta.label}</span>
                  </div>

                  {/* 본문 */}
                  <div className="ah-card-body">
                    <div className="ah-card-title">{record.eventName}</div>
                    <div className="ah-card-meta">
                      <span className="ah-meta-item">
                        <CalendarDays size={14} />
                        {formatDate(record.startAt)} ~ {formatDate(record.endAt)}
                      </span>
                      <span className="ah-meta-item">
                        <MapPin size={14} />
                        {record.location}
                      </span>
                      <span className="ah-meta-item">
                        <Clock size={14} />
                        신청 {formatDateTime(record.appliedAt)}
                      </span>
                    </div>
                  </div>

                  {/* 액션 */}
                  <div className="ah-card-actions" onClick={(e) => e.stopPropagation()}>
                    <button
                      className="ah-qr-btn"
                      type="button"
                      onClick={() => navigate(`/registration/qrcheckin?eventId=${record.eventId}`)}
                    >
                      <QrCode size={18} /> QR 체크인
                    </button>
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
