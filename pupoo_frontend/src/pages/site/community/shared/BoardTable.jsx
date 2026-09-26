import { Pin } from "lucide-react";

/*
 * 커뮤니티 게시판 공용 목록 표.
 * 누구나 익숙한 "번호 | 제목 | 작성자 | 작성일 | 조회" 형식을 기본으로,
 * 게시판마다 필요한 열(별점, 답변 상태 등)만 columns로 더한다.
 *  - 고정 공지: 연한 초록 배경 + 📌 공지
 *  - 제목 옆: 댓글 수 [n], 3일 이내 새 글 N
 *  - 모바일: 표 머리를 숨기고 제목 + 한 줄 정보(작성자 · 날짜 · 조회)
 */

const styles = `
  .bt { border-top: 2px solid #111827; }
  .bt-head {
    display: flex; align-items: center; padding: 12px 16px;
    background: #fafbfc; border-bottom: 1px solid #e5e7eb;
    font-size: 13px; font-weight: 700; color: #6b7280;
  }
  .bt-row {
    display: flex; align-items: center; padding: 16px;
    border-bottom: 1px solid #f1f3f5; cursor: pointer; transition: background 0.15s;
  }
  .bt-row:hover { background: #f7fbf2; }
  .bt-row.pinned { background: #f4f8ee; }
  .bt-row.pinned:hover { background: #edf5e2; }
  .bt-no { width: 72px; flex-shrink: 0; text-align: center; font-size: 13.5px; color: #9ca3af; }
  .bt-pin {
    display: inline-flex; align-items: center; gap: 3px; height: 24px; padding: 0 9px; border-radius: 999px;
    background: #e3f0d2; color: #4d7a1f; font-size: 12px; font-weight: 800; white-space: nowrap;
  }
  .bt-title-col { flex: 1; min-width: 0; padding: 0 14px; text-align: left; }
  .bt-head .bt-title-col { padding-left: 14px; }
  .bt-title { display: flex; align-items: center; gap: 6px; min-width: 0; }
  .bt-title-prefix { flex-shrink: 0; font-size: 13px; font-weight: 700; color: #6b7280; }
  .bt-title-text { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 15px; font-weight: 500; color: #111827; }
  .bt-row:hover .bt-title-text { text-decoration: underline; text-underline-offset: 3px; text-decoration-color: #cbd5e1; }
  .bt-row.pinned .bt-title-text { font-weight: 700; }
  .bt-cmt { flex-shrink: 0; font-size: 13px; font-weight: 800; color: #5E8F2A; }
  .bt-new {
    flex-shrink: 0; width: 17px; height: 17px; border-radius: 5px; background: #f97316; color: #fff;
    font-size: 10.5px; font-weight: 900; display: inline-flex; align-items: center; justify-content: center;
  }
  .bt-cell { flex-shrink: 0; text-align: center; font-size: 13.5px; color: #6b7280; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .bt-cell.muted { color: #9ca3af; }
  .bt-meta { display: none; }
  .bt-empty { text-align: center; padding: 64px 0; color: #9ca3af; font-size: 14px; }

  @media (max-width: 767px) {
    .bt-head { display: none; }
    .bt-row { flex-direction: column; align-items: stretch; gap: 6px; padding: 14px 12px; }
    .bt-no, .bt-cell { display: none; }
    .bt-title-col { padding: 0; }
    .bt-title-text { white-space: normal; word-break: keep-all; font-size: 14.5px; }
    .bt-meta { display: flex; align-items: center; flex-wrap: wrap; gap: 6px; font-size: 12.5px; color: #9ca3af; }
    .bt-meta > * + *::before { content: "·"; margin-right: 6px; color: #d1d5db; }
  }
`;

const THREE_DAYS = 3 * 24 * 60 * 60 * 1000;
export function isNewPost(createdAt) {
  const t = new Date(createdAt ?? "").getTime();
  return Number.isFinite(t) && Date.now() - t < THREE_DAYS;
}

// 제목: [말머리] 제목 [댓글수] N
export function BoardTitle({ text, prefix, comments = 0, isNew = false }) {
  return (
    <span className="bt-title">
      {prefix ? <span className="bt-title-prefix">{prefix}</span> : null}
      <span className="bt-title-text">{text}</span>
      {Number(comments) > 0 ? <span className="bt-cmt">[{Number(comments)}]</span> : null}
      {isNew ? <span className="bt-new" title="새 글">N</span> : null}
    </span>
  );
}

export function PinnedLabel() {
  return <span className="bt-pin"><Pin size={11} strokeWidth={2.4} />공지</span>;
}

/**
 * columns: 제목 뒤에 오는 열들 [{ key, label, width }]
 * rows: [{ key, pinned, onClick, no, title, cells: { [key]: node }, meta: [node] }]
 */
export default function BoardTable({ columns = [], rows = [], emptyText = "게시글이 없습니다.", leading }) {
  return (
    <div className="bt">
      <style>{styles}</style>
      <div className="bt-head">
        <span className="bt-no">번호</span>
        {leading ? <span className="bt-cell" style={{ width: leading.width }}>{leading.label}</span> : null}
        <span className="bt-title-col">제목</span>
        {columns.map((c) => (
          <span key={c.key} className="bt-cell" style={{ width: c.width }}>{c.label}</span>
        ))}
      </div>

      {rows.map((r) => (
        <div
          key={r.key}
          className={`bt-row${r.pinned ? " pinned" : ""}`}
          role="link"
          tabIndex={0}
          onClick={r.onClick}
          onKeyDown={(e) => { if (e.key === "Enter") r.onClick?.(); }}
        >
          <span className="bt-no">{r.pinned ? <PinnedLabel /> : r.no}</span>
          {leading ? <span className="bt-cell" style={{ width: leading.width }}>{r.leading}</span> : null}
          <div className="bt-title-col">
            {r.title}
            {r.meta?.length ? <div className="bt-meta">{r.meta.map((m, i) => <span key={i}>{m}</span>)}</div> : null}
          </div>
          {columns.map((c) => (
            <span key={c.key} className={`bt-cell${c.muted ? " muted" : ""}`} style={{ width: c.width }}>{r.cells?.[c.key]}</span>
          ))}
        </div>
      ))}

      {rows.length === 0 ? <div className="bt-empty">{emptyText}</div> : null}
    </div>
  );
}
