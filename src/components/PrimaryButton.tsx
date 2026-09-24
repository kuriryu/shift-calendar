import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

/** 「次へ」と同系統のプライマリボタン（青背景・白文字・高さ44px） */
export const primaryButtonClassName =
  "primary-button inline-flex h-11 min-h-11 items-center justify-center gap-1 rounded-md bg-blue-600 px-4 text-sm font-semibold !text-white hover:bg-blue-700 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-300";

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
