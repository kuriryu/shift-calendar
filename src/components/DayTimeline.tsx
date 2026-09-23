"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { EMPTY_ASSIGNMENTS, useAppStore } from "@/stores/useAppStore";
import { useMounted } from "@/hooks/useMounted";
import { useDismissable } from "@/hooks/useDismissable";
import { businessHoursOf, timeOptionsOf } from "@/lib/coverage";
import Icon from "@/components/Icon";
import { toMinutes } from "@/lib/time";
import { dayLabel, daysOfMonth, weekdayLabel } from "@/lib/dates";
import type { ShiftAssignment, Staff } from "@/types";
import { staffColorOf } from "@/lib/staff-color";

/** 指定可能な休憩時間（分） */
const BREAK_OPTIONS = [0, 30, 45, 60, 75, 90, 120];

type EditState = {
  assignment: ShiftAssignment;
  staff: Staff;
  x: number;
  y: number;
};

export default function DayTimeline({ date }: { date: string }) {
  const mounted = useMounted();
  const staff = useAppStore((s) => s.staff);
  const settings = useAppStore((s) => s.settings);
  const monthAssignments = useAppStore(
    (s) => s.assignments[s.selectedMonth] ?? EMPTY_ASSIGNMENTS,
  );
  const assignments = monthAssignments.filter((a) => a.date === date);
  const updateAssignment = useAppStore((s) => s.updateAssignment);
  const removeAssignment = useAppStore((s) => s.removeAssignment);
  const addAssignment = useAppStore((s) => s.addAssignment);
  const hiddenStaffIds = useAppStore((s) => s.hiddenStaffIds);
  const highlight = useAppStore((s) => s.highlight);
  const clearHighlight = useAppStore((s) => s.clearHighlight);
  const setSelectedDate = useAppStore((s) => s.setSelectedDate);

  const [edit, setEdit] = useState<EditState | null>(null);
  const closeEdit = useCallback(() => setEdit(null), []);
  const editRef = useDismissable<HTMLDivElement>(edit !== null, closeEdit);
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("18:00");
  const [breakMin, setBreakMin] = useState("60");
  const [breakStart, setBreakStart] = useState("14:00");
  const [addStaffId, setAddStaffId] = useState("");
  const [addStart, setAddStart] = useState("09:00");
  const [addEnd, setAddEnd] = useState("13:00");
  const [addBreakMin, setAddBreakMin] = useState("auto");
  const chartRef = useRef<HTMLDivElement>(null);

  // ハイライト対象へスクロールし、数秒後に解除
  const highlightToken = highlight?.token;
  useEffect(() => {
    if (!highlight || highlight.date !== date) return;
    const el = chartRef.current?.querySelector<HTMLElement>(
      highlight.staffId ? `[data-staff-id="${highlight.staffId}"]` : "[data-highlight-range]",
    );
    (el ?? chartRef.current)?.scrollIntoView({ behavior: "smooth", block: "center" });
    const timer = window.setTimeout(clearHighlight, 4500);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [highlightToken, date]);

  if (!mounted) {
    return <div className="py-20 text-center text-sm text-slate-400">読み込み中…</div>;
  }

  const timeOptions = timeOptionsOf(settings);
  const { open: openMin, close: closeMin } = businessHoursOf(date, settings);
  const total = closeMin - openMin;
  const staffById = new Map(staff.map((s) => [s.id, s]));

  // 行は全スタッフ（絞り込み反映・ストア順）。未割当のスタッフは空行で表示する
  const hidden = new Set(hiddenStaffIds);
  const visibleStaff = staff.filter((s) => !hidden.has(s.id));
  const assignmentByStaff = new Map(assignments.map((a) => [a.staffId, a]));
  const unassigned = visibleStaff.filter((s) => !assignmentByStaff.has(s.id));

  const clamp = (v: number) => Math.max(0, Math.min(100, v));
  const pct = (min: number) => clamp(((min - openMin) / total) * 100);

  const openEdit = (e: React.MouseEvent, a: ShiftAssignment) => {
    setStart(a.startTime);
    setEnd(a.endTime);
    setBreakMin(String(a.breakMinutes));
    setBreakStart(a.breakStartTime ?? "14:00");
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = Math.min(rect.left, window.innerWidth - 250);
    const y = Math.min(rect.bottom + 6, window.innerHeight - 330);
    setEdit({ assignment: a, staff: staffById.get(a.staffId)!, x, y });
  };

  // 選択中の勤務時間・休憩時間に対して有効な休憩開始時刻の候補
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

  const hours: number[] = [];
  for (let m = openMin; m <= closeMin; m += 60) hours.push(m);

  const isHighlightDay = highlight?.date === date;
  const highlightRange = isHighlightDay ? highlight?.timeRange : undefined;
  const highlightStaffId = isHighlightDay ? highlight?.staffId : undefined;

  const month = date.slice(0, 7);
  const monthDays = daysOfMonth(month);
  const dayIndex = Math.max(0, monthDays.indexOf(date));

  const goDay = (delta: number) => {
    const next = monthDays[dayIndex + delta];
    if (next) setSelectedDate(next);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => goDay(-1)}
            disabled={dayIndex <= 0}
            aria-label="前の日"
            className="rounded-full border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Icon name="chevron_left" size={20} />
          </button>
          <h4 className="min-w-[7.5rem] text-center text-lg font-bold text-slate-800" aria-live="polite">
            {dayLabel(date)}（{weekdayLabel(date)}）
          </h4>
          <button
            type="button"
            onClick={() => goDay(1)}
            disabled={dayIndex >= monthDays.length - 1}
            aria-label="次の日"
            className="rounded-full border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Icon name="chevron_right" size={20} />
          </button>
        </div>
        <span className="text-xs text-slate-400">
          営業 {String(Math.floor(openMin / 60)).padStart(2, "0")}:{String(openMin % 60).padStart(2, "0")}〜
          {String(Math.floor(closeMin / 60)).padStart(2, "0")}:{String(closeMin % 60).padStart(2, "0")}
          ・バーをタップで編集（休憩は白い切れ目）
        </span>
        <ul className="ml-auto flex flex-wrap items-center gap-3 text-[11px] text-slate-500" aria-label="凡例">
          {visibleStaff.slice(0, 8).map((s) => {
            const color = staffColorOf(s.id);
            return (
              <li key={s.id} className="flex items-center gap-1">
                <span
                  className="h-2.5 w-2.5 rounded-sm"
                  style={{ backgroundColor: color.bg }}
                  aria-hidden
                />
                {s.name}
              </li>
            );
          })}
          {visibleStaff.length > 8 && (
            <li className="text-slate-400">他 {visibleStaff.length - 8}名</li>
          )}
          <li className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-sm bg-rose-100" aria-hidden />
            ピーク
          </li>
        </ul>
      </div>

      <div
        ref={chartRef}
        className="overflow-x-auto rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"
      >
       <div className="min-w-[40rem]">
        {/* 時間軸 */}
        <div className="relative ml-32 h-6">
          {hours.map((m) => (
            <span
              key={m}
              className="absolute -translate-x-1/2 text-[11px] text-slate-400"
              style={{ left: `${pct(m)}%` }}
            >
              {Math.floor(m / 60)}
            </span>
          ))}
        </div>

        <div className="relative ml-32">
          {/* ピーク時間帯の背景 */}
          {settings.peakHours.map((r, i) => (
            <div
              key={i}
              className="absolute top-0 bottom-0 bg-rose-50"
              style={{
                left: `${pct(toMinutes(r.start))}%`,
                width: `${pct(toMinutes(r.end)) - pct(toMinutes(r.start))}%`,
              }}
              aria-hidden
            />
          ))}
          {/* グリッド線 */}
          {hours.map((m) => (
            <div
              key={m}
              className="absolute top-0 bottom-0 border-l border-slate-100"
              style={{ left: `${pct(m)}%` }}
              aria-hidden
            />
          ))}
          {/* 違反時間帯のハイライト */}
          {highlightRange && (
            <div
              data-highlight-range
              className="violation-highlight pointer-events-none absolute -top-1 -bottom-1 z-10 rounded-lg bg-red-100/60"
              style={{
                left: `${pct(toMinutes(highlightRange.start))}%`,
                width: `${pct(toMinutes(highlightRange.end)) - pct(toMinutes(highlightRange.start))}%`,
              }}
              aria-hidden
            />
          )}

          <ul aria-label={`${dayLabel(date)} のシフト`}>
            {visibleStaff.map((s) => {
              const a = assignmentByStaff.get(s.id);
              const sMin = a ? toMinutes(a.startTime) : 0;
              const eMin = a ? toMinutes(a.endTime) : 0;
              const isHl = highlightStaffId === s.id;
              return (
                <li
                  key={s.id}
                  data-staff-id={s.id}
                  className={`relative flex h-11 items-center ${
                    isHl ? "violation-highlight bg-red-50/70" : ""
                  }`}
                >
                  <div
                    className={`absolute -left-32 w-28 truncate pr-2 text-right text-xs font-medium ${
                      isHl ? "text-red-700" : "text-slate-700"
                    }`}
                  >
                    {s.name}
                  </div>
                  {a ? (
                    <button
                      onClick={(e) => openEdit(e, a)}
                      aria-label={`${s.name} ${a.startTime}〜${a.endTime}${
                        a.breakMinutes > 0 ? `、休憩${a.breakMinutes}分` : ""
                      }。タップで編集`}
                      className="absolute h-7 rounded-md text-left text-[11px] font-semibold text-white shadow-sm hover:opacity-85"
                      style={{
                        left: `${pct(sMin)}%`,
                        width: `${pct(eMin) - pct(sMin)}%`,
                        backgroundColor: staffColorOf(s.id).bg,
                      }}
                    >
                      <span className="px-2 leading-7">
                        {a.startTime}-{a.endTime}
                      </span>
                      {a.breakStartTime && a.breakMinutes > 0 && (
                        <span
                          className="absolute top-0 h-full bg-white/90"
                          style={{
                            left: `${((toMinutes(a.breakStartTime) - sMin) / (eMin - sMin)) * 100}%`,
                            width: `${(a.breakMinutes / (eMin - sMin)) * 100}%`,
                          }}
                          aria-hidden
                        />
                      )}
                    </button>
                  ) : (
                    <span className="sr-only">{s.name}: この日はシフトなし</span>
                  )}
                </li>
              );
            })}
          </ul>

          {visibleStaff.length === 0 && (
            <p className="py-8 text-center text-sm text-slate-400">
              表示するスタッフがいません（サイドバーの絞り込みを確認してください）
            </p>
          )}
        </div>
       </div>

        {/* 追加フォーム */}
        {unassigned.length > 0 && (
          <form
            className="mt-6 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4"
            aria-label="シフトを追加"
            onSubmit={(e) => {
              e.preventDefault();
              if (addStaffId && addStart < addEnd) {
                addAssignment({
                  staffId: addStaffId,
                  date,
                  startTime: addStart,
                  endTime: addEnd,
                  ...(addBreakMin !== "auto" ? { breakMinutes: Number(addBreakMin) } : {}),
                });
                setAddStaffId("");
              }
            }}
          >
            <span className="text-xs font-medium text-slate-500">＋ シフトを追加</span>
            <label className="sr-only" htmlFor="add-staff">
              スタッフ
            </label>
            <select
              id="add-staff"
              value={addStaffId}
              onChange={(e) => setAddStaffId(e.target.value)}
              className="rounded-md border border-slate-200 px-2 py-1.5 text-xs"
            >
              <option value="">スタッフを選択</option>
              {unassigned.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <label className="sr-only" htmlFor="add-start">
              開始時刻
            </label>
            <select
              id="add-start"
              value={addStart}
              onChange={(e) => setAddStart(e.target.value)}
              className="rounded-md border border-slate-200 px-1.5 py-1.5 text-xs"
            >
              {timeOptions.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <span className="text-xs text-slate-400" aria-hidden>
              -
            </span>
            <label className="sr-only" htmlFor="add-end">
              終了時刻
            </label>
            <select
              id="add-end"
              value={addEnd}
              onChange={(e) => setAddEnd(e.target.value)}
              className="rounded-md border border-slate-200 px-1.5 py-1.5 text-xs"
            >
              {timeOptions.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <label htmlFor="add-break" className="text-xs text-slate-400">
              休憩
            </label>
            <select
              id="add-break"
              value={addBreakMin}
              onChange={(e) => setAddBreakMin(e.target.value)}
              className="rounded-md border border-slate-200 px-1.5 py-1.5 text-xs"
            >
              <option value="auto">自動</option>
              {BREAK_OPTIONS.map((b) => (
                <option key={b} value={String(b)}>
                  {b === 0 ? "なし" : `${b}分`}
                </option>
              ))}
            </select>
            <button
              type="submit"
              disabled={!addStaffId || addStart >= addEnd}
              className="rounded-md bg-indigo-600 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              追加
            </button>
          </form>
        )}
      </div>

      {/* 編集ポップオーバー */}
      {edit && (
        <>
          <div className="fixed inset-0 z-40" onClick={closeEdit} aria-hidden />
          <div
            ref={editRef}
            role="dialog"
            aria-label={`${edit.staff.name} ${dayLabel(date)} のシフトを編集`}
            className="fixed z-50 w-60 rounded-xl border border-slate-200 bg-white p-3.5 shadow-xl"
            style={{ left: edit.x, top: edit.y }}
          >
            <p className="mb-2 text-xs font-semibold text-slate-700">
              {edit.staff.name} · {dayLabel(date)}
            </p>
            <div className="flex items-center gap-1">
              <label className="sr-only" htmlFor="edit-start">
                開始時刻
              </label>
              <select
                id="edit-start"
                value={start}
                onChange={(e) => setStart(e.target.value)}
                className="w-full rounded-md border border-slate-200 px-1 py-1.5 text-xs"
              >
                {timeOptions.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              <span className="text-xs text-slate-400" aria-hidden>
                -
              </span>
              <label className="sr-only" htmlFor="edit-end">
                終了時刻
              </label>
              <select
                id="edit-end"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                className="w-full rounded-md border border-slate-200 px-1 py-1.5 text-xs"
              >
                {timeOptions.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div className="mt-2 flex items-center gap-1">
              <label htmlFor="edit-break" className="shrink-0 text-[10px] text-slate-400">
                休憩
              </label>
              <select
                id="edit-break"
                value={breakMin}
                onChange={(e) => setBreakMin(e.target.value)}
                className="w-full rounded-md border border-slate-200 px-1 py-1.5 text-xs"
              >
                {BREAK_OPTIONS.map((b) => (
                  <option key={b} value={String(b)}>
                    {b === 0 ? "なし" : `${b}分`}
                  </option>
                ))}
              </select>
              {breakMinNum > 0 && (
                <>
                  <label className="sr-only" htmlFor="edit-break-start">
                    休憩開始時刻
                  </label>
                  <select
                    id="edit-break-start"
                    value={validBreakStart}
                    onChange={(e) => setBreakStart(e.target.value)}
                    className="w-full rounded-md border border-slate-200 px-1 py-1.5 text-xs"
                  >
                    {breakStartOptions.map((t) => (
                      <option key={t} value={t}>
                        {t}〜
                      </option>
                    ))}
                  </select>
                </>
              )}
            </div>
            <button
              onClick={() => {
                if (start < end) {
                  updateAssignment({
                    ...edit.assignment,
                    startTime: start,
                    endTime: end,
                    breakMinutes: breakMinNum,
                    breakStartTime:
                      breakMinNum > 0 && validBreakStart ? validBreakStart : undefined,
                    source: "manual",
                  });
                  closeEdit();
                }
              }}
              disabled={start >= end}
              className="mt-2.5 w-full rounded-md bg-indigo-600 py-2 text-xs font-medium text-white hover:bg-indigo-700 disabled:bg-slate-300"
            >
              時間を変更
            </button>
            <button
              onClick={() => {
                removeAssignment(edit.assignment.id);
                closeEdit();
              }}
              className="mt-1.5 w-full rounded-md bg-red-50 py-2 text-xs font-medium text-red-700 hover:bg-red-100"
            >
              このシフトを削除
            </button>
          </div>
        </>
      )}
    </div>
  );
}
