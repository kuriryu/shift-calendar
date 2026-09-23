// 月・週の日付ユーティリティ
// 週の定義: 月曜始まり。月またぎの週は対象月に含まれる日だけで集計する。

export function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** "2026-10" → その月の全日付文字列 */
export function daysOfMonth(month: string): string[] {
  const [y, m] = month.split("-").map(Number);
  const count = new Date(y, m, 0).getDate();
  return Array.from({ length: count }, (_, i) =>
    formatDate(new Date(y, m - 1, i + 1)),
  );
}

export function weekdayOf(dateStr: string): number {
  return parseDate(dateStr).getDay(); // 0=日 … 6=土
}

export function isWeekendOrFri(dateStr: string): boolean {
  const w = weekdayOf(dateStr);
  return w === 5 || w === 6; // 金・土は閉店時刻が異なる（設定の closeTimeWeekend）
}

export function monthLabel(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return `${y}年${m}月`;
}

export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** 今日の翌月（YYYY-MM）。シフト作成のデフォルト対象月 */
export function nextMonthOf(from: Date = new Date()): string {
  return shiftMonth(formatDate(from).slice(0, 7), 1);
}

export function dayLabel(dateStr: string): string {
  const d = parseDate(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

const WEEKDAY_JA = ["日", "月", "火", "水", "木", "金", "土"] as const;

export function weekdayLabel(dateStr: string): string {
  return WEEKDAY_JA[weekdayOf(dateStr)];
}

export type WeekBucket = {
  key: string; // 週の月曜日 YYYY-MM-DD
  label: string; // "10/1–10/4"（月またぎは月内の日だけ）
  dates: string[]; // 月内の日付のみ
};

/**
 * 対象月の日付を月曜始まりの週でグルーピング。
 * 月またぎの週は月内の日付のみを含む。
 */
export function weeksOfMonth(month: string): WeekBucket[] {
  const days = daysOfMonth(month);
  const map = new Map<string, string[]>();

  for (const dateStr of days) {
    const d = parseDate(dateStr);
    const w = d.getDay();
    const mondayOffset = w === 0 ? -6 : 1 - w; // 月曜始まり
    const monday = new Date(d);
    monday.setDate(d.getDate() + mondayOffset);
    const key = formatDate(monday);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(dateStr);
  }

  return [...map.entries()].map(([key, dates]) => ({
    key,
    dates,
    label: `${dayLabel(dates[0])}–${dayLabel(dates[dates.length - 1])}`,
  }));
}

/** dateStr が属する週（月曜始まり）のキー */
export function weekKeyOf(dateStr: string): string {
  const d = parseDate(dateStr);
  const w = d.getDay();
  const mondayOffset = w === 0 ? -6 : 1 - w;
  const monday = new Date(d);
  monday.setDate(d.getDate() + mondayOffset);
  return formatDate(monday);
}
