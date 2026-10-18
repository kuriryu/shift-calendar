"use client";

import { STEPS } from "@/lib/steps";
import type { StepId } from "@/types";

const SIZE_PX = 72; // 4.5rem
const STROKE = 5;
const RADIUS = (SIZE_PX - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/** 現在ステップに連動する円形プログレス（表示専用・タップ不可） */
export default function StepProgress({
  current,
  total = STEPS.length,
  accent = "mint",
}: {
  current: StepId | number;
  total?: number;
  accent?: "mint" | "brand";
}) {
  const fraction = current / total;
  const percent = Math.round(fraction * 100);
  const dashOffset = CIRCUMFERENCE * (1 - fraction);
  const progressStroke = accent === "brand" ? "var(--ds-action)" : "#3cbe8c";

  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      aria-label={`ステップ ${current} / ${total}`}
      className="relative h-[4.5rem] w-[4.5rem] shrink-0"
    >
      <svg
        width={SIZE_PX}
        height={SIZE_PX}
        viewBox={`0 0 ${SIZE_PX} ${SIZE_PX}`}
        className="-rotate-90"
        aria-hidden
      >
        <circle
          cx={SIZE_PX / 2}
          cy={SIZE_PX / 2}
          r={RADIUS}
          fill="none"
          stroke="#e6e8ec"
          strokeWidth={STROKE}
        />
        <circle
          cx={SIZE_PX / 2}
          cy={SIZE_PX / 2}
          r={RADIUS}
          fill="none"
          stroke={progressStroke}
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={dashOffset}
          className="transition-[stroke-dashoffset] duration-500 ease-out"
        />
      </svg>
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <span className="text-sm leading-none tabular-nums">
          <span className="font-bold text-slate-900">{current}</span>
          <span className="text-xs font-normal text-slate-400">/{total}</span>
        </span>
      </div>
    </div>
  );
}
