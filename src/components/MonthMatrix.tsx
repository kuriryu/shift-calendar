"use client";

import { EMPTY_ASSIGNMENTS, EMPTY_REQUESTS, useAppStore } from "@/stores/useAppStore";
import { useMounted } from "@/hooks/useMounted";
import { daysOfMonth, isWeekendOrFri, weekdayLabel } from "@/lib/dates";
import type { Role, Staff } from "@/types";
import { ROLE_LABELS } from "@/types";

const ROLE_ORDER: Role[] = ["employee", "part_time", "student"];

const ROLE_CELL: Record<Role, string> = {
  employee: "bg-indigo-100 text-indigo-800",
  part_time: "bg-emerald-100 text-emerald-800",
  student: "bg-amber-100 text-amber-800",
};

/** "09:00" → "9", "13:30" → "13.5" */
function shortTime(t: string): string {
  const [h, m] = t.split(":").map(Number);
  return m === 0 ? String(h) : `${h}.5`;
}

export default function MonthMatrix({
  onSelectDate,
}: {
  /** 日付ヘッダークリック時（時間ビューへの切替などに使う） */
  onSelectDate: (date: string) => void;
}) {
  const mounted = useMounted();
  const staff = useAppStore((s) => s.staff);
  const month = useAppStore((s) => s.selectedMonth);
  const assignments = useAppStore(
    (s) => s.assignments[s.selectedMonth] ?? EMPTY_ASSIGNMENTS,
  );
  const requests = useAppStore(
    (s) => s.requests[s.selectedMonth] ?? EMPTY_REQUESTS,
  );
  const violations = useAppStore((s) => s.violations);

  if (!mounted) {
    return <div className="py-20 text-center text-sm text-slate-400">読み込み中…</div>;
  }

  const days = daysOfMonth(month);
  const byStaffDate = new Map(assignments.map((a) => [`${a.staffId}:${a.date}`, a]));
  const requestOffSet = new Set(
    requests.filter((r) => r.type === "off").map((r) => `${r.staffId}:${r.date}`),
  );
  const errorDates = new Set(
    violations.filter((v) => v.severity === "error").map((v) => v.date),
  );
  const warnDates = new Set(
    violations
      .filter((v) => v.severity === "warning")
      .map((v) => v.date)
      .filter((d) => !errorDates.has(d)),
  );

  const grouped = ROLE_ORDER.map((role) => ({
    role,
    members: staff.filter((s) => s.role === role),
  }));

  const cellOf = (s: Staff, date: string) => {
    const a = byStaffDate.get(`${s.id}:${date}`);
    if (a) {
      return (
        <span
          className={`inline-block w-full rounded px-0.5 py-0.5 text-[10px] font-medium leading-tight ${ROLE_CELL[s.role]}`}
        >
          {shortTime(a.startTime)}-{shortTime(a.endTime)}
        </span>
      );
    }
    if (requestOffSet.has(`${s.id}:${date}`)) {
      return <span className="text-[10px] text-slate-400">休</span>;
    }
    return <span className="text-[10px] text-slate-200">・</span>;
  };

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="border-collapse text-center">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50">
            <th className="sticky left-0 z-10 min-w-28 bg-slate-50 px-3 py-2 text-left text-xs font-semibold text-slate-600">
              スタッフ
            </th>
            {days.map((date) => {
              const dayNum = Number(date.slice(8));
              const tint = errorDates.has(date)
                ? "bg-red-100"
                : warnDates.has(date)
                  ? "bg-amber-50"
                  : isWeekendOrFri(date)
                    ? "bg-sky-50"
                    : "";
              return (
                <th key={date} className={`min-w-10 px-1 py-1 ${tint}`}>
                  <button
                    onClick={() => onSelectDate(date)}
                    className="flex w-full flex-col items-center rounded py-0.5 hover:bg-white/70"
                    title="時間ビューでこの日を表示"
                  >
                    <span className="text-xs font-semibold text-slate-700">
                      {dayNum}
                    </span>
                    <span className="text-[9px] text-slate-400">
                      {weekdayLabel(date)}
                    </span>
                  </button>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {grouped.map(({ role, members }) =>
            members.map((s, i) => (
              <tr key={s.id} className="border-b border-slate-100">
                <td className="sticky left-0 z-10 bg-white px-3 py-1 text-left">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-xs font-medium text-slate-700">
                      {s.name}
                    </span>
                    {i === 0 && (
                      <span className="text-[9px] text-slate-400">
                        {ROLE_LABELS[role]}
                      </span>
                    )}
                  </div>
                </td>
                {days.map((date) => {
                  const tint = errorDates.has(date)
                    ? "bg-red-50"
                    : warnDates.has(date)
                      ? "bg-amber-50/50"
                      : isWeekendOrFri(date)
                        ? "bg-sky-50/40"
                        : "";
                  return (
                    <td key={date} className={`px-0.5 py-1 ${tint}`}>
                      {cellOf(s, date)}
                    </td>
                  );
                })}
              </tr>
            )),
          )}
        </tbody>
      </table>

      {assignments.length === 0 && (
        <div className="border-t border-slate-100 px-4 py-8 text-center text-sm text-slate-500">
          シフトがまだ生成されていません。「希望入力」タブで希望を入れてから自動生成してください。
        </div>
      )}
    </div>
  );
}
