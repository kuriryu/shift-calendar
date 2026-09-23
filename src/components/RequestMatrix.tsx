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
import {
  hasAnyPattern,
  patternOf,
  recommendationRequestOf,
} from "@/lib/staff-pattern";
import { toMinutes } from "@/lib/time";
import type { Role, ShiftRequest, Staff } from "@/types";
import { ROLE_META, ROLE_ORDER } from "@/lib/roles";

const WEEKDAY_HEADERS = ["月", "火", "水", "木", "金", "土", "日"] as const;

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
      const rec = recommendationRequestOf(s, date);
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
    const rec = recommendationRequestOf(s, date);
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
        <span className="flex w-12 items-center gap-0.5 truncate text-[9px] text-slate-400">
          <Icon name={ROLE_META[role].icon} size={11} />
          {ROLE_META[role].label}
        </span>
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
                    const rec = r ? null : recommendationRequestOf(s, date);
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
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <div
          className="flex items-center gap-1 rounded-lg bg-slate-100 p-1.5"
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
              className={`flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 ${
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
        <ul
          className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px] text-slate-500"
          aria-label="セルの凡例"
        >
          <li className="flex items-center gap-1.5">
            <span className="inline-flex h-5 min-w-[1.5rem] items-center justify-center rounded bg-slate-200 px-1 text-[10px] font-semibold text-slate-700">
              休
            </span>
            休み
          </li>
          <li className="flex items-center gap-1.5">
            <span className="inline-flex h-5 min-w-[1.5rem] items-center justify-center rounded bg-emerald-100 px-1 text-[10px] font-semibold text-emerald-700">
              ○
            </span>
            出勤可能
          </li>
          <li className="flex items-center gap-1.5">
            <span className="inline-flex h-5 items-center justify-center rounded bg-sky-100 px-1.5 text-[10px] font-medium text-sky-800">
              9-13
            </span>
            時間帯
          </li>
          <li className="flex items-center gap-1.5">
            <span className="inline-flex h-5 min-w-[1.5rem] items-center justify-center rounded border border-dashed border-slate-300 px-1 text-[10px] text-slate-400">
              休
            </span>
            候補（未確定）
          </li>
        </ul>
        {hasAnyRecommendation && (
          <div className="ml-auto">
            <button
              onClick={() => adoptRecommendations()}
              disabled={noStaff}
              className="flex items-center gap-1.5 rounded-md border border-indigo-200 bg-indigo-50 px-3.5 py-2 text-xs font-medium text-indigo-700 hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            >
              <Icon name="done_all" size={14} />
              全員の候補を採用
            </button>
          </div>
        )}
      </div>

      {noStaff ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-6 py-14 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-slate-400 ring-1 ring-slate-200">
            <Icon name="person_off" size={28} />
          </span>
          <p className="text-sm font-medium text-slate-600">スタッフが登録されていません</p>
          <p className="max-w-xs text-xs leading-relaxed text-slate-400">
            ステップ2でスタッフを登録すると、ここに希望入力表が表示されます。
          </p>
        </div>
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
              const rec = r ? null : recommendationRequestOf(s, dayDate);
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
                  className="grid grid-cols-[7.5rem_4rem_minmax(0,1fr)] items-center gap-2 py-0.5"
                >
                  <span className="truncate text-right text-xs font-medium text-slate-700">
                    {s.name}
                  </span>
                  <span className="flex items-center gap-0.5 truncate text-[9px] text-slate-400">
                    <Icon name={ROLE_META[s.role].icon} size={11} />
                    {ROLE_META[s.role].label}
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
                const rec = r ? null : recommendationRequestOf(s, dayDate);
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
                        <span className="flex items-center gap-1 truncate text-xs font-medium text-slate-800">
                          {s.name}
                          <span className="inline-flex items-center gap-0.5 text-[9px] font-normal text-slate-400">
                            <Icon name={ROLE_META[s.role].icon} size={11} />
                            {ROLE_META[s.role].label}
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
            className="fixed z-50 w-[20.5rem] rounded-2xl border border-slate-200 bg-white p-5 shadow-xl"
            style={{ left: popover.x, top: popover.y }}
          >
            <header className="space-y-1">
              <p className="text-base font-bold tracking-tight text-slate-900">
                {popover.staff.name}
              </p>
              <p className="text-sm text-slate-500">
                {Number(popover.date.slice(8))}日（{weekdayLabel(popover.date)}）
              </p>
            </header>

            <div className="mt-5 grid grid-cols-2 gap-3" role="group" aria-label="希望の種類">
              <button
                type="button"
                onClick={() =>
                  apply({
                    staffId: popover.staff.id,
                    date: popover.date,
                    type: "available",
                  })
                }
                className="flex flex-col items-center gap-1.5 rounded-xl bg-emerald-50 px-3 py-4 text-emerald-800 ring-1 ring-emerald-100 transition-colors hover:bg-emerald-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
              >
                <Icon name="check_circle" size={22} className="text-emerald-600" />
                <span className="text-xs font-semibold">出勤可能</span>
              </button>
              <button
                type="button"
                onClick={() =>
                  apply({ staffId: popover.staff.id, date: popover.date, type: "off" })
                }
                className="flex flex-col items-center gap-1.5 rounded-xl bg-slate-100 px-3 py-4 text-slate-700 ring-1 ring-slate-200/80 transition-colors hover:bg-slate-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500"
              >
                <Icon name="event_busy" size={22} className="text-slate-500" />
                <span className="text-xs font-semibold">休み</span>
              </button>
            </div>

            <section className="mt-6 rounded-xl bg-indigo-50/70 px-4 pb-5 pt-4" aria-label="時間帯を指定">
              <div className="mb-4 flex items-center gap-2">
                <Icon name="schedule" size={18} className="text-indigo-700" />
                <h3 className="text-sm font-semibold text-indigo-900">時間帯を指定</h3>
              </div>

              <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-x-2.5 gap-y-0">
                <div className="space-y-2">
                  <label htmlFor="req-start" className="block text-xs font-medium text-indigo-800/80">
                    開始時刻
                  </label>
                  <select
                    id="req-start"
                    value={start}
                    onChange={(e) => setStart(e.target.value)}
                    className="w-full rounded-lg border border-indigo-200/80 bg-white px-2.5 py-3 text-center text-base font-semibold tabular-nums text-slate-900 shadow-sm"
                  >
                    {timeOptions.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                <span
                  className="pb-3 text-lg font-medium text-indigo-300"
                  aria-hidden
                >
                  〜
                </span>
                <div className="space-y-2">
                  <label htmlFor="req-end" className="block text-xs font-medium text-indigo-800/80">
                    終了時刻
                  </label>
                  <select
                    id="req-end"
                    value={end}
                    onChange={(e) => setEnd(e.target.value)}
                    className="w-full rounded-lg border border-indigo-200/80 bg-white px-2.5 py-3 text-center text-base font-semibold tabular-nums text-slate-900 shadow-sm"
                  >
                    {timeOptions.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-6 pt-2">
                <button
                  type="button"
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
                  className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
                >
                  <Icon name="done" size={18} />
                  この時間帯で指定
                </button>
              </div>
            </section>

            <button
              type="button"
              onClick={() => apply(null)}
              className="mt-6 w-full rounded-lg py-3 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-700"
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
