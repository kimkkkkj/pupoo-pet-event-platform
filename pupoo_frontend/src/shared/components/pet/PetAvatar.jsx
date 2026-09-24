import { useEffect, useMemo, useState } from "react";
import { PawPrint } from "lucide-react";
import { toPublicAssetUrl } from "../../utils/publicAssetUrl";

/**
 * 반려동물 프로필 이미지.
 * - 정사각형 틀에 object-fit: cover, radius로 원형/둥근 모서리를 정한다.
 * - src에 배열을 주면 앞에서부터 시도하고, 로드에 실패하면 다음 후보로 넘어간다.
 *   (예: [신청 사진, 프로필 이미지])
 * - 후보가 없거나 모두 실패하면 fallback(기본: 발바닥 아이콘)을 보여준다.
 */
export default function PetAvatar({
  src,
  name = "",
  size = 44,
  radius = "50%",
  background = "#f5f3ff",
  iconColor = "#8b5cf6",
  iconSize,
  fallback = null,
  style,
}) {
  const candidates = useMemo(
    () =>
      (Array.isArray(src) ? src : [src])
        .filter(Boolean)
        .map((value) => toPublicAssetUrl(value))
        .filter((value, index, list) => value && list.indexOf(value) === index),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [Array.isArray(src) ? src.join("|") : src],
  );
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
  }, [candidates]);

  const current = candidates[index];
  const resolvedIconSize = iconSize ?? (typeof size === "number" ? Math.round(size * 0.45) : 32);

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        background,
        flexShrink: 0,
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        ...style,
      }}
    >
      {current ? (
        <img
          key={current}
          src={current}
          alt={name ? `${name} 프로필` : "반려동물 프로필"}
          loading="lazy"
          onError={() => setIndex((i) => i + 1)}
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        />
      ) : (
        fallback ?? <PawPrint size={resolvedIconSize} color={iconColor} strokeWidth={1.8} aria-hidden="true" />
      )}
    </div>
  );
}
