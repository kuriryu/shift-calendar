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
    <div className="ds-page">
      <h1 className="ds-title">スタッフ</h1>
      <p className="ds-lead">
        苗字、最低時間、一人で入れるかを先に登録します。希望提出ではこの苗字だけを選びます。
      </p>

      <form onSubmit={onSubmit} className="ds-card mt-6 grid max-w-xl gap-4 p-5">
        <label className="ds-label">
          苗字
          <span className="ds-help">希望提出で選ぶ名前です。</span>
          <input
            value={form.familyName}
            onChange={(event) => setForm({ ...form, familyName: event.target.value })}
            className="ds-input mt-2"
            required
          />
        </label>
        <label className="ds-label">
          最低時間
          <span className="ds-help">1か月あたりの最低労働時間です。</span>
          <span className="ds-suffix mt-2">
            <input
              type="number"
              min={0}
              inputMode="numeric"
              value={form.minHours}
              onChange={(event) => setForm({ ...form, minHours: event.target.value })}
              className="ds-input w-32"
            />
            <span>時間</span>
          </span>
        </label>
        <fieldset>
          <legend className="ds-label">勤務の条件</legend>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {(
              [
                ["alone", "一人で大丈夫"],
                ["needs_employee", "社員が必要"],
              ] as const
            ).map(([value, label]) => (
              <label
                key={value}
                className={`flex h-12 items-center justify-center rounded-xl border text-sm font-bold ${
                  form.coverage === value
                    ? "border-[var(--ds-action)] bg-[var(--ds-tint)] text-[var(--ds-navy)]"
                    : "border-[var(--ds-line)] text-[var(--ds-body)]"
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
        <button type="submit" className="ds-btn w-full">
          {editing ? "更新する" : "登録する"}
        </button>
      </form>

      <ul className="ds-card mt-4 max-w-xl divide-y divide-[var(--ds-line)]">
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
            <button type="button" onClick={() => startEdit(member)} className="text-sm font-bold text-[var(--ds-action)]">
              編集
            </button>
            <button type="button" onClick={() => removeStaff(member.id)} className="text-sm font-bold text-[#e0002e]">
              削除
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
