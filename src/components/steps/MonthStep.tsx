"use client";

import StepPanel from "@/components/steps/StepPanel";
import { useAppStore } from "@/stores/useAppStore";

function yearMonthOptions() {
  const now = new Date();
  const thisYear = now.getFullYear();
  const years = [thisYear - 1, thisYear, thisYear + 1];
  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  return { years, months };
}

export default function MonthStep() {
  const month = useAppStore((s) => s.selectedMonth);
  const setMonth = useAppStore((s) => s.setMonth);
  const allAssignments = useAppStore((s) => s.assignments);
  const allRequests = useAppStore((s) => s.requests);

  const [yStr, mStr] = month.split("-");
  const year = Number(yStr);
  const mon = Number(mStr);
  const { years, months } = yearMonthOptions();

  const hasData = (m: string) =>
    (allAssignments[m]?.length ?? 0) > 0 || (allRequests[m]?.length ?? 0) > 0;

  const applyYearMonth = (y: number, m: number) => {
    setMonth(`${y}-${String(m).padStart(2, "0")}`);
  };

  const selectClass =
    "rounded-lg border border-slate-200 bg-white px-3 py-2 text-lg font-bold text-slate-800";

  return (
    <StepPanel step={1}>
      <div className="flex justify-center">
        <div className="flex flex-wrap items-center justify-center gap-2">
          <label className="sr-only" htmlFor="month-year">
            年
          </label>
          <select
            id="month-year"
            value={year}
            onChange={(e) => applyYearMonth(Number(e.target.value), mon)}
            className={selectClass}
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}年
              </option>
            ))}
          </select>
          <label className="sr-only" htmlFor="month-month">
            月
          </label>
          <select
            id="month-month"
            value={mon}
            onChange={(e) => applyYearMonth(year, Number(e.target.value))}
            className={selectClass}
          >
            {months.map((m) => (
              <option key={m} value={m}>
                {m}月
              </option>
            ))}
          </select>
          {hasData(month) && (
            <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-[11px] font-medium text-indigo-700">
              データあり
            </span>
          )}
        </div>
      </div>
    </StepPanel>
  );
}
