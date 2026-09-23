"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/stores/useAppStore";
import type { StepId } from "@/types";

/** 旧ページ（/staff, /requests など）からトップの該当ステップへリダイレクトする */
export default function RedirectToStep({
  step,
  date,
}: {
  step: StepId;
  /** 指定があればその日を選択してから移動 */
  date?: string;
}) {
  const router = useRouter();
  const setStep = useAppStore((s) => s.setStep);
  const setSelectedDate = useAppStore((s) => s.setSelectedDate);
  const setAdjustView = useAppStore((s) => s.setAdjustView);

  useEffect(() => {
    if (date) {
      setSelectedDate(date);
      setAdjustView("day");
    }
    setStep(step);
    router.replace("/");
  }, [step, date, router, setStep, setSelectedDate, setAdjustView]);

  return <div className="py-20 text-center text-sm text-slate-400">読み込み中…</div>;
}
