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
    <div className="h-full overflow-auto p-5 md:p-8">
      <h1 className="text-2xl font-bold text-slate-900">業態設定</h1>
      <p className="mt-2 text-sm text-slate-500">営業時間、ピーク、必要人数をこの店舗用に保存します。</p>
      <div className="mt-6 max-w-3xl rounded-2xl bg-white p-5 shadow-sm">
        <SettingsForm form={form} setForm={setForm} error={error} />
        <button
          type="button"
          onClick={save}
          className="mt-4 h-11 rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white"
        >
          保存する
        </button>
      </div>
    </div>
  );
}
