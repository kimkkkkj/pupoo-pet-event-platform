import { useEffect, useState } from "react";
import {
  Activity,
  CalendarDays,
  ChevronLeft,
  ClipboardList,
  MapPin,
  QrCode,
  ScanLine,
  Ticket,
  UserCheck,
  Users,
} from "lucide-react";
import ds, { statusMap } from "../shared/designTokens";
import { Pill } from "../shared/Components";
import { injectEventImages, loadImageCache } from "../shared/eventImageStore";
import { axiosInstance } from "../../../app/http/axiosInstance";
import { getToken } from "../../../api/noticeApi";
import { sortAdminEventsByOperationalPriority } from "../shared/adminStatus";
import { resolveImageUrl } from "../../../shared/utils/publicAssetUrl";

const MODE_META = {
  checkin: {
    title: "체크인 현황",
    description: "행사를 선택해 최신 QR 체크인 로그를 확인하세요.",
  },
  session: {
    title: "세션 참여 현황",
    description: "행사를 선택해 프로그램별 체크인 진행 상황을 확인하세요.",
  },
  stats: {
    title: "참가 통계",
    description: "행사를 선택해 참가 승인, QR 발급, 체크인 집계를 확인하세요.",
  },
};

const authHeaders = () => {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

function calcStatus(startAt, endAt) {
  if (!startAt && !endAt) return "pending";
  const normalize = (value) => (value ? value.replace(/\./g, "-").trim() : value);
  const now = new Date();
  const start = startAt
    ? new Date(normalize(startAt).includes("T") ? normalize(startAt) : `${normalize(startAt)}T00:00:00+09:00`)
    : null;
  const end = endAt
    ? new Date(normalize(endAt).includes("T") ? normalize(endAt) : `${normalize(endAt)}T23:59:59+09:00`)
    : null;

  if (end && !Number.isNaN(end.getTime()) && now > end) return "ended";
  if (start && !Number.isNaN(start.getTime()) && now < start) return "pending";
  return "active";
}

function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function formatRate(value) {
  if (value == null || Number.isNaN(Number(value))) return "-";
  return `${Number(value).toFixed(1)}%`;
}

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div
      style={{
        background: ds.card,
        borderRadius: 12,
        border: `1px solid ${ds.line}`,
        padding: "14px 16px",
        display: "flex",
        alignItems: "center",
        gap: 12,
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 11,
          background: `${color}12`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <Icon size={18} color={color} />
      </div>
      <div>
        <div style={{ fontSize: 11, color: ds.ink4, fontWeight: 700 }}>{label}</div>
        <div style={{ fontSize: 20, color: ds.ink, fontWeight: 800, marginTop: 2 }}>{value}</div>
      </div>
    </div>
  );
}

function EventCard({ event, onSelect }) {
  const badge = statusMap[event.status] || statusMap.pending;
  return (
    <button
      type="button"
      onClick={() => onSelect(event)}
      style={{
        width: "100%",
        textAlign: "left",
        padding: 0,
        border: `1px solid ${ds.line}`,
        borderRadius: 16,
        overflow: "hidden",
        background: ds.card,
        cursor: "pointer",
        boxShadow: "0 14px 28px rgba(15,23,42,0.06)",
      }}
    >
      <div style={{ aspectRatio: "16 / 9", background: ds.lineSoft }}>
        <img
          src={resolveImageUrl(event.imageUrl || event.image)}
          alt={event.eventName || event.name}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      </div>
      <div style={{ padding: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "flex-start" }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: ds.ink, lineHeight: 1.4 }}>
            {event.eventName || event.name}
          </div>
          <Pill color={badge.c} bg={badge.bg}>
            {badge.l}
          </Pill>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 10, color: ds.ink4, fontSize: 12.5 }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
            <CalendarDays size={12} />
            {event.date || formatDateTime(event.startAt)}
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
            <MapPin size={12} />
            {event.location || "-"}
          </span>
        </div>
      </div>
    </button>
  );
}

function SectionCard({ title, children }) {
  return (
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
          padding: "14px 18px",
          borderBottom: `1px solid ${ds.line}`,
          fontSize: 14,
          fontWeight: 800,
          color: ds.ink,
        }}
      >
        {title}
      </div>
      <div style={{ overflowX: "auto" }}>{children}</div>
    </div>
  );
}

function EmptyPanel({ message }) {
  return (
    <div style={{ padding: "48px 20px", textAlign: "center", color: ds.ink4, fontSize: 13.5 }}>
      {message}
    </div>
  );
}

export default function ParticipantInsights({ mode = "checkin", initialEventId = null }) {
  const meta = MODE_META[mode] || MODE_META.checkin;
  const [events, setEvents] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [snapshot, setSnapshot] = useState(null);
  const [loadingSnapshot, setLoadingSnapshot] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadEvents() {
      try {
        await loadImageCache();
        const response = await axiosInstance.get("/api/admin/dashboard/events", {
          headers: authHeaders(),
        });
        const list = response.data?.data || response.data || [];
        const mapped = list.map((event) => ({
          ...event,
          status: calcStatus(
            event.startAt || event.date?.split("~")[0]?.trim(),
            event.endAt || event.date?.split("~")[1]?.trim(),
          ),
        }));
        if (!cancelled) {
          setEvents(sortAdminEventsByOperationalPriority(injectEventImages(mapped)));
        }
      } catch (error) {
        if (!cancelled) {
          setEvents([]);
        }
      } finally {
        if (!cancelled) {
          setLoadingEvents(false);
        }
      }
    }

    loadEvents();
    return () => {
      cancelled = true;
    };
  }, []);

  async function loadSnapshot(eventId) {
    setLoadingSnapshot(true);
    try {
      const response = await axiosInstance.get(
        `/api/admin/realtime/events/${eventId}/checkin-status`,
        { headers: authHeaders() },
      );
      setSnapshot(response.data?.data || response.data || null);
    } catch (error) {
      setSnapshot(null);
    } finally {
      setLoadingSnapshot(false);
    }
  }

  function selectEvent(event) {
    const eventId = event.eventId || event.id?.replace("EV-", "");
    setSelectedEvent(event);
    loadSnapshot(eventId);
  }

  useEffect(() => {
    if (!initialEventId || loadingEvents || selectedEvent || events.length === 0) {
      return;
    }

    const matchedEvent = events.find((event) => {
      const eventId = event.eventId || event.id?.replace("EV-", "");
      return String(eventId) === String(initialEventId);
    });

    if (matchedEvent) {
      selectEvent(matchedEvent);
    }
  }, [initialEventId, loadingEvents, selectedEvent, events]);

  const summary = snapshot?.checkinSummary;
  const logs = snapshot?.recentCheckinLogs || [];
  const programs = snapshot?.programCheckinSummaries || [];

  if (!selectedEvent) {
    return (
      <div>
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: ds.ink }}>{meta.title}</div>
          <div style={{ marginTop: 6, fontSize: 13, color: ds.ink4 }}>{meta.description}</div>
        </div>

        {loadingEvents ? (
          <EmptyPanel message="행사 목록을 불러오는 중입니다." />
        ) : events.length === 0 ? (
          <EmptyPanel message="선택할 수 있는 행사가 없습니다." />
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: 16,
            }}
          >
            {events.map((event) => (
              <EventCard
                key={event.eventId || event.id}
                event={event}
                onSelect={selectEvent}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => {
          setSelectedEvent(null);
          setSnapshot(null);
        }}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "7px 12px",
          marginBottom: 14,
          borderRadius: 8,
          border: `1px solid ${ds.line}`,
          background: ds.card,
          color: ds.ink3,
          fontSize: 12.5,
          fontWeight: 700,
          cursor: "pointer",
          fontFamily: ds.ff,
        }}
      >
        <ChevronLeft size={14} />
        행사 선택으로 돌아가기
      </button>

      <div style={{ marginBottom: 18 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: ds.ink }}>
            {selectedEvent.eventName || selectedEvent.name}
          </div>
          <Pill
            color={(statusMap[selectedEvent.status] || statusMap.pending).c}
            bg={(statusMap[selectedEvent.status] || statusMap.pending).bg}
          >
            {(statusMap[selectedEvent.status] || statusMap.pending).l}
          </Pill>
        </div>
        <div style={{ marginTop: 8, display: "flex", gap: 12, flexWrap: "wrap", color: ds.ink4, fontSize: 12.5 }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
            <CalendarDays size={12} />
            {selectedEvent.date || formatDateTime(selectedEvent.startAt)}
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
            <MapPin size={12} />
            {selectedEvent.location || "-"}
          </span>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 12,
          marginBottom: 18,
        }}
      >
        <StatCard icon={Users} label="전체 신청" value={summary?.totalApplicants ?? 0} color={ds.brand} />
        <StatCard icon={UserCheck} label="승인 인원" value={summary?.approvedApplicants ?? 0} color="#3a4520" />
        <StatCard icon={QrCode} label="QR 발급" value={summary?.issuedQrCount ?? 0} color="#0F766E" />
        <StatCard icon={ScanLine} label="총 체크인" value={summary?.totalCheckins ?? 0} color="#2563EB" />
        <StatCard icon={Activity} label="현재 입장" value={summary?.currentInsideCount ?? 0} color="#7C3AED" />
        <StatCard icon={Ticket} label="체크인율" value={formatRate(summary?.checkedInRate)} color="#F59E0B" />
      </div>

      {loadingSnapshot ? (
        <EmptyPanel message="실시간 참가 데이터를 불러오는 중입니다." />
      ) : mode === "checkin" ? (
        <SectionCard title={`최근 체크인 로그 (${logs.length})`}>
          {logs.length === 0 ? (
            <EmptyPanel message="최근 체크인 로그가 없습니다." />
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 720 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${ds.line}` }}>
                  {["로그 ID", "QR ID", "부스", "유형", "처리 시각"].map((label) => (
                    <th
                      key={label}
                      style={{
                        padding: "10px 14px",
                        fontSize: 11.5,
                        fontWeight: 700,
                        color: ds.ink4,
                        textAlign: "left",
                      }}
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.logId} style={{ borderBottom: `1px solid ${ds.lineSoft}` }}>
                    <td style={{ padding: "10px 14px", fontSize: 12.5, color: ds.ink4 }}>{log.logId}</td>
                    <td style={{ padding: "10px 14px", fontSize: 12.5, color: ds.ink }}>{log.qrId}</td>
                    <td style={{ padding: "10px 14px", fontSize: 12.5, color: ds.ink }}>{log.boothName || "-"}</td>
                    <td style={{ padding: "10px 14px" }}>
                      <Pill
                        color={log.checkType === "CHECKOUT" ? ds.red : "#2563EB"}
                        bg={log.checkType === "CHECKOUT" ? ds.redSoft : "#DBEAFE"}
                      >
                        {log.checkType}
                      </Pill>
                    </td>
                    <td style={{ padding: "10px 14px", fontSize: 12.5, color: ds.ink3 }}>
                      {formatDateTime(log.checkedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </SectionCard>
      ) : mode === "session" ? (
        <SectionCard title={`프로그램 체크인 요약 (${programs.length})`}>
          {programs.length === 0 ? (
            <EmptyPanel message="표시할 프로그램 체크인 데이터가 없습니다." />
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 860 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${ds.line}` }}>
                  {["프로그램", "부스", "신청", "승인", "체크인", "대기", "상태"].map((label) => (
                    <th
                      key={label}
                      style={{
                        padding: "10px 14px",
                        fontSize: 11.5,
                        fontWeight: 700,
                        color: ds.ink4,
                        textAlign: "left",
                      }}
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {programs.map((program) => (
                  <tr key={program.programId} style={{ borderBottom: `1px solid ${ds.lineSoft}` }}>
                    <td style={{ padding: "10px 14px", fontSize: 12.5, color: ds.ink, fontWeight: 700 }}>
                      {program.programTitle}
                    </td>
                    <td style={{ padding: "10px 14px", fontSize: 12.5, color: ds.ink3 }}>
                      {program.boothName || "-"}
                    </td>
                    <td style={{ padding: "10px 14px", fontSize: 12.5, color: ds.ink3 }}>{program.appliedCount}</td>
                    <td style={{ padding: "10px 14px", fontSize: 12.5, color: ds.ink3 }}>{program.approvedCount}</td>
                    <td style={{ padding: "10px 14px", fontSize: 12.5, color: ds.ink3 }}>{program.checkedInCount}</td>
                    <td style={{ padding: "10px 14px", fontSize: 12.5, color: ds.ink3 }}>{program.waitingCount}</td>
                    <td style={{ padding: "10px 14px" }}>
                      <Pill
                        color={program.ended ? ds.red : program.started ? "#0F766E" : "#F59E0B"}
                        bg={program.ended ? ds.redSoft : program.started ? "#DCFCE7" : "#FEF3C7"}
                      >
                        {program.ended ? "종료" : program.started ? "진행 중" : "대기"}
                      </Pill>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </SectionCard>
      ) : (
        <div style={{ display: "grid", gap: 16 }}>
          <SectionCard title="참가 집계">
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 680 }}>
              <tbody>
                {[
                  ["전체 신청", summary?.totalApplicants ?? 0],
                  ["승인 인원", summary?.approvedApplicants ?? 0],
                  ["QR 발급 수", summary?.issuedQrCount ?? 0],
                  ["총 체크인", summary?.totalCheckins ?? 0],
                  ["총 체크아웃", summary?.totalCheckouts ?? 0],
                  ["현재 입장 인원", summary?.currentInsideCount ?? 0],
                  ["체크인율", formatRate(summary?.checkedInRate)],
                  ["최종 갱신", formatDateTime(summary?.latestUpdatedAt)],
                ].map(([label, value]) => (
                  <tr key={label} style={{ borderBottom: `1px solid ${ds.lineSoft}` }}>
                    <td style={{ padding: "12px 14px", fontSize: 12.5, color: ds.ink4, width: "32%" }}>{label}</td>
                    <td style={{ padding: "12px 14px", fontSize: 13, color: ds.ink, fontWeight: 700 }}>{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </SectionCard>

          <SectionCard title={`프로그램별 요약 (${programs.length})`}>
            {programs.length === 0 ? (
              <EmptyPanel message="프로그램별 집계 데이터가 없습니다." />
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 860 }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${ds.line}` }}>
                    {["프로그램", "카테고리", "부스", "신청", "승인+체크인", "체크인", "대기"].map((label) => (
                      <th
                        key={label}
                        style={{
                          padding: "10px 14px",
                          fontSize: 11.5,
                          fontWeight: 700,
                          color: ds.ink4,
                          textAlign: "left",
                        }}
                      >
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {programs.map((program) => (
                    <tr key={program.programId} style={{ borderBottom: `1px solid ${ds.lineSoft}` }}>
                      <td style={{ padding: "10px 14px", fontSize: 12.5, color: ds.ink, fontWeight: 700 }}>
                        {program.programTitle}
                      </td>
                      <td style={{ padding: "10px 14px", fontSize: 12.5, color: ds.ink3 }}>{program.category}</td>
                      <td style={{ padding: "10px 14px", fontSize: 12.5, color: ds.ink3 }}>{program.boothName || "-"}</td>
                      <td style={{ padding: "10px 14px", fontSize: 12.5, color: ds.ink3 }}>{program.appliedCount}</td>
                      <td style={{ padding: "10px 14px", fontSize: 12.5, color: ds.ink3 }}>{program.approvedCount}</td>
                      <td style={{ padding: "10px 14px", fontSize: 12.5, color: ds.ink3 }}>{program.checkedInCount}</td>
                      <td style={{ padding: "10px 14px", fontSize: 12.5, color: ds.ink3 }}>{program.waitingCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </SectionCard>
        </div>
      )}
    </div>
  );
}
