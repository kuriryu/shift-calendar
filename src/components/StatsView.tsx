"use client";

import { useAppStore } from "@/stores/useAppStore";
import { useMounted } from "@/hooks/useMounted";
import { daysOfMonth, weeksOfMonth } from "@/lib/dates";
import { workMinutesOf, minutesToHoursLabel } from "@/lib/time";
import type { Role } from "@/types";
import { ROLE_LABELS } from "@/types";

const ROLE_ORDER: Role[] = ["employee", "part_time", "student"];

const ROLE_BAR: Record<Role, string> = {
  employee: "bg-indigo-400",
  part_time: "bg-emerald-400",
  student: "bg-amber-400",
};

export default function StatsView() {
  const mounted = useMounted();
  const staff = useAppStore((s) => s.staff);
  const month = useAppStore((s) => s.selectedMonth);
  const assignments = useAppStore(
    (s) => s.assignments[s.selectedMonth] ?? [],
  );

  if (!mounted) {
    return <div className="py-20 text-center text-sm text-slate-400">読み込み中…</div>;
  }

  const days = daysOfMonth(month);
  const weeks = weeksOfMonth(month);

  if (assignments.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white px-4 py-12 text-center text-sm text-slate-500">
        シフトがまだ生成されていません。
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50 text-xs text-slate-500">
            <th className="px-4 py-2 font-semibold">名前</th>
            <th className="px-4 py-2 font-semibold">月間実働</th>
            <th className="px-4 py-2 font-semibold">出勤日数</th>
            <th className="px-4 py-2 font-semibold">休み</th>
            {weeks.map((w) => (
              <th key={w.key} className="min-w-24 px-4 py-2 font-semibold">
                {w.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ROLE_ORDER.flatMap((role) =>
            staff
              .filter((s) => s.role === role)
              .map((s) => {
                const mine = assignments.filter((a) => a.staffId === s.id);
                const totalMin = mine.reduce(
                  (sum, a) => sum + workMinutesOf(a),
                  0,
                );
                const workDays = new Set(mine.map((a) => a.date)).size;
                return (
                  <tr key={s.id} className="border-b border-slate-100 text-xs">
                    <td className="px-4 py-2">
                      <div className="font-medium text-slate-700">{s.name}</div>
                      <div className="text-[10px] text-slate-400">
                        {ROLE_LABELS[s.role]}
                      </div>
                    </td>
                    <td className="px-4 py-2 font-semibold text-slate-700">
                      {minutesToHoursLabel(totalMin)}
                    </td>
                    <td className="px-4 py-2 text-slate-600">{workDays}日</td>
                    <td className="px-4 py-2 text-slate-600">
                      {days.length - workDays}日
                    </td>
                    {weeks.map((w) => {
                      const weekMin = mine
                        .filter((a) => w.dates.includes(a.date))
                        .reduce((sum, a) => sum + workMinutesOf(a), 0);
                      const weekH = weekMin / 60;
                      const cap = s.maxHoursPerWeek > 0 ? s.maxHoursPerWeek : null;
                      const over = cap != null && weekH > cap;
                      const ratio = cap ? Math.min(weekH / cap, 1) : Math.min(weekH / 40, 1);
                      return (
                        <td key={w.key} className="px-4 py-2">
                          <div
                            className={`text-[10px] font-medium ${over ? "text-red-600" : "text-slate-600"}`}
                          >
                            {weekH.toFixed(1)}h{cap ? ` / ${cap}h` : ""}
                          </div>
                          <div className="mt-0.5 h-1.5 w-20 rounded-full bg-slate-100">
                            <div
                              className={`h-full rounded-full ${over ? "bg-red-500" : ROLE_BAR[s.role]}`}
                              style={{ width: `${ratio * 100}%` }}
                            />
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              }),
          )}
        </tbody>
      </table>
    </div>
  );
}
