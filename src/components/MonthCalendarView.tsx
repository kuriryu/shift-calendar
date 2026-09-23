"use client";

import { EMPTY_ASSIGNMENTS, useAppStore } from "@/stores/useAppStore";
import { useMounted } from "@/hooks/useMounted";
import {
  daysOfMonth,
  formatDate,
  monthLabel,
  weekdayOf,
} from "@/lib/dates";
import { staffColorOf } from "@/lib/staff-color";

const WEEKDAY_HEADERS = ["月", "火", "水", "木", "金", "土", "日"] as const;

function shortTime(t: string): string {
  const [h, m] = t.split(":").map(Number);
  return m === 0 ? String(h) : `${h}.5`;
}

/** Googleカレンダー風の月グリッド。日付セルにスタッフ色のチップを並べる */
export default function MonthCalendarView({
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
  const days = daysOfMonth(month);
  const firstWeekday = weekdayOf(days[0]);
  const leadBlanks = firstWeekday === 0 ? 6 : firstWeekday - 1;
  const lastWeekday = weekdayOf(days[days.length - 1]);
  const tailBlanks = lastWeekday === 0 ? 0 : 7 - lastWeekday;
  const cells: (string | null)[] = [
    ...Array.from({ length: leadBlanks }, () => null),
    ...days,
    ...Array.from({ length: tailBlanks }, () => null),
  ];
  const today = formatDate(new Date());

  const select = (date: string) => {
    setSelectedDate(date);
    onSelectDate?.(date);
  };

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <p className="border-b border-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-700">
        {monthLabel(month)}
      </p>
      <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50">
        {WEEKDAY_HEADERS.map((w) => (
          <span
            key={w}
            className="py-1.5 text-center text-[11px] font-medium text-slate-500"
          >
            {w}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-7 auto-rows-[minmax(5.5rem,auto)]">
        {cells.map((d, i) =>
          d === null ? (
            <div key={`blank-${i}`} className="border-b border-r border-slate-100 bg-slate-50/50" />
          ) : (
            (() => {
              const dayAssignments = assignments
                .filter((a) => a.date === d && !hidden.has(a.staffId))
                .sort((a, b) => a.startTime.localeCompare(b.startTime));
              const selected = d === selectedDate;
              const isToday = d === today;
              const extra = dayAssignments.length - 3;
              return (
                <button
                  key={d}
                  onClick={() => select(d)}
                  aria-label={`${Number(d.slice(8))}日 出勤${dayAssignments.length}名${
                    selected ? " 選択中" : ""
                  }`}
                  aria-pressed={selected}
                  className={`flex flex-col items-stretch gap-0.5 border-b border-r border-slate-100 p-1.5 text-left transition-colors hover:bg-slate-50 ${
                    selected ? "bg-indigo-50 ring-2 ring-inset ring-indigo-400" : ""
                  }`}
                >
                  <span
                    className={`mb-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                      selected
                        ? "bg-indigo-600 text-white"
                        : isToday
                          ? "text-indigo-600 ring-1 ring-indigo-400"
                          : "text-slate-700"
                    }`}
                  >
                    {Number(d.slice(8))}
                  </span>
                  {dayAssignments.slice(0, 3).map((a) => {
                    const s = staffMap.get(a.staffId);
                    const color = staffColorOf(a.staffId);
                    return (
                      <span
                        key={a.id}
                        className="truncate rounded px-1 py-0.5 text-[9px] font-medium text-white"
                        style={{ backgroundColor: color.bg }}
                        title={`${s?.name ?? a.staffId} ${a.startTime}–${a.endTime}`}
                      >
                        {s?.name ?? a.staffId} {shortTime(a.startTime)}–
                        {shortTime(a.endTime)}
                      </span>
                    );
                  })}
                  {extra > 0 && (
                    <span className="px-1 text-[9px] text-slate-400">+{extra}件</span>
                  )}
                </button>
              );
            })()
          ),
        )}
      </div>
    </div>
  );
}
