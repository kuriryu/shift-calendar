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
import type { Role, Staff } from "@/types";
import { ROLE_LABELS } from "@/types";
import { parseSpecialNote } from "@/lib/notes";
import { timeOptionsOf } from "@/lib/coverage";
import { useAppStore } from "@/stores/useAppStore";

const WEEKDAY_NAMES = ["日", "月", "火", "水", "木", "金", "土"];

export default function StaffEditModal({
  staff,
  isOpen,
  onClose,
}: {
  /** null のとき新規登録モード */
  staff: Staff | null;
  isOpen: boolean;
  onClose: () => void;
}) {
  const updateStaff = useAppStore((s) => s.updateStaff);
  const addStaff = useAppStore((s) => s.addStaff);
  const settings = useAppStore((s) => s.settings);
  const TIME_OPTIONS = useMemo(() => timeOptionsOf(settings), [settings]);

  const [name, setName] = useState(staff?.name ?? "");
  const [role, setRole] = useState<Role>(staff?.role ?? "part_time");
  const [maxHours, setMaxHours] = useState(String(staff?.maxHoursPerWeek ?? 20));
  const [maxConsec, setMaxConsec] = useState(
    String(staff?.maxConsecutiveDays ?? 3),
  );
  const [patternStart, setPatternStart] = useState(
    staff?.defaultPattern?.start ?? "",
  );
  const [patternEnd, setPatternEnd] = useState(staff?.defaultPattern?.end ?? "");
  const [offWeekdays, setOffWeekdays] = useState<number[]>(
    staff?.unavailableWeekdays ?? [],
  );
  const [specialNote, setSpecialNote] = useState(staff?.specialNote ?? "");

  // 別のスタッフで開き直したときに初期化
  useEffect(() => {
    if (!isOpen) return;
    setName(staff?.name ?? "");
    setRole(staff?.role ?? "part_time");
    setMaxHours(String(staff?.maxHoursPerWeek ?? 20));
    setMaxConsec(String(staff?.maxConsecutiveDays ?? 3));
    setPatternStart(staff?.defaultPattern?.start ?? "");
    setPatternEnd(staff?.defaultPattern?.end ?? "");
    setOffWeekdays(staff?.unavailableWeekdays ?? []);
    setSpecialNote(staff?.specialNote ?? "");
  }, [staff, isOpen]);

  const parsed = useMemo(() => parseSpecialNote(specialNote), [specialNote]);

  const toggleWeekday = (d: number) =>
    setOffWeekdays((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort(),
    );

  const save = () => {
    const base = {
      name: name.trim() || (staff?.name ?? "新しいスタッフ"),
      role,
      maxHoursPerWeek: Number(maxHours) || 0,
      maxConsecutiveDays: Number(maxConsec) || 1,
      // 社員の月間休日目標（判定は店舗設定を参照。新規は設定値を保持）
      monthlyDaysOffTarget:
        staff?.monthlyDaysOffTarget ??
        (role === "employee" ? settings.employeeDaysOffTarget : 0),
      defaultPattern:
        patternStart && patternEnd && patternStart < patternEnd
          ? { start: patternStart, end: patternEnd }
          : undefined,
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
      onClickAction={() => save()}
      onClickClose={onClose}
      onClickOverlay={onClose}
      width={560}
    >
      <Stack gap={1.5}>
        <FormControl label="名前">
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </FormControl>

        <FormControl label="属性">
          <Select
            value={role}
            onChange={(e) => setRole(e.target.value as Role)}
            options={(Object.keys(ROLE_LABELS) as Role[]).map((r) => ({
              value: r,
              label: ROLE_LABELS[r],
            }))}
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

        <FormControl label="基本パターン（未入力日に自動適用）">
          <Cluster gap={0.5} align="center">
              <Select
                value={patternStart}
                onChange={(e) => setPatternStart(e.target.value)}
                options={[
                  { value: "", label: "なし" },
                  ...TIME_OPTIONS.map((t) => ({ value: t, label: t })),
                ]}
              />
              <span>–</span>
              <Select
                value={patternEnd}
                onChange={(e) => setPatternEnd(e.target.value)}
                options={[
                  { value: "", label: "なし" },
                  ...TIME_OPTIONS.map((t) => ({ value: t, label: t })),
                ]}
              />
          </Cluster>
        </FormControl>

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
                <p className="mb-1 text-[10px] font-semibold text-slate-500">
                  AIの解釈結果
                </p>
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
