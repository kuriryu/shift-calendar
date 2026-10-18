"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { monthLabel } from "@/lib/dates";
import { assignedMinutesOf, requestedMinutesOf } from "@/lib/hope-hours";
import HoursCompareBar from "@/components/workspace/HoursCompareBar";
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

function useCountUp(target: number, reduced: boolean): number {
  const [shown, setShown] = useState(reduced ? target : 0);
  useEffect(() => {
    if (reduced) {
      setShown(target);
      return;
    }
    const start = performance.now();
    const duration = 800;
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - t) ** 3;
      setShown(Math.round(target * eased));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [reduced, target]);
  return shown;
}

/** 提出率を、数字だけが 0 から伸びるインフォグラフィクスで見せる */
function SubmissionFigure({
  rate,
  submitted,
  total,
}: {
  rate: number;
  submitted: number;
  total: number;
}) {
  const reduced = usePrefersReducedMotion();
  const shownRate = useCountUp(rate, reduced);
  const shownSubmitted = useCountUp(submitted, reduced);
  const done = rate >= 100;

  return (
    <div className="submission-figure" aria-hidden>
      <p className="text-sm font-bold text-[var(--ds-body)]">シフトの提出率</p>
      <div className="mt-2 flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <p
          className={`text-5xl font-bold leading-none tracking-tight tabular-nums ${
            done ? "text-[var(--ds-green)]" : "text-[var(--ds-ink)]"
          }`}
        >
          <span>
            {shownRate}
            <span className="ml-0.5 text-2xl">%</span>
          </span>
        </p>
        <p className="text-sm tabular-nums text-[var(--ds-muted)]">
          {shownSubmitted} / {total} 人
        </p>
      </div>
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

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <article
          className="ds-card p-5"
          aria-label={`シフトの提出率 ${rate}%。${staff.length}人中${submitted}人`}
        >
          <SubmissionFigure rate={rate} submitted={submitted} total={staff.length} />
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
      </div>
      <article className="ds-card mt-4 p-5">
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

      <section className="ds-card mt-4 p-5">
        <h2 className="text-base font-bold text-[var(--ds-ink)]">希望時間が多い順</h2>
        <ol className="mt-4 divide-y divide-slate-100">
          {ranked.length === 0 && (
            <li className="py-6 pl-10 text-sm text-slate-400">スタッフがまだいません</li>
          )}
          {ranked.map(({ member, minutes, assigned }, index) => (
            <li key={member.id} className="py-3">
              <div className="flex items-center gap-4">
                <span className="w-6 shrink-0 text-sm font-semibold text-slate-400">{index + 1}</span>
                <span className="min-w-0 flex-1 font-medium text-slate-800">{staffLabel(member)}</span>
              </div>
              <HoursCompareBar
                requestedMinutes={minutes}
                assignedMinutes={assigned}
                className="mt-2 pl-10 sm:pl-10"
              />
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
