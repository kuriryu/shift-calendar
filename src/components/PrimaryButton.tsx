import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

/** PayPayの主要アクション。高さ52px、Primary Blue、白文字、1行。 */
export const primaryButtonClassName =
  "primary-button ds-btn gap-1 disabled:cursor-not-allowed";

export default function PrimaryButton({
  children,
  className = "",
  href,
  type = "button",
  ...props
}: {
  children: ReactNode;
  className?: string;
  href?: string;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  const classes = `${primaryButtonClassName} ${className}`;

  if (href) {
    return (
      <Link href={href} className={classes} style={{ color: "#ffffff" }}>
        {children}
      </Link>
    );
  }

  return (
    <button type={type} className={classes} style={{ color: "#ffffff" }} {...props}>
      {children}
    </button>
  );
}
