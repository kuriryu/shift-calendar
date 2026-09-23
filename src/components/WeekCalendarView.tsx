"use client";

import { EMPTY_ASSIGNMENTS, useAppStore } from "@/stores/useAppStore";
import { useMounted } from "@/hooks/useMounted";
import {
  dayLabel,
  formatDate,
  parseDate,
  weekKeyOf,
  weeksOfMonth,
} from "@/lib/dates";
import { staffColorOf } from "@/lib/staff-color";

const WEEKDAY_HEADERS = ["月", "火", "水", "木", "金", "土", "日"] as const;

/** 選択日を含む週の7日（月〜日）。月外の日も含む */
function weekDatesAround(dateStr: string): string[] {
  const monday = parseDate(weekKeyOf(dateStr));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return formatDate(d);
  });
}

function shortTime(t: string): string {
  const [h, m] = t.split(":").map(Number);
  return m === 0 ? String(h) : `${h}.5`;
}

export default function WeekCalendarView({
  onSelectDate,
}: {
  onSelectDate?: (date: string) => void;
}) {
  const mounted = useMounted();
  const month = useAppStore((s) => s.selectedMonth);
  const selectedDate = useAppStore((s) => s.selectedDate);
  const setSelectedDate = useAppStore((s) => s.setSelectedDate);
  const staff = useAppStore((s) => s.staff);
  const hiddenStaffIds = useAppStore((s) => s.hiddenStaffIds);
  const assignments = useAppStore(
    (s) => s.assignments[s.selectedMonth] ?? EMPTY_ASSIGNMENTS,
  );

  if (!mounted) {
    return <div className="py-20 text-center text-sm text-slate-400">読み込み中…</div>;
  }

  const hidden = new Set(hiddenStaffIds);
  const staffMap = new Map(staff.map((s) => [s.id, s]));
  const weekDates = weekDatesAround(selectedDate);
  const weeks = weeksOfMonth(month);
  const currentKey = weekKeyOf(selectedDate);

  const select = (date: string) => {
    setSelectedDate(date);
    onSelectDate?.(date);
  };

  return (
    <div className="space-y-3">
      <div
        className="flex flex-wrap items-center gap-2"
        role="group"
        aria-label="週の選択"
      >
        {weeks.map((w) => (
          <button
            key={w.key}
            onClick={() => select(w.dates[0])}
            aria-pressed={w.key === currentKey}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
              w.key === currentKey
                ? "bg-indigo-600 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {w.label}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <div className="grid min-w-[42rem] grid-cols-7 divide-x divide-slate-100">
          {weekDates.map((date, i) => {
            const inMonth = date.startsWith(month);
            const dayAssignments = assignments
              .filter((a) => a.date === date && !hidden.has(a.staffId))
              .sort((a, b) => a.startTime.localeCompare(b.startTime));
            const selected = date === selectedDate;
            return (
              <div
                key={date}
                className={`flex min-h-48 flex-col ${
                  selected ? "bg-indigo-50/50" : inMonth ? "bg-white" : "bg-slate-50/80"
                }`}
              >
                <button
                  onClick={() => select(date)}
                  aria-label={`${dayLabel(date)}(${WEEKDAY_HEADERS[i]}) ${
                    selected ? "選択中" : ""
                  }`}
                  aria-pressed={selected}
                  className={`flex flex-col items-center border-b border-slate-100 px-1 py-2 ${
                    selected ? "bg-indigo-600 text-white" : "hover:bg-slate-50"
                  }`}
                >
                  <span className="text-[10px] opacity-80">{WEEKDAY_HEADERS[i]}</span>
                  <span className="text-sm font-semibold">
                    {Number(date.slice(8))}
                  </span>
                </button>
                <ul className="flex flex-1 flex-col gap-1 p-1.5">
                  {dayAssignments.map((a) => {
                    const s = staffMap.get(a.staffId);
                    const color = staffColorOf(a.staffId);
                    return (
                      <li key={a.id}>
                        <button
                          onClick={() => select(date)}
                          className="w-full truncate rounded px-1.5 py-1 text-left text-[10px] font-medium text-white"
                          style={{ backgroundColor: color.bg }}
                          title={`${s?.name ?? a.staffId} ${a.startTime}–${a.endTime}`}
                        >
                          {s?.name ?? a.staffId} {shortTime(a.startTime)}–
                          {shortTime(a.endTime)}
                        </button>
                      </li>
                    );
                  })}
                  {dayAssignments.length === 0 && (
                    <li className="px-1 py-2 text-center text-[10px] text-slate-300">
                      —
                    </li>
                  )}
                </ul>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
