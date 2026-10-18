"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { monthLabel } from "@/lib/dates";
import { assignedMinutesOf, requestedMinutesOf } from "@/lib/hope-hours";
import { minutesToJapaneseHours } from "@/lib/time";
import { staffLabel } from "@/lib/store-book";
import { EMPTY_ASSIGNMENTS, EMPTY_REQUESTS, useAppStore } from "@/stores/useAppStore";
import type { HopeNote } from "@/types";

const EMPTY_NOTES: HopeNote[] = [];

export default function DashboardHome() {
  const router = useRouter();
  const month = useAppStore((s) => s.selectedMonth);
  const staff = useAppStore((s) => s.staff);
  const requests = useAppStore((s) => s.requests[month] ?? EMPTY_REQUESTS);
  const assignments = useAppStore((s) => s.assignments[month] ?? EMPTY_ASSIGNMENTS);
  const settings = useAppStore((s) => s.settings);
  const notes = useAppStore((s) => s.hopeNotes[month]) ?? EMPTY_NOTES;
  const budgetHours = useAppStore((s) => s.budgetHours);
  const setBudgetHours = useAppStore((s) => s.setBudgetHours);
  const generate = useAppStore((s) => s.generate);
  const setIssueOpen = useAppStore((s) => s.setIssueOpen);

  const submitted = staff.filter((member) =>
    requests.some((request) => request.staffId === member.id),
  ).length;
  const rate = staff.length === 0 ? 0 : Math.round((submitted / staff.length) * 100);
  const ranked = useMemo(
    () =>
      staff
        .map((member) => ({
          member,
          minutes: requestedMinutesOf(member, requests, settings),
          assigned: assignedMinutesOf(member.id, assignments),
        }))
        .sort((a, b) => b.minutes - a.minutes),
    [assignments, requests, settings, staff],
  );
  const messages = notes.filter((note) => note.message.trim().length > 0);

  const generateShift = () => {
    generate();
    setIssueOpen(true);
    router.push("/shifts");
  };

  return (
    <div className="ds-page">
      <section className="ds-card px-6 py-6">
        <p className="text-sm font-bold text-[var(--ds-action)]">{monthLabel(month)}のシフト生成</p>
        <h1 className="ds-title mt-1">希望が集まったら、ここから生成します</h1>
        <p className="ds-lead max-w-xl">
          提出された希望をもとにシフトを作り、そのあと時間と休憩だけを直します。
        </p>
        <button
          type="button"
          onClick={generateShift}
          disabled={staff.length === 0}
          className="ds-btn mt-5"
        >
          シフトを生成
        </button>
      </section>

      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <article className="ds-card p-5">
          <p className="text-sm font-bold text-[var(--ds-body)]">シフトの提出率</p>
          <p className="mt-2 text-4xl font-bold text-[var(--ds-ink)]">{rate}%</p>
          <p className="mt-1 text-sm text-[var(--ds-muted)]">
            {submitted} / {staff.length} 人
          </p>
        </article>
        <article className="ds-card p-5">
          <label htmlFor="budget-hours" className="ds-label">
            予算の時間
            <span className="ds-help">この月に使える労働時間です。</span>
          </label>
          <div className="ds-suffix mt-2">
            <input
              id="budget-hours"
              type="number"
              min={0}
              inputMode="numeric"
              value={budgetHours || ""}
              onChange={(event) => setBudgetHours(Number(event.target.value) || 0)}
              className="ds-input w-32"
            />
            <span>時間</span>
          </div>
        </article>
        <article className="ds-card p-5">
          <p className="text-sm font-bold text-[var(--ds-body)]">特別なリクエスト</p>
          <ul className="mt-3 space-y-2 text-sm text-[var(--ds-ink)]">
            {messages.length === 0 && <li>メッセージはありません</li>}
            {messages.map((note) => {
              const member = staff.find((item) => item.id === note.staffId);
              return (
                <li key={`${note.staffId}-${note.message}`}>
                  <span className="font-semibold">{member ? staffLabel(member) : "スタッフ"}</span>
                  <span className="mt-0.5 block text-slate-500">{note.message}</span>
                </li>
              );
            })}
          </ul>
        </article>
      </div>

      <section className="ds-card mt-4 p-5">
        <h2 className="text-base font-bold text-[var(--ds-ink)]">希望時間が多い順</h2>
        <ol className="mt-4 divide-y divide-slate-100">
          {ranked.length === 0 && <li className="py-6 text-sm text-slate-400">スタッフがまだいません</li>}
          {ranked.map(({ member, minutes, assigned }, index) => (
            <li key={member.id} className="flex items-center gap-4 py-3">
              <span className="w-6 text-sm font-semibold text-slate-400">{index + 1}</span>
              <span className="flex-1 font-medium text-slate-800">{staffLabel(member)}</span>
              <span className="text-sm text-slate-500">希望 {minutesToJapaneseHours(minutes)}</span>
              <span className="text-sm text-slate-400">割当 {minutesToJapaneseHours(assigned)}</span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
