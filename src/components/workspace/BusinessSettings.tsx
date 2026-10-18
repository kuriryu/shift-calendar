"use client";

import { useEffect, useState } from "react";
import { SettingsForm, settingsError } from "@/components/SettingsModal";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import PageShell from "@/components/ui/PageShell";
import { useAppStore } from "@/stores/useAppStore";
import { toast } from "@/stores/useToastStore";
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
    toast("保存しました");
  };

  return (
    <PageShell
      title="業態設定"
      lead="営業時間、ピーク、必要人数をこの店舗用に保存します。"
    >
      <Card className="mt-6 max-w-3xl">
        <SettingsForm form={form} setForm={setForm} error={error} />
        <Button type="button" onClick={save} className="mt-4">
          保存する
        </Button>
      </Card>
    </PageShell>
  );
}
