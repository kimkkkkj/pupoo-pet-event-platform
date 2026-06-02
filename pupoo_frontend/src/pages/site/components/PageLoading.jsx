const styles = `
  .page-loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 100px 20px;
    min-height: 400px;
    grid-column: 1 / -1;
  }
  .pl-spinner {
    width: 36px;
    height: 36px;
    border: 3px solid #e5e7eb;
    border-top-color: #90C450;
    border-radius: 50%;
    animation: pl-spin 0.75s linear infinite;
  }
  .page-loading-text {
    margin-top: 20px;
    font-size: 14px;
    font-weight: 600;
    color: #9ca3af;
    letter-spacing: -0.02em;
    font-family: inherit;
  }
  @keyframes pl-spin {
    to { transform: rotate(360deg); }
  }
`;

export default function PageLoading({ message = "불러오는 중" }) {
  return (
    <>
      <style>{styles}</style>
      <div className="page-loading">
        <div className="pl-spinner" />
        <span className="page-loading-text">{message}</span>
      </div>
    </>
  );
}
