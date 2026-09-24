"use client";

import { useSyncExternalStore } from "react";

const QUERY = "(max-width: 767px)"; // 768px 未満

function subscribe(callback: () => void) {
  const mq = window.matchMedia(QUERY);
  mq.addEventListener("change", callback);
  return () => mq.removeEventListener("change", callback);
}

/** 画面幅が sm 未満（モバイル）かどうか。SSR 時は false */
export function useIsMobile(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => false,
  );
}
