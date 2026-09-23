"use client";

import { EMPTY_ASSIGNMENTS, EMPTY_REQUESTS, useAppStore } from "@/stores/useAppStore";
import { useMounted } from "@/hooks/useMounted";
import { STEPS } from "@/lib/steps";
import StepProgress from "@/components/StepProgress";
import ViolationBadge from "@/components/ViolationBadge";
import MonthStep from "@/components/steps/MonthStep";
import StaffStep from "@/components/steps/StaffStep";
import RequestStep from "@/components/steps/RequestStep";
import GenerateStep from "@/components/steps/GenerateStep";
import ProposalStep from "@/components/steps/ProposalStep";
import AdjustStep from "@/components/steps/AdjustStep";
import type { StepId } from "@/types";

export default function Dashboard() {
  const mounted = useMounted();
  const month = useAppStore((s) => s.selectedMonth);
  const staff = useAppStore((s) => s.staff);
  const requests = useAppStore((s) => s.requests[s.selectedMonth] ?? EMPTY_REQUESTS);
  const assignments = useAppStore(
    (s) => s.assignments[s.selectedMonth] ?? EMPTY_ASSIGNMENTS,
  );
  const draft = useAppStore((s) => s.draft);
  const currentStep = useAppStore((s) => s.currentStep);

  if (!mounted) {
    return <div className="py-20 text-center text-sm text-slate-400">読み込み中…</div>;
  }

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

  const def = STEPS[active - 1];

  const panel = {
    1: <MonthStep />,
    2: <StaffStep />,
    3: <RequestStep />,
    4: <GenerateStep />,
    5: <ProposalStep />,
    6: <AdjustStep />,
  }[active];

  return (
    <div className="space-y-12">
      <div>
        <header className="flex flex-wrap items-start justify-between gap-4 px-0.5 py-2">
          <div className="min-w-0">
            <p className="text-xs font-semibold tracking-wide text-indigo-600">
              STEP {active}
            </p>
            <h1
              id={`step-${active}-title`}
              className="mt-4 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl"
            >
              {def.label}
            </h1>
            <p className="mt-5 text-base leading-relaxed text-slate-500">{def.desc}</p>
          </div>
          <ViolationBadge />
        </header>

        <div className="mt-5">
          <StepProgress current={active} />
        </div>
      </div>

      <div aria-live="polite" className="pt-1">
        {panel}
      </div>
    </div>
  );
}
