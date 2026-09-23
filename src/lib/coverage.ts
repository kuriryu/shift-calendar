import type { ShiftAssignment, ShopSettings } from "@/types";
import { OPEN_TIME, CLOSE_WEEKDAY, CLOSE_WEEKEND } from "@/types";
import { isWeekendOrFri } from "./dates";
import { SLOT_MINUTES, rangesOverlap, slotsBetween, toMinutes } from "./time";

/** その日の営業時間 [open, close)（分） */
export function businessHoursOf(date: string): { open: number; close: number } {
  return {
    open: toMinutes(OPEN_TIME),
    close: toMinutes(isWeekendOrFri(date) ? CLOSE_WEEKEND : CLOSE_WEEKDAY),
  };
}

/** スロットの必要人数（ピーク帯は peakRequired、それ以外 normalRequired） */
export function requiredAtSlot(slotStart: number, settings: ShopSettings): number {
  const slotEnd = slotStart + SLOT_MINUTES;
  const inPeak = settings.peakHours.some((p) =>
    rangesOverlap(slotStart, slotEnd, toMinutes(p.start), toMinutes(p.end)),
  );
  return inPeak ? settings.peakRequired : settings.normalRequired;
}

export type SlotRequirement = { start: number; required: number };

/** その日の30分スロット一覧と必要人数 */
export function slotPlanOf(date: string, settings: ShopSettings): SlotRequirement[] {
  const { open, close } = businessHoursOf(date);
  return slotsBetween(open, close).map((start) => ({
    start,
    required: requiredAtSlot(start, settings),
  }));
}

/** 割当がスロットをカバーするか（休憩時間帯はカバーしない） */
export function coversSlot(a: ShiftAssignment, slotStart: number): boolean {
  const s = toMinutes(a.startTime);
  const e = toMinutes(a.endTime);
  const slotEnd = slotStart + SLOT_MINUTES;
  if (!(s <= slotStart && slotEnd <= e)) return false;
  if (a.breakMinutes > 0 && a.breakStartTime) {
    const bs = toMinutes(a.breakStartTime);
    if (rangesOverlap(slotStart, slotEnd, bs, bs + a.breakMinutes)) return false;
  }
  return true;
}

/** 休憩を含めた場合にカバーするか（休憩起因の人員割れ判定用） */
export function coversSlotIncludingBreak(
  a: ShiftAssignment,
  slotStart: number,
): boolean {
  const s = toMinutes(a.startTime);
  const e = toMinutes(a.endTime);
  return s <= slotStart && slotStart + SLOT_MINUTES <= e;
}
