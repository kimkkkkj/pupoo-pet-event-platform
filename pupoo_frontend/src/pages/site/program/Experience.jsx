import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import PageHeader from "../components/PageHeader";
import PageLoading from "../components/PageLoading";
import {
  SERVICE_CATEGORIES,
  SUBTITLE_MAP,
} from "../constants/programConstants";
import { eventApi } from "../../../app/http/eventApi";
import { boothApi } from "../../../app/http/boothApi";
import {
  loadImageCache as loadEventImageCache,
  getEventImageMap,
} from "../../admin/shared/eventImageStore";
import {
  loadBoothImageCache,
  getBoothImageMap,
} from "../../admin/shared/boothImageStore";
import {
  Store,
  MapPin,
  CalendarDays,
  FlaskConical,
  Users,
  Search,
} from "lucide-react";
import { resolveImageUrl } from "../../../shared/utils/publicAssetUrl";

const TYPE_LABEL = {
  BOOTH_EXPERIENCE: "체험",
  BOOTH_COMPANY: "기업",
  BOOTH_FOOD: "푸드",
  BOOTH_SALE: "판매",
  BOOTH_INFO: "안내",
  BOOTH_SPONSOR: "스폰서",
  ETC: "기타",
};
const ZONE_LABEL = {
  ZONE_A: "A구역",
  ZONE_B: "B구역",
  ZONE_C: "C구역",
  OTHER: "기타",
};
const STATUS_LABEL = { OPEN: "운영 중", CLOSED: "종료", PAUSED: "일시중단" };
const STATUS_COLOR = {
  OPEN: { bg: "#ecfdf5", color: "#059669" },
  CLOSED: { bg: "#f3f4f6", color: "#9ca3af" },
  PAUSED: { bg: "#fff7ed", color: "#d97706" },
};

const styles = `
  @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.min.css');
  .ex-root { background:#f8f9fc; min-height:100vh; font-family:'Pretendard Variable','Pretendard',-apple-system,sans-serif; }
  .ex-root *,.ex-root *::before,.ex-root *::after { box-sizing:border-box; font-family:inherit; }
  .ex-wrap { max-width:1400px; margin:0 auto; padding:32px 25px 64px; }
  .ex-toolbar { display:flex; align-items:center; gap:10px; flex-wrap:wrap; margin-bottom:20px; }
  .ex-search-wrap {
    display:flex; align-items:center; gap:8px;
    background:#fff; border:1px solid #e5e7eb; border-radius:10px;
    padding:8px 14px; flex:1; min-width:180px; max-width:320px;
  }
  .ex-search-wrap input { border:none; outline:none; font-size:13px; color:#374151; background:transparent; width:100%; font-family:inherit; }
  .ex-filter-row { display:flex; gap:8px; align-items:center; flex-wrap:wrap; }
  .ex-filter-btn { padding:8px 16px; border:1px solid #e2e5ea; border-radius:100px; background:#fff; font-size:12px; font-weight:600; color:#6b7280; cursor:pointer; transition:all 0.15s; font-family:inherit; }
  .ex-filter-btn.active { background:#90C450; border-color:#90C450; color:#fff; }
  .ex-stats { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; margin-bottom:20px; }
  .ex-stat { background:#fff; border:1px solid #e9ecef; border-radius:12px; padding:16px 18px; display:flex; align-items:center; gap:12px; }
  .ex-stat-ico { width:38px; height:38px; border-radius:10px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
  .ex-stat-lb { font-size:11px; color:#6b7280; }
  .ex-stat-v { font-size:20px; font-weight:800; color:#111827; }
  .ex-grid { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:16px; }
  .ex-card { background:#fff; border:1.5px solid #e9ecef; border-radius:16px; overflow:hidden; display:flex; flex-direction:column; transition:border-color 0.2s,transform 0.2s,box-shadow 0.2s; }
  .ex-card.open-card:hover { border-color:#b4c6f0; transform:translateY(-3px); box-shadow:0 8px 28px rgba(26,79,214,0.08); cursor:pointer; }
  .ex-card.closed-card { opacity:0.5; filter:grayscale(70%); pointer-events:none; }
  .ex-thumb { width:100%; aspect-ratio:16/10; position:relative; overflow:hidden; background:linear-gradient(135deg,#f0f4ff 0%,#f8fafc 100%); }
  .ex-thumb img { width:100%; height:100%; object-fit:cover; display:block; }
  .ex-thumb-ph { position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:8px; }
  .ex-thumb-ph-text { font-size:12px; font-weight:600; color:#b0bcce; }
  .ex-status-badge { position:absolute; top:12px; left:12px; z-index:2; padding:4px 10px; border-radius:100px; font-size:11px; font-weight:700; backdrop-filter:blur(6px); }
  .ex-event-badge { position:absolute; top:12px; right:12px; z-index:2; padding:4px 10px; border-radius:100px; background:rgba(0,0,0,0.45); backdrop-filter:blur(6px); font-size:10px; font-weight:600; color:#fff; max-width:120px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .ex-body { padding:16px 18px 18px; display:flex; flex-direction:column; gap:10px; flex:1; }
  .ex-card-head { display:flex; align-items:center; justify-content:space-between; gap:8px; }
  .ex-type-tag { font-size:10px; font-weight:700; background:#eff4ff; color:#90C450; padding:3px 9px; border-radius:100px; }
  .ex-name { font-size:16px; font-weight:800; color:#111827; line-height:1.35; }
  .ex-desc { font-size:12.5px; color:#6b7280; line-height:1.45; }
  .ex-meta { display:flex; flex-direction:column; gap:6px; font-size:12px; color:#6b7280; }
  .ex-meta-row { display:flex; align-items:center; gap:6px; }
  .ex-divider { height:1px; background:#f1f3f5; }
  .ex-company { font-size:11.5px; color:#9ca3af; font-weight:500; }
  .ex-empty { display:flex; flex-direction:column; align-items:center; justify-content:center; padding:80px 24px; }
  @media (max-width:1100px) { .ex-grid { grid-template-columns:repeat(2,minmax(0,1fr)); } }
  @media (max-width:700px) {
    .ex-wrap { padding:20px 16px 48px; }
    .ex-stats { grid-template-columns:repeat(2,1fr); }
    .ex-grid { grid-template-columns:1fr; }
    .ex-toolbar { flex-direction:column; align-items:stretch; gap:10px; }
    .ex-search-wrap { max-width:100%; min-width:0; border-radius:999px; height:44px; padding:0 16px; gap:10px; }
    .ex-filter-row { flex-wrap:nowrap; overflow-x:auto; scrollbar-width:none; padding-bottom:2px; }
    .ex-filter-row::-webkit-scrollbar { display:none; }
    .ex-filter-btn { flex-shrink:0; font-size:13px; padding:8px 14px; }
  }
`;

export default function Experience() {
  const navigate = useNavigate();
  const currentPath = "/program/experience";
  const [booths, setBooths] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [search, setSearch] = useState("");

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const evRes = await eventApi.getEvents({
          page: 0,
          size: 200,
          sort: "startAt,desc",
        });
        const events = Array.isArray(evRes?.data?.data?.content)
          ? evRes.data.data.content
          : [];

        await loadEventImageCache();
        await loadBoothImageCache();
        const imgMap = getEventImageMap();
        const boothImgMap = getBoothImageMap();

        const results = await Promise.allSettled(
          events.map((evt) =>
            boothApi
              .getEventBooths({ eventId: evt.eventId, page: 0, size: 200 })
              .then((r) => ({
                eventId: evt.eventId,
                eventName: evt.eventName ?? "행사",
                eventImg: imgMap[String(evt.eventId)] ?? evt.imageUrl ?? null,
                list: Array.isArray(r?.data?.data?.content)
                  ? r.data.data.content
                  : Array.isArray(r?.data?.data)
                    ? r.data.data
                    : [],
              })),
          ),
        );

        if (!mounted) return;
        const all = [];
        results.forEach((res) => {
          if (res.status !== "fulfilled") return;
          const { eventId, eventName, eventImg, list } = res.value;
          list.forEach((b) => {
            all.push({
              boothId: b.boothId,
              placeName: b.placeName ?? "부스명 없음",
              description: b.description ?? "",
              type: b.type ?? "ETC",
              zone: b.zone ?? "OTHER",
              status: b.status ?? "OPEN",
              company: b.company ?? "",
              eventId,
              eventName,
              thumbnail:
                boothImgMap[String(b.boothId)] ??
                b.imageUrl ??
                eventImg ??
                null,
            });
          });
        });
        setBooths(all);
      } catch (e) {
        if (!mounted) return;
        setError(
          e?.response?.data?.message ||
            e?.message ||
            "데이터를 불러오지 못했습니다.",
        );
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const filtered = booths.filter((b) => {
    if (filter !== "ALL" && b.status !== filter) return false;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      return (
        b.placeName.toLowerCase().includes(q) ||
        b.description.toLowerCase().includes(q) ||
        b.eventName.toLowerCase().includes(q) ||
        (b.company || "").toLowerCase().includes(q)
      );
    }
    return true;
  });

  const FILTERS = [
    { key: "ALL", label: "전체" },
    { key: "OPEN", label: "운영 중" },
    { key: "PAUSED", label: "일시중단" },
    { key: "CLOSED", label: "종료" },
  ];

  return (
    <div className="ex-root">
      <style>{styles}</style>
      <PageHeader
        title="체험존 안내"
        subtitle={SUBTITLE_MAP[currentPath] ?? "등록된 체험존을 확인하세요"}
        categories={SERVICE_CATEGORIES}
        currentPath={currentPath}
        onNavigate={(path) => navigate(path)}
      />
      <main className="ex-wrap">
        <div className="ex-stats">
          {[
            {
              label: "전체 체험존",
              value: booths.length,
              ico: <Store size={18} color="#90C450" />,
              bg: "#eff4ff",
            },
            {
              label: "운영 중",
              value: booths.filter((b) => b.status === "OPEN").length,
              ico: <FlaskConical size={18} color="#059669" />,
              bg: "#ecfdf5",
            },
            {
              label: "일시중단",
              value: booths.filter((b) => b.status === "PAUSED").length,
              ico: <Users size={18} color="#d97706" />,
              bg: "#fff7ed",
            },
            {
              label: "종료",
              value: booths.filter((b) => b.status === "CLOSED").length,
              ico: <CalendarDays size={18} color="#9ca3af" />,
              bg: "#f3f4f6",
            },
          ].map((s) => (
            <div key={s.label} className="ex-stat">
              <div className="ex-stat-ico" style={{ background: s.bg }}>
                {s.ico}
              </div>
              <div>
                <div className="ex-stat-lb">{s.label}</div>
                <div className="ex-stat-v">{s.value}개</div>
              </div>
            </div>
          ))}
        </div>

        <div className="ex-toolbar">
          <div className="ex-search-wrap">
            <Search size={14} color="#9ca3af" />
            <input
              placeholder="부스명, 행사명, 업체명 검색"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="ex-filter-row">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                className={`ex-filter-btn${filter === f.key ? " active" : ""}`}
                onClick={() => setFilter(f.key)}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {loading && (
          <PageLoading />
        )}
        {!loading && error && (
          <div className="ex-empty">
            <div style={{ fontSize: 14, color: "#ef4444" }}>{error}</div>
          </div>
        )}
        {!loading && !error && filtered.length === 0 && (
          <div className="ex-empty">
            <Store
              size={48}
              strokeWidth={1.2}
              style={{ color: "#d1d5db", marginBottom: 16 }}
            />
            <div
              style={{
                fontSize: 15,
                fontWeight: 700,
                color: "#374151",
                marginBottom: 6,
              }}
            >
              체험존이 없습니다
            </div>
            <div style={{ fontSize: 13, color: "#9ca3af" }}>
              {search
                ? "검색 조건에 맞는 체험존이 없어요."
                : "등록된 체험존이 없어요."}
            </div>
          </div>
        )}
        {!loading && !error && filtered.length > 0 && (
          <div className="ex-grid">
            {filtered.map((b) => {
              const isClosed = b.status === "CLOSED";
              const sc = STATUS_COLOR[b.status] ?? STATUS_COLOR.OPEN;
              return (
                <div
                  key={b.boothId}
                  className={`ex-card ${isClosed ? "closed-card" : "open-card"}`}
                >
                  <div className="ex-thumb">
                    {b.thumbnail ? (
                      <img
                        src={resolveImageUrl(b.thumbnail)}
                        alt={b.placeName}
                        loading="lazy"
                        onError={(e) => {
                          e.target.style.display = "none";
                          e.target.nextSibling.style.display = "flex";
                        }}
                      />
                    ) : null}
                    <div
                      className="ex-thumb-ph"
                      style={{ display: b.thumbnail ? "none" : "flex" }}
                    >
                      <Store size={28} strokeWidth={1.2} color="#c5cdd8" />
                      <span className="ex-thumb-ph-text">이미지 없음</span>
                    </div>
                    <div
                      className="ex-status-badge"
                      style={{ background: sc.bg, color: sc.color }}
                    >
                      {STATUS_LABEL[b.status]}
                    </div>
                    <div className="ex-event-badge" title={b.eventName}>
                      {b.eventName}
                    </div>
                  </div>
                  <div className="ex-body">
                    <div className="ex-card-head">
                      <span className="ex-type-tag">
                        {TYPE_LABEL[b.type] ?? b.type}
                      </span>
                      <span
                        style={{
                          fontSize: 11,
                          color: "#9ca3af",
                          fontWeight: 600,
                        }}
                      >
                        {ZONE_LABEL[b.zone] ?? b.zone}
                      </span>
                    </div>
                    <div className="ex-name">{b.placeName}</div>
                    {b.description ? (
                      <div className="ex-desc">{b.description}</div>
                    ) : null}
                    <div className="ex-meta">
                      <div className="ex-meta-row">
                        <MapPin size={12} />
                        {ZONE_LABEL[b.zone] ?? b.zone}
                      </div>
                      <div className="ex-meta-row">
                        <CalendarDays size={12} />
                        {b.eventName}
                      </div>
                    </div>
                    {b.company ? (
                      <>
                        <div className="ex-divider" />
                        <div className="ex-company">업체: {b.company}</div>
                      </>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
