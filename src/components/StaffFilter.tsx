"use client";

import { EMPTY_ASSIGNMENTS, EMPTY_REQUESTS, useAppStore } from "@/stores/useAppStore";
import { useMounted } from "@/hooks/useMounted";
import Icon from "@/components/Icon";
import type { StepId } from "@/types";
import { staffColorOf } from "@/lib/staff-color";
import { ROLE_META, ROLE_ORDER } from "@/lib/roles";

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
      <p className="mb-3 px-1 py-1 text-[11px] font-semibold tracking-wide text-slate-500">
        スタッフ絞り込み
      </p>
      {locked && (
        <p className="mb-3 rounded-lg bg-slate-50 px-2.5 py-2 text-[10px] leading-relaxed text-slate-500">
          調整（ステップ6）で使えるようになります
        </p>
      )}
      <fieldset disabled={locked} className="space-y-4 border-0 p-0">
        {ROLE_ORDER.map((role) => {
          const members = staff.filter((s) => s.role === role);
          if (members.length === 0) return null;
          const visibleCount = members.filter((m) => !hidden.has(m.id)).length;
          const allVisible = visibleCount === members.length;
          const someVisible = visibleCount > 0 && !allVisible;
          const meta = ROLE_META[role];
          return (
            <div key={role}>
              <label
                className={`flex items-center gap-2 rounded-md px-1.5 py-1.5 text-xs font-semibold text-slate-600 ${
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
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded ${meta.soft}`}
                  aria-hidden
                >
                  <Icon name={meta.icon} size={12} />
                </span>
                {meta.label}
                <span className="text-[10px] font-normal text-slate-400">
                  {visibleCount}/{members.length}
                </span>
              </label>
              <ul className="ml-4 mt-1 space-y-1">
                {members.map((m) => {
                  const isHidden = hidden.has(m.id);
                  const color = staffColorOf(m.id);
                  return (
                    <li key={m.id}>
                      <label
                        className={`flex items-center gap-2 rounded-md px-1.5 py-1.5 text-xs ${
                          locked ? "cursor-not-allowed" : "cursor-pointer hover:bg-slate-50"
                        } ${isHidden ? "text-slate-400 line-through" : "text-slate-600"}`}
                      >
                        <input
                          type="checkbox"
                          checked={!isHidden}
                          onChange={() => toggleStaffFilter(m.id)}
                          className="peer sr-only"
                        />
                        <span
                          className="inline-flex shrink-0 rounded-sm peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-indigo-600"
                          style={{ color: isHidden ? "#94a3b8" : color.dot }}
                          aria-hidden
                        >
                          <Icon
                            name={isHidden ? "check_box_outline_blank" : "check_box"}
                            size={16}
                          />
                        </span>
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
          <p className="px-1 py-1 text-[11px] text-slate-400">スタッフ未登録</p>
        )}
      </fieldset>
    </div>
  );
}
