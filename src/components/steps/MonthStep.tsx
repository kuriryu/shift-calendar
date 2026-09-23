"use client";

import Icon from "@/components/Icon";
import StepPanel from "@/components/steps/StepPanel";
import { useAppStore } from "@/stores/useAppStore";

function yearMonthOptions() {
  const now = new Date();
  const thisYear = now.getFullYear();
  const years = [thisYear - 1, thisYear, thisYear + 1];
  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  return { years, months };
}

function shiftMonth(y: number, m: number, delta: number) {
  const d = new Date(y, m - 1 + delta, 1);
  return { year: d.getFullYear(), mon: d.getMonth() + 1 };
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

  const minY = years[0];
  const maxY = years[years.length - 1];
  const canPrev = year > minY || (year === minY && mon > 1);
  const canNext = year < maxY || (year === maxY && mon < 12);

  const selectClass =
    "rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-base font-bold text-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600";

  return (
    <StepPanel step={1}>
      <div className="flex flex-col items-center gap-5">
        <div
          className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600"
          aria-hidden
        >
          <Icon name="calendar_month" size={28} />
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => {
              const next = shiftMonth(year, mon, -1);
              applyYearMonth(next.year, next.mon);
            }}
            disabled={!canPrev}
            aria-label="前の月"
            className="rounded-full border border-slate-200 p-2.5 text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          >
            <Icon name="chevron_left" size={22} />
          </button>

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

          <button
            type="button"
            onClick={() => {
              const next = shiftMonth(year, mon, 1);
              applyYearMonth(next.year, next.mon);
            }}
            disabled={!canNext}
            aria-label="次の月"
            className="rounded-full border border-slate-200 p-2.5 text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          >
            <Icon name="chevron_right" size={22} />
          </button>
        </div>

        {hasData(month) ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700">
            <Icon name="folder_open" size={14} />
            この月にデータあり
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500">
            <Icon name="calendar_today" size={14} />
            新規作成の月
          </span>
        )}
      </div>
    </StepPanel>
  );
}
