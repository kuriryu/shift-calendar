"use client";

import { useCallback, useState } from "react";
import AssignmentAddForm from "@/components/AssignmentAddForm";
import AssignmentEditPopover, {
  type AssignmentEditTarget,
} from "@/components/AssignmentEditPopover";
import StaffHoursModal from "@/components/StaffHoursModal";
import { EMPTY_ASSIGNMENTS, useAppStore } from "@/stores/useAppStore";
import { useMounted } from "@/hooks/useMounted";
import { timeOptionsOf } from "@/lib/coverage";
import {
  daysOfMonth,
  formatDate,
  monthLabel,
  weekdayOf,
} from "@/lib/dates";
import { staffColorOf } from "@/lib/staff-color";
import type { ShiftAssignment, Staff } from "@/types";

const WEEKDAY_HEADERS = ["月", "火", "水", "木", "金", "土", "日"] as const;

function shortTime(t: string): string {
  const [h, m] = t.split(":").map(Number);
  return m === 0 ? String(h) : `${h}.5`;
}

/** Googleカレンダー風の月グリッド。日付セルにスタッフ色のチップを並べる */
export default function MonthCalendarView({
  onSelectDate,
}: {
  onSelectDate?: (date: string) => void;
}) {
  const mounted = useMounted();
  const month = useAppStore((s) => s.selectedMonth);
  const selectedDate = useAppStore((s) => s.selectedDate);
  const setSelectedDate = useAppStore((s) => s.setSelectedDate);
  const staff = useAppStore((s) => s.staff);
  const settings = useAppStore((s) => s.settings);
  const hiddenStaffIds = useAppStore((s) => s.hiddenStaffIds);
  const assignments = useAppStore(
    (s) => s.assignments[s.selectedMonth] ?? EMPTY_ASSIGNMENTS,
  );

  const [edit, setEdit] = useState<AssignmentEditTarget | null>(null);
  const [hoursTarget, setHoursTarget] = useState<{
    staff: Staff;
    date: string;
    assignment: ShiftAssignment;
  } | null>(null);
  const closeEdit = useCallback(() => setEdit(null), []);

  if (!mounted) {
    return <div className="py-20 text-center text-sm text-slate-400">読み込み中…</div>;
  }

  const hidden = new Set(hiddenStaffIds);
  const staffMap = new Map(staff.map((s) => [s.id, s]));
  const timeOptions = timeOptionsOf(settings);
  const days = daysOfMonth(month);
  const firstWeekday = weekdayOf(days[0]);
  const leadBlanks = firstWeekday === 0 ? 6 : firstWeekday - 1;
  const lastWeekday = weekdayOf(days[days.length - 1]);
  const tailBlanks = lastWeekday === 0 ? 0 : 7 - lastWeekday;
  const cells: (string | null)[] = [
    ...Array.from({ length: leadBlanks }, () => null),
    ...days,
    ...Array.from({ length: tailBlanks }, () => null),
  ];
  const today = formatDate(new Date());

  const select = (date: string) => {
    setSelectedDate(date);
    onSelectDate?.(date);
  };

  const openHours = (e: React.MouseEvent, a: ShiftAssignment) => {
    e.stopPropagation();
    const staffMember = staffMap.get(a.staffId);
    if (!staffMember) return;
    setSelectedDate(a.date);
    onSelectDate?.(a.date);
    setHoursTarget({ staff: staffMember, date: a.date, assignment: a });
  };

  const openEditFromHours = () => {
    if (!hoursTarget) return;
    setEdit({
      assignment: hoursTarget.assignment,
      staff: hoursTarget.staff,
      date: hoursTarget.date,
      x: typeof window !== "undefined" ? Math.min(window.innerWidth / 2 - 140, window.innerWidth - 300) : 200,
      y: typeof window !== "undefined" ? Math.min(window.innerHeight / 3, window.innerHeight - 480) : 120,
    });
  };

  const assignedOnSelected = new Set(
    assignments.filter((a) => a.date === selectedDate).map((a) => a.staffId),
  );
  const addCandidates = staff.filter(
    (s) => !hidden.has(s.id) && !assignedOnSelected.has(s.id),
  );

  return (
    <div
      key={month}
      className="animate-[fadeIn_200ms_cubic-bezier(0.16,1,0.3,1)] space-y-4"
    >
      <div className="overflow-hidden rounded-none border border-slate-200 bg-white">
        <p className="sticky top-0 z-10 border-b border-slate-200 bg-white px-4 py-2 text-lg font-bold leading-normal text-slate-900">
          {monthLabel(month)}
        </p>
        <div className="sticky top-10 z-10 grid grid-cols-7 border-b border-slate-200 bg-white">
          {WEEKDAY_HEADERS.map((w) => (
            <span
              key={w}
              className="py-2 text-center text-xs font-medium leading-4 text-slate-500"
            >
              {w}
            </span>
          ))}
        </div>
        <div className="grid grid-cols-7 auto-rows-[minmax(5.5rem,auto)]">
          {cells.map((d, i) =>
            d === null ? (
              <div key={`blank-${i}`} className="rounded-none border border-slate-200 bg-slate-200/50" />
            ) : (
              (() => {
                const dayAssignments = assignments
                  .filter((a) => a.date === d && !hidden.has(a.staffId))
                  .sort((a, b) => a.startTime.localeCompare(b.startTime));
                const selected = d === selectedDate;
                const isToday = d === today;
                const extra = dayAssignments.length - 3;
                return (
                  <div
                    key={d}
                    className={`flex flex-col items-stretch gap-1 rounded-none border border-slate-200 p-2 text-left ${
                      selected ? "bg-slate-100" : "bg-white"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => select(d)}
                      aria-label={`${Number(d.slice(8))}日 出勤${dayAssignments.length}名${
                        selected ? " 選択中" : ""
                      }${isToday ? " 今日" : ""}`}
                      aria-pressed={selected}
                      className={`mb-1 inline-flex h-6 w-6 items-center justify-center rounded-none text-sm font-semibold leading-5 tabular-nums hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 ${
                        isToday ? "text-slate-900 underline decoration-blue-600" : "text-slate-900"
                      }`}
                    >
                      {Number(d.slice(8))}
                    </button>
                    {dayAssignments.slice(0, 3).map((a) => {
                      const s = staffMap.get(a.staffId);
                      const color = staffColorOf(a.staffId);
                      return (
                        <button
                          key={a.id}
                          type="button"
                          onClick={(e) => openHours(e, a)}
                          className="truncate rounded px-1 py-0.5 text-left text-[9px] font-medium tabular-nums text-white hover:opacity-90 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
                          style={{ backgroundColor: color.bg }}
                          title={`${s?.name ?? a.staffId} ${a.startTime}–${a.endTime}。タップで稼働時間`}
                          aria-label={`${s?.name ?? a.staffId} ${a.startTime}〜${a.endTime}。タップで稼働時間を表示`}
                        >
                          {s?.name ?? a.staffId} {shortTime(a.startTime)}–
                          {shortTime(a.endTime)}
                        </button>
                      );
                    })}
                    {extra > 0 && (
                      <button
                        type="button"
                        onClick={() => select(d)}
                        className="px-1 text-left text-[9px] text-slate-400 hover:text-slate-600"
                      >
                        +{extra}件
                      </button>
                    )}
                  </div>
                );
              })()
            ),
          )}
        </div>
      </div>

      <AssignmentAddForm date={selectedDate} candidates={addCandidates} />

      {edit && (
        <AssignmentEditPopover
          edit={edit}
          timeOptions={timeOptions}
          onClose={closeEdit}
        />
      )}

      {hoursTarget && (
        <StaffHoursModal
          staff={hoursTarget.staff}
          date={hoursTarget.date}
          assignments={assignments}
          onClose={() => setHoursTarget(null)}
          onEditToday={openEditFromHours}
        />
      )}
    </div>
  );
}
