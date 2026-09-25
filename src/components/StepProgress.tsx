"use client";

import Icon from "@/components/Icon";
import { STEPS } from "@/lib/steps";
import type { StepId } from "@/types";

/** 現在ステップに連動するプログレスバー（表示専用・タップ不可） */
export default function StepProgress({ current }: { current: StepId }) {
  const percent = Math.round((current / STEPS.length) * 100);
  const def = STEPS[current - 1];

  return (
    <nav aria-label="シフト作成の進行状況" className="space-y-1.5 py-0 md:space-y-2 md:py-1">
      <div className="flex items-center gap-3 text-[11px] text-slate-500 md:text-xs">
        <span className="inline-flex items-center gap-1.5 font-medium text-slate-600">
          <Icon name={def.icon} size={14} className="text-blue-600" />
          {current} / {STEPS.length}
          <span className="font-normal text-slate-400">· {def.label}</span>
        </span>
      </div>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-label={`ステップ ${current} / ${STEPS.length}`}
        className="h-2 overflow-hidden rounded-full bg-slate-100 md:h-2.5"
      >
        <div
          className="h-full rounded-full bg-blue-600 transition-[width] duration-500 ease-out"
          style={{ width: `${percent}%` }}
        />
      </div>
    </nav>
  );
}
