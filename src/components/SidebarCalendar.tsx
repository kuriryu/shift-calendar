"use client";

import { EMPTY_ASSIGNMENTS, EMPTY_REQUESTS, useAppStore } from "@/stores/useAppStore";
import { useMounted } from "@/hooks/useMounted";
import {
  daysOfMonth,
  formatDate,
  monthLabel,
  weekdayOf,
} from "@/lib/dates";
import type { StepId, Violation } from "@/types";

const WEEKDAY_HEADERS = ["月", "火", "水", "木", "金", "土", "日"] as const;

type DayMark = "none" | "partial" | "complete" | "count" | "error" | "warning" | "ok";

function markDotClass(mark: DayMark, count: number, selected: boolean): string {
  if (mark === "none") return "";
  if (mark === "error") return "bg-red-500";
  if (mark === "warning") return "bg-amber-400";
  if (mark === "ok") return "bg-emerald-500";
  if (selected) return "bg-white";
  if (mark === "partial") return "border border-blue-600 bg-transparent";
  if (mark === "complete") return "bg-blue-600";
  if (count <= 2) return "bg-blue-200";
  if (count <= 4) return "bg-blue-400";
  return "bg-blue-600";
}

function statusOf(date: string, violations: Violation[]): "error" | "warning" | "ok" {
  const day = violations.filter((v) => v.date === date);
  if (day.some((v) => v.severity === "error")) return "error";
  if (day.some((v) => v.severity === "warning")) return "warning";
  return "ok";
}

export default function SidebarCalendar() {
  const mounted = useMounted();
  const month = useAppStore((s) => s.selectedMonth);
  const selectedDate = useAppStore((s) => s.selectedDate);
  const setSelectedDate = useAppStore((s) => s.setSelectedDate);
  const currentStep = useAppStore((s) => s.currentStep);
  const staff = useAppStore((s) => s.staff);
  const hiddenStaffIds = useAppStore((s) => s.hiddenStaffIds);
  const requests = useAppStore((s) => s.requests[s.selectedMonth] ?? EMPTY_REQUESTS);
  const assignments = useAppStore(
    (s) => s.assignments[s.selectedMonth] ?? EMPTY_ASSIGNMENTS,
  );
  const draft = useAppStore((s) => s.draft);
  const violations = useAppStore((s) => s.violations);

  if (!mounted) {
    return <div className="h-60 px-2" aria-hidden />;
  }

  const hasDraft = draft?.month === month;
  const confirmed = assignments.length > 0;
  const done: Record<StepId, boolean> = {
    1: true,
    2: staff.length > 0,
    3: requests.length > 0,
    4: confirmed || hasDraft,
    5: confirmed,
    6: confirmed,
  };
  const firstPending = ([1, 2, 3, 4, 5, 6] as StepId[]).find((id) => !done[id]);
  const active: StepId = currentStep ?? (confirmed ? 6 : (firstPending ?? 6));

  const requestCounts = new Map<string, number>();
  for (const r of requests) {
    requestCounts.set(r.date, (requestCounts.get(r.date) ?? 0) + 1);
  }
  const draftCounts = new Map<string, number>();
  if (draft?.month === month) {
    for (const a of draft.assignments) {
      draftCounts.set(a.date, (draftCounts.get(a.date) ?? 0) + 1);
    }
  }

  const staffTotal = staff.length;
  const hidden = new Set(hiddenStaffIds);
  const visibleStaffIds = new Set(
    staff.filter((s) => !hidden.has(s.id)).map((s) => s.id),
  );

  const hasVisibleShift = (date: string, source: { date: string; staffId: string }[]) =>
    source.some((a) => a.date === date && visibleStaffIds.has(a.staffId));

  const markOf = (date: string): { mark: DayMark; count: number } => {
    if (active >= 6 && confirmed) {
      if (!hasVisibleShift(date, assignments)) return { mark: "none", count: 0 };
      return { mark: statusOf(date, violations), count: 1 };
    }
    if (active === 5 && hasDraft && draft) {
      if (!hasVisibleShift(date, draft.assignments)) return { mark: "none", count: 0 };
      return { mark: statusOf(date, draft.violations), count: draftCounts.get(date) ?? 0 };
    }
    if (staffTotal === 0) return { mark: "none", count: 0 };
    const n = requestCounts.get(date) ?? 0;
    if (n === 0) return { mark: "none", count: 0 };
    if (n >= staffTotal) return { mark: "complete", count: n };
    return { mark: "partial", count: n };
  };

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
  const locked = active === 1 || active === 2;
  const showRequestLegend = (active === 3 || active === 4) && staffTotal > 0;
  const showStatusLegend =
    (active >= 6 && confirmed) || (active === 5 && hasDraft);

  return (
    <div className={`flex flex-col gap-3 px-1 ${locked ? "opacity-55" : ""}`}>
      <div className="flex items-center justify-center px-1">
        <span className="text-lg font-bold leading-normal tabular-nums text-slate-900" aria-live="polite">
          {monthLabel(month)}
        </span>
      </div>

      {locked && (
        <p className="rounded-md bg-white px-2 py-2 text-xs font-medium leading-4 text-slate-500">
          {active === 2
            ? "スタッフ登録中は、カレンダーの日付は選べません"
            : "対象月の選択中は、カレンダーの日付は選べません"}
        </p>
      )}

      {showStatusLegend && (
        <p className="flex flex-wrap gap-x-3 gap-y-1 px-1 text-[10px] leading-snug text-slate-400">
          <span className="inline-flex items-center gap-1">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-red-500" />
            エラー
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-400" />
            警告
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
            問題なし
          </span>
        </p>
      )}

      {showRequestLegend && (
        <p className="flex flex-wrap gap-x-3 gap-y-1 px-1 text-[10px] leading-snug text-slate-400">
          <span className="inline-flex items-center gap-1">
            <span className="inline-block h-1.5 w-1.5 rounded-full border border-blue-600" />
            入力中
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-blue-600" />
            全員入力済み
          </span>
        </p>
      )}

      <div
        key={month}
        className={`grid animate-[fadeIn_200ms_cubic-bezier(0.16,1,0.3,1)] grid-cols-7 ${locked ? "pointer-events-none" : ""}`}
        aria-disabled={locked || undefined}
      >
        {WEEKDAY_HEADERS.map((w) => (
          <span
            key={w}
            className="py-1 text-center text-xs font-medium leading-4 text-slate-500"
          >
            {w}
          </span>
        ))}
        {cells.map((d, i) =>
          d === null ? (
            <span key={`blank-${i}`} className="h-9" />
          ) : (
            (() => {
              const { mark, count } = markOf(d);
              const markHint =
                mark === "partial"
                  ? "（入力中）"
                  : mark === "complete"
                    ? "（入力完了）"
                    : mark === "count"
                      ? `（出勤${count}名）`
                      : mark === "error"
                        ? "（エラー）"
                        : mark === "warning"
                          ? "（警告）"
                          : mark === "ok"
                            ? "（問題なし）"
                            : "";
              return (
                <button
                  key={d}
                  type="button"
                  disabled={locked}
                  onClick={() => setSelectedDate(d)}
                  aria-label={`${Number(d.slice(5, 7))}月${Number(d.slice(8))}日${markHint}${
                    d === selectedDate ? " 選択中" : ""
                  }${d === today ? " 今日" : ""}${locked ? "（このステップでは選択不可）" : ""}`}
                  aria-pressed={d === selectedDate}
                  className="group flex h-9 flex-col items-center justify-center rounded-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed"
                >
                  <span
                    className={`flex h-7 w-7 items-center justify-center rounded-none text-sm font-semibold leading-5 tabular-nums ${
                      d === selectedDate
                        ? "bg-slate-100 text-slate-900"
                        : d === today
                          ? "text-slate-900 underline decoration-blue-600 group-hover:bg-slate-100"
                          : "text-slate-900 group-hover:bg-slate-100"
                    }`}
                  >
                    {Number(d.slice(8))}
                  </span>
                  <span
                    className={`mt-0.5 h-1.5 w-1.5 rounded-full ${markDotClass(mark, count, d === selectedDate)}`}
                  />
                </button>
              );
            })()
          ),
        )}
      </div>

      {active === 2 && (
        <p className="px-1 text-[11px] leading-snug text-slate-400">
          スタッフを登録すると、希望入力で候補が表示されます
        </p>
      )}
    </div>
  );
}
