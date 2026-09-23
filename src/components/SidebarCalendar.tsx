"use client";

import { usePathname, useRouter } from "next/navigation";
import { EMPTY_ASSIGNMENTS, useAppStore } from "@/stores/useAppStore";
import { useMounted } from "@/hooks/useMounted";
import {
  daysOfMonth,
  formatDate,
  monthLabel,
  shiftMonth,
  weekdayOf,
} from "@/lib/dates";
import Icon from "@/components/Icon";

const WEEKDAY_HEADERS = ["月", "火", "水", "木", "金", "土", "日"] as const;

/** 出勤者数に応じたドットの濃淡 */
function dotClass(count: number, selected: boolean): string {
  if (count === 0) return "";
  if (selected) return "bg-white";
  if (count <= 2) return "bg-indigo-200";
  if (count <= 4) return "bg-indigo-400";
  return "bg-indigo-600";
}

export default function SidebarCalendar() {
  const mounted = useMounted();
  const router = useRouter();
  const pathname = usePathname();
  const month = useAppStore((s) => s.selectedMonth);
  const selectedDate = useAppStore((s) => s.selectedDate);
  const setMonth = useAppStore((s) => s.setMonth);
  const setSelectedDate = useAppStore((s) => s.setSelectedDate);
  const assignments = useAppStore(
    (s) => s.assignments[s.selectedMonth] ?? EMPTY_ASSIGNMENTS,
  );

  if (!mounted) {
    return <div className="h-56 px-2" aria-hidden />;
  }

  const counts = new Map<string, number>();
  for (const a of assignments) {
    counts.set(a.date, (counts.get(a.date) ?? 0) + 1);
  }

  // 月曜始まりのグリッド（前後の空白セル付き）
  const days = daysOfMonth(month);
  const firstWeekday = weekdayOf(days[0]); // 0=日
  const leadBlanks = firstWeekday === 0 ? 6 : firstWeekday - 1;
  const lastWeekday = weekdayOf(days[days.length - 1]);
  const tailBlanks = lastWeekday === 0 ? 0 : 7 - lastWeekday;
  const cells: (string | null)[] = [
    ...Array.from({ length: leadBlanks }, () => null),
    ...days,
    ...Array.from({ length: tailBlanks }, () => null),
  ];

  const today = formatDate(new Date());

  const selectDate = (date: string) => {
    setSelectedDate(date);
    if (pathname !== "/") router.push("/");
  };

  return (
    <div className="px-2">
      <div className="mb-1 flex items-center justify-between px-1">
        <button
          onClick={() => setMonth(shiftMonth(month, -1))}
          aria-label="前の月"
          className="rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
        >
          <Icon name="chevron_left" size={16} />
        </button>
        <span className="text-xs font-semibold text-slate-700">
          {monthLabel(month)}
        </span>
        <button
          onClick={() => setMonth(shiftMonth(month, 1))}
          aria-label="次の月"
          className="rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
        >
          <Icon name="chevron_right" size={16} />
        </button>
      </div>

      <div className="grid grid-cols-7">
        {WEEKDAY_HEADERS.map((w) => (
          <span
            key={w}
            className="py-0.5 text-center text-[9px] font-medium text-slate-400"
          >
            {w}
          </span>
        ))}
        {cells.map((d, i) =>
          d === null ? (
            <span key={`blank-${i}`} className="h-8" />
          ) : (
            <button
              key={d}
              onClick={() => selectDate(d)}
              aria-label={d}
              className="group flex h-8 flex-col items-center justify-center"
            >
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] transition-colors ${
                  d === selectedDate
                    ? "bg-indigo-600 font-semibold text-white"
                    : d === today
                      ? "font-semibold text-indigo-600 ring-1 ring-indigo-400 group-hover:bg-indigo-50"
                      : "text-slate-600 group-hover:bg-slate-100"
                }`}
              >
                {Number(d.slice(8))}
              </span>
              <span
                className={`mt-0.5 h-1 w-1 rounded-full ${dotClass(counts.get(d) ?? 0, d === selectedDate)}`}
              />
            </button>
          ),
        )}
      </div>
    </div>
  );
}
