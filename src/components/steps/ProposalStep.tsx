"use client";

import { useState } from "react";
import Icon from "@/components/Icon";
import MonthMatrix from "@/components/MonthMatrix";
import GenerateConfirmDialog from "@/components/GenerateConfirmDialog";
import StepPanel from "@/components/steps/StepPanel";
import { EMPTY_ASSIGNMENTS, useAppStore } from "@/stores/useAppStore";
import type { Violation } from "@/types";

function Concerns({ violations }: { violations: Violation[] }) {
  const errors = violations.filter((v) => v.severity === "error");
  const warnings = violations.filter((v) => v.severity === "warning");
  if (violations.length === 0) {
    return (
      <p className="flex items-center gap-3 rounded-xl bg-emerald-50 px-5 py-4 text-sm font-medium text-emerald-800 ring-1 ring-emerald-100">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-emerald-600">
          <Icon name="verified" size={20} />
        </span>
        すべての条件を満たしています。懸念事項はありません。
      </p>
    );
  }
  return (
    <section aria-labelledby="concerns-title" className="rounded-xl border border-slate-200 p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 id="concerns-title" className="flex items-center gap-2 text-sm font-semibold text-slate-700">
          <Icon name="report" size={18} />
          懸念事項
        </h2>
        <div className="flex flex-wrap items-center gap-1.5" aria-label={`エラー ${errors.length}件、警告 ${warnings.length}件`}>
          {errors.length > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-[11px] font-semibold text-red-700 ring-1 ring-red-100">
              <Icon name="error" size={14} />
              エラー {errors.length}
            </span>
          )}
          {warnings.length > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-800 ring-1 ring-amber-100">
              <Icon name="warning" size={14} />
              警告 {warnings.length}
            </span>
          )}
        </div>
      </div>
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
      <p className="mt-3 flex items-start gap-1.5 text-[11px] text-slate-400">
        <Icon name="touch_app" size={14} className="mt-px shrink-0" />
        出力後、上部の件数バッジから各項目をタップすると該当箇所を表示できます。調整ステップで手直しできます。
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
  const [confirmOpen, setConfirmOpen] = useState(false);

  const activeDraft = draft && draft.month === month ? draft : null;

  if (activeDraft) {
    return (
      <StepPanel
        step={5}
        title="こんな感じでどうですか？"
        hideNext
        actions={
          <>
            <button
              onClick={() => setConfirmOpen(true)}
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
              この内容で出力
            </button>
          </>
        }
      >
        <Concerns violations={activeDraft.violations} />
        <section aria-label="シフト案のプレビュー">
          <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
            <h2 className="text-sm font-semibold text-slate-700">シフト案（プレビュー）</h2>
            <ul className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
              <li className="inline-flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-sm bg-red-100 ring-1 ring-red-200" aria-hidden />
                エラーの日
              </li>
              <li className="inline-flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-sm bg-amber-50 ring-1 ring-amber-200" aria-hidden />
                警告の日
              </li>
              <li className="inline-flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-sm bg-slate-100 ring-1 ring-slate-200" aria-hidden />
                休み
              </li>
            </ul>
          </div>
          <MonthMatrix
            assignments={activeDraft.assignments}
            violations={activeDraft.violations}
            applyFilter={false}
          />
        </section>
        <GenerateConfirmDialog
          isOpen={confirmOpen}
          hasExisting={assignments.length > 0}
          onConfirm={() => generateDraft()}
          onClose={() => setConfirmOpen(false)}
        />
      </StepPanel>
    );
  }

  if (assignments.length > 0) {
    return (
      <StepPanel
        step={5}
        title="出力済みのシフト"
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
        <Concerns violations={violations} />
        <section aria-label="シフトのプレビュー">
          <h2 className="mb-2 text-sm font-semibold text-slate-700">シフト（出力済み）</h2>
          <MonthMatrix applyFilter={false} />
        </section>
      </StepPanel>
    );
  }

  return (
    <StepPanel step={5} hideNext>
      <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed border-slate-200 bg-slate-50/60 py-12 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-slate-300 ring-1 ring-slate-200">
          <Icon name="pending_actions" size={32} />
        </span>
        <div className="space-y-1">
          <p className="text-sm font-medium text-slate-600">まだシフト案がありません</p>
          <p className="text-xs text-slate-400">ステップ4で自動生成してください。</p>
        </div>
        <button
          onClick={() => setStep(4)}
          className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
        >
          <Icon name="auto_awesome" size={18} />
          自動生成へ
        </button>
      </div>
    </StepPanel>
  );
}
