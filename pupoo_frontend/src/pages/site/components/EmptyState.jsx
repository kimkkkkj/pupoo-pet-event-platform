import { SearchX, AlertCircle } from "lucide-react";

const styles = `
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 120px 20px;
    min-height: 400px;
  }
  .empty-state-icon {
    width: 64px;
    height: 64px;
    border-radius: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 16px;
  }
  .empty-state-title {
    font-size: 14px;
    font-weight: 500;
    color: #adb5bd;
    margin-bottom: 6px;
    font-family: 'JeonjuCraftGothic', Pretendard, 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif;
  }
  .empty-state-desc {
    font-size: 14px;
    color: #adb5bd;
    font-weight: 500;
    text-align: center;
    line-height: 1.5;
    font-family: 'JeonjuCraftGothic', Pretendard, 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif;
  }
`;

export default function EmptyState({ type = "empty", message, description }) {
  const isError = type === "error";
  return (
    <>
      <style>{styles}</style>
      <div className="empty-state">
        <div
          className="empty-state-icon"
          style={{ background: "none" }}
        >
          {isError
            ? <AlertCircle size={48} color="#d1d5db" strokeWidth={1.2} />
            : <SearchX size={48} color="#d1d5db" strokeWidth={1.2} />
          }
        </div>
        <div className="empty-state-title">
          {message || (isError ? "오류가 발생했습니다" : "검색 결과가 없습니다")}
        </div>
        {description && <div className="empty-state-desc">{description}</div>}
      </div>
    </>
  );
}
