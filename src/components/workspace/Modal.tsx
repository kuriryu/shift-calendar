"use client";

import type { ReactNode } from "react";

export default function Modal({
  title,
  children,
  footer,
  onClose,
}: {
  title: string;
  children: ReactNode;
  /** モーダル本文の下に置くフッター（例: ModalActions）。children 内に書いてもよい。 */
  footer?: ReactNode;
  onClose?: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-[rgba(17,17,17,0.4)] p-4 sm:items-center">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="ds-card w-full max-w-md p-5 shadow-[0_-12px_32px_rgba(0,0,0,0.12)]"
      >
        <h2 className="text-lg font-bold text-[var(--ds-ink)]">{title}</h2>
        <div className="mt-3 text-sm leading-relaxed text-slate-600">{children}</div>
        {footer}
        {onClose && (
          <button type="button" className="sr-only" onClick={onClose}>
            閉じる
          </button>
        )}
      </div>
    </div>
  );
}
