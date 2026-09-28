// 깨진 이미지 대신 보여줄 사진 (S3 image/ 폴더에 실제로 있는 행사장·반려동물 사진)
// 외부 랜덤 이미지 서비스는 봇 차단으로 막힐 수 있어 우리 버킷의 사진만 쓴다.
export const FALLBACK_PHOTO_BASE = "https://pupoo-uploads-kgj.s3.ap-northeast-2.amazonaws.com/image/";

export const FALLBACK_PHOTOS = [
  "booth-dog-photo",
  "booth-walk-safety",
  "booth-cat-agility",
  "booth-first-aid",
  "booth-healing-massage",
  "booth-puzzle-game",
  "booth-talent-contest",
  "booth-training-basics",
  "hero",
  "gureum",
  "kongi",
  "chu",
].map((name) => `${FALLBACK_PHOTO_BASE}${name}.png`);

function hash(s) {
  let h = 0;
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

/**
 * 문서 전체의 <img> 로드 실패를 잡아 대체 사진으로 바꾼다. 해제 함수를 돌려준다.
 * 대체 중인 이미지는 data-pet-ph="1", 대체 사진까지 실패하면 "failed"로 표시한다.
 */
export function installImageFallback() {
  const onError = (e) => {
    const el = e.target;
    if (!el || el.tagName !== "IMG") return;
    // 행사 포스터처럼 아무 사진으로 바꾸면 오해를 주는 이미지는 data-no-fallback 으로 제외한다.
    if (el.dataset.noFallback) return;
    if (el.dataset.petPh) {
      el.dataset.petPh = "failed"; // 대체 사진도 실패 → 컴포넌트가 자체 빈 화면을 보여주게 둔다
      return;
    }
    const orig = el.getAttribute("src") || "";
    if (!orig || orig.startsWith("data:") || orig.startsWith(FALLBACK_PHOTO_BASE)) {
      el.dataset.petPh = "failed";
      return;
    }
    el.dataset.petPh = "1";
    el.src = FALLBACK_PHOTOS[hash(orig) % FALLBACK_PHOTOS.length];
  };
  // error 이벤트는 버블링되지 않으므로 캡처 단계에서 잡는다(컴포넌트의 onError보다 먼저 실행된다).
  document.addEventListener("error", onError, true);
  return () => document.removeEventListener("error", onError, true);
}

/** 컴포넌트 onError에서: 방금 대체 사진으로 바뀌었다면 true (아직 "이미지 없음"으로 바꾸지 말 것) */
export function isSwappingToFallback(e) {
  return e?.currentTarget?.dataset?.petPh === "1";
}
