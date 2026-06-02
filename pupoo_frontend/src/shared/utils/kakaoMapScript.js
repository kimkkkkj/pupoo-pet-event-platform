/**
 * 카카오 지도 API 스크립트를 동적으로 로드합니다.
 * @param {string} appKey - 카카오 개발자 콘솔에서 발급한 JavaScript 키
 * @returns {Promise<void>} 스크립트 로드 완료 시 resolve
 */
export function loadKakaoMapScript(appKey) {
  if (!appKey || typeof appKey !== "string") {
    return Promise.reject(new Error("VITE_KAKAO_MAP_KEY is required"));
  }

  if (typeof window === "undefined") {
    return Promise.reject(new Error("window is not defined"));
  }

  if (window.kakao?.maps?.Map) {
    return Promise.resolve();
  }

  const existing = document.querySelector('script[src*="dapi.kakao.com/v2/maps/sdk.js"]');
  if (existing) {
    return new Promise((resolve) => {
      if (window.kakao?.maps?.load) {
        window.kakao.maps.load(() => resolve());
      } else {
        const check = (retries = 20) => {
          if (window.kakao?.maps?.Map) {
            resolve();
            return;
          }
          if (retries <= 0) {
            resolve();
            return;
          }
          setTimeout(() => check(retries - 1), 50);
        };
        check();
      }
    });
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(appKey)}&autoload=false&libraries=services`;
    script.async = true;
    script.onload = () => {
      if (window.kakao?.maps?.load) {
        window.kakao.maps.load(() => resolve());
      } else {
        const waitForKakao = (retries = 20) => {
          if (window.kakao?.maps?.Map) {
            resolve();
            return;
          }
          if (retries <= 0) {
            resolve();
            return;
          }
          setTimeout(() => waitForKakao(retries - 1), 50);
        };
        waitForKakao();
      }
    };
    script.onerror = () => reject(new Error("Failed to load Kakao Map script"));
    document.head.appendChild(script);
  });
}
