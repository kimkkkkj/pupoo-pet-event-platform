// 관리자 홈: 들어오자마자 "지금 처리할 일"을 보여주고, 누르면 해당 관리 화면으로 이동한다.
// 차트 중심의 상세 지표는 "운영 분석"(HomeDashboard) 화면으로 분리했다.
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  ChevronRight,
  RefreshCw,
  CalendarDays,
  History,
} from "lucide-react";
import ds from "../shared/designTokens";
import { EmptyState, StatusBadge } from "../shared/adminUi";
import { axiosInstance } from "../../../app/http/axiosInstance";
import { getToken } from "../../../api/noticeApi";

const DASHBOARD_TARGET_KEY = "pupoo_admin_dashboard_target";
const DASHBOARD_TARGET_EVENT = "pupoo-admin-dashboard-target";

const authHeaders = () => {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const unwrap = (res) => res?.data?.data ?? res?.data ?? null;
const toArray = (payload) =>
  Array.isArray(payload?.content) ? payload.content : Array.isArray(payload) ? payload : [];

async function get(url, params, fallback) {
  try {
    return unwrap(await axiosInstance.get(url, { headers: authHeaders(), params }));
  } catch (error) {
    console.error(`[TodayDashboard] request failed: ${url}`, error);
    return fallback;
  }
}

async function getAllPages(url, params = {}, maxPages = 3) {
  const rows = [];
  for (let page = 0; page < maxPages; page += 1) {
    const payload = await get(url, { ...params, page, size: 200 }, null);
    rows.push(...toArray(payload));
    if (!payload || payload.last || page >= Number(payload.totalPages ?? 1) - 1) break;
  }
  return rows;
}

/** 다른 관리 화면으로 이동 (Dashboard.jsx가 이 이벤트를 받아 메뉴를 바꾼다) */
function goTo(page) {
  try {
    sessionStorage.setItem(DASHBOARD_TARGET_KEY, page);
  } catch {
    // 저장소를 못 써도 이벤트로 이동은 동작한다.
  }
  window.dispatchEvent(new CustomEvent(DASHBOARD_TARGET_EVENT, { detail: { page } }));
}

const num = (v) => Number(v || 0).toLocaleString("ko-KR");
const won = (v) => {
  const n = Number(v || 0);
  if (n >= 100000000) return `${(n / 100000000).toFixed(1).replace(/\.0$/, "")}억 원`;
  if (n >= 10000) return `${Math.round(n / 10000).toLocaleString("ko-KR")}만 원`;
  return `${n.toLocaleString("ko-KR")}원`;
};
const dateRange = (s, e) => {
  const f = (v) => (v ? String(v).slice(0, 10).replace(/-/g, ".") : "");
  return [f(s), f(e)].filter(Boolean).join(" ~ ");
};
const relTime = (v) => {
  const t = v ? new Date(v).getTime() : NaN;
  if (Number.isNaN(t)) return "";
  const diff = Date.now() - t;
  if (diff < 60000) return "방금 전";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}분 전`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}시간 전`;
  return `${Math.floor(diff / 86400000)}일 전`;
};
const EVENT_STATUS = { ONGOING: "active", PLANNED: "pending", ENDED: "ended", CANCELLED: "ended" };

// 관리자 로그의 "METHOD /api/admin/..."를 읽기 쉬운 문장으로 바꾼다.
const LOG_TARGETS = [
  ["notices", "공지"],
  ["notifications", "알림"],
  ["refunds", "환불"],
  ["payments", "결제"],
  ["reports", "신고"],
  ["users", "회원"],
  ["programs", "프로그램"],
  ["zones", "체험존"],
  ["booths", "부스"],
  ["speakers", "연사"],
  ["galleries", "갤러리"],
  ["qnas", "Q&A"],
  ["faqs", "FAQ"],
  ["banned-words", "금지어"],
  ["moderation", "게시물 검토"],
  ["events", "행사"],
  ["chatbot", "AI 비서"],
];
function describeLog(log) {
  const label = String(log.actionLabel || log.action || "");
  const [method = "", path = ""] = label.split(" ");
  const target = LOG_TARGETS.find(([key]) => path.includes(`/${key}`))?.[1] || "관리 기능";
  if (target === "AI 비서") return "AI 비서 사용";
  const verb = { POST: "등록·실행", PUT: "수정", PATCH: "수정", DELETE: "삭제" }[method.toUpperCase()] || "처리";
  return `${target} ${verb}`;
}

export default function TodayDashboard() {
  const [data, setData] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [updatedAt, setUpdatedAt] = useState(null);
  const [width, setWidth] = useState(() => (typeof window === "undefined" ? 1440 : window.innerWidth));

  useEffect(() => {
    const onResize = () => setWidth(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const load = useCallback(async () => {
    setRefreshing(true);
    const [eventsPayload, performance, payments, refunds, reportsPayload, qnaPayload, logsPayload, summary] = await Promise.all([
      get("/api/admin/dashboard/realtime/events", { page: 0, size: 120, sort: "startAt,asc" }, { content: [] }),
      get("/api/admin/analytics/events", { page: 0, size: 120 }, []),
      getAllPages("/api/admin/payments", { sort: "requestedAt,desc" }),
      getAllPages("/api/admin/refunds", { sort: "requestedAt,desc" }),
      get("/api/admin/reports", { page: 0, size: 1, status: "PENDING" }, null),
      get("/api/qnas", { page: 0, size: 100 }, null),
      get("/api/admin/logs", { page: 0, size: 6 }, { content: [] }),
      get("/api/admin/dashboard/realtime/summary", {}, {}),
    ]);

    const events = toArray(eventsPayload);
    const perf = new Map(toArray(performance).map((p) => [Number(p.eventId), p]));
    const approved = payments.filter((p) => p.status === "APPROVED");

    setData({
      tasks: {
        refunds: refunds.filter((r) => r.status === "REQUESTED").length,
        failedPayments: payments.filter((p) => p.status === "FAILED").length,
        reports: Number(reportsPayload?.totalElements ?? toArray(reportsPayload).length) || 0,
        qnas: toArray(qnaPayload).filter((q) => q.status === "WAITING" && !q.answerContent).length,
      },
      counts: {
        total: events.length,
        ongoing: events.filter((e) => e.status === "ONGOING").length,
        planned: events.filter((e) => e.status === "PLANNED").length,
        participants: toArray(performance).reduce((s, p) => s + (Number(p.approvedRegistrationCount) || 0), 0),
        revenue: approved.reduce((s, p) => s + (Number(String(p.amount ?? 0).replace(/[^\d.-]/g, "")) || 0), 0),
        approvedCount: approved.length,
        todayCheckin: Number(summary?.todayCheckinCount) || 0,
      },
      events: events.map((e) => {
        const p = perf.get(Number(e.eventId)) || {};
        const reg = Number(p.approvedRegistrationCount) || 0;
        const chk = Number(p.checkinCount) || 0;
        return { ...e, reg, chk, rate: reg > 0 ? Math.round((chk / reg) * 100) : 0 };
      }),
      logs: toArray(logsPayload).slice(0, 6),
    });
    setUpdatedAt(new Date());
    setRefreshing(false);
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 60000);
    return () => clearInterval(id);
  }, [load]);

  // 진행 중 → 예정(가까운 순) → 최근 종료 순으로 5개만 보여준다.
  const eventRows = useMemo(() => {
    if (!data) return [];
    const order = { ONGOING: 0, PLANNED: 1, ENDED: 2, CANCELLED: 3 };
    return [...data.events]
      .sort((a, b) => {
        const d = (order[a.status] ?? 9) - (order[b.status] ?? 9);
        if (d) return d;
        const ta = new Date(a.startAt).getTime();
        const tb = new Date(b.startAt).getTime();
        return a.status === "PLANNED" ? ta - tb : tb - ta;
      })
      .slice(0, 5);
  }, [data]);

  const isMobile = width < 768;
  const isNarrow = width < 1100;

  if (!data) {
    return <div style={{ padding: "80px 0", textAlign: "center", color: ds.ink3, fontSize: 14 }}>오늘의 운영 현황을 불러오는 중...</div>;
  }

  const tasks = [
    { key: "refunds", page: "refundManage", label: "환불 요청", desc: "승인 또는 거절이 필요해요", count: data.tasks.refunds },
    { key: "failedPayments", page: "paymentManage", label: "결제 실패", desc: "결제 상태를 확인해 주세요", count: data.tasks.failedPayments },
    { key: "reports", page: "reports", label: "신고 대기", desc: "검토가 필요한 신고예요", count: data.tasks.reports },
    { key: "qnas", page: "boardManage", label: "Q&A 답변 대기", desc: "답변을 기다리는 질문이에요", count: data.tasks.qnas },
  ];
  const todo = tasks.reduce((s, t) => s + t.count, 0);

  return (
    <div style={{ display: "grid", gap: 24 }}>
      {/* 처리할 일 */}
      <section>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 12, flexWrap: "wrap" }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: ds.ink }}>
            처리할 일 <span style={{ marginLeft: 4, color: todo > 0 ? ds.brandText : ds.ink4 }}>{num(todo)}</span>
          </h3>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 13, color: ds.ink4 }}>{updatedAt ? `${relTime(updatedAt)} 갱신` : ""}</span>
            <HeaderButton icon={RefreshCw} onClick={load} spinning={refreshing}>
              새로고침
            </HeaderButton>
            <HeaderButton icon={BarChart3} onClick={() => goTo("analytics")}>
              운영 분석
            </HeaderButton>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : isNarrow ? "repeat(2, minmax(0, 1fr))" : "repeat(4, minmax(0, 1fr))", gap: 12 }}>
          {tasks.map((t) => (
            <TaskCard key={t.key} task={t} />
          ))}
        </div>
      </section>

      {/* 핵심 숫자 */}
      <section>
        <SectionTitle>운영 요약</SectionTitle>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "repeat(2, minmax(0, 1fr))" : "repeat(4, minmax(0, 1fr))",
            background: ds.card,
            border: `1px solid ${ds.line}`,
            borderRadius: ds.r,
          }}
        >
          {[
            { label: "전체 행사", value: `${num(data.counts.total)}개`, sub: `진행 ${data.counts.ongoing} · 예정 ${data.counts.planned}` },
            { label: "승인 참가자", value: `${num(data.counts.participants)}명`, sub: "전체 행사 합계" },
            { label: "결제 금액", value: won(data.counts.revenue), sub: `승인 결제 ${num(data.counts.approvedCount)}건` },
            { label: "오늘 체크인", value: `${num(data.counts.todayCheckin)}명`, sub: "현장 입장 기준" },
          ].map((m, i) => (
            <div
              key={m.label}
              style={{
                padding: "18px 20px",
                borderLeft: !isMobile && i ? `1px solid ${ds.line}` : "none",
                borderTop: isMobile && i >= 2 ? `1px solid ${ds.line}` : "none",
              }}
            >
              <div style={{ fontSize: 13.5, color: ds.ink3 }}>{m.label}</div>
              <div style={{ marginTop: 8, fontSize: 24, fontWeight: 700, color: ds.ink, letterSpacing: -0.5 }}>{m.value}</div>
              <div style={{ marginTop: 4, fontSize: 12.5, color: ds.ink4 }}>{m.sub}</div>
            </div>
          ))}
        </div>
      </section>

      {/* 행사 현황 + 최근 활동 */}
      <div style={{ display: "grid", gridTemplateColumns: isNarrow ? "1fr" : width >= 1680 ? "minmax(0, 1fr) 440px" : "minmax(0, 1fr) 360px", gap: 16, alignItems: "start" }}>
        <Panel title="행사 현황" linkLabel="행사 관리" onLink={() => goTo("eventManage")}>
          {eventRows.length === 0 ? (
            <Empty text="등록된 행사가 없어요." icon={CalendarDays} />
          ) : (
            eventRows.map((e, i) => (
              <div
                key={e.eventId}
                style={{
                  display: "grid",
                  gridTemplateColumns: isMobile ? "1fr" : width >= 1680 ? "minmax(0, 1fr) 320px" : "minmax(0, 1fr) 220px",
                  gap: isMobile ? 10 : 24,
                  alignItems: "center",
                  padding: "14px 20px",
                  borderTop: i ? `1px solid ${ds.line}` : "none",
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 15, fontWeight: 600, color: ds.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {e.eventName}
                    </span>
                    <StatusBadge status={EVENT_STATUS[e.status] || "pending"} />
                  </div>
                  <div style={{ marginTop: 4, fontSize: 13, color: ds.ink4 }}>{dateRange(e.startAt, e.endAt)}</div>
                </div>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: ds.ink3 }}>
                    <span>참가 {num(e.reg)}명 · 체크인 {num(e.chk)}명</span>
                    <span style={{ color: ds.ink2, fontWeight: 600 }}>{e.rate}%</span>
                  </div>
                  <div style={{ marginTop: 6, height: 6, borderRadius: 3, background: ds.lineSoft, overflow: "hidden" }}>
                    <div style={{ width: `${Math.min(e.rate, 100)}%`, height: "100%", background: ds.brand, borderRadius: 3 }} />
                  </div>
                </div>
              </div>
            ))
          )}
        </Panel>

        <Panel title="최근 관리자 활동" linkLabel="전체 로그" onLink={() => goTo("adminLogs")}>
          {data.logs.length === 0 ? (
            <Empty text="아직 기록된 활동이 없어요." icon={History} />
          ) : (
            data.logs.map((log, i) => (
              <div
                key={log.logId ?? i}
                style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 20px", borderTop: i ? `1px solid ${ds.line}` : "none" }}
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: log.failed ? ds.red : ds.green,
                    flexShrink: 0,
                  }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, color: ds.ink }}>
                    {describeLog(log)}
                    {log.failed ? <span style={{ marginLeft: 6, fontSize: 12.5, color: ds.red }}>실패</span> : null}
                  </div>
                  <div style={{ marginTop: 2, fontSize: 12.5, color: ds.ink4 }}>
                    {log.adminName || "관리자"} · {relTime(log.createdAt)}
                  </div>
                </div>
              </div>
            ))
          )}
        </Panel>
      </div>
    </div>
  );
}

function SectionTitle({ children }) {
  return <h3 style={{ margin: "0 0 12px", fontSize: 16, fontWeight: 700, color: ds.ink }}>{children}</h3>;
}

function TaskCard({ task }) {
  const { label, desc, count, page } = task;
  const done = count === 0;
  return (
    <button
      type="button"
      onClick={() => goTo(page)}
      style={{
        display: "block",
        padding: "16px 18px",
        borderRadius: ds.r,
        border: `1px solid ${ds.line}`,
        background: ds.card,
        color: ds.ink,
        textAlign: "left",
        fontFamily: ds.ff,
        cursor: "pointer",
        transition: "border-color .12s, background .12s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = ds.cardHover;
        e.currentTarget.style.borderColor = "rgba(255,255,255,.16)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = ds.card;
        e.currentTarget.style.borderColor = ds.line;
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 14, color: ds.ink2 }}>
        {label}
        <ChevronRight size={16} color={ds.ink4} />
      </div>
      <div style={{ marginTop: 10, fontSize: 26, fontWeight: 700, letterSpacing: -0.5, color: done ? ds.ink4 : ds.ink }}>
        {num(count)}
        <span style={{ fontSize: 15, fontWeight: 500, marginLeft: 3, color: ds.ink3 }}>건</span>
      </div>
      <div style={{ marginTop: 6, fontSize: 13, color: done ? ds.ink4 : ds.ink3 }}>{done ? "대기 중인 항목 없음" : desc}</div>
    </button>
  );
}

function Panel({ title, linkLabel, onLink, children }) {
  return (
    <section style={{ background: ds.card, border: `1px solid ${ds.line}`, borderRadius: ds.r, minWidth: 0 }}>
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 20px",
          borderBottom: `1px solid ${ds.line}`,
        }}
      >
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: ds.ink }}>{title}</h3>
        {onLink ? (
          <button
            type="button"
            onClick={onLink}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 2,
              border: "none",
              background: "none",
              color: ds.brandText,
              fontSize: 13.5,
              fontWeight: 600,
              fontFamily: ds.ff,
              cursor: "pointer",
            }}
          >
            {linkLabel}
            <ChevronRight size={16} />
          </button>
        ) : null}
      </header>
      <div>{children}</div>
    </section>
  );
}

function HeaderButton({ icon: Icon, children, onClick, spinning = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        height: 38,
        padding: "0 14px",
        borderRadius: ds.rs,
        border: `1px solid ${ds.line}`,
        background: "transparent",
        color: ds.ink2,
        fontSize: 13.5,
        fontWeight: 600,
        fontFamily: ds.ff,
        cursor: "pointer",
      }}
    >
      <Icon size={15} style={spinning ? { animation: "spin 1s linear infinite" } : undefined} />
      {children}
    </button>
  );
}

function Empty({ text, icon }) {
  return <EmptyState icon={icon} title={text} compact />;
}
