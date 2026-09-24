"use client";

import { useState } from "react";
import Icon from "@/components/Icon";
import StaffManager from "@/components/StaffManager";
import StaffEditModal from "@/components/StaffEditModal";
import StepPanel from "@/components/steps/StepPanel";
import { useAppStore } from "@/stores/useAppStore";
import { ROLE_META, ROLE_ORDER } from "@/lib/roles";

export default function StaffStep() {
  const staff = useAppStore((s) => s.staff);
  const [creating, setCreating] = useState(false);

  return (
    <StepPanel step={2} nextDisabled={staff.length === 0}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-5">
        <dl className="grid flex-1 grid-cols-3 gap-2 sm:gap-4">
          {ROLE_ORDER.map((role) => {
            const meta = ROLE_META[role];
            const count = staff.filter((s) => s.role === role).length;
            const active = count > 0;
            return (
              <div
                key={role}
                className={`rounded-lg border px-2.5 py-3 sm:rounded-xl sm:px-5 sm:py-5 ${
                  active
                    ? `${meta.soft} border-transparent`
                    : "border-slate-200 bg-slate-100"
                }`}
              >
                <dt
                  className={`flex items-center gap-1 text-[11px] font-medium sm:gap-1.5 sm:text-sm ${
                    active ? "opacity-90" : "text-slate-400"
                  }`}
                >
                  <span
                    className={`flex h-5 w-5 items-center justify-center rounded-md sm:h-6 sm:w-6 ${
                      active ? "bg-white/70" : "bg-slate-200 text-slate-400"
                    }`}
                    aria-hidden
                  >
                    <Icon name={meta.icon} size={12} />
                  </span>
                  {meta.label}
                </dt>
                <dd
                  className={`mt-1 text-xl font-bold tabular-nums sm:mt-2 sm:text-3xl ${
                    active ? "" : "text-slate-400"
                  }`}
                >
                  <span className="sr-only">{meta.label} </span>
                  {count}
                  <span
                    className={`ml-0.5 text-xs font-medium sm:ml-1 sm:text-sm ${
                      active ? "opacity-70" : "text-slate-400"
                    }`}
                    aria-hidden
                  >
                    名
                  </span>
                  <span className="sr-only">名</span>
                </dd>
              </div>
            );
          })}
        </dl>
        <button
          onClick={() => setCreating(true)}
          className="flex h-11 min-h-11 shrink-0 items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-4 text-sm font-semibold text-white hover:bg-indigo-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
        >
          <Icon name="person_add" size={18} />
          スタッフを新規登録
        </button>
      </div>

      <div className="min-h-0 pt-1 md:pt-3">
        <StaffManager />
      </div>

      <StaffEditModal staff={null} isOpen={creating} onClose={() => setCreating(false)} />
    </StepPanel>
  );
}
