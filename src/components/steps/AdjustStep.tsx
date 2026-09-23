"use client";

import Icon from "@/components/Icon";
import DayTimeline from "@/components/DayTimeline";
import WeekCalendarView from "@/components/WeekCalendarView";
import MonthCalendarView from "@/components/MonthCalendarView";
import StepPanel from "@/components/steps/StepPanel";
import { EMPTY_ASSIGNMENTS, useAppStore } from "@/stores/useAppStore";

const VIEWS = [
  { id: "day" as const, label: "日", icon: "schedule" },
  { id: "week" as const, label: "週", icon: "view_week" },
  { id: "month" as const, label: "月", icon: "calendar_month" },
];

export default function AdjustStep() {
  const selectedDate = useAppStore((s) => s.selectedDate);
  const view = useAppStore((s) => s.adjustView);
  const setView = useAppStore((s) => s.setAdjustView);
  const assignments = useAppStore(
    (s) => s.assignments[s.selectedMonth] ?? EMPTY_ASSIGNMENTS,
  );
  const setStep = useAppStore((s) => s.setStep);

  return (
    <StepPanel
      step={6}
      hideNext
      actions={
        <div
          className="flex items-center gap-1 rounded-lg bg-slate-100 p-1"
          role="group"
          aria-label="表示切替"
        >
          {VIEWS.map((v) => (
            <button
              key={v.id}
              onClick={() => setView(v.id)}
              aria-pressed={view === v.id}
              className={`flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                view === v.id
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <Icon name={v.icon} size={16} />
              {v.label}
            </button>
          ))}
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

      {view === "day" && <DayTimeline key={selectedDate} date={selectedDate} />}
      {view === "week" && <WeekCalendarView />}
      {view === "month" && <MonthCalendarView />}
    </StepPanel>
  );
}
