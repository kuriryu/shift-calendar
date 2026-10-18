"use client";

import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
} from "react";

/**
 * 入力枠の共通スタイル。
 * 上下左右の余白をすべて 12px（p-3）で統一。高さはパディング＋文字サイズから自然に決める。
 */
export const fieldClassName = "field-control ds-input appearance-none";

export default function FieldControl({
  id,
  label,
  required,
  hint,
  children,
  className = "",
}: {
  id: string;
  label: ReactNode;
  required?: boolean;
  hint?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`space-y-2 ${className || "min-w-0 flex-1"}`}>
      <label htmlFor={id} className="ds-label">
        {label}
        {required && (
          <>
            <span className="ms-1 text-red-600" aria-hidden>
              *
            </span>
            <span className="sr-only">必須</span>
          </>
        )}
        {hint && <span className="ds-help">{hint}</span>}
      </label>
      {children}
    </div>
  );
}

export function FieldSelect({
  className = "",
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { id: string }) {
  return <select {...props} className={`${fieldClassName} ${className}`} />;
}

export function FieldInput({
  className = "",
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { id: string }) {
  const numberReset =
    props.type === "number"
      ? "[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      : "";
  return (
    <input
      {...props}
      className={`${fieldClassName} ${numberReset} ${className}`}
    />
  );
}

/** 日・週・月ナビ用の正円ボタン（楕円にならないよう h/w 固定） */
export const navCircleButtonClassName =
  "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600";
