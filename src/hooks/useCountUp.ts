"use client";

import { useEffect, useState } from "react";

const DURATION_MS = 800;

/** 0 から target まで ease-out cubic で数値を伸ばす（800ms） */
export function useCountUp(target: number, reduced: boolean, delayMs = 0): number {
  const [shown, setShown] = useState(reduced ? target : 0);
  useEffect(() => {
    if (reduced) {
      setShown(target);
      return;
    }
    setShown(0);
    let frame = 0;
    const timeout = window.setTimeout(() => {
      const start = performance.now();
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / DURATION_MS);
        const eased = 1 - (1 - t) ** 3;
        setShown(Math.round(target * eased));
        if (t < 1) frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    }, delayMs);
    return () => {
      clearTimeout(timeout);
      cancelAnimationFrame(frame);
    };
  }, [reduced, target, delayMs]);
  return shown;
}
