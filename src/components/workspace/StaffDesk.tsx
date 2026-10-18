"use client";

import { FormEvent, useRef, useState } from "react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import PageShell from "@/components/ui/PageShell";
import { staffLabel } from "@/lib/store-book";
import { useAppStore } from "@/stores/useAppStore";
import { toast } from "@/stores/useToastStore";
import type { CoverageNeed, Role, Staff } from "@/types";
import { ROLE_LABELS } from "@/types";

const emptyForm = {
  familyName: "",
  minHours: "",
  minHoursUnset: true,
  coverage: "needs_employee" as CoverageNeed,
  role: "part_time" as Role,
};

export default function StaffDesk() {
  const staff = useAppStore((s) => s.staff);
  const addStaff = useAppStore((s) => s.addStaff);
  const updateStaff = useAppStore((s) => s.updateStaff);
  const removeStaff = useAppStore((s) => s.removeStaff);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState<string | null>(null);
  const minHoursInputRef = useRef<HTMLInputElement>(null);

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    const familyName = form.familyName.trim();
    if (!familyName) return;
    const payload = {
      name: familyName,
      familyName,
      role: form.role,
      maxHoursPerDay: 0,
      maxHoursPerWeek: 0,
      maxConsecutiveDays: 0,
      monthlyDaysOffTarget: form.role === "employee" ? 9 : 0,
      minHours: form.minHoursUnset ? 0 : Number(form.minHours) || 0,
      coverage: form.coverage,
    };
    if (editing) {
      const current = staff.find((member) => member.id === editing);
      if (!current) return;
      updateStaff({ ...current, ...payload });
      toast("保存しました");
    } else {
      addStaff(payload);
      toast("登録しました");
    }
    setForm(emptyForm);
    setEditing(null);
  };

  const startEdit = (member: Staff) => {
    setEditing(member.id);
    const hasMinHours = (member.minHours ?? 0) > 0;
    setForm({
      familyName: staffLabel(member),
      minHoursUnset: !hasMinHours,
      minHours: hasMinHours ? String(member.minHours) : "",
      coverage: member.coverage ?? (member.role === "employee" ? "alone" : "needs_employee"),
      role: member.role,
    });
  };

  return (
    <PageShell title="スタッフ">
      <form onSubmit={onSubmit}>
        <Card className="mt-6 grid max-w-xl gap-4">
        <label className="ds-label">
          名字のみ
          <input
            value={form.familyName}
            onChange={(event) => setForm({ ...form, familyName: event.target.value })}
            className="ds-input mt-2"
            required
          />
        </label>
        <div className="ds-label">
          1ヶ月あたりの最低時間
          <fieldset className="mt-2 border-0 p-0">
            <legend className="sr-only">1ヶ月あたりの最低時間の指定方法</legend>
            <div className="flex flex-wrap gap-4 text-sm text-slate-700">
              <label className="inline-flex cursor-pointer items-center gap-2">
                <input
                  type="radio"
                  name="minHoursMode"
                  checked={form.minHoursUnset}
                  onChange={() => setForm({ ...form, minHoursUnset: true, minHours: "" })}
                  className="h-4 w-4 accent-[var(--ds-action)]"
                />
                指定なし
              </label>
              <label className="inline-flex cursor-pointer items-center gap-2">
                <input
                  type="radio"
                  name="minHoursMode"
                  checked={!form.minHoursUnset}
                  onChange={() => {
                    setForm({ ...form, minHoursUnset: false });
                    requestAnimationFrame(() => minHoursInputRef.current?.focus());
                  }}
                  className="h-4 w-4 accent-[var(--ds-action)]"
                />
                時間を指定
              </label>
            </div>
          </fieldset>
          {!form.minHoursUnset && (
            <span className="ds-suffix mt-2">
              <input
                ref={minHoursInputRef}
                type="number"
                min={0}
                inputMode="numeric"
                value={form.minHours}
                onChange={(event) => setForm({ ...form, minHours: event.target.value })}
                className="ds-input w-32"
              />
              <span>時間</span>
            </span>
          )}
        </div>
        <label className="ds-label" htmlFor="staff-coverage">
          勤務の条件
          <select
            id="staff-coverage"
            value={form.coverage}
            onChange={(event) =>
              setForm({ ...form, coverage: event.target.value as CoverageNeed })
            }
            className="ds-input mt-2"
          >
            <option value="alone">一人で大丈夫</option>
            <option value="needs_employee">社員が必要</option>
          </select>
        </label>
        <label className="ds-label">
          属性
          <select
            value={form.role}
            onChange={(event) => setForm({ ...form, role: event.target.value as Role })}
            className="ds-input mt-2 w-40"
          >
            {(Object.keys(ROLE_LABELS) as Role[]).map((role) => (
              <option key={role} value={role}>
                {ROLE_LABELS[role]}
              </option>
            ))}
          </select>
        </label>
        <Button type="submit" fullWidth>
          {editing ? "更新する" : "登録する"}
        </Button>
        </Card>
      </form>

      <Card className="mt-4 max-w-xl p-0">
        <ul className="divide-y divide-[var(--ds-line)]">
        {staff.length === 0 && <li className="px-5 py-8 text-sm text-slate-400">まだ登録がありません</li>}
        {staff.map((member) => (
          <li key={member.id} className="flex items-center gap-3 px-5 py-4">
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-slate-900">{staffLabel(member)}</p>
              <p className="text-xs text-slate-500">
                {(member.minHours ?? 0) > 0
                  ? `最低 ${member.minHours} 時間`
                  : "最低時間 指定なし"}{" "}
                /{" "}
                {member.coverage === "alone" ? "一人で大丈夫" : "社員が必要"} / {ROLE_LABELS[member.role]} /{" "}
                {member.lineUserId ? "LINE連携済み" : "LINE未連携"}
              </p>
            </div>
            <button type="button" onClick={() => startEdit(member)} className="text-sm font-bold text-[var(--ds-action)]">
              編集
            </button>
            <button type="button" onClick={() => removeStaff(member.id)} className="text-sm font-bold text-[#e0002e]">
              削除
            </button>
          </li>
        ))}
        </ul>
      </Card>
    </PageShell>
  );
}
