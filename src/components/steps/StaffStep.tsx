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
  const employees = staff.filter((s) => s.role === "employee").length;

  return (
    <StepPanel
      step={2}
      description="学生・パート・社員などの属性と、希望する時間帯（基本パターン）・固定休を登録します。ここで登録した内容は次のステップで候補として表示されます。"
      actions={
        <button
          onClick={() => setCreating(true)}
          className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          <Icon name="person_add" size={18} />
          スタッフを新規登録
        </button>
      }
      nextDisabled={staff.length === 0}
    >
      {/* 属性別の人数 */}
      <dl className="flex flex-wrap gap-3">
        {ROLE_ORDER.map((role) => (
          <div key={role} className="flex items-center gap-2 rounded-full bg-slate-50 px-4 py-1.5 text-sm">
            <dt className="text-slate-500">{ROLE_LABELS[role]}</dt>
            <dd className="font-bold text-slate-800">
              {staff.filter((s) => s.role === role).length}名
            </dd>
          </div>
        ))}
      </dl>

      {employees === 0 && (
        <p role="alert" className="flex items-center gap-2 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <Icon name="warning" size={18} />
          社員が登録されていません。各日に社員を最低1人配置する条件があるため、社員を1人以上登録してください。
        </p>
      )}

      <StaffManager />

      <StaffEditModal staff={null} isOpen={creating} onClose={() => setCreating(false)} />
    </StepPanel>
  );
}
