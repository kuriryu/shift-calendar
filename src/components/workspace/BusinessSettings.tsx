"use client";

import { useEffect, useState } from "react";
import { SettingsForm, settingsError } from "@/components/SettingsModal";
import { useAppStore } from "@/stores/useAppStore";
import type { ShopSettings } from "@/types";

export default function BusinessSettings() {
  const settings = useAppStore((s) => s.settings);
  const updateSettings = useAppStore((s) => s.updateSettings);
  const [form, setForm] = useState<ShopSettings>(settings);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setForm(settings);
  }, [settings]);

  const save = () => {
    const nextError = settingsError(form);
    setError(nextError);
    if (nextError) return;
    updateSettings(form);
  };

  return (
    <div className="ds-page">
      <h1 className="ds-title">業態設定</h1>
      <p className="ds-lead">営業時間、ピーク、必要人数をこの店舗用に保存します。</p>
      <div className="ds-card mt-6 max-w-3xl p-5">
        <SettingsForm form={form} setForm={setForm} error={error} />
        <button type="button" onClick={save} className="ds-btn mt-4">
          保存する
        </button>
      </div>
    </div>
  );
}
