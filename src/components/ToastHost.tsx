"use client";

import { useToastStore } from "@/stores/useToastStore";

export default function ToastHost() {
  const toasts = useToastStore((state) => state.toasts);

  if (toasts.length === 0) return null;

  return (
    <div
      className="pointer-events-none fixed bottom-6 left-1/2 z-[90] flex -translate-x-1/2 flex-col items-center gap-2"
      role="status"
      aria-live="polite"
    >
      {toasts.map((item) => (
        <div
          key={item.id}
          className="animate-[toast-in_0.3s_cubic-bezier(0.16,1,0.3,1)] rounded-xl bg-[var(--ds-ink)] px-4 py-3 text-sm font-medium text-white shadow-lg"
        >
          {item.message}
        </div>
      ))}
    </div>
  );
}
