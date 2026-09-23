"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { EMPTY_REQUESTS, useAppStore } from "@/stores/useAppStore";
import { useMounted } from "@/hooks/useMounted";
import { daysOfMonth, isWeekendOrFri, weekdayLabel } from "@/lib/dates";
import type { Role, ShiftRequest, Staff } from "@/types";
import { ROLE_LABELS } from "@/types";

const ROLE_ORDER: Role[] = ["employee", "part_time", "student"];

const TIME_OPTIONS: string[] = [];
for (let m = 9 * 60; m <= 21 * 60 + 30; m += 30) {
  TIME_OPTIONS.push(
    `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`,
  );
}

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

export default function RequestMatrix() {
  const mounted = useMounted();
  const router = useRouter();
  const staff = useAppStore((s) => s.staff);
  const month = useAppStore((s) => s.selectedMonth);
  const requests = useAppStore(
    (s) => s.requests[s.selectedMonth] ?? EMPTY_REQUESTS,
  );
  const setRequest = useAppStore((s) => s.setRequest);
  const clearRequest = useAppStore((s) => s.clearRequest);
  const bulkSetRequests = useAppStore((s) => s.bulkSetRequests);
  const clearAllRequests = useAppStore((s) => s.clearAllRequests);
  const fillTestRequests = useAppStore((s) => s.fillTestRequests);
  const generate = useAppStore((s) => s.generate);

  const [popover, setPopover] = useState<PopoverState | null>(null);
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("13:00");

  if (!mounted) {
    return <div className="py-20 text-center text-sm text-slate-400">読み込み中…</div>;
  }

  const days = daysOfMonth(month);
  const requestMap = new Map(requests.map((r) => [`${r.staffId}:${r.date}`, r]));

  const openPopover = (e: React.MouseEvent, s: Staff, date: string) => {
    const existing = requestMap.get(`${s.id}:${date}`);
    if (existing?.type === "time_limited" && existing.timeRange) {
      setStart(existing.timeRange.start);
      setEnd(existing.timeRange.end);
    } else {
      setStart(s.defaultPattern?.start ?? "09:00");
      setEnd(s.defaultPattern?.end ?? "13:00");
    }
    const x = Math.min(e.clientX, window.innerWidth - 220);
    const y = Math.min(e.clientY, window.innerHeight - 280);
    setPopover({ staff: s, date, x, y });
  };

  const apply = (req: ShiftRequest | null) => {
    if (!popover) return;
    if (req) setRequest(req);
    else clearRequest(popover.staff.id, popover.date);
    setPopover(null);
  };

  const defaultCell = (s: Staff, date: string) => {
    const dow = new Date(`${date}T00:00:00`).getDay();
    if (s.unavailableWeekdays?.includes(dow)) {
      return <span className="text-[10px] text-slate-300">休</span>;
    }
    if (s.defaultPattern) {
      return (
        <span className="text-[10px] text-slate-300">
          {shortTime(s.defaultPattern.start)}-{shortTime(s.defaultPattern.end)}
        </span>
      );
    }
    return <span className="text-[10px] text-slate-300">○</span>;
  };

  const cellOf = (s: Staff, date: string) => {
    const r = requestMap.get(`${s.id}:${date}`);
    if (!r) return defaultCell(s, date);
    if (r.type === "off") {
      return (
        <span className="inline-block w-full rounded bg-slate-200 py-0.5 text-[10px] font-semibold text-slate-600">
          休
        </span>
      );
    }
    if (r.type === "time_limited" && r.timeRange) {
      return (
        <span className="inline-block w-full rounded bg-sky-100 py-0.5 text-[10px] font-medium text-sky-800">
          {shortTime(r.timeRange.start)}-{shortTime(r.timeRange.end)}
        </span>
      );
    }
    return (
      <span className="inline-block w-full rounded bg-emerald-100 py-0.5 text-[10px] font-semibold text-emerald-700">
        ○
      </span>
    );
  };

  const grouped = ROLE_ORDER.map((role) => ({
    role,
    members: staff.filter((s) => s.role === role),
  }));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-xs text-slate-500">
          セルをクリックして希望を入力。薄い表示は基本パターン（未入力時の扱い）です。
        </p>
        <div className="ml-auto flex gap-2">
          <button
            onClick={fillTestRequests}
            className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
          >
            テストデータ投入
          </button>
          <button
            onClick={clearAllRequests}
            className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
          >
            全クリア
          </button>
          <button
            onClick={() => {
              generate();
              router.push("/");
            }}
            className="rounded-md bg-indigo-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700"
          >
            自動生成する
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="border-collapse text-center">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="sticky left-0 z-10 min-w-32 bg-slate-50 px-3 py-2 text-left text-xs font-semibold text-slate-600">
                スタッフ
              </th>
              {days.map((date) => (
                <th
                  key={date}
                  className={`min-w-9 px-0.5 py-1 ${isWeekendOrFri(date) ? "bg-sky-50" : ""}`}
                >
                  <div className="text-xs font-semibold text-slate-700">
                    {Number(date.slice(8))}
                  </div>
                  <div className="text-[9px] text-slate-400">
                    {weekdayLabel(date)}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {grouped.map(({ role, members }) =>
              members.map((s, i) => (
                <tr key={s.id} className="border-b border-slate-100">
                  <td className="sticky left-0 z-10 bg-white px-3 py-1 text-left">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-medium text-slate-700">
                        {s.name}
                      </span>
                      {i === 0 && (
                        <span className="text-[9px] text-slate-400">
                          {ROLE_LABELS[role]}
                        </span>
                      )}
                      <span className="ml-auto flex gap-0.5">
                        <button
                          onClick={() => bulkSetRequests(s.id, "available")}
                          className="rounded border border-slate-200 px-1 text-[9px] text-slate-500 hover:bg-emerald-50"
                          title="全日○"
                        >
                          全○
                        </button>
                        <button
                          onClick={() => bulkSetRequests(s.id, "off")}
                          className="rounded border border-slate-200 px-1 text-[9px] text-slate-500 hover:bg-slate-100"
                          title="全日休"
                        >
                          全休
                        </button>
                      </span>
                    </div>
                  </td>
                  {days.map((date) => (
                    <td
                      key={date}
                      className={`cursor-pointer px-0.5 py-1 hover:bg-indigo-50 ${isWeekendOrFri(date) ? "bg-sky-50/40" : ""}`}
                      onClick={(e) => openPopover(e, s, date)}
                    >
                      {cellOf(s, date)}
                    </td>
                  ))}
                </tr>
              )),
            )}
          </tbody>
        </table>
      </div>

      {popover && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setPopover(null)}
          />
          <div
            className="fixed z-50 w-52 rounded-xl border border-slate-200 bg-white p-3 shadow-xl"
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
                className="rounded-md bg-emerald-100 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-200"
              >
                ○ 出勤可能
              </button>
              <button
                onClick={() =>
                  apply({
                    staffId: popover.staff.id,
                    date: popover.date,
                    type: "off",
                  })
                }
                className="rounded-md bg-slate-200 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-300"
              >
                休
              </button>
            </div>
            <div className="mt-2 flex items-center gap-1">
              <select
                value={start}
                onChange={(e) => setStart(e.target.value)}
                className="w-full rounded border border-slate-200 px-1 py-1 text-xs"
              >
                {TIME_OPTIONS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              <span className="text-xs text-slate-400">-</span>
              <select
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                className="w-full rounded border border-slate-200 px-1 py-1 text-xs"
              >
                {TIME_OPTIONS.map((t) => (
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
              className="mt-1.5 w-full rounded-md bg-sky-100 py-1.5 text-xs font-medium text-sky-700 hover:bg-sky-200"
            >
              この時間帯で指定
            </button>
            <button
              onClick={() => apply(null)}
              className="mt-1.5 w-full rounded-md py-1 text-[11px] text-slate-400 hover:bg-slate-50"
            >
              クリア（基本パターンに戻す）
            </button>
          </div>
        </>
      )}
    </div>
  );
}
