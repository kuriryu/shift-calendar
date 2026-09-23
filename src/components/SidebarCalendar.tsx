"use client";

import { EMPTY_ASSIGNMENTS, EMPTY_REQUESTS, useAppStore } from "@/stores/useAppStore";
import { useMounted } from "@/hooks/useMounted";
import {
  daysOfMonth,
  dayLabel,
  formatDate,
  monthLabel,
  weekdayOf,
} from "@/lib/dates";
import { staffColorOf } from "@/lib/staff-color";
import type { ShiftAssignment, ShiftRequest, Staff, StepId } from "@/types";

const WEEKDAY_HEADERS = ["月", "火", "水", "木", "金", "土", "日"] as const;

type DayMark = "none" | "partial" | "complete" | "count" | "staff";

function markDotClass(mark: DayMark, count: number, selected: boolean): string {
  if (mark === "none" || mark === "staff") return "";
  if (selected) return "bg-white";
  if (mark === "partial") return "border border-indigo-400 bg-transparent";
  if (mark === "complete") return "bg-indigo-600";
  if (count <= 2) return "bg-indigo-200";
  if (count <= 4) return "bg-indigo-400";
  return "bg-indigo-600";
}

function requestLabel(r: ShiftRequest): string {
  if (r.type === "off") return "休み";
  if (r.type === "time_limited" && r.timeRange) {
    return `${r.timeRange.start}〜${r.timeRange.end}`;
  }
  return "出勤可能";
}

function DayDetail({
  date,
  staff,
  requests,
  assignments,
  mode,
}: {
  date: string;
  staff: Staff[];
  requests: ShiftRequest[];
  assignments: ShiftAssignment[];
  mode: "requests" | "draft" | "assignments";
}) {
  if (mode === "requests") {
    const byStaff = new Map(requests.filter((r) => r.date === date).map((r) => [r.staffId, r]));
    return (
      <div className="mt-4 max-h-56 space-y-2 overflow-y-auto rounded-lg border border-slate-100 bg-slate-50 px-3 py-3">
        <p className="mb-2.5 px-0.5 text-[10px] font-semibold text-slate-500">
          {dayLabel(date)} の希望
        </p>
        {staff.length === 0 ? (
          <p className="px-0.5 py-1 text-[11px] text-slate-400">スタッフ未登録</p>
        ) : (
          staff.map((s) => {
            const r = byStaff.get(s.id);
            return (
              <div
                key={s.id}
                className="flex items-center justify-between gap-2 px-0.5 py-1.5 text-[11px]"
              >
                <span className="flex min-w-0 items-center gap-1.5 truncate text-slate-700">
                  <span
                    className="h-1.5 w-1.5 shrink-0 rounded-full"
                    style={{ backgroundColor: staffColorOf(s.id).dot }}
                    aria-hidden
                  />
                  <span className="truncate">{s.name}</span>
                </span>
                <span className={r ? "shrink-0 text-slate-600" : "shrink-0 text-slate-300"}>
                  {r ? requestLabel(r) : "未入力"}
                </span>
              </div>
            );
          })
        )}
      </div>
    );
  }

  const dayAssignments = assignments.filter((a) => a.date === date);
  const staffMap = new Map(staff.map((s) => [s.id, s]));
  return (
    <div className="mt-4 max-h-56 space-y-2 overflow-y-auto rounded-lg border border-slate-100 bg-slate-50 px-3 py-3">
      <p className="mb-2.5 px-0.5 text-[10px] font-semibold text-slate-500">
        {dayLabel(date)} の{mode === "draft" ? "案" : "シフト"}
      </p>
      {dayAssignments.length === 0 ? (
        <p className="px-0.5 py-1 text-[11px] text-slate-400">割当なし</p>
      ) : (
        dayAssignments.map((a) => {
          const s = staffMap.get(a.staffId);
          const color = staffColorOf(a.staffId);
          return (
            <div
              key={a.id}
              className="flex items-center justify-between gap-2 px-0.5 py-1.5 text-[11px]"
            >
              <span className="flex min-w-0 items-center gap-1.5 truncate text-slate-700">
                <span
                  className="h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{ backgroundColor: color.dot }}
                  aria-hidden
                />
                <span className="truncate">{s?.name ?? a.staffId}</span>
              </span>
              <span className="shrink-0 tabular-nums text-slate-600">
                {a.startTime}–{a.endTime}
              </span>
            </div>
          );
        })
      )}
    </div>
  );
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

  const staffDotsOf = (date: string): string[] => {
    const ids = [
      ...new Set(
        assignments
          .filter((a) => a.date === date && visibleStaffIds.has(a.staffId))
          .map((a) => a.staffId),
      ),
    ];
    return ids.slice(0, 4);
  };

  const markOf = (date: string): { mark: DayMark; count: number } => {
    if (active >= 6 && confirmed) {
      const dots = staffDotsOf(date);
      if (dots.length > 0) return { mark: "staff", count: dots.length };
      return { mark: "none", count: 0 };
    }
    if (active === 5 && hasDraft) {
      const c = draftCounts.get(date) ?? 0;
      return { mark: c > 0 ? "complete" : "none", count: c };
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
  const locked = active === 1;
  const showRequestLegend = (active === 3 || active === 4) && staffTotal > 0;
  const showDetail =
    !locked && (active === 3 || active === 4 || active === 5 || active === 6);
  const detailMode =
    active === 6 && confirmed
      ? "assignments"
      : active === 5 && hasDraft
        ? "draft"
        : active === 5 && confirmed
          ? "assignments"
          : "requests";
  const detailAssignments =
    detailMode === "draft" && draft ? draft.assignments : assignments;

  return (
    <div className={`flex flex-col gap-3 px-1 ${locked ? "opacity-55" : ""}`}>
      <div className="flex items-center justify-center px-1">
        <span className="text-sm font-semibold text-slate-700" aria-live="polite">
          {monthLabel(month)}
        </span>
      </div>

      {locked && (
        <p className="rounded-lg bg-slate-50 px-2 py-1.5 text-[10px] leading-snug text-slate-500">
          対象月の選択中は、カレンダーの日付は選べません
        </p>
      )}

      {showRequestLegend && (
        <p className="flex flex-wrap gap-x-3 gap-y-1 px-1 text-[10px] leading-snug text-slate-400">
          <span className="inline-flex items-center gap-1">
            <span className="inline-block h-1.5 w-1.5 rounded-full border border-indigo-400" />
            入力中
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-indigo-600" />
            全員入力済み
          </span>
        </p>
      )}

      <div
        className={`grid grid-cols-7 ${locked ? "pointer-events-none" : ""}`}
        aria-disabled={locked || undefined}
      >
        {WEEKDAY_HEADERS.map((w) => (
          <span
            key={w}
            className="py-0.5 text-center text-[9px] font-medium text-slate-400"
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
              const staffDots = mark === "staff" ? staffDotsOf(d) : [];
              const markHint =
                mark === "partial"
                  ? "（入力中）"
                  : mark === "complete"
                    ? "（入力完了）"
                    : mark === "staff" || mark === "count"
                      ? `（出勤${count}名）`
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
                  className="group flex h-9 flex-col items-center justify-center disabled:cursor-not-allowed"
                >
                  <span
                    className={`flex h-7 w-7 items-center justify-center rounded-full text-[11px] transition-colors ${
                      d === selectedDate
                        ? "bg-indigo-600 font-semibold text-white"
                        : d === today
                          ? "font-semibold text-indigo-600 ring-1 ring-indigo-400 group-hover:bg-indigo-50"
                          : "text-slate-600 group-hover:bg-slate-100"
                    }`}
                  >
                    {Number(d.slice(8))}
                  </span>
                  {mark === "staff" ? (
                    <span className="mt-0.5 flex h-1.5 items-center justify-center gap-px">
                      {staffDots.map((id) => (
                        <span
                          key={id}
                          className="h-1.5 w-1.5 rounded-full"
                          style={{ backgroundColor: staffColorOf(id).dot }}
                        />
                      ))}
                    </span>
                  ) : (
                    <span
                      className={`mt-0.5 h-1.5 w-1.5 rounded-full ${markDotClass(mark, count, d === selectedDate)}`}
                    />
                  )}
                </button>
              );
            })()
          ),
        )}
      </div>

      {showDetail && selectedDate.startsWith(month) && active >= 3 && (
        <DayDetail
          date={selectedDate}
          staff={
            active === 6
              ? staff.filter((s) => visibleStaffIds.has(s.id))
              : staff
          }
          requests={requests}
          assignments={detailAssignments.filter(
            (a) => active !== 6 || visibleStaffIds.has(a.staffId),
          )}
          mode={detailMode}
        />
      )}

      {active === 2 && (
        <p className="px-1 text-[11px] leading-snug text-slate-400">
          スタッフを登録すると、希望入力で候補が表示されます
        </p>
      )}
    </div>
  );
}
