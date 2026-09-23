import type {
  ParsedConstraints,
  ShiftAssignment,
  ShiftRequest,
  ShopSettings,
  Staff,
} from "@/types";
import { daysOfMonth, formatDate, parseDate, weekKeyOf, weekdayOf } from "./dates";
import { businessHoursOf, coversSlot, slotPlanOf } from "./coverage";
import { toMinutes, toTimeString, workMinutesOf } from "./time";
import { parseSpecialNote } from "./notes";
import { patternOf } from "./staff-pattern";

// 段階的ヒューリスティック:
// 1. 日単位で割当（前日までの累積状態を参照）
// 2. 社員（早番・遅番）→ 不足スロットをパート・学生で埋める
// 3. 残った違反は validator が警告として可視化

const EMPLOYEE_SHIFT_MIN = 540; // 拘束9h = 実働8h + 休憩1h
const PART_TARGET_MIN = 240; // パート 4h 目安
const STUDENT_TARGET_MIN = 210; // 学生 3.5h 目安
const BREAK_THRESHOLD_MIN = 360; // 実働6h以上で休憩付与
const BREAK_MIN = 60;

type StaffState = {
  weekMinutes: number;
  weekDays: number;
  streak: number;
  workDays: number;
  offDays: number;
  lastWorkDate: string | null;
};

type Candidate = {
  staff: Staff;
  windowStart: number;
  windowEnd: number;
};

function yesterdayOf(dateStr: string): string {
  const d = parseDate(dateStr);
  d.setDate(d.getDate() - 1);
  return formatDate(d);
}

/** 希望（明示 > 基本パターン > 終日可）から勤務可能時間帯を求める。不可なら null */
function availabilityWindow(
  staff: Staff,
  date: string,
  request: ShiftRequest | undefined,
  open: number,
  close: number,
  note?: ParsedConstraints,
): { start: number; end: number } | null {
  if (request?.type === "off") return null;
  let win: { start: number; end: number };
  if (request?.type === "time_limited" && request.timeRange) {
    win = {
      start: toMinutes(request.timeRange.start),
      end: toMinutes(request.timeRange.end),
    };
  } else if (!request) {
    const pat = patternOf(staff, date);
    win = pat
      ? { start: toMinutes(pat.start), end: toMinutes(pat.end) }
      : { start: open, end: close };
  } else {
    win = { start: open, end: close };
  }
  // 特別な要望の時間制約で絞り込む
  if (note?.earliestStart) win.start = Math.max(win.start, toMinutes(note.earliestStart));
  if (note?.latestEnd) win.end = Math.min(win.end, toMinutes(note.latestEnd));
  return win;
}

/** 休憩の開始時刻を決める（preferred（既定14:00）開始を優先、収まらなければ中点） */
export function placeBreakStart(
  startMin: number,
  endMin: number,
  breakMinutes: number,
  preferred: number = 14 * 60,
): string {
  if (
    preferred >= startMin + 120 &&
    preferred + breakMinutes <= endMin - 60
  ) {
    return toTimeString(preferred);
  }
  const mid =
    startMin +
    Math.floor((endMin - startMin - breakMinutes) / 2 / 30) * 30;
  return toTimeString(mid);
}

/** 実働6h以上なら休憩60分を付与（手動・AI編集時の再計算用） */
export function computeBreak(
  startTime: string,
  endTime: string,
): { breakMinutes: number; breakStartTime?: string } {
  const startMin = toMinutes(startTime);
  const endMin = toMinutes(endTime);
  const workMin = endMin - startMin;
  if (workMin - BREAK_MIN < BREAK_THRESHOLD_MIN) {
    return { breakMinutes: 0 };
  }
  return {
    breakMinutes: BREAK_MIN,
    breakStartTime: placeBreakStart(startMin, endMin, BREAK_MIN),
  };
}

function makeAssignment(
  staff: Staff,
  date: string,
  startMin: number,
  endMin: number,
  preferredBreakMin?: number,
): ShiftAssignment {
  const workMin = endMin - startMin;
  const breakMinutes = workMin - BREAK_MIN >= BREAK_THRESHOLD_MIN ? BREAK_MIN : 0;
  return {
    id: `asg-${date}-${staff.id}`,
    staffId: staff.id,
    date,
    startTime: toTimeString(startMin),
    endTime: toTimeString(endMin),
    breakMinutes,
    breakStartTime:
      breakMinutes > 0
        ? placeBreakStart(startMin, endMin, breakMinutes, preferredBreakMin)
        : undefined,
    source: "auto",
  };
}

export function generateMonth(
  month: string,
  staffList: Staff[],
  requests: ShiftRequest[],
  settings: ShopSettings,
): ShiftAssignment[] {
  const days = daysOfMonth(month);
  const requestMap = new Map<string, ShiftRequest>();
  for (const r of requests) requestMap.set(`${r.staffId}:${r.date}`, r);

  const state = new Map<string, StaffState>();
  for (const s of staffList) {
    state.set(s.id, {
      weekMinutes: 0,
      weekDays: 0,
      streak: 0,
      workDays: 0,
      offDays: 0,
      lastWorkDate: null,
    });
  }

  const assignments: ShiftAssignment[] = [];
  let prevWeekKey = "";

  // 特別な要望の解釈結果を事前パース
  const notesMap = new Map<string, ParsedConstraints>();
  for (const s of staffList) {
    if (s.specialNote) notesMap.set(s.id, parseSpecialNote(s.specialNote));
  }

  for (let dayIndex = 0; dayIndex < days.length; dayIndex++) {
    const date = days[dayIndex];
    const { open, close } = businessHoursOf(date, settings);
    const weekday = weekdayOf(date);
    const weekKey = weekKeyOf(date);
    const yesterday = yesterdayOf(date);

    // 週またぎで週次時間をリセット / 昨日休みなら連勤リセット
    for (const s of staffList) {
      const st = state.get(s.id)!;
      if (weekKey !== prevWeekKey) {
        st.weekMinutes = 0;
        st.weekDays = 0;
      }
      if (st.lastWorkDate !== yesterday) st.streak = 0;
    }
    prevWeekKey = weekKey;

    // 出勤可能な候補を構築
    const candidates: Candidate[] = [];
    for (const s of staffList) {
      const st = state.get(s.id)!;
      const note = notesMap.get(s.id);
      if (s.unavailableWeekdays?.includes(weekday)) continue;
      if (note?.unavailableWeekdays.includes(weekday)) continue;
      if (note?.onlyWeekdays && !note.onlyWeekdays.includes(weekday)) continue;
      if (note?.maxDaysPerWeek != null && st.weekDays >= note.maxDaysPerWeek)
        continue;
      if (st.streak >= s.maxConsecutiveDays) continue;
      const win = availabilityWindow(s, date, requestMap.get(`${s.id}:${date}`), open, close, note);
      if (!win) continue;
      if (win.end - win.start < 60) continue;
      candidates.push({ staff: s, windowStart: win.start, windowEnd: win.end });
    }

    const dayAssignments: ShiftAssignment[] = [];
    const assignedToday = new Set<string>();

    const tryAssign = (
      c: Candidate,
      startMin: number,
      endMin: number,
      preferredBreakMin?: number,
    ): boolean => {
      const st = state.get(c.staff.id)!;
      const a = makeAssignment(c.staff, date, startMin, endMin, preferredBreakMin);
      const workMin = workMinutesOf(a);
      if (st.weekMinutes + workMin > c.staff.maxHoursPerWeek * 60) return false;
      dayAssignments.push(a);
      assignedToday.add(c.staff.id);
      st.weekMinutes += workMin;
      st.weekDays += 1;
      st.streak += 1;
      st.workDays += 1;
      st.lastWorkDate = date;
      return true;
    };

    // ── ① 社員: 早番・遅番を最大2名確保 ──
    const employees = candidates
      .filter((c) => c.staff.role === "employee")
      .sort((a, b) => {
        // 公休目安に対して遅れている人を優先的に休ませたいので、
        // 働かせる優先度は「出勤日数が少ない → 連勤が浅い」順
        const sa = state.get(a.staff.id)!;
        const sb = state.get(b.staff.id)!;
        return sa.workDays - sb.workDays || sa.streak - sb.streak;
      });

    // 3名いれば1名は公休に回す（公休目安に対して遅れている人を優先）
    let workers = employees;
    if (employees.length >= 3) {
      const sorted = [...employees].sort((a, b) => {
        const sa = state.get(a.staff.id)!;
        const sb = state.get(b.staff.id)!;
        const needA = settings.employeeDaysOffTarget - sa.offDays;
        const needB = settings.employeeDaysOffTarget - sb.offDays;
        return needB - needA; // 休み必要度が高い人が先頭＝休ませる
      });
      const rester = sorted[0];
      workers = employees.filter((c) => c.staff.id !== rester.staff.id);
    }

    const [earlyEmp, lateEmp] = workers;
    if (earlyEmp) {
      tryAssign(earlyEmp, open, open + EMPLOYEE_SHIFT_MIN);
    }
    if (lateEmp) {
      // 早番と休憩が重ならないよう1時間ずらす（14:00に2人同時休憩→一時割れを防ぐ）
      const earlyBreak = dayAssignments.find(
        (a) => a.staffId === earlyEmp?.staff.id,
      )?.breakStartTime;
      const preferred = earlyBreak ? toMinutes(earlyBreak) + 60 : undefined;
      tryAssign(lateEmp, close - EMPLOYEE_SHIFT_MIN, close, preferred);
    }

    // ── ② 不足スロットをパート・学生で埋める ──
    const plan = slotPlanOf(date, settings);
    const coverageOf = (slotStart: number) =>
      dayAssignments.filter((a) => coversSlot(a, slotStart)).length;

    const others = candidates.filter(
      (c) => c.staff.role !== "employee" && !assignedToday.has(c.staff.id),
    );

    for (const slot of plan) {
      let guard = 0;
      while (coverageOf(slot.start) < slot.required && guard++ < 10) {
        const pool = others.filter(
          (c) =>
            !assignedToday.has(c.staff.id) &&
            c.windowStart <= slot.start &&
            slot.start + 30 <= c.windowEnd,
        );
        if (pool.length === 0) break;

        pool.sort((a, b) => {
          const sa = state.get(a.staff.id)!;
          const sb = state.get(b.staff.id)!;
          const remainA = a.staff.maxHoursPerWeek * 60 - sa.weekMinutes;
          const remainB = b.staff.maxHoursPerWeek * 60 - sb.weekMinutes;
          return remainB - remainA || sa.streak - sb.streak;
        });

        const pick = pool[0];
        const target =
          pick.staff.role === "student" ? STUDENT_TARGET_MIN : PART_TARGET_MIN;
        const startMin = Math.max(pick.windowStart, open, slot.start - 60);
        const endMin = Math.min(pick.windowEnd, startMin + target);
        if (endMin - startMin < 60) break;
        if (!tryAssign(pick, startMin, endMin)) {
          // 週上限に引っかかった → この候補は今日は使わない
          assignedToday.add(pick.staff.id);
        }
      }
    }

    // 公休カウント（社員のみ）: 今日出勤しなかった社員
    for (const s of staffList) {
      if (s.role !== "employee") continue;
      const st = state.get(s.id)!;
      if (st.lastWorkDate !== date) st.offDays += 1;
    }

    assignments.push(...dayAssignments);
  }

  return assignments;
}
