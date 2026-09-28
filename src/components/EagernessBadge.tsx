"use client";

import { useMemo } from "react";
import { EMPTY_REQUESTS, useAppStore } from "@/stores/useAppStore";
import { eagernessByStaff } from "@/lib/request-priority";

/** この月の希望量ラベル。希望が多い人だけ文字が入る */
export function useEagernessLabels(): Map<string, string | null> {
  const month = useAppStore((s) => s.selectedMonth);
  const staff = useAppStore((s) => s.staff);
  const settings = useAppStore((s) => s.settings);
  const requests = useAppStore((s) => s.requests[s.selectedMonth] ?? EMPTY_REQUESTS);
  return useMemo(() => {
    const scored = eagernessByStaff(month, staff, requests, settings);
    return new Map([...scored].map(([id, row]) => [id, row.label]));
  }, [month, staff, requests, settings]);
}

/** 希望が多いスタッフの名前横に出すやる気マーク */
export default function EagernessBadge({
  label,
  compact = false,
}: {
  label: string | null;
  compact?: boolean;
}) {
  if (!label) return null;
  if (compact) {
    return (
      <span title={label} className="shrink-0 text-[11px] leading-none" aria-hidden>
        🔥
      </span>
    );
  }
  return (
    <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-orange-50 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-orange-700">
      <span aria-hidden>🔥</span>
      {label}
    </span>
  );
}
