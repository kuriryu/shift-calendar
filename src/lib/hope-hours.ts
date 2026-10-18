import type { ShiftAssignment, ShiftRequest, ShopSettings, Staff } from "@/types";
import { daysOfMonth, isWeekendOrFri } from "@/lib/dates";
import { toMinutes, workMinutesOf } from "@/lib/time";

function rangeMinutes(start: string, end: string): number {
  return Math.max(0, toMinutes(end) - toMinutes(start));
}

export function businessRange(date: string, settings: ShopSettings): { start: string; end: string } {
  return {
    start: settings.openTime,
    end: isWeekendOrFri(date) ? settings.closeTimeWeekend : settings.closeTimeWeekday,
  };
}

export function requestedMinutesOf(
  staff: Staff,
  requests: ShiftRequest[],
  settings: ShopSettings,
): number {
  return requests
    .filter((request) => request.staffId === staff.id)
    .reduce((total, request) => {
      if (request.type === "time_limited" && request.timeRange) {
        return total + rangeMinutes(request.timeRange.start, request.timeRange.end);
      }
      if (request.type === "free") {
        const range = request.timeRange ?? staff.freeTimeRange;
        if (range) return total + rangeMinutes(range.start, range.end);
        const hours = businessRange(request.date, settings);
        return total + rangeMinutes(hours.start, hours.end);
      }
      return total;
    }, 0);
}

export function assignedMinutesOf(staffId: string, assignments: ShiftAssignment[]): number {
  return assignments
    .filter((assignment) => assignment.staffId === staffId)
    .reduce((total, assignment) => total + Math.max(0, workMinutesOf(assignment)), 0);
}

export function monthDaysInWindow(month: string, from: string, to: string): string[] {
  return daysOfMonth(month).filter((date) => date >= from && date <= to);
}
