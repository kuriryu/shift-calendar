"use client";

import { useEffect, useRef } from "react";
import { EMPTY_ASSIGNMENTS, EMPTY_REQUESTS, useAppStore } from "@/stores/useAppStore";
import { useMounted } from "@/hooks/useMounted";
import { daysOfMonth, isWeekendOrFri, weekdayLabel } from "@/lib/dates";
import type { Role, ShiftAssignment, Staff, Violation } from "@/types";
import { ROLE_LABELS } from "@/types";
import { staffColorOf } from "@/lib/staff-color";

const ROLE_ORDER: Role[] = ["employee", "part_time", "student"];

/** "09:00" → "9", "13:30" → "13.5" */
function shortTime(t: string): string {
  const [h, m] = t.split(":").map(Number);
  return m === 0 ? String(h) : `${h}.5`;
}

export default function MonthMatrix({
  onSelectDate,
  assignments: assignmentsOverride,
  violations: violationsOverride,
  applyFilter = true,
}: {
  /** 日付ヘッダークリック時（時間ビューへの切替などに使う）。省略時はヘッダーはボタンにしない */
  onSelectDate?: (date: string) => void;
  /** 仮生成結果などストア以外のデータを表示するとき */
  assignments?: ShiftAssignment[];
  violations?: Violation[];
  /** サイドバーのスタッフ絞り込みを反映するか */
  applyFilter?: boolean;
}) {
  const mounted = useMounted();
  const staff = useAppStore((s) => s.staff);
  const month = useAppStore((s) => s.selectedMonth);
  const storeAssignments = useAppStore(
    (s) => s.assignments[s.selectedMonth] ?? EMPTY_ASSIGNMENTS,
  );
  const requests = useAppStore(
    (s) => s.requests[s.selectedMonth] ?? EMPTY_REQUESTS,
  );
  const storeViolations = useAppStore((s) => s.violations);
  const hiddenStaffIds = useAppStore((s) => s.hiddenStaffIds);
  const highlight = useAppStore((s) => s.highlight);
  const clearHighlight = useAppStore((s) => s.clearHighlight);
  const containerRef = useRef<HTMLDivElement>(null);

  const assignments = assignmentsOverride ?? storeAssignments;
  const violations = violationsOverride ?? storeViolations;

  // ハイライト対象の行へスクロールし、数秒後に解除
  const highlightToken = highlight?.token;
  useEffect(() => {
    if (!highlight || assignmentsOverride) return;
    const el = containerRef.current?.querySelector<HTMLElement>(
      highlight.staffId
        ? `[data-staff-id="${highlight.staffId}"]`
        : `[data-date="${highlight.date}"]`,
    );
    el?.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
    const timer = window.setTimeout(clearHighlight, 4500);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [highlightToken]);

  if (!mounted) {
    return <div className="py-20 text-center text-sm text-slate-400">読み込み中…</div>;
  }

  const days = daysOfMonth(month);
  const byStaffDate = new Map(assignments.map((a) => [`${a.staffId}:${a.date}`, a]));
  const requestOffSet = new Set(
    requests.filter((r) => r.type === "off").map((r) => `${r.staffId}:${r.date}`),
  );
  const errorDates = new Set(
    violations.filter((v) => v.severity === "error").map((v) => v.date),
  );
  const warnDates = new Set(
    violations
      .filter((v) => v.severity === "warning")
      .map((v) => v.date)
      .filter((d) => !errorDates.has(d)),
  );

  const hidden = new Set(applyFilter ? hiddenStaffIds : []);
  const grouped = ROLE_ORDER.map((role) => ({
    role,
    members: staff.filter((s) => s.role === role && !hidden.has(s.id)),
  }));

  const isHighlightedRow = (s: Staff) =>
    !assignmentsOverride && highlight?.staffId === s.id;
  const isHighlightedDate = (date: string) =>
    !assignmentsOverride && !highlight?.staffId && highlight?.date === date;

  const cellOf = (s: Staff, date: string) => {
    const a = byStaffDate.get(`${s.id}:${date}`);
    if (a) {
      const color = staffColorOf(s.id);
      return (
        <span
          className="inline-block w-full rounded px-0.5 py-1 text-[10px] font-medium leading-tight"
          style={{ backgroundColor: color.soft, color: color.text }}
        >
          {shortTime(a.startTime)}-{shortTime(a.endTime)}
        </span>
      );
    }
    if (requestOffSet.has(`${s.id}:${date}`)) {
      return <span className="text-[10px] text-slate-400">休</span>;
    }
    return (
      <span className="text-[10px] text-slate-200" aria-hidden>
        ・
      </span>
    );
  };

  return (
    <div ref={containerRef} className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="border-collapse text-center">
        <caption className="sr-only">
          {month} のシフト一覧。行がスタッフ、列が日付です。赤い列はエラー、黄色の列は警告がある日です。
        </caption>
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50">
            <th
              scope="col"
              className="sticky left-0 z-10 min-w-32 bg-slate-50 px-4 py-2.5 text-left text-xs font-semibold text-slate-600"
            >
              スタッフ
            </th>
            {days.map((date) => {
              const dayNum = Number(date.slice(8));
              const tint = errorDates.has(date)
                ? "bg-red-100"
                : warnDates.has(date)
                  ? "bg-amber-50"
                  : isWeekendOrFri(date)
                    ? "bg-sky-50"
                    : "";
              const status = errorDates.has(date)
                ? " エラーあり"
                : warnDates.has(date)
                  ? " 警告あり"
                  : "";
              const inner = (
                <>
                  <span className="text-xs font-semibold text-slate-700">{dayNum}</span>
                  <span className="text-[9px] text-slate-400">{weekdayLabel(date)}</span>
                </>
              );
              return (
                <th
                  key={date}
                  scope="col"
                  data-date={date}
                  className={`min-w-10 px-1 py-1.5 ${tint} ${
                    isHighlightedDate(date) ? "violation-highlight" : ""
                  }`}
                >
                  {onSelectDate ? (
                    <button
                      onClick={() => onSelectDate(date)}
                      className="flex w-full flex-col items-center rounded py-0.5 hover:bg-white/70"
                      aria-label={`${dayNum}日(${weekdayLabel(date)})${status} を時間ビューで表示`}
                    >
                      {inner}
                    </button>
                  ) : (
                    <div className="flex w-full flex-col items-center py-0.5">{inner}</div>
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {grouped.map(({ role, members }) =>
            members.map((s, i) => (
              <tr
                key={s.id}
                data-staff-id={s.id}
                className={`border-b border-slate-100 ${
                  isHighlightedRow(s) ? "violation-highlight bg-red-50" : ""
                }`}
              >
                <th
                  scope="row"
                  className="sticky left-0 z-10 bg-white px-4 py-1.5 text-left font-normal"
                >
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-xs font-medium text-slate-700">{s.name}</span>
                    {i === 0 && (
                      <span className="text-[9px] text-slate-400">{ROLE_LABELS[role]}</span>
                    )}
                  </div>
                </th>
                {days.map((date) => {
                  const tint = errorDates.has(date)
                    ? "bg-red-50"
                    : warnDates.has(date)
                      ? "bg-amber-50/50"
                      : isWeekendOrFri(date)
                        ? "bg-sky-50/40"
                        : "";
                  return (
                    <td key={date} className={`px-0.5 py-1.5 ${tint}`}>
                      {cellOf(s, date)}
                    </td>
                  );
                })}
              </tr>
            )),
          )}
        </tbody>
      </table>

      {assignments.length === 0 && (
        <div className="border-t border-slate-100 px-4 py-8 text-center text-sm text-slate-500">
          シフトがまだ作成されていません。ステップ3で希望を入れてから、ステップ4で自動生成してください。
        </div>
      )}
    </div>
  );
}
