"use client";

import { useState } from "react";
import { ControlledActionDialog, Select } from "smarthr-ui";
import type { ShopSettings, TimeRange } from "@/types";
import { DEFAULT_SETTINGS } from "@/types";
import { useAppStore } from "@/stores/useAppStore";
import Icon from "@/components/Icon";

/** 6:00〜24:00 の30分刻み */
const CLOCK_OPTIONS: string[] = [];
for (let m = 6 * 60; m <= 24 * 60; m += 30) {
  CLOCK_OPTIONS.push(
    `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`,
  );
}
const clockOptions = CLOCK_OPTIONS.map((t) => ({ value: t, label: t }));

function SectionCard({
  icon,
  title,
  children,
}: {
  icon: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-slate-50/60 p-5">
      <h3 className="mb-4 flex items-center gap-2 px-0.5 py-1 text-sm font-semibold text-slate-800">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
          <Icon name={icon} size={16} />
        </span>
        {title}
      </h3>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

/** ラベル列を揃えた設定行 */
function SettingRow({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[8.5rem_minmax(0,1fr)] items-center gap-3 px-0.5 py-1">
      <div className="min-w-0 py-0.5">
        <p className="truncate text-xs font-medium text-slate-600">{label}</p>
        {hint && <p className="mt-0.5 truncate text-[10px] text-slate-400">{hint}</p>}
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

function Stepper({
  value,
  min,
  max,
  unit,
  onChange,
  ariaLabel,
}: {
  value: number;
  min: number;
  max: number;
  unit: string;
  onChange: (n: number) => void;
  ariaLabel: string;
}) {
  return (
    <div
      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white"
      role="group"
      aria-label={ariaLabel}
    >
      <button
        type="button"
        aria-label={`${ariaLabel}を減らす`}
        disabled={value <= min}
        onClick={() => onChange(Math.max(min, value - 1))}
        className="flex h-9 w-9 items-center justify-center text-slate-500 hover:bg-slate-50 disabled:opacity-40"
      >
        <Icon name="remove" size={16} />
      </button>
      <span className="min-w-[3.5rem] text-center text-base font-bold tabular-nums text-slate-800">
        {value}
        <span className="ml-0.5 text-[10px] font-medium text-slate-400">{unit}</span>
      </span>
      <button
        type="button"
        aria-label={`${ariaLabel}を増やす`}
        disabled={value >= max}
        onClick={() => onChange(Math.min(max, value + 1))}
        className="flex h-9 w-9 items-center justify-center text-slate-500 hover:bg-slate-50 disabled:opacity-40"
      >
        <Icon name="add" size={16} />
      </button>
    </div>
  );
}

export default function SettingsModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const settings = useAppStore((s) => s.settings);
  const updateSettings = useAppStore((s) => s.updateSettings);

  const [form, setForm] = useState<ShopSettings>(settings);
  const [error, setError] = useState<string | null>(null);

  const setField = <K extends keyof ShopSettings>(key: K, value: ShopSettings[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const setPeak = (index: number, patch: Partial<TimeRange>) =>
    setForm((f) => ({
      ...f,
      peakHours: f.peakHours.map((p, i) => (i === index ? { ...p, ...patch } : p)),
    }));

  const validate = (): string | null => {
    if (form.openTime >= form.closeTimeWeekday) {
      return "日〜木の閉店は開店より後にしてください";
    }
    if (form.openTime >= form.closeTimeWeekend) {
      return "金・土の閉店は開店より後にしてください";
    }
    for (const p of form.peakHours) {
      if (p.start >= p.end) return "ピークの終了は開始より後にしてください";
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
      width={560}
      className="settings-dialog"
    >
      <h1 className="mb-5 text-2xl font-bold leading-tight tracking-tight text-slate-900">
        シフト作成の条件設定
      </h1>
      <div className="space-y-3">
        <SectionCard icon="schedule" title="営業時間">
          <SettingRow label="開店">
            <Select
              value={form.openTime}
              onChange={(e) => setField("openTime", e.target.value)}
              options={clockOptions}
            />
          </SettingRow>
          <SettingRow label="閉店・平日" hint="日〜木">
            <Select
              value={form.closeTimeWeekday}
              onChange={(e) => setField("closeTimeWeekday", e.target.value)}
              options={clockOptions}
            />
          </SettingRow>
          <SettingRow label="閉店・金土" hint="金・土">
            <Select
              value={form.closeTimeWeekend}
              onChange={(e) => setField("closeTimeWeekend", e.target.value)}
              options={clockOptions}
            />
          </SettingRow>
        </SectionCard>

        <SectionCard icon="groups" title="必要人数">
          <SettingRow label="通常" hint="不足で警告">
            <Stepper
              value={form.normalRequired}
              min={1}
              max={20}
              unit="人"
              ariaLabel="原則の人数"
              onChange={(n) => setField("normalRequired", n)}
            />
          </SettingRow>
          <SettingRow label="ピーク">
            <Stepper
              value={form.peakRequired}
              min={1}
              max={20}
              unit="人"
              ariaLabel="ピーク時の人数"
              onChange={(n) => setField("peakRequired", n)}
            />
          </SettingRow>
          <SettingRow label="開店・閉店" hint="不足でエラー">
            <Stepper
              value={form.edgeRequired}
              min={1}
              max={20}
              unit="人"
              ariaLabel="開店閉店時の必須人数"
              onChange={(n) => setField("edgeRequired", n)}
            />
          </SettingRow>
        </SectionCard>

        <SectionCard icon="badge" title="社員">
          <SettingRow label="月間休日" hint="目標">
            <Stepper
              value={form.employeeDaysOffTarget}
              min={0}
              max={31}
              unit="日"
              ariaLabel="月間休日の目標"
              onChange={(n) => setField("employeeDaysOffTarget", n)}
            />
          </SettingRow>
          <SettingRow label="週の最低労働時間" hint="不足でエラー">
            <Stepper
              value={form.employeeMinHoursPerWeek}
              min={0}
              max={60}
              unit="時間"
              ariaLabel="社員の週最低労働時間"
              onChange={(n) => setField("employeeMinHoursPerWeek", n)}
            />
          </SettingRow>
          <SettingRow label="週の最低出勤日数" hint="不足でエラー">
            <Stepper
              value={form.employeeMinDaysPerWeek}
              min={0}
              max={7}
              unit="日"
              ariaLabel="社員の週最低出勤日数"
              onChange={(n) => setField("employeeMinDaysPerWeek", n)}
            />
          </SettingRow>
        </SectionCard>

        <SectionCard icon="trending_up" title="ピーク時間帯">
          <div className="mb-1 flex justify-end">
            <button
              type="button"
              onClick={() =>
                setForm((f) => ({
                  ...f,
                  peakHours: [...f.peakHours, { start: "12:00", end: "14:00" }],
                }))
              }
              className="flex items-center gap-1 rounded-md bg-white px-2.5 py-1 text-xs font-medium text-blue-600 ring-1 ring-blue-200 hover:bg-blue-50"
            >
              <Icon name="add" size={14} />
              追加
            </button>
          </div>
          {form.peakHours.length === 0 ? (
            <p className="py-2 text-center text-xs text-slate-400">未設定</p>
          ) : (
            <ul className="space-y-2">
              {form.peakHours.map((p, i) => (
                <li
                  key={i}
                  className="grid grid-cols-[8.5rem_minmax(0,1fr)_auto] items-center gap-3"
                >
                  <span className="text-xs font-medium text-slate-500">帯 {i + 1}</span>
                  <div className="flex min-w-0 items-center gap-1.5">
                    <label className="sr-only" htmlFor={`peak-start-${i}`}>
                      ピーク{i + 1} 開始
                    </label>
                    <Select
                      id={`peak-start-${i}`}
                      value={p.start}
                      onChange={(e) => setPeak(i, { start: e.target.value })}
                      options={clockOptions}
                    />
                    <span aria-hidden className="shrink-0 text-slate-400">
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
                  </div>
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
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        {error && (
          <p
            role="alert"
            className="flex items-center gap-1.5 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700"
          >
            <Icon name="error" size={14} />
            {error}
          </p>
        )}

        <div className="flex justify-end pt-1">
          <button
            type="button"
            onClick={() => setForm(DEFAULT_SETTINGS)}
            className="flex items-center gap-1 rounded-md px-2.5 py-1 text-xs text-slate-500 hover:bg-slate-100 hover:text-slate-700"
          >
            <Icon name="restart_alt" size={14} />
            既定値に戻す
          </button>
        </div>
      </div>
    </ControlledActionDialog>
  );
}
