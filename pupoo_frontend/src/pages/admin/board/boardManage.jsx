import { useState, useEffect, useCallback, useRef } from "react";
import {
  Plus,
  X,
  Pencil,
  Trash2,
  Search,
  Star,
  Eye,
  ChevronDown,
  AlertTriangle,
  Check,
  MessageCircle,
  HelpCircle,
  Loader2,
  FileText,
} from "lucide-react";
import ds from "../shared/designTokens";
import { adminQnaApi, unwrap } from "../../../api/qnaApi";
import { axiosInstance } from "../../../app/http/axiosInstance";
import { getToken } from "../../../api/noticeApi";
import BannedWordsManage from "./BannedWordsManage";
import { Toast, Overlay, ConfirmModal, Checkbox, Field, DetailDialog, Tag, Button, EmptyState, FormSheet, goToAdminPage, ChoiceCards } from "../shared/adminUi";

const authHeaders = () => {
  const t = getToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
};

const devWarn = (...args) => {
  if (import.meta.env.DEV) {
    console.warn(...args);
  }
};

const devError = (...args) => {
  if (import.meta.env.DEV) {
    console.error(...args);
  }
};

const styles = `
@keyframes toastIn{from{opacity:0;transform:translateY(-12px)}to{opacity:1;transform:translateY(0)}}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes modalIn{from{transform:translateY(20px) scale(0.98);opacity:0}to{transform:translateY(0) scale(1);opacity:1}}
@keyframes slideUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
@keyframes slideIn{from{transform:translateX(100%)}to{transform:translateX(0)}}
@keyframes rowFadeOut{from{opacity:1;transform:translateX(0)}to{opacity:0;transform:translateX(-30px)}}
@keyframes spin{to{transform:rotate(360deg)}}
.row-removing{animation:rowFadeOut .3s ease forwards}
.board-row:hover .board-actions{opacity:1}
`;

/* ── 게시판 설정 ── */
const BOARD_CONFIG = {
  free: {
    dataKey: "boards",
    title: "자유게시판",
    writeLabel: "글쓰기",
    emptyMsg: "게시글이 없습니다",
    emptySub: "새 글을 작성해보세요",
    toastCreate: "게시글이 등록되었습니다.",
    toastUpdate: "게시글이 수정되었습니다.",
    toastDelete: "게시글이 삭제되었습니다.",
    deleteTitle: "게시글 삭제",
    detailTitle: "게시글 상세",
    formTitle: (edit) => (edit ? "게시글 수정" : "새 게시글 작성"),
    formSub: (edit) =>
      edit ? "게시글을 수정합니다" : "새 게시글을 작성합니다",
  },
  info: {
    dataKey: "infoBoards",
    title: "정보게시판",
    writeLabel: "글쓰기",
    emptyMsg: "게시글이 없습니다",
    emptySub: "새 글을 작성해보세요",
    toastCreate: "게시글이 등록되었습니다.",
    toastUpdate: "게시글이 수정되었습니다.",
    toastDelete: "게시글이 삭제되었습니다.",
    deleteTitle: "게시글 삭제",
    detailTitle: "게시글 상세",
    formTitle: (edit) => (edit ? "게시글 수정" : "새 게시글 작성"),
    formSub: (edit) =>
      edit ? "게시글을 수정합니다" : "새 게시글을 작성합니다",
  },
  review: {
    dataKey: "reviews",
    title: "행사후기",
    writeLabel: "후기 작성",
    emptyMsg: "행사후기가 없습니다",
    emptySub: "새 후기를 작성해보세요",
    toastCreate: "후기가 등록되었습니다.",
    toastUpdate: "후기가 수정되었습니다.",
    toastDelete: "후기가 삭제되었습니다.",
    deleteTitle: "후기 삭제",
    detailTitle: "행사후기 상세",
    formTitle: (edit) => (edit ? "후기 수정" : "새 후기 작성"),
    formSub: (edit) => (edit ? "후기를 수정합니다" : "새 후기를 작성합니다"),
  },
  qna: {
    dataKey: "qna",
    title: "질문·답변",
    writeLabel: "질문 등록",
    emptyMsg: "질문이 없습니다",
    emptySub: "궁금한 점을 질문해보세요",
    toastCreate: "질문이 등록되었습니다.",
    toastUpdate: "질문이 수정되었습니다.",
    toastDelete: "질문이 삭제되었습니다.",
    deleteTitle: "질문 삭제",
    detailTitle: "질문·답변 상세",
    formTitle: (edit) => (edit ? "질문 수정" : "새 질문 등록"),
    formSub: (edit) => (edit ? "질문을 수정합니다" : "새 질문을 등록합니다"),
  },
  faq: {
    dataKey: "faq",
    title: "자주묻는질문",
    writeLabel: "FAQ 작성",
    emptyMsg: "FAQ가 없습니다",
    emptySub: "첫 FAQ를 작성해보세요",
    toastCreate: "FAQ가 등록되었습니다.",
    toastUpdate: "FAQ가 수정되었습니다.",
    toastDelete: "FAQ가 삭제되었습니다.",
    deleteTitle: "FAQ 삭제",
    detailTitle: "FAQ 상세",
    formTitle: (edit) => (edit ? "FAQ 수정" : "새 FAQ 작성"),
    formSub: (edit) => (edit ? "FAQ를 수정합니다" : "새 FAQ를 작성합니다"),
  },
};

/* ── 날짜 포맷 ── */
function fmtDate(dt) {
  if (!dt) return "-";
  const d = new Date(dt);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

/* ── API → 컴포넌트 데이터 매핑 ── */
function mapQnaFromApi(item) {
  const isClosed = item.status === "CLOSED";
  return {
    id: item.qnaId ?? item.inquiryId ?? item.id,
    qnaId: item.qnaId ?? item.inquiryId ?? item.id,
    title: item.title ?? item.inquiryTitle ?? "",
    author: item.nickname ?? item.author ?? item.userName ?? "익명",
    content: item.content ?? "",
    status: isClosed ? "답변완료" : "대기중",
    answer: item.answer ?? item.answerContent ?? "",
    answerDate: item.answeredAt
      ? fmtDate(item.answeredAt)
      : item.answerDate
        ? fmtDate(item.answerDate)
        : "",
    views: item.viewCount ?? item.views ?? 0,
    date: fmtDate(item.createdAt ?? item.date),
    _visible: true,
    _raw: item, // 원본 보관
  };
}

function mapFaqFromApi(item) {
  return {
    id: item.postId ?? item.id,
    postId: item.postId ?? item.id,
    title: item.title ?? "",
    author: item.author ?? "관리자",
    content: item.content ?? "",
    answer: item.answerContent ?? item.answer ?? "",
    answerDate: item.answeredAt ? fmtDate(item.answeredAt) : "",
    views: item.viewCount ?? item.views ?? 0,
    date: fmtDate(item.createdAt ?? item.date),
    _visible: true,
  };
}

const inputStyle = {
  width: "100%",
  padding: "10px 14px",
  borderRadius: 9,
  border: `1.5px solid ${ds.line}`,
  fontSize: 13.5,
  fontFamily: ds.ff,
  color: ds.ink,
  outline: "none",
  boxSizing: "border-box",
  transition: "border-color .15s, box-shadow .15s",
  background: ds.bg,
};
const inputFocus = (e) => {
  e.target.style.borderColor = ds.brand;
  e.target.style.boxShadow = `0 0 0 3px ${ds.brand}15`;
};
const inputBlur = (e) => {
  e.target.style.borderColor = ds.line;
  e.target.style.boxShadow = "none";
};

/* ── 별점 ── */
function StarRating({ value, onChange, readonly }) {
  return (
    <div style={{ display: "flex", gap: 2 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={16}
          fill={i <= value ? ds.amber : "none"}
          color={i <= value ? ds.amber : ds.ink4}
          style={{ cursor: readonly ? "default" : "pointer" }}
          onClick={() => !readonly && onChange?.(i)}
        />
      ))}
    </div>
  );
}

/* ── 상태 필 ── */
function StatusPill({ status }) {
  const map = {
    답변완료: { bg: ds.greenSoft, color: ds.green, dot: ds.green },
    대기중: { bg: ds.amberSoft, color: ds.amber, dot: ds.amber },
  };
  const s = map[status] || map["대기중"];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        fontSize: 12,
        fontWeight: 700,
        padding: "3px 10px",
        borderRadius: 99,
        background: s.bg,
        color: s.color,
      }}
    >
      <span
        style={{ width: 5, height: 5, borderRadius: "50%", background: s.dot }}
      />
      {status}
    </span>
  );
}

/* ══════════════════════════════════════════════
   상세 모달 (+ 운영자 답변)
   ══════════════════════════════════════════════ */
function DetailModal({
  item,
  boardType,
  config,
  onClose,
  onEdit,
  onDelete,
  onReply,
  replyLoading,
}) {
  const isQna = boardType === "qna";
  const isReview = boardType === "review";
  const [replyText, setReplyText] = useState(item.answer || "");
  const [isReplying, setIsReplying] = useState(false);
  const hasReply = !!item.answer;
  const showEditor = isReplying || (!hasReply && isQna);

  const handleSubmitReply = () => {
    if (!replyText.trim()) return;
    onReply(item, replyText.trim());
  };

  return (
    <DetailDialog
      kind={config.detailTitle}
      title={item.title}
      badges={
        <>
          {item.pinned ? <Tag>고정</Tag> : null}
          {isQna ? <StatusPill status={item.status || (hasReply ? "답변완료" : "대기중")} /> : null}
        </>
      }
      items={[
        { label: "작성자", value: item.author },
        isReview && { label: "행사", value: item.event },
        isReview && { label: "평점", value: <StarRating value={item.rating} readonly /> },
        { label: "작성일", value: item.date },
        { label: "조회수", value: `${item.views}회` },
      ].filter(Boolean)}
      content={item.content}
      onClose={onClose}
      onEdit={() => onEdit(item)}
      onDelete={() => onDelete(item)}
    >
      {/* 운영자 답변 */}
      {hasReply && !isReplying && (
        <div style={{ marginTop: 16, padding: "14px 16px", borderRadius: 10, background: ds.bg, border: `1px solid ${ds.line}` }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ fontSize: 13.5, fontWeight: 600, color: ds.brandText }}>
              운영자 답변
              {item.answerDate ? <span style={{ marginLeft: 8, fontWeight: 400, color: ds.ink4 }}>{item.answerDate}</span> : null}
            </span>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setIsReplying(true);
                setReplyText(item.answer);
              }}
            >
              답변 수정
            </Button>
          </div>
          <p style={{ margin: 0, fontSize: 14, color: ds.ink, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{item.answer}</p>
        </div>
      )}

      {showEditor && (
        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 13.5, color: ds.ink3, marginBottom: 8 }}>{hasReply ? "답변 수정" : "운영자 답변 작성"}</div>
          <textarea
            rows={4}
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="답변을 입력하세요"
            style={{
              width: "100%",
              padding: "12px 14px",
              borderRadius: ds.rs,
              border: `1px solid ${ds.line}`,
              background: ds.bg,
              color: ds.ink,
              fontSize: 14,
              fontFamily: ds.ff,
              lineHeight: 1.6,
              outline: "none",
              resize: "vertical",
              boxSizing: "border-box",
            }}
          />
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
            {isReplying && (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  setIsReplying(false);
                  setReplyText(item.answer || "");
                }}
              >
                취소
              </Button>
            )}
            <Button size="sm" variant="primary" onClick={handleSubmitReply} disabled={!replyText.trim() || replyLoading}>
              {replyLoading ? "처리 중..." : hasReply ? "답변 수정" : "답변 등록"}
            </Button>
          </div>
        </div>
      )}
    </DetailDialog>
  );
}

/* ══════════════════════════════════════════════
   슬라이드 패널
   ══════════════════════════════════════════════ */
function SlidePanel({
  item,
  boardType,
  config,
  onSave,
  onClose,
  isEdit,
  saving,
  eventList = [],
}) {
  const defaults = {
    free: { title: "", content: "", views: 0 },
    info: { title: "", content: "", views: 0 },
    review: {
      title: "",
      author: "",
      content: "",
      event: "",
      rating: 5,
      views: 0,
    },
    qna: {
      title: "",
      author: "",
      content: "",
      status: "대기중",
      answer: "",
      views: 0,
    },
    faq: {
      title: "",
      content: "",
      answer: "",
      views: 0,
    },
  };
  const [form, setForm] = useState(item || defaults[boardType]);
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));
  const [err, setErr] = useState("");

  const handleSave = () => {
    if (boardType === "review") {
      if (!form.eventId && !form._eventId) {
        setErr("행사를 선택해주세요.");
        return;
      }
      if (!form.content) {
        setErr("내용은 필수입니다.");
        return;
      }
    } else {
      if (!form.title) {
        setErr(boardType === "faq" ? "질문을 입력해주세요." : "제목은 필수입니다.");
        return;
      }
      if (boardType === "faq" && !form.answer?.trim()) {
        setErr("FAQ 답변 내용은 필수입니다.");
        return;
      }
    }
    onSave(form);
  };

  // 자유·정보게시판은 같은 글 양식이라 작성할 때 올릴 게시판을 고를 수 있다.
  const canPickBoard = !isEdit && (boardType === "free" || boardType === "info");
  const board = form._board || boardType;
  const isFaq = boardType === "faq";
  const isReview = boardType === "review";
  const contentLength = (form.content || "").length;
  const labelStyle = { display: "block", marginBottom: 8, fontSize: 13, fontWeight: 600, color: ds.ink2 };
  const counterStyle = { marginTop: 6, fontSize: 12, color: ds.ink4, textAlign: "right" };

  return (
    <FormSheet
      title={config.formTitle(isEdit)}
      description={config.formSub(isEdit)}
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose} disabled={saving}>
            취소
          </Button>
          <Button variant="primary" onClick={handleSave} disabled={saving}>
            {saving ? "저장 중..." : isEdit ? "수정 완료" : "등록하기"}
          </Button>
        </>
      }
    >
      {err && (
        <div
          role="alert"
          style={{
            background: ds.redSoft,
            borderRadius: 8,
            padding: "10px 14px",
            fontSize: 13,
            color: ds.red,
            marginBottom: 18,
            fontWeight: 500,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <AlertTriangle size={14} /> {err}
        </div>
      )}

      {/* 게시판 */}
      <div style={{ marginBottom: 22 }}>
        <span style={labelStyle}>
          게시판{canPickBoard ? <span style={{ color: ds.red, marginLeft: 3 }}>*</span> : null}
        </span>
        {canPickBoard ? (
          <ChoiceCards label="게시판" options={BOARD_CHOICES} value={board} onChange={(v) => set("_board", v)} minWidth={220} />
        ) : (
          <Tag tone="neutral">{config.title}</Tag>
        )}
      </div>

      {isReview && (
        <>
          <Field label="행사" required>
            {eventList.length > 0 ? (
              <select
                style={{ ...inputStyle, cursor: "pointer" }}
                value={form.eventId || form._eventId || ""}
                onChange={(e) => {
                  set("eventId", e.target.value);
                  set("_eventId", e.target.value);
                }}
              >
                <option value="">행사를 선택하세요</option>
                {eventList.map((ev) => (
                  <option key={ev.eventId} value={ev.eventId}>
                    {ev.name}
                    {ev.date ? ` (${ev.date})` : ""}
                  </option>
                ))}
              </select>
            ) : (
              <input
                style={inputStyle}
                type="number"
                value={form.eventId || form._eventId || ""}
                onChange={(e) => {
                  set("eventId", e.target.value);
                  set("_eventId", e.target.value);
                }}
                placeholder="행사 ID (숫자)"
              />
            )}
          </Field>
          <Field label="평점" half>
            <div style={{ height: 40, display: "flex", alignItems: "center" }}>
              <StarRating value={form.rating || 5} onChange={(v) => set("rating", v)} />
            </div>
          </Field>
        </>
      )}

      {!isReview && (
        <Field label={isFaq ? "질문" : "제목"} required full>
          <input
            style={inputStyle}
            value={form.title || ""}
            maxLength={100}
            onChange={(e) => set("title", e.target.value)}
            placeholder={isFaq ? "예: 반려견 동반 입장 조건이 있나요?" : "제목을 입력하세요"}
          />
        </Field>
      )}

      <Field label={isFaq ? "질문 설명 (선택)" : "내용"} required={isReview} full>
        <textarea
          rows={isFaq ? 4 : 12}
          style={{ ...inputStyle, resize: "vertical", minHeight: isFaq ? 110 : 260 }}
          value={form.content || ""}
          onChange={(e) => set("content", e.target.value)}
          placeholder={
            isFaq
              ? "질문에 덧붙일 설명이 있으면 적어 주세요"
              : isReview
                ? "행사에 참여한 경험을 적어 주세요"
                : "내용을 입력하세요"
          }
        />
        <div style={counterStyle}>{contentLength.toLocaleString()}자</div>
      </Field>

      {isFaq && (
        <Field label="답변" required full>
          <textarea
            rows={8}
            style={{ ...inputStyle, resize: "vertical", minHeight: 180 }}
            value={form.answer || ""}
            onChange={(e) => set("answer", e.target.value)}
            placeholder="사용자에게 보여줄 답변을 입력하세요"
          />
        </Field>
      )}

      {!isFaq && (
        <p className="adm-full" style={{ margin: "0 0 8px", fontSize: 12.5, color: ds.ink4 }}>
          작성자는 로그인한 관리자 계정으로 표시돼요.
        </p>
      )}
    </FormSheet>
  );
}

const BOARD_CHOICES = [
  { id: "free", label: "자유게시판", desc: "회원들이 자유롭게 이야기를 나누는 곳" },
  { id: "info", label: "정보게시판", desc: "행사 준비·반려생활 정보를 모아 두는 곳" },
];

/* ══════════════════════════════════════════════
   게시판 행
   ══════════════════════════════════════════════ */

function BoardRow({
  item,
  boardType,
  removing,
  onDetail,
  onEdit,
  onDelete,
  checked,
  onToggle,
  mobile = false,
}) {
  const isQna = boardType === "qna";
  const isReview = boardType === "review";
  const mobileTextStyle = {
    minWidth: 0,
    whiteSpace: "normal",
    wordBreak: "keep-all",
    overflowWrap: "break-word",
  };

  if (mobile) {
    return (
      <div
        className={removing ? "row-removing" : ""}
        onClick={onDetail}
        style={{
          padding: "14px",
          borderBottom: `1px solid ${ds.lineSoft}`,
          cursor: "pointer",
          background: checked ? `${ds.brand}06` : "transparent",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <div style={{ ...mobileTextStyle, flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", minWidth: 0 }}>
              {boardType === "free" && item.pinned && (
                <Star size={12} color={ds.amber} fill={ds.amber} />
              )}
              {isQna && <StatusPill status={item.status} />}
              {isReview && item.event && (
                <span style={{ display: "inline-flex", alignItems: "center", padding: "3px 8px", borderRadius: 999, background: ds.lineSoft, fontSize: 12.5, fontWeight: 700, color: ds.ink3 }}>
                  {item.event}
                </span>
              )}
              {isReview && item.rating != null && (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
                  <Star size={11} color={ds.amber} fill={ds.amber} />
                  <span style={{ fontSize: 12, color: ds.amber, fontWeight: 700 }}>
                    {item.rating}
                  </span>
                </span>
              )}
            </div>
            <div
              style={{
                ...mobileTextStyle,
                fontSize: 14,
                fontWeight: 700,
                color: ds.ink2,
                lineHeight: 1.45,
                marginTop: 8,
              }}
            >
              {item.title}
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                flexWrap: "wrap",
                marginTop: 10,
                fontSize: 12,
                color: ds.ink4,
              }}
            >
              <span>{item.author}</span>
              <span style={{ color: ds.line }}>·</span>
              <span>{item.date}</span>
              <span style={{ color: ds.line }}>·</span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                <Eye size={12} /> {item.views}
              </span>
              {item.answer && (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    padding: "3px 8px",
                    borderRadius: 999,
                    background: `${ds.brand}08`,
                    color: ds.brand,
                    fontSize: 12.5,
                    fontWeight: 700,
                  }}
                >
                  <MessageCircle size={10} /> 답변 있음
                </span>
              )}
            </div>
          </div>
          <Checkbox checked={checked} onChange={onToggle} />
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            gap: 8,
            marginTop: 12,
          }}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            style={{
              minWidth: 0,
              padding: "8px 10px",
              borderRadius: 8,
              border: `1px solid ${ds.brand}25`,
              background: `${ds.brand}06`,
              fontSize: 12,
              fontWeight: 700,
              color: ds.brand,
              cursor: "pointer",
              fontFamily: ds.ff,
            }}
          >
            수정
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            style={{
              minWidth: 0,
              padding: "8px 10px",
              borderRadius: 8,
              border: `1px solid ${ds.line}`,
              background: "transparent",
              fontSize: 12,
              fontWeight: 700,
              color: ds.red,
              cursor: "pointer",
              fontFamily: ds.ff,
            }}
          >
            삭제
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`board-row ${removing ? "row-removing" : ""}`}
      onClick={onDetail}
      style={{
        display: "flex",
        alignItems: "center",
        padding: "13px 20px",
        borderBottom: `1px solid ${ds.lineSoft}`,
        cursor: "pointer",
        transition: "background .1s",
        position: "relative",
        background: checked ? `${ds.brand}06` : "transparent",
      }}
      onMouseEnter={(e) =>
        (e.currentTarget.style.background = checked
          ? `${ds.brand}0A`
          : ds.bg)
      }
      onMouseLeave={(e) =>
        (e.currentTarget.style.background = checked
          ? `${ds.brand}06`
          : "transparent")
      }
    >
      <div style={{ marginRight: 12, flexShrink: 0 }}>
        <Checkbox checked={checked} onChange={onToggle} />
      </div>
      <span
        style={{
          fontSize: 13,
          fontWeight: 700,
          color: ds.ink,
          minWidth: 72,
          flexShrink: 0,
        }}
      >
        {item.author}
      </span>

      {boardType === "free" && item.pinned && (
        <Star
          size={12}
          color={ds.amber}
          fill={ds.amber}
          style={{ marginRight: 6, flexShrink: 0 }}
        />
      )}
      {isQna && (
        <span style={{ marginRight: 8, flexShrink: 0 }}>
          <StatusPill status={item.status} />
        </span>
      )}

      <span
        style={{
          flex: 1,
          fontSize: 13.5,
          color: ds.ink3,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        {item.title}
        {item.answer && (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 3,
              fontSize: 12,
              color: ds.brand,
              fontWeight: 700,
              background: `${ds.brand}08`,
              padding: "1px 7px",
              borderRadius: 4,
              flexShrink: 0,
            }}
          >
            <MessageCircle size={9} /> 답변완료
          </span>
        )}
      </span>

      {isReview && item.event && (
        <span
          style={{
            fontSize: 12,
            color: ds.ink4,
            background: ds.lineSoft,
            padding: "2px 8px",
            borderRadius: 4,
            marginRight: 10,
            flexShrink: 0,
            maxWidth: 140,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {item.event}
        </span>
      )}

      {isReview && (
        <span
          style={{
            display: "flex",
            alignItems: "center",
            gap: 2,
            marginRight: 10,
            flexShrink: 0,
          }}
        >
          <Star size={11} color={ds.amber} fill={ds.amber} />
          <span style={{ fontSize: 12, color: ds.amber, fontWeight: 700 }}>
            {item.rating}
          </span>
        </span>
      )}

      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          fontSize: 12,
          color: ds.ink4,
          marginRight: 16,
          flexShrink: 0,
          minWidth: 50,
        }}
      >
        <Eye size={12} style={{ flexShrink: 0 }} />
        {item.views}
      </span>

      <span
        style={{
          fontSize: 13,
          color: ds.ink4,
          flexShrink: 0,
          minWidth: 80,
          textAlign: "right",
        }}
      >
        {item.date}
      </span>

      <div
        className="board-actions"
        style={{
          opacity: 0,
          transition: "opacity .12s",
          display: "flex",
          gap: 3,
          marginLeft: 10,
          flexShrink: 0,
        }}
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
          style={{
            padding: "3px 8px",
            borderRadius: 5,
            border: `1px solid ${ds.line}`,
            background: "transparent",
            fontSize: 12,
            fontWeight: 600,
            color: ds.brandText,
            cursor: "pointer",
            fontFamily: ds.ff,
            lineHeight: 1.2,
            transition: "all .12s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = ds.cardHover;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
          }}
        >
          수정
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          style={{
            padding: "3px 8px",
            borderRadius: 5,
            border: `1px solid ${ds.line}`,
            background: "transparent",
            fontSize: 12,
            fontWeight: 600,
            color: ds.red,
            cursor: "pointer",
            fontFamily: ds.ff,
            lineHeight: 1.2,
            opacity: 0.7,
            transition: "all .12s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = ds.red;
            e.currentTarget.style.color = "#fff";
            e.currentTarget.style.opacity = "1";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = ds.red;
            e.currentTarget.style.opacity = "0.7";
          }}
        >
          삭제
        </button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════
   로딩 인디케이터
   ══════════════════════════════════════════════ */
function LoadingIndicator() {
  return (
    <div
      style={{
        textAlign: "center",
        padding: "60px 0",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 12,
      }}
    >
      <Loader2
        size={28}
        color={ds.ink4}
        style={{ animation: "spin 1s linear infinite" }}
      />
      <span style={{ fontSize: 13, color: ds.ink4 }}>불러오는 중...</span>
    </div>
  );
}

/* ═══════════════════════════════════════════
   메인 컴포넌트
   ═══════════════════════════════════════════ */
function MobilePagination({ page, totalPages, onChange }) {
  if (totalPages <= 1) return null;

  const buttonStyle = {
    minHeight: 40,
    minWidth: 40,
    padding: "0 12px",
    borderRadius: 10,
    border: `1px solid ${ds.line}`,
    background: ds.bg,
    color: ds.ink3,
    fontSize: 13,
    fontWeight: 700,
    fontFamily: ds.ff,
    cursor: "pointer",
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        marginTop: 16,
        flexWrap: "wrap",
      }}
    >
      <button
        type="button"
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
        style={{
          ...buttonStyle,
          opacity: page <= 1 ? 0.45 : 1,
          cursor: page <= 1 ? "default" : "pointer",
        }}
      >
        이전
      </button>
      <div
        style={{
          minHeight: 40,
          padding: "0 14px",
          borderRadius: 10,
          border: `1px solid ${ds.line}`,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 13,
          fontWeight: 700,
          color: ds.ink2,
          background: `${ds.brand}0A`,
        }}
      >
        {page} / {totalPages}
      </div>
      <button
        type="button"
        onClick={() => onChange(page + 1)}
        disabled={page >= totalPages}
        style={{
          ...buttonStyle,
          opacity: page >= totalPages ? 0.45 : 1,
          cursor: page >= totalPages ? "default" : "pointer",
        }}
      >
        다음
      </button>
    </div>
  );
}

export default function BoardManage({ subTab = "free" }) {
  if (subTab === "banned") {
    return <BannedWordsManage />;
  }
  const boardType = subTab || "free";
  const config = BOARD_CONFIG[boardType] || BOARD_CONFIG.free;
  const isQna = boardType === "qna";
  const [viewportWidth, setViewportWidth] = useState(() =>
    typeof window === "undefined" ? 1440 : window.innerWidth,
  );

  /* ── 게시판 데이터 (free, info, review, faq — API 연동) ── */
  const [localData, setLocalData] = useState(() => ({
    free: [],
    info: [],
    review: [],
    faq: [],
  }));
  const [boardLoading, setBoardLoading] = useState(false);
  const [freeBoardId, setFreeBoardId] = useState(null);
  const [infoBoardId, setInfoBoardId] = useState(null);
  const [boardPage, setBoardPage] = useState(1);
  const [boardTotalPages, setBoardTotalPages] = useState(0);
  const [boardTotalElements, setBoardTotalElements] = useState(0);
  const [eventList, setEventList] = useState([]);
  const eventListRef = useRef([]);
  const [search, setSearch] = useState("");
  const trimmedSearch = search.trim();
  const BOARD_PAGE_SIZE = 20;

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const syncViewport = () => setViewportWidth(window.innerWidth);
    syncViewport();
    window.addEventListener("resize", syncViewport);
    return () => window.removeEventListener("resize", syncViewport);
  }, []);

  /* ── 행사 목록 로드 (후기 작성 시 eventId 선택용) ── */
  /* GET /api/admin/dashboard/events → DashboardEventResponse[] */
  /* 응답 필드: eventId, id("EV-001"), name, date, location, status, participants, capacity */
  const fetchEventList = useCallback(async () => {
    try {
      const res = await axiosInstance.get("/api/admin/dashboard/events", {
        headers: authHeaders(),
      });
      const list = res.data?.data || res.data || [];
      const arr = Array.isArray(list) ? list : [];
      setEventList(arr);
      eventListRef.current = arr;
    } catch (e) {
      devWarn("[BoardManage] 행사 목록 로드 실패:", e);
      setEventList([]);
    }
  }, []);

  /* ── 자유게시판/정보게시판/후기/FAQ API 로드 ── */
  const fetchBoardData = useCallback(
    async (type, requestedPage = 1) => {
      setBoardLoading(true);
      try {
        const targetPage = Math.max(1, Number(requestedPage) || 1);
        const pageParam = targetPage - 1;
        if (type === "free" || type === "info") {
          const boardTypeCode = type === "info" ? "INFO" : "FREE";
          let bId = type === "info" ? infoBoardId : freeBoardId;

          if (!bId) {
            try {
              const bRes = await axiosInstance.get("/api/boards?activeOnly=true", {
                headers: authHeaders(),
              });
              const boards = bRes.data?.data || bRes.data || [];
              const targetBoard = boards.find((b) => b.boardType === boardTypeCode);
              bId = targetBoard?.boardId || null;
              if (type === "info") {
                setInfoBoardId(bId);
              } else {
                setFreeBoardId(bId);
              }
            } catch {
              bId = null;
            }
          }

          const res = await axiosInstance.get(
            `/api/posts?boardType=${boardTypeCode}&page=${pageParam}&size=${BOARD_PAGE_SIZE}&searchType=TITLE_CONTENT&keyword=${encodeURIComponent(trimmedSearch)}`,
            { headers: authHeaders() },
          );
          const page = res.data?.data || res.data || {};
          const list = page.content || page || [];
          setBoardPage((page.number ?? pageParam) + 1);
          setBoardTotalPages(page.totalPages ?? 0);
          setBoardTotalElements(page.totalElements ?? list.length);
          setLocalData((prev) => ({
            ...prev,
            [type]: list.map((p) => ({
              id: p.postId,
              title: p.postTitle,
              content: p.content,
              author: `회원${p.userId}`,
              date: p.createdAt?.slice(0, 10)?.replace(/-/g, ".") || "",
              views: p.viewCount || 0,
              pinned: false,
              _visible: !p.deleted,
              postId: p.postId,
              boardId: p.boardId || bId || null,
              userId: p.userId,
            })),
          }));
        } else if (type === "review") {
          const res = await axiosInstance.get(
            `/api/reviews?page=${pageParam}&size=${BOARD_PAGE_SIZE}&searchType=TITLE_CONTENT&keyword=${encodeURIComponent(trimmedSearch)}`,
            {
              headers: authHeaders(),
            },
          );
          const page = res.data?.data || res.data || {};
          const list = page.content || page || [];
          setBoardPage((page.number ?? pageParam) + 1);
          setBoardTotalPages(page.totalPages ?? 0);
          setBoardTotalElements(page.totalElements ?? list.length);
          const evMap = {};
          eventListRef.current.forEach((ev) => {
            evMap[ev.eventId] = ev.name;
          });
          setLocalData((prev) => ({
            ...prev,
            review: list.map((r) => ({
              id: r.reviewId,
              title: r.content?.slice(0, 30) || "후기",
              content: r.content,
              author: `회원${r.userId}`,
              event: evMap[r.eventId] || `행사 #${r.eventId}`,
              rating: r.rating || 5,
              date: r.createdAt?.slice(0, 10)?.replace(/-/g, ".") || "",
              views: r.viewCount || 0,
              _visible: true,
              reviewId: r.reviewId,
              eventId: r.eventId,
              userId: r.userId,
            })),
          }));
        } else if (type === "faq") {
          const listRes = await axiosInstance.get(
            `/api/faqs?page=${pageParam}&size=${BOARD_PAGE_SIZE}&searchType=TITLE_CONTENT&keyword=${encodeURIComponent(trimmedSearch)}`,
            {
              headers: authHeaders(),
            },
          );
          const page = listRes.data?.data || listRes.data || {};
          const list = Array.isArray(page.content) ? page.content : [];
          setBoardPage((page.number ?? pageParam) + 1);
          setBoardTotalPages(page.totalPages ?? 0);
          setBoardTotalElements(page.totalElements ?? list.length);

          const detailedFaqs = await Promise.all(
            list.map(async (faq) => {
              try {
                const detailRes = await axiosInstance.get(
                  `/api/faqs/${faq.postId}`,
                  {
                    headers: authHeaders(),
                  },
                );
                const detail = detailRes.data?.data || detailRes.data || {};
                return mapFaqFromApi(detail);
              } catch (detailErr) {
                devWarn(
                  `[BoardManage FAQ] detail load failed: ${faq.postId}`,
                  detailErr,
                );
                return mapFaqFromApi({
                  postId: faq.postId,
                  title: faq.title,
                });
              }
            }),
          );

          setLocalData((prev) => ({
            ...prev,
            faq: detailedFaqs,
          }));
        }
      } catch (err) {
        devError(`[BoardManage] ${type} 로드 실패:`, err);
        setBoardPage(1);
        setBoardTotalPages(0);
        setBoardTotalElements(0);
        // 운영 경로에서는 실패 시 빈 목록으로 유지한다.
        if (type === "free")
          setLocalData((prev) => ({
            ...prev,
            free: [],
          }));
        if (type === "info")
          setLocalData((prev) => ({
            ...prev,
            info: [],
          }));
        if (type === "review")
          setLocalData((prev) => ({
            ...prev,
            review: [],
          }));
        if (type === "faq")
          setLocalData((prev) => ({
            ...prev,
            faq: [],
          }));
      } finally {
        setBoardLoading(false);
      }
    },
    [freeBoardId, infoBoardId, BOARD_PAGE_SIZE, trimmedSearch],
  );

  /* ── Q&A API 상태 ── */
  const [qnaItems, setQnaItems] = useState([]);
  const [qnaLoading, setQnaLoading] = useState(false);
  const [qnaError, setQnaError] = useState(null);
  const [qnaPage, setQnaPage] = useState(1);
  const [qnaTotalPages, setQnaTotalPages] = useState(0);
  const [qnaTotalElements, setQnaTotalElements] = useState(0);
  const QNA_PAGE_SIZE = 20;

  /* ── 공통 UI 상태 ── */
  const [modal, setModal] = useState(null);
  const [panel, setPanel] = useState(null);
  const [toast, setToast] = useState(null);
  const [removing, setRemoving] = useState(null);
  const [selected, setSelected] = useState(new Set());
  const [saving, setSaving] = useState(false);

  /* ── Q&A 목록 조회 ── */
  const fetchQnaList = useCallback(async (page = 1) => {
    setQnaLoading(true);
    setQnaError(null);
    try {
      const res = await adminQnaApi.list(page, QNA_PAGE_SIZE, {
        keyword: trimmedSearch,
      });
      const d = unwrap(res);
      const mapped = (d.content || []).map(mapQnaFromApi);
      setQnaItems(mapped);
      setQnaTotalPages(d.totalPages || 0);
      setQnaTotalElements(d.totalElements ?? mapped.length);
      setQnaPage(page);
    } catch (err) {
      devError("[BoardManage QnA] fetch error:", err);
      setQnaError("질문 목록을 불러오는데 실패했습니다.");
    } finally {
      setQnaLoading(false);
    }
  }, [trimmedSearch]);

  /* ── boardType이 전환되면 API 호출 ── */
  useEffect(() => {
    setSearch("");
    setModal(null);
    setPanel(null);
    setSelected(new Set());
    setBoardPage(1);
    setBoardTotalPages(0);
    setBoardTotalElements(0);
    if (isQna) {
      fetchQnaList(1);
    } else if (boardType === "free") {
      fetchBoardData("free", 1);
    } else if (boardType === "info") {
      fetchBoardData("info", 1);
    } else if (boardType === "review") {
      // 행사 목록을 먼저 가져온 뒤 리뷰 로드 (행사명 매핑)
      fetchEventList().then(() => fetchBoardData("review", 1));
    } else if (boardType === "faq") {
      fetchBoardData("faq", 1);
    }
  }, [boardType, isQna, fetchQnaList, fetchBoardData, fetchEventList]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSelected(new Set());
      if (isQna) {
        fetchQnaList(1);
      } else if (boardType === "review") {
        fetchEventList().then(() => fetchBoardData("review", 1));
      } else {
        fetchBoardData(boardType, 1);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [search, boardType, isQna, fetchQnaList, fetchBoardData, fetchEventList]);

  /* ── 현재 보여줄 아이템 ── */
  const items = isQna ? qnaItems : localData[boardType] || [];
  const rows = items.filter((e) => e._visible !== false);
  const totalCount = isQna ? qnaTotalElements : boardTotalElements;
  const isMobile = viewportWidth < 768;
  const currentPage = isQna ? qnaPage : boardPage;
  const currentTotalPages = isQna ? qnaTotalPages : boardTotalPages;
  const pagedRows = rows;
  const interactiveRows = rows;

  /* ── 선택 관련 ── */
  const getRowId = (r) => r.id;
  const isAllSelected =
    interactiveRows.length > 0 &&
    interactiveRows.every((r) => selected.has(getRowId(r)));
  const hasSelected = selected.size > 0;
  const toggleAll = () => {
    if (isAllSelected) setSelected(new Set());
    else setSelected(new Set(interactiveRows.map(getRowId)));
  };
  const toggleOne = (id) => {
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  const showToast = (msg, type = "success") => setToast({ msg, type });

  /* ── 로컬 게시판 setter ── */
  const setBoard = (fn) =>
    setLocalData((prev) => ({ ...prev, [boardType]: fn(prev[boardType]) }));

  const handlePageChange = (nextPage) => {
    if (nextPage < 1 || nextPage > currentTotalPages) return;
    setSelected(new Set());
    if (isQna) {
      fetchQnaList(nextPage);
      return;
    }
    fetchBoardData(boardType, nextPage);
  };

  /* ════════════════════════════════════════
     CRUD 핸들러 — Q&A는 API, 나머지는 로컬
     ════════════════════════════════════════ */

  /* ── 등록 ── */
  const handleCreate = async (f) => {
    if (isQna) {
      setSaving(true);
      try {
        await adminQnaApi.create({ title: f.title, content: f.content });
        setPanel(null);
        showToast(config.toastCreate);
        fetchQnaList(1);
      } catch (err) {
        devError("[BoardManage QnA] create error:", err);
        showToast("등록에 실패했습니다.", "error");
      } finally {
        setSaving(false);
      }
    } else {
      setSaving(true);
      try {
        if (boardType === "free" || boardType === "info") {
          const target = f._board === "info" || f._board === "free" ? f._board : boardType;
          const boardTypeCode = target === "info" ? "INFO" : "FREE";
          let bId = target === "info" ? infoBoardId : freeBoardId;

          if (!bId) {
            try {
              const bRes = await axiosInstance.get("/api/boards?activeOnly=true", {
                headers: authHeaders(),
              });
              const boards = bRes.data?.data || bRes.data || [];
              const targetBoard = boards.find((b) => b.boardType === boardTypeCode);
              bId = targetBoard?.boardId || null;
              if (target === "info") {
                setInfoBoardId(bId);
              } else {
                setFreeBoardId(bId);
              }
            } catch {
              bId = null;
            }
          }

          if (!bId) {
            showToast("게시판 정보를 불러오지 못했습니다.", "error");
            setSaving(false);
            return;
          }
          await axiosInstance.post(
            "/api/posts",
            {
              boardId: bId,
              postTitle: f.title,
              content: f.content || "",
            },
            { headers: authHeaders() },
          );
          if (target !== boardType) {
            setPanel(null);
            showToast(`${BOARD_CONFIG[target].title}에 등록되었습니다.`);
            goToAdminPage("boardManage", target);
            return;
          }
        } else if (boardType === "review") {
          const eId = f.eventId || f._eventId;
          if (!eId) {
            showToast("행사를 선택해주세요.", "error");
            setSaving(false);
            return;
          }
          await axiosInstance.post(
            "/api/reviews",
            {
              eventId: Number(eId),
              rating: f.rating || 5,
              content: f.content || f.title || "",
            },
            { headers: authHeaders() },
          );
        } else if (boardType === "faq") {
          await axiosInstance.post(
            "/api/admin/faqs",
            {
              title: f.title,
              content: f.content || "",
              answerContent: f.answer || f.answerContent || "",
            },
            { headers: authHeaders() },
          );
        }
        setPanel(null);
        showToast(config.toastCreate);
        fetchBoardData(boardType, 1);
      } catch (err) {
        devError(`[BoardManage] ${boardType} create error:`, err);
        const status = err?.response?.status;
        if (boardType === "review" && status === 409) {
          showToast("이미 해당 행사에 후기가 등록되어 있습니다.", "error");
        } else {
          showToast("등록에 실패했습니다.", "error");
        }
      } finally {
        setSaving(false);
      }
    }
  };

  /* ── 수정 ── */
  const handleUpdate = async (f) => {
    if (isQna) {
      setSaving(true);
      try {
        const qnaId = f.qnaId ?? f.id;
        await adminQnaApi.update(qnaId, { title: f.title, content: f.content });
        setPanel(null);
        showToast(config.toastUpdate);
        fetchQnaList(qnaPage);
      } catch (err) {
        devError("[BoardManage QnA] update error:", err);
        showToast("수정에 실패했습니다.", "error");
      } finally {
        setSaving(false);
      }
    } else {
      setSaving(true);
      try {
        if (boardType === "free" || boardType === "info") {
          const postId = f.postId || f.id;
          await axiosInstance.put(
            `/api/posts/${postId}`,
            {
              postTitle: f.title,
              content: f.content || "",
            },
            { headers: authHeaders() },
          );
        } else if (boardType === "review") {
          const reviewId = f.reviewId || f.id;
          await axiosInstance.patch(
            `/api/reviews/${reviewId}`,
            {
              content: f.content || f.title || "",
              rating: f.rating || 5,
            },
            { headers: authHeaders() },
          );
        } else if (boardType === "faq") {
          const postId = f.postId || f.id;
          await axiosInstance.patch(
            `/api/admin/faqs/${postId}`,
            {
              title: f.title,
              content: f.content || "",
              answerContent: f.answer || f.answerContent || "",
            },
            { headers: authHeaders() },
          );
        }
        setPanel(null);
        showToast(config.toastUpdate);
        fetchBoardData(boardType, boardPage);
      } catch (err) {
        devError(`[BoardManage] ${boardType} update error:`, err);
        showToast("수정에 실패했습니다.", "error");
      } finally {
        setSaving(false);
      }
    }
  };

  /* ── 삭제 ── */
  const handleDelete = async () => {
    const item = modal.item;
    if (isQna) {
      setSaving(true);
      try {
        const qnaId = item.qnaId ?? item.id;
        await adminQnaApi.delete(qnaId);
        setModal(null);
        showToast(config.toastDelete);
        fetchQnaList(qnaPage);
      } catch (err) {
        devError("[BoardManage QnA] delete error:", err);
        setModal(null);
        showToast("삭제에 실패했습니다.", "error");
      } finally {
        setSaving(false);
      }
    } else {
      const id = item.id;
      setModal(null);
      setRemoving(id);
      setSaving(true);
      try {
        if (boardType === "free" || boardType === "info") {
          const postId = item.postId || id;
          await axiosInstance.delete(`/api/posts/${postId}`, {
            headers: authHeaders(),
          });
        } else if (boardType === "review") {
          const reviewId = item.reviewId || id;
          await axiosInstance.delete(
            `/api/admin/moderation/reviews/${reviewId}`,
            { headers: authHeaders() },
          );
        } else if (boardType === "faq") {
          const postId = item.postId || id;
          await axiosInstance.delete(`/api/admin/faqs/${postId}`, {
            headers: authHeaders(),
          });
        }
        setTimeout(() => {
          setRemoving(null);
          showToast(config.toastDelete);
          fetchBoardData(boardType, boardPage);
        }, 300);
      } catch (err) {
        devError(`[BoardManage] ${boardType} delete error:`, err);
        setRemoving(null);
        showToast("삭제에 실패했습니다.", "error");
      } finally {
        setSaving(false);
      }
    }
  };

  /* ── 선택 삭제 ── */
  const handleBatchDelete = async () => {
    setSaving(true);
    const ids = [...selected];
    try {
      if (isQna) {
        for (const id of ids) {
          const item = rows.find((r) => getRowId(r) === id);
          const qnaId = item?.qnaId ?? id;
          await adminQnaApi.delete(qnaId);
        }
        fetchQnaList(qnaPage);
      } else {
        if (boardType === "faq") {
          await Promise.all(
            ids.map((id) => {
              const item = rows.find((r) => getRowId(r) === id);
              const postId = item?.postId || id;
              return axiosInstance.delete(`/api/admin/faqs/${postId}`, {
                headers: authHeaders(),
              });
            }),
          );
        } else {
          const postIds = ids.map((id) => {
            const item = rows.find((r) => getRowId(r) === id);
            return item?.postId || item?.reviewId || id;
          });
          await axiosInstance.delete("/api/admin/posts/batch", {
            headers: authHeaders(),
            data: { ids: postIds },
          });
        }
        fetchBoardData(boardType, boardPage);
      }
      setModal(null);
      setSelected(new Set());
      showToast(`${ids.length}건이 삭제되었습니다.`);
    } catch (err) {
      devError("[BoardManage] batch delete error:", err);
      setModal(null);
      showToast("일괄 삭제에 실패했습니다.", "error");
    } finally {
      setSaving(false);
    }
  };

  /* ── 운영자 답변 등록/수정 (Q&A API) ── */
  const handleReply = async (item, replyText) => {
    if (isQna) {
      setSaving(true);
      try {
        const qnaId = item.qnaId ?? item.id;
        // 운영자 답변 등록/수정
        await adminQnaApi.answer(qnaId, replyText);
        setModal(null);
        showToast("답변이 등록되었습니다.");
        fetchQnaList(qnaPage);
      } catch (err) {
        devError("[BoardManage QnA] reply error:", err);
        showToast("답변 처리에 실패했습니다.", "error");
      } finally {
        setSaving(false);
      }
    } else if (boardType === "faq") {
      setSaving(true);
      try {
        const postId = item.postId ?? item.id;
        await axiosInstance.patch(
          `/api/admin/faqs/${postId}`,
          {
            title: item.title || "",
            content: item.content || "",
            answerContent: replyText,
          },
          { headers: authHeaders() },
        );
        setModal(null);
        showToast("답변이 수정되었습니다.");
        fetchBoardData("faq", boardPage);
      } catch (err) {
        devError("[BoardManage FAQ] reply update error:", err);
        showToast("답변 처리에 실패했습니다.", "error");
      } finally {
        setSaving(false);
      }
    } else {
      // 로컬 방식 (free, review — 기존 코드)
      const d = new Date();
      const answerDate = fmtDate(d);
      const updated = {
        ...item,
        answer: replyText,
        answerDate,
        ...(boardType === "qna" ? { status: "답변완료" } : {}),
      };
      setBoard((p) =>
        p.map((e) => (e.id === item.id ? { ...e, ...updated } : e)),
      );
      setModal({ type: "detail", item: { ...updated, _visible: true } });
      showToast("답변이 등록되었습니다.");
    }
  };

  /* ════════════════════════════════════════
     렌더링
     ════════════════════════════════════════ */
  return (
    <div>
      <style>{styles}</style>

      <div
        style={{
          background: ds.bg,
          borderRadius: 12,
          border: `1px solid ${ds.line}`,
          overflow: "hidden",
        }}
      >
        {/* 헤더 */}
        <div
          style={{
            padding: isMobile ? "14px" : "14px 20px",
            display: "flex",
            flexDirection: isMobile ? "column" : "row",
            alignItems: isMobile ? "stretch" : "center",
            justifyContent: "space-between",
            borderBottom: `1px solid ${ds.line}`,
            gap: isMobile ? 12 : 8,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              flexWrap: "wrap",
              minWidth: 0,
            }}
          >
            <Checkbox
              checked={isAllSelected && rows.length > 0}
              onChange={toggleAll}
            />
            <span style={{ fontSize: 14, fontWeight: 700, color: ds.ink }}>
              {config.title}
            </span>
            <span style={{ fontSize: 12, fontWeight: 600, color: ds.ink4 }}>
              총 {totalCount}개
            </span>
            {hasSelected && (
              <span
                style={{
                  fontSize: 12.5,
                  fontWeight: 700,
                  color: ds.brand,
                  background: `${ds.brand}0C`,
                  padding: "4px 10px",
                  borderRadius: 6,
                }}
              >
                {selected.size}건 선택됨
              </span>
            )}
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              flexWrap: "wrap",
              width: isMobile ? "100%" : "auto",
            }}
          >
            {hasSelected && (
              <button
                onClick={() => setModal({ type: "batchDelete" })}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  padding: "7px 12px",
                  borderRadius: 7,
                  border: `1px solid ${ds.red}`,
                  background: ds.red,
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#fff",
                  cursor: "pointer",
                  fontFamily: ds.ff,
                }}
              >
                <Trash2 size={12} /> 선택 삭제
              </button>
            )}
            <div style={{ position: "relative", flex: isMobile ? "1 1 100%" : "0 0 auto" }}>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="검색어를 입력하세요."
                style={{
                  width: isMobile ? "100%" : 220,
                  padding: "7px 14px 7px 34px",
                  borderRadius: 8,
                  border: `1px solid ${ds.line}`,
                  fontSize: 13,
                  fontFamily: ds.ff,
                  color: ds.ink,
                  outline: "none",
                  background: ds.bg,
                  transition: "border-color .15s",
                }}
                onFocus={(e) => (e.target.style.borderColor = ds.brand)}
                onBlur={(e) => (e.target.style.borderColor = ds.line)}
              />
              <Search
                size={14}
                color={ds.ink4}
                style={{
                  position: "absolute",
                  left: 11,
                  top: "50%",
                  transform: "translateY(-50%)",
                }}
              />
            </div>
            <button
              onClick={() => setPanel({ type: "create" })}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                padding: "7px 14px",
                borderRadius: 7,
                border: "none",
                background: ds.brand,
                color: "#fff",
                fontSize: 12.5,
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: ds.ff,
                transition: "transform .1s",
                width: isMobile ? "100%" : "auto",
                justifyContent: "center",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.transform = "translateY(-1px)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.transform = "translateY(0)")
              }
            >
              <Plus size={13} strokeWidth={2.5} /> {config.writeLabel}
            </button>
          </div>
        </div>

        {/* 로딩 (Q&A API) */}
        {isQna && qnaLoading && <LoadingIndicator />}

        {/* 에러 (Q&A API) */}
        {isQna && !qnaLoading && qnaError && (
          <div style={{ textAlign: "center", padding: "60px 0" }}>
            <AlertTriangle
              size={36}
              color={ds.amber}
              style={{
                marginBottom: 12,
                display: "block",
                margin: "0 auto 12px",
              }}
            />
            <div
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: ds.ink3,
                marginBottom: 8,
              }}
            >
              {qnaError}
            </div>
            <button
              onClick={() => fetchQnaList(qnaPage)}
              style={{
                padding: "8px 20px",
                borderRadius: 8,
                border: `1px solid ${ds.line}`,
                background: ds.bg,
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                color: ds.ink3,
              }}
            >
              다시 시도
            </button>
          </div>
        )}

        {/* 로딩 */}
        {!isQna && boardLoading && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              padding: "60px 20px",
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
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
                marginTop: 12,
              }}
            >
              로딩 중...
            </div>
          </div>
        )}

        {/* 리스트 */}
        {!boardLoading &&
          !(isQna && (qnaLoading || qnaError)) &&
          pagedRows.map((r) => (
            <BoardRow
              key={r.id}
              item={r}
              boardType={boardType}
              removing={removing === r.id}
              checked={selected.has(getRowId(r))}
              onToggle={() => toggleOne(getRowId(r))}
              onDetail={() => setModal({ type: "detail", item: r })}
              onEdit={() => setPanel({ type: "edit", item: r })}
              onDelete={() => setModal({ type: "delete", item: r })}
              mobile={isMobile}
            />
          ))}

        {!boardLoading &&
          !(isQna && (qnaLoading || qnaError)) &&
          rows.length === 0 && (
            <EmptyState icon={FileText} title={config.emptyMsg} description={config.emptySub} />
          )}
      </div>

      {!isQna && !boardLoading && currentTotalPages > 1 && (
        <MobilePagination
          page={boardPage}
          totalPages={boardTotalPages}
          onChange={handlePageChange}
        />
      )}

      {/* ── Q&A 페이지네이션 ── */}
      {isQna && !qnaLoading && !qnaError && qnaTotalPages > 1 && (
        isMobile ? (
          <MobilePagination
            page={qnaPage}
            totalPages={qnaTotalPages}
            onChange={handlePageChange}
          />
        ) : (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: 8,
            marginTop: 20,
          }}
        >
          <button
            onClick={() => handlePageChange(qnaPage - 1)}
            disabled={qnaPage <= 1}
            style={{
              background: "none",
              border: "none",
              fontSize: 16,
              color: qnaPage <= 1 ? ds.ink4 : ds.ink3,
              cursor: qnaPage <= 1 ? "default" : "pointer",
              padding: "4px 8px",
            }}
          >
            ‹
          </button>
          {Array.from({ length: qnaTotalPages }, (_, i) => (
            <button
              key={i}
              onClick={() => handlePageChange(i + 1)}
              style={{
                fontSize: 14,
                fontWeight: i + 1 === qnaPage ? 700 : 500,
                color: i + 1 === qnaPage ? ds.brand : ds.ink3,
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "4px 8px",
                minWidth: 20,
                textAlign: "center",
              }}
            >
              {i + 1}
            </button>
          ))}
          <button
            onClick={() => handlePageChange(qnaPage + 1)}
            disabled={qnaPage >= qnaTotalPages}
            style={{
              background: "none",
              border: "none",
              fontSize: 16,
              color: qnaPage >= qnaTotalPages ? ds.ink4 : ds.ink3,
              cursor: qnaPage >= qnaTotalPages ? "default" : "pointer",
              padding: "4px 8px",
            }}
          >
            ›
          </button>
        </div>
        )
      )}

      {/* ── 슬라이드 패널 ── */}
      {panel?.type === "create" && (
        <SlidePanel
          boardType={boardType}
          config={config}
          onSave={handleCreate}
          onClose={() => setPanel(null)}
          saving={saving}
          eventList={eventList}
        />
      )}
      {panel?.type === "edit" && (
        <SlidePanel
          item={panel.item}
          boardType={boardType}
          config={config}
          isEdit
          onSave={handleUpdate}
          onClose={() => setPanel(null)}
          saving={saving}
          eventList={eventList}
        />
      )}

      {/* ── 상세 모달 ── */}
      {modal?.type === "detail" && (
        <DetailModal
          item={modal.item}
          boardType={boardType}
          config={config}
          onClose={() => setModal(null)}
          onEdit={(item) => {
            setModal(null);
            setPanel({ type: "edit", item });
          }}
          onDelete={(item) => setModal({ type: "delete", item })}
          onReply={handleReply}
          replyLoading={saving}
        />
      )}

      {/* ── 삭제 확인 모달 ── */}
      {modal?.type === "delete" && (
        <ConfirmModal
          title={config.deleteTitle}
          msg={`"${modal.item.title}" 을(를) 삭제하시겠습니까?\n삭제된 데이터는 복구할 수 없습니다.`}
          onConfirm={handleDelete}
          onCancel={() => setModal(null)}
          loading={saving}
        />
      )}
      {modal?.type === "batchDelete" && (
        <ConfirmModal
          title="선택 삭제"
          msg={`선택한 ${selected.size}건을 삭제하시겠습니까?\n삭제된 데이터는 복구할 수 없습니다.`}
          onConfirm={handleBatchDelete}
          onCancel={() => setModal(null)}
          loading={saving}
        />
      )}
      {/* ── 토스트 ── */}
      {toast && (
        <Toast
          msg={toast.msg}
          type={toast.type}
          onDone={() => setToast(null)}
        />
      )}
    </div>
  );
}
