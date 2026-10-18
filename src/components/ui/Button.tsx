import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

export const buttonVariantClassName = {
  primary: "primary-button ds-btn gap-1 disabled:cursor-not-allowed",
  secondary: "ds-btn-secondary",
  neutral: "ds-btn-neutral",
  line: "ds-btn-line",
  danger: "ds-btn-danger",
  dangerFill: "ds-btn-danger-fill",
} as const;

export type ButtonVariant = keyof typeof buttonVariantClassName;

function joinClasses(...parts: (string | false | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

export default function Button({
  children,
  className = "",
  variant = "primary",
  fullWidth = false,
  href,
  type = "button",
  ...props
}: {
  children: ReactNode;
  className?: string;
  variant?: ButtonVariant;
  fullWidth?: boolean;
  href?: string;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  const classes = joinClasses(
    buttonVariantClassName[variant],
    fullWidth && "w-full",
    className,
  );
  const primaryStyle = variant === "primary" ? ({ color: "#ffffff" } as const) : undefined;

  if (href) {
    return (
      <Link href={href} className={classes} style={primaryStyle}>
        {children}
      </Link>
    );
  }

  return (
    <button type={type} className={classes} style={primaryStyle} {...props}>
      {children}
    </button>
  );
}
