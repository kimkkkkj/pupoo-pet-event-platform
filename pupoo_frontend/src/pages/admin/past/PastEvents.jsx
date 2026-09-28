import { useEffect, useMemo, useState } from "react";
import { Archive, ImagePlus, MessageSquare, Search, Star, X } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import ds from "../shared/designTokens";
import { injectEventImages, loadImageCache } from "../shared/eventImageStore";
import { axiosInstance } from "../../../app/http/axiosInstance";
import { getToken } from "../../../api/noticeApi";
import { resolveImageUrl } from "../../../shared/utils/publicAssetUrl";
import { Button, IconButton, InfoList, Overlay, EmptyState, StatCard, Tag } from "../shared/adminUi";

const authHeaders = () => {
  const t = getToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
};

const pct = (v) => (v == null || Number.isNaN(Number(v)) ? "-" : `${Math.round(Number(v))}%`);
const num = (v) => Number(v || 0).toLocaleString("ko-KR");
const dot = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
};
const dayCount = (a, b) => {
  const s = new Date(a);
  const e = new Date(b);
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return 0;
  return Math.round((new Date(e.toDateString()) - new Date(s.toDateString())) / 86400000) + 1;
};
const unwrapList = (res) => {
  const d = res?.data?.data ?? res?.data ?? [];
  return Array.isArray(d) ? d : Array.isArray(d?.content) ? d.content : [];
};
const safeGet = (url, params) =>
  axiosInstance.get(url, { params, headers: authHeaders() }).catch(() => null);

const PROGRAM_TONE = { 체험: "green", 세션: "brand", 콘테스트: "amber" };

const COLUMNS = [
  { key: "name", label: "행사명", w: "24%" },
  { key: "period", label: "기간", w: "20%" },
  { key: "location", label: "장소" },
  { key: "participants", label: "참가자", w: 110, align: "right" },
  { key: "programs", label: "프로그램", w: 96, align: "right" },
  { key: "reviews", label: "후기", w: 120, align: "right" },
  { key: "galleries", label: "갤러리", w: 90, align: "right" },
];

export default function PastEvents() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [keyword, setKeyword] = useState("");
  const [detail, setDetail] = useState(null);
  const [width, setWidth] = useState(() => (typeof window === "undefined" ? 1440 : window.innerWidth));

  useEffect(() => {
    const onResize = () => setWidth(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        await loadImageCache();
        const res = await axiosInstance.get("/api/admin/dashboard/past-events", { headers: authHeaders() });
        const base = injectEventImages(res.data?.data || res.data || []);

        // 지난 행사 API에는 요약 수치만 있어 기간·프로그램·후기·갤러리를 다른 API에서 모아 붙인다.
        // 후기·갤러리 목록 API는 행사 필터를 지원하지 않아 한 번에 받아 행사별로 나눈다.
        const [reviewRes, galleryRes, ...perEvent] = await Promise.all([
          safeGet("/api/reviews", { page: 0, size: 100 }),
          safeGet("/api/galleries", { page: 0, size: 100 }),
          ...base.flatMap((e) => [
            safeGet(`/api/events/${e.eventId}`),
            safeGet(`/api/admin/dashboard/events/${e.eventId}/programs`),
          ]),
        ]);
        const reviews = unwrapList(reviewRes);
        const galleries = unwrapList(galleryRes);

        setEvents(
          base.map((e, i) => {
            const info = perEvent[i * 2]?.data?.data || {};
            const programs = unwrapList(perEvent[i * 2 + 1]);
            const evReviews = reviews.filter((r) => Number(r.eventId) === Number(e.eventId));
            const ratings = evReviews.map((r) => Number(r.rating)).filter((n) => n > 0);
            return {
              ...e,
              imageUrl: resolveImageUrl(e.imageUrl),
              startAt: info.startAt,
              endAt: info.endAt,
              period: info.startAt ? `${dot(info.startAt)} ~ ${dot(info.endAt)}` : e.date,
              days: info.startAt ? dayCount(info.startAt, info.endAt) : 0,
              description: info.description || "",
              organizer: info.organizer || "",
              programs,
              enrolled: programs.reduce((s, p) => s + (Number(p.enrolled) || 0), 0),
              reviews: evReviews,
              avgRating: ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null,
              galleryCount: galleries.filter((g) => Number(g.eventId) === Number(e.eventId)).length,
            };
          }),
        );
        setLoadError("");
      } catch (err) {
        if (import.meta.env.DEV) console.error("[PastEvents] API 로드 실패:", err);
        setEvents([]);
        setLoadError("지난 행사 데이터를 불러오지 못했습니다.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const rows = useMemo(() => {
    const k = keyword.trim().toLowerCase();
    if (!k) return events;
    return events.filter((e) => `${e.name} ${e.location} ${e.period}`.toLowerCase().includes(k));
  }, [events, keyword]);

  const summary = useMemo(() => {
    const allRatings = events.flatMap((e) => e.reviews.map((r) => Number(r.rating)).filter((n) => n > 0));
    return {
      participants: events.reduce((s, e) => s + (Number(e.participants) || 0), 0),
      programs: events.reduce((s, e) => s + e.programs.length, 0),
      reviews: events.reduce((s, e) => s + e.reviews.length, 0),
      avgRating: allRatings.length ? allRatings.reduce((a, b) => a + b, 0) / allRatings.length : null,
      galleries: events.reduce((s, e) => s + e.galleryCount, 0),
    };
  }, [events]);

  const isMobile = width < 900;

  return (
    <div style={{ display: "grid", gap: 16, minWidth: 0 }}>
      {/* 요약 */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2, minmax(0, 1fr))" : "repeat(4, minmax(0, 1fr))", gap: 12 }}>
        <StatCard label="종료된 행사" value={`${num(events.length)}건`} sub="기간이 끝난 행사" />
        <StatCard label="누적 참가자" value={`${num(summary.participants)}명`} sub={`프로그램 신청 ${num(events.reduce((s, e) => s + e.enrolled, 0))}건`} />
        <StatCard label="운영한 프로그램" value={`${num(summary.programs)}개`} sub="체험·세션·콘테스트" />
        <StatCard
          label="행사 후기"
          value={summary.avgRating ? `★ ${summary.avgRating.toFixed(1)}` : "-"}
          sub={`후기 ${num(summary.reviews)}건 · 갤러리 ${num(summary.galleries)}건`}
        />
      </div>

      <div style={{ background: ds.card, border: `1px solid ${ds.line}`, borderRadius: ds.r, minWidth: 0 }}>
        {/* 도구 막대 */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            padding: "14px 16px 14px 20px",
            borderBottom: `1px solid ${ds.line}`,
            flexWrap: "wrap",
          }}
        >
          <div style={{ fontSize: 15, fontWeight: 600, color: ds.ink }}>
            지난 행사 목록 <span style={{ marginLeft: 4, fontWeight: 500, color: ds.ink4 }}>{num(rows.length)}</span>
          </div>
          <div style={{ position: "relative", width: isMobile ? "100%" : 260 }}>
            <Search size={15} color={ds.ink4} style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)" }} />
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="행사명, 장소 검색"
              style={{
                width: "100%",
                height: 36,
                padding: "0 12px 0 33px",
                borderRadius: ds.rs,
                border: `1px solid ${ds.line}`,
                background: ds.bg,
                color: ds.ink,
                fontSize: 14,
                fontFamily: ds.ff,
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>
        </div>

        {loading ? (
          <Message>지난 행사 정보를 모으는 중...</Message>
        ) : loadError ? (
          <Message>{loadError}</Message>
        ) : rows.length === 0 ? (
          events.length ? (
            <EmptyState icon={Search} title="검색 결과가 없습니다" description="다른 행사명이나 장소로 검색해 보세요." />
          ) : (
            <EmptyState icon={Archive} title="종료된 행사가 없습니다" description="행사가 끝나면 여기에 표시됩니다." />
          )
        ) : isMobile ? (
          rows.map((r, i) => (
            <button
              key={r.id || r.eventId}
              type="button"
              onClick={() => setDetail(r)}
              style={{
                display: "block",
                width: "100%",
                padding: "14px 16px",
                border: "none",
                borderTop: i ? `1px solid ${ds.line}` : "none",
                background: "transparent",
                textAlign: "left",
                color: ds.ink,
                fontFamily: ds.ff,
                cursor: "pointer",
              }}
            >
              <div style={{ fontSize: 15, fontWeight: 600 }}>{r.name}</div>
              <div style={{ marginTop: 4, fontSize: 13, color: ds.ink3 }}>
                {r.period} · {r.location}
              </div>
              <div style={{ marginTop: 4, fontSize: 13, color: ds.ink3 }}>
                참가 {num(r.participants)}명 · 프로그램 {r.programs.length}개 · 후기 {r.reviews.length}건
              </div>
            </button>
          ))
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed", fontVariantNumeric: "tabular-nums" }}>
            <thead>
              <tr>
                {COLUMNS.map((c) => (
                  <th
                    key={c.key}
                    style={{
                      width: c.w,
                      padding: "11px 20px",
                      textAlign: c.align || "left",
                      fontSize: 13,
                      fontWeight: 500,
                      color: ds.ink3,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.id || r.eventId}
                  onClick={() => setDetail(r)}
                  style={{ borderTop: `1px solid ${ds.line}`, cursor: "pointer" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = ds.cardHover)}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <td style={td}>
                    <div title={r.name} style={{ color: ds.ink, fontWeight: 600, ...ellipsis }}>{r.name}</div>
                    <div style={{ marginTop: 3, fontSize: 12, color: ds.ink4, ...ellipsis }}>{r.organizer || r.id}</div>
                  </td>
                  <td style={td}>
                    <div style={{ whiteSpace: "nowrap" }}>{r.period}</div>
                    {r.days ? <div style={{ marginTop: 3, fontSize: 12, color: ds.ink4 }}>{r.days}일간</div> : null}
                  </td>
                  <td style={{ ...td, ...ellipsis }} title={r.location}>{r.location}</td>
                  <td style={{ ...td, textAlign: "right", color: ds.ink }}>
                    {num(r.participants)}명
                    <div style={{ marginTop: 3, fontSize: 12, color: ds.ink4 }}>정원 {num(r.capacity)}</div>
                  </td>
                  <td style={{ ...td, textAlign: "right", color: ds.ink }}>{num(r.programs.length)}개</td>
                  <td style={{ ...td, textAlign: "right", color: ds.ink }}>
                    {r.reviews.length ? (
                      <>
                        <span style={{ color: ds.amber }}>★</span> {r.avgRating.toFixed(1)}
                        <div style={{ marginTop: 3, fontSize: 12, color: ds.ink4 }}>{num(r.reviews.length)}건</div>
                      </>
                    ) : (
                      <span style={{ color: ds.ink4 }}>없음</span>
                    )}
                  </td>
                  <td style={{ ...td, textAlign: "right", color: r.galleryCount ? ds.ink : ds.ink4 }}>
                    {r.galleryCount ? `${num(r.galleryCount)}건` : "없음"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {detail ? <PastEventDetail ev={detail} onClose={() => setDetail(null)} /> : null}
    </div>
  );
}

const td = { padding: "14px 20px", fontSize: 14, color: ds.ink2, verticalAlign: "middle" };
const ellipsis = { whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" };

function Message({ children }) {
  return <div style={{ padding: "64px 20px", textAlign: "center", fontSize: 14, color: ds.ink3 }}>{children}</div>;
}

function SectionTitle({ children, extra }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", margin: "22px 0 10px" }}>
      <span style={{ fontSize: 14, fontWeight: 600, color: ds.ink }}>{children}</span>
      {extra ? <span style={{ fontSize: 12.5, color: ds.ink4 }}>{extra}</span> : null}
    </div>
  );
}

function PastEventDetail({ ev, onClose }) {
  const [posterBroken, setPosterBroken] = useState(false);
  const hourly = Array.isArray(ev.hourlyCongestion) ? ev.hourlyCongestion : [];
  const capacity = Number(ev.capacity) || 0;
  const hasPoster = Boolean(ev.imageUrl) && !posterBroken;
  const recentReviews = [...ev.reviews].sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))).slice(0, 3);

  return (
    <Overlay onClose={onClose} width={960}>
      <div style={{ display: "flex", flexWrap: "wrap", minHeight: 520 }}>
        {/* 왼쪽: 포스터 */}
        <div style={{ flex: "0 0 300px", maxWidth: "100%", minHeight: 400, position: "relative", background: "#0E1114", borderRight: `1px solid ${ds.line}` }}>
          {hasPoster ? (
            <img
              src={ev.imageUrl}
              alt={`${ev.name} 포스터`}
              data-no-fallback="1"
              onError={() => setPosterBroken(true)}
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain" }}
            />
          ) : (
            <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, padding: 24, textAlign: "center" }}>
              <ImagePlus size={28} color={ds.ink4} />
              <div style={{ fontSize: 14, fontWeight: 600, color: ds.ink3 }}>등록된 포스터가 없어요</div>
            </div>
          )}
        </div>

        {/* 오른쪽: 정보 */}
        <div style={{ flex: "1 1 400px", minWidth: 0, display: "flex", flexDirection: "column", maxHeight: "88vh" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "16px 16px 0 24px" }}>
            <Tag tone="neutral">종료</Tag>
            <span style={{ fontSize: 12.5, color: ds.ink4, fontFamily: "monospace" }}>{ev.id}</span>
            <span style={{ flex: 1 }} />
            <IconButton icon={X} label="닫기" onClick={onClose} />
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "10px 24px 20px" }}>
            <h3 style={{ margin: "0 0 6px", fontSize: 21, fontWeight: 700, color: ds.ink, lineHeight: 1.35, wordBreak: "keep-all" }}>{ev.name}</h3>
            {ev.description ? <p style={{ margin: "0 0 14px", fontSize: 14, color: ds.ink3, lineHeight: 1.6 }}>{ev.description}</p> : null}

            <InfoList
              items={[
                { label: "기간", value: ev.days ? `${ev.period} (${ev.days}일간)` : ev.period },
                { label: "장소", value: ev.location },
                { label: "주최", value: ev.organizer },
              ]}
            />

            {/* 핵심 수치 */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 8, marginTop: 16 }}>
              {[
                { label: "참가자", value: `${num(ev.participants)}명`, sub: capacity ? `정원 ${num(capacity)}명` : "" },
                { label: "체험 이용률", value: pct(ev.zoneUsage) },
                { label: "이벤트 참여율", value: pct(ev.eventRate) },
                { label: "평균 혼잡도", value: pct(ev.avgCongestion) },
              ].map((m) => (
                <div key={m.label} style={{ padding: "12px 14px", borderRadius: 10, background: ds.bg, border: `1px solid ${ds.line}` }}>
                  <div style={{ fontSize: 12.5, color: ds.ink3 }}>{m.label}</div>
                  <div style={{ marginTop: 6, fontSize: 18, fontWeight: 700, color: ds.ink }}>{m.value}</div>
                  {m.sub ? <div style={{ marginTop: 2, fontSize: 11.5, color: ds.ink4 }}>{m.sub}</div> : null}
                </div>
              ))}
            </div>

            {/* 프로그램 */}
            <SectionTitle extra={ev.programs.length ? `신청 ${num(ev.enrolled)}건` : null}>운영한 프로그램 {ev.programs.length}개</SectionTitle>
            {ev.programs.length ? (
              <div style={{ border: `1px solid ${ds.line}`, borderRadius: 10 }}>
                {ev.programs.map((p, i) => (
                  <div key={p.programId} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderTop: i ? `1px solid ${ds.line}` : "none" }}>
                    <Tag tone={PROGRAM_TONE[p.category] || "neutral"}>{p.category || "프로그램"}</Tag>
                    <span style={{ flex: 1, minWidth: 0, fontSize: 14, color: ds.ink, ...ellipsis }}>{p.name}</span>
                    <span style={{ fontSize: 13, color: ds.ink3, whiteSpace: "nowrap" }}>신청 {num(p.enrolled)}명</span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: 13, color: ds.ink4 }}>등록된 프로그램이 없어요.</div>
            )}

            {/* 후기 */}
            <SectionTitle extra={ev.reviews.length ? `★ ${ev.avgRating.toFixed(1)} · 갤러리 ${num(ev.galleryCount)}건` : null}>
              행사 후기 {ev.reviews.length}건
            </SectionTitle>
            {recentReviews.length ? (
              <div style={{ display: "grid", gap: 8 }}>
                {recentReviews.map((r) => (
                  <div key={r.reviewId} style={{ padding: "12px 14px", borderRadius: 10, background: ds.bg, border: `1px solid ${ds.line}` }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ display: "inline-flex", gap: 1 }}>
                        {[1, 2, 3, 4, 5].map((n) => (
                          <Star key={n} size={12} color={ds.amber} fill={n <= r.rating ? ds.amber : "none"} />
                        ))}
                      </span>
                      <span style={{ fontSize: 13.5, fontWeight: 600, color: ds.ink, ...ellipsis }}>{r.reviewTitle || "후기"}</span>
                      <span style={{ marginLeft: "auto", fontSize: 12, color: ds.ink4, whiteSpace: "nowrap" }}>
                        {r.writerNickname} · {dot(r.createdAt)}
                      </span>
                    </div>
                    {r.content ? <div style={{ marginTop: 6, fontSize: 13, color: ds.ink3, lineHeight: 1.55 }}>{r.content}</div> : null}
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: ds.ink4 }}>
                <MessageSquare size={14} /> 아직 등록된 후기가 없어요.
              </div>
            )}

            {/* 혼잡도 (데이터가 있을 때만) */}
            {hourly.length > 0 && (
              <>
                <SectionTitle>시간대별 혼잡도</SectionTitle>
                <ResponsiveContainer width="100%" height={170}>
                  <AreaChart data={hourly} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                    <XAxis dataKey="time" tick={{ fontSize: 12, fill: ds.ink4 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 12, fill: ds.ink4 }} axisLine={false} tickLine={false} width={36} tickFormatter={(v) => `${v}%`} domain={[0, 100]} />
                    <Tooltip
                      cursor={{ stroke: ds.line }}
                      contentStyle={{ background: "#2A3038", border: `1px solid ${ds.line}`, borderRadius: 8, fontSize: 13 }}
                      labelStyle={{ color: ds.ink }}
                      formatter={(v) => [`${v}%`, "혼잡도"]}
                    />
                    <Area type="monotone" dataKey="value" stroke={ds.brand} strokeWidth={2} fill="rgba(4,89,247,0.12)" />
                  </AreaChart>
                </ResponsiveContainer>
              </>
            )}
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", padding: "14px 20px 18px", borderTop: `1px solid ${ds.line}` }}>
            <Button variant="secondary" onClick={onClose}>
              닫기
            </Button>
          </div>
        </div>
      </div>
    </Overlay>
  );
}
