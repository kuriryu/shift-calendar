"use client";

import Icon from "@/components/Icon";
import { STEPS } from "@/lib/steps";
import type { StepId } from "@/types";

/** 現在ステップに連動するプログレスバー（表示専用・タップ不可） */
export default function StepProgress({ current }: { current: StepId }) {
  const percent = Math.round((current / STEPS.length) * 100);
  const def = STEPS[current - 1];

  return (
    <nav aria-label="シフト作成の進行状況" className="space-y-2 py-1">
      <div className="flex items-center justify-between gap-3 text-xs text-slate-500">
        <span className="inline-flex items-center gap-1.5 font-medium text-slate-600">
          <Icon name={def.icon} size={14} className="text-indigo-500" />
          {current} / {STEPS.length}
          <span className="font-normal text-slate-400">· {def.label}</span>
        </span>
        <span className="tabular-nums text-slate-400">{percent}%</span>
      </div>
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
