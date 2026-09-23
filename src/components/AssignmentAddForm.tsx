"use client";

import { useMemo, useState } from "react";
import { useAppStore } from "@/stores/useAppStore";
import { timeOptionsOf } from "@/lib/coverage";
import { toMinutes } from "@/lib/time";
import { BREAK_OPTIONS } from "@/components/AssignmentEditPopover";
import type { Staff } from "@/types";
import { dayLabel } from "@/lib/dates";

/** 選択日に未割当のスタッフへシフトを追加する共通フォーム */
export default function AssignmentAddForm({
  date,
  candidates,
}: {
  date: string;
  candidates: Staff[];
}) {
  const settings = useAppStore((s) => s.settings);
  const addAssignment = useAppStore((s) => s.addAssignment);
  const timeOptions = useMemo(() => timeOptionsOf(settings), [settings]);

  const [staffId, setStaffId] = useState("");
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("13:00");
  const [breakMin, setBreakMin] = useState("auto");
  const [breakStart, setBreakStart] = useState("14:00");

  const breakMinNum = breakMin === "auto" ? null : Number(breakMin);
  const breakStartOptions =
    breakMinNum !== null && breakMinNum > 0 && start < end
      ? timeOptions.filter((t) => {
          const m = toMinutes(t);
          return m >= toMinutes(start) && m + breakMinNum <= toMinutes(end);
        })
      : [];
  const validBreakStart = breakStartOptions.includes(breakStart)
    ? breakStart
    : (breakStartOptions[0] ?? "");

  if (candidates.length === 0) return null;

  const formId = `add-${date}`;

  return (
    <form
      className="mt-4 rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-4"
      aria-label={`${dayLabel(date)} にシフトを追加`}
      onSubmit={(e) => {
        e.preventDefault();
        if (!staffId || start >= end) return;
        addAssignment({
          staffId,
          date,
          startTime: start,
          endTime: end,
          ...(breakMinNum !== null
            ? {
                breakMinutes: breakMinNum,
                ...(breakMinNum > 0 && validBreakStart
                  ? { breakStartTime: validBreakStart }
                  : {}),
              }
            : {}),
        });
        setStaffId("");
        setBreakMin("auto");
      }}
    >
      <p className="mb-3 text-xs font-semibold text-slate-600">＋ シフトを追加</p>
      <div className="flex flex-wrap items-end gap-x-3 gap-y-3">
        <div className="space-y-1.5">
          <label htmlFor={`${formId}-staff`} className="block text-[11px] font-medium text-slate-500">
            スタッフ
          </label>
          <select
            id={`${formId}-staff`}
            value={staffId}
            onChange={(e) => setStaffId(e.target.value)}
            className="min-w-[8rem] rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs"
          >
            <option value="">スタッフを選択</option>
            {candidates.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label htmlFor={`${formId}-start`} className="block text-[11px] font-medium text-slate-500">
            開始時刻
          </label>
          <select
            id={`${formId}-start`}
            value={start}
            onChange={(e) => setStart(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-semibold tabular-nums"
          >
            {timeOptions.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        <span className="pb-2 text-xs text-slate-400" aria-hidden>
          〜
        </span>

        <div className="space-y-1.5">
          <label htmlFor={`${formId}-end`} className="block text-[11px] font-medium text-slate-500">
            終了時刻
          </label>
          <select
            id={`${formId}-end`}
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-semibold tabular-nums"
          >
            {timeOptions.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label htmlFor={`${formId}-break`} className="block text-[11px] font-medium text-slate-500">
            休憩
          </label>
          <select
            id={`${formId}-break`}
            value={breakMin}
            onChange={(e) => setBreakMin(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs"
          >
            <option value="auto">自動</option>
            {BREAK_OPTIONS.map((b) => (
              <option key={b} value={String(b)}>
                {b === 0 ? "なし" : `${b}分`}
              </option>
            ))}
          </select>
        </div>

        {breakMinNum !== null && breakMinNum > 0 && (
          <div className="space-y-1.5">
            <label
              htmlFor={`${formId}-break-start`}
              className="block text-[11px] font-medium text-slate-500"
            >
              休憩開始
            </label>
            <select
              id={`${formId}-break-start`}
              value={validBreakStart}
              onChange={(e) => setBreakStart(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs"
              disabled={breakStartOptions.length === 0}
            >
              {breakStartOptions.length === 0 ? (
                <option value="">選択不可</option>
              ) : (
                breakStartOptions.map((t) => (
                  <option key={t} value={t}>
                    {t}〜
                  </option>
                ))
              )}
            </select>
          </div>
        )}

        <button
          type="submit"
          disabled={!staffId || start >= end}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
        >
          追加
        </button>
      </div>
    </form>
  );
}
