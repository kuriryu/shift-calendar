"use client";

import { useState } from "react";
import { useAppStore } from "@/stores/useAppStore";
import { useMounted } from "@/hooks/useMounted";
import { daysOfMonth, dayLabel, weekdayLabel } from "@/lib/dates";
import MonthMatrix from "@/components/MonthMatrix";
import DayTimeline from "@/components/DayTimeline";
import Icon from "@/components/Icon";

type ViewMode = "month" | "day";

export default function ShiftBoard() {
  const mounted = useMounted();
  const month = useAppStore((s) => s.selectedMonth);
  const [view, setView] = useState<ViewMode>("month");
  const [selectedDate, setSelectedDate] = useState<string>(`${month}-01`);

  if (!mounted) {
    return <div className="py-20 text-center text-sm text-slate-400">読み込み中…</div>;
  }

  const days = daysOfMonth(month);
  const date = days.includes(selectedDate) ? selectedDate : days[0];

  return (
    <div className="space-y-4">
      {/* ビュー切替 */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
          <button
            onClick={() => setView("month")}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              view === "month"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Icon name="calendar_month" size={16} />
            曜日ビュー
          </button>
          <button
            onClick={() => setView("day")}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              view === "day"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Icon name="schedule" size={16} />
            時間ビュー
          </button>
        </div>
        <span className="text-xs text-slate-400">
          {view === "month"
            ? "月間の出勤・休みの一覧"
            : "1日を選んで誰が何時から何時まで入るかを確認"}
        </span>
      </div>

      {view === "month" ? (
        <MonthMatrix />
      ) : (
        <div className="space-y-3">
          {/* 日付選択ストリップ */}
          <div className="flex gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-white p-2">
            {days.map((d) => {
              const active = d === date;
              return (
                <button
                  key={d}
                  onClick={() => setSelectedDate(d)}
                  className={`flex min-w-11 flex-col items-center rounded-lg px-2 py-1.5 text-xs transition-colors ${
                    active
                      ? "bg-indigo-600 font-semibold text-white"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <span>{Number(d.slice(8))}</span>
                  <span
                    className={`text-[9px] ${active ? "text-indigo-200" : "text-slate-400"}`}
                  >
                    {weekdayLabel(d)}
                  </span>
                </button>
              );
            })}
          </div>
          <DayTimeline key={date} date={date} />
        </div>
      )}
    </div>
  );
}
