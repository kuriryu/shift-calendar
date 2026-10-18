"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { monthLabel } from "@/lib/dates";
import { assignedMinutesOf, requestedMinutesOf } from "@/lib/hope-hours";
import { minutesToJapaneseHours } from "@/lib/time";
import { staffLabel } from "@/lib/store-book";
import { EMPTY_ASSIGNMENTS, EMPTY_REQUESTS, useAppStore } from "@/stores/useAppStore";
import type { HopeNote } from "@/types";

const EMPTY_NOTES: HopeNote[] = [];

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  return reduced;
}

/** 提出率を、円のパラメーターが伸びるモーションで見せる */
function SubmissionGauge({ rate }: { rate: number }) {
  const reduced = usePrefersReducedMotion();
  const [shown, setShown] = useState(reduced ? rate : 0);
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(100, Math.max(0, shown));
  const color = rate >= 100 ? "var(--ds-green)" : "var(--ds-action)";
  const angle = -Math.PI / 2 + (progress / 100) * Math.PI * 2;
  const knobX = 50 + radius * Math.cos(angle);
  const knobY = 50 + radius * Math.sin(angle);

  useEffect(() => {
    if (reduced) {
      setShown(rate);
      return;
    }
    const start = performance.now();
    const duration = 900;
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - t) ** 3;
      setShown(Math.round(rate * eased));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [rate, reduced]);

  return (
    <div className="submission-gauge relative h-28 w-28 shrink-0" aria-hidden>
      <svg viewBox="0 0 100 100" className="h-full w-full">
        <circle cx="50" cy="50" r={radius} fill="none" stroke="#e6e6e6" strokeWidth="9" />
        {progress > 0 && (
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="9"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - progress / 100)}
            transform="rotate(-90 50 50)"
          />
        )}
        <circle cx={knobX} cy={knobY} r="5.5" fill="#fff" stroke={color} strokeWidth="3" />
      </svg>
      <p className="absolute inset-0 grid place-items-center text-[1.65rem] font-bold leading-none tracking-tight text-[var(--ds-ink)] tabular-nums">
        <span>
          {progress}
          <span className="ml-0.5 text-sm">%</span>
        </span>
      </p>
    </div>
  );
}

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
        <article
          className="ds-card flex items-center gap-4 p-5"
          aria-label={`シフトの提出率 ${rate}%。${staff.length}人中${submitted}人`}
        >
          <SubmissionGauge rate={rate} />
          <div className="min-w-0">
            <p className="text-sm font-bold text-[var(--ds-body)]">シフトの提出率</p>
            <p className="mt-1 text-sm text-[var(--ds-muted)]">
              {submitted} / {staff.length} 人
            </p>
          </div>
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
