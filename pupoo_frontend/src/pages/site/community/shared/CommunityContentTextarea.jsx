export default function CommunityContentTextarea({
  value,
  onChange,
  placeholder = "내용을 입력해 주세요.",
  height = 260,
}) {
  return (
    <textarea
      value={value ?? ""}
      onChange={(e) => onChange?.(e.target.value)}
      placeholder={placeholder}
      style={{
        width: "100%",
        minHeight: height,
        padding: "14px 16px",
        borderRadius: 10,
        border: "1px solid #cbd5e1",
        fontSize: 14,
        lineHeight: 1.6,
        color: "#0f172a",
        background: "#fff",
        resize: "vertical",
        boxSizing: "border-box",
        fontFamily: "'Noto Sans KR', sans-serif",
      }}
    />
  );
}
