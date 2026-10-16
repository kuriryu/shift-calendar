"use client";

export default function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose?: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-900/40 p-4 sm:items-center">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl"
      >
        <h2 className="text-lg font-bold text-slate-900">{title}</h2>
        <div className="mt-3 text-sm leading-relaxed text-slate-600">{children}</div>
        {onClose && (
          <button type="button" className="sr-only" onClick={onClose}>
            閉じる
          </button>
        )}
      </div>
    </div>
  );
}
