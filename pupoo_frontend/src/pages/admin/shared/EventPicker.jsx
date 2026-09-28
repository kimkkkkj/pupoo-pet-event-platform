// 행사별 관리 화면(체험존·세션·프로그램·결제·참가자) 첫 단계의 "행사 선택" 목록.
// 5개 페이지에 복사돼 있던 큰 이미지 카드를 한 줄 요약형 카드로 통일했다.
import { useState } from "react";
import { CalendarDays, ChevronRight, MapPin } from "lucide-react";
import ds, { statusMap } from "./designTokens";
import { resolveImageUrl } from "../../../shared/utils/publicAssetUrl";
import { EmptyState, goToAdminPage } from "./adminUi";

import { isSwappingToFallback } from "../../../shared/utils/imageFallback";
const FILTERS = [
  { id: "all", label: "전체" },
  { id: "active", label: "운영 중" },
  { id: "pending", label: "대기" },
  { id: "ended", label: "종료" },
];

function matches(filter, ev) {
  if (!filter || filter === "all") return true;
  if (filter === "new") return ev.status === "pending";
  return ev.status === filter;
}

function Thumb({ src, icon: Icon }) {
  const [broken, setBroken] = useState(false);
  const url = src ? resolveImageUrl(src) : "";
  return (
    <div
      style={{
        width: 56,
        height: 56,
        borderRadius: 10,
        overflow: "hidden",
        flexShrink: 0,
        background: ds.bg,
        border: `1px solid ${ds.line}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {url && !broken ? (
        <img src={url} alt="" data-no-fallback="1" onError={(e) => { if (!isSwappingToFallback(e)) setBroken(true); }} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      ) : (
        <Icon size={22} color={ds.ink4} strokeWidth={1.8} />
      )}
    </div>
  );
}

function StatusPill({ status }) {
  const st = statusMap[status] || statusMap.pending;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        height: 22,
        padding: "0 8px",
        borderRadius: 6,
        background: st.bg,
        color: st.c,
        fontSize: 12,
        fontWeight: 600,
        flexShrink: 0,
      }}
    >
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: st.c }} />
      {st.l}
    </span>
  );
}

/**
 * @param events       [{ eventId|id, name|eventName, status, date, location, imageUrl }]
 * @param filter       외부 탭 값(all/active/ended/pending). showFilter면 내부 필터를 쓴다.
 * @param actionLabel  카드 버튼 문구 (예: "체험존 관리")
 * @param icon         이미지가 없을 때와 버튼에 쓸 아이콘
 */
export default function EventPicker({
  events = [],
  loading = false,
  filter = "all",
  showFilter = false,
  onSelect,
  actionLabel = "관리하기",
  icon: Icon = CalendarDays,
  isMobile = false,
}) {
  const [innerFilter, setInnerFilter] = useState("all");
  const active = showFilter ? innerFilter : filter;
  const list = events.filter((ev) => matches(active, ev));
  const counts = Object.fromEntries(FILTERS.map((f) => [f.id, events.filter((ev) => matches(f.id, ev)).length]));

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 14, flexWrap: "wrap" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: ds.ink }}>행사 선택</h2>
          <p style={{ margin: "4px 0 0", fontSize: 13.5, color: ds.ink3 }}>관리할 행사를 선택하세요. 종료된 행사는 조회만 가능합니다.</p>
        </div>
        {showFilter ? (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {FILTERS.map((f) => {
              const on = innerFilter === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setInnerFilter(f.id)}
                  style={{
                    height: 32,
                    padding: "0 12px",
                    borderRadius: 999,
                    border: `1px solid ${on ? ds.brand : ds.line}`,
                    background: on ? ds.brand : "transparent",
                    color: on ? "#fff" : ds.ink3,
                    fontSize: 13,
                    fontWeight: 600,
                    fontFamily: ds.ff,
                    cursor: "pointer",
                  }}
                >
                  {f.label} {counts[f.id]}
                </button>
              );
            })}
          </div>
        ) : null}
      </div>

      {loading ? (
        <div style={{ padding: "72px 0", textAlign: "center", color: ds.ink3, fontSize: 14 }}>행사 목록을 불러오는 중...</div>
      ) : events.length === 0 ? (
        <Empty
          title="등록된 행사가 없습니다"
          desc="먼저 행사 관리에서 행사를 등록해 주세요."
          action={{ label: "행사 관리로 이동", onClick: () => goToAdminPage("eventManage") }}
        />
      ) : list.length === 0 ? (
        <Empty title="해당 상태의 행사가 없습니다" desc="위의 상태 필터를 바꿔 보세요." />
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(320px, 1fr))",
            gap: 12,
          }}
        >
          {list.map((ev) => {
            const isEnded = ev.status === "ended";
            return (
              <button
                key={ev.eventId || ev.id}
                type="button"
                disabled={isEnded}
                onClick={() => !isEnded && onSelect?.(ev)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  width: "100%",
                  padding: 14,
                  borderRadius: ds.r,
                  border: `1px solid ${ds.line}`,
                  background: ds.card,
                  color: ds.ink,
                  textAlign: "left",
                  fontFamily: ds.ff,
                  cursor: isEnded ? "default" : "pointer",
                  transition: "border-color .12s, background .12s",
                }}
                onMouseEnter={(e) => {
                  if (isEnded) return;
                  e.currentTarget.style.borderColor = "rgba(4,89,247,.6)";
                  e.currentTarget.style.background = ds.cardHover;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = ds.line;
                  e.currentTarget.style.background = ds.card;
                }}
              >
                <Thumb src={ev.imageUrl} icon={Icon} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                    <span
                      style={{
                        fontSize: 15.5,
                        fontWeight: 600,
                        color: ds.ink,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {ev.name || ev.eventName}
                    </span>
                    <StatusPill status={ev.status} />
                  </div>
                  {ev.date ? (
                    <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 5, fontSize: 13, color: ds.ink3 }}>
                      <CalendarDays size={13} /> {ev.date}
                    </div>
                  ) : null}
                  {ev.location ? (
                    <div style={{ marginTop: 3, display: "flex", alignItems: "center", gap: 5, fontSize: 13, color: ds.ink4 }}>
                      <MapPin size={13} /> {ev.location}
                    </div>
                  ) : null}
                </div>
                {isEnded ? (
                  <span style={{ fontSize: 12.5, color: ds.ink4, flexShrink: 0 }}>기간 만료</span>
                ) : (
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 2,
                      fontSize: 13,
                      fontWeight: 600,
                      color: ds.brandText,
                      flexShrink: 0,
                    }}
                  >
                    {actionLabel}
                    <ChevronRight size={16} />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Empty({ title, desc, action }) {
  return (
    <div style={{ border: `1px dashed ${ds.line}`, borderRadius: ds.r }}>
      <EmptyState icon={CalendarDays} title={title} description={desc} action={action} />
    </div>
  );
}
