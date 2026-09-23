import type {
  ShiftAssignment,
  ShiftRequest,
  ShopSettings,
  Staff,
  Violation,
} from "@/types";
import { daysOfMonth, dayLabel, formatDate, parseDate, weekKeyOf, weeksOfMonth } from "./dates";
import {
  coversSlot,
  coversSlotIncludingBreak,
  slotPlanOf,
} from "./coverage";
import {
  minutesToHoursLabel,
  toMinutes,
  toTimeString,
  workMinutesOf,
} from "./time";

let seq = 0;
function vid(): string {
  return `vio-${++seq}`;
}

/** 生成・編集されたシフト全体を検証し、違反リストを返す */
export function validateMonth(
  month: string,
  staffList: Staff[],
  requests: ShiftRequest[],
  assignments: ShiftAssignment[],
  settings: ShopSettings,
): Violation[] {
  const violations: Violation[] = [];
  const days = daysOfMonth(month);
  const staffById = new Map(staffList.map((s) => [s.id, s]));
  const requestMap = new Map<string, ShiftRequest>();
  for (const r of requests) requestMap.set(`${r.staffId}:${r.date}`, r);

  const byDate = new Map<string, ShiftAssignment[]>();
  for (const a of assignments) {
    if (!byDate.has(a.date)) byDate.set(a.date, []);
    byDate.get(a.date)!.push(a);
  }

  // ── 日ごとのチェック ──
  for (const date of days) {
    const dayAsg = byDate.get(date) ?? [];

    // 社員不在
    if (!dayAsg.some((a) => staffById.get(a.staffId)?.role === "employee")) {
      violations.push({
        id: vid(),
        severity: "error",
        rule: "EMPLOYEE_PRESENT",
        date,
        message: `${dayLabel(date)}: 社員が1人も配置されていません`,
      });
    }

    // 人員不足（連続スロットをまとめて報告）
    const plan = slotPlanOf(date, settings);
    let deficitStart: number | null = null;
    let deficitMin = 0;
    let deficitRequired = 0;
    let breakCaused = true;

    const flush = (endSlot: number) => {
      if (deficitStart === null) return;
      const range = `${toTimeString(deficitStart)}–${toTimeString(endSlot)}`;
      if (breakCaused && !settings.strictBreakMode) {
        violations.push({
          id: vid(),
          severity: "warning",
          rule: "BREAK_UNDERSTAFFED",
          date,
          message: `${dayLabel(date)} ${range}: 休憩により一時的に必要人数を下回ります`,
        });
      } else {
        violations.push({
          id: vid(),
          severity: "error",
          rule: "MIN_STAFF",
          date,
          message: `${dayLabel(date)} ${range}: 人員不足（${deficitMin}/${deficitRequired}名）`,
        });
      }
      deficitStart = null;
    };

    for (const slot of plan) {
      const covered = dayAsg.filter((a) => coversSlot(a, slot.start)).length;
      if (covered < slot.required) {
        const withBreaks = dayAsg.filter((a) =>
          coversSlotIncludingBreak(a, slot.start),
        ).length;
        const isBreakCaused = withBreaks >= slot.required;
        if (deficitStart === null) {
          deficitStart = slot.start;
          deficitMin = covered;
          deficitRequired = slot.required;
          breakCaused = isBreakCaused;
        } else {
          deficitMin = Math.min(deficitMin, covered);
          deficitRequired = Math.max(deficitRequired, slot.required);
          breakCaused = breakCaused && isBreakCaused;
        }
      } else {
        flush(slot.start);
      }
    }
    flush(plan.length > 0 ? plan[plan.length - 1].start + 30 : 0);

    // 希望との矛盾（手動/AI編集で発生しうる）
    for (const a of dayAsg) {
      const req = requestMap.get(`${a.staffId}:${a.date}`);
      const staff = staffById.get(a.staffId);
      if (!staff) continue;
      if (req?.type === "off") {
        violations.push({
          id: vid(),
          severity: "error",
          rule: "REQUEST_OFF_CONFLICT",
          date,
          staffId: a.staffId,
          message: `${dayLabel(date)}: ${staff.name} は希望休です`,
        });
      }
      if (req?.type === "time_limited" && req.timeRange) {
        const ok =
          toMinutes(a.startTime) >= toMinutes(req.timeRange.start) &&
          toMinutes(a.endTime) <= toMinutes(req.timeRange.end);
        if (!ok) {
          violations.push({
            id: vid(),
            severity: "error",
            rule: "TIME_LIMIT_CONFLICT",
            date,
            staffId: a.staffId,
            message: `${dayLabel(date)}: ${staff.name} の勤務が希望時間（${req.timeRange.start}–${req.timeRange.end}）を外れています`,
          });
        }
      }
    }
  }

  // ── スタッフごとのチェック ──
  for (const staff of staffList) {
    const mine = assignments
      .filter((a) => a.staffId === staff.id)
      .sort((a, b) => a.date.localeCompare(b.date));

    // 連勤
    let streak = 0;
    let prevDate = "";
    for (const a of mine) {
      let isConsecutive = false;
      if (prevDate !== "") {
        const d = parseDate(prevDate);
        d.setDate(d.getDate() + 1);
        isConsecutive = a.date === formatDate(d);
      }
      streak = isConsecutive ? streak + 1 : 1;
      prevDate = a.date;
      if (streak > staff.maxConsecutiveDays) {
        violations.push({
          id: vid(),
          severity: "error",
          rule: "MAX_CONSECUTIVE",
          date: a.date,
          staffId: staff.id,
          message: `${dayLabel(a.date)}: ${staff.name} の連勤が ${streak} 日（上限 ${staff.maxConsecutiveDays} 日）`,
        });
      }
    }

    // 週次労働時間（月曜始まり・月またぎは月内のみ）
    const weekMinutes = new Map<string, number>();
    for (const a of mine) {
      const key = weekKeyOf(a.date);
      weekMinutes.set(key, (weekMinutes.get(key) ?? 0) + workMinutesOf(a));
    }
    const buckets = weeksOfMonth(month);
    for (const [key, minutes] of weekMinutes) {
      if (minutes > staff.maxHoursPerWeek * 60) {
        const bucket = buckets.find((b) => b.key === key);
        violations.push({
          id: vid(),
          severity: "error",
          rule: "WEEKLY_HOURS",
          date: bucket?.dates[0] ?? `${month}-01`,
          staffId: staff.id,
          message: `${staff.name} の週労働時間が上限超過（${minutesToHoursLabel(minutes)} / ${staff.maxHoursPerWeek}h、週 ${bucket?.label ?? key}）`,
        });
      }
    }

    // 公休目安（社員のみ・警告）
    if (staff.role === "employee" && staff.monthlyDaysOffTarget > 0) {
      const workDates = new Set(mine.map((a) => a.date));
      const offDays = days.length - workDates.size;
      if (offDays < staff.monthlyDaysOffTarget) {
        violations.push({
          id: vid(),
          severity: "warning",
          rule: "DAYS_OFF_TARGET",
          date: days[days.length - 1],
          staffId: staff.id,
          message: `${staff.name} の公休が目安より少ない（${offDays}/${staff.monthlyDaysOffTarget}日）`,
        });
      }
    }
  }

  return violations.sort((a, b) => a.date.localeCompare(b.date));
}
