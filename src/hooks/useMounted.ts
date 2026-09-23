"use client";

import { useEffect, useState } from "react";

/** LocalStorage persist のハイドレーション完了を待つ */
export function useMounted(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}
