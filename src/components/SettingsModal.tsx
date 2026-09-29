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
  note,
  action,
  children,
}: {
  icon: string;
  title: string;
  note?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="flex h-full min-w-0 flex-col rounded-xl border border-slate-200 bg-slate-50/60 p-5">
      <h3 className="mb-4 flex h-9 items-center gap-2 px-0.5 text-sm font-semibold text-slate-800">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
          <Icon name={icon} size={16} />
        </span>
        <span className="flex min-w-0 items-baseline gap-2">
          <span className="shrink-0">{title}</span>
          {note && (
            <span className="truncate text-[11px] font-normal text-slate-400">{note}</span>
          )}
        </span>
        {action && <span className="ml-auto shrink-0">{action}</span>}
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
    <div className="grid h-12 min-w-0 grid-cols-[minmax(0,8.5rem)_minmax(6.5rem,1fr)] items-center gap-3 px-0.5">
      <div className="min-w-0">
        <p className="truncate text-xs font-medium leading-4 text-slate-600">{label}</p>
        {hint && <p className="mt-0.5 truncate text-[10px] leading-3 text-slate-400">{hint}</p>}
      </div>
      <div className="flex min-w-0 items-center">{children}</div>
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
      className="flex h-[42px] w-36 items-center rounded-lg border border-slate-200 bg-white"
      role="group"
      aria-label={ariaLabel}
    >
      <button
        type="button"
        aria-label={`${ariaLabel}を減らす`}
        disabled={value <= min}
        onClick={() => onChange(Math.max(min, value - 1))}
        className="flex h-full w-9 shrink-0 items-center justify-center text-slate-500 hover:bg-slate-50 disabled:opacity-40"
      >
        <Icon name="remove" size={16} />
      </button>
      <span className="min-w-0 flex-1 text-center text-base font-bold tabular-nums text-slate-800">
        {value}
        <span className="ml-0.5 text-[10px] font-medium text-slate-400">{unit}</span>
      </span>
      <button
        type="button"
        aria-label={`${ariaLabel}を増やす`}
        disabled={value >= max}
        onClick={() => onChange(Math.min(max, value + 1))}
        className="flex h-full w-9 shrink-0 items-center justify-center text-slate-500 hover:bg-slate-50 disabled:opacity-40"
      >
        <Icon name="add" size={16} />
      </button>
    </div>
  );
}

function ClockField({
  id,
  label,
  value,
  onChange,
}: {
  id?: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="w-36 max-w-full">
      <label className="sr-only" htmlFor={id}>
        {label}
      </label>
      <Select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        options={clockOptions}
      />
    </div>
  );
}

export function settingsError(form: ShopSettings): string | null {
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
}

/** ステップ1と、自動生成で開ける条件設定で共通の入力欄 */
export function SettingsForm({
  form,
  setForm,
  error,
}: {
  form: ShopSettings;
  setForm: React.Dispatch<React.SetStateAction<ShopSettings>>;
  error: string | null;
}) {
  const setField = <K extends keyof ShopSettings>(key: K, value: ShopSettings[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const setPeak = (index: number, patch: Partial<TimeRange>) =>
    setForm((f) => ({
      ...f,
      peakHours: f.peakHours.map((p, i) => (i === index ? { ...p, ...patch } : p)),
    }));

  return (
    <div className="settings-fields space-y-3">
      <div className="grid grid-cols-1 items-stretch gap-3 md:grid-cols-2">
          <SectionCard icon="schedule" title="営業時間">
            <SettingRow label="開店">
              <ClockField
                id="open-time"
                label="開店"
                value={form.openTime}
                onChange={(value) => setField("openTime", value)}
              />
            </SettingRow>
            <SettingRow label="閉店・平日" hint="日〜木">
              <ClockField
                id="close-weekday"
                label="閉店・平日"
                value={form.closeTimeWeekday}
                onChange={(value) => setField("closeTimeWeekday", value)}
              />
            </SettingRow>
            <SettingRow label="閉店・金土" hint="金・土">
              <ClockField
                id="close-weekend"
                label="閉店・金土"
                value={form.closeTimeWeekend}
                onChange={(value) => setField("closeTimeWeekend", value)}
              />
            </SettingRow>
          </SectionCard>

          <SectionCard
            icon="groups"
            title="必要人数"
            note="ぴったりの人数としてカウントされます"
          >
            <SettingRow label="通常">
              <Stepper
                value={form.normalRequired}
                min={1}
                max={20}
                unit="人"
                ariaLabel="通常の人数"
                onChange={(n) => setField("normalRequired", n)}
              />
            </SettingRow>
            <SettingRow label="ピーク">
              <Stepper
                value={form.peakRequired}
                min={1}
                max={20}
                unit="人"
                ariaLabel="ピークの人数"
                onChange={(n) => setField("peakRequired", n)}
              />
            </SettingRow>
            <SettingRow label="開店・閉店">
              <Stepper
                value={form.edgeRequired}
                min={1}
                max={20}
                unit="人"
                ariaLabel="開店・閉店の人数"
                onChange={(n) => setField("edgeRequired", n)}
              />
            </SettingRow>
          </SectionCard>

          <SectionCard icon="badge" title="正社員">
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
                ariaLabel="正社員の週最低労働時間"
                onChange={(n) => setField("employeeMinHoursPerWeek", n)}
              />
            </SettingRow>
            <SettingRow label="週の最低出勤日数" hint="不足でエラー">
              <Stepper
                value={form.employeeMinDaysPerWeek}
                min={0}
                max={7}
                unit="日"
                ariaLabel="正社員の週最低出勤日数"
                onChange={(n) => setField("employeeMinDaysPerWeek", n)}
              />
            </SettingRow>
          </SectionCard>

          <SectionCard
            icon="trending_up"
            title="ピーク時間帯"
            action={
              <button
                type="button"
                onClick={() =>
                  setForm((f) => ({
                    ...f,
                    peakHours: [...f.peakHours, { start: "12:00", end: "14:00" }],
                  }))
                }
                className="flex h-7 items-center gap-1 rounded-md bg-white px-2.5 text-xs font-medium text-blue-600 ring-1 ring-blue-200 hover:bg-blue-50"
              >
                <Icon name="add" size={14} />
                追加
              </button>
            }
          >
            {form.peakHours.length === 0 ? (
              <p className="flex h-12 items-center px-0.5 text-xs text-slate-400">未設定</p>
            ) : (
              <ul className="list-none space-y-3 p-0">
                {form.peakHours.map((p, i) => (
                  <li key={i}>
                    <SettingRow label={`帯 ${i + 1}`}>
                      <div className="flex min-w-0 flex-1 items-center gap-1.5">
                        <div className="min-w-0 flex-1">
                          <label className="sr-only" htmlFor={`peak-start-${i}`}>
                            ピーク{i + 1} 開始
                          </label>
                          <Select
                            id={`peak-start-${i}`}
                            value={p.start}
                            onChange={(e) => setPeak(i, { start: e.target.value })}
                            options={clockOptions}
                          />
                        </div>
                        <span aria-hidden className="shrink-0 text-slate-400">
                          –
                        </span>
                        <div className="min-w-0 flex-1">
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
                          className="flex h-[42px] w-9 shrink-0 items-center justify-center rounded-md text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                        >
                          <Icon name="delete" size={16} />
                        </button>
                      </div>
                    </SettingRow>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>

          <SectionCard icon="hourglass_bottom" title="1日の最低時間">
            <SettingRow label="1回の勤務" hint="短いと警告">
              <Stepper
                value={form.minShiftHours ?? 4}
                min={1}
                max={12}
                unit="時間"
                ariaLabel="1日の最低時間"
                onChange={(n) => setField("minShiftHours", n)}
              />
            </SettingRow>
          </SectionCard>

          <SectionCard icon="timer" title="全体の労働時間">
            <SettingRow label="月の上限" hint="0は上限なし">
              <div className="labor-hours-field flex h-[42px] w-36 max-w-full items-center gap-1 rounded-md border border-slate-200 bg-white px-2">
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  aria-label="全体の労働時間の月の上限"
                  value={String(form.totalLaborHoursLimit ?? 0)}
                  onFocus={(e) => {
                    if ((form.totalLaborHoursLimit ?? 0) === 0) e.currentTarget.select();
                  }}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, "");
                    const normalized = digits.replace(/^0+(?=\d)/, "");
                    const next = normalized === "" ? 0 : Number(normalized);
                    setField("totalLaborHoursLimit", Math.min(9999, next));
                  }}
                  className="box-border min-w-0 flex-1 appearance-none border-0 bg-transparent text-slate-700 tabular-nums outline-none"
                />
                <span className="shrink-0 text-xs text-slate-500">時間</span>
              </div>
            </SettingRow>
          </SectionCard>
      </div>

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

  const save = () => {
    const err = settingsError(form);
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
      width={960}
      className="settings-dialog"
    >
      <h1 className="mb-5 text-2xl font-bold leading-tight tracking-tight text-slate-900">
        シフト作成の条件設定
      </h1>
      <SettingsForm form={form} setForm={setForm} error={error} />
    </ControlledActionDialog>
  );
}
