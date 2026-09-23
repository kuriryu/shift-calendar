"use client";

import { useAppStore } from "@/stores/useAppStore";
import { useMounted } from "@/hooks/useMounted";
import { ROLE_LABELS } from "@/types";
import type { Role } from "@/types";

const ROLE_ORDER: Role[] = ["employee", "part_time", "student"];

export default function StaffFilter() {
  const mounted = useMounted();
  const staff = useAppStore((s) => s.staff);
  const hiddenStaffIds = useAppStore((s) => s.hiddenStaffIds);
  const toggleStaffFilter = useAppStore((s) => s.toggleStaffFilter);
  const toggleRoleFilter = useAppStore((s) => s.toggleRoleFilter);

  if (!mounted) return null;

  const hidden = new Set(hiddenStaffIds);

  return (
    <div className="px-1">
      <p className="mb-2 px-1 text-[11px] font-semibold tracking-wide text-slate-500">
        スタッフ絞り込み
      </p>
      <div className="space-y-3">
        {ROLE_ORDER.map((role) => {
          const members = staff.filter((s) => s.role === role);
          if (members.length === 0) return null;
          const visibleCount = members.filter((m) => !hidden.has(m.id)).length;
          const allVisible = visibleCount === members.length;
          const someVisible = visibleCount > 0 && !allVisible;
          return (
            <div key={role}>
              <label className="flex cursor-pointer items-center gap-2 rounded px-1 py-0.5 text-xs font-semibold text-slate-600 hover:bg-slate-50">
                <input
                  type="checkbox"
                  checked={allVisible}
                  ref={(el) => {
                    if (el) el.indeterminate = someVisible;
                  }}
                  onChange={() => toggleRoleFilter(role)}
                  className="h-3.5 w-3.5 accent-indigo-600"
                />
                {ROLE_LABELS[role]}
                <span className="text-[10px] font-normal text-slate-400">
                  {visibleCount}/{members.length}
                </span>
              </label>
              <ul className="ml-4 mt-0.5 space-y-0.5">
                {members.map((m) => {
                  const isHidden = hidden.has(m.id);
                  return (
                    <li key={m.id}>
                      <label
                        className={`flex cursor-pointer items-center gap-2 rounded px-1 py-0.5 text-xs hover:bg-slate-50 ${
                          isHidden
                            ? "text-slate-400 line-through"
                            : "text-slate-600"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={!isHidden}
                          onChange={() => toggleStaffFilter(m.id)}
                          className="h-3 w-3 accent-indigo-600"
                        />
                        {m.name}
                      </label>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}
