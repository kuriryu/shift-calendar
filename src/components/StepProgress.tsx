"use client";

import Icon from "@/components/Icon";
import { STEPS } from "@/lib/steps";
import type { StepStatus } from "@/lib/steps";
import type { StepId } from "@/types";

export default function StepProgress({
  current,
  statuses,
  onSelect,
}: {
  current: StepId;
  /** 各ステップの完了状態（データから自動判定） */
  statuses: Record<StepId, StepStatus>;
  onSelect: (step: StepId) => void;
}) {
  const doneCount = STEPS.filter((s) => statuses[s.id] === "done").length;
  const percent = Math.round((doneCount / STEPS.length) * 100);

  return (
    <nav aria-label="シフト作成の進行状況" className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
      {/* プログレスバー */}
      <div className="mb-5 flex items-center gap-4">
        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
          aria-label={`進行状況 ${doneCount} / ${STEPS.length} ステップ完了`}
          className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100"
        >
          <div
            className="h-full rounded-full bg-indigo-500 transition-[width] duration-500"
            style={{ width: `${percent}%` }}
          />
        </div>
        <span className="shrink-0 text-xs font-semibold text-slate-600">
          {doneCount} / {STEPS.length} 完了
        </span>
      </div>

      {/* ステップ一覧（スマホは縦積み） */}
      <ol className="flex flex-col gap-2 sm:flex-row sm:items-stretch sm:gap-3">
        {STEPS.map((step) => {
          const status = statuses[step.id];
          const isCurrent = step.id === current;
          const circle =
            status === "done"
              ? "bg-indigo-600 text-white"
              : isCurrent
                ? "border-2 border-indigo-600 bg-white text-indigo-700"
                : "border border-slate-300 bg-white text-slate-400";
          return (
            <li key={step.id} className="flex-1">
              <button
                onClick={() => onSelect(step.id)}
                aria-current={isCurrent ? "step" : undefined}
                aria-label={`ステップ${step.id} ${step.label}（${
                  status === "done" ? "完了" : isCurrent ? "現在" : "未着手"
                }）`}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors sm:flex-col sm:items-center sm:gap-2 sm:px-2 sm:py-3 sm:text-center ${
                  isCurrent
                    ? "bg-indigo-50 ring-1 ring-indigo-200"
                    : "hover:bg-slate-50"
                }`}
              >
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${circle}`}
                  aria-hidden
                >
                  {status === "done" ? <Icon name="check" size={18} /> : step.id}
                </span>
                <span className="min-w-0">
                  <span
                    className={`block text-sm font-semibold ${
                      isCurrent ? "text-indigo-700" : status === "done" ? "text-slate-700" : "text-slate-500"
                    }`}
                  >
                    {step.label}
                  </span>
                  <span className="block text-[11px] leading-snug text-slate-400 sm:hidden lg:block">
                    {step.desc}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
