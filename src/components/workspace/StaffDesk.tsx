"use client";

import { FormEvent, useState } from "react";
import { staffLabel } from "@/lib/store-book";
import { useAppStore } from "@/stores/useAppStore";
import type { CoverageNeed, Role, Staff } from "@/types";
import { ROLE_LABELS } from "@/types";

const emptyForm = {
  familyName: "",
  minHours: "",
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
      minHours: Number(form.minHours) || 0,
      coverage: form.coverage,
    };
    if (editing) {
      const current = staff.find((member) => member.id === editing);
      if (!current) return;
      updateStaff({ ...current, ...payload });
    } else {
      addStaff(payload);
    }
    setForm(emptyForm);
    setEditing(null);
  };

  const startEdit = (member: Staff) => {
    setEditing(member.id);
    setForm({
      familyName: staffLabel(member),
      minHours: member.minHours ? String(member.minHours) : "",
      coverage: member.coverage ?? (member.role === "employee" ? "alone" : "needs_employee"),
      role: member.role,
    });
  };

  return (
    <div className="h-full overflow-auto p-5 md:p-8">
      <h1 className="text-2xl font-bold text-slate-900">スタッフ</h1>
      <p className="mt-2 text-sm text-slate-500">
        苗字、最低時間、一人で入れるかを先に登録します。希望提出ではこの苗字だけを選びます。
      </p>

      <form onSubmit={onSubmit} className="mt-6 grid max-w-xl gap-3 rounded-2xl bg-white p-5 shadow-sm">
        <label className="text-sm text-slate-500">
          苗字
          <input
            value={form.familyName}
            onChange={(event) => setForm({ ...form, familyName: event.target.value })}
            className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 text-base text-slate-900"
            required
          />
        </label>
        <label className="text-sm text-slate-500">
          最低時間
          <input
            type="number"
            min={0}
            value={form.minHours}
            onChange={(event) => setForm({ ...form, minHours: event.target.value })}
            placeholder="月の最低時間"
            className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 text-base text-slate-900"
          />
        </label>
        <fieldset className="text-sm text-slate-500">
          <legend>勤務の条件</legend>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {(
              [
                ["alone", "一人で大丈夫"],
                ["needs_employee", "社員が必要"],
              ] as const
            ).map(([value, label]) => (
              <label
                key={value}
                className={`flex h-11 items-center justify-center rounded-xl border text-sm font-medium ${
                  form.coverage === value
                    ? "border-blue-600 bg-blue-50 text-blue-700"
                    : "border-slate-200 text-slate-600"
                }`}
              >
                <input
                  type="radio"
                  name="coverage"
                  value={value}
                  checked={form.coverage === value}
                  onChange={() => setForm({ ...form, coverage: value })}
                  className="sr-only"
                />
                {label}
              </label>
            ))}
          </div>
        </fieldset>
        <label className="text-sm text-slate-500">
          属性
          <select
            value={form.role}
            onChange={(event) => setForm({ ...form, role: event.target.value as Role })}
            className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 text-base text-slate-900"
          >
            {(Object.keys(ROLE_LABELS) as Role[]).map((role) => (
              <option key={role} value={role}>
                {ROLE_LABELS[role]}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="h-11 rounded-xl bg-blue-600 text-sm font-semibold text-white">
          {editing ? "更新する" : "登録する"}
        </button>
      </form>

      <ul className="mt-6 max-w-xl divide-y divide-slate-100 rounded-2xl bg-white shadow-sm">
        {staff.length === 0 && <li className="px-5 py-8 text-sm text-slate-400">まだ登録がありません</li>}
        {staff.map((member) => (
          <li key={member.id} className="flex items-center gap-3 px-5 py-4">
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-slate-900">{staffLabel(member)}</p>
              <p className="text-xs text-slate-500">
                最低 {member.minHours || 0} 時間 /{" "}
                {member.coverage === "alone" ? "一人で大丈夫" : "社員が必要"} / {ROLE_LABELS[member.role]} /{" "}
                {member.lineUserId ? "LINE連携済み" : "LINE未連携"}
              </p>
            </div>
            <button type="button" onClick={() => startEdit(member)} className="text-sm text-blue-600">
              編集
            </button>
            <button type="button" onClick={() => removeStaff(member.id)} className="text-sm text-slate-400">
              削除
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
