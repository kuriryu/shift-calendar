"use client";

import { useState } from "react";
import { useAppStore } from "@/stores/useAppStore";
import { useMounted } from "@/hooks/useMounted";
import type { Staff } from "@/types";
import Icon from "@/components/Icon";
import RoleBadge from "@/components/RoleBadge";
import StaffEditModal from "@/components/StaffEditModal";
import { parseSpecialNote } from "@/lib/notes";
import { ROLE_ORDER } from "@/lib/roles";

const WEEKDAY_NAMES = ["日", "月", "火", "水", "木", "金", "土"];

export default function StaffManager() {
  const mounted = useMounted();
  const staff = useAppStore((s) => s.staff);
  const [editing, setEditing] = useState<Staff | null>(null);

  if (!mounted) {
    return <div className="py-20 text-center text-sm text-slate-400">読み込み中…</div>;
  }

  if (staff.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-6 py-14 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-slate-400 ring-1 ring-slate-200">
          <Icon name="group_off" size={28} />
        </span>
        <p className="text-sm font-medium text-slate-600">スタッフがまだいません</p>
        <p className="max-w-xs text-xs leading-relaxed text-slate-400">
          「スタッフを新規登録」から名前と属性を追加すると、ここに一覧が表示されます。
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="flex items-center gap-1.5 px-0.5 py-1.5 text-xs leading-relaxed text-slate-500">
        <Icon name="info" size={14} />
        名前をクリックすると属性・基本パターン・特別な要望を編集できます。
      </p>
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-xs text-slate-500">
              <th className="px-4 py-3 font-semibold">名前</th>
              <th className="px-4 py-3 font-semibold">属性</th>
              <th className="px-4 py-3 font-semibold">週の上限</th>
              <th className="px-4 py-3 font-semibold">基本パターン</th>
              <th className="px-4 py-3 font-semibold">固定休</th>
              <th className="px-4 py-3 font-semibold">特別な要望</th>
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
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setEditing(s)}
                          className="group flex items-center gap-1.5 rounded-md px-1.5 py-1 font-medium text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                        >
                          {s.name}
                          <Icon
                            name="edit"
                            size={14}
                            className="text-slate-300 group-hover:text-indigo-500"
                          />
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <RoleBadge role={s.role} size="sm" />
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {s.maxHoursPerWeek > 0 ? `${s.maxHoursPerWeek}h` : "—"}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {[
                          s.weekdayPattern
                            ? `平 ${s.weekdayPattern.start}–${s.weekdayPattern.end}`
                            : null,
                          s.weekendPattern
                            ? `休 ${s.weekendPattern.start}–${s.weekendPattern.end}`
                            : null,
                          !s.weekdayPattern &&
                          !s.weekendPattern &&
                          s.defaultPattern
                            ? `${s.defaultPattern.start}–${s.defaultPattern.end}`
                            : null,
                        ]
                          .filter(Boolean)
                          .join(" / ") || "—"}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {s.unavailableWeekdays && s.unavailableWeekdays.length > 0
                          ? s.unavailableWeekdays
                              .map((d) => WEEKDAY_NAMES[d])
                              .join("・")
                          : "—"}
                      </td>
                      <td className="max-w-48 px-4 py-3">
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
