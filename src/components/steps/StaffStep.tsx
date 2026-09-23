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
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <dl className="grid flex-1 grid-cols-3 gap-3 sm:gap-4">
          {ROLE_ORDER.map((role) => {
            const meta = ROLE_META[role];
            const count = staff.filter((s) => s.role === role).length;
            const active = count > 0;
            return (
              <div
                key={role}
                className={`rounded-xl border px-4 py-5 sm:px-5 ${
                  active
                    ? `${meta.soft} border-transparent`
                    : "border-slate-200 bg-slate-100"
                }`}
              >
                <dt
                  className={`flex items-center gap-1.5 text-xs font-medium sm:text-sm ${
                    active ? "opacity-90" : "text-slate-400"
                  }`}
                >
                  <span
                    className={`flex h-6 w-6 items-center justify-center rounded-md ${
                      active ? "bg-white/70" : "bg-slate-200 text-slate-400"
                    }`}
                    aria-hidden
                  >
                    <Icon name={meta.icon} size={14} />
                  </span>
                  {meta.label}
                </dt>
                <dd
                  className={`mt-2 text-2xl font-bold tabular-nums sm:text-3xl ${
                    active ? "" : "text-slate-400"
                  }`}
                >
                  <span className="sr-only">{meta.label} </span>
                  {count}
                  <span
                    className={`ml-1 text-sm font-medium ${
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
          className="flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
        >
          <Icon name="person_add" size={18} />
          スタッフを新規登録
        </button>
      </div>

      <div className="pt-3">
        <StaffManager />
      </div>

      <StaffEditModal staff={null} isOpen={creating} onClose={() => setCreating(false)} />
    </StepPanel>
  );
}
