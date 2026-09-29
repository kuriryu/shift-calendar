"use client";

import Icon from "@/components/Icon";
import ChangeRequestNotice from "@/components/ChangeRequestNotice";
import DayRequestList from "@/components/DayRequestList";
import DayTimeline from "@/components/DayTimeline";
import WeekCalendarView from "@/components/WeekCalendarView";
import MonthCalendarView from "@/components/MonthCalendarView";
import StepPanel from "@/components/steps/StepPanel";
import { EMPTY_ASSIGNMENTS, useAppStore } from "@/stores/useAppStore";
import { businessHoursOf } from "@/lib/coverage";
import { minutesToJapaneseHours, workMinutesOf } from "@/lib/time";

const VIEWS = [
  { id: "day" as const, label: "日", icon: "schedule" },
  { id: "week" as const, label: "週", icon: "view_week" },
  { id: "month" as const, label: "月", icon: "calendar_month" },
];

function LaborBudget({
  totalMinutes,
  limit,
}: {
  totalMinutes: number;
  limit: number;
}) {
  const filled = minutesToJapaneseHours(totalMinutes);
  const hasLimit = limit > 0;
  const over = hasLimit && totalMinutes > limit * 60;
  const ratio = hasLimit ? totalMinutes / (limit * 60) : 0;
  const percent = Math.round(ratio * 100);
  const bar = Math.min(100, Math.max(0, ratio * 100));
  const summary = hasLimit
    ? `${limit}時間分のうち${filled}埋まっています`
    : `現在の全体の労働時間は${filled}です`;

  return (
    <section
      aria-label="全体の労働時間"
      className="rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3.5"
    >
      <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
          <Icon name="timer" size={16} />
        </span>
        全体の労働時間
      </div>
      <p className="sr-only" aria-live="polite">
        {summary}
      </p>
      <div className="mt-2 flex flex-wrap items-baseline gap-x-2">
        <span
          className={`text-2xl font-bold tabular-nums leading-none ${
            over ? "text-red-600" : "text-slate-900"
          }`}
        >
          {filled}
        </span>
        {hasLimit && (
          <span className={`text-sm tabular-nums ${over ? "text-red-500" : "text-slate-400"}`}>
            / {limit}時間分
          </span>
        )}
      </div>
      {hasLimit ? (
        <>
          <div
            className="mt-3 h-2 overflow-hidden rounded-full bg-white ring-1 ring-slate-200"
            role="meter"
            aria-valuemin={0}
            aria-valuemax={limit * 60}
            aria-valuenow={Math.round(totalMinutes)}
            aria-label={summary}
          >
            <div
              className={`h-full rounded-full ${over ? "bg-red-500" : "bg-blue-600"}`}
              style={{ width: `${bar}%` }}
            />
          </div>
          <p className={`mt-1.5 text-xs ${over ? "text-red-600" : "text-slate-500"}`}>
            {limit}時間分のうち {filled}埋まっています
            {over ? "。上限を超えています" : `（${percent}%）`}
          </p>
        </>
      ) : (
        <p className="mt-1.5 text-xs text-slate-500">上限は未設定です</p>
      )}
    </section>
  );
}

export default function AdjustStep() {
  const selectedDate = useAppStore((s) => s.selectedDate);
  const view = useAppStore((s) => s.adjustView);
  const setView = useAppStore((s) => s.setAdjustView);
  const assignments = useAppStore(
    (s) => s.assignments[s.selectedMonth] ?? EMPTY_ASSIGNMENTS,
  );
  const setStep = useAppStore((s) => s.setStep);
  const settings = useAppStore((s) => s.settings);
  const { open, close } = businessHoursOf(selectedDate, settings);
  const hhmm = (minutes: number) =>
    `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
  const totalMinutes = assignments.reduce((sum, a) => sum + workMinutesOf(a), 0);
  const limit = settings.totalLaborHoursLimit ?? 0;

  return (
    <StepPanel step={6} hideNext>
      <LaborBudget totalMinutes={totalMinutes} limit={limit} />
      <div className="flex flex-wrap items-center gap-3">
        <div
          className="flex items-center gap-1 rounded-lg bg-slate-100 p-1"
          role="group"
          aria-label="表示切替"
        >
          {VIEWS.map((v) => (
            <button
              key={v.id}
              onClick={() => setView(v.id)}
              aria-pressed={view === v.id}
              className={`flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${
                view === v.id
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <Icon name={v.icon} size={16} />
              {v.label}
            </button>
          ))}
        </div>
        {view === "day" && (
          <p className="text-xs text-slate-600">
            営業 {hhmm(open)}〜{hhmm(close)}・名前をドラッグで並べ替え／タップで稼働時間
          </p>
        )}
      </div>
      <DayRequestList date={selectedDate} />

      {assignments.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-sky-200 bg-sky-50/70 px-6 py-10 text-center sm:flex-row sm:text-left">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white text-sky-600 ring-1 ring-sky-100">
            <Icon name="event_busy" size={28} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-sky-900">
              この月のシフトはまだ作成されていません
            </p>
            <p className="mt-1 text-xs leading-relaxed text-sky-800/70">
              自動生成で案を作るか、日・週・月表示で手動追加できます。
            </p>
          </div>
          <button
            onClick={() => setStep(5)}
            className="flex shrink-0 items-center gap-1.5 rounded-lg bg-white px-3.5 py-2 text-xs font-semibold text-sky-800 ring-1 ring-sky-200 hover:bg-sky-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600"
          >
            <Icon name="auto_awesome" size={16} />
            自動生成へ
          </button>
        </div>
      )}

      {view === "day" && <DayTimeline key={selectedDate} date={selectedDate} />}
      {view === "week" && <WeekCalendarView />}
      {view === "month" && <MonthCalendarView />}
      <ChangeRequestNotice onConfirm={() => setStep(4)} />
    </StepPanel>
  );
}
