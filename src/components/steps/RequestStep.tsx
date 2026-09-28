"use client";

import { useEffect } from "react";
import Icon from "@/components/Icon";
import RequestMatrix from "@/components/RequestMatrix";
import StepPanel from "@/components/steps/StepPanel";
import { useAppStore } from "@/stores/useAppStore";

export default function RequestStep() {
  const month = useAppStore((s) => s.selectedMonth);
  const staff = useAppStore((s) => s.staff);
  const ensureDefaultOffs = useAppStore((s) => s.ensureDefaultOffs);

  useEffect(() => {
    ensureDefaultOffs();
  }, [month, staff, ensureDefaultOffs]);

  return (
    <StepPanel step={4}>
      <div className="pb-8 md:pb-10">
        <p className="flex items-center gap-2 rounded-lg bg-sky-50 px-4 py-3 text-sm text-sky-800">
          <Icon name="lightbulb" size={18} />
          最初はすべての日が休みです。希望の種類を選んでから、日付をタップしてください。
        </p>
      </div>

      <RequestMatrix />
    </StepPanel>
  );
}
