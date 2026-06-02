export const MY_PAGE_FONT = "'Pretendard Variable', 'Pretendard', -apple-system, sans-serif";

export const mypagePageStyle = {
  minHeight: "100vh",
  background: "#f8f9fc",
  padding: "0 16px",
  fontFamily: MY_PAGE_FONT,
};

export const mypageCardStyle = {
  background: "#fff",
  border: "1px solid #e9ecef",
  borderRadius: 13,
  padding: 24,
  fontFamily: MY_PAGE_FONT,
};

export const mypageTitleStyle = {
  margin: "0 0 18px",
  fontSize: 22,
  fontWeight: 800,
  color: "#111827",
};

export const mypageLabelStyle = {
  display: "block",
  marginBottom: 6,
  color: "#374151",
  fontSize: 13.5,
  fontWeight: 600,
};

export const mypageInputStyle = {
  width: "100%",
  height: 42,
  border: "1px solid #d1d5db",
  borderRadius: 10,
  padding: "0 12px",
  fontSize: 13.5,
  color: "#111827",
  fontFamily: MY_PAGE_FONT,
};

const buttonBase = {
  height: 40,
  padding: "0 14px",
  borderRadius: 10,
  fontSize: 13,
  fontWeight: 600,
  fontFamily: MY_PAGE_FONT,
};

export const mypagePrimaryButtonStyle = {
  ...buttonBase,
  border: "none",
  background: "#1a4fd6",
  color: "#fff",
  cursor: "pointer",
};

export const mypageOutlineButtonStyle = {
  ...buttonBase,
  border: "1.5px solid #e2e8f0",
  background: "#fff",
  color: "#374151",
  cursor: "pointer",
};

export const mypageDangerButtonStyle = {
  ...buttonBase,
  border: "1px solid #fecaca",
  background: "#fff1f2",
  color: "#b91c1c",
  cursor: "pointer",
};

