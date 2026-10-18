import Button, { buttonVariantClassName } from "@/components/ui/Button";
import type { ButtonHTMLAttributes, ReactNode } from "react";

/** PayPayの主要アクション。高さ52px、Primary Blue、白文字、1行。 */
export const primaryButtonClassName = buttonVariantClassName.primary;

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
  return (
    <Button variant="primary" className={className} href={href} type={type} {...props}>
      {children}
    </Button>
  );
}
