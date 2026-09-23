"use client";

import { useState } from "react";
import { useAppStore } from "@/stores/useAppStore";
import { useMounted } from "@/hooks/useMounted";
import { monthLabel } from "@/lib/dates";
import Icon from "@/components/Icon";
import MonthMatrix from "@/components/MonthMatrix";
import DayTimeline from "@/components/DayTimeline";

type ViewMode = "day" | "month";

export default function Dashboard() {
  const mounted = useMounted();
  const month = useAppStore((s) => s.selectedMonth);
  const selectedDate = useAppStore((s) => s.selectedDate);
  const setSelectedDate = useAppStore((s) => s.setSelectedDate);
  const [view, setView] = useState<ViewMode>("day");

  if (!mounted) {
    return <div className="py-20 text-center text-sm text-slate-400">読み込み中…</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-800">トップ</h2>
          <p className="text-xs text-slate-400">{monthLabel(month)}</p>
        </div>

        {/* ビュー切替 */}
        <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
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
        </div>
      </div>

      {view === "day" ? (
        <DayTimeline key={selectedDate} date={selectedDate} />
      ) : (
        <MonthMatrix
          onSelectDate={(d) => {
            setSelectedDate(d);
            setView("day");
          }}
        />
      )}
    </div>
  );
}
