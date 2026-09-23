"use client";

import { EMPTY_ASSIGNMENTS, EMPTY_REQUESTS, useAppStore } from "@/stores/useAppStore";
import { useMounted } from "@/hooks/useMounted";
import { monthLabel } from "@/lib/dates";
import type { StepStatus } from "@/lib/steps";
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
  const setStep = useAppStore((s) => s.setStep);

  if (!mounted) {
    return <div className="py-20 text-center text-sm text-slate-400">読み込み中…</div>;
  }

  // ── 進捗はデータから自動判定 ──
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
  // 未指定時は「最初の未完了ステップ」を現在地にする（作成済みなら微調整）
  const firstPending = ([1, 2, 3, 4, 5, 6] as StepId[]).find((id) => !done[id]);
  const active: StepId = currentStep ?? (confirmed ? 6 : (firstPending ?? 6));

  const statuses = Object.fromEntries(
    ([1, 2, 3, 4, 5, 6] as StepId[]).map((id) => [
      id,
      (id === active ? "current" : done[id] ? "done" : "pending") as StepStatus,
    ]),
  ) as Record<StepId, StepStatus>;

  const panel = {
    1: <MonthStep />,
    2: <StaffStep />,
    3: <RequestStep />,
    4: <GenerateStep />,
    5: <ProposalStep />,
    6: <AdjustStep />,
  }[active];

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">{monthLabel(month)} のシフト</h2>
          <p className="mt-1 text-sm text-slate-500">
            ステップに沿って作成し、確認してから確定・微調整します
          </p>
        </div>
        <ViolationBadge />
      </header>

      <StepProgress current={active} statuses={statuses} onSelect={setStep} />

      <div aria-live="polite">{panel}</div>
    </div>
  );
}
