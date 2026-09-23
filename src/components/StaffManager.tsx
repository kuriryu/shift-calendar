"use client";

import { useAppStore } from "@/stores/useAppStore";
import { useMounted } from "@/hooks/useMounted";
import type { Role } from "@/types";
import { ROLE_LABELS } from "@/types";

const ROLE_ORDER: Role[] = ["employee", "part_time", "student"];
const WEEKDAY_NAMES = ["日", "月", "火", "水", "木", "金", "土"];

const ROLE_BADGE: Record<Role, string> = {
  employee: "bg-indigo-100 text-indigo-700",
  part_time: "bg-emerald-100 text-emerald-700",
  student: "bg-amber-100 text-amber-700",
};

export default function StaffManager() {
  const mounted = useMounted();
  const staff = useAppStore((s) => s.staff);

  if (!mounted) {
    return <div className="py-20 text-center text-sm text-slate-400">読み込み中…</div>;
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-500">
        スタッフ属性の閲覧のみ（編集は今後のステップで追加予定）。
      </p>
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-xs text-slate-500">
              <th className="px-4 py-2 font-semibold">名前</th>
              <th className="px-4 py-2 font-semibold">属性</th>
              <th className="px-4 py-2 font-semibold">週の上限</th>
              <th className="px-4 py-2 font-semibold">基本パターン</th>
              <th className="px-4 py-2 font-semibold">固定休</th>
            </tr>
          </thead>
          <tbody>
            {ROLE_ORDER.flatMap((role) =>
              staff
                .filter((s) => s.role === role)
                .map((s) => (
                  <tr key={s.id} className="border-b border-slate-100 text-xs">
                    <td className="px-4 py-2 font-medium text-slate-700">
                      {s.name}
                    </td>
                    <td className="px-4 py-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${ROLE_BADGE[s.role]}`}
                      >
                        {ROLE_LABELS[s.role]}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-slate-600">
                      {s.maxHoursPerWeek > 0 ? `${s.maxHoursPerWeek}h` : "—"}
                    </td>
                    <td className="px-4 py-2 text-slate-600">
                      {s.defaultPattern
                        ? `${s.defaultPattern.start}–${s.defaultPattern.end}`
                        : "—"}
                    </td>
                    <td className="px-4 py-2 text-slate-600">
                      {s.unavailableWeekdays && s.unavailableWeekdays.length > 0
                        ? s.unavailableWeekdays
                            .map((d) => WEEKDAY_NAMES[d])
                            .join("・")
                        : "—"}
                    </td>
                  </tr>
                )),
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
