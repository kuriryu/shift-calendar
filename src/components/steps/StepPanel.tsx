"use client";

import Icon from "@/components/Icon";
import { STEPS, clampStep } from "@/lib/steps";
import { useAppStore } from "@/stores/useAppStore";
import type { StepId } from "@/types";

/** 各ステップ画面の共通枠（操作・前後ナビ）。見出しは Dashboard の h1 に任せる */
export default function StepPanel({
  step,
  title,
  actions,
  children,
  nextLabel,
  onNext,
  nextDisabled,
  hideNext,
}: {
  step: StepId;
  /** 任意の補足見出し（Dashboard の h1 とは別。必要なときだけ） */
  title?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  nextLabel?: string;
  onNext?: () => void;
  nextDisabled?: boolean;
  hideNext?: boolean;
}) {
  const setStep = useAppStore((s) => s.setStep);
  const prev = step > 1 ? STEPS[step - 2] : null;
  const next = step < 6 ? STEPS[step] : null;

  return (
    <section
      aria-labelledby={`step-${step}-title`}
      className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8"
    >
      {(title || actions) && (
        <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
          {title ? (
            <h2 className="text-lg font-bold text-slate-800">{title}</h2>
          ) : (
            <span />
          )}
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </header>
      )}

      <div className="space-y-8">{children}</div>

      <footer className="mt-14 flex flex-wrap items-center justify-between gap-3 pt-3">
        {prev ? (
          <button
            onClick={() => setStep(clampStep(step - 1))}
            className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
          >
            <Icon name="arrow_back" size={18} />
            戻る
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
            {nextLabel ?? "次へ"}
            <Icon name="arrow_forward" size={18} />
          </button>
        )}
      </footer>
    </section>
  );
}
