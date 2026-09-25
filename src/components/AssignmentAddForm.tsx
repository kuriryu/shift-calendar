"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ControlledActionDialog } from "smarthr-ui";
import { EMPTY_ASSIGNMENTS, useAppStore } from "@/stores/useAppStore";
import { timeOptionsOf } from "@/lib/coverage";
import { toMinutes } from "@/lib/time";
import { BREAK_OPTIONS } from "@/components/AssignmentEditPopover";
import FieldControl, { FieldSelect } from "@/components/FieldControl";
import { useIsMobile } from "@/hooks/useIsMobile";
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
  const isMobile = useIsMobile();
  const settings = useAppStore((s) => s.settings);
  const addAssignment = useAppStore((s) => s.addAssignment);
  const monthAssignments = useAppStore(
    (s) => s.assignments[s.selectedMonth] ?? EMPTY_ASSIGNMENTS,
  );
  const timeOptions = useMemo(() => timeOptionsOf(settings), [settings]);

  const [open, setOpen] = useState(false);
  const [staffId, setStaffId] = useState("");
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("13:00");
  const [breakMin, setBreakMin] = useState("auto");
  const [breakStart, setBreakStart] = useState("14:00");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

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

  const resetForm = useCallback(() => {
    setStaffId("");
    setStart("09:00");
    setEnd("13:00");
    setBreakMin("auto");
    setBreakStart("14:00");
    setError("");
    setSubmitting(false);
  }, []);

  useEffect(() => {
    if (!open) resetForm();
  }, [open, resetForm]);

  if (candidates.length === 0) return null;

  const formId = `add-${date}`;

  const submit = () => {
    if (submitting) return false;
    if (!staffId || start >= end) {
      setError("スタッフと、開始・終了の時刻を入力してください。");
      return false;
    }
    const duplicate = monthAssignments.some(
      (a) => a.date === date && a.staffId === staffId,
    );
    if (duplicate) {
      setError("この人は同じ日にすでにシフトがあります。");
      return false;
    }
    setSubmitting(true);
    setError("");
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
    resetForm();
    setOpen(false);
    return true;
  };

  const fields = (
    <div className="flex flex-col gap-3">
      {error && (
        <p className="text-xs text-red-700" role="alert">
          {error}
        </p>
      )}
      <div className="flex flex-wrap items-end gap-3">
        <FieldControl
          id={`${formId}-staff`}
          label="スタッフ"
          className="w-full min-w-[12rem] sm:w-auto sm:min-w-[14rem] sm:flex-1"
        >
          <FieldSelect
            id={`${formId}-staff`}
            value={staffId}
            onChange={(e) => setStaffId(e.target.value)}
            required
          >
            <option value="">スタッフを選択</option>
            {candidates.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </FieldSelect>
        </FieldControl>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <FieldControl
          id={`${formId}-start`}
          label="開始時刻"
          className="w-[7.5rem] shrink-0"
        >
          <FieldSelect
            id={`${formId}-start`}
            value={start}
            onChange={(e) => setStart(e.target.value)}
            className="font-semibold tabular-nums"
          >
            {timeOptions.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </FieldSelect>
        </FieldControl>

        <span className="pb-3 text-xs text-slate-400" aria-hidden>
          〜
        </span>

        <FieldControl
          id={`${formId}-end`}
          label="終了時刻"
          className="w-[7.5rem] shrink-0"
        >
          <FieldSelect
            id={`${formId}-end`}
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            className="font-semibold tabular-nums"
          >
            {timeOptions.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </FieldSelect>
        </FieldControl>

        <FieldControl
          id={`${formId}-break`}
          label="休憩"
          className="w-[7rem] shrink-0"
        >
          <FieldSelect
            id={`${formId}-break`}
            value={breakMin}
            onChange={(e) => setBreakMin(e.target.value)}
          >
            <option value="auto">自動</option>
            {BREAK_OPTIONS.map((b) => (
              <option key={b} value={String(b)}>
                {b === 0 ? "なし" : `${b}分`}
              </option>
            ))}
          </FieldSelect>
        </FieldControl>

        {breakMinNum !== null && breakMinNum > 0 && (
          <FieldControl
            id={`${formId}-break-start`}
            label="休憩開始"
            className="w-[7.5rem] shrink-0"
          >
            <FieldSelect
              id={`${formId}-break-start`}
              value={validBreakStart}
              onChange={(e) => setBreakStart(e.target.value)}
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
            </FieldSelect>
          </FieldControl>
        )}

        {!isMobile && (
          <button
            type="submit"
            disabled={submitting || !staffId || start >= end}
            className="box-border h-11 min-h-11 shrink-0 rounded-md bg-blue-600 px-5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
          >
            {submitting ? "追加中…" : "追加"}
          </button>
        )}
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <div className="mt-3">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex h-11 min-h-11 w-full items-center justify-center gap-1.5 rounded-md border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
        >
          ＋ シフトを追加
        </button>
        <ControlledActionDialog
          isOpen={open}
          heading={`${dayLabel(date)} にシフトを追加`}
          actionButton={{
            text: submitting ? "追加中…" : "追加",
            theme: "primary",
          }}
          onClickAction={() => {
            submit();
          }}
          onClickClose={() => setOpen(false)}
          onClickOverlay={() => setOpen(false)}
          width="calc(100vw - 2rem)"
          className="assignment-add-dialog"
        >
          <div className="space-y-3 pt-1">{fields}</div>
        </ControlledActionDialog>
      </div>
    );
  }

  return (
    <form
      className="mt-4 rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-4"
      aria-label={`${dayLabel(date)} にシフトを追加`}
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <p className="mb-5 text-base font-bold text-slate-800">＋ シフトを追加</p>
      {fields}
    </form>
  );
}
