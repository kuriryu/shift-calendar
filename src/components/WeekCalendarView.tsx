"use client";

import Icon from "@/components/Icon";
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
  dayLabel,
  formatDate,
  parseDate,
  weekKeyOf,
  weeksOfMonth,
} from "@/lib/dates";
import { staffColorOf } from "@/lib/staff-color";
import type { ShiftAssignment, Staff } from "@/types";

const WEEKDAY_HEADERS = ["月", "火", "水", "木", "金", "土", "日"] as const;

/** 選択日を含む週の7日（月〜日）。月外の日も含む */
function weekDatesAround(dateStr: string): string[] {
  const monday = parseDate(weekKeyOf(dateStr));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return formatDate(d);
  });
}

function shortTime(t: string): string {
  const [h, m] = t.split(":").map(Number);
  return m === 0 ? String(h) : `${h}.5`;
}

export default function WeekCalendarView({
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
  const weekDates = weekDatesAround(selectedDate);
  const weeks = weeksOfMonth(month);
  const weekIndex = Math.max(
    0,
    weeks.findIndex(
      (w) => w.key === weekKeyOf(selectedDate) || w.dates.includes(selectedDate),
    ),
  );
  const currentWeek = weeks[weekIndex] ?? weeks[0];

  const select = (date: string) => {
    setSelectedDate(date);
    onSelectDate?.(date);
  };

  const goWeek = (delta: number) => {
    const next = weeks[weekIndex + delta];
    if (!next) return;
    const prefer =
      next.dates.find((d) => d === selectedDate) ??
      next.dates.find((d) => Number(d.slice(8)) === Number(selectedDate.slice(8))) ??
      next.dates[0];
    select(prefer);
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
    <div className="space-y-3">
      {currentWeek && (
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => goWeek(-1)}
            disabled={weekIndex <= 0}
            aria-label="前の週"
            className="rounded-full border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Icon name="chevron_left" size={20} />
          </button>
          <p
            className="min-w-[8rem] text-center text-sm font-semibold text-slate-800"
            aria-live="polite"
          >
            {currentWeek.label}
          </p>
          <button
            onClick={() => goWeek(1)}
            disabled={weekIndex >= weeks.length - 1}
            aria-label="次の週"
            className="rounded-full border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Icon name="chevron_right" size={20} />
          </button>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <div className="grid min-w-[42rem] grid-cols-7 divide-x divide-slate-100">
          {weekDates.map((date, i) => {
            const inMonth = date.startsWith(month);
            const dayAssignments = assignments
              .filter((a) => a.date === date && !hidden.has(a.staffId))
              .sort((a, b) => a.startTime.localeCompare(b.startTime));
            const selected = date === selectedDate;
            return (
              <div
                key={date}
                className={`flex min-h-48 flex-col ${
                  selected ? "bg-indigo-50/50" : inMonth ? "bg-white" : "bg-slate-50/80"
                }`}
              >
                <button
                  onClick={() => select(date)}
                  aria-label={`${dayLabel(date)}(${WEEKDAY_HEADERS[i]}) ${
                    selected ? "選択中" : ""
                  }`}
                  aria-pressed={selected}
                  className={`flex flex-col items-center border-b border-slate-100 px-1 py-2 ${
                    selected ? "bg-indigo-600 text-white" : "hover:bg-slate-50"
                  }`}
                >
                  <span className="text-[10px] opacity-80">{WEEKDAY_HEADERS[i]}</span>
                  <span className="text-sm font-semibold">
                    {Number(date.slice(8))}
                  </span>
                </button>
                <ul className="flex flex-1 flex-col gap-1 p-1.5">
                  {dayAssignments.map((a) => {
                    const s = staffMap.get(a.staffId);
                    const color = staffColorOf(a.staffId);
                    return (
                      <li key={a.id}>
                        <button
                          type="button"
                          onClick={(e) => openHours(e, a)}
                          className="w-full truncate rounded px-1.5 py-1 text-left text-[10px] font-medium text-white hover:opacity-90"
                          style={{ backgroundColor: color.bg }}
                          title={`${s?.name ?? a.staffId} ${a.startTime}–${a.endTime}。タップで稼働時間`}
                          aria-label={`${s?.name ?? a.staffId} ${a.startTime}〜${a.endTime}。タップで稼働時間を表示`}
                        >
                          {s?.name ?? a.staffId} {shortTime(a.startTime)}–
                          {shortTime(a.endTime)}
                        </button>
                      </li>
                    );
                  })}
                  {dayAssignments.length === 0 && (
                    <li className="px-1 py-2 text-center text-[10px] text-slate-300">
                      —
                    </li>
                  )}
                </ul>
              </div>
            );
          })}
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
