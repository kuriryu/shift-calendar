"use client";

import { STEPS } from "@/lib/steps";
import type { StepId } from "@/types";

/** 現在ステップに連動するプログレスバー（表示専用・タップ不可） */
export default function StepProgress({ current }: { current: StepId }) {
  const percent = Math.round((current / STEPS.length) * 100);

  return (
    <nav aria-label="シフト作成の進行状況" className="py-1">
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-label={`ステップ ${current} / ${STEPS.length}（${percent}%）`}
        className="h-2.5 overflow-hidden rounded-full bg-slate-100"
      >
        <div
          className="h-full rounded-full bg-indigo-500 transition-[width] duration-500 ease-out"
          style={{ width: `${percent}%` }}
        />
      </div>
    </nav>
  );
}
