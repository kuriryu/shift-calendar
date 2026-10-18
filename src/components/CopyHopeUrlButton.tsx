"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Icon from "@/components/Icon";

type CopyHopeUrlButtonProps = {
  url: string;
  variant?: "icon" | "bar";
};

export default function CopyHopeUrlButton({ url, variant = "icon" }: CopyHopeUrlButtonProps) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const copy = useCallback(async () => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable — UI stays usable */
    }
  }, [url]);

  if (variant === "bar") {
    return (
      <div className="flex h-11 w-full items-center gap-2 overflow-hidden rounded-[10px] border border-[var(--ds-line)] bg-white px-3 shadow-sm">
        <Icon name="link" size={20} className="shrink-0 text-slate-400" />
        <span className="min-w-0 flex-1 truncate text-sm text-slate-400" title={url || undefined}>
          {url}
        </span>
        <button
          type="button"
          onClick={() => void copy()}
          disabled={!url}
          className={`shrink-0 rounded-lg px-4 py-2 text-sm font-bold text-white transition-colors focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-40 ${
            copied
              ? "bg-[var(--ds-green)] hover:bg-[var(--ds-green-press)]"
              : "bg-[var(--ds-action)] hover:bg-[var(--ds-action-press)]"
          }`}
        >
          {copied ? "コピー済み" : "コピー"}
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => void copy()}
      disabled={!url}
      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-40"
      aria-label={copied ? "コピーしました" : "希望を送るURLをコピー"}
    >
      <Icon name={copied ? "check" : "content_copy"} size={20} />
    </button>
  );
}
