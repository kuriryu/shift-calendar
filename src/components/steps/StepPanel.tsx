"use client";

import Icon from "@/components/Icon";
import PrimaryButton from "@/components/PrimaryButton";
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
      className="flex min-h-0 flex-1 flex-col rounded-lg border border-slate-200 bg-white p-3 md:p-8"
    >
      {(title || actions) && (
        <header className="mb-3 flex shrink-0 flex-wrap items-start justify-between gap-2 md:mb-7 md:gap-4">
          {title ? (
            <h2 className="text-base font-bold text-slate-800 md:text-lg">{title}</h2>
          ) : (
            <span />
          )}
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </header>
      )}

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto md:space-y-7">{children}</div>

      <footer className="mt-3 flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 md:mt-12 md:gap-3 md:border-0 md:pt-4">
        {prev ? (
          <button
            onClick={() => setStep(clampStep(step - 1))}
            className="inline-flex h-11 min-h-11 items-center gap-1 rounded-md px-4 text-sm font-medium text-slate-700 hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
          >
            <Icon name="arrow_back" size={18} />
            戻る
          </button>
        ) : (
          <span />
        )}
        {!hideNext && next && (
          <PrimaryButton
            onClick={onNext ?? (() => setStep(clampStep(step + 1)))}
            disabled={nextDisabled}
          >
            {nextLabel ?? "次へ"}
            <Icon name="arrow_forward" size={18} />
          </PrimaryButton>
        )}
      </footer>
    </section>
  );
}
