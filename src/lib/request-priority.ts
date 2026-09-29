import type { ShiftRequest, ShopSettings, Staff } from "@/types";
import { businessHoursOf } from "./coverage";
import { daysOfMonth } from "./dates";
import { toMinutes } from "./time";

/** 週あたりこの日数以上なら、希望が多い人のラベルを付ける */
const EAGER_DAYS_PER_WEEK = 4;

export type RequestEagerness = {
  /** 提出された希望時間の合計（分）。休みは0 */
  minutes: number;
  /** 出勤可能・時間帯指定の日数 */
  days: number;
  /** 希望が多いときの表示。例: 週5日希望 */
  label: string | null;
};

function requestedMinutesOn(
  request: ShiftRequest | undefined,
  date: string,
  settings: ShopSettings,
  staff: Staff,
): number {
  if (!request || request.type === "off" || request.type === "triangle") return 0;
  if (request.type === "time_limited" && request.timeRange) {
    return Math.max(
      0,
      toMinutes(request.timeRange.end) - toMinutes(request.timeRange.start),
    );
  }
  const { open, close } = businessHoursOf(date, settings);
  if (request.type === "free" && staff.freeTimeRange) {
    const start = Math.max(open, toMinutes(staff.freeTimeRange.start));
    const end = Math.min(close, toMinutes(staff.freeTimeRange.end));
    return Math.max(0, end - start);
  }
  return Math.max(0, close - open);
}

/**
 * 希望が多い人のラベル。
 * 週4日以上なら「週5日希望」。そこまで届かなくても、他の人より希望日が多ければ「希望4日」。
 */
export function eagernessLabel(
  days: number,
  monthLength: number,
  maxDays: number,
  othersHaveFewer: boolean,
): string | null {
  if (days <= 0 || monthLength <= 0) return null;
  const perWeek = Math.round(days / (monthLength / 7));
  if (perWeek >= EAGER_DAYS_PER_WEEK) return `週${Math.min(perWeek, 7)}日希望`;
  if (days === maxDays && othersHaveFewer) return `希望${days}日`;
  return null;
}

/**
 * スタッフごとの希望量。
 * 休みと三角は数えない。時間帯指定はその長さ。
 * Freeは時間帯があればその長さ、なければその日の営業時間。出勤可能も営業時間。
 */
export function eagernessByStaff(
  month: string,
  staffList: Staff[],
  requests: ShiftRequest[],
  settings: ShopSettings,
): Map<string, RequestEagerness> {
  const days = daysOfMonth(month);
  const byKey = new Map<string, ShiftRequest>();
  for (const request of requests) {
    if (request.date.startsWith(month)) byKey.set(`${request.staffId}:${request.date}`, request);
  }

  const scored = staffList.map((staff) => {
    let minutes = 0;
    let workDays = 0;
    for (const date of days) {
      const request = byKey.get(`${staff.id}:${date}`);
      const span = requestedMinutesOn(request, date, settings, staff);
      if (span <= 0) continue;
      minutes += span;
      workDays += 1;
    }
    return { id: staff.id, minutes, days: workDays };
  });
  const maxDays = scored.reduce((max, row) => Math.max(max, row.days), 0);
  const othersHaveFewer = scored.some((row) => row.days < maxDays);

  const out = new Map<string, RequestEagerness>();
  for (const row of scored) {
    out.set(row.id, {
      minutes: row.minutes,
      days: row.days,
      label: eagernessLabel(row.days, days.length, maxDays, othersHaveFewer),
    });
  }
  return out;
}
