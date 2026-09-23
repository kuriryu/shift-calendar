"use client";

import Icon from "@/components/Icon";
import StepPanel from "@/components/steps/StepPanel";
import { EMPTY_ASSIGNMENTS, EMPTY_REQUESTS, useAppStore } from "@/stores/useAppStore";
import { daysOfMonth, formatDate, monthLabel, shiftMonth } from "@/lib/dates";

export default function MonthStep() {
  const month = useAppStore((s) => s.selectedMonth);
  const setMonth = useAppStore((s) => s.setMonth);
  const staff = useAppStore((s) => s.staff);
  const requests = useAppStore((s) => s.requests[s.selectedMonth] ?? EMPTY_REQUESTS);
  const assignments = useAppStore(
    (s) => s.assignments[s.selectedMonth] ?? EMPTY_ASSIGNMENTS,
  );
  const allAssignments = useAppStore((s) => s.assignments);
  const allRequests = useAppStore((s) => s.requests);

  // 今月から前後に並べた候補月（今月 -1 〜 +5）
  const thisMonth = formatDate(new Date()).slice(0, 7);
  const candidates = Array.from({ length: 7 }, (_, i) => shiftMonth(thisMonth, i - 1));
  const hasData = (m: string) =>
    (allAssignments[m]?.length ?? 0) > 0 || (allRequests[m]?.length ?? 0) > 0;

  return (
    <StepPanel step={1} description="作成したいシフトの月を選びます。サイドバーのカレンダーとも連動します。">
      {/* 月送り */}
      <div className="flex items-center justify-center gap-4">
        <button
          onClick={() => setMonth(shiftMonth(month, -1))}
          aria-label="前の月"
          className="rounded-full border border-slate-200 p-2.5 text-slate-500 hover:bg-slate-50"
        >
          <Icon name="chevron_left" size={22} />
        </button>
        <p className="min-w-40 text-center text-3xl font-bold text-slate-800" aria-live="polite">
          {monthLabel(month)}
        </p>
        <button
          onClick={() => setMonth(shiftMonth(month, 1))}
          aria-label="次の月"
          className="rounded-full border border-slate-200 p-2.5 text-slate-500 hover:bg-slate-50"
        >
          <Icon name="chevron_right" size={22} />
        </button>
      </div>

      {/* 候補月チップ */}
      <div className="flex flex-wrap justify-center gap-2" role="group" aria-label="月を選ぶ">
        {candidates.map((m) => {
          const active = m === month;
          return (
            <button
              key={m}
              onClick={() => setMonth(m)}
              aria-pressed={active}
              className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                active
                  ? "bg-indigo-600 text-white"
                  : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              {monthLabel(m)}
              {hasData(m) && (
                <span
                  className={`h-1.5 w-1.5 rounded-full ${active ? "bg-white" : "bg-indigo-500"}`}
                  aria-label="データあり"
                />
              )}
            </button>
          );
        })}
      </div>

      {/* この月の状況 */}
      <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "日数", value: `${daysOfMonth(month).length}日`, icon: "calendar_today" },
          { label: "スタッフ", value: `${staff.length}名`, icon: "group" },
          { label: "希望入力", value: `${requests.length}件`, icon: "edit_calendar" },
          {
            label: "シフト",
            value: assignments.length > 0 ? `${assignments.length}件 作成済み` : "未作成",
            icon: "event_available",
          },
        ].map((c) => (
          <div key={c.label} className="rounded-xl bg-slate-50 p-4">
            <dt className="flex items-center gap-1.5 text-xs text-slate-500">
              <Icon name={c.icon} size={14} />
              {c.label}
            </dt>
            <dd className="mt-1 text-lg font-bold text-slate-800">{c.value}</dd>
          </div>
        ))}
      </dl>
    </StepPanel>
  );
}
