"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Cluster,
  ControlledActionDialog,
  FormControl,
  Input,
  Select,
  Stack,
  Textarea,
} from "smarthr-ui";
import type { Role, Staff, TimeRange } from "@/types";
import { ROLE_LABELS } from "@/types";
import { ROLE_META } from "@/lib/roles";
import { parseSpecialNote } from "@/lib/notes";
import { timeOptionsOf } from "@/lib/coverage";
import { migrateStaffPatterns } from "@/lib/staff-pattern";
import { useAppStore } from "@/stores/useAppStore";

const WEEKDAY_NAMES = ["日", "月", "火", "水", "木", "金", "土"];

function patternError(start: string, end: string): string | null {
  if (!start || !end) return null;
  if (start >= end) {
    return "終了時刻は開始時刻より後にしてください";
  }
  return null;
}

function PatternFields({
  label,
  start,
  end,
  onStart,
  onEnd,
  options,
  error,
}: {
  label: string;
  start: string;
  end: string;
  onStart: (v: string) => void;
  onEnd: (v: string) => void;
  options: string[];
  error: string | null;
}) {
  return (
    <FormControl label={label}>
      <Stack gap={0.5}>
        <Cluster gap={0.5} align="center">
          <Select
            value={start}
            onChange={(e) => onStart(e.target.value)}
            options={[
              { value: "", label: "なし" },
              ...options.map((t) => ({ value: t, label: t })),
            ]}
          />
          <span>–</span>
          <Select
            value={end}
            onChange={(e) => onEnd(e.target.value)}
            options={[
              { value: "", label: "なし" },
              ...options.map((t) => ({ value: t, label: t })),
            ]}
          />
        </Cluster>
        {error && (
          <p role="alert" className="text-xs text-red-600">
            {error}
          </p>
        )}
      </Stack>
    </FormControl>
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
  const settings = useAppStore((s) => s.settings);
  const TIME_OPTIONS = useMemo(() => timeOptionsOf(settings), [settings]);

  const seeded = staff ? migrateStaffPatterns(staff) : null;

  const [name, setName] = useState(seeded?.name ?? "");
  const [role, setRole] = useState<Role | "">(seeded?.role ?? "");
  const [maxHours, setMaxHours] = useState(String(seeded?.maxHoursPerWeek ?? 20));
  const [maxConsec, setMaxConsec] = useState(String(seeded?.maxConsecutiveDays ?? 3));
  const [weekdayStart, setWeekdayStart] = useState(seeded?.weekdayPattern?.start ?? "");
  const [weekdayEnd, setWeekdayEnd] = useState(seeded?.weekdayPattern?.end ?? "");
  const [weekendStart, setWeekendStart] = useState(seeded?.weekendPattern?.start ?? "");
  const [weekendEnd, setWeekendEnd] = useState(seeded?.weekendPattern?.end ?? "");
  const [offWeekdays, setOffWeekdays] = useState<number[]>(seeded?.unavailableWeekdays ?? []);
  const [specialNote, setSpecialNote] = useState(seeded?.specialNote ?? "");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const s = staff ? migrateStaffPatterns(staff) : null;
    setName(s?.name ?? "");
    setRole(s?.role ?? "");
    setMaxHours(String(s?.maxHoursPerWeek ?? 20));
    setMaxConsec(String(s?.maxConsecutiveDays ?? 3));
    setWeekdayStart(s?.weekdayPattern?.start ?? "");
    setWeekdayEnd(s?.weekdayPattern?.end ?? "");
    setWeekendStart(s?.weekendPattern?.start ?? "");
    setWeekendEnd(s?.weekendPattern?.end ?? "");
    setOffWeekdays(s?.unavailableWeekdays ?? []);
    setSpecialNote(s?.specialNote ?? "");
    setError(null);
  }, [staff, isOpen]);

  const parsed = useMemo(() => parseSpecialNote(specialNote), [specialNote]);

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
      maxHoursPerWeek: Number(maxHours) || 0,
      maxConsecutiveDays: Number(maxConsec) || 1,
      monthlyDaysOffTarget:
        staff?.monthlyDaysOffTarget ??
        (role === "employee" ? settings.employeeDaysOffTarget : 0),
      weekdayPattern: toPattern(weekdayStart, weekdayEnd),
      weekendPattern: toPattern(weekendStart, weekendEnd),
      // 旧フィールドはクリア
      defaultPattern: undefined,
      unavailableWeekdays: offWeekdays.length > 0 ? offWeekdays : undefined,
      specialNote: specialNote.trim() || undefined,
    };
    if (staff) {
      updateStaff({ ...staff, ...base });
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
      <Stack gap={1.5}>
        {error && (
          <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <FormControl label="名前（必須）">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例: 山田 太郎"
          />
        </FormControl>

        <FormControl label="属性（必須）">
          <Select
            value={role}
            onChange={(e) => setRole(e.target.value as Role | "")}
            options={[
              { value: "", label: "選択してください" },
              ...(Object.keys(ROLE_LABELS) as Role[]).map((r) => ({
                value: r,
                label: ROLE_META[r].label,
              })),
            ]}
          />
        </FormControl>

        <Cluster gap={1.5}>
          <FormControl label="週の上限時間">
            <Input
              type="number"
              value={maxHours}
              onChange={(e) => setMaxHours(e.target.value)}
            />
          </FormControl>
          <FormControl label="最大連勤日数">
            <Input
              type="number"
              value={maxConsec}
              onChange={(e) => setMaxConsec(e.target.value)}
            />
          </FormControl>
        </Cluster>

        <PatternFields
          label="基本パターン・平日（月〜金）"
          start={weekdayStart}
          end={weekdayEnd}
          onStart={setWeekdayStart}
          onEnd={setWeekdayEnd}
          options={TIME_OPTIONS}
          error={weekdayErr}
        />
        <PatternFields
          label="基本パターン・休日（土・日）"
          start={weekendStart}
          end={weekendEnd}
          onStart={setWeekendStart}
          onEnd={setWeekendEnd}
          options={TIME_OPTIONS}
          error={weekendErr}
        />

        <FormControl label="固定休（毎週休みの曜日）">
          <Cluster gap={0.5}>
            {WEEKDAY_NAMES.map((label, d) => (
              <label
                key={d}
                className={`flex cursor-pointer items-center gap-1 rounded-full border px-2.5 py-1 text-xs ${
                  offWeekdays.includes(d)
                    ? "border-indigo-400 bg-indigo-50 font-semibold text-indigo-700"
                    : "border-slate-200 text-slate-500 hover:bg-slate-50"
                }`}
              >
                <input
                  type="checkbox"
                  className="hidden"
                  checked={offWeekdays.includes(d)}
                  onChange={() => toggleWeekday(d)}
                />
                {label}
              </label>
            ))}
          </Cluster>
        </FormControl>

        <FormControl label="特別な要望（任意・AIが解釈して生成に反映）">
          <Stack gap={0.5}>
            <Textarea
              value={specialNote}
              onChange={(e) => setSpecialNote(e.target.value)}
              rows={3}
              placeholder="例: 水曜は休み、17時まで、週2日まで"
            />
            <div className="rounded-lg bg-slate-50 px-3 py-2">
              <p className="mb-1 text-[10px] font-semibold text-slate-500">AIの解釈結果</p>
              {specialNote.trim() === "" ? (
                <p className="text-xs text-slate-400">（未入力）</p>
              ) : (
                <ul className="list-inside list-disc space-y-0.5">
                  {parsed.summary.map((s, i) => (
                    <li key={i} className="text-xs text-slate-700">
                      {s}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Stack>
        </FormControl>
      </Stack>
    </ControlledActionDialog>
  );
}
