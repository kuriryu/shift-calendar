"use client";

import { useState } from "react";
import { EMPTY_ASSIGNMENTS, useAppStore } from "@/stores/useAppStore";
import { useMounted } from "@/hooks/useMounted";
import { businessHoursOf } from "@/lib/coverage";
import Icon from "@/components/Icon";
import StaffEditModal from "@/components/StaffEditModal";
import { toMinutes } from "@/lib/time";
import { dayLabel } from "@/lib/dates";
import type { Role, ShiftAssignment, Staff } from "@/types";

const ROLE_BAR: Record<Role, string> = {
  employee: "bg-indigo-400",
  part_time: "bg-emerald-400",
  student: "bg-amber-400",
};

const TIME_OPTIONS: string[] = [];
for (let m = 9 * 60; m <= 21 * 60 + 30; m += 30) {
  TIME_OPTIONS.push(
    `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`,
  );
}

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
  const allViolations = useAppStore((s) => s.violations);
  const assignments = monthAssignments.filter((a) => a.date === date);
  const violations = allViolations.filter((v) => v.date === date);
  const updateAssignment = useAppStore((s) => s.updateAssignment);
  const removeAssignment = useAppStore((s) => s.removeAssignment);
  const addAssignment = useAppStore((s) => s.addAssignment);

  const [edit, setEdit] = useState<EditState | null>(null);
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("18:00");
  const [breakMin, setBreakMin] = useState("60");
  const [breakStart, setBreakStart] = useState("14:00");
  const [addStaffId, setAddStaffId] = useState("");
  const [addStart, setAddStart] = useState("09:00");
  const [addEnd, setAddEnd] = useState("13:00");
  const [addBreakMin, setAddBreakMin] = useState("auto");
  const [creatingStaff, setCreatingStaff] = useState(false);
  const hiddenStaffIds = useAppStore((s) => s.hiddenStaffIds);

  if (!mounted) {
    return <div className="py-20 text-center text-sm text-slate-400">読み込み中…</div>;
  }

  const { open: openMin, close: closeMin } = businessHoursOf(date);
  const total = closeMin - openMin;
  const staffById = new Map(staff.map((s) => [s.id, s]));

  // 行は全スタッフ（絞り込み反映・ストア順）。未割当のスタッフは空行で表示する
  const hidden = new Set(hiddenStaffIds);
  const visibleStaff = staff.filter((s) => !hidden.has(s.id));
  const assignmentByStaff = new Map(assignments.map((a) => [a.staffId, a]));
  const unassigned = visibleStaff.filter((s) => !assignmentByStaff.has(s.id));

  const pct = (min: number) => ((min - openMin) / total) * 100;

  const openEdit = (e: React.MouseEvent, a: ShiftAssignment) => {
    setStart(a.startTime);
    setEnd(a.endTime);
    setBreakMin(String(a.breakMinutes));
    setBreakStart(a.breakStartTime ?? "14:00");
    const x = Math.min(e.clientX, window.innerWidth - 240);
    const y = Math.min(e.clientY, window.innerHeight - 320);
    setEdit({ assignment: a, staff: staffById.get(a.staffId)!, x, y });
  };

  // 選択中の勤務時間・休憩時間に対して有効な休憩開始時刻の候補
  const breakMinNum = Number(breakMin);
  const breakStartOptions =
    breakMinNum > 0 && start < end
      ? TIME_OPTIONS.filter((t) => {
          const m = toMinutes(t);
          return m >= toMinutes(start) && m + breakMinNum <= toMinutes(end);
        })
      : [];
  const validBreakStart = breakStartOptions.includes(breakStart)
    ? breakStart
    : (breakStartOptions[0] ?? "");

  const hours: number[] = [];
  for (let m = openMin; m <= closeMin; m += 60) hours.push(m);

  const errors = violations.filter((v) => v.severity === "error");
  const warnings = violations.filter((v) => v.severity === "warning");

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <h2 className="text-lg font-bold text-slate-800">{dayLabel(date)}</h2>
        <span className="text-xs text-slate-400">
          バーをクリックで編集（休憩は白い切れ目）
        </span>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        {/* 時間軸 */}
        <div className="relative ml-28 h-5">
          {hours.map((m) => (
            <span
              key={m}
              className="absolute -translate-x-1/2 text-[10px] text-slate-400"
              style={{ left: `${pct(m)}%` }}
            >
              {Math.floor(m / 60)}
            </span>
          ))}
        </div>

        <div className="relative">
          {/* ピーク時間帯の背景 */}
          {settings.peakHours.map((r, i) => (
            <div
              key={i}
              className="absolute top-0 bottom-0 bg-rose-50"
              style={{
                left: `${pct(toMinutes(r.start))}%`,
                width: `${pct(toMinutes(r.end)) - pct(toMinutes(r.start))}%`,
              }}
            />
          ))}
          {/* グリッド線 */}
          {hours.map((m) => (
            <div
              key={m}
              className="absolute top-0 bottom-0 border-l border-slate-100"
              style={{ left: `${pct(m)}%` }}
            />
          ))}

          {visibleStaff.map((s) => {
            const a = assignmentByStaff.get(s.id);
            const sMin = a ? toMinutes(a.startTime) : 0;
            const eMin = a ? toMinutes(a.endTime) : 0;
            return (
              <div key={s.id} className="relative flex h-9 items-center">
                <div className="absolute -left-28 w-24 truncate text-right text-xs font-medium text-slate-700">
                  {s.name}
                </div>
                {a && (
                  <button
                    onClick={(e) => openEdit(e, a)}
                    className={`absolute h-6 rounded-md ${ROLE_BAR[s.role]} text-left text-[10px] font-semibold text-white shadow-sm hover:opacity-80`}
                    style={{
                      left: `${pct(sMin)}%`,
                      width: `${pct(eMin) - pct(sMin)}%`,
                    }}
                  >
                    <span className="px-1.5 leading-6">
                      {a.startTime}-{a.endTime}
                    </span>
                    {a.breakStartTime && a.breakMinutes > 0 && (
                      <span
                        className="absolute top-0 h-full bg-white/90"
                        style={{
                          left: `${((toMinutes(a.breakStartTime) - sMin) / (eMin - sMin)) * 100}%`,
                          width: `${(a.breakMinutes / (eMin - sMin)) * 100}%`,
                        }}
                      />
                    )}
                  </button>
                )}
              </div>
            );
          })}

          {visibleStaff.length === 0 && (
            <p className="py-8 text-center text-sm text-slate-400">
              表示するスタッフがいません（サイドバーの絞り込みを確認してください）
            </p>
          )}

          {/* スタッフ新規登録バー */}
          <button
            onClick={() => setCreatingStaff(true)}
            className="relative mt-1 flex h-9 w-full items-center justify-center gap-1 rounded-lg border border-dashed border-slate-300 text-xs font-medium text-slate-400 transition-colors hover:border-indigo-300 hover:bg-indigo-50/50 hover:text-indigo-600"
          >
            <Icon name="person_add" size={16} />
            スタッフを新規登録
          </button>
        </div>

        {/* 追加フォーム */}
        {unassigned.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
            <span className="text-xs font-medium text-slate-500">＋ 追加</span>
            <select
              value={addStaffId}
              onChange={(e) => setAddStaffId(e.target.value)}
              className="rounded border border-slate-200 px-2 py-1 text-xs"
            >
              <option value="">スタッフを選択</option>
              {unassigned.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <select
              value={addStart}
              onChange={(e) => setAddStart(e.target.value)}
              className="rounded border border-slate-200 px-1 py-1 text-xs"
            >
              {TIME_OPTIONS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <span className="text-xs text-slate-400">-</span>
            <select
              value={addEnd}
              onChange={(e) => setAddEnd(e.target.value)}
              className="rounded border border-slate-200 px-1 py-1 text-xs"
            >
              {TIME_OPTIONS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <span className="text-xs text-slate-400">休憩</span>
            <select
              value={addBreakMin}
              onChange={(e) => setAddBreakMin(e.target.value)}
              className="rounded border border-slate-200 px-1 py-1 text-xs"
            >
              <option value="auto">自動</option>
              {BREAK_OPTIONS.map((b) => (
                <option key={b} value={String(b)}>
                  {b === 0 ? "なし" : `${b}分`}
                </option>
              ))}
            </select>
            <button
              onClick={() => {
                if (addStaffId && addStart < addEnd) {
                  addAssignment({
                    staffId: addStaffId,
                    date,
                    startTime: addStart,
                    endTime: addEnd,
                    ...(addBreakMin !== "auto"
                      ? { breakMinutes: Number(addBreakMin) }
                      : {}),
                  });
                  setAddStaffId("");
                }
              }}
              className="rounded-md bg-indigo-600 px-3 py-1 text-xs font-medium text-white hover:bg-indigo-700"
            >
              追加
            </button>
          </div>
        )}
      </div>

      {/* 違反パネル */}
      {(errors.length > 0 || warnings.length > 0) && (
        <div className="space-y-2">
          {errors.map((v, i) => (
            <div
              key={`e-${i}`}
              className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700"
            >
              ⛔ {v.message}
            </div>
          ))}
          {warnings.map((v, i) => (
            <div
              key={`w-${i}`}
              className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700"
            >
              ⚠️ {v.message}
            </div>
          ))}
        </div>
      )}

      {/* 編集ポップオーバー */}
      {edit && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setEdit(null)} />
          <div
            className="fixed z-50 w-56 rounded-xl border border-slate-200 bg-white p-3 shadow-xl"
            style={{ left: edit.x, top: edit.y }}
          >
            <p className="mb-2 text-xs font-semibold text-slate-700">
              {edit.staff.name} · {dayLabel(date)}
            </p>
            <div className="flex items-center gap-1">
              <select
                value={start}
                onChange={(e) => setStart(e.target.value)}
                className="w-full rounded border border-slate-200 px-1 py-1 text-xs"
              >
                {TIME_OPTIONS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              <span className="text-xs text-slate-400">-</span>
              <select
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                className="w-full rounded border border-slate-200 px-1 py-1 text-xs"
              >
                {TIME_OPTIONS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div className="mt-1.5 flex items-center gap-1">
              <span className="shrink-0 text-[10px] text-slate-400">休憩</span>
              <select
                value={breakMin}
                onChange={(e) => setBreakMin(e.target.value)}
                className="w-full rounded border border-slate-200 px-1 py-1 text-xs"
              >
                {BREAK_OPTIONS.map((b) => (
                  <option key={b} value={String(b)}>
                    {b === 0 ? "なし" : `${b}分`}
                  </option>
                ))}
              </select>
              {breakMinNum > 0 && (
                <select
                  value={validBreakStart}
                  onChange={(e) => setBreakStart(e.target.value)}
                  className="w-full rounded border border-slate-200 px-1 py-1 text-xs"
                >
                  {breakStartOptions.map((t) => (
                    <option key={t} value={t}>
                      {t}〜
                    </option>
                  ))}
                </select>
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
                      breakMinNum > 0 && validBreakStart
                        ? validBreakStart
                        : undefined,
                    source: "manual",
                  });
                  setEdit(null);
                }
              }}
              className="mt-2 w-full rounded-md bg-indigo-600 py-1.5 text-xs font-medium text-white hover:bg-indigo-700"
            >
              時間を変更
            </button>
            <button
              onClick={() => {
                removeAssignment(edit.assignment.id);
                setEdit(null);
              }}
              className="mt-1.5 w-full rounded-md bg-red-50 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100"
            >
              このシフトを削除
            </button>
          </div>
        </>
      )}

      {/* スタッフ新規登録モーダル */}
      <StaffEditModal
        staff={null}
        isOpen={creatingStaff}
        onClose={() => setCreatingStaff(false)}
      />
    </div>
  );
}
