"use client";

import { EMPTY_ASSIGNMENTS, EMPTY_REQUESTS, useAppStore } from "@/stores/useAppStore";
import { useMounted } from "@/hooks/useMounted";
import { ROLE_LABELS } from "@/types";
import type { Role, StepId } from "@/types";
import { staffColorOf } from "@/lib/staff-color";

const ROLE_ORDER: Role[] = ["employee", "part_time", "student"];

export default function StaffFilter() {
  const mounted = useMounted();
  const staff = useAppStore((s) => s.staff);
  const hiddenStaffIds = useAppStore((s) => s.hiddenStaffIds);
  const toggleStaffFilter = useAppStore((s) => s.toggleStaffFilter);
  const toggleRoleFilter = useAppStore((s) => s.toggleRoleFilter);
  const currentStep = useAppStore((s) => s.currentStep);
  const month = useAppStore((s) => s.selectedMonth);
  const requests = useAppStore((s) => s.requests[s.selectedMonth] ?? EMPTY_REQUESTS);
  const assignments = useAppStore(
    (s) => s.assignments[s.selectedMonth] ?? EMPTY_ASSIGNMENTS,
  );
  const draft = useAppStore((s) => s.draft);

  if (!mounted) return null;

  const hasDraft = draft?.month === month;
  const confirmed = assignments.length > 0;
  const done: Record<StepId, boolean> = {
    1: true,
    2: staff.length > 0,
    3: requests.length > 0,
    4: confirmed || hasDraft,
    5: confirmed,
    6: confirmed,
  };
  const firstPending = ([1, 2, 3, 4, 5, 6] as StepId[]).find((id) => !done[id]);
  const active: StepId = currentStep ?? (confirmed ? 6 : (firstPending ?? 6));
  const locked = active < 6;

  const hidden = new Set(hiddenStaffIds);

  return (
    <div className={`px-1 ${locked ? "opacity-60" : ""}`}>
      <p className="mb-2 px-1 text-[11px] font-semibold tracking-wide text-slate-500">
        スタッフ絞り込み
      </p>
      {locked && (
        <p className="mb-2 rounded-lg bg-slate-50 px-2 py-1.5 text-[10px] leading-snug text-slate-500">
          微調整（ステップ6）で使えるようになります
        </p>
      )}
      <fieldset disabled={locked} className="space-y-3 border-0 p-0">
        {ROLE_ORDER.map((role) => {
          const members = staff.filter((s) => s.role === role);
          if (members.length === 0) return null;
          const visibleCount = members.filter((m) => !hidden.has(m.id)).length;
          const allVisible = visibleCount === members.length;
          const someVisible = visibleCount > 0 && !allVisible;
          return (
            <div key={role}>
              <label
                className={`flex items-center gap-2 rounded px-1 py-0.5 text-xs font-semibold text-slate-600 ${
                  locked ? "cursor-not-allowed" : "cursor-pointer hover:bg-slate-50"
                }`}
              >
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
                  const color = staffColorOf(m.id);
                  return (
                    <li key={m.id}>
                      <label
                        className={`flex items-center gap-2 rounded px-1 py-0.5 text-xs ${
                          locked ? "cursor-not-allowed" : "cursor-pointer hover:bg-slate-50"
                        } ${isHidden ? "text-slate-400 line-through" : "text-slate-600"}`}
                      >
                        <input
                          type="checkbox"
                          checked={!isHidden}
                          onChange={() => toggleStaffFilter(m.id)}
                          className="h-3 w-3 accent-indigo-600"
                        />
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-black/10"
                          style={{
                            backgroundColor: isHidden ? "#cbd5e1" : color.dot,
                          }}
                          aria-hidden
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
        {staff.length === 0 && (
          <p className="px-1 text-[11px] text-slate-400">スタッフ未登録</p>
        )}
      </fieldset>
    </div>
  );
}
