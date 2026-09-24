"use client";

import Icon from "@/components/Icon";
import FieldControl, { FieldSelect } from "@/components/FieldControl";
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

  return (
    <StepPanel step={1}>
      <div className="flex flex-col items-center gap-3 md:gap-5">
        <div
          className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 md:h-14 md:w-14 md:rounded-2xl"
          aria-hidden
        >
          <Icon name="calendar_month" size={24} />
        </div>

        <div className="flex flex-wrap items-end justify-center gap-3 md:gap-4">
          <FieldControl id="month-year" label="年" className="w-36 shrink-0 md:w-44">
            <FieldSelect
              id="month-year"
              value={year}
              onChange={(e) => applyYearMonth(Number(e.target.value), mon)}
              className="font-semibold tabular-nums"
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}年
                </option>
              ))}
            </FieldSelect>
          </FieldControl>
          <FieldControl id="month-month" label="月" className="w-28 shrink-0 md:w-36">
            <FieldSelect
              id="month-month"
              value={mon}
              onChange={(e) => applyYearMonth(year, Number(e.target.value))}
              className="font-semibold tabular-nums"
            >
              {months.map((m) => (
                <option key={m} value={m}>
                  {m}月
                </option>
              ))}
            </FieldSelect>
          </FieldControl>
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
