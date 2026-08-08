import { useEffect, useRef, useState } from "react";

/**
 * Image that only starts loading once it scrolls near the viewport,
 * using IntersectionObserver. Falls back to eager loading when the
 * observer is unavailable.
 */
export default function LazySceneImage({
  src,
  alt,
  caption,
}: {
  src: string;
  alt?: string;
  caption?: string;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(
    typeof IntersectionObserver === "undefined"
  );
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);

  useEffect(() => {
    if (visible || typeof IntersectionObserver === "undefined") return;
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true);
            obs.disconnect();
            break;
          }
        }
      },
      { rootMargin: "300px 0px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [visible]);

  return (
    <figure className="md-figure">
      <div className="lazy-scene" ref={ref}>
        {visible && !errored ? (
          <img
            src={src}
            alt={alt || caption || ""}
            loading="lazy"
            className={loaded ? "is-loaded" : ""}
            onLoad={() => setLoaded(true)}
            onError={() => setErrored(true)}
          />
        ) : null}
        {errored ? <span>{alt || "image"}</span> : null}
      </div>
      {caption ? <figcaption>{caption}</figcaption> : null}
    </figure>
  );
}
