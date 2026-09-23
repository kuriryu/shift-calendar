import type { ShiftAssignment, ShopSettings } from "@/types";
import { isWeekendOrFri } from "./dates";
import { SLOT_MINUTES, rangesOverlap, slotsBetween, toMinutes } from "./time";

/** その日の営業時間 [open, close)（分）。設定の開店・閉店時刻を参照する */
export function businessHoursOf(
  date: string,
  settings: ShopSettings,
): { open: number; close: number } {
  return {
    open: toMinutes(settings.openTime),
    close: toMinutes(
      isWeekendOrFri(date) ? settings.closeTimeWeekend : settings.closeTimeWeekday,
    ),
  };
}

/** 設定上の最も遅い閉店時刻（分） */
export function latestCloseOf(settings: ShopSettings): number {
  return Math.max(
    toMinutes(settings.closeTimeWeekday),
    toMinutes(settings.closeTimeWeekend),
  );
}

/** 開店〜最遅閉店までの30分刻み時刻候補（セレクト用） */
export function timeOptionsOf(settings: ShopSettings): string[] {
  const start = toMinutes(settings.openTime);
  const end = latestCloseOf(settings);
  const out: string[] = [];
  for (let m = start; m <= end; m += SLOT_MINUTES) {
    out.push(
      `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`,
    );
  }
  return out;
}

/** スロットの必要人数（ピーク帯は peakRequired、それ以外 normalRequired） */
export function requiredAtSlot(slotStart: number, settings: ShopSettings): number {
  const slotEnd = slotStart + SLOT_MINUTES;
  const inPeak = settings.peakHours.some((p) =>
    rangesOverlap(slotStart, slotEnd, toMinutes(p.start), toMinutes(p.end)),
  );
  return inPeak ? settings.peakRequired : settings.normalRequired;
}

export type SlotRequirement = {
  start: number;
  required: number;
  /** 開店直後・閉店直前（締め作業）のスロットか */
  edge: boolean;
};

/** その日の30分スロット一覧と必要人数（開店・閉店スロットは edgeRequired を下限にする） */
export function slotPlanOf(date: string, settings: ShopSettings): SlotRequirement[] {
  const { open, close } = businessHoursOf(date, settings);
  const slots = slotsBetween(open, close);
  const last = slots[slots.length - 1];
  return slots.map((start) => {
    const edge = start === open || start === last;
    const base = requiredAtSlot(start, settings);
    return {
      start,
      required: edge ? Math.max(base, settings.edgeRequired) : base,
      edge,
    };
  });
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
