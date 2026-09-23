"use client";

import { useEffect } from "react";
import Icon from "@/components/Icon";
import RequestMatrix from "@/components/RequestMatrix";
import StepPanel from "@/components/steps/StepPanel";
import { EMPTY_REQUESTS, useAppStore } from "@/stores/useAppStore";
import { hasAnyPattern } from "@/lib/staff-pattern";

export default function RequestStep() {
  const staff = useAppStore((s) => s.staff);
  const month = useAppStore((s) => s.selectedMonth);
  const requests = useAppStore((s) => s.requests[s.selectedMonth] ?? EMPTY_REQUESTS);
  const adoptRecommendations = useAppStore((s) => s.adoptRecommendations);

  // ステップ2の基本パターン／固定休を、未入力セルへ自動反映
  useEffect(() => {
    adoptRecommendations(undefined, { silent: true });
  }, [month, staff, adoptRecommendations]);

  const hasPatternStaff = staff.some(
    (s) => hasAnyPattern(s) || (s.unavailableWeekdays?.length ?? 0) > 0,
  );

  return (
    <StepPanel step={3}>
      {requests.length === 0 && !hasPatternStaff && (
        <p className="flex items-center gap-2 rounded-lg bg-sky-50 px-4 py-3 text-sm text-sky-800">
          <Icon name="lightbulb" size={18} />
          まだ希望が入力されていません。セルをタップして休・出勤・時間帯を指定できます。
        </p>
      )}

      <RequestMatrix />
    </StepPanel>
  );
}
