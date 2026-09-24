"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { EMPTY_ASSIGNMENTS, useAppStore } from "@/stores/useAppStore";
import { useMounted } from "@/hooks/useMounted";
import { businessHoursOf, timeOptionsOf } from "@/lib/coverage";
import Icon from "@/components/Icon";
import AssignmentAddForm from "@/components/AssignmentAddForm";
import AssignmentEditPopover, {
  positionEditPopover,
  type AssignmentEditTarget,
} from "@/components/AssignmentEditPopover";
import StaffHoursModal from "@/components/StaffHoursModal";
import { navCircleButtonClassName } from "@/components/FieldControl";
import { toMinutes } from "@/lib/time";
import { dayLabel, daysOfMonth, weekdayLabel } from "@/lib/dates";
import type { ShiftAssignment, Staff } from "@/types";
import { staffColorOf } from "@/lib/staff-color";

export default function DayTimeline({ date }: { date: string }) {
  const mounted = useMounted();
  const staff = useAppStore((s) => s.staff);
  const settings = useAppStore((s) => s.settings);
  const monthAssignments = useAppStore(
    (s) => s.assignments[s.selectedMonth] ?? EMPTY_ASSIGNMENTS,
  );
  const assignments = monthAssignments.filter((a) => a.date === date);
  const hiddenStaffIds = useAppStore((s) => s.hiddenStaffIds);
  const highlight = useAppStore((s) => s.highlight);
  const clearHighlight = useAppStore((s) => s.clearHighlight);
  const setSelectedDate = useAppStore((s) => s.setSelectedDate);
  const reorderStaff = useAppStore((s) => s.reorderStaff);

  const [edit, setEdit] = useState<AssignmentEditTarget | null>(null);
  const [hoursStaff, setHoursStaff] = useState<Staff | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const lastOverRef = useRef<string | null>(null);
  const closeEdit = useCallback(() => setEdit(null), []);
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
    const staffMember = staffById.get(a.staffId);
    if (!staffMember) return;
    const { x, y } = positionEditPopover(e);
    setEdit({ assignment: a, staff: staffMember, date, x, y });
  };

  const onStaffDragStart = (e: React.DragEvent, id: string) => {
    setDragId(id);
    lastOverRef.current = null;
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", id);
  };
  const onStaffDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    const id = dragId || e.dataTransfer.getData("text/plain");
    if (!id || id === targetId) return;
    if (lastOverRef.current === targetId) return;
    lastOverRef.current = targetId;
    reorderStaff(id, targetId);
  };
  const onStaffDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain") || dragId;
    if (id && id !== targetId) reorderStaff(id, targetId);
    setDragId(null);
    lastOverRef.current = null;
  };
  const onStaffDragEnd = () => {
    setDragId(null);
    lastOverRef.current = null;
  };

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
            className={navCircleButtonClassName}
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
            className={navCircleButtonClassName}
          >
            <Icon name="chevron_right" size={20} />
          </button>
        </div>
        <span className="text-xs text-slate-400">
          営業 {String(Math.floor(openMin / 60)).padStart(2, "0")}:{String(openMin % 60).padStart(2, "0")}〜
          {String(Math.floor(closeMin / 60)).padStart(2, "0")}:{String(closeMin % 60).padStart(2, "0")}
          ・名前をドラッグで並べ替え／タップで稼働時間
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
        <div className="relative ml-36 h-6">
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

        <div className="relative ml-36">
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
                  draggable
                  onDragStart={(e) => onStaffDragStart(e, s.id)}
                  onDragOver={(e) => onStaffDragOver(e, s.id)}
                  onDrop={(e) => onStaffDrop(e, s.id)}
                  onDragEnd={onStaffDragEnd}
                  className={`relative flex h-11 items-center ${
                    isHl ? "violation-highlight bg-red-50/70" : ""
                  } ${dragId === s.id ? "opacity-60 ring-2 ring-inset ring-indigo-300" : ""}`}
                >
                  <div className="absolute -left-36 flex w-32 items-center gap-0.5 pr-1">
                    <span
                      className="inline-flex shrink-0 cursor-grab touch-none text-slate-300 active:cursor-grabbing"
                      title="ドラッグで並べ替え"
                      aria-hidden
                    >
                      <Icon name="drag_indicator" size={16} />
                    </span>
                    <button
                      type="button"
                      onClick={() => setHoursStaff(s)}
                      aria-label={`${s.name}の稼働時間を表示`}
                      className={`min-w-0 flex-1 truncate text-left text-xs font-medium hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-indigo-600 ${
                        isHl ? "text-red-700" : "text-slate-700"
                      }`}
                    >
                      {s.name}
                    </button>
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

        <AssignmentAddForm date={date} candidates={unassigned} />
      </div>

      {edit && (
        <AssignmentEditPopover
          edit={edit}
          timeOptions={timeOptions}
          onClose={closeEdit}
        />
      )}

      {hoursStaff && (
        <StaffHoursModal
          staff={hoursStaff}
          date={date}
          assignments={monthAssignments}
          onClose={() => setHoursStaff(null)}
          onEditToday={
            assignmentByStaff.get(hoursStaff.id)
              ? () => {
                  const a = assignmentByStaff.get(hoursStaff.id)!;
                  setEdit({
                    assignment: a,
                    staff: hoursStaff,
                    date,
                    x: typeof window !== "undefined" ? window.innerWidth / 2 : 200,
                    y: typeof window !== "undefined" ? window.innerHeight / 3 : 120,
                  });
                }
              : undefined
          }
        />
      )}
    </div>
  );
}
