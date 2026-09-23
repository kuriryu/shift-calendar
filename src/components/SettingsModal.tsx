"use client";

import { useState } from "react";
import {
  Cluster,
  ControlledActionDialog,
  FormControl,
  Input,
  Select,
  Stack,
} from "smarthr-ui";
import type { ShopSettings, TimeRange } from "@/types";
import { DEFAULT_SETTINGS } from "@/types";
import { useAppStore } from "@/stores/useAppStore";
import Icon from "@/components/Icon";

/** 6:00〜24:00 の30分刻み（営業時間・ピーク時間帯の選択肢） */
const CLOCK_OPTIONS: string[] = [];
for (let m = 6 * 60; m <= 24 * 60; m += 30) {
  CLOCK_OPTIONS.push(
    `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`,
  );
}
const clockOptions = CLOCK_OPTIONS.map((t) => ({ value: t, label: t }));

export default function SettingsModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const settings = useAppStore((s) => s.settings);
  const updateSettings = useAppStore((s) => s.updateSettings);

  // 親側で開くたびにマウントし直すため、初期値はマウント時の設定でよい
  const [form, setForm] = useState<ShopSettings>(settings);
  const [error, setError] = useState<string | null>(null);

  const setField = <K extends keyof ShopSettings>(key: K, value: ShopSettings[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const setPeak = (index: number, patch: Partial<TimeRange>) =>
    setForm((f) => ({
      ...f,
      peakHours: f.peakHours.map((p, i) => (i === index ? { ...p, ...patch } : p)),
    }));

  const numberField = (key: keyof ShopSettings, min: number, max: number) => (
    <Input
      type="number"
      min={min}
      max={max}
      value={String(form[key])}
      onChange={(e) => {
        const n = Number(e.target.value);
        if (Number.isNaN(n)) return;
        setField(key, Math.min(max, Math.max(min, n)) as never);
      }}
    />
  );

  const validate = (): string | null => {
    if (form.openTime >= form.closeTimeWeekday) {
      return "日〜木の閉店時刻は開店時刻より後にしてください";
    }
    if (form.openTime >= form.closeTimeWeekend) {
      return "金・土の閉店時刻は開店時刻より後にしてください";
    }
    for (const p of form.peakHours) {
      if (p.start >= p.end) return "ピーク時間帯の終了は開始より後にしてください";
    }
    return null;
  };

  const save = () => {
    const err = validate();
    if (err) {
      setError(err);
      return;
    }
    updateSettings(form);
    onClose();
  };

  return (
    <ControlledActionDialog
      isOpen={isOpen}
      heading="シフト作成の条件設定"
      actionButton={{ text: "保存する", theme: "primary" }}
      onClickAction={() => save()}
      onClickClose={onClose}
      onClickOverlay={onClose}
      width={600}
    >
      <Stack gap={1.5}>
        <p className="text-xs text-slate-500">
          ここで変更した条件は、自動生成と条件チェック（エラー・警告）にすぐ反映されます。
        </p>

        {/* 営業時間 */}
        <section aria-labelledby="settings-hours">
          <h3 id="settings-hours" className="mb-2 text-sm font-semibold text-slate-700">
            営業時間
          </h3>
          <Stack gap={1}>
            <FormControl label="開店時刻">
              <Select
                value={form.openTime}
                onChange={(e) => setField("openTime", e.target.value)}
                options={clockOptions}
              />
            </FormControl>
            <Cluster gap={1.5}>
              <FormControl label="閉店時刻（日〜木）">
                <Select
                  value={form.closeTimeWeekday}
                  onChange={(e) => setField("closeTimeWeekday", e.target.value)}
                  options={clockOptions}
                />
              </FormControl>
              <FormControl label="閉店時刻（金・土）">
                <Select
                  value={form.closeTimeWeekend}
                  onChange={(e) => setField("closeTimeWeekend", e.target.value)}
                  options={clockOptions}
                />
              </FormControl>
            </Cluster>
          </Stack>
        </section>

        {/* 必要人数 */}
        <section aria-labelledby="settings-headcount">
          <h3 id="settings-headcount" className="mb-2 text-sm font-semibold text-slate-700">
            必要人数
          </h3>
          <Cluster gap={1.5}>
            <FormControl label="原則の人数" helpMessage="下回ると警告">
              {numberField("normalRequired", 1, 20)}
            </FormControl>
            <FormControl label="ピーク時の人数">
              {numberField("peakRequired", 1, 20)}
            </FormControl>
            <FormControl label="開店・閉店時の必須人数" helpMessage="下回るとエラー">
              {numberField("edgeRequired", 1, 20)}
            </FormControl>
          </Cluster>
        </section>

        {/* 社員 */}
        <section aria-labelledby="settings-employee">
          <h3 id="settings-employee" className="mb-2 text-sm font-semibold text-slate-700">
            社員
          </h3>
          <FormControl
            label="月間休日の目標（日）"
            helpMessage="社員の休みがこの日数を下回ると警告。社員は1日に最低1人配置されます"
          >
            {numberField("employeeDaysOffTarget", 0, 31)}
          </FormControl>
        </section>

        {/* ピーク時間帯 */}
        <section aria-labelledby="settings-peak">
          <div className="mb-2 flex items-center justify-between">
            <h3 id="settings-peak" className="text-sm font-semibold text-slate-700">
              ピーク時間帯
            </h3>
            <button
              type="button"
              onClick={() =>
                setForm((f) => ({
                  ...f,
                  peakHours: [...f.peakHours, { start: "12:00", end: "14:00" }],
                }))
              }
              className="flex items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
            >
              <Icon name="add" size={14} />
              追加
            </button>
          </div>
          {form.peakHours.length === 0 ? (
            <p className="text-xs text-slate-400">ピーク時間帯なし</p>
          ) : (
            <Stack gap={0.75}>
              {form.peakHours.map((p, i) => (
                <div key={i} className="flex items-center gap-2">
                  <label className="sr-only" htmlFor={`peak-start-${i}`}>
                    ピーク{i + 1} 開始
                  </label>
                  <Select
                    id={`peak-start-${i}`}
                    value={p.start}
                    onChange={(e) => setPeak(i, { start: e.target.value })}
                    options={clockOptions}
                  />
                  <span aria-hidden className="text-slate-400">
                    –
                  </span>
                  <label className="sr-only" htmlFor={`peak-end-${i}`}>
                    ピーク{i + 1} 終了
                  </label>
                  <Select
                    id={`peak-end-${i}`}
                    value={p.end}
                    onChange={(e) => setPeak(i, { end: e.target.value })}
                    options={clockOptions}
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setForm((f) => ({
                        ...f,
                        peakHours: f.peakHours.filter((_, j) => j !== i),
                      }))
                    }
                    aria-label={`ピーク時間帯${i + 1}を削除`}
                    className="rounded-md p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                  >
                    <Icon name="delete" size={16} />
                  </button>
                </div>
              ))}
            </Stack>
          )}
        </section>

        {/* 休憩 */}
        <section aria-labelledby="settings-break">
          <h3 id="settings-break" className="mb-2 text-sm font-semibold text-slate-700">
            休憩
          </h3>
          <label className="flex cursor-pointer items-start gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={form.strictBreakMode}
              onChange={(e) => setField("strictBreakMode", e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-indigo-600"
            />
            <span>
              休憩中の人数割れもエラーにする
              <span className="block text-xs text-slate-400">
                オフの場合、休憩による一時的な不足は警告として表示します
              </span>
            </span>
          </label>
        </section>

        {error && (
          <p role="alert" className="flex items-center gap-1.5 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">
            <Icon name="error" size={14} />
            {error}
          </p>
        )}

        <div className="flex justify-end border-t border-slate-100 pt-3">
          <button
            type="button"
            onClick={() => setForm(DEFAULT_SETTINGS)}
            className="flex items-center gap-1 rounded-md px-2.5 py-1 text-xs text-slate-500 hover:bg-slate-100 hover:text-slate-700"
          >
            <Icon name="restart_alt" size={14} />
            既定値に戻す
          </button>
        </div>
      </Stack>
    </ControlledActionDialog>
  );
}
