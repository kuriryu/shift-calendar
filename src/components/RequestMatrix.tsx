"use client";

import type { ShiftRequest, Staff, TimeRange } from "@/types";
import Icon from "@/components/Icon";
import { navCircleButtonClassName } from "@/components/FieldControl";
import { useMounted } from "@/hooks/useMounted";
import { useDismissable } from "@/hooks/useDismissable";
import { useViewportPopover } from "@/hooks/useViewportPopover";
import { useCallback, useState } from "react";
import { useMergeRefs } from "@floating-ui/react";
import { EMPTY_REQUESTS, useAppStore } from "@/stores/useAppStore";
import { timeOptionsOf } from "@/lib/coverage";
import {
  daysOfMonth,
  formatDate,
  isWeekendDay,
  monthLabel,
  weekdayLabel,
  weekdayOf,
} from "@/lib/dates";
import { hasAnyPattern, patternOf, recommendationRequestOf } from "@/lib/staff-pattern";

const WEEKDAY_HEADERS = ["月", "火", "水", "木", "金", "土", "日"] as const;

type PopoverState = {
  staff: Staff;
  date: string;
  anchor: HTMLElement;
};

function compactTime(t: string): string {
  const [h, m] = t.split(":");
  return m === "00" ? String(Number(h)) : `${Number(h)}:${m}`;
}

function requestLabel(r: ShiftRequest | null, freeTime?: TimeRange): string {
  if (!r) return "未入力";
  if (r.type === "off") return "休み";
  if (r.type === "triangle") return "三角";
  if (r.type === "free") {
    return freeTime ? `Free ${freeTime.start}〜${freeTime.end}` : "Free";
  }
  if (r.type === "time_limited" && r.timeRange) {
    return `${r.timeRange.start}〜${r.timeRange.end}`;
  }
  return "出勤可能";
}

function chipText(r: ShiftRequest, freeTime?: TimeRange): string {
  if (r.type === "off") return "休";
  if (r.type === "triangle") return "△";
  if (r.type === "free") {
    return freeTime
      ? `${compactTime(freeTime.start)}–${compactTime(freeTime.end)}`
      : "Free";
  }
  if (r.type === "time_limited" && r.timeRange) {
    return `${compactTime(r.timeRange.start)}–${compactTime(r.timeRange.end)}`;
  }
  return "○";
}

function requestChip(r: ShiftRequest | null, ghost: boolean): string {
  if (!r) return "text-slate-300";
  if (ghost) return "border border-dashed border-slate-300 text-slate-400";
  if (r.type === "off") return "bg-slate-200 text-slate-700";
  if (r.type === "triangle") return "bg-amber-100 text-amber-800";
  if (r.type === "free") return "bg-violet-100 text-violet-800";
  if (r.type === "time_limited") return "bg-sky-100 text-sky-800";
  return "bg-emerald-100 text-emerald-700";
}

export default function RequestMatrix() {
  const mounted = useMounted();
  const staff = useAppStore((s) => s.staff);
  const hiddenStaffIds = useAppStore((s) => s.hiddenStaffIds);
  const settings = useAppStore((s) => s.settings);
  const month = useAppStore((s) => s.selectedMonth);
  const setSelectedDate = useAppStore((s) => s.setSelectedDate);
  const requests = useAppStore(
    (s) => s.requests[s.selectedMonth] ?? EMPTY_REQUESTS,
  );
  const setRequest = useAppStore((s) => s.setRequest);
  const clearRequest = useAppStore((s) => s.clearRequest);
  const adoptRecommendations = useAppStore((s) => s.adoptRecommendations);

  const [personId, setPersonId] = useState<string | null>(null);
  const [popover, setPopover] = useState<PopoverState | null>(null);
  const closePopover = useCallback(() => setPopover(null), []);
  const popoverRef = useDismissable<HTMLDivElement>(popover !== null, closePopover);
  const { refs, floatingStyles, isPositioned } = useViewportPopover(popover?.anchor ?? null);
  const popoverNodeRef = useMergeRefs([popoverRef, refs.setFloating]);
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("13:00");

  if (!mounted) {
    return <div className="py-20 text-center text-sm text-slate-400">読み込み中…</div>;
  }

  const timeOptions = timeOptionsOf(settings);
  const days = daysOfMonth(month);
  const hidden = new Set(hiddenStaffIds);
  const visibleStaff = staff.filter((s) => !hidden.has(s.id));
  const noStaff = staff.length === 0;
  const allFilteredOut = !noStaff && visibleStaff.length === 0;
  const personIndex = Math.max(
    0,
    visibleStaff.findIndex((s) => s.id === personId),
  );
  const person = visibleStaff[personIndex] ?? null;
  const requestMap = new Map(
    requests
      .filter((r) => r.staffId === person?.id)
      .map((r) => [r.date, r]),
  );
  const today = formatDate(new Date());

  const firstWeekday = weekdayOf(days[0]);
  const leadBlanks = firstWeekday === 0 ? 6 : firstWeekday - 1;
  const lastWeekday = weekdayOf(days[days.length - 1]);
  const tailBlanks = lastWeekday === 0 ? 0 : 7 - lastWeekday;
  const monthCells: (string | null)[] = [
    ...Array.from({ length: leadBlanks }, () => null),
    ...days,
    ...Array.from({ length: tailBlanks }, () => null),
  ];

  const selectPerson = (id: string) => {
    setPersonId(id);
    closePopover();
  };

  const openPopover = (e: React.MouseEvent, date: string) => {
    if (!person) return;
    setSelectedDate(date);
    const existing = requestMap.get(date);
    if (existing?.type === "time_limited" && existing.timeRange) {
      setStart(existing.timeRange.start);
      setEnd(existing.timeRange.end);
    } else {
      const pat = patternOf(person, date);
      setStart(pat?.start ?? timeOptions[0]);
      setEnd(pat?.end ?? timeOptions[Math.min(8, timeOptions.length - 1)]);
    }
    setPopover({ staff: person, date, anchor: e.currentTarget as HTMLElement });
  };

  const apply = (req: ShiftRequest | null) => {
    if (!popover) return;
    if (req) setRequest(req);
    else clearRequest(popover.staff.id, popover.date);
    closePopover();
  };

  const hasPattern =
    !!person && (hasAnyPattern(person) || (person.unavailableWeekdays?.length ?? 0) > 0);

  return (
    <div className="space-y-5">
      {noStaff ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-6 py-14 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-slate-400 ring-1 ring-slate-200">
            <Icon name="person_off" size={28} />
          </span>
          <p className="text-sm font-medium text-slate-600">スタッフが登録されていません</p>
          <p className="max-w-xs text-xs leading-relaxed text-slate-400">
            ステップ3でスタッフを登録すると、その人の月カレンダーで希望を入力できます。
          </p>
        </div>
      ) : allFilteredOut ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-6 py-14 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-slate-400 ring-1 ring-slate-200">
            <Icon name="filter_list_off" size={28} />
          </span>
          <p className="text-sm font-medium text-slate-600">表示するスタッフがいません</p>
          <p className="max-w-xs text-xs leading-relaxed text-slate-400">
            サイドバーのスタッフ絞り込みを確認してください。
          </p>
        </div>
      ) : person ? (
        <>
          <div className="flex w-full items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => selectPerson(visibleStaff[personIndex - 1].id)}
              disabled={personIndex <= 0}
              aria-label="前の人"
              className={navCircleButtonClassName}
            >
              <Icon name="chevron_left" size={20} />
            </button>
            <div className="min-w-[8rem] text-center" aria-live="polite">
              <p className="text-sm font-semibold text-slate-900">{person.name}</p>
            </div>
            <button
              type="button"
              onClick={() => selectPerson(visibleStaff[personIndex + 1].id)}
              disabled={personIndex >= visibleStaff.length - 1}
              aria-label="次の人"
              className={navCircleButtonClassName}
            >
              <Icon name="chevron_right" size={20} />
            </button>
          </div>
          {hasPattern && (
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => adoptRecommendations(person.id)}
                className="flex items-center gap-1.5 rounded-md border border-blue-200 bg-blue-50 px-3.5 py-2 text-xs font-medium text-blue-700 hover:bg-blue-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
              >
                <Icon name="done_all" size={14} />
                この人の候補を採用
              </button>
            </div>
          )}

          <div
            className="flex gap-2 overflow-x-auto pb-1"
            role="tablist"
            aria-label="希望を入力する人"
          >
            {visibleStaff.map((s) => {
              const selected = s.id === person.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  onClick={() => selectPerson(s.id)}
                  className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${
                    selected
                      ? "bg-blue-600 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {s.name}
                </button>
              );
            })}
          </div>

          <section
            aria-label={`${person.name}の${monthLabel(month)}の希望`}
            className="rounded-xl border border-slate-200 bg-white p-4"
          >
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <h3 className="text-base font-semibold text-slate-900">{monthLabel(month)}</h3>
              <ul
                className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px] text-slate-500"
                aria-label="日付の凡例"
              >
                <li className="flex items-center gap-1.5">
                  <span className="inline-flex h-5 items-center rounded bg-slate-200 px-1.5 text-[10px] font-semibold text-slate-700">
                    休
                  </span>
                  休み
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="inline-flex h-5 items-center rounded bg-emerald-100 px-1.5 text-[10px] font-semibold text-emerald-700">
                    ○
                  </span>
                  出勤可能
                </li>
                <li className="flex items-center gap-1.5" title="あまり入りたくない。人がいなければ入る">
                  <span className="inline-flex h-5 items-center rounded bg-amber-100 px-1.5 text-[10px] font-semibold text-amber-800">
                    △
                  </span>
                  三角
                </li>
                <li
                  className="flex items-center gap-1.5"
                  title="1日中入れる。時間帯はスタッフ情報で指定できる"
                >
                  <span className="inline-flex h-5 items-center rounded bg-violet-100 px-1.5 text-[10px] font-semibold text-violet-800">
                    Free
                  </span>
                  1日中
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="inline-block h-5 w-5 rounded bg-sky-100" aria-hidden />
                  時間帯
                </li>
              </ul>
            </div>

            <div className="grid grid-cols-7 gap-1">
              {WEEKDAY_HEADERS.map((w) => (
                <span
                  key={w}
                  className="py-1 text-center text-[11px] font-medium text-slate-400"
                >
                  {w}
                </span>
              ))}
              {monthCells.map((date, i) =>
                date === null ? (
                  <span key={`blank-${i}`} className="min-h-16 sm:min-h-24" />
                ) : (
                  <DayCell
                    key={date}
                    date={date}
                    today={today}
                    saved={requestMap.get(date) ?? null}
                    freeTime={person.freeTimeRange}
                    recommendation={
                      requestMap.has(date) ? null : recommendationRequestOf(person, date)
                    }
                    onClick={(e) => openPopover(e, date)}
                  />
                ),
              )}
            </div>
          </section>
        </>
      ) : null}

      {popover && (
        <>
          <div className="fixed inset-0 z-40" onClick={closePopover} aria-hidden />
          <div
            ref={popoverNodeRef}
            role="dialog"
            aria-label={`${popover.staff.name} ${Number(popover.date.slice(8))}日の希望`}
            className="z-50 w-[20.5rem] rounded-2xl border border-slate-200 bg-white px-5 pt-5 pb-2 shadow-xl"
            style={{ ...floatingStyles, visibility: isPositioned ? "visible" : "hidden" }}
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
              <button
                type="button"
                onClick={() =>
                  apply({
                    staffId: popover.staff.id,
                    date: popover.date,
                    type: "triangle",
                  })
                }
                aria-label="三角"
                className="col-span-2 flex flex-col items-center gap-1 rounded-xl bg-amber-50 px-3 py-4 text-amber-900 ring-1 ring-amber-100 transition-colors hover:bg-amber-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500"
              >
                <span className="text-lg font-semibold leading-none text-amber-700" aria-hidden>
                  △
                </span>
                <span className="text-[10px] font-normal text-amber-800/80">
                  あまり入りたくない。人がいなければ入る
                </span>
              </button>
              <button
                type="button"
                onClick={() =>
                  apply({
                    staffId: popover.staff.id,
                    date: popover.date,
                    type: "free",
                  })
                }
                className="col-span-2 flex flex-col items-center gap-1 rounded-xl bg-violet-50 px-3 py-4 text-violet-900 ring-1 ring-violet-100 transition-colors hover:bg-violet-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500"
              >
                <span className="text-xs font-semibold">Free</span>
                <span className="text-[10px] font-normal text-violet-800/80">
                  {popover.staff.freeTimeRange
                    ? `${popover.staff.freeTimeRange.start}〜${popover.staff.freeTimeRange.end} で入れる`
                    : "1日中入れます"}
                </span>
              </button>
            </div>

            <section className="mt-6 rounded-xl bg-blue-50/70 px-4 pb-2 pt-4" aria-label="時間帯を指定">
              <div className="mb-4 flex items-center gap-2">
                <Icon name="schedule" size={18} className="text-blue-700" />
                <h3 className="text-sm font-semibold text-blue-900">時間帯を指定</h3>
              </div>

              <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-x-2.5 gap-y-0">
                <div className="space-y-2">
                  <label htmlFor="req-start" className="block text-xs font-medium text-blue-800/80">
                    開始時刻
                  </label>
                  <select
                    id="req-start"
                    value={start}
                    onChange={(e) => setStart(e.target.value)}
                    className="w-full rounded-lg border border-blue-200/80 bg-white px-2.5 py-3 text-center text-base font-semibold tabular-nums text-slate-900 shadow-sm"
                  >
                    {timeOptions.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                <span className="pb-3 text-lg font-medium text-blue-300" aria-hidden>
                  〜
                </span>
                <div className="space-y-2">
                  <label htmlFor="req-end" className="block text-xs font-medium text-blue-800/80">
                    終了時刻
                  </label>
                  <select
                    id="req-end"
                    value={end}
                    onChange={(e) => setEnd(e.target.value)}
                    className="w-full rounded-lg border border-blue-200/80 bg-white px-2.5 py-3 text-center text-base font-semibold tabular-nums text-slate-900 shadow-sm"
                  >
                    {timeOptions.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-4">
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
                  className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-3 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
                >
                  <Icon name="done" size={18} />
                  この時間帯で指定
                </button>
              </div>
            </section>

            <button
              type="button"
              onClick={() => apply(null)}
              className="mt-2 w-full rounded-lg py-3 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-700"
            >
              クリア（未入力に戻す）
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function DayCell({
  date,
  today,
  saved,
  freeTime,
  recommendation,
  onClick,
}: {
  date: string;
  today: string;
  saved: ShiftRequest | null;
  freeTime?: TimeRange;
  recommendation: ShiftRequest | null;
  onClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
}) {
  const shown = saved ?? recommendation;
  const ghost = !saved && !!recommendation;
  const label = saved
    ? requestLabel(saved, freeTime)
    : recommendation
      ? `候補 ${requestLabel(recommendation, freeTime)}`
      : "未入力";
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${Number(date.slice(8))}日（${weekdayLabel(date)}）: ${label}`}
      className={`flex min-h-16 flex-col items-stretch rounded-lg border p-1.5 text-left transition-colors hover:border-blue-300 hover:bg-blue-50/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 sm:min-h-24 sm:p-2 ${
        isWeekendDay(date) ? "border-slate-200 bg-slate-100" : "border-slate-100 bg-white"
      } ${date === today ? "ring-1 ring-blue-400" : ""}`}
    >
      <span
        className={`text-xs font-semibold tabular-nums ${
          date === today ? "text-blue-600" : "text-slate-700"
        }`}
      >
        {Number(date.slice(8))}
      </span>
      {shown ? (
        <span
          className={`mt-1 inline-flex items-center justify-center rounded px-1 py-0.5 text-[10px] font-semibold leading-tight sm:text-[11px] ${requestChip(shown, ghost)}`}
        >
          {chipText(shown, freeTime)}
        </span>
      ) : (
        <span className="mt-auto text-[10px] text-slate-300">未入力</span>
      )}
    </button>
  );
}
