import { useState, useEffect, useCallback, useRef } from "react";
import {
  Star,
  ThumbsUp,
  Eye,
  EyeOff,
  Trash2,
  Search,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Check,
  X,
  Loader2,
  RefreshCw,
  MessageCircle,
} from "lucide-react";
import ds, { statusMap } from "../shared/designTokens";
import { Pill } from "../shared/Components";
import { axiosInstance } from "../../../app/http/axiosInstance";
import { getToken } from "../../../api/noticeApi";

/* ── 스타일 ── */
const styles = `
@keyframes toastIn{from{opacity:0;transform:translateY(-12px)}to{opacity:1;transform:translateY(0)}}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes slideUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
@keyframes rowFadeOut{from{opacity:1;transform:translateX(0)}to{opacity:0;transform:translateX(-30px)}}
@keyframes spin{to{transform:rotate(360deg)}}
.review-row-removing{animation:rowFadeOut .3s ease forwards}
.review-row:hover{background:${ds.bg}}
.review-row:hover .review-actions{opacity:1!important}
`;

/* ── 유틸 ── */
const authHeaders = () => {
  const t = getToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
};

const devError = (...args) => {
  if (import.meta.env.DEV) {
    console.error(...args);
  }
};

function fmtDate(dt) {
  if (!dt) return "-";
  const d = new Date(dt);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

/* ── 리뷰 상태 맵 (백엔드 ReviewStatus: PUBLIC, REPORTED, BLINDED, DELETED) ── */
const reviewStatusMap = {
  PUBLIC: { l: "공개", c: ds.green, bg: ds.greenSoft },
  REPORTED: { l: "신고접수", c: ds.amber, bg: ds.amberSoft },
  BLINDED: { l: "블라인드", c: ds.red, bg: ds.redSoft },
  DELETED: { l: "삭제", c: ds.ink4, bg: ds.lineSoft },
};

/* ════════════════════════════════════════
   공통 UI 컴포넌트
   ════════════════════════════════════════ */

function Toast({ msg, type = "success", onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2200);
    return () => clearTimeout(t);
  }, [onDone]);
  const bg =
    type === "success" ? "#3a4520" : type === "error" ? "#EF4444" : "#F59E0B";
  return (
    <div
      style={{
        position: "fixed",
        top: 24,
        right: 24,
        zIndex: 9999,
        background: bg,
        color: "#fff",
        padding: "12px 22px",
        borderRadius: 10,
        fontSize: 13.5,
        fontWeight: 600,
        fontFamily: ds.ff,
        boxShadow: "0 8px 30px rgba(0,0,0,0.18)",
        animation: "toastIn .25s ease",
        display: "flex",
        alignItems: "center",
        gap: 8,
      }}
    >
      {type === "success" ? "✓" : "✕"} {msg}
    </div>
  );
}

function Overlay({ children, onClose }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 5000,
        background: "rgba(0,0,0,0.32)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        animation: "fadeIn .15s ease",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: ds.card,
          borderRadius: 16,
          width: 520,
          maxHeight: "85vh",
          overflow: "auto",
          boxShadow: "0 24px 60px rgba(0,0,0,0.18)",
          animation: "slideUp .2s ease",
        }}
      >
        {children}
      </div>
    </div>
  );
}

function ConfirmModal({
  title,
  msg,
  confirmLabel,
  confirmColor,
  onConfirm,
  onCancel,
  loading,
}) {
  return (
    <Overlay onClose={onCancel}>
      <div style={{ padding: "28px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 14,
          }}
        >
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              background: ds.redSoft,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <AlertTriangle size={18} color="#EF4444" />
          </div>
          <h3
            style={{ fontSize: 16, fontWeight: 800, color: ds.ink, margin: 0 }}
          >
            {title}
          </h3>
        </div>
        <p
          style={{
            fontSize: 13.5,
            color: ds.ink3,
            lineHeight: 1.6,
            whiteSpace: "pre-line",
            margin: "0 0 24px",
          }}
        >
          {msg}
        </p>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button
            onClick={onCancel}
            disabled={loading}
            style={{
              padding: "9px 20px",
              borderRadius: 8,
              border: `1px solid ${ds.line}`,
              background: ds.card,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: ds.ff,
              color: ds.ink3,
            }}
          >
            취소
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            style={{
              padding: "9px 20px",
              borderRadius: 8,
              border: "none",
              background: confirmColor || "#EF4444",
              color: "#fff",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: ds.ff,
              opacity: loading ? 0.5 : 1,
            }}
          >
            {loading ? "처리 중..." : confirmLabel || "삭제"}
          </button>
        </div>
      </div>
    </Overlay>
  );
}

function StarRating({ rating, size = 13 }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 1 }}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          size={size}
          color={i < rating ? ds.amber : ds.ink4}
          fill={i < rating ? ds.amber : "none"}
        />
      ))}
    </span>
  );
}

function Checkbox({ checked, onChange, size = 18 }) {
  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        onChange?.();
      }}
      style={{
        width: size,
        height: size,
        borderRadius: 5,
        border: checked ? "none" : `1.8px solid ${ds.line}`,
        background: checked ? ds.brand : ds.bg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        transition: "all .15s ease",
        flexShrink: 0,
      }}
    >
      {checked && <Check size={size - 6} color="#fff" strokeWidth={3} />}
    </div>
  );
}

/* ════════════════════════════════════════
   상세 모달
   ════════════════════════════════════════ */
function DetailModal({ item, onClose, onBlind, onRestore, onDelete }) {
  if (!item) return null;
  const st = reviewStatusMap[item.reviewStatus] || reviewStatusMap.PUBLIC;
  const isBlinded = item.reviewStatus === "BLINDED";
  return (
    <Overlay onClose={onClose}>
      <div style={{ padding: "28px" }}>
        {/* 헤더 */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: 20,
          }}
        >
          <div style={{ flex: 1 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 6,
              }}
            >
              <Pill color={st.c} bg={st.bg}>
                {st.l}
              </Pill>
              <span style={{ fontSize: 11, color: ds.ink4 }}>
                #{item.reviewId}
              </span>
            </div>
            <h3
              style={{
                fontSize: 17,
                fontWeight: 800,
                color: ds.ink,
                margin: 0,
                lineHeight: 1.4,
              }}
            >
              행사후기 상세
            </h3>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              border: `1px solid ${ds.line}`,
              background: ds.card,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <X size={15} color={ds.ink3} />
          </button>
        </div>

        {/* 메타 정보 */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "12px",
            padding: "16px",
            background: ds.bg,
            borderRadius: 10,
            marginBottom: 20,
          }}
        >
          {[
            { label: "작성자 ID", value: `회원${item.userId}` },
            { label: "행사 ID", value: `#${item.eventId}` },
            {
              label: "평점",
              value: <StarRating rating={item.rating} size={14} />,
            },
            { label: "작성일", value: fmtDate(item.createdAt) },
            { label: "조회수", value: item.viewCount ?? 0 },
            {
              label: "상태",
              value: (
                <Pill color={st.c} bg={st.bg}>
                  {st.l}
                </Pill>
              ),
            },
          ].map((m, i) => (
            <div key={i}>
              <span style={{ fontSize: 11, color: ds.ink4, fontWeight: 600 }}>
                {m.label}
              </span>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: ds.ink2,
                  marginTop: 3,
                }}
              >
                {m.value}
              </div>
            </div>
          ))}
        </div>

        {/* 후기 내용 */}
        {item.content && (
          <div style={{ marginBottom: 24 }}>
            <span
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: ds.ink4,
                marginBottom: 8,
                display: "block",
              }}
            >
              후기 내용
            </span>
            <div
              style={{
                padding: "14px 16px",
                background: ds.bg,
                borderRadius: 10,
                border: "1px solid #F0F0F5",
                fontSize: 13.5,
                color: ds.ink2,
                lineHeight: 1.7,
                whiteSpace: "pre-wrap",
                minHeight: 60,
              }}
            >
              {item.content}
            </div>
          </div>
        )}

        {/* 신고 정보 */}
        {item.totalReportCount > 0 && (
          <div
            style={{
              padding: "10px 14px",
              borderRadius: 8,
              background: ds.redSoft,
              color: ds.red,
              fontSize: 12.5,
              fontWeight: 600,
              marginBottom: 20,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <AlertTriangle size={14} />총 신고 {item.totalReportCount}건 (처리
            대기 {item.pendingReportCount}건)
          </div>
        )}

        {/* 하단 액션 */}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 8,
            borderTop: `1px solid ${ds.line}`,
            paddingTop: 18,
          }}
        >
          {isBlinded ? (
            <button
              onClick={() => onRestore(item)}
              style={{
                padding: "9px 18px",
                borderRadius: 8,
                border: `1px solid ${ds.line}`,
                background: ds.card,
                fontSize: 12.5,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: ds.ff,
                color: ds.green,
                display: "flex",
                alignItems: "center",
                gap: 5,
              }}
            >
              <Eye size={14} /> 공개 복구
            </button>
          ) : (
            <button
              onClick={() => onBlind(item)}
              style={{
                padding: "9px 18px",
                borderRadius: 8,
                border: `1px solid ${ds.line}`,
                background: ds.card,
                fontSize: 12.5,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: ds.ff,
                color: "#D97706",
                display: "flex",
                alignItems: "center",
                gap: 5,
              }}
            >
              <EyeOff size={14} /> 블라인드
            </button>
          )}
          <button
            onClick={() => onDelete(item)}
            style={{
              padding: "9px 18px",
              borderRadius: 8,
              border: "none",
              background: "#EF4444",
              color: "#fff",
              fontSize: 12.5,
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: ds.ff,
              display: "flex",
              alignItems: "center",
              gap: 5,
            }}
          >
            <Trash2 size={14} /> 삭제
          </button>
        </div>
      </div>
    </Overlay>
  );
}

/* ════════════════════════════════════════
   메인 컴포넌트
   ════════════════════════════════════════ */
export default function Reviews() {
  /* ── 상태 ── */
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const PAGE_SIZE = 20;

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [selected, setSelected] = useState(new Set());

  const [detail, setDetail] = useState(null);
  const [confirmModal, setConfirmModal] = useState(null);
  const [toast, setToast] = useState(null);
  const [removing, setRemoving] = useState(null);
  const [saving, setSaving] = useState(false);

  const showToast = (msg, type = "success") => setToast({ msg, type });

  /* ── 행사명 매핑용 ── */
  const eventMapRef = useRef({});
  const fetchEventMap = useCallback(async () => {
    try {
      const res = await axiosInstance.get("/api/admin/dashboard/events", {
        headers: authHeaders(),
      });
      const list = res.data?.data || res.data || [];
      const map = {};
      (Array.isArray(list) ? list : []).forEach((ev) => {
        map[ev.eventId] = ev.name;
      });
      eventMapRef.current = map;
    } catch {
      /* silent */
    }
  }, []);

  /* ══════════════════════════════════════
     API 호출
     ══════════════════════════════════════ */

  /**
   * 목록 조회: GET /api/admin/moderation/reviews
   * - AdminModerationReviewItem 반환 (모든 상태 포함)
   * - 응답: reviewId, eventId, userId, rating, reviewStatus, deleted, viewCount,
   *         createdAt, updatedAt, totalReportCount, pendingReportCount
   * - content는 admin 모더레이션 DTO에 없으므로 별도 조회 필요
   */
  const fetchList = useCallback(async (p = 1) => {
    setLoading(true);
    setError(null);
    try {
      // 기능: 관리자 모더레이션 엔드포인트만 기준으로 목록을 조회한다.
      const res = await axiosInstance.get("/api/admin/moderation/reviews", {
        params: { page: p - 1, size: PAGE_SIZE },
        headers: authHeaders(),
      });
      const payload = res.data?.data || res.data || {};
      const list = payload.content || payload || [];

      const mapped = list.map((r) => ({
        id: r.reviewId,
        reviewId: r.reviewId,
        eventId: r.eventId,
        userId: r.userId,
        author: `회원${r.userId}`,
        event: eventMapRef.current[r.eventId] || `행사 #${r.eventId}`,
        rating: r.rating ?? 0,
        content: r.content || null, // admin DTO에 없을 수 있음
        viewCount: r.viewCount || 0,
        reviewStatus: r.reviewStatus || "PUBLIC",
        deleted: r.deleted || false,
        createdAt: r.createdAt,
        date: fmtDate(r.createdAt),
        totalReportCount: r.totalReportCount || 0,
        pendingReportCount: r.pendingReportCount || 0,
      }));

      setItems(mapped);
      setTotalPages(
        payload.totalPages ||
          Math.ceil((payload.totalElements || mapped.length) / PAGE_SIZE),
      );
      setTotalElements(payload.totalElements ?? mapped.length);
      setPage(p);
      setSelected(new Set());
    } catch (adminErr) {
      devError("[Reviews] 관리자 리뷰 목록 조회 실패:", adminErr);
      setItems([]);
      setTotalPages(1);
      setTotalElements(0);
      setPage(p);
      setSelected(new Set());
      setError("리뷰 데이터를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEventMap().then(() => fetchList(1));
  }, [fetchEventMap, fetchList]);

  /**
   * 블라인드: PATCH /api/admin/moderation/reviews/{reviewId}/blind
   */
  const handleBlind = async (item) => {
    setSaving(true);
    try {
      await axiosInstance.patch(
        `/api/admin/moderation/reviews/${item.reviewId}/blind`,
        { reason: "관리자 블라인드 처리" },
        { headers: authHeaders() },
      );
      setDetail(null);
      showToast("후기가 블라인드 처리되었습니다.");
      fetchList(page);
    } catch (err) {
      devError("[Reviews] 블라인드 실패:", err);
      showToast("블라인드 처리에 실패했습니다.", "error");
    } finally {
      setSaving(false);
    }
  };

  /**
   * 복구: PATCH /api/admin/moderation/reviews/{reviewId}/restore
   */
  const handleRestore = async (item) => {
    setSaving(true);
    try {
      await axiosInstance.patch(
        `/api/admin/moderation/reviews/${item.reviewId}/restore`,
        { reason: "관리자 복구 처리" },
        { headers: authHeaders() },
      );
      setDetail(null);
      showToast("후기가 공개 복구되었습니다.");
      fetchList(page);
    } catch (err) {
      devError("[Reviews] 복구 실패:", err);
      showToast("복구 처리에 실패했습니다.", "error");
    } finally {
      setSaving(false);
    }
  };

  /**
   * 삭제: DELETE /api/admin/moderation/reviews/{reviewId}
   */
  const handleDelete = async () => {
    const item = confirmModal?.item;
    if (!item) return;
    const reviewId = item.reviewId;
    setSaving(true);
    setRemoving(reviewId);
    try {
      await axiosInstance.delete(`/api/admin/moderation/reviews/${reviewId}`, {
        headers: authHeaders(),
      });
      setTimeout(() => {
        setRemoving(null);
        setConfirmModal(null);
        setDetail(null);
        showToast("후기가 삭제되었습니다.");
        fetchList(page);
      }, 300);
    } catch (err) {
      devError("[Reviews] 삭제 실패:", err);
      setRemoving(null);
      setConfirmModal(null);
      showToast("삭제에 실패했습니다.", "error");
    } finally {
      setSaving(false);
    }
  };

  /**
   * 일괄 삭제
   */
  const handleBulkDelete = async () => {
    if (selected.size === 0) return;
    setSaving(true);
    try {
      const ids = [...selected];
      await Promise.allSettled(
        ids.map((id) =>
          axiosInstance.delete(`/api/admin/moderation/reviews/${id}`, {
            headers: authHeaders(),
          }),
        ),
      );
      setConfirmModal(null);
      setSelected(new Set());
      showToast(`${ids.length}건의 후기가 삭제되었습니다.`);
      fetchList(page);
    } catch (err) {
      devError("[Reviews] 일괄 삭제 실패:", err);
      setConfirmModal(null);
      setSelected(new Set());
      showToast("일괄 삭제에 실패했습니다.", "error");
    } finally {
      setSaving(false);
    }
  };

  /* ══════════════════════════════════════
     필터 / 선택 로직
     ══════════════════════════════════════ */
  const filtered = items.filter((r) => {
    const matchSearch =
      !search ||
      r.author?.includes(search) ||
      r.content?.includes(search) ||
      r.event?.includes(search) ||
      String(r.reviewId).includes(search);
    const matchStatus =
      filterStatus === "ALL" || r.reviewStatus === filterStatus;
    return matchSearch && matchStatus;
  });

  const allChecked =
    filtered.length > 0 && filtered.every((r) => selected.has(r.reviewId));
  const toggleAll = () => {
    if (allChecked) setSelected(new Set());
    else setSelected(new Set(filtered.map((r) => r.reviewId)));
  };
  const toggleOne = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  /* ── 통계 ── */
  const avgRating =
    items.length > 0
      ? (items.reduce((s, r) => s + (r.rating || 0), 0) / items.length).toFixed(
          1,
        )
      : "0.0";
  const blindedCount = items.filter((r) => r.reviewStatus === "BLINDED").length;
  const reportedCount = items.filter(
    (r) => r.reviewStatus === "REPORTED",
  ).length;

  /* ══════════════════════════════════════
     렌더링
     ══════════════════════════════════════ */
  return (
    <>
      <style>{styles}</style>

      {toast && (
        <Toast
          msg={toast.msg}
          type={toast.type}
          onDone={() => setToast(null)}
        />
      )}

      {detail && (
        <DetailModal
          item={detail}
          onClose={() => setDetail(null)}
          onBlind={handleBlind}
          onRestore={handleRestore}
          onDelete={(item) => {
            setDetail(null);
            setConfirmModal({
              title: "후기 삭제",
              msg: `리뷰 #${item.reviewId} (회원${item.userId})의 후기를 삭제하시겠습니까?\n삭제된 후기는 복구할 수 없습니다.`,
              item,
            });
          }}
        />
      )}

      {confirmModal && (
        <ConfirmModal
          title={confirmModal.title}
          msg={confirmModal.msg}
          confirmLabel={confirmModal.confirmLabel}
          confirmColor={confirmModal.confirmColor}
          loading={saving}
          onConfirm={confirmModal.isBulk ? handleBulkDelete : handleDelete}
          onCancel={() => setConfirmModal(null)}
        />
      )}

      {/* ── 통계 카드 ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 14,
          marginBottom: 20,
        }}
      >
        {[
          {
            label: "총 후기",
            value: totalElements,
            color: ds.brand,
            bg: ds.brandSoft,
            icon: MessageCircle,
          },
          {
            label: "평균 평점",
            value: avgRating,
            color: ds.amber,
            bg: ds.amberSoft,
            icon: Star,
          },
          {
            label: "신고접수",
            value: reportedCount,
            color: "#D97706",
            bg: ds.amberSoft,
            icon: AlertTriangle,
          },
          {
            label: "블라인드",
            value: blindedCount,
            color: ds.red,
            bg: ds.redSoft,
            icon: EyeOff,
          },
        ].map((s, i) => (
          <div
            key={i}
            style={{
              background: ds.card,
              borderRadius: ds.r,
              padding: "18px 20px",
              border: `1px solid ${ds.line}`,
              display: "flex",
              alignItems: "center",
              gap: 14,
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: s.bg,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <s.icon size={17} color={s.color} />
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: ds.ink4 }}>
                {s.label}
              </div>
              <div
                style={{
                  fontSize: 22,
                  fontWeight: 800,
                  color: ds.ink,
                  letterSpacing: -0.5,
                  lineHeight: 1.2,
                }}
              >
                {s.value}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── 테이블 카드 ── */}
      <div
        style={{
          background: ds.card,
          borderRadius: ds.r,
          border: `1px solid ${ds.line}`,
          overflow: "hidden",
        }}
      >
        {/* 헤더 바 */}
        <div
          style={{
            padding: "16px 22px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderBottom: `1px solid ${ds.line}`,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <h3
              style={{
                fontSize: 15,
                fontWeight: 700,
                color: ds.ink,
                margin: 0,
              }}
            >
              행사후기 관리
            </h3>
            <Pill color={ds.brand} bg={ds.brandSoft}>
              {totalElements}
            </Pill>
            {selected.size > 0 && (
              <Pill color={ds.red} bg={ds.redSoft}>
                {selected.size}건 선택
              </Pill>
            )}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 12px",
                borderRadius: ds.rs,
                border: `1px solid ${ds.line}`,
                background: ds.bg,
              }}
            >
              <Search size={13} color={ds.ink4} />
              <input
                placeholder="ID, 내용, 행사 검색…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  border: "none",
                  background: "none",
                  outline: "none",
                  fontSize: 12.5,
                  color: ds.ink,
                  fontFamily: ds.ff,
                  width: 160,
                }}
              />
              {search && (
                <X
                  size={12}
                  color={ds.ink4}
                  style={{ cursor: "pointer" }}
                  onClick={() => setSearch("")}
                />
              )}
            </div>
            {/* 상태 필터 — 백엔드 ReviewStatus: PUBLIC, REPORTED, BLINDED, DELETED */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              style={{
                padding: "6px 12px",
                borderRadius: ds.rs,
                border: `1px solid ${ds.line}`,
                background: ds.card,
                fontSize: 12,
                color: ds.ink3,
                fontFamily: ds.ff,
                fontWeight: 500,
                cursor: "pointer",
                outline: "none",
              }}
            >
              <option value="ALL">전체 상태</option>
              <option value="PUBLIC">공개</option>
              <option value="REPORTED">신고접수</option>
              <option value="BLINDED">블라인드</option>
              <option value="DELETED">삭제</option>
            </select>
            <button
              onClick={() => fetchList(page)}
              disabled={loading}
              style={{
                width: 34,
                height: 34,
                borderRadius: ds.rs,
                border: `1px solid ${ds.line}`,
                background: ds.card,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <RefreshCw
                size={14}
                color={ds.ink4}
                style={loading ? { animation: "spin .8s linear infinite" } : {}}
              />
            </button>
            {selected.size > 0 && (
              <button
                onClick={() =>
                  setConfirmModal({
                    title: "일괄 삭제",
                    msg: `선택한 ${selected.size}건의 후기를 삭제하시겠습니까?\n삭제된 후기는 복구할 수 없습니다.`,
                    isBulk: true,
                  })
                }
                style={{
                  padding: "6px 14px",
                  borderRadius: ds.rs,
                  border: "none",
                  background: ds.red,
                  color: "#fff",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: ds.ff,
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <Trash2 size={13} /> {selected.size}건 삭제
              </button>
            )}
          </div>
        </div>

        {error && (
          <div
            style={{
              margin: "12px 22px",
              padding: "10px 14px",
              borderRadius: 8,
              background: ds.amberSoft,
              color: ds.amber,
              fontSize: 12.5,
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <AlertTriangle size={14} /> {error}
          </div>
        )}

        {loading && items.length === 0 ? (
          <div style={{ padding: 60, textAlign: "center" }}>
            <Loader2
              size={28}
              color={ds.brand}
              style={{ animation: "spin .8s linear infinite" }}
            />
            <div style={{ fontSize: 13, color: ds.ink4, marginTop: 12 }}>
              후기를 불러오는 중…
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 60, textAlign: "center" }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                background: ds.brandSoft,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 14px",
              }}
            >
              <MessageCircle size={22} color={ds.brand} />
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: ds.ink }}>
              {search || filterStatus !== "ALL"
                ? "검색 결과가 없습니다"
                : "후기가 없습니다"}
            </div>
            <div style={{ fontSize: 12.5, color: ds.ink4, marginTop: 4 }}>
              {search || filterStatus !== "ALL"
                ? "다른 검색어나 필터를 시도해보세요"
                : "아직 등록된 후기가 없습니다"}
            </div>
          </div>
        ) : (
          <>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    {[
                      {
                        label: (
                          <Checkbox
                            checked={allChecked}
                            onChange={toggleAll}
                            size={16}
                          />
                        ),
                        w: 44,
                      },
                      { label: "ID", w: 60 },
                      { label: "작성자", w: 90 },
                      { label: "행사", w: 100 },
                      { label: "평점", w: 100 },
                      { label: "내용" },
                      { label: "작성일", w: 100 },
                      { label: "조회", w: 60, align: "right" },
                      { label: "신고", w: 50, align: "right" },
                      { label: "상태", w: 80 },
                      { label: "", w: 80 },
                    ].map((h, i) => (
                      <th
                        key={i}
                        style={{
                          padding: "10px 14px",
                          fontSize: 10.5,
                          fontWeight: 700,
                          color: ds.ink4,
                          textAlign: h.align || "left",
                          background: ds.bg,
                          borderBottom: `1px solid ${ds.line}`,
                          letterSpacing: 0.5,
                          textTransform: "uppercase",
                          whiteSpace: "nowrap",
                          width: h.w || "auto",
                        }}
                      >
                        {h.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => {
                    const st =
                      reviewStatusMap[r.reviewStatus] || reviewStatusMap.PUBLIC;
                    const isRemoving = removing === r.reviewId;
                    const isInactive =
                      r.reviewStatus === "BLINDED" ||
                      r.reviewStatus === "DELETED";
                    return (
                      <tr
                        key={r.reviewId}
                        className={`review-row ${isRemoving ? "review-row-removing" : ""}`}
                        onClick={() => setDetail(r)}
                        style={{
                          borderBottom: `1px solid ${ds.lineSoft}`,
                          cursor: "pointer",
                          transition: "background .08s",
                          opacity: isInactive ? 0.55 : 1,
                        }}
                      >
                        <td style={{ padding: "12px 14px" }}>
                          <Checkbox
                            checked={selected.has(r.reviewId)}
                            onChange={() => toggleOne(r.reviewId)}
                            size={16}
                          />
                        </td>
                        <td
                          style={{
                            padding: "12px 14px",
                            fontSize: 12,
                            color: ds.ink4,
                            fontVariantNumeric: "tabular-nums",
                          }}
                        >
                          #{r.reviewId}
                        </td>
                        <td
                          style={{
                            padding: "12px 14px",
                            fontSize: 13,
                            fontWeight: 700,
                            color: ds.ink,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {r.author}
                        </td>
                        <td
                          style={{
                            padding: "12px 14px",
                            fontSize: 13,
                            color: ds.ink3,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {r.event}
                        </td>
                        <td style={{ padding: "12px 14px" }}>
                          <StarRating rating={r.rating} size={12} />
                        </td>
                        <td
                          style={{
                            padding: "12px 14px",
                            fontSize: 13,
                            color: ds.ink3,
                          }}
                        >
                          <span
                            style={{
                              maxWidth: 220,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              display: "block",
                            }}
                          >
                            {r.content || "-"}
                          </span>
                        </td>
                        <td
                          style={{
                            padding: "12px 14px",
                            fontSize: 12.5,
                            color: ds.ink4,
                            whiteSpace: "nowrap",
                            fontVariantNumeric: "tabular-nums",
                          }}
                        >
                          {r.date}
                        </td>
                        <td
                          style={{
                            padding: "12px 14px",
                            fontSize: 12.5,
                            color: ds.ink4,
                            textAlign: "right",
                            fontVariantNumeric: "tabular-nums",
                          }}
                        >
                          {r.viewCount}
                        </td>
                        <td
                          style={{
                            padding: "12px 14px",
                            fontSize: 12.5,
                            textAlign: "right",
                            fontWeight: r.totalReportCount > 0 ? 700 : 400,
                            color: r.totalReportCount > 0 ? ds.red : ds.ink4,
                          }}
                        >
                          {r.totalReportCount}
                        </td>
                        <td style={{ padding: "12px 14px" }}>
                          <Pill color={st.c} bg={st.bg}>
                            {st.l}
                          </Pill>
                        </td>
                        <td
                          style={{ padding: "12px 14px" }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div
                            className="review-actions"
                            style={{
                              display: "flex",
                              gap: 4,
                              opacity: 0.3,
                              transition: "opacity .15s",
                            }}
                          >
                            {r.reviewStatus === "BLINDED" ? (
                              <button
                                title="공개 복구"
                                onClick={() => handleRestore(r)}
                                style={{
                                  width: 28,
                                  height: 28,
                                  borderRadius: 6,
                                  border: `1px solid ${ds.line}`,
                                  background: ds.card,
                                  cursor: "pointer",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                }}
                              >
                                <Eye size={13} color={ds.green} />
                              </button>
                            ) : (
                              <button
                                title="블라인드"
                                onClick={() => handleBlind(r)}
                                style={{
                                  width: 28,
                                  height: 28,
                                  borderRadius: 6,
                                  border: `1px solid ${ds.line}`,
                                  background: ds.card,
                                  cursor: "pointer",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                }}
                              >
                                <EyeOff size={13} color="#D97706" />
                              </button>
                            )}
                            <button
                              title="삭제"
                              onClick={() =>
                                setConfirmModal({
                                  title: "후기 삭제",
                                  msg: `리뷰 #${r.reviewId} (${r.author})의 후기를 삭제하시겠습니까?`,
                                  item: r,
                                })
                              }
                              style={{
                                width: 28,
                                height: 28,
                                borderRadius: 6,
                                border: `1px solid ${ds.line}`,
                                background: ds.card,
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              <Trash2 size={13} color={ds.red} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div
              style={{
                padding: "14px 22px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                borderTop: `1px solid ${ds.line}`,
              }}
            >
              <span style={{ fontSize: 12, color: ds.ink4 }}>
                총 {totalElements}건
                {filtered.length !== items.length &&
                  ` (필터 결과: ${filtered.length}건)`}
              </span>
              {totalPages > 1 && (
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <button
                    disabled={page <= 1}
                    onClick={() => fetchList(page - 1)}
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: 6,
                      border: `1px solid ${ds.line}`,
                      background: ds.card,
                      cursor: page <= 1 ? "not-allowed" : "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      opacity: page <= 1 ? 0.4 : 1,
                    }}
                  >
                    <ChevronLeft size={14} color={ds.ink3} />
                  </button>
                  {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 7) pageNum = i + 1;
                    else if (page <= 4) pageNum = i + 1;
                    else if (page >= totalPages - 3)
                      pageNum = totalPages - 6 + i;
                    else pageNum = page - 3 + i;
                    return (
                      <button
                        key={pageNum}
                        onClick={() => fetchList(pageNum)}
                        style={{
                          width: 30,
                          height: 30,
                          borderRadius: 6,
                          border: "none",
                          background:
                            pageNum === page ? ds.brand : "transparent",
                          color: pageNum === page ? "#fff" : ds.ink3,
                          fontSize: 12,
                          fontWeight: pageNum === page ? 700 : 500,
                          cursor: "pointer",
                          fontFamily: ds.ff,
                        }}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  <button
                    disabled={page >= totalPages}
                    onClick={() => fetchList(page + 1)}
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: 6,
                      border: `1px solid ${ds.line}`,
                      background: ds.card,
                      cursor: page >= totalPages ? "not-allowed" : "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      opacity: page >= totalPages ? 0.4 : 1,
                    }}
                  >
                    <ChevronRight size={14} color={ds.ink3} />
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
}
