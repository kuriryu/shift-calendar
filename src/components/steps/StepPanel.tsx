"use client";

import Icon from "@/components/Icon";
import { STEPS, clampStep } from "@/lib/steps";
import { useAppStore } from "@/stores/useAppStore";
import type { StepId } from "@/types";

/** 各ステップ画面の共通枠（見出し・説明・前後ナビ） */
export default function StepPanel({
  step,
  title,
  description,
  actions,
  children,
  nextLabel,
  onNext,
  nextDisabled,
  hideNext,
}: {
  step: StepId;
  title?: string;
  description?: string;
  /** 見出し右側に置く操作ボタン */
  actions?: React.ReactNode;
  children: React.ReactNode;
  nextLabel?: string;
  onNext?: () => void;
  nextDisabled?: boolean;
  hideNext?: boolean;
}) {
  const setStep = useAppStore((s) => s.setStep);
  const def = STEPS[step - 1];
  const prev = step > 1 ? STEPS[step - 2] : null;
  const next = step < 6 ? STEPS[step] : null;

  return (
    <section
      aria-labelledby={`step-${step}-title`}
      className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8"
    >
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="mb-1 text-xs font-semibold tracking-wide text-indigo-600">
            STEP {step}
          </p>
          <h3 id={`step-${step}-title`} className="text-xl font-bold text-slate-800">
            {title ?? def.label}
          </h3>
          {(description ?? def.desc) && (
            <p className="mt-1 text-sm text-slate-500">{description ?? def.desc}</p>
          )}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </header>

      <div className="space-y-6">{children}</div>

      <footer className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5">
        {prev ? (
          <button
            onClick={() => setStep(clampStep(step - 1))}
            className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
          >
            <Icon name="arrow_back" size={18} />
            {prev.label}へ戻る
          </button>
        ) : (
          <span />
        )}
        {!hideNext && next && (
          <button
            onClick={onNext ?? (() => setStep(clampStep(step + 1)))}
            disabled={nextDisabled}
            className="flex items-center gap-1 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {nextLabel ?? `次へ: ${next.label}`}
            <Icon name="arrow_forward" size={18} />
          </button>
        )}
      </footer>
    </section>
  );
}
