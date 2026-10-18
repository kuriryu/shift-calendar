import type { ReactNode } from "react";

function joinClasses(...parts: (string | false | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

export default function PageShell({
  title,
  lead,
  children,
  className = "",
  titleClassName = "",
  leadClassName = "",
}: {
  title?: string;
  lead?: ReactNode;
  children: ReactNode;
  className?: string;
  titleClassName?: string;
  leadClassName?: string;
}) {
  return (
    <div className={joinClasses("ds-page", className)}>
      {title ? <h1 className={joinClasses("ds-title", titleClassName)}>{title}</h1> : null}
      {lead ? <p className={joinClasses("ds-lead", leadClassName)}>{lead}</p> : null}
      {children}
    </div>
  );
}
