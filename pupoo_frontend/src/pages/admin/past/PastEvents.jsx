import { useState, useEffect } from "react";
import {
  MapPin,
  Users,
  Activity,
  Zap,
  BarChart3,
  ChevronRight,
  CalendarDays,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import ds from "../shared/designTokens";
import { injectEventImages, loadImageCache } from "../shared/eventImageStore";
import { axiosInstance } from "../../../app/http/axiosInstance";
import { getToken } from "../../../api/noticeApi";
import { resolveImageUrl } from "../../../shared/utils/publicAssetUrl";

const authHeaders = () => {
  const t = getToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
};

const devError = (...args) => {
  if (import.meta.env.DEV) {
    console.error(...args);
  }
};

/* ── 커스텀 차트 툴팁 ── */
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: ds.card,
        border: `1px solid ${ds.line}`,
        borderRadius: 8,
        padding: "8px 12px",
        boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
        fontSize: 12,
      }}
    >
      <div style={{ fontWeight: 700, color: ds.ink, marginBottom: 2 }}>
        {label}
      </div>
      <div style={{ color: ds.ink3 }}>{payload[0].value}%</div>
    </div>
  );
}

/* ── 스탯 카드 ── */
function StatCard({ icon: I, label, value, sub, color = ds.ink3 }) {
  return (
    <div
      style={{
        background: ds.card,
        borderRadius: 14,
        border: `1px solid ${ds.line}`,
        padding: "18px 16px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div style={{ position: "absolute", top: -6, right: -6, width: 50, height: 50, borderRadius: "50%", background: `${color}08` }} />
      <div style={{ position: "relative", zIndex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: `${color}12`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <I size={14} color={color} strokeWidth={2.2} />
          </div>
          <span style={{ fontSize: 11, fontWeight: 600, color: ds.ink4 }}>{label}</span>
        </div>
        <div style={{ fontSize: 20, fontWeight: 800, color: ds.ink, letterSpacing: -0.5 }}>{value}</div>
        {sub && <div style={{ fontSize: 10.5, color: ds.ink4, marginTop: 3 }}>{sub}</div>}
      </div>
    </div>
  );
}

/* ── 원형 프로그레스 ── */
function MiniProgress({ pct }) {
  const color = pct >= 90 ? "#EF4444" : pct >= 70 ? "#F59E0B" : "#3a4520";
  const r = 18, stroke = 4, circ = 2 * Math.PI * r;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <svg width={44} height={44} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={22} cy={22} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} />
        <circle cx={22} cy={22} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={circ} strokeDashoffset={circ - (circ * Math.min(pct, 100)) / 100}
          strokeLinecap="round" style={{ transition: "stroke-dashoffset .5s ease" }} />
      </svg>
      <div>
        <div style={{ fontSize: 15, fontWeight: 800, color: ds.ink, lineHeight: 1 }}>{pct}%</div>
        <div style={{ fontSize: 10, color: ds.ink4, marginTop: 2 }}>수용률</div>
      </div>
    </div>
  );
}

export default function PastEvents() {
  const [viewportWidth, setViewportWidth] = useState(() =>
    typeof window === "undefined" ? 1440 : window.innerWidth,
  );
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [loadError, setLoadError] = useState("");

  /* ── DB에서 지난 행사 로드 ── */
  useEffect(() => {
    (async () => {
      try {
        await loadImageCache();
        const res = await axiosInstance.get(
          "/api/admin/dashboard/past-events",
          { headers: authHeaders() },
        );
        const list = res.data?.data || res.data || [];
        if (list.length > 0) {
          const withImages = injectEventImages(list).map((item) => ({
            ...item,
            imageUrl: resolveImageUrl(item.imageUrl),
          }));
          setLoadError("");
          setEvents(withImages);
          setSelectedId(withImages[0].id || withImages[0].eventId);
        } else {
          setLoadError("");
          setEvents([]);
          setSelectedId(null);
        }
      } catch (err) {
        devError("[PastEvents] API 로드 실패:", err);
        setEvents([]);
        setSelectedId(null);
        setLoadError("지난 행사 데이터를 불러오지 못했습니다.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const syncViewport = () => setViewportWidth(window.innerWidth);
    syncViewport();
    window.addEventListener("resize", syncViewport);
    return () => window.removeEventListener("resize", syncViewport);
  }, []);

  const ev = selectedId
    ? events.find((e) => (e.id || e.eventId) === selectedId) || events[0]
    : events[0];

  /* ── 로딩 ── */
  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "80px 0",
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            border: `3px solid ${ds.brand}20`,
            borderTopColor: ds.brand,
            borderRadius: "50%",
            animation: "spin 1s linear infinite",
          }}
        />
        <div
          style={{
            fontSize: 13,
            color: ds.ink4,
            fontWeight: 600,
            marginTop: 14,
          }}
        >
          지난 행사 로딩 중...
        </div>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  /* ── 빈 상태 ── */
  if (events.length === 0) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "80px 0",
        }}
      >
        <CalendarDays size={42} color={ds.ink4} strokeWidth={1.5} />
        <div
          style={{
            fontSize: 15,
            fontWeight: 700,
            color: ds.ink4,
            marginTop: 14,
          }}
        >
          {loadError || "종료된 행사가 없습니다"}
        </div>
        {!loadError && (
          <div style={{ fontSize: 13, color: ds.ink4, marginTop: 4 }}>
            행사가 종료되면 여기에 표시됩니다.
          </div>
        )}
      </div>
    );
  }

  if (!ev) return null;

  const hourlyCongestion = Array.isArray(ev.hourlyCongestion)
    ? ev.hourlyCongestion
    : [];

  const totalParticipants = events.reduce(
    (a, b) => a + (b.participants || 0),
    0,
  );
  const avgZoneUsage = Math.round(
    events.reduce((a, b) => a + (b.zoneUsage || 0), 0) / events.length,
  );
  const avgEventRate = Math.round(
    events.reduce((a, b) => a + (b.eventRate || 0), 0) / events.length,
  );
  const avgCongestion = Math.round(
    events.reduce((a, b) => a + (b.avgCongestion || 0), 0) / events.length,
  );
  const isMobile = viewportWidth < 768;
  const capacityPct =
    ev.capacity > 0
      ? Math.round(((ev.participants || 0) / ev.capacity) * 100)
      : 0;

  const detailPanels = (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div
        style={{
          background: ds.card,
          borderRadius: 14,
          border: `1px solid ${ds.line}`,
          overflow: "hidden",
        }}
      >
        <div style={{ height: 100, position: "relative", background: ev.imageUrl ? "#000" : ds.brand }}>
          {ev.imageUrl && <img src={resolveImageUrl(ev.imageUrl)} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.7 }} />}
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, transparent 30%, rgba(0,0,0,0.5) 100%)" }} />
          <div style={{ position: "absolute", bottom: 12, left: 16, right: 16, zIndex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: "#fff", textShadow: "0 1px 6px rgba(0,0,0,0.3)" }}>{ev.name}</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.8)", display: "flex", alignItems: "center", gap: 8, marginTop: 3, flexWrap: "wrap" }}>
              <span style={{ display: "flex", alignItems: "center", gap: 3 }}><CalendarDays size={10} /> {ev.date}</span>
              <span style={{ display: "flex", alignItems: "center", gap: 3 }}><MapPin size={10} /> {ev.location}</span>
            </div>
          </div>
        </div>
        <div style={{ padding: "16px 16px 18px" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 8,
              marginBottom: 16,
            }}
          >
            {[
              { l: "참가자", v: (ev.participants || 0).toLocaleString(), c: ds.brand },
              { l: "수용 인원", v: (ev.capacity || 0).toLocaleString(), c: "#8B5CF6" },
              { l: "체험존 이용률", v: `${ev.zoneUsage || 0}%`, c: "#3a4520" },
              { l: "이벤트 참여율", v: `${ev.eventRate || 0}%`, c: "#F59E0B" },
            ].map((s) => (
              <div
                key={s.l}
                style={{
                  padding: "12px 12px",
                  borderRadius: 10,
                  background: ds.bg,
                  borderLeft: `3px solid ${s.c}`,
                }}
              >
                <div style={{ fontSize: 10, color: ds.ink4, marginBottom: 4, fontWeight: 600 }}>{s.l}</div>
                <div style={{ fontSize: 17, fontWeight: 800, color: ds.ink }}>{s.v}</div>
              </div>
            ))}
          </div>
          <MiniProgress pct={capacityPct} />
        </div>
      </div>

      <div
        style={{
          background: ds.card,
          borderRadius: 14,
          border: `1px solid ${ds.line}`,
          padding: 20,
        }}
      >
        <div
          style={{
            fontSize: 14,
            fontWeight: 800,
            color: ds.ink,
            marginBottom: 16,
          }}
        >
          시간대별 혼잡도
        </div>
        {hourlyCongestion.length > 0 ? (
          <ResponsiveContainer width="100%" height={150}>
            <AreaChart data={hourlyCongestion}>
              <defs>
                <linearGradient id="gCong" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={ds.ink4} stopOpacity={0.12} />
                  <stop offset="100%" stopColor={ds.ink4} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(255,255,255,0.08)"
                vertical={false}
              />
              <XAxis
                dataKey="time"
                tick={{ fontSize: 10, fill: ds.ink4 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: ds.ink4 }}
                axisLine={false}
                tickLine={false}
                width={28}
                tickFormatter={(v) => `${v}%`}
                domain={[0, 100]}
              />
              <Tooltip content={<ChartTooltip />} />
              <Area
                type="monotone"
                dataKey="value"
                stroke={ds.ink3}
                strokeWidth={2}
                fill="url(#gCong)"
                dot={{
                  r: 3,
                  fill: ds.ink3,
                  stroke: "#fff",
                  strokeWidth: 2,
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div style={{ fontSize: 13, color: ds.ink4 }}>
            시간대별 혼잡도 데이터가 없습니다.
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div>
      {/* KPI */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "repeat(2, minmax(0, 1fr))" : "repeat(4, 1fr)",
          gap: 12,
          marginBottom: 16,
        }}
      >
        <StatCard
          icon={Users}
          label="총 참가자 수"
          value={totalParticipants.toLocaleString()}
          sub={`지난 ${events.length}개 행사 합산`}
          color="#8B5CF6"
        />
        <StatCard
          icon={Activity}
          label="평균 체험 이용률"
          value={`${avgZoneUsage}%`}
          sub="체험존 평균"
          color="#3a4520"
        />
        <StatCard
          icon={Zap}
          label="평균 이벤트 참여율"
          value={`${avgEventRate}%`}
          sub="이벤트 참여 평균"
          color="#F59E0B"
        />
        <StatCard
          icon={BarChart3}
          label="평균 혼잡도"
          value={`${avgCongestion}%`}
          sub="평균 피크 시간대"
          color="#EF4444"
        />
      </div>

      <div
        style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 320px", gap: 14 }}
      >
        {/* 테이블 */}
        <div
          style={{
            background: ds.card,
            borderRadius: 14,
            border: `1px solid ${ds.line}`,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "12px 20px",
              display: "flex",
              alignItems: "center",
              gap: 10,
              borderBottom: `1px solid ${ds.line}`,
            }}
          >
            <span style={{ fontSize: 14, fontWeight: 800, color: ds.ink }}>
              지난 행사 목록
            </span>
            <span style={{ fontSize: 12, fontWeight: 600, color: ds.ink4 }}>
              {events.length}건
            </span>
          </div>
          {isMobile ? (
            <div style={{ display: "grid", gap: 10, padding: 12 }}>
              {events.map((r, idx) => {
                const rid = r.id || r.eventId;
                const active = (ev.id || ev.eventId) === rid;
                const rankColors = ["#F59E0B", "#94A3B8", "#CD7F32", ds.ink4];
                return (
                  <button
                    key={rid}
                    type="button"
                    onClick={() => setSelectedId(rid)}
                    style={{
                      border: active ? `1px solid ${ds.brand}` : `1px solid ${ds.line}`,
                      background: active ? `${ds.brand}08` : ds.bg,
                      borderRadius: 12,
                      padding: 12,
                      display: "grid",
                      gap: 10,
                      textAlign: "left",
                      cursor: "pointer",
                      fontFamily: ds.ff,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      {r.imageUrl ? (
                        <img src={resolveImageUrl(r.imageUrl)} alt="" style={{ width: 48, height: 48, borderRadius: 10, objectFit: "cover", border: `1px solid ${ds.line}`, flexShrink: 0 }} />
                      ) : (
                        <div style={{ width: 48, height: 48, borderRadius: 10, background: `${rankColors[Math.min(idx, 3)]}15`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <span style={{ fontSize: 13, fontWeight: 800, color: rankColors[Math.min(idx, 3)] }}>{idx + 1}</span>
                        </div>
                      )}
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontSize: 13.5, fontWeight: 700, color: active ? ds.brand : ds.ink, wordBreak: "keep-all" }}>{r.name}</div>
                        <div style={{ fontSize: 11, color: ds.ink4, marginTop: 3 }}>{r.date}</div>
                        <div style={{ fontSize: 11, color: ds.ink4, marginTop: 2, wordBreak: "keep-all" }}>{r.location}</div>
                      </div>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8 }}>
                      <div style={{ padding: "10px 12px", borderRadius: 10, background: ds.card, border: `1px solid ${ds.lineSoft}` }}>
                        <div style={{ fontSize: 10.5, color: ds.ink4, marginBottom: 3 }}>참가자</div>
                        <div style={{ fontSize: 14, fontWeight: 800, color: ds.ink }}>{(r.participants || 0).toLocaleString()}</div>
                      </div>
                      <div style={{ padding: "10px 12px", borderRadius: 10, background: ds.card, border: `1px solid ${ds.lineSoft}` }}>
                        <div style={{ fontSize: 10.5, color: ds.ink4, marginBottom: 3 }}>참여율</div>
                        <div style={{ fontSize: 14, fontWeight: 800, color: ds.ink }}>{r.eventRate || 0}%</div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${ds.line}` }}>
                {[
                  "행사명",
                  "일자",
                  "장소",
                  "참가자",
                  "이용률",
                  "참여율",
                  "",
                ].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: "10px 14px",
                      fontSize: 11.5,
                      fontWeight: 700,
                      color: ds.ink4,
                      textAlign:
                        h === "참가자" || h === "이용률" || h === "참여율"
                          ? "right"
                          : "left",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {events.map((r, idx) => {
                const rid = r.id || r.eventId;
                const active = (ev.id || ev.eventId) === rid;
                const rankColors = ["#F59E0B", "#94A3B8", "#CD7F32", ds.ink4];
                return (
                  <tr
                    key={rid}
                    onClick={() => setSelectedId(rid)}
                    style={{
                      borderBottom: `1px solid ${ds.lineSoft}`,
                      cursor: "pointer",
                      transition: "all .15s",
                      background: active ? `${ds.brand}06` : "transparent",
                      borderLeft: active ? `3px solid ${ds.brand}` : "3px solid transparent",
                    }}
                    onMouseEnter={(e) => {
                      if (!active) e.currentTarget.style.background = ds.bg;
                    }}
                    onMouseLeave={(e) => {
                      if (!active) e.currentTarget.style.background = "transparent";
                    }}
                  >
                    <td style={{ padding: "12px 14px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        {r.imageUrl ? (
                          <img src={resolveImageUrl(r.imageUrl)} alt="" style={{ width: 36, height: 36, borderRadius: 8, objectFit: "cover", border: `1px solid ${ds.line}`, flexShrink: 0 }} />
                        ) : (
                          <div style={{ width: 36, height: 36, borderRadius: 8, background: `${rankColors[Math.min(idx, 3)]}15`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            <span style={{ fontSize: 12, fontWeight: 800, color: rankColors[Math.min(idx, 3)] }}>{idx + 1}</span>
                          </div>
                        )}
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: active ? ds.brand : ds.ink }}>{r.name}</div>
                          <div style={{ fontSize: 10.5, color: ds.ink4, display: "flex", alignItems: "center", gap: 3, marginTop: 1 }}>
                            <CalendarDays size={9} /> {r.date}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: "12px 14px" }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, color: ds.ink3 }}>
                        <MapPin size={11} color={ds.ink4} /> {r.location}
                      </span>
                    </td>
                    <td style={{ padding: "12px 14px", fontSize: 13, fontWeight: 700, color: ds.ink, textAlign: "right" }}>
                      {(r.participants || 0).toLocaleString()}
                    </td>
                    <td style={{ padding: "12px 14px", textAlign: "right" }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: (r.zoneUsage || 0) >= 70 ? "#3a4520" : ds.ink4 }}>{r.zoneUsage || 0}%</span>
                    </td>
                    <td style={{ padding: "12px 14px", textAlign: "right" }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: (r.eventRate || 0) >= 70 ? ds.brand : ds.ink4 }}>{r.eventRate || 0}%</span>
                    </td>
                    <td style={{ padding: "12px 14px", width: 28 }}>
                      {active && <ChevronRight size={14} color={ds.brand} />}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          )}
        </div>

        {/* 우측 상세 */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div
            style={{
              background: ds.card,
              borderRadius: 14,
              border: `1px solid ${ds.line}`,
              overflow: "hidden",
            }}
          >
            {/* 이미지 헤더 or 그라데이션 */}
            <div style={{ height: 100, position: "relative", background: ev.imageUrl ? "#000" : ds.brand }}>
              {ev.imageUrl && <img src={resolveImageUrl(ev.imageUrl)} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.7 }} />}
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, transparent 30%, rgba(0,0,0,0.5) 100%)" }} />
              <div style={{ position: "absolute", bottom: 12, left: 16, right: 16, zIndex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 800, color: "#fff", textShadow: "0 1px 6px rgba(0,0,0,0.3)" }}>{ev.name}</div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.8)", display: "flex", alignItems: "center", gap: 8, marginTop: 3 }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 3 }}><CalendarDays size={10} /> {ev.date}</span>
                  <span style={{ display: "flex", alignItems: "center", gap: 3 }}><MapPin size={10} /> {ev.location}</span>
                </div>
              </div>
            </div>
            <div style={{ padding: "16px 16px 18px" }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 8,
                  marginBottom: 16,
                }}
              >
                {[
                  { l: "참가자", v: (ev.participants || 0).toLocaleString(), c: ds.brand },
                  { l: "수용 인원", v: (ev.capacity || 0).toLocaleString(), c: "#8B5CF6" },
                  { l: "체험 이용률", v: `${ev.zoneUsage || 0}%`, c: "#3a4520" },
                  { l: "이벤트 참여율", v: `${ev.eventRate || 0}%`, c: "#F59E0B" },
                ].map((s) => (
                  <div
                    key={s.l}
                    style={{
                      padding: "12px 12px",
                      borderRadius: 10,
                      background: ds.bg,
                      borderLeft: `3px solid ${s.c}`,
                    }}
                  >
                    <div style={{ fontSize: 10, color: ds.ink4, marginBottom: 4, fontWeight: 600 }}>{s.l}</div>
                    <div style={{ fontSize: 17, fontWeight: 800, color: ds.ink }}>{s.v}</div>
                  </div>
                ))}
              </div>
              <MiniProgress pct={capacityPct} />
            </div>
          </div>

          {/* 혼잡도 차트 */}
          <div
            style={{
              background: ds.card,
              borderRadius: 14,
              border: `1px solid ${ds.line}`,
              padding: 20,
            }}
          >
            <div
              style={{
                fontSize: 14,
                fontWeight: 800,
                color: ds.ink,
                marginBottom: 16,
              }}
            >
              시간대별 혼잡도
            </div>
            {hourlyCongestion.length > 0 ? (
              <ResponsiveContainer width="100%" height={150}>
                <AreaChart data={hourlyCongestion}>
                  <defs>
                    <linearGradient id="gCong" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={ds.ink4} stopOpacity={0.12} />
                      <stop offset="100%" stopColor={ds.ink4} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(255,255,255,0.08)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="time"
                    tick={{ fontSize: 10, fill: ds.ink4 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: ds.ink4 }}
                    axisLine={false}
                    tickLine={false}
                    width={28}
                    tickFormatter={(v) => `${v}%`}
                    domain={[0, 100]}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke={ds.ink3}
                    strokeWidth={2}
                    fill="url(#gCong)"
                    dot={{
                      r: 3,
                      fill: ds.ink3,
                      stroke: "#fff",
                      strokeWidth: 2,
                    }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ fontSize: 13, color: ds.ink4 }}>
                시간대별 혼잡도 데이터가 없습니다.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
