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
    // - 開店・閉店（締め作業）スロットの不足 → エラー
    // - それ以外の時間帯の不足 → 警告（原則人数）
    // - 休憩起因の一時的な不足 → エラー（休憩中も原則人数を守る）
    const plan = slotPlanOf(date, settings);
    let deficitStart: number | null = null;
    let deficitMin = 0;
    let deficitRequired = 0;
    let breakCaused = true;
    let touchesEdge = false;

    const flush = (endSlot: number) => {
      if (deficitStart === null) return;
      const timeRange = {
        start: toTimeString(deficitStart),
        end: toTimeString(endSlot),
      };
      const range = `${timeRange.start}–${timeRange.end}`;
      if (breakCaused) {
        violations.push({
          id: vid(),
          severity: "error",
          rule: "BREAK_UNDERSTAFFED",
          date,
          timeRange,
          message: `${dayLabel(date)} ${range}: 休憩により一時的に必要人数を下回ります`,
        });
      } else if (touchesEdge) {
        violations.push({
          id: vid(),
          severity: "error",
          rule: "MIN_STAFF",
          date,
          timeRange,
          message: `${dayLabel(date)} ${range}: 開店・閉店時の人員不足（${deficitMin}/${deficitRequired}名）`,
        });
      } else {
        violations.push({
          id: vid(),
          severity: "warning",
          rule: "MIN_STAFF",
          date,
          timeRange,
          message: `${dayLabel(date)} ${range}: 人員が原則人数を下回ります（${deficitMin}/${deficitRequired}名）`,
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
          touchesEdge = slot.edge;
        } else {
          deficitMin = Math.min(deficitMin, covered);
          deficitRequired = Math.max(deficitRequired, slot.required);
          breakCaused = breakCaused && isBreakCaused;
          touchesEdge = touchesEdge || slot.edge;
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
      if (staff.maxConsecutiveDays > 0 && streak > staff.maxConsecutiveDays) {
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
      if (staff.maxHoursPerWeek > 0 && minutes > staff.maxHoursPerWeek * 60) {
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

    // 社員のみ: 週の最低労働時間・最低出勤日数（月またぎの週は月内日数で按分）
    if (staff.role === "employee") {
      const weekDayCount = new Map<string, number>();
      for (const a of mine) {
        const key = weekKeyOf(a.date);
        weekDayCount.set(key, (weekDayCount.get(key) ?? 0) + 1);
      }
      const minHours = settings.employeeMinHoursPerWeek;
      const minDays = settings.employeeMinDaysPerWeek;
      for (const bucket of buckets) {
        const span = bucket.dates.length;
        if (span === 0) continue;
        const ratio = span / 7;
        const minutes = weekMinutes.get(bucket.key) ?? 0;
        const workedDays = weekDayCount.get(bucket.key) ?? 0;
        if (minHours > 0 && minutes < minHours * 60 * ratio) {
          const requiredLabel = minutesToHoursLabel(Math.round(minHours * 60 * ratio));
          violations.push({
            id: vid(),
            severity: "error",
            rule: "WEEKLY_MIN_HOURS",
            date: bucket.dates[0],
            staffId: staff.id,
            message: `${staff.name} の週労働時間が最低時間を下回っています（${minutesToHoursLabel(minutes)} / ${requiredLabel}、週 ${bucket.label}）`,
          });
        }
        if (minDays > 0 && workedDays < minDays * ratio) {
          const requiredDays = Math.round(minDays * ratio * 10) / 10;
          violations.push({
            id: vid(),
            severity: "error",
            rule: "WEEKLY_MIN_DAYS",
            date: bucket.dates[0],
            staffId: staff.id,
            message: `${staff.name} の週出勤日数が最低日数を下回っています（${workedDays} / ${requiredDays}日、週 ${bucket.label}）`,
          });
        }
      }
    }

    // 公休目安（社員のみ・警告）。目標日数は店舗設定を参照する
    const daysOffTarget = settings.employeeDaysOffTarget;
    if (staff.role === "employee" && daysOffTarget > 0) {
      const workDates = new Set(mine.map((a) => a.date));
      const offDays = days.length - workDates.size;
      if (offDays < daysOffTarget) {
        violations.push({
          id: vid(),
          severity: "warning",
          rule: "DAYS_OFF_TARGET",
          date: days[days.length - 1],
          staffId: staff.id,
          message: `${staff.name} の公休が目標より少ない（${offDays}/${daysOffTarget}日）`,
        });
      }
    }
  }

  return violations.sort((a, b) => a.date.localeCompare(b.date));
}
