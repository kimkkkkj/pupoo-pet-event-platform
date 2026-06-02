import { forwardRef, memo, useEffect, useMemo, useRef, useState } from "react";

const DEFAULT_ROOT_MARGIN = "240px 0px";

function guessVideoType(src) {
  const raw = String(src || "").toLowerCase();
  if (raw.endsWith(".mov")) return "video/quicktime";
  if (raw.endsWith(".webm")) return "video/webm";
  return "video/mp4";
}

export const LazyInlineVideo = memo(
  forwardRef(function LazyInlineVideo(
    {
      src,
      poster,
      className = "",
      style,
      autoPlay = true,
      muted = true,
      loop = true,
      playsInline = true,
      preload = "none",
      active = true,
      fallbackContent = null,
      rootMargin = DEFAULT_ROOT_MARGIN,
      onEnded,
      onTimeUpdate,
      onLoadedMetadata,
    },
    forwardedRef,
  ) {
    const localRef = useRef(null);
    const [shouldLoad, setShouldLoad] = useState(false);
    const [loadFailed, setLoadFailed] = useState(false);
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
      setIsReady(false);
      setLoadFailed(false);
    }, [src]);

    useEffect(() => {
      const target = localRef.current;
      if (!target || !active) return undefined;

      const observer = new IntersectionObserver(
        (entries) => {
          if (entries.some((entry) => entry.isIntersecting)) {
            setShouldLoad(true);
            observer.disconnect();
          }
        },
        { rootMargin, threshold: 0.01 },
      );

      observer.observe(target);
      return () => observer.disconnect();
    }, [active, rootMargin]);

    useEffect(() => {
      const element = localRef.current;
      if (!element || !active || !shouldLoad) return;

      if (typeof forwardedRef === "function") {
        forwardedRef(element);
      } else if (forwardedRef) {
        forwardedRef.current = element;
      }

      if (autoPlay) {
        const playPromise = element.play();
        if (playPromise?.catch) {
          playPromise.catch(() => {});
        }
      }
    }, [active, autoPlay, forwardedRef, shouldLoad]);

    useEffect(() => {
      const element = localRef.current;
      if (!element) return;

      if (!active) {
        element.pause();
      } else if (shouldLoad && autoPlay) {
        const playPromise = element.play();
        if (playPromise?.catch) {
          playPromise.catch(() => {});
        }
      }
    }, [active, autoPlay, shouldLoad]);

    const resolvedSource = useMemo(() => {
      if (!active || !shouldLoad || loadFailed) return "";
      return src || "";
    }, [active, loadFailed, shouldLoad, src]);

    return (
      <div className="relative h-full w-full overflow-hidden">
        {poster && !isReady ? (
          <img
            src={poster}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : null}
        <video
          ref={localRef}
          className={className || "absolute inset-0 h-full w-full object-cover"}
          style={style}
          autoPlay={autoPlay}
          muted={muted}
          loop={loop}
          playsInline={playsInline}
          webkit-playsinline=""
          preload={preload}
          poster={poster || undefined}
          onEnded={onEnded}
          onTimeUpdate={onTimeUpdate}
          onLoadedMetadata={onLoadedMetadata}
          onCanPlay={() => setIsReady(true)}
          onPlaying={() => setIsReady(true)}
          onError={() => setLoadFailed(true)}
        >
          {resolvedSource ? (
            <source src={resolvedSource} type={guessVideoType(resolvedSource)} />
          ) : null}
          {fallbackContent || "브라우저가 영상을 지원하지 않습니다."}
        </video>
      </div>
    );
  }),
);
