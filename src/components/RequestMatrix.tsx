"use client";

import { useCallback, useMemo, useState } from "react";
import { EMPTY_REQUESTS, useAppStore } from "@/stores/useAppStore";
import Icon from "@/components/Icon";
import { useMounted } from "@/hooks/useMounted";
import { useDismissable } from "@/hooks/useDismissable";
import { businessHoursOf, timeOptionsOf } from "@/lib/coverage";
import {
  dayLabel,
  daysOfMonth,
  isWeekendOrFri,
  weekdayLabel,
  weekdayOf,
  weekKeyOf,
  weeksOfMonth,
} from "@/lib/dates";
import { hasAnyPattern, patternOf } from "@/lib/staff-pattern";
import { toMinutes } from "@/lib/time";
import type { Role, ShiftRequest, Staff } from "@/types";
import { ROLE_LABELS } from "@/types";

const ROLE_ORDER: Role[] = ["employee", "part_time", "student"];

const WEEKDAY_HEADERS = ["月", "火", "水", "木", "金", "土", "日"] as const;

const PRESETS = [
  { label: "午前 9–13", start: "09:00", end: "13:00" },
  { label: "午後 17–21", start: "17:00", end: "21:00" },
] as const;

type RequestView = "time" | "week" | "month";

function shortTime(t: string): string {
  const [h, m] = t.split(":").map(Number);
  return m === 0 ? String(h) : `${h}.5`;
}

type PopoverState = {
  staff: Staff;
  date: string;
  x: number;
  y: number;
};

function recommendationOf(s: Staff, date: string): ShiftRequest | null {
  if (s.unavailableWeekdays?.includes(weekdayOf(date))) {
    return { staffId: s.id, date, type: "off" };
  }
  const pat = patternOf(s, date);
  if (pat) {
    return {
      staffId: s.id,
      date,
      type: "time_limited",
      timeRange: { ...pat },
    };
  }
  return null;
}

function requestLabel(r: ShiftRequest | null): string {
  if (!r) return "未入力";
  if (r.type === "off") return "休み";
  if (r.type === "time_limited" && r.timeRange) {
    return `${r.timeRange.start}〜${r.timeRange.end}`;
  }
  return "出勤可能";
}

export default function RequestMatrix() {
  const mounted = useMounted();
  const staff = useAppStore((s) => s.staff);
  const settings = useAppStore((s) => s.settings);
  const month = useAppStore((s) => s.selectedMonth);
  const selectedDate = useAppStore((s) => s.selectedDate);
  const setSelectedDate = useAppStore((s) => s.setSelectedDate);
  const requests = useAppStore(
    (s) => s.requests[s.selectedMonth] ?? EMPTY_REQUESTS,
  );
  const setRequest = useAppStore((s) => s.setRequest);
  const clearRequest = useAppStore((s) => s.clearRequest);
  const bulkSetRequests = useAppStore((s) => s.bulkSetRequests);
  const adoptRecommendations = useAppStore((s) => s.adoptRecommendations);
  const clearAllRequests = useAppStore((s) => s.clearAllRequests);
  const fillTestRequests = useAppStore((s) => s.fillTestRequests);

  const [popover, setPopover] = useState<PopoverState | null>(null);
  const closePopover = useCallback(() => setPopover(null), []);
  const popoverRef = useDismissable<HTMLDivElement>(popover !== null, closePopover);
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("13:00");
  const [view, setView] = useState<RequestView>("month");

  const weeks = useMemo(() => weeksOfMonth(month), [month]);
  const weekIndex = Math.max(
    0,
    weeks.findIndex((w) => w.key === weekKeyOf(selectedDate) || w.dates.includes(selectedDate)),
  );
  const currentWeek = weeks[weekIndex] ?? weeks[0];

  if (!mounted) {
    return <div className="py-20 text-center text-sm text-slate-400">読み込み中…</div>;
  }

  const timeOptions = timeOptionsOf(settings);
  const days = daysOfMonth(month);
  const requestMap = new Map(requests.map((r) => [`${r.staffId}:${r.date}`, r]));
  const noStaff = staff.length === 0;
  const dayDate = selectedDate.startsWith(month) ? selectedDate : days[0];
  const dayIndex = Math.max(0, days.indexOf(dayDate));
  const { open: openMin, close: closeMin } = businessHoursOf(dayDate, settings);
  const span = Math.max(1, closeMin - openMin);

  const requestCounts = new Map<string, number>();
  for (const r of requests) {
    requestCounts.set(r.date, (requestCounts.get(r.date) ?? 0) + 1);
  }
  const requestMarkOf = (date: string): "none" | "partial" | "complete" => {
    if (staff.length === 0) return "none";
    const n = requestCounts.get(date) ?? 0;
    if (n === 0) return "none";
    if (n >= staff.length) return "complete";
    return "partial";
  };

  const firstWeekday = weekdayOf(days[0]);
  const leadBlanks = firstWeekday === 0 ? 6 : firstWeekday - 1;
  const lastWeekday = weekdayOf(days[days.length - 1]);
  const tailBlanks = lastWeekday === 0 ? 0 : 7 - lastWeekday;
  const monthCells: (string | null)[] = [
    ...Array.from({ length: leadBlanks }, () => null),
    ...days,
    ...Array.from({ length: tailBlanks }, () => null),
  ];

  const goDay = (delta: number) => {
    const next = days[dayIndex + delta];
    if (next) setSelectedDate(next);
  };

  const openPopover = (e: React.MouseEvent, s: Staff, date: string) => {
    const existing = requestMap.get(`${s.id}:${date}`);
    if (existing?.type === "time_limited" && existing.timeRange) {
      setStart(existing.timeRange.start);
      setEnd(existing.timeRange.end);
    } else {
      const pat = patternOf(s, date);
      setStart(pat?.start ?? timeOptions[0]);
      setEnd(pat?.end ?? timeOptions[Math.min(8, timeOptions.length - 1)]);
    }
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = Math.min(rect.left, window.innerWidth - 260);
    const y = Math.min(rect.bottom + 4, window.innerHeight - 340);
    setPopover({ staff: s, date, x, y });
  };

  const onCellClick = (e: React.MouseEvent, s: Staff, date: string) => {
    setSelectedDate(date);
    const existing = requestMap.get(`${s.id}:${date}`);
    if (!existing) {
      const rec = recommendationOf(s, date);
      if (rec) {
        setRequest(rec);
        return;
      }
    }
    openPopover(e, s, date);
  };

  const apply = (req: ShiftRequest | null) => {
    if (!popover) return;
    if (req) setRequest(req);
    else clearRequest(popover.staff.id, popover.date);
    closePopover();
  };

  const ghostCell = (s: Staff, date: string) => {
    const rec = recommendationOf(s, date);
    if (rec?.type === "off") {
      return (
        <span className="inline-flex h-6 w-full items-center justify-center rounded border border-dashed border-slate-300 text-[10px] text-slate-400">
          休
        </span>
      );
    }
    if (rec?.type === "time_limited" && rec.timeRange) {
      return (
        <span className="inline-flex h-6 w-full items-center justify-center rounded border border-dashed border-slate-300 text-[10px] text-slate-400">
          {shortTime(rec.timeRange.start)}-{shortTime(rec.timeRange.end)}
        </span>
      );
    }
    return (
      <span className="inline-flex h-6 w-full items-center justify-center text-[10px] text-slate-300">
        ・
      </span>
    );
  };

  const cellOf = (s: Staff, date: string) => {
    const r = requestMap.get(`${s.id}:${date}`);
    if (!r) return ghostCell(s, date);
    if (r.type === "off") {
      return (
        <span className="inline-flex h-6 w-full items-center justify-center rounded bg-slate-200 text-[10px] font-semibold text-slate-700">
          休
        </span>
      );
    }
    if (r.type === "time_limited" && r.timeRange) {
      return (
        <span className="inline-flex h-6 w-full items-center justify-center rounded bg-sky-100 text-[10px] font-medium text-sky-800">
          {shortTime(r.timeRange.start)}-{shortTime(r.timeRange.end)}
        </span>
      );
    }
    return (
      <span className="inline-flex h-6 w-full items-center justify-center rounded bg-emerald-100 text-[10px] font-semibold text-emerald-700">
        ○
      </span>
    );
  };

  const staffRowHeader = (s: Staff, role: Role) => {
    const hasRec = hasAnyPattern(s) || (s.unavailableWeekdays?.length ?? 0) > 0;
    return (
      <div className="grid grid-cols-[minmax(0,1fr)_2.5rem_4.75rem] items-center gap-1.5">
        <span className="truncate text-xs font-medium text-slate-700">{s.name}</span>
        <span className="w-10 truncate text-[9px] text-slate-400">{ROLE_LABELS[role]}</span>
        <span className="flex justify-end gap-0.5">
          <span className="inline-flex w-[1.75rem] justify-center">
            {hasRec ? (
              <button
                onClick={() => adoptRecommendations(s.id)}
                className="rounded border border-indigo-200 bg-indigo-50 px-1 py-0.5 text-[9px] text-indigo-700 hover:bg-indigo-100"
                aria-label={`${s.name} の候補をすべて採用`}
                title="候補をすべて採用"
              >
                候補
              </button>
            ) : (
              <span className="invisible text-[9px]" aria-hidden>
                候補
              </span>
            )}
          </span>
          <button
            onClick={() => bulkSetRequests(s.id, "available")}
            className="rounded border border-slate-200 px-1 py-0.5 text-[9px] text-slate-500 hover:bg-emerald-50"
            aria-label={`${s.name} を全日出勤可能にする`}
            title="全日○"
          >
            全○
          </button>
          <button
            onClick={() => bulkSetRequests(s.id, "off")}
            className="rounded border border-slate-200 px-1 py-0.5 text-[9px] text-slate-500 hover:bg-slate-100"
            aria-label={`${s.name} を全日休みにする`}
            title="全日休"
          >
            全休
          </button>
        </span>
      </div>
    );
  };

  const matrixTable = (dateCols: string[], caption: string) => (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="border-collapse text-center">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50">
            <th
              scope="col"
              className="sticky left-0 z-10 min-w-[15rem] bg-slate-50 px-3 py-2.5 text-left text-xs font-semibold text-slate-600"
            >
              スタッフ
            </th>
            {dateCols.map((date) => (
              <th
                key={date}
                scope="col"
                className={`min-w-11 px-0.5 py-1.5 ${
                  isWeekendOrFri(date) ? "bg-sky-50" : ""
                } ${date === selectedDate ? "bg-indigo-50" : ""}`}
              >
                <button
                  type="button"
                  onClick={() => setSelectedDate(date)}
                  className="flex w-full flex-col items-center rounded py-0.5 hover:bg-white/70"
                  aria-label={`${Number(date.slice(8))}日(${weekdayLabel(date)})を選択`}
                >
                  <span className="text-xs font-semibold text-slate-700">
                    {Number(date.slice(8))}
                  </span>
                  <span className="text-[9px] text-slate-400">{weekdayLabel(date)}</span>
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ROLE_ORDER.map((role) =>
            staff
              .filter((s) => s.role === role)
              .map((s) => (
                <tr key={s.id} className="border-b border-slate-100">
                  <th
                    scope="row"
                    className="sticky left-0 z-10 bg-white px-3 py-1.5 text-left font-normal"
                  >
                    {staffRowHeader(s, role)}
                  </th>
                  {dateCols.map((date) => {
                    const r = requestMap.get(`${s.id}:${date}`) ?? null;
                    const rec = r ? null : recommendationOf(s, date);
                    const label = `${s.name} ${Number(date.slice(8))}日(${weekdayLabel(date)}): ${
                      r
                        ? requestLabel(r)
                        : rec
                          ? `候補 ${requestLabel(rec)}（タップで確定）`
                          : "未入力"
                    }`;
                    return (
                      <td
                        key={date}
                        className={`p-0 ${isWeekendOrFri(date) ? "bg-sky-50/40" : ""} ${
                          date === selectedDate ? "bg-indigo-50/60" : ""
                        }`}
                      >
                        <button
                          onClick={(e) => onCellClick(e, s, date)}
                          aria-label={label}
                          className="block w-full px-0.5 py-1 hover:bg-indigo-50"
                        >
                          {cellOf(s, date)}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              )),
          )}
        </tbody>
      </table>
    </div>
  );

  const goWeek = (delta: number) => {
    const next = weeks[weekIndex + delta];
    if (!next) return;
    const prefer =
      next.dates.find((d) => d === selectedDate) ??
      next.dates.find((d) => Number(d.slice(8)) === Number(selectedDate.slice(8))) ??
      next.dates[0];
    setSelectedDate(prefer);
  };

  const hasAnyRecommendation = staff.some(
    (s) => hasAnyPattern(s) || (s.unavailableWeekdays?.length ?? 0) > 0,
  );

  const hourMarks: number[] = [];
  for (let m = openMin; m <= closeMin; m += 60) hourMarks.push(m);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div
          className="flex items-center gap-1 rounded-lg bg-slate-100 p-1"
          role="group"
          aria-label="希望入力の表示切替"
        >
          {(
            [
              { id: "time" as const, label: "時間", icon: "schedule" },
              { id: "week" as const, label: "週", icon: "view_week" },
              { id: "month" as const, label: "月", icon: "calendar_month" },
            ] as const
          ).map((v) => (
            <button
              key={v.id}
              onClick={() => setView(v.id)}
              aria-pressed={view === v.id}
              className={`flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
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
        <p className="text-sm text-slate-500">
          セルをタップして希望を入力します。薄い破線はスタッフ情報からの候補です。
        </p>
        <div className="ml-auto flex flex-wrap gap-2">
          {hasAnyRecommendation && (
            <button
              onClick={() => adoptRecommendations()}
              disabled={noStaff}
              className="flex items-center gap-1 rounded-md border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Icon name="done_all" size={14} />
              全員の候補を採用
            </button>
          )}
          <button
            onClick={fillTestRequests}
            disabled={noStaff}
            title={noStaff ? "先にスタッフを登録してください" : undefined}
            className="flex items-center gap-1 rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Icon name="science" size={14} />
            {noStaff ? "先にスタッフを登録" : "テストデータ投入"}
          </button>
          <button
            onClick={() => {
              if (requests.length === 0) return;
              if (window.confirm(`${month} の希望入力をすべてクリアしますか？`)) {
                clearAllRequests();
              }
            }}
            className="flex items-center gap-1 rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
          >
            <Icon name="delete_sweep" size={14} />
            全クリア
          </button>
        </div>
      </div>

      {noStaff ? (
        <p className="rounded-xl border border-dashed border-slate-200 py-12 text-center text-sm text-slate-400">
          スタッフが登録されていません。ステップ2で登録してください。
        </p>
      ) : view === "time" ? (
        <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => goDay(-1)}
              disabled={dayIndex <= 0}
              aria-label="前の日"
              className="rounded-full border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Icon name="chevron_left" size={20} />
            </button>
            <h3 className="min-w-[9rem] text-center text-sm font-semibold text-slate-800" aria-live="polite">
              {dayLabel(dayDate)}（{weekdayLabel(dayDate)}）
            </h3>
            <button
              type="button"
              onClick={() => goDay(1)}
              disabled={dayIndex >= days.length - 1}
              aria-label="次の日"
              className="rounded-full border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Icon name="chevron_right" size={20} />
            </button>
          </div>
          <div className="relative mb-1 h-5" style={{ marginLeft: "11.5rem" }}>
            {hourMarks.map((m) => (
              <span
                key={m}
                className="absolute -translate-x-1/2 text-[10px] text-slate-400"
                style={{ left: `${((m - openMin) / span) * 100}%` }}
              >
                {Math.floor(m / 60)}
              </span>
            ))}
          </div>
          <ul className="space-y-1">
            {staff.map((s) => {
              const r = requestMap.get(`${s.id}:${dayDate}`) ?? null;
              const rec = r ? null : recommendationOf(s, dayDate);
              const show = r ?? rec;
              const isGhost = !r && !!rec;
              const range =
                show?.type === "time_limited" && show.timeRange
                  ? show.timeRange
                  : show?.type === "available"
                    ? { start: settings.openTime, end: toTimeApprox(closeMin) }
                    : null;
              const label = `${s.name}: ${
                r
                  ? requestLabel(r)
                  : rec
                    ? `候補 ${requestLabel(rec)}（タップで確定）`
                    : "未入力"
              }`;
              return (
                <li
                  key={s.id}
                  className="grid grid-cols-[7.5rem_3.5rem_minmax(0,1fr)] items-center gap-2"
                >
                  <span className="truncate text-right text-xs font-medium text-slate-700">
                    {s.name}
                  </span>
                  <span className="truncate text-[9px] text-slate-400">
                    {ROLE_LABELS[s.role]}
                  </span>
                  <button
                    onClick={(e) => onCellClick(e, s, dayDate)}
                    aria-label={label}
                    className="relative h-9 w-full rounded-md bg-slate-50 hover:bg-indigo-50/60"
                  >
                    {show?.type === "off" && (
                      <span
                        className={`absolute inset-y-1 left-2 right-2 flex items-center justify-center rounded text-xs font-semibold ${
                          isGhost
                            ? "border border-dashed border-slate-300 text-slate-400"
                            : "bg-slate-200 text-slate-700"
                        }`}
                      >
                        休み
                      </span>
                    )}
                    {range && (
                      <span
                        className={`absolute top-1 bottom-1 flex items-center overflow-hidden rounded px-2 text-[10px] font-medium ${
                          isGhost
                            ? "border border-dashed border-sky-300 text-sky-600"
                            : show?.type === "available"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-sky-100 text-sky-800"
                        }`}
                        style={{
                          left: `${((toMinutes(range.start) - openMin) / span) * 100}%`,
                          width: `${Math.max(
                            4,
                            ((toMinutes(range.end) - toMinutes(range.start)) / span) * 100,
                          )}%`,
                        }}
                      >
                        {show?.type === "available"
                          ? "○ 出勤可能"
                          : `${range.start}–${range.end}`}
                      </span>
                    )}
                    {!show && (
                      <span className="absolute inset-0 flex items-center justify-center text-[11px] text-slate-300">
                        未入力
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : view === "week" && currentWeek ? (
        <div className="space-y-3">
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => goWeek(-1)}
              disabled={weekIndex <= 0}
              aria-label="前の週"
              className="rounded-full border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Icon name="chevron_left" size={20} />
            </button>
            <p className="min-w-[8rem] text-center text-sm font-semibold text-slate-800" aria-live="polite">
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
          {matrixTable(currentWeek.dates, `${currentWeek.label} の希望入力`)}
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(16rem,20rem)]">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="mb-3 flex flex-wrap gap-x-3 gap-y-1 text-[10px] leading-snug text-slate-400">
              <span className="inline-flex items-center gap-1">
                <span className="inline-block h-1.5 w-1.5 rounded-full border border-indigo-400" />
                入力中
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-indigo-600" />
                全員入力済み
              </span>
            </p>
            <div className="grid grid-cols-7">
              {WEEKDAY_HEADERS.map((w) => (
                <span
                  key={w}
                  className="py-1 text-center text-[10px] font-medium text-slate-400"
                >
                  {w}
                </span>
              ))}
              {monthCells.map((d, i) =>
                d === null ? (
                  <span key={`blank-${i}`} className="h-11" />
                ) : (
                  (() => {
                    const mark = requestMarkOf(d);
                    return (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setSelectedDate(d)}
                        aria-label={`${Number(d.slice(8))}日${
                          mark === "partial"
                            ? "（入力中）"
                            : mark === "complete"
                              ? "（入力完了）"
                              : ""
                        }${d === dayDate ? " 選択中" : ""}`}
                        aria-pressed={d === dayDate}
                        className="group flex h-11 flex-col items-center justify-center"
                      >
                        <span
                          className={`flex h-8 w-8 items-center justify-center rounded-full text-xs transition-colors ${
                            d === dayDate
                              ? "bg-indigo-600 font-semibold text-white"
                              : "text-slate-700 group-hover:bg-slate-100"
                          }`}
                        >
                          {Number(d.slice(8))}
                        </span>
                        <span
                          className={`mt-0.5 h-1.5 w-1.5 rounded-full ${
                            mark === "none"
                              ? ""
                              : d === dayDate
                                ? "bg-white"
                                : mark === "partial"
                                  ? "border border-indigo-400 bg-transparent"
                                  : "bg-indigo-600"
                          }`}
                        />
                      </button>
                    );
                  })()
                ),
              )}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-xs font-semibold text-slate-700">
                {dayLabel(dayDate)}（{weekdayLabel(dayDate)}）の希望
              </p>
            </div>
            <ul className="max-h-[28rem] space-y-1.5 overflow-y-auto">
              {staff.map((s) => {
                const r = requestMap.get(`${s.id}:${dayDate}`) ?? null;
                const rec = r ? null : recommendationOf(s, dayDate);
                const hasRec =
                  hasAnyPattern(s) || (s.unavailableWeekdays?.length ?? 0) > 0;
                return (
                  <li
                    key={s.id}
                    className="rounded-lg border border-slate-100 px-2 py-2"
                  >
                    <div className="mb-1.5 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={(e) => onCellClick(e, s, dayDate)}
                        className="min-w-0 flex-1 text-left hover:bg-slate-50"
                        aria-label={`${s.name}: ${
                          r
                            ? requestLabel(r)
                            : rec
                              ? `候補 ${requestLabel(rec)}`
                              : "未入力"
                        }`}
                      >
                        <span className="block truncate text-xs font-medium text-slate-800">
                          {s.name}
                          <span className="ml-1 text-[9px] font-normal text-slate-400">
                            {ROLE_LABELS[s.role]}
                          </span>
                        </span>
                        <span className="mt-0.5 block">{cellOf(s, dayDate)}</span>
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {hasRec && (
                        <button
                          type="button"
                          onClick={() => adoptRecommendations(s.id)}
                          className="rounded border border-indigo-200 bg-indigo-50 px-1.5 py-0.5 text-[9px] text-indigo-700 hover:bg-indigo-100"
                          aria-label={`${s.name} の候補をすべて採用`}
                        >
                          候補
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => bulkSetRequests(s.id, "available")}
                        className="rounded border border-slate-200 px-1.5 py-0.5 text-[9px] text-slate-500 hover:bg-emerald-50"
                        aria-label={`${s.name} を全日出勤可能にする`}
                      >
                        全○
                      </button>
                      <button
                        type="button"
                        onClick={() => bulkSetRequests(s.id, "off")}
                        className="rounded border border-slate-200 px-1.5 py-0.5 text-[9px] text-slate-500 hover:bg-slate-100"
                        aria-label={`${s.name} を全日休みにする`}
                      >
                        全休
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}

      {popover && (
        <>
          <div className="fixed inset-0 z-40" onClick={closePopover} aria-hidden />
          <div
            ref={popoverRef}
            role="dialog"
            aria-label={`${popover.staff.name} ${Number(popover.date.slice(8))}日の希望`}
            className="fixed z-50 w-60 rounded-xl border border-slate-200 bg-white p-3 shadow-xl"
            style={{ left: popover.x, top: popover.y }}
          >
            <p className="mb-2 text-xs font-semibold text-slate-700">
              {popover.staff.name} · {Number(popover.date.slice(8))}日(
              {weekdayLabel(popover.date)})
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={() =>
                  apply({
                    staffId: popover.staff.id,
                    date: popover.date,
                    type: "available",
                  })
                }
                className="rounded-md bg-emerald-100 py-2 text-xs font-medium text-emerald-700 hover:bg-emerald-200"
              >
                ○ 出勤可能
              </button>
              <button
                onClick={() =>
                  apply({ staffId: popover.staff.id, date: popover.date, type: "off" })
                }
                className="rounded-md bg-slate-200 py-2 text-xs font-medium text-slate-700 hover:bg-slate-300"
              >
                休み
              </button>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-1.5">
              {PRESETS.map((p) => (
                <button
                  key={p.label}
                  onClick={() =>
                    apply({
                      staffId: popover.staff.id,
                      date: popover.date,
                      type: "time_limited",
                      timeRange: { start: p.start, end: p.end },
                    })
                  }
                  className="rounded-md bg-sky-50 py-1.5 text-[11px] font-medium text-sky-700 hover:bg-sky-100"
                >
                  {p.label}
                </button>
              ))}
            </div>
            <div className="mt-2 flex items-center gap-1">
              <label className="sr-only" htmlFor="req-start">
                開始時刻
              </label>
              <select
                id="req-start"
                value={start}
                onChange={(e) => setStart(e.target.value)}
                className="w-full rounded border border-slate-200 px-1 py-1.5 text-xs"
              >
                {timeOptions.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              <span className="text-xs text-slate-400" aria-hidden>
                -
              </span>
              <label className="sr-only" htmlFor="req-end">
                終了時刻
              </label>
              <select
                id="req-end"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                className="w-full rounded border border-slate-200 px-1 py-1.5 text-xs"
              >
                {timeOptions.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={() =>
                start < end &&
                apply({
                  staffId: popover.staff.id,
                  date: popover.date,
                  type: "time_limited",
                  timeRange: { start, end },
                })
              }
              disabled={start >= end}
              className="mt-1.5 w-full rounded-md bg-sky-100 py-2 text-xs font-medium text-sky-700 hover:bg-sky-200 disabled:opacity-50"
            >
              この時間帯で指定
            </button>
            <button
              onClick={() => apply(null)}
              className="mt-1.5 w-full rounded-md py-1.5 text-[11px] text-slate-500 hover:bg-slate-50"
            >
              クリア（未入力に戻す）
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function toTimeApprox(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
