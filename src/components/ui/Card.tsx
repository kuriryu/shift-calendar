import type { ComponentProps } from "react";

function joinClasses(...parts: (string | false | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

export default function Card({ className = "", ...props }: ComponentProps<"div">) {
  return <div className={joinClasses("ds-card p-5", className)} {...props} />;
}
