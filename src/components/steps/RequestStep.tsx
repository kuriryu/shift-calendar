"use client";

import Icon from "@/components/Icon";
import RequestMatrix from "@/components/RequestMatrix";
import StepPanel from "@/components/steps/StepPanel";
import { EMPTY_REQUESTS, useAppStore } from "@/stores/useAppStore";

export default function RequestStep() {
  const requests = useAppStore((s) => s.requests[s.selectedMonth] ?? EMPTY_REQUESTS);

  return (
    <StepPanel step={3}>
      {requests.length === 0 && (
        <p className="flex items-center gap-2 rounded-lg bg-sky-50 px-4 py-3 text-sm text-sky-800">
          <Icon name="lightbulb" size={18} />
          まだ希望が入力されていません。候補（薄いグレー）をタップするか、「全員の候補を採用」で一括入力できます。
        </p>
      )}

      <RequestMatrix />
    </StepPanel>
  );
}
