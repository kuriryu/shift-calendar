"use client";

import { useEffect, useState } from "react";
import { useMergeRefs, type VirtualElement } from "@floating-ui/react";
import Icon from "@/components/Icon";
import { hopeSentence } from "@/components/DayRequestList";
import FieldControl, { FieldSelect } from "@/components/FieldControl";
import { EMPTY_REQUESTS, useAppStore } from "@/stores/useAppStore";
import { useDismissable } from "@/hooks/useDismissable";
import { useViewportPopover } from "@/hooks/useViewportPopover";
import {
  DAILY_HOUR_LIMIT_ALERT,
  exceedsDailyHourLimit,
  toMinutes,
  workMinutesOf,
} from "@/lib/time";
import { dayLabel } from "@/lib/dates";
import type { ShiftAssignment, Staff } from "@/types";

/** 指定可能な休憩時間（分） */
export const BREAK_OPTIONS = [0, 30, 45, 60, 75, 90, 120];

export type AssignmentEditTarget = {
  assignment: ShiftAssignment;
  staff: Staff;
  date: string;
  /** この要素の上下、画面に収まる側へ開く */
  anchor: HTMLElement | VirtualElement;
};

export function anchorFromEvent(event: React.MouseEvent): HTMLElement {
  return event.currentTarget as HTMLElement;
}

/** 基準になるボタンが無いとき、画面上部を仮の起点にする */
export function centerAnchor(): VirtualElement {
  return {
    getBoundingClientRect() {
      const width = 280;
      const x = Math.max(8, window.innerWidth / 2 - width / 2);
      const y = Math.max(8, window.innerHeight * 0.2);
      return new DOMRect(x, y, width, 1);
    },
  };
}

export default function AssignmentEditPopover({
  edit,
  timeOptions,
  onClose,
}: {
  edit: AssignmentEditTarget;
  timeOptions: string[];
  onClose: () => void;
}) {
  const updateAssignment = useAppStore((s) => s.updateAssignment);
  const removeAssignment = useAppStore((s) => s.removeAssignment);
  const requests = useAppStore(
    (s) => s.requests[edit.date.slice(0, 7)] ?? EMPTY_REQUESTS,
  );
  const hope = hopeSentence(
    requests.find((r) => r.staffId === edit.staff.id && r.date === edit.date),
    edit.staff.freeTimeRange,
  );
  const [removed, setRemoved] = useState(false);
  const editRef = useDismissable<HTMLDivElement>(true, onClose);
  const { refs, floatingStyles, isPositioned } = useViewportPopover(edit.anchor);
  const popoverRef = useMergeRefs([editRef, refs.setFloating]);

  const [start, setStart] = useState(edit.assignment.startTime);
  const [end, setEnd] = useState(edit.assignment.endTime);
  const [breakMin, setBreakMin] = useState(String(edit.assignment.breakMinutes));
  const [breakStart, setBreakStart] = useState(
    edit.assignment.breakStartTime ?? "14:00",
  );

  useEffect(() => {
    setStart(edit.assignment.startTime);
    setEnd(edit.assignment.endTime);
    setBreakMin(String(edit.assignment.breakMinutes));
    setBreakStart(edit.assignment.breakStartTime ?? "14:00");
  }, [edit.assignment]);

  const breakMinNum = Number(breakMin);
  const breakStartOptions =
    breakMinNum > 0 && start < end
      ? timeOptions.filter((t) => {
          const m = toMinutes(t);
          return m >= toMinutes(start) && m + breakMinNum <= toMinutes(end);
        })
      : [];
  const validBreakStart = breakStartOptions.includes(breakStart)
    ? breakStart
    : (breakStartOptions[0] ?? "");
  const workMinutes =
    start < end
      ? workMinutesOf({
          startTime: start,
          endTime: end,
          breakMinutes: breakMinNum,
        })
      : 0;
  const overDailyLimit = exceedsDailyHourLimit(workMinutes, edit.staff.maxHoursPerDay);

  const fieldId = edit.assignment.id;

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} aria-hidden />
      <div
        ref={popoverRef}
        role="dialog"
        aria-label={
          removed
            ? `${edit.staff.name}のシフトを外しました`
            : `${edit.staff.name} ${dayLabel(edit.date)} のシフトを編集`
        }
        className={`z-50 w-[17.5rem] rounded-2xl border border-slate-200 bg-white px-5 pt-6 pb-8 shadow-xl ${
          removed ? "fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" : ""
        }`}
        style={
          removed
            ? undefined
            : { ...floatingStyles, visibility: isPositioned ? "visible" : "hidden" }
        }
      >
        <header className="mb-5">
          <p className="text-base font-bold tracking-tight text-slate-900">
            {removed ? "シフトを外しました" : edit.staff.name}
          </p>
          <p className="mt-1 text-sm text-slate-500">
            {removed
              ? `${edit.staff.name}の${dayLabel(edit.date)}`
              : dayLabel(edit.date)}
          </p>
          <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-sm leading-relaxed text-slate-800">
            {hope}
          </p>
        </header>

        {removed ? (
          <button
            type="button"
            onClick={onClose}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-3 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
          >
            閉じる
          </button>
        ) : (
        <>

        <section className="space-y-3" aria-labelledby={`edit-hours-${fieldId}`}>
          <h3
            id={`edit-hours-${fieldId}`}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-600"
          >
            <Icon name="schedule" size={16} className="text-blue-600" />
            勤務時間
          </h3>
          <div className="flex items-end gap-2">
            <FieldControl id={`edit-start-${fieldId}`} label="開始時刻">
              <FieldSelect
                id={`edit-start-${fieldId}`}
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
            <span className="pb-3 text-sm text-slate-400" aria-hidden>
              〜
            </span>
            <FieldControl id={`edit-end-${fieldId}`} label="終了時刻">
              <FieldSelect
                id={`edit-end-${fieldId}`}
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
          </div>
          {overDailyLimit && (
            <p role="alert" className="text-xs font-medium text-red-600">
              {DAILY_HOUR_LIMIT_ALERT}
            </p>
          )}
        </section>

        <section className="mt-6 space-y-3" aria-labelledby={`edit-break-${fieldId}`}>
          <h3
            id={`edit-break-${fieldId}`}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-600"
          >
            <Icon name="local_cafe" size={16} className="text-blue-600" />
            休憩
          </h3>
          <div className="space-y-4">
            <FieldControl id={`edit-break-min-${fieldId}`} label="休憩時間">
              <FieldSelect
                id={`edit-break-min-${fieldId}`}
                value={breakMin}
                onChange={(e) => setBreakMin(e.target.value)}
              >
                {BREAK_OPTIONS.map((b) => (
                  <option key={b} value={String(b)}>
                    {b === 0 ? "なし" : `${b}分`}
                  </option>
                ))}
              </FieldSelect>
            </FieldControl>
            {breakMinNum > 0 && (
              <FieldControl id={`edit-break-start-${fieldId}`} label="休憩開始時刻">
                <FieldSelect
                  id={`edit-break-start-${fieldId}`}
                  value={validBreakStart}
                  onChange={(e) => setBreakStart(e.target.value)}
                >
                  {breakStartOptions.map((t) => (
                    <option key={t} value={t}>
                      {t}〜
                    </option>
                  ))}
                </FieldSelect>
              </FieldControl>
            )}
          </div>
        </section>

        <div className="mt-8 flex flex-col gap-2">
          <button
            type="button"
            onClick={() => {
              if (start < end && !overDailyLimit) {
                updateAssignment({
                  ...edit.assignment,
                  startTime: start,
                  endTime: end,
                  breakMinutes: breakMinNum,
                  breakStartTime:
                    breakMinNum > 0 && validBreakStart ? validBreakStart : undefined,
                  source: "manual",
                });
                onClose();
              }
            }}
            disabled={start >= end || overDailyLimit}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-3 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
          >
            <Icon name="done" size={18} />
            時間を変更
          </button>
          <button
            type="button"
            onClick={() => {
              removeAssignment(edit.assignment.id);
              setRemoved(true);
            }}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-red-50 px-3 py-3 text-xs font-medium text-red-700 transition-colors hover:bg-red-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500"
          >
            <Icon name="delete" size={16} />
            このシフトを削除
          </button>
        </div>
        </>
        )}
      </div>
    </>
  );
}
