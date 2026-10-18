"use client";

import { EMPTY_ASSIGNMENTS, useAppStore } from "@/stores/useAppStore";
import { useMounted } from "@/hooks/useMounted";
import { STEPS } from "@/lib/steps";
import StepProgress from "@/components/StepProgress";
import ViolationBadge from "@/components/ViolationBadge";
import MonthStep from "@/components/steps/MonthStep";
import StaffStep from "@/components/steps/StaffStep";
import RequestStep from "@/components/steps/RequestStep";
import GenerateStep from "@/components/steps/GenerateStep";
import AdjustStep from "@/components/steps/AdjustStep";
import RulesGate from "@/components/steps/RulesGate";
import CopyHopeUrlButton from "@/components/CopyHopeUrlButton";
import { hopePageUrl } from "@/lib/public-url";
import type { StepId } from "@/types";

export default function Dashboard() {
  const mounted = useMounted();
  const assignments = useAppStore(
    (s) => s.assignments[s.selectedMonth] ?? EMPTY_ASSIGNMENTS,
  );
  const currentStep = useAppStore((s) => s.currentStep);
  const activeStoreId = useAppStore((s) => s.activeStoreId);
  const selectedMonth = useAppStore((s) => s.selectedMonth);
  const hopeUrl = activeStoreId ? hopePageUrl(activeStoreId, selectedMonth) : "";

  if (!mounted) {
    return <div className="py-20 text-center text-sm text-slate-400">読み込み中…</div>;
  }

  const confirmed = assignments.length > 0;
  // 作成画面の既定はステップ1。確定済みで currentStep 未設定のときだけ調整へ
  const active: StepId = currentStep ?? (confirmed ? 6 : 1);

  const def = STEPS[active - 1];

  const panel = {
    1: <RulesGate />,
    2: <MonthStep />,
    3: <StaffStep />,
    4: <RequestStep />,
    5: <GenerateStep />,
    6: <AdjustStep />,
  }[active];

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 md:gap-12 md:space-y-0">
      <div className="shrink-0">
        <header className="flex flex-wrap items-start justify-between gap-2 px-0.5 py-1 md:gap-4 md:py-3">
          <div className="flex min-w-0 flex-1 items-center gap-4">
            <StepProgress current={active} />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1
                  id={`step-${active}-title`}
                  className="text-2xl font-bold leading-tight tracking-tight text-slate-900 md:text-3xl"
                >
                  {def.label}
                </h1>
                {active === 4 && <CopyHopeUrlButton url={hopeUrl} />}
              </div>
              <p className="mt-1 text-sm text-slate-400">{def.desc}</p>
            </div>
          </div>
          {active !== 3 && <ViolationBadge />}
        </header>
      </div>

      <div
        key={active}
        aria-live="polite"
        className="flex min-h-0 flex-1 flex-col animate-[fadeIn_200ms_cubic-bezier(0.16,1,0.3,1)]"
      >
        {panel}
      </div>
    </div>
  );
}
