import { Link } from "react-router-dom";
import { useT } from "../i18n/LocaleContext";

export default function BrandLogo({ to = "/" }: { to?: string }) {
  const t = useT();
  return (
    <Link className="brand-logo" to={to} aria-label={t.common.appName}>
      <span className="brand-logo__mark" aria-hidden>
        {/* Simple film + note glyph */}
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <rect
            x="2.5"
            y="4"
            width="19"
            height="16"
            rx="3"
            stroke="currentColor"
            strokeWidth="1.6"
          />
          <path
            d="M2.5 9h19M8 4v16M16 4v16"
            stroke="currentColor"
            strokeWidth="1.2"
            opacity="0.7"
          />
          <path
            d="M10 12.5l4 2-4 2v-4z"
            fill="currentColor"
          />
        </svg>
      </span>
      <span className="brand-logo__text">
        <span className="brand-logo__title">{t.common.appName}</span>
        <span className="brand-logo__sub">{t.common.tagline}</span>
      </span>
    </Link>
  );
}
