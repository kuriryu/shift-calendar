"use client";

import Icon from "@/components/Icon";
import MonthMatrix from "@/components/MonthMatrix";
import StepPanel from "@/components/steps/StepPanel";
import { EMPTY_ASSIGNMENTS, useAppStore } from "@/stores/useAppStore";
import { daysOfMonth, dayLabel, monthLabel } from "@/lib/dates";
import { ROLE_LABELS } from "@/types";
import type { Role, ShiftAssignment, Violation } from "@/types";

const ROLE_ORDER: Role[] = ["employee", "part_time", "student"];

function Summary({
  month,
  assignments,
}: {
  month: string;
  assignments: ShiftAssignment[];
}) {
  const staff = useAppStore((s) => s.staff);
  const days = daysOfMonth(month);
  const perDay = new Map<string, number>();
  for (const a of assignments) perDay.set(a.date, (perDay.get(a.date) ?? 0) + 1);
  const maxPerDay = Math.max(1, ...perDay.values());
  const roleCount = new Map<Role, number>();
  const staffRole = new Map(staff.map((s) => [s.id, s.role]));
  for (const a of assignments) {
    const r = staffRole.get(a.staffId);
    if (r) roleCount.set(r, (roleCount.get(r) ?? 0) + 1);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <dl className="space-y-3 rounded-xl bg-slate-50 p-5">
        <div>
          <dt className="text-xs text-slate-500">総割当数</dt>
          <dd className="text-2xl font-bold text-slate-800">
            {assignments.length}
            <span className="ml-1 text-xs font-normal text-slate-400">件</span>
          </dd>
        </div>
        {ROLE_ORDER.map((r) => (
          <div key={r} className="flex items-center justify-between text-sm">
            <dt className="text-slate-500">{ROLE_LABELS[r]}</dt>
            <dd className="font-semibold text-slate-700">{roleCount.get(r) ?? 0}件</dd>
          </div>
        ))}
      </dl>
      <div className="rounded-xl border border-slate-200 p-5 lg:col-span-2">
        <h4 className="mb-3 text-sm font-semibold text-slate-700">日別の出勤者数</h4>
        <div
          className="flex h-28 items-end gap-[3px]"
          role="img"
          aria-label={`日別の出勤者数。最大 ${maxPerDay} 名`}
        >
          {days.map((d) => {
            const n = perDay.get(d) ?? 0;
            return (
              <div
                key={d}
                className="flex-1 rounded-t bg-indigo-300 hover:bg-indigo-500"
                style={{ height: `${Math.max(4, (n / maxPerDay) * 100)}%` }}
                title={`${dayLabel(d)}: ${n}名`}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Concerns({ violations }: { violations: Violation[] }) {
  const errors = violations.filter((v) => v.severity === "error");
  const warnings = violations.filter((v) => v.severity === "warning");
  if (violations.length === 0) {
    return (
      <p className="flex items-center gap-2 rounded-xl bg-emerald-50 px-5 py-4 text-sm font-medium text-emerald-700">
        <Icon name="check_circle" size={20} />
        すべての条件を満たしています。懸念事項はありません。
      </p>
    );
  }
  return (
    <section aria-labelledby="concerns-title" className="rounded-xl border border-slate-200 p-5">
      <h4 id="concerns-title" className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
        <Icon name="report" size={18} />
        懸念事項（エラー {errors.length} / 警告 {warnings.length}）
      </h4>
      <ul className="max-h-72 space-y-1.5 overflow-y-auto pr-1">
        {errors.map((v) => (
          <li key={v.id} className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-800">
            <Icon name="error" size={14} className="mt-0.5 shrink-0" />
            <span>{v.message}</span>
          </li>
        ))}
        {warnings.map((v) => (
          <li key={v.id} className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
            <Icon name="warning" size={14} className="mt-0.5 shrink-0" />
            <span>{v.message}</span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-[11px] text-slate-400">
        確定後、上部の件数バッジから各項目をタップすると該当箇所を表示できます。微調整ステップで手直しできます。
      </p>
    </section>
  );
}

export default function ProposalStep() {
  const month = useAppStore((s) => s.selectedMonth);
  const draft = useAppStore((s) => s.draft);
  const assignments = useAppStore(
    (s) => s.assignments[s.selectedMonth] ?? EMPTY_ASSIGNMENTS,
  );
  const violations = useAppStore((s) => s.violations);
  const confirmDraft = useAppStore((s) => s.confirmDraft);
  const discardDraft = useAppStore((s) => s.discardDraft);
  const generateDraft = useAppStore((s) => s.generateDraft);
  const setStep = useAppStore((s) => s.setStep);

  const activeDraft = draft && draft.month === month ? draft : null;

  // 仮生成あり: 提案を表示
  if (activeDraft) {
    return (
      <StepPanel
        step={5}
        title="こんな感じでどうですか？"
        description={`${monthLabel(month)} のシフト案です。内容と懸念事項を確認して、良ければ確定してください。確定するまで既存のデータは変わりません。`}
        hideNext
        actions={
          <>
            <button
              onClick={() => generateDraft()}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3.5 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              <Icon name="refresh" size={18} />
              再生成
            </button>
            <button
              onClick={() => {
                discardDraft();
                setStep(3);
              }}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3.5 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              <Icon name="undo" size={18} />
              破棄して希望入力へ
            </button>
            <button
              onClick={() => {
                confirmDraft();
                setStep(6);
              }}
              className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              <Icon name="check" size={18} />
              この内容で確定
            </button>
          </>
        }
      >
        <Summary month={month} assignments={activeDraft.assignments} />
        <Concerns violations={activeDraft.violations} />
        <section aria-label="シフト案のプレビュー">
          <h4 className="mb-2 text-sm font-semibold text-slate-700">シフト案（プレビュー）</h4>
          <MonthMatrix
            assignments={activeDraft.assignments}
            violations={activeDraft.violations}
            applyFilter={false}
          />
        </section>
      </StepPanel>
    );
  }

  // 確定済み（仮生成なし）
  if (assignments.length > 0) {
    return (
      <StepPanel
        step={5}
        title="確定済みのシフト"
        description={`${monthLabel(month)} のシフトは確定しています。手直しは次の「微調整」で行えます。`}
        nextLabel="微調整へ進む"
        actions={
          <button
            onClick={() => setStep(4)}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3.5 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            <Icon name="auto_awesome" size={18} />
            もう一度自動生成する
          </button>
        }
      >
        <Summary month={month} assignments={assignments} />
        <Concerns violations={violations} />
      </StepPanel>
    );
  }

  // 未生成
  return (
    <StepPanel step={5} hideNext>
      <div className="flex flex-col items-center gap-4 py-10 text-center">
        <Icon name="pending_actions" size={48} className="text-slate-300" />
        <p className="text-sm text-slate-500">
          まだシフト案がありません。ステップ4で自動生成してください。
        </p>
        <button
          onClick={() => setStep(4)}
          className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          <Icon name="auto_awesome" size={18} />
          自動生成へ
        </button>
      </div>
    </StepPanel>
  );
}
