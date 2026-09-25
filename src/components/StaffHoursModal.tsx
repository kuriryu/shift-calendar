"use client";

import Icon from "@/components/Icon";
import { dayLabel, daysOfMonth, weeksOfMonth, weekKeyOf } from "@/lib/dates";
import { workMinutesOf } from "@/lib/time";
import type { ShiftAssignment, Staff } from "@/types";

function formatHours(minutes: number): string {
  const h = Math.round((minutes / 60) * 10) / 10;
  return Number.isInteger(h) ? String(h) : h.toFixed(1);
}

/** 選択スタッフの今週・今月の稼働時間を表示するモーダル */
export default function StaffHoursModal({
  staff,
  date,
  assignments,
  onClose,
  onEditToday,
}: {
  staff: Staff;
  /** 基準日（属する週・月の集計に使う） */
  date: string;
  assignments: ShiftAssignment[];
  onClose: () => void;
  /** その日にシフトがある場合の編集導線 */
  onEditToday?: () => void;
}) {
  const month = date.slice(0, 7);
  const monthDays = new Set(daysOfMonth(month));
  const week = weeksOfMonth(month).find(
    (w) => w.key === weekKeyOf(date) || w.dates.includes(date),
  );
  const weekDates = new Set(week?.dates ?? [date]);

  const mine = assignments.filter((a) => a.staffId === staff.id);
  const weekMin = mine
    .filter((a) => weekDates.has(a.date))
    .reduce((sum, a) => sum + workMinutesOf(a), 0);
  const monthMin = mine
    .filter((a) => monthDays.has(a.date))
    .reduce((sum, a) => sum + workMinutesOf(a), 0);
  const todayAssignment = mine.find((a) => a.date === date);
  const monthWorkDays = new Set(
    mine.filter((a) => monthDays.has(a.date)).map((a) => a.date),
  ).size;
  const desiredDays = staff.desiredWorkDays ?? 0;
  const desiredHours = staff.desiredMonthlyHours ?? 0;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/40 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={`hours-title-${staff.id}`}
        className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white px-6 pt-10 pb-2 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3
          id={`hours-title-${staff.id}`}
          className="text-base font-bold text-slate-900"
        >
          {staff.name}
        </h3>
        <p className="mt-1 text-xs text-slate-500">
          {dayLabel(date)} 時点の稼働（休憩を除く実働）
        </p>

        <dl className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-blue-50/80 px-4 py-4">
            <dt className="text-[11px] font-medium text-blue-700/80">今週</dt>
            <dd className="mt-1.5 text-2xl font-bold tabular-nums text-blue-900">
              {formatHours(weekMin)}
              <span className="ml-1 text-sm font-medium">時間</span>
            </dd>
            {week && (
              <p className="mt-1 text-[10px] text-blue-600/70">{week.label}</p>
            )}
          </div>
          <div className="rounded-xl bg-slate-100 px-4 py-4">
            <dt className="text-[11px] font-medium text-slate-500">今月</dt>
            <dd className="mt-1.5 text-2xl font-bold tabular-nums text-slate-900">
              {formatHours(monthMin)}
              <span className="ml-1 text-sm font-medium">時間</span>
            </dd>
            <p className="mt-1 text-[10px] text-slate-400">{month}</p>
          </div>
        </dl>

        {(desiredDays > 0 || desiredHours > 0) && (
          <p className="mt-3 text-xs text-slate-600">
            {desiredDays > 0 && (
              <span>
                出勤 {monthWorkDays}日 / 希望 {desiredDays}日
              </span>
            )}
            {desiredDays > 0 && desiredHours > 0 && (
              <span className="mx-2 text-slate-300" aria-hidden>
                ·
              </span>
            )}
            {desiredHours > 0 && (
              <span>
                実働 {formatHours(monthMin)}時間 / 希望 {desiredHours}時間
              </span>
            )}
          </p>
        )}

        {staff.maxHoursPerWeek > 0 && (
          <div className="mt-5">
            <p className="text-xs text-slate-500">
              週の上限 {staff.maxHoursPerWeek} 時間
              {weekMin / 60 > staff.maxHoursPerWeek && (
                <span className="ml-1 font-medium text-amber-700">（超過）</span>
              )}
            </p>
          </div>
        )}

        <div className="mt-8 flex flex-col gap-2">
          {todayAssignment && onEditToday && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onEditToday();
              }}
              className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-3 py-3 text-sm font-semibold text-white hover:bg-blue-700"
            >
              <Icon name="edit" size={18} />
              この日のシフトを編集
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-lg py-2.5 text-xs font-medium text-slate-500 hover:bg-slate-50"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}
