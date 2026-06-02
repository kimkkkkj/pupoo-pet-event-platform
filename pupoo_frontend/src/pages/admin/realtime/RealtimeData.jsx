import { useState } from "react";
import {
  Flame,
  Zap,
  CheckCircle2,
  Trophy,
  Users,
  UserCheck,
  Clock,
  Activity,
} from "lucide-react";
import ds from "../shared/designTokens";
import DATA from "../shared/data";

/* ── 스탯 카드 ── */
function StatCard({ icon: I, label, value, sub }) {
  return (
    <div
      style={{
        background: ds.card,
        borderRadius: 10,
        border: `1px solid ${ds.line}`,
        padding: 16,
        display: "flex",
        alignItems: "center",
        gap: 12,
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 9,
          background: ds.bg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <I size={16} color={ds.ink3} />
      </div>
      <div>
        <div
          style={{
            fontSize: 11,
            color: ds.ink4,
            fontWeight: 600,
            marginBottom: 2,
          }}
        >
          {label}
        </div>
        <div style={{ fontSize: 18, fontWeight: 800, color: ds.ink }}>
          {value}
        </div>
        {sub && (
          <div style={{ fontSize: 10.5, color: ds.ink4, marginTop: 1 }}>
            {sub}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── 프로그레스 바 ── */
function ProgressBar({ pct, height = 5 }) {
  const color = pct >= 80 ? "#EF4444" : pct >= 50 ? "#F59E0B" : ds.brand;
  return (
    <div
      style={{
        flex: 1,
        height,
        borderRadius: height / 2,
        background: ds.lineSoft,
      }}
    >
      <div
        style={{
          width: `${Math.min(pct, 100)}%`,
          height: "100%",
          borderRadius: height / 2,
          background: color,
          transition: "width .3s",
        }}
      />
    </div>
  );
}

/* ── 혼잡도 레벨 ── */
function CongestionLabel({ pct }) {
  const level =
    pct >= 80
      ? { label: "혼잡", bg: ds.redSoft, color: ds.red }
      : pct >= 50
        ? { label: "보통", bg: ds.amberSoft, color: "#D97706" }
        : { label: "여유", bg: ds.greenSoft, color: "#059669" };
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        fontSize: 11,
        fontWeight: 700,
        padding: "2px 9px",
        borderRadius: 99,
        background: level.bg,
        color: level.color,
      }}
    >
      <span
        style={{
          width: 5,
          height: 5,
          borderRadius: "50%",
          background: level.color,
        }}
      />
      {pct}% · {level.label}
    </span>
  );
}

export default function RealtimeData() {
  const kpi = DATA.kpi || [];
  const zones = DATA.zones || [];
  const congestion = DATA.congestion || [];
  const contests = DATA.contests || [];

  return (
    <div style={{ display: "flex", gap: 16 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* KPI */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 12,
            marginBottom: 16,
          }}
        >
          {kpi.map((d, i) => {
            const icons = [Users, UserCheck, Clock, Activity];
            return (
              <StatCard
                key={d.id}
                icon={icons[i] || Activity}
                label={d.label}
                value={
                  typeof d.value === "number"
                    ? d.value.toLocaleString()
                    : d.value
                }
                sub={d.sub}
              />
            );
          })}
        </div>

        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}
        >
          {/* 체험 존 현황 */}
          <div
            style={{
              background: ds.card,
              borderRadius: 12,
              border: `1px solid ${ds.line}`,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "12px 20px",
                borderBottom: `1px solid ${ds.line}`,
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <span style={{ fontSize: 14, fontWeight: 800, color: ds.ink }}>
                체험 존 현황
              </span>
              <span style={{ fontSize: 12, fontWeight: 600, color: ds.ink4 }}>
                {zones.length}개
              </span>
            </div>
            <div style={{ padding: "14px 20px" }}>
              {zones.map((z) => {
                const p = Math.round((z.cur / z.max) * 100);
                const iconColor =
                  p >= 80 ? "#EF4444" : p >= 50 ? "#F59E0B" : ds.ink4;
                const Icon = p >= 80 ? Flame : p >= 50 ? Zap : CheckCircle2;
                return (
                  <div
                    key={z.name}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "8px 0",
                      borderBottom: `1px solid ${ds.lineSoft}`,
                    }}
                  >
                    <div
                      style={{
                        width: 30,
                        height: 30,
                        borderRadius: 8,
                        background: ds.bg,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <Icon size={14} color={iconColor} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          marginBottom: 5,
                        }}
                      >
                        <span
                          style={{
                            fontSize: 12.5,
                            fontWeight: 600,
                            color: ds.ink,
                          }}
                        >
                          {z.name}
                        </span>
                        <span style={{ fontSize: 11, color: ds.ink4 }}>
                          {z.cur}/{z.max}
                        </span>
                      </div>
                      <ProgressBar pct={p} height={4} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 부스 혼잡도 */}
          <div
            style={{
              background: ds.card,
              borderRadius: 12,
              border: `1px solid ${ds.line}`,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "12px 20px",
                borderBottom: `1px solid ${ds.line}`,
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <span style={{ fontSize: 14, fontWeight: 800, color: ds.ink }}>
                부스 혼잡도
              </span>
              <span style={{ fontSize: 12, fontWeight: 600, color: ds.ink4 }}>
                {congestion.length}개
              </span>
            </div>
            <div style={{ padding: "14px 20px" }}>
              {congestion.map((z) => (
                <div
                  key={z.zone}
                  style={{
                    padding: "8px 0",
                    borderBottom: `1px solid ${ds.lineSoft}`,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 6,
                    }}
                  >
                    <span
                      style={{ fontSize: 12.5, fontWeight: 600, color: ds.ink }}
                    >
                      {z.zone}
                    </span>
                    <CongestionLabel pct={z.pct} />
                  </div>
                  <ProgressBar pct={z.pct} height={4} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 우측: 콘테스트 현황 */}
      <div style={{ width: 260, flexShrink: 0 }}>
        <div
          style={{
            background: ds.card,
            borderRadius: 12,
            border: `1px solid ${ds.line}`,
            overflow: "hidden",
          }}
        >
          <div
            style={{ padding: "12px 20px", borderBottom: `1px solid ${ds.line}` }}
          >
            <span style={{ fontSize: 14, fontWeight: 800, color: ds.ink }}>
              콘테스트 현황
            </span>
          </div>
          <div style={{ padding: "6px 20px 14px" }}>
            {contests.map((c) => (
              <div
                key={c.name}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "12px 0",
                  borderBottom: `1px solid ${ds.lineSoft}`,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 7,
                      background: ds.bg,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Trophy size={13} color={ds.ink3} />
                  </div>
                  <div>
                    <div
                      style={{ fontSize: 12.5, fontWeight: 700, color: ds.ink }}
                    >
                      {c.name}
                    </div>
                    <div style={{ fontSize: 11, color: ds.ink4 }}>
                      {c.teams}팀
                    </div>
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: ds.ink }}>
                    {c.votes.toLocaleString()}
                    <span
                      style={{
                        fontSize: 10,
                        color: ds.ink4,
                        fontWeight: 400,
                      }}
                    >
                      {" "}
                      표
                    </span>
                  </div>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      fontSize: 10,
                      fontWeight: 700,
                      padding: "2px 8px",
                      borderRadius: 99,
                      background: c.live ? ds.greenSoft : ds.amberSoft,
                      color: c.live ? "#059669" : "#D97706",
                    }}
                  >
                    <span
                      style={{
                        width: 4,
                        height: 4,
                        borderRadius: "50%",
                        background: c.live ? "#3a4520" : "#F59E0B",
                      }}
                    />
                    {c.live ? "LIVE" : "투표중"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
