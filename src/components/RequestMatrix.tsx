"use client";

import { useCallback, useState } from "react";
import { EMPTY_REQUESTS, useAppStore } from "@/stores/useAppStore";
import Icon from "@/components/Icon";
import { useMounted } from "@/hooks/useMounted";
import { useDismissable } from "@/hooks/useDismissable";
import { timeOptionsOf } from "@/lib/coverage";
import { daysOfMonth, isWeekendOrFri, weekdayLabel, weekdayOf } from "@/lib/dates";
import type { Role, ShiftRequest, Staff } from "@/types";
import { ROLE_LABELS } from "@/types";

const ROLE_ORDER: Role[] = ["employee", "part_time", "student"];

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

/** スタッフ情報（固定休・基本パターン）から導いた候補 */
function recommendationOf(s: Staff, date: string): ShiftRequest | null {
  if (s.unavailableWeekdays?.includes(weekdayOf(date))) {
    return { staffId: s.id, date, type: "off" };
  }
  if (s.defaultPattern) {
    return {
      staffId: s.id,
      date,
      type: "time_limited",
      timeRange: { ...s.defaultPattern },
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

  if (!mounted) {
    return <div className="py-20 text-center text-sm text-slate-400">読み込み中…</div>;
  }

  const timeOptions = timeOptionsOf(settings);
  const days = daysOfMonth(month);
  const requestMap = new Map(requests.map((r) => [`${r.staffId}:${r.date}`, r]));

  const openPopover = (e: React.MouseEvent, s: Staff, date: string) => {
    const existing = requestMap.get(`${s.id}:${date}`);
    if (existing?.type === "time_limited" && existing.timeRange) {
      setStart(existing.timeRange.start);
      setEnd(existing.timeRange.end);
    } else {
      setStart(s.defaultPattern?.start ?? timeOptions[0]);
      setEnd(s.defaultPattern?.end ?? timeOptions[Math.min(8, timeOptions.length - 1)]);
    }
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = Math.min(rect.left, window.innerWidth - 240);
    const y = Math.min(rect.bottom + 4, window.innerHeight - 300);
    setPopover({ staff: s, date, x, y });
  };

  /**
   * セルのタップ:
   * - 未入力で候補がある → 候補をそのまま確定（1タップ）
   * - それ以外 → 選択ポップオーバー
   */
  const onCellClick = (e: React.MouseEvent, s: Staff, date: string) => {
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

  /** 未入力セルの表示: 候補は薄いグレーで示す */
  const ghostCell = (s: Staff, date: string) => {
    const rec = recommendationOf(s, date);
    if (rec?.type === "off") {
      return (
        <span className="inline-block w-full rounded border border-dashed border-slate-300 py-1 text-[10px] text-slate-400">
          休
        </span>
      );
    }
    if (rec?.type === "time_limited" && rec.timeRange) {
      return (
        <span className="inline-block w-full rounded border border-dashed border-slate-300 py-1 text-[10px] text-slate-400">
          {shortTime(rec.timeRange.start)}-{shortTime(rec.timeRange.end)}
        </span>
      );
    }
    return <span className="text-[10px] text-slate-300">・</span>;
  };

  const cellOf = (s: Staff, date: string) => {
    const r = requestMap.get(`${s.id}:${date}`);
    if (!r) return ghostCell(s, date);
    if (r.type === "off") {
      return (
        <span className="inline-block w-full rounded bg-slate-200 py-1 text-[10px] font-semibold text-slate-700">
          休
        </span>
      );
    }
    if (r.type === "time_limited" && r.timeRange) {
      return (
        <span className="inline-block w-full rounded bg-sky-100 py-1 text-[10px] font-medium text-sky-800">
          {shortTime(r.timeRange.start)}-{shortTime(r.timeRange.end)}
        </span>
      );
    }
    return (
      <span className="inline-block w-full rounded bg-emerald-100 py-1 text-[10px] font-semibold text-emerald-700">
        ○
      </span>
    );
  };

  const grouped = ROLE_ORDER.map((role) => ({
    role,
    members: staff.filter((s) => s.role === role),
  }));

  const hasAnyRecommendation = staff.some(
    (s) => s.defaultPattern || (s.unavailableWeekdays?.length ?? 0) > 0,
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-sm text-slate-500">
          セルをタップして希望を入力します。
          <span className="ml-1 inline-block rounded border border-dashed border-slate-300 px-1.5 text-[10px] text-slate-400">
            9-17
          </span>
          のような薄い表示はスタッフ情報から作った候補で、タップするとそのまま確定します。
        </p>
        <div className="ml-auto flex flex-wrap gap-2">
          {hasAnyRecommendation && (
            <button
              onClick={() => adoptRecommendations()}
              className="flex items-center gap-1 rounded-md border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-100"
            >
              <Icon name="done_all" size={14} />
              全員の候補を採用
            </button>
          )}
          <button
            onClick={fillTestRequests}
            className="flex items-center gap-1 rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
          >
            <Icon name="science" size={14} />
            テストデータ投入
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

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="border-collapse text-center">
          <caption className="sr-only">
            {month} の希望入力。行がスタッフ、列が日付です。
          </caption>
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th
                scope="col"
                className="sticky left-0 z-10 min-w-44 bg-slate-50 px-4 py-2.5 text-left text-xs font-semibold text-slate-600"
              >
                スタッフ
              </th>
              {days.map((date) => (
                <th
                  key={date}
                  scope="col"
                  className={`min-w-10 px-0.5 py-1.5 ${isWeekendOrFri(date) ? "bg-sky-50" : ""}`}
                >
                  <div className="text-xs font-semibold text-slate-700">
                    {Number(date.slice(8))}
                  </div>
                  <div className="text-[9px] text-slate-400">{weekdayLabel(date)}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {grouped.map(({ role, members }) =>
              members.map((s, i) => {
                const hasRec =
                  s.defaultPattern || (s.unavailableWeekdays?.length ?? 0) > 0;
                return (
                  <tr key={s.id} className="border-b border-slate-100">
                    <th
                      scope="row"
                      className="sticky left-0 z-10 bg-white px-4 py-1.5 text-left font-normal"
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-medium text-slate-700">{s.name}</span>
                        {i === 0 && (
                          <span className="text-[9px] text-slate-400">{ROLE_LABELS[role]}</span>
                        )}
                        <span className="ml-auto flex gap-0.5">
                          {hasRec && (
                            <button
                              onClick={() => adoptRecommendations(s.id)}
                              className="rounded border border-indigo-200 bg-indigo-50 px-1.5 py-0.5 text-[9px] text-indigo-700 hover:bg-indigo-100"
                              aria-label={`${s.name} の候補をすべて採用`}
                              title="候補をすべて採用"
                            >
                              候補
                            </button>
                          )}
                          <button
                            onClick={() => bulkSetRequests(s.id, "available")}
                            className="rounded border border-slate-200 px-1.5 py-0.5 text-[9px] text-slate-500 hover:bg-emerald-50"
                            aria-label={`${s.name} を全日出勤可能にする`}
                            title="全日○"
                          >
                            全○
                          </button>
                          <button
                            onClick={() => bulkSetRequests(s.id, "off")}
                            className="rounded border border-slate-200 px-1.5 py-0.5 text-[9px] text-slate-500 hover:bg-slate-100"
                            aria-label={`${s.name} を全日休みにする`}
                            title="全日休"
                          >
                            全休
                          </button>
                        </span>
                      </div>
                    </th>
                    {days.map((date) => {
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
                          className={`p-0 ${isWeekendOrFri(date) ? "bg-sky-50/40" : ""}`}
                        >
                          <button
                            onClick={(e) => onCellClick(e, s, date)}
                            aria-label={label}
                            className="block w-full px-0.5 py-1.5 hover:bg-indigo-50"
                          >
                            {cellOf(s, date)}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                );
              }),
            )}
          </tbody>
        </table>
      </div>

      {popover && (
        <>
          <div className="fixed inset-0 z-40" onClick={closePopover} aria-hidden />
          <div
            ref={popoverRef}
            role="dialog"
            aria-label={`${popover.staff.name} ${Number(popover.date.slice(8))}日の希望`}
            className="fixed z-50 w-56 rounded-xl border border-slate-200 bg-white p-3 shadow-xl"
            style={{ left: popover.x, top: popover.y }}
          >
            <p className="mb-2 text-xs font-semibold text-slate-700">
              {popover.staff.name} · {Number(popover.date.slice(8))}日(
              {weekdayLabel(popover.date)})
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={() =>
                  apply({ staffId: popover.staff.id, date: popover.date, type: "available" })
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
