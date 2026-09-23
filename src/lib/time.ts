// "HH:MM" 文字列と分の相互変換・30分スロット操作

export function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export function toTimeString(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export const SLOT_MINUTES = 30;

/** [start, end) を30分刻みのスロット開始時刻列に分解 */
export function slotsBetween(startMin: number, endMin: number): number[] {
  const slots: number[] = [];
  for (let t = startMin; t < endMin; t += SLOT_MINUTES) {
    slots.push(t);
  }
  return slots;
}

export function rangesOverlap(
  aStart: number,
  aEnd: number,
  bStart: number,
  bEnd: number,
): boolean {
  return aStart < bEnd && bStart < aEnd;
}

export function formatRange(start: string, end: string): string {
  return `${start}–${end}`;
}

/** 実働時間（分）= 拘束時間 - 休憩 */
export function workMinutesOf(a: {
  startTime: string;
  endTime: string;
  breakMinutes: number;
}): number {
  return toMinutes(a.endTime) - toMinutes(a.startTime) - a.breakMinutes;
}

export function minutesToHoursLabel(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h${m}m`;
}
