"use client";

import { useState } from "react";
import Icon from "@/components/Icon";
import StaffManager from "@/components/StaffManager";
import StaffEditModal from "@/components/StaffEditModal";
import StepPanel from "@/components/steps/StepPanel";
import { useAppStore } from "@/stores/useAppStore";
import { ROLE_LABELS } from "@/types";
import type { Role } from "@/types";

const ROLE_ORDER: Role[] = ["employee", "part_time", "student"];

export default function StaffStep() {
  const staff = useAppStore((s) => s.staff);
  const [creating, setCreating] = useState(false);

  return (
    <StepPanel step={2} nextDisabled={staff.length === 0}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <dl className="grid flex-1 grid-cols-3 gap-3">
          {ROLE_ORDER.map((role) => (
            <div
              key={role}
              className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 sm:px-5 sm:py-5"
            >
              <dt className="text-xs font-medium text-slate-500 sm:text-sm">
                {ROLE_LABELS[role]}
              </dt>
              <dd className="mt-1.5 text-2xl font-bold tabular-nums text-slate-800 sm:text-3xl">
                {staff.filter((s) => s.role === role).length}
                <span className="ml-1 text-sm font-medium text-slate-400">名</span>
              </dd>
            </div>
          ))}
        </dl>
        <button
          onClick={() => setCreating(true)}
          className="flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          <Icon name="person_add" size={18} />
          スタッフを新規登録
        </button>
      </div>

      <div className="pt-2">
        <StaffManager />
      </div>

      <StaffEditModal staff={null} isOpen={creating} onClose={() => setCreating(false)} />
    </StepPanel>
  );
}
