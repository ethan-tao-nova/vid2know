import type { ReactNode } from "react";

export default function PageHeader({
  title,
  description,
  extra,
}: {
  title: ReactNode;
  description?: ReactNode;
  extra?: ReactNode;
}) {
  return (
    <div className="page-header">
      <div className="page-header__row">
        <div>
          <h1 className="page-header__title">{title}</h1>
          {description ? <p className="page-header__desc">{description}</p> : null}
        </div>
        {extra ? <div>{extra}</div> : null}
      </div>
    </div>
  );
}
