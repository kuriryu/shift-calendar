"use client";

import { useEffect, useMemo, useState } from "react";
import { ControlledActionDialog } from "smarthr-ui";
import type { Role, Staff, TimeRange } from "@/types";
import { ROLE_LABELS } from "@/types";
import { ROLE_META } from "@/lib/roles";
import { timeOptionsOf } from "@/lib/coverage";
import { migrateStaffPatterns } from "@/lib/staff-pattern";
import { useAppStore } from "@/stores/useAppStore";
import FieldControl, { FieldInput, FieldSelect } from "@/components/FieldControl";

const WEEKDAY_NAMES = ["日", "月", "火", "水", "木", "金", "土"];

/** 労基法32条: 週の法定労働時間は40時間 */
const WEEKLY_HOUR_PRESETS = [8, 12, 16, 20, 24, 28, 32, 36, 40];
/** 連勤は7日まで選べる */
const CONSECUTIVE_DAY_PRESETS = [1, 2, 3, 4, 5, 6, 7];
/** 暦の最大日数 */
const MONTHLY_DAY_PRESETS = Array.from({ length: 31 }, (_, i) => i + 1);
/** 週40時間の月換算（40 × 52 / 12 ≒ 173時間）まで */
const MONTHLY_HOUR_PRESETS = [10, 20, 40, 60, 80, 100, 120, 140, 160, 173];

function selectValues(presets: number[], current: string): string[] {
  const n = Number(current);
  const values = [...presets];
  if (current && Number.isFinite(n) && n > 0 && !values.includes(n)) {
    values.push(n);
    values.sort((a, b) => a - b);
  }
  return values.map(String);
}

/** 0 と未保存は未設定 */
function storedChoice(value: number | undefined): string {
  return value != null && value > 0 ? String(value) : "";
}

function patternError(start: string, end: string): string | null {
  if (!start || !end) return null;
  if (start >= end) {
    return "終了時刻は開始時刻より後にしてください";
  }
  return null;
}

function PatternFields({
  id,
  label,
  start,
  end,
  onStart,
  onEnd,
  options,
  error,
}: {
  id: string;
  label: string;
  start: string;
  end: string;
  onStart: (v: string) => void;
  onEnd: (v: string) => void;
  options: string[];
  error: string | null;
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium leading-4 text-slate-500">{label}</p>
      <div className="flex items-end gap-2">
        <FieldControl id={`${id}-start`} label="開始">
          <FieldSelect
            id={`${id}-start`}
            value={start}
            onChange={(e) => onStart(e.target.value)}
            className="tabular-nums"
          >
            <option value="">なし</option>
            {options.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </FieldSelect>
        </FieldControl>
        <span className="pb-3 text-xs text-slate-400" aria-hidden>
          〜
        </span>
        <FieldControl id={`${id}-end`} label="終了">
          <FieldSelect
            id={`${id}-end`}
            value={end}
            onChange={(e) => onEnd(e.target.value)}
            className="tabular-nums"
          >
            <option value="">なし</option>
            {options.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </FieldSelect>
        </FieldControl>
      </div>
      {error && (
        <p role="alert" className="text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}

function toPattern(start: string, end: string): TimeRange | undefined {
  return start && end && start < end ? { start, end } : undefined;
}

export default function StaffEditModal({
  staff,
  isOpen,
  onClose,
}: {
  staff: Staff | null;
  isOpen: boolean;
  onClose: () => void;
}) {
  const updateStaff = useAppStore((s) => s.updateStaff);
  const addStaff = useAppStore((s) => s.addStaff);
  const removeStaff = useAppStore((s) => s.removeStaff);
  const settings = useAppStore((s) => s.settings);
  const TIME_OPTIONS = useMemo(() => timeOptionsOf(settings), [settings]);

  const seeded = staff ? migrateStaffPatterns(staff) : null;

  const [name, setName] = useState(seeded?.name ?? "");
  const [role, setRole] = useState<Role | "">(seeded?.role ?? "");
  const [maxHours, setMaxHours] = useState(storedChoice(seeded?.maxHoursPerWeek));
  const [maxConsec, setMaxConsec] = useState(storedChoice(seeded?.maxConsecutiveDays));
  const [desiredDays, setDesiredDays] = useState(storedChoice(seeded?.desiredWorkDays));
  const [desiredHours, setDesiredHours] = useState(storedChoice(seeded?.desiredMonthlyHours));
  const [weekdayStart, setWeekdayStart] = useState(seeded?.weekdayPattern?.start ?? "");
  const [weekdayEnd, setWeekdayEnd] = useState(seeded?.weekdayPattern?.end ?? "");
  const [weekendStart, setWeekendStart] = useState(seeded?.weekendPattern?.start ?? "");
  const [weekendEnd, setWeekendEnd] = useState(seeded?.weekendPattern?.end ?? "");
  const [offWeekdays, setOffWeekdays] = useState<number[]>(seeded?.unavailableWeekdays ?? []);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const s = staff ? migrateStaffPatterns(staff) : null;
    setName(s?.name ?? "");
    setRole(s?.role ?? "");
    setMaxHours(storedChoice(s?.maxHoursPerWeek));
    setMaxConsec(storedChoice(s?.maxConsecutiveDays));
    setDesiredDays(storedChoice(s?.desiredWorkDays));
    setDesiredHours(storedChoice(s?.desiredMonthlyHours));
    setWeekdayStart(s?.weekdayPattern?.start ?? "");
    setWeekdayEnd(s?.weekdayPattern?.end ?? "");
    setWeekendStart(s?.weekendPattern?.start ?? "");
    setWeekendEnd(s?.weekendPattern?.end ?? "");
    setOffWeekdays(s?.unavailableWeekdays ?? []);
    setError(null);
  }, [staff, isOpen]);

  const weekdayErr = patternError(weekdayStart, weekdayEnd);
  const weekendErr = patternError(weekendStart, weekendEnd);
  const hasPatternError = !!(weekdayErr || weekendErr);

  const toggleWeekday = (d: number) =>
    setOffWeekdays((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort(),
    );

  const save = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("名前を入力してください");
      return;
    }
    if (!role) {
      setError("属性を選択してください");
      return;
    }
    if (hasPatternError) {
      setError("基本パターンの時刻を修正してください");
      return;
    }
    setError(null);
    const base = {
      name: trimmed,
      role,
      maxHoursPerWeek: Number(maxHours) > 0 ? Number(maxHours) : 0,
      maxConsecutiveDays: Number(maxConsec) > 0 ? Number(maxConsec) : 0,
      desiredWorkDays: Number(desiredDays) > 0 ? Number(desiredDays) : undefined,
      desiredMonthlyHours: Number(desiredHours) > 0 ? Number(desiredHours) : undefined,
      monthlyDaysOffTarget:
        staff?.monthlyDaysOffTarget ??
        (role === "employee" ? settings.employeeDaysOffTarget : 0),
      weekdayPattern: toPattern(weekdayStart, weekdayEnd),
      weekendPattern: toPattern(weekendStart, weekendEnd),
      defaultPattern: undefined,
      unavailableWeekdays: offWeekdays.length > 0 ? offWeekdays : undefined,
    };
    if (staff) {
      const next = { ...staff, ...base };
      delete next.specialNote;
      updateStaff(next);
    } else {
      addStaff(base);
    }
    onClose();
  };

  return (
    <ControlledActionDialog
      isOpen={isOpen}
      heading={staff ? `${staff.name} の編集` : "スタッフを新規登録"}
      actionButton={{
        text: staff ? "保存する" : "登録する",
        theme: "primary",
      }}
      onClickAction={() => {
        if (hasPatternError) return;
        save();
      }}
      onClickClose={onClose}
      onClickOverlay={onClose}
      width={560}
      className="staff-edit-dialog"
    >
      <div className="space-y-4">
        {error && (
          <div className="py-4">
            <p role="alert" className="rounded-md bg-red-50 px-4 py-2 text-sm text-red-700">
              {error}
            </p>
          </div>
        )}

        <FieldControl id="staff-name" label="名前" required hint="ニックネームでも可">
          <FieldInput
            id="staff-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例: 山田 太郎"
          />
        </FieldControl>

        <FieldControl id="staff-role" label="属性" required>
          <FieldSelect
            id="staff-role"
            value={role}
            onChange={(e) => setRole(e.target.value as Role | "")}
          >
            <option value="">選択してください</option>
            {(Object.keys(ROLE_LABELS) as Role[]).map((r) => (
              <option key={r} value={r}>
                {ROLE_META[r].label}
              </option>
            ))}
          </FieldSelect>
        </FieldControl>

        <div className="flex flex-wrap gap-4">
          <FieldControl id="staff-hours" label="週の上限時間">
            <FieldSelect
              id="staff-hours"
              value={maxHours}
              onChange={(e) => setMaxHours(e.target.value)}
              className="tabular-nums"
            >
              <option value="">未設定</option>
              {selectValues(WEEKLY_HOUR_PRESETS, maxHours).map((h) => (
                <option key={h} value={h}>
                  {h}時間
                </option>
              ))}
            </FieldSelect>
          </FieldControl>
          <FieldControl id="staff-consec" label="最大連勤日数">
            <FieldSelect
              id="staff-consec"
              value={maxConsec}
              onChange={(e) => setMaxConsec(e.target.value)}
              className="tabular-nums"
            >
              <option value="">未設定</option>
              {selectValues(CONSECUTIVE_DAY_PRESETS, maxConsec).map((d) => (
                <option key={d} value={d}>
                  {d}日
                </option>
              ))}
            </FieldSelect>
          </FieldControl>
        </div>

        <div className="flex flex-wrap gap-4">
          <FieldControl id="staff-desired-hours" label="月の希望の勤務時間">
            <FieldSelect
              id="staff-desired-hours"
              value={desiredHours}
              onChange={(e) => setDesiredHours(e.target.value)}
              className="tabular-nums"
            >
              <option value="">未設定</option>
              {selectValues(MONTHLY_HOUR_PRESETS, desiredHours).map((h) => (
                <option key={h} value={h}>
                  {h}時間
                </option>
              ))}
            </FieldSelect>
          </FieldControl>
          <FieldControl id="staff-desired-days" label="希望の勤務日数">
            <FieldSelect
              id="staff-desired-days"
              value={desiredDays}
              onChange={(e) => setDesiredDays(e.target.value)}
              className="tabular-nums"
            >
              <option value="">未設定</option>
              {selectValues(MONTHLY_DAY_PRESETS, desiredDays).map((d) => (
                <option key={d} value={d}>
                  {d}日
                </option>
              ))}
            </FieldSelect>
          </FieldControl>
        </div>

        <PatternFields
          id="weekday-pattern"
          label="基本パターン・平日（月〜金）"
          start={weekdayStart}
          end={weekdayEnd}
          onStart={setWeekdayStart}
          onEnd={setWeekdayEnd}
          options={TIME_OPTIONS}
          error={weekdayErr}
        />
        <PatternFields
          id="weekend-pattern"
          label="基本パターン・休日（土・日）"
          start={weekendStart}
          end={weekendEnd}
          onStart={setWeekendStart}
          onEnd={setWeekendEnd}
          options={TIME_OPTIONS}
          error={weekendErr}
        />

        <fieldset className="space-y-2">
          <legend className="text-xs font-medium leading-4 text-slate-500">
            固定休（毎週休みの曜日）
          </legend>
          <div className="flex flex-wrap gap-2">
            {WEEKDAY_NAMES.map((label, d) => (
              <label
                key={d}
                className={`inline-flex h-11 min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-md border px-4 text-sm ${
                  offWeekdays.includes(d)
                    ? "border-blue-600 bg-blue-600 font-semibold text-white"
                    : "border-slate-200 text-slate-700 hover:bg-slate-100"
                }`}
              >
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={offWeekdays.includes(d)}
                  onChange={() => toggleWeekday(d)}
                />
                {label}
              </label>
            ))}
          </div>
        </fieldset>

        {staff && (
          <div className="pt-2">
            <button
              type="button"
              onClick={() => {
                if (
                  window.confirm(
                    `${staff.name} を削除しますか？関連する希望・シフトも削除されます。`,
                  )
                ) {
                  removeStaff(staff.id);
                  onClose();
                }
              }}
              className="h-11 min-h-11 w-full rounded-md border border-red-200 bg-red-50 px-4 text-sm font-medium text-red-700 hover:bg-red-100 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
            >
              このスタッフを削除
            </button>
          </div>
        )}
      </div>
    </ControlledActionDialog>
  );
}
