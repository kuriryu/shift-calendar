"use client";

import { minutesToJapaneseHours } from "@/lib/time";

type HoursCompareBarProps = {
  requestedMinutes: number;
  assignedMinutes: number;
  className?: string;
};

export default function HoursCompareBar({
  requestedMinutes,
  assignedMinutes,
  className = "",
}: HoursCompareBarProps) {
  const requested = Math.max(0, requestedMinutes);
  const assigned = Math.max(0, assignedMinutes);

  let fillPercent = 0;
  if (requested > 0) {
    fillPercent = Math.min(100, (assigned / requested) * 100);
  } else if (assigned > 0) {
    fillPercent = 100;
  }

  const achieved = requested > 0 && assigned >= requested;
  const fillClass = achieved ? "bg-[var(--ds-green)]" : "bg-[var(--ds-action)]";

  const ratioPercent =
    requested > 0 ? Math.round((assigned / requested) * 100) : assigned > 0 ? null : 0;

  const ariaLabel =
    requested > 0
      ? `希望${minutesToJapaneseHours(requested)}、割当${minutesToJapaneseHours(assigned)}。割当は希望の${ratioPercent}%です。`
      : assigned > 0
        ? `希望0時間、割当${minutesToJapaneseHours(assigned)}`
        : "希望0時間、割当0時間";

  return (
    <div className={`flex min-w-0 w-full flex-1 flex-col ${className}`.trim()}>
      <div className="flex justify-between gap-2 text-xs sm:text-sm">
        <span className="text-slate-600">
          希望 {minutesToJapaneseHours(requested)}
        </span>
        <span className="text-slate-500">
          割当 {minutesToJapaneseHours(assigned)}
        </span>
      </div>
      <div
        className="mt-1.5 h-2.5 w-full overflow-hidden rounded-full bg-[#eef2f6]"
        role="progressbar"
        aria-valuenow={fillPercent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={ariaLabel}
      >
        <div
          className={`h-full rounded-full ${fillClass}`}
          style={{ width: `${fillPercent}%` }}
        />
      </div>
      {requested === 0 && assigned > 0 ? (
        <p className="mt-0.5 text-[10px] text-slate-400">希望未入力の割当</p>
      ) : null}
    </div>
  );
}
