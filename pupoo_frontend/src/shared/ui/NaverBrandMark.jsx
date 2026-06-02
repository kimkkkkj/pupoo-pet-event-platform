export function NaverBrandMark({
  size = 20,
  rounded = 6,
  background = "#03C75A",
  color = "#FFFFFF",
}) {
  return (
    <span
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        minWidth: size,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: rounded,
        background,
      }}
    >
      <svg
        width={Math.round(size * 0.6)}
        height={Math.round(size * 0.6)}
        viewBox="0 0 20 20"
        fill="none"
      >
        <path
          d="M13.56 10.74L6.22 1H1v18h5.44V9.26L13.78 19H19V1h-5.44v9.74z"
          fill={color}
        />
      </svg>
    </span>
  );
}
