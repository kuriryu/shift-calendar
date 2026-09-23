"use client";

import { useEffect, useRef } from "react";

/**
 * ポップオーバー／ドロワー向けの補助フック。
 * - Esc キーで onClose を呼ぶ
 * - 開いたときに最初のフォーカス可能要素へフォーカスを移す
 * - 閉じたときに元の要素へフォーカスを戻す
 */
export function useDismissable<T extends HTMLElement>(
  open: boolean,
  onClose: () => void,
) {
  const ref = useRef<T | null>(null);
  const restoreRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    restoreRef.current = document.activeElement as HTMLElement | null;

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener("keydown", handleKey);

    // 最初のフォーカス可能要素へ
    const el = ref.current;
    if (el) {
      const focusable = el.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      (focusable ?? el).focus({ preventScroll: true });
    }

    return () => {
      document.removeEventListener("keydown", handleKey);
      restoreRef.current?.focus?.({ preventScroll: true });
    };
  }, [open, onClose]);

  return ref;
}
