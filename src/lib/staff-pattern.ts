import type { Staff, TimeRange } from "@/types";
import { weekdayOf } from "@/lib/dates";

/** 土・日なら true（金曜は平日） */
export function isWeekendDay(date: string): boolean {
  const w = weekdayOf(date);
  return w === 0 || w === 6;
}

/**
 * その日の基本パターンを返す。
 * 固定休の判定は呼び出し側で行う。
 * 旧 defaultPattern は平日・休日どちらにもフォールバックする。
 */
export function patternOf(staff: Staff, date: string): TimeRange | undefined {
  if (isWeekendDay(date)) {
    return staff.weekendPattern ?? staff.defaultPattern;
  }
  return staff.weekdayPattern ?? staff.defaultPattern;
}

/** いずれかの基本パターンがあるか */
export function hasAnyPattern(staff: Staff): boolean {
  return !!(staff.weekdayPattern || staff.weekendPattern || staff.defaultPattern);
}

/** 旧 defaultPattern を平日・休日の両方にコピー（既にあれば触らない） */
export function migrateStaffPatterns(staff: Staff): Staff {
  if (!staff.defaultPattern) return staff;
  const next = { ...staff };
  if (!next.weekdayPattern) next.weekdayPattern = { ...staff.defaultPattern };
  if (!next.weekendPattern) next.weekendPattern = { ...staff.defaultPattern };
  return next;
}
