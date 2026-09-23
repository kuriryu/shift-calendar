"use client";

import { useState } from "react";
import { useAppStore } from "@/stores/useAppStore";
import { useMounted } from "@/hooks/useMounted";
import type { Role, Staff } from "@/types";
import { ROLE_LABELS } from "@/types";
import Icon from "@/components/Icon";
import StaffEditModal from "@/components/StaffEditModal";
import { parseSpecialNote } from "@/lib/notes";

const ROLE_ORDER: Role[] = ["employee", "part_time", "student"];
const WEEKDAY_NAMES = ["日", "月", "火", "水", "木", "金", "土"];

const ROLE_TAG: Record<Role, { icon: string; cls: string }> = {
  employee: { icon: "badge", cls: "bg-indigo-100 text-indigo-700" },
  part_time: { icon: "schedule", cls: "bg-emerald-100 text-emerald-700" },
  student: { icon: "school", cls: "bg-amber-100 text-amber-700" },
};

export default function StaffManager() {
  const mounted = useMounted();
  const staff = useAppStore((s) => s.staff);
  const [editing, setEditing] = useState<Staff | null>(null);

  if (!mounted) {
    return <div className="py-20 text-center text-sm text-slate-400">読み込み中…</div>;
  }

  return (
    <div className="space-y-3">
      <p className="flex items-center gap-1.5 text-xs text-slate-500">
        <Icon name="info" size={14} />
        名前をクリックすると属性・基本パターン・特別な要望を編集できます。
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
              <th className="px-4 py-2 font-semibold">特別な要望</th>
            </tr>
          </thead>
          <tbody>
            {ROLE_ORDER.flatMap((role) =>
              staff
                .filter((s) => s.role === role)
                .map((s) => {
                  const noteSummary = s.specialNote
                    ? parseSpecialNote(s.specialNote).summary
                    : [];
                  return (
                    <tr key={s.id} className="border-b border-slate-100 text-xs">
                      <td className="px-4 py-2">
                        <button
                          onClick={() => setEditing(s)}
                          className="group flex items-center gap-1.5 rounded-md px-1.5 py-1 font-medium text-slate-700 hover:bg-indigo-50 hover:text-indigo-700"
                        >
                          {s.name}
                          <Icon
                            name="edit"
                            size={14}
                            className="text-slate-300 group-hover:text-indigo-500"
                          />
                        </button>
                      </td>
                      <td className="px-4 py-2">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${ROLE_TAG[s.role].cls}`}
                        >
                          <Icon name={ROLE_TAG[s.role].icon} size={12} />
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
                      <td className="max-w-48 px-4 py-2">
                        {s.specialNote ? (
                          <div>
                            <p className="truncate text-slate-600" title={s.specialNote}>
                              {s.specialNote}
                            </p>
                            <p className="text-[10px] text-indigo-500">
                              → {noteSummary.join("、")}
                            </p>
                          </div>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                    </tr>
                  );
                }),
            )}
          </tbody>
        </table>
      </div>

      {editing && (
        <StaffEditModal
          staff={editing}
          isOpen={editing != null}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
