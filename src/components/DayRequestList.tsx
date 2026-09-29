"use client";

import NoticeCard, { NoticeIcon } from "@/components/NoticeCard";
import { EMPTY_REQUESTS, useAppStore } from "@/stores/useAppStore";
import { dayLabel, weekdayLabel } from "@/lib/dates";
import type { RequestType, ShiftRequest, TimeRange } from "@/types";

const TYPE_ORDER: Record<RequestType, number> = {
  available: 0,
  free: 1,
  time_limited: 2,
  triangle: 3,
  off: 4,
};

export function hopeChip(
  request: ShiftRequest,
  freeTime?: TimeRange,
): { text: string; className: string } {
  if (request.type === "off") {
    return { text: "休", className: "bg-slate-200 text-slate-700" };
  }
  if (request.type === "triangle") {
    return { text: "△", className: "bg-amber-100 text-amber-800" };
  }
  if (request.type === "free") {
    return {
      text: freeTime ? `Free ${freeTime.start}〜${freeTime.end}` : "Free",
      className: "bg-violet-100 text-violet-800",
    };
  }
  if (request.type === "time_limited" && request.timeRange) {
    return {
      text: `${request.timeRange.start}〜${request.timeRange.end}`,
      className: "bg-sky-100 text-sky-800",
    };
  }
  return { text: "出勤可能", className: "bg-emerald-100 text-emerald-700" };
}

/** 出勤可能・時間帯指定・三角・Free。休みは希望として扱わない */
export function isShiftHope(
  request: ShiftRequest | undefined,
): request is ShiftRequest {
  return request != null && request.type !== "off";
}

/** シフトを外したあとに残す、その日の希望の説明 */
export function hopeSentence(
  request: ShiftRequest | undefined,
  freeTime?: TimeRange,
): string {
  if (!request) return "この日の希望は入っていません。";
  if (request.type === "off") return "この日の希望は休みです。";
  if (request.type === "available") return "この日の希望は出勤可能です。";
  if (request.type === "triangle") return "この日の希望は △ です。";
  return `この日の希望は ${hopeChip(request, freeTime).text} です。`;
}

/** 選択日にシフト希望を出している人。休みは出さない。シフト未割当でも表示する */
export default function DayRequestList({ date }: { date: string }) {
  const staff = useAppStore((s) => s.staff);
  const hiddenStaffIds = useAppStore((s) => s.hiddenStaffIds);
  const requests = useAppStore((s) => s.requests[s.selectedMonth] ?? EMPTY_REQUESTS);
  const hidden = new Set(hiddenStaffIds);
  const byStaff = new Map(
    requests.filter((r) => r.date === date).map((r) => [r.staffId, r]),
  );
  const people = staff
    .filter((s) => !hidden.has(s.id) && isShiftHope(byStaff.get(s.id)))
    .sort(
      (a, b) =>
        TYPE_ORDER[byStaff.get(a.id)!.type] - TYPE_ORDER[byStaff.get(b.id)!.type],
    );

  return (
    <NoticeCard label={`${dayLabel(date)}の希望`}>
      <div className="flex flex-wrap items-center gap-x-2 text-xs font-medium text-slate-500">
        <NoticeIcon name="event_available" />
        <span className="my-2">この日の希望</span>
        <span className="my-2 text-slate-400">
          {dayLabel(date)}（{weekdayLabel(date)}）
        </span>
      </div>
      {people.length === 0 ? (
        <p className="my-2 text-sm text-slate-500">この日の希望はまだありません</p>
      ) : (
        <ul className="flex flex-wrap gap-x-2">
          {people.map((person) => {
            const request = byStaff.get(person.id)!;
            const chip = hopeChip(request, person.freeTimeRange);
            return (
              <li
                key={person.id}
                className="mb-2 inline-flex max-w-full items-center gap-2 rounded-lg border border-slate-200 bg-slate-50/70 px-2.5"
              >
                <span
                  className={`my-2 shrink-0 rounded px-1.5 py-0.5 text-[11px] font-semibold leading-4 ${chip.className}`}
                >
                  {chip.text}
                </span>
                <span className="my-2 truncate text-sm font-medium text-slate-800">
                  {person.name}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </NoticeCard>
  );
}
