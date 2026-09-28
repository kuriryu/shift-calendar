"use client";

import { useState } from "react";
import { SettingsForm, settingsError } from "@/components/SettingsModal";
import StepPanel from "@/components/steps/StepPanel";
import { useAppStore } from "@/stores/useAppStore";
import type { ShopSettings } from "@/types";

/** ステップ1。入力項目は自動生成で開ける条件設定と同じ */
export default function RulesGate() {
  const settings = useAppStore((s) => s.settings);
  const updateSettings = useAppStore((s) => s.updateSettings);
  const setStep = useAppStore((s) => s.setStep);
  const [form, setForm] = useState<ShopSettings>(settings);
  const [error, setError] = useState<string | null>(null);

  const saveAndNext = () => {
    const err = settingsError(form);
    if (err) {
      setError(err);
      return;
    }
    updateSettings(form);
    setStep(2);
  };

  return (
    <StepPanel step={1} onNext={saveAndNext}>
      <div className="w-full">
        <SettingsForm form={form} setForm={setForm} error={error} />
      </div>
    </StepPanel>
  );
}
