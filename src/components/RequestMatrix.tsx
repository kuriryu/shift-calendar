"use client";

import type { ShiftRequest, TimeRange } from "@/types";
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
import { hasAnyPattern, recommendationRequestOf } from "@/lib/staff-pattern";

const WEEKDAY_HEADERS = ["月", "火", "水", "木", "金", "土", "日"] as const;

type Stamp =
  | { kind: "available" | "off" | "triangle" | "free" }
  | { kind: "time_limited"; start: string; end: string };

const STAMPS: {
  kind: "available" | "off" | "triangle" | "free";
  label: string;
  chip: string;
  chipClass: string;
}[] = [
  { kind: "off", label: "休み", chip: "休", chipClass: "bg-slate-200 text-slate-700" },
  { kind: "available", label: "出勤可能", chip: "○", chipClass: "bg-emerald-100 text-emerald-700" },
  { kind: "triangle", label: "三角", chip: "△", chipClass: "bg-amber-100 text-amber-800" },
  { kind: "free", label: "1日中", chip: "Free", chipClass: "bg-violet-100 text-violet-800" },
];

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
  const adoptRecommendations = useAppStore((s) => s.adoptRecommendations);

  const [personId, setPersonId] = useState<string | null>(null);
  const [stamp, setStamp] = useState<Stamp | null>(null);
  const [timeOpen, setTimeOpen] = useState(false);
  const [timeAnchor, setTimeAnchor] = useState<HTMLElement | null>(null);
  const closeTime = useCallback(() => setTimeOpen(false), []);
  const timeRef = useDismissable<HTMLDivElement>(timeOpen, closeTime);
  const { refs, floatingStyles, isPositioned } = useViewportPopover(timeOpen ? timeAnchor : null);
  const timeNodeRef = useMergeRefs([timeRef, refs.setFloating]);
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
    closeTime();
  };

  const openTime = (anchor: HTMLElement) => {
    if (stamp?.kind === "time_limited") {
      setStart(stamp.start);
      setEnd(stamp.end);
    }
    setTimeAnchor(anchor);
    setTimeOpen(true);
  };

  const confirmTime = () => {
    if (start >= end) return;
    setStamp({ kind: "time_limited", start, end });
    closeTime();
  };

  const paint = (date: string) => {
    if (!person || !stamp || timeOpen) return;
    setSelectedDate(date);
    if (stamp.kind === "time_limited") {
      setRequest({
        staffId: person.id,
        date,
        type: "time_limited",
        timeRange: { start: stamp.start, end: stamp.end },
      });
      return;
    }
    setRequest({ staffId: person.id, date, type: stamp.kind });
  };

  const stampLabel =
    stamp?.kind === "time_limited"
      ? `${stamp.start}〜${stamp.end}`
      : stamp
        ? (STAMPS.find((item) => item.kind === stamp.kind)?.label ?? "")
        : "";

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
              <div className="flex max-w-xl flex-col items-end gap-2">
                <div
                  className="flex flex-wrap items-center justify-end gap-1.5"
                  role="toolbar"
                  aria-label="希望の種類"
                >
                  {STAMPS.map((item) => {
                    const selected = stamp?.kind === item.kind;
                    return (
                      <button
                        key={item.kind}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => {
                          closeTime();
                          setStamp({ kind: item.kind });
                        }}
                        className={`flex items-center gap-1.5 rounded-lg border px-2 py-1.5 text-xs font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${
                          selected
                            ? "border-blue-600 bg-blue-50 text-slate-900"
                            : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        <span
                          className={`inline-flex h-5 items-center rounded px-1.5 text-[10px] font-semibold ${item.chipClass}`}
                        >
                          {item.chip}
                        </span>
                        {item.label}
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    aria-pressed={stamp?.kind === "time_limited"}
                    aria-expanded={timeOpen}
                    onClick={(e) => openTime(e.currentTarget)}
                    className={`flex items-center gap-1.5 rounded-lg border px-2 py-1.5 text-xs font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${
                      stamp?.kind === "time_limited"
                        ? "border-blue-600 bg-blue-50 text-slate-900"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <span className="inline-block h-5 w-5 rounded bg-sky-100" aria-hidden />
                    {stamp?.kind === "time_limited" ? `${stamp.start}〜${stamp.end}` : "時間帯"}
                  </button>
                </div>
                <p className="text-right text-[11px] leading-snug text-slate-500">
                  {stamp
                    ? `${stampLabel}を選んでいます。日付をタップすると、その日が${stampLabel}になります。`
                    : "希望の種類を選んでから、日付をタップしてください。"}
                </p>
              </div>
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
                    onClick={() => paint(date)}
                  />
                ),
              )}
            </div>
          </section>
        </>
      ) : null}

      {timeOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={closeTime} aria-hidden />
          <div
            ref={timeNodeRef}
            role="dialog"
            aria-label="時間帯を指定"
            className="z-50 w-[20.5rem] rounded-2xl border border-slate-200 bg-white px-5 pt-5 pb-5 shadow-xl"
            style={{ ...floatingStyles, visibility: isPositioned ? "visible" : "hidden" }}
          >
            <header className="space-y-1">
              <p className="text-base font-bold tracking-tight text-slate-900">時間帯を指定</p>
              <p className="text-sm text-slate-500">
                決めたあと、日付をタップするとその時間帯になります。
              </p>
            </header>

            <div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-end gap-x-2.5">
              <div className="space-y-2">
                <label htmlFor="req-start" className="block text-xs font-medium text-slate-500">
                  開始時刻
                </label>
                <select
                  id="req-start"
                  value={start}
                  onChange={(e) => setStart(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-3 text-center text-base font-semibold tabular-nums text-slate-900"
                >
                  {timeOptions.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <span className="pb-3 text-lg font-medium text-slate-300" aria-hidden>
                〜
              </span>
              <div className="space-y-2">
                <label htmlFor="req-end" className="block text-xs font-medium text-slate-500">
                  終了時刻
                </label>
                <select
                  id="req-end"
                  value={end}
                  onChange={(e) => setEnd(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-3 text-center text-base font-semibold tabular-nums text-slate-900"
                >
                  {timeOptions.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              type="button"
              onClick={confirmTime}
              disabled={start >= end}
              className="mt-5 flex w-full items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-3 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
            >
              <Icon name="done" size={18} />
              この時間帯にする
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
  onClick: () => void;
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
