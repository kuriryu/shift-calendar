"use client";

import Icon from "@/components/Icon";
import DayTimeline from "@/components/DayTimeline";
import MonthMatrix from "@/components/MonthMatrix";
import StepPanel from "@/components/steps/StepPanel";
import { EMPTY_ASSIGNMENTS, useAppStore } from "@/stores/useAppStore";

export default function AdjustStep() {
  const selectedDate = useAppStore((s) => s.selectedDate);
  const setSelectedDate = useAppStore((s) => s.setSelectedDate);
  const view = useAppStore((s) => s.adjustView);
  const setView = useAppStore((s) => s.setAdjustView);
  const assignments = useAppStore(
    (s) => s.assignments[s.selectedMonth] ?? EMPTY_ASSIGNMENTS,
  );
  const setStep = useAppStore((s) => s.setStep);

  return (
    <StepPanel
      step={6}
      description="サイドバーのカレンダーで日を選び、ガントチャートで自由に編集します。上部の件数バッジから条件チェックの結果を確認できます。"
      hideNext
      actions={
        <div
          className="flex items-center gap-1 rounded-lg bg-slate-100 p-1"
          role="group"
          aria-label="表示切替"
        >
          <button
            onClick={() => setView("day")}
            aria-pressed={view === "day"}
            className={`flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              view === "day"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Icon name="schedule" size={16} />
            時間ビュー
          </button>
          <button
            onClick={() => setView("month")}
            aria-pressed={view === "month"}
            className={`flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              view === "month"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Icon name="calendar_month" size={16} />
            曜日ビュー
          </button>
        </div>
      }
    >
      {assignments.length === 0 && (
        <p className="flex flex-wrap items-center gap-2 rounded-lg bg-sky-50 px-4 py-3 text-sm text-sky-800">
          <Icon name="info" size={18} />
          この月のシフトはまだ作成されていません。
          <button
            onClick={() => setStep(4)}
            className="ml-auto rounded-md bg-white px-3 py-1 text-xs font-semibold text-sky-700 ring-1 ring-sky-200 hover:bg-sky-100"
          >
            自動生成へ
          </button>
        </p>
      )}

      {view === "day" ? (
        <DayTimeline key={selectedDate} date={selectedDate} />
      ) : (
        <MonthMatrix
          onSelectDate={(d) => {
            setSelectedDate(d);
            setView("day");
          }}
        />
      )}
    </StepPanel>
  );
}
