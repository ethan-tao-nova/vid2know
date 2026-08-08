import { useEffect, useMemo, useState } from "react";
import { Typography } from "antd";
import { useT } from "../i18n/LocaleContext";
import { extractHeadings } from "./IllustratedMarkdown";

/** Sticky table-of-contents derived from markdown headings. */
export default function DocOutline({
  content,
  scrollOffset = 88,
}: {
  content: string;
  scrollOffset?: number;
}) {
  const t = useT();
  const headings = useMemo(() => extractHeadings(content, 3), [content]);
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    if (headings.length === 0 || typeof IntersectionObserver === "undefined") {
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: `-${scrollOffset}px 0px -70% 0px` }
    );
    const els: Element[] = [];
    for (const h of headings) {
      const el = document.getElementById(h.id);
      if (el) {
        observer.observe(el);
        els.push(el);
      }
    }
    return () => observer.disconnect();
  }, [headings, scrollOffset]);

  const jump = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    const top =
      el.getBoundingClientRect().top + window.scrollY - scrollOffset + 4;
    window.scrollTo({ top, behavior: "smooth" });
    setActive(id);
  };

  if (headings.length === 0) return null;

  return (
    <nav className="doc-outline" aria-label={t.detail.outline}>
      <Typography.Text
        type="secondary"
        style={{ fontSize: 12, paddingLeft: 8, display: "block", marginBottom: 6 }}
      >
        {t.detail.outline}
      </Typography.Text>
      {headings.map((h) => (
        <button
          key={h.id}
          type="button"
          className={
            "doc-outline__item" +
            (active === h.id ? " doc-outline__item--active" : "")
          }
          style={{ paddingLeft: 8 + (h.level - 1) * 12 }}
          onClick={() => jump(h.id)}
          title={h.text}
        >
          {h.text}
        </button>
      ))}
    </nav>
  );
}
